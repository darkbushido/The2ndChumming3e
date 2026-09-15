/**
 * Split the contacts' compound cyberware and spells into real implants · TODO 86
 *
 * Each of the 36 augmented contacts carries ONE inert document holding a prose list —
 * `Cybereyes (Display Link, Flare Compensation, Low Light), Muscle Replacement 1,
 * Reaction Enhancers 2, Wired Reflexes 2 w/Reflex Trigger` — with a single summed
 * `essenceCost`, no bonuses and no citation. Spells are individual but 7 of 67 are named
 * differently from the packs.
 *
 *   node tools/import-johnson-cyberware.mjs --check     # report, write nothing
 *   node tools/import-johnson-cyberware.mjs             # packs-src, then rebuild packs/
 *   npm run packs:install                               # then copy to the install (Foundry CLOSED)
 *
 * ⚠ **Reads and writes `packs-src/` only** (TODO 12: the JSON source is the truth, `packs/` is
 *   build output). It never opens a LevelDB itself — `rebuildPack` compiles the contacts pack from
 *   source, and only when its content changed — so a `--check` cannot churn the checkout (it used
 *   to open every repo pack directly and leave ~590 files "modified" in git).
 * ⚠ **No `--install`** — the install is a one-way copy from packs-src (`npm run packs:install`).
 * ⚠ **Idempotent** — a converted implant carries `_stats.compendiumSource`, and anything that
 *   already has one is skipped.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ⚠ **THE CONTACT'S PRINTED ESSENCE IS PRESERVED, and this is the whole risk of the job.**
 *
 * The book prints each contact's Essence (Corp Bodyguard `E:1.76`) and [#84] corrected all 62
 * against the page. Splitting one 4.24-Essence blob into seven real implants whose costs sum to
 * something else would silently move that number — and cybereye MODS are the reason it will not
 * sum: SR3 p.300 gives cybereyes a **.5 Essence allowance their mods ride inside**, so importing
 * `Eyes, Flare Compensation` at its list cost double-charges what the eyes already covered.
 *
 * So `essence.lost` is written explicitly as `base − the book's printed value`. Per the Essence
 * rules in CLAUDE.md a recorded `lost` is **authoritative and wins outright** over the installed
 * sum, so the printed figure survives however the parts add up. That is exactly what the field
 * is for.
 *
 * ⚠ **Every imported implant keeps its own real `essenceCost` for reference**, which is what a
 * GM needs when a player wants to salvage a piece — the reason `CyberwareData.grade` was kept.
 * The per-item costs and the actor's Essence are answering different questions.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { readSourceDir, writeSourceDir, rebuildPack } from './lib/pack-source.mjs';
import { splitCyberware } from './lib/cyberware-split.mjs';
import { resolveImplant, resolveMod, resolveSpell, MODS_CONSUMED_BY } from './lib/johnson-aliases.mjs';

const HERE     = dirname(fileURLToPath(import.meta.url));
const REPO     = join(HERE, '..');
const SRC      = join(REPO, 'packs-src');
const PACK     = 'sr3e-mr-johnsons-contacts';
const CONTACTS = join(SRC, PACK);
const CHECK    = process.argv.includes('--check');
if (process.argv.includes('--install')) {
  console.error('--install is gone: run this plain (it writes packs-src and rebuilds packs/), then `npm run packs:install`.');
  process.exit(2);
}

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/* Key order, as a LevelDB iterates — so the first match for a name repeated within a pack is the
 * same document the LevelDB-reading version of this tool picked. */
const byKey = m => [...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

/* Index every other pack's SOURCE — the repo's, which is what ships, so `compendiumSource` never
 * names one of the install's unshipped pre-split packs (learned in import-johnson-gear.mjs). */
const idx = new Map();
for (const p of readdirSync(SRC).sort()) {
  if (p === PACK) continue;
  for (const [k, v] of byKey(readSourceDir(join(SRC, p)))) {
    if (!k.startsWith('!items!') || !v?.name) continue;
    if (!['cyberware', 'bioware', 'spell'].includes(v.type)) continue;
    const n = norm(v.name);
    if (!idx.has(n)) idx.set(n, { doc: v, pack: p });
  }
}
console.log(`Pack index: ${idx.size} cyberware/bioware/spell names (from ${SRC})`);
console.log(CHECK ? 'Mode:       --check (nothing will be written)\n' : 'Mode:       apply\n');

const entries = readSourceDir(CONTACTS);
const actors = [], embedded = new Map();
for (const [k, v] of byKey(entries)) {
  if (k.startsWith('!actors.items!')) embedded.set(k, v);
  else if (k.startsWith('!actors!')) actors.push(v);
}

/** 16 hex chars from a string — stable, so a re-run reuses keys instead of orphaning documents. */
function idFor(text) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 16);
}

function buildDoc(id, src, pack, ownership, extra = {}) {
  const now = Date.now();
  return {
    _id: id, name: src.name, type: src.type, img: src.img ?? 'icons/svg/item-bag.svg',
    system: { ...structuredClone(src.system ?? {}), ...extra },
    effects: [], folder: null, sort: 0, ownership: ownership ?? { default: 0 }, flags: {},
    _stats: {
      compendiumSource: `Compendium.The2ndChumming3e.${pack}.Item.${src._id}`,
      duplicateSource: null, coreVersion: '14', systemId: 'The2ndChumming3e',
      systemVersion: null, createdTime: now, modifiedTime: now, lastModifiedBy: null,
    },
  };
}

let implants = 0, spellsFixed = 0, contactsTouched = 0;
const unresolved = new Map(), essenceNotes = [];
const writes = [];

for (const a of actors) {
  const oldIds = a.items ?? [];
  const keep = [];               // ids surviving unchanged, in order
  const made = [];               // new implant docs
  let touched = false;

  for (const id of oldIds) {
    const key = `!actors.items!${a._id}.${id}`;
    const it  = embedded.get(key);
    if (!it) continue;

    /* ── Spells: rename-in-place to the pack's spelling, then import ─────────────────── */
    if (it.type === 'spell') {
      if (it._stats?.compendiumSource) { keep.push(id); continue; }
      const bare = it.name.replace(/\s*\(F\d+\)\s*$/, '').trim();
      const force = /\(F(\d+)\)\s*$/.exec(it.name)?.[1];
      const target = resolveSpell(bare) ?? bare;
      const hit = idx.get(norm(target));
      if (!hit || hit.doc.type !== 'spell') {
        if (!hit) unresolved.set(`spell: ${bare}`, (unresolved.get(`spell: ${bare}`) ?? 0) + 1);
        keep.push(id); continue;
      }
      /* ⚠ Keep the contact's own name — it carries the Force the book assigned that NPC
       * (`Manabolt (F6)`), which the generic pack entry does not. */
      writes.push([key, { ...buildDoc(id, hit.doc, hit.pack, a.ownership),
        name: it.name, system: { ...structuredClone(hit.doc.system ?? {}),
          force: force ? Number(force) : (it.system?.force ?? 0) } }]);
      keep.push(id); spellsFixed++; touched = true;
      continue;
    }

    if (!['cyberware', 'bioware'].includes(it.type)) { keep.push(id); continue; }
    if (it._stats?.compendiumSource) { keep.push(id); continue; }   // already split

    /* ── Cyberware: split the prose list ────────────────────────────────────────────── */
    const parts = splitCyberware(it.name);
    const resolvedHere = [];
    for (const part of parts) {
      const host = /cyberear/i.test(part.name) ? 'ear' : 'eye';
      const target = resolveImplant(part.name, part.mods) ?? part.name;
      const hit = idx.get(norm(target));
      if (hit) {
        resolvedHere.push({ src: hit, grade: part.grade });
      } else {
        unresolved.set(part.name, (unresolved.get(part.name) ?? 0) + 1);
      }
      for (const mod of part.mods) {
        // The parenthesis qualifies the implant rather than adding to it — see MODS_CONSUMED_BY.
        if (MODS_CONSUMED_BY.some(r => r.test(part.name))) continue;
        const mt = resolveMod(mod, host) ?? mod;
        const mh = idx.get(norm(mt));
        if (mh) resolvedHere.push({ src: mh, grade: part.grade });
        else unresolved.set(`(mod) ${mod}`, (unresolved.get(`(mod) ${mod}`) ?? 0) + 1);
      }
    }

    if (!resolvedHere.length) { keep.push(id); continue; }

    // Replace the blob with the resolved implants.
    writes.push([key, null]);                                   // delete the blob
    for (const r of resolvedHere) {
      const nid = idFor(`${a.name}|${r.src.doc.name}|${r.grade ?? ''}`);
      if (made.some(m => m._id === nid)) continue;               // same implant listed twice
      made.push(buildDoc(nid, r.src.doc, r.src.pack, a.ownership,
        r.grade ? { grade: r.grade } : {}));
    }
    implants += resolvedHere.length; touched = true;
  }

  if (!touched) continue;
  contactsTouched++;

  for (const m of made) writes.push([`!actors.items!${a._id}.${m._id}`, m]);

  /* ⚠ Pin the book's Essence. See the header: a recorded `lost` wins over the installed sum,
   * so the printed figure survives however the split parts add up. */
  const ess = a.system?.attributes?.essence;
  const next = { ...a, items: keep.concat(made.map(m => m._id)) };
  /* ⚠ **Only where implants were actually imported.** A contact touched purely for a spell
   * relink has no cyberware, and writing `lost: 0` there would convert a null (“nothing
   * recorded”) into an authoritative zero — a different thing per the Essence rules, and not
   * this tool's business. */
  if (made.length && ess && typeof ess.value === 'number') {
    const lost = Math.round(((ess.base ?? 6) - ess.value) * 100) / 100;
    if (ess.lost !== lost) {
      next.system = { ...a.system, attributes: { ...a.system.attributes,
        essence: { ...ess, lost } } };
      essenceNotes.push(`${a.name}: Essence ${ess.value} pinned (lost = ${lost})`);
    }
  }
  writes.push([`!actors!${a._id}`, next]);
  console.log(`  ${a.name.padEnd(30)} ${made.length} implants`);
}

let rebuilt = false;
if (!CHECK && writes.length) {
  for (const [k, v] of writes) { if (v === null) entries.delete(k); else entries.set(k, v); }
  writeSourceDir(CONTACTS, entries);
  rebuilt = await rebuildPack(REPO, PACK);
}

console.log(`\n${CHECK ? 'Would import' : 'Imported'}: ${implants} implants across ${contactsTouched} contacts`);
console.log(`Spells relinked: ${spellsFixed}`);
if (essenceNotes.length) {
  console.log(`\nEssence pinned to the book's printed value on ${essenceNotes.length} contacts:`);
  essenceNotes.slice(0, 6).forEach(n => console.log(`  ${n}`));
  if (essenceNotes.length > 6) console.log(`  …and ${essenceNotes.length - 6} more`);
}
if (unresolved.size) {
  console.log(`\nUNRESOLVED — no pack entry, left in place (${unresolved.size} distinct):`);
  [...unresolved].sort((a, z) => z[1] - a[1]).forEach(([n, c]) => console.log(`  ${String(c).padStart(3)}  ${n}`));
}
if (rebuilt) console.log(`\nRebuilt packs/${PACK} from source. Close Foundry, then: npm run packs:install`);
