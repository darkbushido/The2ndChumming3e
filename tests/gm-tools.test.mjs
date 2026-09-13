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

  /* ── Occupants · SR3 p.147 — seat belts drop the LEVEL, impact armour drops the POWER ── */
  const P = SR3EActor.collisionPassengerDamage;
  const code = r => r.level ? `${r.power}${r.level} TN${r.tn}` : 'none';
  /* The book's cops: 15S, belted → 15M, 4/3 vests → 12M, Body 4 against TN 12. */
  t.is('p.147 cops: 15S, belted, Impact 3 → 12M at TN 12',
    code(P({ power: 15, level: 'S', impact: 3, belted: true })), '12M TN12');
  t.is('belt alone: 15S → 15M',            code(P({ power: 15, level: 'S', belted: true })), '15M TN15');
  t.is('armour alone: 15S, Impact 3 → 12S', code(P({ power: 15, level: 'S', impact: 3 })),  '12S TN12');
  t.is('nothing: unchanged',               code(P({ power: 15, level: 'S' })),              '15S TN15');
  t.is('a belt stages Light damage away entirely', code(P({ power: 5, level: 'L', belted: true })), 'none');
  t.is('Deadly belted is Serious',         code(P({ power: 20, level: 'D', belted: true })), '20S TN20');
  t.is('armour cannot push the TN below 2', P({ power: 3, level: 'M', impact: 6 }).tn, 2);
  t.is('…or the Power below 0',            P({ power: 3, level: 'M', impact: 6 }).power, 0);

  /* Passengers take the level the VEHICLE took — for ramming too (the book's example is one). */
  const soakRes = (successes, extra = {}) => SR3EActor._buildVehicleSoakResultHtml(successes, {
    vehicleActorId: 'v', vehicleName: 'Cruiser', driverActorId: '', power: 15, level: 'S',
    passengerActorIds: [], ...extra });
  const passengerLevel = html => (html.match(/data-payload='([^']*passengerActorId[^']*)'/) || [])[1];
  const _savedActors = globalThis.game.actors;
  globalThis.game.actors = { get: id => (id === 'cop' ? { id: 'cop', name: 'Cop', system: { attributes: { body: { value: 4 } } } } : null) };
  const ramNoStage = soakRes(0, { passengerActorIds: ['cop'] });      // ramming: no useStaged flag
  t.is('ramming, vehicle staged nothing: the cop faces 15S',
    JSON.parse(passengerLevel(ramNoStage).replace(/&#39;/g, "'")).level, 'S');
  const ramStaged = soakRes(2, { passengerActorIds: ['cop'] });
  t.is('ramming, vehicle staged to M: the cop faces 15M, not the original S',
    JSON.parse(passengerLevel(ramStaged).replace(/&#39;/g, "'")).level, 'M');
  const soakedAway = soakRes(8, { passengerActorIds: ['cop'] });
  t.ok('vehicle soaked it all: no resist button for anyone aboard', !/sr-ram-passenger-resist-btn/.test(soakedAway));
  t.ok('…and the card says why', /took no damage, so no one aboard does either/.test(soakedAway));
  globalThis.game.actors = _savedActors;

  const main0 = src('sr3e.js');
  t.ok('the belt/armour dialog opens BEFORE the button is claimed (Cancel keeps it usable)',
    /promptCollisionResist\([\s\S]{0,120}if \(!choice\) return;\s*if \(!_claimBtn\(btn, mid, 'rampassenger'/.test(main0));
  t.ok('the passenger roll names its actor, so Assign Wound has somewhere to go',
    /soakPayload: \{ actorId: pActor\.id, stagedPower: r\.power/.test(src('documents/SR3EActor.js')));

  /* ── TODO 106 — the Crash Test has its own table (p.148), and a VCR is −Rating on a Driving Test ── */
  const S = SR3EActor.crashSpeedModifier;
  t.is('crash speed: under Reaction ×20 → 0',  S(99, 5), 0);
  t.is('…under ×30 → +1',                      S(100, 5), 1);
  t.is('…under ×40 → +2',                      S(199, 5), 2);
  t.is('…at or over ×40 → +4',                 S(200, 5), 4);
  const vehSrc = src('sheets/SR3EVehicleSheet.js');
  t.ok('Driving Test VCR is −VCR Rating (p.134-135, Whiz Kid VCR 1 → −1), not ×2',
    /value="\$\{-vcrRating\}"/.test(vehSrc) && !/-vcrRating \* 2/.test(vehSrc));
  t.ok('Crash Test terrain uses its own +2 / +4 (p.148)',
    /Terrain \(Crash Test\)[\s\S]{0,400}value="2">Restricted[\s\S]{0,80}value="4">Tight/.test(vehSrc));

  const veh = vehSrc;
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
   *  102 — an attribute at 0 is shown and rolled as 0, and flagged if it is illegal
   *  (found in the TODO 93 run: Charisma 0 opened as 3 dice, then 1 after the dropdown)
   * ════════════════════════════════════════════════════════════════════════════ */
  const rollAttr = sheet.slice(sheet.indexOf('static async _onRollAttr'), sheet.indexOf('static async _onRollSkill'));
  t.ok('the attribute roll no longer swaps a 0 for 3 dice', !/if \(!val \|\| val < 1/.test(rollAttr) && /Number\.isFinite\(Number\(val\)\)/.test(rollAttr));
  const opts = sheet.slice(sheet.indexOf('static async _promptRollOptions'), sheet.indexOf('static async _promptSkillRollOptions'));
  t.ok('the dropdown no longer turns 0 into 1',   !/dataset\.val\) \|\| 1/.test(opts));
  t.ok('…nor the Roll button',                    !/Math\.max\(1, parseInt\(poolEl\.value\) \|\| 1\)/.test(opts));
  t.ok('…and the pool box accepts 0',             /id="sr-pool"[^>]*min="0"/.test(opts));
  t.ok('an illegal Physical/Mental rating is flagged, citing p.55',
    /attr-below-min/.test(sheet) && /may not be below 1 \(SR3 p\.55\)/.test(sheet));
  const coreBlock = sheet.slice(sheet.indexOf('const coreAttrs = ['), sheet.indexOf('<!-- Magic -->'));
  t.ok('…only in the six-attribute block (Magic 0 is normal and never flagged)',
    /attr-below-min/.test(coreBlock) && !/attr-below-min/.test(sheet.slice(sheet.indexOf('<!-- Magic -->'), sheet.indexOf('<!-- Magic -->') + 3000)));

  /* ════════════════════════════════════════════════════════════════════════════
   *  96 — nobody starts ticked
   * ════════════════════════════════════════════════════════════════════════════ */
  const main = src('sr3e.js');
  t.ok('Session Rewards rows start unticked', !/data-actor-id="\$\{a\.id\}" checked/.test(main));
  t.ok('…with an All box instead', /id="sr-reward-all"/.test(main));
  t.ok('Chunky Salsa starts unticked unless the grenade flow passed who was caught',
    /checked: !!opts\.actorIds\?\.length/.test(main) && !/checked: true \}/.test(main));
}
