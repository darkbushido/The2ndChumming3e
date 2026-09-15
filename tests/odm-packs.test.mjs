/**
 * The Orthodox Matrix packs — `tools/build-odm-packs.mjs` (2026-09-14).
 *
 * `sr3e-odm-cyberdecks` / `sr3e-odm-programs` were dropped in `f457d3c` because they shipped EMPTY,
 * so the Orthodox deck and program pickers had nothing to list. They are rebuilt from the rawdata,
 * core book only, every number checked against the PDF (stats p.207, cost and availability p.304,
 * utility multipliers pp.220-222), and shown only while the world plays the Orthodox Matrix.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ClassicLevel } from 'classic-level';
import { copyPacks } from '../tools/lib/pack-copy.mjs';
import { deckDocs, programDocs, idFor, CORE_DECKS, CORE_PROGRAMS, DECK_PACK, PROGRAM_PACK } from '../tools/build-odm-packs.mjs';

export const name = 'odm-packs';

const root  = new URL('../', import.meta.url);
const json  = rel => JSON.parse(readFileSync(new URL(rel, root), 'utf8'));
const clone = v => JSON.parse(JSON.stringify(v));
const throws = fn => { try { fn(); return false; } catch { return true; } };

export async function run(t) {
  const rawDecks = json('rawdata/ODM-Cyberdeck.json');
  const rawProgs = json('rawdata/ODM-Programs.json');
  const decks = deckDocs(rawDecks);
  const progs = programDocs(rawProgs);

  /* ── What ships ─────────────────────────────────────────────────────────────── */
  t.is('the 8 stock decks of SR3 p.207', decks.length, 8);
  t.ok('…and nothing from Cyberpunk 2020, "cd" or the Matrix sourcebook',
    !decks.some(d => /Kirama|Zetatech|Elysia|CATCo|Maxed-out/.test(d.name)));
  t.is('the 22 core utilities (pp.220-222)', progs.length, 22);
  t.ok('…Attack at each damage level, named for it', ['Attack (Light)', 'Attack (Moderate)', 'Attack (Serious)', 'Attack (Deadly)']
    .every(n => progs.some(p => p.name === n && p.system.category === 'attack')));
  t.ok('…and not the Matrix sourcebook\'s (Camo, Hog, the links)', !progs.some(p => /Camo|Hog|Link|Erosion/.test(p.name)));

  /* ── The shape the Orthodox pickers read (SR3EActorSheet) ─────────────────────── */
  const excal = decks.find(d => d.name === 'Fairlight Excalibur');
  const odm   = excal.system.modules.find(m => m._odmType === 'orthodox');
  t.is('deck: MPCP where the picker reads it', excal.system.attributes.mpcp.base, 12);
  t.is('deck: active memory', excal.system.attributes.memory.total, 3000);
  t.is('deck: I/O speed', excal.system.attributes.dataTransferRate.value, 600);
  t.ok('deck: hardening, storage and response in the orthodox module', odm?.hardening === 6 && odm.storageMemory === 5000 && odm.responseIncrease === 3);
  t.ok('deck: the book\'s availability and cost (p.304)', excal.system.availability === '22/7days' && excal.system.cost === 1500000);
  const track = progs.find(p => p.name === 'Track');
  t.ok('program: category and multiplier where the picker reads them', track.system.category === 'utility' && track.system.multiplier === 8);
  t.ok('program: the page is in the description', /SR3 p\.221/.test(track.system.description));

  /* ── It refuses to ship numbers that disagree with the book ─────────────────── */
  const badDeck = clone(rawDecks); badDeck.find(r => r.Name === 'CMT Avatar').Persona = '8';
  t.ok('a deck whose MPCP disagrees with p.207 stops the build', throws(() => deckDocs(badDeck)));
  const lostDeck = clone(rawDecks).filter(r => r.Name !== 'Sony CTY-360-D');
  t.ok('a core deck missing from the rawdata stops the build', throws(() => deckDocs(lostDeck)));
  const badProg = clone(rawProgs); badProg.find(r => r.Name === 'Black Hammer').Multiplyer = 10;
  t.ok('a multiplier that disagrees with the book stops the build', throws(() => programDocs(badProg)));
  t.ok('a core utility missing from the rawdata stops the build', throws(() => programDocs(rawProgs.filter(r => r.Name !== 'Medic'))));

  /* ── Ids are derived, so a re-run never orphans documents ───────────────────── */
  t.eq('the same input gives the same ids', deckDocs(rawDecks).map(d => d._id), decks.map(d => d._id));
  t.is('ids are 16 characters', decks.concat(progs).every(d => /^[0-9a-f]{16}$/.test(d._id)), true);
  t.is('…and distinct', new Set(decks.concat(progs).map(d => d._id)).size, 30);
  t.is('the deck and program namespaces cannot collide', idFor('odm-deck:Armor') === idFor('odm-program:Armor'), false);
  t.ok('the tables hold what the tool writes', Object.keys(CORE_DECKS).length === 8 && Object.keys(CORE_PROGRAMS).length === 22);

  /* ── The committed packs are exactly what the tool builds (read through a copy) ─ */
  const copy = copyPacks(new URL('packs', root).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  try {
    for (const [pack, want] of [[DECK_PACK, decks], [PROGRAM_PACK, progs]]) {
      const db = new ClassicLevel(join(copy.dir, pack), { valueEncoding: 'json' });
      await db.open();
      const got = [];
      for await (const [k, d] of db.iterator()) got.push([k, d]);
      await db.close();
      t.eq(`${pack}: the committed keys are the builder's`, got.map(([k]) => k).sort(), want.map(d => `!items!${d._id}`).sort());
      t.ok(`${pack}: …and the committed documents match it`,
        want.every(d => JSON.stringify(got.find(([k]) => k === `!items!${d._id}`)?.[1]) === JSON.stringify(d)));
    }
  } finally { copy.cleanup(); }

  /* ── Declared, tagged and filed ─────────────────────────────────────────────── */
  const manifest = json('system.json');
  for (const [pack, type] of [[DECK_PACK, 'cyberdeck'], [PROGRAM_PACK, 'program']]) {
    const p = manifest.packs.find(x => x.name === pack);
    const f = p?.flags?.The2ndChumming3e ?? {};
    t.ok(`${pack}: declared, core book, Orthodox ruleset, ${type} items`,
      p && p.path === `packs/${pack}` && f.book === 'sr3' && f.matrixRuleset === 'orthodox' && f.itemTypes?.[0] === type);
  }
  const matrix = manifest.packFolders.find(f => f.name === 'Matrix');
  t.ok('filed in the Matrix folders beside their Defragged counterparts',
    matrix.folders.find(f => f.name === 'Cyberdecks').packs.includes(DECK_PACK)
    && matrix.folders.find(f => f.name === 'Matrix Programs').packs.includes(PROGRAM_PACK));
}
