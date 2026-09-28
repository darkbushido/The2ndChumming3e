/**
 * The 0.6.3 rules check's divergences, fixed on the maintainer's ruling (2026-09-28) — TODO 121.
 *
 *   1. MDF Hacking Pool = Intelligence + ⌊MPCP ÷ 3⌋ (MDF p.11), not ⌊(INT + MPCP) ÷ 3⌋.
 *   2. MDF Matrix Condition Monitor: +1 TN at box 1, +2 at 3, +3 at 6, +4 at 10 (MDF p.12, page image).
 *   3. A rammer's Power drops by Body × successes, floor 2, level unchanged (SR3 p.143, p.147).
 *   4. Hiding, Open terrain +4 (SR3 p.144).
 *   5. Fleeing: +1 per additional vehicle, no cap (SR3 p.142).
 *   6. Orthodox passive alert's +2 to subsystems holds at active alert (SR3 p.211).
 *   7. The manual Dumpshock for an Orthodox decker uses p.226-227 (Stun, level by Security Code).
 *   8. Reboot Node adds no Overwatch on failure (MDF p.19).
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
import { MdfRules } from '../scripts/data/mdf-rules.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'rules-check-063';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  /* 1 ── MDF Hacking Pool ─────────────────────────────────────────────────────── */
  t.is('INT 4, MPCP 8 → 4 + 2 = 6 (the guide\'s Voss)', MdfRules.hackingPool(4, 8), 6);
  t.is('INT 5, MPCP 3 → 5 + 1 = 6', MdfRules.hackingPool(5, 3), 6);
  t.is('MPCP below 3 adds nothing: INT 4, MPCP 2 → 4', MdfRules.hackingPool(4, 2), 4);
  t.is('no deck stats: 0', MdfRules.hackingPool(0, 0), 0);
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the equipped-deck pool uses it', /\? MdfRules\.hackingPool\(attr\.intelligence\?\.value \?\? 0, mpcp\)/.test(actor));
  t.ok('…while the Orthodox pool keeps SR3 core\'s ⌊(INT + MPCP) ÷ 3⌋',
    /orthodoxMccp > 0\s*\n\s*\? Math\.max\(0, Math\.floor\(\(\(attr\.intelligence\?\.value \?\? 0\) \+ orthodoxMccp\) \/ 3\)\)/.test(actor));

  /* 2 ── MDF Matrix Condition Monitor ─────────────────────────────────────────── */
  t.eq('boxes 0…10 → 0,1,1,2,2,2,3,3,3,3,4',
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(b => MdfRules.matrixCMPenalty(b)), [0, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4]);
  t.ok('the deck penalty reads it', /return MdfRules\.matrixCMPenalty\(boxes\);/.test(actor));

  /* 3 ── A rammer's damage ─────────────────────────────────────────────────────── */
  const ram = o => SR3EActor.ramCollision(o);
  t.eq('the book\'s Mach 6: 148 m/turn, 5 successes × Body 3 → 15S, rammer 2S',
    ram({ speedDiff: 148, successes: 5, rammerBody: 3 }), { power: 15, level: 'S', rammerPower: 2 });
  t.eq('the guide\'s Dex: 36 m/turn, 3 × Body 8 → 4M, rammer floored at 2',
    ram({ speedDiff: 36, successes: 3, rammerBody: 8 }), { power: 4, level: 'M', rammerPower: 2 });
  t.eq('a small reduction: 150 m/turn, 1 × Body 4 → 15S, rammer 11S (level unchanged)',
    ram({ speedDiff: 150, successes: 1, rammerBody: 4 }), { power: 15, level: 'S', rammerPower: 11 });
  t.is('Power 1 is not raised to 2 by the floor', ram({ speedDiff: 5, successes: 1, rammerBody: 3 }).rammerPower, 1);
  t.ok('the card uses it and a missed ram does no damage',
    /SR3EActor\.ramCollision\(\{ speedDiff, successes, rammerBody: ctx\.attackerBody \?\? 0 \}\)/.test(actor)
    && /if \(!\(successes > 0\)\) \{/.test(actor) && !/const stageDn = Math\.floor\(successes \/ 2\);/.test(actor));
  const chase = read('scripts/SR3EVehicleChase.js');
  t.ok('the chase carries the rammer\'s Body', /attackerBody:\s+atkVehicle\?\.system\?\.attributes\?\.body\?\.base \?\? 0,/.test(chase));

  /* 4 ── Hiding, Open terrain ─────────────────────────────────────────────────── */
  t.ok('Hiding terrain: Open +4, Normal +2, Restricted 0, Tight −2',
    /const terrainMods = \{ open: 4, normal: 2, restricted: 0, tight: -2 \};/.test(chase) && /\['open',\s+'Open \(\+4\)'\]/.test(chase));

  /* 5 ── Fleeing several vehicles ─────────────────────────────────────────────── */
  t.ok('fleeing counts every additional vehicle', /const flee\s+= Math\.max\(0, \(parseInt\(el\.querySelector\('#act-flee'\)\?\.value\) \|\| 1\) - 1\);/.test(chase)
    && /<input id="act-flee" type="number"/.test(chase) && !/3\+ vehicles \(\+2 TN\)/.test(chase));

  /* 6 ── Orthodox alert ───────────────────────────────────────────────────────── */
  t.eq('+2 at passive and at active, none without an alert',
    ['none', 'passive', 'active'].map(a => SR3EActor.orthoAlertSubsystemMod(a)), [0, 2, 2]);
  t.ok('the System Test uses it', /const alertMod\s+= SR3EActor\.orthoAlertSubsystemMod\(alertLevel\);/.test(actor));

  /* 7 ── Manual Dumpshock, Orthodox ───────────────────────────────────────────── */
  t.ok('the Dumpshock tool branches to the p.226-227 card for an Orthodox decker',
    /if \(ortho\) return this\._postOrthoDumpshock\(result\.code, result\.secValue\);/.test(actor));
  const orthoCard = actor.slice(actor.indexOf('async _postOrthoDumpshock('), actor.indexOf('async _postRiggerDumpshock('));
  t.ok('…which reads orthoDumpShock and is always Stun', /SR3EActor\.orthoDumpShock\(code, value\)/.test(orthoCard) && /isStun:\s+true/.test(orthoCard));
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  const oTab = sheet.slice(sheet.indexOf('_tabMatrixOrthodox(actor, sys) {'), sheet.indexOf('${this._riggerEWBlock(sys)}', sheet.indexOf('_tabMatrixOrthodox(actor, sys) {')));
  t.ok('the Orthodox Matrix tab has a Dumpshock button', /data-action="rollDumpshock"/.test(oTab));

  /* 8 ── Reboot Node ──────────────────────────────────────────────────────────── */
  const host = read('scripts/sheets/SR3EHostSheet.js');
  t.ok('Reboot Node adds no Overwatch on failure', /name:'Reboot Node',[^\n]*overwatchOnFail:false/.test(host));
  t.ok('…while the other CPU prompts do', /name:'Configure Passcodes',[^\n]*overwatchOnFail:true/.test(host));
}
