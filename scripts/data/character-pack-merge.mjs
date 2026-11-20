/**
 * The four example characters moved into the Characters pack — 0.9.1 · TODO 311.
 *
 * `sr3e-example-characters` was folded into `sr3e-sr3-archetypes` (the maintainer, 2026-11-19), keeping every `_id`.
 * A world copy's `_stats.compendiumSource` still names the old pack, so "update from source" and the template flag's
 * provenance would dangle. This re-points it. Only the four moved ids, and only a `Compendium.<system>.<old pack>.Actor.<id>`
 * source; anything else is left alone. Idempotent — once re-pointed it yields null.
 *
 * Pure — no Foundry.
 */
export const OLD_PACK = 'sr3e-example-characters';
export const NEW_PACK = 'sr3e-sr3-archetypes';
/** The four moved actors' ids (unchanged by the move). */
export const MOVED_IDS = ['e6hEWEVm4CWUqJh7', 'ltiJ2SPBBe9G2pd2', 'SSFORWvZ3Orji6oU', 'h5MpeU0ws0L2oFYL'];

export const CharacterPackMerge = {
  /** The re-pointed source, or null when `source` isn't one of the four in the old pack. */
  repoint(source) {
    const m = /^(Compendium\.[^.]+\.)sr3e-example-characters(\.Actor\.)([^.]+)$/.exec(String(source ?? ''));
    return m && MOVED_IDS.includes(m[3]) ? `${m[1]}${NEW_PACK}${m[2]}${m[3]}` : null;
  },
  fixActor(actor) {
    const to = CharacterPackMerge.repoint(actor?._stats?.compendiumSource);
    return to ? { '_stats.compendiumSource': to } : null;
  },
};
