/**
 * MIJI (Meaconing / Intrusion / Jamming / Interference) — the fourth two-corner card.
 *
 * ── HOW MIJI DIFFERS FROM THE CARDS ALREADY COVERED ──────────────────────────────────
 *
 * The corner OWNER is not the actor named on the card. Both corners belong to the two
 * riggers, but the contest is between their VEHICLES, and `postMIJICard` reaches the
 * rigger through `vehicle.system.driverActorId`. That indirection is the thing most
 * likely to break silently: a wrong link makes the corner owner `null`, the gate fails
 * closed to GM-only, and the card still looks completely normal — a player just finds
 * their own button greyed out with no explanation.
 *
 * Unlike contested, the setup dialog here does NOT let anyone type the other side's dice
 * — both pools are derived from each rigger's own Electronics (EW) rating and Flux. So
 * this spec asserts the derivation is per-rigger rather than testing for a control that
 * should not exist.
 *
 * ── AND THE UNMANNED CASE ────────────────────────────────────────────────────────────
 *
 * A drone with no linked rigger has no one to own its corner. Failing closed to GM-only
 * is correct — there is no player to ask — but it must be *deliberate*, so the second
 * test pins it. Otherwise a future "fix" for the greyed-out button hands an unmanned
 * drone's defence to whoever is nearest.
 */
import { test, expect } from './fixtures.mjs';
import {
  fireAndForget, createTestActor, deleteActors, sweepTestActors,
  clickCardButton, newestCardId, CHAT_LOG, actedLedger, clearChatAll,
} from './foundry.mjs';

const INT_RIGGER = '__TEST MIJI Rigger Int';   // Player2
const DEF_RIGGER = '__TEST MIJI Rigger Def';   // Player3
const INT_DRONE  = '__TEST MIJI Drone Int';
const DEF_DRONE  = '__TEST MIJI Drone Def';
const LONE_DRONE = '__TEST MIJI Drone Lone';   // no rigger linked

/**
 * A rigger's EW kit. `fluxRating` caps the complementary dice at min(Flux, skill), so
 * Flux 2 against Electronics 5 contributes exactly 2 — a number the card must show and
 * therefore a number this spec can check rather than guess at.
 */
const rigger = (flux, deck, protocolModule) => ({
  attributes: {
    body: { base: 3 }, quickness: { base: 4 }, strength: { base: 3 },
    charisma: { base: 3 }, intelligence: { base: 5 }, willpower: { base: 4 },
  },
  ew: { fluxRating: flux, deckRating: deck, protocolModule },
});

// Deliberately different ratings per side: if the card ever built both corners from one
// rigger, the two dice fields would agree and that is exactly what must not happen.
const intSkills = [{
  name: 'Electronics', type: 'skill',
  system: { rating: 5, linkedAttribute: 'intelligence',
            specialisations: [{ name: 'Electronic Warfare', level: 2 }] },
}];
const defSkills = [{
  name: 'Electronics', type: 'skill',
  system: { rating: 3, linkedAttribute: 'intelligence' },
}];

const CARD = 'miji';

/** Link a vehicle to its rigger. MIJI reads the corner owner through this field. */
async function linkDriver(gmPage, vehicleName, riggerName) {
  const res = await gmPage.evaluate(async ({ v, r }) => {
    const veh = game.actors.getName(v);
    const rig = game.actors.getName(r);
    if (!veh) return { error: `no vehicle "${v}"` };
    if (r && !rig) return { error: `no rigger "${r}"` };
    await veh.update({ 'system.driverActorId': rig?.id ?? '' });
    return { driverActorId: veh.system.driverActorId };
  }, { v: vehicleName, r: riggerName });
  if (res.error) throw new Error(`linkDriver: ${res.error}`);
  return res;
}

/** Open the MIJI dialog against `targetVehicle`, choose the intruder, and continue. */
async function openMiji(page, targetVehicleName, intruderVehicleName, operation = 'Jamming') {
  await fireAndForget(page, `
    const v = game.actors.getName(${JSON.stringify(targetVehicleName)});
    await game.sr3e.SR3EMIJI.openAttackDialog(v);
  `);

  const dialog = page.locator('.application.dialog, dialog[open]')
    .filter({ has: page.locator('.window-title', { hasText: /MIJI Attack/i }) })
    .first();
  await dialog.waitFor({ state: 'visible', timeout: 20_000 });

  await dialog.locator('#miji-intruder').selectOption({ label: intruderVehicleName });
  await dialog.locator('#miji-op').selectOption({ label: operation });

  // Jamming is the only operation that can reach all three channels; the channel list is
  // rebuilt per operation by the dialog's own `render` callback. If that wiring is broken
  // the list still holds the PREVIOUS operation's channels, so assert it followed.
  await expect(dialog.locator('#miji-channel option')).toHaveCount(3);
  await dialog.locator('#miji-channel').selectOption({ label: 'Simsense' });

  await dialog.getByRole('button', { name: /continue/i }).click();
}

test.describe('MIJI two-corner card', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await clearChatAll(janitor.page);
    await sweepTestActors(janitor.page);

    const ir = await createTestActor(janitor.page, {
      name: INT_RIGGER, ownerUserName: 'Player2', system: rigger(2, 4, 5),
      items: intSkills, x: 1500, y: 1500,
    });
    const dr = await createTestActor(janitor.page, {
      name: DEF_RIGGER, ownerUserName: 'Player3', system: rigger(1, 6, 3),
      items: defSkills, x: 1600, y: 1500,
    });
    // Vehicles need no token — MIJI never targets through the canvas, it picks from a list.
    const iv = await createTestActor(janitor.page, {
      name: INT_DRONE, ownerUserName: 'Player2', type: 'vehicle',
      system: { ew: { ecm: 4, eccm: 0, fluxRating: 2, footprint: 0 } }, withToken: false,
    });
    const dv = await createTestActor(janitor.page, {
      name: DEF_DRONE, ownerUserName: 'Player3', type: 'vehicle',
      system: { ew: { ecm: 2, eccm: 0, fluxRating: 1, footprint: 0 } }, withToken: false,
    });
    const lv = await createTestActor(janitor.page, {
      name: LONE_DRONE, type: 'vehicle',
      system: { ew: { ecm: 1, eccm: 0, fluxRating: 0, footprint: 0 } }, withToken: false,
    });

    created = [ir.id, dr.id, iv.id, dv.id, lv.id];

    await linkDriver(janitor.page, INT_DRONE, INT_RIGGER);
    await linkDriver(janitor.page, DEF_DRONE, DEF_RIGGER);
    // LONE_DRONE is deliberately left unlinked.
  });

  test.afterEach(async ({ janitor }) => {
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
    await clearChatAll(janitor.page);
  });

  test('each rigger owns their own vehicle\'s corner and submits only that half',
    async ({ player2, player3 }) => {
    const int = player2;
    const def = player3;

    await openMiji(int.page, DEF_DRONE, INT_DRONE);

    const msgId = await newestCardId(int.page, CARD);
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="${CARD}"]`;
    await int.page.locator(card).waitFor({ timeout: 20_000 });
    await def.page.locator(card).waitFor({ timeout: 20_000 });

    // ── Dice are derived per rigger, not copied from one side ──────────────────
    // Intruder: Electronics 5 (EW +2) = 7, + min(Flux 2, 7) = 2 → 9.
    // Defender: Electronics 3, no specialisation, + min(Flux 1, 3) = 1 → 4.
    // If the EW specialisation were dropped (the bug fixed alongside this spec) the
    // intruder would show 7, so this doubles as a live check on _pickEwSkill.
    await expect(int.page.locator(`${card} .sr-miji-int-dice`)).toHaveValue('9');
    await expect(int.page.locator(`${card} .sr-miji-def-dice`)).toHaveValue('4');

    // TNs cross over: the intruder rolls against the DEFENDER's deck rating (6), and
    // Jamming sets the defender's TN from the INTRUDER vehicle's ECM (4). Swapping these
    // is invisible on the card but reverses who is favoured.
    await expect(int.page.locator(`${card} .sr-miji-int-tn`)).toHaveValue('6');
    await expect(int.page.locator(`${card} .sr-miji-def-tn`)).toHaveValue('4');

    // ── Ownership reaches the rigger THROUGH the vehicle ───────────────────────
    const iOwn = int.page.locator(`${card} .sr-corner-submit-btn[data-role="intruder"]`);
    const iOpp = int.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`);
    await expect(iOwn).toBeEnabled();
    await expect(iOpp).toBeDisabled();

    const dOwn = def.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`);
    const dOpp = def.page.locator(`${card} .sr-corner-submit-btn[data-role="intruder"]`);
    await expect(dOwn).toBeEnabled();
    await expect(dOpp).toBeDisabled();

    await expect(int.page.locator(`${card} .sr-miji-def-dice`)).toHaveAttribute('readonly', /.*/);
    await expect(def.page.locator(`${card} .sr-miji-int-dice`)).toHaveAttribute('readonly', /.*/);

    // ── Each side submits its own half ─────────────────────────────────────────
    await int.page.locator(`${card} .sr-miji-int-dice`).fill('8');
    await clickCardButton(int.page, card, '.sr-corner-submit-btn[data-role="intruder"]');

    await expect.poll(async () => (await actedLedger(def.page))?.intruder?.data?.['sr-miji-int-dice'],
      { timeout: 15_000 }).toBe('8');
    expect((await actedLedger(def.page)).defender,
      'the defender must not be marked before they submit').toBeUndefined();

    const before = await int.page.locator(`${CHAT_LOG} .message`).count();
    await clickCardButton(def.page, card, '.sr-corner-submit-btn[data-role="defender"]');

    // The completing submission resolves and posts the result card.
    await expect.poll(async () => int.page.locator(`${CHAT_LOG} .message`).count(),
      { timeout: 25_000 }).toBeGreaterThan(before);

    // The result must credit the RIGGERS, who actually rolled — not the vehicle names.
    // `_postMIJIResult` used to print the target vehicle unconditionally.
    await expect(int.page.locator(`${CHAT_LOG} .message`).last()).toContainText(DEF_RIGGER);
  });

  test('an unmanned drone\'s corner falls to the GM, not to a bystander',
    async ({ player2, janitor }) => {
    const int = player2;

    await openMiji(int.page, LONE_DRONE, INT_DRONE);

    const msgId = await newestCardId(int.page, CARD);
    const card  = `${CHAT_LOG} .message[data-message-id="${msgId}"] [data-twocorner="${CARD}"]`;
    await int.page.locator(card).waitFor({ timeout: 20_000 });
    await janitor.page.locator(card).waitFor({ timeout: 20_000 });

    // The intruder still owns their own corner…
    await expect(int.page.locator(`${card} .sr-corner-submit-btn[data-role="intruder"]`)).toBeEnabled();
    // …but has no claim on the empty drone's, even though nobody else does either. This is
    // the fail-closed path: an unowned corner is the GM's, never "whoever is looking".
    await expect(int.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`)).toBeDisabled();
    await expect(janitor.page.locator(`${card} .sr-corner-submit-btn[data-role="defender"]`)).toBeEnabled();

    // And the GM can carry the exchange to a result on the drone's behalf.
    const before = await int.page.locator(`${CHAT_LOG} .message`).count();
    await clickCardButton(int.page, card, '.sr-corner-submit-btn[data-role="intruder"]');
    await expect.poll(async () => (await actedLedger(janitor.page))?.intruder,
      { timeout: 15_000 }).toBeTruthy();
    await clickCardButton(janitor.page, card, '.sr-corner-submit-btn[data-role="defender"]');

    await expect.poll(async () => int.page.locator(`${CHAT_LOG} .message`).count(),
      { timeout: 25_000 }).toBeGreaterThan(before);
  });
});
