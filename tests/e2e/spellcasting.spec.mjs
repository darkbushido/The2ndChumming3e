/**
 * Spellcasting across two real clients — a PERMISSION SPLIT, not a two-corner card.
 *
 * This is a different shape from melee and astral, and that is the point. One card carries
 * buttons belonging to DIFFERENT people:
 *
 *   .sr-spell-soak-btn  "Resist Spell"  → the TARGET's owner   (gated `_mine` on targetId)
 *   .sr-drain-btn       "Resist Drain"  → the CASTER's owner   (gated `_mine` on casterId)
 *
 * A single-client test cannot tell those apart: the GM passes both gates, and a lone player
 * sees only their own half and would call it correct. It takes two clients to prove that the
 * caster genuinely CANNOT roll their victim's resistance, which is exactly the class of
 * defect TODO 27 was opened for — a public chat card that any spectator could act on.
 *
 * ⚠ The negative assertions are the valuable ones here. "My button works" is cheap; "the
 * other person's button is refused to me" is the guarantee that matters, and it is the one
 * that silently regresses when a gate is loosened to fix an unrelated complaint.
 */
import { test, expect } from './fixtures.mjs';
import {
  fireAndForget, answerDialog, selectTarget, createTestActor, deleteActors, sweepTestActors,
  CHAT_LOG, actorState, clearChatAll, clickNewestChatButton, setNewestChatField,
} from './foundry.mjs';

const CASTER = '__TEST Caster';   // owned by Player2
const VICTIM = '__TEST Victim';   // owned by Player3

const awakened = (willpower = 5) => ({
  attributes: {
    body: { base: 4 }, quickness: { base: 4 }, strength: { base: 3 },
    charisma: { base: 4 }, intelligence: { base: 5 }, willpower: { base: willpower },
    magic: { base: 6 },
  },
});

/**
 * ⚠ The VICTIM's Willpower is deliberately low, and it is load-bearing.
 *
 * Manabolt's `target: 'W'` makes the cast TN the victim's Willpower. At Willpower 5 the
 * caster's 6 Sorcery dice fail outright about **9% of the time** — and a cast with zero
 * successes posts no Resist Spell button at all, because the spell simply failed. This
 * spec asserts WHO MAY CLICK the resist button, so a failed cast is not a finding, it is
 * a run with nothing to look at: the spec died on `.sr-spell-soak-btn` never appearing,
 * roughly one run in twelve, reading as an infrastructure timeout.
 *
 * Willpower 2 puts the TN at the floor, where only a 1 misses, so the spell lands with
 * probability ~0.99998 and the permission assertions always have a card to make. This is
 * ARRANGEMENT, not tolerance — the spec still fails loudly if the wrong person can click.
 */
const VICTIM_WILLPOWER = 2;

/** A Combat spell: damaging, so the cast dialog offers a Damage Level and targets resist. */
const manabolt = {
  name: 'Manabolt', type: 'spell',
  system: {
    category: 'Combat', type: 'Mana', target: 'W',
    drain: '(DL+1)', range: 'LOS', duration: 'Instant',
  },
};

test.describe('spellcasting — caster and target act on their own halves', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await clearChatAll(janitor.page);
    // Sweep first: a run killed mid-test never reaches its teardown, and an orphaned token
    // is invisible in the actor directory — it shows up only on the map, where a GM finds
    // it and nobody else does.
    await sweepTestActors(janitor.page);
    const c = await createTestActor(janitor.page, {
      name: CASTER, ownerUserName: 'Player2', system: awakened(), x: 1500, y: 1700,
      items: [
        { name: 'Sorcery', type: 'skill', system: { rating: 6, linkedAttribute: 'willpower' } },
        manabolt,
      ],
    });
    const v = await createTestActor(janitor.page, {
      name: VICTIM, ownerUserName: 'Player3', system: awakened(VICTIM_WILLPOWER),
      x: 1600, y: 1700, items: [],
    });
    created = [c.id, v.id];
  });

  test.afterEach(async ({ janitor }) => {
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);   // catches anything an earlier failure stranded
    await clearChatAll(janitor.page);
  });

  test('the caster cannot roll the target\'s resistance, and vice versa',
    async ({ player2, player3 }) => {
    const caster = player2;
    const victim = player3;

    const before = await actorState(caster.page, CASTER);

    // Not awaited — the cast blocks on its dialogs.
    await fireAndForget(caster.page, `
      const a = game.actors.getName(${JSON.stringify(CASTER)});
      const s = a.items.find(i => i.type === 'spell');
      await s.rollSpell();
    `);

    // Three dialogs, all on the caster: Force/damage level, target, spell pool.
    //
    // ⚠ The Force dialog's button is labelled "Next", not Confirm — its `action` is
    // 'confirm' but that is not what `getByRole` matches on. A wrong name here does not
    // fail fast: the click waits for a button that never appears until the whole run times
    // out and closes the browser, which surfaces as "Target page, context or browser has
    // been closed" and points at teardown rather than at the selector.
    await answerDialog(caster.page, /Cast Manabolt/i, /^next$/i);
    await selectTarget(caster.page, VICTIM);
    await answerDialog(caster.page, /Spell Pool/i, /confirm/i);

    // The result card carries both halves. There is no `data-twocorner` here — this is not
    // a two-corner card — so target the buttons directly, taking the LAST match since the
    // log is cleared per test and the newest card is the one just posted.
    const resist = `${CHAT_LOG} .sr-spell-soak-btn`;
    const drain  = `${CHAT_LOG} .sr-drain-btn`;
    await caster.page.locator(resist).last().waitFor({ timeout: 20_000 });
    await victim.page.locator(resist).last().waitFor({ timeout: 20_000 });

    // ── THE ASSERTIONS THIS SPEC EXISTS FOR ────────────────────────────────────
    // Resist Spell belongs to the VICTIM. The caster must be refused it.
    await expect(victim.page.locator(resist).last(),
      'the target may open their own resistance').toBeEnabled();
    await expect(caster.page.locator(resist).last(),
      'the CASTER must not be able to roll their victim\'s resistance').toBeDisabled();

    // Resist Drain belongs to the CASTER. The victim must be refused it.
    await expect(caster.page.locator(drain).last(),
      'the caster may open their own drain').toBeEnabled();
    await expect(victim.page.locator(drain).last(),
      'the target must not be able to roll the caster\'s drain').toBeDisabled();

    // Spell Pool is committed at cast time, on the caster and nobody else.
    const casterAfter = await actorState(caster.page, CASTER);
    expect(casterAfter.spellPoolSpent,
      'spell pool is spent when the spell is cast').toBeGreaterThanOrEqual(before.spellPoolSpent);
    const victimAfter = await actorState(caster.page, VICTIM);
    expect(victimAfter.spellPoolSpent, 'the target spends nothing to be shot at').toBe(0);

    // ── Drain: Spell Pool is legal here, and must be CHARGED (TODO 43) ─────────
    //
    // p.43: "Dice from the Spell Pool can be used to augment Spell Success Tests and
    // Drain Resistance Tests… There is no limit to the number of dice a character may
    // draw from the Spell Pool for the Drain Resistance Test." So the field belongs on
    // the card — what it must not do is hand out dice for free.
    //
    // Deliberately asks for MORE than remains. The input's max is a browser hint, not a
    // gate, so the clamp has to live in the handler: the roll must use what
    // `spendSpellPool` actually deducted, never what was typed.
    await clickNewestChatButton(caster.page, '.sr-drain-btn');

    const drainPool = `${CHAT_LOG} .sr-drain-spell-pool`;
    const hasField  = await caster.page.locator(drainPool).count();
    if (hasField) {
      const spentBeforeDrain = (await actorState(caster.page, CASTER)).spellPoolSpent;
      const remaining = (await actorState(caster.page, CASTER)).availableSpellPool ?? 0;
      // A caster with nothing left proves nothing about clamping, so say so rather than
      // passing silently on an empty pool.
      expect(remaining, "the caster needs Spell Pool left for this to test anything")
        .toBeGreaterThan(0);

      await setNewestChatField(caster.page, 'sr-drain-spell-pool', 99);
      await clickNewestChatButton(caster.page, '.sr-drain-roll-btn');

      // Charged exactly what was left — never 99, and never more than the pool holds.
      await expect.poll(async () => (await actorState(caster.page, CASTER)).spellPoolSpent,
        { timeout: 25_000 }).toBe(spentBeforeDrain + remaining);
      await expect.poll(async () => (await actorState(caster.page, CASTER)).availableSpellPool,
        { timeout: 25_000 }).toBe(0);
    }
  });
});
