/**
 * Permanent Essence loss — `SR3EActor.essenceValue` and `installedEssenceCost`.
 *
 * ── THE BUG ──────────────────────────────────────────────────────────────────────────
 *
 * Essence was recomputed every `prepareDerivedData` from the cyberware an actor was
 * CURRENTLY holding. Delete the item, get the Essence back.
 *
 * ⚠ The rule is in **Man & Machine p.147**, not core — core only says the cost applies
 * "when the cyberware is installed" (p.60) and never addresses removal:
 *
 *   "Cyberware that is removed does not restore the character's lost Essence."
 *
 * The "Essence hole" that lets a later implant reuse the gap is a SURGERY OPTION at +2
 * Threshold (Essence Slot, M&M p.150), not the default — which is exactly why the mark
 * accumulates rather than tracking a maximum. See the e2e spec.
 *
 * It was not a cosmetic number either. Two values hang off Essence:
 *
 *   Bio Index capacity = essence + 3
 *   effective Magic    = essence − (totalBioIndex / 2)
 *
 * so a refund silently inflated a character's Magic and their bioware headroom. Install,
 * uninstall, and come out ahead of where you started.
 *
 * ── THE RULE ─────────────────────────────────────────────────────────────────────────
 *
 * `essence.lost` is the persisted loss, and it is NULLABLE — the null carries meaning:
 *
 *   • `null`  — nothing recorded. Fall back to installed cyberware. This is how actors
 *     saved before the field existed stay correct with no migration script.
 *   • a NUMBER — an authoritative statement, including 0. It wins outright and is NOT
 *     max'd against installed hardware.
 *
 * ⚠ That second rule is what makes a GM correction stick. The first design took
 * `max(lost, installed)` always, which silently blocked the one case a GM most needs: a
 * player installs the wrong 2.0 of chrome, it is removed, and the corrected Essence cannot
 * be given back because the number being corrected TO sits below what the hardware implied.
 * Permanence is about removal not refunding automatically — not about overruling the GM.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'essence';

const cyber = cost => ({ type: 'cyberware', system: { essenceCost: cost } });
const bio   = cost => ({ type: 'bioware',   system: { essenceCost: cost } });
const cost  = items => SR3EActor.installedEssenceCost(items);
const ess   = o => SR3EActor.essenceValue(o);

export async function run(t) {
  // ── The sheet's warning states (TODO 103) — SR3 p.55 ────────────────────────
  // "Essence cannot be lowered to 0 or less, though it may be less than 1. An Essence of 0
  // means you're dead." Both boundaries are exact: 1 is fine, 0 is dead, not merely low.
  const st = v => SR3EActor.essenceState(v);
  t.is('Essence 6 is ok',                        st(6), 'ok');
  t.is('exactly 1 is ok — "less than 1" is the line', st(1), 'ok');
  t.is('0.99 is low',                            st(0.99), 'low');
  t.is('0.01 is still only low (legal)',         st(0.01), 'low');
  t.is('exactly 0 is DEAD, not low (p.55)',      st(0), 'dead');
  t.is('below 0 is dead (a cyberzombie, M&M p.54)', st(-0.5), 'dead');
  t.is('a numeric string reads as its number',   st('0.5'), 'low');
  t.is('a missing value is not a death warning', st(undefined), 'ok');

  // ── What counts toward the cost ────────────────────────────────────────────
  t.is('no items costs nothing', cost([]), 0);
  t.is('undefined item list does not throw', cost(undefined), 0);
  t.is('cyberware sums', cost([cyber(0.5), cyber(0.2), cyber(1)]), 1.7);
  t.is('BIOWARE is excluded — M&M charges it against the Bio Index, not Essence',
    cost([cyber(1), bio(2)]), 1);
  t.is('a missing cost reads as 0 rather than NaN', cost([{ type: 'cyberware', system: {} }]), 0);
  t.is('a junk cost is ignored, not propagated as NaN',
    cost([cyber(1), { type: 'cyberware', system: { essenceCost: 'x' } }]), 1);
  t.is('floating point is rounded to 2dp, not 0.30000000000000004',
    cost([cyber(0.1), cyber(0.2)]), 0.3);

  // ── The derivation ────────────────────────────────────────────────────────
  t.is('a clean character is Essence 6', ess({ base: 6, lost: null, installed: 0 }), 6);
  t.is('installed cyberware shows immediately, before anything is persisted',
    ess({ base: 6, lost: null, installed: 1.5 }), 4.5);
  t.is('a recorded mark applies with nothing installed — the loss is permanent',
    ess({ base: 6, lost: 1.5, installed: 0 }), 4.5);

  // ── THE ASSERTION THIS FILE EXISTS FOR ────────────────────────────────────
  // Install 2.0, then remove all of it. Before the fix this returned 6.
  t.is('removing every implant does NOT refund the Essence',
    ess({ base: 6, lost: 2, installed: 0 }), 4);
  t.is('removing SOME of it keeps the full mark',
    ess({ base: 6, lost: 2, installed: 0.5 }), 4);
  // ⚠ Installing more chrome does NOT deepen the loss here — that is the install hook's job
  // (`_ratchetEssenceOnInstall` writes `max(lost, installedBefore) + cost`). The derivation
  // trusts the recorded number, because trusting it is the whole point of the override.
  // Having BOTH ratchet would double-count a GM who is mid-correction.
  t.is('a recorded loss is trusted even when more hardware is fitted than it accounts for',
    ess({ base: 6, lost: 2, installed: 3.25 }), 4);

  // ── Migration: actors saved before `lost` existed ─────────────────────────
  // They all carry lost: 0 with chrome fitted. Reading from `installed` alone keeps them
  // correct on load, which is why this needed no migration script.
  t.is('a pre-fix actor with 2.1 of cyberware and no mark still reads 3.9',
    ess({ base: 6, lost: null, installed: 2.1 }), 3.9);

  // ── THE GM OVERRIDE ───────────────────────────────────────────────────────
  // An explicit number wins outright. These are the mistake-correction cases, and every
  // one of them returned the WRONG answer under the original max(lost, installed).
  t.is('an explicit loss BELOW the installed hardware is honoured',
    ess({ base: 6, lost: 1, installed: 3 }), 5);
  t.is('an explicit 0 means "this character has lost nothing", even with chrome fitted',
    ess({ base: 6, lost: 0, installed: 3 }), 6);
  t.is('and null is NOT the same as 0 — it means "nobody has said", so follow the hardware',
    ess({ base: 6, lost: null, installed: 3 }), 3);
  t.is('undefined behaves as null, for actors whose field has never been touched',
    ess({ base: 6, installed: 3 }), 3);

  // ── Floors and odd bases ──────────────────────────────────────────────────
  // SR3 has no negative Essence, and the two derived values above would go strange rather
  // than merely low if it went under.
  t.is('Essence floors at 0 rather than going negative',
    ess({ base: 6, lost: 9, installed: 0 }), 0);
  t.is('a non-6 base is honoured — houserules and odd metatypes',
    ess({ base: 5, lost: 1, installed: 0 }), 4);
  t.is('called with nothing at all, a fresh character is 6', ess(), 6);
  t.is('a junk base falls back to 6 rather than producing NaN',
    ess({ base: 'x', lost: 1 }), 5);

  // ── Precision ─────────────────────────────────────────────────────────────
  // Cyberware costs are things like 0.2 and 0.35; naive subtraction produces 5.699999…
  // on a sheet, which reads as a bug even though the maths is right.
  t.is('the result is rounded to 2dp', ess({ base: 6, lost: 0.3, installed: 0 }), 5.7);
  t.is('and stays exact across several odd costs',
    ess({ base: 6, lost: cost([cyber(0.2), cyber(0.35), cyber(0.15)]) }), 5.3);

  /* ════════════════════════════════════════════════════════════════════════════
   *  Cyberware grades · M&M p.45, Cyberware Grades Table — TODO 86
   *
   *   | Grade | Essence Cost Reduction | Cost | Availability |
   *   | Alpha | −20% (× .8) | 2 | Standard |
   *   | Beta  | −40% (× .6) | 4 | +5 / × 1.5 |
   *   | Delta | −50% (× .5) | 8 | +9 / × 3 |
   *   | Used  | by grade    | .5 | Standard |
   *
   *   "Reduce the Base Essence Cost by the percentage listed… Round all numbers up. Essence
   *    Cost may never be reduced below .01 in this manner."
   * ════════════════════════════════════════════════════════════════════════════ */
  const gec = SR3EActor.gradedEssenceCost;

  t.is('standard grade costs full Essence',        gec(1, 'Standard'), 1);
  t.is('alpha is ×0.8',                            gec(1, 'Alpha'), 0.8);
  t.is('beta is ×0.6',                             gec(1, 'Beta'), 0.6);
  t.is('delta is ×0.5',                            gec(1, 'Delta'), 0.5);

  // The books' own spellings, alongside the shipped data's.
  t.is('"alphaware" reads the same as "Alpha"',    gec(1, 'alphaware'), 0.8);
  t.is('"basic" reads as standard',                gec(1, 'basic'), 1);
  t.is('matching is case-insensitive',             gec(1, 'DELTAWARE'), 0.5);

  /* ⚠ **Rounded UP, to two decimals, PER ITEM.** Essence is tracked to 2dp everywhere, and
   * rounding the total instead of each part would let a character with several cheap alphaware
   * implants come out below what the book charges. */
  t.is('0.3 alpha rounds up to 0.24',   gec(0.3, 'Alpha'), 0.24);
  t.is('0.25 beta rounds up to 0.15',   gec(0.25, 'Beta'), 0.15);
  t.is('0.25 delta rounds UP to 0.13, not down to 0.12', gec(0.25, 'Delta'), 0.13);
  t.is('0.35 delta rounds UP to 0.18',  gec(0.35, 'Delta'), 0.18);

  /* ⚠ The .01 floor applies to the REDUCTION. A base cost of 0 is an implant with no Essence
   * cost — not one reduced to nothing — and must stay 0, or every cosmetic mod starts charging. */
  t.is('a reduction cannot go below .01', gec(0.01, 'Delta'), 0.01);
  t.is('…but a FREE implant stays free',  gec(0, 'Delta'), 0);
  t.is('…and so does a free standard one', gec(0, 'Standard'), 0);

  /* ⚠ "Used" halves the PRICE and leaves Essence "by grade", so it is not a grade of its own.
   * The item sheet offers it as a pickable option, so both forms must behave. */
  t.is('"Used" alone reads as basic — full Essence', gec(1, 'Used'), 1);
  t.is('"Used Alpha" reads as alpha',                gec(1, 'Used Alpha'), 0.8);
  // M&M p.11: "Used deltaware … installed as if it were betaware" (TODO 174).
  t.is('"Used Delta" installs as BETA — ×.6, not ×.5', gec(1, 'Used Delta'), 0.6);
  t.is('…"Used Deltaware" too',                      gec(2, 'Used Deltaware'), 1.2);
  t.is('…and new delta is still ×.5',                gec(1, 'Delta'), 0.5);

  /* ⚠ An unknown grade costs FULL Essence — the conservative direction. Bioware's Cultured and
   * Exotic land here, as would a GM's typo. Defaulting to a discount would hand back Essence
   * nobody paid for, and Essence is PERMANENT, so an over-refund is far worse than a
   * over-charge. */
  t.is('bioware "Cultured" is not a cyberware grade', gec(1, 'Cultured'), 1);
  t.is('"Exotic" likewise',                           gec(1, 'Exotic'), 1);
  t.is('a typo costs full Essence',                   gec(1, 'Alfaware'), 1);
  t.is('a missing grade costs full Essence',          gec(1, undefined), 1);
  t.is('an empty grade costs full Essence',           gec(1, ''), 1);

  /* ==== and it reaches the total ==== */
  // ⚠ Named `graded` rather than `cyber` — this file already declares a `cyber` helper above,
  // and shadowing it in the same scope is a temporal-dead-zone error, not a shadow.
  const graded = (essenceCost, grade) => ({ type: 'cyberware', system: { essenceCost, grade } });

  t.is('a standard implant costs its face value',
    SR3EActor.installedEssenceCost([graded(2, 'Standard')]), 2);
  t.is('the same implant in alpha costs 1.6',
    SR3EActor.installedEssenceCost([graded(2, 'Alpha')]), 1.6);

  /* Corp Bodyguard's shipped stub is 4.24, which is exactly 5.3 × 0.8 — the generator's author
   * applied the alphaware discount by hand. With grades implemented, the parts can carry the
   * book's standard costs and arrive at the same place. */
  t.is("the Little Black Book's 5.3 of alphaware costs 4.24",
    SR3EActor.installedEssenceCost([graded(5.3, 'Alpha')]), 4.24);

  /* ⚠ **Bioware is excluded from Essence entirely** — M&M charges it against the Bio Index. Its
   * Cultured/Exotic grades therefore never reach this arithmetic at all. */
  t.is('bioware contributes no Essence whatever its grade',
    SR3EActor.installedEssenceCost([{ type: 'bioware', system: { essenceCost: 2, grade: 'Cultured' } }]), 0);

  /* ==== TODO 101 — three writers, one answer: grade the BASE exactly once ====
   * Found in the TODO 93 run: an imported alpha CyGun Shotgun (base 1.10) read 0.71, not 0.88 —
   * the importer stored the generator's already-graded 0.88 and the total graded it again. */
  const item = system => ({ type: 'cyberware', system });

  // Mr. Johnson's contacts: essenceCost IS the base, no base field (TODO 86's shape).
  t.is('contacts shape: base in essenceCost, graded once',
    SR3EActor.installedEssenceCost([item({ essenceCost: 0.2, grade: 'Alphaware' })]), 0.16);
  // The item sheet's grade dropdown and the example Mercenary: GRADED in essenceCost, base kept.
  t.is('sheet shape: graded 0.4 with base 0.5 counts 0.4, not 0.32',
    SR3EActor.installedEssenceCost([item({ essenceCost: 0.4, essenceCostBase: 0.5, grade: 'Alpha' })]), 0.4);
  // The importer, now: graded + base, via importedCyberwareCosts.
  const imp = SR3EActor.importedCyberwareCosts({ essCost: 0.8800000000000001, cost: 2400, grade: 'alpha' });
  t.is('import: the CyGun Shotgun keeps its graded 0.88', imp.essenceCost, 0.88);
  t.is('…records its base 1.10',                          imp.essenceCostBase, 1.1);
  t.is('…and its base cost 1200 (×2 for alpha)',          imp.costBase, 1200);
  t.is('…with the sheet\'s grade name',                   imp.grade, 'Alpha');
  t.is('…so the installed total is 0.88 — Essence 5.12, as the generator says',
    SR3EActor.installedEssenceCost([item(imp)]), 0.88);
  t.is('a standard import records no base',
    SR3EActor.importedCyberwareCosts({ essCost: 0.5, cost: 1000, grade: '' }).essenceCostBase, 0);
  t.is('beta: 0.6 ×, 4 × cost',
    JSON.stringify((({ essenceCostBase, costBase }) => ({ essenceCostBase, costBase }))(
      SR3EActor.importedCyberwareCosts({ essCost: 0.3, cost: 4000, grade: 'Beta' }))),
    JSON.stringify({ essenceCostBase: 0.5, costBase: 1000 }));
  t.is('baseEssenceCost prefers a stored base', SR3EActor.baseEssenceCost(item({ essenceCost: 0.4, essenceCostBase: 0.5 })), 0.5);
  t.is('…and falls back to essenceCost',        SR3EActor.baseEssenceCost(item({ essenceCost: 0.2 })), 0.2);

  /* ── The Essence controls are the GM's (the maintainer, 2026-09-15) ────────────────────
   * All three — the Essence box, the "lost" box and ↺ — can LOWER the recorded loss, which is the
   * refund p.147 forbids. A player could press ↺ and get back the Essence removed chrome cost. */
  const nested = () => ({ system: { attributes: { essence: { value: 6, lost: null }, body: { base: 5 } } } });
  const p = nested();
  t.ok('a player\'s nested Essence write is dropped', SR3EActor.stripPlayerEssenceWrites(p, false));
  t.eq('…both fields go, the rest of the update stays', p, { system: { attributes: { essence: {}, body: { base: 5 } } } });
  const flat = { 'system.attributes.essence.lost': null, 'system.nuyen': 50 };
  SR3EActor.stripPlayerEssenceWrites(flat, false);
  t.eq('…and the flattened spelling (↺ writes that)', flat, { 'system.nuyen': 50 });
  const g = nested();
  t.ok('a GM\'s write is left alone', !SR3EActor.stripPlayerEssenceWrites(g, true) && g.system.attributes.essence.lost === null);
  t.ok('an update that does not touch Essence reports nothing', !SR3EActor.stripPlayerEssenceWrites({ 'system.nuyen': 5 }, false));

  const { readFileSync } = await import('node:fs');
  const actorSrc = readFileSync(new URL('../scripts/documents/SR3EActor.js', import.meta.url), 'utf8');
  const sheetSrc = readFileSync(new URL('../scripts/sheets/SR3EActorSheet.js', import.meta.url), 'utf8');
  // ⚠ The window after the strip is wide because _preUpdate does more than Essence now (the
  //   TODO 79 ledger sits between them). What this pins is the ORDER — the strip must come
  //   first, or a player's write is converted into a `lost` before it is dropped.
  t.ok('_preUpdate strips a non-GM\'s Essence write BEFORE converting it',
    /async _preUpdate\(changed, options, user\) \{[\s\S]{0,700}stripPlayerEssenceWrites\(changed, user\?\.isGM[\s\S]{0,900}essence\.value'\)/.test(actorSrc));
  t.ok('the sheet gives both boxes a name (so a value) only for the GM, disabled otherwise',
    /\$\{essGM \? 'name="system\.attributes\.essence\.value"' : 'disabled'\}/.test(sheetSrc)
    && /\$\{essGM \? 'name="system\.attributes\.essence\.lost"' : 'disabled'\}/.test(sheetSrc));
  t.ok('↺ is not rendered for players', /essLost === null \|\| !essGM \? '' : `<a data-action="essenceRecalc"/.test(sheetSrc));
  t.ok('…and its handler refuses them anyway', /_onEssenceRecalc[\s\S]{0,200}if \(!game\.user\.isGM\)/.test(sheetSrc));
}
