/**
 * The Karma Pool in play, the GM's undo of a Karma spend, and a downed NPC as a healing patient —
 * the 2026-10-11 Karma audit (TODO 216, 212, 220) and TODO 207, across real clients.
 *
 *   · Player2 rolls with "Hold the roll for Karma": the roll stops on a 🍀 card. Player3 sees the
 *     buttons greyed; Player2 re-rolls the failures (1 spent), re-rolls again (2 more) and presses
 *     ✔ Done, which posts the ordinary result. Extra dice are bought before a roll (1, 3, 6…).
 *   · The GM buys an adept a Power Point in the Spend Karma calculator, then undoes it with the ↺ on
 *     its ledger line: the Karma comes back, the Power Point goes, the line is marked undone.
 *   · A downed NPC — an UNLINKED token whose world actor is a template — is offered by the healing
 *     picker, and named by its token UUID so healing it never touches the base actor.
 *
 * Unit and source-level coverage is tests/karma-uses.test.mjs and tests/healing.test.mjs; this is the
 * part only two clients can show (the roller decides, everyone else sees it decided).
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors, fireAndForget, clickNewestChatButton } from './foundry.mjs';

const ROLLER = '__TEST Karma Roller';
const ADEPT  = '__TEST Karma Adept';
const NPC    = '__TEST Karma Downed NPC';

/** The newest message carrying a 🍀 hold, as { id, spent, rerolls } read on `page`. */
const newestHold = (page, after = null) => page.waitForFunction(({ n, prev }) => {
  const m = game.messages.contents.findLast(x => x.getFlag('The2ndChumming3e', 'karmaHold')?.label?.includes(n));
  return m && m.id !== prev ? { id: m.id, rerolls: m.getFlag('The2ndChumming3e', 'karmaHold').karmaRerolls ?? 0 } : null;
}, { n: ROLLER, prev: after }, { timeout: 20_000 }).then(h => h.jsonValue());

const spentOf = (page, name) => page.evaluate(n => game.actors.getName(n)?.system.karmaPoolSpent ?? null, name);

test.describe('the Karma Pool and Good Karma (TODO 216, 212, 207)', () => {
  let created = [];
  let tokenIds = [];

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    created = []; tokenIds = [];
  });

  test.afterEach(async ({ janitor }) => {
    await janitor.page.evaluate(async ({ names, toks }) => {
      const ids = game.messages.contents.filter(m => names.some(n => m.content.includes(n))).map(m => m.id);
      if (ids.length) await ChatMessage.deleteDocuments(ids);
      const scene = game.scenes.active;
      const live = toks.filter(id => scene?.tokens.get(id));
      if (live.length) await scene.deleteEmbeddedDocuments('Token', live);
    }, { names: [ROLLER, ADEPT, NPC], toks: tokenIds }).catch(() => {});
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
  });

  test('a held roll is the roller\'s to spend, once, and resolves on Done', async ({ player2, player3, janitor }) => {
    const roller = await createTestActor(janitor.page, {
      name: ROLLER, ownerUserName: 'Player2', withToken: false,
      system: { karmaPool: 8, karmaPoolSpent: 0 },
    });
    created.push(roller.id);
    const p2 = player2.page, p3 = player3.page;

    // ── Extra dice before the roll: 2 dice cost 3 (p.246) ───────────────────────────
    await fireAndForget(p2, `await game.actors.getName(${JSON.stringify(ROLLER)}).rollPool(4, 4, ${JSON.stringify(`${ROLLER} extra`)}, { karmaDice: 2, skipWoundMod: true, skipSustainMod: true });`);
    const extra = await p2.waitForFunction(n => {
      const m = game.messages.contents.findLast(x => x.content.includes(`${n} extra`));
      return m ? new DOMParser().parseFromString(m.content, 'text/html').querySelectorAll('.sr-roll-dice .sr-die').length : null;
    }, ROLLER, { timeout: 20_000 }).then(h => h.jsonValue());
    expect(extra, 'four dice and two bought').toBe(6);
    await expect.poll(() => spentOf(janitor.page, ROLLER), { message: 'two extra dice cost 3' }).toBe(3);

    // ── Held: a 🍀 card, the roller's buttons only ──────────────────────────────────
    await fireAndForget(p2, `await game.actors.getName(${JSON.stringify(ROLLER)}).rollPool(8, 6, ${JSON.stringify(`${ROLLER} hold`)}, { karmaHold: true, skipWoundMod: true, skipSustainMod: true });`);
    const h1 = await newestHold(p2);
    await p3.waitForFunction(id => !!document.querySelector(`#chat .message[data-message-id="${id}"] .sr-karma-done-btn`), h1.id, { timeout: 20_000 });
    const p3Disabled = await p3.evaluate(id => [...document.querySelectorAll(`#chat .message[data-message-id="${id}"] .sr-karma-btn, #chat .message[data-message-id="${id}"] .sr-karma-done-btn`)].every(b => b.disabled), h1.id);
    expect(p3Disabled, 'Player3 cannot spend Player2\'s Karma Pool').toBe(true);

    // ── Re-roll the failures: 1, then 2 more ─────────────────────────────────────────
    const failures = await p2.evaluate(id => game.messages.get(id).getFlag('The2ndChumming3e', 'karmaHold').dice.filter(d => !d.success).length, h1.id);
    test.skip(failures === 0, 'all eight dice hit at TN 6 — nothing to re-roll this run');
    await clickNewestChatButton(p2, '.sr-karma-btn[data-karma="reroll"]');
    const h2 = await newestHold(p2, h1.id);
    expect(h2.rerolls, 'the new card counts one re-roll').toBe(1);
    await expect.poll(() => spentOf(janitor.page, ROLLER), { message: 'the first re-roll costs 1' }).toBe(4);
    const oldSpentEverywhere = await p3.waitForFunction(id => [...document.querySelectorAll(`#chat .message[data-message-id="${id}"] .sr-karma-done-btn`)].every(b => b.disabled), h1.id, { timeout: 20_000 }).then(() => true);
    expect(oldSpentEverywhere, 'the first card is spent on the other client too').toBe(true);

    const more = await p2.evaluate(id => game.messages.get(id).getFlag('The2ndChumming3e', 'karmaHold').dice.some(d => !d.success), h2.id);
    let last = h2;
    if (more) {
      await clickNewestChatButton(p2, '.sr-karma-btn[data-karma="reroll"]');
      last = await newestHold(p2, h2.id);
      await expect.poll(() => spentOf(janitor.page, ROLLER), { message: 'the second re-roll costs 2 more' }).toBe(6);
    }

    // ── Done: the ordinary result, no hold ──────────────────────────────────────────
    await clickNewestChatButton(p2, '.sr-karma-done-btn');
    const resolved = await p2.waitForFunction(({ n, prev }) => {
      const msgs = game.messages.contents; const i = msgs.findIndex(m => m.id === prev);
      return msgs.slice(i + 1).some(m => m.content.includes(`${n} hold`) && !m.getFlag('The2ndChumming3e', 'karmaHold'));
    }, { n: ROLLER, prev: last.id }, { timeout: 20_000 }).then(h => h.jsonValue());
    expect(resolved, '✔ Done posts the result card').toBe(true);
  });

  test('the GM undoes a Power Point bought with Good Karma', async ({ janitor }) => {
    const gm = janitor.page;
    const adept = await createTestActor(gm, {
      name: ADEPT, withToken: false,
      system: { karma: 40, magicType: 'Adept', attributes: { magic: { base: 5 } } },
    });
    created.push(adept.id);

    // Buy through the real calculator dialog.
    await fireAndForget(gm, `const a = game.actors.getName(${JSON.stringify(ADEPT)}); await a.sheet.render(true); await a.sheet.constructor._onSpendKarmaCalculator.call(a.sheet);`);
    const calc = gm.locator('.application.dialog').filter({ has: gm.locator('input[value="pp:buy"]') }).first();
    await calc.waitFor({ state: 'visible', timeout: 20_000 });
    await calc.evaluate(d => { d.querySelector('input[value="pp:buy"]').checked = true; });
    await calc.getByRole('button', { name: /Spend Karma/i }).click();
    await expect.poll(() => gm.evaluate(n => game.actors.getName(n).system.powerPointsBought, ADEPT)).toBe(1);
    expect(await gm.evaluate(n => game.actors.getName(n).system.karma, ADEPT), 'a Power Point costs 20 (SR3 p.168)').toBe(20);

    // Undo it from the ledger line.
    await gm.waitForFunction(n => !!game.actors.getName(n).sheet.element?.querySelector('[data-action="undoKarmaSpend"]'), ADEPT, { timeout: 20_000 });
    await gm.evaluate(n => game.actors.getName(n).sheet.element.querySelector('[data-action="undoKarmaSpend"]').click(), ADEPT);
    const undo = gm.locator('.application.dialog').filter({ has: gm.locator('.undo-refund') }).first();
    await undo.waitFor({ state: 'visible', timeout: 20_000 });
    const rows = await undo.evaluate(d => [...d.querySelectorAll('label')].map(l => l.textContent.replace(/\s+/g, ' ').trim()));
    expect(rows, 'the refund and the field, each untickable').toEqual(['Refund 20 Good Karma', 'powerPointsBought → 0']);
    await undo.getByRole('button', { name: /Undo/i }).click();

    await expect.poll(() => gm.evaluate(n => game.actors.getName(n).system.karma, ADEPT), { message: 'the Karma is refunded' }).toBe(40);
    const after = await gm.evaluate(n => {
      const a = game.actors.getName(n);
      return { pp: a.system.powerPointsBought, lines: a.system.ledger.filter(e => e.kind === 'karma').map(e => ({ d: e.delta, undone: !!e.reverted, why: e.reason })) };
    }, ADEPT);
    expect(after.pp, 'the Power Point is gone').toBe(0);
    expect(after.lines.at(-2), 'the purchase is marked undone, not deleted').toMatchObject({ d: -20, undone: true });
    expect(after.lines.at(-1).why, 'the refund is its own line').toMatch(/^↺ Undid: /);
  });

  test('a downed NPC token is a healing patient (TODO 207)', async ({ janitor }) => {
    const gm = janitor.page;
    const npc = await createTestActor(gm, { name: NPC, type: 'npc', withToken: false });
    created.push(npc.id);
    // As dragged from a compendium: the world actor is a TEMPLATE, the hurt one is its unlinked token.
    const res = await gm.evaluate(async ({ id }) => {
      const a = game.actors.get(id);
      await a.setFlag('The2ndChumming3e', 'isTemplate', true);
      const scene = game.scenes.active;
      if (!scene) return { error: 'no active scene' };
      const proto = await a.getTokenDocument({ x: 1100, y: 1100, actorLink: false });
      const [tok] = await scene.createEmbeddedDocuments('Token', [{ ...proto.toObject(), actorLink: false }]);
      await tok.actor.update({ 'system.wounds.physical.value': 9 });
      const H = game.sr3e.SR3EHealing;
      const list = H.patientsFor(game.user, game.actors.contents, H.sceneTokenActors());
      const ref = H.ref(tok.actor);
      return { tokenId: tok.id, offered: list.some(x => x.uuid === tok.actor.uuid), baseOffered: list.includes(a),
               refIsUuid: ref === tok.actor.uuid, resolves: H.actor(ref) === tok.actor,
               tokenWounds: H._state(H.actor(ref)).physical, baseWounds: a.system.wounds?.physical?.value ?? 0 };
    }, { id: npc.id });
    expect(res.error ?? null).toBeNull();
    tokenIds.push(res.tokenId);
    expect(res.offered, 'the downed token is offered').toBe(true);
    expect(res.baseOffered, 'the template world actor is not').toBe(false);
    expect(res.refIsUuid && res.resolves, 'cards name the token by UUID and read it back').toBe(true);
    expect([res.tokenWounds, res.baseWounds], 'the token is the hurt one, not the base actor').toEqual([9, 0]);
  });
});
