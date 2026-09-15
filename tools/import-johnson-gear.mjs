/**
 * Replace the Little Black Book contacts' gear STUBS with real compendium data · TODO 86
 *
 * The 62 contacts carry 411 non-skill items and **every one is a bare stub** — typed `gear`,
 * with `{quantity, cost: 0, weight: 0, description: ''}` and nothing else. So a Corporate
 * Security Guard's "Browning Max-Power" has no damage code, no mode, no ammunition: the GM
 * cannot roll it. That is the complaint behind [#86], and it is a *type* problem more than the
 * cyberware problem the entry opens with.
 *
 * This copies the matching pack entry's `type`, `img` and `system` over the stub, keeping the
 * item's own `_id`, `ownership`, `folder` and `sort`, and stamping `_stats.compendiumSource` so
 * the provenance is recorded.
 *
 *   node tools/import-johnson-gear.mjs --check     # report, write nothing
 *   node tools/import-johnson-gear.mjs             # the repo pack (what ships)
 *   node tools/import-johnson-gear.mjs --install   # the pack Foundry reads
 *
 * ⚠ **Foundry must be CLOSED.** A LevelDB allows one writer.
 * ⚠ **Run it TWICE**, once plain and once `--install` — `npm run sync:install` never copies packs.
 * ⚠ **Idempotent** — a second run reports 0 changes: a converted item carries
 *   `_stats.compendiumSource` and is skipped (its type alone is not enough since gear → gear).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ⚠ **EXACT NAME MATCHES ONLY. The stem tier is deliberately absent.**
 *
 * An earlier survey matched on "one name is a prefix of the other" and produced two confident
 * wrong answers by two different mechanisms:
 *   · `Club Drugs of Choice` (Club Hopper, p.43) matched the melee weapon **`Club`** — the gear
 *     line says what the contact takes recreationally, and the import would have armed them.
 *   · `Flash-pak` (Corp Bodyguard, p.48) matched the MITS spell **`Flash`**.
 * In both cases the correct answer was "nothing in the packs fits". Stem matching is a job for a
 * human reading each row, not for this tool.
 */
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { copyPacks } from './lib/pack-copy.mjs';
import { ratingFromName } from '../scripts/data/item-rating.mjs';

const HERE    = dirname(fileURLToPath(import.meta.url));
const REPO    = join(HERE, '..');
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');
const ROOT    = process.argv.includes('--install') ? INSTALL : REPO;
/* ⚠ **The INDEX always reads the REPO's packs, never the install's** — even when writing to
 * the install. The maintainer's install still carries 22 **pre-split monolithic** packs
 * (`sr3e-firearms`, `sr3e-melee`, `sr3e-armor`, `sr3e-cyberdecks`, …) that Foundry ignores and
 * that **do not ship**. Indexing those did two bad things on the first run, both caught by
 * diffing the two pack copies afterwards:
 *   1. `Switchblade` converted in the install and not in the repo — the copies diverged.
 *   2. `compendiumSource` was stamped with UUIDs like
 *      `Compendium.The2ndChumming3e.sr3e-firearms.Item.…`, naming a pack no other user has.
 *      **Dead provenance links for everybody but this machine.**
 * The repo is what ships, so the repo's packs are the only valid link targets. */
const PACKDIR = join(REPO, 'packs');
const CONTACTS = join(ROOT, 'packs', 'sr3e-mr-johnsons-contacts');
const CHECK   = process.argv.includes('--check');

/** Only bare `gear` stubs are converted. Anything already correctly typed is left alone. */
const FROM_TYPES = new Set(['gear']);

/**
 * Types a stub may be converted INTO. The exclusions are the whole safety argument:
 *
 * ⚠ **`skill` — a real false match that exists in the data today.** The *Mercenary* carries a
 *   `gear` item named "Desert Wars" **and** a knowledge skill "Desert Wars 4". Converting the
 *   gear would duplicate the skill.
 *
 * ⚠ **`cyberware` / `bioware` — Essence is permanent and the book prints it.** Seven stub names
 *   match cyberware entries carrying an Essence cost (`Radio` 0.75, `Biomonitor` 0.3, `Datajack`
 *   0.2). The Taxi Driver's "radio" is a handheld listed on the book's **Gear** line, not
 *   headware on its **Cyberware** line — the book separates them, and so must this. Converting
 *   would charge Essence the printed figure does not include, and [#84] corrected those figures
 *   against the page.
 *
 * ⚠ **`spell` / `adeptpower` — nothing on a gear line is either.** This is the bucket the
 *   `Flash-pak` → `Flash` false match fell into.
 *
 * ⚠ **`drug`** — the `Club Drugs of Choice` case. It is genuinely a drug, but it names a
 *   CATEGORY rather than an item, so there is nothing to import; it needs a typed placeholder
 *   instead. Out of scope here.
 *
 * ✅ **`gear` and `medical` — added 2026-09-14**, once TODO 91's packs shipped the default books'
 *   gear and medical items. An exact name match to a real item is the same safe case as a weapon:
 *   the stub gains its cost, rating, book and page and a `compendiumSource`. ⚠ **The contact's own
 *   rating wins** — `Medkit [Rating 5]` normalises to plain `Medkit` (rating 3), and since TODO 118 a
 *   stored rating beats the name, so the name's rating is written into the field.
 */
const TO_TYPES = new Set(['firearm', 'melee', 'projectile', 'thrown', 'armor', 'cyberdeck', 'gear', 'medical']);

const norm = s => String(s).toLowerCase().replace(/\[.*?\]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** The same, but a bracket's words stay: `Medkit [Rating 5]` → `medkit rating 5`, which is exactly
 *  how M&M's rated medkits are named (`Medkit Rating 5`). Tried first. */
const normKeep = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* ⚠ **The Little Black Book is an SR3 book — SR2 packs are never targets.** `Medkit` exists only in
 * `sr3e-sr2-medical`, and linking an SR3 contact's kit to the SR2 core (hidden whenever SR3 is played)
 * would be the wrong edition's item and page. */
const SR2_PACK = /^sr3e-(sr2|ct|ssc|st|fof|pna)-/;

/* Reviewed aliases — a book's name for an item that ships under another. Explicit, cited, one line
 * each; NOT the stem tier this tool refuses. */
const ALIASES = {
  'medkit': 'basic medkit',   // SR3 p.304 prints "Medkit"; the pack (from the generator) says "Basic Medkit"
};

/* ── Index every other pack by normalised name ───────────────────────────────────────────── */
/* ⚠ Read through a COPY (tools/lib/pack-copy.mjs). Opening a LevelDB rewrites its files even to
 * read, and this index used to open all ~100 repo packs directly — a `--check` run left 582 files
 * "modified" in git, content-identical (found 2026-09-14). Only the contacts pack is opened for
 * real, and only when writing. */
const idx = new Map();
const indexCopy = copyPacks(PACKDIR);
try {
  for (const p of readdirSync(indexCopy.dir)) {
    if (p === 'sr3e-mr-johnsons-contacts') continue;
    const db = new ClassicLevel(join(indexCopy.dir, p), { valueEncoding: 'json' });
    try { await db.open(); } catch { continue; }
    for await (const [k, v] of db.iterator()) {
      if (!String(k).startsWith('!items!') || !v?.name) continue;
      const n = norm(v.name);
      if (!idx.has(n)) idx.set(n, []);
      idx.get(n).push({ doc: v, pack: p });
    }
    await db.close();
  }
} finally { indexCopy.cleanup(); }
console.log(`Pack index: ${idx.size} distinct normalised names`);
console.log(`Index from: ${PACKDIR}  (always the repo — the install carries unshipped packs)`);
console.log(`Contacts:   ${CONTACTS}`);
console.log(CHECK ? 'Mode:       --check (nothing will be written)\n' : 'Mode:       apply\n');

// --check reads a copy too, so a report never touches the checkout.
const contactsCopy = CHECK ? copyPacks(join(ROOT, 'packs')) : null;
const db = new ClassicLevel(CHECK ? join(contactsCopy.dir, 'sr3e-mr-johnsons-contacts') : CONTACTS, { valueEncoding: 'json' });
try { await db.open(); } catch (err) {
  if (/LOCK|lock/i.test(String(err?.message))) {
    console.error('ERROR: the pack is locked — close Foundry and try again.');
    process.exit(1);
  }
  throw err;
}

const actors = [];
const embedded = new Map();
for await (const [k, v] of db.iterator()) {
  if (String(k).startsWith('!actors.items!')) embedded.set(String(k), v);
  else if (String(k).startsWith('!actors!')) actors.push(v);
}

let converted = 0;
const skippedAmbiguous = [], skippedType = [], skippedRated = [], unmatched = new Set();
const perContact = new Map();

for (const a of actors) {
  for (const id of (a.items ?? [])) {
    const key = `!actors.items!${a._id}.${id}`;
    const it  = embedded.get(key);
    if (!it || !FROM_TYPES.has(it.type)) continue;
    // Already converted: a gear → gear conversion keeps the type, so `FROM_TYPES` alone no longer
    // makes a second run a no-op. The provenance stamp does.
    if (it._stats?.compendiumSource) continue;

    let hits = null;
    for (const key of [normKeep(it.name), norm(it.name)]) {
      const found = (idx.get(ALIASES[key] ?? key) ?? []).filter(h => !SR2_PACK.test(h.pack));
      if (found.length) { hits = found; break; }
    }
    if (!hits) { unmatched.add(it.name); continue; }

    /* ⚠ Ambiguity guard. One name can exist in several packs; if they disagree about the TYPE
     * there is no safe automatic answer, so it is reported rather than resolved by pack order. */
    const types = [...new Set(hits.map(h => h.doc.type))];
    if (types.length > 1) {
      skippedAmbiguous.push(`${it.name} → ${hits.map(h => `${h.doc.type}:${h.pack}`).join(', ')}`);
      continue;
    }
    if (!TO_TYPES.has(types[0])) { skippedType.push(`${it.name} → ${types[0]}`); continue; }

    /* ⚠ **Rated variants.** The SR3 packs ship `Micro-transceiver` once per rating (1-10). The
     * contact's own rating picks one; with none, which rating the book meant is unknown — reported
     * for a human, never resolved by pack order. */
    const rating = ratingFromName(it.name);
    let pick = hits;
    if (pick.length > 1 && rating) {
      const exact = pick.filter(h => h.doc.system?.rating === rating);
      if (exact.length) pick = exact;
    }
    if (new Set(pick.map(h => JSON.stringify(h.doc.system?.rating ?? null))).size > 1) {
      skippedRated.push(`${it.name} → ${pick.length} rated variants (${a.name})`);
      continue;
    }
    // The core book first, then the other SR3 books.
    pick = [...pick].sort((x, y) => (y.pack.startsWith('sr3e-sr3-') ? 1 : 0) - (x.pack.startsWith('sr3e-sr3-') ? 1 : 0));

    const src = pick[0];
    const now = Date.now();
    const next = {
      ...it,
      /* ⚠ **KEEP THE CONTACT'S OWN NAME — do not adopt the pack's.** The contact's name came
       * from the book's gear line for *that contact* and can carry detail the generic pack entry
       * does not. Taking the pack name cost real information on the first run: the Corporate
       * Security Guard's `Light Security Armor [helmeted 7/6, unhelmeted 6/4]` became plain
       * `Light Security Armor`, which then collided with the 7/6 entry already on the sheet —
       * two identically-named armours, and no way to tell helmeted from unhelmeted.
       * `compendiumSource` records the link, so nothing is lost by keeping the book's wording. */
      name: it.name,
      type: src.doc.type,
      img:  src.doc.img ?? it.img,
      system: {
        ...structuredClone(src.doc.system ?? {}),
        // The contact's own rating (from the book's gear line) wins over the pack entry's.
        ...(ratingFromName(it.name) ? { rating: ratingFromName(it.name) } : {}),
      },
      _stats: {
        ...(it._stats ?? {}),
        // Real provenance: this is what "does their gear link back to the compendium" means.
        compendiumSource: `Compendium.The2ndChumming3e.${src.pack}.Item.${src.doc._id}`,
        modifiedTime: now,
      },
    };
    if (!CHECK) await db.put(key, next);
    converted++;
    if (!perContact.has(a.name)) perContact.set(a.name, []);
    perContact.get(a.name).push(`${it.name} → ${src.doc.type} [${src.pack}]`);
  }
}
await db.close();
contactsCopy?.cleanup();

for (const [name, list] of [...perContact].sort()) {
  console.log(`  ${name}`);
  list.forEach(l => console.log(`      ${l}`));
}

console.log(`\n${CHECK ? 'Would convert' : 'Converted'}: ${converted}`);
if (skippedType.length) {
  console.log(`\nSkipped — target type is excluded by design (${skippedType.length}):`);
  [...new Set(skippedType)].forEach(s => console.log(`  ${s}`));
}
if (skippedRated.length) {
  console.log(`
Skipped — RATED VARIANTS, the contact's line gives no rating (${skippedRated.length}):`);
  [...new Set(skippedRated)].forEach(s => console.log(`  ${s}`));
}
if (skippedAmbiguous.length) {
  console.log(`\nSkipped — AMBIGUOUS, packs disagree on the type (${skippedAmbiguous.length}):`);
  [...new Set(skippedAmbiguous)].forEach(s => console.log(`  ${s}`));
}
console.log(`\nStill unmatched gear stubs: ${unmatched.size} distinct `
  + '(names, compound lists, categories, and gear the packs do not carry — see TODO 86)');

if (!CHECK && converted && !process.argv.includes('--install')) {
  console.log('\nNow run the same command with --install to patch the pack Foundry reads.');
}
