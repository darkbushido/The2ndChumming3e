/**
 * Three reports from play, 2026-08-30 / 2026-09-11 — TODO 73, 74, 96.
 *
 *  · 74 — a car accident outside a Chase Scene had no way to reach the crash-damage flow.
 *  · 73 — no way to roll "N dice against a TN" for anything the sheet has no button for.
 *  · 96 — the Rollable Tables GM tools opened with every actor already ticked.
 *
 * The crash arithmetic is pure and tested behaviourally. The dialogs live in sheet code that
 * cannot be imported without Foundry, so — like `gm-writes` — those are SOURCE-LEVEL invariants,
 * backed by the TODO 93 checklist in a live world.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'gm-tools';

const src = f => readFileSync(new URL(`../scripts/${f}`, import.meta.url), 'utf8');

export async function run(t) {
  /* ════════════════════════════════════════════════════════════════════════════
   *  74 — crash damage from km/h · SR3 p.147
   * ════════════════════════════════════════════════════════════════════════════ */
  const K = SR3EActor.crashDamageFromKmh;
  t.is('50 km/h is 41.7 m per Combat Turn', K(50).speedKmct.toFixed(1), '41.7');
  t.is('…which the table reads as 5M', `${K(50).power}${K(50).level}`, '5M');
  /* ⚠ The unit trap: 70 km/h is 58 m/turn (Moderate); read raw as 70 it would be Serious. */
  t.is('70 km/h is Moderate, not Serious', K(70).level, 'M');
  t.is('72 km/h is exactly 60 m/turn — still Moderate (21-60)', K(72).level, 'M');
  t.is('73.2 km/h is 61 m/turn — Serious (61-200)', K(73.2).level, 'S');
  t.is('241.2 km/h is 201 m/turn — Destroyed-level (201+)', K(241.2).level, 'D');
  t.is('a standing start still has Power 1', `${K(0).power}${K(0).level}`, '1L');
  t.is('it agrees with the Chase Scene\'s table on the same m/turn',
    `${K(120).power}${K(120).level}`, (() => { const d = SR3EActor.crashDamage(100); return `${d.power}${d.level}`; })());

  /* The one damage builder, with and without the GM's overrides. */
  const ctx = { vehicleActorId: 'v', vehicleName: 'Americar', driverActorId: 'd', speedKmct: 50,
                vehicleBody: 3, passengerActorIds: ['p1', 'p2'] };
  const plain = SR3EActor._buildCrashDamageHtml(ctx);
  t.ok('no override: the table\'s 5M', /Damage: <strong>5M Physical/.test(plain));
  t.ok('…and no "set by the GM" note', !/set by the GM/.test(plain));
  const over = SR3EActor._buildCrashDamageHtml({ ...ctx, power: 8, level: 'S' });
  t.ok('an override is used', /Damage: <strong>8S Physical/.test(over));
  t.ok('…and the card says the table would have given 5M', /set by the GM; the table gives 5M/.test(over));
  const payload = JSON.parse(over.match(/data-payload='([^']+)'/)[1].replace(/&#39;/g, "'"));
  t.is('the soak carries the overridden Power',      payload.power, 8);
  t.is('…and level',                                 payload.level, 'S');
  t.is('…and every passenger aboard',                payload.passengerActorIds.join(), 'p1,p2');
  t.ok('an invalid level falls back to the table',
    /Damage: <strong>5M/.test(SR3EActor._buildCrashDamageHtml({ ...ctx, level: 'X' })));

  const veh = src('sheets/SR3EVehicleSheet.js');
  t.ok('the Crash Test IS the Driving Test in crash mode (p.147), rolled through the crash path',
    /runDrivingTest\(vehicle, null, \{ crash: crashContext \}\)/.test(veh) && /isCrashRoll: true, crashContext: crash/.test(veh));
  t.ok('a failed Driving Test offers the crash dialog', /crashOnFailVehicleId: actor\.id/.test(veh));
  t.ok('no second crash table: the dialog posts through _buildCrashDamageHtml',
    /SA\._buildCrashDamageHtml\(crashContext\)/.test(veh) && !/Math\.ceil\([^)]*\/ ?10\)/.test(veh));
  t.ok('the vehicle carries a passenger roster',
    /passengerActorIds: new ArrayField\(new StringField\(\)\)/.test(src('data/ActorDataModels.js')));
  t.ok('the Chase Scene starts from that roster',
    /vActor\.system\.passengerActorIds/.test(src('SR3EVehicleChase.js')));

  /* ════════════════════════════════════════════════════════════════════════════
   *  73 — the Success Test goes through rollPool, via the existing dialog
   * ════════════════════════════════════════════════════════════════════════════ */
  const sheet = src('sheets/SR3EActorSheet.js');
  const handler = sheet.slice(sheet.indexOf('static async _onRollSuccessTest'));
  t.ok('the button is registered', /rollSuccessTest:\s+SR3EActorSheet\._onRollSuccessTest/.test(sheet));
  t.ok('it reuses _promptRollOptions in custom mode, not a third dialog',
    /_promptRollOptions\(actor, \{[^}]*custom: true/.test(handler));
  t.ok('…and rolls through rollPool, not Roll.create',
    /actor\.rollPool\(/.test(handler.slice(0, 1500)) && !/Roll\.create|new Roll\(/.test(handler.slice(0, 1500)));
  t.ok('the player\'s label is escaped before it reaches the card', /&lt;/.test(handler.slice(0, 1500)));

  /* ════════════════════════════════════════════════════════════════════════════
   *  96 — nobody starts ticked
   * ════════════════════════════════════════════════════════════════════════════ */
  const main = src('sr3e.js');
  t.ok('Session Rewards rows start unticked', !/data-actor-id="\$\{a\.id\}" checked/.test(main));
  t.ok('…with an All box instead', /id="sr-reward-all"/.test(main));
  t.ok('Chunky Salsa starts unticked unless the grenade flow passed who was caught',
    /checked: !!opts\.actorIds\?\.length/.test(main) && !/checked: true \}/.test(main));
}
