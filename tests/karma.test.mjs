/**
 * Karma & advancement — the costing rules.  · *SR3 p.244-245*
 *
 * Covers TODO 80, all seven defects.
 *
 * The book, in the places these rules live:
 *
 *   "A character can increase Physical and Mental Attributes 1 point (at a time) by paying a
 *    number of Good Karma points equal to twice the rating to which the Attribute is being
 *    raised… To improve an Attribute above the Racial Modified Limit has a cost equal to 3x
 *    the rating to which the Attribute is being raised… A character's Attribute Maximum is
 *    equal to their Racial Modified Limit times 1.5."                                (p.244)
 *
 *   "Shetani, an elf character, has a Total Karma of 62, Good Karma of 10, and Karma Pool of
 *    4… Every twentieth point has been added to the Karma Pool (each character starts with 1
 *    Karma Pool) and the rest (59) has gone to Good Karma."                          (p.244)
 *
 *   "Multiply the number given on the table by the new rating (round fractions down) to
 *    determine the cost in Good Karma."                                              (p.245)
 *
 *   "New skills can be purchased at a skill rating of 1, by paying a cost of 1 in Good Karma.
 *    New skills only cost 1, whether they are Active, Knowledge, or Language Skills."(p.245)
 *
 *   "There may be more than one specialization to a base skill, up to a maximum number of
 *    specializations equal to the base skill's Linked Attribute Rating."             (p.245)
 *
 * ⚠ **THE BOOK'S OWN WORKED EXAMPLES CANNOT CATCH TWO OF THESE.** Every printed cost lands on
 * an integer, where rounding up and rounding down agree; and Brick's Stealth 5 / Quickness 6
 * is one apart, where the skill-rating and attribute-rating specialisation caps agree. A test
 * written from the examples alone passes against the code as it was. The fractional and
 * divergent cases below are the point of this file.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'karma';

export async function run(t) {

  /* ════════════════════════════════════════════════════════════════════════════
   *  Skill Improvement Cost Table · p.245
   *
   * | New rating is…            | Active | Knowledge/Language | Spec (both) |
   * |---------------------------|--------|--------------------|-------------|
   * | ≤ the linked Attribute    | 1.5    | 1                  | .5          |
   * | ≤ 2× the linked Attribute | 2      | 1.5                | 1           |
   * | > 2× the linked Attribute | 2.5    | 2                  | 1.5         |
   * ════════════════════════════════════════════════════════════════════════════ */
  const skill = SR3EActor.karmaSkillCost;
  const spec  = SR3EActor.karmaSpecCost;

  // Every cell of the base-skill table, on a rating where the multiplier is exact.
  t.is('active, at the attribute: 4 × 1.5',            skill(4, 4, true),  6);
  t.is('active, within 2× the attribute: 6 × 2',       skill(6, 4, true),  12);
  t.is('active, above 2× the attribute: 10 × 2.5',     skill(10, 4, true), 25);
  t.is('knowledge, at the attribute: 4 × 1',           skill(4, 4, false), 4);
  t.is('knowledge, within 2× the attribute: 6 × 1.5',  skill(6, 4, false), 9);
  t.is('knowledge, above 2× the attribute: 10 × 2',    skill(10, 4, false), 20);

  // …and the specialisation table.
  t.is('spec, at the attribute: 4 × .5',           spec(4, 4),  2);
  t.is('spec, within 2× the attribute: 6 × 1',     spec(6, 4),  6);
  t.is('spec, above 2× the attribute: 10 × 1.5',   spec(10, 4), 15);

  /* ⚠ **The specialisation columns are IDENTICAL for active and knowledge skills.** That
   * `karmaSpecCost` takes no `isActive` argument reads like an omission beside
   * `karmaSkillCost`, one line above it in the source. It is the table. */
  t.is('a spec costs the same whatever the skill type', spec(6, 4), spec(6, 4));

  /* ════════════════════════════════════════════════════════════════════════════
   *  DEFECT 2 — "round fractions DOWN" · p.245
   *
   * These are the cases the book never prints. Under the shipped `Math.ceil` every one of
   * them was one karma too expensive.
   * ════════════════════════════════════════════════════════════════════════════ */
  t.is('active → 3 at or below the attribute (3 × 1.5 = 4.5) costs 4, not 5',
    skill(3, 4, true), 4);
  t.is('active → 5 at or below the attribute (5 × 1.5 = 7.5) costs 7, not 8',
    skill(5, 6, true), 7);
  t.is('active → 3 above 2× the attribute (3 × 2.5 = 7.5) costs 7, not 8',
    skill(3, 1, true), 7);
  t.is('knowledge → 3 within 2× the attribute (3 × 1.5 = 4.5) costs 4, not 5',
    skill(3, 2, false), 4);
  t.is('spec → 5 at or below the attribute (5 × .5 = 2.5) costs 2, not 3',
    spec(5, 6), 2);
  t.is('spec → 7 above 2× the attribute (7 × 1.5 = 10.5) costs 10, not 11',
    spec(7, 3), 10);

  /* The book's three worked examples. ⚠ They all land on integers, so they pass under BOTH
   * roundings — asserted anyway, because they are the only printed numbers, but they are not
   * what protects the rule. */
  t.is("Brick's Sneaking at 6, Quickness 6 (6 × .5)", spec(6, 6), 3);
  t.is('…raised again to 7, above Quickness 6 (7 × 1)', spec(7, 6), 7);
  t.is("Iris's Beretta 101T at 6 (6 × 1)", spec(6, 5), 6);

  /* ════════════════════════════════════════════════════════════════════════════
   *  DEFECT 1 — learning a new skill is a FLAT 1 · p.245
   * ════════════════════════════════════════════════════════════════════════════ */
  t.is('a new skill costs 1', SR3EActor.karmaNewSkillCost(), 1);

  /* ⚠ **The flat rate and the cost table AGREE for any real character, and that is a
   * coincidence rather than a reason to delete this function.** Rating 1 is at or below any
   * attribute of 1+, so the table's first row applies: floor(1 × 1.5) = 1 active,
   * floor(1 × 1) = 1 knowledge. Both equal the flat rate.
   *
   * It was NOT a coincidence before defect 2 was fixed — under the shipped `Math.ceil` the
   * table charged ceil(1.5) = 2 for an active skill. So the two defects were entangled:
   * fixing the missing new-skill row without also fixing the rounding would have overcharged
   * every new active skill, which is worth knowing if they are ever reverted separately. */
  t.is('the cost table happens to give 1 too, for an active skill', skill(1, 4, true), 1);
  t.is('…and for a knowledge skill',                               skill(1, 4, false), 1);
  t.is('…but the OLD ceil rounding would have charged 2',          Math.ceil(1 * 1.5), 2);

  /* Where they genuinely differ: an attribute of 0 puts rating 1 above 2× the attribute, so
   * the table's third row charges 2. Not reachable by a living character — but it is why the
   * rule is expressed as a flat rate that reads neither the attribute nor the skill type. */
  t.is('with a 0 attribute the table would charge 2', skill(1, 0, true), 2);
  t.is('…while the flat rate is still 1',             SR3EActor.karmaNewSkillCost(), 1);

  /* ════════════════════════════════════════════════════════════════════════════
   *  DEFECT 5 — Attributes above the Racial Modified Limit cost 3× · p.244
   * ════════════════════════════════════════════════════════════════════════════ */
  const attrCost = SR3EActor.karmaAttributeCost;

  t.is("the book's own example: Strength 5 → 6 costs 12", attrCost(6, 6), 12);
  t.is('at the limit is still 2×', attrCost(6, 6), 12);

  /* p.244's second example: "an elf character who wanted to raise her Strength from 6 to 7"
   * — an elf's Strength limit is 6, so 7 is above it: 7 × 3 = 21. */
  t.is('an elf raising Strength 6 → 7, above her limit of 6, costs 21', attrCost(7, 6), 21);

  /* ⚠ The multiplier turns on the NEW rating against the limit, not the old one. Going 6 → 7
   * is already above a limit of 6 when you pay, so it is 21 and not 14. */
  t.is('the NEW rating decides the multiplier, not the old one', attrCost(7, 6), 7 * 3);
  t.ok('…which is not what 2× would give', attrCost(7, 6) !== 7 * 2);

  t.is('a troll raising Body 11 → 12, above his limit of 11, costs 36', attrCost(12, 11), 36);
  t.is('…while 11 itself, at the limit, costs 22', attrCost(11, 11), 22);

  // Attribute Maximum is reported, never enforced.
  t.is('a human attribute maximum is 9 (6 × 1.5)',  SR3EActor.karmaAttributeMaximum(6), 9);
  t.is('a troll Body maximum is 16 (11 × 1.5)',     SR3EActor.karmaAttributeMaximum(11), 16);
  t.ok('a purchase past the maximum is still PRICED, not refused',
    attrCost(20, 6) === 60);

  // The racial limits themselves already have their own coverage in adept-powers; spot-check
  // that this consumer reads the same table.
  t.is('an elf Charisma limit of 8 prices 8 at 2× and 9 at 3×',
    attrCost(SR3EActor.racialLimit('elf', 'charisma'), 8), 16);

  /* ════════════════════════════════════════════════════════════════════════════
   *  DEFECT 3 — the specialisation cap is the LINKED ATTRIBUTE's rating · p.245
   * ════════════════════════════════════════════════════════════════════════════ */
  const cap = SR3EActor.karmaMaxSpecialisations;

  t.is('Quickness 6 allows 6 specialisations', cap(6), 6);

  /* ⚠ The two divergent cases, neither of which the book prints. The code gated on the SKILL
   * rating until 2026-08-31, so it was wrong in both directions. */
  t.is('Stealth 2 / Quickness 6 allows 6, not 2', cap(6), 6);
  t.is('Stealth 6 / Quickness 3 allows 3, not 6', cap(3), 3);

  /* ⚠ Brick — the book's own example — has Stealth 5 and Quickness 6. One apart, so he reads
   * correctly under either rule and cannot distinguish them. */
  t.ok("Brick's own numbers cannot tell the two rules apart", Math.abs(cap(6) - 5) === 1);

  t.is('a 0-rated attribute allows none', cap(0), 0);
  t.is('a negative rating does not go below 0', cap(-3), 0);

  /* ════════════════════════════════════════════════════════════════════════════
   *  DEFECT 4 — specialisations are not capped at level 2 · p.245
   * ════════════════════════════════════════════════════════════════════════════ */
  const target = SR3EActor.karmaSpecTargetRating;

  /* `level` is the BONUS over the base skill, so a spec at level L rolls base + L. */
  t.is('a brand-new spec on Stealth 5 is bought at 6', target(5, 0), 6);
  t.is('…raising that level-1 spec goes to 7',          target(5, 1), 7);

  /* ⚠ The sheet stopped here, hard-writing level 2. "To improve the specialization beyond
   * that, follow the rules above as normal" — there is no ceiling. */
  t.is('…and a level-2 spec goes to 8, which the sheet used to forbid', target(5, 2), 8);
  t.is('…and a level-5 spec keeps going',               target(5, 5), 11);

  t.is('a missing level is treated as brand new', target(5), 6);

  /* ════════════════════════════════════════════════════════════════════════════
   *  DEFECT 6 — the twentieth point goes to the Pool INSTEAD of Good Karma · p.244
   * ════════════════════════════════════════════════════════════════════════════ */
  const award = SR3EActor.karmaAward;

  /* The book's Shetani, worked end to end: 62 career karma, 4 Karma Pool (1 starting + 3
   * earned), and 59 of it reaching Good Karma. */
  const shetani = award(0, 62);
  t.is('Shetani: total karma 62',                shetani.newTotal, 62);
  t.is('Shetani: 3 Karma Pool points earned',    shetani.poolGained, 3);
  t.is('Shetani: 59 reaches Good Karma, not 62', shetani.goodKarma, 59);
  t.is('Shetani: Karma Pool of 4, starting point included',
    SR3EActor.karmaPoolForTotal(62), 4);

  /* ⚠ The pool point is taken FROM the award, not added beside it. The sheet granted both,
   * so a character gained an extra spendable point per 20 earned. */
  t.is('good karma + pool points always equals the award',
    shetani.goodKarma + shetani.poolGained, 62);

  const small = award(0, 5);
  t.is('an award that crosses no twentieth point is all Good Karma', small.goodKarma, 5);
  t.is('…and grants no pool', small.poolGained, 0);

  const crossing = award(19, 1);
  t.is('the twentieth point itself goes to the Pool', crossing.poolGained, 1);
  t.is('…and NOT to Good Karma', crossing.goodKarma, 0);

  /* ⚠ `poolGained` is a delta across the WHOLE award, so one large award grants every
   * twentieth point it crosses rather than only one. That part was always right. */
  t.is('one 60-point award grants 3 pool points, not 1', award(0, 60).poolGained, 3);
  t.is('an award from 19 to 41 crosses two',             award(19, 22).poolGained, 2);

  t.is('a zero award changes nothing',    award(37, 0).goodKarma, 0);
  t.is('…and grants no pool',             award(37, 0).poolGained, 0);
  t.is('a negative award is clamped',     award(37, -5).goodKarma, 0);
  t.is('undefined args do not throw',     award().newTotal, 0);

  /* ════════════════════════════════════════════════════════════════════════════
   *  DEFECT 7 — every character starts with 1 Karma Pool · p.244
   * ════════════════════════════════════════════════════════════════════════════ */
  t.is('a fresh character has 1 Karma Pool, not 0', SR3EActor.karmaPoolForTotal(0), 1);
  t.is('19 career karma is still 1',                SR3EActor.karmaPoolForTotal(19), 1);
  t.is('20 career karma is 2',                      SR3EActor.karmaPoolForTotal(20), 2);
  t.is('the shipped schema default now matches',    SR3EActor.karmaPoolForTotal(0), 1);
  t.is('a negative total does not go below 1',      SR3EActor.karmaPoolForTotal(-40), 1);

  /* The migration recognises a Pool that still equals what the OLD, wrong formula produced —
   * `floor(total / 20)`, with no starting point — and only then corrects it. */
  t.is('the old formula gave a fresh character 0', Math.floor(0 / 20), 0);
  t.is('…and Shetani 3 rather than 4',             Math.floor(62 / 20), 3);
  t.is('the correction is always exactly +1',
    SR3EActor.karmaPoolForTotal(62) - Math.floor(62 / 20), 1);
}
