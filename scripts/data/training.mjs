/**
 * Train first — an OPTIONAL roll before a Karma purchase, never a gate.  (TODO 309)
 *
 * Two rule sets, chosen by the world setting `trainingRule` (ruled by the maintainer, 2026-11-19):
 *
 * CORE · SR3 p.245, p.95
 *   "Such training can be made into a short and simple mechanic, such as requiring a Skill Test
 *    using the skill … The target number for such a test would be twice the Skill Rating" sought.
 *   An instructor needs the skill at 3+ and at least the rating sought. "Teaching requires an
 *    Instruction (4) Test. For every two successes … the student receives an additional die".
 *
 * COMPANION · Shadowrun Companion p.48-50 (printed; PDF page = printed + 1)
 *   Skill Improvement Table (p.49): base time = Karma spent × 7 days (Active) or × 15 (Knowledge,
 *   Language). A Skill Test against the new rating + 2 divides it by the successes; none → × 1.5,
 *   rounded up. An instructor's Instruction (4) Test — Charisma (8) without the skill — adds 1 to
 *   the student's SUCCESS total per 2 successes; if either test gets none, "the instructor simply
 *   cannot teach the student": a day's pay is forfeit and 1.5 days are added. A new skill learned
 *   with an instructor takes −1 TN (p.50). A virtual instructor cannot make the Instruction Test
 *   (p.50). Suggested Instructor Fees Table (p.50) — "gamemasters should modify fees as they see fit".
 *
 * The book leaves the pace of learning to the GM: everything here is offered and editable.
 */
export const RULES = Object.freeze({ core: 'core', companion: 'companion' });

/** Suggested Instructor Fees Table, Shadowrun Companion p.50 — daily fee by Instruction rating. */
const FEE_BY_INSTRUCTION = [0, 40, 50, 75, 100, 200, 400];

export const Training = {
  RULES,
  INSTRUCTION_TN: 4,
  /** Companion p.49: without Instruction, "a Charisma (8) Test (as if defaulting from Instruction)". */
  CHARISMA_DEFAULT_TN: 8,

  /** Core TN of the learning test: twice the rating sought (minimum 2). · SR3 p.245 */
  tn(targetRating) {
    return Math.max(2, 2 * (Math.max(1, parseInt(targetRating) || 1)));
  },

  /** Companion TN: the new rating + 2; −1 for a NEW skill learned with an instructor. · SC p.49-50 */
  companionTN(targetRating, { newSkill = false, instructor = false } = {}) {
    const t = Math.max(1, parseInt(targetRating) || 1) + 2 - (newSkill && instructor ? 1 : 0);
    return Math.max(2, t);
  },

  /** The TN for the rule in force. */
  tnFor(rule, targetRating, opts = {}) {
    return rule === RULES.companion ? Training.companionTN(targetRating, opts) : Training.tn(targetRating);
  },

  /** Successes at a TN of 6 or less — a 6 always succeeds, so no Rule of Six re-roll is needed. */
  successes(dice, tn = 4) {
    return (dice ?? []).filter(d => d >= tn).length;
  },

  /**
   * Roll `n` dice against `tn` with the Rule of Six (a 6 is re-rolled and added while the TN is
   * above the total, SR3 p.38). `die` returns 1-6. Returns the successes.
   */
  rollSuccesses(n, tn, die) {
    let hits = 0;
    for (let i = 0; i < Math.max(0, n | 0); i++) {
      let total = die();
      if (total === 1) continue;
      while (total % 6 === 0 && total < tn) total += die();
      if (total >= tn) hits++;
    }
    return hits;
  },

  /** +1 die (core) or +1 success (Companion) per two Instruction successes. */
  instructorBonus(instructionSuccesses) {
    return Math.floor(Math.max(0, parseInt(instructionSuccesses) || 0) / 2);
  },

  /** Why this teacher falls short of p.95 / SC p.49 — warnings, never a refusal. */
  instructorWarnings(teachRating, targetRating) {
    const r = parseInt(teachRating) || 0, t = parseInt(targetRating) || 0;
    const out = [];
    if (r < 3) out.push(`the instructor needs the skill at 3 or higher to teach it (has ${r}) · SR3 p.95`);
    if (r < t) out.push(`the instructor needs the skill at ${t} or higher to teach rating ${t} (has ${r}) · SR3 p.95`);
    return out;
  },

  /** Skill Improvement Table, SC p.49: Karma spent × 7 (Active) or × 15 (Knowledge/Language) days. */
  baseDays(karmaSpent, isActive) {
    return Math.max(0, parseInt(karmaSpent) || 0) * (isActive ? 7 : 15);
  },

  /** Base time ÷ successes, or × 1.5 on none; rounded up. · SC p.49 */
  finalDays(base, successes) {
    const s = Math.max(0, parseInt(successes) || 0);
    return Math.ceil(s > 0 ? base / s : base * 1.5);
  },

  /**
   * The Companion outcome. `instructionHits` is null without a live instructor (alone, or a virtual
   * one, which makes no Instruction Test). A live instructor whose test, or the student's, got no
   * successes cannot teach: the student trains alone, plus 1.5 days, and owes one day's fee.
   */
  companionOutcome({ base, studentHits, instructionHits = null }) {
    const s = Math.max(0, parseInt(studentHits) || 0);
    if (instructionHits === null) return { days: Training.finalDays(base, s), hits: s, bonus: 0, taught: false, failed: false };
    const i = Math.max(0, parseInt(instructionHits) || 0);
    if (s === 0 || i === 0) {
      return { days: Math.ceil(Training.finalDays(base, s) + 1.5), hits: s, bonus: 0, taught: false, failed: true };
    }
    const bonus = Training.instructorBonus(i);
    return { days: Training.finalDays(base, s + bonus), hits: s + bonus, bonus, taught: true, failed: false };
  },

  /** Suggested daily fee, SC p.50: by Instruction rating, adjusted by the rating taught and hours. */
  dailyFee(instruction, taughtRating, { overFourHours = false } = {}) {
    const i = Math.max(0, parseInt(instruction) || 0);
    let fee = i <= 6 ? FEE_BY_INSTRUCTION[i] : 400 + 100 * (i - 6);
    const r = parseInt(taughtRating) || 0;
    if (r === 2 || r === 3) fee -= 25;
    else if (r === 6 || r === 7) fee += 25;
    else if (r >= 8) fee += 50;
    fee = Math.max(0, fee);
    return overFourHours ? Math.round(fee * 1.5) : fee;
  },

  /** Total fee, SC p.50: specialization +50% of the total, classroom −50% of the total. */
  totalFee(daily, days, { specialization = false, classroom = false } = {}) {
    let total = Math.max(0, Number(daily) || 0) * Math.max(0, parseInt(days) || 0);
    if (specialization) total *= 1.5;
    if (classroom) total *= 0.5;
    return Math.round(total);
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

  /** Is this choice a specialization (fee +50%)? */
  isSpecialization(choice) {
    const action = String(choice ?? '').split(':')[2];
    return action === 'addspec' || action === 'improvespec';
  },
};
