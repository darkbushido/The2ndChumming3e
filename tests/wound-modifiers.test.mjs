/**
 * The Injury Modifier reaches every test that rolls outside `rollPool` — 2026-09-14, on main.
 *
 * > "The Injury Modifier is a universal target number modifier that applies to nearly all Success
 * > Tests the injured character may attempt, except those for resisting or avoiding damage."
 * > — SR3 p.125
 *
 * `rollPool` folds `woundMod` in; everything that rolls through `_rollWave` has to add it to its
 * own TN, and F3 (melee, astral) and the grenade throw were the first found without it. These are
 * the rest: the contested roll (both sides), cybercombat (the attacker — the defence avoids damage),
 * the MIJI contest (both riggers) and the single-roller EW tests, and the Orthodox System Test and
 * Orthodox attack (the decker), the Knockdown Test (the maintainer's ruling, though its threshold
 * also scales with the wound, p.124), and vehicle weapons, which took the gunner's wounds off the
 * DICE POOL. Deliberately NOT added: Missile Parry — it avoids damage.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'wound-modifiers';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/** A decker with Cybercombat 4 and the given wound modifier. */
const decker = woundMod => {
  const skill = { type: 'skill', name: 'Cybercombat', system: { rating: 4 } };
  return {
    type: 'character', name: 'Decker', id: 'd1',
    system: { woundMod, derived: { availableHackingPool: 3 }, equippedCyberdeck: '', matrixUserMode: 'VR-Cold' },
    items: { find: fn => [skill].find(fn), filter: () => [], get: () => null },
    _matrixTNPenalty: () => 0,
  };
};

export async function run(t) {
  globalThis.game.sr3e = { SR3E, SR3EActor, SR3EItem };

  /* ── Cybercombat, behaviourally ─────────────────────────────────────────────── */
  const atk = await SR3EActor._buildCCParticipant(decker(-2), { attacking: true });
  const def = await SR3EActor._buildCCParticipant(decker(-2));
  const fit = await SR3EActor._buildCCParticipant(decker(0), { attacking: true });
  t.is('an unhurt decker attacks at TN 4', fit.tn, 4);
  t.is('a Moderately wounded decker attacks at 6 — the attack is a test they attempt', atk.tn, 6);
  t.is('…and defends at 4 — the defence avoids damage, which p.125 excludes', def.tn, 4);

  /* ── The rest, where they are built ─────────────────────────────────────────── */
  const actor = read('scripts/documents/SR3EActor.js');
  const miji  = read('scripts/SR3EMIJI.js');

  t.is('both cybercombat attack sites say they are attacking',
    (actor.match(/_buildCCParticipant\(this, \{ attacking: true \}\)/g) ?? []).length, 2);
  t.ok('…and the defender sites do not', !/_buildCCParticipant\(defActor, \{ attacking: true \}\)/.test(actor));

  t.ok('contested: the initiator\'s TN starts at 4 + their wounds',
    /id="\$\{tnId\}" value="\$\{4 \+ SR3EActor\.woundTN\(game\.actors\.get\(defaultAtkId\)\)/.test(actor));
  t.ok('…and follows the actor picked', /#atk-tn'\)\.value = 4 \+ SR3EActor\.woundTN\((game\.actors\.get\(e\.target\.value\)|picked)\)/.test(actor));
  t.ok('…and the opponent\'s corner starts at 4 + theirs', /oppTN:\s+4 \+ SR3EActor\.woundTN\(game\.actors\.get\(oppActId\)\)/.test(actor));

  t.ok('Orthodox System Test: the decker\'s wounds in their TN', /deckerTN\s+= Math\.max\(2, subR \+ alertMod - utilMod \+ SR3EActor\.woundTN\(this\)/.test(actor));
  t.ok('Orthodox attack: the decker\'s wounds in the attack TN', /const tnIntruding = \(SR3EActor\._orthoCCTN\.intruding\[secCode\] \?\? 4\) \+ SR3EActor\.woundTN\(this\)/.test(actor));

  t.ok('MIJI: the intruder\'s wounds in the intruder\'s TN', /const intTN = Math\.max\(2, \(defRigger\?\.system\?\.ew\?\.deckRating \?\? 4\) \+ woundTN\(intRigger\)\)/.test(miji));
  t.ok('…the defender\'s in the defender\'s', /: \(intRigger\?\.system\?\.ew\?\.protocolModule \?\? 0\)\) \+ woundTN\(defRigger\)\)/.test(miji));
  for (const [what, re] of [
    ['infiltration', /6 - \(proto - deck\) \+ this\._woundTN\(intRigger\)/],
    ['detect infiltration', /\(inf\.intrusionFactor \?\? 0\) \+ this\._woundTN\(defRigger\)/],
    ['ECCM repair', /attackerStat \+ 3 \+ this\._woundTN\(rigger\)/],
    ['reduce footprint', /fp \+ 4 \+ this\._woundTN\(rigger\)/],
    ['IVIS', /id="ivis-tn" value="\$\{5 \+ wound\}"/],
  ]) t.ok(`EW ${what}: the rigger's wounds in the TN`, re.test(miji));

  t.ok('Missile Parry is left alone — it avoids damage (p.125)', !/missileParryTN\([^)]*woundTN/.test(actor));

  /* ── Knockdown — the maintainer's ruling, 2026-09-14: applied ────────────────── */
  t.ok('Knockdown: the target\'s wounds in the Body Test\'s TN',
    /const kdWound\s+= SR3EActor\.woundTN\(target\)/.test(actor) && /knockdownTNMod\) \|\| 0\)\) \+ kdWound\b/.test(actor));

  /* ── Vehicle weapons: the gunner's wounds are a TN, not lost dice ─────────────── */
  const item = read('scripts/documents/SR3EItem.js');
  const vw   = item.slice(item.indexOf('async rollVehicleWeapon('), item.indexOf('return actor.rollPool(finalPool'));
  t.ok('the gunner\'s wounds come from the derived woundMod (Pain Resistance, compensators, Pain Editor)',
    /pilotWoundMod = game\.sr3e\.SR3EActor\.woundTN\(pilotActor\)/.test(vw));
  t.ok('…they no longer come off the dice pool', !/pool \+= pilotWoundMod/.test(vw));
  t.ok('…nor from the raw boxes', !/_trackMod\(stunVal\)/.test(vw));
  t.ok('…they go on the TN, and the card says so', /const tn\s+= weaponOpts\.tn \+ gunneryDefTnMod \+ pilotWoundMod/.test(vw)
    && /wounded \+\$\{pilotWoundMod\} TN/.test(vw));
}
