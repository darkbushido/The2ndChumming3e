/**
 * Rigger dump shock — scripts/data/rigger-shock.mjs (TODO 198), and the cards that use it.
 *
 * Found writing the rigging guide (TODO 194): the ⚡ Dumpshock tool treated a rigger like a decker —
 * a host's System Rating for Power, the track from `matrixUserMode`, Body to resist. SR3 p.156: a
 * rigger resists (RC deck Rating + 4)S Stun dumped from a network, 5S jacked out of a vehicle, with
 * Willpower, and is disoriented (+2) for ten Combat Turns unless a Willpower (4) Test shortens it.
 * p.145 (TODO 199) is the same resistance with Willpower and no pools.
 */
import { readFileSync } from 'node:fs';
import { RiggerShock, DISORIENT_MOD, DISORIENT_TN, DISORIENT_TURNS } from '../scripts/data/rigger-shock.mjs';

export const name = 'rigger-shock';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  /* ── Dump shock, SR3 p.156 ───────────────────────────────────────────────────── */
  t.eq('dumped from a Rating 4 RC network → 8S Stun, Willpower',
    RiggerShock.dumpShock('network', 4),
    { power: 8, level: 'S', isStun: true, resistAttr: 'willpower', page: 'SR3 p.156' });
  t.is('a Rating 0 deck still resists 4S', RiggerShock.dumpShock('network', 0).power, 4);
  t.is('a missing deck rating is 0, not NaN', RiggerShock.dumpShock('network').power, 4);
  t.eq('jacked out of a vehicle → 5S Stun, Willpower, whatever the deck',
    RiggerShock.dumpShock('vehicle', 6),
    { power: 5, level: 'S', isStun: true, resistAttr: 'willpower', page: 'SR3 p.156' });
  t.is('an unknown source is not guessed at', RiggerShock.dumpShock('matrix', 4), null);

  /* ── Disorientation: 30 ÷ successes (up) seconds, ÷ 3 (up) Combat Turns ─────────── */
  t.eq('the book\'s constants: +2 for ten turns, Willpower TN 4', [DISORIENT_MOD, DISORIENT_TURNS, DISORIENT_TN], [2, 10, 4]);
  t.eq('no successes: the full ten turns', RiggerShock.disorientation(0), { seconds: 30, turns: 10 });
  t.eq('1 success: 30 seconds, 10 turns', RiggerShock.disorientation(1), { seconds: 30, turns: 10 });
  t.eq('2 successes: 15 seconds, 5 turns', RiggerShock.disorientation(2), { seconds: 15, turns: 5 });
  t.eq('4 successes: 30/4 → 8 seconds, 8/3 → 3 turns (both round up)', RiggerShock.disorientation(4), { seconds: 8, turns: 3 });
  t.eq('7 successes: 5 seconds, 2 turns', RiggerShock.disorientation(7), { seconds: 5, turns: 2 });
  t.eq('30 successes: 1 second, 1 turn — never zero', RiggerShock.disorientation(30), { seconds: 1, turns: 1 });

  /* ── Rigger damage, SR3 p.145 ─────────────────────────────────────────────────── */
  t.eq('Serious → 6M Physical, Willpower, no pools', RiggerShock.feedback('serious'),
    { power: 6, level: 'M', isStun: false, resistAttr: 'willpower', noPools: true, page: 'SR3 p.145' });
  t.eq('Destroyed → 6S Physical', [RiggerShock.feedback('destroyed').power, RiggerShock.feedback('destroyed').level], [6, 'S']);
  t.is('Light or Moderate: nothing', RiggerShock.feedback('moderate'), null);

  /* ── The cards (source-level: they need Foundry) ────────────────────────────────── */
  const actor = read('scripts/documents/SR3EActor.js');
  const riggerFn = actor.slice(actor.indexOf('async _postRiggerDumpshock('), actor.indexOf('static async handleRiggerDisorientClick('));
  t.ok('the rigger card takes its numbers from RiggerShock', /RiggerShock\.dumpShock\(kind, deckRating\)/.test(riggerFn));
  t.ok('…resists with Willpower', /resistAttr:\s*d\.resistAttr/.test(riggerFn));
  t.ok('…always on the Stun track', /isStun:\s*true/.test(riggerFn) && !/matrixUserMode/.test(riggerFn));
  t.ok('…with no armour and no knockdown', /noArmor:\s*true/.test(riggerFn) && /noKnockdown:\s*true/.test(riggerFn));
  t.ok('…and offers the disorientation test', /sr-rigger-disorient-btn/.test(riggerFn));
  t.ok('the Dumpshock dialog sends a rigger to the rigger card',
    /if \(result\.kind !== 'matrix'\) return this\._postRiggerDumpshock\(result\.kind, result\.deck\)/.test(actor));
  t.ok('the disorientation roll is a registered follow-up',
    /riggerDisorient:\s*\['SR3EActor', '_riggerDisorientOutcome'\]/.test(actor));

  const soak = actor.slice(actor.indexOf('  async _postSoakCard('), actor.indexOf('static async handleSoakRollClick('));
  t.ok('the soak card rolls the payload\'s attribute, Body by default',
    /const resistAttr = payload\.resistAttr === 'willpower' \? 'willpower' : 'body'/.test(soak)
    && /this\.system\.attributes\?\.\[resistAttr\]/.test(soak));
  t.ok('`noPools` removes the Combat Pool field (p.145)', /payload\.noPools\) \? 0/.test(soak));
  t.ok('the roll carries the attribute and noPools on', /resistAttr,\s*\n\s*noPools:/.test(soak));
  t.ok('the roll itself refuses pool dice under noPools',
    /const useCP\s*= payload\.noPools \? 0/.test(actor));

  const sr3e = read('scripts/sr3e.js');
  t.ok('the disorientation button is one-shot and gated to one user',
    /sr-rigger-disorient-btn[\s\S]{0,200}_checkBtn\(btn, mid, 'riggerdisorient', i\)[\s\S]{0,200}_isDecider\(pl\)/.test(sr3e));
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  const ewAt = sheet.indexOf('_riggerEWBlock(sys) {');
  const ew = sheet.slice(ewAt, sheet.indexOf('// ── Orthodox SR3 Matrix Tab', ewAt));
  t.ok('the rigger panel has a Dump Shock button (riggers are not in VR)', /data-action="rollDumpshock"/.test(ew));

  /* ── A decker's dump shock: Willpower, the maintainer's ruling (TODO 201) ──────────
   * SR3 p.227 and MDF p.27 name no attribute; ruled Willpower 2026-09-27 ("it's a mental issue").
   * Four cards: the ⚡ Dumpshock tool (Defragged and, since 0.6.3, Orthodox), Convergence, and the Orthodox
   * deck crash. */
  t.is('every decker dump shock card resists with Willpower',
    (actor.match(/resistAttr:\s+'willpower',\s+\/\/ the maintainer's ruling, 2026-09-27 \(TODO 201\)/g) ?? []).length, 4);
  t.ok('…and no button still says Body', !/Resist Dumpshock \(Body/.test(actor));
  t.is('…and no worn armour lowers it — the maintainer\'s ruling, 2026-09-28',
    (actor.match(/noArmor:\s+true,\s+\/\/ no armour against dump shock — the maintainer's ruling, 2026-09-28/g) ?? []).length, 4);

  /* ── Rigger damage trigger, SR3 p.145 (TODO 199) ───────────────────────────────── */
  const stage = RiggerShock.feedbackStage;
  t.is('Moderate → Serious: the 6M case', stage('M', 'S'), 'serious');
  t.is('undamaged → Serious in one hit', stage(null, 'S'), 'serious');
  t.is('Serious → Destroyed: the 6S case', stage('S', 'D'), 'destroyed');
  t.is('Moderate → Destroyed is destroyed only, not both', stage('M', 'D'), 'destroyed');
  t.is('more boxes inside Serious: nothing new', stage('S', 'S'), null);
  t.is('Light → Moderate: nothing', stage('L', 'M'), null);
  t.is('repairs: nothing', stage('D', 'S'), null);

  const hooks = sr3e.slice(sr3e.indexOf('A rigged vehicle reached Serious or Destroyed'), sr3e.indexOf('Re-render combat tracker when a vehicle'));
  t.ok('the trigger reads the OLD boxes in preUpdate and needs a jacked-in (VCR) rigger',
    /preUpdateActor/.test(hooks) && /controlMode !== 'vcr'/.test(hooks) && /driverActorId/.test(hooks)
    && /RiggerShock\.feedbackStage\(/.test(hooks) && /vehicleDamageLevel\(actor\.system\.damage\?\.value/.test(hooks));
  t.ok('…and only the client that made the change posts the card',
    /userId === game\.user\.id\)[\s\S]{0,80}postRiggerFeedbackCard/.test(hooks));

  const fb = actor.slice(actor.indexOf('static async postRiggerFeedbackCard('), actor.indexOf('static async handleRiggerDisorientClick('));
  t.ok('the card resists RiggerShock.feedback with Willpower, no pools, no armour, Physical',
    /RiggerShock\.feedback\(stage\)/.test(fb) && /resistAttr:\s*f\.resistAttr/.test(fb) && /noPools:\s*true/.test(fb)
    && /noArmor:\s*true/.test(fb) && /isStun:\s*false/.test(fb));
  t.ok('…and the soak button belongs to the rigger, not the vehicle\'s owner (no vehicleActorId key)',
    !/^\s*vehicleActorId:/m.test(fb) && /targetActorId:\s*rigger\.id/.test(fb));
}
