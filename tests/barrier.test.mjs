/**
 * Damaging a barrier · SR3 p.119, p.124-125 — the attack kinds, the Barrier Effect Table and when a door opens.
 */
import { readFileSync } from 'node:fs';
const { Barrier } = await import('../scripts/data/barrier.mjs');

export const name = 'barrier';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

export async function run(t) {
  /* ── Multipliers (p.119, p.125) ───────────────────────────────────────────────── */
  t.is('a blast meets twice the rating (p.119)',                        Barrier.multiplier('blast'), 2);
  t.is('a placed Demolitions charge meets the normal rating (p.119)',   Barrier.multiplier('demolitions'), 1);
  t.is('firearm rounds and other ranged attacks meet twice it (p.125)', Barrier.multiplier('ranged'), 2);
  t.is('melee meets twice it — every weapon, breaking through (p.125)', Barrier.multiplier('melee'), 2);
  t.is('combat spells meet twice it (p.125)',                           Barrier.multiplier('combatSpell'), 2);
  t.is('elemental manipulation meets the normal rating (p.125)',        Barrier.multiplier('elemental'), 1);
  t.is('an unknown kind falls back to the normal rating',               Barrier.multiplier('nonsense'), 1);
  t.ok('no blunt/edged split — that is Firing Through, not Breaking Through', !('edged' in Barrier.ATTACKS) && !('blunt' in Barrier.ATTACKS));

  /* ── Barrier Effect Table (p.124) ─────────────────────────────────────────────── */
  // The worked example: a 10S shotgun on an Average Material door (BR 4 → 8 against firearms).
  const shot = Barrier.effect(10, 4, 'ranged');
  t.eq('10 against BR 4 (×2 = 8): one ½ m hole, BR −1', [shot.result, shot.effectiveBR, shot.brReduction, shot.holes], ['breach', 8, 1, 0.5]);
  t.is('…and a bullet does not carry on past the door', shot.remainingPower, null);
  t.is('below half the adjusted rating: no effect', Barrier.effect(3, 4, 'ranged').result, 'no_effect');
  t.eq('half or more, up to the rating: BR −1', [Barrier.effect(4, 4, 'ranged').result, Barrier.effect(8, 4, 'ranged').brReduction], ['damage', 1]);
  const short = Barrier.effect(9, 4, 'ranged');
  t.eq('over the rating but short of one increment still loses 1, not 0', [short.result, short.brReduction], ['damage', 1]);
  t.eq('the same Power against a Demolitions-normal rating breaches wider', [Barrier.effect(10, 4, 'demolitions').brReduction, Barrier.effect(10, 4, 'demolitions').holes], [3, 1.5]);
  t.is('a blast that breaches carries on, less the original rating (p.119)', Barrier.effect(14, 4, 'blast').remainingPower, 10);
  t.is('SR3EActor.computeBarrierEffect is the same rule', /static computeBarrierEffect\([^)]*\) \{\s*return Barrier\.effect\(/.test(read('scripts/documents/SR3EActor.js')), true);

  /* ── Doors (p.124-125) ────────────────────────────────────────────────────────── */
  t.is('a security door has twice its material\'s rating', Barrier.doorRating(4, 'security'), 8);
  t.is('a regular door has its material\'s',              Barrier.doorRating(4, 'regular'), 4);
  t.is('a regular door at 3 of 4 holds',                  Barrier.doorOpens('regular', 4, 3), false);
  t.is('…at 2 of 4 (one-half) it breaks open',            Barrier.doorOpens('regular', 4, 2), true);
  t.is('…an odd rating: 5 opens at 2, not 3',             Barrier.doorOpens('regular', 5, 3), false);
  t.is('a security door at 1 holds',                      Barrier.doorOpens('security', 8, 1), false);
  t.is('…at 0 it breaks open',                            Barrier.doorOpens('security', 8, 0), true);
  t.is('not a door: no verdict',                          Barrier.doorOpens('', 4, 0), null);

  /* ── Wiring ───────────────────────────────────────────────────────────────────── */
  const sr3e = read('scripts/sr3e.js');
  const fn   = sr3e.slice(sr3e.indexOf('async function _openBarrierDamageCalculator'), sr3e.indexOf('async function _openFallingDamageCalculator'));
  t.ok('the tool lists every attack kind from Barrier.ATTACKS', /Object\.entries\(Barrier\.ATTACKS\)/.test(fn));
  t.ok('…and the door kinds from Barrier.DOORS', /Object\.entries\(Barrier\.DOORS\)/.test(fn));
  t.ok('…resolves with the chosen kind', /Barrier\.effect\(res\.power, res\.br, res\.type\)/.test(fn));
  t.ok('…and hands the card the door and its undamaged rating', /door: res\.door, originalBR: res\.originalBR/.test(fn));
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('a Demolitions roll carries the door through to the card', /\{ attack: 'demolitions', door, originalBR \}/.test(actor));
  t.ok('the card says whether the door breaks open', /Barrier\.doorOpens\(door,/.test(actor) && /The door breaks open/.test(actor));
}
