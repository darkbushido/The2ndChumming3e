/**
 * Metatype Shift - restate an NPC's attributes for another race · TODO 272 (SR3 p.56 Racial Modifications Table,
 * p.244-245 Racial Attribute Limit Table). Source-level checks cover Meet the contact's use of it.
 */
import { readFileSync } from 'node:fs';
import { MetatypeShift, RACIAL_MODS, SHIFT_ATTRIBUTES } from '../scripts/data/metatype-shift.mjs';

export const name = 'metatype-shift';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
/** Key-order-independent comparison. */
const J = o => JSON.stringify(Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b))));

// SR3 p.245 - Racial Modified Limits; the maximum is round(limit x 1.5).
const LIMITS = {
  human: { body: 6, quickness: 6, strength: 6, charisma: 6, intelligence: 6, willpower: 6 },
  elf:   { body: 6, quickness: 7, strength: 6, charisma: 8, intelligence: 6, willpower: 6 },
  dwarf: { body: 7, quickness: 6, strength: 8, charisma: 6, intelligence: 6, willpower: 7 },
  ork:   { body: 9, quickness: 6, strength: 8, charisma: 5, intelligence: 5, willpower: 6 },
  troll: { body: 11, quickness: 5, strength: 10, charisma: 4, intelligence: 4, willpower: 6 },
};
const ctx = { limits: LIMITS, racialMax: l => Math.round(l * 1.5) };
const all = n => Object.fromEntries(SHIFT_ATTRIBUTES.map(a => [a, n]));
const one = (attr, v, from, to) => MetatypeShift.shift({ [attr]: v }, from, to, ctx)[attr];

export async function run(t) {
  /* every row of the Racial Modifications Table, SR3 p.56 (PDF page 58) */
  t.is('dwarf row', J(RACIAL_MODS.dwarf), J({ body: 1, strength: 2, willpower: 1 }));
  t.is('elf row', J(RACIAL_MODS.elf), J({ quickness: 1, charisma: 2 }));
  t.is('ork row', J(RACIAL_MODS.ork), J({ body: 3, strength: 2, charisma: -1, intelligence: -1 }));
  t.is('troll row', J(RACIAL_MODS.troll), J({ body: 5, quickness: -1, strength: 4, intelligence: -2, charisma: -2 }));
  t.is('human has no modifiers', Object.keys(RACIAL_MODS.human).length, 0);

  /* human -> each race adds exactly that race's row (ratings of 4 are below every cap) */
  for (const race of ['dwarf', 'elf', 'ork', 'troll']) {
    const want = Object.fromEntries(Object.entries(RACIAL_MODS[race]).map(([k, v]) => [k, Math.max(1, 4 + v)]));
    t.is(`human -> ${race} applies the ${race} row`, J(MetatypeShift.shift(all(4), 'human', race, ctx)), J(want));
  }

  /* the book race's modifiers come off first: the troll Dock Worker (B10 S10) as a human */
  const dock = MetatypeShift.shift({ body: 10, strength: 10, quickness: 3, charisma: 3, intelligence: 3, willpower: 4 }, 'troll', 'human', ctx);
  t.is('troll -> human: Body 10 -> 5', dock.body, 5);
  t.is('troll -> human: Strength 10 -> 6', dock.strength, 6);
  t.is('troll -> human: Quickness 3 -> 4', dock.quickness, 4);
  t.is('troll -> human: Charisma and Intelligence 3 -> 5', `${dock.charisma}/${dock.intelligence}`, '5/5');
  t.is('troll -> human: Willpower is not reported', 'willpower' in dock, false);
  t.is('ork -> troll applies the DIFFERENCE (Body +2, Quickness -1)',
    J(MetatypeShift.shift({ body: 8, quickness: 5 }, 'ork', 'troll', ctx)), J({ body: 10, quickness: 4 }));

  /* the racial maximum, round(limit x 1.5) (p.244-245) */
  t.is('no cap needed: human Body 9 -> troll 14 (max 17)', one('body', 9, 'human', 'troll'), 14);
  t.is('troll Body is capped at 17', one('body', 13, 'human', 'troll'), 17);
  t.is('dwarf Willpower: 10 -> 11, at the maximum (7 x 1.5 = 10.5 rounds up)', one('willpower', 10, 'human', 'dwarf'), 11);
  t.is('dwarf Willpower already at the maximum: nothing to report', 'willpower' in MetatypeShift.shift({ willpower: 11 }, 'human', 'dwarf', ctx), false);
  t.is('elf Charisma is capped at 12', one('charisma', 11, 'human', 'elf'), 12);
  t.is('ork Body is capped at 14 (9 x 1.5 = 13.5 rounds up)', one('body', 13, 'human', 'ork'), 14);
  t.is('a cap can LOWER a rating the new race cannot reach: elf Charisma 12 -> troll 6', one('charisma', 12, 'elf', 'troll'), 6);

  /* the floor: never below 1 */
  t.is('floor: human Intelligence 2 -> troll would be 0, becomes 1', one('intelligence', 2, 'human', 'troll'), 1);
  t.is('floor: a rating already 1 is left alone', 'intelligence' in MetatypeShift.shift({ intelligence: 1 }, 'human', 'troll', ctx), false);
  t.is('floor: Quickness 1 -> troll stays 1', 'quickness' in MetatypeShift.shift({ quickness: 1 }, 'human', 'troll', ctx), false);

  /* round trip: ork -> human -> ork returns the book's numbers */
  const book = { body: 9, quickness: 4, strength: 8, charisma: 3, intelligence: 4, willpower: 5 };
  const toHuman = { ...book, ...MetatypeShift.shift(book, 'ork', 'human', ctx) };
  const back = { ...toHuman, ...MetatypeShift.shift(toHuman, 'human', 'ork', ctx) };
  t.is('ork -> human', J(toHuman), J({ body: 6, quickness: 4, strength: 6, charisma: 4, intelligence: 5, willpower: 5 }));
  t.is('ork -> human -> ork returns the book\'s numbers', J(back), J(book));

  /* only the six bought attributes; same race, unknown race, missing values */
  t.is('Essence, Magic and Reaction are not shifted', J(Object.fromEntries(SHIFT_ATTRIBUTES.map(a => [a, 1]))),
    J({ body: 1, quickness: 1, strength: 1, charisma: 1, intelligence: 1, willpower: 1 }));
  t.is('same race -> nothing (case and spaces ignored)', Object.keys(MetatypeShift.shift(all(4), 'ork', 'Ork ', ctx)).length, 0);
  t.is('an unknown metatype counts as human', J(MetatypeShift.shift(all(4), 'fomori', 'elf', ctx)), J({ quickness: 5, charisma: 6 }));
  t.is('a missing attribute is skipped, not NaN', J(MetatypeShift.shift({ body: 4 }, 'human', 'troll', ctx)), J({ body: 9 }));
  t.is('without a limits table the human limit applies (Body 6 -> troll 9, not 11)', MetatypeShift.shift({ body: 6 }, 'human', 'troll').body, 9);

  /* update paths and the description */
  t.is('updateFor: metatype and each base', J(MetatypeShift.updateFor({ body: 8, quickness: 5 }, 'Troll')),
    J({ 'system.metatype': 'troll', 'system.attributes.body.base': 8, 'system.attributes.quickness.base': 5 }));
  t.is('describe', MetatypeShift.describe({ body: 10, quickness: 4 }, { body: 8, quickness: 5 }), 'Body 10 → 8, Quickness 4 → 5');

  /* traits that follow system.metatype on their own (so the shift need not touch them) */
  const cfg = read('scripts/config.js');
  t.ok('troll dermal armour, Reach and racial vision are keyed by metatype',
    /racialDermalArmor:\s*\{\s*troll:\s*1/.test(cfg) && /racialReach:\s*\{\s*troll:\s*1/.test(cfg)
    && /SR3E_RACIAL_VISION\s*=\s*\{[^}]*troll/.test(read('scripts/SR3ECombatModifiers.js')));

  /* Meet the contact applies it (source-level; the dialog cannot be imported without Foundry) */
  const src = read('scripts/SR3EMeetContact.js');
  t.ok('Meet the contact imports Metatype Shift', /from '\.\/data\/metatype-shift\.mjs'/.test(src));
  t.ok('the amber line says what was adjusted, not that stats stay', /Stats are adjusted/.test(src) && !/Stats stay the book/.test(src));
  t.ok('after creation it updates the NPC with the shifted values', /npc\.update\(MetatypeShift\.updateFor\(/.test(src));
  t.ok('the sr3e.actor.create verb is untouched (still a whitelist)', /\['metatype', 'gender', 'ethnicity'\]/.test(read('scripts/SR3EQuery.js')));
}
