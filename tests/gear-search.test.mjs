/**
 * 🛒 Buy gear: search the compendium, or drag an item in · TODO 154.
 * The matching is pure; the wiring (both paths through the source-book filter) is source-level.
 */
import { readFileSync } from 'node:fs';
import { GearSearch } from '../scripts/data/gear-search.mjs';
import { Purchasing } from '../scripts/data/purchasing.mjs';

export const name = 'gear-search';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const G = GearSearch;
  const e = (nm, type = 'gear', o = {}) => ({ name: nm, type, uuid: `Compendium.x.Item.${nm}`, ...o });
  const BUY = ['gear', 'firearm', 'armor', 'medical'];

  /* ── Matching ──────────────────────────────────────────────────────────────── */
  t.eq('a query is split into lowercase words', G.tokens('  Ares  PREDATOR '), ['ares', 'predator']);
  t.eq('accents are folded', G.tokens('Café'), ['cafe']);
  t.eq('a blank query has no words', G.tokens('   '), []);
  t.ok('a blank query matches nothing (not "everything")', !G.matches(e('Ares Predator'), '') && !G.matches(e('Ares Predator'), '  '));
  t.ok('every word must be in the name, in any order', G.matches(e('Ares Predator II'), 'predator ares'));
  t.ok('…and a word that is not there fails it', !G.matches(e('Ares Predator II'), 'ares viper'));
  t.ok('case does not matter', G.matches(e('Flak Jacket'), 'FLAK'));
  t.ok('part of a word matches', G.matches(e('Medkit'), 'med'));

  /* ── Ranking and the type filter ───────────────────────────────────────────── */
  const pool = [e('Armor Jacket', 'armor'), e('Jacket', 'armor'), e('Flak Jacket', 'armor'), e('Jackets of Doom', 'armor'),
    e('Jacket Spell', 'spell'), e('Trench Jacket Liner', 'gear')];
  t.eq('the whole name, then names that start with it, then a word that starts with it, then the rest',
    G.search(pool, 'jacket', { types: BUY }).map(x => x.name),
    ['Jacket', 'Jackets of Doom', 'Armor Jacket', 'Flak Jacket', 'Trench Jacket Liner']);
  t.ok('an item that is not buyable (a spell) is left out', !G.search(pool, 'jacket', { types: BUY }).some(x => x.type === 'spell'));
  t.eq('no type filter lists every type', G.search(pool, 'jacket').length, 6);
  t.is('the hit list is capped', G.search(Array.from({ length: 100 }, (_, i) => e(`Knife ${i}`)), 'knife').length, G.MAX_HITS);
  t.is('…or by the caller\'s limit', G.search(pool, 'jacket', { limit: 2 }).length, 2);
  t.eq('nothing matching is an empty list', G.search(pool, 'zzz'), []);

  /* ── An index row becomes an entry, and an entry fills the dialog ──────────── */
  const pack = { collection: 'The2ndChumming3e.sr3e-sr3-gear', metadata: { label: 'SR3 Gear' } };
  const row = { _id: 'abc', name: 'Medkit', type: 'medical', system: { availability: '8/4 days', cost: 500, streetIndex: 1.5, bookPage: 'sr3.304' } };
  const entry = G.fromIndex(row, pack);
  t.is('the uuid is built from the pack when the index row has none', entry.uuid, 'Compendium.The2ndChumming3e.sr3e-sr3-gear.Item.abc');
  t.is('a row that carries its own uuid keeps it', G.fromIndex({ ...row, uuid: 'Compendium.q.Item.z' }, pack).uuid, 'Compendium.q.Item.z');
  t.ok('the index fields are carried', entry.availability === '8/4 days' && entry.cost === 500 && entry.streetIndex === 1.5 && entry.bookPage === 'sr3.304');
  t.ok('the index is asked for exactly the fields the entry reads',
    ['system.availability', 'system.cost', 'system.streetIndex', 'system.bookPage'].every(f => G.INDEX_FIELDS.includes(f)));
  const f = G.fields(entry);
  t.ok('Availability 8/4 days → TN 8, 4 days', f.tn === 8 && f.time === 4 && f.unit === 'day');
  t.ok('cost, Street Index, type and uuid come across', f.cost === 500 && f.index === 1.5 && f.type === 'medical' && f.uuid === entry.uuid);
  const always = G.fields({ name: 'Rope', availability: 'Always', cost: 10 });
  t.ok('"Always" is flagged so the dialog says no test is needed', always.always && !always.unknown);
  const blank = G.fields({ name: 'Mystery' });
  t.ok('no Availability code is flagged unknown and falls back to TN 4, 1 day', blank.unknown && blank.tn === 4 && blank.time === 1 && blank.unit === 'day');
  const itemDoc = G.fields({ name: 'Sword', type: 'melee', uuid: 'Item.1', system: { availability: '4/48 hrs', cost: 200, streetIndex: 2 } });
  t.ok('an item document (system.* fields) fills it the same way', itemDoc.tn === 4 && itemDoc.time === 48 && itemDoc.unit === 'hour' && itemDoc.cost === 200 && itemDoc.index === 2);

  /* ── A drop ────────────────────────────────────────────────────────────────── */
  t.ok('an Item drop with a uuid is taken', G.parseDrop({ type: 'Item', uuid: 'Compendium.a.Item.b' }).ok);
  t.ok('an Actor drop is not', !G.parseDrop({ type: 'Actor', uuid: 'Actor.1' }).ok);
  t.ok('a drop with no uuid is not, and says why', !G.parseDrop({ type: 'Item' }).ok && !!G.parseDrop({ type: 'Item' }).why);
  t.ok('nothing dropped is not', !G.parseDrop(null).ok && !G.parseDrop(undefined).ok);
  // Ruled 2026-10-17: a switched-off book or a non-buyable type WARNS and still fills; only a non-Item drop fills nothing.
  t.eq('an ordinary buyable drop warns about nothing', G.dropWarnings({ name: 'Medkit', type: 'medical', packAllowed: true }, BUY), []);
  const offBook = G.dropWarnings({ name: 'Medkit', type: 'medical', packAllowed: false }, BUY);
  t.ok('a drop from a switched-off book warns, naming why, and says it is filled anyway', offBook.length === 1 && /switched off/.test(offBook[0]) && /anyway/.test(offBook[0]));
  const spell = G.dropWarnings({ name: 'Manabolt', type: 'spell', packAllowed: true }, BUY);
  t.ok('a non-buyable type warns, naming the type', spell.length === 1 && /spell/.test(spell[0]) && /anyway/.test(spell[0]));
  t.is('both concerns are both reported', G.dropWarnings({ name: 'X', type: 'spell', packAllowed: false }, BUY).length, 2);
  t.ok('a type is buyable only if the list has it', G.isBuyable('firearm', BUY) && !G.isBuyable('spell', BUY) && !G.isBuyable('gear', undefined));

  /* ── Wiring: both paths respect the source-book filter ─────────────────────── */
  const src = read('scripts/SR3EPurchase.js');
  const between = (a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)));
  const packs = between('gearPacks()', 'async loadGearIndex');
  const idxFn = between('async loadGearIndex', 'async resolveDrop');
  const drop  = between('async resolveDrop', 'contacts(actor)');
  t.ok('the search reads packs only through gearPacks(), which asks packAllowed', /SR3EPurchase\.gearPacks\(\)/.test(idxFn) && /SR3ESourceBooks\?\.packAllowed\(p\)/.test(packs));
  t.ok('a drop is checked against packAllowed for the pack it came from', /game\.packs\.get\(dropped\.pack\)/.test(drop) && /SR3ESourceBooks\?\.packAllowed\(pack\)/.test(drop));
  t.ok('a drop FILLS even when warned: resolveDrop returns the fields after the warnings, with no early return for book or type',
    drop.includes('dropWarnings(')
    && drop.indexOf('dropWarnings(') < drop.indexOf('const entry = { ...GearSearch.fields(dropped)')
    && (drop.match(/return null/g) ?? []).length === 2);
  t.ok('the search uses pack indexes, not full documents', /pack\.getIndex\(\{ fields: GearSearch\.INDEX_FIELDS \}\)/.test(idxFn) && !/getDocuments?\(/.test(idxFn));
  t.ok('only Item packs holding a buyable type are searched', /documentName !== 'Item'/.test(packs) && /itemTypes/.test(packs) && /BUYABLE\.includes/.test(packs));
  const keydown = src.slice(src.indexOf("search?.addEventListener('keydown'"), src.indexOf("hitsEl?.addEventListener('click'"));
  t.ok('Enter in the search box is prevented, so it does not press Find a source', /ev\.key !== 'Enter'/.test(keydown) && /ev\.preventDefault\(\)/.test(keydown));
  t.ok('the dialog accepts a drop (dragover prevented, drop wired on the dialog element)',
    /el\.addEventListener\('dragover', ev => ev\.preventDefault\(\)\)/.test(src) && /el\.addEventListener\('drop'/.test(src) && /resolveDrop\(/.test(src));
  t.ok('both paths fill the fields through one take()', (src.match(/take\(/g) ?? []).length >= 3);
  t.ok('the chosen item\'s uuid wins over the row\'s when the buyer pays', /itemUuid: picked\?\.uuid \|\| item\?\.uuid \|\| ''/.test(src));
  t.ok('the dialog is wired through wait()\'s render option, never the global hook', /render: \(_event, dialog\) =>/.test(src) && !/renderDialogV2/.test(src));
  /* ── A level change keeps the Street Index (TODO 260, seen live on STS (Beacon)) ─────────────── */
  const sts = G.fromIndex({ _id: 's', name: 'STS (Beacon)', type: 'gear', system: { rating: 1, cost: 200, availability: '4/48hrs', streetIndex: '2' } }, { collection: 'p' });
  const shaped = { ...G.atLevel(sts, 1), levels: { 1: {}, 2: {}, 4: { cost: 800, availability: '4/48hrs' } }, rating: 1 };   // what showLevels(f) stores
  t.is('the fields() result names its Street Index "index"', shaped.index, 2);
  t.is('a fields()-shaped entry keeps Street Index 2 when the level row prints none', G.atLevel(shaped, 4).index, 2);
  t.is('…across every level', [1, 2, 4].map(l => G.atLevel(shaped, l).index).join(','), '2,2,2');
  t.is('…and keeps its availability (TN, time, unit) rather than falling to 4/1 day', [G.atLevel(shaped, 2).tn, G.atLevel(shaped, 2).time, G.atLevel(shaped, 2).unit].join('|'), '4|48|hour');
  t.is('…and a level row that prints its availability still wins', G.atLevel({ ...shaped, levels: { 3: { availability: '8/3days' } } }, 3).tn, 8);
  t.is('a level row that prints its own Street Index wins over the entry own', G.atLevel({ ...shaped, levels: { 3: { streetIndex: 3 } } }, 3).index, 3);
  t.is('an entry with no Street Index at all is 1', G.atLevel({ name: 'x', levels: { 1: {} } }, 1).index, 1);
  t.is('the asking price uses the kept Street Index (800 x 2)', Purchasing.askingPrice(G.atLevel({ ...shaped, levels: { 4: { cost: 800 } } }, 4).cost, G.atLevel({ ...shaped, levels: { 4: { cost: 800 } } }, 4).index).total, 1600);
}
