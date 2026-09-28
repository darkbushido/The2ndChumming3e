/**
 * Matrix Defragged v2 — pure rules found wrong by the 0.6.3 rules check (TODO 121).
 *
 * **Hacking Pool · MDF p.11:** *"Intelligence + (MPCP Rating /3 rounded down)"* — the whole Intelligence,
 * plus a third of the MPCP. ⚠ Not SR3 core's ⌊(Intelligence + MPCP) ÷ 3⌋ (SR3 p.207), which the Orthodox
 * ruleset keeps; the Defragged pool used it until 0.6.3, giving INT 4 / MPCP 8 four dice instead of six.
 *
 * **Matrix Condition Monitor · MDF p.12:** the table (a graphic; read from the page image) marks
 * **+1 TN at box 1, +2 at box 3, +3 at box 6, +4 at box 10**. The code had +1/+2/+3 at 3/6/8.
 *
 * Pure: no Foundry globals.
 */

const whole = n => Math.max(0, Math.floor(Number(n) || 0));

export const MdfRules = {
  /** Hacking Pool: Intelligence + ⌊MPCP ÷ 3⌋ (MDF p.11). */
  hackingPool(intelligence, mpcp) {
    return whole(intelligence) + Math.floor(whole(mpcp) / 3);
  },

  /** TN penalty from filled Matrix Condition Monitor boxes (MDF p.12). */
  matrixCMPenalty(boxes) {
    const b = whole(boxes);
    if (b >= 10) return 4;
    if (b >= 6)  return 3;
    if (b >= 3)  return 2;
    if (b >= 1)  return 1;
    return 0;
  },
};
