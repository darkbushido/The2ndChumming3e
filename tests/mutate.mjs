/**
 * Mutation check — prove the suites can FAIL.
 *
 *   npm run test:mutate            every mutant
 *   npm run test:mutate -- recoil  only mutants whose id contains "recoil"
 *
 * For each entry in `tests/mutants.mjs` this reinstates a bug the project actually shipped
 * and runs the suite that is supposed to catch it. The suite MUST go red. A mutant that
 * survives means that rule is not really covered — the green tick was measuring nothing.
 *
 * ⚠ Read the result the right way round. Here, a suite FAILING is the pass condition. The
 * summary reports "killed" (good) and "SURVIVED" (bad), never "passed", precisely so the
 * output cannot be skimmed as if it were an ordinary test run.
 *
 * This is deliberately not a coverage tool. It answers one narrow question per rule — "if
 * this were wrong in the specific way it once was, would we know?" — which is the question
 * the two near-misses in this project turned on.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { MUTANTS } from './mutants.mjs';

const here   = dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2] ?? '';
const chosen = MUTANTS.filter(m => !filter || m.id.includes(filter) || m.suite.includes(filter));

if (!chosen.length) {
  console.error(filter ? `No mutants match "${filter}".` : 'No mutants defined.');
  process.exit(1);
}

console.log(`Mutation check — ${chosen.length} mutant(s). A suite going RED is the pass condition.\n`);

const survivors = [];
const broken    = [];

for (const m of chosen) {
  process.stdout.write(`  ${m.id}\n    ${m.klass}.${m.method} → ${m.was}\n`);

  const res = spawnSync(process.execPath, [join(here, 'run.mjs'), m.suite], {
    // Swallow the suite's own output: it is EXPECTED to be full of failures, and printing
    // it makes a healthy run look like a catastrophe.
    stdio: ['ignore', 'pipe', 'pipe'],
    env:   { ...process.env, SR3E_MUTANT: m.id },
    encoding: 'utf8',
  });

  // Exit 2 is the harness itself failing (unknown mutant, renamed method) — a different
  // problem from a surviving mutant, and it must not be reported as one.
  if (res.status === 2) {
    broken.push(m);
    console.log(`    ⚠ HARNESS ERROR — ${(res.stderr || '').trim().split('\n')[0]}\n`);
    continue;
  }

  if (res.status === 0) {
    survivors.push(m);
    console.log(`    ✗ SURVIVED — "${m.suite}" still passed with this bug reinstated\n`);
  } else {
    const killed = (res.stdout.match(/^ +FAIL/gm) || []).length;
    console.log(`    ✓ killed by "${m.suite}" (${killed} assertion${killed === 1 ? '' : 's'} caught it)\n`);
  }
}

const bad = survivors.length + broken.length;
console.log(`${chosen.length - bad}/${chosen.length} mutants killed`);

if (broken.length) {
  console.log('\nHARNESS ERRORS — the mutant could not be applied at all:');
  for (const m of broken) console.log(`  • ${m.id} (${m.klass}.${m.method})`);
  console.log('  Usually a renamed or removed method. Update tests/mutants.mjs.');
}

if (survivors.length) {
  console.log('\nSURVIVORS — these rules are NOT covered by their suite:');
  for (const m of survivors) {
    console.log(`  • ${m.id}\n      ${m.was}\n      add an assertion to "${m.suite}" that this bug would break.`);
  }
  console.log('\n⚠ A surviving mutant does not mean the code is wrong — it means the TEST is.');
}

process.exit(bad ? 1 : 0);
