/**
 * Cybercombat (Matrix Defragged) — the fifth two-corner card.
 *
 * ── WHAT MAKES THIS ONE DIFFERENT ────────────────────────────────────────────────────
 *
 * Both corners spend a resource, and until now only one of them was ever charged for it.
 * That is the defect this spec is built around: `handleCybercombatRoll` spent the
 * ATTACKER's Hacking Pool and silently let the defender roll theirs for free, every
 * exchange, for ever. A single-client walkthrough cannot see it — you watch your own pool
 * go down and conclude it works.
 *
 * Two related bugs sat in the same block:
 *   • the dice were built from the raw input field while the spend was clamped to what the
 *     actor actually had, so typing more pool than you own rolled it anyway;
 *   • the deduction was a bare `actor.update`, but resolution runs on whichever client
 *     completed the pair — routinely not the owner of the other side, who cannot write it.
 *
 * So the assertions here are about the LEDGER, not the dice: each side must be charged
 * exactly what that side submitted, and nothing when it submits nothing.
 *
 * ── ARRANGEMENT IS FIDDLIER THAN THE OTHER CARDS ─────────────────────────────────────
 *
 * A decker is only a decker with an equipped cyberdeck: Hacking Pool is
 * `⌊(Intelligence + MPCP) / 3⌋` and is `null` without one, which would make every pool
 * field 0 and the whole spec vacuously green. Targeting also requires both actors to share
 * a non-empty `activeHostId` AND to have a `matrixUserMode` set — `_getMatrixCombatTargets`
 * filters on both, and an actor missing either simply never appears in the target list.
 */
import { test, expect } from './fixtures.mjs';
import {
  fireAndForget, createTestActor, deleteActors, sweepTestActors,
  clickCardButton, newestCardId, CHAT_LOG, actedLedger, clearChatAll, actorState,
} from './foundry.mjs';

const ATTACKER = '__TEST Decker Atk';   // Player2
const DEFENDER = '__TEST Decker Def';   // Player3

// Any shared non-empty string works — `_getMatrixCombatTargets` compares the two actors'
// `activeHostId` to each other, it never looks the host up as a document.
const HOST = '__test-host';

/**
 * Intelligence 5 + MPCP 6 → Hacking Pool ⌊11/3⌋ = 3 each. Small on purpose: a pool of 3
 * makes "spent exactly 2" a meaningful assertion rather than noise inside a big number.
 */
const decker = {
  attributes: {
    body: { base: 3 }, quickness: { base: 4 }, strength: { base: 3 },
    charisma: { base: 3 }, intelligence: { base: 5 }, willpower: { base: 4 },
  },
  matrixUserMode: 'VR-Cold',
  activeHostId:   HOST,
};

const deckerItems = [
  { name: 'Cybercombat', type: 'skill', system: { rating: 5, linkedAttribute: 'intelligence' } },
  { name: 'Test Deck', type: 'cyberdeck',
    system: { attributes: { mpcp: { base: 6 }, firewall: { base: 2 } } } },
];

/** Equip the cyberdeck — Hacking Pool is null until `equippedCyberdeck` points at one. */
async function equipDeck(gmPage, actorName) {
  const res = await gmPage.evaluate(async n => {
    const a = game.actors.getName(n);
    if (!a) return { error: `no actor "${n}"` };
    const deck = a.items.find(i => i.type === 'cyberdeck');
    if (!deck) return { error: `"${n}" has no cyberdeck item` };
    await a.update({ 'system.equippedCyberdeck': deck.id });
    a.prepareDerivedData();
    return { hackingPool: a.system.derived?.hackingPool ?? null };
  }, actorName);
  if (res.error) throw new Error(`equipDeck: ${res.error}`);
  return res;
}

const CARD = 'cybercombat';

test.describe('cybercombat two-corner card', () => {
  let created = [];
  let defenderId = null;

  test.beforeEach(async ({ janitor }) => {
    await clearChatAll(janitor.page);
    await sweepTestActors(janitor.page);

    const a = await createTestActor(janitor.page, {
      name: ATTACKER, ownerUserName: 'Player2', system: decker, items: deckerItems,
      x: 1500, y: 1900,
    });
    const d = await createTestActor(janitor.page, {
      name: DEFENDER, ownerUserName: 'Player3', system: decker, items: deckerItems,
      x: 1600, y: 1900,
    });
    created = [a.id, d.id];
    defenderId = d.id;

    // Without a deck the pool is null and every assertion below passes vacuously, so this
    // is a precondition rather than setup — assert it took.
    const ap = await equipDeck(janitor.page, ATTACKER);
    const dp = await equipDeck(janitor.page, DEFENDER);
    expect(ap.hackingPool, 'attacker must have a Hacking Pool to spend').toBe(3);
    expect(dp.hackingPool, 'defender must have a Hacking Pool to spend').toBe(3);
  });

  test.afterEach(async ({ janitor }) => {
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
    await clearChatAll(janitor.page);
  });

  test('both sides are charged for the Hacking Pool they submit — not just the attacker',
    async ({ player2, player3 }) => {
    const atk = player2;
    const def = player3;

    const atkBefore = await actorState(atk.page, ATTACKER);
    const defBefore = await actorState(atk.page, DEFENDER);

    // Not awaited — blocks on the target dialog.
    await fireAndForget(atk.page, `
      await game.actors.getName(${JSON.stringify(ATTACKER)}).rollCybercombat();
    `);

    const dialog = atk.page.locator('.application.dialog, dialog[open]')
      .filter({ has: atk.page.locator('.window-title', { hasText: /Cybercombat/i }) })
      .first();
    await dialog.waitFor({ state: 'visible', timeout: 20_000 });
    // Select by actor id, not label: the option text is decorated with type and VR tags
    // ("Name [CHARACTER] [VR-Cold]"), and the dropdown preselects whatever sorts first —
    // which in a shared world is not necessarily the actor this test created.
    await dialog.locator('#cc-target').selectOption(defenderId);
    await dialog.getByRole('button', { name: /confirm/i }).click();

    const msgId = await newestCardId(atk.page, CARD);
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="${CARD}"]`;
    await atk.page.locator(card).waitFor({ timeout: 20_000 });
    await def.page.locator(card).waitFor({ timeout: 20_000 });

    // ── Ownership, both directions ─────────────────────────────────────────────
    await expect(atk.page.locator(`${card} .sr-corner-submit-btn[data-role="attacker"]`)).toBeEnabled();
    await expect(atk.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`)).toBeDisabled();
    await expect(def.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`)).toBeEnabled();
    await expect(def.page.locator(`${card} .sr-corner-submit-btn[data-role="attacker"]`)).toBeDisabled();
    await expect(atk.page.locator(`${card} .sr-cc-def-pool`)).toHaveAttribute('readonly', /.*/);
    await expect(def.page.locator(`${card} .sr-cc-atk-pool`)).toHaveAttribute('readonly', /.*/);

    // ── Each side submits a DIFFERENT pool, so the two cannot be confused ───────
    await atk.page.locator(`${card} .sr-cc-atk-pool`).fill('2');
    await clickCardButton(atk.page, card, '.sr-corner-submit-btn[data-role="attacker"]');
    await expect.poll(async () => (await actedLedger(def.page))?.attacker?.data?.['sr-cc-atk-pool'],
      { timeout: 15_000 }).toBe('2');

    await def.page.locator(`${card} .sr-cc-def-pool`).fill('1');
    await clickCardButton(def.page, card, '.sr-corner-submit-btn[data-role="defender"]');

    // ── THE ASSERTION THIS SPEC EXISTS FOR ─────────────────────────────────────
    // The defender's pool was never charged at all. Poll both: resolution writes through
    // the GM, so the numbers land a beat after the card resolves.
    await expect.poll(async () => (await actorState(atk.page, ATTACKER)).hackingPoolSpent,
      { timeout: 25_000 }).toBe((atkBefore.hackingPoolSpent ?? 0) + 2);
    await expect.poll(async () => (await actorState(atk.page, DEFENDER)).hackingPoolSpent,
      { timeout: 25_000 }).toBe((defBefore.hackingPoolSpent ?? 0) + 1);
  });

  test('a side that submits no pool is charged nothing, and over-allocation cannot exceed the pool',
    async ({ player2, player3 }) => {
    const atk = player2;
    const def = player3;

    await fireAndForget(atk.page, `
      await game.actors.getName(${JSON.stringify(ATTACKER)}).rollCybercombat();
    `);
    const dialog = atk.page.locator('.application.dialog, dialog[open]')
      .filter({ has: atk.page.locator('.window-title', { hasText: /Cybercombat/i }) })
      .first();
    await dialog.waitFor({ state: 'visible', timeout: 20_000 });
    await dialog.locator('#cc-target').selectOption(defenderId);
    await dialog.getByRole('button', { name: /confirm/i }).click();

    const msgId = await newestCardId(atk.page, CARD);
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="${CARD}"]`;
    await atk.page.locator(card).waitFor({ timeout: 20_000 });
    await def.page.locator(card).waitFor({ timeout: 20_000 });

    // Ask for far more pool than the actor owns. `fill` bypasses the input's `max`, which
    // is exactly what a determined player can do — the max attribute is a hint, not a gate,
    // so the clamp has to live in the resolver.
    await atk.page.locator(`${card} .sr-cc-atk-pool`).fill('99');
    await clickCardButton(atk.page, card, '.sr-corner-submit-btn[data-role="attacker"]');
    await expect.poll(async () => (await actedLedger(def.page))?.attacker,
      { timeout: 15_000 }).toBeTruthy();

    // Defender submits its default of 0.
    await clickCardButton(def.page, card, '.sr-corner-submit-btn[data-role="defender"]');

    // Charged the whole pool and no more — never 99, and never negative available.
    await expect.poll(async () => (await actorState(atk.page, ATTACKER)).hackingPoolSpent,
      { timeout: 25_000 }).toBe(3);
    const defAfter = await actorState(atk.page, DEFENDER);
    expect(defAfter.hackingPoolSpent, 'a side submitting 0 pool pays nothing').toBe(0);
  });
});
