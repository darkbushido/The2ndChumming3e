/**
 * The release preflight and its two writers — `tools/preflight.mjs`, `tools/bump-version.mjs`,
 * `tools/release-notes.mjs`.
 *
 * ⚠ **What this suite is really protecting is a PROMISE, not an algorithm.** The preflight exists so
 * a cheap agent can verify a build without judgement, and the whole value of that rests on two
 * things staying true: it changes nothing, and it never claims the TODO 121 rules check was done.
 * Both are easy to erode with a well-meant edit — "why not run `bundle install` for them", "why not
 * write the audit stub so the gate goes green" — and neither erosion would fail any other test.
 *
 * ⚠ **The version rule is the maintainer's** (CLAUDE.md): a bug fix bumps the patch, a feature the
 * minor, and **1.0.0 is reserved for "feature complete", which the maintainer calls**. That is why
 * `bump-version.mjs` has no `major` keyword, and why that absence is asserted rather than left to
 * be noticed.
 */
import { readFileSync } from 'node:fs';

export const name = 'preflight';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const pre   = read('tools/preflight.mjs');
  const bump  = read('tools/bump-version.mjs');
  const notes = read('tools/release-notes.mjs');
  const pkg   = JSON.parse(read('package.json'));

  /* ── It must stay runnable as one command ──────────────────────────────────── */
  t.eq('the entry points are npm scripts, so nobody has to remember a path',
    ['preflight', 'version:bump', 'version:check', 'release:notes'].map(k => !!pkg.scripts[k]),
    [true, true, true, true]);

  /* ── It changes nothing ────────────────────────────────────────────────────── */
  // The one import that could write is `node:fs`, and it may take only readers.
  const fsImport = pre.match(/import \{([^}]*)\} from 'node:fs'/)?.[1] ?? '';
  t.eq('preflight imports no fs writer — it is a verifier, not a fixer',
    fsImport.split(',').map(s => s.trim()).filter(Boolean).sort(), ['existsSync', 'readFileSync']);
  // The precise form: every `git` invocation must be a read. Grepping the file for "commit" or
  // "tag" cannot work — both appear legitimately, in the prose and in `const tag`.
  const gitCalls = [...pre.matchAll(/run\('git',\s*\[([^\]]*)\]/g)].map(m => m[1].replace(/['\s]/g, ''));
  t.eq('the only git it runs is a read of the working tree', gitCalls, ['status,--porcelain']);

  /* ── TODO 121 is recorded, never performed ─────────────────────────────────── */
  t.ok('the rules-check gate only looks for the audit FILE',
    /existsSync\(audit\)/.test(pre) && /rules-check-\$\{bare\}\.md/.test(pre));
  t.ok('…and says outright that it must not be done by this script or a cheap agent',
    /NOT a task for this script or for a cheap agent/.test(pre));
  t.ok('…naming the PDFs as the authority, per the maintainer\'s standing rule',
    /PDFs as the authority/.test(pre));
  t.ok('the skill repeats it, because that is the file an agent actually reads',
    /Do not perform the TODO 121 rules check/.test(read('.claude/skills/verify-build/SKILL.md')));

  /* ── Every gate that can fail must say what to do next ─────────────────────── */
  const calls = [...pre.matchAll(/record\(\s*'([^']+)'/g)].map(m => m[1]);
  t.ok('every gate is named once', new Set(calls).size >= 9);
  t.ok('a failing gate prints its hint', /if \(r\.hint\) console\.log/.test(pre));
  t.ok('and the process exits non-zero, so a caller cannot miss it', /process\.exit\(1\)/.test(pre));

  /* ── Windows: neither a .cmd shim nor an unescaped shell ───────────────────── */
  // ⚠ Node 24 refuses to execFile a `.cmd` (EINVAL) and `shell: true` concatenates arguments
  // unescaped (DEP0190). Both were hit while building this; the fix is to invoke JS entry points.
  t.ok('no npm/npx shim is spawned', !/'(npm|npx)(\.cmd)?'/.test(pre));
  t.ok('…the shell is used only where a real shell script needs it', /shell: !!opts\.shell/.test(pre));
  t.ok('…and eslint and playwright are invoked as node against their own entry points',
    /eslint\/bin\/eslint\.js/.test(pre) && /@playwright\/test\/cli\.js/.test(pre));

  /* ── bump-version ──────────────────────────────────────────────────────────── */
  t.ok('it rewrites one line, never the parsed manifest — a round-trip would reformat ~1900 lines',
    !/JSON\.stringify/.test(bump) && /replace\(line,/.test(bump));
  t.ok('patch and minor follow the maintainer\'s rule', /'patch'/.test(bump) && /'minor'/.test(bump));
  t.ok('…and there is NO major keyword: 1.0.0 is the maintainer\'s call',
    /There is no `major` keyword/.test(bump));
  t.ok('it does not commit or tag either', !/execFileSync|spawn/.test(bump));

  /* ── release-notes ─────────────────────────────────────────────────────────── */
  t.ok('an unmatched commit subject lands in Other rather than being dropped',
    /buckets\.other\.push\(c\)/.test(notes));
  t.ok('the draft says it is a draft, in the file it writes', /⚠ DRAFT/.test(notes));
  t.ok('…and asks for the book and printed page on anything that changes a rule',
    /cite the book and printed\s*\n?\s*\*? ?page/.test(notes) || /book and printed/.test(notes));
  t.ok('it refuses to overwrite a section that already exists',
    /already has a "## \$\{version\}" section — not touching it/.test(notes));
  t.ok('it writes only RELEASE-NOTES.md', (notes.match(/writeFileSync\(/g) ?? []).length === 2
    && !/writeFileSync\((?!FILE)/.test(notes));
}
