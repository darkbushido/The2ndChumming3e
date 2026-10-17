/**
 * The order of the 🩹 Healing patient list · TODO 208 (requested in play, 2026-10-11). Pure: no Foundry.
 *
 * The party at the top, then the other NPCs, and hostile NPCs at the bottom. ⚠ Only the ORDER changes:
 * everyone stays in the list (a hostile who is hurt can still be treated — the GM decides, not the
 * system). A player character is a player character whatever its token's disposition says, so the
 * party tier wins over hostile. Within a tier, the actors the user owns come first, then by name.
 *
 * The roster stays world-wide on purpose (downtime care happens off the map) — see CLAUDE.md,
 * "Filtering actors for dialog dropdowns".
 */

/** `CONST.TOKEN_DISPOSITIONS.HOSTILE`. */
export const HOSTILE = -1;

export const PatientOrder = {
  HOSTILE,

  /** Is this token disposition hostile? Anything unset or non-numeric is not. */
  isHostile(disposition) { return Number(disposition) === HOSTILE; },

  /** 0 = player character · 1 = any other NPC · 2 = a hostile NPC. */
  tier({ isPlayer = false, hostile = false } = {}) {
    if (isPlayer) return 0;
    return hostile ? 2 : 1;
  },

  /**
   * Sort entries `{ isPlayer, hostile, owned, name, … }` into patient-list order. Returns a new array;
   * the entries themselves are untouched, so a caller can carry its actor along.
   */
  order(entries) {
    return [...entries].sort((a, b) =>
      PatientOrder.tier(a) - PatientOrder.tier(b)
      || Number(!!b.owned) - Number(!!a.owned)
      || String(a.name ?? '').localeCompare(String(b.name ?? '')));
  },
};
