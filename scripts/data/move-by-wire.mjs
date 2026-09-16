/**
 * Move-by-wire's side effects — automatic Stress, TLE-x and CCSS · *M&M p.60* (TODO 110). Pure.
 *
 * The bonuses are implemented elsewhere (CLAUDE.md, *Move-by-wire*). This is the price of them:
 *
 * > "Because move-by-wire systems put the central nervous system into a constant state of seizure, the
 * > character automatically racks up Stress Points (p. 124), as shown in the Automatic Stress Table, and
 * > must make a Stress Test. **Apply the Stress to both Quickness and Reaction.** The Stress can only be
 * > removed by therapeutic surgery (p. 147)."
 * > "Each time the character takes Stress, he must make an unaugmented Willpower (move-by-wire rating x
 * > 2) Test. If he fails the test, he develops TLE-x … a -1 penalty to Charisma and all Charisma-based
 * > skills in important social situations … In circumstances that the gamemaster deems dangerous or
 * > tactically crucial … apply a +2 penalty to the target numbers for Perception Tests, reduce Initiative
 * > by 2, and reduce Reaction by 1D6."
 * > "TLE-x can be corrected with brain surgery, but … it can only be done **twice**. [It] is a Correct
 * > Failure procedure for therapeutic surgery with a base target number of **8**."
 * > "If the move-by-wire system fails (or Quickness or Reaction fail in part due to incurred Stress), the
 * > character must succeed in an unaugmented Willpower (move-by-wire rating x 2) Test or suffer …
 * > catastrophic clonic seizure syndrome (CCSS)."
 *
 * ⚠ **The Stress lands on the ATTRIBUTES, not on the implant** — *"Apply the Stress to both Quickness and
 * Reaction"* — and only therapeutic surgery takes it off, so the ordinary Stress repair does not apply.
 * ⚠ **Every TLE-x effect is SITUATIONAL**, and the book hands each situation to the GM: *"important
 * social situations"*, *"circumstances that the gamemaster deems dangerous or tactically crucial"*.
 * Nothing here is applied to a roll by itself — the sheet says the character has it and what it costs,
 * the same way the Charging Attack's movement is declared rather than measured.
 * ⚠ **The Willpower Test is UNAUGMENTED**, so it reads `willpower.base`, never the boosted value.
 */
export const PAGE = 'M&M p.60';

/** The Automatic Stress Table — one Stress Point every N months, by rating. */
export const AUTOMATIC_STRESS_MONTHS = { 1: 6, 2: 4, 3: 2, 4: 1 };

/** What TLE-x costs, each in the situation the book names. */
export const TLEX_EFFECTS = [
  { when: 'important social situations',
    effect: '−1 Charisma and all Charisma-based skills' },
  { when: 'circumstances the GM deems dangerous or tactically crucial',
    effect: '+2 to Perception target numbers, −2 Initiative, and −1D6 Reaction' },
];

/** Brain surgery corrects it, twice at most — a Correct Failure procedure at base TN 8. */
export const TLEX_SURGERY = { limit: 2, targetNumber: 8 };

const whole = n => Math.max(0, Math.floor(Number(n) || 0));

export const MoveByWire = {
  PAGE,
  AUTOMATIC_STRESS_MONTHS,
  TLEX_EFFECTS,
  TLEX_SURGERY,

  /** Is this item a move-by-wire system? The packs abbreviate, so match a stem (CLAUDE.md's rule). */
  isSystem(item) {
    return item?.type === 'cyberware' && /move[-\s]*by[-\s]*wire/i.test(String(item?.name ?? ''));
  },

  /** How often it racks up a point, in months — 0 for a rating the table does not cover. */
  stressEveryMonths(rating) {
    return AUTOMATIC_STRESS_MONTHS[whole(rating)] ?? 0;
  },

  /** The unaugmented Willpower test a character faces each time the system takes Stress. */
  tlexTN(rating) {
    return Math.max(2, whole(rating) * 2);
  },

  /** Both attributes the Stress lands on · p.60. */
  STRESSED_ATTRIBUTES: ['quickness', 'reaction'],

  /** Has this character used up their brain surgery? */
  surgeryExhausted(surgeries) {
    return whole(surgeries) >= TLEX_SURGERY.limit;
  },

  /** A one-line reminder for the sheet and the card. */
  tlexNote() {
    return TLEX_EFFECTS.map(e => `${e.effect} — in ${e.when}`).join('; ');
  },
};
