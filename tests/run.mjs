/**
 * Test runner. Discovers every `tests/*.test.mjs`, runs its exported `run(t)`, prints a
 * report and exits non-zero if anything failed.
 *
 *   npm test              run everything
 *   npm test -- initia    run only suites whose filename contains "initia"
 *
 * Each suite runs in its own child process. The system's classes are declared as
 * `extends Item` / `extends Combat` and capture those globals at import time, so suites
 * that need different stubs cannot share one process without leaking into each other.
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const here   = dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2] ?? '';

// A child invocation: run exactly one suite and report via exit code.
if (process.env.SR3E_SUITE) {
  const mod = await import(pathToFileURL(process.env.SR3E_SUITE).href);

  // ── Mutation mode (see tests/mutate.mjs) ──────────────────────────────────
  //
  // Applied AFTER the suite module is imported, never before: importing a script module
  // on its own would run it without the Foundry stubs the suite installs at its top, and
  // it would throw. By this point the module is in the ESM cache, so importing it again
  // hands back the very object the suite is calling through.
  if (process.env.SR3E_MUTANT) {
    const { MUTANTS } = await import('./mutants.mjs');
    const m = MUTANTS.find(x => x.id === process.env.SR3E_MUTANT);
    if (!m) { console.error(`unknown mutant "${process.env.SR3E_MUTANT}"`); process.exit(2); }
    const target = (await import(m.module))[m.klass];
    if (typeof target?.[m.method] !== 'function') {
      console.error(`mutant ${m.id}: ${m.klass}.${m.method} is not a function`);
      process.exit(2);
    }
    // Some mutants are the real rule with one option forced, so keep the original reachable.
    if (m.needsOriginal) target[m.needsOriginal] = target[m.method].bind(target);
    target[m.method] = m.impl;
  }

  const { createSuite } = await import('./helpers/assert.mjs');
  const t = createSuite(mod.name ?? 'suite');
  await mod.run(t);
  for (const r of t.results) {
    console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.label}`);
    if (!r.ok && r.detail) console.log(`          ${r.detail}`);
  }
  const failed = t.results.filter(r => !r.ok).length;
  console.log(`  ${t.results.length - failed}/${t.results.length} passed`);
  process.exit(failed ? 1 : 0);
}

const suites = readdirSync(here)
  .filter(f => f.endsWith('.test.mjs'))
  .filter(f => !filter || f.includes(filter))
  .sort();

if (!suites.length) {
  console.error(filter ? `No suites match "${filter}".` : 'No suites found.');
  process.exit(1);
}

let failedSuites = 0;
for (const file of suites) {
  console.log(`\n${file.replace('.test.mjs', '')}`);
  const res = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    stdio: 'inherit',
    env: { ...process.env, SR3E_SUITE: join(here, file) },
  });
  if (res.status !== 0) failedSuites++;
}

console.log(`\n${suites.length - failedSuites}/${suites.length} suites passed`);
process.exit(failedSuites ? 1 : 0);
