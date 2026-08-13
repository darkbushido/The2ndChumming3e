/**
 * Two-corner melee across two real clients (TODO 24).
 *
 * WHY THIS EXISTS, and why the 15 unit suites do not replace it:
 *
 * The bug found play-testing this feature was `_markActed` being declared with three
 * parameters and called with four. JavaScript drops the extra silently, so every
 * submission recorded THAT a side had acted but not WHAT it submitted, and resolution
 * quietly fell back to the resolving client's own DOM — which is the exact bug the
 * feature exists to remove, hiding inside the fix for it.
 *
 * `npm test` was green throughout. It covers the query and it covers the caller; nothing
 * covered the seam between them, and nothing could, because the failure only appears when
 * two different browsers each supply half the input.
 *
 * So the assertion that matters is the last one: the attacker is charged exactly what the
 * ATTACKER submitted, and the defender exactly what the DEFENDER submitted.
 */
import { test, expect } from './fixtures.mjs';
import {
  fireAndForget, answerDialog, selectTarget, arrangeActor,
  setCardField, clickCardButton, newestCardId, CHAT_LOG, actedLedger, actorState,
  resetPools, clearChatAll,
} from './foundry.mjs';

// Player-vs-player on purpose. Both corners belong to DIFFERENT humans, which is the case
// the old code got wrong (one client supplied both) and the case a GM-vs-NPC test cannot
// exercise, since the GM is the decider for every actor and sees every corner unlocked.
//
// Ownership in the test world: SWAT -> Gamemaster + Player2, Troll -> Gamemaster + Player3.
// Using the two players also leaves the maintainer's own GM session alone — Foundry refuses
// a second connection for an already-joined user, so a test that wanted Gamemaster would
// require them to log out first.
const ATTACKER = 'SWAT Team Member';    // Player2
const DEFENDER = 'Troll Street Dealer'; // Player3

test.describe('melee two-corner card', () => {
  // Sessions come from worker-scoped fixtures, which Playwright tears down even when a
  // test fails — a leaked context keeps its Foundry session and blocks every later run
  // with "already connected in another window".
  // ARRANGE the log, do not merely tidy it afterwards: a run that dies part-way never
  // reaches cleanup, so the next one would start on the wreckage.
  test.beforeEach(async ({ janitor }) => {
    await clearChatAll(janitor.page);
  });

  test.afterEach(async ({ player2, player3, janitor }) => {
    // The world is persistent — put back anything the test spent.
    //
    // ⚠ Each side resets its OWN actor. A player cannot update an actor they do not own,
    // and the failure surfaces as a permission error thrown from inside Foundry's server
    // backend with a wall of minified stack — it reads as a Foundry bug, not a test bug.
    await resetPools(player2.page, ATTACKER);
    await resetPools(player3.page, DEFENDER);
    await clearChatAll(janitor.page);
  });

  test('each side submits its own corner and only the last submission resolves',
    async ({ player2, player3 }) => {
    const atk = player2;
    const def = player3;
    // ── ARRANGE: put both actors into a state this test defines ─────────────────
    //
    // Asserting the preconditions beats coping with whatever the world happens to hold.
    // A shared world drifts between runs, and a test that adapts to the drift silently
    // exercises a different path each time — this one waited on a defaulting prompt that
    // had stopped firing because the defender's Katana got equipped between runs.
    //
    // Equipping the Katana makes the defender use Edged Weapons, which they have, so NO
    // defaulting prompt appears and the dialog sequence below is fixed.
    await arrangeActor(atk.page, ATTACKER, {
      requireSkills: ['Unarmed Combat'],   // else the attacker would default too
    });
    const defState = await arrangeActor(def.page, DEFENDER, {
      equipMelee: 'Katana',
      requireSkills: ['Edged Weapons'],
    });
    expect(defState.equipped, 'defender must be holding the Katana').toBe('Katana');

    const before = await actorState(atk.page, ATTACKER);

    // ── The player initiates an unarmed attack ───────────────────────────────────
    // Not awaited: this blocks on the target dialog. See fireAndForget's note.
    await fireAndForget(atk.page, `
      const I = game.sr3e.SR3EItem;
      const a = game.actors.getName(${JSON.stringify(ATTACKER)});
      await I.rollMeleeAttack(a, I._unarmedWeapon(a));
    `);

    // Target picker — attacker's client. Must SELECT, not just confirm: the dialog
    // preselects the first actor, and confirming blind attacks the wrong one.
    await selectTarget(atk.page, DEFENDER);

    // Called shot is attacker-only.
    await answerDialog(atk.page, /Called Shot/i, /confirm/i);

    // ── The card is up. Check the gating on BOTH clients ─────────────────────────
    //
    // ⚠ Scope to THIS message's id AND to the main log. Two separate hazards:
    //   • by class alone, the first match is the OLDEST card in the log, so a leftover
    //     from an earlier run gets driven instead of this one;
    //   • by id alone, it matches TWICE, because Foundry renders every message into both
    //     `#chat` and the `#chat-notifications` pop-up. That double render is the reason
    //     the system carries a one-shot button guard at all.
    const msgId = await newestCardId(atk.page, 'melee');
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="melee"]`;
    await atk.page.locator(card).waitFor({ timeout: 20_000 });
    await def.page.locator(card).waitFor({ timeout: 20_000 });

    // Each player may submit their OWN corner and not the other's — asserted on both
    // clients, because "my button works" is only half the guarantee.
    const aOwn = atk.page.locator(`${card} .sr-corner-submit-btn[data-role="attacker"]`);
    const aOpp = atk.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`);
    await expect(aOwn).toBeEnabled();
    await expect(aOpp).toBeDisabled();

    const dOwn = def.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`);
    const dOpp = def.page.locator(`${card} .sr-corner-submit-btn[data-role="attacker"]`);
    await expect(dOwn).toBeEnabled();
    await expect(dOpp).toBeDisabled();

    // ...and each sees the OTHER's inputs read-only.
    await expect(atk.page.locator(`${card} .sr-melee-def-tn`))
      .toHaveAttribute('readonly', /.*/);
    await expect(def.page.locator(`${card} .sr-melee-atk-tn`))
      .toHaveAttribute('readonly', /.*/);

    // ── Attacker submits 2 pool dice ─────────────────────────────────────────────
    // Acted on the live node rather than via locator.click(): Foundry re-renders the card
    // (this system appends the progress strip during render), so Playwright's stability
    // wait races the re-render. `aOwn` above already asserted the button is genuinely
    // enabled, which is the part that matters.
    await setCardField(atk.page, card, 'sr-melee-atk-pool', 2);
    await clickCardButton(atk.page, card, '.sr-corner-submit-btn[data-role="attacker"]');

    // One submission must NOT resolve: the strip appears, the exchange does not.
    await expect.poll(async () => (await actedLedger(def.page))?.attacker?.label,
      { timeout: 15_000 }).toBe(ATTACKER);

    const mid = await actedLedger(def.page);
    expect(mid.attacker.data['sr-melee-atk-pool']).toBe('2');
    expect(mid.defender, 'defender must not be marked before they submit').toBeUndefined();

    // The strip is shared state, so it must be visible to the OTHER client too.
    await expect(def.page.locator(`${card} .sr-acted-strip`))
      .toContainText(ATTACKER, { timeout: 15_000 });

    // ── Defender submits 0, which completes the pair and resolves ────────────────
    await setCardField(def.page, card, 'sr-melee-def-pool', 0);
    await clickCardButton(def.page, card, '.sr-corner-submit-btn[data-role="defender"]');

    await expect.poll(async () => (await actedLedger(atk.page))?.defender?.label,
      { timeout: 15_000 }).toBe(DEFENDER);

    // ── THE ASSERTION THIS FILE EXISTS FOR ──────────────────────────────────────
    // Each side charged exactly what THAT side submitted. Under the dropped-`data` bug
    // both corners came from whichever client resolved, so this is what fails.
    await expect.poll(async () => (await actorState(atk.page, ATTACKER)).combatPoolSpent,
      { timeout: 20_000 }).toBe(before.combatPoolSpent + 2);

    const defAfter = await actorState(atk.page, DEFENDER);
    expect(defAfter.combatPoolSpent, 'defender submitted 0 and must be charged 0').toBe(0);
  });
});
