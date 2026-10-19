/**
 * The Shock Glove's second damage code · SR3 p.275-276, p.124 (rules check 0.7.0, weapons.md #138).
 *
 *   "Shock Glove … When striking with shock gloves, fist damage is reduced to (STR -1)M, but the gloves deliver
 *    an extra 7S Stun (see Shock Weapons, p. 124 of the Combat section). Can be discharged 8 times before
 *    requiring a 1-hour recharge."                                                           — SR3 p.275-276
 *   "Impact armor protects against shock weapons, but its rating is halved (rounding down)."   — SR3 p.124
 *
 * The first code stays in `system.damage`; the second is `system.extraDamage`, resisted on its own.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { ExtraDamage } = await import('../scripts/data/extra-damage.mjs');
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');
const { PackFixes070 } = await import('../scripts/data/pack-corrections-0-7-0.mjs');

export const name = 'shock-glove';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  t.is('"+7S Stun" as the table writes it reads as 7S Stun', ExtraDamage.normalise('+7S Stun'), '7S Stun');
  t.is('…a code already plain is untouched', ExtraDamage.normalise('7S Stun'), '7S Stun');
  t.is('…blank and missing stay blank', [ExtraDamage.normalise(''), ExtraDamage.normalise(undefined)].join('|'), '|');
  t.eq('…and what it leaves parses as a Serious Stun code of Power 7', SR3EItem.parseDamageCode(ExtraDamage.normalise('+7S Stun')), { power: 7, level: 'S', isStun: true });
  t.eq('the fist code the pack stores still parses: (STR-1)M Stun at STR 6', SR3EItem.parseDamageCode('(STR-1)M Stun', { system: { attributes: { strength: { value: 6 } } } }), { power: 5, level: 'M', isStun: true });

  t.eq('Impact armour is halved, rounded DOWN, against a shock weapon: 0, 1, 2, 3, 5 -> 0, 0, 1, 1, 2', [0, 1, 2, 3, 5].map(ExtraDamage.shockImpact), [0, 0, 1, 1, 2]);

  const ctx = { atkExtraDamage: '+7S Stun', defExtraDamage: '' };
  t.is('the attacker\'s glove delivers the extra when the attacker wins', ExtraDamage.winnerExtra(ctx, true), '7S Stun');
  t.is('…a defender with no glove delivers none', ExtraDamage.winnerExtra(ctx, false), '');
  t.is('…and a defender wearing one does when the defender wins', ExtraDamage.winnerExtra({ defExtraDamage: '7S Stun' }, false), '7S Stun');

  /* ── the pack and its migration ───────────────────────────────────────────── */
  const dir = new URL('../packs-src/sr3e-sr3-melee/', import.meta.url);
  const f = readdirSync(dir).find(n => n.endsWith('.sr3e-melee-0109.json'));
  const s = JSON.parse(readFileSync(new URL(f, dir), 'utf8')).doc.system;
  t.eq('the Shock Glove stores (STR-1)M Stun and 7S Stun separately (p.275)', [s.damage, s.extraDamage], ['(STR-1)M Stun', '7S Stun']);
  t.ok('…and its notes say the second is resisted apart, Impact at half', /separately/.test(s.notes) && /half/.test(s.notes));
  const glove = (sy) => ({ type: 'melee', name: 'Shock Glove', system: sy });
  t.eq('migration: an owned glove gains the extra code (blank only)', PackFixes070.fixItem(glove({ damage: '(STR-1)M Stun', extraDamage: '', notes: 'x' })), { 'system.extraDamage': '7S Stun' });
  t.eq('…also when the field never existed', PackFixes070.fixItem(glove({ damage: '(STR-1)M Stun', notes: 'x' })), { 'system.extraDamage': '7S Stun' });
  t.is('…a GM-set extra code stays', PackFixes070.fixItem(glove({ damage: '(STR-1)M Stun', extraDamage: '9S Stun', notes: 'x' })), null);
  t.is('…an item of another type with that name is skipped', PackFixes070.fixItem({ type: 'gear', name: 'Shock Glove', system: {} }), null);

  /* ── the wiring, source-level ─────────────────────────────────────────────── */
  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the melee card carries both fighters\' extra codes', /atkExtraDamage:\s+atkWeapon\?\.system\?\.extraDamage \?\? ''/.test(item) && /defExtraDamage:\s+defWeapon\?\.system\?\.extraDamage \?\? ''/.test(item));
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the melee result reads the winner\'s extra code', /ExtraDamage\.winnerExtra\(ctx, _mo\.winnerIsAtk\)/.test(actor));
  t.ok('…stages it by the same net successes', /stageDamage\(extraBase, net, \{ meleeRules: true \}\)/.test(actor));
  t.ok('…and posts its OWN Resist button, marked shock', /shock:\s+true,\s+stagedPower:\s+_xs\.power/.test(actor) && /Resist the Shock/.test(actor));
  t.ok('…after the fist\'s button on both outcomes', (actor.match(/\$\{soakBtn\}\s+\$\{extraHtml\}/g) ?? []).length === 2);
  t.ok('the soak card halves Impact for a shock payload', /payload\.shock === true[\s\S]{0,200}ExtraDamage\.shockImpact\(impact\)/.test(actor));
  t.ok('MeleeData declares extraDamage', /extraDamage:\s+new StringField\(\{ initial: '' \}\)/.test(read('scripts/data/ItemDataModels.js')));
  t.ok('the item sheet has the field', /'Extra Damage', 'extraDamage'/.test(read('scripts/sheets/SR3EItemSheet.js')));
}
