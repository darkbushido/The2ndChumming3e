/**
 * Nature spirits — the four classes and the fourteen types · SR3 pp.266-268 (printed pages).
 *
 * Pure data, no Foundry. A nature spirit's attributes come from its CLASS (p.266 names the four: Land, Waters,
 * Sky, Man; p.267 prints each class's line), its powers from its own entry (p.267-268). C, I, W and Magic equal
 * Force; Essence is (F)A. Initiative is printed twice per class — astral and physical (`F + n + 1D6`).
 * The four elementals share the same stat-line shape (their own lines, p.266) and live here too.
 * ⚠ The conjurer's tradition and the spirit's HOME DOMAIN are the only limits on where it can be summoned (p.266).
 */

/** B/Q/S/R as modifiers to Force, the Quickness movement multiplier, initiative bases, and the printed attack. */
const CLASSES = {
  man:    { b: +1, q: +2, s: -2, r: +1, moveX: 3, initAstral: 20, initPhysical: 11, attack: '(F-2)M' },
  land:   { b: +4, q: -2, s: +4, r: -2, moveX: 2, initAstral: 20, initPhysical: 8,  attack: '(F+4)S' },
  sky:    { b: -2, q: +3, s: -3, r: +2, moveX: 4, initAstral: 20, initPhysical: 12, attack: '(F-3)M Stun (wind spirits attack only with powers)' },
  waters: { b: +2, q: 0,  s: 0,  r: -1, moveX: 2, initAstral: 20, initPhysical: 9,  attack: '(F)S Stun' },
};

/** Elementals · SR3 p.266 — each has its own line, since the four differ. `weakness` is printed with the entry. */
const ELEMENT_LINES = {
  air:   { b: -2, q: +3, s: -3, r: +2, moveX: 4, initAstral: 20, initPhysical: 12, attack: 'As powers' },
  earth: { b: +4, q: -2, s: +4, r: -2, moveX: 2, initAstral: 20, initPhysical: 8,  attack: '(F+4)S, +1 Reach' },
  fire:  { b: +1, q: +2, s: -2, r: +1, moveX: 3, initAstral: 20, initPhysical: 11, attack: '(F-2)M' },
  water: { b: +2, q: 0,  s: 0,  r: +1, moveX: 2, initAstral: 20, initPhysical: 11, attack: '(F)S Stun' },
};
const ELEMENTALS = {
  earth_elemental: { label: 'Earth Elemental', line: 'earth', page: 266, powers: ['Engulf', 'Materialization', 'Movement'], weakness: 'Vulnerability (Air)' },
  air_elemental:   { label: 'Air Elemental',   line: 'air',   page: 266, powers: ['Engulf', 'Materialization', 'Movement', 'Noxious Breath', 'Psychokinesis'], weakness: 'Vulnerability (Earth); may be confined by airtight seals' },
  fire_elemental:  { label: 'Fire Elemental',  line: 'fire',  page: 266, powers: ['Engulf', 'Flame Aura', 'Guard', 'Materialization', 'Innate Spell (Flamethrower)'], weakness: 'Vulnerability (Water)' },
  water_elemental: { label: 'Water Elemental', line: 'water', page: 266, powers: ['Engulf', 'Materialization', 'Movement'], weakness: 'Vulnerability (Fire)' },
};

/** Each type: class, home domain, powers exactly as printed, and the printed page of its entry. */
const TYPES = {
  city_spirit:     { label: 'City Spirit',     cls: 'man',    domain: 'Urban',    page: 267, powers: ['Accident', 'Concealment', 'Confusion', 'Fear', 'Guard', 'Materialization', 'Search'] },
  field_spirit:    { label: 'Field Spirit',    cls: 'man',    domain: 'Plains',   page: 267, powers: ['Accident', 'Concealment', 'Guard', 'Materialization', 'Search'] },
  hearth_spirit:   { label: 'Hearth Spirit',   cls: 'man',    domain: 'Home',     page: 267, powers: ['Accident', 'Concealment', 'Confusion', 'Guard', 'Materialization', 'Search'] },
  desert_spirit:   { label: 'Desert Spirit',   cls: 'land',   domain: 'Desert',   page: 267, powers: ['Concealment', 'Guard', 'Materialization', 'Movement', 'Search'] },
  forest_spirit:   { label: 'Forest Spirit',   cls: 'land',   domain: 'Forest',   page: 267, powers: ['Accident', 'Concealment', 'Confusion', 'Fear', 'Guard', 'Materialization'] },
  mountain_spirit: { label: 'Mountain Spirit', cls: 'land',   domain: 'Mountain', page: 267, powers: ['Accident', 'Concealment', 'Guard', 'Materialization', 'Movement', 'Search'] },
  prairie_spirit:  { label: 'Prairie Spirit',  cls: 'land',   domain: 'Prairie',  page: 267, powers: ['Accident', 'Concealment', 'Guard', 'Materialization', 'Movement', 'Search'] },
  mist_spirit:     { label: 'Mist Spirit',     cls: 'sky',    domain: 'Mist',     page: 267, powers: ['Accident', 'Concealment', 'Confusion', 'Guard', 'Materialization', 'Movement'] },
  storm_spirit:    { label: 'Storm Spirit',    cls: 'sky',    domain: 'Storm',    page: 267, powers: ['Concealment', 'Confusion', 'Fear', 'Materialization', 'Innate Spell (Lightning Bolt)'] },
  wind_spirit:     { label: 'Wind Spirit',     cls: 'sky',    domain: 'Air',      page: 267, powers: ['Accident', 'Confusion', 'Guard', 'Materialization', 'Movement', 'Search'] },
  lake_spirit:     { label: 'Lake Spirit',     cls: 'waters', domain: 'Lake',     page: 267, powers: ['Accident', 'Engulf', 'Fear', 'Guard', 'Materialization', 'Movement', 'Search'] },
  river_spirit:    { label: 'River Spirit',    cls: 'waters', domain: 'River',    page: 268, powers: ['Accident', 'Concealment', 'Engulf', 'Fear', 'Guard', 'Materialization', 'Movement', 'Search'] },
  sea_spirit:      { label: 'Sea Spirit',      cls: 'waters', domain: 'Sea',      page: 268, powers: ['Accident', 'Concealment', 'Confusion', 'Engulf', 'Fear', 'Guard', 'Materialization', 'Movement', 'Search'] },
  swamp_spirit:    { label: 'Swamp Spirit',    cls: 'waters', domain: 'Swamp',    page: 268, powers: ['Accident', 'Binding', 'Concealment', 'Confusion', 'Engulf', 'Fear', 'Guard', 'Materialization', 'Movement', 'Search'] },
};

export const NatureSpirits = {
  CLASSES,
  TYPES,
  ELEMENT_LINES,
  ELEMENTALS,

  /** The class line at a Force. Quickness's x-multiplier is the movement multiplier, not a bonus. */
  stats(cls, F) {
    const c = CLASSES[cls] ?? ELEMENT_LINES[cls];
    return {
      body: F + c.b, quickness: F + c.q, strength: F + c.s, charisma: F, intelligence: F, willpower: F,
      essence: F, magic: F, reaction: F + c.r,
      initiative: F + c.initAstral,            // astral; + 1D6
      initiativePhysical: F + c.initPhysical,  // physical; + 1D6
      moveMultiplier: c.moveX,
    };
  },

  /**
   * The `system.attributes` a summoned spirit is created with (nature, elemental and insect alike).
   * ⚠ The book prints a spirit's Reaction (SR3 p.266-268, MitS p.136-137), but `prepareDerivedData` recomputes
   * Reaction as ⌊(Quickness + Intelligence) / 2⌋ unless `reaction.override` is set — so it is written through that
   * override, which stays GM-editable and changes nothing for any other actor.
   */
  attributeData(stats) {
    const a = (v) => ({ value: v, base: v });
    return {
      body: a(stats.body), quickness: a(stats.quickness), strength: a(stats.strength), charisma: a(stats.charisma),
      intelligence: a(stats.intelligence), willpower: a(stats.willpower), essence: a(stats.essence), magic: a(stats.magic),
      reaction: { value: stats.reaction, base: stats.reaction, override: true },
    };
  },
};
