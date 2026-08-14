/**
 * The melee GM window's data layer — `meleeModifierGroups` and the reach election.
 *
 * `sumMeleeModifiers` itself is already covered by `melee-modifiers.test.mjs`. What is new
 * here is what the window renders from, and the reach rule the window deliberately does
 * NOT own.
 *
 * ── WHY GROUPING IS WORTH A TEST AT ALL ──────────────────────────────────────────────
 *
 * The same reason as the ranged window: a row whose `group` is missing or misspelled must
 * still appear, in a trailing "Other" bucket. A dropped row is a modifier the GM was meant
 * to apply and never saw — silent, and invisible to every other assertion in the suite.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const {
  SR3E_MELEE_MODIFIERS, meleeModifierGroups, meleeVisibilityModifier, sumMeleeModifiers,
} = await import('../scripts/SR3ECombatModifiers.js');

export const name = 'melee-gm-window';

/**
 * The reach election, as `handleMeleeRoll` applies it.
 *
 * Kept here as a tiny model rather than imported, because the real code reads it out of a
 * submission ledger mid-resolution. The RULE is the thing worth pinning: electing to push
 * the modifier onto the opponent raises BOTH target numbers by N, so the gap between them
 * never changes — only which fighter is measured against the harder number.
 */
const elect = (baseAtk, baseDef, holder, diff, choice) => {
  let atk = baseAtk - (holder === 'attacker' ? diff : 0);
  let def = baseDef - (holder === 'defender' ? diff : 0);
  if (holder && diff > 0 && choice === 'opponent') { atk += diff; def += diff; }
  return { atk: Math.max(2, atk), def: Math.max(2, def) };
};

export async function run(t) {
  // ── Grouping ───────────────────────────────────────────────────────────────
  const groups = meleeModifierGroups();
  const flat   = groups.flatMap(g => g.rows);

  t.is('every melee modifier is rendered somewhere', flat.length, SR3E_MELEE_MODIFIERS.length);
  t.ok('no group is rendered empty', groups.every(g => g.rows.length > 0));
  t.ok('visibility sits under Conditions, not with the fight rows',
    groups.find(g => g.key === 'conditions')?.rows.some(r => r.key === 'visibility') === true);
  t.ok('friends-in-the-melee sits under the fight',
    groups.find(g => g.key === 'fight')?.rows.some(r => r.key === 'friends') === true);
  t.ok('melee has no Gear group — smartlinks and laser sights are firearm accessories',
    !groups.some(g => g.key === 'gear'));

  // ── Visibility halves in melee, except in Full Darkness ────────────────────
  // p.123: "Apply the modifiers at half their value, rounding down, except for Full
  // Darkness." Rounding DOWN is what makes a +1 condition vanish rather than persist.
  const dark = meleeVisibilityModifier('Full Darkness', 'normal');
  t.ok('Full Darkness is exempt and applies in full', dark >= 8);
  t.is('an even modifier simply halves: +4 becomes +2',
    meleeVisibilityModifier('Light Smoke/Fog/Rain', 'normal'), 2);
  t.is('an ODD modifier rounds down to nothing: +1 becomes 0',
    meleeVisibilityModifier('Heavy Smoke/Fog/Rain', 'thermoCyb'), 0);
  // ⚠ Vision keys are the five in SR3E_VISION_TYPES (lowLightNat / lowLightCyb / …), not
  // three. An unknown key falls back to NORMAL vision rather than throwing, so a typo here
  // reads as "this vision type makes no difference" — which is how it looked when this
  // test first used made-up keys and every condition returned the normal-vision number.
  t.ok('cybernetic vision is the WORSE half of a slashed cell',
    meleeVisibilityModifier('Partial Light', 'lowLightCyb')
      >= meleeVisibilityModifier('Partial Light', 'lowLightNat'));

  // ── Reach: the default branch is what the system always did ────────────────
  t.eq('no reach differential leaves both sides on their base numbers',
    elect(4, 4, null, 0, 'self'), { atk: 4, def: 4 });
  t.eq('the holder taking the bonus themselves lowers only their own TN',
    elect(4, 4, 'attacker', 2, 'self'), { atk: 2, def: 4 });
  t.eq('and the same when the DEFENDER holds the reach',
    elect(4, 4, 'defender', 1, 'self'), { atk: 4, def: 3 });

  // ── Reach: the election the book grants and the system never offered ───────
  t.eq('pushing it onto the opponent raises BOTH numbers by N',
    elect(4, 4, 'attacker', 2, 'opponent'), { atk: 4, def: 6 });
  t.eq('same magnitude from the defender\'s side',
    elect(4, 4, 'defender', 1, 'opponent'), { atk: 5, def: 4 });

  // THE PROPERTY THAT MATTERS: the two branches are equally strong. If a future change
  // makes one of them shift the gap, one option becomes strictly better and the choice the
  // rule exists to create collapses.
  const self = elect(5, 5, 'attacker', 2, 'self');
  const opp  = elect(5, 5, 'attacker', 2, 'opponent');
  t.is('both branches leave the same gap between the two target numbers',
    (self.def - self.atk), (opp.def - opp.atk));

  // ⚠ EXCEPT at the floor, where they stop being equivalent — and that is RAW, not a bug.
  // "No target number can ever be less than 2" (p.112), so a bonus that would take you
  // below 2 is simply lost, while the same points pushed onto the opponent are not. With
  // base 4 and reach 3 the self branch clamps to 2 (a gap of 2) and the opponent branch
  // gives 4 vs 7 (a gap of 3). Against a soft target the election is a real edge, which is
  // exactly the kind of judgement the rule hands to the player rather than the system.
  const lowSelf = elect(4, 4, 'attacker', 3, 'self');
  const lowOpp  = elect(4, 4, 'attacker', 3, 'opponent');
  t.is('the self branch loses the surplus at the TN floor', lowSelf.atk, 2);
  t.ok('so pushing onto the opponent is strictly better once you would clamp',
    (lowOpp.def - lowOpp.atk) > (lowSelf.def - lowSelf.atk));

  t.eq('a target number can never be driven below 2',
    elect(3, 4, 'attacker', 9, 'self'), { atk: 2, def: 4 });

  // ── The window adds to the base TNs, it does not replace them ──────────────
  // `sumMeleeModifiers` returns deltas precisely so reach, defaulting and called shots —
  // already folded into the base — survive. Handing back finished numbers would discard
  // them, which is the single most likely way to break this window.
  const d = sumMeleeModifiers({ friends: 2, prone: 'defender' });
  t.is('deltas are relative: 2 surplus friends and a prone defender is −4 for the attacker',
    d.atk, -4);
  t.is('and +2 for the defender, who is outnumbered but not the one on the ground',
    d.def, 2);
}
