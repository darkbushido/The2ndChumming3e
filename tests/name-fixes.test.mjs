/**
 * Names corrected against the books — the broken "Extended Clip (" and the Helmet/Wrist Transceiver · TODO 266
 * (`scripts/data/name-fixes.mjs`, applied by `ModFor.migrateDelta`, the 0.8.0 migration).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NameFixes } from '../scripts/data/name-fixes.mjs';
import { cleanName, normName, idFor } from '../tools/build-default-gear.mjs';
import { ModFor } from '../scripts/data/mod-for.mjs';

export const name = 'name-fixes';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const gear = (name, system = {}, extra = {}) => ({ type: 'gear', name, system: { category: 'Firearms Accessories', ...system }, ...extra });

export async function run(t) {
  /* ── Extended Clip ───────────────────────────────────────────────────────────── */
  t.is('the raw upstream name', NameFixes.fixedName(gear('Extended Clip (')), 'Extended Clip (Weapon)');
  t.is('the 0.7.0 pack name', NameFixes.fixedName(gear('Extended Clip ( (Weapon)')), 'Extended Clip (Weapon)');
  t.is('with a level', NameFixes.fixedName(gear('Extended Clip ( (Weapon) [3]')), 'Extended Clip (Weapon) [3]');
  t.is('the corrected name needs nothing (idempotent)', NameFixes.fixedName(gear('Extended Clip (Weapon)')), null);
  t.is('a houserule name is left alone', NameFixes.fixedName(gear('Extended Clip (Big)')), null);
  t.is('only gear', NameFixes.fixedName({ type: 'firearm', name: 'Extended Clip (', system: {} }), null);

  const owned = gear('Extended Clip ( (Weapon)', { modFor: 'weapon' });
  t.eq('the migration renames the owned copy', ModFor.migrateDelta(owned), { name: 'Extended Clip (Weapon)' });
  t.eq('the raw name is renamed AND tagged', ModFor.migrateDelta(gear('Extended Clip (')), { 'system.modFor': 'weapon', name: 'Extended Clip (Weapon)' });
  t.eq('a level is kept', ModFor.migrateDelta(gear('Extended Clip ( (Weapon) [2]', { modFor: 'weapon', rating: 2 })), { name: 'Extended Clip (Weapon) [2]' });
  t.is('a second run yields null', ModFor.migrateDelta(gear('Extended Clip (Weapon)', { modFor: 'weapon' })), null);

  t.is('the generator names the row Extended Clip', cleanName('Extended Clip ('), 'Extended Clip');
  t.is('…and the id it derives is the one the truncated name always produced', idFor(`build-default-gear|cc|gear|${normName('Extended Clip (')}`), '6f5ad6755534010f');

  /* ── The packs: no truncated name ────────────────────────────────────────────── */
  const broken = [];
  for (const pack of readdirSync(join(ROOT, 'packs-src'))) {
    for (const f of readdirSync(join(ROOT, 'packs-src', pack))) {
      const j = JSON.parse(readFileSync(join(ROOT, 'packs-src', pack, f), 'utf8'));
      const n = j.doc?.name;
      if (typeof n === 'string' && (n.includes('( (') || /\(\s*$/.test(n))) broken.push(`${pack}: ${n}`);
    }
  }
  t.eq('RATCHET: no pack document name contains "( (" or ends in "("', broken, []);
}
