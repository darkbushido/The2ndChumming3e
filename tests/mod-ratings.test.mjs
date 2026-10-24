/**
 * Rated mods — the level lives in `system.rating`, not the name, with a dropdown of the printed levels
 * (TODO 261): `scripts/data/mod-ratings.mjs`, the table `tools/build-mod-ratings.mjs` generates, the
 * weapon mods `tools/build-default-gear.mjs` generates, and the packs.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ModRatings } from '../scripts/data/mod-ratings.mjs';
import { MOD_RATING_TABLE } from '../scripts/data/mod-rating-table.mjs';
import { displayName, ItemRating } from '../scripts/data/item-rating.mjs';
import { buildTable, renderTable, TABLE_FILE } from '../tools/build-mod-ratings.mjs';
import { idFor, normName, GENERATOR } from '../tools/build-default-gear.mjs';

export const name = 'mod-ratings';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');
const veh = (name, system = {}) => ({ type: 'vehiclemod', name, system });
const limb = (name, system = {}) => ({ type: 'cyberware', name, system: { cyberwareCategory: 'Cyberlimb Mods', ...system } });
const acc = (name, system = {}) => ({ type: 'gear', name, system: { category: 'Firearms Accessories', ...system } });

export async function run(t) {
  /* ── Which items are rated mods ──────────────────────────────────────────────── */
  t.is('a vehicle mod', ModRatings.kindOf(veh('ECCM [3]')), 'vehicle');
  t.is('cyberware built into a limb', ModRatings.kindOf(limb('Signal Booster [3]')), 'cyberlimb');
  t.is('a firearms accessory', ModRatings.kindOf(acc('Gun Cam Transmitter [2]')), 'weapon');
  t.is('ordinary cyberware is not a mod', ModRatings.kindOf({ type: 'cyberware', name: 'Wired Reflexes [2]', system: { cyberwareCategory: 'Bodyware' } }), null);
  t.is('ordinary gear is not a mod', ModRatings.kindOf({ type: 'gear', name: 'Medkit [6]', system: { category: 'Biotech' } }), null);

  /* ── Reading a level out of a name ───────────────────────────────────────────── */
  const split = n => ModRatings.splitName(n);
  t.eq('"Anti-Theft System [10]"', split('Anti-Theft System [10]'), { stem: 'Anti-Theft System', rating: 10 });
  t.eq('"STS (Beacon) Rating [3]" drops the word Rating', split('STS (Beacon) Rating [3]'), { stem: 'STS (Beacon)', rating: 3 });
  t.eq('"VAUBAN Vehicle A.T. Lvl [2]" drops Lvl', split('VAUBAN Vehicle A.T. Lvl [2]'), { stem: 'VAUBAN Vehicle A.T.', rating: 2 });
  t.eq('a glued bracket, spaces tidied', split('Rem-Contr. Intr.  Bod[3]'), { stem: 'Rem-Contr. Intr. Bod', rating: 3 });
  t.eq('the upstream stray after the bracket goes too', split('Protocol Emulation Module [10]  1'), { stem: 'Protocol Emulation Module', rating: 10 });
  t.is('a bare trailing number is a model, not a level', split('Ares Predator 2'), null);
  t.is('a plain name has no level', split('Anti-Theft System'), null);

  /* ── The rename (packs tool and the 0.7.1 migration) ─────────────────────────── */
  t.eq('a levelled vehicle mod is renamed and its level saved', ModRatings.renameDelta(veh('ECCM [3]')), { name: 'ECCM', 'system.rating': 3 });
  t.eq('…a rating already agreeing is left as it is', ModRatings.renameDelta(limb('Signal Booster [3]', { rating: 3 })), { name: 'Signal Booster' });
  t.eq('…a GM\'s different rating wins over the stale name', ModRatings.renameDelta(veh('ECCM [3]', { rating: 5 })), { name: 'ECCM' });
  t.is('a plain name is left alone (idempotent)', ModRatings.renameDelta(veh('ECCM', { rating: 3 })), null);
  t.is('a non-mod is never renamed', ModRatings.renameDelta({ type: 'cyberware', name: 'Wired Reflexes [2]', system: {} }), null);

  /* ── The dropdown ────────────────────────────────────────────────────────────── */
  const ats = veh('Anti-Theft System', { rating: 7 });
  const opts = ModRatings.options(ats);
  t.eq('the dropdown offers the printed levels', opts.map(o => o.value), [3, 4, 5, 6, 7, 8, 9, 10]);
  t.is('…with the item\'s own selected', opts.find(o => o.selected)?.value, 7);
  t.eq('picking 10 brings level 10\'s numbers', ModRatings.ratingChange(ats, 10),
    { 'system.rating': 10, 'system.availability': '6/14days', 'system.cost': 50000, 'system.streetIndex': '2.00' });
  t.ok('a GM\'s houserule level stays selectable, marked', ModRatings.options(veh('Anti-Theft System', { rating: 12 })).some(o => o.value === 12 && /not in the book/.test(o.label)));
  t.eq('…and picking it changes only the rating', ModRatings.ratingChange(veh('Anti-Theft System', { rating: 3 }), 12), { 'system.rating': 12 });
  t.is('a renamed mod has no table, so the sheet keeps the plain box', ModRatings.options(veh('My Alarm', { rating: 3 })), null);
  t.ok('a cyberlimb mod\'s level carries its cost', ModRatings.ratingChange(limb('Armor: Ballistic'), 4)['system.cost'] === 10000);
  t.ok('a vehicle mod\'s level carries its CF', ModRatings.ratingChange(veh('ECCM'), 5)['system.cfCost'] === '6');
  t.ok('a weapon mod has levels too', ModRatings.options(acc('STS (Beacon)', { rating: 2 }))?.length === 6);

  /* ── The packs: no level left in a name, every level in its rating ───────────── */
  const docs = [], levelled = [], unrated = [];
  for (const pack of readdirSync(join(ROOT, 'packs-src'))) {
    for (const f of readdirSync(join(ROOT, 'packs-src', pack))) {
      const j = JSON.parse(readFileSync(join(ROOT, 'packs-src', pack, f), 'utf8'));
      for (const [key, d] of [[j._key, j.doc], ...Object.entries(j.embedded ?? {})]) {
        if (!d?.name || !ModRatings.kindOf(d)) continue;
        if (ModRatings.splitName(d.name)) levelled.push(`${pack}: ${d.name}`);
        if (d.type === 'vehiclemod' && d.system?.rating === undefined) unrated.push(`${pack}: ${d.name}`);
        if (key.startsWith('!items!')) docs.push({ pack, key, d });
      }
    }
  }
  t.eq('no shipped mod carries its level in its name', levelled, []);
  t.eq('every shipped vehicle mod states its rating (null = none)', unrated, []);
  t.ok(`the three kinds are all there (${docs.length} mods)`, ['vehicle', 'cyberlimb', 'weapon'].every(k => docs.some(x => ModRatings.kindOf(x.d) === k)));
  const sts = docs.find(x => x.d.name === 'STS (Beacon)' && x.d.system.rating === 3);
  t.is('a generated weapon mod keeps the id of its ORIGINAL name (owned copies keep their link)',
    sts?.key, `!items!${idFor(`${GENERATOR}|cc|gear|${normName('STS (Beacon) Rating [3]')}`)}`);
  const rdm = docs.find(x => x.key === '!items!sr3e-cyberware-0833');
  t.ok('the corrected Rigger Decryption Module is plain at 10 (TODO 255)', rdm?.d.name === 'Rigger Decryption Module' && rdm.d.system.rating === 10);

  /* ── The table is build output ───────────────────────────────────────────────── */
  t.ok('the level table matches the packs', read(TABLE_FILE.slice(ROOT.length + 1)) === renderTable(buildTable(docs.map(x => x.d)).table));
  t.ok('a mod printed at one level only has no dropdown', Object.values(MOD_RATING_TABLE).every(levels => Object.keys(levels).length >= 2));
  t.ok('a table row carries only printed numbers, never bookkeeping', Object.values(MOD_RATING_TABLE).every(levels =>
    Object.values(levels).every(row => !('rating' in row) && !('srcgName' in row) && !('grade' in row))));
  t.eq('two printed rows for one level are found', buildTable([veh('X', { rating: 1, cost: 1 }), veh('X', { rating: 1, cost: 2 }), veh('X', { rating: 2, cost: 3 })]).conflicts, ['vehicle|X [1]']);

  /* ── Lists show the level ────────────────────────────────────────────────────── */
  t.ok('a vehicle mod is a rated type now', ItemRating.RATED_TYPES.includes('vehiclemod'));
  t.is('…shown with its level', displayName(veh('Anti-Theft System', { rating: 10 })), 'Anti-Theft System [10]');
  t.is('…and an unlevelled one plainly', displayName(veh('Roll Bars', { rating: null })), 'Roll Bars');
  t.ok('VehicleModData declares the rating (a data model drops undeclared keys)', /class VehicleModData[\s\S]{0,400}rating:\s+new NumberField\(\{ integer: true, nullable: true/.test(read('scripts/data/ItemDataModels.js')));
  const main = read('scripts/sr3e.js');
  t.ok('the compendium index carries the rating', /compendiumIndexFields\.push\('system\.rating'\)/.test(main));
  t.ok('a compendium window shows the level', /Hooks\.on\('renderCompendium'[\s\S]{0,600}ItemRating\.displayName\(entry\)/.test(main));
  t.ok('the vehicle sheet lists mods with their level', /displayName\(m\)/.test(read('scripts/sheets/SR3EVehicleSheet.js')));

  /* ── The item sheet ──────────────────────────────────────────────────────────── */
  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('a vehicle mod has a sheet of its own', /case 'vehiclemod':[\s\S]{0,200}_modRatingField\(s\)/.test(sheet));
  t.ok('cyberware and gear offer the level dropdown', (sheet.match(/\$\{this\._modRatingField\(s\)\}/g) ?? []).length === 3);
  t.ok('a rated item that is not a mod keeps the Rating box', /_modRatingField\(s\) \{\s*const opts = ModRatings\.options\(this\.document\);\s*if \(!opts\) return this\._ratingField\(s\);/.test(sheet));
  t.ok('the dropdown is wired', /\.mod-rating-select'\)\s*\?\.addEventListener\('change', ev => SR3EItemSheet\._onModRatingChange/.test(sheet));
  t.ok('…and has no name, so the form never saves a level without its numbers', /<select class="mod-rating-select"(?![^>]*name=)/.test(sheet));
  t.ok('graded cyberware re-applies its grade to the new level', /_onModRatingChange[\s\S]{0,700}_onGradeChange\.call/.test(sheet));

  /* ── The migration ───────────────────────────────────────────────────────────── */
  t.ok('a 0.7.1 migration renames owned copies', /version: '0\.7\.1',\s*label: 'Mod levels[\s\S]{0,1200}fixItem: ModRatings\.renameDelta/.test(read('scripts/SR3EMigrations.js')));
}
