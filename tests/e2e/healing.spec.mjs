/**
 * Guided healing ACROSS players — reported in play on 0.5.1: "player A can't heal player B, but
 * player B can heal themselves with player A's skill".
 *
 * Two players who own nothing of each other's: Player2's medic treats Player3's patient.
 *   · Player2 can pick Player3's character as the patient (the list was owner-only).
 *   · The first-aid card's Dice / TN are read-only to the player; the GM sets them on the
 *     message and the player's roll uses the GM's numbers.
 *   · The result card carries the time box, and the medic may press "Lower" — the write goes
 *     through the GM (`sr3e.heal.apply`), because Player2's client cannot change Player3's actor.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors, fireAndForget, actorState } from './foundry.mjs';

const MEDIC   = '__TEST Heal Medic';
const PATIENT = '__TEST Heal Patient';

test.describe('one player\'s character treats another\'s', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    const medic = await createTestActor(janitor.page, {
      name: MEDIC, ownerUserName: 'Player2', withToken: false,
      system: { attributes: { intelligence: { base: 4 } } },
      items: [{ name: 'Biotech', type: 'skill',
                system: { skillName: 'Biotech', category: 'Technical skills', rating: 4, linkedAttribute: 'intelligence' } }],
    });
    const patient = await createTestActor(janitor.page, {
      name: PATIENT, ownerUserName: 'Player3', withToken: false,
      system: { attributes: { body: { base: 5 } }, wounds: { physical: { value: 3 } } },
    });
    created = [medic.id, patient.id];
  });

  test.afterEach(async ({ janitor }) => {
    await janitor.page.evaluate(async names => {
      const ids = game.messages.contents.filter(m => names.some(n => m.content.includes(n))).map(m => m.id);
      if (ids.length) await ChatMessage.deleteDocuments(ids);
    }, [MEDIC, PATIENT]).catch(() => {});
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
  });

  test('Player2\'s medic gives first aid to Player3\'s character', async ({ player2, player3, janitor }) => {
    const p2 = player2.page;

    // ── Player2 can pick someone else's character ──────────────────────────────────
    const listed = await p2.evaluate(n => game.sr3e.SR3EHealing
      .patientsFor(game.user, game.actors.contents).map(a => a.name).includes(n), PATIENT);
    expect(listed, 'Player3\'s character is offered to Player2 as a patient').toBe(true);
    expect(await p2.evaluate(n => game.actors.getName(n).isOwner, PATIENT)).toBe(false);

    // ── Post the first-aid card from Player2's client, with the medic chosen ────────
    await fireAndForget(p2, `await game.sr3e.SR3EHealing.setup(game.actors.getName(${JSON.stringify(PATIENT)}), 'firstaid');`);
    const form = p2.locator('.application.dialog').filter({ has: p2.locator('.window-title', { hasText: /First aid/ }) }).first();
    await form.waitFor({ state: 'visible', timeout: 20_000 });
    await form.evaluate((d, name) => {
      const sel = d.querySelector('[data-f="medicId"]');
      sel.value = [...sel.options].find(o => o.textContent === name).value;
    }, MEDIC);
    await form.getByRole('button', { name: /Post card/i }).click();

    const cardId = await p2.waitForFunction(n => game.messages.contents.findLast(m =>
      m.content.includes('sr-heal-roll-btn') && m.content.includes(n))?.id ?? null, PATIENT, { timeout: 20_000 })
      .then(h => h.jsonValue());

    // Player2 sees the numbers but cannot edit them.
    const view = await p2.evaluate(id => {
      const el = document.querySelector(`#chat .message[data-message-id="${id}"]`);
      return ['.sr-heal-pool', '.sr-heal-tn'].map(c => ({ v: el.querySelector(c)?.value, ro: el.querySelector(c)?.readOnly }));
    }, cardId);
    expect(view.every(x => x.ro), 'Dice and TN are read-only to the player').toBe(true);
    expect(view.every(x => Number(x.v) > 0), 'and they show numbers').toBe(true);

    // The GM sets Dice 12 / TN 2 (a certain success) — saved on the message, not just on screen.
    await janitor.page.evaluate(id => game.messages.get(id).setFlag('The2ndChumming3e', 'healRoll', { pool: 12, tn: 2 }), cardId);
    await expect.poll(() => p2.evaluate(id =>
      document.querySelector(`#chat .message[data-message-id="${id}"] .sr-heal-tn`)?.value, cardId)).toBe('2');

    // ── Player2 rolls for the medic ─────────────────────────────────────────────────
    await p2.evaluate(id => document.querySelector(`#chat .message[data-message-id="${id}"] .sr-heal-roll-btn`)
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })), cardId);
    const rolled = await p2.waitForFunction(n => game.messages.contents.findLast(m =>
      m.content.includes(n) && /dice vs TN/.test(m.content))?.content.replace(/<[^>]+>/g, ' ') ?? null,
      PATIENT, { timeout: 20_000 }).then(h => h.jsonValue()).catch(() => null);
    expect(rolled ?? '', 'the roll used the GM\'s Dice and TN').toMatch(/12 dice vs TN 2\b/);

    const resultId = await p2.waitForFunction(n => game.messages.contents.findLast(m =>
      m.content.includes('First aid result') && m.content.includes(n))?.id ?? null, PATIENT, { timeout: 20_000 })
      .then(h => h.jsonValue());
    const result = await p2.evaluate(id => {
      const el = document.querySelector(`#chat .message[data-message-id="${id}"]`);
      const lower = [...el.querySelectorAll('.sr-heal-act-btn')].find(b => /Lower the wound/.test(b.textContent));
      return { time: el.querySelector('.sr-heal-time')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
               lowerEnabled: lower ? !lower.disabled : null };
    }, resultId);
    expect(result.time ?? '', 'the result card shows how long it takes').toMatch(/Combat Turns? \(\d+ (seconds|minutes?)\)/);
    expect(result.lowerEnabled, 'the medic may press Lower on someone else\'s character').toBe(true);

    // The patient's own player may press it too — Player3 sees it enabled.
    const p3Enabled = await player3.page.waitForFunction(id => {
      const el = document.querySelector(`#chat .message[data-message-id="${id}"]`);
      const b = el && [...el.querySelectorAll('.sr-heal-act-btn')].find(x => /Lower the wound/.test(x.textContent));
      return b ? !b.disabled : null;
    }, resultId, { timeout: 20_000 }).then(h => h.jsonValue());
    expect(p3Enabled).toBe(true);

    // ── The medic lowers it; the GM makes the write ─────────────────────────────────
    await p2.evaluate(id => [...document.querySelectorAll(`#chat .message[data-message-id="${id}"] .sr-heal-act-btn`)]
      .find(b => /Lower the wound/.test(b.textContent))
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })), resultId);
    await expect.poll(async () => (await actorState(janitor.page, PATIENT))?.physical, { timeout: 15_000 }).toBe(1);
  });
});
