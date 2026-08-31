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
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

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

  /* ════════════════════════════════════════════════════════════════════════════
   *  Enhanced Articulation's Reaction does not reach rigging or decking · M&M p.66
   *  (TODO 30)
   *
   * The bonus is about how the body moves. A rigger jumped into a drone, or a decker in VR,
   * is not using theirs — but the bonus is perfectly real for physical Reaction, dodging and
   * ordinary Reaction Tests, so it cannot simply be removed from the attribute.
   * ════════════════════════════════════════════════════════════════════════════ */
  const derive = (items, magicType = '') => {
    const sys = { magicType, attributes: {}, wounds: {} };
    const attr = {};
    for (const k of ['body','quickness','strength','charisma','intelligence','willpower','reaction','essence','magic'])
      attr[k] = { base: 4, value: 4 };
    SR3EActor.prototype._prepareCharacter.call({ items, system: sys }, sys, attr);
    return { d: sys.derived, attr };
  };
  const ea    = { type: 'bioware', name: 'Enhanced Articulation', system: { bonusRea: 1 } };
  const wired = { type: 'cyberware', name: 'Wired Reflexes [2]', system: { bonusRea: 4, bonusInitDice: 2 } };

  const withEA = derive([ea]);
  t.is('Enhanced Articulation raises ordinary Reaction', withEA.attr.reaction.value,
    withEA.d.reactionNoRigDeck + 1);
  t.is('…and is removed for rigging and decking',
    withEA.attr.reaction.value - withEA.d.reactionNoRigDeck, 1);

  // ⚠ The exclusion is specific to THAT bonus, not to cyberware at large. Wired reflexes
  // apply to decking perfectly well; only Enhanced Articulation is carved out.
  const withWired = derive([wired]);
  t.is('wired reflexes are NOT excluded from rigging or decking',
    withWired.d.reactionNoRigDeck, withWired.attr.reaction.value);

  const withBoth = derive([ea, wired]);
  t.is('with both, exactly the Enhanced Articulation point comes off',
    withBoth.attr.reaction.value - withBoth.d.reactionNoRigDeck, 1);

  const plain = derive([]);
  t.is('no augmentation means nothing to remove',
    plain.d.reactionNoRigDeck, plain.attr.reaction.value);

  // ⚠ When the ADEPT package wins the p.169 non-stacking contest, the cyber bonus was never
  // applied — so subtracting its exempt portion would take away a bonus nobody received.
  const adeptWins = derive(
    [ea, { type: 'adeptpower', name: 'Imp. Reflexes Level 3',
           system: { bonusRea: 6, bonusInitDice: 3, hasLevels: false, level: 1 } }],
    'Adept');
  t.is('when the adept package wins, nothing is subtracted',
    adeptWins.d.reactionNoRigDeck, adeptWins.attr.reaction.value);
  t.is('…and the reflex conflict was indeed resolved to the adept',
    adeptWins.d.reflex.source, 'adept');

  t.ok('the corrected Reaction never drops below 1', derive([ea]).d.reactionNoRigDeck >= 1);

  /* ════════════════════════════════════════════════════════════════════════════
   *  Triggered cyber/bioware · M&M p.63 (Adrenal Pump), p.71 (Pain Editor) — TODO 30
   * ════════════════════════════════════════════════════════════════════════════ */
  const bio = (name, id) => ({ id: id ?? name.replace(/\W/g, ''), type: 'bioware', name, system: {} });
  const deriveAug = (items, augmentations = {}, base = {}) => {
    const sys = { magicType: '', augmentations, attributes: {},
                  wounds: { stun: { value: base.stun ?? 0 }, physical: { value: base.phys ?? 0 } } };
    const attr = {};
    for (const k of ['body','quickness','strength','charisma','intelligence','willpower','reaction','essence','magic'])
      attr[k] = { base: base[k] ?? 4, value: base[k] ?? 4 };
    sys.woundMod = Math.min(0, -(SR3EActor._trackMod(base.stun ?? 0) + SR3EActor._trackMod(base.phys ?? 0)));
    SR3EActor.prototype._prepareCharacter.call({ items, system: sys }, sys, attr);
    return { d: sys.derived, attr, sys };
  };

  const pump2  = bio('Adrenal Pump [2](trig)', 'pump');
  const editor = bio('Pain Editor', 'editor');

  /* ==== detected, and classified ==== */
  const found = deriveAug([pump2, editor]).d.triggeredAugmentations;
  t.is('both triggered augmentations are found', found.length, 2);
  t.is('the pump is a rolled DURATION', found.find(a => a.id === 'pump').kind, 'duration');
  t.is('…at level 2, read from the bracketed name', found.find(a => a.id === 'pump').level, 2);
  t.is('the editor is a TOGGLE', found.find(a => a.id === 'editor').kind, 'toggle');
  t.ok('neither is active until switched on', found.every(a => !a.active));

  /* ==== inactive changes nothing ==== */
  const off = deriveAug([pump2, editor]);
  t.is('an untriggered pump adds no Strength', off.attr.strength.value, 4);
  t.is('a disengaged editor does not touch Willpower', off.attr.willpower.value, 4);

  /* ==== active · "Each level adds 1 to Quickness, 2 to Strength, 1 to Willpower and 2 to
   *      Reaction" — at level 2 that is +2/+4/+2/+4 ==== */
  const on = deriveAug([pump2, editor],
    { pump: { turns: 7, rolledTurns: 7 }, editor: { active: true } });
  t.is('pump 2 gives +2 Quickness', on.attr.quickness.value, 6);
  t.is('…+4 Strength',              on.attr.strength.value, 8);
  t.is('…+2 Willpower, and the editor another +1', on.attr.willpower.value, 7);
  t.is('the editor costs 1 Intelligence',          on.attr.intelligence.value, 3);

  /* ⚠ THE CONSTRAINT. "The Quickness bonus does not affect Reaction… However, the Quickness
   * and Willpower bonuses affect the Combat Pool." (p.63)
   *
   * Base QUI 4 / INT 5 is chosen deliberately: Reaction is floor((4+5)/2) = 4, but with the
   * pump's Quickness folded in first it would be floor((5+5)/2) = 5. Most attribute
   * combinations round to the same number either way and prove nothing — this one separates
   * them. Pump level 1 gives +2 Reaction, so the answer is 6, and 7 means the bonus leaked. */
  const pump1 = bio('Adrenal Pump [1](trig)', 'p1');
  const leak  = deriveAug([pump1], { p1: { turns: 3, rolledTurns: 3 } }, { quickness: 4, intelligence: 5 });
  t.is('the pump\'s Quickness does NOT feed Reaction', leak.attr.reaction.value, 6);
  t.ok('…and 7 would mean it leaked through the derivation', leak.attr.reaction.value !== 7);
  // …but Quickness and Willpower DO reach the Combat Pool, which is derived afterwards.
  const poolOff = deriveAug([pump1], {}, { quickness: 4, intelligence: 5 }).d.combatPool;
  const poolOn  = leak.d.combatPool;
  t.ok('Quickness and Willpower still reach the Combat Pool', poolOn > poolOff);

  /* ==== Pain Editor ignores STUN wound modifiers, not physical · p.71 ==== */
  const stunned = deriveAug([editor], {}, { stun: 6 });
  t.is('6 stun boxes is a −3 modifier with the editor off', stunned.sys.woundMod, -3);
  const stunnedOn = deriveAug([editor], { editor: { active: true } }, { stun: 6 });
  t.is('…and nothing with it engaged', stunnedOn.sys.woundMod, 0);
  // ⚠ Physical damage still counts — "Penalties from Physical damage are applied".
  const hurtOn = deriveAug([editor], { editor: { active: true } }, { stun: 6, phys: 3 });
  t.is('physical wounds still bite through the editor', hurtOn.sys.woundMod, -2);
  t.ok('…so the editor is not simply zeroing the wound modifier', hurtOn.sys.woundMod !== 0);

  /* ==== Nephritic Screen rides the SITUATIONAL channel — no new mechanism ==== */
  const screen = deriveAug([bio('Nephritic Screen', 'neph')]);
  t.is('Nephritic Screen gives +1 die against toxins',
    SR3EActor.situationalBonus(screen.d.situationalBonuses, 'toxin').dice, 1);
  t.is('…and nothing against anything else',
    SR3EActor.situationalBonus(screen.d.situationalBonuses, 'perception').dice, 0);
  t.ok('…and it is not a triggered augmentation',
    !screen.d.triggeredAugmentations.some(a => a.id === 'neph'));

  /* ════════════════════════════════════════════════════════════════════════════
   *  Effect resolution — the level, and what the power does (TODO 66-70)
   * ════════════════════════════════════════════════════════════════════════════ */
  const lvlOf = SR3E.adeptPowerLevel;
  const effOf = SR3E.adeptPowerEffect;

  /* ==== 19 shipped powers carry their level in the NAME ==== */
  // ⚠ Every one of these stores `hasLevels: false, level: 1`. Reading `system.level` makes
  // all three Kinesics level 1 and all three Combat Senses one Combat Pool die.
  const fixed = { hasLevels: false, level: 1 };
  t.is('Combat Sense +3 resolves at level 3', lvlOf('Combat Sense +3', fixed), 3);
  t.is('Kinesics Level 2 resolves at level 2', lvlOf('Kinesics Level 2', fixed), 2);
  t.is('Penetrating Strike Level 3 → 3', lvlOf('Penetrating Strike Level 3', fixed), 3);
  t.is('Flexibility 2 → 2', lvlOf('Flexibility 2', fixed), 2);
  t.is('Imp. Reflexes Level 3 → 3', lvlOf('Imp. Reflexes Level 3', fixed), 3);
  t.is('a name with no trailing number is level 1', lvlOf('Counterstrike*', fixed), 1);
  // A genuinely levelled power reads its own field, and the NAME must not override it.
  t.is('a levelled power uses system.level', lvlOf('Counterstrike*', { hasLevels: true, level: 4 }), 4);
  t.is('…even when the name ends in a number',
    lvlOf('Imp. Phys. Attr.(BOD)>RACMOD*  1', { hasLevels: true, level: 3 }), 3);
  t.is('level 0 or missing floors at 1', lvlOf('Whatever', { hasLevels: true, level: 0 }), 1);

  /* ==== the effects themselves ==== */
  t.is('Counterstrike 3 gives 3 dice', effOf('Counterstrike*', 3).dice, 3);
  t.is('…scoped to counterattacks only', effOf('Counterstrike*', 3).situation, 'counterattack');
  t.is('Sixth Sense is scoped to surprise', effOf('Sixth Sense*', 2).situation, 'surprise');
  t.is('Spell Shroud is scoped to detection spells only',
    effOf('Spell Shroud*', 1).situation, 'detectionSpell');
  // ⚠ Side Step grants COMBAT POOL dice, not skill dice — "one additional Combat Pool die
  // only for the purposes of Dodge and Full Dodge attempts".
  t.is('Side Step 2 gives 2 POOL dice', effOf('Side Step*', 2).pool, 2);
  t.is('…and no skill dice', effOf('Side Step*', 2).dice, 0);
  // ⚠ Flexibility and Kinesics move a TARGET NUMBER, and negative means easier.
  t.is('Flexibility 2 is −2 TN', effOf('Flexibility 2', 2).tn, -2);
  t.ok('…negative, i.e. easier', effOf('Flexibility 2', 2).tn < 0);
  t.is('Kinesics 3 is −3 TN on social tests', effOf('Kinesics Level 3', 3).tn, -3);
  t.is('Combat Sense +3 is 3 Combat Pool dice', effOf('Combat Sense +3', 3).pool, 3);
  t.is('…with no situation, so it applies always', effOf('Combat Sense +3', 3).situation, null);
  t.is('Enhanced Perception is capped by Intelligence', effOf('Enhanced Perception*', 4).capBy, 'intelligence');
  t.is('a reference-only power has no effect at all', effOf('Astral Perception', 1), null);
  t.is('…nor does an Improved Sense', effOf('Imp. Sense: Thermo Vision', 1), null);
  // A power the system can state but not resolve still returns its note.
  t.ok('Sprint carries a note even with no numbers', !!effOf('Sprint*', 3).note);

  /* ════════════════════════════════════════════════════════════════════════════
   *  situationalBonus — the third channel (TODO 70)
   * ════════════════════════════════════════════════════════════════════════════ */
  const BONUSES = [
    { label: 'Counterstrike* 2', situation: 'counterattack', dice: 2, tn: 0, pool: 0 },
    { label: 'Rooting* 3',       situation: 'knockdown',     dice: 3, tn: 0, pool: 0 },
    { label: 'Enhanced Balance 2', situation: 'knockdown',   dice: 2, tn: 0, pool: 0 },
    { label: 'Side Step* 1',     situation: 'dodge',         dice: 0, tn: 0, pool: 1 },
    { label: 'Flexibility 2',    situation: 'escapeArtist',  dice: 0, tn: -2, pool: 0 },
  ];
  const sb = k => SR3EActor.situationalBonus(BONUSES, k);
  t.is('counterattack picks up only Counterstrike', sb('counterattack').dice, 2);
  // ⚠ Two powers covering the same situation SUM — they are separate purchases, and nothing
  // in the rules makes them exclusive. This is the opposite of reflexBonus, where the book
  // forbids combining.
  t.is('two knockdown powers sum', sb('knockdown').dice, 5);
  t.is('…and both are named', sb('knockdown').labels.length, 2);
  t.is('dodge yields pool dice, not skill dice', sb('dodge').pool, 1);
  t.is('…and no skill dice', sb('dodge').dice, 0);
  t.is('a TN-moving power reports its modifier', sb('escapeArtist').tn, -2);
  t.is('an unrelated situation yields nothing', sb('perception').dice, 0);
  t.is('an unknown situation does not throw', sb('nonsense').dice, 0);
  t.is('an empty situation yields nothing', sb('').dice, 0);
  t.is('undefined bonuses do not throw', SR3EActor.situationalBonus(undefined, 'dodge').dice, 0);
  t.is('a non-array does not throw', SR3EActor.situationalBonus('nope', 'dodge').dice, 0);

  /* ════════════════════════════════════════════════════════════════════════════
   *  Pain Resistance · p.170 (TODO 69)
   * ════════════════════════════════════════════════════════════════════════════ */
  const pain = SR3EActor.painAdjustedBoxes;
  // The book's own worked example: 3 levels, 4 boxes → treated as 1 box, a Light modifier.
  t.is('4 boxes with 3 levels reads as 1', pain(4, 3), 1);
  t.is('3 boxes with 3 levels reads as 0 — no modifier at all', pain(3, 3), 0);
  t.is('below zero clamps to zero', pain(1, 3), 0);
  t.is('no Pain Resistance changes nothing', pain(7, 0), 7);
  t.is('undefined level changes nothing', pain(7), 7);
  t.is('undefined boxes is 0', pain(undefined, 3), 0);

  /* ════════════════════════════════════════════════════════════════════════════
   *  Killing Hands · p.170 (TODO 67)
   * ════════════════════════════════════════════════════════════════════════════ */
  const kh = SR3EItem.killingHandsDamage;
  // ⚠ REPLACES the level, never stages it. Killing Hands (Light) on a (STR)M punch is
  // (STR)L — worse in level, better in kind. Staging would make the cheapest tier an upgrade.
  t.is('Light turns (STR)M Stun into (STR)L', kh('(STR)M Stun', 'L'), '(STR)L');
  t.is('Deadly turns it into (STR)D', kh('(STR)M Stun', 'D'), '(STR)D');
  t.is('the Stun suffix is dropped, so the damage goes physical', kh('(STR)M Stun', 'S'), '(STR)S');
  t.ok('the POWER is untouched — only the level', kh('9M', 'D') === '9D');
  t.is('no declaration leaves the code alone', kh('(STR)M Stun', null), '(STR)M Stun');
  t.is('a nonsense level leaves the code alone', kh('(STR)M Stun', 'X'), '(STR)M Stun');

  // ⚠ The two halves live on different classes, deliberately: `killingHandsLevel` parses a
  // POWER NAME and feeds the actor's derived data, `killingHandsDamage` rewrites a WEAPON's
  // damage code. Same rule, two sides of the attack.
  const khl = SR3EActor.killingHandsLevel;
  t.is('Killing Hands STR(Light) is L', khl('Killing Hands STR(Light)'), 'L');
  // ⚠ The pack says "Medium"; SR3's level is Moderate. Both must map to M or the shipped
  // 1-point tier silently does nothing.
  t.is('the shipped "Medium" maps to M', khl('Killing Hands STR(Medium)'), 'M');
  t.is('Moderate maps to M too', khl('Killing Hands STR(Moderate)'), 'M');
  t.is('Deadly is D', khl('Killing Hands STR(Deadly)'), 'D');
  t.is('another power is not Killing Hands', khl('Counterstrike*'), null);
}
