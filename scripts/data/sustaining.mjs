/**
 * Sustained spells · *SR3 p.178, p.180, p.183*
 *
 * > "Characters sustaining spells have a +2 target modifier per sustained spell applied to all
 * > tests, including Drain Resistance Tests (but not normal Damage Resistance Tests). You can
 * > simultaneously sustain a number of spells equal to your Sorcery rating."  — p.178
 *
 * ⚠ **ONE modifier, stated three times.** p.180 (*"Each spell sustained at the moment adds +2 to
 * the Power of the Drain"*) and p.183 (*"an additional target modifier of +2 per spell being
 * sustained"* on the Sorcery Test) are the same +2 as p.178's "all tests" — the Drain's Power IS
 * the Drain Resistance TN. Applying p.178 and p.180 both would charge +4 per spell on Drain.
 *
 * ⚠ **Not Damage Resistance.** The soak card (Body vs Power − armour) never takes it.
 *
 * ⚠ **The Sorcery limit is SHOWN, never enforced** — minimal guardrails; a GM with a reason wins.
 *
 * An entry is `{ id, name, force, spellItemId, target, focus }` (ActorDataModels). `focus` = held
 * by a sustaining focus or a spirit, not by the character's concentration, so it costs nothing.
 * Pure: every function takes plain data and returns new data.
 */

export const SUSTAIN_TN_PER_SPELL = 2;

/** The spells the character is actually concentrating on (a focus holds the rest). */
export const concentrating = entries => (entries ?? []).filter(e => !e?.focus);

/** The TN modifier for sustaining — +2 per spell the character concentrates on. */
export function sustainingTN(entries) {
  return SUSTAIN_TN_PER_SPELL * concentrating(entries).length;
}

/** Sustained and Permanent spells are held; Instant ones are over when cast (p.178). */
export function isSustainable(duration) {
  return /^\s*(sustained|permanent|s|p)\s*$/i.test(String(duration ?? ''));
}

/** Over the Sorcery limit? Counts what the character holds by concentration. */
export function overLimit(entries, sorcery) {
  return concentrating(entries).length > Math.max(0, Number(sorcery) || 0);
}

/** A new entry, appended. `id` is supplied by the caller (Foundry's randomID in play). */
export function addSustained(entries, { name = '', force = 1, spellItemId = '', target = '', focus = false } = {}, id) {
  if (!id) throw new Error('SR3E | addSustained needs an id');
  return [...(entries ?? []), {
    id, name: String(name), force: Math.max(0, Number(force) | 0),
    spellItemId: String(spellItemId ?? ''), target: String(target ?? ''), focus: !!focus,
  }];
}

export const dropSustained = (entries, id) => (entries ?? []).filter(e => e.id !== id);

export const setSustainedFocus = (entries, id, focus) =>
  (entries ?? []).map(e => (e.id === id ? { ...e, focus: !!focus } : e));

/**
 * Did this update ADD damage? `before` is the actor's `system.wounds` before the update, `change`
 * the update's `system.wounds` diff. Healing, or an update that does not touch a track, is false —
 * p.178's test is owed for "damage", not for any change to the boxes.
 */
export function woundsRose(before, change) {
  const rose = k => {
    const next = change?.[k]?.value;
    return next !== undefined && Number(next) > (Number(before?.[k]?.value) || 0);
  };
  return rose('stun') || rose('physical') || rose('overflow');
}

/** A short line for a TN breakdown, or '' when there is nothing to say. */
export function sustainingNote(entries) {
  const n = concentrating(entries).length;
  return n ? `Sustaining ${n} spell${n !== 1 ? 's' : ''} +${sustainingTN(entries)}` : '';
}
