/**
 * The mod markings — 🦾 on cyberware built into a cyberlimb, a mount chip on weapon mods, the item sheet's first line, the
 * `mount` field and the two internal smartgun items · TODOs 256/259, mods ruling Q22 (`scripts/data/mod-markings.mjs`).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ModMarkings } from '../scripts/data/mod-markings.mjs';
import { WeaponAccessories } from '../scripts/data/weapon-accessories.mjs';

export const name = 'mod-markings';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');
const packDoc = (pack, match) => {
  const file = readdirSync(join(ROOT, 'packs-src', pack)).find(f => f.startsWith(match));
  return file ? JSON.parse(read(`packs-src/${pack}/${file}`)).doc : null;
};

export async function run(t) {
  /* ── 🦾 ─────────────────────────────────────────────────────────────────────── */
  const limbMod = { type: 'cyberware', name: 'Smartlink II', system: { cyberwareCategory: 'Cyberlimb Mods' } };
  const implant = { type: 'cyberware', name: 'Smartlink II', system: { cyberwareCategory: 'Headware' } };
  t.is('a cyberlimb mod shows 🦾', ModMarkings.chip(limbMod)?.text, '🦾');
  t.is('the ordinary implant of the same name shows nothing', ModMarkings.chip(implant), null);
  t.ok('modFor "cyberlimb" alone marks it', ModMarkings.isLimbMod({ type: 'cyberware', name: 'X', system: { modFor: 'cyberlimb' } }));
  t.ok('the limb line cites SR3 p.303', /SR3 p\.303/.test(ModMarkings.line(limbMod)));
  t.is('a limb itself is not a limb mod', ModMarkings.line({ type: 'cyberware', name: 'Cyberarm', system: { cyberwareCategory: 'Cyberlimbs' } }), '');

  /* ── the mount chip ─────────────────────────────────────────────────────────── */
  const acc = (name, system = {}) => ({ type: 'gear', name, system: { category: 'Firearms Accessories', ...system } });
  t.is('the description\'s Mount: line', ModMarkings.mountOf(acc('Laser Sight', { description: '<p><strong>Mount:</strong> Top/Under</p>' })), 'Top/Under');
  t.is('the mount field wins over the line', ModMarkings.mountOf(acc('Laser Sight', { mount: 'Under', description: '<p><strong>Mount:</strong> Top</p>' })), 'Under');
  t.is('a chip names the mount', ModMarkings.chip(acc('Silencer', { mount: 'Barrel' }))?.text, 'Barrel');
  t.ok('its line says one accessory per mount', /one accessory per mount/.test(ModMarkings.line(acc('Silencer', { mount: 'Barrel' }))));
  t.is('a weapon mod with no mount shows nothing', ModMarkings.chip(acc('Concealable Holster')), null);
  t.is('plain gear shows nothing', ModMarkings.chip({ type: 'gear', name: 'Medkit', system: { mount: 'Top' } }), null);

  /* ── the data model and the sheets ──────────────────────────────────────────── */
  const models = read('scripts/data/ItemDataModels.js');
  const gearSchema = models.slice(models.indexOf('class GearData'), models.indexOf('class', models.indexOf('class GearData') + 10));
  t.ok('GearData declares `mount` (a TypeDataModel drops an undeclared key)', /mount:\s+new StringField/.test(gearSchema));
  const actorSheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the cyberware row shows the chip', /\$\{c\.name\}\$\{SR3EActorSheet\.markChip\(c\)\}/.test(actorSheet));
  t.ok('the gear row shows the chip', /\$\{displayName\(g\)\}\$\{SR3EActorSheet\.markChip\(g\)\}/.test(actorSheet));
  const itemSheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('the gear sheet has a Mount field', /\$\{this\._mountField\(s\)\}/.test(itemSheet) && /name="system\.mount"/.test(itemSheet));
  t.ok('the item sheet shows the marking line', (itemSheet.match(/this\._markingLine\(\)/g) ?? []).length >= 2);

  /* ── the two internal smartgun items ────────────────────────────────────────── */
  const sg = packDoc('sr3e-sr3-gear', 'smartgun-internal-weapon.');
  const sl2 = packDoc('sr3e-mm-gear', 'smartlink-2-modification-internal-weapon.');
  t.ok('Smartgun, internal ships in the SR3 gear pack', sg?.name === 'Smartgun, internal (Weapon)' && sg.system.bookPage === 'sr3.282');
  t.ok('Smartlink-2 Modification, Internal ships in the M&M gear pack', sl2?.name === 'Smartlink-2 Modification, Internal (Weapon)' && sl2.system.bookPage === 'mm.32');
  for (const d of [sg, sl2]) {
    t.is(`${d?.name}: Internal mount`, ModMarkings.mountOf(d), 'Internal');
    t.is(`${d?.name}: 0¥, priced from the gun at install`, d?.system?.cost, 0);
    t.ok(`${d?.name}: hand-added, so the gear builder keeps it`, !d?.flags?.The2ndChumming3e?.generatedBy);
  }
  const gun = { type: 'firearm', name: 'Ares Predator', system: { cost: 450 } };
  t.is('the internal smartgun is priced at 100% of the gun', WeaponAccessories.internalSmartgunCost(gun, sg), 450);
  t.is('the internal Smartlink-2 at 150%', WeaponAccessories.internalSmartgunCost(gun, sl2), 675);
}
