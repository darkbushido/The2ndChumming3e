/**
 * NPC-side corners in their own colour · TODO 246
 *
 * Reported in play (2026-10-23): "in the melee window i rolled for the player by accident.
 * kinda want the npcs to use a different colored button". The GM owns every actor, so on a
 * two-corner card both corners' Submit buttons are live for the GM and look identical.
 *
 * A corner whose actor is NOT a player's character gets the `sr-corner-npc` class and a
 * tooltip naming it, so the GM can tell at a glance which button is theirs to press.
 *
 * ⚠ "A player's character" = `SR3EQuery.isPlayerCharacter` (assigned or EXPLICIT Owner) —
 * never `hasPlayerOwner`, which default ownership would make true for every goon. The
 * predicate is passed in so this stays pure (the same shape as `Funds.giftParties`).
 *
 * A corner with no actor (an owner id that resolves to nothing) can only be decided by the
 * GM (`_isDeciderId` fails closed), so it is the GM's side too and is coloured.
 *
 * The colour is applied by actor, not by viewer: a player sees the NPC corner coloured as
 * well, and their own corner exactly as before. That is deliberate — it is information, and
 * it reads the same on every client.
 */
export const NPC_CORNER_CLASS = 'sr-corner-npc';

export const NpcCorner = {
  /** Is this corner the GM's side? `actor` may be null; `isPC` is the PC predicate. */
  isNpc(actor, isPC) {
    if (!actor) return true;
    return !isPC(actor);
  },

  /**
   * The extra class and tooltip for one corner's button.
   * → `{ npc, cls, title }` — `cls` and `title` are '' for a player's corner.
   */
  decorate(actor, label, isPC) {
    if (!NpcCorner.isNpc(actor, isPC)) return { npc: false, cls: '', title: '' };
    const name = String(label || actor?.name || '').trim();
    return {
      npc:   true,
      cls:   NPC_CORNER_CLASS,
      title: name ? `NPC — ${name} (the GM's side)` : `NPC (the GM's side)`,
    };
  },
};
