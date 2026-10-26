/**
 * Race-agnostic generic NPCs · TODO 273. Pure — no Foundry.
 *
 * A *Generic NPC* is a Little Black Book archetype (or any NPC) whose tokens are each a different person: when an
 * unlinked token of it is created, a metatype is rolled from the actor's race MIX, the token's own actor data is
 * shifted to that race (`metatype-shift.mjs`) and, if a portrait source is active, it gets a face of that race
 * whose job matches the archetype. The sidebar actor stays the template; nothing here writes it.
 *
 * The mix lives on the actor as `flags.The2ndChumming3e.genericNpc = { mix: 'seattle' | { human: 65, ork: 16, … } }`.
 * ⚠ Reads portrait data through `Portraits` (read-only) and never names a portrait module.
 */
import { DEMOGRAPHICS, Portraits } from './portraits.mjs';
import { MetatypeShift } from './metatype-shift.mjs';

export const GENERIC_FLAG = 'genericNpc';
/** The races a generic can roll: metavariants and `other` carry no stat shift, so they are not offered. */
export const MIX_RACES = ['human', 'ork', 'elf', 'dwarf', 'troll'];

/** "Seattle mix": the maintainer's population figures (`DEMOGRAPHICS`), without `other`. */
export const SEATTLE_MIX = Object.fromEntries(MIX_RACES.map(r => [r, DEMOGRAPHICS[r]]));

export const GenericNpc = {
  /**
   * The weights a flag value stands for: an object → its positive weights over the five races; `'seattle'`,
   * missing or unusable → the Seattle mix (a bad flag never stops a token being created).
   */
  mixOf(value) {
    if (value && typeof value === 'object') {
      const out = {};
      for (const r of MIX_RACES) {
        const w = Number(value[r]);
        if (Number.isFinite(w) && w > 0) out[r] = w;
      }
      if (Object.keys(out).length) return out;
    }
    return { ...SEATTLE_MIX };
  },

  /** A metatype drawn by weight. */
  roll(value, rng = Math.random) {
    return Portraits.rollMetatype(rng, GenericNpc.mixOf(value));
  },

  /** A random face of this race for this job (best match tier first); null when there is none. */
  pickFace(index, { metatype, job, gender, ages }, rng = Math.random) {
    if (!index?.entries?.length || !job) return null;
    const g = gender ?? (rng() < 0.5 ? 'female' : 'male');
    const list = Portraits.candidates(index, { metatype, gender: g, job, ages })
      .filter(e => e.base === metatype && e.job === job);
    if (!list.length) return null;
    const tier = list.filter(e => e.match === list[0].match);
    return tier[Math.floor(rng() * tier.length) % tier.length];
  },

  /**
   * What to write on one token: the rolled race, the shifted attributes and (if there is one) the face.
   * @param {{ attrs: Record<string,number>, bookMetatype: string, mix: any, index?: any, job?: string|null,
   *           ages?: string[]|null, gender?: string|null }} p
   * @returns {{ metatype: string, changed: Record<string,number>, delta: object, texture: string|null, face: object|null }}
   *   `delta` is the partial actor data for `TokenDocument#delta` (`system.metatype`, `system.attributes.<a>.base`,
   *   and the face's gender / ethnicity).
   */
  forToken({ attrs, bookMetatype, mix, index = null, job = null, ages = null, gender = null },
           { rng = Math.random, limits = null, racialMax } = {}) {
    const metatype = GenericNpc.roll(mix, rng);
    const changed = MetatypeShift.shift(attrs, bookMetatype, metatype, { limits, racialMax });
    const system = { metatype };
    if (Object.keys(changed).length) {
      system.attributes = Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, { base: v }]));
    }
    const face = GenericNpc.pickFace(index, { metatype, job, gender, ages }, rng);
    if (face) {
      system.gender = face.gender;
      if (face.ethnicity) system.ethnicity = face.ethnicity;
    }
    return { metatype, changed, delta: { system }, texture: face?.src ?? null, face };
  },
};
