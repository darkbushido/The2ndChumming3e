/**
 * World migrations, driven against a real world.
 *
 * `tests/migrations.test.mjs` pins the two pure pieces — `_fillBlank` and
 * `_patchItemsByName`. What it cannot reach is `_apply`, which is the half that actually
 * writes, and which walks **three separate populations** of documents.
 *
 * ⚠ **The third population is the one people forget, and unit tests cannot see it at all.**
 * A character dragged onto a scene with "Link Actor Data" OFF becomes a separate document
 * living in `scene.tokens[].actor`. It is reached by neither `game.actors` nor `game.items`,
 * so a migration that walks only those works everywhere except the token actually being
 * played — the single most likely place for the bug to matter and the least likely for anyone
 * to notice. The offline script this framework replaced missed it too.
 *
 * ⚠ **This spec exists because the framework shipped unexercised.** It ran on a real world on
 * 2026-08-20, reported success, and touched zero documents — correctly, because no actor
 * happened to own the item. A migration that has never written anything is not a migration
 * that works; it is one that has never been contradicted.
 *
 * ⚠ Needs a Foundry RESTART, not F5, if `improvedSkillCategory` was added since the world
 * loaded — data models are not hot-reloaded, and writes to an unknown field are dropped.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors } from './foundry.mjs';

const SUBJECT = '__TEST Articulated';
const ITEM    = 'Enhanced Articulation';

/** Add an Enhanced Articulation item with the fields left EMPTY, as an old copy would be. */
async function addStaleItem(page, actorName, overrides = {}) {
  return page.evaluate(async ({ n, i, o }) => {
    const a = game.actors.getName(n);
    const [made] = await a.createEmbeddedDocuments('Item', [{
      name: i,
      type: 'bioware',
      system: { improvedSkillCategory: '', improvedSkillDice: 0, ...o },
    }]);
    return made.id;
  }, { n: actorName, i: ITEM, o: overrides });
}

/** Read the two migrated fields off an actor's embedded item. */
async function readItem(page, actorName) {
  return page.evaluate(({ n, i }) => {
    const a  = game.actors.getName(n);
    const it = a?.items?.find(x => x.name === i);
    if (!it) return null;
    return {
      category: it.system?.improvedSkillCategory ?? null,
      dice:     it.system?.improvedSkillDice ?? null,
    };
  }, { n: actorName, i: ITEM });
}

test.describe('world migrations', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    const a = await createTestActor(janitor.page, { name: SUBJECT, withToken: false });
    created = [a.id];
  });

  test.afterEach(async ({ janitor }) => {
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
  });

  test('an actor that already owns the item gets its blank fields filled', async ({ janitor }) => {
    const page = janitor.page;
    await addStaleItem(page, SUBJECT);

    const before = await readItem(page, SUBJECT);
    expect(before, 'the item was created').not.toBeNull();
    expect(before.category, 'and starts blank, as an old copy would').toBe('');
    expect(before.dice).toBe(0);

    const touched = await page.evaluate(() => game.sr3e.SR3EMigrations.force());
    expect(touched, 'the migration reported writing at least one document').toBeGreaterThan(0);

    const after = await readItem(page, SUBJECT);
    // FIVE categories — the book's Vehicle sentence is the one TODO 10 originally missed.
    expect(after.category.split(',').length, 'five categories were written').toBe(5);
    expect(after.category, 'including Vehicle skills').toContain('Vehicle skills');
    // The slash in "Build/Repair skills" must survive: a parser splitting on it too would
    // tear the category in half, and it would then match nothing at all.
    expect(after.category, 'Build/Repair intact, slash and all').toContain('Build/Repair skills');
    expect(after.dice, 'and the die').toBe(1);
  });

  test('a GM who already typed their own values keeps them, and a second run is a no-op',
    async ({ janitor }) => {
      const page = janitor.page;
      // A GM who decided this item only covers Combat, at 2 dice. Migrations FILL BLANKS —
      // they must never overwrite a decision someone made deliberately.
      await addStaleItem(page, SUBJECT, {
        improvedSkillCategory: 'Combat skills',
        improvedSkillDice: 2,
      });

      await page.evaluate(() => game.sr3e.SR3EMigrations.force());

      const after = await readItem(page, SUBJECT);
      expect(after.category, "the GM's category survived").toBe('Combat skills');
      expect(after.dice, "and the GM's dice count").toBe(2);

      // IDEMPOTENCE against real documents: running again changes nothing.
      const second = await page.evaluate(() => game.sr3e.SR3EMigrations.force());
      expect(second, 'a second run writes nothing to this actor').toBe(0);

      const stillSame = await readItem(page, SUBJECT);
      expect(stillSame.category).toBe('Combat skills');
      expect(stillSame.dice).toBe(2);
    });

  test('an UNLINKED token actor is migrated too — the population unit tests cannot reach',
    async ({ janitor }) => {
      const page = janitor.page;

      // Build a token whose actor data is NOT linked, so it carries its own copy of the item.
      const made = await page.evaluate(async ({ n, i }) => {
        const a = game.actors.getName(n);
        await a.update({ 'prototypeToken.actorLink': false });
        const scene = game.scenes.active ?? game.scenes.contents[0];
        if (!scene) return { ok: false, why: 'no scene' };
        const [tok] = await scene.createEmbeddedDocuments('Token', [{
          name: n, actorId: a.id, actorLink: false, x: 100, y: 100,
        }]);
        // Give the TOKEN's own actor a stale copy — this document is not in game.actors.
        await tok.actor.createEmbeddedDocuments('Item', [{
          name: i, type: 'bioware',
          system: { improvedSkillCategory: '', improvedSkillDice: 0 },
        }]);
        return { ok: true, sceneId: scene.id, tokenId: tok.id };
      }, { n: SUBJECT, i: ITEM });

      expect(made.ok, `token created (${made.why ?? ''})`).toBe(true);

      await page.evaluate(() => game.sr3e.SR3EMigrations.force());

      const tokenItem = await page.evaluate(({ s, t, i }) => {
        const tok = game.scenes.get(s)?.tokens?.get(t);
        const it  = tok?.actor?.items?.find(x => x.name === i);
        return it ? { category: it.system?.improvedSkillCategory ?? null } : null;
      }, { s: made.sceneId, t: made.tokenId, i: ITEM });

      expect(tokenItem, 'the token actor still has the item').not.toBeNull();
      expect(tokenItem.category, 'the UNLINKED token actor was migrated')
        .toContain('Vehicle skills');

      // Clean up the token; the actor itself goes in afterEach.
      await page.evaluate(({ s, t }) =>
        game.scenes.get(s)?.deleteEmbeddedDocuments('Token', [t]), { s: made.sceneId, t: made.tokenId });
    });
});
