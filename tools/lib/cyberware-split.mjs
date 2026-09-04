/**
 * Split a Little Black Book contact's compound cyberware string into individual implants · TODO 86
 *
 * The 62 contacts carry their chrome as ONE document per contact holding a prose list:
 *
 *   "Cybereyes (Display Link, Flare Compensation, Low Light), Muscle Replacement 1,
 *    Reaction Enhancers 2, Wired Reflexes 2 w/Reflex Trigger"
 *
 * That is seven implants in one inert record with a single summed `essenceCost`. Nothing can
 * match it by name, nothing grants a bonus, and it carries no citation.
 *
 * ⚠ **SPLIT ON TOP-LEVEL COMMAS ONLY.** The commas inside `(…)` separate *sub-modifications of
 * the preceding implant*, not siblings — `Cybereyes (Display Link, Flare Compensation, Low
 * Light)` is one cybereye replacement carrying three mods, and SR3 p.300 gives cybereyes a .5
 * Essence allowance those mods ride inside. Splitting naively on every comma turns three eye
 * mods into three free-standing implants and charges Essence three times.
 *
 * ⚠ **`w/` IS a separator, and it is not decorative.** `Wired Reflexes 2 w/Reflex Trigger` and
 * `Headware Memory [300 Mp] w/Data Compactor 2` are each two distinct implants that happen to be
 * printed together. Treating `w/` as part of the name makes both unmatchable.
 *
 * ⚠ **`[Alphaware]` / `[Betaware]` is a GRADE, not part of the name** — it multiplies Essence
 * (M&M p.45, `SR3EActor.gradedEssenceCost`). Left inside the name it both breaks the match and
 * loses the grade. `[300 Mp]` and `[Rating 3]` are NOT grades and must survive.
 */

/** Grades that may appear in square brackets after an implant name. */
const GRADES = ['alphaware', 'betaware', 'deltaware', 'used'];

/** Split on commas that are not inside `(…)` or `[…]`. */
export function splitTopLevel(text) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of String(text ?? '')) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/**
 * @returns {{name:string, mods:string[], grade:string|null, rating:number|null}[]}
 */
export function splitCyberware(text) {
  const parts = [];
  for (const chunk of splitTopLevel(text)) {
    // `w/` joins two implants printed together.
    for (const piece of chunk.split(/\s+w\/\s*/i)) {
      const raw = piece.trim();
      if (!raw) continue;

      // Parenthesised tail = sub-mods of this implant.
      const mods = [];
      let name = raw.replace(/\(([^)]*)\)\s*$/, (_m, inner) => {
        mods.push(...splitTopLevel(inner));
        return '';
      }).trim();

      // Bracketed grade, but NOT a rating or a memory size.
      let grade = null;
      name = name.replace(/\[([^\]]+)\]/g, (m, inner) => {
        if (GRADES.includes(inner.trim().toLowerCase())) { grade = inner.trim(); return ''; }
        return m;                                   // `[300 Mp]`, `[Rating 3]` stay
      }).trim();

      // A trailing bare number is the implant's rating: `Smartlink 2`, `Boosted Reflexes 3`.
      let rating = null;
      const rm = /\s+(\d+)$/.exec(name);
      if (rm) rating = Number(rm[1]);

      name = name.replace(/\s{2,}/g, ' ').trim();
      if (name) parts.push({ name, mods, grade, rating });
    }
  }
  return parts;
}
