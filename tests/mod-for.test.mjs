/**
 * Every mod says what it is a mod FOR — `system.modFor` and the name tag; the armour options' bare-number levels · TODO 266
 * (`scripts/data/mod-for.mjs`, `scripts/data/mod-ratings.mjs`).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ModRatings } from '../scripts/data/mod-ratings.mjs';
import { ModFor } from '../scripts/data/mod-for.mjs';
import { MOD_RATING_TABLE } from '../scripts/data/mod-rating-table.mjs';
import { EXCLUDED_PACKS } from '../tools/build-mod-ratings.mjs';

export const name = 'mod-for';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');
const armor = (name, system = {}) => ({ type: 'armor', name, system });
const veh = (name, system = {}) => ({ type: 'vehiclemod', name, system });
const limb = (name, system = {}) => ({ type: 'cyberware', name, system: { cyberwareCategory: 'Cyberlimb Mods', ...system } });
const acc = (name, system = {}) => ({ type: 'gear', name, system: { category: 'Firearms Accessories', ...system } });

export async function run(t) {
  /* ── baseName: the one key every name-keyed lookup uses ──────────────────────── */
  const base = n => ModRatings.baseName(n);
  t.is('a tagged, levelled owned copy', base('Chemical Seal (Armor) [4]'), 'Chemical Seal');
  t.is('the 0.7.0 name', base('Chemical Seal Rating [4]'), 'Chemical Seal');
  t.is('the plain pack name', base('Chemical Seal'), 'Chemical Seal');
  t.is('a tag alone', base('Gas Vent IV (Weapon)'), 'Gas Vent IV');
  t.is('the old armour option: leading "+" and bare level', base('+Signal Locator 7'), 'Signal Locator');
  t.is('"Rtg." is dropped like "Rating"', base('+Transceiver Rtg. 4'), 'Transceiver');
  t.is('a name\'s own parenthesis stays', base('STS (Beacon) (Weapon) [3]'), 'STS (Beacon)');
  t.is('a level written before the tag', base('Foo [2] (Armor)'), 'Foo');
  t.is('"(Hand)" is not a tag', base('Laser Designator (Hand) (Weapon)'), 'Laser Designator (Hand)');

  /* ── The bare-number family rule ─────────────────────────────────────────────── */
  const sp = n => ModRatings.splitName(n);
  t.eq('Signal Locator 7 is level 7', sp('+Signal Locator 7'), { stem: 'Signal Locator', rating: 7 });
  t.eq('Tracking Signal 10', sp('+Tracking Signal 10'), { stem: 'Tracking Signal', rating: 10 });
  t.eq('Transceiver Rtg. 3', sp('+Transceiver Rtg. 3'), { stem: 'Transceiver', rating: 3 });
  t.eq('Personal Comm Unit 5', sp('Personal Comm Unit 5'), { stem: 'Personal Comm Unit', rating: 5 });
  t.eq('Ritual Sorcery Materials - Combat Force 4', sp('Ritual Sorcery Materials - Combat Force 4'), { stem: 'Ritual Sorcery Materials - Combat', rating: 4 });
  t.eq('Thermal Dampening Rat[8]MAX', sp('Thermal Dampening Rat[8]MAX'), { stem: 'Thermal Dampening', rating: 8 });
  t.is('"Optical Vis. Mag 3" is MAGNIFICATION, not a level (SR3 p.284)', sp('+Optical Vis. Mag 3'), null);
  t.is('…nor "Elec. Vis. Mag 38"', sp('+Elec. Vis. Mag 38'), null);
  t.is('…nor a model number', sp('+Smart Goggles 1'), null);
  t.is('…nor "Ares Predator 2"', sp('Ares Predator 2'), null);

  /* ── The tag rule ────────────────────────────────────────────────────────────── */
  t.is('a vehicle mod', ModFor.of(veh('Anti-Theft System')), 'vehicle');
  t.is('a Firearms Accessory', ModFor.of(acc('Gas Vent IV')), 'weapon');
  t.is('a Cyberlimb Mod', ModFor.of(limb('Armor: Ballistic')), 'cyberlimb');
  t.is('an armour option ("+")', ModFor.of(armor('+Respirator')), 'armor');
  t.is('a Cannon Companion armour modification', ModFor.of({ type: 'gear', name: 'Chemical Seal', system: { category: 'Stuff With Ratings' } }), 'armor');
  t.is('…by its plain name even with a level and a tag', ModFor.of({ type: 'gear', name: 'Insulation [3]', system: { category: 'Stuff With Ratings' } }), 'armor');
  t.is('ordinary armour is not a mod', ModFor.of(armor('Armor Jacket')), '');
  t.is('a cybereye option is NOT tagged (the maintainer decides)', ModFor.of({ type: 'cyberware', name: 'Eye Laser', system: { cyberwareCategory: 'Eyeware' } }), '');
  t.is('a Smartlink implant is not tagged', ModFor.of({ type: 'cyberware', name: 'Smartlink', system: { cyberwareCategory: 'Bodyware' } }), '');
  t.is('a value already set is the truth', ModFor.of({ type: 'gear', name: 'X', system: { category: 'Biotech', modFor: 'vehicle' } }), 'vehicle');
  t.is('a name that already ends in the tag says so', ModFor.of({ type: 'gear', name: 'Remote Trigger System (Weapon)', system: { category: 'Surveillance and Security' } }), 'weapon');
  t.is('tagged() adds the tag', ModRatings.tagged('Chemical Seal', 'armor'), 'Chemical Seal (Armor)');
  t.is('…keeps the level after it', ModRatings.tagged('Chemical Seal Rating [4]', 'armor'), 'Chemical Seal (Armor) [4]');
  t.is('…never doubles it', ModRatings.tagged('Chemical Seal (Armor) [4]', 'armor'), 'Chemical Seal (Armor) [4]');
  t.is('…replaces a wrong one', ModRatings.tagged('Chemical Seal (Weapon)', 'armor'), 'Chemical Seal (Armor)');
  t.is('…drops the "+" and the bare level', ModRatings.tagged('+Signal Locator 7', 'armor'), 'Signal Locator (Armor) [7]');
  t.is('syncName keeps the tag and swaps only the level', ModRatings.syncName('Chemical Seal (Armor) [4]', 5, 'gear'), 'Chemical Seal (Armor) [5]');
  t.is('…and adds the level after the tag', ModRatings.syncName('Chemical Seal (Armor)', 4, 'gear'), 'Chemical Seal (Armor) [4]');
  t.is('…never doubles the tag', ModRatings.syncName(ModRatings.syncName('Gas Vent IV (Weapon)', 4, 'gear'), 4, 'gear'), 'Gas Vent IV (Weapon) [4]');
  t.is('a tagged name finds the level table row', ModRatings.keyOf(armor('Signal Locator (Armor) [7]')), 'armor|Signal Locator');
  t.eq('…and its levels (1-10, 1,000¥ x Rating — SR3 p.284)', [Object.keys(MOD_RATING_TABLE['armor|Signal Locator']).length, MOD_RATING_TABLE['armor|Signal Locator'][7].cost], [10, 7000]);
  t.is('Tracking Signal is 100¥ x Rating (SR3 p.284)', MOD_RATING_TABLE['armor|Tracking Signal'][6].cost, 600);

  /* ── The 0.7.1 migration for an owned copy ───────────────────────────────────── */
  t.eq('a 0.7.0 gear copy gets its tag and modFor, the level kept',
    ModFor.migrateDelta({ type: 'gear', name: 'Chemical Seal [4]', system: { category: 'Stuff With Ratings', rating: 4 } }),
    { 'system.modFor': 'armor', name: 'Chemical Seal (Armor) [4]' });
  t.eq('an owned "+Signal Locator 7" becomes "Signal Locator (Armor) [7]" with modFor armor and rating 7',
    ModFor.migrateDelta(armor('+Signal Locator 7')),
    { name: 'Signal Locator (Armor) [7]', 'system.rating': 7, 'system.modFor': 'armor' });
  t.is('idempotent: a tagged copy yields null', ModFor.migrateDelta({ type: 'gear', name: 'Chemical Seal (Armor) [4]', system: { category: 'Stuff With Ratings', rating: 4, modFor: 'armor' } }), null);
  t.eq('modFor is filled only while blank — a GM\'s value stays, the name follows it',
    ModFor.migrateDelta(veh('Foo', { modFor: 'weapon' })), { name: 'Foo (Weapon)' });
  t.is('a plain gear item is not touched', ModFor.migrateDelta({ type: 'gear', name: 'Medkit [3]', system: { category: 'Biotech', rating: 3 } }), null);
  t.eq('a vehicle mod is tagged', ModFor.migrateDelta(veh('Anti-Theft System [5]', { rating: 5 })), { 'system.modFor': 'vehicle', name: 'Anti-Theft System (Vehicle) [5]' });

  /* ── The packs ───────────────────────────────────────────────────────────────── */
  const bad = [], armourNames = [], wrongFor = [];
  for (const pack of readdirSync(join(ROOT, 'packs-src'))) {
    if (EXCLUDED_PACKS.includes(pack)) continue;
    for (const f of readdirSync(join(ROOT, 'packs-src', pack))) {
      const j = JSON.parse(readFileSync(join(ROOT, 'packs-src', pack, f), 'utf8'));
      if (!j._key?.startsWith('!items!')) continue;
      const d = j.doc;
      const want = d.type === 'vehiclemod' ? 'vehicle'
        : d.type === 'cyberware' && d.system?.cyberwareCategory === 'Cyberlimb Mods' ? 'cyberlimb'
        : d.type === 'gear' && d.system?.category === 'Firearms Accessories' ? 'weapon' : '';
      if (want && (d.system?.modFor !== want || ModRatings.tagOf(d.name) !== want)) bad.push(`${pack}: ${d.name}`);
      if (d.system?.modFor && ModRatings.tagOf(d.name) !== d.system.modFor) wrongFor.push(`${pack}: ${d.name}`);
      if (d.type === 'armor' && pack.endsWith('armor') && ModRatings.splitName(d.name)) armourNames.push(`${pack}: ${d.name}`);
    }
  }
  t.eq('RATCHET: every vehicle mod, Cyberlimb Mod and Firearms Accessory has modFor set AND its tag in the name', bad, []);
  t.eq('every document with a modFor carries that tag, and no tag is without its modFor', wrongFor, []);
  t.eq('RATCHET: no armour-pack document name ends in a level (the bare-number families collapsed)', armourNames, []);
  const src = read('scripts/data/ItemDataModels.js');
  t.ok('gear, cyberware, armour and vehicle mods declare modFor (a data model drops undeclared keys)',
    (src.match(/modFor:\s+new StringField/g) ?? []).length === 4);
  t.ok('the armour data model declares a level', /class ArmorData[\s\S]{0,900}rating:\s+new NumberField\(\{ integer: true, nullable: true/.test(src));
  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('the item sheet shows "Mod for" on armour, gear, cyberware and vehicle mods', (sheet.match(/this\._modForField\(s\)/g) ?? []).length === 4 && /Mod for/.test(sheet));
  const mig = read('scripts/SR3EMigrations.js');
  t.ok('the 0.7.1 migration tags owned mods', /fixItem: \(item\) => \{[\s\S]{0,200}ModFor\.migrateDelta\(item\)/.test(mig));
}
