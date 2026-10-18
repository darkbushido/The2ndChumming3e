/**
 * Skill rules that are pure constants — no Foundry, no imports · TODO 88
 *
 * ⚠ **This module exists so consumers do not have to import `ItemDataModels`.** That file calls
 * `foundry.data.fields` at module load, so importing it drags the whole Foundry data-model API
 * into anything that touches it — which broke `tests/ew-skill.test.mjs` the moment `SR3EMIJI`
 * imported it for one number. Anything Foundry-free that several places need belongs here.
 */

/**
 * The gap between a base skill and a specialisation taken at CHARACTER CREATION · *SR3 p.57*
 *
 * > "Specializing gives you a rating in the specialization equal to the base skill **rating
 * > +1**. You then **subtract one from the base skill rating**, because your character's focus
 * > on the specialization means that he or she has not focused as much on the rest of the base
 * > skill."
 *
 * Edged Weapons 6 → Katanas 7, Edged Weapons 5. A gap of 2, by construction.
 *
 * ⚠ **A STARTING point, never a cap.** p.245 raises a specialisation with karma with no
 * ceiling, each raise widening the gap by one, so `level` 3, 4 or more is legitimate data —
 * `Etiquette 4 (Corporate 8)` is a chargen specialisation raised twice more. Nothing may clamp
 * it, and the item sheet's level dropdown must offer past 2.
 *
 * ⚠ **Post-chargen the base skill is NOT reduced** — *"Creating or improving a specialization
 * does not mean the base skill must be reduced"* (p.245) — so a specialisation BOUGHT with
 * karma starts at level **1**, not 2. Both add-paths use 1 correctly. This constant is only for
 * converting legacy data whose origin is unknown, where chargen is the safe assumption.
 *
 * ⚠ **It was COPIED into three places** before this module existed — `SkillData.migrateData`,
 * `SR3EActorSheet` and `SR3EMIJI` each carried an inline `level: 2`. One owner.
 */
export const CHARGEN_SPEC_GAP = 2;

/**
 * Parse a printed specialisation string into `{ name, level }` entries. **Pure.**
 *
 * SR3 stat blocks print specialisations as `Skill N (Spec M)`, or several at once as
 * `Skill N (Spec M, Spec2 M2)`. `level` is the BONUS over the base skill, so it is derived —
 * `M − N` — rather than defaulted.
 *
 * ⚠ **Deriving it is the whole point.** Storing the chargen gap for everything flattened all
 * 131 Little Black Book specialisations to level 2, which is right for 55 of them and wrong for
 * the 45 whose NPC was written with karma advancement behind them (TODO 88).
 *
 * ⚠ **Several specialisations may share one set of brackets** — `Computer 5 (Decking 8,
 * Hardware 9)` is TWO, and storing the whole string as one name is what the shipped pack does.
 * Split on commas.
 *
 * ⚠ **A specialisation with no printed rating falls back to the chargen gap**, and is the only
 * case where a guess is made. The Little Black Book prints a rating on every one.
 *
 * ⚠ **The rating is stripped from the NAME.** `"Magic 6"` is a name plus a rating; leaving it
 * whole makes the sheet display "Magic 6" and any name-keyed lookup miss.
 *
 * @param {string} text  the bracketed text, e.g. `"Decking 8, Hardware 9"`
 * @param {number} base  the base skill's rating
 * @returns {Array<{name: string, level: number}>}
 */
export function parseSpecialisations(text, base) {
  const b = Number(base) || 0;
  return String(text ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const m = /^(.*?)\s+(\d+)$/.exec(part);
      if (!m) return { name: part, level: CHARGEN_SPEC_GAP };
      const level = Number(m[2]) - b;
      /* ⚠ A specialisation is always BETTER than its base skill, so a level below 1 means the
       * text was misread — most often a sibling SKILL absorbed as a specialisation, which is
       * what `Car 6 (Car B/R 3)` is. Fall back rather than store a negative bonus, and let the
       * caller's report surface it. */
      return { name: m[1].trim(), level: level >= 1 ? level : CHARGEN_SPEC_GAP };
    });
}

export class SkillRules {
  /**
   * Specialisations after the BASE skill's rating changes · *SR3 p.245*, `rules/karma.md#44`
   *
   * > "Specializations do not automatically increase when the base skill increases.
   * > Specializations must be increased separately."
   *
   * `level` is stored as the BONUS over the base (a spec rolls base + level), so a base that
   * rises by N must LOWER every bonus by N for the specialisation to keep its own rating —
   * Iris's Pistols 3 / Beretta 5 becomes Pistols 4 / Beretta 5, level 2 → 1. A base that falls
   * raises the bonus the same way (the spec keeps its rating; reversible).
   *
   * ⚠ **The book is silent on a base that catches up to the spec.** The bonus floors at 0: the
   * specialisation stays on the skill, rolling as the base (it is no longer "better"), and the
   * next karma purchase is base + 1 as for a new one. A bonus below 0 would make the
   * specialisation a penalty. Nothing is removed.
   *
   * ⚠ **An unlearned skill (rating 0) is left alone**, both ways: learning a skill at 1 is not
   * "the base increased", and a skill dropped to 0 keeps its specialisations as they were.
   *
   * @returns {Array<{name:string, level:number}>|null}  the new list, or null when nothing changes
   */
  static specsAfterRatingChange(specs, oldRating, newRating) {
    const o = Number(oldRating) || 0, n = Number(newRating) || 0;
    if (!Array.isArray(specs) || !specs.length || o <= 0 || n <= 0 || o === n) return null;
    const delta = n - o;
    let changed = false;
    const next = specs.map(sp => {
      const level = Math.max(0, (Number(sp?.level) || 0) - delta);
      if (level !== sp?.level) changed = true;
      return { ...sp, level };
    });
    return changed ? next : null;
  }
}
