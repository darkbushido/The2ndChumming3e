/**
 * The default-on books' gear, ammunition, medical, drugs and armour — `tools/build-default-gear.mjs`
 * (TODO 91/92). Asked for 2026-09-14: *"make sure everything in the default books are included."*
 *
 * The packs are GENERATED from the vendored generator data (`rawdata/SRCG-*-Gear.json`), so the
 * sweep at the bottom rebuilds the plan and compares it with what ships, document by document:
 * a hand edit to a generated item, or a change to the builder that was not re-run, fails here.
 */
import { readFileSync } from 'node:fs';
import {
  cleanName, bookOf, cellNumber, ammoTypeFromWords, variantsOf, mergeListings, docFor, plan, declarePacks,
  EDITION_BOOKS, CATEGORY_TYPE, GENERATOR, idFor,
} from '../tools/build-default-gear.mjs';

export const name = 'default-gear';

export async function run(t) {
  /* ── Reading the generator's cells ────────────────────────────────────────────────── */
  t.is('the "specify" marker comes off a name', cleanName('Custom Finish->'), 'Custom Finish');
  t.is('…and the credstick marker', cleanName('Cert. Credstick[1]>>'), 'Cert. Credstick[1]');
  t.is('an upstream slip is corrected to the book\'s spelling (CC: "Grapple Gun")', cleanName('Grappel Gun'), 'Grapple Gun');
  t.is('…and M&M\'s "Hospital"', cleanName('Alpha Hosptial Rating 3'), 'Alpha Hospital Rating 3');
  t.is('the first book of a shared page', bookOf('sr2.281,fof.51'), 'sr2');
  t.is('"sta2" is the registry\'s sota2', bookOf('sta2.12'), 'sota2');
  t.is('a thousands comma', cellNumber('1,000'), 1000);
  t.is('a leading decimal', cellNumber('.85'), 0.85);
  t.is('a dash is nothing', cellNumber('-'), 0);

  /* ── Ammunition types: the book's own names only ─────────────────────────────────── */
  t.is('APDS Rnds', ammoTypeFromWords('APDS Rnds'), 'apds');
  t.is('EX Explosive is not Explosive', ammoTypeFromWords('EX Explosive Rnds'), 'exExplosive');
  t.is('Explosive Rnds', ammoTypeFromWords('Explosive Rnds'), 'explosive');
  t.is('AV Assault Cannon Rnds', ammoTypeFromWords('AV Assault Cannon Rnds'), 'antiVehicle');
  t.is('Regular Rnds is regular — not "a type this system does not model"', ammoTypeFromWords('Regular Rnds'), 'regular');
  t.is('"Anti-Personnel Flechette" is a minigrenade, not flechette ammo', ammoTypeFromWords('Anti-Personnel Flechette'), null);
  t.is('SR2\'s "High Explosive AP Rnds" is not SR3 Explosive', ammoTypeFromWords('High Explosive AP Rnds'), null);

  /* ── Rows sharing a name ────────────────────────────────────────────────────────────── */
  const row = (o) => ({ Name: 'Gyro Mount', Cost: '2500', BookPage: 'sr3.282', ...o });
  t.is('an exact repeat collapses (listed under two headings)', variantsOf([row({}), row({ BookPage: 'sr3.283' })]).length, 1);
  t.is('…and so does the same row with its "->" marker', variantsOf([row({}), row({ Name: 'Gyro Mount->' })]).length, 1);
  t.is('"-" and a missing cell are the same nothing', variantsOf([row({ Rating: '-' }), row({})]).length, 1);
  t.is('…and so is "NA"', variantsOf([row({ Damage: 'NA' }), row({})]).length, 1);
  const rated = variantsOf([row({ Rating: '5' }), row({ Rating: '6', Cost: '3000' })]);
  t.is('Gyro Mount at Rating 5 and 6 are BOTH kept', rated.length, 2);
  t.is('…told apart by the rating first', rated.map(v => v.variant).join(' / '), 'Rating 5 / Rating 6');
  t.is('…else by cost', variantsOf([row({ Cost: '20' }), row({ Cost: '200' })]).map(v => v.variant).join(' / '), 'Cost 20¥ / Cost 200¥');

  const acth = mergeListings([
    { Name: 'ACTH', Addiction: '-', Tolerance: '3', Availability: '5/12hrs', BookPage: 'mm.117' },
    { Name: 'ACTH', Speed: 'Instant', Vector: 'Inhalation', Availability: '14/21 days', BookPage: 'mm.118' },
  ]);
  t.is('a drug printed in two tables is ONE item with both tables\' cells (M&M ACTH)', `${acth.Tolerance} ${acth.Vector}`, '3 Inhalation');
  t.ok('…and a cell they disagree on is kept, with its page', /Availability 14\/21 days \(mm\.118\)/.test(acth['Also listed']));
  t.is('…spacing is not a disagreement ("21/21 days" / "21/21days")',
    mergeListings([{ Name: 'Laes', Availability: '21/21 days' }, { Name: 'Laes', Availability: '21/21days' }])['Also listed'], undefined);

  /* ── One row → one document ─────────────────────────────────────────────────────────── */
  const clip = docFor({ Name: '15-Rnd Clip (APDS)', Cost: '110', Weight: '1.125', BookPage: 'sr3.281' }, 'Ammunition', 'SR3');
  t.is('a generator clip is ONE pre-filled reload (TODO 114)', `${clip.system.countedIn} ${clip.system.reloads}×${clip.system.roundsPerReload}`, 'reloads 1×15');
  t.is('…typed from its name', clip.system.ammoType, 'apds');
  const box = docFor({ Name: 'APDS Rnds', Cost: '7', Weight: '.025', BookPage: 'sr3.281' }, 'Ammunition', 'SR3');
  t.is('loose rounds are a box of 10 — the book prices "Ammunition, Per 10 Shots" (SR3 p.281)', box.system.rounds, 10);
  t.is('…at the book\'s price for ten: APDS 70¥', box.system.cost, 70);
  // ⚠ Weight is PER ROUND (TODO 126) — a box fired down to two rounds must not weigh what ten did.
  t.is('…and the weight of ONE round, as the generator lists it', box.system.weight, 0.025);
  const dart = docFor({ Name: 'Dart, Cyanide', Cost: '380', BookPage: 'mm.116' }, 'Ammunition', 'SR3');
  t.is('a dart is ONE, at its listed price — not a box of ten', `${dart.system.rounds} ${dart.system.cost}`, '1 380');
  const belt = docFor({ Name: 'Assault Cannon Belt (100)', Cost: '4250', BookPage: 'sr3.281' }, 'Ammunition', 'SR3');
  t.is('a row naming its count is that many', belt.system.rounds, 100);
  const arrows = docFor({ Name: 'Arrows', Cost: '10', BookPage: 'sr3.276' }, 'Bow and crossbow', 'SR3');
  t.is('arrows are ammunition, though upstream files them with the bows (TODO 91)', `${arrows?.type} ${arrows?.system.loadMechanism}`, 'ammunition arrow');
  t.is('"10 Bolts" is ten bolts', `${docFor({ Name: '10 Bolts', Cost: '50', BookPage: 'sr3.276' }, 'Bow and crossbow', 'SR3')?.system.rounds} bolt`, '10 bolt');
  t.is('…while the bow itself stays out of scope', docFor({ Name: 'Standard Bow', BookPage: 'sr3.276' }, 'Bow and crossbow', 'SR3'), null);
  t.is('a Spare Clip is gear, not ammunition (it is empty)', docFor({ Name: 'Spare Clip', Cost: '5', BookPage: 'sr3.282' }, 'Ammunition', 'SR3').type, 'gear');
  const formula = docFor({ Name: 'ECCM', Cost: 'RatingX1000', BookPage: 'sr3.290' }, 'Surveillance and Security', 'SR3');
  t.is('a price by formula is 0, not the first number in it', formula.system.cost, 0);
  t.ok('…with the formula kept for the GM', /RatingX1000/.test(formula.system.description));
  const half = docFor({ Name: 'Flare Rnds (1)', Cost: '2.5', BookPage: 'cc.39' }, 'Ammunition', 'SR3');
  t.is('cost is an INTEGER field — 2.5¥ rounds rather than failing validation', Number.isInteger(half.system.cost), true);
  t.ok('…and the book\'s 2.5¥ is kept in the notes', /2\.5¥/.test(half.system.notes));
  const gear = r => docFor({ Name: 'Bug Scanner', Cost: '500', BookPage: 'sr3.290', ...r }, 'Surveillance and Security', 'SR3');
  t.is('gear takes the Rating column', gear({ Rating: '4' }).system.rating, 4);
  t.is('…else the name\'s', gear({ Name: 'Bug Scanner [3]' }).system.rating, 3);
  t.is('…else NO rating — null, not 0 (TODO 118)', gear({ Rating: '-' }).system.rating, null);
  t.is('the book\'s table is the category', gear({}).system.category, 'Surveillance and Security');
  t.is('medical keeps its string rating ("+2" is a real Biotech rating)', docFor({ Name: 'Trauma Patch', Rating: '+2', BookPage: 'sr3.304' }, 'Biotech', 'SR3').system.rating, '+2');
  t.is('weapons are out of scope (the maintainer, 2026-09-14)', docFor({ Name: 'Ares Predator', BookPage: 'sr3.278' }, 'Firearms', 'SR3'), null);
  t.is('an SR2 row in the SR3 file is not built from there — the SR2 file has the real one', docFor({ Name: 'Medkit', BookPage: 'sr2.249' }, 'Biotech', 'SR3'), null);
  t.is('a fan book is not a default book', docFor({ Name: 'Widget', BookPage: 'cb1.29' }, 'Chips', 'SR2'), null);
  t.ok('every document is flagged as the builder\'s own', clip.flags.The2ndChumming3e.generatedBy === GENERATOR);
  t.is('ids are derived, so a re-run reuses them', docFor({ Name: 'APDS Rnds', BookPage: 'sr3.281' }, 'Ammunition', 'SR3')._id, box._id);
  t.is('…16 hex characters', /^[0-9a-f]{16}$/.test(idFor('x')), true);
  t.is('no category maps to a weapon, cyberware or vehicle type', Object.values(CATEGORY_TYPE).filter(x => !['gear', 'ammunition', 'medical', 'drug', 'armor'].includes(x)).length, 0);

  /* ── The fields the packs fill must exist — a TypeDataModel DROPS undeclared keys ───────── */
  const src = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  const gearSchema = /class GearData[\s\S]*?defineSchema\(\)\s*\{([\s\S]*?)\n\s{2}\}/.exec(src('scripts/data/ItemDataModels.js'))?.[1] ?? '';
  for (const f of ['category', 'concealability', 'rating', 'bookPage'])
    t.ok(`GearData declares ${f} (else the generated value is dropped at load)`, new RegExp(`\\b${f}:\\s*new `).test(gearSchema));
  const gearSheet = /case 'gear':([\s\S]*?)case '/.exec(src('scripts/sheets/SR3EItemSheet.js'))?.[1] ?? '';
  t.ok('the gear sheet shows Category', /'category'/.test(gearSheet));
  t.ok('the gear sheet shows Concealability', /'concealability'/.test(gearSheet));

  /* ── The default books are the registry's ────────────────────────────────────────────── */
  const { SOURCE_BOOKS } = await import('../scripts/config.js');
  for (const ed of ['SR3', 'SR2']) {
    const on = Object.entries(SOURCE_BOOKS).filter(([, b]) => b.edition === ed && b.enabled).map(([c]) => c).sort().join(' ');
    t.is(`${ed}: the builder's default books are SOURCE_BOOKS' enabled ones`, [...EDITION_BOOKS[ed]].sort().join(' '), on);
  }

  /* ── system.json declares every pack the builder writes, with its book ──────────────── */
  const manifest = JSON.parse(readFileSync(new URL('../system.json', import.meta.url), 'utf8'));
  const { byPack, report } = await plan(manifest, new Map());
  const declared = structuredClone(manifest);
  t.is('re-declaring changes nothing — every pack and folder is already in system.json',
    JSON.stringify(declarePacks(declared, byPack)), JSON.stringify(manifest));
  for (const [pack, { book, type }] of byPack) {
    const p = manifest.packs.find(x => x.name === pack);
    if (!p || p.flags?.The2ndChumming3e?.book !== book || !p.flags.The2ndChumming3e.itemTypes?.includes(type)) t.ok(`${pack} is declared with book ${book} and type ${type}`, false);
  }
  t.ok('every generated pack carries its book flag', [...byPack.keys()].every(n => manifest.packs.find(p => p.name === n)?.flags?.The2ndChumming3e?.book));
  const ids = [...byPack.values()].flatMap(v => v.docs.map(d => d._id));
  t.is('no two generated documents share an id', new Set(ids).size, ids.length);
  t.ok('nothing out of scope is written', !Object.keys(report.written).some(k => /firearm|melee|cyberware|bioware|vehicle/.test(k)));

  /* ⚠ The packs match the vendored source, document for document. Read from a COPY
   * (tools/lib/pack-copy.mjs); skipped if the packs are locked. */
  const { ClassicLevel } = await import('classic-level');
  const { join } = await import('node:path');
  const { existsSync } = await import('node:fs');
  const { copyPacks } = await import('../tools/lib/pack-copy.mjs');
  const { shippedNamesIn } = await import('../tools/build-default-gear.mjs');
  const { fileURLToPath } = await import('node:url');
  const copy = copyPacks(fileURLToPath(new URL('../packs', import.meta.url)));
  try {
    let shipped;
    try { shipped = await shippedNamesIn(copy.dir, manifest); } catch { t.ok('pack sweep SKIPPED — could not open the packs', true); return; }
    const { byPack: want } = await plan(manifest, shipped);
    const drift = [];
    let total = 0;
    for (const p of manifest.packs) {
      if (!existsSync(join(copy.dir, p.name))) continue;
      const expected = new Map((want.get(p.name)?.docs ?? []).map(d => [d._id, JSON.stringify(d)]));
      const db = new ClassicLevel(join(copy.dir, p.name), { valueEncoding: 'json' }); await db.open();
      for await (const [k, d] of db.iterator()) {
        if (!/^!items!/.test(k) || d?.flags?.The2ndChumming3e?.generatedBy !== GENERATOR) continue;
        total++;
        if (expected.get(d._id) !== JSON.stringify(d)) drift.push(`${p.name}: ${d.name}${expected.has(d._id) ? ' differs' : ' is not produced any more'}`);
        expected.delete(d._id);
      }
      await db.close();
      for (const id of expected.keys()) drift.push(`${p.name}: ${id} is missing — re-run the builder`);
    }
    t.ok(`the packs hold ${total} generated documents`, total > 2500);
    t.is(`the packs match rawdata/SRCG-*-Gear.json${drift.length ? ` — ${drift.slice(0, 5).join('; ')}` : ''}`, drift.length, 0);
  } finally { copy.cleanup(); }
}
