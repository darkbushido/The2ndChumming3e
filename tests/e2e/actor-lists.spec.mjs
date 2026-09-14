/**
 * Chunky Salsa lists the actors on the scene — F2, on a client that actually draws a canvas.
 *
 * Reported in play: "chunky salsa lists everything, not just the actors on the scene."
 * `sceneFirst` reads tokens on the drawn canvas; the agent's Browser pane cannot draw one, so
 * this is the check that runs where the rule does. `tests/actor-lists.test.mjs` pins the source.
 *
 * ⚠ Additive and reversible: one disposable actor with a token on the ACTIVE scene (the world's
 * own characters are left alone), deleted afterwards — `sweepTestActors` first, in case an
 * earlier run died before its teardown.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors, clearChatAll } from './foundry.mjs';

test.describe('actor lists are scoped to the scene (F2)', () => {
  let created = [];
  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    await clearChatAll(janitor.page);
  });
  test.afterEach(async ({ janitor }) => {
    await janitor.page.evaluate(() => {
      for (const app of [...foundry.applications.instances.values()]) if (/Chunky/i.test(app.title ?? '')) app.close();
    });
    await deleteActors(janitor.page, created.map(c => c.id));
    created = [];
  });

  test('Chunky Salsa offers the actors with a token on the scene, not the whole world',
    async ({ janitor }) => {
    const page = janitor.page;
    const onScene = await createTestActor(page, { name: '__TEST Salsa Target', ownerUserName: null });
    created.push(onScene);

    const world = await page.evaluate(() => ({
      canvas: !!canvas?.ready,
      viewed: canvas?.scene?.id ?? null,
      active: game.scenes.active?.id ?? null,
      // Live characters with NO token on the viewed scene — the ones that must not be listed.
      offScene: game.actors.filter(a => (a.type === 'character' || a.type === 'npc')
        && game.sr3e.isLiveActor(a) && !a.getActiveTokens().length).map(a => a.name),
    }));
    expect(world.canvas, 'this client must draw a canvas for the scene rule to apply').toBe(true);
    expect(world.viewed, 'the GM views the active scene, where the test token was placed').toBe(world.active);
    expect(world.offScene.length, 'the world must hold characters off this scene, or the test proves nothing')
      .toBeGreaterThan(0);

    await page.evaluate(() => { game.sr3e.openChunkySalsa(); });
    const dialog = page.locator('.application').filter({ hasText: /Chunky Salsa/ }).first();
    await dialog.waitFor({ state: 'visible', timeout: 20_000 });
    const listed = await dialog.textContent();

    expect(listed, 'the actor on the scene is offered').toContain('__TEST Salsa Target');
    for (const name of world.offScene) {
      expect(listed, `${name} has no token on this scene and must not be offered`).not.toContain(name);
    }
  });
});
