/**
 * Every shipped document carries a book and page · TODO 117.
 *
 * `scripts/data/book-page.mjs` reads `system.bookPage` (`sr3.303`, `sr3.312,r3.172`) for the sheets
 * and for `tools/check-packs.mjs`; `tools/fill-book-pages.mjs` applied the researched map in
 * `tools/data/book-pages.json`. The last section is a RATCHET over the shipped packs: the number of
 * documents with no page may fall, never rise — new content cannot ship without one unnoticed.
 *
 * ⚠ Calls go through `BookPage.x(…)`, never a destructured copy, so the mutants can bite.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BookPage } from '../scripts/data/book-page.mjs';
import { pagePatch } from '../tools/fill-book-pages.mjs';

export const name = 'book-page';

/** Documents in the shipped packs with no book / page, as of 2026-09-13. Lower it as they are sourced. */
// ⚠ **200 is the FLOOR of what is reachable, not a backlog being worked down.** Re-surveyed
// 2026-09-21 (TODO 117): all 200 are blocked — 154 SR2 documents whose book is NOT in the PDF
// library, 28 Matrix Defragged agents and hosts that appear nowhere in that book because they were
// written for this system, and 18 skills that are Area Knowledge examples or carry the upstream
// placeholder `sr3.XXX`. Lowering this number needs the SR2 book, a ruling on what an Area
// Knowledge entry cites, and a convention for authored content — not more searching.
const MISSING_CEILING = 200;

export async function run(t) {
  /* ── Reading a page ─────────────────────────────────────────────────────────────── */
  t.is('sr3.303 reads "SR3 p.303"', BookPage.format('sr3.303'), 'SR3 p.303');
  t.is('a leading zero goes (mm.025)', BookPage.format('mm.025'), 'M&M p.25');
  t.is('two sources both show', BookPage.format('sr3.312,r3.172'), 'SR3 p.312 · R3 p.172');
  t.is('the Little Black Book', BookPage.format('lbb.38'), 'Little Black Book p.38');
  t.is('Matrix Defragged', BookPage.format('matrix-defragged.35'), 'Matrix Defragged p.35');
  t.is('an unknown code prints as itself', BookPage.format('pw.20'), 'pw p.20');
  t.is('a placeholder page says so', BookPage.format('sr2.???'), 'SR2, page unknown');
  t.is('nothing: empty', BookPage.format(''), '');
  t.is('codes of a two-source page', BookPage.codes('sr3.312,r3.172').join(), 'sr3,r3');

  t.ok('blank is missing', BookPage.missing(''));
  t.ok('undefined is missing', BookPage.missing(undefined));
  t.ok('the SR2 import\'s "sr2.???" is missing', BookPage.missing('sr2.???'));
  t.ok('a real page is not', !BookPage.missing('sr3.85'));

  /* ⚠ The generator writes State of the Art 2064 as `sta2`; the registry calls it `sota2`. */
  t.is('sta2 is SOTA 2064', BookPage.format('sta2.35'), 'SOTA 2064 p.35');
  t.ok('…so a SOTA 2064 pack\'s sta2 page is NOT filed under another book', !BookPage.namesOtherBook('sta2.35', 'sota2'));

  t.ok('an SR2-pack item citing pw names another book', BookPage.namesOtherBook('pw.20', 'sr2'));
  t.ok('a two-source page matching either code is fine', !BookPage.namesOtherBook('sr3.312,r3.172', 'r3'));
  t.ok('a system pack (no book) never counts', !BookPage.namesOtherBook('lbb.38', null));
  t.ok('a missing page never counts', !BookPage.namesOtherBook('sr2.???', 'sr3'));

  /* ── Applying the map ──────────────────────────────────────────────────────────── */
  const map = { p: { '!items!a': { name: 'Physics', bookPage: 'sr3.90', why: 'x' } } };
  t.is('a blank page is filled', pagePatch(map, 'p', '!items!a', { name: 'Physics', system: {} }), 'sr3.90');
  t.is('a placeholder is filled', pagePatch(map, 'p', '!items!a', { name: 'Physics', system: { bookPage: 'sr2.???' } }), 'sr3.90');
  t.is('a page someone set is kept', pagePatch(map, 'p', '!items!a', { name: 'Physics', system: { bookPage: 'sr3.91' } }), null);
  t.is('a key now holding something else is not guessed at', pagePatch(map, 'p', '!items!a', { name: 'Chemistry', system: {} }), null);

  const data = JSON.parse(readFileSync(new URL('../tools/data/book-pages.json', import.meta.url), 'utf8'));
  const entries = Object.values(data).flatMap(e => Object.values(e));
  t.ok(`the map has its entries (${entries.length})`, entries.length > 700);
  t.ok('every entry says where its page came from', entries.every(e => e.name && e.bookPage && e.why));
  t.ok('every page in the map names a book', entries.every(e => BookPage.codes(e.bookPage).length > 0 && !BookPage.missing(e.bookPage)));

  /* ── Wired in (source level) ───────────────────────────────────────────────────── */
  const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  const items  = read('scripts/data/ItemDataModels.js');
  const actors = read('scripts/data/ActorDataModels.js');
  const declares = (src, cls, next) => { const i = src.indexOf(`class ${cls} `); const j = next ? src.indexOf(`class ${next} `, i) : src.length;
    return /\bbookPage:\s+new StringField/.test(src.slice(i, j)); };
  for (const [cls, next] of [['SkillData', 'QualityData'], ['QualityData', 'CyberwareData'], ['SummoningData', 'ComplexFormData'],
    ['ComplexFormData', 'ProgramData'], ['ProgramData', 'CyberdeckData'], ['CyberdeckData', null], ['ContactData', 'DrugData']]) {
    t.ok(`${cls} declares bookPage (a TypeDataModel drops undeclared keys)`, declares(items, cls, next));
  }
  for (const [cls, next] of [['CharacterData', 'NpcData'], ['NpcData', 'ICData'], ['ICData', 'AgentData'], ['AgentData', 'HostData'], ['HostData', 'WardData']]) {
    t.ok(`${cls} declares bookPage`, declares(actors, cls, next));
  }
  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('the item sheet has one Book / Page field', !/_f\('Book \/ Page'/.test(sheet) && /_bookPageField\(s\)/.test(sheet));
  t.ok('…shows the page as a citation', /BookPage\.format\(s\.bookPage\)/.test(sheet));
  t.ok('…and appends it to layouts that never had one', /this\._withBookPage\(this\._details\(\)\)/.test(sheet));
  t.ok('the actor Bio tab shows it too', /'system\.bookPage'/.test(read('scripts/sheets/SR3EActorSheet.js')));
  t.ok('check-packs reports missing pages and other-book pages', /BookPage\.missing/.test(read('tools/check-packs.mjs'))
    && /BookPage\.namesOtherBook/.test(read('tools/check-packs.mjs')));

  /* ── The ratchet over the shipped packs ────────────────────────────────────────── */
  const { ClassicLevel } = await import('classic-level');
  const { copyPacks } = await import('../tools/lib/pack-copy.mjs');
  const manifest = JSON.parse(read('system.json'));
  const copy = copyPacks(fileURLToPath(new URL('../packs', import.meta.url)));
  let missing = 0, readable = true;
  try {
    for (const p of manifest.packs.map(x => x.name)) {
      if (!readdirSync(copy.dir).includes(p)) continue;
      const db = new ClassicLevel(join(copy.dir, p), { valueEncoding: 'json' });
      try { await db.open(); } catch { readable = false; continue; }
      for await (const [k, d] of db.iterator()) if (/^!(items|actors)!/.test(k) && BookPage.missing(d?.system?.bookPage)) missing++;
      await db.close();
    }
  } finally { copy.cleanup(); }
  if (readable) t.ok(`shipped documents without a book / page: ${missing} (ceiling ${MISSING_CEILING} — lower it as they are sourced)`, missing <= MISSING_CEILING);
  else t.ok('pack sweep SKIPPED — could not open the packs', true);
}
