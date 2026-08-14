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
}
