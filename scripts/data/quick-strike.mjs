/**
 * Quick Strike · *Magic in the Shadows p.151* (TODO 78). Pure — no Foundry.
 *
 * > "This power allows the adept to act first in one Initiative Pass per Combat Turn. This action uses
 * > up the adept's action for that Initiative Pass. This power cannot be used during an Initiative Pass
 * > when the adept does not have an action. The adept's Initiative Score is not affected. The adept must
 * > be unwounded to use this ability."
 *
 * The round's order is a stored queue of `{ id, score, pass }` slots with an index (SR3ECombat). Quick
 * Strike is a MOVE in that queue: the adept's own pending slot in the current pass comes forward to the
 * index and plays now. So:
 * - ⚠ **No initiative write.** "The adept's Initiative Score is not affected." An initiative bonus would
 *   show a number the character does not have and would carry into every pass.
 * - ⚠ **Moved, not copied.** "Uses up the adept's action for that Initiative Pass." Nobody gains a slot.
 * - ⚠ **Only with an action in this pass.** No pending slot → refused.
 * - **Once per Combat Turn:** a combatant flag holding the round it was used in.
 * - ⚠ **"Unwounded" = NO INJURY MODIFIER — the maintainer's ruling, 2026-09-15.** MITS p.151 does not
 *   define it; the ruling may be revisited if another book does. Read off the derived `woundMod`
 *   (Damage Modifiers, SR3 p.126), so what lowers that modifier — Pain Resistance (SR3 p.170), Damage
 *   Compensators (M&M p.71), a stim — counts. A wounded adept still gets a confirm the GM can accept.
 * - It is meant for the START of a pass. Used later, it plays the adept next, which is the nearest the
 *   tracker can come; the card says so.
 * - A mid-round initiative edit rebuilds the queue from the scores and drops the move.
 */
export const QuickStrike = {
  COST: 3,
  PAGE: 'MITS p.151',

  /** Is this an adept power item named Quick Strike? */
  isPower(item) {
    return item?.type === 'adeptpower' && /^quick\s*strike/i.test(String(item?.name ?? '').trim());
  },

  /** No injury modifier — the maintainer's ruling (see above). `woundMod` is 0 or negative. */
  unwounded(sys) {
    return (Number(sys?.woundMod) || 0) === 0;
  },

  /** Already used this Combat Turn? `usedRound` is the combatant's flag. */
  usedThisTurn(usedRound, round) {
    return usedRound !== undefined && usedRound !== null && Number(usedRound) === Number(round);
  },

  /** Where the adept's pending slot in the current pass sits, or -1. */
  pendingSlot(queue, index, id) {
    const pass = queue?.[index]?.pass;
    if (pass === undefined) return -1;
    for (let j = index; j < queue.length; j++) if (queue[j].id === id && queue[j].pass === pass) return j;
    return -1;
  },

  /**
   * The queue with the adept's slot moved to `index`.
   * @returns {{ ok: boolean, reason?: string, queue?: Array, from?: number, first?: boolean }}
   *   `first` — whether this is the start of the pass (nobody in it has acted yet).
   */
  apply(queue, index, id) {
    const j = QuickStrike.pendingSlot(queue, index, id);
    if (j < 0) return { ok: false, reason: 'no action left in this Initiative Pass' };
    if (j === index) return { ok: false, reason: 'already acting now' };
    const q = queue.slice();
    const [slot] = q.splice(j, 1);
    q.splice(index, 0, slot);
    const first = index === 0 || queue[index - 1]?.pass !== queue[index].pass;
    return { ok: true, queue: q, from: j, first };
  },
};
