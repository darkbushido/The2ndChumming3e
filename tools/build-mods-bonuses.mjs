/**
 * Derive SR3E bonus fields from the character generator's `Mods` data, and vendor the result.
 *
 * Reads `Cyberware.json` and `Bioware.json` from a local checkout of
 * `criticalfault/Shadowrun-Character-Generator`, parses every `Mods` string through
 * `scripts/SR3EMods.js`, and writes `scripts/data/srcg-bonuses.js` — an item-name → bonuses
 * map that BOTH the pack patcher and the world migration consume.
 *
 * ⚠ **Why vendor the derived map rather than read the JSON at run time.** The 11 `v2` populate
 * macros fetch upstream JSON live from GitHub, so the shipped packs depend on a moving target
 * nobody has a snapshot of — see TODO 12. This is a small down payment on that: the map is
 * committed, so an upstream change becomes a reviewable diff instead of a silent behaviour
 * change, and the migration can read it inside Foundry where no filesystem exists.
 *
 * ⚠ **Names are the join key**, because that is all the packs and the migration share. Upstream
 * names are used verbatim; if a pack renamed an item, it simply will not match, which the
 * patcher reports rather than guessing at.
 *
 *   node tools/build-mods-bonuses.mjs                 # write the map
 *   node tools/build-mods-bonuses.mjs --report        # print coverage, write nothing
 *
 * Set SRCG_DIR to point at the generator checkout (defaults beside this repo).
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseMods } from '../scripts/SR3EMods.js';
import { expandCyberwareName } from '../scripts/data/cyberware-names.js';

const HERE   = dirname(fileURLToPath(import.meta.url));
const REPORT = process.argv.includes('--report');
const SRCG   = process.env.SRCG_DIR
  ?? join(HERE, '..', '..', 'Shadowrun-Character-Generator', 'src', 'data', 'SR3');
const OUT    = join(HERE, '..', 'scripts', 'data', 'srcg-bonuses.js');

// ⚠ **AdeptPowers.json was missing here until 2026-08-29 (TODO 59)**, so all 117 shipped
// adept powers were mechanically inert — nothing in the tool or its comments said they had
// been considered and excluded. Adding one line here is half the fix; the other half was
// declaring `mods` on AdeptPowerData, which drops undeclared keys at load.
//
// ⚠ **An adept power's bonus is PER LEVEL when `HasLevels` is true.** Upstream stores
// `+1STR` on a levelled Improved Physical Attribute, meaning +1 for each level;
// `SR3EActor._prepareCharacter` does the multiplication. Cyberware has no equivalent —
// its grades ship as separate entries with absolute values — so the same map is read two
// different ways, correctly, by the type that owns each entry.
const FILES = {
  'Cyberware.json':  'cyberware',
  'Bioware.json':    'bioware',
  'AdeptPowers.json': 'adeptpower',
};

/** Upstream nests entries under category keys; find every object carrying a `Name`. */
function flatten(json) {
  const out = [];
  const walk = o => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') {
      if (o.Name !== undefined) out.push(o);
      Object.values(o).forEach(walk);
    }
  };
  walk(json);
  return out;
}

const map      = {};
const flags    = [];
const unmapped = [];
const unparsed = [];
const negative = [];
let scanned = 0, withMods = 0;

for (const [file, type] of Object.entries(FILES)) {
  const path = join(SRCG, file);
  if (!fs.existsSync(path)) {
    console.error(`\nMissing ${path}`);
    console.error('Set SRCG_DIR to your Shadowrun-Character-Generator checkout.\n');
    process.exit(2);
  }
  for (const e of flatten(JSON.parse(fs.readFileSync(path, 'utf8')))) {
    scanned++;
    const raw = String(e.Mods ?? '').trim();
    if (!raw) continue;
    withMods++;

    const r = parseMods(raw);
    /* ⚠ **Names are EXPANDED to the book's wording here** · TODO 87. Upstream ships the
     * Character Generator's fixed-width contractions (`Muscle Replac. [1]`), and the packs no
     * longer use them. Expanding at the point of GENERATION is what makes the map stable: the
     * alternative — rewriting keys in the committed file — would be undone by the next run.
     *
     * ⚠ `expandCyberwareName` returns its input unchanged when nothing matches, so the 5
     * unverified Cybertechnology names and every adept-power entry pass through untouched. */
    const name = expandCyberwareName(String(e.Name).trim());

    if (Object.keys(r.bonuses).length) {
      // ⚠ Last writer wins on a duplicate name, and duplicates do occur across grades. The
      // bonuses are identical in every observed case; a genuine conflict would show up in the
      // report as the same name listed twice.
      map[name] = { type, ...r.bonuses };
      if (Object.values(r.bonuses).some(v => v < 0)) negative.push(`${name}  ${raw}`);
    }
    if (r.flags.length)    flags.push(`${name}  [${r.flags.join(' ')}]`);
    if (r.unmapped.length) unmapped.push(`${name}  ${r.unmapped.map(u => `${u.code}(${u.meaning})`).join(' ')}`);
    if (r.unparsed.length) unparsed.push(`${name}  ${r.unparsed.join(' ')}`);
  }
}

console.log(`scanned ${scanned} entries, ${withMods} with Mods`);
console.log(`mapped  ${Object.keys(map).length} items to bonus fields`);
console.log(`\nNEGATIVE bonuses (${negative.length}) — need the schema's min:0 removed:`);
negative.forEach(n => console.log('  ' + n));
console.log(`\nFEATURE FLAGS, deliberately not bonuses (${flags.length}):`);
flags.slice(0, 8).forEach(n => console.log('  ' + n));
if (flags.length > 8) console.log(`  … and ${flags.length - 8} more`);
console.log(`\nUNMAPPED — real modifiers with no SR3E field (${unmapped.length}):`);
unmapped.slice(0, 12).forEach(n => console.log('  ' + n));
if (unmapped.length > 12) console.log(`  … and ${unmapped.length - 12} more`);
console.log(`\nUNPARSED — tokens the parser did not recognise (${unparsed.length}):`);
unparsed.forEach(n => console.log('  ' + n));
if (!unparsed.length) console.log('  (none)');

if (REPORT) { console.log('\n--report: nothing written.'); process.exit(0); }

const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
// ⚠ `type` is EMITTED, not stripped. The map is keyed by name alone and is consumed by a
// migration that walks every item an actor owns, so once adept powers joined cyberware and
// bioware in one map, a shared name would cross-write bonuses onto the wrong item type.
// There is no such collision today — the generator would have to be re-run to create one —
// which is exactly why the guard belongs here rather than in a comment saying it is fine.
const body = entries.map(([name, b]) => {
  const fields = Object.entries(b)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`).join(', ');
  return `  ${JSON.stringify(name)}: { ${fields} },`;
}).join('\n');

fs.writeFileSync(OUT, `/**
 * Cyberware, bioware and adept-power attribute bonuses, derived from the Shadowrun
 * Character Generator's \`Mods\` field.  **GENERATED — do not edit by hand.**
 *
 *   node tools/build-mods-bonuses.mjs
 *
 * ⚠ Vendored deliberately. The populate macros fetch upstream JSON live from GitHub, so the
 * shipped packs depend on a moving target with no snapshot (TODO 12). Committing the derived
 * map makes an upstream change a reviewable diff, and lets the world migration read it inside
 * Foundry, where there is no filesystem.
 *
 * ⚠ Attribute bonuses ONLY. Feature flags (STG, MNE, DGX, DJK, PCL, PCA, MUL, AST) and
 * modifiers with no SR3E field (IMP/BAL armour, TAS/HAC/CPL pools, VCT/VNI/VCR rigger) are
 * excluded — see \`scripts/SR3EMods.js\` for why each is left out.
 *
 * ⚠ Values may be NEGATIVE. Three entries carry a penalty; the bonus fields had to drop their
 * \`min: 0\` for these to survive being stored.
 *
 * ⚠ Each entry carries its \`type\`. Consumers match on NAME, and this map now spans three
 * item types, so the type is the guard against a shared name writing cyberware bonuses onto
 * an adept power. It is not a bonus field — skip it when applying.
 *
 * ⚠ An \`adeptpower\` entry's values are **PER LEVEL** when the power has levels: upstream
 * stores \`+1STR\` for a levelled Improved Physical Attribute, and
 * \`SR3EActor._prepareCharacter\` multiplies. Cyberware grades ship as separate entries with
 * absolute values, so the same number means different things by type — deliberately, since
 * it is what each source actually says.
 *
 * ${entries.length} items.
 */
export const SRCG_BONUSES = {
${body}
};
`);
console.log(`\nWrote ${OUT} — ${entries.length} items.`);
