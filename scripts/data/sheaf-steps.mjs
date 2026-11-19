/**
 * The Defragged Security Sheaf's ten rows — MDF p.23-24 · TODO 128.
 *
 * > "The security sheaf has 10 Trigger Steps, with the final step resulting in Convergence." (MDF p.24)
 * and the book's own TYPICAL HOST SECURITY SHEAF (p.23) lists **TS 1-9 and a tenth row, Convergence**: "Crash icon (with
 * resulting Dumpshock). Deploy security team to user's GPS coordinates." The Overwatch track has ten boxes to match, the
 * tenth marked C. Until this module the host sheet seeded nine plain rows and the tenth was `TS 10`, so nothing said
 * that box was Convergence.
 *
 * Pure — no Foundry — so the rows and the migration are tested without one. The row's text is a PARAPHRASE of the
 * book's Convergence list (p.24: "any or all of the following at the discretion of the offended system"); the GM edits it.
 */

export const CONVERGENCE_LABEL = 'Convergence';

/** What Convergence can bring — MDF p.24, "at the discretion of the offended system". Paraphrased; editable on the sheet. */
export const CONVERGENCE_TEXT =
  'Convergence: the user is dumped from the Matrix and suffers Dumpshock (MDF p.27); the Grid Overwatch Division receives '
  + 'their icon, persona name, deck profile, jackpoint location and a summary of the session; a security team may be sent to those coordinates.';

const blankStep = (n, extra = {}) => ({ step: n, label: `TS ${n}`, triggered: false, hidden: false, ic: [], description: '', ...extra });

/** The tenth row. `convergence: true` is what the sheet and the Overwatch hand-off read. */
export function convergenceStep() {
  return blankStep(10, { label: CONVERGENCE_LABEL, convergence: true, description: CONVERGENCE_TEXT });
}

/** TS 1-9 plus Convergence — what a new Defragged host is seeded with. */
export function defaultSteps() {
  return [...Array.from({ length: 9 }, (_, i) => blankStep(i + 1)), SheafSteps.convergenceStep()];
}

export const isConvergence = step => !!step && (step.convergence === true || step.step === 10);

/** An Orthodox host keeps `{tally, event}` rows in the same field; those are not a Defragged sheaf. */
const isOrthodoxRows = steps => steps.some(s => s && ('tally' in s || 'event' in s));

/**
 * `update()` delta that brings an existing Defragged host's sheaf to ten rows, or null.
 *
 * ⚠ **This is a fill-blanks fix, not an overwrite:** it appends the Convergence row only when a host has exactly rows
 * 1-9 and no tenth, and it relabels a tenth row only while it is still the untouched `TS 10` (no text, no IC, not
 * triggered, not hidden) — what the sheet's own "Init sheaf" button made. A row the GM filled in is theirs. An empty
 * sheaf (never initialised) and an Orthodox host are left alone. Idempotent.
 */
export function convergenceDelta(steps) {
  if (!Array.isArray(steps) || !steps.length || isOrthodoxRows(steps)) return null;
  const numbered = steps.every(s => Number.isInteger(s?.step));
  if (!numbered) return null;
  const tenth = steps.find(s => s.step === 10);
  if (!tenth) {
    const nine = steps.length === 9 && steps.every((s, i) => s.step === i + 1);
    return nine ? { 'system.triggerSteps': [...steps, SheafSteps.convergenceStep()] } : null;
  }
  const untouched = tenth.label === 'TS 10' && !tenth.description && !(tenth.ic?.length) && !tenth.triggered && !tenth.hidden && !tenth.convergence;
  if (!untouched) return null;
  const next = steps.map(s => (s === tenth ? { ...s, label: CONVERGENCE_LABEL, convergence: true, description: CONVERGENCE_TEXT } : s));
  return { 'system.triggerSteps': next };
}

/** Exported as one object so the mutant harness can reinstate known-wrong rules (tests/mutants.mjs). */
export const SheafSteps = { convergenceStep, defaultSteps, isConvergence, convergenceDelta };
