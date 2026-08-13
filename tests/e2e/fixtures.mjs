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
import { test as base, expect } from '@playwright/test';
import { joinAs } from './foundry.mjs';

const BASE = process.env.FOUNDRY_URL ?? 'http://localhost:30000';

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
}

/** Build a worker-scoped fixture that joins as `userName`. */
function clientFixture(userName) {
  return [async ({ browser }, use) => {
    await preflight();
    const client = await joinAs(browser, userName);
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
