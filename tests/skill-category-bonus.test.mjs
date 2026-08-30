/**
 * Category-wide skill bonuses — SR3EActor.skillCategoryBonus / parseSkillCategories.
 *
 * Enhanced Articulation (M&M p.66) is the rule this exists for:
 *
 *   "Possessors roll an additional die when making any Success Test involving Combat,
 *    Physical, Technical and Build/Repair Skills. The bonus ALSO APPLIES TO PHYSICAL USE OF
 *    VEHICLE SKILLS — driving a car via datajack or piloting a submarine does not qualify
 *    for the bonus."
 *
 * ⚠ FIVE categories, not four. TODO 10 recorded four and missed the Vehicle sentence entirely.
 * All five exist verbatim in `ACTIVE_SKILL_CATEGORIES`, so the mapping is exact — asserted
 * below, because a category renamed in config.js would otherwise silently stop matching.
 *
 * ⚠ THIS IS NOT `skillBonusDice`, AND THE SEPARATION IS THE POINT. That map is applied
 * automatically at every roll path and its doc comment says consumers must trust it. A
 * category bonus cannot make that promise: the Vehicle clause turns on "physical use", which
 * is a judgement about what the character is doing and is not derivable from the sheet. So
 * this is offered as a CHECKBOX on the Roll Skill dialog — the player opts in per roll — and
 * lives in its own derived list.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E, ACTIVE_SKILL_CATEGORIES } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'skill-category-bonus';

/** Enhanced Articulation as it would sit in `derived.skillCategoryBonuses`. */
const EA = {
  label: 'Enhanced Articulation',
  dice: 1,
  categories: ['Combat skills', 'Physical skills', 'Technical skills',
               'Build/Repair skills', 'Vehicle skills'],
};

export async function run(t) {
  const bonus = (bonuses, cat) => SR3EActor.skillCategoryBonus(bonuses, cat);
  const parse = raw => SR3EActor.parseSkillCategories(raw);

  /* ==== The five categories must be real ones ==== */
  //
  // If config.js renames a category, matching stops silently — the checkbox just never
  // appears and nobody sees an error. This is the assertion that turns that into a failure.
  for (const cat of EA.categories) {
    t.ok(`"${cat}" is a real active-skill category`, ACTIVE_SKILL_CATEGORIES.has(cat));
  }
  t.is('Enhanced Articulation covers five categories, not four', EA.categories.length, 5);

  /* ==== "Counts as": martial arts ARE Combat skills — CC p.87 ====
   *
   * ⚠ THE CASE THAT WAS BROKEN, reported from play 2026-08-21. A martial artist got Enhanced
   * Articulation's die on Unarmed Combat and Edged Weapons but NOT on `MA:Aikido` — the one
   * skill they actually roll — because the match was on the category STRING and a martial
   * art's category is 'Martial Arts'.
   *
   * CC p.87 settles it: "Each of these new martial arts skills is CONSIDERED A COMBAT SKILL
   * and uses the standard rules for Active skills… boxed with Cyber-Implant Weaponry."
   *
   * ⚠ Fixed on the CATEGORY, not on Enhanced Articulation's list. The claim is about martial
   * arts being Combat skills, so any future category-scoped bonus inherits it rather than
   * rediscovering the same gap.
   */
  t.is('a martial art gets a Combat-skills bonus', bonus([EA], 'Martial Arts').dice, 1);
  t.is('…and is named as the source',             bonus([EA], 'Martial Arts').labels.join(), 'Enhanced Articulation');
  t.is('case is still ignored',                   bonus([EA], 'martial arts').dice, 1);

  // A bonus that does NOT cover Combat skills must not leak through the alias.
  const magicOnly = { label: 'Test', dice: 2, categories: ['Magical skills'] };
  t.is('an unrelated bonus does not reach martial arts',
    bonus([magicOnly], 'Martial Arts').dice, 0);

  // ⚠ A bonus covering BOTH the category and what it counts as must pay ONCE, not twice.
  const both = { label: 'Both', dice: 1, categories: ['Combat skills', 'Martial Arts'] };
  t.is('covering both the category and its alias pays once',
    bonus([both], 'Martial Arts').dice, 1);
  t.is('…and once for a plain Combat skill too', bonus([both], 'Combat skills').dice, 1);

  // The alias is one-way: a Combat skill is not a martial art.
  const maOnly = { label: 'MA only', dice: 3, categories: ['Martial Arts'] };
  t.is('the alias does not run backwards', bonus([maOnly], 'Combat skills').dice, 0);

  /* ==== Matching ==== */
  t.is('a Combat skill gets the die',     bonus([EA], 'Combat skills').dice, 1);
  t.is('a Physical skill too',            bonus([EA], 'Physical skills').dice, 1);
  t.is('Build/Repair — the slash in the name is not a separator',
    bonus([EA], 'Build/Repair skills').dice, 1);
  t.is('Vehicle skills DO qualify — the bonus is offered, the player judges "physical use"',
    bonus([EA], 'Vehicle skills').dice, 1);
  t.is('a Magical skill gets nothing',    bonus([EA], 'Magical skills').dice, 0);
  t.is('a Social skill gets nothing',     bonus([EA], 'Social skills').dice, 0);

  /* ==== It reports what to call it, so the checkbox can be labelled ==== */
  t.is('the source is named', bonus([EA], 'Combat skills').labels.join(), 'Enhanced Articulation');
  t.is('an unmatched category names nothing', bonus([EA], 'Social skills').labels.length, 0);

  /* ==== Free text, so matching is forgiving ==== */
  t.is('case is ignored',            bonus([EA], 'combat skills').dice, 1);
  t.is('surrounding space is ignored', bonus([EA], '  Combat skills  ').dice, 1);
  t.is('an empty category matches nothing', bonus([EA], '').dice, 0);
  t.is('a missing category matches nothing', bonus([EA], undefined).dice, 0);

  /* ==== Stacking ==== */
  const adept = { label: 'Improved Ability', dice: 2, categories: ['Combat skills'] };
  t.is('two sources stack', bonus([EA, adept], 'Combat skills').dice, 3);
  t.is('…and both are named', bonus([EA, adept], 'Combat skills').labels.length, 2);
  t.is('a category only one covers gets only that one',
    bonus([EA, adept], 'Technical skills').dice, 1);

  /* ==== Shape ==== */
  t.is('no bonuses at all is zero',      bonus([], 'Combat skills').dice, 0);
  t.is('a non-array is zero, not a throw', bonus(null, 'Combat skills').dice, 0);
  t.is('undefined is zero',              bonus(undefined, 'Combat skills').dice, 0);
  t.is('a zero-dice entry contributes nothing',
    bonus([{ label: 'x', dice: 0, categories: ['Combat skills'] }], 'Combat skills').dice, 0);
  t.is('a negative entry cannot subtract dice',
    bonus([{ label: 'x', dice: -3, categories: ['Combat skills'] }], 'Combat skills').dice, 0);
  t.is('an entry with no categories contributes nothing',
    bonus([{ label: 'x', dice: 2 }], 'Combat skills').dice, 0);
  t.is('junk dice read as none',
    bonus([{ label: 'x', dice: 'two', categories: ['Combat skills'] }], 'Combat skills').dice, 0);

  /* ==== Parsing the item's free-text field ==== */
  //
  // ⚠ COMMAS ONLY. "Build/Repair skills" contains a slash, so splitting on anything but a
  // comma would tear that category in half and it would then match nothing.
  t.is('a single category parses to one', parse('Combat skills').length, 1);
  t.is('five parse to five',
    parse('Combat skills, Physical skills, Technical skills, Build/Repair skills, Vehicle skills').length, 5);
  t.is('the slash survives parsing',
    parse('Build/Repair skills')[0], 'Build/Repair skills');
  t.is('space around commas is trimmed', parse(' Combat skills ,Physical skills ')[1], 'Physical skills');
  t.is('empty entries are dropped',      parse('Combat skills,,').length, 1);
  t.is('an empty string parses to nothing', parse('').length, 0);
  t.is('undefined parses to nothing',       parse(undefined).length, 0);

  /* ==== End to end: the field as a GM would type it ==== */
  const typed = parse('Combat skills, Physical skills, Technical skills, Build/Repair skills, Vehicle skills');
  const built = [{ label: 'Enhanced Articulation', dice: 1, categories: typed }];
  t.is('a hand-typed field matches a Combat skill', bonus(built, 'Combat skills').dice, 1);
  t.is('…and Build/Repair, the one a naive split would break',
    bonus(built, 'Build/Repair skills').dice, 1);
  t.is('…and still declines Magical skills', bonus(built, 'Magical skills').dice, 0);
}
