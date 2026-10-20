/**
 * The e2e gate's FAIL message — `tools/lib/e2e-summary.mjs` and the end line of
 * `tests/e2e/progress-reporter.mjs`.
 *
 * Reported by the maintainer (2026-10-20): preflight --e2e failed twice and said only "N passed"
 * plus a fixed guess. A failing run must name its failing tests, show their error, and say what
 * to do — telling a set-up problem (held seat, stale GM tab) from a real failure.
 */
import { readFileSync } from 'node:fs';
import { parseE2EResult, explainE2E, classify, firstLines, MARKER } from '../tools/lib/e2e-summary.mjs';
import { summarise } from './e2e/progress-reporter.mjs';

export const name = 'e2e-summary';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const fail = (title, error, extra = {}) => ({
  file: 'tests/e2e/melee-two-corner.spec.mjs', line: 40, title, status: 'failed',
  duration: 310, error, trace: null, ...extra,
});

export async function run(t) {
  /* ── Reading the reporter's line ──────────────────────────────────────────── */
  const out = `[1/2] x › a\n  ✓ 1 a\n${MARKER}{"passed":1,"failures":[]}\n  1 passed (3s)`;
  t.eq('the result line is found among the list output', parseE2EResult(out), { passed: 1, failures: [] });
  t.is('no line → null (the run died first)', parseE2EResult('  ✘ 1 a\n  1 failed'), null);
  t.is('a truncated line → null, not a throw', parseE2EResult(`${MARKER}{"passed":`), null);

  /* ── Causes ───────────────────────────────────────────────────────────────── */
  const seat = classify('Error: "Player3" is already connected in another window — Foundry refuses…');
  t.is('a held seat is named', seat?.key, 'seat');
  t.ok('…with the user in the fix', /Release the "Player3" seat/.test(seat?.fix ?? ''), seat?.fix);
  const gm = classify('Error: The active GM ("Gamemaster") is running code about 12 minute(s) older');
  t.is('a stale GM tab', gm?.key, 'stale-gm');
  t.ok('…says whose tab to reload', /Reload Gamemaster's Foundry tab/.test(gm?.fix ?? ''), gm?.fix);
  t.is('the GM that cannot answer is the same cause',
    classify("Cannot verify the active GM's code age: no active GM is connected.")?.key, 'stale-gm');
  t.is('a stale junction', classify('Foundry is serving a STALE scripts/sr3e.js')?.key, 'stale-files');
  t.is('Foundry down', classify('page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:30000/')?.key, 'no-foundry');
  t.is('a lost client', classify('page.evaluate: Target page, context or browser has been closed')?.key, 'client-lost');
  t.is('ANSI colour does not hide a cause',
    classify('\u001b[31mError: "Player2" is already connected in another window\u001b[39m')?.key, 'seat');
  t.is('an assertion is a real failure, not a harness cause',
    classify('Error: expect(received).toBe(expected)\nExpected: 3\nReceived: 0'), null);

  t.eq('firstLines stops at the call log',
    firstLines('Error: timed out\n\nCall log:\n  - waiting for locator', 3), ['Error: timed out']);

  /* ── The verdict ──────────────────────────────────────────────────────────── */
  const seatErr = 'Error: "Player3" is already connected in another window — Close it and re-run.';
  const many = explainE2E({ passed: 9, didNotRun: 2, failures: [
    fail('both corners submit', seatErr), fail('GM resolves', seatErr), fail('drafts survive', seatErr),
  ] });
  t.is('the first line counts failures, passes and what never ran',
    many.detail.split('\n')[0], '3 failed, 9 passed, 2 did not run');
  t.ok('the failing test is named with file:line and duration',
    many.detail.includes('✗ tests/e2e/melee-two-corner.spec.mjs:40 › both corners submit (310ms)'), many.detail);
  t.ok('three failures with one cause are ONE entry', /and 2 more with the same error/.test(many.detail)
    && many.detail.split('\n').filter(l => l.startsWith('✗')).length === 1, many.detail);
  t.ok('the fixture\'s own error is shown', many.detail.includes('"Player3" is already connected'), many.detail);
  t.ok('the hint is the fix, not a guess', /^Release the "Player3" seat/.test(many.hint), many.hint);

  const real = explainE2E({ passed: 5, failures: [fail('wounds land', 'Error: expect(received).toBe(expected)\nExpected: 3',
    { file: 'tests/e2e/ranged.spec.mjs', line: 88, duration: 4200, trace: 'test-results/x/trace.zip' })] });
  t.ok('a real failure says re-run it alone, with the exact command',
    real.hint.includes('npx playwright test tests/e2e/ranged.spec.mjs:88'), real.hint);
  t.ok('…and where its trace is', real.hint.includes('show-trace "test-results/x/trace.zip"'), real.hint);

  const mixed = explainE2E({ passed: 0, failures: [fail('a', seatErr), fail('b', 'Error: expect(x).toBe(y)')] });
  t.is('two different causes → two hint lines', mixed.hint.split('\n').length, 2);

  const dead = explainE2E(null, 'Error: worker crashed');
  t.ok('no result says so, and keeps the tail', /without a result/.test(dead.detail)
    && dead.detail.includes('worker crashed'), dead.detail);

  /* ── The reporter's data ──────────────────────────────────────────────────── */
  const mk = (title, outcome, line = 1) => ({ title, outcome: () => outcome,
    location: { file: `${process.cwd()}/tests/e2e/ranged.spec.mjs`, line } });
  const a = mk('ok', 'expected'), b = mk('bad', 'unexpected', 12), c = mk('never', 'skipped'), d = mk('skip', 'skipped');
  const ended = new Map([[a, { status: 'passed', duration: 10 }],
    [b, { status: 'timedOut', duration: 120000, errors: [{ message: '\u001b[31mTest timeout of 120000ms exceeded.\u001b[39m' }] }],
    [d, { status: 'skipped', duration: 0 }]]);
  const s = summarise([a, b, c, d], ended);
  t.eq('counts', [s.passed, s.skipped, s.didNotRun, s.failures.length], [1, 1, 1, 1]);
  t.is('a failure carries its uncoloured error', s.failures[0].error, 'Test timeout of 120000ms exceeded.');
  t.is('…and its line', s.failures[0].line, 12);

  /* ── Preflight uses it ────────────────────────────────────────────────────── */
  const pre = read('tools/preflight.mjs');
  t.ok('preflight explains a failed run through e2e-summary',
    /explainE2E\(parseE2EResult\(r\.out\)/.test(pre));
  t.ok('…and no longer reports a failed run by its "N passed" count alone',
    !/record\('e2e \(Playwright\)', r\.ok, m \? m\[0\]/.test(pre));
  t.ok('a multi-line hint prints one arrow per line', /r\.hint\.split\('\\n'\)/.test(pre));
}
