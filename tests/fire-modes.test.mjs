/**
 * Fire modes and recoil — SR3EItem.recoilTN and SR3EItem.fireModeDamage.  · *SR3 p.111, 113*
 *
 * Both rules lived inside closures in the 200-line fire-mode dialog builder, where nothing
 * could reach them and the only way to check a number was to open the dialog and read it.
 * They are now pure and shared: the dialog's preview and the TN actually applied call the
 * same function, so a preview that disagrees with the roll is no longer expressible.
 *
 * ── THE FOUR THINGS MOST LIKELY TO BE GOT WRONG ──────────────────────────────────────
 *
 * 1. **Compensation applies BEFORE the heavy multiplier.** `max(0, rounds − comp) × 2`, not
 *    `max(0, rounds × 2 − comp)`. The two agree only when comp is 0, which is exactly the
 *    case anyone testing by hand tries first.
 * 2. **BF and FA count their OWN rounds; SS and SA do not.** "Each round fired imposes a +1
 *    recoil modifier **for the entire burst**" (p.115). FA was lumped in with SS/SA and
 *    counted only rounds fired BEFORE the burst, which understated recoil by more the
 *    longer a firefight ran — backwards from what the rule exists to do. The Wedge sequence
 *    below is the regression test.
 * 3. **The shotgun multiplier is per-MODE.** Shotguns double in Burst Fire only; a shotgun
 *    firing SA is ×1. Heavy weapons double in every mode.
 * 4. **Tracer is not "FA plus a bonus".** Every third round raises the Damage Level but adds
 *    nothing to Power, so Power gains `rounds − ⌊rounds/3⌋`. The book's worked example is an
 *    SMG 5M firing 10 rounds → 12D. Treating tracer as ordinary FA gives 15D — a quarter
 *    too much, and entirely plausible-looking on the card.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'fire-modes';

const recoil = o => SR3EItem.recoilTN(o);
const dmg    = o => { const r = SR3EItem.fireModeDamage(o); return `${r.power}${r.level}`; };

export async function run(t) {
  // ── The first shot of a phase is free ──────────────────────────────────────
  t.is('SS with nothing fired yet is recoil-free',
    recoil({ mode: 'SS', roundsBefore: 0, totalComp: 0 }), 0);
  t.is('SA with nothing fired yet is recoil-free',
    recoil({ mode: 'SA', roundsBefore: 0, totalComp: 0 }), 0);
  // ⚠ FA is NOT free: its own rounds count. This is the case that was wrong.
  t.is('a first 3-round full-auto burst generates 3 recoil, not 0',
    recoil({ mode: 'FA', roundsBefore: 0, roundsThisShot: 3, totalComp: 0 }), 3);

  // ── Recoil accumulates across the phase ────────────────────────────────────
  t.is('a second SA shot carries +1 from the round already fired',
    recoil({ mode: 'SA', roundsBefore: 1, totalComp: 0 }), 1);
  t.is('after a 3-round burst the next shot carries +3',
    recoil({ mode: 'SA', roundsBefore: 3, totalComp: 0 }), 3);

  // ── BF counts its own three rounds ─────────────────────────────────────────
  t.is('first burst of the phase is +3, not 0 — the burst counts itself',
    recoil({ mode: 'BF', roundsBefore: 0, totalComp: 0 }), 3);
  t.is('second burst is +6',
    recoil({ mode: 'BF', roundsBefore: 3, totalComp: 0 }), 6);
  t.is('third burst is +9',
    recoil({ mode: 'BF', roundsBefore: 6, totalComp: 0 }), 9);

  // ── The book's worked examples, verbatim ───────────────────────────────────
  //
  // WEDGE AND THE HALLOWEENERS (p.115). AK-97, gas vent 3 + shock pad 1 = 4 comp,
  // three full-auto bursts of 3, 3 and 4 rounds. The book states the recoil modifier at
  // each step, which pins both the "own rounds count" rule and the running total.
  t.is('Wedge burst 1 — 3 rounds, fully compensated by 4',
    recoil({ mode: 'FA', roundsBefore: 0, roundsThisShot: 3, totalComp: 4 }), 0);
  t.is('Wedge burst 2 — 6 rounds fired, comp 4, book says +2',
    recoil({ mode: 'FA', roundsBefore: 3, roundsThisShot: 3, totalComp: 4 }), 2);
  t.is('Wedge burst 3 — 10 rounds fired, comp 4, book says +6',
    recoil({ mode: 'FA', roundsBefore: 6, roundsThisShot: 4, totalComp: 4 }), 6);

  // THE MEDIUM MACHINE GUN (p.111): "fires 10 rounds and has 6 points of recoil
  // compensation, its final recoil modifier would be +8" — (10 − 6) × 2. This single
  // example settles the comp-before-double ordering on its own.
  t.is('MMG: 10 rounds, 6 comp, heavy → +8 exactly as printed',
    recoil({ mode: 'FA', roundsBefore: 0, roundsThisShot: 10, totalComp: 6, isHeavy: true }), 8);

  // ── Compensation ───────────────────────────────────────────────────────────
  t.is('compensation cancels recoil one for one',
    recoil({ mode: 'BF', roundsBefore: 0, totalComp: 2 }), 1);
  t.is('compensation never drives recoil negative',
    recoil({ mode: 'SA', roundsBefore: 1, totalComp: 6 }), 0);
  t.is('surplus compensation does not bank against the next shot',
    recoil({ mode: 'BF', roundsBefore: 3, totalComp: 10 }), 0);

  // ── Heavy weapons: comp FIRST, then double ─────────────────────────────────
  // THE ORDERING TEST. With comp 2 and 6 uncompensated rounds:
  //   correct    → max(0, 6 − 2) × 2 = 8
  //   comp after → max(0, 6 × 2 − 2) = 10
  // Both are 12 when comp is 0, so only a case with compensation can tell them apart.
  t.is('heavy: compensation is subtracted BEFORE doubling',
    recoil({ mode: 'SA', roundsBefore: 6, totalComp: 2, isHeavy: true }), 8);
  t.is('heavy with no compensation doubles the raw count',
    recoil({ mode: 'SA', roundsBefore: 6, totalComp: 0, isHeavy: true }), 12);
  t.is('heavy doubles a burst too, own rounds included',
    recoil({ mode: 'BF', roundsBefore: 0, totalComp: 0, isHeavy: true }), 6);
  t.is('a fully compensated heavy weapon still has no recoil to double',
    recoil({ mode: 'SA', roundsBefore: 2, totalComp: 2, isHeavy: true }), 0);

  // ── Shotguns double in BF ONLY ─────────────────────────────────────────────
  t.is('shotgun in BF doubles (3 own rounds → 6)',
    recoil({ mode: 'BF', roundsBefore: 0, totalComp: 0, isShotgun: true }), 6);
  t.is('shotgun in SA does NOT double',
    recoil({ mode: 'SA', roundsBefore: 4, totalComp: 0, isShotgun: true }), 4);
  t.is('shotgun in SS does NOT double',
    recoil({ mode: 'SS', roundsBefore: 4, totalComp: 0, isShotgun: true }), 4);
  t.is('a heavy shotgun doubles once, not twice',
    recoil({ mode: 'BF', roundsBefore: 0, totalComp: 0, isHeavy: true, isShotgun: true }), 6);

  // ── Damage: SS and SA change nothing ───────────────────────────────────────
  t.is('SS leaves the damage code alone', dmg({ power: 9, level: 'M', mode: 'SS' }), '9M');
  t.is('SA leaves the damage code alone', dmg({ power: 9, level: 'M', mode: 'SA' }), '9M');

  // ── Burst Fire: Power +3, Level +1 ─────────────────────────────────────────
  t.is('BF is Power +3 and one level up', dmg({ power: 9, level: 'M', mode: 'BF' }), '12S');
  t.is('BF from Light reaches Moderate', dmg({ power: 4, level: 'L', mode: 'BF' }), '7M');
  t.is('BF from Serious reaches Deadly',  dmg({ power: 6, level: 'S', mode: 'BF' }), '9D');
  t.is('BF caps the LEVEL at Deadly but still adds Power',
    dmg({ power: 6, level: 'D', mode: 'BF' }), '9D');

  // ── Full Auto: Power +rounds, Level +⌊rounds/3⌋ ────────────────────────────
  t.is('FA 3 rounds: +3 Power, +1 level',  dmg({ power: 5, level: 'M', mode: 'FA', rounds: 3 }),  '8S');
  t.is('FA 6 rounds: +6 Power, +2 levels', dmg({ power: 5, level: 'M', mode: 'FA', rounds: 6 }),  '11D');
  t.is('FA 5 rounds rounds the level DOWN to +1',
    dmg({ power: 5, level: 'M', mode: 'FA', rounds: 5 }), '10S');
  t.is('FA 10 rounds is capped at Deadly, Power still +10',
    dmg({ power: 5, level: 'M', mode: 'FA', rounds: 10 }), '15D');

  // Wedge's AK-97 is 8M: a 3-round burst does 11S and a 4-round burst 12S (p.115).
  // The 4-round case proves the level uses whole three-round groups — 12S, not 12D.
  t.is("AK-97 8M, 3-round full-auto burst → 11S (book)",
    dmg({ power: 8, level: 'M', mode: 'FA', rounds: 3 }), '11S');
  t.is("AK-97 8M, 4-round full-auto burst → 12S (book) — level rounds DOWN",
    dmg({ power: 8, level: 'M', mode: 'FA', rounds: 4 }), '12S');

  // "a 5M weapon firing in burst-fire mode would have a Power Rating of 8 and a Damage
  // Level of S" (p.115) — the burst rule stated with its own example.
  t.is("5M in burst fire → 8S, the book's own example",
    dmg({ power: 5, level: 'M', mode: 'BF' }), '8S');

  // ── Tracer: the book's own worked example ──────────────────────────────────
  t.is("tracer SMG 5M firing 10 rounds is 12D — the book's example, not 15D",
    dmg({ power: 5, level: 'M', mode: 'FA', rounds: 10, isTracer: true }), '12D');
  t.is('tracer 3 rounds adds 2 Power, not 3',
    dmg({ power: 5, level: 'M', mode: 'FA', rounds: 3, isTracer: true }), '7S');
  t.is('tracer only differs in FA — a burst is unaffected',
    dmg({ power: 9, level: 'M', mode: 'BF', isTracer: true }), '12S');

  // ── Shape ──────────────────────────────────────────────────────────────────
  t.is('an unknown level falls back to Moderate rather than throwing',
    dmg({ power: 5, level: '?', mode: 'BF' }), '8S');
  t.is('FA with 0 rounds changes nothing',
    dmg({ power: 5, level: 'M', mode: 'FA', rounds: 0 }), '5M');
}
