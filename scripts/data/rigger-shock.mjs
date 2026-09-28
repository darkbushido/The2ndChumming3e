/**
 * Rigger dump shock and rigger feedback damage — TODO 198 / 199.
 *
 * **Dump shock · SR3 p.156.** *"Any time a rigger is dumped from a remote control network … The rigger
 * must also resist (RC deck Rating + 4)S Stun damage from neural biofeedback with Willpower. If
 * involuntarily jacked out of a vehicle (other than from vehicle destruction), the rigger must resist
 * 5S Stun damage from dump shock, plus disorientation."* Disorientation: *"all of the rigger's Success
 * Tests receive a +2 modifier"* for ten Combat Turns, shortened by a Willpower Test (TN 4): *"Divide the
 * number of successes into 30 (round up) to determine the number of seconds … then divide that product
 * by 3 (round up) to determine the number of Combat Turns."*
 *
 * **Rigger damage · SR3 p.145.** *"When a vehicle takes Serious damage, the controlling rigger must make a
 * Damage Resistance Test against 6M Physical damage; if the vehicle is destroyed, the rigger must resist
 * 6S Physical damage. This Damage Resistance Test is made with Willpower … Neither Combat nor Control
 * Pool dice can be used for this test."*
 *
 * ⚠ A DECKER's dump shock is not here. SR3 p.227 and MDF p.27 name no resisting attribute; only the
 * rigger text (p.156) does. Pure: no Foundry globals.
 */

export const DUMP_PAGE     = 'SR3 p.156';
export const FEEDBACK_PAGE = 'SR3 p.145';

/** p.156: ten Combat Turns of +2 when the Willpower Test does not shorten it. */
export const DISORIENT_TURNS = 10;
export const DISORIENT_MOD   = 2;
export const DISORIENT_TN    = 4;

export const RiggerShock = {
  /**
   * The damage a dumped rigger resists.
   * @param {'network'|'vehicle'} source  dumped from an RC network, or jacked out of a vehicle
   * @param {number} [deckRating]         the RC deck's rating (network only)
   * @returns {{ power:number, level:'S', isStun:true, resistAttr:'willpower', page:string }|null}
   */
  dumpShock(source, deckRating = 0) {
    if (source === 'network') {
      const r = Math.max(0, Math.trunc(Number(deckRating) || 0));
      return { power: r + 4, level: 'S', isStun: true, resistAttr: 'willpower', page: DUMP_PAGE };
    }
    if (source === 'vehicle') return { power: 5, level: 'S', isStun: true, resistAttr: 'willpower', page: DUMP_PAGE };
    return null;
  },

  /**
   * How long the disorientation lasts after the Willpower (TN 4) Test.
   * No successes: the full ten Combat Turns (30 seconds).
   * @param {number} successes
   * @returns {{ seconds:number, turns:number }}
   */
  disorientation(successes) {
    const s = Math.max(0, Math.trunc(Number(successes) || 0));
    if (s === 0) return { seconds: DISORIENT_TURNS * 3, turns: DISORIENT_TURNS };
    const seconds = Math.ceil(30 / s);
    return { seconds, turns: Math.ceil(seconds / 3) };
  },

  /**
   * The feedback a jacked-in rigger resists when their vehicle is hurt (p.145).
   * @param {'serious'|'destroyed'} stage
   * @returns {{ power:6, level:'M'|'S', isStun:false, resistAttr:'willpower', noPools:true, page:string }|null}
   */
  feedback(stage) {
    const level = stage === 'serious' ? 'M' : stage === 'destroyed' ? 'S' : null;
    if (!level) return null;
    return { power: 6, level, isStun: false, resistAttr: 'willpower', noPools: true, page: FEEDBACK_PAGE };
  },

  /**
   * Did this change of a vehicle's damage level just reach Serious or Destroyed? Only a RISE into the
   * band counts — more boxes inside Serious, or repairs, post nothing. A jump from below Serious
   * straight to Destroyed is the destroyed case (6S), not both.
   * @param {'L'|'M'|'S'|'D'|null} before  `SR3EActor.vehicleDamageLevel` before the change
   * @param {'L'|'M'|'S'|'D'|null} after   …and after it
   * @returns {'serious'|'destroyed'|null}
   */
  feedbackStage(before, after) {
    const rank = l => ({ L: 1, M: 2, S: 3, D: 4 })[l] ?? 0;
    const b = rank(before), a = rank(after);
    if (a <= b) return null;
    if (a === 4) return 'destroyed';
    if (a === 3) return 'serious';
    return null;
  },
};
