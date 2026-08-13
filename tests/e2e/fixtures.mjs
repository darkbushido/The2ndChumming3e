/**
 * Test fixtures: a joined Foundry client per user, torn down automatically.
 *
 * WHY FIXTURES RATHER THAN beforeAll/afterAll
 *
 * `afterAll` does not run if `beforeAll` throws, and neither runs if the process is killed
 * on timeout. Both happened while building this suite, and each leak left a browser holding
 * a Foundry session — after which every later run failed with "Player2 is already connected
 * in another window", a failure that has nothing to do with the code under test and takes
 * a process kill to clear.
 *
 * Playwright tears fixtures down even when the test fails, so the session is released.
 *
 * Worker-scoped on purpose: joining costs ~10s per user, and the alternative is paying that
 * on every test in the file. The cost is that tests share a client and therefore share
 * world state — which is fine precisely because each test ARRANGES what it needs
 * (`arrangeActor`) instead of assuming a clean world.
 */
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test as base, expect } from '@playwright/test';
import { joinAs } from './foundry.mjs';

const BASE = process.env.FOUNDRY_URL ?? 'http://localhost:30000';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Prove the running Foundry is serving THIS working tree.
 *
 * Foundry serves from its own data directory, which is not automatically the repo. Here
 * `scripts/`, `styles/` and `lang/` are NTFS junctions pointing back at the checkout, so
 * a save is live immediately — but a junction is invisible in the repo and trivially lost
 * (a reinstall, a Foundry update, a fresh machine), and when it is lost nothing announces
 * it. The suite simply starts testing whatever code the data directory happens to hold.
 *
 * That already happened once: a whole run passed against the previous session's code, and
 * the two failures it reported were both in behaviour that had since been rewritten.
 * Green would have been worse than red.
 *
 * So: compare bytes before joining. A drifting file is a broken harness, not a test
 * failure, and it must fail LOUDLY rather than mislead for an entire run.
 */
async function assertServingWorkingTree() {
  // Two files, one per junction that carries executable behaviour. lang/ is junctioned too
  // but a stale string never silently changes a result.
  const probes = ['scripts/sr3e.js', 'scripts/documents/SR3EActor.js'];

  for (const rel of probes) {
    const local  = readFileSync(join(REPO, rel), 'utf8');
    const res    = await fetch(`${BASE}/systems/The2ndChumming3e/${rel}`);
    if (!res.ok) {
      throw new Error(`Foundry will not serve ${rel} (HTTP ${res.status}) — is the system installed?`);
    }
    // Line endings are the one difference that never matters: the repo is LF, and a copied
    // install may be CRLF. Everything else is drift.
    const served = (await res.text()).replace(/\r\n/g, '\n');
    if (served === local.replace(/\r\n/g, '\n')) continue;

    throw new Error(
      `Foundry is serving a STALE ${rel} — the e2e suite would test code you did not write.\n`
      + `  served ${served.length} bytes, working tree ${local.length} bytes\n\n`
      + '  Re-link the data directory to this checkout (PowerShell, no elevation needed):\n'
      + '    Remove-Item -Recurse -Force "$env:LOCALAPPDATA\\FoundryVTT\\Data\\systems\\The2ndChumming3e\\scripts"\n'
      + '    cmd /c mklink /J "$env:LOCALAPPDATA\\FoundryVTT\\Data\\systems\\The2ndChumming3e\\scripts" "'
      + `${REPO}\\scripts"\n\n`
      + '  Do NOT junction the whole system directory — packs/ holds live LevelDB that\n'
      + '  Foundry rewrites at runtime, and the repo\'s committed copy is not the same data.');
  }
}

/** Fail fast, and say what to do, rather than 60s of timeouts. */
async function preflight() {
  let res;
  try {
    res = await fetch(BASE, { redirect: 'follow' });
  } catch {
    throw new Error(
      `Foundry is not reachable at ${BASE}.\n`
      + '  • Start Foundry and launch a world, then re-run.\n'
      + '  • Or point elsewhere:  FOUNDRY_URL=http://host:port npm run test:e2e');
  }
  const html = await res.text();
  if (!html.includes('join-game') && !html.includes('game-')) {
    throw new Error(
      `${BASE} responded, but no world appears to be launched `
      + '(the setup screen is showing). Launch a world and re-run.');
  }
  await assertServingWorkingTree();
}

/**
 * Fail if the ACTIVE GM is running older code than the working tree.
 *
 * Serving fresh files is not enough. Foundry routes every authoritative write — pool
 * spends, `card.mark` — to `game.users.activeGM`, which is usually a human's browser that
 * has been open for hours. That client already holds the old module, so a fix lands
 * everywhere except the one place that executes it, and the symptom surfaces in the caller
 * as a silently wrong number. It cost an afternoon: a correct Hacking Pool fix returned 0
 * because the maintainer's tab predated it.
 *
 * `sr3e.debug.loadedAt` is a read-only query answering when that client loaded. Compare it
 * to the newest mtime under scripts/ and say plainly whose tab needs reloading.
 */
async function assertActiveGMIsFresh(page) {
  const newest = Math.max(...['scripts/sr3e.js', 'scripts/documents/SR3EActor.js',
    'scripts/SR3EQuery.js', 'scripts/SR3EMIJI.js']
    .map(f => statSync(join(REPO, f)).mtimeMs));

  const res = await page.evaluate(async () => {
    const gm = game.users.activeGM;
    if (!gm) return { error: 'no active GM is connected' };
    if (gm.isSelf) return { loadedAt: game.sr3e?.loadedAt ?? 0, user: gm.name, self: true };
    try {
      const r = await gm.query('sr3e.debug.loadedAt', {}, { timeout: 8000 });
      return { loadedAt: r?.loadedAt ?? 0, user: gm.name, self: false };
    } catch (e) {
      return { error: `active GM "${gm.name}" did not answer (${e.message})` };
    }
  });

  // No answer is itself the answer. `sr3e.debug.loadedAt` is registered at init by the code
  // in this working tree, so a GM that cannot answer it is running a build from before the
  // query existed — which is exactly the staleness this guard is for. The only other cause
  // is a genuinely unreachable GM, and that fails the run for a good reason too.
  if (res.error) {
    throw new Error(
      `Cannot verify the active GM's code age: ${res.error}.\n\n`
      + '  The most likely cause is that the GM\'s browser predates this working tree — the\n'
      + '  diagnostic query is registered at load, so an older tab simply has no handler for\n'
      + '  it. Foundry runs every GM-authoritative write (pool spends, card submissions) on\n'
      + '  that client, so your changes will not apply there.\n\n'
      + '  Reload the GM\'s Foundry tab (F5) and re-run.');
  }
  if (res.loadedAt >= newest) return;

  const mins = Math.round((newest - res.loadedAt) / 60000);
  throw new Error(
    `The active GM ("${res.user}") is running code about ${mins} minute(s) older than your `
    + 'working tree.\n\n'
    + '  Foundry executes every GM-authoritative write (pool spends, card submissions) on\n'
    + '  THAT client, so your changes will not apply there and correct fixes will look\n'
    + '  broken — usually as a number that silently stays 0.\n\n'
    + `  Reload ${res.user}'s Foundry tab (F5) and re-run.`);
}

/** Build a worker-scoped fixture that joins as `userName`. */
function clientFixture(userName) {
  return [async ({ browser }, use) => {
    await preflight();
    const client = await joinAs(browser, userName);
    await assertActiveGMIsFresh(client.page);
    try {
      await use(client);
    } finally {
      // Always release the Foundry session, however the test ended.
      await client.context.close().catch(() => {});
    }
  }, { scope: 'worker' }];
}

export const test = base.extend({
  player2: clientFixture('Player2'),
  player3: clientFixture('Player3'),

  /**
   * An Assistant GM session used for housekeeping the players cannot do themselves.
   *
   * A player may only delete their OWN chat messages, so player-side cleanup cannot clear
   * a log containing the other side's cards — and a run that dies mid-test never reaches
   * cleanup at all. The residue is not cosmetic: selecting a card by class alone finds the
   * oldest match, so a stale card gets driven instead of the one under test, and the
   * failure reads as "the button is disabled" a second after asserting it was enabled.
   *
   * Deliberately NOT the Gamemaster account: that is the maintainer's own seat, and Foundry
   * refuses a second session for a connected user, so borrowing it would mean asking them
   * to log out before every run.
   */
  janitor: clientFixture(process.env.FOUNDRY_JANITOR ?? 'mcp-api'),
});

export { expect };
