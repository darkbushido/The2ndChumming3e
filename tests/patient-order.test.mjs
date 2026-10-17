/**
 * The 🩹 Healing patient list order · TODO 208 — players first, other NPCs, hostile NPCs last.
 */
import { readFileSync } from 'node:fs';
import { PatientOrder } from '../scripts/data/patient-order.mjs';

export const name = 'patient-order';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const P = PatientOrder;
  const e = (nm, o = {}) => ({ name: nm, isPlayer: false, hostile: false, owned: false, ...o });

  t.ok('the hostile disposition is -1 (CONST.TOKEN_DISPOSITIONS.HOSTILE)', P.isHostile(-1) && P.isHostile('-1'));
  t.ok('neutral, friendly, secret and unset are not hostile', !P.isHostile(0) && !P.isHostile(1) && !P.isHostile(-2) && !P.isHostile(undefined) && !P.isHostile(null));

  t.is('a player character is tier 0', P.tier({ isPlayer: true }), 0);
  t.is('another NPC is tier 1', P.tier({}), 1);
  t.is('a hostile NPC is tier 2', P.tier({ hostile: true }), 2);
  t.is('a player character is never demoted by a hostile token', P.tier({ isPlayer: true, hostile: true }), 0);

  const list = [
    e('Zed Goon', { hostile: true }), e('Mr. Johnson'), e('Ploder', { isPlayer: true }),
    e('Aaron Ganger', { hostile: true }), e('Bystander'), e('Skid', { isPlayer: true }),
  ];
  t.eq('players, then other NPCs, then hostile NPCs; by name inside each',
    P.order(list).map(x => x.name), ['Ploder', 'Skid', 'Bystander', 'Mr. Johnson', 'Aaron Ganger', 'Zed Goon']);
  t.is('everyone stays in the list', P.order(list).length, list.length);
  t.eq('the input is not reordered in place', list.map(x => x.name),
    ['Zed Goon', 'Mr. Johnson', 'Ploder', 'Aaron Ganger', 'Bystander', 'Skid']);
  t.eq('inside a tier, the ones you own come first',
    P.order([e('Abe'), e('Zoe', { owned: true })]).map(x => x.name), ['Zoe', 'Abe']);
  t.eq('…but ownership never lifts an NPC above a player character',
    P.order([e('Owned NPC', { owned: true }), e('Other PC', { isPlayer: true })]).map(x => x.name), ['Other PC', 'Owned NPC']);
  t.eq('an empty list orders to an empty list', P.order([]), []);

  /* ── Wiring ─────────────────────────────────────────────────────────────────── */
  const heal = read('scripts/SR3EHealing.js');
  const picker = heal.slice(heal.indexOf('static async openPicker'), heal.indexOf('static async open('));
  t.ok('the picker sorts through PatientOrder, not the old owner-first sort',
    /orderedPatients\(/.test(picker) && !/\.sort\(/.test(picker) && /PatientOrder\.order\(/.test(heal));
  t.ok('the order reads the player-character test and the token disposition',
    /game\.sr3e\.SR3EQuery\.isPlayerCharacter\(a\)/.test(heal) && /PatientOrder\.isHostile\(SR3EHealing\.dispositionOf\(a\)\)/.test(heal));
  t.ok('the roster is still world-wide (patientsFor takes every actor, no scene filter)',
    /patientsFor\(game\.user, game\.actors\.contents/.test(picker) && !/sceneFirst/.test(picker));
}
