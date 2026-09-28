/**
 * Rigger dump shock — TODO 198, on the rigger's own client.
 *
 * SR3 p.156: dumped from a remote-control network, a rigger resists (RC deck Rating + 4)S Stun with
 * Willpower, and is disoriented (+2) for ten Combat Turns unless a Willpower (4) Test shortens it.
 * The ⚡ Dumpshock tool treated a rigger like a decker (host System Rating, Body, track by user mode).
 * `tests/rigger-shock.test.mjs` pins the rules and the source; this proves the flow a player runs.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors, fireAndForget } from './foundry.mjs';

const RIGGER = '__TEST Rigger Dumpshock';

test.describe('rigger dump shock (TODO 198)', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    const a = await createTestActor(janitor.page, {
      name: RIGGER, ownerUserName: 'Player2', withToken: false,
      system: { attributes: { body: { base: 2 }, willpower: { base: 5 } }, ew: { deckRating: 4 } },
    });
    created = [a.id];
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

  test('a rigger dumped from the network resists 8S Stun with Willpower, and can shorten disorientation', async ({ player2 }) => {
    const p = player2.page;
    await fireAndForget(p, `await game.actors.getName(${JSON.stringify(RIGGER)}).rollDumpshock();`);

    const dlg = p.locator('.application.dialog').filter({ has: p.locator('.window-title', { hasText: /Dumpshock/ }) }).first();
    await dlg.waitFor({ state: 'visible', timeout: 20_000 });
    // Not in VR, RC deck on file → the network case is preselected, with the deck's rating.
    expect(await dlg.evaluate(d => d.querySelector('#ds-kind').value)).toBe('network');
    expect(await dlg.evaluate(d => d.querySelector('#ds-deck').value)).toBe('4');
    await dlg.getByRole('button', { name: /Apply Dumpshock/i }).click();

    const cardId = await p.waitForFunction(n => game.messages.contents.findLast(m =>
      m.content.includes('Rigger Dump Shock') && m.content.includes(n))?.id ?? null, RIGGER, { timeout: 20_000 })
      .then(h => h.jsonValue());
    const card = await p.evaluate(id => game.messages.get(id).content, cardId);
    expect(card).toMatch(/8S Stun/);
    expect(card).toMatch(/Willpower/);
    expect(card).toMatch(/\+2<\/strong> to all Success Tests for 10 Combat Turns/);

    // ── The soak card: Willpower dice, no armour, TN = the Power ──────────────────────
    await p.locator(`#chat .message[data-message-id="${cardId}"] .sr-soak-btn`).first().evaluate(b => b.click());
    const soakId = await p.waitForFunction(n => game.messages.contents.findLast(m =>
      m.content.includes('sr-soak-card') && m.content.includes(n))?.id ?? null, RIGGER, { timeout: 20_000 })
      .then(h => h.jsonValue());
    const soak = await p.evaluate(id => {
      const el = document.querySelector(`#chat .message[data-message-id="${id}"]`);
      return {
        text: el.textContent.replace(/\s+/g, ' '),
        dice: el.querySelector('.sr-soak-body')?.value,
        tn:   el.querySelector('.sr-soak-tn')?.value,
        payload: JSON.parse(el.querySelector('.sr-soak-roll-btn').dataset.payload),
      };
    }, soakId);
    expect(soak.text).toMatch(/Willpower dice/);
    expect(soak.dice, 'Willpower 5, not Body 2').toBe('5');
    expect(soak.tn, 'no armour against biofeedback').toBe('8');
    expect(soak.payload).toMatchObject({ resistAttr: 'willpower', isStun: true, stagedPower: 8, stagedLevel: 'S', noKnockdown: true });

    // ── The disorientation test posts how long it lasts ──────────────────────────────
    await p.locator(`#chat .message[data-message-id="${cardId}"] .sr-rigger-disorient-btn`).first().evaluate(b => b.click());
    await expect.poll(() => p.evaluate(n => game.messages.contents.some(m =>
      m.content.includes('Disorientation') && m.content.includes(n) && /Combat Turn/.test(m.content)), RIGGER), { timeout: 20_000 }).toBe(true);
  });
});
