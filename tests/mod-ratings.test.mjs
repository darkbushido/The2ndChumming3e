/**
 * Rated items — ONE document per item, its level in `system.rating`, its levels in a dropdown (TODO 260):
 * `scripts/data/mod-ratings.mjs`, `scripts/data/rated-families.mjs`, the table `tools/build-mod-ratings.mjs`
 * generates, the gear `tools/build-default-gear.mjs` generates, and the packs.
 *
 * The maintainer, 2026-10-24: "We shouldn't have any [N] gear — the point is to move the level into the gear's doc."
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ModRatings } from '../scripts/data/mod-ratings.mjs';
import { MOD_RATING_TABLE, COLLAPSED_SOURCES } from '../scripts/data/mod-rating-table.mjs';
import { displayName, ItemRating } from '../scripts/data/item-rating.mjs';
import { RatedFamilies } from '../scripts/data/rated-families.mjs';
import { GearSearch } from '../scripts/data/gear-search.mjs';
import { buildTable, renderTable, tableFor, collapse, readCollapsed, readExtraLevels, sourcesOf, TABLE_FILE, EXCLUDED_PACKS } from '../tools/build-mod-ratings.mjs';
import { idFor, normName, GENERATOR } from '../tools/build-default-gear.mjs';

export const name = 'mod-ratings';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');
const veh = (name, system = {}) => ({ type: 'vehiclemod', name, system });
const limb = (name, system = {}) => ({ type: 'cyberware', name, system: { cyberwareCategory: 'Cyberlimb Mods', ...system } });
const acc = (name, system = {}) => ({ type: 'gear', name, system: { category: 'Firearms Accessories', ...system } });
const gear = (name, system = {}) => ({ type: 'gear', name, system: { category: 'Biotech', ...system } });
const ware = (name, system = {}) => ({ type: 'cyberware', name, system: { cyberwareCategory: 'Bodyware', ...system } });

export async function run(t) {
  /* ── Which items are rated ───────────────────────────────────────────────────── */
  t.is('a vehicle mod', ModRatings.kindOf(veh('ECCM [3]')), 'vehicle');
  t.is('cyberware built into a limb', ModRatings.kindOf(limb('Signal Booster [3]')), 'cyberlimb');
  t.is('a firearms accessory', ModRatings.kindOf(acc('Gun Cam Transmitter [2]')), 'weapon');
  t.is('ordinary cyberware is its own kind (the same name can be two: Hydraulic Jack)', ModRatings.kindOf(ware('Wired Reflexes [2]')), 'cyberware');
  t.is('ordinary gear', ModRatings.kindOf(gear('Medkit [6]')), 'gear');
  t.is('bioware', ModRatings.kindOf({ type: 'bioware', name: 'Muscle Toner [2]', system: {} }), 'bioware');
  t.is('medical', ModRatings.kindOf({ type: 'medical', name: 'Medkit', system: {} }), 'medical');
  t.is('ammunition (tracker rounds)', ModRatings.kindOf({ type: 'ammunition', name: 'Tracker AOD', system: {} }), 'ammunition');
  t.is('a vehicle weapon (the AM-56 lure launcher)', ModRatings.kindOf({ type: 'vehicleweapon', name: 'Lure Launcher AM-56', system: {} }), 'vehicleweapon');
  t.is('a firearm has no level, and that is the answer (TODO 122)', ModRatings.kindOf({ type: 'firearm', name: 'Ares Predator', system: {} }), null);
  t.ok('every kind the table can hold is a rated TYPE (a data model drops undeclared keys)',
    ['gear', 'medical', 'cyberware', 'bioware', 'vehiclemod', 'ammunition', 'vehicleweapon'].every(x => ItemRating.RATED_TYPES.includes(x)));

  /* ── Reading a level out of a name ───────────────────────────────────────────── */
  const split = n => ModRatings.splitName(n);
  t.eq('"Anti-Theft System [10]"', split('Anti-Theft System [10]'), { stem: 'Anti-Theft System', rating: 10 });
  t.eq('"STS (Beacon) Rating [3]" drops the word Rating', split('STS (Beacon) Rating [3]'), { stem: 'STS (Beacon)', rating: 3 });
  t.eq('"Chemical Seal Rating [10]" → "Chemical Seal"', split('Chemical Seal Rating [10]'), { stem: 'Chemical Seal', rating: 10 });
  t.eq('"Tracker AOD Rating [1]" → "Tracker AOD"', split('Tracker AOD Rating [1]'), { stem: 'Tracker AOD', rating: 1 });
  t.eq('"Bug Scanner Lv [3]" drops Lv', split('Bug Scanner Lv [3]'), { stem: 'Bug Scanner', rating: 3 });
  t.eq('"VAUBAN Vehicle A.T. Lvl [2]" drops Lvl', split('VAUBAN Vehicle A.T. Lvl [2]'), { stem: 'VAUBAN Vehicle A.T.', rating: 2 });
  t.eq('a glued bracket, spaces tidied', split('Rem-Contr. Intr.  Bod[3]'), { stem: 'Rem-Contr. Intr. Bod', rating: 3 });
  t.eq('the upstream stray after the bracket goes too', split('Protocol Emulation Module [10]  1'), { stem: 'Protocol Emulation Module', rating: 10 });
  t.eq('"Medkit Rating 6" (no bracket) is a level too', split('Medkit Rating 6'), { stem: 'Medkit', rating: 6 });
  t.is('a range is the GM\'s pick, not a level', split('Appropriate Utilities at Rating 4-8'), null);
  t.is('a bare trailing number is a model, not a level', split('Ares Predator 2'), null);
  t.is('a plain name has no level', split('Anti-Theft System'), null);

  /* ── The rename (packs tool and the 0.7.1 migration) ─────────────────────────── */
  t.eq('a levelled vehicle mod is renamed and its level saved', ModRatings.renameDelta(veh('ECCM [3]')), { name: 'ECCM', 'system.rating': 3 });
  t.eq('…a rating already agreeing is left as it is', ModRatings.renameDelta(limb('Signal Booster [3]', { rating: 3 })), { name: 'Signal Booster' });
  t.eq('…a GM\'s different rating wins over the stale name', ModRatings.renameDelta(veh('ECCM [3]', { rating: 5 })), { name: 'ECCM' });
  t.ok('…and that disagreement is reported (the migration logs it)', /keeping 5/.test(ModRatings.renameConflict(veh('ECCM [3]', { rating: 5 })) ?? ''));
  t.is('…an agreeing one is not', ModRatings.renameConflict(veh('ECCM [3]', { rating: 3 })), null);
  t.is('a plain name is left alone (idempotent)', ModRatings.renameDelta(veh('ECCM', { rating: 3 })), null);
  t.eq('ordinary cyberware is renamed now — "Wired Reflexes [2]"', ModRatings.renameDelta({ type: 'cyberware', name: 'Wired Reflexes [2]', system: {} }), { name: 'Wired Reflexes', 'system.rating': 2 });
  t.eq('…gear: "Chemical Seal Rating [4]"', ModRatings.renameDelta(gear('Chemical Seal Rating [4]', { rating: null })), { name: 'Chemical Seal', 'system.rating': 4 });
  t.eq('…medical keeps its string rating', ModRatings.renameDelta({ type: 'medical', name: 'Medkit Rating 6', system: { rating: '' } }), { name: 'Medkit', 'system.rating': '6' });
  t.is('an item type with no level is never renamed', ModRatings.renameDelta({ type: 'firearm', name: 'Thing [2]', system: {} }), null);

  /* ── A copy linked to a deleted level document is repointed ──────────────────── */
  const SRC = { 'sr3e-cc-gear': { dead1: 'kept1' } };
  const linked = id => ({ type: 'gear', name: 'X', system: {}, _stats: { compendiumSource: `Compendium.The2ndChumming3e.sr3e-cc-gear.Item.${id}` } });
  t.is('a link to a deleted level document goes to the document that kept the family', ModRatings.repointSource(linked('dead1'), SRC), 'Compendium.The2ndChumming3e.sr3e-cc-gear.Item.kept1');
  t.is('…the kept document itself is not touched (idempotent)', ModRatings.repointSource(linked('kept1'), SRC), null);
  t.is('…nor a link into another pack with the same id', ModRatings.repointSource({ _stats: { compendiumSource: 'Compendium.The2ndChumming3e.sr3e-sr3-gear.Item.dead1' } }, SRC), null);
  t.is('…nor a source that is not ours', ModRatings.repointSource({ _stats: { compendiumSource: 'Compendium.dnd5e.items.Item.dead1' } }, SRC), null);
  t.is('an item with no source is not touched', ModRatings.repointSource({ _stats: {} }, SRC), null);
  const [anyPack, anyIds] = Object.entries(COLLAPSED_SOURCES)[0];
  const [anyDead, anyKept] = Object.entries(anyIds)[0];
  t.is('the shipped table repoints a real deleted id', ModRatings.repointSource({ _stats: { compendiumSource: `Compendium.The2ndChumming3e.${anyPack}.Item.${anyDead}` } }),
    `Compendium.The2ndChumming3e.${anyPack}.Item.${anyKept}`);
  t.eq('migrateDelta is the rename and the repoint together',
    ModRatings.migrateDelta({ ...linked('x'), name: 'X [2]', system: { rating: null }, _stats: { compendiumSource: `Compendium.The2ndChumming3e.${anyPack}.Item.${anyDead}` } }),
    { name: 'X', 'system.rating': 2, '_stats.compendiumSource': `Compendium.The2ndChumming3e.${anyPack}.Item.${anyKept}` });
  t.is('…and is null for a copy with nothing to do', ModRatings.migrateDelta(gear('Plain', { rating: 2 })), null);
  t.ok('no deleted id is also a kept id', Object.values(COLLAPSED_SOURCES).every(m => Object.keys(m).every(id => !Object.values(m).includes(id))));

  /* ── The dropdown ────────────────────────────────────────────────────────────── */
  const ats = veh('Anti-Theft System', { rating: 7 });
  const opts = ModRatings.options(ats);
  t.eq('the dropdown offers the printed levels', opts.map(o => o.value), [3, 4, 5, 6, 7, 8, 9, 10]);
  t.is('…with the item\'s own selected', opts.find(o => o.selected)?.value, 7);
  t.eq('picking 10 brings level 10\'s numbers', ModRatings.ratingChange(ats, 10),
    { 'system.rating': 10, 'system.availability': '6/14days', 'system.cost': 50000, 'system.streetIndex': '2.00' });
  t.ok('a GM\'s houserule level stays selectable, marked', ModRatings.options(veh('Anti-Theft System', { rating: 12 })).some(o => o.value === 12 && /not in the book/.test(o.label)));
  t.eq('…and picking it changes only the rating', ModRatings.ratingChange(veh('Anti-Theft System', { rating: 3 }), 12), { 'system.rating': 12 });
  t.is('an item with no table keeps the plain box', ModRatings.options(veh('My Alarm', { rating: 3 })), null);
  t.ok('a cyberlimb mod\'s level carries its cost', ModRatings.ratingChange(limb('Armor: Ballistic'), 4)['system.cost'] === 10000);
  t.ok('a vehicle mod\'s level carries its CF', ModRatings.ratingChange(veh('ECCM'), 5)['system.cfCost'] === '6');
  t.ok('a weapon mod has levels too', ModRatings.options(acc('STS (Beacon)', { rating: 2 }))?.length === 6);
  /* Gear, implants, bioware, medical, ammunition: the same dropdown (the maintainer, 2026-10-24: all gear). */
  t.eq('gear: Chemical Seal offers 1-10', ModRatings.options(gear('Chemical Seal', { category: 'Miscellaneous Components', rating: 1 })).map(o => o.value), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  t.is('…level 4 costs 1,000¥ (250¥ x Rating)', ModRatings.ratingChange(gear('Chemical Seal', { rating: 1 }), 4)['system.cost'], 1000);
  const wr = ModRatings.ratingChange(ware('Wired Reflexes', { rating: 1 }), 3);
  t.ok('cyberware: Wired Reflexes 3 brings its Essence, cost, legality, Reaction and dice',
    wr['system.essenceCost'] === 5 && wr['system.cost'] === 500000 && wr['system.legalCode'] === '3-R' && wr['system.bonusRea'] === 6 && wr['system.bonusInitDice'] === 3);
  t.ok('medical: a Medkit level carries its cost and availability', ModRatings.ratingChange({ type: 'medical', name: 'Medkit', system: { rating: '1' } }, 4)['system.cost'] === 240);
  t.is('ammunition: a Tracker AOD level carries its price', ModRatings.ratingChange({ type: 'ammunition', name: 'Tracker AOD', system: {} }, 4)['system.cost'], 800);
  t.ok('bioware has levels too', Object.keys(MOD_RATING_TABLE).some(k => k.startsWith('bioware|')));
  t.ok('…so does a vehicle weapon', !!MOD_RATING_TABLE['vehicleweapon|Lure Launcher AM-56']);
  const bought = ModRatings.withLevel({ type: 'gear', name: 'Chemical Seal', system: { category: 'Miscellaneous Components', rating: 1, cost: 250, quantity: 1 } }, 4);
  t.ok('withLevel (🛒 Buy gear): the bought copy has the level and its price, the rest untouched',
    bought.system.rating === 4 && bought.system.cost === 1000 && bought.system.quantity === 1 && bought.name === 'Chemical Seal');
  const input = { type: 'gear', name: 'Chemical Seal', system: { rating: 1, cost: 250 } };
  ModRatings.withLevel(input, 4);
  t.is('…without touching its input', input.system.cost, 250);
  t.is('…a medical rating stays a string', ModRatings.withLevel({ type: 'medical', name: 'Medkit', system: { rating: '1' } }, 4).system.rating, '4');
  t.ok('a table row never writes a null into a field (a null breaks a text or number field on update)',
    Object.values(MOD_RATING_TABLE).every(levels => Object.values(levels).every(row => Object.values(row).every(v => v !== null && v !== undefined))));

  /* ── The family rule: the grouping, the kept document, the levels ─────────────── */
  const D = (id, name, system = {}, type = 'gear') => [`!items!${id}`, { _id: id, type, name, system: { category: 'Biotech', ...system } }];
  const fam = new Map([
    D('a', 'Widget [3]', { cost: 300, rating: 3 }), D('b', 'Widget Rating [1]', { cost: 100, rating: 1 }), D('c', 'Widget [2]', { cost: 200, rating: 2 }),
    D('d', 'Gadget [1]', { cost: 5, rating: 1 }), D('e', 'Widget', { cost: 0, rating: null }),
  ]);
  const grouped = RatedFamilies.group([...fam]);
  t.eq('a family is one kind and one plain name', [...grouped.keys()].sort(), ['gear|Gadget', 'gear|Widget']);
  t.is('…every level is a member', grouped.get('gear|Widget').length, 4);
  const out = RatedFamilies.collapseEntries(fam);
  t.is('only a group of two or more rated documents collapses', out.length, 1);
  t.is('…the LOWEST level\'s document is kept, its id unchanged', out[0].keep, 'b');
  t.eq('…every other member goes, the unrated sibling folded in', [...out[0].deleted].sort(), ['a', 'c', 'e']);
  t.eq('…the unrated one is reported as folded', out[0].folded, ['e']);
  t.eq('…and the level table holds only what differs', out[0].levels, { 1: { cost: 100 }, 2: { cost: 200 }, 3: { cost: 300 } });
  t.ok('…the kept document is named for the item, at its level', fam.get('!items!b')?.name === 'Widget' && fam.get('!items!b')?.system.rating === 1);
  t.ok('…a lone item is left for the rename (no choice to offer)', fam.has('!items!d') && fam.get('!items!d')?.name === 'Gadget [1]');
  const dup = new Map([D('p', 'Radio [4]', { cost: 1, rating: 4 }), D('q', 'Radio [4]', { cost: 2, rating: 4 }), D('r', 'Radio [1]', { cost: 0, rating: 1 }), D('s', 'Radio [4]', { cost: 1, rating: 4 })]);
  const dr = RatedFamilies.collapseEntries(dup)[0];
  t.is('a level printed twice with DIFFERENT numbers is not guessed at: it is kept as unplaced', dr.unplaced.length, 1);
  t.eq('…with its numbers and its id, for a person to check against the book', [dr.unplaced[0]?.id, dr.unplaced[0]?.row.cost], ['q', 2]);
  t.is('…an exact repeat is just dropped', dr.duplicates.length, 1);
  t.eq('…and the table keeps the first print', dr.levels[4], { cost: 1 });
  t.eq('a missing field takes its type\'s blank, never null', RatedFamilies.levels([
    { key: 1, doc: { system: { cost: 1, rating: 1, note: 'x' } }, level: 1 }, { key: 2, doc: { system: { cost: 2, rating: 2 } }, level: 2 }]).levels,
    { 1: { cost: 1, note: 'x' }, 2: { cost: 2, note: '' } });
  t.is('a medical rating stays a string on the kept document', RatedFamilies.applyKeep({ type: 'medical', name: 'Medkit [1]', system: { rating: '' } }, 1).system.rating, '1');

  /* ── The packs: no level left in a name, every family ONE document ───────────── */
  const docs = [], bracketed = [], plainRated = [], unrated = [];
  const keys = new Map();
  for (const pack of readdirSync(join(ROOT, 'packs-src'))) {
    for (const f of readdirSync(join(ROOT, 'packs-src', pack))) {
      const j = JSON.parse(readFileSync(join(ROOT, 'packs-src', pack, f), 'utf8'));
      for (const [key, d] of [[j._key, j.doc], ...Object.entries(j.embedded ?? {})]) {
        if (!d?.name || EXCLUDED_PACKS.includes(pack)) continue;
        if (/\[\d+\]\s*$/.test(d.name)) bracketed.push(`${pack}: ${d.name}`);
        if (!ModRatings.kindOf(d)) continue;
        if (ModRatings.splitName(d.name)) plainRated.push(`${pack}: ${d.name}`);
        if (d.type === 'vehiclemod' && d.system?.rating === undefined) unrated.push(`${pack}: ${d.name}`);
        if (key.startsWith('!items!')) {
          docs.push({ pack, key, d });
          const k = `${pack}|${ModRatings.keyOf(d)}`;
          (keys.get(k) ?? keys.set(k, []).get(k)).push(key);
        }
      }
    }
  }
  t.eq('RATCHET: no Item pack document (outside the contacts pack) has a name ending in [digits]', bracketed, []);
  t.eq('no shipped rated item carries its level in its name', plainRated, []);
  t.eq('every shipped vehicle mod states its rating (null = none)', unrated, []);
  const ratedTwins = [...keys].filter(([, ks]) => ks.length > 1
    && docs.filter(x => ks.includes(x.key)).filter(x => Number(x.d.system?.rating) > 0).length > 1);
  t.eq('no pack holds two rated documents of one item — every family is ONE document', ratedTwins.map(([k]) => k), []);
  t.ok(`the kinds are all there (${docs.length} rated-type documents)`, ['vehicle', 'cyberlimb', 'weapon', 'gear', 'cyberware', 'bioware', 'medical'].every(k => docs.some(x => ModRatings.kindOf(x.d) === k)));
  const sts = docs.find(x => x.d.name === 'STS (Beacon)');
  t.is('a generated item keeps the id of its LOWEST level\'s ORIGINAL name (owned copies keep their link)',
    sts?.key, `!items!${idFor(`${GENERATOR}|cc|gear|${normName('STS (Beacon) Rating [1]')}`)}`);
  t.is('…at level 1', sts?.d.system.rating, 1);
  const rdm = docs.find(x => x.key === '!items!sr3e-cyberware-0824');
  t.ok('the Rigger Decryption Module (Cyberlimb Mod) is one plain document at level 1', rdm?.d.name === 'Rigger Decryption Module' && rdm.d.system.rating === 1);
  t.ok('the maintainer\'s named renames dropped " Rating": Chemical Seal and Tracker AOD',
    docs.some(x => x.d.name === 'Chemical Seal') && docs.some(x => x.d.name === 'Tracker AOD') && !docs.some(x => /Rating$/.test(x.d.name) && ModRatings.kindOf(x.d)));
  t.ok('…and Lv: Bug Scanner', docs.some(x => x.d.name === 'Bug Scanner') && !docs.some(x => / Lv$/.test(x.d.name)));

  /* ── The table and the records are build output ──────────────────────────────── */
  const records = readCollapsed();
  t.ok('the level table matches the packs, the collapsed records and the extra levels',
    read(TABLE_FILE.slice(ROOT.length + 1)) === renderTable(tableFor(docs.map(x => x.d), records, readExtraLevels()).table, sourcesOf(records)));
  t.ok('every collapsed family\'s kept document is in its pack, plain, at its lowest level', Object.values(records).every(f => {
    const kept = docs.find(x => x.pack === f.pack && x.key === `!items!${f.keep}`);
    return kept && !ModRatings.splitName(kept.d.name) && Number(kept.d.system.rating) === Math.min(...Object.keys(f.levels).map(Number));
  }));
  t.ok('…and no deleted document is still in its pack', Object.values(records).every(f => (f.deleted ?? []).every(id => !docs.some(x => x.pack === f.pack && x.key === `!items!${id}`))));
  t.ok('…the generated families are recorded as the generator\'s, the hand-kept as the tool\'s (a regeneration cannot bring a level back)',
    Object.values(records).some(f => f.by === 'build-default-gear') && Object.values(records).some(f => f.by === 'build-mod-ratings'));
  t.ok('a record\'s kept document is never listed as deleted', Object.values(records).every(f => !(f.deleted ?? []).includes(f.keep)));
  t.ok('the unplaced rows are all recorded with their ids (nothing is lost)', Object.values(records).flatMap(f => f.unplaced ?? []).every(u => u.id && u.row && u.rating > 0));
  t.eq('…and there is exactly one: the second Radio Receiver [4] (5,000¥, 10 frequencies — level 5?) for the maintainer',
    Object.values(records).flatMap(f => f.unplaced ?? []).map(u => `${u.name}@${u.rating}`), ['Radio Receiver@4']);

  /* ── One Vehicle Armor (the maintainer, 2026-10-24) ──────────────────────────── */
  const armour = docs.filter(x => x.d.type === 'vehiclemod' && x.d.name === 'Vehicle Armor');
  t.is('the packs hold ONE Vehicle Armor', armour.length, 1);
  t.ok('…at level 1, keeping the level-1 id', armour[0]?.key === '!items!sr3e-vehiclemod-0044' && armour[0].d.system.rating === 1);
  t.eq('…and its dropdown still offers levels 1-11', ModRatings.options(veh('Vehicle Armor', { rating: 1 })).map(o => o.value), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  t.ok('…level 6 adds the Handling note', ModRatings.ratingChange(veh('Vehicle Armor'), 6)['system.description'] === 'Handling+1');
  const va = records['vehicle|Vehicle Armor'];
  t.ok('the second "[11]" was dropped (the maintainer, 2026-10-24) — no unplaced level is kept', va && !('unplaced' in va));
  t.is('…its eleven deleted documents are recorded for the repoint', va.deleted.length, 11);
  const L = MOD_RATING_TABLE['vehicle|Vehicle Armor'];
  t.is('…so the dropdown has no 12th level', Math.max(...Object.keys(L).map(Number)), 11);
  for (let n = 1; n <= 11; n++) {
    t.is(`Vehicle Armor ${n} costs 1,250¥ x ${n} (R3 p.131: 1,250¥ per Armor point)`, L[n].cost, 1250 * n);
    t.is(`Vehicle Armor ${n} takes Vehicle B/R(${Math.ceil(n / 3)}) (R3 p.131: desired Armor rating ÷ 3)`, /B\/R\((\d+)\)/.exec(L[n].installTime)?.[1], String(Math.ceil(n / 3)));
    t.is(`Vehicle Armor ${n} takes ${8 * n} hrs (R3 p.131: Armor value x 8 hrs)`, /^(\d+) hrs/.exec(L[n].installTime)?.[1], String(8 * n));
  }
  t.ok('Vehicle Armor has no level 12', L[12] === undefined);
  const CA = MOD_RATING_TABLE['vehicle|Concealed Armor'];
  for (const n of Object.keys(CA).map(Number)) t.is(`Concealed Armor ${n} consumes ${3 * n} CF (R3 p.132: 3 CF per Armor Point)`, CA[n].cfCost, String(3 * n));
  const PA = MOD_RATING_TABLE['vehicle|Power Amplifier'];
  for (let n = 1; n <= 10; n++) t.is(`Power Amplifier ${n} consumes ${Math.ceil(n / 2)} CF (R3 p.147: 0.5 CF per rating, round up)`, PA[n].cfCost, String(Math.ceil(n / 2)));
  t.is('Ablative Armor 2 is 12/14 days (R3 p.131)', MOD_RATING_TABLE['vehicle|Ablative Armor'][2].availability, '12/14days');
  const EC = MOD_RATING_TABLE['cyberlimb|Remote Control ECCM'];
  t.is('Remote Control ECCM 5 is 175,000¥ (M&M p.25: ratings 4-6 are Rating x 35,000¥)', EC[5].cost, 175000);
  t.is('Remote Control ECCM 6 is 210,000¥ (M&M p.25)', EC[6].cost, 210000);

  /* ── RC Encryption Module and Hydraulic Jack: the Bodyware twins (M&M pp.24-29) ── */
  const RC = MOD_RATING_TABLE['cyberlimb|RC Encryption Module'];
  t.eq('RC Encryption Module (Cyberlimb Mod) has levels 1-10 (M&M p.24)', Object.keys(RC).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  t.eq('…10 costs 100,000¥, 10/10 days', RC[10], { availability: '10/10 days', cost: 100000 });
  const RB = MOD_RATING_TABLE['cyberware|RC Encryption Module'];
  t.eq('the Rigger implant RC Encryption Module has levels 1-10 too — 9 and 10 are table rows, not documents (M&M p.25)', Object.keys(RB).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (let n = 1; n <= 10; n++) t.eq(`…level ${n}: Rating x 10,000¥, (Rating)/(Rating) days`, [RB[n].cost, /^(\d+)\/(\d+) day/.exec(RB[n].availability)?.slice(1).map(Number)], [n * 10000, [n, n]]);
  const rcDocs = docs.filter(x => x.d.name === 'RC Encryption Module');
  t.is('…one document per kind (Bodyware and Cyberlimb Mod)', rcDocs.length, 2);
  t.ok('…8P-W on both (M&M p.25)', rcDocs.every(x => x.d.system.legalCode === '8P-W'));
  const HJ = MOD_RATING_TABLE['cyberware|Hydraulic Jack'];
  t.eq('the Bodyware Hydraulic Jack has levels 1-5', Object.keys(HJ).map(Number), [1, 2, 3, 4, 5]);
  t.ok('…and says jump distance, never running distance (M&M p.29: "rating x 20 percent to his maximum jump distance")',
    Object.entries(HJ).every(([n, r]) => r.description.includes(`+${n * 20}% jump distance`) && !/running distance/.test(r.description)));
  t.ok('…the kept Bodyware document too', docs.filter(x => x.d.name === 'Hydraulic Jack' && x.d.type === 'cyberware').every(x => !/running distance/.test(x.d.system.description)));

  t.ok('collapse() keeps the lowest level\'s document and only that one', (() => {
    const e = new Map([['!items!a', { type: 'vehiclemod', name: 'Y', system: { rating: 2, cost: 20 } }], ['!items!b', { type: 'vehiclemod', name: 'Y', system: { rating: 1, cost: 10 } }], ['!items!c', { type: 'vehiclemod', name: 'Other', system: { rating: 1 } }]]);
    const o = collapse(e, 'p', 'vehicle|Y');
    return o.keep === 'b' && e.has('!items!b') && !e.has('!items!a') && e.has('!items!c') && JSON.stringify(o.levels) === JSON.stringify({ 1: { cost: 10 }, 2: { cost: 20 } });
  })());
  t.ok('an item printed at one level only has no dropdown', Object.values(MOD_RATING_TABLE).every(levels => Object.keys(levels).length >= 2));
  t.ok('a table row carries only printed numbers, never bookkeeping', Object.values(MOD_RATING_TABLE).every(levels =>
    Object.values(levels).every(row => !('rating' in row) && !('srcgName' in row) && !('grade' in row))));
  t.eq('two printed rows for one level are found', buildTable([veh('X', { rating: 1, cost: 1 }), veh('X', { rating: 1, cost: 2 }), veh('X', { rating: 2, cost: 3 })]).conflicts, ['vehicle|X [1]']);

  /* ── The generator collapses its own families (a regeneration must not bring a level back) ── */
  const gen = read('tools/build-default-gear.mjs');
  t.ok('the gear generator collapses families inside plan()', /RatedFamilies\.collapseEntries\(entries\)/.test(gen) && /replaceFamilies\(GENERATOR, families\)/.test(gen));
  t.ok('…after deriving every id from the ORIGINAL name', gen.indexOf('idFor(`${GENERATOR}|${key}|${variant}`)') < gen.indexOf('RatedFamilies.collapseEntries'));

  /* ── Lists show the level — on an OWNED item, never in a pack list or the search ── */
  t.ok('a vehicle mod is a rated type', ItemRating.RATED_TYPES.includes('vehiclemod'));
  t.is('…an owned one is shown with its level', displayName(veh('Anti-Theft System', { rating: 10 })), 'Anti-Theft System [10]');
  t.is('…and an unlevelled one plainly', displayName(veh('Roll Bars', { rating: null })), 'Roll Bars');
  const models = read('scripts/data/ItemDataModels.js');
  t.ok('VehicleModData declares the rating (a data model drops undeclared keys)', /class VehicleModData[\s\S]{0,400}rating:\s+new NumberField\(\{ integer: true, nullable: true/.test(models));
  t.ok('AmmunitionData declares the rating (tracker rounds)', /class AmmunitionData[\s\S]{0,900}rating:\s+new NumberField\(\{ integer: true, nullable: true/.test(models));
  t.ok('VehicleWeaponData declares the rating (the AM-56 lure launcher)', /class VehicleWeaponData[\s\S]{0,500}rating:\s+new NumberField\(\{ integer: true, nullable: true/.test(models));
  const main = read('scripts/sr3e.js');
  t.ok('the compendium index carries the rating', /compendiumIndexFields\.push\('system\.rating'\)/.test(main));
  t.ok('NO compendium window appends "[N]" (the maintainer, 2026-10-24: the shown level must follow the selected level or go away)',
    !/Hooks\.on\('renderCompendium'/.test(main) && !/ItemRating\.displayName\(entry\)/.test(main));
  t.ok('the vehicle sheet lists mods with their level', /displayName\(m\)/.test(read('scripts/sheets/SR3EVehicleSheet.js')));
  const search = read('scripts/data/gear-search.mjs');
  t.ok('the 🛒 search shows the plain name — no displayName, no "[N]"', !/displayName\(/.test(search) && /name: row\?\.name \?\? ''/.test(search));
  const row = GearSearch.fromIndex({ _id: 'x', name: 'Chemical Seal', type: 'gear', system: { category: 'Miscellaneous Components', rating: 1, cost: 250, availability: '1/1wk' } }, { collection: 'p' });
  t.is('…a collapsed document is listed by its plain name', row.name, 'Chemical Seal');
  t.eq('…the dialog offers the table\'s levels 1-10, starting at the lowest', [Object.keys(row.levels).map(Number), GearSearch.startLevel(row)], [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1]);
  t.is('…picking level 4 brings its price', GearSearch.atLevel(row, 4).cost, 1000);
  t.is('…and the level asked for is the level reported', GearSearch.atLevel(row, 4).level, 4);
  t.is('an unrated row has no level picker', GearSearch.fromIndex({ _id: 'y', name: 'Ares Predator', type: 'firearm', system: {} }, { collection: 'p' }).levels, null);
  const buy = read('scripts/SR3EPurchase.js');
  t.ok('🛒 Buy gear asks for the level and the bought copy gets it', /id="sr-buy-level"/.test(buy) && /ModRatings\.withLevel\(data, payload\.level\)/.test(buy) && /level: el\.querySelector\('#sr-buy-level-row'\)/.test(buy));
  t.ok('…a dropped item is the plain name too', !/displayName/.test(buy) && /name: dropped\.name/.test(buy));

  /* ── The item sheet ──────────────────────────────────────────────────────────── */
  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('a vehicle mod has a sheet of its own', /case 'vehiclemod':[\s\S]{0,200}_modRatingField\(s\)/.test(sheet));
  t.ok('cyberware, bioware, gear and vehicle mods offer the level dropdown', (sheet.match(/\$\{this\._modRatingField\(s\)\}/g) ?? []).length === 3);
  t.ok('medical, ammunition and vehicle weapons offer it through _levelField', (sheet.match(/\$\{this\._levelField\(s/g) ?? []).length === 3);
  t.ok('a vehicle weapon has a sheet at last', /case 'vehicleweapon':/.test(sheet));
  t.ok('an item with no table keeps the Rating box', /_modRatingField\(s\) \{\s*const opts = ModRatings\.options\(this\.document\);\s*if \(!opts\) return this\._ratingField\(s\);/.test(sheet));
  t.ok('the dropdown is wired', /\.mod-rating-select'\)\s*\?\.addEventListener\('change', ev => SR3EItemSheet\._onModRatingChange/.test(sheet));
  t.ok('…and has no name, so the form never saves a level without its numbers', /<select class="mod-rating-select"(?![^>]*name=)/.test(sheet));
  t.ok('graded cyberware AND bioware re-apply their grade to the new level', /_onModRatingChange[\s\S]{0,900}'cyberware' \|\| this\.item\.type === 'bioware'[\s\S]{0,700}_onGradeChange\.call/.test(sheet));

  /* ── The migration ───────────────────────────────────────────────────────────── */
  const mig = read('scripts/SR3EMigrations.js');
  t.ok('a 0.7.1 migration renames owned copies and repoints dead links', /version: '0\.7\.1',\s*label: 'Every rated item[\s\S]{0,2600}ModRatings\.migrateDelta\(item\)/.test(mig));
  t.ok('…and logs a rating that disagrees with the name', /ModRatings\.renameConflict\(item\)/.test(mig));
}
