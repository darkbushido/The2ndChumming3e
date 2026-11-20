/**
 * The four example characters' pictures — 0.9.1.
 *
 * They shipped pointing at `assets/<Name>.png`, a path that exists only on the maintainer's server, so every
 * other world showed broken art. The pack now carries Foundry's default actor icon (the maintainer, 2026-11-19);
 * this repoints a copy already in a world.
 *
 * ⚠ **This OVERWRITES, and argues for it:** a picture changes only while it is EXACTLY one of the four
 * `assets/…` paths we shipped AND the actor's `_stats.compendiumSource` names the example-characters pack.
 * A GM's own upload (any other path) is never touched. Idempotent: once repointed it yields null.
 *
 * Pure — no Foundry.
 */

export const DEFAULT_ACTOR_IMG = 'icons/svg/mystery-man.svg';
export const PACK = 'sr3e-example-characters';
/** The pack they moved into (TODO 311) — a world actor re-pointed there by the character-pack migration still counts. */
export const PACK_NOW = 'sr3e-sr3-archetypes';
/** The exact paths the pack shipped (as stored, URL-encoded). */
export const SHIPPED = [
  'assets/Human%20Corp%20Enforcer.png', 'assets/Merc%20human.png',
  'assets/Parasecurity%20Expert%20Elf.png', 'assets/Security%20Rigger%20Dwarf.png',
];

export const ExampleCharacterArt = {
  fixActor(actor) {
    const cs = String(actor?._stats?.compendiumSource ?? '');
    if (!cs.includes(PACK) && !cs.includes(PACK_NOW)) return null;
    const delta = {};
    if (SHIPPED.includes(actor.img)) delta.img = DEFAULT_ACTOR_IMG;
    if (!actor.isToken && SHIPPED.includes(actor.prototypeToken?.texture?.src)) {
      delta['prototypeToken.texture.src'] = DEFAULT_ACTOR_IMG;
    }
    return Object.keys(delta).length ? delta : null;
  },
};
