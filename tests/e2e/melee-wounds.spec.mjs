/**
 * Wounds raise a fighter's own melee target number — F3, across real clients.
 *
 * The Melee Modifiers Table (SR3 p.123) has "Character is wounded — Damage Modifier (see p.126)".
 * Both boxing cards roll through `_rollWave`, which never adds `woundMod`, so until 0.5.2 a
 * fighter with 3 Stun boxes swung at the same TN as an unhurt one. `tests/melee-wounds.test.mjs`
 * pins the source; this proves it where it shows — the GM's melee window, opened on the GM's
 * client by a PLAYER's attack.
 *
 * ⚠ Compared against an UNHURT baseline run rather than a fixed number: reach (the troll
 * defender carries natural Reach 1), the GM window's pre-selected rows and the defender's weapon
 * all move the base TNs, and none of that is what this spec is about. The claim is exact
 * anyway — the attacker's TN rises by the wound modifier and the defender's does not move.
 */
import { test, expect } from './fixtures.mjs';
import { fireAndForget, answerDialog, selectTarget, arrangeActor, clearChatAll } from './foundry.mjs';

const ATTACKER = 'SWAT Team Member';    // Player2
const DEFENDER = 'Troll Street Dealer'; // Player3

/** Set the attacker's Stun boxes (their owner's page) and return the derived wound modifier. */
async function setStun(page, boxes) {
  return page.evaluate(async ({ n, b }) => {
    const a = game.actors.getName(n);
    await a.update({ 'system.wounds.stun.value': b });
    return a.system.woundMod ?? 0;
  }, { n: ATTACKER, b: boxes });
}

/** Start a melee attack, read the GM window's two TNs and its note, then cancel the exchange. */
async function gmWindowTNs(atk, janitor) {
  await fireAndForget(atk.page, `
    const I = game.sr3e.SR3EItem;
    const a = game.actors.getName(${JSON.stringify(ATTACKER)});
    await I.rollMeleeAttack(a, I._unarmedWeapon(a));
  `);
  await selectTarget(atk.page, DEFENDER);
  await answerDialog(atk.page, /Called Shot/i, /confirm/i);

  const gmWindow = janitor.page.locator('.application.dialog, dialog[open]')
    .filter({ has: janitor.page.locator('.window-title', { hasText: /^GM — / }) }).first();
  await gmWindow.waitFor({ state: 'visible', timeout: 30_000 });
  const read = await gmWindow.evaluate(el => ({
    atk:  Number(el.querySelector('#gmm-atk-tn')?.value),
    def:  Number(el.querySelector('#gmm-def-tn')?.value),
    text: el.textContent.replace(/\s+/g, ' '),
  }));
  // Cancelling aborts the exchange before any card is posted — nothing to clean up after.
  await gmWindow.getByRole('button', { name: /cancel exchange/i }).click();
  await gmWindow.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {});
  return read;
}

test.describe('melee wound modifier (F3)', () => {
  test.beforeEach(async ({ janitor }) => { await clearChatAll(janitor.page); });
  test.afterEach(async ({ player2, janitor }) => {
    await setStun(player2.page, 0);           // the world is persistent — put the wounds back
    await clearChatAll(janitor.page);
  });

  test('3 Stun boxes raise the attacker\'s TN by 2 and leave the defender\'s alone',
    async ({ player2, player3, janitor }) => {
    // Two full attacks (unhurt baseline, then hurt), twice the dialogs of any other melee spec.
    // On a client whose canvas falls back to software WebGL each dialog click took ~11 s
    // (2026-09-25), and the second attack's Called Shot ran out of the 2-minute budget.
    // test.slow() triples the timeout for this test only; the global budget still catches hangs.
    test.slow();
    await arrangeActor(player2.page, ATTACKER, { requireSkills: ['Unarmed Combat'] });
    await arrangeActor(player3.page, DEFENDER, { equipMelee: 'Katana', requireSkills: ['Edged Weapons'] });

    expect(await setStun(player2.page, 0), 'baseline must be unhurt').toBe(0);
    const unhurt = await gmWindowTNs(player2, janitor);
    expect(unhurt.text, 'no wound note when nobody is hurt').not.toMatch(/wounded \+/);

    const woundMod = await setStun(player2.page, 3);
    expect(woundMod, '3 Stun boxes is a Moderate wound: −2 (SR3 p.126)').toBe(-2);
    const hurt = await gmWindowTNs(player2, janitor);

    expect(hurt.atk - unhurt.atk, 'the attacker\'s own wounds raise the attacker\'s TN').toBe(2);
    expect(hurt.def, 'the defender is unhurt — their TN does not move').toBe(unhurt.def);
    expect(hurt.text, 'the GM window says why').toMatch(new RegExp(`${ATTACKER} wounded \\+2`));
  });
});
