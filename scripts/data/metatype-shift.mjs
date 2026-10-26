/**
 * Metatype Shift — restate an NPC's attributes for another race · TODO 277. Pure — no Foundry.
 *
 * Meet the contact (TODO 262) and the race-agnostic generic NPC (TODO 278) change an NPC's metatype, but the
 * Little Black Book stat block is written for ONE race. The maintainer's rule (2026-10-25): adjust the stats so
 * they match the race while keeping them close to what the book describes —
 *
 *   new = clamp( old − (book race's modifier) + (new race's modifier), 1, new race's Attribute Maximum )
 *
 * Racial Modifications Table · *SR3 p.56* (PDF page 58, verified 2026-10-25):
 *   Dwarf  +1 Body, +2 Strength, +1 Willpower
 *   Elf    +1 Quickness, +2 Charisma
 *   Ork    +3 Body, +2 Strength, −1 Charisma, −1 Intelligence
 *   Troll  +5 Body, −1 Quickness, +4 Strength, −2 Intelligence, −2 Charisma
 * Human (and `other`) have none. The same table is documented at `SR3E.racialLimits` / config.js; it is restated
 * here because this module is pure, and `tests/metatype-shift.test.mjs` checks every row against the book.
 *
 * The maximum is `round(limit × 1.5)` from the Racial Attribute Limit Table (p.244-245): the caller passes
 * `SR3E.racialLimits` and `SR3EActor.racialMax`, so there is still one reading of it.
 *
 * ⚠ Stored ratings already INCLUDE the racial part (a finished sheet's troll Body 10 is printed 10), so only the
 *   DIFFERENCE between the two races is applied. Essence, Magic, Reaction (derived) and skills are never touched.
 * ⚠ Troll dermal armour (+1 Body), troll Reach and low-light / thermographic vision follow `system.metatype`
 *   (`SR3E.racialDermalArmor`, `SR3E.racialReach`, `SR3E_RACIAL_VISION`), so changing the metatype carries them.
 *   A dwarf's +2 Body against disease and toxins (p.56) is not modelled anywhere (TODO 98).
 * ⚠ Metavariants are out of scope: an unknown metatype counts as human (no modifiers).
 */

export const RACIAL_MODS = {
  human: {},
  elf:   { quickness: 1, charisma: 2 },
  dwarf: { body: 1, strength: 2, willpower: 1 },
  ork:   { body: 3, strength: 2, charisma: -1, intelligence: -1 },
  troll: { body: 5, quickness: -1, strength: 4, intelligence: -2, charisma: -2 },
};

export const SHIFT_ATTRIBUTES = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'];

const defaultMax = limit => Math.round((limit ?? 6) * 1.5);

export const MetatypeShift = {
  /** 'troll' for 'Troll ' — an unknown or blank metatype is human. */
  normalise(metatype) {
    const m = String(metatype ?? '').trim().toLowerCase();
    return Object.hasOwn(RACIAL_MODS, m) ? m : 'human';
  },

  /** The modifier a race applies to one attribute. */
  mod(metatype, attribute) {
    return RACIAL_MODS[MetatypeShift.normalise(metatype)][attribute] ?? 0;
  },

  /**
   * @param {Record<string, number>} attrs  current ratings, e.g. `{ body: 9, quickness: 4, … }`
   * @param {string} from  the race the ratings are written for
   * @param {string} to    the race to restate them for
   * @param {{ limits?: Record<string, Record<string, number>>, racialMax?: (limit:number)=>number }} [ctx]
   *        `SR3E.racialLimits` and `SR3EActor.racialMax`; without them a human limit of 6 is used
   * @returns {Record<string, number>}  ONLY the attributes that change
   */
  shift(attrs, from, to, { limits = null, racialMax = defaultMax } = {}) {
    const a = MetatypeShift.normalise(from);
    const b = MetatypeShift.normalise(to);
    const out = {};
    if (a === b) return out;
    for (const attr of SHIFT_ATTRIBUTES) {
      const delta = MetatypeShift.mod(b, attr) - MetatypeShift.mod(a, attr);
      const old = Number(attrs?.[attr]);
      if (!delta || !Number.isFinite(old)) continue;
      const limit = limits?.[b]?.[attr] ?? limits?.human?.[attr] ?? 6;
      const next = Math.max(1, Math.min(racialMax(limit), old + delta));
      if (next !== old) out[attr] = next;
    }
    return out;
  },

  /** Flat update paths for an actor: the new metatype and each changed attribute's `base`. */
  updateFor(changed, to) {
    const update = { 'system.metatype': MetatypeShift.normalise(to) };
    for (const [attr, v] of Object.entries(changed)) update[`system.attributes.${attr}.base`] = v;
    return update;
  },

  /** "Body 10 → 8, Quickness 4 → 5" for the dialog and the chat line. */
  describe(attrs, changed) {
    const label = k => k[0].toUpperCase() + k.slice(1);
    return Object.entries(changed).map(([k, v]) => `${label(k)} ${attrs?.[k]} → ${v}`).join(', ');
  },
};
