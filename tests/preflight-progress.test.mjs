/**
 * Preflight progress — `tools/lib/progress.mjs` and `tests/e2e/progress-reporter.mjs`.
 *
 * Asked for by the maintainer (2026-09-26): "still running (471s)" said the e2e gate was alive
 * but not whether it was hung on a test or how long was left. The heartbeat now shows n/N, a
 * rough time left, and the current item with how long it has been running.
 */
import { readFileSync } from 'node:fs';
import { parseProgress, bar, duration, remainingMs, heartbeat } from '../tools/lib/progress.mjs';
import ProgressReporter from './e2e/progress-reporter.mjs';

export const name = 'preflight-progress';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  /* ── One parser for all three producers ───────────────────────────────────── */
  t.eq('the unit runner\'s line, with its own bar and seconds dropped',
    parseProgress('[ 7/120] ███░░░░░░░░░░░░░░░░░ 12s  initiative'), { n: 7, total: 120, text: 'initiative' });
  t.eq('the mutation checker\'s indented line',
    parseProgress('  [3/41] recoil-no-reset'), { n: 3, total: 41, text: 'recoil-no-reset' });
  t.eq('the Playwright reporter\'s line',
    parseProgress('[2/14] ranged.spec › dodge resolves'), { n: 2, total: 14, text: 'ranged.spec › dodge resolves' });
  t.is('anything else is not progress', parseProgress('  ✓  1 ranged.spec.mjs:12:3 › x (5s)'), null);

  /* ── The pieces of the line ───────────────────────────────────────────────── */
  t.is('bar: half done', bar(5, 10, 10), '█████░░░░░');
  t.is('bar: never overflows', bar(12, 10, 4), '████');
  t.is('bar: an empty total draws empty', bar(0, 0, 4), '░░░░');
  t.is('duration under a minute', duration(45_400), '45s');
  t.is('duration over a minute pads the seconds', duration(185_000), '3m 05s');

  /* ── Time left: from the finished items' average, minus the current one's time ── */
  t.is('no estimate before anything has finished',
    remainingMs({ n: 1, total: 10, startedAt: 0, itemAt: 0, now: 5000 }), null);
  // 4 items done in 40 s → 10 s each; 6 left (including the current) = 60 s, 3 s into it.
  t.is('four done in 40 s, six to go, three seconds into the fifth',
    remainingMs({ n: 5, total: 10, startedAt: 0, itemAt: 40_000, now: 43_000 }), 57_000);
  t.is('never negative when the current item overruns',
    remainingMs({ n: 2, total: 2, startedAt: 0, itemAt: 1000, now: 60_000 }), 0);

  /* ── The heartbeat ────────────────────────────────────────────────────────── */
  t.is('without progress lines it is only the elapsed time',
    heartbeat({ label: 'eslint', startedAt: 0, now: 20_000, item: null }), '    … eslint 20s  still running');
  const hb = heartbeat({ label: 'e2e', startedAt: 0, now: 471_000,
    item: { n: 6, total: 14, text: 'ranged.spec › dodge', itemAt: 400_000 } });
  t.ok('with progress it shows n/N and a time left', /6\/14  ~\d+m \d\ds left/.test(hb), hb);
  t.ok('…and the current item with how long it has run — the hang signal',
    hb.includes('on: ranged.spec › dodge (for 1m 11s)'), hb);

  /* ── The Playwright reporter ──────────────────────────────────────────────── */
  const lines = [];
  const log = console.log;
  console.log = s => lines.push(s);
  try {
    const r = new ProgressReporter();
    r.onBegin({}, { allTests: () => [1, 2] });
    r.onTestBegin({ title: 'dodge resolves', location: { file: '/x/tests/e2e/ranged.spec.mjs' } });
    r.onTestBegin({ title: 'wounds', location: { file: 'C:\\x\\melee.spec.mjs' } });
  } finally { console.log = log; }
  t.eq('the reporter numbers each test as it starts', lines.map(parseProgress).map(p => `${p.n}/${p.total} ${p.text}`),
    ['1/2 ranged.spec › dodge resolves', '2/2 melee.spec › wounds']);

  /* ── Preflight wires it ───────────────────────────────────────────────────── */
  const pre = read('tools/preflight.mjs');
  t.ok('preflight runs Playwright with the progress reporter beside list',
    /--reporter=list,\.\/tests\/e2e\/progress-reporter\.mjs/.test(pre));
  t.ok('…and builds its heartbeat from the shared module', /from '\.\/lib\/progress\.mjs'/.test(pre));
}
