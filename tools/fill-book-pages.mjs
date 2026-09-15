/**
 * Give shipped documents their book and page · TODO 117.
 *
 * Applies `tools/data/book-pages.json` — pack → document key → `{ name, bookPage, why }`. The map
 * was researched once (2026-09-13) and is committed so the reasoning can be reviewed: every entry
 * says where its page came from — the upstream generator's own `source`/`BookPage`, a note's
 * citation, the Matrix Defragged PDF, or (for knowledge, language and B/R skills the book only
 * describes as a category) the core rulebook section that defines the category.
 *
 * Fills blanks and `???` placeholders only; a page anyone set is kept. Idempotent.
 *
 * ⚠ **Foundry must be CLOSED**, and run it TWICE — once for the repo, once with `--install`.
 * The repo is scanned from a copy and only the packs that change are opened for real, so the
 * rest are not left "modified" in git (tools/lib/pack-copy.mjs).
 *
 *   node tools/fill-book-pages.mjs [--install] [--check]
 */
import { ClassicLevel } from 'classic-level';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { copyPacks } from './lib/pack-copy.mjs';
import { BookPage } from '../scripts/data/book-page.mjs';

const HERE    = dirname(fileURLToPath(import.meta.url));
const REPO    = join(HERE, '..');
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');

/** The page to write for one document, or null. Pure. */
export function pagePatch(map, pack, key, doc) {
  const entry = map?.[pack]?.[key];
  if (!entry || !BookPage.missing(doc?.system?.bookPage)) return null;
  if (entry.name !== doc?.name) return null;          // a key reused for something else: do not guess
  return entry.bookPage;
}

async function main() {
  const ROOT  = process.argv.includes('--install') ? INSTALL : REPO;
  const CHECK = process.argv.includes('--check');
  const map   = JSON.parse(readFileSync(join(HERE, 'data', 'book-pages.json'), 'utf8'));
  const copy  = ROOT === REPO ? copyPacks(join(ROOT, 'packs')) : null;
  const scanRoot = copy ? copy.dir : join(ROOT, 'packs');
  const open = async path => {
    const db = new ClassicLevel(path, { valueEncoding: 'json' });
    try { await db.open(); } catch (err) {
      console.error(`\n${path}: could not open — close Foundry (a LevelDB allows one process).\n${err.message}`);
      copy?.cleanup(); process.exit(2);
    }
    return db;
  };
  console.log(`${CHECK ? 'Checking' : 'Filling'} ${join(ROOT, 'packs')}`);
  let total = 0;
  try {
    for (const pack of Object.keys(map)) {
      if (!existsSync(join(scanRoot, pack))) { console.log(`  ${pack}: not on disk — skipped`); continue; }
      const scan = await open(join(scanRoot, pack));
      const writes = [];
      for await (const [key, doc] of scan.iterator()) {
        const page = pagePatch(map, pack, key, doc);
        if (page === null) continue;
        (doc.system ??= {}).bookPage = page;
        writes.push([key, doc]);
      }
      if (!writes.length || CHECK || copy) await scan.close();
      if (!writes.length) continue;
      console.log(`  ${pack}: ${writes.length}${CHECK ? ' to fill' : ' filled'}`);
      total += writes.length;
      if (CHECK) continue;
      const db = copy ? await open(join(ROOT, 'packs', pack)) : scan;
      for (const [k, d] of writes) await db.put(k, d);
      await db.close();
    }
  } finally { copy?.cleanup(); }
  console.log(`\n${total} document${total === 1 ? '' : 's'} ${CHECK ? 'would be given' : 'given'} a book and page.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
