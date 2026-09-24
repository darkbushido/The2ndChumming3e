/**
 * Spell damage track and Drain past Deadly — rules check 0.6.1, TODO 169 and 170.
 *
 * 169 · SR3 p.191: "Manabolt and Manaball channel destructive magical power into the target, doing
 *       physical damage. As mana spells, they only affect living and magical targets." The code
 *       read Mana as Stun, so every mana combat spell (Manabolt, Manaball, Death Touch, MitS's Slay
 *       and Spiritbolt) dealt Stun. Only the stun spells do: "Stun spells channel magical energy
 *       directly into the target, causing stun damage."
 *
 * 170 · SR3 p.191 (MitS p.66 repeats it): "If a modifier would raise the Drain Level above Deadly,
 *       add +2 to the Drain Power instead for each level above Deadly." parseDrainFormula clamped
 *       at Deadly and added nothing.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'spell-damage';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const spell = (name, type, damageTrack = '') => ({ name, system: { type, damageTrack } });

export async function run(t) {
  /* ══ 169: the track ══════════════════════════════════════════════════════════════ */
  const stun = s => SR3EItem.spellDealsStun(s);
  t.is('Manabolt (a MANA spell) is Physical — p.191', stun(spell('Manabolt', 'Mana')), false);
  t.is('Manaball is Physical', stun(spell('Manaball', 'Mana')), false);
  t.is('Death Touch is Physical', stun(spell('Death Touch', 'Mana')), false);
  t.is('Slay (MitS p.66, "Deadly Physical damage") is Physical', stun(spell('Slay(Race/Species)->', 'Mana')), false);
  t.is('Powerbolt is Physical', stun(spell('Powerbolt', 'Physical')), false);
  t.is('Stunbolt is Stun', stun(spell('Stunbolt', 'Mana')), true);
  t.is('Stunball is Stun', stun(spell('Stunball', 'Mana')), true);
  t.is('Stun Touch (MitS, "works like Stunbolt") is Stun', stun(spell('Stuntouch', 'Mana')), true);
  t.is('the item\'s own track wins over the name: Stun', stun(spell('Nightmare', 'Mana', 'Stun')), true);
  t.is('…and Physical', stun(spell('Stunning Blow of Doom', 'Mana', 'Physical')), false);
  t.is('no spell → Physical, no throw', stun(null), false);

  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the cast reads the rule, never Mana/Physical', /const isStun\s*= SR3EItem\.spellDealsStun\(this\)/.test(item)
    && !/isStun\s*=\s*spellType/.test(item));
  t.ok('the data model declares the field', /damageTrack:\s*new StringField/.test(read('scripts/data/ItemDataModels.js')));
  t.ok('the item sheet offers it', /'damageTrack'/.test(read('scripts/sheets/SR3EItemSheet.js')));

  /* ══ 170: Drain past Deadly ══════════════════════════════════════════════════════ */
  const d = (code, f, lvl) => { const r = SR3EItem.parseDrainFormula(code, f, lvl); return [r.tn, r.level]; };
  // Fireball +1(DL+2), Force 6: ⌊6/2⌋+1 = 4.
  t.eq('Fireball at Moderate → exactly Deadly, no extra Power', d('+1(DL+2)', 6, 'M'), [4, 'D']);
  t.eq('Fireball at Serious → Deadly, +2 Power (one level past)', d('+1(DL+2)', 6, 'S'), [6, 'D']);
  t.eq('Fireball at Deadly → Deadly, +4 Power (two levels past)', d('+1(DL+2)', 6, 'D'), [8, 'D']);
  t.eq('Manaball (DL+1) at Deadly → +2 Power', d('(DL+1)', 6, 'D'), [5, 'D']);
  t.eq('Manabolt (DL) at Deadly → nothing past, no extra', d('(DL)', 6, 'D'), [3, 'D']);
  t.eq('a legacy F-formula with a DL shift gets it too', d('(F/2)(DL+1)', 6, 'D'), [5, 'D']);
  t.eq('a negative modifier still floors at Light, and adds nothing', d('(DL-2)', 6, 'L'), [3, 'L']);
}
