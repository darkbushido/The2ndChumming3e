/**
 * Contested roll across two real clients — the third two-corner card exercised live.
 *
 * ── WHAT THIS SPEC EXISTS TO PROTECT ─────────────────────────────────────────────────
 *
 * The setup dialog used to configure BOTH sides: whoever clicked ⚔ Contested Roll on
 * their own sheet chose their opponent's pool source, dice, TN and damage. The card then
 * rendered those numbers into the opponent's corner, where the per-corner owner gate made
 * them read-only to the opponent's own player. One player decided how another played.
 *
 * The fix moved the pool-source dropdown ONTO the card, one per corner, so each side
 * chooses their own attribute or skill. This spec pins the three properties that fix has
 * to hold, none of which the unit suites can see (they never render a card):
 *
 *   1. The opponent's corner offers a source dropdown built from the OPPONENT's own
 *      attributes and skills — not the initiator's.
 *   2. That dropdown is editable by the opponent and read-only to the initiator, in the
 *      same direction as every other field in that corner.
 *   3. Choosing a source drives that corner's Pool field, and the submitted value is what
 *      resolution actually uses.
 *
 * Property 2 is the one most likely to be silently lost: the lock in sr3e.js disables
 * `select` elements through a different branch than the `readOnly` it sets on inputs, so
 * a refactor that collapses the two would leave every dropdown on every card editable by
 * everyone, and every existing assertion would still pass.
 *
 * ── AND THE AFK CASE ─────────────────────────────────────────────────────────────────
 *
 * Moving a choice onto the opponent's client means an absent opponent can now stall the
 * exchange for ever. The second test drives ⚔ Resolve now (GM) with one side outstanding.
 */
import { test, expect } from './fixtures.mjs';
import {
  fireAndForget, createTestActor, deleteActors, sweepTestActors,
  clickCardButton, newestCardId, CHAT_LOG,
  actedLedger, clearChatAll,
} from './foundry.mjs';

const INITIATOR = '__TEST Contest A';   // owned by Player2
const OPPONENT  = '__TEST Contest B';   // owned by Player3

/**
 * The two actors are deliberately NOT symmetrical. Each carries a skill the other does
 * not have, at a rating nothing else in the list shares — so an option that appears in a
 * corner can only have come from that corner's own actor. If the card ever rebuilt both
 * dropdowns from the initiator, `Negotiation` would show up on the opponent's side and
 * this spec fails on the exact regression it is here for.
 */
const initiator = {
  attributes: {
    body: { base: 3 }, quickness: { base: 4 }, strength: { base: 3 },
    charisma: { base: 5 }, intelligence: { base: 4 }, willpower: { base: 3 },
  },
};
const opponent = {
  attributes: {
    body: { base: 4 }, quickness: { base: 3 }, strength: { base: 4 },
    charisma: { base: 2 }, intelligence: { base: 5 }, willpower: { base: 4 },
  },
};

const initiatorSkills = [{ name: 'Negotiation', type: 'skill', system: { rating: 7, linkedAttribute: 'charisma' } }];
const opponentSkills  = [{ name: 'Intimidation', type: 'skill', system: { rating: 6, linkedAttribute: 'charisma' } }];

const CARD = 'contested';

/** Open the setup dialog on `page`, name the opponent, and click Continue. */
async function openContest(page, initiatorName, opponentName) {
  await fireAndForget(page, `
    const a = game.actors.getName(${JSON.stringify(initiatorName)});
    await game.sr3e.SR3EActor.openContestedDialog(a);
  `);

  const dialog = page.locator('.application.dialog, dialog[open]')
    .filter({ has: page.locator('.window-title', { hasText: /Contested Roll Setup/i }) })
    .first();
  await dialog.waitFor({ state: 'visible', timeout: 20_000 });

  // The opponent select is the ONLY control this dialog still has for that side. If a
  // future change puts pool/TN/damage back, this assertion is what notices.
  const oppSideControls = await dialog.locator('#opp-source, #opp-pool, #opp-tn, #opp-damage').count();
  expect(oppSideControls, 'the setup dialog must not configure the opponent\'s dice').toBe(0);

  await dialog.locator('#opp-actor').selectOption({ label: opponentName });
  await dialog.getByRole('button', { name: /continue/i }).click();
}

test.describe('contested roll two-corner card', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await clearChatAll(janitor.page);
    await sweepTestActors(janitor.page);
    const a = await createTestActor(janitor.page, {
      name: INITIATOR, ownerUserName: 'Player2', system: initiator, items: initiatorSkills,
      x: 1500, y: 1500,
    });
    const b = await createTestActor(janitor.page, {
      name: OPPONENT, ownerUserName: 'Player3', system: opponent, items: opponentSkills,
      x: 1600, y: 1500,
    });
    created = [a.id, b.id];
  });

  test.afterEach(async ({ janitor }) => {
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
    await clearChatAll(janitor.page);
  });

  test('each side picks its own pool source, and the opponent\'s is read-only to the initiator',
    async ({ player2, player3 }) => {
    const ini = player2;
    const opp = player3;

    await openContest(ini.page, INITIATOR, OPPONENT);

    const msgId = await newestCardId(ini.page, CARD);
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="${CARD}"]`;
    await ini.page.locator(card).waitFor({ timeout: 20_000 });
    await opp.page.locator(card).waitFor({ timeout: 20_000 });

    const iniSrc = `${card} .sr-contested-atk-source`;
    const oppSrc = `${card} .sr-contested-opp-source`;

    // ── 1. Each dropdown is built from ITS OWN actor ────────────────────────────
    const oppOptions = await opp.page.locator(`${oppSrc} option`).allTextContents();
    expect(oppOptions.some(o => /^Intimidation \(6\)/.test(o)),
      'the opponent\'s corner must offer the opponent\'s own skills').toBe(true);
    expect(oppOptions.some(o => /Negotiation/.test(o)),
      'the opponent\'s corner must NOT be built from the initiator').toBe(false);

    const iniOptions = await ini.page.locator(`${iniSrc} option`).allTextContents();
    expect(iniOptions.some(o => /^Negotiation \(7\)/.test(o))).toBe(true);
    expect(iniOptions.some(o => /Intimidation/.test(o))).toBe(false);

    // ── 2. Editable by its owner, disabled for the other side ───────────────────
    // Both corners stay VISIBLE on both clients — that shared view is why these are one
    // card — so this is about `disabled`, never about the element being absent.
    await expect(ini.page.locator(iniSrc)).toBeEnabled();
    await expect(ini.page.locator(oppSrc)).toBeDisabled();
    await expect(opp.page.locator(oppSrc)).toBeEnabled();
    await expect(opp.page.locator(iniSrc)).toBeDisabled();

    // ── 3. Source drives Pool, and the submitted value is what resolves ─────────
    await opp.page.locator(oppSrc).selectOption({ label: 'Intimidation (6)' });
    await expect(opp.page.locator(`${card} .sr-contested-opp-pool`)).toHaveValue('6');

    await ini.page.locator(iniSrc).selectOption({ label: 'Negotiation (7)' });
    await expect(ini.page.locator(`${card} .sr-contested-atk-pool`)).toHaveValue('7');

    // The ORDER below is load-bearing. The opponent chose their source FIRST and submits
    // LAST, so that choice has to survive the re-render the initiator's submission
    // triggers — writing the `acted` flag updates the message, and Foundry rebuilds the
    // card from its payload. Before `_cornerDrafts` that silently reset this corner to the
    // card default, and the opponent submitted 4 dice they never picked.
    await clickCardButton(ini.page, card, '.sr-corner-submit-btn[data-role="attacker"]');
    await expect.poll(async () => (await actedLedger(opp.page))?.attacker?.label,
      { timeout: 15_000 }).toBe(INITIATOR);

    const afterFirst = await actedLedger(opp.page);
    expect(afterFirst.attacker.data['sr-contested-atk-pool']).toBe('7');
    expect(afterFirst.opponent, 'the opponent must not be marked before they submit').toBeUndefined();

    await clickCardButton(opp.page, card, '.sr-corner-submit-btn[data-role="opponent"]');
    await expect.poll(async () => (await actedLedger(ini.page))?.opponent?.data?.['sr-contested-opp-pool'],
      { timeout: 15_000 }).toBe('6');

    // Two result cards — one per side — posted by the submission that completed the pair.
    await expect.poll(async () => ini.page.locator(`${CHAT_LOG} .message`).count(),
      { timeout: 20_000 }).toBeGreaterThan(1);
  });

  test('the GM can resolve with a side outstanding', async ({ player2, player3, janitor }) => {
    const ini = player2;
    const opp = player3;

    await openContest(ini.page, INITIATOR, OPPONENT);

    const msgId = await newestCardId(ini.page, CARD);
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="${CARD}"]`;
    await ini.page.locator(card).waitFor({ timeout: 20_000 });
    await janitor.page.locator(card).waitFor({ timeout: 20_000 });

    await clickCardButton(ini.page, card, '.sr-corner-submit-btn[data-role="attacker"]');
    await expect.poll(async () => (await actedLedger(janitor.page))?.attacker?.label,
      { timeout: 15_000 }).toBe(INITIATOR);

    // The override is GM-only. A player must not be able to resolve past an opponent who
    // simply has not answered yet — that would be the old problem wearing a new button.
    await expect(opp.page.locator(`${card} .sr-corner-resolve-btn`)).toBeDisabled();

    const before = await ini.page.locator(`${CHAT_LOG} .message`).count();
    await clickCardButton(janitor.page, card, '.sr-corner-resolve-btn');

    await expect.poll(async () => ini.page.locator(`${CHAT_LOG} .message`).count(),
      { timeout: 25_000 }).toBeGreaterThan(before);
  });
});
