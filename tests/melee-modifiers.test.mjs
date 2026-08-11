/**
 * Melee combat modifiers — SR3ECombatModifiers.sumMeleeModifiers (SR3 p.123).
 *
 * Melee is not ranged with different numbers, and two structural differences are what
 * these assertions exist to protect:
 *
 *   1. There are TWO target numbers. Every modifier resolves to a {atk, def} pair, and
 *      several land on both sides at once in OPPOSITE directions. A sign error here is
 *      invisible in play — the fight just feels swingy — so the directions are pinned
 *      individually rather than via a total.
 *
 *   2. Visibility applies at HALF value, except Full Darkness. Reusing the ranged
 *      number unhalved would roughly double every environmental penalty in melee.
 *
 * Deliberately absent, because they are applied elsewhere and would double-count:
 * Reach (differential, baked into the base TNs), Called Shot (+4, declared by the
 * attacker) and Wounded (folded in by rollPool).
 */
const {
  SR3E_MELEE_MODIFIERS, sumMeleeModifiers, meleeVisibilityModifier, visibilityModifier,
} = await import('../scripts/SR3ECombatModifiers.js');

export const name = 'melee-modifiers';

export async function run(t) {
  const sum = s => sumMeleeModifiers(s);
  const pair = s => { const r = sum(s); return `${r.atk}/${r.def}`; };

  /* ---- nothing set changes nothing ---- */
  t.is('an empty state is neutral', pair({}), '0/0');
  t.is('and so is an explicitly zeroed one',
    pair({ friends: 0, multiTargetAtk: 0, superiorPosition: null, prone: null }), '0/0');

  /* ---- friends in melee: ONE fact, BOTH sides, opposite signs ----
   * "The side with the greater number of friends gets a -1 target number modifier for
   *  each friend more than their opponents have, to a maximum of -4. The side with the
   *  lesser number of friends suffers a +1 target number modifier for each additional
   *  friend their opponents have, to a maximum of +4."
   */
  t.is('attacker outnumbers by 2: -2 to them, +2 to the defender', pair({ friends: 2 }), '-2/2');
  t.is('defender outnumbers by 3: +3 to the attacker, -3 to them', pair({ friends: -3 }), '3/-3');
  t.is('one friend of advantage is one point',  pair({ friends: 1 }), '-1/1');

  // The cap is 4 EACH WAY, not 4 across the pair — a 10-friend advantage is still ±4.
  t.is('the advantage caps at 4',        pair({ friends: 10 }), '-4/4');
  t.is('and caps the same way reversed', pair({ friends: -10 }), '4/-4');
  t.is('exactly at the cap is unchanged', pair({ friends: 4 }), '-4/4');

  // The swing between the two target numbers is what makes this the heaviest row on
  // the table: a 4-friend advantage separates the two TNs by 8.
  {
    const r = sum({ friends: 4 });
    t.is('a maxed advantage separates the two TNs by 8', r.def - r.atk, 8);
  }

  t.is('a fractional friend count is truncated, not rounded', pair({ friends: 2.9 }), '-2/2');

  /* ---- superior position: -1, to whoever has it, and only them ---- */
  t.is('the attacker holding it gets -1', pair({ superiorPosition: 'attacker' }), '-1/0');
  t.is('the defender holding it gets -1', pair({ superiorPosition: 'defender' }), '0/-1');
  t.is('nobody holding it is neutral',    pair({ superiorPosition: null }), '0/0');

  /* ---- prone: the bonus goes to the one still STANDING ----
   * The table reads "Opponent prone -2", which is easy to invert: it is a bonus to the
   * character whose opponent is down, not a penalty on the one who fell.
   */
  t.is('a prone defender gives the ATTACKER -2', pair({ prone: 'defender' }), '-2/0');
  t.is('a prone attacker gives the DEFENDER -2', pair({ prone: 'attacker' }), '0/-2');

  /* ---- multiple targets: attacker only, and it is a PENALTY ---- */
  t.is('one extra target is +2 on the attacker',  pair({ multiTargetAtk: 1 }), '2/0');
  t.is('three extra targets is +6',               pair({ multiTargetAtk: 3 }), '6/0');
  t.is('a negative target count is ignored',      pair({ multiTargetAtk: -2 }), '0/0');
  t.ok('and it never touches the defender',       sum({ multiTargetAtk: 5 }).def === 0);

  /* ---- visibility: HALVED, rounding down, except Full Darkness (p.123) ---- */
  t.is('Full Darkness applies in FULL',
    meleeVisibilityModifier('Full Darkness', 'normal'), visibilityModifier('Full Darkness', 'normal'));
  t.is('and that full value is 8', meleeVisibilityModifier('Full Darkness', 'normal'), 8);

  t.is('Minimal Light halves 6 to 3',   meleeVisibilityModifier('Minimal Light', 'normal'), 3);
  t.is('Partial Light halves 2 to 1',   meleeVisibilityModifier('Partial Light', 'normal'), 1);
  // Rounds DOWN: natural low-light in Partial Light is +1 ranged, which halves to 0.
  t.is('an odd value rounds down to 0', meleeVisibilityModifier('Partial Light', 'lowLightNat'), 0);
  t.is('Heavy Smoke halves 6 to 3',     meleeVisibilityModifier('Heavy Smoke/Fog/Rain', 'normal'), 3);
  t.is('a genuine zero stays zero',     meleeVisibilityModifier('Mist', 'thermoNat'), 0);
  t.is('no condition is no modifier',   meleeVisibilityModifier('', 'normal'), 0);

  // Environmental, so it lands on BOTH sides equally — it does not favour anyone.
  t.is('visibility penalises both sides alike',
    pair({ visibilityCondition: 'Minimal Light', visibilityVision: 'normal' }), '3/3');
  t.is('Full Darkness penalises both in full',
    pair({ visibilityCondition: 'Full Darkness', visibilityVision: 'normal' }), '8/8');

  /* ---- everything at once, since these compose ---- */
  {
    // Attacker: 2 friends up, on higher ground, opponent prone, striking 2 targets,
    // in minimal light. Defender: outnumbered, upright, same murk.
    const r = sum({
      friends: 2, superiorPosition: 'attacker', prone: 'defender',
      multiTargetAtk: 1, visibilityCondition: 'Minimal Light', visibilityVision: 'normal',
    });
    // atk: -2 friends, -1 position, -2 prone, +2 target, +3 visibility = 0
    // def: +2 friends, +3 visibility = +5
    t.is('a full house composes on the attacker', r.atk, 0);
    t.is('and on the defender',                   r.def, 5);
  }

  /* ---- the table itself ---- */
  t.is('every row declares a kind',
    SR3E_MELEE_MODIFIERS.filter(m => !m.kind).length, 0);
  t.is('every row declares a group',
    SR3E_MELEE_MODIFIERS.filter(m => !m.group).length, 0);
  // Reach, called shot and wounds are applied elsewhere; listing them here would
  // double-count them the moment the window is wired.
  t.ok('reach, called shot and wounds are NOT in this table',
    !SR3E_MELEE_MODIFIERS.some(m => /reach|called|wound/i.test(m.key)));
}
