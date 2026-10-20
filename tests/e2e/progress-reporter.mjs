/**
 * A Playwright reporter that prints one "[n/N] <file> › <title>" line as each test STARTS, and
 * one `E2E-RESULT {json}` line when the run ends. Results stay with `list`, which runs beside it.
 *
 * Why: the `list` reporter only prints a test once it has FINISHED when its output is piped
 * (it draws the running test only on a real terminal), so `npm run preflight -- --e2e` could
 * say nothing about which test it was on. `tools/preflight.mjs` adds this reporter beside
 * `list` and reads the "[n/N]" lines through `tools/lib/progress.mjs`, the same way it reads
 * the unit runner and the mutation checker.
 *
 * The end line carries every failure (file, line, duration, error, trace) for
 * `tools/lib/e2e-summary.mjs`, so the preflight's FAIL line names the failing tests and the
 * fixture's own error instead of only "N passed".
 *
 *   npx playwright test --reporter=list,./tests/e2e/progress-reporter.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKER, stripAnsi } from '../../tools/lib/e2e-summary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export default class ProgressReporter {
  total = 0;
  started = 0;
  /** test → its last result; a retry overwrites the attempt before it. */
  ended = new Map();
  suite = null;

  onBegin(_config, suite) {
    this.suite = suite;
    this.total = suite.allTests().length;
  }

  onTestBegin(test) {
    this.started++;
    console.log(`[${this.started}/${this.total}] ${test.location.file.split(/[\\/]/).pop().replace(/\.mjs$/, '')} › ${test.title}`);
  }

  onTestEnd(test, result) {
    this.ended.set(test, result);
  }

  onEnd() {
    console.log(MARKER + JSON.stringify(summarise(this.suite?.allTests() ?? [], this.ended)));
  }

  // It writes to stdout; tell Playwright so it does not add its own default reporter.
  printsToStdio() { return true; }
}

/** The run as plain data — what `tools/lib/e2e-summary.mjs` reads back. */
export function summarise(tests, ended) {
  const out = { passed: 0, skipped: 0, flaky: 0, didNotRun: 0, failures: [] };
  for (const test of tests) {
    const result = ended.get(test);
    if (!result) { out.didNotRun++; continue; }
    const outcome = test.outcome();
    if (outcome === 'expected') out.passed++;
    else if (outcome === 'skipped') out.skipped++;
    else if (outcome === 'flaky') out.flaky++;
    else {
      const err = result.errors?.[0] ?? result.error ?? {};
      const trace = result.attachments?.find(a => a.name === 'trace')?.path;
      out.failures.push({
        file: path.relative(ROOT, test.location.file).replace(/\\/g, '/'),
        line: test.location.line,
        title: test.title,
        status: result.status,
        duration: result.duration,
        error: stripAnsi(err.message ?? err.value ?? result.status).slice(0, 2000),
        trace: trace ? path.relative(ROOT, trace) : null,
      });
    }
  }
  return out;
}
