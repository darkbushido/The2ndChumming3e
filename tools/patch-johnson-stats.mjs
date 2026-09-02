/**
 * Carry the generator's corrected attributes into the shipped packs · TODO 84
 *
 * The generator (`scripts/macros/populate-mr-johnsons-contacts.js`) is the source of truth for
 * the 62 Little Black Book contacts, and 52 of its records were corrected against the printed
 * book on 2026-09-01 — the mental attributes had been rotated one slot, because the entry was
 * made against SR3's character-sheet order `B Q S C I W` while the book prints `B Q S I W C`.
 *
 * **The packs are built by running that macro inside Foundry**, so until someone does, `packs/`
 * and the install still carry the rotated stats. This applies the same corrections in place —
 * narrower than a rebuild, reversible, and it disturbs nothing else in the documents.
 *
 * ⚠ **Foundry must be CLOSED.** A LevelDB allows one writer. Fails loudly rather than
 * corrupting anything.
 *
 * ⚠ **Idempotent** — a second run reports 0 changes.
 *
 * ⚠ **TWO COPIES OF EVERY PACK, and Foundry reads the other one.** `scripts/`, `styles/` and
 * `lang/` in the install are junctions into this checkout; **`packs/` is not**, and
 * `npm run sync:install` deliberately never copies packs — they are databases Foundry writes
 * to. **Run this twice: once plain, once with `--install`.**
 *
 *   node tools/patch-johnson-stats.mjs --check     # report, write nothing
 *   node tools/patch-johnson-stats.mjs             # the repo pack (what ships)
 *   node tools/patch-johnson-stats.mjs --install   # the pack Foundry reads
 */
import { ClassicLevel } from 'classic-level';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseGenerator } from './lib/johnson-generator.mjs';
import { parseSpecialisations } from '../scripts/data/skill-rules.mjs';

const HERE    = dirname(fileURLToPath(import.meta.url));
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');
const PACK = process.argv.includes('--install')
  ? join(INSTALL, 'packs', 'sr3e-mr-johnsons-contacts')
  : join(HERE, '..', 'packs', 'sr3e-mr-johnsons-contacts');
const CHECK = process.argv.includes('--check');
/* ⚠ Skills are rebuilt only when asked. They are 743 embedded documents across the 62 contacts
 * and replacing them DELETES and RECREATES, so it is opt-in rather than folded into the
 * attribute pass a GM might run casually. */
const SKILLS = process.argv.includes('--skills');

/**
 * ⚠ **The generator is parsed with the SHARED parser**, not a fresh regex. Two ad-hoc versions
 * written during this audit silently read every record as `baseActor`'s defaults and produced
 * confident, wrong output. See `tools/lib/johnson-generator.mjs`.
 */
const gen = parseGenerator(readFileSync(
  join(HERE, '..', 'scripts', 'macros', 'populate-mr-johnsons-contacts.js'), 'utf8'));

console.log(`Pack:      ${PACK}`);
console.log(`Generator: ${gen.size} contacts`);
console.log(`Skills:    ${SKILLS ? 'REBUILT from the generator' : 'untouched (pass --skills)'}`);
console.log(CHECK ? 'Mode:      --check (nothing will be written)\n' : 'Mode:      apply\n');

const db = new ClassicLevel(PACK, { valueEncoding: 'json' });
try {
  await db.open();
} catch (err) {
  if (/LOCK|lock/i.test(String(err?.message))) {
    console.error('ERROR: the pack is locked — close Foundry and try again.');
    process.exit(1);
  }
  throw err;
}

const ATTRS = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'];

/* The generator resolves a skill's CATEGORY at run time from `game.sr3e.SR3E.skills`, which is
 * not available here — so it is resolved the same way, directly from the config module. */
const { SR3E } = await import(
  `file://${join(HERE, '..', 'scripts', 'config.js').replace(/\\/g, '/')}`);
const ACTIVE_CATS = new Set(['Combat skills', 'Physical skills', 'Social skills',
  'Technical skills', 'Vehicle skills', 'Magical skills', 'Build/Repair skills']);
function categoryFor(name, tier) {
  if (tier === 'language') return 'Language';
  const bare = String(name).replace(/\s*B\/R\s*$/i, '').trim();
  for (const [cat, list] of Object.entries(SR3E.skills ?? {})) {
    const isActive = ACTIVE_CATS.has(cat);
    if (tier === 'active' ? !isActive : (isActive || cat === 'Language')) continue;
    if (list.some(x => x.name === name || x.name === bare)) return cat;
  }
  // Same fallback the generator uses for placeholders and B/R variants.
  return tier === 'active' ? 'Combat skills' : 'Street knowledge';
}

let changed = 0, already = 0, unmatched = [];

/* ── Skills ────────────────────────────────────────────────────────────────────────────────
 *
 * The generator's skill lists were regenerated from the book (TODO 89, 62 of 62 now matching).
 * The packs still carry the old ones, and because the packs are built by RUNNING the macro
 * inside Foundry there is no other way to carry a fix across without a full rebuild.
 *
 * ⚠ **Embedded items live under their own `!actors.items!` keys**, and the actor's `items`
 * array holds their ids. Both must change together: write the documents, then rewrite the
 * array, or the actor points at ids that no longer exist.
 *
 * ⚠ **Non-skill items are preserved in order.** Gear, armour, cyberware, spells and adept
 * powers belong to TODO 86 and are not this tool's business.
 */
function skillDoc(entry, ownership) {
  const now = Date.now();
  return {
    // ⚠ Deterministic id from the contact and skill name, NOT random: re-running must reuse the
    // same key rather than orphaning the previous document in the database.
    _id: entry._id,
    name: entry.name, type: 'skill',
    system: {
      skillName: entry.name, rating: entry.rating, linkedAttribute: entry.attr,
      category: entry.category, skillType: entry.tier,
      specialisation: entry.spec ?? '',
      specialisations: entry.spec ? parseSpecialisations(entry.spec, entry.rating) : [],
      force: 0, description: '',
    },
    img: 'icons/svg/item-bag.svg', effects: [], folder: null, sort: 0,
    ownership: ownership ?? { default: 0 }, flags: {},
    _stats: { compendiumSource: null, duplicateSource: null, coreVersion: '14',
              systemId: 'The2ndChumming3e', systemVersion: null,
              createdTime: now, modifiedTime: now, lastModifiedBy: null },
  };
}

/** 16 hex chars derived from a string — stable across runs. */
function idFor(text) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 16);
}

for await (const [key, doc] of db.iterator()) {
  // ⚠ Actor documents only. Embedded items live under `!actors.items!` in the same database.
  if (!String(key).startsWith('!actors!') || String(key).includes('.items')) continue;
  if (!doc || typeof doc !== 'object') continue;

  const g = gen.get(String(doc.name ?? '').toUpperCase());
  if (!g) { unmatched.push(doc.name); continue; }

  const diffs = [];
  const attrs = { ...(doc.system?.attributes ?? {}) };

  for (const a of ATTRS) {
    const cur = attrs[a];
    if (!cur) continue;
    /* ⚠ Write BOTH `base` and `value`. `base` is what persists; `value` is recomputed by
     * `prepareDerivedData` on load, but the generator's own `attr()` helper sets them equal and
     * a pack document that disagrees with itself is confusing to read in the raw. */
    if (cur.base !== g[a] || cur.value !== g[a]) {
      diffs.push(`${a} ${cur.base}→${g[a]}`);
      attrs[a] = { ...cur, base: g[a], value: g[a] };
    }
  }

  /* ⚠ Essence's persisted field is `base` (6) with `value` the current total — see the Essence
   * rules in CLAUDE.md. The generator sets `value` to the book's printed figure and leaves
   * `base` at 6, so only `value` is touched here. */
  if (attrs.essence && attrs.essence.value !== g.essence) {
    diffs.push(`essence ${attrs.essence.value}→${g.essence}`);
    attrs.essence = { ...attrs.essence, value: g.essence };
  }
  /* ⚠ Wired/Boosted Reflexes. `wired()` in the generator returned HALF the Reaction until
   * 2026-09-01 (SR3 p.300 gives +2 per level), so the shipped pack disagrees with the book and
   * with the generator. Gunsmith (p.58) is the only affected record and the book prints its
   * augmented Reaction outright: `R 4 (6)`. */
  if (attrs.reaction && g.reflex) {
    for (const f of ['reactionBonus', 'diceBonus']) {
      if ((attrs.reaction[f] ?? 0) !== g.reflex[f]) {
        diffs.push(`${f} ${attrs.reaction[f] ?? 0}→${g.reflex[f]}`);
        attrs.reaction = { ...attrs.reaction, [f]: g.reflex[f] };
      }
    }
  }
  if (attrs.magic && g.magic !== null && attrs.magic.base !== g.magic) {
    diffs.push(`magic ${attrs.magic.base}→${g.magic}`);
    attrs.magic = { ...attrs.magic, base: g.magic, value: g.magic };
  }

  const sys = {};
  if (doc.system?.metatype !== g.metatype) {
    diffs.push(`metatype ${doc.system?.metatype}→${g.metatype}`);
    sys.metatype = g.metatype;
  }
  /* ⚠ `professionalRating` and `karmaPool` were filled from the NOTES by
   * `patch-johnson-contacts.mjs` (TODO 83). The generator now writes both directly, so it is
   * the authority — but only where it actually states one. A null must never blank a value
   * recovered from the book. */
  if (g.pr !== null && (doc.system?.professionalRating ?? 0) !== g.pr) {
    diffs.push(`PR ${doc.system?.professionalRating ?? 0}→${g.pr}`);
    sys.professionalRating = g.pr;
  }
  if (g.karma !== null && (doc.system?.karmaPool ?? 0) !== g.karma) {
    diffs.push(`karmaPool ${doc.system?.karmaPool ?? 0}→${g.karma}`);
    sys.karmaPool = g.karma;
  }

  /* ── rebuild this contact's skills ─────────────────────────────────────────────────── */
  if (SKILLS) {
    const oldIds = doc.items ?? [];
    const keep = [];                      // non-skill item ids, in order
    const oldSkillIds = [];
    for (const id of oldIds) {
      const it = await db.get(`!actors.items!${doc._id}.${id}`).catch(() => undefined);
      if (it && it.type === 'skill') oldSkillIds.push(id); else keep.push(id);
    }

    const built = g.skills.map(sk => ({
      ...sk,
      _id: idFor(`${doc.name}|${sk.name}|${sk.tier}`),
      category: categoryFor(sk.name, sk.tier),
    }));

    const sameCount = oldSkillIds.length === built.length;
    if (!sameCount || !CHECK) {
      if (!CHECK) {
        for (const id of oldSkillIds) await db.del(`!actors.items!${doc._id}.${id}`);
        for (const b of built) {
          await db.put(`!actors.items!${doc._id}.${b._id}`, skillDoc(b, doc.ownership));
        }
        doc.items = keep.concat(built.map(b => b._id));
      }
      if (oldSkillIds.length !== built.length) {
        diffs.push(`skills ${oldSkillIds.length}→${built.length}`);
      } else {
        diffs.push(`skills rebuilt (${built.length})`);
      }
    }
  }

  if (!diffs.length) { already++; continue; }

  console.log(`  ${String(doc.name).padEnd(34)} ${diffs.join(', ')}`);
  changed++;
  if (CHECK) continue;

  doc.system = { ...doc.system, ...sys, attributes: attrs };
  await db.put(key, doc);
}

await db.close();

console.log(`\n${CHECK ? 'Would change' : 'Changed'}: ${changed}`);
console.log(`Already correct:  ${already}`);
if (unmatched.length) {
  console.log(`\n⚠ In the pack but not the generator (${unmatched.length}) — these are NOT `
    + 'patched, and a name that drifted apart is the likeliest cause:');
  unmatched.forEach(u => console.log(`  ${u}`));
}
if (!CHECK && changed && !process.argv.includes('--install')) {
  console.log('\nNow run the same command with --install to patch the pack Foundry reads.');
  console.log('(`npm run sync:install` will NOT carry this — it never copies packs.)');
}
