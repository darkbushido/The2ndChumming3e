/**
 * The Magic Loss check · SR3 p.160. Pure — no Foundry.
 *
 * > "When a check for Magic Loss is required, roll 2D6. If the total is less than or equal to your Magic
 * > Attribute, it drops by one point. Otherwise, there is no effect. A roll of 2 always indicates the loss of
 * > a Magic point."
 *
 * ⚠ The "roll of 2" clause is what makes the check bite at Magic 1 (and Magic 0 would never be checked): a
 * plain "≤ Magic" test would let a 2 slip past a Magic-1 character. Every Magic Loss check in the system goes
 * through here (today only the healing flow's, SR3EHealing).
 */
export const MagicLoss = {
  /** Does this 2D6 total cost a point of Magic? */
  lost(roll, magic) {
    const r = Number(roll) || 0;
    if (r === 2) return true;                 // p.160: "A roll of 2 always indicates the loss of a Magic point."
    return r <= (Number(magic) || 0);         // p.160: "less than or equal to your Magic Attribute"
  },
};
