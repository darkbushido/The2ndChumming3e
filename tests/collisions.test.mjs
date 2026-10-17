/**
 * Vehicle collisions — TODO 189. SR3 p.142 (braking), p.143 + p.147 (ram), p.148 (pedestrian, barrier).
 *
 * The rules are pure (`scripts/data/collisions.mjs`) and tested against the book's worked examples and
 * every band edge of the Impact Damage Levels Table. The cards are built from them with stubbed actors.
 * The dialog, the buttons and the entry points live in code that cannot be imported without Foundry, so
 * those are SOURCE-LEVEL invariants, backed by TESTING.md §45 in a live world.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame, makeActor } from './helpers/foundry.mjs';
installGlobals();
globalThis.foundry.utils.escapeHTML ??= s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { SR3E } = await import('../scripts/config.js');
const { Collisions } = await import('../scripts/data/collisions.mjs');
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { SR3ECollision } = await import('../scripts/SR3ECollision.js');

export const name = 'collisions';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const table = SR3EActor.crashDamage;                       // the ONE Impact Damage Levels Table
const code  = x => (x.level ? `${x.power}${x.level}` : 'none');

export async function run(t) {
  /* ── Vehicle-Pedestrian Collisions · p.148 ─────────────────────────────────────── */
  const P = speed => Collisions.pedestrian({ speed, table });
  t.is('p.149: Rex Karz, 60 m/turn → 6S for the pedestrians', code(P(60).pedestrian), '6S');
  t.is('…and the car, one stage lower than Moderate, resists 6L', code(P(60).vehicle), '6L');
  t.is('1-20 m/turn: Light on the table → Moderate for the pedestrian (the book\'s own example)', P(20).pedestrian.level, 'M');
  t.is('…and NO damage to the vehicle ("would take no damage")', P(20).vehicle.level, null);
  t.is('21 m/turn: Moderate → Serious; the vehicle "would resist only Light damage"', `${P(21).pedestrian.level}/${P(21).vehicle.level}`, 'S/L');
  t.is('61 m/turn: Serious → Deadly; the vehicle Moderate', `${P(61).pedestrian.level}/${P(61).vehicle.level}`, 'D/M');
  t.is('200 m/turn is still Serious on the table', P(200).pedestrian.level, 'D');
  t.ok('…so the Power is NOT yet increased by half', P(200).pedestrian.power === 20 && P(200).pedestrian.pastDeadly === false);
  t.is('201 m/turn: Destroyed on the table → Power +½ (21 → 31), still Deadly', code(P(201).pedestrian), '31D');
  t.ok('…flagged as past Deadly', P(201).pedestrian.pastDeadly);
  t.is('…and the vehicle, one below Destroyed, resists 21S', code(P(201).vehicle), '21S');
  t.is('the half rounds DOWN: Power 25 → 25 + 12 = 37', P(250).pedestrian.power, 37);
  t.is('a standstill still has Power 1 (the table\'s floor)', P(0).pedestrian.power, 1);
  t.is('the table\'s Power is rounded UP (speed ÷ 10)', P(35).pedestrian.power, 4);

  /* ── Vehicle against vehicle · p.143, p.147 ────────────────────────────────────── */
  const V = o => Collisions.vehicle({ table, ...o });
  const ram = V({ speedA: 152, speedB: 300, ram: { successes: 5, body: 3 } });
  t.is('p.147: 300 − 152 = 148 m/turn → 14.8 rounds UP to 15, Serious', `${ram.power}${ram.level}`, '15S');
  t.is('…the rammer\'s Mach 6 faces 2S (Body 3 × 5 successes, floor 2)', ram.first.power, 2);
  t.is('…and the cruiser, the target, faces the full 15S', ram.other.power, 15);
  t.is('the level is never reduced by the successes, only the Power', ram.level, 'S');
  const acc = V({ speedA: 152, speedB: 300, ram: null });
  t.is('an ACCIDENT, same speeds: nobody\'s Power is reduced (the maintainer\'s ruling)', `${acc.first.power}/${acc.other.power}`, '15/15');
  t.is('…even when a Body and successes are lying around', V({ speedDiff: 148, ram: null }).first.power, 15);
  t.is('a GM-entered difference wins over the two speeds', V({ speedA: 10, speedB: 20, speedDiff: 148 }).diff, 148);
  t.is('which vehicle is faster does not matter', V({ speedA: 300, speedB: 152 }).power, 15);
  t.is('a small reduction leaves the level: 150 diff, Body 4 × 1 → 11S for the rammer', code({ power: V({ speedDiff: 150, ram: { successes: 1, body: 4 } }).first.power, level: 'S' }), '11S');
  t.is('Power 1 is not raised to 2 by the floor', V({ speedDiff: 5, ram: { successes: 1, body: 3 } }).first.power, 1);
  t.is('21 m/turn: Moderate, Power 3', code(V({ speedDiff: 21 })), '3M');
  t.is('head-on: the GM\'s sum of the speeds is used as given', V({ speedDiff: 160 + 140 }).level, 'D');

  /* ── Walls and Barriers · p.148 ────────────────────────────────────────────────── */
  const B = (speed, rating) => Collisions.barrier({ speed, rating, table });
  t.ok('p.148: 300 m/turn into Heavy Structural (BR 16): 320 exceeds 300, so the cruiser stops',
    B(300, 16).threshold === 320 && B(300, 16).breaksThrough === false);
  t.ok('…a stopped vehicle carries no collision code of its own (it is a standard crash)', B(300, 16).power === null && B(300, 16).level === null);
  t.is('exactly BR × 20: "less than or equal" stops', B(320, 16).breaksThrough, false);
  t.is('one over: the barrier collapses', B(321, 16).breaksThrough, true);
  t.is('…it carries on at the speed left, 321 − 320 = 1', B(321, 16).speedAfter, 1);
  t.is('…collision Power is the Barrier Rating', B(321, 16).power, 16);
  t.is('…and the level reads the speed LOST (320 m/turn → Destroyed), not the speed it hit at', B(321, 16).level, 'D');
  const glass = B(100, 2);
  t.ok('Standard Glass (BR 2): 100 > 40, so it breaks; loses 40 (Moderate); Power 2; carries on at 60',
    glass.breaksThrough && glass.lost === 40 && glass.level === 'M' && glass.power === 2 && glass.speedAfter === 60);
  t.is('the level follows the loss, not the speed: BR 4 loses 80 → Serious', B(500, 4).level, 'S');
  t.is('BR 1 loses 20 → Light', B(50, 1).level, 'L');

  /* ── Braking · p.142 ───────────────────────────────────────────────────────────── */
  const K = o => Collisions.braking(o);
  t.is('speed drops by Acceleration × successes: 14 × 3 = 42', K({ speed: 100, acceleration: 14, successes: 3 }).speedAfter, 58);
  t.is('no successes, no change', K({ speed: 100, acceleration: 14, successes: 0 }).speedAfter, 100);
  t.is('decelerating exactly Acceleration × 4 is NOT "more than": no Crash Test', K({ speed: 200, acceleration: 14, successes: 4 }).crashTest, false);
  t.is('…more than it IS', K({ speed: 200, acceleration: 14, successes: 5 }).crashTest, true);
  t.is('a car cannot brake below standstill', K({ speed: 30, acceleration: 14, successes: 5 }).speedAfter, 0);
  t.is('…and what it actually shed is what counts toward the Crash Test (30 ≤ 56)', K({ speed: 30, acceleration: 14, successes: 5 }).crashTest, false);

  /* ── The pedestrian's dodge — a HOUSE RULE ─────────────────────────────────────── */
  const D = o => Collisions.dodgeToBeat(o);
  t.is('a ram is opposed by its Ramming Test successes', D({ how: 'ram', ramSuccesses: 3 }), 3);
  t.is('…never below 1', D({ how: 'ram', ramSuccesses: 0 }), 1);
  t.is('an accident has no successes: the weakest hit, 1, is assumed', D({ how: 'accident' }), 1);
  t.is('the GM\'s number wins', D({ how: 'accident', override: '4' }), 4);
  t.is('…even 0 (any single dodge hit clears)', D({ how: 'ram', ramSuccesses: 5, override: 0 }), 0);
  t.is('a blank box means "use the default"', D({ how: 'ram', ramSuccesses: 2, override: '' }), 2);
  t.is('a tie goes to the vehicle: 1 dodge hit does not beat 1 (the ordinary Dodge Test comparison, p.113)',
    SR3EActor.dodgeOutcome(1, D({ how: 'accident' })).cleanMiss, false);
  t.is('…2 dodge hits do', SR3EActor.dodgeOutcome(2, D({ how: 'accident' })).cleanMiss, true);

  /* ── The table stays in ONE place ──────────────────────────────────────────────── */
  await t.throws('the rules refuse to run without the table handed in (no second copy to fall back on)',
    () => Collisions.pedestrian({ speed: 60 }));
  const actorSrc = read('scripts/documents/SR3EActor.js');
  const body = actorSrc.slice(actorSrc.indexOf('static ramCollision('), actorSrc.indexOf('static _buildRamDamageHtml('));
  t.ok('ramCollision delegates to Collisions.vehicle with SR3EActor.crashDamage', /Collisions\.vehicle\(/.test(body) && /table: SR3EActor\.crashDamage/.test(body));
  t.ok('…and no longer carries its own level bands', !/201|diff >= 61/.test(body.replace(/\/\/.*$/gm, '')));
  t.ok('collisions.mjs has no level bands of its own', !/\b201\b|>= 61/.test(read('scripts/data/collisions.mjs').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));

  /* ── Occupants through a barrier · p.148 ───────────────────────────────────────── */
  const Q = SR3EActor.collisionPassengerDamage;
  t.is('restrained passengers take NO damage when the vehicle breaks through', code(Q({ power: 16, level: 'D', belted: true, breakthrough: true })), 'none');
  t.is('unrestrained ones resist the level one lower: D → S', code(Q({ power: 16, level: 'D', belted: false, breakthrough: true })), '16S');
  t.is('…and Light staged down is nothing', code(Q({ power: 2, level: 'L', belted: false, breakthrough: true })), 'none');
  t.is('impact armour still takes Power off an unrestrained occupant', code(Q({ power: 16, level: 'D', impact: 4, breakthrough: true })), '12S');
  t.is('in an ordinary crash the belt still stages ONE level down (p.147) — the reverse of a breakthrough',
    code(Q({ power: 15, level: 'S', belted: true })), '15M');

  /* ── The cards, from stubbed actors ────────────────────────────────────────────── */
  const car  = makeActor({ id: 'car', name: 'Americar', type: 'vehicle', attributes: { body: 3, accel: 14 },
    system: { driverActorId: 'drv', passengerActorIds: ['pax'] } });
  const drv  = makeActor({ id: 'drv', name: 'Driver' });
  const pax  = makeActor({ id: 'pax', name: 'Passenger' });
  const walk = makeActor({ id: 'walk', name: 'Pedestrian' });
  const van  = makeActor({ id: 'van', name: 'Panel Van', type: 'vehicle', attributes: { body: 4 } });
  installGame({ actors: [car, drv, pax, walk, van], sr3e: { SR3E, SR3EActor, SR3ECollision } });
  const aboard = [{ id: 'drv', role: 'Driver' }, { id: 'pax', role: 'Passenger' }];
  const payloads = (html, cls) => [...html.matchAll(new RegExp(`class="${cls}" data-payload='([^']*)'`, 'g'))]
    .map(m => JSON.parse(m[1].replace(/&#39;/g, "'")));
  const ctxOf = (kind, extra = {}) => SR3ECollision.context({ kind, how: 'accident', noTest: true, vehicle: car, aboard,
    speedMct: 50, pedestrianId: 'walk', pedDodge: false, otherId: 'van', otherSpeedMct: 0, barrierName: 'Wall', barrierRating: 4, ...extra });

  // pedestrian, no dodge
  let html = SR3ECollision.cardHtml(ctxOf('pedestrian'));
  t.ok('pedestrian card: 50 m/turn → 5M on the table, 5S for the pedestrian', /5S Physical/.test(html));
  const soak = payloads(html, 'sr-soak-btn')[0];
  t.ok('…a Resist Damage button for the pedestrian, on Impact armour, with no Knockdown step',
    soak?.targetActorId === 'walk' && soak.stagedPower === 5 && soak.stagedLevel === 'S' && soak.useImpact === true && soak.noKnockdown === true && soak.isStun === false);
  t.ok('…no dodge button unless the GM left the box ticked', !/sr-dodge-declare-btn/.test(html));
  const vs = payloads(html, 'sr-ram-vehicle-soak-btn')[0];
  t.ok('…the car resists 5L (one stage below the table\'s Moderate), with its occupants and a Crash Test offered',
    vs?.power === 5 && vs.level === 'L' && vs.vehicleActorId === 'car' && vs.passengerActorIds.join() === 'pax' && vs.offerCrash === true);
  // pedestrian with the house-rule dodge
  html = SR3ECollision.cardHtml(ctxOf('pedestrian', { pedDodge: true, pedBeat: '' }));
  const dodge = payloads(html, 'sr-dodge-declare-btn')[0];
  t.ok('with the dodge on: a Dodge-or-take-it button, and the Resist button is NOT also offered', dodge && !/class="sr-soak-btn"/.test(html));
  t.ok('…it must beat 1 hit for an accident, and carries the damage into the soak', dodge.attackSuccesses === 1 && dodge.stagedPower === 5 && dodge.stagedLevel === 'S' && dodge.useImpact === true);
  t.ok('…the card says plainly that it is a HOUSE RULE and that the book has none', /HOUSE RULE/.test(html) && /gives a pedestrian no dodge/.test(html));
  t.is('a ram\'s dodge must beat the Ramming Test\'s successes',
    payloads(SR3ECollision.cardHtml(ctxOf('pedestrian', { how: 'ram', noTest: false, pedDodge: true }), { successes: 3 }), 'sr-dodge-declare-btn')[0].attackSuccesses, 3);
  t.is('…unless the GM typed another number', payloads(SR3ECollision.cardHtml(ctxOf('pedestrian', { how: 'ram', noTest: false, pedDodge: true, pedBeat: 2 }), { successes: 3 }), 'sr-dodge-declare-btn')[0].attackSuccesses, 2);
  // GM-edited Power/Level
  html = SR3ECollision.cardHtml(ctxOf('pedestrian', { pedPower: 9, pedLevel: 'D' }));
  t.ok('the GM can edit the pedestrian\'s Power and Level, and the card says what the rule gave', /9D Physical/.test(html) && /set by the GM; the rule gives 5S/.test(html));
  // slow: no damage to the car
  html = SR3ECollision.cardHtml(ctxOf('pedestrian', { speedMct: 15 }));
  t.ok('slow (1-20 m/turn): the pedestrian takes 2M, the car takes no damage and has no soak button', /2M Physical/.test(html) && !/sr-ram-vehicle-soak-btn/.test(html) && /takes no damage/.test(html));
  // a missed ram
  t.ok('a ram with no successes misses', /misses/.test(SR3ECollision.cardHtml(ctxOf('pedestrian', { how: 'ram', noTest: false }), { successes: 0 })));
  t.ok('…but a posted-without-a-test ram goes ahead', !/misses/.test(SR3ECollision.cardHtml(ctxOf('pedestrian', { how: 'ram', noTest: true }), { successes: 0 })));

  // vehicle against vehicle: the Ramming card, reused
  html = SR3ECollision.cardHtml(ctxOf('vehicle', { speedMct: 152, otherSpeedMct: 300 }));
  const both = payloads(html, 'sr-ram-vehicle-soak-btn');
  t.ok('an accident between vehicles: two soak buttons, 15S each (no Body × successes reduction on either side)',
    both.length === 2 && both.every(p => p.power === 15 && p.level === 'S'));
  t.ok('…the card says it is an accident and the Power is not reduced', /Accident, not a ram/.test(html));
  html = SR3ECollision.cardHtml(ctxOf('vehicle', { how: 'ram', noTest: false, speedMct: 152, otherSpeedMct: 300 }), { successes: 5 });
  const rammed = payloads(html, 'sr-ram-vehicle-soak-btn');
  t.ok('a RAM keeps p.147: the rammer faces 9S (Body 3 × 5 = 15 off 15 floors at 2)', rammed[0].power === 2 && rammed[1].power === 15);
  t.ok('…and each vehicle is offered a Crash Test if it is damaged (p.143)', rammed.every(p => p.offerCrash === true));
  t.is('a head-on difference of 160 + 140 m/turn is Destroyed', payloads(SR3ECollision.cardHtml(ctxOf('vehicle', { speedMct: 160, otherSpeedMct: -140 })), 'sr-ram-vehicle-soak-btn')[0].level, 'D');

  // barrier
  html = SR3ECollision.cardHtml(ctxOf('barrier', { speedMct: 300, barrierName: 'Heavy Structural', barrierRating: 16 }));
  t.ok('p.148: 300 m/turn into BR 16 stops the car and posts the standard crash card', /it stops/.test(html) && /CRASH!/.test(html));
  t.ok('…at 300 m/turn that is a 30D crash', /30D Physical/.test(html));
  html = SR3ECollision.cardHtml(ctxOf('barrier', { speedMct: 100, barrierName: 'Plate Glass', barrierRating: 2 }));
  const thru = payloads(html, 'sr-ram-vehicle-soak-btn')[0];
  t.ok('breaking through Standard Glass at 100 m/turn: the car resists 2M, and its occupants resist as a breakthrough',
    thru.power === 2 && thru.level === 'M' && thru.breakthrough === true && !/CRASH!/.test(html));
  t.ok('…it carries on at 60 m/turn and the card says restrained passengers take nothing', /72 km\/h/.test(html) && /Restrained passengers take nothing/.test(html));
  t.ok('…the Barrier Damage tool is OFFERED for the barrier, never applied', payloads(html, 'sr-collision-barrier-btn').length === 1);
  const warn = SR3ECollision.cardHtml(ctxOf('barrier', { speedMct: 500, barrierName: 'Brick', barrierRating: 4 }));
  t.ok('losing more than Acceleration × 4 flags a Crash Test (14 × 4 = 56; it lost 80)', /Acceleration × 4 \(56\)/.test(warn));

  /* ── The contexts are plain JSON (they ride in chat buttons) ───────────────────── */
  const cc = ctxOf('vehicle');
  t.eq('a collision context survives a JSON round trip', JSON.parse(JSON.stringify(cc)), cc);
  t.eq('the driver and passengers come from the ticked occupants', [cc.driverActorId, cc.passengerActorIds], ['drv', ['pax']]);
  t.is('the other vehicle\'s occupants are read from its own roster', ctxOf('vehicle').otherDriverActorId, '');

  /* ── Source-level invariants: the Foundry side ─────────────────────────────────── */
  const coll  = read('scripts/SR3ECollision.js');
  const sr3e  = read('scripts/sr3e.js');
  const chase = read('scripts/SR3EVehicleChase.js');
  const sheet = read('scripts/sheets/SR3EVehicleSheet.js');
  t.ok('the Collision dialog is wired through DialogV2.wait\'s render option, not a global hook',
    /render: \(_event, dialog\) => wireDialog\(dialog, dialog\.element\)/.test(coll) && !/renderDialogV2/.test(coll));
  t.ok('it uses native DOM only', !/\$\(|jQuery|\.find\(|\.val\(/.test(coll.replace(/\.find\([a-z]/g, '')));
  t.ok('its actor lists hide templates and put the scene first', /sceneFirst\(game\.actors\s*\n?\s*\.filter\(a => \(a\.type === 'character'/.test(coll)
    && (coll.match(/isLiveActor/g) ?? []).length >= 2 && /sceneFirst\(game\.actors\.filter\(a => a\.type === 'vehicle'/.test(coll));
  t.ok('the Braking Test is a follow-up registered on SR3EActor.FOLLOW_UPS', /collisionBraking:\s+\['SR3ECollision', 'brakingRolled'\]/.test(actorSrc));
  t.ok('…and rollPool hands `followUp` to the wave card', (actorSrc.match(/followUp:\s+options\.followUp\s+\?\? null/g) ?? []).length === 2);
  t.ok('the class is registered on game.sr3e', /SR3EVehicleChase, SR3ECollision, SR3EConcealment, SR3EVehicleSheet,/.test(sr3e));
  t.ok('the resolve button is GM-only and one-shot', /sr-collision-resolve-btn[\s\S]{0,400}!game\.user\.isGM\) return _denyBtn[\s\S]{0,400}_claimBtn\(btn, mid, 'collisionresolve', i\)/.test(sr3e));
  t.ok('…the barrier button too', /sr-collision-barrier-btn[\s\S]{0,400}!game\.user\.isGM\) return _denyBtn[\s\S]{0,400}_claimBtn\(btn, mid, 'collisionbarrier', i\)/.test(sr3e));
  t.ok('…and the GM owes the resolve step (no actor key in its payload)', !/(actorId|vehicleActorId)/.test(
    coll.slice(coll.indexOf('class="sr-collision-resolve-btn"') - 80, coll.indexOf('class="sr-collision-resolve-btn"')).replace(/cc/g, '')));
  t.ok('entry points: Chase Scene, vehicle sheet, Vehicle Tools HUD menu and the 💥 Crash tool',
    /_actionCollision\(\)/.test(chase) && /data-action="collision"/.test(sheet)
    && /SR3ECollision\.open\(\{ vehicle: a \}\)/.test(sr3e) && /Hit a pedestrian/.test(sheet));
  t.ok('the Chase Ramming dialog takes a pedestrian target', /id="act-ped"/.test(chase) && /rammerAtPedestrian/.test(chase));
  t.ok('the Driving Test dialog has a collision mode with the Ramming and Braking tables\' VCR (2 ×)',
    /collision = null/.test(sheet) && /const vcr2 = vcrRating \* 2/.test(sheet));
  t.ok('the soak result offers a Crash Test when the vehicle took damage in a collision', /ctx\.offerCrash && ctx\.vehicleActorId/.test(actorSrc));
}
