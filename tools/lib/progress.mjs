/**
 * Progress for `tools/preflight.mjs` — turns the "[n/N] …" lines the long gates print into a
 * heartbeat that says how far along a gate is, what it is on, and roughly how long is left.
 *
 * Every long gate already prints one "[n/N] <item>" line as each item STARTS: `tests/run.mjs`
 * (suites), `tests/mutate.mjs` (mutants) and `tests/e2e/progress-reporter.mjs` (Playwright tests).
 * So one parser covers all three, and "the current item" is always the last one seen.
 *
 * Pure — no I/O — so `tests/preflight-progress.test.mjs` can check it without spawning anything.
 */

/** Parse a "[n/N] text" line. `tests/run.mjs` adds a bar and elapsed seconds after the count;
 *  those are dropped, because the heartbeat draws its own. Returns null for any other line. */
export function parseProgress(line) {
  const m = /^\s*\[\s*(\d+)\/(\d+)\]\s*(.*)$/.exec(String(line));
  if (!m) return null;
  const text = m[3].replace(/^[█░]+\s+\d+s\s+/, '').trim();
  return { n: Number(m[1]), total: Number(m[2]), text };
}

/** A fixed-width bar of `done` out of `total`. */
export function bar(done, total, width = 20) {
  const filled = total > 0 ? Math.min(width, Math.round((done / total) * width)) : 0;
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** "45s", "3m 05s". */
export function duration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

/**
 * Seconds left, estimated from the average time of the items already finished. Null until one
 * has finished — before that there is nothing to average. Rough on purpose: e2e tests vary a
 * lot in length, so it is printed with a "~".
 *   startedAt  when the gate began
 *   itemAt     when item `n` began (so items 1..n-1 are done)
 */
export function remainingMs({ n, total, startedAt, itemAt, now }) {
  const done = n - 1;
  if (done < 1) return null;
  const perItem = (itemAt - startedAt) / done;
  return Math.max(0, perItem * (total - done) - (now - itemAt));
}

/**
 * The heartbeat line. Without progress (a gate that prints no "[n/N]" lines) it is just the
 * elapsed time. With it:
 *   … e2e 7m 51s  ████████░░░░░░░░░░░░ 6/14  ~9m 10s left
 *       on: ranged.spec › dodge resolves (for 1m 12s)
 * "for …" is how long the CURRENT item has been going — the number that says whether it hangs.
 */
export function heartbeat({ label, startedAt, now, item }) {
  const head = `    … ${label} ${duration(now - startedAt)}`;
  if (!item) return `${head}  still running`;
  const left = remainingMs({ ...item, startedAt, now });
  return `${head}  ${bar(item.n - 1, item.total)} ${item.n}/${item.total}`
    + (left === null ? '' : `  ~${duration(left)} left`)
    + `\n        on: ${item.text} (for ${duration(now - item.itemAt)})`;
}
