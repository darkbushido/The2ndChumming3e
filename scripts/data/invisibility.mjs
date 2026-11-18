/**
 * Invisibility on the token · SR3 p.196.
 *
 * Any sustained Invisibility or Improved Invisibility puts Foundry's core `invisible` status on the actor it
 * covers, and the status comes off when the last such spell drops. That is ALL the system does — the book's
 * consequences (Blind Fire for an attacker who can't see the subject, the success test against the spell)
 * stay with the GM.
 *
 * - **Invisibility** fools living viewers only (normal and astral-less sight, but cameras and other technology
 *   see the subject).
 * - **Improved Invisibility** also fools technological sensors. Both are the same status on the token; the
 *   kind is reported (`invisibilityKind`) so a card or tooltip can say which one is up.
 *
 * WHO: a sustained entry's `target` is the cast card's target names joined with ", " (SR3EItem). Blank, "—"
 * or "self" means the caster. Matching is by name — the sustained list stores names, not ids.
 * Pure — no Foundry.
 */

const IMPROVED = /^\s*improved\s+invisibility\b/i;
const PLAIN    = /^\s*invisibility\b/i;
const SELF     = new Set(['', '—', '-', 'self']);

/** 'improved' | 'plain' | null — from a spell's name. */
function invisibilityKind(spellName) {
  const n = String(spellName ?? '');
  if (IMPROVED.test(n)) return 'improved';
  if (PLAIN.test(n)) return 'plain';
  return null;
}

/** The names a sustained entry covers (the caster when it names no one). */
function coveredNames(entry, casterName) {
  const raw = String(entry?.target ?? '').trim();
  if (SELF.has(raw.toLowerCase())) return [casterName];
  return raw.split(',').map(s => s.trim()).filter(Boolean)
    .map(s => (s.toLowerCase() === 'self' ? casterName : s));
}

/**
 * The strongest invisibility on `actorName`, from every sustainer's list — 'improved', 'plain' or null.
 * @param {string} actorName
 * @param {{ name: string, sustainedSpells: object[] }[]} sustainers
 */
function invisibilityOn(actorName, sustainers) {
  const want = String(actorName ?? '').trim().toLowerCase();
  if (!want) return null;
  let best = null;
  for (const s of sustainers ?? []) {
    for (const e of s?.sustainedSpells ?? []) {
      const kind = InvisibilityRules.invisibilityKind(e?.name);
      if (!kind) continue;
      if (!InvisibilityRules.coveredNames(e, s.name).some(n => n.toLowerCase() === want)) continue;
      if (kind === 'improved') return 'improved';
      best = 'plain';
    }
  }
  return best;
}

/** Every name an actor's invisibility spells cover — the actors whose status must be re-checked. */
function namesTouched(entries, casterName) {
  return (entries ?? []).filter(e => InvisibilityRules.invisibilityKind(e?.name))
    .flatMap(e => InvisibilityRules.coveredNames(e, casterName));
}

// Called through the object so mutants reach the inner calls.
export const InvisibilityRules = { invisibilityKind, coveredNames, invisibilityOn, namesTouched };
