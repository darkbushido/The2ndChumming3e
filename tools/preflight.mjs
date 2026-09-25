/**
 * Release preflight — every mechanical check, in one command, with one verdict.
 *
 *   npm run preflight                    everything that does not need Foundry
 *   npm run preflight -- --e2e           …and the Playwright suite (Foundry must be RUNNING)
 *   npm run preflight -- --version v0.6.0  …and the version/tag/release-notes gates
 *   npm run preflight -- --fast          skip the slow gates (mutants, guides, e2e)
 *
 * ⚠ **This exists so verification is cheap and repeatable.** It is written to be run by an agent
 * that has no context about this project: every gate either passes, or prints what to do next in
 * plain words. Nothing here needs judgement, so nothing here needs an expensive model.
 *
 * ⚠ **WHAT IT DELIBERATELY DOES NOT DO — TODO 121.** The maintainer's standing rule is that every
 * version bump checks the code's rules against `guides/`, with **the PDFs as the authority**, and
 * that every difference is quoted with its printed page and brought to the maintainer rather than
 * settled by picking a side. That is a reading task with a human in the loop. This script only
 * checks that the audit was **recorded** for the version being cut (`audit/rules-check-<version>.md`);
 * it cannot and must not perform it. An agent that "does TODO 121" by skimming is worse than one
 * that skips it, because the record then claims a check that never happened.
 *
 * ⚠ **It changes nothing.** No writes, no commits, no tags, no pushes — the maintainer publishes.
 * `--version` only *compares*; `tools/bump-version.mjs` is the thing that writes.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const has = f => args.includes(f);
const valueOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const FAST    = has('--fast');
const WANT_E2E = has('--e2e');
const VERSION = valueOf('--version');

const results = [];
const record = (name, ok, detail = '', hint = '') => {
  results.push({ name, ok, detail, hint });
  end(ok);
  return ok;
};

/* Progress — so a long gate is visibly working, not frozen. `begin` announces a gate and a
   heartbeat re-prints the elapsed time every 10 s until `record` closes it. Progress goes to
   stderr-free stdout lines only; the verdict block at the end is unchanged. */
let gate = null, beat = null, gateNo = 0;
function begin(label) {
  gate = { label, t: Date.now() };
  gateNo++;
  console.log(`▶ [${gateNo}] ${label} …`);
  clearInterval(beat);
  beat = setInterval(() => {
    console.log(`    … ${label} still running (${Math.round((Date.now() - gate.t) / 1000)}s)`);
  }, 10_000);
  beat.unref();
}
function end(ok) {
  clearInterval(beat);
  if (!gate) return;
  console.log(`  ${ok ? '✓' : '✗'} ${gate.label} — ${Math.round((Date.now() - gate.t) / 1000)}s`);
  gate = null;
}

/** Run a command, capturing output. Never throws — a failure is a result, not a crash.
 *  Async (spawn, not execFileSync) so the heartbeat timer can fire while a gate runs. */
function run(cmd, cmdArgs, opts = {}) {
  const { timeout = 15 * 60_000 } = opts;
  return new Promise(resolve => {
    let out = '', timedOut = false;
    // ⚠ `shell` only for a real shell script (bundle). Node 24 on Windows refuses to spawn a
    // `.cmd` without it (EINVAL), and passing `shell: true` concatenates arguments unescaped
    // (DEP0190) — so everything else is invoked as node against a JS entry point instead, which
    // needs neither. That is also one fewer process than going through `npm run`.
    const child = spawn(cmd, cmdArgs, {
      cwd: opts.cwd ?? ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: !!opts.shell,
    });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeout);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('error', err => { clearTimeout(timer); resolve({ ok: false, out: out || String(err.message ?? err) }); });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ ok: code === 0 && !timedOut, out: timedOut ? `${out}
timed out after ${timeout / 1000}s` : out });
    });
  });
}

const node = (...a) => run('node', a);
/** A dependency's own JS entry point — see the note in `run` about `.cmd` shims. */
const bin  = (rel, ...a) => node(path.join(ROOT, 'node_modules', rel), ...a);
/** The last few non-empty lines — enough to see the verdict without pasting a whole suite. */
const tail = (s, n = 6) => String(s).split(/\r?\n/).filter(l => l.trim()).slice(-n).join('\n');

/* ── 1. Syntax and style ───────────────────────────────────────────────────────
   ⚠ `node --check` is useless on this codebase (see CLAUDE.md) — ESLint is the only
   thing that catches a broken string in a sheet, because sheets cannot be imported. */
{
  begin('eslint');
  const r = await bin('eslint/bin/eslint.js', 'scripts', 'tests', 'tools');
  record('eslint', r.ok, r.ok ? 'scripts, tests, tools parse and pass'
    : tail(r.out, 12), 'npm run lint:fix, or fix by hand.');
}

/* ── 2. The unit and source-level suites ─────────────────────────────────────── */
{
  begin('unit + source suites');
  const r = await node('tests/run.mjs');
  const m = r.out.match(/(\d+)\/(\d+) suites passed/);
  record('unit + source suites', r.ok, m ? m[0] : tail(r.out, 12), 'node tests/run.mjs');
}

/* ── 3. Mutants — every one must be killed ───────────────────────────────────── */
if (!FAST) {
  begin('mutants (slow — every rule is broken on purpose)');
  const r = await node('tests/mutate.mjs');
  const m = r.out.match(/(\d+)\/(\d+) mutants killed/);
  record('mutants', r.ok, m ? m[0] : tail(r.out, 12),
    'A surviving mutant means a rule has no test. node tests/mutate.mjs names it.');
} else record('mutants', true, 'skipped (--fast)');

/* ── 4. The work list ────────────────────────────────────────────────────────── */
{
  begin('TODO.md');
  const r = await node('tools/todo-archive.mjs', '--check');
  record('TODO.md', r.ok, r.ok ? 'numbers unique, no ✅ left open, table current' : tail(r.out, 10),
    'npm run todo:archive rewrites it — never edit the Contents table by hand.');
}

/* ── 5. Packs: source of truth, integrity, and no churn ──────────────────────── */
{
  begin('packs match packs-src');
  const r = await node('tools/packs.mjs', 'check');
  record('packs match packs-src', r.ok, r.ok ? 'every pack rebuilds from source' : tail(r.out, 10),
    'npm run packs:build (then --install), or npm run packs:extract if a tool wrote a pack.');
}
{
  begin('pack integrity');
  const r = await node('tools/check-packs.mjs', '--repo');
  record('pack integrity', r.ok, r.ok ? 'no null _ids, key/_id disagreement or duplicates' : tail(r.out, 10),
    'npm run packs:check:repo lists the faults. Foundry must be CLOSED even to read.');
}

/* ── 6. The branch manifest ──────────────────────────────────────────────────── */
{
  begin('manifest URLs');
  const r = await node('tools/manifest-branch.mjs', '--check');
  record('manifest URLs', r.ok, r.ok ? 'url/manifest/download name this branch' : tail(r.out, 8),
    'npm run manifest:branch, then commit it. ⚠ Never commit RELEASE urls.');
}

/* ── 7. The guides site: it must build, and its links must resolve ───────────── */
if (!FAST) {
  const guides = path.join(ROOT, 'guides');
  if (!existsSync(guides)) record('guides', true, 'no guides/ in this checkout — skipped');
  else {
    begin('guides build (jekyll)');
    const build = await run('bundle', ['exec', 'jekyll', 'build'], { timeout: 10 * 60_000, shell: true, cwd: guides });
    if (!build.ok) {
      record('guides build', false, tail(build.out, 12),
        'cd guides && bundle install, then bundle exec jekyll build.');
    } else {
      record('guides build', true, 'jekyll build succeeded');
      // ⚠ From Git Bash the baseurl must not be path-converted — pass it via the env the
      // checker already understands rather than as a bare "/..." argument.
      begin('guides links');
      const lc = await run('node', ['tools/linkcheck.mjs', '_site'], { timeout: 5 * 60_000, cwd: guides });
      record('guides links', lc.ok, lc.ok ? tail(lc.out, 2) : tail(lc.out, 12),
        'Every internal href and #anchor must resolve. The output names each bad link.');
    }
  }
} else record('guides', true, 'skipped (--fast)');

/* ── 8. Playwright — needs a RUNNING Foundry with the test world loaded ──────── */
if (WANT_E2E && !FAST) {
  begin('e2e (Playwright — several minutes)');
  const up = await fetch('http://localhost:30000', { method: 'GET' })
    .then(r => r.ok || r.status < 500).catch(() => false);
  if (!up) {
    record('e2e (Playwright)', false, 'nothing answering on http://localhost:30000',
      'Start Foundry and load the test-shadowrun world, then re-run with --e2e. '
      + '⚠ Release the seats first: the suite joins as Player2, Player3 and mcp-api, so close '
      + 'any Browser-pane session holding one of them.');
  } else {
    const r = await run('node', [path.join(ROOT, 'node_modules/@playwright/test/cli.js'), 'test'],
      { timeout: 30 * 60_000 });
    const m = r.out.match(/(\d+) passed[^\n]*/);
    record('e2e (Playwright)', r.ok, m ? m[0] : tail(r.out, 14),
      'npx playwright test. A failure that dies in milliseconds usually means a client had not '
      + 'joined yet — re-run alone before treating it as a code fault.');
  }
} else record('e2e (Playwright)', true, WANT_E2E ? 'skipped (--fast)' : 'not requested (pass --e2e)');

/* ── 9. Version, tag and release notes — only when cutting a release ─────────── */
if (VERSION) {
  const tag  = VERSION.startsWith('v') ? VERSION : `v${VERSION}`;
  const bare = tag.slice(1);
  const manifest = JSON.parse(readFileSync(path.join(ROOT, 'system.json'), 'utf8'));

  record('system.json version', manifest.version === bare,
    `system.json ${manifest.version}, asked for ${bare}`,
    `node tools/bump-version.mjs ${bare} — the release workflow REFUSES a mismatched tag.`);

  begin('release:check');
  const r = await run('node', ['tools/release.mjs', tag, '--check']);
  record('release:check', r.ok, r.ok ? 'every path the manifest loads would ship' : tail(r.out, 10),
    'A new top-level folder the system loads must be added to RELEASE_FILES in tools/release.mjs.');

  const notes = path.join(ROOT, 'RELEASE-NOTES.md');
  if (!existsSync(notes)) {
    record('release notes', false, 'RELEASE-NOTES.md does not exist',
      `node tools/release-notes.mjs ${bare} drafts it from the commits since the last tag.`);
  } else {
    const body = readFileSync(notes, 'utf8');
    const heading = new RegExp(`^##\\s+v?${bare.replace(/\./g, '\\.')}\\b`, 'm');
    record('release notes', heading.test(body), heading.test(body)
      ? `RELEASE-NOTES.md has a section for ${bare}`
      : `RELEASE-NOTES.md has no "## ${bare}" section`,
      `node tools/release-notes.mjs ${bare} drafts one. ⚠ The draft is a starting point — a human `
      + 'decides what the players actually need told.');
  }

  // ⚠ TODO 121 — recorded, never performed here. See the header.
  //
  // ⚠ **Presence is not completeness, and the gate must not imply it is.** The 0.6.0 record opens
  // "Status: first pass, not exhaustive" and lists whole sections of guides/ it never read — and a
  // bare PASS beside that would be the gate quietly blessing a partial audit. The script cannot
  // judge an audit, but it can refuse to hide what the audit says about itself, so the record's own
  // status line is printed at release time for a human to weigh.
  const audit = path.join(ROOT, 'audit', `rules-check-${bare}.md`);
  const auditText = existsSync(audit) ? readFileSync(audit, 'utf8') : '';
  const statusLine = auditText.split(/\r?\n/).find(l => /^\s*\*\*Status[: ]/i.test(l))
    ?? auditText.split(/\r?\n/).find(l => l.trim() && !l.startsWith('#'))
    ?? '';
  const partial = /first pass|not exhaustive|incomplete|were not (checked|covered)/i.test(auditText);
  if (existsSync(audit)) {
    console.log(`      rules-check record says: ${statusLine.replace(/\*\*/g, '').trim().slice(0, 100)}`);
    if (partial) {
      console.log('      \u26a0 That record describes itself as a PARTIAL pass. Read it before tagging —'
        + ' this gate proves a person looked, not that they finished.');
    }
  }
  record('rules check vs guides (TODO 121)', existsSync(audit),
    existsSync(audit) ? `audit/rules-check-${bare}.md is present${partial ? ' (self-described as PARTIAL — see above)' : ''}`
      : `audit/rules-check-${bare}.md is missing`,
    '⚠ NOT a task for this script or for a cheap agent. It is a reading task: the code\'s rules '
    + 'against guides/, with the PDFs as the authority, every difference quoted with its printed '
    + 'page and taken to the maintainer. Write the record only after actually doing it.');

  begin('working tree clean');
  const dirty = await run('git', ['status', '--porcelain']);
  record('working tree clean', dirty.ok && !dirty.out.trim(),
    dirty.out.trim() ? tail(dirty.out, 8) : 'nothing uncommitted',
    'Commit or revert before tagging, so the tag names exactly what was verified.');
} else {
  record('version / notes / rules check', true, 'not requested (pass --version v0.6.0)');
}

/* ── Verdict ─────────────────────────────────────────────────────────────────── */
const failed = results.filter(r => !r.ok);
const width  = Math.max(...results.map(r => r.name.length));
console.log('\nRelease preflight\n' + '─'.repeat(60));
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(width)}  ${r.detail.split('\n')[0]}`);
  if (!r.ok) {
    for (const line of r.detail.split('\n').slice(1)) console.log(`        │ ${line}`);
    if (r.hint) console.log(`        → ${r.hint}`);
  }
}
console.log('─'.repeat(60));
if (failed.length) {
  console.log(`${failed.length} of ${results.length} gates FAILED: ${failed.map(f => f.name).join(', ')}`);
  console.log('Nothing was changed. Fix the gates above and run it again.');
  process.exit(1);
}
console.log(`all ${results.length} gates passed.`);
if (VERSION) {
  console.log('\n⚠ Still the maintainer\'s, and not this script\'s:');
  console.log('  · the TODO 121 rules check itself (the gate only proves a record exists)');
  console.log('  · reading the release notes and deciding they say the right thing');
  console.log('  · git tag, and git push — the maintainer publishes.');
}
