/**
 * A tiny assertion harness. Deliberately dependency-free: the system ships no
 * devDependencies and a test runner should not be the first one.
 *
 * A suite file exports `run(t)` and calls t.is / t.eq / t.ok. The runner collects the
 * results and sets the process exit code.
 */
export function createSuite(name) {
  const results = [];
  const record = (ok, label, detail) => { results.push({ ok, label, detail }); return ok; };

  const fmt = v => {
    try { return JSON.stringify(v); } catch { return String(v); }
  };

  return {
    name,
    results,

    /** Strict equality. */
    is(label, actual, expected) {
      return record(Object.is(actual, expected), label,
        Object.is(actual, expected) ? null : `got ${fmt(actual)}, want ${fmt(expected)}`);
    },

    /** Deep equality by JSON shape — enough for the plain data these tests deal in. */
    eq(label, actual, expected) {
      const ok = fmt(actual) === fmt(expected);
      return record(ok, label, ok ? null : `got ${fmt(actual)}, want ${fmt(expected)}`);
    },

    /** Truthiness, for conditions that do not reduce to a value comparison. */
    ok(label, condition, detail = 'expected truthy') {
      return record(!!condition, label, condition ? null : detail);
    },

    /** Assert the callback throws. */
    async throws(label, fn) {
      try { await fn(); return record(false, label, 'expected a throw, got none'); }
      catch { return record(true, label, null); }
    },
  };
}
