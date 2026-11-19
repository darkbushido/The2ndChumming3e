/**
 * Training before a Karma purchase — an OPTIONAL roll, never a gate.  · SR3 p.245, p.95
 *
 *   "Such training can be made into a short and simple mechanic, such as requiring a Skill Test
 *    using the skill to see if it can be learned or improved. The target number for such a test
 *    would be twice the Skill Rating" sought.                                          (SR3 p.245)
 *   "A character must possess a skill at Rating 3 or higher in order to teach it to another. The
 *    instructor must also have the skill at a rating that equals or exceeds the rating the pupil
 *    wants to achieve. Teaching requires an Instruction (4) Test. For every two successes achieved
 *    in this test, the student receives an additional die."                             (SR3 p.95)
 *
 * The book leaves the pace of learning to the GM, so the Spend Karma dialog OFFERS this roll and
 * posts the result; the purchase itself is never blocked (warn, never refuse).
 */
export const Training = {
  /** TN of the learning test: twice the rating sought (minimum 2). */
  tn(targetRating) {
    return Math.max(2, 2 * (Math.max(1, parseInt(targetRating) || 1)));
  },

  /** The instructor's Instruction test is always against 4. */
  INSTRUCTION_TN: 4,

  /** Successes at a TN of 6 or less — a 6 always succeeds, so no Rule of Six re-roll is needed. */
  successes(dice, tn = 4) {
    return (dice ?? []).filter(d => d >= tn).length;
  },

  /** +1 die for the pupil per two Instruction successes (fractions dropped). */
  instructorBonus(instructionSuccesses) {
    return Math.floor(Math.max(0, parseInt(instructionSuccesses) || 0) / 2);
  },

  /** Why this teacher falls short of p.95 — warnings, never a refusal. */
  instructorWarnings(teachRating, targetRating) {
    const r = parseInt(teachRating) || 0, t = parseInt(targetRating) || 0;
    const out = [];
    if (r < 3) out.push(`the instructor needs the skill at 3 or higher to teach it (has ${r}) · SR3 p.95`);
    if (r < t) out.push(`the instructor needs the skill at ${t} or higher to teach rating ${t} (has ${r}) · SR3 p.95`);
    return out;
  },

  /** The rating a Spend Karma choice is training toward, or null when it isn't a skill purchase. */
  targetFor(choice, skill) {
    const [type, , action, idx] = String(choice ?? '').split(':');
    if (type === 'learn') return 1;
    if (type !== 'skill' || !skill) return null;
    const rating = skill.rating ?? 0;
    if (action === 'learn')  return 1;
    if (action === 'rating') return rating + 1;
    if (action === 'addspec') return rating + 1;
    if (action === 'improvespec') return rating + (skill.specialisations?.[parseInt(idx)]?.level ?? 1) + 1;
    return null;
  },
};
