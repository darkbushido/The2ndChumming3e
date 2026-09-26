/**
 * A Playwright reporter that prints one "[n/N] <file> › <title>" line as each test STARTS.
 * Results stay with `list`, which runs beside it.
 *
 * Why: the `list` reporter only prints a test once it has FINISHED when its output is piped
 * (it draws the running test only on a real terminal), so `npm run preflight -- --e2e` could
 * say nothing about which test it was on. `tools/preflight.mjs` adds this reporter beside
 * `list` and reads the "[n/N]" lines through `tools/lib/progress.mjs`, the same way it reads
 * the unit runner and the mutation checker.
 *
 *   npx playwright test --reporter=list,./tests/e2e/progress-reporter.mjs
 */
export default class ProgressReporter {
  total = 0;
  started = 0;

  onBegin(_config, suite) {
    this.total = suite.allTests().length;
  }

  onTestBegin(test) {
    this.started++;
    console.log(`[${this.started}/${this.total}] ${test.location.file.split(/[\\/]/).pop().replace(/\.mjs$/, '')} › ${test.title}`);
  }

  // It writes to stdout; tell Playwright so it does not add its own default reporter.
  printsToStdio() { return true; }
}
