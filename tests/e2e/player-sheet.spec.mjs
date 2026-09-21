/**
 * The character sheet as a PLAYER sees it — the parts of `fix/racial-mods` a GM session cannot show.
 *
 * Every other live check on the branch ran as a GM, and the sheet renders differently for
 * players on purpose: the Species dropdown is the GM's alone. A GM client can only ever prove
 * the GM half, which is how TODO 93 was left with "the player half needs a player client".
 *
 * Covered here, on one throwaway character owned by Player2:
 *   · Species (TODO 93) — a player gets a DISABLED dropdown with no field name, so the form
 *     can neither show it as editable nor submit it; an unrecognised stored value is shown.
 *   · Essence near the edge (TODO 103) — amber block below 1, red at 0 or less, changing on the
 *     player's screen when the GM changes the number.
 *   · Matrix skills are ACTIVE (TODO 93) — the karma dialog prices Computer 4 → 5 at INT 4 as an
 *     active skill: 5 × 2 = 10. As a knowledge skill it would be ⌊5 × 1.5⌋ = 7, so the fixture
 *     discriminates between the two readings.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors, fireAndForget } from './foundry.mjs';

const SUBJECT = '__TEST Player Sheet';

/** Open the actor's sheet on this client and report what the player can see. */
async function sheetView(page, name) {
  return page.evaluate(async n => {
    const a = game.actors.getName(n);
    if (!a.sheet.rendered) await a.sheet.render(true);
    await new Promise(r => setTimeout(r, 300));
    const el = a.sheet.element;
    const species = [...el.querySelectorAll('label.inline-field')]
      .find(l => /Species/.test(l.textContent))?.querySelector('select');
    // ⚠ The Essence box carries no `name` for a player — all three Essence controls are GM-only
    // (9c45a4ab, "only the GM can change Essence loss"): lowering the recorded loss is the refund
    // M&M p.147 forbids. So find the block by its label and read the box inside it.
    const essBlock = [...el.querySelectorAll('.attr-block')]
      .find(b => /^Essence/.test(b.querySelector('.attr-label')?.textContent ?? ''));
    const essInput = essBlock?.querySelector('input.attr-input');
    // The three boxes inside that block, in render order: Essence, lost, hole (TODO 53). The hole is
    // rendered for a player only when there is one, so read them all rather than assuming an index.
    const essBoxes = [...(essBlock?.querySelectorAll('input.attr-input') ?? [])]
      .map(i => ({ name: i.getAttribute('name'), disabled: i.disabled, value: i.value }));
    return {
      isOwner:        a.isOwner,
      speciesNamed:   species?.getAttribute('name') ?? null,
      speciesDisabled: species?.disabled ?? null,
      speciesShown:   species?.selectedOptions[0]?.textContent.trim() ?? null,
      essValue:       Number(essInput?.value),
      essNamed:       essInput?.getAttribute('name') ?? null,
      essDisabled:    essInput?.disabled ?? null,
      essClass:       essBlock ? [...essBlock.classList].filter(c => c.startsWith('essence-')) : null,
      essTitle:       essBlock?.getAttribute('title') ?? '',
      essBoxes,
    };
  }, name);
}

test.describe('the character sheet from a player\'s seat', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    const a = await createTestActor(janitor.page, {
      name: SUBJECT, ownerUserName: 'Player2', withToken: false,
      system: {
        metatype: 'hobgoblin', karma: 20,
        attributes: { intelligence: { base: 4 }, essence: { base: 6, lost: 5.5 } },
      },
      items: [{ name: 'Computer', type: 'skill',
                system: { skillName: 'Computer', category: 'Matrix skills', rating: 4,
                          linkedAttribute: 'intelligence' } }],
    });
    created = [a.id];
  });

  test.afterEach(async ({ player2, janitor }) => {
    await player2.page.evaluate(async n => {
      const a = game.actors.getName(n);
      await a?.sheet?.close();
      for (const d of document.querySelectorAll('.application.dialog')) {
        await foundry.applications.instances.get(d.id)?.close();
      }
    }, SUBJECT).catch(() => {});
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
  });

  test('species is locked, Essence warns, and a Matrix skill costs karma as an active skill',
    async ({ player2, janitor }) => {
      const p = player2.page;

      // ── Species: shown, not editable, not submitted ─────────────────────────────
      const v = await sheetView(p, SUBJECT);
      expect(v.isOwner, 'Player2 owns the test character').toBe(true);
      expect(v.speciesDisabled, 'a player gets a disabled Species dropdown').toBe(true);
      expect(v.speciesNamed, 'with no field name, so submit-on-change never sends it').toBeNull();
      expect(v.speciesShown, 'an unrecognised stored value is shown as such').toBe('hobgoblin (unrecognised)');

      // ── Essence 0.5: legal but low → amber ──────────────────────────────────────
      expect(v.essValue, 'lost 5.5 from 6').toBe(0.5);
      expect(v.essNamed, 'and a player cannot submit it — no name, disabled (M&M p.147)').toBeNull();
      expect(v.essDisabled, 'the box is read-only from a player seat').toBe(true);
      expect(v.essClass, 'below 1 is the LOW state').toEqual(['essence-low']);
      expect(v.essTitle, 'and the tooltip quotes p.55').toMatch(/it may be less than 1/);

      // ── The GM takes it to 0 → red, on the player's screen ──────────────────────
      await janitor.page.evaluate(async n => {
        await game.actors.getName(n).update({ 'system.attributes.essence.lost': 6 });
      }, SUBJECT);
      await expect.poll(async () => (await sheetView(p, SUBJECT)).essClass, { timeout: 15_000 })
        .toEqual(['essence-dead']);
      expect((await sheetView(p, SUBJECT)).essTitle).toMatch(/the spirit slips away/);

      // ── Back above 1 → no warning at all ─────────────────────────────────
      await janitor.page.evaluate(async n => {
        await game.actors.getName(n).update({ 'system.attributes.essence.lost': 2 });
      }, SUBJECT);
      await expect.poll(async () => (await sheetView(p, SUBJECT)).essClass, { timeout: 15_000 })
        .toEqual([]);

      // ── The Essence hole is visible to a player and editable by nobody but the GM ────
      // TODO 53, M&M p.150. The GM opens a hole; the player must SEE it (it is their character's
      // record) and must not be able to lower it, because a lower hole is Essence back.
      // ⚠ This is the half the Browser pane cannot check — it drives one user at a time.
      await janitor.page.evaluate(async n => {
        await game.actors.getName(n).update({ 'system.essenceHole': 1.5 });
      }, SUBJECT);
      await expect.poll(async () => (await sheetView(p, SUBJECT)).essBoxes.length, { timeout: 15_000 })
        .toBe(3);
      const boxes = (await sheetView(p, SUBJECT)).essBoxes;
      expect(boxes.map(b => b.name), 'not one of the three is submitted from a player seat')
        .toEqual([null, null, null]);
      expect(boxes.map(b => b.disabled), 'and all three are disabled').toEqual([true, true, true]);
      expect(boxes[2].value, 'the hole itself is shown, at the number the GM set').toBe('1.5');

      // ⚠ Contrast the SAME block from the GM's seat, or the three assertions above would pass just
      // as happily against a sheet that disabled the boxes for everyone — which would be a different
      // bug (the GM could no longer correct a mistaken install) and would look identical from here.
      const gmBoxes = (await sheetView(janitor.page, SUBJECT)).essBoxes;
      expect(gmBoxes.map(b => b.name), 'the GM gets all three, named and submitted').toEqual([
        'system.attributes.essence.value',
        'system.attributes.essence.lost',
        'system.essenceHole',
      ]);
      expect(gmBoxes.some(b => b.disabled), 'and none of them disabled').toBe(false);

      // ── Matrix skill priced as ACTIVE in the karma dialog ──────────────────────
      await fireAndForget(p, `
        const a = game.actors.getName(${JSON.stringify(SUBJECT)});
        await a.sheet.constructor._onSpendKarmaCalculator.call(a.sheet);`);
      const cost = await p.waitForFunction(() => {
        const r = [...document.querySelectorAll('input[name="karma-choice"]')]
          .find(i => /^skill:.+:rating$/.test(i.value));
        return r ? Number(r.dataset.cost) : null;
      }, null, { timeout: 15_000 }).then(h => h.jsonValue());
      expect(cost, 'Computer 4 → 5 at INT 4: active ×2 = 10 (knowledge would be 7)').toBe(10);
    });
});
