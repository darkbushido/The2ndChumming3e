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

/**
 * The MAIN chat log, as opposed to the pop-up notification pane.
 *
 * ⚠ Foundry renders each message TWICE — once into `#chat` and once into
 * `#chat-notifications` — so every card selector must be scoped or it matches two elements
 * and Playwright's strict mode rejects it. This is not a quirk of the test environment: the
 * same double render is why this system needs its `_usedButtons` one-shot guard, since a
 * user can otherwise click the same button in the pop-up and then again in the log.
 */
export const CHAT_LOG = '#chat';

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

  // ⚠ The join page is a ~2.4 KB shell that builds its form in JS, so at
  // `domcontentloaded` there is no <select> yet. Counting it immediately returns 0, which
  // silently skips the login and then times out 60s later on `game.ready` — the failure
  // looks like "Foundry never became ready" and points nowhere near the real cause.
  //
  // So WAIT for one of the two possible end states instead of testing for one of them:
  // either the join form has rendered, or this context is already in a live session.
  const select = page.locator('select[name="userid"]');
  await Promise.race([
    select.waitFor({ state: 'attached', timeout: 60_000 }),
    page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60_000 }),
  ]);

  if (await select.count()) {
    // A user already connected elsewhere is rendered disabled; selecting them throws a
    // timeout that reads as "option not found", so say what actually happened.
    const disabled = await page.evaluate(name => {
      const o = [...document.querySelectorAll('select[name="userid"] option')]
        .find(x => x.textContent.trim() === name);
      return o ? o.disabled : 'missing';
    }, userName);
    if (disabled === 'missing') throw new Error(`No such user "${userName}" in this world.`);
    if (disabled) throw new Error(`"${userName}" is already connected in another window — `
      + 'Foundry refuses a second session for the same user. Close it and re-run.');

    await select.selectOption({ label: userName });
    await page.getByRole('button', { name: /join game session/i }).click();
  }

  // `game.ready` is the real signal — the canvas and sockets are live only after it.
  //
  // ⚠ Read the identity INSIDE a polled function, not with a separate `evaluate` after it.
  // Foundry is still finishing its navigation to /game when `ready` flips, so a follow-up
  // evaluate can land mid-navigation and die with "Execution context was destroyed" — an
  // error about page lifecycle that says nothing about the join itself. Polling for the
  // name retries across the navigation instead of racing it.
  const actual = await page.waitForFunction(
    () => (globalThis.game?.ready === true ? (game.user?.name ?? null) : null),
    null, { timeout: 60_000 },
  ).then(h => h.jsonValue());

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

/**
 * Pick a named target in the Select Target dialog, then confirm.
 *
 * ⚠ Do NOT just confirm this dialog. It PRESELECTS the first actor in the list, so a bare
 * confirm silently attacks whoever happens to sort first — which sent one run at a GM-owned
 * NPC instead of the intended defender, and then hung waiting for a defaulting prompt that
 * had been routed to the GM. The symptom (a dialog timeout on the defender's client) points
 * nowhere near the cause.
 */
export async function selectTarget(page, actorName) {
  const dialog = page.locator('.application.dialog, dialog[open]')
    .filter({ has: page.locator('.window-title', { hasText: /Select Target/i }) }).first();
  await dialog.waitFor({ state: 'visible', timeout: 20_000 });

  const row = dialog.locator('.sr-target-row', { hasText: actorName }).first();
  await row.waitFor({ state: 'visible', timeout: 10_000 });
  await row.click();

  // Confirm the radio actually took — clicking the row relies on the label wiring, and a
  // silent miss here reproduces exactly the wrong-target failure above.
  const checked = await dialog.evaluate((d, name) => {
    const r = [...d.querySelectorAll('.sr-target-row')]
      .find(x => x.textContent.includes(name));
    return r?.querySelector('input[type="radio"]')?.checked ?? false;
  }, actorName);
  if (!checked) throw new Error(`Could not select "${actorName}" in the target dialog.`);

  await dialog.getByRole('button', { name: /confirm/i }).click();
}

/** Wait for a DialogV2 whose title matches, then click the button matching `button`. */
export async function answerDialog(page, titleRe, button = /confirm|ok/i, timeout = 20_000) {
  const dialog = page.locator('.application.dialog, dialog[open]')
    .filter({ has: page.locator('.window-title', { hasText: titleRe }) });
  await dialog.first().waitFor({ state: 'visible', timeout });
  await dialog.first().getByRole('button', { name: button }).click();
  return dialog.first();
}

/**
 * Answer a dialog only if it appears, on whichever of `pages` gets it. Returns true if one
 * was answered.
 *
 * ⚠ Use this for prompts whose appearance depends on WORLD STATE rather than on the flow
 * under test. The defaulting prompt is the example that cost a debugging round here: it
 * fires only when the defender lacks the skill their weapon needs, so equipping a weapon on
 * that actor — something a human might do at any time between runs — makes it vanish. A
 * test that hard-waits for it then fails with a dialog timeout that says nothing about the
 * real cause.
 *
 * Requiring it would also test the wrong thing. This spec is about the two-corner submit
 * flow; whether a defaulting prompt happens on the way is incidental.
 */
export async function answerDialogIfPresent(pages, titleRe, button = /confirm|ok/i, timeout = 6_000) {
  const list = Array.isArray(pages) ? pages : [pages];
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const page of list) {
      const dialog = page.locator('.application.dialog, dialog[open]')
        .filter({ has: page.locator('.window-title', { hasText: titleRe }) }).first();
      if (await dialog.isVisible().catch(() => false)) {
        await dialog.getByRole('button', { name: button }).click();
        return true;
      }
    }
    await list[0].waitForTimeout(250);
  }
  return false;
}

/* ── Chat-card interaction ─────────────────────────────────────────────────────
 *
 * ⚠ Do NOT use ordinary `locator.click()` / `.fill()` on a chat card.
 *
 * Foundry re-renders a message whenever anything about it changes, and this system
 * appends to the card during render (the progress strip). Playwright's actionability
 * checks — visible, stable, in-viewport — then race the re-render and fail with
 * "element was detached from the DOM" or "element is outside of the viewport",
 * neither of which indicates a real problem with the thing under test.
 *
 * These helpers act on the LIVE node at the moment of the call and skip the
 * stability wait. The tradeoff is real and worth stating: they will happily "click"
 * a button a user could not reach, so they must not be used to assert that
 * something is clickable. Assert that separately with `toBeEnabled()` — which the
 * melee spec does — and use these only to perform the action.
 */

/**
 * The message id of the newest card of a given `data-twocorner` kind.
 *
 * ⚠ Always scope card interaction to an id. Selecting by card class alone takes the FIRST
 * match in the document, which in a chat log is the OLDEST — so a leftover card from an
 * earlier run gets driven instead of the one this test just created. That produced a
 * genuinely confusing failure: `toBeEnabled()` passed on one element and the click landed
 * on another, reporting "disabled" a second later.
 *
 * The log is not reliably empty between runs (a test that dies mid-way never reaches its
 * cleanup), so this cannot be solved by clearing chat and hoping.
 */
export async function newestCardId(page, kind) {
  return page.waitForFunction(({ k, log }) => {
    const cards = [...document.querySelectorAll(`${log} [data-twocorner="${k}"]`)];
    const last  = cards.at(-1);
    const msg   = last?.closest('.message');
    return msg?.dataset?.messageId ?? null;
  }, { k: kind, log: CHAT_LOG }, { timeout: 20_000 }).then(h => h.jsonValue());
}

/** A locator scoped to one message, so leftovers in the log cannot be hit by mistake. */
export function cardIn(page, messageId) {
  return page.locator(`${CHAT_LOG} .message[data-message-id="${messageId}"]`);
}

/** Set a card input's value directly. Handlers read `.value` at click time. */
export async function setCardField(page, cardSel, fieldCls, value) {
  const ok = await page.evaluate(({ c, f, v }) => {
    const el = document.querySelector(`${c} .${f}`);   // c is message-scoped by the caller
    if (!el) return false;
    el.value = String(v);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, { c: cardSel, f: fieldCls, v: value });
  if (!ok) throw new Error(`No field .${fieldCls} on ${cardSel}`);
}

/** Dispatch a click on a card button, bypassing actionability checks. */
export async function clickCardButton(page, cardSel, btnSel) {
  const state = await page.evaluate(({ c, b }) => {
    const el = document.querySelector(`${c} ${b}`);
    if (!el) return 'missing';
    if (el.disabled) return 'disabled';
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return 'clicked';
  }, { c: cardSel, b: btnSel });
  if (state !== 'clicked') throw new Error(`Could not click ${btnSel} on ${cardSel}: ${state}`);
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
      astralPoolSpent: a.system.astralPoolSpent ?? 0,
      availableAstralPool: a.system.derived?.availableAstralPool ?? null,
      spellPoolSpent: a.system.spellPoolSpent ?? 0,
      stun: a.system.wounds?.stun?.value ?? 0,
      physical: a.system.wounds?.physical?.value ?? 0,
    };
  }, name);
}

/**
 * Put an actor into a KNOWN state, and fail loudly if the world cannot provide it.
 *
 * This is the fix for a whole class of flakiness: a shared world drifts between runs
 * (someone equips a weapon, spends a pool, adds a skill), and a test written against
 * yesterday's state fails somewhere far from the cause. One run here waited 20s for a
 * defaulting prompt that could no longer fire, because the defender's Katana had been
 * equipped in the meantime — the error said "dialog timeout" and pointed nowhere.
 *
 * Arranging beats tolerating. Making the test cope with either state (answer the prompt
 * "if it appears") hides the drift and quietly tests a different path each run.
 *
 * @param {object} spec
 * @param {string|null} [spec.equipMelee]  Item NAME to equip, or null to unequip.
 * @param {string[]}    [spec.requireSkills] Skills the actor must have — asserted, not created.
 * @param {boolean}     [spec.resetPools=true]
 */
export async function arrangeActor(page, name, spec = {}) {
  const result = await page.evaluate(async ({ n, s }) => {
    const a = game.actors.getName(n);
    if (!a) return { error: `No actor named "${n}" in this world.` };
    if (!a.isOwner) return { error: `This client does not own "${n}" — arrange it from its owner's page.` };

    if (s.requireSkills?.length) {
      const have = a.items.filter(i => i.type === 'skill').map(i => i.name);
      const missing = s.requireSkills.filter(r => !have.some(h => h === r || h.includes(r)));
      if (missing.length) {
        return { error: `"${n}" is missing required skill(s): ${missing.join(', ')}. `
          + `Has: ${have.join(', ')}` };
      }
    }

    const update = {};
    if (s.equipMelee !== undefined) {
      if (s.equipMelee === null) update['system.equippedMelee'] = '';
      else {
        const it = a.items.find(i => i.type === 'melee' && i.name === s.equipMelee);
        if (!it) return { error: `"${n}" has no melee item named "${s.equipMelee}".` };
        update['system.equippedMelee'] = it.id;
      }
    }
    if (s.resetPools !== false) update['system.combatPoolSpent'] = 0;
    if (Object.keys(update).length) await a.update(update);

    const eq = a.system.equippedMelee ? a.items.get(a.system.equippedMelee)?.name : null;
    return { ok: true, equipped: eq ?? null, combatPoolSpent: a.system.combatPoolSpent ?? 0 };
  }, { n: name, s: spec });

  if (result.error) throw new Error(`arrangeActor(${name}): ${result.error}`);
  return result;
}

/**
 * Create a disposable actor owned by a named user, and return its id.
 *
 * ⚠ Prefer this to mutating the world's existing characters. A spec needing an Awakened
 * actor could bolt Sorcery and a Magic attribute onto whoever happens to be there, but that
 * silently rewrites someone's character and leaves the world different afterwards. Creating
 * and deleting is additive and reversible; the maintainer's actors are left alone.
 *
 * Requires a GM session (role 3+) — creating actors and assigning ownership are both
 * privileged. Pass the `janitor` fixture's page.
 *
 * ⚠ ALWAYS delete these in teardown (`deleteActors`). They are real documents in a real
 * world, and a suite that leaks them turns the actor directory into a graveyard.
 */
export async function createTestActor(gmPage, {
  name, ownerUserName, system = {}, items = [], withToken = true, x = 1000, y = 1000,
}) {
  const res = await gmPage.evaluate(async ({ n, owner, sys, its, tok, tx, ty }) => {
    if (!game.user.isGM) return { error: `${game.user.name} is not a GM — cannot create actors.` };

    const user = game.users.find(u => u.name === owner);
    if (owner && !user) return { error: `No user named "${owner}".` };

    const ownership = { default: 0 };
    if (user) ownership[user.id] = 3;   // OWNER

    const actor = await Actor.create({ name: n, type: 'character', ownership, system: sys });
    if (!actor) return { error: `Actor.create returned nothing for "${n}".` };
    if (its.length) await actor.createEmbeddedDocuments('Item', its);

    // ⚠ A token is not decoration — without one the actor cannot be TARGETED.
    //
    // `SR3EItem._promptTarget` prefers actors with a token on the current scene and only
    // falls back to the whole world list when the canvas has none ("theatre of the mind").
    // Since the world's own characters have tokens, that fallback never fires, and a
    // token-less test actor is silently absent from the target dialog — which reads as
    // "my actor was not created" when in fact it was.
    let tokenId = null;
    if (tok && game.scenes?.active) {
      const proto = await actor.getTokenDocument({ x: tx, y: ty });
      const [placed] = await game.scenes.active.createEmbeddedDocuments('Token', [proto.toObject()]);
      tokenId = placed?.id ?? null;
    }

    return {
      id: actor.id,
      name: actor.name,
      tokenId,
      hasToken: actor.getActiveTokens().length > 0,
      magic: actor.system?.attributes?.magic?.value ?? 0,
      astralPool: actor.system?.derived?.astralPool ?? null,
      skills: actor.items.filter(i => i.type === 'skill').map(i => i.name),
    };
  }, { n: name, owner: ownerUserName, sys: system, its: items, tok: withToken, tx: x, ty: y });

  if (res.error) throw new Error(`createTestActor(${name}): ${res.error}`);
  if (withToken && !res.hasToken) {
    throw new Error(`createTestActor(${name}): no token was placed, so this actor cannot be `
      + 'targeted. Is a scene active?');
  }
  return res;
}

/** Delete actors by id. Safe to call with ids that no longer exist. */
export async function deleteActors(gmPage, ids) {
  if (!ids?.length) return { deleted: 0 };
  return gmPage.evaluate(async list => {
    const present = list.filter(id => game.actors.get(id));
    if (present.length) await Actor.deleteDocuments(present);
    return { deleted: present.length };
  }, ids);
}

/**
 * Reset an actor's spent pools. Tests mutate the world permanently, so anything a test
 * changes it must put back — there is no transaction to roll back.
 *
 * ⚠ Call this on the page of a client that OWNS the actor. A player cannot update someone
 * else's actor, and the failure is a permission error thrown from deep inside Foundry's
 * server backend, which reads as a Foundry bug rather than a test bug.
 */
export async function resetPools(page, ...names) {
  await page.evaluate(async ns => {
    for (const n of ns) {
      const a = game.actors.getName(n);
      if (a?.isOwner) await a.update({ 'system.combatPoolSpent': 0 });
    }
  }, names);
}

/**
 * Delete chat messages this client is allowed to delete.
 *
 * ⚠ Deliberately permission-aware rather than deleting everything. Only a GM may remove
 * another user's messages, so a player-driven test calling this unconditionally dies inside
 * `ServerDatabaseBackend._deleteDocuments` with a wall of minified stack that says nothing
 * about the actual cause — which is exactly what the first run of this suite did.
 *
 * ⚠ It is NOT the isolation mechanism, only tidying. Assertions must find their own card
 * (see `actedLedger`, which takes the most recent two-corner card) rather than assuming an
 * empty log, because a previous run's messages may legitimately still be there.
 */
export async function clearChat(page) {
  return page.evaluate(async () => {
    const mine = game.messages.contents
      .filter(m => game.user.isGM || m.author?.id === game.user.id)
      .map(m => m.id);
    if (mine.length) await ChatMessage.deleteDocuments(mine);
    return { deleted: mine.length, remaining: game.messages.contents.length };
  });
}

/**
 * Empty the chat log completely. Requires a GM or Assistant GM session.
 *
 * ⚠ Run this as ARRANGE, not only as cleanup. A test that dies part-way never reaches its
 * cleanup, so the next run starts with the wreckage — and stale cards are actively harmful
 * here, not untidy: selecting by card class finds the OLDEST match in the log, so the
 * previous run's spent card gets driven instead of the fresh one.
 *
 * Scoping every interaction to a message id (see `newestCardId`) defends against the same
 * thing, and both are worth having: one keeps the log honest, the other survives a log that
 * is not.
 */
export async function clearChatAll(page) {
  const res = await page.evaluate(async () => {
    // Role 3 = Assistant GM, 4 = Gamemaster. Trusted Player (2) is NOT enough, and the
    // distinction is easy to get wrong when setting an account up — this exact check
    // caught an account believed to be Assistant GM that was actually role 2, whose
    // failure otherwise arrives as a permission error from deep inside Foundry's server
    // backend naming a message id, which reads as a bug rather than a misconfiguration.
    if (!game.user.isGM) {
      return { error: `"${game.user.name}" is role ${game.user.role} (needs 3 = Assistant GM `
        + 'or 4 = Gamemaster) so it cannot delete other users\' messages. '
        + 'Fix the role in Configuration → User Management, or set FOUNDRY_JANITOR to an '
        + 'account that has it.' };
    }
    const ids = game.messages.contents.map(m => m.id);
    if (ids.length) await ChatMessage.deleteDocuments(ids);
    return { deleted: ids.length, remaining: game.messages.contents.length };
  });
  if (res.error) throw new Error(`clearChatAll: ${res.error}`);
  return res;
}
