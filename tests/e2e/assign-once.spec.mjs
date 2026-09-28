/**
 * 🩸 Assign the wound lands ONCE, table-wide — TODO 137, across real clients.
 *
 * Reported in play: the damage card assigned the wound again after the player had already assigned
 * it through the chat pop-up. `_usedButtons` knows one browser, so the same card in the GM's chat log
 * (or the player's own after a reload) stayed live and `_applyDamageBoxes` added the boxes again.
 * The fix records the step on the MESSAGE (`acted` ledger), checked and written by the GM in one
 * queued step. `tests/open-steps.test.mjs` pins `runOnce`; this proves the table-wide half.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors } from './foundry.mjs';

const VICTIM = '__TEST Assign Once';
const ROLE   = 'step:sr-assign-damage-btn:0';

test.describe('Assign the wound (TODO 137)', () => {
  let created = [];
  let cardId  = null;

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    const a = await createTestActor(janitor.page, { name: VICTIM, ownerUserName: 'Player3', withToken: false });
    created = [a.id];
    // A result card as the soak flow posts it — 3 Stun boxes on the victim.
    cardId = await janitor.page.evaluate(async id => {
      const payload = JSON.stringify({ actorId: id, track: 'stun', boxes: 3 }).replace(/'/g, '&#39;');
      const msg = await ChatMessage.create({
        content: `<div class="sr-roll-card"><div class="sr-soak-action">
          <button class="sr-assign-damage-btn" data-payload='${payload}'>🩸 Assign Moderate Stun Wound</button>
        </div></div>`,
      });
      return msg.id;
    }, a.id);
  });

  test.afterEach(async ({ janitor }) => {
    await janitor.page.evaluate(id => game.messages.get(id)?.delete(), cardId).catch(() => {});
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
  });

  test('the player assigns it; no other copy of the card can assign it again', async ({ player3, janitor }) => {
    const stun = page => page.evaluate(n => game.actors.getName(n)?.system.wounds.stun.value ?? null, VICTIM);

    // ── The owner clicks Assign in their chat log ────────────────────────────────────
    const btn = player3.page.locator(`#chat .message[data-message-id="${cardId}"] .sr-assign-damage-btn`).first();
    await btn.waitFor({ state: 'visible', timeout: 20_000 });
    await expect(btn).toBeEnabled();
    // A DOM click: the chat log's scroll container can leave the card outside Playwright's viewport.
    await btn.evaluate(b => b.click());
    await expect.poll(() => stun(janitor.page), { timeout: 20_000 }).toBe(3);

    // ── The step is recorded on the message, so every client knows ───────────────────
    await expect.poll(() => janitor.page.evaluate(({ id, role }) =>
      !!game.messages.get(id)?.getFlag('The2ndChumming3e', 'acted')?.[role], { id: cardId, role: ROLE }),
    { timeout: 20_000 }).toBe(true);

    // ── The GM's copy renders spent — from the ledger, not from this browser's memory ─
    const gmBtn = janitor.page.locator(`#chat .message[data-message-id="${cardId}"] .sr-assign-damage-btn`).first();
    await expect(gmBtn).toBeDisabled({ timeout: 20_000 });
    await expect(gmBtn).toHaveAttribute('title', /Already assigned/);

    // ── A fresh render (what a reload does) is spent too, on the player's client ─────
    const fresh = await player3.page.evaluate(async id => {
      const el = await game.messages.get(id).renderHTML();
      const b  = el.querySelector('.sr-assign-damage-btn');
      return { disabled: b?.disabled, title: b?.title };
    }, cardId);
    expect(fresh.disabled, 'a re-rendered card cannot assign the wound again').toBe(true);
    expect(fresh.title).toMatch(/Already assigned/);

    // ── Even forced past the render guard, the GM refuses the second write ───────────
    const second = await janitor.page.evaluate(async ({ id, role }) => {
      const b = document.createElement('button');
      b.dataset.payload = document.querySelector(`#chat .message[data-message-id="${id}"] .sr-assign-damage-btn`).dataset.payload;
      return game.sr3e.SR3EActor.handleAssignDamage(b, { messageId: id, role, label: 'Assign the wound' });
    }, { id: cardId, role: ROLE });
    expect(second).toBe('already');
    expect(await stun(janitor.page), 'the wound track moved once').toBe(3);
  });
});
