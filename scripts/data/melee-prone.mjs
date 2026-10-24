/**
 * Who is lying down in a melee exchange — the "Opponent prone" row · SR3 p.123. Pure — no Foundry. TODO 245.
 *
 * > Melee Modifiers Table: "Opponent prone  –2"
 * > "Opponent Prone — This modifier applies if the opponent is lying on the ground."   — SR3 p.123
 *
 * The modifier belongs to the fighter still STANDING: a prone defender gives the attacker −2, a prone attacker
 * gives the defender −2. Both on the floor → both have a prone opponent, so both take −2.
 *
 * Prone is Foundry's CORE status id `prone` (the Knockdown card's "Mark prone" sets it, sr3e.js). The GM window
 * PRESELECTS the row from it; the GM can still change it (offer, never apply). With no window (NPC vs NPC) the
 * flow applies it itself, as it does the multiple-targets +2.
 */

export const PRONE_STATUS = 'prone';
export const PRONE_MOD    = -2;
export const PRONE_PAGE   = 'SR3 p.123';

const has = (doc) => {
  const s = doc?.statuses;
  return typeof s?.has === 'function' ? s.has(PRONE_STATUS) === true : false;
};

export const MeleeProne = {
  /**
   * Is this fighter lying down? Reads the actor AND the fighter's token: an unlinked token carries its own
   * synthetic actor, so a status set from the token HUD lives there and not on the world actor the target
   * dialog returns (and "Mark prone" writes the world actor, which an unlinked token does not see).
   * @param {{statuses?: Set<string>}|null} actor
   * @param {{actor?: object, document?: {hasStatusEffect?: Function}}|null} [token]
   */
  isProne(actor, token = null) {
    if (has(actor)) return true;
    if (has(token?.actor)) return true;
    const td = token?.document ?? null;
    return typeof td?.hasStatusEffect === 'function' && td.hasStatusEffect(PRONE_STATUS) === true;
  },

  /**
   * The window's "who is DOWN" value from the two facts.
   * @returns {'attacker'|'defender'|'both'|null}
   */
  side(atkProne, defProne) {
    if (atkProne && defProne) return 'both';
    if (atkProne) return 'attacker';
    if (defProne) return 'defender';
    return null;
  },

  /**
   * The TN deltas for a "who is DOWN" value — the bonus lands on the OTHER fighter.
   * @param {'attacker'|'defender'|'both'|null} who
   * @returns {{atk:number, def:number}}
   */
  deltas(who) {
    let atk = 0, def = 0;
    if (who === 'defender' || who === 'both') atk += PRONE_MOD;
    if (who === 'attacker' || who === 'both') def += PRONE_MOD;
    return { atk, def };
  },
};
