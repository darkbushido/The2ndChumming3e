/**
 * The e2e gate's verdict — turns Playwright's run into a FAIL line that says which tests failed,
 * why, and what to do about it.
 *
 * Reported by the maintainer (2026-10-20): `npm run preflight -- --e2e` failed twice in a row and
 * said only "npx playwright test. A failure that dies in milliseconds usually means a client had
 * not joined yet". The detail line was the regex match "N passed (…)" — so a run with passes AND
 * failures showed no failing test and no error at all, and the one hint guessed at a cause.
 *
 * `tests/e2e/progress-reporter.mjs` prints one `E2E-RESULT {json}` line at the end of the run
 * (every failure with its file, line, duration, first error lines and trace). This module reads
 * it and names the cause from the error text — the fixtures already throw precise messages
 * (a held seat, a stale GM tab, a stale junction); they were simply never shown.
 *
 * Pure — no I/O — so `tests/e2e-summary.test.mjs` checks it without Foundry.
 */

export const MARKER = 'E2E-RESULT ';

/** Strip ANSI colour codes — Playwright colours its error messages. */
export const stripAnsi = s => String(s ?? '').replace(/\u001b\[[0-9;]*m/g, '');

/** The result object from the reporter's line, or null if the run never got that far. */
export function parseE2EResult(out) {
  const line = String(out).split(/\r?\n/).reverse().find(l => l.startsWith(MARKER));
  if (!line) return null;
  try { return JSON.parse(line.slice(MARKER.length)); } catch { return null; }
}

/**
 * Known harness causes, most specific first. Each names what is wrong with the SET-UP rather
 * than the code, and the fix. The first capture group, when there is one, is a user's name.
 */
const CAUSES = [
  { key: 'seat', re: /"([^"]+)" is already connected in another window/,
    fix: u => `Release the "${u}" seat: close any Browser-pane or browser tab joined as ${u}. `
      + 'If none is open, a killed Playwright run can still hold it — close stray Chromium '
      + 'windows or wait ~1 min for Foundry to drop the socket, then re-run.' },
  { key: 'stale-gm', re: /active GM \("([^"]+)"\) is running code|Cannot verify the active GM's code age/,
    fix: u => `Reload ${u ? `${u}'s` : 'the active GM\'s'} Foundry tab (F5), then re-run. `
      + 'GM-routed writes run on that tab, so it must have loaded this working tree.' },
  { key: 'stale-files', re: /Foundry is serving a STALE/,
    fix: () => 'Foundry is not serving this checkout — re-link the junction (the error above has '
      + 'the PowerShell), then re-run.' },
  { key: 'no-foundry', re: /not reachable at|no world appears to be launched|ERR_CONNECTION_REFUSED|ECONNREFUSED/,
    fix: () => 'Foundry stopped or no world is launched — launch test-shadowrun and re-run.' },
  { key: 'no-user', re: /No such user "([^"]+)"/,
    fix: u => `The world has no user "${u}" — is test-shadowrun the world that is launched?` },
  { key: 'not-gm', re: /is role \d+ \(needs 3|is not a GM/,
    fix: () => 'The janitor account is not a GM — fix its role or set FOUNDRY_JANITOR.' },
  { key: 'client-lost', re: /Target page, context or browser has been closed|Execution context was destroyed|browser has disconnected/,
    fix: () => 'A client was closed mid-test (Foundry restarted, or someone took the seat). '
      + 'Re-run before treating it as a code fault.' },
];

/** The harness cause of one failure, or null when the error looks like a real test failure. */
export function classify(message) {
  const msg = stripAnsi(message);
  for (const c of CAUSES) {
    const m = c.re.exec(msg);
    if (m) return { key: c.key, fix: c.fix(m[1] ?? '') };
  }
  return null;
}

/** "1.2s", "350ms". */
const secs = ms => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`);

/** The first meaningful lines of an error — Playwright's message, without its call log. */
export function firstLines(message, n = 2) {
  const out = [];
  for (const raw of stripAnsi(message).split(/\r?\n/)) {
    const l = raw.trim();
    if (/^Call log/.test(l)) break;
    if (l && !/^[=-]+$/.test(l)) out.push(l);
    if (out.length >= n) break;
  }
  return out;
}

/**
 * The FAIL detail and hint for a finished run.
 *   result   what `parseE2EResult` returned (null → the run died before its end)
 *   tailOut  the last lines of output, for the null case
 * Returns { detail, hint } — detail's first line goes in the verdict table, the rest beneath it;
 * the hint may be several lines, one per distinct cause.
 */
export function explainE2E(result, tailOut = '') {
  if (!result) {
    return {
      detail: `Playwright ended without a result (crashed, or timed out)\n${tailOut}`.trimEnd(),
      hint: 'npx playwright test --reporter=list shows where it stopped.',
    };
  }
  const { passed = 0, skipped = 0, flaky = 0, didNotRun = 0, failures = [] } = result;
  const counts = [`${failures.length} failed`, `${passed} passed`,
    flaky && `${flaky} flaky`, skipped && `${skipped} skipped`,
    didNotRun && `${didNotRun} did not run`].filter(Boolean).join(', ');
  if (!failures.length) {
    return { detail: counts,
      hint: 'Nothing failed, yet Playwright exited non-zero — npx playwright test --reporter=list.' };
  }

  // Group by cause: a held seat fails every test in its file the same way, and that is one
  // problem to fix, not twelve bugs.
  const groups = new Map();
  for (const f of failures) {
    const cause = classify(f.error);
    const key = cause ? cause.key : `test:${firstLines(f.error, 1)[0] ?? ''}`;
    if (!groups.has(key)) groups.set(key, { cause, tests: [] });
    groups.get(key).tests.push(f);
  }

  const lines = [counts];
  for (const { tests } of groups.values()) {
    const f = tests[0];
    lines.push(`✗ ${f.file}:${f.line} › ${f.title} (${secs(f.duration ?? 0)})`
      + (tests.length > 1 ? `  — and ${tests.length - 1} more with the same error` : ''));
    for (const l of firstLines(f.error)) lines.push(`    ${l.slice(0, 160)}`);
  }

  const hints = [];
  for (const { cause, tests } of groups.values()) {
    if (cause) { hints.push(cause.fix); continue; }
    const f = tests[0];
    hints.push(`${f.file}:${f.line} looks like a real failure. Re-run it alone: `
      + `npx playwright test ${f.file}:${f.line}`
      + (f.trace ? ` — trace: npx playwright show-trace "${f.trace}"` : ''));
  }
  return { detail: lines.join('\n'), hint: [...new Set(hints)].join('\n') };
}
