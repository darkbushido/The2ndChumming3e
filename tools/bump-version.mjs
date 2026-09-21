/**
 * Set the version in `system.json` — the one file the release workflow checks against the tag.
 *
 *   node tools/bump-version.mjs 0.6.0          write it
 *   node tools/bump-version.mjs 0.6.0 --check  compare only, exit 1 if it differs
 *   node tools/bump-version.mjs patch          0.5.2 → 0.5.3   (a bug fix)
 *   node tools/bump-version.mjs minor          0.5.2 → 0.6.0   (a new feature)
 *
 * ⚠ **It rewrites ONE LINE, never the parsed document.** Round-tripping `system.json` through
 * `JSON.parse`/`stringify` reformats ~1900 lines of pack declarations into one unreviewable diff —
 * the same reason `tools/manifest-branch.mjs` works by line. Do not "simplify" this.
 *
 * ⚠ **It does not commit, tag or push.** The maintainer publishes.
 *
 * ⚠ **The number follows the maintainer's rule** (CLAUDE.md): a bug fix bumps the patch, a new
 * feature bumps the minor, and **1.0.0 is reserved for "feature complete" — the maintainer calls
 * it**. This script will not produce 1.0.0 from `major`; there is deliberately no `major` keyword.
 *
 * ⚠ **A migration must be numbered for the release it ships in.** If this bump is going out with a
 * new entry in `SR3EMigrations.MIGRATIONS`, that entry's version must be ≤ this one, or `migrate()`
 * never stamps past it and it re-runs on every world load for ever.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'system.json');

const args   = process.argv.slice(2);
const check  = args.includes('--check');
const asked  = args.find(a => !a.startsWith('--'));

if (!asked) {
  console.error('usage: node tools/bump-version.mjs <x.y.z | patch | minor> [--check]');
  process.exit(2);
}

const src = readFileSync(FILE, 'utf8');
// The manifest's own version line, not a pack's or a compatibility block's: it is at depth 1.
const line = /^(\s*"version"\s*:\s*")([^"]+)(",?\s*)$/m;
const m = src.match(line);
if (!m) { console.error('system.json: no "version" line found — has the manifest been reformatted?'); process.exit(2); }

const current = m[2];
const semver  = /^(\d+)\.(\d+)\.(\d+)$/;
const parts   = current.match(semver);
if (!parts) { console.error(`system.json version "${current}" is not x.y.z`); process.exit(2); }
const [, MA, MI, PA] = parts.map(Number);

let next;
if (asked === 'patch')      next = `${MA}.${MI}.${PA + 1}`;
else if (asked === 'minor') next = `${MA}.${MI + 1}.0`;
else if (asked === 'major') {
  console.error('There is no `major` keyword: 1.0.0 is reserved for "feature complete" and is the '
    + 'maintainer\'s call (CLAUDE.md). Pass the exact number if that is really what is wanted.');
  process.exit(2);
} else next = asked.replace(/^v/, '');

if (!semver.test(next)) { console.error(`"${next}" is not x.y.z`); process.exit(2); }

if (check) {
  if (current === next) { console.log(`system.json is ${current} — matches.`); process.exit(0); }
  console.error(`system.json is ${current}, expected ${next}.`);
  process.exit(1);
}

if (current === next) { console.log(`system.json is already ${next} — nothing to do.`); process.exit(0); }

writeFileSync(FILE, src.replace(line, `$1${next}$3`), 'utf8');
console.log(`system.json ${current} → ${next}`);
console.log('Next, and none of it automatic:');
console.log(`  · node tools/release-notes.mjs ${next}   draft the notes from the commits`);
console.log(`  · npm run preflight -- --version v${next} --e2e`);
console.log('  · commit; then the maintainer tags and pushes.');
