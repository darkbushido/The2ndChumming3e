/**
 * Compendium pack integrity check — point it at any install.
 *
 * ⚠ **Why this exists.** On 2026-08-30 a sweep of the maintainer's install found **one
 * malformed document in every single pack** — 92 of them, each stored under the key
 * `!items!null` or `!actors!null` with `_id: null`. Every one duplicated a document that was
 * already in the pack correctly, so nothing was lost, and nothing was visibly broken. It had
 * been sitting there unnoticed through a full per-book pack restructure.
 *
 * **The repo was clean**, and that is the important half: the shipped packs are built by a
 * node tool, which writes minimal documents, while every malformed record carried full
 * Foundry scaffolding (`_stats`, `ownership`, `sort`, `folder`). Those only come from
 * Foundry's own `importDocument` — i.e. from running the populate macros against a live
 * install. Some of them sat in packs that do not exist in the repo at all. So this is drift a
 * particular install accumulates, which is exactly the kind of thing no test can see and
 * nobody goes looking for.
 *
 *   node tools/check-packs.mjs                     # check the local install
 *   node tools/check-packs.mjs <path-to-system>    # check any other install
 *   node tools/check-packs.mjs --repo              # check this checkout's packs/
 *   node tools/check-packs.mjs --fix               # remove SAFE duplicates (Foundry closed)
 *
 * Exits **1** if anything is wrong, so it can gate a release.
 *
 * ⚠ **Foundry must be closed, even to READ.** A LevelDB allows exactly one process to open a
 * database — there is no shared-read mode. A lock error is reported as "close Foundry" rather
 * than as a stack trace, because that is what it always means.
 *
 * ⚠ **`--fix` deletes only what it can prove is redundant.** A malformed record is removed
 * only when some *other*, properly-keyed record in the same pack is byte-identical in
 * content. Anything else is reported and left alone. See `CONTENT_KEYS` for what "content"
 * means and, just as importantly, what it excludes and why.
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ClassicLevel } from 'classic-level';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const FIX  = process.argv.includes('--fix');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));

const target = process.argv.includes('--repo')
  ? REPO
  : (args[0]
    ?? process.env.SR3E_INSTALL
    ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e'));

const PACKS = join(target, 'packs');
if (!existsSync(PACKS)) {
  console.error(`\nNo packs directory at ${PACKS}`);
  console.error('Pass the path to a Foundry system directory, or set SR3E_INSTALL.\n');
  process.exit(2);
}

/**
 * The fields that make a document what it IS, for the redundancy test.
 *
 * ⚠ Everything excluded is excluded for a reason, and getting this list wrong in either
 * direction is how a `--fix` deletes real content:
 *
 *   `_id`, `_stats`      identity and timestamps, not content — and the whole point is that
 *                        the broken record's `_id` is null
 *   `flags`, `folder`,   Foundry scaffolding. Absent on documents written by the node pack
 *   `ownership`, `sort`  builder, present on anything Foundry hydrated. Comparing them makes
 *                        every pair look different for reasons nobody cares about.
 *   `prototypeToken`     auto-generated from defaults (mystery-man art) and regenerated on
 *                        load. Present on the Foundry-made copy, absent on the built one.
 */
const CONTENT_KEYS = ['name', 'type', 'img', 'system', 'effects', 'items', 'pages', 'results'];

/** Deep key-sorted stringify — object key ORDER is not a difference. */
const canon = o => Array.isArray(o) ? o.map(canon)
  : (o && typeof o === 'object')
    ? Object.fromEntries(Object.keys(o).sort().map(k => [k, canon(o[k])]))
    : o;

const contentSig = d => JSON.stringify(canon(Object.fromEntries(
  CONTENT_KEYS.filter(k => d?.[k] !== undefined).map(k => [k, d[k]]))));

/** `!items!<id>` → the id; embedded keys like `!actors.items!a.b` are left alone. */
const KEY_RE  = /^!([a-z]+)!([^!]+)$/;
const BAD_KEY = /^![a-z]+!(?:null|undefined)$/;

console.log(`\nChecking ${target}`);

/* ── The manifest, if there is one, so declared-vs-on-disk can be reported ──────── */
let declared = null;
const manifestPath = join(target, 'system.json');
if (existsSync(manifestPath)) {
  try {
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    declared = new Set((m.packs ?? []).map(p => p.name));
    console.log(`Manifest: version ${m.version}, ${declared.size} packs declared`);
  } catch { console.log('Manifest: unreadable — skipping the declared-vs-on-disk check'); }
}

const onDisk = readdirSync(PACKS, { withFileTypes: true })
  .filter(e => e.isDirectory()).map(e => e.name).sort();

const problems = { malformed: [], keyMismatch: [], duplicateId: [], undeclared: [], missing: [] };
let removed = 0, unsafe = 0, totalDocs = 0, openedPacks = 0;

for (const packName of onDisk) {
  let db;
  try {
    db = new ClassicLevel(join(PACKS, packName), { valueEncoding: 'json' });
    await db.open();
  } catch (err) {
    // ⚠ A LevelDB lock means one thing in practice, and a stack trace hides it.
    if (/LOCK|lock/i.test(String(err?.message))) {
      console.error(`\n${packName}: database is locked.`);
      console.error('Close Foundry Virtual Tabletop and run this again — a LevelDB allows only');
      console.error('one process at a time, so even reading needs Foundry shut down.\n');
      process.exit(2);
    }
    continue;                       // not a LevelDB directory; ignore it
  }
  openedPacks++;

  const rows = [];
  for await (const [key, doc] of db.iterator()) rows.push([key, doc]);
  totalDocs += rows.length;

  const seenIds = new Map();
  for (const [key, doc] of rows) {
    const m = KEY_RE.exec(key);
    if (!m) continue;               // embedded/child keys are not our business
    const [, , keyId] = m;

    if (BAD_KEY.test(key) || doc?._id === null || doc?._id === undefined) {
      // Redundant only if SOME other properly-keyed record has identical content.
      // ⚠ ANY match, not the first name-match: a name can legitimately repeat within a pack
      // (`sr3e-sr3-melee` carries three "Spur"s), and comparing against the wrong one
      // reported 23 false conflicts before this was fixed.
      const twin = rows.find(([k, v]) => k !== key && !BAD_KEY.test(k)
        && contentSig(v) === contentSig(doc));
      problems.malformed.push({ pack: packName, key, name: doc?.name ?? '(unnamed)', redundant: !!twin });
      if (FIX && twin) { await db.del(key); removed++; }
      else if (FIX) unsafe++;
      continue;
    }

    if (doc._id !== keyId) {
      problems.keyMismatch.push({ pack: packName, key, id: doc._id, name: doc?.name });
    }
    if (seenIds.has(doc._id)) {
      problems.duplicateId.push({ pack: packName, id: doc._id, name: doc?.name });
    }
    seenIds.set(doc._id, key);
  }
  await db.close();

  if (declared && !declared.has(packName)) problems.undeclared.push(packName);
}

if (declared) {
  for (const name of declared) if (!onDisk.includes(name)) problems.missing.push(name);
}

/* ── Report ─────────────────────────────────────────────────────────────────────── */
console.log(`Scanned:  ${openedPacks} packs, ${totalDocs} documents\n`);

const report = (list, title, fmt) => {
  if (!list.length) return;
  console.log(`${title} (${list.length}):`);
  for (const x of list.slice(0, 40)) console.log('  ' + fmt(x));
  if (list.length > 40) console.log(`  … and ${list.length - 40} more`);
  console.log('');
};

report(problems.malformed,
  FIX ? 'MALFORMED documents' : 'MALFORMED documents — null or missing `_id`',
  x => `${x.pack.padEnd(28)} ${x.key.padEnd(22)} ${x.name}`
     + (x.redundant ? '   [redundant — safe to remove]' : '   [UNIQUE — needs a decision]'));

report(problems.keyMismatch, 'KEY / _id MISMATCH — the pack key does not match the document id',
  x => `${x.pack.padEnd(28)} key=${x.key}  _id=${x.id}  ${x.name ?? ''}`);

report(problems.duplicateId, 'DUPLICATE _id within a pack',
  x => `${x.pack.padEnd(28)} ${x.id}  ${x.name ?? ''}`);

report(problems.missing, 'DECLARED IN THE MANIFEST BUT NOT ON DISK — Foundry will warn on load',
  x => x);

// Informational, never a failure: the maintainer's install keeps the pre-split monolithic
// packs around, and an undeclared pack is simply ignored by Foundry.
if (problems.undeclared.length) {
  console.log(`Undeclared packs on disk (ignored by Foundry, not a fault) (${problems.undeclared.length}):`);
  console.log('  ' + problems.undeclared.join(', ') + '\n');
}

const faults = problems.malformed.length + problems.keyMismatch.length
             + problems.duplicateId.length + problems.missing.length;

if (FIX) {
  console.log(`--fix: removed ${removed} redundant document(s)`
    + (unsafe ? `, left ${unsafe} that could NOT be proven redundant` : ''));
  if (unsafe) {
    console.log('Those are listed above. Each has no identical twin, so removing one would');
    console.log('lose content — inspect them by hand.');
  }
  process.exit(unsafe ? 1 : 0);
}

if (!faults) { console.log('No problems found.\n'); process.exit(0); }

console.log(`${faults} problem(s) found.`);
if (problems.malformed.some(x => x.redundant)) {
  console.log('Re-run with --fix to remove the redundant ones (close Foundry first).');
}
console.log('');
process.exit(1);
