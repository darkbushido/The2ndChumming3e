/**
 * Adept powers — the pure rules.  · *SR3 p.168-169, p.244-245*
 *
 * Covers TODO 60 (Improved Ability's cap), 63 (Attribute Boost's arithmetic) and 64
 * (Improved Reflexes not stacking with technology).
 *
 * The book, in the three places these rules live:
 *
 *   "To gain the boost, make a Magic Test against a target number equal to one half the base
 *    (unaugmented) rating of the Attribute being boosted (round up)… the Attribute is boosted
 *    by the level of the power. The boost lasts for a number of Combat Turns equal to the
 *    number of successes. No Attribute can be boosted to greater than twice its Racial
 *    Modified Limit… When the boost runs out, you must make a Drain Resistance Test. The
 *    target number is equal to one-half the boosted Attribute value (round up)."   (p.168-169)
 *
 *   "You cannot have more additional dice than your base skill rating or your Magic
 *    Attribute, whichever is less. For example, an adept with Pistols 4 and Magic 5 cannot
 *    have more than 4 Improved Ability (Pistols) dice."                                (p.169)
 *
 *   "The maximum level of Improved Reflexes is 3, and the increase cannot be combined with
 *    technological or other magical increases to Reaction or Initiative."              (p.169)
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'adept-powers';

export async function run(t) {

  /* ════════════════════════════════════════════════════════════════════════════
   *  Racial Attribute Limit Table · p.245
   *
   * ⚠ Every cell asserted. The table extracts from the PDF with its row labels offset by
   * one line — a classic two-column merge — so it was RECONSTRUCTED, and a reconstruction
   * that nobody checks is a guess. These numbers are the well-known SR3 racial maxima and
   * this test is what makes that claim falsifiable.
   * ════════════════════════════════════════════════════════════════════════════ */
  const BOOK = {
    //        BOD QUI STR CHA INT WIL
    human: [   6,  6,  6,  6,  6,  6 ],
    elf:   [   6,  7,  6,  8,  6,  6 ],
    dwarf: [   7,  6,  8,  6,  6,  7 ],
    ork:   [   9,  6,  8,  5,  5,  6 ],
    troll: [  11,  5, 10,  4,  4,  6 ],
  };
  const ATTRS = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'];
  for (const [race, row] of Object.entries(BOOK)) {
    row.forEach((want, i) => {
      t.is(`${race} ${ATTRS[i]} limit is ${want}`,
        SR3EActor.racialLimit(race, ATTRS[i]), want);
    });
  }

  t.is('an unknown metatype falls back to human, not to zero',
    SR3EActor.racialLimit('sasquatch', 'strength'), 6);
  t.is('…and so does a missing one',
    SR3EActor.racialLimit(undefined, 'body'), 6);
  t.is('an unknown ATTRIBUTE also yields the baseline 6, never undefined',
    SR3EActor.racialLimit('troll', 'magic'), 6);

  /* ==== Attribute Maximum = limit × 1.5, and it must reproduce the printed column ==== */
  const MAX = { 4: 6, 5: 8, 6: 9, 7: 11, 8: 12, 9: 14, 10: 15, 11: 17 };
  for (const [limit, want] of Object.entries(MAX)) {
    t.is(`limit ${limit} → Attribute Maximum ${want}`, SR3EActor.racialMax(Number(limit)), want);
  }
  // ⚠ The four half-values are the whole reason rounding direction matters. Rounding DOWN
  // gives 10/13/16/7 and makes Drain harsher for exactly the metatypes that boost most.
  t.ok('7 rounds UP to 11, not down to 10', SR3EActor.racialMax(7) === 11);
  t.ok('9 rounds UP to 14, not down to 13', SR3EActor.racialMax(9) === 14);
  t.ok('11 rounds UP to 17, not down to 16', SR3EActor.racialMax(11) === 17);
  t.ok('5 rounds UP to 8, not down to 7', SR3EActor.racialMax(5) === 8);

  /* ════════════════════════════════════════════════════════════════════════════
   *  Attribute Boost — activation TN · p.168
   * ════════════════════════════════════════════════════════════════════════════ */
  const boostTN = SR3EActor.attributeBoostTN;
  t.is('base 6 → TN 3',  boostTN(6), 3);
  t.is('base 5 → TN 3 (½ rounds UP)', boostTN(5), 3);
  t.is('base 7 → TN 4',  boostTN(7), 4);
  t.is('base 10 → TN 5', boostTN(10), 5);
  t.is('base 1 floors at TN 2, never 1 — no test is auto-success', boostTN(1), 2);
  t.is('base 0 floors at 2 as well', boostTN(0), 2);
  t.is('undefined does not throw and floors at 2', boostTN(undefined), 2);

  /* ==== Drain TN · p.169 — off the BOOSTED value, not the base ==== */
  const drainTN = SR3EActor.attributeBoostDrainTN;
  t.is('boosted 8 → Drain TN 4', drainTN(8), 4);
  t.is('boosted 9 → Drain TN 5 (rounds UP)', drainTN(9), 5);
  t.is('boosted 13 → Drain TN 7', drainTN(13), 7);
  // ⚠ THE trap: p.168's activation TN reads off the base, p.169's Drain TN off the boosted
  // value. One page apart, near-identical wording. A Strength 6 adept with a +4 boost
  // activates at TN 3 and pays Drain at TN 5 — if these ever agree, one of them is wrong.
  t.ok('activation and Drain TNs are computed from DIFFERENT numbers',
    boostTN(6) === 3 && drainTN(10) === 5);

  /* ==== The ceiling · p.169 ==== */
  t.is('human limit 6 → boost ceiling 12', SR3EActor.attributeBoostCap(6), 12);
  t.is('troll Strength limit 10 → ceiling 20', SR3EActor.attributeBoostCap(10), 20);
  t.ok('the ceiling is above the Attribute Maximum, so the S band is reachable',
    SR3EActor.attributeBoostCap(6) > SR3EActor.racialMax(6));

  /* ==== Attribute Boost Drain Table · p.169 ==== */
  const lvl = (boosted, limit) => SR3EActor.attributeBoostDrainLevel({ boosted, limit });
  t.is('at the Racial Modified Limit exactly → Light', lvl(6, 6), 'L');
  t.is('below it → Light', lvl(4, 6), 'L');
  t.is('one over the limit → Moderate', lvl(7, 6), 'M');
  t.is('at the Attribute Maximum exactly (9) → Moderate', lvl(9, 6), 'M');
  t.is('one over the Attribute Maximum → Serious', lvl(10, 6), 'S');
  t.is('at twice the limit → Serious', lvl(12, 6), 'S');
  // Both boundaries are inclusive on the lower band — "less than or equal to", "up to".
  t.ok('the L/M boundary sits AT the limit, not below it', lvl(6, 6) === 'L' && lvl(7, 6) === 'M');
  t.ok('the M/S boundary sits AT the Attribute Maximum', lvl(9, 6) === 'M' && lvl(10, 6) === 'S');

  // A troll boosting Strength stays inside band L far longer than a human — the asymmetry
  // is the point of grading on the total rather than on the size of the boost.
  const trollStr = SR3EActor.racialLimit('troll', 'strength');
  t.is('troll Strength 10 boosted to 10 is still Light', lvl(10, trollStr), 'L');
  t.is('…while a human at 10 is Serious', lvl(10, SR3EActor.racialLimit('human', 'strength')), 'S');

  /* ════════════════════════════════════════════════════════════════════════════
   *  Improved Ability — the cap · p.169 (TODO 60)
   * ════════════════════════════════════════════════════════════════════════════ */
  const ia = (level, skillRating, magic) =>
    SR3EActor.improvedAbilityDice({ level, skillRating, magic });

  // The book's own worked example, verbatim.
  t.is('Pistols 4, Magic 5, power level 6 → 4 dice (the book\'s example)', ia(6, 4, 5), 4);
  t.is('…and Magic is the binding cap when it is the smaller', ia(6, 8, 5), 5);
  t.is('a level below both caps is used as-is', ia(2, 4, 5), 2);
  t.is('level equal to the cap passes through', ia(4, 4, 5), 4);
  t.ok('the cap is the MINIMUM of the two, never the maximum', ia(9, 3, 7) === 3);

  t.is('a skill the adept does not have caps at 0', ia(4, 0, 6), 0);
  t.is('no Magic caps at 0 — losing Magic loses the dice', ia(4, 6, 0), 0);
  t.is('a negative never escapes as a negative', ia(-3, 4, 5), 0);
  t.is('no arguments is 0, not NaN', SR3EActor.improvedAbilityDice(), 0);

  /* ════════════════════════════════════════════════════════════════════════════
   *  Improved Reflexes does not stack · p.169 (TODO 64)
   * ════════════════════════════════════════════════════════════════════════════ */
  const rx = o => SR3EActor.reflexBonus(o);

  // Improved Reflexes 2 (+4 REA, +2 dice) alone.
  const adeptOnly = rx({ adeptRea: 4, adeptInit: 2 });
  t.is('adept alone: +4 Reaction', adeptOnly.rea, 4);
  t.is('adept alone: +2 Initiative dice', adeptOnly.initDice, 2);
  t.is('adept alone is not a conflict', adeptOnly.conflict, false);

  // Wired Reflexes 1 (+2 REA, +1 die) alone.
  const cyberOnly = rx({ cyberRea: 2, cyberInit: 1 });
  t.is('cyber alone: +2 Reaction', cyberOnly.rea, 2);
  t.is('cyber alone is not a conflict either', cyberOnly.conflict, false);
  t.is('…and reports itself as the cyber source', cyberOnly.source, 'cyber');

  t.is('neither source is a no-op', rx({}).rea, 0);
  t.is('…with no dice', rx({}).initDice, 0);
  t.is('…and no conflict', rx({}).conflict, false);
  t.is('…reporting no source at all', rx({}).source, 'none');

  /* ==== Both present — the rule bites ==== */
  const both = rx({ adeptRea: 4, adeptInit: 2, cyberRea: 2, cyberInit: 1 });
  t.is('both present is flagged as a conflict', both.conflict, true);
  // ⚠ THE assertion this whole rule exists for. Summing gives 6/3.
  t.is('they do NOT sum — Reaction is the better package alone', both.rea, 4);
  t.is('…nor do the dice sum', both.initDice, 2);
  t.is('the better package is the adept one here', both.source, 'adept');
  // ⚠ `?.` deliberately. A mutant that sums the two packages returns `dropped: null`, and a
  // bare `.rea` would THROW rather than fail — which the mutation harness reports as
  // "never really ran" instead of as a kill. An assertion that cannot fail cleanly is not
  // an assertion.
  t.is('…and the dropped package is reported, not hidden', both.dropped?.rea ?? null, 2);

  // Wired Reflexes 3 (+6/+3) against Improved Reflexes 1 (+2/+1): technology wins.
  const cyberWins = rx({ adeptRea: 2, adeptInit: 1, cyberRea: 6, cyberInit: 3 });
  t.is('the bigger cyber package wins', cyberWins.source, 'cyber');
  t.is('…taking its Reaction', cyberWins.rea, 6);
  t.is('…and its dice', cyberWins.initDice, 3);
  t.is('…still a conflict', cyberWins.conflict, true);
  t.is('…and it is the ADEPT package that is dropped', cyberWins.dropped?.initDice ?? null, 1);

  // ⚠ Initiative dice decide first. Here cyber has MORE Reaction but FEWER dice; a die is
  // worth far more than a point of Reaction across a Combat Turn, so the adept must win.
  const diceFirst = rx({ adeptRea: 2, adeptInit: 3, cyberRea: 6, cyberInit: 1 });
  t.is('more dice beats more Reaction', diceFirst.source, 'adept');
  t.is('…so the smaller Reaction is what applies', diceFirst.rea, 2);

  // Ties go to the adept — Magic is the character's own and cannot be removed surgically.
  const tie = rx({ adeptRea: 4, adeptInit: 2, cyberRea: 4, cyberInit: 2 });
  t.is('an exact tie goes to the adept', tie.source, 'adept');
  t.is('…and is still reported as a conflict', tie.conflict, true);

  /* ==== Never worse than either source alone ====
   *
   * A property rather than a case: whatever the rule picks, the character must not end up
   * with less than one of the two packages would have given on its own. That is the failure
   * mode of "refuse to derive anything when they conflict".
   */
  let floorHeld = true;
  for (let ar = 0; ar <= 6; ar += 2) {
    for (let ai = 0; ai <= 3; ai++) {
      for (let cr = 0; cr <= 6; cr += 2) {
        for (let ci = 0; ci <= 3; ci++) {
          const r = rx({ adeptRea: ar, adeptInit: ai, cyberRea: cr, cyberInit: ci });
          if (r.initDice < Math.min(ai, ci) || r.rea < Math.min(ar, cr)) floorHeld = false;
          // …and never more than the better of the two, i.e. never a sum.
          if (r.initDice > Math.max(ai, ci) || r.rea > Math.max(ar, cr)) floorHeld = false;
        }
      }
    }
  }
  t.ok('across 256 combinations the result is always one of the two packages, never a sum',
    floorHeld);

  /* ════════════════════════════════════════════════════════════════════════════
   *  Power classification — the join the sheet depends on
   * ════════════════════════════════════════════════════════════════════════════ */
  const kind = SR3E.adeptPowerKind;
  t.is('Imp Abl Combat Skl*-> is Improved Ability', kind('Imp Abl Combat Skl*->'), 'improvedAbility');
  t.is('Imp Abl Vehicle Skl*-> too (SOTA2 expanded)', kind('Imp Abl Vehicle Skl*->'), 'improvedAbility');
  t.is('Attribute Boost(STR)* is a boost', kind('Attribute Boost(STR)*'), 'attributeBoost');
  t.is('Imp. Reflexes Level 2 is reflexes', kind('Imp. Reflexes Level 2'), 'improvedReflexes');
  t.is('Imp. Phys. Attr.(BOD)* is the passive attribute power',
    kind('Imp. Phys. Attr.(BOD)*'), 'improvedPhysical');
  t.is('…and the RACMOD variant classifies the same',
    kind('Imp. Phys. Attr.(STR)>RACMOD*  1'), 'improvedPhysical');
  // ⚠ Improved Physical Attribute must NOT read as Improved Ability — both start "Imp",
  // and misfiling it would offer a skill picker on an attribute power, which is the exact
  // shape of the bug that started this work.
  t.ok('Improved Physical Attribute is never mistaken for Improved Ability',
    kind('Imp. Physical Attr.(STR)*') !== 'improvedAbility');
  t.is('an unrelated power is just "other"', kind('Astral Perception'), 'other');
  t.is('an empty name does not throw', kind(''), 'other');
  t.is('undefined does not throw', kind(undefined), 'other');

  const target = SR3E.attributeBoostTarget;
  t.is('Attribute Boost(STR) targets strength', target('Attribute Boost(STR)*'), 'strength');
  t.is('Attribute Boost(BOD) targets body', target('Attribute Boost(BOD)*'), 'body');
  // ⚠ `QIC` is an upstream TYPO that ships in the pack. Reading it as unknown would leave
  // the Quickness boost silently doing nothing.
  t.is('Attribute Boost(QIC) — the shipped typo — still targets quickness',
    target('Attribute Boost(QIC)*'), 'quickness');
  t.is('a non-boost power targets nothing', target('Imp. Reflexes Level 1'), null);
}
