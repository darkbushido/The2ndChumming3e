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
import { test, expect } from '@playwright/test';
import {
  joinAs, fireAndForget, answerDialog, actedLedger, actorState, resetPools, clearChat,
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
  let atk, def;

  test.beforeAll(async ({ browser }) => {
    atk = await joinAs(browser, 'Player2');
    def = await joinAs(browser, 'Player3');
  });

  test.afterAll(async () => {
    // The world is persistent — put back anything the test spent.
    if (atk) {
      await resetPools(atk.page, ATTACKER, DEFENDER);
      await clearChat(atk.page);
      await atk.context.close();
    }
    if (def) await def.context.close();
  });

  test('each side submits its own corner and only the last submission resolves', async () => {
    await resetPools(atk.page, ATTACKER, DEFENDER);
    await clearChat(atk.page);

    const before = await actorState(atk.page, ATTACKER);

    // ── The player initiates an unarmed attack ───────────────────────────────────
    // Not awaited: this blocks on the target dialog. See fireAndForget's note.
    await fireAndForget(atk.page, `
      const I = game.sr3e.SR3EItem;
      const a = game.actors.getName(${JSON.stringify(ATTACKER)});
      await I.rollMeleeAttack(a, I._unarmedWeapon(a));
    `);

    // Target picker — attacker's client.
    await answerDialog(atk.page, /Select Target/i, /confirm/i);

    // The defender has a Katana but nothing equipped, so the lookup falls through to Bare
    // Hands, which has no Unarmed Combat — a defaulting prompt opens on the DEFENDER's own
    // client, because deciderFor routes it to them rather than to whoever attacked.
    await answerDialog(def.page, /Defaulting/i, /confirm/i);

    // Called shot is attacker-only.
    await answerDialog(atk.page, /Called Shot/i, /confirm/i);

    // ── The card is up. Check the gating on BOTH clients ─────────────────────────
    const card = '[data-twocorner="melee"]';
    await atk.page.locator(card).first().waitFor({ timeout: 20_000 });
    await def.page.locator(card).first().waitFor({ timeout: 20_000 });

    // Each player may submit their OWN corner and not the other's — asserted on both
    // clients, because "my button works" is only half the guarantee.
    const aOwn = atk.page.locator(`${card} .sr-corner-submit-btn[data-role="attacker"]`).first();
    const aOpp = atk.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`).first();
    await expect(aOwn).toBeEnabled();
    await expect(aOpp).toBeDisabled();

    const dOwn = def.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`).first();
    const dOpp = def.page.locator(`${card} .sr-corner-submit-btn[data-role="attacker"]`).first();
    await expect(dOwn).toBeEnabled();
    await expect(dOpp).toBeDisabled();

    // ...and each sees the OTHER's inputs read-only.
    await expect(atk.page.locator(`${card} .sr-melee-def-tn`).first())
      .toHaveAttribute('readonly', /.*/);
    await expect(def.page.locator(`${card} .sr-melee-atk-tn`).first())
      .toHaveAttribute('readonly', /.*/);

    // ── Attacker submits 2 pool dice ─────────────────────────────────────────────
    await atk.page.locator(`${card} .sr-melee-atk-pool`).first().fill('2');
    await aOwn.click();

    // One submission must NOT resolve: the strip appears, the exchange does not.
    await expect.poll(async () => (await actedLedger(def.page))?.attacker?.label,
      { timeout: 15_000 }).toBe(ATTACKER);

    const mid = await actedLedger(def.page);
    expect(mid.attacker.data['sr-melee-atk-pool']).toBe('2');
    expect(mid.defender, 'defender must not be marked before they submit').toBeUndefined();

    // The strip is shared state, so it must be visible to the OTHER client too.
    await expect(def.page.locator(`${card} .sr-acted-strip`).first())
      .toContainText(ATTACKER, { timeout: 15_000 });

    // ── Defender submits 0, which completes the pair and resolves ────────────────
    await def.page.locator(`${card} .sr-melee-def-pool`).first().fill('0');
    await dOwn.click();

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
