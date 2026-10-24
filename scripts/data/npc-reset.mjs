/**
 * Clear what sidebar NPCs collected through the shared-actor bug · TODO 260. Pure — no Foundry.
 *
 * Until 216fe433, a wound or status put on one unlinked goon landed on its SIDEBAR actor, which every unlinked token
 * of it inherits — so a sidebar NPC in a running world may still carry wounds, Prone, Unconscious, a shock stun…, and
 * every token dragged out of it since started that way. The maintainer asked for a one-off GM tool (2026-10-24).
 *
 * - Only actors whose tokens are UNLINKED (`prototypeToken.actorLink === false`) — the goons the bug reached. A linked
 *   actor (a PC, a named NPC) owns its own damage; it is never offered.
 * - Offer, never apply: the dialog lists what each one carries, nothing starts ticked (TODO 96), the GM confirms.
 * - Clearing = the three wound tracks to 0, every status effect off, the shock-stun count gone. Nothing else (no
 *   pools, no items, no other effects such as drug or augmentation effects without a status).
 * ⚠ A token on a scene that has its OWN damage (stored on the token) keeps it — only what it inherited goes.
 */
export const NpcReset = {
  /** The tokens of this actor are unlinked — a goon template the bug could reach. */
  isShared(actor) {
    return ['npc', 'character'].includes(actor?.type) && actor?.prototypeToken?.actorLink === false;
  },

  /**
   * What this actor carries that a reset would clear.
   * @param {object} actor  `{ system, effects: [{ id, name, statuses: Iterable<string> }], flags }`
   * @returns {{ stun: number, physical: number, overflow: number, effects: Array<{id: string, name: string}>, stunTurns: number }}
   */
  collected(actor) {
    const w = actor?.system?.wounds ?? {};
    const effects = [...(actor?.effects ?? [])]
      .filter(e => [...(e?.statuses ?? [])].length > 0)
      .map(e => ({ id: e.id, name: e.name ?? [...e.statuses][0] }));
    return {
      stun:      Math.max(0, Number(w.stun?.value) || 0),
      physical:  Math.max(0, Number(w.physical?.value) || 0),
      overflow:  Math.max(0, Number(w.overflow?.value) || 0),
      effects,
      stunTurns: Math.max(0, Number(actor?.flags?.The2ndChumming3e?.stunTurns) || 0),
    };
  },

  /** Is there anything to clear? */
  dirty(c) {
    return !!c && (c.stun > 0 || c.physical > 0 || c.overflow > 0 || c.effects.length > 0 || c.stunTurns > 0);
  },

  /** One line for the dialog: "Physical 3 · Stun 2 · Prone, Unconscious · stunned 2 turns". */
  describe(c) {
    const parts = [];
    if (c.physical) parts.push(`Physical ${c.physical}`);
    if (c.stun)     parts.push(`Stun ${c.stun}`);
    if (c.overflow) parts.push(`overflow ${c.overflow}`);
    if (c.effects.length) parts.push(c.effects.map(e => e.name).join(', '));
    if (c.stunTurns) parts.push(`stunned ${c.stunTurns} turn${c.stunTurns === 1 ? '' : 's'}`);
    return parts.join(' · ');
  },

  /** The actor update that zeroes the tracks (only the tracks that need it). */
  woundDelta(c) {
    const d = {};
    if (c.stun)     d['system.wounds.stun.value'] = 0;
    if (c.physical) d['system.wounds.physical.value'] = 0;
    if (c.overflow) d['system.wounds.overflow.value'] = 0;
    return d;
  },

  /** The shared actors worth offering, each with what it carries, by name. */
  offer(actors) {
    return [...(actors ?? [])]
      .filter(a => NpcReset.isShared(a))
      .map(a => ({ actor: a, c: NpcReset.collected(a) }))
      .filter(r => NpcReset.dirty(r.c))
      .sort((x, y) => String(x.actor.name).localeCompare(String(y.actor.name)));
  },
};
