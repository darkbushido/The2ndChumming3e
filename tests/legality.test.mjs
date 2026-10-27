/**
 * Legality and buying at the store · SR3 p.273 (reported 2026-10-25).
 *
 * "buy gear wont let you get things that are legal without using a contact. seems strange" — and the maintainer:
 * "buying legal gear should have the option of using a contact for a discount but it shouldnt force it", with the
 * legality filled from the PDFs. The book: "you can get items for the price listed … For legal items, this isn't a
 * problem — characters can probably pick them up at the corner Stuffer Shack" (p.273).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Legality, LEGALITY_TYPES } from '../scripts/data/legality.mjs';
import { LEGALITY } from '../scripts/data/legality-table.mjs';
import { Purchasing } from '../scripts/data/purchasing.mjs';
import { GearSearch, INDEX_FIELDS } from '../scripts/data/gear-search.mjs';
import { readSourceDir } from '../tools/lib/pack-source.mjs';

export const name = 'legality';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');

export async function run(t) {
  /* ── What a code means · p.273 ──────────────────────────────────────────────── */
  const st = c => Legality.classify(c).status;
  t.is('"Legal" is legal', st('Legal'), 'legal');
  t.is('…in any case, with spaces', st(' legal '), 'legal');
  t.eq('"6P-E" (the Ares Predator) is restricted, with a permit', (k => [k.status, k.permit])(Legality.classify('6P-E')), ['restricted', true]);
  t.eq('"5-B" (the katana) is restricted, no permit', (k => [k.status, k.permit])(Legality.classify('5-B')), ['restricted', false]);
  t.eq('an en dash reads the same ("2–K")', (k => [k.status, k.code])(Legality.classify('2–K')), ['restricted', '2-K']);
  t.is('"(8-Force)P-T" (a focus) is restricted', st('(8-Force)P-T'), 'restricted');
  t.eq('"As Weapon" defers to the gun', (k => [k.status, k.defersTo])(Legality.classify('As Weapon')), ['deferred', 'Weapon']);
  t.is('blank is unknown', st(''), 'unknown');
  t.is('…and so is anything else', st('ask the GM'), 'unknown');

  t.ok('the dialog opens on "at the store" for a Legal item', Legality.storeByDefault('Legal'));
  t.ok('…not for a restricted one', !Legality.storeByDefault('6P-E'));
  t.ok('…nor for one with no legality recorded', !Legality.storeByDefault(''));
  t.ok('the note for a restricted item says a permit is needed — and that the GM decides (warn, never refuse)',
    /permit/.test(Legality.note('6P-E')) && /GM decides/.test(Legality.note('6P-E')));
  t.ok('…and cites the page', Legality.note('Legal').includes('SR3 p.273'));

  t.is('the code is read from legality', Legality.of({ system: { legality: 'Legal' } }), 'Legal');
  t.is('…or a cyberware\'s legalCode', Legality.of({ system: { legalCode: '5P-Q' } }), '5P-Q');
  t.is('…or a Defragged deck\'s legalityCode', Legality.of({ system: { legalityCode: '4P-S' } }), '4P-S');

  /* ── The store's price · p.273: the list price, no Street Index ──────────────── */
  t.is('the monofilament whip at the store is its list 3,000¥ (Street Index 3 is the street\'s)', Purchasing.storePrice(3000).total, 3000);
  t.is('…a troll still pays 25% for troll-sized gear (p.272)', Purchasing.storePrice(3000, { metatype: 'Troll' }).total, 3750);
  t.is('…while a contact asks cost × Street Index', Purchasing.askingPrice(3000, 3).total, 9000);

  /* ── The table: read from the books, every entry real ─────────────────────────── */
  const packs = Object.keys(LEGALITY);
  let n = 0;
  const bad = [], unclassified = [], noPage = [], notFilled = [];
  for (const pack of packs) {
    const dir = join(ROOT, 'packs-src', pack);
    if (!existsSync(dir)) { bad.push(`${pack} (no such pack)`); continue; }
    const entries = readSourceDir(dir);
    for (const [id, [code, page]] of Object.entries(LEGALITY[pack])) {
      n++;
      const doc = entries.get(`!items!${id}`);
      if (!doc) { bad.push(`${pack}/${id}`); continue; }
      if (Legality.classify(code).status === 'unknown') unclassified.push(`${doc.name}: ${code}`);
      if (!/^[a-z0-9-]+\.\d+$/.test(page)) noPage.push(`${doc.name}: ${page}`);
      if (LEGALITY_TYPES.includes(doc.type) && doc.system?.legality !== code) notFilled.push(`${pack} ${doc.name}: ${doc.system?.legality} ≠ ${code}`);
    }
  }
  t.ok(`the table holds ${n} codes read from the books`, n > 1000);
  t.eq('every entry names a document that is in its pack', bad.slice(0, 5), []);
  t.eq('every code is one the dialog understands', unclassified.slice(0, 5), []);
  t.eq('every code cites its book and printed page', noPage.slice(0, 5), []);
  t.eq('…and every one is in its pack document (tools/fill-legality.mjs, tools/build-default-gear.mjs)', notFilled.slice(0, 5), []);

  // Spot checks against the printed rows (SR3 pp.274-281).
  const code = (pack, id) => LEGALITY[pack]?.[id]?.[0];
  t.is('Ares Predator 6P-E (SR3 p.276)', code('sr3e-sr3-firearms', 'sr3e-firearm-0072'), '6P-E');
  t.is('Fichetti Security 500 8P-E (SR3 p.276)', code('sr3e-sr3-firearms', 'sr3e-firearm-0032'), '8P-E');
  t.is('Katana 5-B (SR3 p.273)', code('sr3e-sr3-melee', 'sr3e-melee-0019'), '5-B');
  t.is('Armor Jacket Legal (SR3 p.284)', code('sr3e-sr3-armor', 'sr3e-armor-0015'), 'Legal');
  t.is('an APDS clip 3-M (SR3 p.281)', code('sr3e-sr3-ammunition', 'f388c161620d1c5f'), '3-M');
  t.is('…a Regular clip "As Weapon" (p.281)', code('sr3e-sr3-ammunition', '962e9d7f0b8167ff'), 'As Weapon');
  // The maintainer's ruling (2026-10-27): a table with NO Legality column prints no restriction, so its items are Legal.
  t.is('a table with no Legality column is Legal — the Pocket Computer (p.287)', code('sr3e-sr3-gear', '2c91795bb158adc3'), 'Legal');

  /* ── The models, the search and the migration ────────────────────────────────── */
  const models = read('scripts/data/ItemDataModels.js');
  const declared = ['GearData', 'FirearmData', 'MeleeData', 'ProjectileData', 'ThrownData', 'AmmunitionData', 'ArmorData',
    'BiowareData', 'VehicleModData', 'MedicalData'].filter(m => {
    const at = models.indexOf(`export class ${m} `);
    return /legality:\s+new StringField/.test(models.slice(at, models.indexOf('\nexport class', at + 10)));
  });
  t.is('ten item models declare system.legality', declared.length, 10);
  t.ok('the 🛒 search index reads the three legality fields', ['system.legality', 'system.legalCode', 'system.legalityCode'].every(f => INDEX_FIELDS.includes(f)));
  t.is('…and a search entry carries the code', GearSearch.fromIndex({ name: 'Katana', type: 'melee', system: { legality: '5-B' } }, null).legality, '5-B');
  t.is('…which a level row can override (a cyberware family\'s legalCode)',
    GearSearch.atLevel({ name: 'X', legality: 'Legal', levels: { 2: { cost: 5, legalCode: '6P-Q' } } }, 2).legality, '6P-Q');

  t.eq('an owned copy gets its compendium document\'s code, while blank (migration 0.9.0)',
    Legality.fillDelta({ type: 'firearm', system: { legality: '' }, _stats: { compendiumSource: 'Compendium.The2ndChumming3e.sr3e-sr3-firearms.Item.sr3e-firearm-0072' } }),
    { 'system.legality': '6P-E' });
  t.is('…never over a code someone typed', Legality.fillDelta({ type: 'firearm', system: { legality: 'Legal' },
    _stats: { compendiumSource: 'Compendium.The2ndChumming3e.sr3e-sr3-firearms.Item.sr3e-firearm-0072' } }), null);
  t.is('…nor on cyberware (its own legalCode)', Legality.fillDelta({ type: 'cyberware', system: {},
    _stats: { compendiumSource: 'Compendium.The2ndChumming3e.sr3e-sr3-firearms.Item.sr3e-firearm-0072' } }), null);
  t.ok('the 0.9.0 migration fills it, from the repointed link', /version: '0\.9\.0'[\s\S]{0,3500}Legality\.fillDelta\(linked\)/.test(read('scripts/SR3EMigrations.js')));

  /* ── No usable compendiumSource: the name fallback (2026-10-26) ─────────────── */
  // Reported by the live check: the hand-kept packs' ids ("sr3e-firearm-0072") are not valid document ids, so a dropped gun carries a null source.
  const bare = (type, name, legality = '') => ({ type, name, system: { legality }, _stats: { compendiumSource: null } });
  t.eq('a copy with a null source is read by type + exact name', Legality.fillDelta(bare('firearm', 'Ares Predator')), { 'system.legality': '6P-E' });
  t.is('…the type must match', Legality.fillDelta(bare('melee', 'Ares Predator')), null);
  t.is('…the name must match exactly', Legality.fillDelta(bare('firearm', 'ares predator')), null);
  t.is('…never over a code someone typed', Legality.fillDelta(bare('firearm', 'Ares Predator', 'Legal')), null);
  t.is('…a name no document has stays blank', Legality.fillDelta(bare('firearm', 'Homebrew Popgun')), null);
  t.eq('…a source whose document has gone (moved pack) falls back to the name',
    Legality.fillDelta({ ...bare('firearm', 'Ares Predator'), _stats: { compendiumSource: 'Compendium.The2ndChumming3e.sr3e-sr3-firearms.Item.nosuchdoc' } }), { 'system.legality': '6P-E' });
  t.eq('…and a source with a code decides alone',
    Legality.fillDelta({ ...bare('firearm', 'Homebrew Popgun'), _stats: { compendiumSource: 'Compendium.The2ndChumming3e.sr3e-sr3-firearms.Item.sr3e-firearm-0072' } }), { 'system.legality': '6P-E' });
  t.eq('…and a foreign source (another module) still falls back to the name',
    Legality.fillDelta({ ...bare('firearm', 'Ares Predator'), _stats: { compendiumSource: 'Compendium.other.pack.Item.abcdefghijklmnop' } }), { 'system.legality': '6P-E' });
  t.is('…cyberware is never filled by name', Legality.fillDelta(bare('cyberware', 'Ares Predator')), null);
  t.eq('an injected table decides: two documents with different codes are not in the real one',
    Legality.fillDelta(bare('gear', 'X'), {}, { 'gear|X': '4-A' }), { 'system.legality': '4-A' });
  {
    const { LEGALITY_BY_NAME } = await import('../scripts/data/legality-names.mjs');
    const { nameTable } = await import('../tools/lib/legality-fill.mjs');
    const doc = (name, type = 'gear') => ({ name, type });
    const docs = { p: new Map([['!items!a', doc('Same')], ['!items!b', doc('Same')], ['!items!c', doc('Twin')], ['!items!d', doc('Twin')]]) };
    t.eq('a name two documents give DIFFERENT codes is left out; the same code twice is kept',
      nameTable(docs, { p: { a: ['1-A'], b: ['1-A'], c: ['2-B'], d: ['3-C'] } }), { 'gear|Same': '1-A' });
    t.ok('the real name table is built (hundreds of entries)', Object.keys(LEGALITY_BY_NAME).length > 500);
    const { render } = await import('../tools/build-legality-names.mjs');
    t.ok('scripts/data/legality-names.mjs is current (node tools/build-legality-names.mjs)', render() === read('scripts/data/legality-names.mjs'));
  }
  /* ── The audit against the books (2026-10-27): every code below was read from the printed table ───────────────── */
  const by = (type, name) => Legality.fillDelta(bare(type, name))?.['system.legality'] ?? null;
  t.is('Broadcast Encryption prints 8P-V, 8P-W from Rating 8 (SR3 p.290)', by('gear', 'Broadcast Encryption'), '8P-V (8P-W at Rating 8+)');
  t.is('…and a banded code still classifies as restricted with a permit', Legality.classify(by('gear', 'Broadcast Encryption')).permit, true);
  t.is('Binoculars sit in a table with no Legality column: Legal (SR3 p.289)', by('gear', 'Binoculars'), 'Legal');
  t.is('Fugu-5, a toxin, is 3-X (M&M p.158)', by('drug', 'Fugu 5'), '3-X');
  t.is('Arsenic is Legal (M&M p.158)', by('drug', 'Arsenic'), 'Legal');
  t.is('Green Ring 3 is 2-K (M&M p.158)', by('drug', 'Green Ring 3'), '2-K');
  t.is('the FAB Strain-I 500 m3 aerosol is 8P-U (MitS p.170)', by('gear', 'FAB Strain-I 500 m3 aerosol'), '8P-U');
  t.is('Matrix, Miscellaneous Component Table (p.169): a Passkey Reader (Blank) is 9P-V', by('gear', 'Passkey Reader (Blank)'), '9P-V');
  t.is('…and a Trode Jack is Legal', by('gear', 'Trode Jack'), 'Legal');
  // Rulings, 2026-10-27: the weapon carries the code, not what it is attached to or modified with.
  t.is('a Rigger 3 ring mount is Legal: the weapon on it carries the code', by('vehiclemod', 'Ring Mount (Vehicle)'), 'Legal');
  t.is('…and a turret', by('vehiclemod', 'Large Turret (Vehicle)'), 'Legal');
  t.is('…and vehicle armor', by('vehiclemod', 'Vehicle Armor (Vehicle)'), 'Legal');
  t.is('…a firearm conversion kit is Legal (the weapon carries the code)', by('vehiclemod', 'Pistol Customization Kit (Vehicle)'), 'Legal');
  t.is('…a gunnery smartlink takes the weapon-mod code, SmartLink 4P-N (SR3 p.282)', by('vehiclemod', 'Smartlink-II (Vehicle)'), '4P-N');
  t.is('…and a gunnery recoil adjuster the recoil compensators code, Legal', by('vehiclemod', 'Gunnery Recoil Adjuster (Vehicle)'), 'Legal');
  t.is('CC ammunition with no code of its own is "As Weapon", the book convention (SR3 p.281)', by('ammunition', 'Blowgun Needles (20)'), 'As Weapon');
  t.is('the combat axe Thrusting Point is Legal (a spike, printed NA — maintainer ruling)', by('melee', 'Combat Axe Thrusting Point'), 'Legal');
  t.is('a Pipe is a club: 6-C (SR3 p.275)', by('melee', 'Pipe'), '6-C');
  t.is('a Virtual Instructor chip prints "Legal/3-Y" (SR3 p.296): Legal for an ordinary skill, 3-Y for a restricted one', by('gear', 'Virt Instr Gen.'), 'Legal (3-Y for illegal or restricted skills)');
  t.is('…which opens on the store, as a Legal item does', Legality.storeByDefault(by('gear', 'Virt Instr Spec')), true);
  t.is('Rigger Adaptation is vehicle control gear: Legal', by('vehiclemod', 'Rigger Adaptation (Vehicle)'), 'Legal');
  const packNames = pack => [...readSourceDir(join(ROOT, 'packs-src', pack)).values()].map(d => d.name ?? '');
  t.ok('pruned, not in any book of the library: the Benelli shotguns', !packNames('sr3e-cc-firearms').some(n => /^Benelli/.test(n)));
  t.ok('…and the Shades, Insulated Gloves, Autotanner and Fuchi RealSense Kosmos', !packNames('sr3e-sr3-gear').some(n => /^(Shades|Insulated Gloves|Autotanner|Fuchi RealSense Kosmos)/.test(n)));
  t.ok('…and the empty Witch row (Witch Moss is in the drugs pack)', !packNames('sr3e-mm-medical').includes('Witch'));

  t.is('a Cannon Companion weapon mod changes nothing in print: Legal', by('gear', 'Remove Safety (Weapon)'), 'Legal');
  t.is('a toxin dart takes its chemical code: Fugu-8 3-X', by('ammunition', 'Dart, Fugu 8'), '3-X');
  t.is('…Cyanide 4P-X (M&M p.158)', by('ammunition', 'Dart, Cyanide'), '4P-X');
  t.is('…a Narcoject dart is Legal', by('ammunition', 'Dart, Narcoject'), 'Legal');
  t.is('HOUSE RULING: a magical reagent needs a low-difficulty permit, 8P-X (M&M p.158 prints no column)', by('drug', 'Deepweed'), '8P-X');
  t.is('Man & Machine medical facilities are Legal', by('medical', 'Beta Hospital'), 'Legal');
  t.is('…a Benelli (not in any book of the library)', by('firearm', 'Benelli M1014'), null);
  t.ok('the migration hands the fill the renamed item', /Legality\.fillDelta\(linked\)/.test(read('scripts/SR3EMigrations.js')) && /name: delta\.name \?\? item\.name/.test(read('scripts/SR3EMigrations.js')));

  /* ── The dialog and the card (source-level: they need Foundry) ───────────────── */
  const flow = read('scripts/SR3EPurchase.js');
  t.ok('the dialog offers both: at the store, and through a contact', /name="sr-buy-how" value="store"/.test(flow) && /name="sr-buy-how" value="contact"/.test(flow));
  t.ok('…opening on the store for a Legal (or "Always") item', /storeMode = Legality\.storeByDefault\(startLegal\) \|\| avail\.always/.test(flow));
  t.ok('…and the legality is an editable field', /id="sr-buy-legality"/.test(flow));
  t.ok('a store purchase goes to its card BEFORE any Etiquette roll',
    flow.indexOf("if (result.how === 'store') return SR3EPurchase.atStore(actor, result);") > 0
    && flow.indexOf("if (result.how === 'store')") < flow.indexOf("rollThen(actor, result.dice"));
  const store = flow.slice(flow.indexOf('async atStore('), flow.indexOf('/** The Etiquette Test has resolved'));
  t.ok('the store card prices at the list price (storePrice), not cost × Street Index', /Purchasing\.storePrice\(result\.cost/.test(store) && !/askingPrice/.test(store));
  t.ok('…and pays through the same 💴 button (one record of the click, nothing written until it)', /class="sr-buy-pay-btn"/.test(store) && !/actor\.update/.test(store));
  t.ok('…saying a restricted item is the GM\'s call, never refusing it', /Legality\.note\(result\.legality\)/.test(store));
  t.ok('the item sheets show the Legality field', /_legalityField\(s\) \{/.test(read('scripts/sheets/SR3EItemSheet.js')));

  const tools = readdirSync(join(ROOT, 'tools'));
  t.ok('tools/fill-legality.mjs fills the hand-kept packs', tools.includes('fill-legality.mjs'));
  t.ok('…and the generator fills its own (a regeneration keeps them)', /fillLegality\(pack, d\)/.test(read('tools/build-default-gear.mjs')));
}
