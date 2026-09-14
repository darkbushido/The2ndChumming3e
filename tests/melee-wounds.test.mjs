/**
 * Wounds raise a fighter's own melee and astral target number — F3 (TESTING.md).
 *
 * The Melee Modifiers Table (SR3 p.123) carries *"Character is wounded — Damage Modifier (see
 * p. 126)"*, and astral combat *"uses the same rules as Melee Combat"* (p.174). `rollPool` folds
 * `woundMod` into a TN, but both boxing cards roll through `_rollWave`, which takes the TN as given
 * — and a comment in SR3ECombatModifiers said rollPool handled it. So until 0.5.2 a fighter with a
 * Serious wound swung and parried at TN 4.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'melee-wounds';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const hurt = woundMod => ({ system: { woundMod } });

export async function run(t) {
  t.is('the F3 repro: 3 Stun boxes (Moderate, −2) → +2 TN', SR3EActor.woundTN(hurt(-2)), 2);
  t.is('Serious (−3) → +3', SR3EActor.woundTN(hurt(-3)), 3);
  t.is('unhurt → +0', SR3EActor.woundTN(hurt(0)), 0);
  t.is('woundMod is NEGATIVE — a stray positive value never LOWERS the TN', SR3EActor.woundTN(hurt(2)), 0);
  t.is('no woundMod at all (a spirit, a vehicle) → +0', SR3EActor.woundTN({ system: {} }), 0);
  t.is('no actor → +0, no throw', SR3EActor.woundTN(null), 0);

  const item = read('scripts/documents/SR3EItem.js');
  t.ok('melee: the attacker\'s wounds are in the attacker\'s TN',
    /const atkWound\s*= game\.sr3e\.SR3EActor\.woundTN\(actor\)/.test(item) && /baseAtkTN = Math\.max\(2, 4 \+[^;]*\+ atkWound\)/.test(item));
  t.ok('…and the defender\'s in the defender\'s — each fighter\'s own, never the other\'s',
    /const defWound\s*= game\.sr3e\.SR3EActor\.woundTN\(targetActor\)/.test(item) && /baseDefTN = Math\.max\(2, 4 \+[^;]*\+ defWound\)/.test(item));
  t.ok('…and the GM window is told why the TNs moved', /woundNote/.test(item) && /baseNote:[^\n]*woundNote/.test(item));

  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('astral: both fighters, as melee (p.174)',
    /const atkTN = 4 \+ \(atkInfo\.defaultTnMod \?\? 0\) \+ SR3EActor\.woundTN\(this\)/.test(actor)
    && /const defTN = 4 \+ \(defInfo\.defaultTnMod \?\? 0\) \+ SR3EActor\.woundTN\(targetActor\)/.test(actor));
  t.ok('the comment that said rollPool handled it is gone', !/Wounded\s+folded in by rollPool/.test(read('scripts/SR3ECombatModifiers.js')));
  t.ok('…and the melee GM window still has no wounded row — it would count them twice',
    !/key:\s*'wounded'/.test(read('scripts/SR3ECombatModifiers.js').split('SR3E_MELEE_MODIFIERS')[1] ?? ''));
}
