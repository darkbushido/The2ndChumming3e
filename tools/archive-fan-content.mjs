/**
 * Move provably-fan documents out of the shipping packs and into `archive/non-sr3-content/`.
 *
 *   node tools/archive-fan-content.mjs            # repo packs
 *   node tools/archive-fan-content.mjs --check    # report only, write nothing
 *   node tools/archive-fan-content.mjs --install  # the Foundry install's copy
 *
 * **Why.** The system ships no sourcebook content it cannot turn off, and 121 documents citing the
 * fan code `pw` were sitting inside packs named for SR2 core — so the source-book toggle could not
 * reach them and `sr3e-sr2-firearms` was, by document count, mostly not SR2 (TODO 117).
 *
 * ⚠ **"Provably fan" means the document's OWN `bookPage` cites a known fan code.** A blank or
 * `???` page is **unknown, not fan**; 200 documents are in that state and this tool does not touch
 * them. Moving those would be a guess dressed up as a cleanup, and it is exactly the kind of
 * plausible-looking wrong answer TODO 117 warns about.
 *
 * ⚠ **This is a MOVE, and the archive is the record that makes it reversible.** Each document is
 * written out whole, under its own LevelDB `_key`, with the pack it came from in the filename —
 * which is everything a restore needs (`archive/non-sr3-content/README.md`).
 *
 * ⚠ **The bucket is the fan code (`pw`), not the generic `fan`.** The existing archive lumps ten
 * fan sources into one bucket and its own README calls the result hard to inventory; recording the
 * code keeps these restorable per book.
 *
 * ⚠ **Foundry must be CLOSED** — a LevelDB allows one writer, and one reader.
 * ⚠ **Run it TWICE**: once plain, once `--install`. `packs/` and the install's copy are separate
 * (CLAUDE.md, *Editing an existing pack*).
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const CHECK = process.argv.includes('--check');
const INSTALL = process.argv.includes('--install');

/** The fan sources named in `archive/non-sr3-content/README.md` and CLAUDE.md. */
export const FAN_CODES = new Set(['ray', 'cb1', 'cb2', 'cb3', 'cb4', 'cp', 'nagee', 'pw', 'bjf', 'adh', 'cus']);

/** The fan codes a document's book/page cites. Empty for a missing or `???` page — UNKNOWN is not fan. */
export function fanCodes(bookPage) {
  const bp = String(bookPage ?? '');
  if (!bp || /\?\?\?/.test(bp)) return [];
  return [...new Set([...bp.matchAll(/([a-z0-9]+)\s*\./gi)]
    .map(m => m[1].toLowerCase()).filter(c => FAN_CODES.has(c)))];
}

/** Everything in `packs-src` that should move, grouped by pack. Pure enough to test. */
export function planArchive(packsSrc) {
  const plan = new Map();
  for (const pack of readdirSync(packsSrc)) {
    let files; try { files = readdirSync(path.join(packsSrc, pack)); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      let d; try { d = JSON.parse(readFileSync(path.join(packsSrc, pack, f), 'utf8')); } catch { continue; }
      if (!/^!(items|actors)!/.test(d._key ?? '')) continue;
      const codes = fanCodes(d.doc?.system?.bookPage);
      if (!codes.length) continue;
      if (!plan.has(pack)) plan.set(pack, []);
      plan.get(pack).push({ file: f, key: d._key, bucket: codes[0], doc: d.doc });
    }
  }
  return plan;
}

async function main() {
  const root = INSTALL
    ? (process.env.SR3E_INSTALL
      ?? path.join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e'))
    : REPO;
  const packsSrc = path.join(REPO, 'packs-src');   // the source of truth either way
  const archiveDir = path.join(REPO, 'archive', 'non-sr3-content');

  const plan = planArchive(packsSrc);
  const total = [...plan.values()].reduce((n, v) => n + v.length, 0);
  if (!total) { console.log('Nothing to archive — no shipped document cites a fan code.'); return; }

  console.log(`${INSTALL ? 'INSTALL' : 'REPO'}: ${total} document(s) to move, from ${plan.size} pack(s)`);
  for (const [pack, docs] of plan) {
    const codes = {};
    for (const d of docs) codes[d.bucket] = (codes[d.bucket] ?? 0) + 1;
    console.log(`  ${String(docs.length).padStart(4)}  ${pack.padEnd(30)} ${Object.entries(codes).map(([c, n]) => `${c}:${n}`).join(' ')}`);
  }
  if (CHECK) { console.log('\n--check: nothing written.'); return; }

  // 1. Write the archive first. If anything fails, the packs are still intact.
  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });
  for (const [pack, docs] of plan) {
    const out = path.join(archiveDir, `${pack}.json`);
    // ⚠ Append to an existing file rather than replacing it — a second run on a different subset
    //   must not discard what a first run archived. De-duplicated by `_key`.
    const existing = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
    const seen = new Set(existing.map(e => e._key));
    const added = docs.filter(d => !seen.has(d.key)).map(d => ({ _key: d.key, bucket: d.bucket, doc: d.doc }));
    writeFileSync(out, `${JSON.stringify([...existing, ...added], null, 1)}\n`, 'utf8');
    console.log(`  archived ${added.length} -> archive/non-sr3-content/${pack}.json (${existing.length + added.length} total)`);
  }

  // 2. Only then remove them from packs-src.
  for (const [pack, docs] of plan) {
    for (const d of docs) rmSync(path.join(packsSrc, pack, d.file));
    console.log(`  removed  ${docs.length} from packs-src/${pack}`);
  }

  console.log('\nNow rebuild the LevelDB packs:  npm run packs:build'
    + `${INSTALL ? '' : '\n⚠ Then run this again with --install, and npm run packs:install, with Foundry CLOSED.'}`);
  if (root !== REPO) console.log(`(install root: ${root})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
