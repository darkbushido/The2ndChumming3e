/**
 * Re-point the Little Black Book contacts' helmets at the SR3 Security Helmet · TODO 86
 *
 *   node tools/relink-johnson-helmets.mjs --check     # report, write nothing
 *   node tools/relink-johnson-helmets.mjs             # the repo pack
 *   node tools/relink-johnson-helmets.mjs --install   # the install's pack (Foundry CLOSED)
 *
 * The first import pass (2026-09-03, before SR2 packs were excluded) linked three contacts'
 * "Helmet" to the SR2 core's helmet (`sr3e-sr2-armor`, 1/1, SR2 p.241). The Little Black Book is an
 * SR3 book, and SR3 core prints no plain helmet — only the **Security Helmet** (p.284). The
 * maintainer's ruling, 2026-09-14: use the Security Helmet, and update the contacts appropriately.
 *
 * ⚠ **All three are 2/1 — the maintainer's ruling, 2026-09-14 ("use the 2/1 values"), and it
 * OVERRIDES two of the printed lines.** The book gives:
 *   · Freedom Fighter (p.46)   — "Vest with plates [4/3], helmet (2/1)"
 *   · Highway Patrol (p.62)    — "Armor vest with plates [4/3], helmet [1/1]"
 *   · SWAT Team Member (p.62)  — "Armor vest with plates [4/3], helmet [1/1]"
 * Do not "correct" the p.62 two back to 1/1 from the page: the GM chose one helmet rating for the
 * three. (The first pass had also flattened the Freedom Fighter's printed 2/1 to the SR2 entry's 1/1.)
 * Everything else — cost, availability, concealability, book and page, the link — is the Security
 * Helmet's.
 *
 * Idempotent: an item already linked to the Security Helmet at these values is left alone.
 * Indexes the REPO's armour pack through a copy (tools/lib/pack-copy.mjs); only the contacts pack
 * being written is opened for real, and `--check` reads a copy of that too.
 */
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { copyPacks } from './lib/pack-copy.mjs';

const HERE    = dirname(fileURLToPath(import.meta.url));
const REPO    = join(HERE, '..');
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');
const ROOT    = process.argv.includes('--install') ? INSTALL : REPO;
const CHECK   = process.argv.includes('--check');

/** The helmet rating per contact — 2/1 for all three by the maintainer's ruling (the p.62 lines print 1/1). */
export const PRINTED = {
  'Freedom Fighter':  { ballistic: 2, impact: 1, page: 'lbb.46' },
  'Highway Patrol':   { ballistic: 2, impact: 1, page: 'lbb.62 (prints 1/1; ruled 2/1)' },
  'SWAT Team Member': { ballistic: 2, impact: 1, page: 'lbb.62 (prints 1/1; ruled 2/1)' },
};

// ── The SR3 Security Helmet, from the REPO's pack (what ships), read through a copy ──────────
let helmet = null;
const repoCopy = copyPacks(join(REPO, 'packs'));
try {
  const db = new ClassicLevel(join(repoCopy.dir, 'sr3e-sr3-armor'), { valueEncoding: 'json' });
  await db.open();
  for await (const [k, v] of db.iterator()) if (k.startsWith('!items!') && v?.name === 'Security Helmet') helmet = v;
  await db.close();
} finally { repoCopy.cleanup(); }
if (!helmet) throw new Error('sr3e-sr3-armor has no "Security Helmet" — nothing to link to');
const SOURCE = `Compendium.The2ndChumming3e.sr3e-sr3-armor.Item.${helmet._id}`;

// ── The contacts ────────────────────────────────────────────────────────────────────────────
const contactsCopy = CHECK ? copyPacks(join(ROOT, 'packs')) : null;
const db = new ClassicLevel(CHECK ? join(contactsCopy.dir, 'sr3e-mr-johnsons-contacts')
                                  : join(ROOT, 'packs', 'sr3e-mr-johnsons-contacts'), { valueEncoding: 'json' });
try { await db.open(); } catch (err) {
  if (/LOCK|lock/i.test(String(err?.message))) { console.error('ERROR: the pack is locked — close Foundry and try again.'); process.exit(1); }
  throw err;
}
const actors = new Map();
for await (const [k, v] of db.iterator()) if (k.startsWith('!actors!')) actors.set(v._id, v);

let changed = 0;
const seen = new Set();
for await (const [k, it] of db.iterator()) {
  if (!k.startsWith('!actors.items!') || it?.name !== 'Helmet') continue;
  const owner = actors.get(k.split('!')[2].split('.')[0])?.name;
  const want  = PRINTED[owner];
  if (!want) { console.log(`  ? ${owner}: a "Helmet" with no printed line on record — left alone`); continue; }
  seen.add(owner);
  const done = it._stats?.compendiumSource === SOURCE
    && it.system?.ballistic === want.ballistic && it.system?.impact === want.impact;
  if (done) { console.log(`  = ${owner}: already the Security Helmet at ${want.ballistic}/${want.impact}`); continue; }
  const next = {
    ...it,
    name: it.name,                                   // the book's word stays
    type: 'armor',
    img:  helmet.img ?? it.img,
    system: { ...structuredClone(helmet.system ?? {}), ballistic: want.ballistic, impact: want.impact },
    _stats: { ...(it._stats ?? {}), compendiumSource: SOURCE, modifiedTime: Date.now() },
  };
  console.log(`  ${CHECK ? 'would set' : 'set'} ${owner}: Helmet ${it.system?.ballistic}/${it.system?.impact} (${it.system?.bookPage}) `
    + `→ Security Helmet link, ${want.ballistic}/${want.impact} as ${want.page} prints, page ${helmet.system?.bookPage}`);
  if (!CHECK) await db.put(k, next);
  changed++;
}
await db.close();
contactsCopy?.cleanup();

const missing = Object.keys(PRINTED).filter(n => !seen.has(n));
if (missing.length) console.log(`  ! no "Helmet" item found on: ${missing.join(', ')}`);
console.log(`\n${CHECK ? 'Would change' : 'Changed'}: ${changed}`);
