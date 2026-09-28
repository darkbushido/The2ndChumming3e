/**
 * Rigger damage from a badly hurt vehicle — TODO 199, across real clients.
 *
 * SR3 p.145: when a vehicle a rigger is jacked into takes Serious damage the rigger resists 6M
 * Physical; destroyed, 6S — with Willpower, no Combat or Control Pool. Nothing offered this before.
 * `tests/rigger-shock.test.mjs` pins the rule and the hook's source; this proves the GM damaging the
 * vehicle posts the card and the rigger's player gets a Willpower soak with no pool.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors } from './foundry.mjs';

const RIGGER  = '__TEST Rigger Feedback';
const VEHICLE = '__TEST Rigged Van';

test.describe('rigger damage (TODO 199)', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    const r = await createTestActor(janitor.page, {
      name: RIGGER, ownerUserName: 'Player2', withToken: false,
      system: { attributes: { body: { base: 2 }, willpower: { base: 4 } } },
    });
    const v = await createTestActor(janitor.page, {
      name: VEHICLE, ownerUserName: 'Player2', withToken: false, type: 'vehicle',
      system: { attributes: { body: { base: 4 } }, driverActorId: r.id, controlMode: 'vcr' },
    });
    created = [r.id, v.id];
  });

  test.afterEach(async ({ janitor }) => {
    await janitor.page.evaluate(async n => {
      const ids = game.messages.contents.filter(m => m.content.includes(n)).map(m => m.id);
      if (ids.length) await ChatMessage.deleteDocuments(ids);
    }, RIGGER).catch(() => {});
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
  });

  test('Serious offers 6M, Destroyed offers 6S, each once; the rigger soaks with Willpower and no pool', async ({ player2, janitor }) => {
    const g = janitor.page;
    const cards = page => page.evaluate(n => game.messages.contents
      .filter(m => m.content.includes('Rigger Damage') && m.content.includes(n)).map(m => m.content), RIGGER);
    const setBoxes = b => g.evaluate(async ({ v, b }) =>
      game.actors.getName(v).update({ 'system.damage.value': b }), { v: VEHICLE, b });
    const max = await g.evaluate(v => {
      const a = game.actors.getName(v);
      return a.system.derived?.damageMax ?? a.system.attributes.body.base * 2;
    }, VEHICLE);

    // Moderate first: no card.
    await setBoxes(Math.ceil(max / 2));
    await g.waitForTimeout(1500);
    expect(await cards(g), 'Moderate damage posts nothing').toHaveLength(0);

    // Serious: one 6M card.
    await setBoxes(Math.ceil(max * 0.75));
    await expect.poll(async () => (await cards(g)).length, { timeout: 20_000 }).toBe(1);
    expect((await cards(g))[0]).toMatch(/6M Physical/);

    // Another box inside Serious: still one card.
    if (Math.ceil(max * 0.75) + 1 < max) {
      await setBoxes(Math.ceil(max * 0.75) + 1);
      await g.waitForTimeout(1500);
      expect(await cards(g)).toHaveLength(1);
    }

    // Destroyed: a 6S card.
    await setBoxes(max);
    await expect.poll(async () => (await cards(g)).length, { timeout: 20_000 }).toBe(2);
    expect((await cards(g))[1]).toMatch(/6S Physical/);

    // ── The rigger's player opens the soak: Willpower dice, no Combat Pool field ─────
    const p = player2.page;
    const cardId = await p.waitForFunction(n => game.messages.contents.findLast(m =>
      m.content.includes('Rigger Damage') && m.content.includes(n))?.id ?? null, RIGGER, { timeout: 20_000 })
      .then(h => h.jsonValue());
    const btn = p.locator(`#chat .message[data-message-id="${cardId}"] .sr-soak-btn`).first();
    await expect(btn).toBeEnabled({ timeout: 20_000 });
    await btn.evaluate(b => b.click());
    const soak = await p.waitForFunction(n => {
      const m = game.messages.contents.findLast(x => x.content.includes('sr-soak-card') && x.content.includes(n));
      const el = m && document.querySelector(`#chat .message[data-message-id="${m.id}"]`);
      return el ? { text: el.textContent.replace(/\s+/g, ' '), dice: el.querySelector('.sr-soak-body')?.value,
        tn: el.querySelector('.sr-soak-tn')?.value, cp: !!el.querySelector('.sr-soak-cp') } : null;
    }, RIGGER, { timeout: 20_000 }).then(h => h.jsonValue());
    expect(soak.text).toMatch(/Willpower dice/);
    expect(soak.dice, 'Willpower 4, not Body 2').toBe('4');
    expect(soak.tn, 'Power 6, no armour').toBe('6');
    expect(soak.cp, 'no Combat Pool on this test (p.145)').toBe(false);
    expect(soak.text).toMatch(/No Combat or Control Pool/);
  });
});
