/**
 * A player ends their own turn — TODO 241, across real clients.
 *
 * Seen in play, 2026-10-23: a player moved their character, clicked End Turn and Foundry said they lacked
 * permission. Core lets a player write only `round`, `turn` and `combatants` on a Combat; SR3ECombat.nextTurn
 * also writes the round's queue flags. The player's client now hands the advance to the GM
 * (`sr3e.combat.nextTurn`). `tests/end-turn.test.mjs` pins the handler; this proves the round trip.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors } from './foundry.mjs';

const MINE  = '__TEST End Turn Runner';
const NPC   = '__TEST End Turn Goon';

test.describe('End Turn by a player (TODO 241)', () => {
  let created = [];
  let combatId = null;

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    const runner = await createTestActor(janitor.page, { name: MINE, ownerUserName: 'Player2', withToken: false });
    const goon   = await createTestActor(janitor.page, { name: NPC, withToken: false });
    created = [runner.id, goon.id];
    // Runner 15 acts first, then the goon at 9, then the runner again at 5.
    combatId = await janitor.page.evaluate(async ({ r, g }) => {
      const c = await Combat.create({ scene: null, active: true });
      await c.createEmbeddedDocuments('Combatant', [{ actorId: r, initiative: 15 }, { actorId: g, initiative: 9 }]);
      await c.startCombat();
      const q = c.flags.The2ndChumming3e.queue;
      await c._applySlot(q, 0);
      return c.id;
    }, { r: runner.id, g: goon.id });
  });

  test.afterEach(async ({ janitor }) => {
    await janitor.page.evaluate(id => game.combats.get(id)?.delete(), combatId).catch(() => {});
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
  });

  test('the owner ends their turn; another player cannot end it for them', async ({ player2, player3, janitor }) => {
    const acting = page => page.evaluate(id => game.combats.get(id)?.combatant?.name ?? null, combatId);
    await expect.poll(() => acting(player2.page), { timeout: 20_000 }).toBe(MINE);

    // ── Player3 does not own the runner: refused, nothing moves ─────────────────────
    await player3.page.evaluate(id => game.combats.get(id)?.nextTurn(), combatId);
    await player3.page.waitForTimeout(1500);
    expect(await acting(janitor.page)).toBe(MINE);

    // ── Player2 ends the runner's turn: the GM advances it to the goon ─────────────
    const errors = [];
    player2.page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await player2.page.evaluate(id => game.combats.get(id)?.nextTurn(), combatId);
    await expect.poll(() => acting(janitor.page), { timeout: 20_000 }).toBe(NPC);
    expect(await janitor.page.evaluate(id => game.combats.get(id)?.flags.The2ndChumming3e.queueIndex, combatId)).toBe(1);
    expect(errors.filter(e => /permission|lacks/i.test(e))).toEqual([]);

    // ── A stale second click (the turn has moved on) skips nobody ──────────────────
    await player2.page.evaluate(async id => {
      const c = game.combats.get(id);
      return game.sr3e.SR3EQuery.asGM('sr3e.combat.nextTurn', { combatId: id, combatantId: c.combatants.find(x => x.name.includes('Runner')).id });
    }, combatId);
    await player2.page.waitForTimeout(1000);
    expect(await acting(janitor.page)).toBe(NPC);
  });
});
