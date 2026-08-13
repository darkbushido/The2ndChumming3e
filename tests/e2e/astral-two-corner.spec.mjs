/**
 * Astral combat across two real clients — the second of the eight two-corner cards.
 *
 * Melee proved the mechanism; this proves the CONVERSION. All eight cards were migrated
 * onto one generic block in a single pass, and only melee was ever exercised live. A
 * mistake in one card's wiring — a wrong role name, an owner id that does not resolve, a
 * field class the handler no longer reads — would not show up anywhere else: the unit
 * suites do not render cards, and lint cannot tell that `data-corner-role="attacker"` on
 * the markup must match the `'attacker'` the handler asks for.
 *
 * ── DIFFERENT FROM MELEE IN ONE IMPORTANT WAY ────────────────────────────────────────
 *
 * The world has no Awakened characters, so this spec CREATES two mages and deletes them
 * afterwards, rather than bolting Magic and Sorcery onto the maintainer's existing
 * actors. Creating is additive and reversible; mutating someone's character to make a
 * test pass is neither.
 *
 * Both are given Astral Combat so no defaulting prompt fires and the dialog sequence is
 * fixed — the same determinism argument as the melee spec's Katana.
 */
import { test, expect } from './fixtures.mjs';
import {
  fireAndForget, selectTarget, createTestActor, deleteActors,
  setCardField, clickCardButton, newestCardId, CHAT_LOG,
  actedLedger, actorState, clearChatAll,
} from './foundry.mjs';

const ATTACKER = '__TEST Astral Mage A';   // owned by Player2
const DEFENDER = '__TEST Astral Mage B';   // owned by Player3

/** An Awakened, astrally-projecting mage with the skills this exchange needs. */
const mage = astralPool => ({
  attributes: {
    body: { base: 3 }, quickness: { base: 4 }, strength: { base: 3 },
    charisma: { base: astralPool }, intelligence: { base: 5 }, willpower: { base: 5 },
    magic: { base: 6 },
  },
  astralMode: 'astral',
});

const astralSkills = [
  { name: 'Sorcery',       type: 'skill', system: { rating: 5, linkedAttribute: 'willpower' } },
  { name: 'Astral Combat', type: 'skill', system: { rating: 4, linkedAttribute: 'willpower' } },
];

test.describe('astral combat two-corner card', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await clearChatAll(janitor.page);
    // Tokens are required, not cosmetic: _promptTarget prefers actors with a token on the
    // active scene, and only falls back to the whole world list when none are placed. The
    // world's own characters have tokens, so that fallback never fires and a token-less
    // test actor simply never appears in the target dialog.
    const a = await createTestActor(janitor.page, {
      name: ATTACKER, ownerUserName: 'Player2', system: mage(4), items: astralSkills,
      x: 1500, y: 1500,
    });
    const d = await createTestActor(janitor.page, {
      name: DEFENDER, ownerUserName: 'Player3', system: mage(4), items: astralSkills,
      x: 1600, y: 1500,
    });
    expect(a.hasToken && d.hasToken, 'both mages need tokens to be targetable').toBe(true);
    created = [a.id, d.id];
    expect(a.magic, 'attacker must be Awakened').toBeGreaterThan(0);
    expect(d.magic, 'defender must be Awakened').toBeGreaterThan(0);
  });

  test.afterEach(async ({ janitor }) => {
    // These are real documents in a real world — a suite that leaks them turns the actor
    // directory into a graveyard.
    await deleteActors(janitor.page, created);
    created = [];
    await clearChatAll(janitor.page);
  });

  test('each mage submits its own corner and only the last submission resolves',
    async ({ player2, player3 }) => {
    const atk = player2;
    const def = player3;

    const before = await actorState(atk.page, ATTACKER);
    expect(before, 'attacker should be visible to its owner').not.toBeNull();

    // Not awaited — blocks on the target dialog.
    await fireAndForget(atk.page, `
      await game.actors.getName(${JSON.stringify(ATTACKER)}).rollAstralCombat();
    `);

    // Must SELECT, not just confirm: the dialog preselects the first actor.
    await selectTarget(atk.page, DEFENDER);

    const msgId = await newestCardId(atk.page, 'astral');
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="astral"]`;
    await atk.page.locator(card).waitFor({ timeout: 20_000 });
    await def.page.locator(card).waitFor({ timeout: 20_000 });

    // ── Gating, on BOTH clients ─────────────────────────────────────────────────
    const aOwn = atk.page.locator(`${card} .sr-corner-submit-btn[data-role="attacker"]`);
    const aOpp = atk.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`);
    await expect(aOwn).toBeEnabled();
    await expect(aOpp).toBeDisabled();

    const dOwn = def.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`);
    const dOpp = def.page.locator(`${card} .sr-corner-submit-btn[data-role="attacker"]`);
    await expect(dOwn).toBeEnabled();
    await expect(dOpp).toBeDisabled();

    await expect(atk.page.locator(`${card} .sr-astral-def-tn`)).toHaveAttribute('readonly', /.*/);
    await expect(def.page.locator(`${card} .sr-astral-atk-tn`)).toHaveAttribute('readonly', /.*/);

    // ── Attacker submits 2 Astral Pool dice ─────────────────────────────────────
    await setCardField(atk.page, card, 'sr-astral-atk-pool', 2);
    await clickCardButton(atk.page, card, '.sr-corner-submit-btn[data-role="attacker"]');

    await expect.poll(async () => (await actedLedger(def.page))?.attacker?.label,
      { timeout: 15_000 }).toBe(ATTACKER);

    const mid = await actedLedger(def.page);
    expect(mid.attacker.data['sr-astral-atk-pool']).toBe('2');
    expect(mid.defender, 'defender must not be marked before they submit').toBeUndefined();

    await expect(def.page.locator(`${card} .sr-acted-strip`))
      .toContainText(ATTACKER, { timeout: 15_000 });

    // ── Defender submits 0, completing the pair ─────────────────────────────────
    await setCardField(def.page, card, 'sr-astral-def-pool', 0);
    await clickCardButton(def.page, card, '.sr-corner-submit-btn[data-role="defender"]');

    await expect.poll(async () => (await actedLedger(atk.page))?.defender?.label,
      { timeout: 15_000 }).toBe(DEFENDER);

    // ── Each side charged what THAT side submitted ──────────────────────────────
    // Astral combat spends the ASTRAL pool, not Combat Pool — a card wired to the wrong
    // helper would still resolve and still look right on screen.
    await expect.poll(async () => (await actorState(atk.page, ATTACKER)).astralPoolSpent,
      { timeout: 20_000 }).toBe(before.astralPoolSpent + 2);

    const defAfter = await actorState(atk.page, DEFENDER);
    expect(defAfter.astralPoolSpent, 'defender submitted 0 and must be charged 0').toBe(0);
  });
});
