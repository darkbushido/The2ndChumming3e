/**
 * Mod values corrected to the books (TODO 260) — the pure rule shared by the pack tool and the 0.7.1
 * migration, the migration's wiring, and the packs themselves.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ModBookFixes } from '../scripts/data/mod-book-fixes.mjs';
import { fixEntries } from '../tools/fix-mod-book-values.mjs';

export const name = 'mod-book-fixes';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const veh = (name, system = {}) => ({ type: 'vehiclemod', name, system });
const limb = (name, system = {}) => ({ type: 'cyberware', name, system: { cyberwareCategory: 'Cyberlimb Mods', ...system } });

export async function run(t) {
  const fix = i => ModBookFixes.fixItem(i);

  /* ── Each wrong value we shipped is corrected ────────────────────────────────── */
  t.eq('Concealed Armor 9 CF 37 → 27 (R3 p.132)', fix(veh('Concealed Armor', { rating: 9, cfCost: '37' })), { 'system.cfCost': '27' });
  t.eq('Ablative Armor 2 availability (R3 p.131)', fix(veh('Ablative Armor', { rating: 2, availability: '12/12days' })), { 'system.availability': '12/14days' });
  t.eq('Power Amplifier 3 CF 1.5 → 2, rounded up (R3 p.147)', fix(veh('Power Amplifier', { rating: 3, cfCost: '1.5' })), { 'system.cfCost': '2' });
  t.is('Power Amplifier 4 (already 2) needs nothing', fix(veh('Power Amplifier', { rating: 4, cfCost: '2' })), null);
  t.eq('Vehicle Armor 11: cost and B/R (R3 p.131)', fix(veh('Vehicle Armor', { rating: 11, cost: 15000, installTime: '88 hrs/Vehicle B/R(5)' })),
    { 'system.cost': 13750, 'system.installTime': '88 hrs/Vehicle B/R(4)' });
  t.eq('Vehicle Armor 7 cost 9,750 → 8,750', fix(veh('Vehicle Armor', { rating: 7, cost: 9750 })), { 'system.cost': 8750 });
  t.eq('Remote Control ECCM 6 cost (M&M p.25)', fix(limb('Remote Control ECCM', { rating: 6, cost: 280000 })), { 'system.cost': 210000 });
  t.eq('Hydraulic Jack 2 says jump distance (M&M p.29)', fix(limb('Hydraulic Jack', { rating: 2, description: '+2 die to Athletics (Running, Jumping) tests, +40% running distance, -2 Power level to falls' })),
    { 'system.description': '+2 die to Athletics (Running, Jumping) tests, +40% jump distance, -2 Power level to falls' });
  t.eq('RC Encryption Module legality 4P-W → 8P-W (M&M p.25)', fix(limb('RC Encryption Module', { rating: 3, legalCode: '4P-W' })), { 'system.legalCode': '8P-W' });
  t.eq('Armor: Ablative is 4P-Q at any level (M&M p.37)', fix(limb('Armor: Ablative', { rating: 4, legalCode: '3-N' })), { 'system.legalCode': '4P-Q' });
  t.eq('Armor: Impact is Legal (M&M p.37)', fix(limb('Armor: Impact', { rating: 1, legalCode: '3-N' })), { 'system.legalCode': 'Legal' });

  /* ── A houserule is left alone; the pass is idempotent ───────────────────────── */
  t.is('a GM-edited cost is not overwritten', fix(veh('Vehicle Armor', { rating: 7, cost: 9000 })), null);
  t.is('a GM-edited legality is not overwritten', fix(limb('Armor: Ballistic', { rating: 2, legalCode: '5P-R' })), null);
  t.is('a corrected item yields null (idempotent)', fix(veh('Concealed Armor', { rating: 9, cfCost: '27' })), null);
  t.is('the same name at another level is not touched', fix(veh('Concealed Armor', { rating: 8, cfCost: '37' })), null);
  t.is('a different kind with the same name is not touched', fix(limb('Concealed Armor', { rating: 9, cfCost: '37' })), null);
  t.is('a non-mod is not touched', fix({ type: 'cyberware', name: 'Remote Control ECCM', system: { cyberwareCategory: 'Headware', rating: 5, cost: 210000 } }), null);
  t.eq('a copy still named with its level is found (the rename runs first, but need not)', fix(veh('Concealed Armor [9]', { cfCost: '37' })), { 'system.cfCost': '27' });
  t.ok('every entry carries its book and page', ModBookFixes.FIXES.every(f => /p\.\d+/.test(f.source)));

  /* ── The pack tool: same rule, idempotent, adds RCEM 9 and 10 ────────────────── */
  const entries = new Map([
    ['!items!a', veh('Concealed Armor', { rating: 9, cfCost: '37' })],
    ['!items!r8', { _id: 'r8', ...limb('RC Encryption Module', { rating: 8, cost: 80000, availability: '8/8 days', legalCode: '4P-W' }) }],
  ]);
  t.is('the tool changes two documents and adds two levels', fixEntries(entries, 'sr3e-mm-cyberware'), 4);
  t.is('…RCEM 10 is copied from 8 with its own cost and availability', JSON.stringify([...entries.values()].find(d => d.system.rating === 10)?.system),
    JSON.stringify({ cyberwareCategory: 'Cyberlimb Mods', rating: 10, cost: 100000, availability: '10/10 days', legalCode: '8P-W' }));
  t.is('…and a second run changes nothing', fixEntries(entries, 'sr3e-mm-cyberware'), 0);

  /* ── The migration is wired ──────────────────────────────────────────────────── */
  t.ok('a 0.7.1 migration applies the corrections to owned copies', /version: '0\.7\.1',\s*label: 'Mod values corrected[\s\S]{0,2500}fixItem: ModBookFixes\.fixItem/.test(readFileSync(join(ROOT, 'scripts/SR3EMigrations.js'), 'utf8')));
}
