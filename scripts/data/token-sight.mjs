/**
 * Prototype-token vision for characters and NPCs already in a world · TODO 262 follow-up.
 *
 * New actors get vision on in `preCreateActor` (`sr3e.js`); the Mr. Johnson's contacts pack ships it on. A
 * character or NPC already in a world is its own copy and keeps a blind prototype token. The maintainer,
 * 2026-10-25: "Migrate characters/NPCs."
 *
 * ⚠ **The PROTOTYPE token only.** A token already placed on a scene keeps its own vision — a GM may have
 * blinded it on purpose — so an unlinked token actor (`isToken`) yields null.
 *
 * Pure — no Foundry.
 */
export const TokenSight = {
  /** Types whose prototype token is turned to see. */
  TYPES: ['character', 'npc'],

  /** `{ 'prototypeToken.sight.enabled': true }` for a world character/NPC whose prototype is blind, else null. */
  fixActor(actor) {
    if (!actor || actor.isToken) return null;
    if (!TokenSight.TYPES.includes(actor.type)) return null;
    if (actor.prototypeToken?.sight?.enabled === true) return null;
    return { 'prototypeToken.sight.enabled': true };
  },
};
