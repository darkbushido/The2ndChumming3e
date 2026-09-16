/**
 * Cybermancy — cyberzombies, Chronic Dissociation Syndrome and cancer · *M&M pp.50-59* (TODO 111).
 * Pure — no Foundry.
 *
 * A cyberzombie is a character kept alive at **Essence 0 or less** by cybermancy. SR3 p.55 is blunt that
 * *"An Essence of 0 means you're dead"*; cybermancy is the exception, which is why nothing here applies
 * unless the actor is flagged as one.
 *
 * > "The gamemaster makes periodic Willpower Tests to determine whether a character develops CDS. The
 * > frequency and target number for the tests are determined by the character's [Essence]." — p.59
 * > "[A character who fails] is lost to the world. He cannot initiate action, only react … CDS adds a +4
 * > modifier to all Perception Tests the character makes and a +3 modifier for all other tests … dies in
 * > a number of weeks equal to 3 + his Willpower Rating." — p.59
 * > "If the treatment is conducted in a delta clinic, the afflicted character makes a Spell Resistance
 * > (8) Test. **If the test succeeds, the magic fails and the character dies.** If the Spell Resistance
 * > Test fails, the syndrome is reversed … reduce the target number for the Spell Resistance Test by 1
 * > (to a minimum of 2) each time a character repeats the test." — p.59
 * > "The character makes a Willpower (6) Test to determine how quickly this recovery occurs. The base
 * > time for this recovery is 1 week; each success … reduces the recovery time by 1 day." — p.59
 *
 * ⚠ **The treatment test is inverted, and it is not a typo.** Succeeding on the Spell Resistance Test
 * kills the patient — they resisted the magic keeping them together. `treatmentOutcome` is the single
 * place that says so.
 * ⚠ **Scheduling is campaign time this system does not track.** The table's interval is shown; the GM
 * decides when a test is due. Nothing here runs on a clock.
 * ⚠ **Essence is NEGATIVE throughout.** `cdsTest(-2.2)` is the −2.01 to −2.50 row; passing a positive
 * number means the character is not a cyberzombie and gets no test at all.
 */
export const PAGE = 'M&M p.59';

/** The Chronic Dissociation Syndrome Table · p.59. `from`/`to` are inclusive, in Essence. */
export const CDS_TABLE = [
  { from:  0.00, to: -0.50, months: 6, tn: 3 },
  { from: -0.51, to: -1.00, months: 6, tn: 4 },
  { from: -1.01, to: -1.50, months: 6, tn: 5 },
  { from: -1.51, to: -2.00, months: 4, tn: 5 },
  { from: -2.01, to: -2.50, months: 4, tn: 6 },
  { from: -2.51, to: -3.00, months: 3, tn: 6 },
  { from: -3.01, to: -3.50, months: 2, tn: 6 },
  { from: -3.51, to: -Infinity, months: 2, tn: 8 },   // "+1 to target number for every additional -0.5"
];

/** What CDS costs a character while they have it · p.59. */
export const CDS_EFFECTS = { perception: 4, other: 3,
  note: 'cannot initiate action, only react; +4 to Perception Tests and +3 to all other tests' };

/** The delta-clinic treatment · p.59. */
export const CDS_TREATMENT = { baseTN: 8, minTN: 2, recoveryTN: 6, recoveryDays: 7 };

/** The cancer roll made during the cybermancy operation itself · p.59. */
export const CANCER = { dice: 2, onsetDice: 10, fatalWeeks: '4 + 1D6' };

const num = n => (Number.isFinite(Number(n)) ? Number(n) : 0);

export const Cyberzombie = {
  PAGE, CDS_TABLE, CDS_EFFECTS, CDS_TREATMENT, CANCER,

  /** Is this Essence in cyberzombie territory at all? (0 or less — SR3 p.55's death line.) */
  applies(essence) {
    return num(essence) <= 0;
  },

  /**
   * The CDS test due at this Essence · p.59.
   * @returns {{months:number, tn:number}|null} — null above 0, where the character is simply alive.
   */
  cdsTest(essence) {
    const e = num(essence);
    if (e > 0) return null;
    // ⚠ The printed rows stop at -3.51; the last one is open-ended, so it is matched separately or its
    // "+1 for every additional -0.5" would never be reached.
    const rows = CDS_TABLE.slice(0, -1);
    const row  = rows.find(r => e <= r.from && e >= r.to);
    if (row) return { months: row.months, tn: row.tn };
    // "-3.51 or lower … 8; +1 to target number for every additional -0.5"
    const last  = CDS_TABLE[CDS_TABLE.length - 1];
    const extra = Math.max(0, Math.floor((Math.abs(e) - 3.51) / 0.5));
    return { months: last.months, tn: last.tn + extra };
  },

  /** How long a character with CDS has left, in weeks · p.59. */
  weeksToLive(willpower) {
    return 3 + Math.max(0, Math.floor(num(willpower)));
  },

  /** The Spell Resistance TN for a treatment attempt — it gets EASIER each time · p.59. */
  treatmentTN(previousAttempts = 0) {
    return Math.max(CDS_TREATMENT.minTN, CDS_TREATMENT.baseTN - Math.max(0, Math.floor(num(previousAttempts))));
  },

  /**
   * ⚠ **Inverted on purpose** — *"If the test succeeds, the magic fails and the character dies."*
   * @returns {{cured:boolean, died:boolean, note:string}}
   */
  treatmentOutcome(successes) {
    const s = Math.max(0, Math.floor(num(successes)));
    return s > 0
      ? { cured: false, died: true,  note: 'the Spell Resistance Test SUCCEEDED — the magic fails and the character dies (M&M p.59)' }
      : { cured: true,  died: false, note: 'the Spell Resistance Test failed — the syndrome is reversed, and the IMS works again in a few days' };
  },

  /** Recovery after a cure: 1 week, less a day per success on a Willpower (6) Test · p.59. */
  recoveryDays(successes) {
    return Math.max(0, CDS_TREATMENT.recoveryDays - Math.max(0, Math.floor(num(successes))));
  },

  /**
   * The cancer roll at the operation · p.59 — *"roll 2D6 … If the result is less than double the
   * absolute value of the character's desired Essence Rating, the character will eventually develop
   * cancer"*. Body 4-7 adds 1 to the roll and 8+ adds 2, symbiotes another 1 — all *"at the
   * gamemaster's discretion"*, so they are arguments rather than assumptions.
   */
  cancerThreshold(essence) {
    return Math.abs(num(essence)) * 2;
  },
  cancerRoll(roll, essence, { body = 0, symbiotes = false, applyBody = true } = {}) {
    let r = num(roll);
    if (applyBody) r += num(body) >= 8 ? 2 : num(body) >= 4 ? 1 : 0;
    if (symbiotes) r += 1;
    return { total: r, threshold: Cyberzombie.cancerThreshold(essence), cancer: r < Cyberzombie.cancerThreshold(essence) };
  },
};
