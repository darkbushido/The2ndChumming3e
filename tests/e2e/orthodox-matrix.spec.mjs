/**
 * The three Orthodox SR3 Matrix cards — System Test, Cybercombat, IC Attack.
 *
 * ── THESE DO NOT NEED THE RULESET SETTING FLIPPED ────────────────────────────────────
 *
 * `matrixRuleset` decides which SHEET classes are registered; it gates nothing in the roll
 * methods, which key off documents instead — a `host` actor carrying `orthodoxSecurityValue`
 * / `orthodoxSubsystems`, and a decker whose `orthodoxRunState.currentHostId` points at it.
 * So all three cards are drivable in a Defragged world, and this spec needs no reload.
 *
 * ── AN ORTHODOX DECKER OWNS NO CYBERDECK ITEM ────────────────────────────────────────
 *
 * They keep deck stats on the actor (`system.orthodoxDeck`, whose MPCP field is named
 * `mccp`), so the Defragged `availableHackingPool` — derived from an equipped item — is
 * `null` for them. Two of the three cards read exactly that and silently offered 0 Hacking
 * Pool, while the IC-attack card read `availableOrthodoxHackingPool` and offered it
 * correctly. The disagreement between the three is what proved it a bug rather than a
 * design choice, and the System Test assertion below is what stops it coming back.
 *
 * ── AND THE ONE THAT MATTERED MOST ───────────────────────────────────────────────────
 *
 * The IC's setup dialog used to carry "Decker defense dice" and "Decker HP allocation",
 * then commit the allocation with a bare `deckerActor.update({ hackingPoolSpent })` before
 * the decker had seen the card. IC is GM-run, so that was the GM choosing a player's
 * defence and spending their Hacking Pool — which does not come back until pools refresh.
 * Of the eight cards this was the worst instance of the problem the contested rework was
 * about, and it is asserted here in both directions: the fields are gone from the dialog,
 * and the pool moves only when the DECKER submits it.
 */
import { test, expect } from './fixtures.mjs';
import {
  fireAndForget, createTestActor, deleteActors, sweepTestActors,
  clickCardButton, newestCardId, CHAT_LOG, actedLedger, clearChatAll, actorState,
} from './foundry.mjs';

const DECKER = '__TEST Ortho Decker';   // Player2
const HOST   = '__TEST Ortho Host';
const IC     = '__TEST Ortho IC';

/**
 * Intelligence 5 + MCCP 6 → Orthodox Hacking Pool ⌊11/3⌋ = 3.
 * `mccp` is genuinely the field name for MPCP on the Orthodox deck (the sheet writes the
 * UI's "MPCP" into it) — CLAUDE.md calling it `mpcp` is a documentation error.
 */
const decker = hostId => ({
  attributes: {
    body: { base: 3 }, quickness: { base: 4 }, strength: { base: 3 },
    charisma: { base: 3 }, intelligence: { base: 5 }, willpower: { base: 4 },
  },
  orthodoxDeck:     { mccp: 6, masking: 4, sleazeRating: 0 },
  orthodoxRunState: { currentHostId: hostId, alertLevel: 'none' },
});

const deckerItems = [
  { name: 'Computer',    type: 'skill', system: { rating: 6, linkedAttribute: 'intelligence' } },
  { name: 'Cybercombat', type: 'skill', system: { rating: 5, linkedAttribute: 'intelligence' } },
];

const host = {
  orthodoxSecurityCode:  'Green',
  orthodoxSecurityValue: 4,
  orthodoxSubsystems:    { access: 5, control: 5, index: 4, files: 6, slave: 3 },
};

test.describe('Orthodox SR3 Matrix cards', () => {
  let created = [], hostId = null, deckerId = null;

  test.beforeEach(async ({ janitor }) => {
    await clearChatAll(janitor.page);
    await sweepTestActors(janitor.page);

    const h = await createTestActor(janitor.page, {
      name: HOST, type: 'host', system: host, withToken: false,
    });
    hostId = h.id;

    const d = await createTestActor(janitor.page, {
      name: DECKER, ownerUserName: 'Player2', system: decker(h.id), items: deckerItems,
      x: 1500, y: 2100,
    });
    deckerId = d.id;

    // IC is GM-run by design — no ownerUserName, so its corner belongs to the GM.
    const i = await createTestActor(janitor.page, {
      name: IC, type: 'ic', withToken: false,
      system: { rating: 5, activeHostId: h.id, deployed: true },
    });

    created = [h.id, d.id, i.id];
  });

  test.afterEach(async ({ janitor }) => {
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
    await clearChatAll(janitor.page);
  });

  test('System Test offers the ORTHODOX Hacking Pool, not the Defragged one',
    async ({ player2, janitor }) => {
    const dk = player2;

    await fireAndForget(dk.page, `
      await game.actors.getName(${JSON.stringify(DECKER)}).rollOrthodoxSystemTest();
    `);

    const dialog = dk.page.locator('.application.dialog, dialog[open]')
      .filter({ has: dk.page.locator('.window-title', { hasText: /System Test/i }) }).first();
    await dialog.waitFor({ state: 'visible', timeout: 20_000 });

    // ── THE ASSERTION THIS TEST EXISTS FOR ─────────────────────────────────────
    // The header reports the pool it is willing to offer. Before the fix this read
    // "Hacking Pool: 0" for every Orthodox decker alive.
    await expect(dialog).toContainText(/Hacking Pool:\s*3/);

    await dialog.getByRole('button', { name: /^roll$/i }).click();

    const msgId = await newestCardId(dk.page, 'ost');
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="ost"]`;
    await dk.page.locator(card).waitFor({ timeout: 20_000 });
    await janitor.page.locator(card).waitFor({ timeout: 20_000 });

    // The decker owns their corner; the HOST corner is GM-run, so it is theirs alone.
    await expect(dk.page.locator(`${card} .sr-corner-submit-btn[data-role="decker"]`)).toBeEnabled();
    await expect(dk.page.locator(`${card} .sr-corner-submit-btn[data-role="host"]`)).toBeDisabled();
    await expect(janitor.page.locator(`${card} .sr-corner-submit-btn[data-role="host"]`)).toBeEnabled();
    await expect(dk.page.locator(`${card} .sr-ost-host-dice`)).toHaveAttribute('readonly', /.*/);

    const before = await dk.page.locator(`${CHAT_LOG} .message`).count();
    await clickCardButton(dk.page, card, '.sr-corner-submit-btn[data-role="decker"]');
    await expect.poll(async () => (await actedLedger(janitor.page))?.decker,
      { timeout: 15_000 }).toBeTruthy();
    await clickCardButton(janitor.page, card, '.sr-corner-submit-btn[data-role="host"]');
    await expect.poll(async () => dk.page.locator(`${CHAT_LOG} .message`).count(),
      { timeout: 25_000 }).toBeGreaterThan(before);
  });

  test('Orthodox Cybercombat: the decker owns their corner, the IC corner is the GM\'s',
    async ({ player2, janitor }) => {
    const dk = player2;

    await fireAndForget(dk.page, `
      await game.actors.getName(${JSON.stringify(DECKER)}).rollOrthodoxCybercombat();
    `);

    const dialog = dk.page.locator('.application.dialog, dialog[open]')
      .filter({ has: dk.page.locator('.window-title', { hasText: /Cybercombat/i }) }).first();
    await dialog.waitFor({ state: 'visible', timeout: 20_000 });
    // Same Orthodox-pool fix as above, on the second of the two affected cards. This dialog
    // does not print the pool in its header, so read the cap off the allocation input — the
    // number the decker is actually allowed to spend, which was 0 before the fix.
    await expect(dialog.locator('#occ-hp')).toHaveAttribute('max', '3');
    await dialog.getByRole('button', { name: /^attack$/i }).click();

    const msgId = await newestCardId(dk.page, 'occ');
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="occ"]`;
    await dk.page.locator(card).waitFor({ timeout: 20_000 });
    await janitor.page.locator(card).waitFor({ timeout: 20_000 });

    await expect(dk.page.locator(`${card} .sr-corner-submit-btn[data-role="attacker"]`)).toBeEnabled();
    await expect(dk.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`)).toBeDisabled();
    await expect(janitor.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`)).toBeEnabled();
    await expect(dk.page.locator(`${card} .sr-occ-soak-dice`)).toHaveAttribute('readonly', /.*/);

    const before = await dk.page.locator(`${CHAT_LOG} .message`).count();
    await clickCardButton(dk.page, card, '.sr-corner-submit-btn[data-role="attacker"]');
    await expect.poll(async () => (await actedLedger(janitor.page))?.attacker,
      { timeout: 15_000 }).toBeTruthy();
    await clickCardButton(janitor.page, card, '.sr-corner-submit-btn[data-role="defender"]');
    await expect.poll(async () => dk.page.locator(`${CHAT_LOG} .message`).count(),
      { timeout: 25_000 }).toBeGreaterThan(before);
  });

  test('IC Attack: the GM cannot choose or spend the decker\'s Hacking Pool',
    async ({ player2, janitor }) => {
    const dk = player2;

    const before = await actorState(dk.page, DECKER);
    expect(before.hackingPoolSpent, 'start from a clean pool').toBe(0);

    // The IC is GM-run, so the GM opens this one.
    await fireAndForget(janitor.page, `
      await game.actors.getName(${JSON.stringify(IC)}).rollOrthodoxICAttack();
    `);

    const dialog = janitor.page.locator('.application.dialog, dialog[open]')
      .filter({ has: janitor.page.locator('.window-title', { hasText: /Attack Decker/i }) }).first();
    await dialog.waitFor({ state: 'visible', timeout: 20_000 });

    // ── HALF THE POINT OF THIS TEST ────────────────────────────────────────────
    // The decker's controls must not exist on the IC's dialog at all.
    expect(await dialog.locator('#icia-def-dice, #icia-def-hp, #icia-hp-max').count(),
      'the IC dialog must not configure the decker\'s dice or pool').toBe(0);

    await dialog.locator('#icia-target').selectOption(deckerId);
    await dialog.getByRole('button', { name: /post card/i }).click();

    const msgId = await newestCardId(janitor.page, 'icia');
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="icia"]`;
    await dk.page.locator(card).waitFor({ timeout: 20_000 });
    await janitor.page.locator(card).waitFor({ timeout: 20_000 });

    // Posting the card must not have moved the decker's pool. This is the regression that
    // matters: the old dialog spent it here, before the decker had seen anything.
    const afterPost = await actorState(dk.page, DECKER);
    expect(afterPost.hackingPoolSpent,
      'posting the card must not spend the decker\'s pool').toBe(0);

    // The decker's own Hacking Pool field is theirs, and read-only to the GM's IC corner.
    const hp = `${card} .sr-icia-def-hp`;
    await expect(dk.page.locator(hp)).toBeVisible();
    await expect(dk.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`)).toBeEnabled();
    await expect(dk.page.locator(`${card} .sr-corner-submit-btn[data-role="attacker"]`)).toBeDisabled();
    await expect(dk.page.locator(`${card} .sr-icia-atk-dice`)).toHaveAttribute('readonly', /.*/);

    // ── AND THE OTHER HALF: it moves only when the DECKER submits it ────────────
    await dk.page.locator(hp).fill('2');
    await clickCardButton(dk.page, card, '.sr-corner-submit-btn[data-role="defender"]');
    await expect.poll(async () => (await actedLedger(janitor.page))?.defender?.data?.['sr-icia-def-hp'],
      { timeout: 15_000 }).toBe('2');

    await clickCardButton(janitor.page, card, '.sr-corner-submit-btn[data-role="attacker"]');

    await expect.poll(async () => (await actorState(dk.page, DECKER)).hackingPoolSpent,
      { timeout: 25_000 }).toBe(2);
  });
});
