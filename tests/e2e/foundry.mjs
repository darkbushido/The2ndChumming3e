/**
 * Foundry-specific Playwright helpers.
 *
 * Everything awkward about driving Foundry lives here so the tests themselves read as
 * "GM does X, player sees Y".
 *
 * THREE THINGS THAT ARE NOT OBVIOUS, and cost time to discover by hand:
 *
 * 1. ONE BROWSER CONTEXT PER USER. Foundry binds a session to a cookie jar per origin, so
 *    two `page`s in one context are the SAME user. `browser.newContext()` per participant
 *    is what makes GM-plus-player testable at all.
 *
 * 2. DRIVE THE API, NOT THE CANVAS. The board is WebGL — tokens are not in the DOM, so
 *    pixel-clicking is both brittle and slow. `page.evaluate()` against `game.*` is exact,
 *    and it is how assertions should read state too.
 *
 * 3. FLOWS THAT OPEN DIALOGS MUST NOT BE AWAITED. `rollMeleeAttack` blocks until a human
 *    answers, so awaiting it inside `evaluate` deadlocks the test. Kick it off, then
 *    resolve the dialogs it opens (see `fireAndForget`).
 */

const BASE = process.env.FOUNDRY_URL ?? 'http://localhost:30000';

/** System id — used for flag reads. */
export const SYSTEM = 'The2ndChumming3e';

/**
 * Join the world as `userName` in its own context.
 *
 * Assumes passwordless accounts, which is true of this test install. If a password is ever
 * set, pass it via env and fill `input[name="password"]` here — never hardcode one.
 */
export async function joinAs(browser, userName) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page    = await context.newPage();

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });

  // The join screen and an already-joined session look different; only select a user if
  // the form is actually present.
  const select = page.locator('select[name="userid"]');
  if (await select.count()) {
    await select.selectOption({ label: userName });
    await page.getByRole('button', { name: /join game session/i }).click();
  }

  // `game.ready` is the real signal — the canvas and sockets are live only after it.
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60_000 });

  const actual = await page.evaluate(() => game.user.name);
  if (actual !== userName) {
    throw new Error(`Expected to join as "${userName}" but joined as "${actual}". `
      + 'Is that user already connected in another window?');
  }
  return { context, page };
}

/** Run an async system flow WITHOUT awaiting it — for anything that opens a blocking dialog. */
export async function fireAndForget(page, fnBody) {
  await page.evaluate(`(() => { (async () => { ${fnBody} })(); return true; })()`);
}

/** Wait for a DialogV2 whose title matches, then click the button matching `button`. */
export async function answerDialog(page, titleRe, button = /confirm|ok/i) {
  const dialog = page.locator('.application.dialog, dialog[open]')
    .filter({ has: page.locator('.window-title', { hasText: titleRe }) });
  await dialog.first().waitFor({ state: 'visible', timeout: 20_000 });
  await dialog.first().getByRole('button', { name: button }).click();
  return dialog.first();
}

/** The `acted` submission ledger on the most recent two-corner card. */
export async function actedLedger(page) {
  return page.evaluate(sys => {
    const m = [...game.messages.contents].reverse()
      .find(x => x.content.includes('data-twocorner'));
    return m?.getFlag(sys, 'acted') ?? null;
  }, SYSTEM);
}

/** A few actor numbers worth asserting on, by name. */
export async function actorState(page, name) {
  return page.evaluate(n => {
    const a = game.actors.getName(n);
    if (!a) return null;
    return {
      combatPoolSpent: a.system.combatPoolSpent ?? 0,
      availableCombatPool: a.system.derived?.availableCombatPool ?? null,
      stun: a.system.wounds?.stun?.value ?? 0,
      physical: a.system.wounds?.physical?.value ?? 0,
    };
  }, name);
}

/**
 * Reset an actor's spent pools. Tests mutate the world permanently, so anything a test
 * changes it must put back — there is no transaction to roll back.
 */
export async function resetPools(page, ...names) {
  await page.evaluate(async ns => {
    for (const n of ns) {
      const a = game.actors.getName(n);
      if (a) await a.update({ 'system.combatPoolSpent': 0 });
    }
  }, names);
}

/** Delete every chat message, so a test never reads a card left by the previous one. */
export async function clearChat(page) {
  await page.evaluate(async () => {
    const ids = game.messages.contents.map(m => m.id);
    if (ids.length) await ChatMessage.deleteDocuments(ids);
  });
}
