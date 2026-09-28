/**
 * A dual being's natural armour reduces astral damage's Power — TODO 177, in a live world.
 *
 * SR3 p.175: "Dual beings with natural physical armor gain the benefits of their armor in astral
 * combat; the Power of the attack is reduced by the target's natural armor." The new
 * `system.naturalArmor` (a critter's Armor power) is deducted on the astral resist card for a DUAL
 * being only. `tests/astral-soak.test.mjs` pins the rule; this proves the field persists (a data-model
 * field — it needs a full restart) and the card reads it.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors } from './foundry.mjs';

const CRITTER = '__TEST Dual Critter';

/** Post the astral resist card for the critter at Power 7 and read its TN and note. */
async function resistCard(page) {
  return page.evaluate(async n => {
    const a = game.actors.getName(n);
    await a._postAstralSoakCard({ stagedPower: 7, stagedLevel: 'M', isStun: false, attackerActorId: null, winnerCha: 7 });
    const msg = game.messages.contents.findLast(m => m.content.includes('sr-astral-soak-card') && m.content.includes(n));
    const el  = document.createElement('div');
    el.innerHTML = msg.content;
    return { tn: el.querySelector('.sr-astral-soak-tn')?.value, text: el.textContent.replace(/\s+/g, ' ') };
  }, CRITTER);
}

test.describe('astral natural armour (TODO 177)', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    const a = await createTestActor(janitor.page, {
      name: CRITTER, withToken: false, type: 'npc',
      system: { attributes: { body: { base: 5 } }, astralMode: 'dual', naturalArmor: 3 },
    });
    created = [a.id];
  });

  test.afterEach(async ({ janitor }) => {
    await janitor.page.evaluate(async n => {
      const ids = game.messages.contents.filter(m => m.content.includes(n)).map(m => m.id);
      if (ids.length) await ChatMessage.deleteDocuments(ids);
    }, CRITTER).catch(() => {});
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
  });

  test('a Dual Natured critter with natural armor 3 resists a Power 7 hit at TN 4; projecting, TN 7', async ({ janitor }) => {
    const g = janitor.page;
    expect(await g.evaluate(n => game.actors.getName(n).system.naturalArmor, CRITTER),
      'the field persists — Foundry was restarted with the new model').toBe(3);

    const dual = await resistCard(g);
    expect(dual.tn).toBe('4');
    expect(dual.text).toMatch(/Natural armor −3 Power/);

    await g.evaluate(n => game.actors.getName(n).update({ 'system.astralMode': 'astral' }), CRITTER);
    const astral = await resistCard(g);
    expect(astral.tn, 'an astral being gets no natural-armour deduction').toBe('7');
    expect(astral.text).not.toMatch(/Natural armor/);
  });
});
