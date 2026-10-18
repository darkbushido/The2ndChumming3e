/**
 * What initiation gives on the astral plane · *Magic in the Shadows p.58*. Pure — no Foundry.
 *
 * > "Initiates receive a bonus to their Astral Reaction equal to their grade. They also gain access to a new pool,
 * > called the Astral Pool, which contains a number of dice equal to the initiate's grade. Astral Pool dice can be
 * > used for any test made while on the astral plane or metaplanes, except for Magical Skill Tests. They can be
 * > used to augment Astral Combat Tests (even when Sorcery is used) and Astral Perception Tests. Dice in the Astral
 * > Pool refresh the same way as other dice pools."
 *
 * ⚠ **Two different pools, two names.** The core book's *Astral Combat Pool* (SR3 p.174, "the sum of their Mental
 * Attributes, divided by two and rounded down" — `derived.astralPool`, `astralPoolSpent`) is NOT this one. This is
 * the **Initiate Astral Pool**: grade dice, `derived.initiatePool`, `initiatePoolSpent`. Both can be spent on the
 * same astral combat test.
 *
 * **Astral Reaction** (SR3 p.174): *"Astrally projecting characters use their Intelligence as Astral Reaction,
 * making their Initiative Score equal to Intelligence + 20 + 1D6."* The initiate's grade is added to that Astral
 * Reaction, so the score is Intelligence + grade + 20 + 1D6 (this system's reading of "a bonus to their Astral
 * Reaction"). It applies only while astrally projecting (`astralMode: 'astral'`) — the only time Astral Reaction
 * is used; a perceiving or dual-natured initiate keeps the physical Reaction and Initiative.
 */
export const InitiateAstral = {
  /** The grade as a whole number ≥ 0. */
  grade(g) { return Math.max(0, Math.trunc(Number(g) || 0)); },

  /** Astral Reaction bonus: "equal to their grade". */
  reactionBonus(grade) { return InitiateAstral.grade(grade); },

  /** Astral Reaction (SR3 p.174: Intelligence) plus the initiate's bonus. */
  astralReaction(intelligence, grade) {
    return (Number(intelligence) || 0) + InitiateAstral.reactionBonus(grade);
  },

  /** The Astral Initiative base: Astral Reaction + 20 (the +1D6 is rolled by the caller). */
  initiativeBase(intelligence, grade) {
    return InitiateAstral.astralReaction(intelligence, grade) + 20;
  },

  /** The pool's size before a manual modifier: the grade. 0 → not an initiate, no pool. */
  poolBase(grade) { return InitiateAstral.grade(grade); },

  /** Total pool, or `null` for someone who is not an initiate (no pool is shown or offered). */
  pool(grade, mod = 0) {
    const base = InitiateAstral.poolBase(grade);
    return base > 0 ? Math.max(0, base + (Number(mod) || 0)) : null;
  },

  /** Dice still unspent; `null` when there is no pool. */
  available(total, spent) {
    return total === null || total === undefined ? null : Math.max(0, total - Math.max(0, Number(spent) || 0));
  },

  /**
   * The pool "can be used for any test made while on the astral plane or metaplanes, except for Magical Skill
   * Tests". A Sorcery or Conjuring roll (category 'Magical skills') is therefore not allowed — but ASTRAL COMBAT is
   * ("even when Sorcery is used"), which is its own card and never asks this.
   */
  allowedOnSkill(category) {
    return String(category ?? '').trim().toLowerCase() !== 'magical skills';
  },

  /** Is the initiate on the astral plane for a general test? Perceiving (dual) and projecting both are. */
  onAstralPlane(astralMode) {
    return astralMode === 'dual' || astralMode === 'astral';
  },
};
