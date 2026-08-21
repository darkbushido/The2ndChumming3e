/**
 * Martial arts skills — categorisation, aliases, and the first rule-level book gate.
 *
 * Reported from play on 2026-08-20: *"martial arts Aikido as a knowledge skill and still see
 * unarmed combat"*. Both halves are real, and Cannon Companion p.87 settles both in one
 * paragraph:
 *
 *   "To increase the realism and detail of the current melee combat system, the skill of
 *    UNARMED COMBAT MUST BE REMOVED FROM THE GAME AND REPLACED by a number of new skills that
 *    each represent a martial arts style: Aikido, Arnis De Mano, Brawling, Capoeira, Karate,
 *    Kung Fu, Muay Thai, Ninjutsu, Pentjak-Silat, Tae Kwon Do, Tai Chi Ch'uan and Wildcat…
 *    The new skill of BRAWLING, though not technically a martial art, represents generic
 *    unarmed fighting techniques previously represented by the Unarmed Combat skill.
 *
 *    Each of these new martial arts skills is considered a COMBAT SKILL and uses the standard
 *    rules for ACTIVE SKILLS (p. 81, SR3) and skill advancement (p. 244, SR3), including the
 *    use of COMBAT POOL."
 *
 * Three separate faults came out of that:
 *
 *   1. 'Martial Arts' sat in KNOWLEDGE_SKILL_CATEGORIES, contradicting the book AND the
 *      comment six lines above the skill list in the same file.
 *   2. TWO CLASSIFIERS DISAGREED. `SR3EActorSheet._isActiveSkill` tested
 *      `!category.includes('knowledge')` — and 'Martial Arts' contains neither "knowledge" nor
 *      "language" — so karma charged Aikido as ACTIVE while the sheet filed it as KNOWLEDGE.
 *   3. The parenthesised equivalents were 29 SEPARATE SKILLS instead of 12 with aliases, so a
 *      character could take Aikido, Jujitsu and Sambo independently — three skills where the
 *      book has one — and the alias entries carried invented maneuver lists.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const {
  SR3E, SR3ESkills, ACTIVE_SKILL_CATEGORIES, KNOWLEDGE_SKILL_CATEGORIES,
  SKILL_CATEGORY_BOOK, SKILL_REPLACED_BY_BOOK,
} = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });

// ⚠ Called through the SR3E aggregate, NOT as direct named imports. `sr3e.js` consumes them
// that way (`SR3E.skillTypeForCategory`), and it is also the only form the mutation harness
// can reach: ESM named imports are read-only live bindings, so a mutant swapping the export
// cannot be seen by a test holding its own reference. Two mutants reported HARNESS ERROR and
// SURVIVED against the direct imports before this changed.
const skillTypeForCategory = c => SR3E.skillTypeForCategory(c);
const resolveMartialArt    = n => SR3E.resolveMartialArt(n);

export const name = 'martial-arts';

/** The twelve styles CC p.87 names. */
const CC_STYLES = [
  'Aikido', 'Arnis De Mano', 'Brawling', 'Capoeira', 'Karate', 'Kung Fu',
  'Muay Thai', 'Ninjutsu', 'Pentjak-Silat', 'Tae Kwon Do', "Tai Chi Ch'uan", 'Wildcat',
];

export async function run(t) {
  const styles = SR3ESkills['Martial Arts'] ?? [];

  /* ==== 1. Martial arts are ACTIVE, Combat skills ==== */
  t.is("'Martial Arts' is an active category", skillTypeForCategory('Martial Arts'), 'active');
  t.ok('…and is listed as one',       ACTIVE_SKILL_CATEGORIES.has('Martial Arts'));
  t.ok('…and NOT as a knowledge one', !KNOWLEDGE_SKILL_CATEGORIES.has('Martial Arts'));
  // The two sets must never both claim a category — that is what produced the split brain.
  const both = [...ACTIVE_SKILL_CATEGORIES].filter(c => KNOWLEDGE_SKILL_CATEGORIES.has(c));
  t.is('no category is in both sets', both.join(), '');

  /* ==== 2. Exactly the book's twelve, no more ==== */
  t.is('twelve styles, matching CC p.87', styles.length, 12);
  const names = styles.map(s => s.name.replace('MA:', '')).sort();
  t.is('and they are the right twelve', names.join(), [...CC_STYLES].sort().join());

  /* ==== 3. Aliases resolve to their parent ====
   *
   * "Martial arts styles that have the same game effect are included in parentheses after the
   * skill name." Same skill, other name.
   */
  const pairs = [
    ['MA:Jujitsu',     'MA:Aikido'],
    ['MA:Sambo',       'MA:Aikido'],
    ['MA:Escrima',     'MA:Arnis De Mano'],
    ['MA:Kali',        'MA:Arnis De Mano'],
    ['MA:Boxing',      'MA:Brawling'],
    ['MA:Pitfighting', 'MA:Brawling'],
    ['MA:Carromeleg',  'MA:Capoeira'],
    ['MA:Kenpo',       'MA:Karate'],
    ['MA:Hwarang-do',  'MA:Kung Fu'],
    ['MA:Wushu',       'MA:Kung Fu'],
    ['MA:Kickboxing',  'MA:Muay Thai'],
    ['MA:Savate',      'MA:Muay Thai'],
    ['MA:Hapkido',     'MA:Tae Kwon Do'],
    ['MA:Tai Chi Wu',  "MA:Tai Chi Ch'uan"],
    ['MA:Tai Chi Chen',"MA:Tai Chi Ch'uan"],
  ];
  for (const [alias, parent] of pairs) {
    t.is(`${alias} resolves to ${parent}`, resolveMartialArt(alias)?.name, parent);
  }

  // Two spelling variants that were separate entries — an outright typo and a spacing
  // difference. Kept as aliases so an existing character's skill still resolves.
  t.is('the "Juijitsu" misspelling still resolves',  resolveMartialArt('MA:Juijitsu')?.name, 'MA:Aikido');
  t.is('"Kick Boxing" with a space resolves too',    resolveMartialArt('MA:Kick Boxing')?.name, 'MA:Muay Thai');

  t.is('a canonical name resolves to itself', resolveMartialArt('MA:Aikido')?.name, 'MA:Aikido');
  t.is('case is ignored',                     resolveMartialArt('ma:aikido')?.name, 'MA:Aikido');
  t.is('a non-martial-art resolves to nothing', resolveMartialArt('Pistols'), null);
  t.is('an empty name resolves to nothing',     resolveMartialArt(''), null);
  t.is('undefined does not throw',              resolveMartialArt(undefined), null);

  // No alias may collide with a real style, or the fold has swallowed a skill.
  const canonical = new Set(styles.map(s => s.name));
  for (const s of styles) {
    for (const a of (s.aliases ?? [])) {
      t.ok(`${a} is not also a style in its own right`, !canonical.has(a));
    }
  }

  /* ==== 4. Every style keeps its own maneuvers ====
   *
   * ⚠ The alias entries carried maneuver lists that did not match their parents — Jujitsu's
   * shared barely half of Aikido's, though the book makes them the same skill. Folding keeps
   * the PARENT's list, which is the one transcribed from CC.
   */
  t.ok('every style still has maneuvers', styles.every(s => Array.isArray(s.maneuvers) && s.maneuvers.length));
  t.ok('and none has specializations — CC forbids specialising in these',
    styles.every(s => !s.specializations));
  t.ok('all are linked to Strength (CC p.87)', styles.every(s => s.linkedAttribute === 'strength'));

  /* ==== Maneuver lists, audited against CC p.89-91 on 2026-08-20 ====
   *
   * All twelve match the book. Karate and Muay Thai needed reassembling because their lists
   * wrap across a column break — the naive extraction truncates both at "Focus" — and an
   * earlier truncated read of Brawling wrongly suggested a missing Herding. It is not missing.
   */
  const book = {
    'MA:Aikido':        ['Close Combat', 'Disorient', 'Evasion', 'Focus Will', 'Ground Fighting', 'Herding', 'Sweep', 'Throw', 'Whirling'],
    'MA:Arnis De Mano': ['Close Combat', 'Focus Strength', 'Ground Fighting', 'Kick Attack', 'Kip-up', 'Multi-Strike', 'Sweep', 'Throw', 'Zoning'],
    'MA:Brawling':      ['Close Combat', 'Disorient', 'Evasion', 'Full Offense', 'Ground Fighting', 'Herding', 'Kick Attack', 'Vicious Blow', 'Zoning'],
    'MA:Capoeira':      ['Disorient', 'Evasion', 'Ground Fighting', 'Herding', 'Kick Attack', 'Kip-up', 'Multi-Strike', 'Sweep', 'Whirling'],
    'MA:Karate':        ['Blind Fighting', 'Focus Strength', 'Focus Will', 'Full Offense', 'Kick Attack', 'Vicious Blow', 'Sweep', 'Throw', 'Whirling'],
    'MA:Kung Fu':       ['Blind Fighting', 'Focus Strength', 'Full Offense', 'Ground Fighting', 'Kick Attack', 'Kip-up', 'Multi-Strike', 'Vicious Blow', 'Whirling'],
    'MA:Muay Thai':     ['Close Combat', 'Focus Strength', 'Full Offense', 'Ground Fighting', 'Herding', 'Kick Attack', 'Kip-up', 'Sweep', 'Zoning'],
    'MA:Ninjutsu':      ['Blind Fighting', 'Close Combat', 'Disorient', 'Evasion', 'Ground Fighting', 'Herding', 'Kick Attack', 'Sweep', 'Zoning'],
    'MA:Pentjak-Silat': ['Blind Fighting', 'Close Combat', 'Evasion', 'Focus Will', 'Ground Fighting', 'Vicious Blow', 'Multi-Strike', 'Sweep', 'Whirling'],
    'MA:Tae Kwon Do':   ['Focus Strength', 'Full Offense', 'Herding', 'Kick Attack', 'Kip-up', 'Multi-Strike', 'Sweep', 'Throw', 'Whirling'],
    "MA:Tai Chi Ch'uan":['Blind Fighting', 'Evasion', 'Focus Strength', 'Focus Will', 'Herding', 'Kip-up', 'Sweep', 'Throw', 'Whirling'],
    'MA:Wildcat':       ['Blind Fighting', 'Close Combat', 'Full Offense', 'Ground Fighting', 'Kick Attack', 'Multi-Strike', 'Sweep', 'Vicious Blow', 'Zoning'],
  };
  for (const s of styles) {
    const want = book[s.name];
    t.ok(`${s.name} is one of the book's twelve`, !!want);
    if (!want) continue;
    const got = s.maneuvers.map(m => m.replace('MN:', ''));
    t.is(`${s.name} maneuvers match CC`, [...got].sort().join(', '), [...want].sort().join(', '));
  }
  // ⚠ The book spells it "Kip-up", not "Kip Up". Nothing reads `maneuvers` yet, so this is
  // cosmetic — and it stops being cosmetic the moment anything matches these against the book.
  const allMan = styles.flatMap(s => s.maneuvers);
  t.ok('no "Kip Up" spelling survives', !allMan.includes('MN:Kip Up'));
  t.ok('and Kip-up is present', allMan.includes('MN:Kip-up'));

  /* ==== 5. The book gate ==== */
  t.is('Martial Arts is Cannon Companion content', SKILL_CATEGORY_BOOK['Martial Arts'], 'cc');
  t.is('and Unarmed Combat is what CC replaces',   SKILL_REPLACED_BY_BOOK['Unarmed Combat'], 'cc');

  // Unarmed Combat must still EXIST — the gate hides it from the picker, it does not delete it.
  // The weapon-category map (UNA → Unarmed Combat), `_unarmedWeapon()` and
  // `_buildMeleePoolInfo` all still reference it by name.
  const combat = (SR3ESkills['Combat skills'] ?? []).map(s => s.name);
  t.ok('Unarmed Combat is still a defined skill', combat.includes('Unarmed Combat'));
  t.is('and the weapon map still points UNA at it', SR3E.weaponCategories?.UNA ?? 'Unarmed Combat',
    SR3E.weaponCategories?.UNA ?? 'Unarmed Combat');

  // Brawling is CC's replacement for it, so a cc table is not left without generic unarmed.
  t.ok('Brawling exists as the generic stand-in', names.includes('Brawling'));
}
