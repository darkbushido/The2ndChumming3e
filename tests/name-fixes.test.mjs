/**
 * Names corrected against the books — the broken "Extended Clip (", the Helmet/Wrist Transceiver, Low-light Vision,
 * the "Mag 38" typos and Electronic/Optical Magnification as a rating · TODO 266
 * (`scripts/data/name-fixes.mjs`, applied by `ModFor.migrateDelta`, the 0.8.0 migration).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ModRatings } from '../scripts/data/mod-ratings.mjs';
import { MOD_RATING_TABLE } from '../scripts/data/mod-rating-table.mjs';
import { NameFixes } from '../scripts/data/name-fixes.mjs';
import { cleanName, normName, idFor } from '../tools/build-default-gear.mjs';
import { ModFor } from '../scripts/data/mod-for.mjs';

export const name = 'name-fixes';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const gear = (name, system = {}) => ({ type: 'gear', name, system: { category: 'Firearms Accessories', ...system } });
const arm = (name, system = {}) => ({ type: 'armor', name, system });
const src = (pack, id) => ({ _stats: { compendiumSource: `Compendium.The2ndChumming3e.${pack}.Item.${id}` } });
const link = (pack, id) => `Compendium.The2ndChumming3e.${pack}.Item.${id}`;
const HW = 'Helmet/Wrist Transceiver (Armor)';
const EM = 'Electronic Magnification (Armor)';
const OM = 'Optical Magnification (Armor)';

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

  /* ── Helmet/Wrist Transceiver ────────────────────────────────────────────────── */
  t.is('an owned 0.8.0 copy keeps its level', NameFixes.fixedName(arm('Transceiver (Armor) [5]')), `${HW} [5]`);
  t.is('the 0.7.0 option "+Transceiver Rtg. 4" keeps its level', NameFixes.fixedName(arm('+Transceiver Rtg. 4')), `${HW} [4]`);
  t.is('the plain pack name', NameFixes.fixedName(arm('Transceiver (Armor)')), HW);
  t.is('the new name needs nothing (idempotent)', NameFixes.fixedName(arm(`${HW} [5]`)), null);
  t.is('a GM\'s own name is left alone', NameFixes.fixedName(arm('Transceiver Mk II (Armor)')), null);
  t.is('the GEAR Transceiver (SR3 p.290) is a different item', NameFixes.fixedName({ type: 'gear', name: 'Transceiver', system: { category: 'Surveillance and Security' } }), null);
  t.is('…and so is the Micro-Transceiver', NameFixes.fixedName({ type: 'gear', name: 'Micro-Transceiver', system: {} }), null);
  t.eq('the migration renames, keeps the level', ModFor.migrateDelta(arm('Transceiver (Armor) [5]', { rating: 5, modFor: 'armor' })), { name: `${HW} [5]` });
  t.eq('the 0.7.0 option gets level, tag and name',
    ModFor.migrateDelta(arm('+Transceiver Rtg. 4')), { 'system.rating': 4, 'system.modFor': 'armor', name: `${HW} [4]` });
  t.is('a second run yields null', ModFor.migrateDelta(arm(`${HW} [5]`, { rating: 5, modFor: 'armor' })), null);
  t.is('a link to the deleted SR3 document goes to the Cannon Companion one', ModRatings.repointSource(src('sr3e-sr3-armor', 'sr3e-armor-0271')),
    link('sr3e-cc-armor', 'sr3e-armor-0201'));
  t.is('…and so does a link to one of its deleted levels', ModRatings.repointSource(src('sr3e-sr3-armor', 'sr3e-armor-0275')), link('sr3e-cc-armor', 'sr3e-armor-0201'));
  t.is('the repoint is idempotent (the kept document is never a deleted id)', ModRatings.repointSource(src('sr3e-cc-armor', 'sr3e-armor-0201')), null);
  t.is('the old armour Transceiver has no level table (the new name has)', [MOD_RATING_TABLE['armor|Transceiver'], !!MOD_RATING_TABLE['armor|Helmet/Wrist Transceiver']].join(), ',true');
  t.eq('the migration repoints a dead link together with the rename',
    ModFor.migrateDelta({ ...arm('Transceiver (Armor) [5]', { rating: 5, modFor: 'armor' }), ...src('sr3e-sr3-armor', 'sr3e-armor-0271') }),
    { '_stats.compendiumSource': link('sr3e-cc-armor', 'sr3e-armor-0201'), name: `${HW} [5]` });

  /* ── Low-light Vision (Cannon Companion p.51 only) ───────────────────────────── */
  t.is('a link to the deleted SR3 Low-light copy goes to the Cannon Companion one', ModRatings.repointSource(src('sr3e-sr3-armor', 'sr3e-armor-0245')),
    link('sr3e-cc-armor', 'sr3e-armor-0175'));
  t.is('Low-light is not renamed', NameFixes.fixedName(arm('Low-light Vision (Armor)')), null);

  /* ── Magnification is a rating ───────────────────────────────────────────────── */
  t.is('Elec. Vis. Mag 3', NameFixes.fixedName(arm('Elec. Vis. Mag 3 (Armor)')), `${EM} [3]`);
  t.is('the 0.7.0 "+" spelling', NameFixes.fixedName(arm('+Elec. Vis. Mag 3')), `${EM} [3]`);
  t.is('Electric Vision Mag 3 (the Cannon Companion duplicate)', NameFixes.fixedName(arm('Electric Vision Mag 3 (Armor)')), `${EM} [3]`);
  t.is('the typo Mag 38', NameFixes.fixedName(arm('Elec. Vis. Mag 38 (Armor)')), `${EM} [3]`);
  t.is('Optical Vis. Mag 3', NameFixes.fixedName(arm('Optical Vis. Mag 3 (Armor)')), `${OM} [3]`);
  t.is('Optical Vision Mag 3', NameFixes.fixedName(arm('+Optical Vision Mag 3')), `${OM} [3]`);
  t.is('Optical Vis. Mag 38', NameFixes.fixedName(arm('Optical Vis. Mag 38 (Armor)')), `${OM} [3]`);
  t.is('the new names need nothing (idempotent)', NameFixes.fixedName(arm(`${EM} [3]`)) ?? NameFixes.fixedName(arm(OM)), null);
  t.is('Smart Goggles 1 is a model, not a level', ModRatings.splitName('Smart Goggles 1'), null);
  t.is('"Optical Vis. Mag 3" is not a bare-number level in general', ModRatings.splitName('Optical Vis. Mag 3'), null);
  t.eq('the migration renames and fills the rating', ModFor.migrateDelta(arm('Elec. Vis. Mag 3 (Armor)', { modFor: 'armor' })), { 'system.rating': 3, name: `${EM} [3]` });
  t.is("…a rating a GM set is kept: it wins, the name follows it", ModFor.migrateDelta(arm("+Optical Vis. Mag 38", { rating: 5 })).name, `${OM} [5]`);
  t.is('…a second run yields null', ModFor.migrateDelta(arm(`${EM} [3]`, { rating: 3, modFor: 'armor' })), null);
  t.is('a link to Mag 38 goes to the Magnification document', ModRatings.repointSource(src('sr3e-sr3-armor', 'f49a41875c21af8d')), link('sr3e-sr3-armor', 'sr3e-armor-0242'));
  t.is('…Optical Mag 38', ModRatings.repointSource(src('sr3e-sr3-armor', '5f7e478c061e9a1c')), link('sr3e-sr3-armor', 'sr3e-armor-0243'));
  t.is('…the Cannon Companion duplicates', ModRatings.repointSource(src('sr3e-cc-armor', 'c6012ca9ce44ab83')), link('sr3e-cc-armor', 'sr3e-armor-0172'));
  t.is('…', ModRatings.repointSource(src('sr3e-cc-armor', 'bed77e28caee56ae')), link('sr3e-cc-armor', 'sr3e-armor-0173'));

  /* ── One Thermographic: Thermo Vision ────────────────────────────────────────── */
  const TV = 'Thermo Vision (Armor)';
  t.is('the pack name "Therm Vision (Armor)"', NameFixes.fixedName(arm('Therm Vision (Armor)')), TV);
  t.is('the 0.7.0 "+Therm Vision" spelling', NameFixes.fixedName(arm('+Therm Vision')), TV);
  t.is('the bare "Therm Vision"', NameFixes.fixedName(arm('Therm Vision')), TV);
  t.is('with a level', NameFixes.fixedName(arm('Therm Vision (Armor) [2]')), `${TV} [2]`);
  t.is('Thermo Vision needs nothing (idempotent)', NameFixes.fixedName(arm(TV)), null);
  t.is('a houserule name is left alone', NameFixes.fixedName(arm('Therm Vision Mk II (Armor)')), null);
  t.is('only armour', NameFixes.fixedName(gear('Therm Vision')), null);
  t.eq('the migration renames and tags', ModFor.migrateDelta(arm('Therm Vision (Armor)')), { 'system.modFor': 'armor', name: TV });
  t.is('a second run yields null', ModFor.migrateDelta(arm(TV, { modFor: 'armor' })), null);
  t.is('a link to the deleted Therm Vision goes to Thermo Vision', ModRatings.repointSource(src('sr3e-cc-armor', 'ce8f1144b1d5cd50')), link('sr3e-cc-armor', 'sr3e-armor-0176'));
  t.is('the repoint is idempotent', ModRatings.repointSource(src('sr3e-cc-armor', 'sr3e-armor-0176')), null);
  t.eq('the migration repoints and renames together',
    ModFor.migrateDelta({ ...arm('+Therm Vision', { modFor: 'armor' }), ...src('sr3e-cc-armor', 'ce8f1144b1d5cd50') }),
    { '_stats.compendiumSource': link('sr3e-cc-armor', 'sr3e-armor-0176'), name: TV });

  /* ── The generator ───────────────────────────────────────────────────────────── */
  t.is('the generator names the row Extended Clip', cleanName('Extended Clip ('), 'Extended Clip');
  t.is('…and the id it derives is the one the truncated name always produced', idFor(`build-default-gear|cc|gear|${normName('Extended Clip (')}`), '6f5ad6755534010f');

  /* ── The packs ───────────────────────────────────────────────────────────────── */
  const docs = pack => readdirSync(join(ROOT, 'packs-src', pack)).map(f => JSON.parse(readFileSync(join(ROOT, 'packs-src', pack, f), 'utf8')).doc).filter(Boolean);
  const sr3 = docs('sr3e-sr3-armor'), cc = docs('sr3e-cc-armor');
  const bad = d => /^Transceiver \(Armor\)|Low-light|Mag 3/i.test(d.name ?? '');
  t.eq('RATCHET: sr3e-sr3-armor has no "Transceiver (Armor)", no Low-light Vision and no "Mag 3x"', sr3.filter(bad).map(d => d.name), []);
  t.eq('RATCHET: no armour-pack name says "Mag 3", "Mag 38" or "Vis. Mag"', [...sr3, ...cc].filter(d => /Mag 3|Vis\. Mag|Vision Mag/i.test(d.name ?? '')).map(d => d.name), []);
  const named = n => cc.filter(d => d.name === n);
  t.is('the Cannon Companion pack has "Helmet/Wrist Transceiver (Armor)" exactly once', named(HW).length, 1);
  t.is('…and no "Transceiver (Armor)"', named('Transceiver (Armor)').length, 0);
  const hw = named(HW)[0];
  t.is('…it is Cannon Companion p.51, a mod for armour', [hw.system.bookPage, hw.system.modFor].join(' '), 'cc.51 armor');
  t.is('…rated by the Level dropdown (250 x Rating)', ModRatings.levelsOf(hw)?.[10]?.cost, 2500);
  t.is('RATCHET: sr3e-cc-armor has one Thermographic, "Thermo Vision (Armor)" at 700 nuyen, and no "Therm Vision"',
    cc.filter(d => /^\+?Therm(o)? Vision/.test(d.name ?? '')).map(d => `${d.name} ${d.system.cost}`).join(), 'Thermo Vision (Armor) 700');
  const low = named('Low-light Vision (Armor)');
  t.is('Low-light Vision stays in the Cannon Companion pack, once: cc.51, 700 nuyen', low.map(d => `${d.system.bookPage} ${d.system.cost}`).join(), 'cc.51 700');
  for (const [n, cost] of [[EM, 900], [OM, 1200]]) {
    for (const [label, pack] of [['sr3', sr3], ['cc', cc]]) {
      const m = pack.filter(d => d.name === n);
      t.is(`${label}: "${n}" exists once with rating 3 and ${cost} nuyen`, m.map(d => `${d.system.rating} ${d.system.cost}`).join(), `3 ${cost}`);
    }
  }

  const broken = [];
  for (const pack of readdirSync(join(ROOT, 'packs-src'))) {
    for (const d of docs(pack)) {
      if (typeof d.name === 'string' && (d.name.includes('( (') || /\(\s*$/.test(d.name))) broken.push(`${pack}: ${d.name}`);
    }
  }
  t.eq('RATCHET: no pack document name contains "( (" or ends in "("', broken, []);
}
