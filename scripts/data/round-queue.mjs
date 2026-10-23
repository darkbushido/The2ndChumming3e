/**
 * The round's action queue after combatants leave it (TODO 251). Pure — no Foundry.
 *
 * SR3ECombat stores the round as a queue of `{ id, score, pass }` slots plus an index, built once at the
 * start of the round. A combatant removed mid-round (the GM taking out someone knocked out) used to leave
 * its slots behind, and two things went wrong — seen in play, 2026-10-23, as "the tracker fails after 4 or 5
 * rounds":
 * - Removing the ACTING combatant: Foundry moves its own `turn` on to the next row, but the stored index still
 *   pointed at the removed slot, so End Turn advanced onto the combatant already shown — they acted twice.
 * - A removed combatant's LATER slot had no row, `_applySlot` fell back to `turn: 0`, and whoever sat at the
 *   top of the tracker got an extra turn.
 *
 * `prune` drops every slot whose combatant is gone and moves the index with the slots that remain:
 * - a removed slot BEFORE the index shifts it down by one, so whoever is acting stays acting;
 * - the acting slot itself removed → the index lands on the next surviving slot, who acts now (what Foundry's
 *   tracker already shows);
 * - nothing left after it → the index equals the new length: the round is over, and the next End Turn starts
 *   the next round.
 */
export const RoundQueue = {
  /**
   * @param {Array<{id: string}>} queue
   * @param {number} index
   * @param {Iterable<string>} liveIds - ids of the combatants still in the combat
   * @returns {{ queue: Array, index: number, changed: boolean, actingRemoved: boolean, removedSlot: object|null }}
   *   `actingRemoved` — the slot at `index` was one of those dropped (so `index` now names someone who has not
   *   acted yet, and the caller plays them rather than advancing past them); `removedSlot` is that slot.
   */
  prune(queue, index, liveIds) {
    const live = new Set(liveIds);
    const q = Array.isArray(queue) ? queue : [];
    const kept = q.filter(s => live.has(s.id));
    const at = Math.min(Math.max(0, Number(index) || 0), q.length);
    const before = q.slice(0, at).filter(s => live.has(s.id)).length;
    const acting = q[at] ?? null;
    const actingRemoved = !!acting && !live.has(acting.id);
    return { queue: kept, index: before, changed: kept.length !== q.length, actingRemoved, removedSlot: actingRemoved ? acting : null };
  },
};
