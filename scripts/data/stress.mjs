/**
 * Stress Points on implants and Attributes · *M&M pp.124-131* (TODO 109). Pure — no Foundry.
 *
 * > "Damage to implants or the organic body is represented by Stress Points. Stress Points measure wear
 * > and tear on the implant or Attribute and are used to determine implant or Attribute failure." (p.124)
 * > "All new implants and Attributes begin with 0 Stress Points; used cyberware begins with 1D6 ÷ 2
 * > permanent Stress Points and bioware begins with 1 permanent Stress Point." (p.124)
 * > "When an implant or Attribute is damaged by a wound effect … it suffers 1D6 ÷ 2 Stress Points (the
 * > Rule of Six does not apply to this roll) and the player must make a Stress Test." (p.124)
 * > "The target number for the Stress Test is the current Stress Point total. Only one success is needed
 * > to avoid a system failure. For cyberlimbs with integrity enhancement, reduce the target number by the
 * > Integrity Rating. For an Attribute boosted by bioware, add the value of the Attribute boost." (p.126)
 * > "If an implant or Attribute's Stress Points reach Deadly Stress Level, the implant or Attribute
 * > automatically fails." (p.126)
 *
 * ⚠ **The test is rolled AFTER the Stress lands.** Leggy's reaction enhancer takes 3 and then rolls
 * against TN 3; his nephritic screen takes 1 on top of 3 and rolls against **4**. The TN is the new
 * total, never the points just added.
 * ⚠ **One success is enough** — this is a failure check, not a graded test.
 * ⚠ **Deadly is automatic failure**, so 10+ never gets a roll.
 * ⚠ **The Rule of Six does not apply** to the 1D6 ÷ 2, and this system explodes 6s everywhere by
 * default — so that roll must not go through `rollPool`.
 * ⚠ **Division rounds DOWN, so a 1 inflicts nothing.** M&M never says which way, and its worked example
 * ("Rolling 1D6 ÷ 2 for the bioware, Leggy gets a 1") is consistent with either. Down is SR3's default
 * and is the kinder reading for a rule that is already punishing. **A question for the maintainer**;
 * `pointsFromDie` is the one place to change it.
 */
export const PAGE = 'M&M pp.124-131';

/** Stress Points → Stress Level · p.126. The same shape as the Condition Monitor, deliberately. */
export const STRESS_LEVELS = [
  { max: 0,        level: null,      label: 'none' },
  { max: 2,        level: 'Light',   label: 'Light' },
  { max: 5,        level: 'Moderate', label: 'Moderate' },
  { max: 9,        level: 'Serious', label: 'Serious' },
  { max: Infinity, level: 'Deadly',  label: 'Deadly — automatic failure' },
];

/** Stress Test dice · p.126, the Stress Dice Table. Used 'ware rolls its equivalent grade. */
export const STRESS_DICE = {
  cyberware: { basic: 1, alpha: 2, beta: 3, delta: 5 },
  bioware:   { cosmetic: 1, basic: 2, cultured: 4 },
};

const whole = n => Math.max(0, Math.floor(Number(n) || 0));

export const Stress = {
  PAGE,
  STRESS_LEVELS,
  STRESS_DICE,

  /** The Stress Level of a point total. */
  level(points) {
    const p = whole(points);
    return STRESS_LEVELS.find(l => p <= l.max).level;
  },

  /** How it reads on a sheet: "3 (Moderate)". */
  describe(points) {
    const p = whole(points);
    const l = Stress.level(p);
    return l ? `${p} (${l})` : `${p}`;
  },

  /** Deadly Stress fails outright — no test is rolled · p.126. */
  autoFails(points) {
    return Stress.level(points) === 'Deadly';
  },

  /**
   * Dice for the Stress Test · p.126.
   * @param {{kind:'cyberware'|'bioware'|'attribute', grade?:string, attribute?:number}} o
   *   `attribute` is the **unaugmented** rating; the test rolls half of it.
   */
  dice({ kind, grade = '', attribute = 0 } = {}) {
    if (kind === 'attribute') return Math.floor(Math.max(0, Number(attribute) || 0) / 2);
    const table = STRESS_DICE[kind];
    if (!table) return 0;
    // "Used" is a modifier ON a grade, exactly as it is for Essence — strip it and read the grade.
    const g = String(grade ?? '').toLowerCase().replace(/\bused\b/g, '').trim();
    return table[g] ?? table.basic ?? 0;
  },

  /**
   * The Stress Test's target number · p.126 — the CURRENT total, after the new Stress has landed.
   * @param {number} points  the new total
   * @param {{integrity?:number, boost?:number}} o  cyberlimb Integrity Rating; bioware Attribute boost
   */
  testTN(points, { integrity = 0, boost = 0 } = {}) {
    return Math.max(2, whole(points) - whole(integrity) + whole(boost));
  },

  /** 1D6 ÷ 2, rounded down — the Stress a wound effect inflicts, and used 'ware's permanent start. */
  pointsFromDie(die) {
    return Math.floor(Math.max(0, Number(die) || 0) / 2);
  },

  /**
   * Used cyberware's permanent Stress: **1D3** · M&M p.45 — *"Each used cyberware item comes with 1D3
   * permanent Stress Points."* A d6 read as 1-2 → 1, 3-4 → 2, 5-6 → 3; never 0.
   *
   * ⚠ M&M contradicts itself: p.124 says *"used cyberware begins with 1D6 ÷ 2"*, which rounded down
   * gives 0 on a 1. The maintainer chose p.45 (2026-09-24, TODO 174). A wound effect's 1D6 ÷ 2
   * (`pointsFromDie`) is a different rule and is unchanged.
   */
  usedStartingPoints(die) {
    const d = Math.min(6, Math.max(1, Math.floor(Number(die) || 1)));
    return Math.ceil(d / 2);
  },

  /** What an implant or Attribute starts with · p.124, and M&M p.45 for used cyberware. */
  startingPoints({ kind, used = false, die = 0 } = {}) {
    if (kind === 'bioware') return 1;                       // "bioware begins with 1 permanent Stress Point"
    if (kind === 'cyberware' && used) return Stress.usedStartingPoints(die);
    return 0;
  },

  /**
   * How many wound effects a hit causes · p.126.
   *
   * > "compare the highest die result rolled to the number of boxes of damage inflicted … use the results
   * > of the Damage Resistance Test as if it were a Success Test, with a target number equal to the number
   * > of damage boxes inflicted. If the character fails … the character suffers a number of wound effects
   * > equal to the margin of failure (the difference between the highest roll and the number of damage
   * > boxes suffered)."
   *
   * ⚠ **The soak's OWN dice decide this** — its highest single die, not its successes.
   */
  woundEffects(highestDie, boxes) {
    return Math.max(0, whole(boxes) - whole(highestDie));
  },

  /** Everything a Stress Test needs, resolved once: `{ dice, tn, autoFails, level }`. */
  plan({ kind, grade, attribute, points, integrity = 0, boost = 0 } = {}) {
    const total = whole(points);
    return {
      points: total,
      level:  Stress.level(total),
      autoFails: Stress.autoFails(total),
      dice:   Stress.dice({ kind, grade, attribute }),
      tn:     Stress.testTN(total, { integrity, boost }),
    };
  },
};
