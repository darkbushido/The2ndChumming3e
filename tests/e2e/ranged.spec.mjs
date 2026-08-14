/**
 * The ranged attack flow, end to end, across three real clients.
 *
 * This is the most-played path in the system and the one with the most moving parts, and
 * until now nothing exercised it. It is also the flow with the most *people* in it: an
 * attacker, a defender and a GM, each of whom must be handed exactly one decision.
 *
 * ── THE THREE PROPERTIES WORTH PROTECTING ────────────────────────────────────────────
 *
 * 1. **The GM sets the TN, on the GM's screen.** `sr3e.attack.negotiate` relays to the GM
 *    and the attacker's own TN field locks while it is adjudicated. A regression here is
 *    invisible on one client, because a GM testing alone passes every gate themselves.
 *
 * 2. **The defender declares AFTER the attack roll — and this is RAW, not convenience.**
 *    SR3's numbered sequence resolves the Dodge Test at step 4, after "Count the successes
 *    the attacker rolls" at step 3. The decision is dodge-versus-soak: Combat Pool spent
 *    dodging is gone from the Damage Resistance Test, so showing the defender the attack's
 *    successes first is what makes the trade a real choice. The system had it backwards
 *    until 2026-08-05. This spec asserts the card carries the successes and that the
 *    declaration belongs to the defender.
 *
 * 3. **Each side is charged its own pool, on its own actor.** The attacker pays for attack
 *    dice, the defender for dodge dice and again for soak dice — three separate spends
 *    against two actors, and the whole point of the p.113 trade is that they compete.
 *
 * ── WHY THERE ARE NO EXPLOSION LOOPS HERE ────────────────────────────────────────────
 *
 * A die stops exploding once its running total reaches the TN, so a 6 is an immediate
 * success at any TN ≤ 6 and no "Roll explosions" button is ever posted. Every TN in this
 * spec is held at or below 6 — GM TN 2, dodge TN 4 (fixed by RAW), soak TN 4 (Power 4, no
 * armour) — so the flow runs without a single explosion wave. That is ARRANGEMENT, not an
 * assumption: `assertNoExplosions` fails loudly if a card posts one anyway, because that
 * would mean a TN moved and the run is no longer the scenario described here.
 */
import { test, expect } from './fixtures.mjs';
import {
  fireAndForget, selectTarget, createTestActor, deleteActors, sweepTestActors,
  CHAT_LOG, actorState, clearChatAll, clickNewestChatButton, setNewestChatField,
} from './foundry.mjs';

const ATTACKER = '__TEST Shooter';   // Player2
const DEFENDER = '__TEST Mark';      // Player3

/** Quickness 4 + Intelligence 5 + Willpower 5 → Combat Pool ⌊14/2⌋ = 7 for both sides. */
const combatant = {
  attributes: {
    body: { base: 5 }, quickness: { base: 4 }, strength: { base: 3 },
    charisma: { base: 3 }, intelligence: { base: 5 }, willpower: { base: 5 },
  },
};
const EXPECTED_POOL = 7;

/**
 * Damage 4M, not the usual 9M. The soak TN is Power − armour, so 9M would put the Damage
 * Resistance Test at TN 9, where dice DO explode and the flow needs a click loop. 4M keeps
 * it at 4. Staging raises the LEVEL, never the Power (outside melee), so the TN cannot
 * drift upward however well the attack rolls.
 *
 * `mode: 'SS'` alone is deliberate too: `rollWeapon` skips the fire-mode dialog entirely
 * when single-shot is the only option, removing a screen that has nothing to do with what
 * this spec asserts.
 */
const pistol = {
  name: 'Test Pistol', type: 'firearm',
  system: {
    damage: '4M', category: 'HPist', mode: 'SS', ammunition: '15(c)',
    // Set regardless of the `trackAmmo` world setting: when it is ON, `rollWeapon` bails at
    // the top on an empty magazine, and the spec would fail for a reason unrelated to it.
    loadedAmmoType: 'regular', loadedRounds: 15,
  },
};

const attackerItems = [
  { name: 'Pistols', type: 'skill', system: { rating: 6, linkedAttribute: 'quickness' } },
  pistol,
];

const GM_TN = 2;

/** A dialog by window title on a given client. */
const dlg = (page, titleRe) => page.locator('.application.dialog, dialog[open]')
  .filter({ has: page.locator('.window-title', { hasText: titleRe }) }).first();

/**
 * Fail if any card offered an explosion. Not cosmetic: an explosion means a TN in this
 * flow rose above 6, so the scenario is no longer the one the assertions describe and the
 * run would hang on a button nobody clicks.
 */
async function assertNoExplosions(page, where) {
  const n = await page.locator(`${CHAT_LOG} .sr-explode-btn`).count();
  expect(n, `${where}: a die exploded, so a TN in this flow exceeded 6 — `
    + 'the scenario is no longer deterministic').toBe(0);
}

test.describe('ranged attack — attacker, defender and GM each decide their own part', () => {
  // The longest flow in the suite: target → GM TN → roll options → attack roll → declare →
  // dodge roll → resist → soak card → soak roll, across three clients, each hop a real
  // socket round-trip. It does not fit the shared 120s budget and is slow for a legitimate
  // reason rather than a hang.
  test.describe.configure({ timeout: 300_000 });

  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await clearChatAll(janitor.page);
    await sweepTestActors(janitor.page);

    // Adjacent tokens: range band drives the TN, and Short range contributes +0. Placing
    // them far apart would push the attack toward Extreme (+5) and past the no-explosion
    // ceiling this spec depends on.
    const a = await createTestActor(janitor.page, {
      name: ATTACKER, ownerUserName: 'Player2', system: combatant, items: attackerItems,
      x: 1500, y: 2300,
    });
    const d = await createTestActor(janitor.page, {
      name: DEFENDER, ownerUserName: 'Player3', system: combatant, items: [],
      x: 1600, y: 2300,
    });
    expect(a.hasToken && d.hasToken, 'both need tokens — range is measured from them').toBe(true);
    created = [a.id, d.id];
  });

  test.afterEach(async ({ janitor }) => {
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
    await clearChatAll(janitor.page);
  });

  test('the GM sets the TN, the defender declares after seeing the hits, and each pays its own pool',
    async ({ player2, player3, janitor }) => {
    const atk = player2;
    const def = player3;
    const gm  = janitor;

    const atkBefore = await actorState(atk.page, ATTACKER);
    const defBefore = await actorState(def.page, DEFENDER);
    expect(atkBefore.availableCombatPool, 'attacker pool').toBe(EXPECTED_POOL);
    expect(defBefore.availableCombatPool, 'defender pool').toBe(EXPECTED_POOL);

    // ── Fire ───────────────────────────────────────────────────────────────────
    await fireAndForget(atk.page, `
      const a = game.actors.getName(${JSON.stringify(ATTACKER)});
      const w = a.items.find(i => i.type === 'firearm');
      await w.rollWeapon();
    `);

    await selectTarget(atk.page, DEFENDER);

    // ── 1. The GM's TN window opens on the GM, and NOT on the attacker ──────────
    const gmWindow = dlg(gm.page, /^GM — /);
    await gmWindow.waitFor({ state: 'visible', timeout: 30_000 });

    // The negative is the valuable half: a GM testing alone passes every gate themselves,
    // so "the window opened" proves nothing about who it opened FOR.
    expect(await dlg(atk.page, /^GM — /).count(),
      'the attacker must never see the GM\'s TN window').toBe(0);

    await gmWindow.locator('#sr-gm-tn').fill(String(GM_TN));
    await gmWindow.getByRole('button', { name: /set target number/i }).click();

    // ── 2. The attacker's TN is read-only once a GM has adjudicated ─────────────
    const opts = dlg(atk.page, /Weapon Roll Options/i);
    await opts.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(opts.locator('#sr-tn'),
      'the GM set this TN — the attacker must not be able to edit it').toHaveAttribute('readonly', /.*/);

    // Guard the arrangement rather than trusting it: range or a modifier could push this
    // above 6, and every "no explosions" claim below depends on it.
    const tn = parseInt(await opts.locator('#sr-tn').inputValue(), 10);
    expect(tn, `attack TN must stay ≤ 6 for this scenario (got ${tn})`).toBeLessThanOrEqual(6);

    await opts.locator('#sr-pool').fill('2');
    await opts.getByRole('button', { name: /confirm|roll/i }).first().click();

    // ── 3. The attacker is charged for the dice they asked for ─────────────────
    await expect.poll(async () => (await actorState(atk.page, ATTACKER)).combatPoolSpent,
      { timeout: 25_000 }).toBe(atkBefore.combatPoolSpent + 2);

    // ── 4. The defence is declared AFTER the roll, and it COMES TO the defender ─
    //
    // ⚠ The declare button auto-clicks on the decider's client (`_claimAuto` in sr3e.js):
    // the attack is already resolved and everything downstream is blocked on this answer,
    // so a button the defender has to spot in a scrolling log is the wrong shape. The
    // dialog is therefore already open by the time a test looks, and the defender's own
    // button reads "already acted" rather than being clickable. Do not "fix" that into a
    // click — asserting the DIALOG's location is the stronger check anyway, because it is
    // what the player actually experiences.
    const declare = `${CHAT_LOG} .sr-dodge-declare-btn`;
    await def.page.locator(declare).last().waitFor({ timeout: 30_000 });
    await atk.page.locator(declare).last().waitFor({ timeout: 30_000 });

    await assertNoExplosions(atk.page, 'attack roll');

    // The card must state what the attack achieved — that number is the entire reason the
    // declaration happens here rather than before the roll. Without it the defender cannot
    // make the dodge-versus-soak trade the rule exists to create.
    await expect(atk.page.locator(`${CHAT_LOG} .message`).last())
      .toContainText(/\d+ hits? incoming/i);

    // The attacker is refused it outright — a distinct state from the defender's, whose
    // button is spent rather than forbidden.
    const atkBtn = atk.page.locator(declare).last();
    await expect(atkBtn).toBeDisabled();
    await expect(atkBtn, 'the attacker must be refused, not merely out of turn')
      .toHaveAttribute('title', /only the defender/i);

    // ── 5. Dodge: the defender's own dialog, on the defender's client ──────────
    const declareDialog = dlg(def.page, /Declare Response/i);
    await declareDialog.waitFor({ state: 'visible', timeout: 30_000 });
    expect(await dlg(atk.page, /Declare Response/i).count(),
      'the attacker must never be asked how their target defends').toBe(0);

    await declareDialog.locator('#dodge-dice').fill('3');
    await declareDialog.getByRole('button', { name: /^confirm$/i }).click();

    await expect.poll(async () => (await actorState(def.page, DEFENDER)).combatPoolSpent,
      { timeout: 25_000 }).toBe(defBefore.combatPoolSpent + 3);

    // The attacker paid for the attack and nothing more — the dodge is not billed to them.
    expect((await actorState(atk.page, ATTACKER)).combatPoolSpent,
      'the dodge must not be charged to the attacker').toBe(atkBefore.combatPoolSpent + 2);

    // ── 6. A failed dodge offers Resist Damage — which POSTS the soak card ─────
    //
    // Two buttons, two different gates, and the difference is deliberate. `.sr-soak-btn`
    // only posts a card onward, so it is `_mine` (any owner or the GM); `.sr-soak-roll-btn`
    // actually rolls, so it is `_isDecider` (exactly one person). Collapsing them would
    // either lock a co-owner out of their own card or let a spectator roll the dice.
    const resist = `${CHAT_LOG} .sr-soak-btn`;
    await def.page.locator(resist).last().waitFor({ timeout: 30_000 });
    await assertNoExplosions(def.page, 'dodge roll');

    // The dodge failed rather than cleanly missing — 3 pool dice at TN 4 cannot beat ~7
    // attack hits — so the carried-successes path is the one under test.
    await expect(def.page.locator(`${CHAT_LOG} .sr-dodge-result`).last())
      .toContainText(/dodge failed/i);

    await expect(atk.page.locator(resist).last(),
      'the attacker must not open their target\'s resistance card').toBeDisabled();
    await clickNewestChatButton(def.page, '.sr-soak-btn');

    // ── 7. Soak: the defender's card, the defender's button ───────────────────
    const soak = `${CHAT_LOG} .sr-soak-roll-btn`;
    await def.page.locator(soak).last().waitFor({ timeout: 30_000 });

    await expect(def.page.locator(soak).last(),
      'the target rolls their own Damage Resistance').toBeEnabled();
    await expect(atk.page.locator(soak).last(),
      'the attacker must not roll their target\'s soak').toBeDisabled();

    // Body dice are free; Combat Pool dice are charged. Two fields precisely so the
    // difference is visible — a single merged number made it impossible to tell.
    await setNewestChatField(def.page, 'sr-soak-body', 5);
    await setNewestChatField(def.page, 'sr-soak-cp', 1);
    await clickNewestChatButton(def.page, '.sr-soak-roll-btn');

    // 3 dodge + 1 soak = 4, and the Body dice cost nothing.
    await expect.poll(async () => (await actorState(def.page, DEFENDER)).combatPoolSpent,
      { timeout: 25_000 }).toBe(defBefore.combatPoolSpent + 4);

    await assertNoExplosions(def.page, 'soak roll');
  });
});
