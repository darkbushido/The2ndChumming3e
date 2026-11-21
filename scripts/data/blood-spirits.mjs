/**
 * Blood spirits · MitS p.133-134 (printed pages) — TODO 315.
 *
 * Summoned only by initiates who know the SACRIFICING metamagic (MitS p.134; sacrifice itself p.133). The ritual
 * takes Force hours; the victim is KILLED at its end; the Conjuring Test is against Force, successes = services; the
 * spirit is bound and controlled like an elemental (remote service too, SR3 p.187); Drain is resisted normally (SR3 p.162).
 * The sacrifice caps the Force (the Blood Spirit Table, p.134) — below. Banishing: nothing special printed, normal rules.
 *
 * The stat line (p.134): B F+1, Q (F+2)x3, S F-2, C/I/W F, E (F)A, R F+1; INIT (F+1)+10 physical, (F+1)+20 astral, + 1D6;
 * Attack Strength (M). Powers: Essence Drain, Fear, Guard, Materialization, Noxious Breath. Weakness: Essence Loss (1/day).
 * It keeps within Force x 100 m of sentient beings; feeds with Essence Drain, never above its Force; starved, it turns on
 * its summoner. A free blood spirit loses 1 Essence a week instead; a freed one always turns on its summoner.
 *
 * Ethos: nothing here is applied — the sacrifice, the victim's death and the Essence loss are stated on the card.
 * Pure — no Foundry.
 */

/** Blood Spirit Table, MitS p.134 — the sacrifice → maximum Force. `max: null` = the victim's own rating. */
export const BLOOD_SACRIFICES = {
  small:    { label: 'Small animal (cat, rat)', max: 1 },
  medium:   { label: 'Medium animal (dog, ocelot)', max: 2 },
  large:    { label: 'Large animal (jaguar, horse)', max: 3 },
  mundane:  { label: 'Mundane sentient (max Force = its Essence)', max: null },
  awakened: { label: 'Awakened sentient (max Force = its Magic)', max: null },
};

const POWERS = ['Essence Drain', 'Fear', 'Guard', 'Materialization', 'Noxious Breath'];
const WEAKNESSES = ['Essence Loss (1 point per day)'];

export const BloodSpirits = {
  KEY: 'blood_spirit',
  LABEL: 'Blood Spirit',

  /** The stat line at Force F · MitS p.134. Quickness's "x 3" is the movement multiplier, as on nature spirits. */
  stats(F) {
    return {
      body: F + 1, quickness: F + 2, strength: F - 2, charisma: F, intelligence: F, willpower: F,
      essence: F, magic: F, reaction: F + 1,
      initiative: F + 21,          // astral (F+1)+20; + 1D6
      initiativePhysical: F + 11,  // physical (F+1)+10; + 1D6
      moveMultiplier: 3,
    };
  },

  powers: () => [...POWERS],
  weaknesses: () => [...WEAKNESSES],

  /**
   * Maximum Force a sacrifice allows · MitS p.134. `kind` is a BLOOD_SACRIFICES key; `rating` is a sentient victim's
   * Essence (mundane) or Magic (Awakened); `awakenedAnimal` adds +1 to an animal's cap (a devil rat → 2).
   */
  maxForce(kind, { rating = 0, awakenedAnimal = false } = {}) {
    const s = BLOOD_SACRIFICES[kind];
    if (!s) return null;
    if (s.max == null) return Math.max(0, Math.floor(Number(rating) || 0));
    return s.max + (awakenedAnimal ? 1 : 0);
  },

  /** Does this conjurer know Sacrificing? Metamagics are not a field yet, so: an item name or the notes naming it. */
  knowsSacrificing: ({ itemNames = [], notes = '' } = {}) =>
    [...itemNames, notes].some(s => /sacrific/i.test(String(s ?? ''))),

  /** Warn, never refuse (MitS p.134 limits it to Sacrificing initiates). Always offered; the GM is never warned. */
  summonVerdict({ isGM = false, knowsSacrificing = false } = {}) {
    return { offered: true, warn: !isGM && !knowsSacrificing };
  },

  /** The cost the dialog and card state — never applied. */
  costText: F => `Ritual of ${F} hour${F === 1 ? '' : 's'}; the sacrifice must be KILLED at its end (MitS p.134). ` +
    'Max Force by sacrifice: small animal 1, medium 2, large 3 (+1 if Awakened), mundane sentient its Essence, ' +
    'Awakened sentient its Magic. Nothing is applied — the GM rules on the victim.',

  /** The leash and upkeep, for the card · MitS p.134. */
  leashMeters: F => F * 100,
  upkeepText: F => `Must stay within ${F * 100} m of sentient beings; loses 1 Essence a day and feeds with Essence Drain ` +
    `(never above Force ${F}). Kept from feeding, it turns on its summoner (MitS p.134).`,
};
