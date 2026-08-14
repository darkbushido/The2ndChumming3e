/**
 * Essence loss is permanent — the ratchet, driven against a real world.
 *
 * `tests/essence.test.mjs` pins the arithmetic. What it cannot reach is the part that
 * actually makes the loss stick: the hooks that PERSIST the high-water mark. Those are the
 * risky half, and one of them turns on a distinction that fails silently.
 *
 * ⚠ **There is deliberately NO delete hook.** Removal must not touch the mark; anything
 * running on delete could only lower it, which is the refund this exists to prevent. The
 * single hook is on INSTALL, and it accumulates: `lost = max(lost, installedBefore) + cost`.
 *
 * ⚠ **Accumulating is not the same as tracking a maximum**, and the difference only shows
 * here. Storing `max(lost, currentlyInstalled)` passes every unit test and still lets a
 * character rip out 2.0 of wired reflexes, fit 0.5 of cybereyes, and pay nothing for the
 * new chrome — the removed hardware keeps "covering" it. That case is the second half of
 * the first test, and it is the reason this spec exists at all.
 *
 * ⚠ **This needs a Foundry RESTART, not F5.** It adds a data-model field
 * (`attributes.essence.lost`), and data models are not hot-reloaded — a world still running
 * the old schema silently drops writes to it. If this spec fails on the write assertion
 * while the unit suite is green, restart Foundry before looking anywhere else.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors } from './foundry.mjs';

const SUBJECT = '__TEST Chromed';

/** Read the persisted mark and the derived value together. */
async function essence(page, name) {
  return page.evaluate(n => {
    const a = game.actors.getName(n);
    if (!a) return null;
    a.prepareDerivedData();
    return {
      value: a.system?.attributes?.essence?.value ?? null,
      lost:  a.system?.attributes?.essence?.lost ?? null,
      base:  a.system?.attributes?.essence?.base ?? null,
    };
  }, name);
}

/** Add a cyberware item, returning its id. */
async function implant(page, actorName, itemName, cost) {
  return page.evaluate(async ({ n, i, c }) => {
    const a = game.actors.getName(n);
    const [made] = await a.createEmbeddedDocuments('Item',
      [{ name: i, type: 'cyberware', system: { essenceCost: c } }]);
    return made.id;
  }, { n: actorName, i: itemName, c: cost });
}

test.describe('Essence loss is permanent', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    const a = await createTestActor(janitor.page, {
      name: SUBJECT, withToken: false,
      system: { attributes: { body: { base: 4 }, quickness: { base: 4 }, magic: { base: 6 } } },
    });
    created = [a.id];
  });

  test.afterEach(async ({ janitor }) => {
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
  });

  test('removing cyberware does not hand the Essence back', async ({ janitor }) => {
    const gm = janitor.page;

    const clean = await essence(gm, SUBJECT);
    expect(clean.value, 'a fresh character starts at 6').toBe(6);
    // `null`, not 0 — nothing has been RECORDED yet, which is a different statement from
    // "has lost nothing" and is what lets the value follow installed cyberware.
    expect(clean.lost, 'and nothing has been recorded yet').toBeNull();

    // ── Install ────────────────────────────────────────────────────────────────
    const wiredId = await implant(gm, SUBJECT, 'Wired Reflexes 1', 2);
    await implant(gm, SUBJECT, 'Datajack', 0.2);

    await expect.poll(async () => (await essence(gm, SUBJECT)).value,
      { timeout: 15_000 }).toBe(3.8);

    // The mark must be PERSISTED, not merely derived — that is what survives the delete.
    // If this fails while the unit suite passes, the data model has not been reloaded.
    await expect.poll(async () => (await essence(gm, SUBJECT)).lost,
      { timeout: 15_000 }).toBe(2.2);

    // ── Remove the expensive piece ────────────────────────────────────────────
    await gm.evaluate(async ({ n, id }) => {
      await game.actors.getName(n).deleteEmbeddedDocuments('Item', [id]);
    }, { n: SUBJECT, id: wiredId });

    // ── THE ASSERTION THIS SPEC EXISTS FOR ────────────────────────────────────
    // Before the fix this read 5.8 — the 2.0 came straight back. With a `deleteItem` hook
    // instead of `preDeleteItem` it would read 5.8 as well, because the mark would have
    // been rewritten to the post-removal total.
    const after = await essence(gm, SUBJECT);
    expect(after.lost, 'the mark holds at the deepest loss ever reached').toBe(2.2);
    expect(after.value, 'and Essence does NOT go back up').toBe(3.8);

    // ── Installing AFTER a removal still costs full price ─────────────────────
    // The mark accumulates; it is not a running maximum of what is currently fitted. With
    // max(lost, installed) this read 2.2 — the new chrome would have been free because the
    // removed wired reflexes still "covered" it.
    await implant(gm, SUBJECT, 'Cybereyes', 0.5);
    await expect.poll(async () => (await essence(gm, SUBJECT)).lost,
      { timeout: 15_000 }).toBe(2.7);
    expect((await essence(gm, SUBJECT)).value,
      'ripping out 2.0 and fitting 0.5 leaves you WORSE off, not level').toBe(3.3);
  });

  test('a GM can still correct Essence by hand', async ({ janitor }) => {
    const gm = janitor.page;
    await implant(gm, SUBJECT, 'Bad Import', 3);
    await expect.poll(async () => (await essence(gm, SUBJECT)).value,
      { timeout: 15_000 }).toBe(3);

    // The sheet's Essence box writes to the DERIVED field, which prepareDerivedData
    // overwrites — so before the fix a GM's correction reverted with no error at all. The
    // `_preUpdate` translation turns it into the `lost` it implies.
    //
    // Deliberately upward: the ratchet exists to stop REMOVAL refunding Essence, not to
    // stop a GM fixing their own data. Minimal guardrails.
    await gm.evaluate(async n => {
      await game.actors.getName(n).update({ 'system.attributes.essence.value': 2 });
    }, SUBJECT);

    const fixed = await essence(gm, SUBJECT);
    expect(fixed.lost, 'the typed Essence is stored as the loss it implies').toBe(4);
    expect(fixed.value, 'and it sticks instead of reverting to the derived number').toBe(2);

    // ── The override must work UPWARD too — that is the mistake case ──────────
    //
    // A player installs the wrong 3.0 of chrome. The GM needs to give it back. An earlier
    // design floored on max(lost, installed), so the correction silently clamped and the
    // typed number reverted with no explanation — the same class of failure this whole task
    // set out to remove, one layer along.
    await gm.evaluate(async n => {
      await game.actors.getName(n).update({ 'system.attributes.essence.value': 5 });
    }, SUBJECT);
    const raised = await essence(gm, SUBJECT);
    expect(raised.lost, 'the correction is stored as the loss it implies').toBe(1);
    expect(raised.value, 'and it holds even though 3.0 of cyberware is still fitted').toBe(5);

    // ── ↺ clears the override, so Essence follows the hardware again ──────────
    // `null`, not 0: "nobody has said" and "this character has lost nothing" are different
    // statements, and conflating them would make the reset read as "your chrome is free".
    await gm.evaluate(async n => {
      await game.actors.getName(n).update({ 'system.attributes.essence.lost': null });
    }, SUBJECT);
    const cleared = await essence(gm, SUBJECT);
    expect(cleared.lost, 'cleared back to unrecorded').toBeNull();
    expect(cleared.value, 'and Essence derives from the 3.0 still installed').toBe(3);
  });
});
