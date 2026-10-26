/**
 * Whether a new actor's tokens are LINKED to its sheet · TODO 267. Pure — no Foundry.
 *
 * Linked (the default here since TODO 260's predecessors): the token IS the sheet — a PC's wounds, pools and
 * Karma are one record wherever they are looked at. Unlinked: each token on the map is its own copy, and the
 * sidebar sheet stays the stat block.
 *
 * ⚠ **An NPC is unlinked** (the maintainer, 2026-10-25): its Karma Pool is the book's number for the stat
 * block (SR3 p.248), and a point burned in a fight (p.246, "gone forever") belongs to the goon on the map,
 * not to every copy dragged out afterwards. That covers the `npc` type and the Little Black Book contacts,
 * which ship as `character` actors but are NPC archetypes (recognised by their book citation, as migration
 * 0.4.5.11 does). Every other character stays linked.
 * ⚠ Decided by WHAT the actor is, not by the incoming `prototypeToken.actorLink`: the Little Black Book pack
 * states `true` on all 62, and older NPCs were all created linked, so a copy would carry it. Only creation is
 * decided here — a GM who wants a named NPC as one record ticks Link Actor Data on its prototype token.
 */
import { isJohnsonNote } from './johnson-notes.mjs';

export const TokenLink = {
  PAGE: 'TODO 267',

  /**
   * @param {{type: string, notes?: string}} a  the new actor's type and `system.notes`
   * @returns {boolean} whether the actor's tokens should be linked.
   */
  linked({ type, notes = '' } = {}) {
    if (type === 'npc') return false;
    if (type === 'character' && isJohnsonNote(String(notes ?? ''))) return false;
    return true;
  },
};
