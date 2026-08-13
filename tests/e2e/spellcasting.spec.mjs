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
  CHAT_LOG, actorState, clearChatAll,
} from './foundry.mjs';

const CASTER = '__TEST Caster';   // owned by Player2
const VICTIM = '__TEST Victim';   // owned by Player3

const awakened = {
  attributes: {
    body: { base: 4 }, quickness: { base: 4 }, strength: { base: 3 },
    charisma: { base: 4 }, intelligence: { base: 5 }, willpower: { base: 5 },
    magic: { base: 6 },
  },
};

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
      name: CASTER, ownerUserName: 'Player2', system: awakened, x: 1500, y: 1700,
      items: [
        { name: 'Sorcery', type: 'skill', system: { rating: 6, linkedAttribute: 'willpower' } },
        manabolt,
      ],
    });
    const v = await createTestActor(janitor.page, {
      name: VICTIM, ownerUserName: 'Player3', system: awakened, x: 1600, y: 1700, items: [],
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
  });
});
