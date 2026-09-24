import { CHARGEN_SPEC_GAP } from './skill-rules.mjs';
const {
  StringField, NumberField, BooleanField,
  SchemaField, ArrayField, HTMLField, ObjectField,
} = foundry.data.fields;

// ── Weapons ───────────────────────────────────────────────────────────────────

export class MeleeData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.reach == null || typeof source.reach !== 'number') {
      source.reach = parseInt(source.reach) || 0;
    }
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      category:       new StringField({ initial: '' }),
      concealability: new StringField({ initial: '' }),
      // In hand, drawn, nocked (SR3 p.107, TODO 47). Initial TRUE: everything already on a sheet reads
      // as ready — a world of characters who suddenly cannot fight would be worse than the bug.
      ready:          new BooleanField({ initial: true }),
      // Hands it takes — 0, 1 or 2 (TODO 49). Blank = the category's default (scripts/data/hands.mjs);
      // the shipped packs store it, and a GM sets it for the edges (a one-handed crossbow).
      hands:          new NumberField({ integer: true, nullable: true, initial: null, min: 0, max: 2 }),
      reach:          new NumberField({ integer: true, initial: 0, min: 0 }),
      damage:         new StringField({ initial: '' }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      bookPage:       new StringField({ initial: '' }),
      legal:          new BooleanField({ initial: true }),
      notes:          new HTMLField({ initial: '', required: false }),
      isFocus:        new BooleanField({ initial: false }),
      focusActive:    new BooleanField({ initial: false }),
    };
  }
}

export class ProjectileData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      category:       new StringField({ initial: '' }),
      concealability: new StringField({ initial: '' }),
      // In hand, drawn, nocked (SR3 p.107, TODO 47). Initial TRUE: everything already on a sheet reads
      // as ready — a world of characters who suddenly cannot fight would be worse than the bug.
      ready:          new BooleanField({ initial: true }),
      // Hands it takes — 0, 1 or 2 (TODO 49). Blank = the category's default (scripts/data/hands.mjs);
      // the shipped packs store it, and a GM sets it for the edges (a one-handed crossbow).
      hands:          new NumberField({ integer: true, nullable: true, initial: null, min: 0, max: 2 }),
      strMin:         new NumberField({ integer: true, initial: 0, min: 0 }),
      damage:         new StringField({ initial: '' }),
      quantity:       new NumberField({ integer: true, initial: 0, min: 0 }),
      // Bows/crossbows nock a single arrow/bolt from the ammo stockpile (capacity 1).
      loadedAmmoType: new StringField({ initial: 'regular' }),
      loadedRounds:   new NumberField({ integer: true, initial: 0, min: 0 }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      legal:          new BooleanField({ initial: true }),
      bookPage:       new StringField({ initial: '' }),
      notes:          new HTMLField({ initial: '', required: false }),
      isAoE:          new BooleanField({ initial: false }),
      // Blast falloff in the book's notation — "-1/m", "-1/.5m" (SR3 p.119, p.283; TODO 150). Blank = -1/m.
      blast:          new StringField({ initial: '' }),
      // An area grenade with no damage — gas, smoke, flash (SR3 p.283; TODO 155): the marked radius in metres
      // and the effect the card states. Read only when the Damage Code is not a usable code.
      areaRadius:     new NumberField({ nullable: true, initial: null, min: 0 }),
      areaEffect:     new StringField({ initial: '' }),
      // Uses the flechette rules (SR3 p.116, p.119; TODO 156). An (f) in the Damage Code says the level
      // increase is already in it, so only the armour rule applies; ticked on a plain code, all of it does.
      flechette:      new BooleanField({ initial: false }),
    };
  }
}

export class ThrownData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      category:       new StringField({ initial: '' }),
      concealability: new StringField({ initial: '' }),
      // In hand, drawn, nocked (SR3 p.107, TODO 47). Initial TRUE: everything already on a sheet reads
      // as ready — a world of characters who suddenly cannot fight would be worse than the bug.
      ready:          new BooleanField({ initial: true }),
      // Hands it takes — 0, 1 or 2 (TODO 49). Blank = the category's default (scripts/data/hands.mjs);
      // the shipped packs store it, and a GM sets it for the edges (a one-handed crossbow).
      hands:          new NumberField({ integer: true, nullable: true, initial: null, min: 0, max: 2 }),
      strMin:         new NumberField({ integer: true, initial: 0, min: 0 }),
      damage:         new StringField({ initial: '' }),
      quantity:       new NumberField({ integer: true, initial: 0, min: 0 }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      legal:          new BooleanField({ initial: true }),
      bookPage:       new StringField({ initial: '' }),
      notes:          new HTMLField({ initial: '', required: false }),
      isAoE:          new BooleanField({ initial: false }),
      blast:          new StringField({ initial: '' }),   // as on ProjectileData (TODO 150)
      // An area grenade with no damage — gas, smoke, flash (SR3 p.283; TODO 155): the marked radius in metres
      // and the effect the card states. Read only when the Damage Code is not a usable code.
      areaRadius:     new NumberField({ nullable: true, initial: null, min: 0 }),
      areaEffect:     new StringField({ initial: '' }),
      // Uses the flechette rules (SR3 p.116, p.119; TODO 156). An (f) in the Damage Code says the level
      // increase is already in it, so only the armour rule applies; ticked on a plain code, all of it does.
      flechette:      new BooleanField({ initial: false }),
    };
  }
}

export class FirearmData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      category:        new StringField({ initial: '' }),
      concealability:  new StringField({ initial: '' }),
      // In hand, drawn, nocked (SR3 p.107, TODO 47). Initial TRUE: everything already on a sheet reads
      // as ready — a world of characters who suddenly cannot fight would be worse than the bug.
      ready:          new BooleanField({ initial: true }),
      // Hands it takes — 0, 1 or 2 (TODO 49). Blank = the category's default (scripts/data/hands.mjs);
      // the shipped packs store it, and a GM sets it for the edges (a one-handed crossbow).
      hands:          new NumberField({ integer: true, nullable: true, initial: null, min: 0, max: 2 }),
      ammunition:      new StringField({ initial: '' }),
      equippedAmmoId:  new StringField({ initial: '' }),
      mode:            new StringField({ initial: '' }),
      damage:          new StringField({ initial: '' }),
      recoilMod:       new NumberField({ integer: true, initial: 0, min: 0 }),
      rangeOverride:   new StringField({ initial: '' }),  // "S/M/L/E" metres, e.g. "5/15/30/50"
      loadedAmmoType:  new StringField({ initial: 'regular' }),
      loadedRounds:    new NumberField({ integer: true, initial: 0, min: 0 }),
      weight:          new NumberField({ initial: 0, min: 0 }),
      availability:    new StringField({ initial: '' }),
      cost:            new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:     new StringField({ initial: '' }),
      accessories:     new StringField({ initial: '' }),
      // Built-in smartgun system / laser sight (TODO 18). Null = not recorded, and the free-text
      // `accessories` is read instead (WeaponAccessories.flag); the shipped packs store true/false.
      smartgun:        new BooleanField({ nullable: true, initial: null }),
      laserSight:      new BooleanField({ nullable: true, initial: null }),
      // Shotgun choke, 2-10 (SR3 p.117, TODO 57) — set in the fire dialog and remembered. Blank = 5.
      choke:           new NumberField({ integer: true, nullable: true, initial: null, min: 2, max: 10 }),
      // Uses the flechette rules (SR3 p.116, p.119; TODO 156). An (f) in the Damage Code says the level
      // increase is already in it, so only the armour rule applies; ticked on a plain code, all of it does.
      flechette:       new BooleanField({ initial: false }),
      bookPage:        new StringField({ initial: '' }),
      notes:           new HTMLField({ initial: '', required: false }),
      isAoE:           new BooleanField({ initial: false }),
    };
  }
}

export class AmmunitionData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      concealability: new StringField({ initial: '' }),
      damage:         new StringField({ initial: '' }),
      ammoType:       new StringField({ initial: 'regular' }),
      loadMechanism:  new StringField({ initial: 'c' }),
      rounds:         new NumberField({ integer: true, initial: 0, min: 0 }),  // stockpile total owned
      // TODO 114 — a stock of pre-filled clips / speed-loaders / cylinders is counted in RELOADS,
      // not rounds: `reloads` of them, each holding `roundsPerReload` (0 = fills the gun).
      // Rules in scripts/data/ammo-stock.mjs.
      countedIn:      new StringField({ initial: 'rounds', choices: ['rounds', 'reloads'] }),
      reloads:        new NumberField({ integer: true, initial: 0, min: 0 }),
      roundsPerReload: new NumberField({ integer: true, initial: 0, min: 0 }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      bookPage:       new StringField({ initial: '' }),
      notes:          new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Armor ─────────────────────────────────────────────────────────────────────

export class ArmorData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      concealability: new StringField({ initial: '' }),
      ballistic:      new NumberField({ integer: true, initial: 0, min: 0 }),
      impact:         new NumberField({ integer: true, initial: 0, min: 0 }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      bookPage:       new StringField({ initial: '' }),
      notes:          new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Gear / Skills / Qualities ─────────────────────────────────────────────────

export class GearData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      quantity:    new NumberField({ integer: true, initial: 1, min: 0 }),
      // The book's table the item comes from ("Surveillance and Security", "Chips", …) and its
      // Concealability — both columns the generator carries; the default-books gear packs fill them.
      category:       new StringField({ initial: '' }),
      concealability: new StringField({ initial: '' }),
      // ⚠ **Gear had NO rating field until 0.5.2**, so a Medkit [6] carried its rating only in
      // its name, and a TypeDataModel DROPS undeclared keys — the importer's Rating could not
      // have survived even if it had been written. Read it through `itemRating()`
      // (`scripts/data/item-rating.mjs`), which falls back to the name while this is 0.
      rating:       new NumberField({ integer: true, nullable: true, initial: null, min: 0 }),   // null = no rating (TODO 118)
      cost:         new NumberField({ integer: true, initial: 0, min: 0 }),
      weight:       new NumberField({ initial: 0, min: 0 }),
      availability: new StringField({ initial: '' }),
      streetIndex:  new StringField({ initial: '' }),
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document needs one
      description:  new HTMLField({ initial: '', required: false }),
    };
  }
}

export class SkillData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (typeof source.specialisation === 'string' && source.specialisation !== '' && !Array.isArray(source.specialisations)) {
      source.specialisations = [{ name: source.specialisation, level: CHARGEN_SPEC_GAP }];
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
      rating:          new NumberField({ integer: true, initial: 1, min: 0 }),
      force:           new NumberField({ integer: true, initial: 0, min: 0 }),
      category:        new StringField({ initial: '' }),
      skillType:       new StringField({ initial: 'active' }),   // 'active' | 'knowledge' | 'language'
      skillName:       new StringField({ initial: '' }),
      linkedAttribute: new StringField({ initial: 'quickness' }),
      specialisation:  new StringField({ initial: '' }),
      specialisations: new ArrayField(new SchemaField({
        name:  new StringField({ initial: '' }),
        level: new NumberField({ integer: true, initial: 1, min: 1, max: 2 }),
      }), { initial: [] }),
      description:     new HTMLField({ initial: '', required: false }),
    };
  }
}

export class QualityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
      qualityType:  new StringField({ initial: 'positive' }),
      karmaCost:    new NumberField({ integer: true, initial: 0 }),
      description:  new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Cyberware / Bioware ───────────────────────────────────────────────────────

export class CyberwareData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      /* ⚠ **The upstream (Shadowrun Character Generator) name, when `name` was expanded to the
       * book's wording** — TODO 87. `SRCG_BONUSES` is keyed by the upstream name and is
       * GENERATED from upstream data, so renaming the display name without keeping this would
       * silently stop 151 bonus entries from matching on the next regeneration. Blank means the
       * name was never abbreviated and `name` is already the join key.
       * Read it through `SR3EActor.srcgKey(item)`, never directly. */
      srcgName:     new StringField({ initial: '' }),
      essenceCost:       new NumberField({ initial: 0.5, min: 0 }),
      // Fitted into an Essence hole left by removed cyberware — M&M p.150's Essence Slot surgery
      // option, +2 Threshold (TODO 53). ⚠ Opt-in, and read only when the implant is installed.
      essenceSlot:       new BooleanField({ initial: false }),
      // Wear and damage · M&M pp.124-131 (TODO 109). New implants start at 0; used cyberware starts
      // with 1D6÷2 permanent. The Stress Test's TN is this total; scripts/data/stress.mjs.
      stress:            new NumberField({ integer: true, initial: 0, min: 0 }),
      // Cyberlimb Integrity Enhancement (M&M p.39) lowers a Stress Test's TN by its rating.
      integrity:         new NumberField({ integer: true, initial: 0, min: 0 }),
      grade:             new StringField({ initial: 'Standard' }),
      // ⚠ **Nullable: null means NO rating, and the name is not consulted** (TODO 122, the
      // maintainer: "a column where nil means no rating"). A legacy 0 still falls through to the
      // name — see scripts/data/item-rating.mjs for the three rows and why the 0 has to stay
      // readable. Every bracketed cyberware entry in the shipped packs already stores its rating.
      rating:            new NumberField({ integer: true, nullable: true, initial: null, min: 0 }),
      cost:              new NumberField({ integer: true, initial: 0, min: 0 }),
      availability:      new StringField({ initial: '' }),
      streetIndex:       new NumberField({ initial: 0, min: 0 }),
      legalCode:         new StringField({ initial: '' }),
      mods:              new StringField({ initial: '' }),
      capacity:          new NumberField({ initial: 0, min: 0 }),
      cyberwareCategory: new StringField({ initial: '' }),
      isReplacement:     new BooleanField({ initial: false }),
      bookPage:          new StringField({ initial: '' }),
      description:       new HTMLField({ initial: '', required: false }),
      // ⚠ NO `min: 0` — these may legitimately be NEGATIVE. Three SR3 entries carry a
      // penalty in their `Mods`: BIODYNE "Enable" Cyberlimbs (-1RCT) and Grade Subdermal
      // Armor [8]/[9] (+3BOD,-1RCT). With a floor of zero the schema silently recorded 0 and
      // the item looked as though it had no Reaction penalty at all — a value dropped with no
      // error anywhere, which is the failure mode this project keeps finding.
      //
      // ⚠ AdeptPowerData deliberately KEEPS its floor, `bonusMag` included: nothing in the
      // data produces a negative adept bonus, and negative Magic feeds Spell Pool and the
      // Essence-derived Magic calculation in ways not worth opening speculatively.
      bonusBod:          new NumberField({ integer: true, initial: 0 }),
      bonusQui:          new NumberField({ integer: true, initial: 0 }),
      bonusStr:          new NumberField({ integer: true, initial: 0 }),
      bonusCha:          new NumberField({ integer: true, initial: 0 }),
      bonusInt:          new NumberField({ integer: true, initial: 0 }),
      bonusWil:          new NumberField({ integer: true, initial: 0 }),
      bonusRea:          new NumberField({ integer: true, initial: 0 }),
      bonusInitDice:     new NumberField({ integer: true, initial: 0 }),
      /* Armour the implant itself provides — Bone Lacing, Dermal Sheath (SR3 p.300, M&M p.27-28).
       * ⚠ **NULLABLE, and null carries meaning** (the `essence.lost` pattern): `null` = take it
       * from the upstream `mods` string (`+1IMP`, `+1BAL`), which every shipped item already
       * carries — so no pack rewrite and no migration were needed. A number, **including 0**,
       * is the GM's and wins outright. Read through `SR3EActor.implantArmor`, never directly.
       * TODO 75. */
      bonusImpact:       new NumberField({ integer: true, nullable: true, initial: null }),
      bonusBallistic:    new NumberField({ integer: true, nullable: true, initial: null }),
      // Dice added to one named skill, e.g. Tailored Pheromones on Negotiation. Feeds the
      // same derived skillBonusDice map as adept Improved Ability, so every roll path and
      // the sheet's bonus column pick it up with no further wiring. The name must match the
      // skill Item's name exactly — the map is keyed by name.
      improvedSkillName: new StringField({ initial: '' }),
      // Comma-separated skill CATEGORIES, e.g. "Combat skills, Physical skills". One item can
      // cover several - Enhanced Articulation (M&M p.66) covers five. Unlike
      // `improvedSkillName`, which is applied automatically at every roll path, a category
      // bonus is OPT-IN per roll and surfaces as a checkbox on the Roll Skill dialog. See
      // SR3EActor.skillCategoryBonus for why the two are deliberately kept apart.
      improvedSkillCategory: new StringField({ initial: '' }),
      improvedSkillDice: new NumberField({ integer: true, initial: 0, min: 0 }),
      essenceCostBase:   new NumberField({ initial: 0, min: 0 }),
      costBase:          new NumberField({ integer: true, initial: 0, min: 0 }),
      availabilityBase:  new StringField({ initial: '' }),
    };
  }
}

export class BiowareData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      /* ⚠ **The upstream (Shadowrun Character Generator) name, when `name` was expanded to the
       * book's wording** — TODO 87. `SRCG_BONUSES` is keyed by the upstream name and is
       * GENERATED from upstream data, so renaming the display name without keeping this would
       * silently stop 151 bonus entries from matching on the next regeneration. Blank means the
       * name was never abbreviated and `name` is already the join key.
       * Read it through `SR3EActor.srcgKey(item)`, never directly. */
      srcgName:     new StringField({ initial: '' }),
      bioIndex:         new NumberField({ initial: 0.25, min: 0 }),
      // Wear and damage · M&M pp.124-131 (TODO 109). Bioware starts with 1 permanent Stress Point.
      stress:           new NumberField({ integer: true, initial: 1, min: 0 }),
      grade:            new StringField({ initial: 'Standard' }),
      rating:           new NumberField({ integer: true, nullable: true, initial: null, min: 0 }),   // null = no rating (TODO 122)
      cost:             new NumberField({ integer: true, initial: 0, min: 0 }),
      availability:     new StringField({ initial: '' }),
      streetIndex:      new NumberField({ initial: 0, min: 0 }),
      mods:             new StringField({ initial: '' }),
      biowareCategory:  new StringField({ initial: '' }),
      bookPage:         new StringField({ initial: '' }),
      description:      new HTMLField({ initial: '', required: false }),
      bonusBod:         new NumberField({ integer: true, initial: 0 }),
      bonusQui:         new NumberField({ integer: true, initial: 0 }),
      bonusStr:         new NumberField({ integer: true, initial: 0 }),
      bonusCha:         new NumberField({ integer: true, initial: 0 }),
      bonusInt:         new NumberField({ integer: true, initial: 0 }),
      bonusWil:         new NumberField({ integer: true, initial: 0 }),
      bonusRea:         new NumberField({ integer: true, initial: 0 }),
      bonusInitDice:    new NumberField({ integer: true, initial: 0 }),
      // Orthoskin's armour (M&M p.68). Nullable, null = from `mods` — see CyberwareData.
      bonusImpact:      new NumberField({ integer: true, nullable: true, initial: null }),
      bonusBallistic:   new NumberField({ integer: true, nullable: true, initial: null }),
      // See CyberwareData — same skill-dice channel (Enhanced Articulation, Tailored
      // Pheromones and friends all have this shape).
      improvedSkillName: new StringField({ initial: '' }),
      // Comma-separated skill CATEGORIES, e.g. "Combat skills, Physical skills". One item can
      // cover several - Enhanced Articulation (M&M p.66) covers five. Unlike
      // `improvedSkillName`, which is applied automatically at every roll path, a category
      // bonus is OPT-IN per roll and surfaces as a checkbox on the Roll Skill dialog. See
      // SR3EActor.skillCategoryBonus for why the two are deliberately kept apart.
      improvedSkillCategory: new StringField({ initial: '' }),
      improvedSkillDice: new NumberField({ integer: true, initial: 0, min: 0 }),
      bioIndexBase:     new NumberField({ initial: 0, min: 0 }),
      costBase:         new NumberField({ integer: true, initial: 0, min: 0 }),
      availabilityBase: new StringField({ initial: '' }),
    };
  }
}

// ── Magic ─────────────────────────────────────────────────────────────────────

export class SpellData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      /* The Force this spell was LEARNED at · SR3 p.178: "Spellcasters learn spells at a specific
       * Force. They can cast the spell at a lower Force, if desired, but can never cast the spell
       * at a higher Force than they have learned."
       * ⚠ **Nullable, and null means NOT RECORDED — not zero.** Every shipped spell predates this
       *   field, so a null must leave the Force uncapped rather than pinning every existing spell
       *   to 0 and making it uncastable. A number caps the cast dialog. */
      force:       new NumberField({ integer: true, nullable: true, initial: null, min: 1 }),
      category:    new StringField({ initial: 'Combat' }),
      type:        new StringField({ initial: 'Physical' }),
      range:       new StringField({ initial: 'LOS' }),
      damage:      new StringField({ initial: '' }),
      /* The track a damaging spell hits · SR3 p.191 — '' (from the name: stun spells Stun, else
       * Physical), 'Physical' or 'Stun'. NOT `type`: Mana/Physical is what the spell can affect.
       * Read only through SR3EItem.spellDealsStun (TODO 169). */
      damageTrack: new StringField({ initial: '', choices: ['', 'Physical', 'Stun'] }),
      duration:    new StringField({ initial: 'Instant' }),
      drain:       new StringField({ initial: '' }),
      target:      new StringField({ initial: '' }),
      bookPage:    new StringField({ initial: '' }),
      description: new HTMLField({ initial: '', required: false }),
    };
  }
}

export class VehicleWeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      weaponType:   new StringField({ initial: '' }),
      mode:         new StringField({ initial: '' }),
      damage:       new StringField({ initial: '' }),
      ammunition:   new StringField({ initial: '' }),
      weight:       new NumberField({ initial: 0, min: 0 }),
      cost:         new NumberField({ integer: true, initial: 0, min: 0 }),
      availability: new StringField({ initial: '' }),
      streetIndex:  new StringField({ initial: '' }),
      bookPage:     new StringField({ initial: '' }),
      notes:        new HTMLField({ initial: '', required: false }),
    };
  }
}

export class VehicleModData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      cost:             new NumberField({ integer: true, initial: 0, min: 0 }),
      availability:     new StringField({ initial: '' }),
      streetIndex:      new StringField({ initial: '' }),
      installEquipment: new StringField({ initial: '' }),
      installTime:      new StringField({ initial: '' }),
      cfCost:           new StringField({ initial: '0' }),
      load:             new StringField({ initial: '' }),
      bookPage:         new StringField({ initial: '' }),
      description:      new HTMLField({ initial: '', required: false }),
    };
  }
}

export class AdeptPowerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      powerCost:        new NumberField({ initial: 0.5, min: 0 }),
      hasLevels:        new BooleanField({ initial: false }),
      level:            new NumberField({ integer: true, initial: 1, min: 1 }),
      improvedSkillName: new StringField({ initial: '' }),
      // As on cyber/bioware - comma-separated skill CATEGORIES, opt-in per roll.
      improvedSkillCategory: new StringField({ initial: '' }),
      // The upstream SRCG `Mods` string, e.g. "+2RCT,+1INI". Declared for the same reason
      // CyberwareData and BiowareData declare it: provenance for the derived bonus fields.
      // ⚠ It was MISSING here until 2026-08-29, and a TypeDataModel drops keys it does not
      // declare — so the 14 adept powers that ship with a `mods` string silently lost it at
      // load, and patching the packs alone could never have worked (TODO 59).
      mods:             new StringField({ initial: '' }),
      bookPage:         new StringField({ initial: '' }),
      description:      new HTMLField({ initial: '', required: false }),
      bonusBod:         new NumberField({ integer: true, initial: 0, min: 0 }),
      bonusQui:      new NumberField({ integer: true, initial: 0, min: 0 }),
      bonusStr:      new NumberField({ integer: true, initial: 0, min: 0 }),
      bonusCha:      new NumberField({ integer: true, initial: 0, min: 0 }),
      bonusInt:      new NumberField({ integer: true, initial: 0, min: 0 }),
      bonusWil:      new NumberField({ integer: true, initial: 0, min: 0 }),
      bonusMag:      new NumberField({ integer: true, initial: 0, min: 0 }),
      bonusRea:      new NumberField({ integer: true, initial: 0, min: 0 }),
      bonusInitDice: new NumberField({ integer: true, initial: 0, min: 0 }),
    };
  }
}

export class SummoningData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
      spiritType: new StringField({ initial: 'earth_elemental' }),
      notes:      new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Matrix ────────────────────────────────────────────────────────────────────

export class ComplexFormData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
      rating:      new NumberField({ integer: true, initial: 1, min: 0 }),
      duration:    new StringField({ initial: '' }),
      fade:        new StringField({ initial: '' }),
      description: new HTMLField({ initial: '', required: false }),
    };
  }
}

export class ProgramData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
      name:             new StringField({ initial: '' }),
      type:             new StringField({ initial: '' }),
      category:         new StringField({ initial: '' }),
      rating:           new NumberField({ integer: true, initial: 0, min: 0 }),
      currentRating:    new NumberField({ integer: true, initial: 0, min: 0 }),
      sizeMp:           new NumberField({ integer: true, initial: 0, min: 0 }),
      multiplier:       new NumberField({ integer: true, initial: 0 }),
      degradable:       new BooleanField({ initial: false }),
      description:      new HTMLField({ initial: '', required: false }),
      associatedPrompt: new StringField({ initial: '' }),
      effect:           new HTMLField({ initial: '', required: false }),
    };
  }
}

export class CyberdeckData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
      era:           new StringField({ initial: '' }),
      cost:          new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:   new NumberField({ initial: 0, min: 0 }),
      availability:  new StringField({ initial: '' }),
      legalityCode:  new StringField({ initial: '4P-S' }),
      weight:        new NumberField({ initial: 0, min: 0 }),
      notes:         new HTMLField({ initial: '', required: false }),
      damage: new SchemaField({
        matrixConditionMonitor: new SchemaField({
          boxes:          new NumberField({ integer: true, initial: 10, min: 1 }),
          current:        new NumberField({ integer: true, initial: 0, min: 0 }),
          woundPenalties: new ArrayField(new NumberField({ integer: true }), { initial: [0, 1, 2, 3, 4, 5] }),
        }),
        burnedSlots: new ArrayField(new ObjectField()),
      }),
      attributes: new SchemaField({
        mpcp: new SchemaField({
          value:      new NumberField({ integer: true, initial: 0 }),
          base:       new NumberField({ integer: true, initial: 0 }),
          multiplier: new NumberField({ integer: true, initial: 8 }),
          costPerMp:  new NumberField({ integer: true, initial: 300 }),
        }),
        firewall: new SchemaField({
          value:      new NumberField({ integer: true, initial: 0 }),
          base:       new NumberField({ integer: true, initial: 0 }),
          multiplier: new NumberField({ integer: true, initial: 8 }),
          costPerMp:  new NumberField({ integer: true, initial: 200 }),
        }),
        response: new SchemaField({
          value:          new NumberField({ integer: true, initial: 0 }),
          base:           new NumberField({ integer: true, initial: 0 }),
          maxLevel:       new NumberField({ integer: true, initial: 0 }),
          initiativeDice: new NumberField({ integer: true, initial: 0 }),
          reactionBonus:  new NumberField({ integer: true, initial: 0 }),
        }),
        memory: new SchemaField({
          total: new NumberField({ integer: true, initial: 0 }),
          used:  new NumberField({ integer: true, initial: 0 }),
          unit:  new StringField({ initial: 'Mp' }),
        }),
        utilitySlots: new SchemaField({
          total:     new NumberField({ integer: true, initial: 0 }),
          available: new NumberField({ integer: true, initial: 0 }),
        }),
        dataTransferRate: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 }),
          unit:  new StringField({ initial: 'Mp per Combat Turn' }),
        }),
        fluxRating: new SchemaField({
          value:    new NumberField({ integer: true, initial: 1 }),
          wireless: new BooleanField({ initial: false }),
        }),
      }),
      derivedStats: new SchemaField({
        matrixInitiative: new SchemaField({
          base:             new NumberField({ integer: true, initial: 0 }),
          dice:             new StringField({ initial: '0d6' }),
          userModeRequired: new StringField({ initial: 'VR-Hot' }),
        }),
        hackingPoolBonus:  new NumberField({ integer: true, initial: 0 }),
        personaStorage:    new NumberField({ integer: true, initial: 0 }),
        iconPhysicalStats: new SchemaField({
          strength:  new NumberField({ integer: true, initial: 0 }),
          quickness: new NumberField({ integer: true, initial: 0 }),
        }),
      }),
      modules:           new ArrayField(new ObjectField()),
      utilitySlotsArray: new ArrayField(new ObjectField()),
      storedUtilities:   new ArrayField(new ObjectField()),
    };
  }
}

// ── Contact ───────────────────────────────────────────────────────────────────

export class ContactData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
      loyalty:    new NumberField({ integer: true, initial: 1, min: 1, max: 6 }),
      connection: new NumberField({ integer: true, initial: 1, min: 1, max: 6 }),
      archetype:  new StringField({ initial: '' }),
      /* The statted archetype this contact is built on · TODO 83.
       *
       * ⚠ **A UUID into the COMPENDIUM, not a world actor id.** `sr3e-mr-johnsons-contacts`
       * ships 62 fully-statted archetypes and nothing linked to them; `archetype` above is
       * free text a GM types. This records which one, so a GM can open the stat block from
       * the contact — and so a future gear-buying flow (TODO 82) has something to read.
       *
       * ⚠ **The free-text `archetype` is KEPT and stays authoritative for display.** A contact
       * may legitimately be an archetype the book does not have, and a link that quietly
       * renamed the row would fight the GM. Linking fills `archetype` only when it is blank. */
      archetypeUuid: new StringField({ initial: '' }),
      notes:      new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Drugs / Toxins / Chemical Compounds ─────────────────────────────────────────

export class DrugData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      category:     new StringField({ initial: '' }),  // Pharmaceutical Compounds / Depressants / Designer Drugs / Hallucinogens / Magical Compounds / Narcotics / Stimulants
      addiction:    new StringField({ initial: '' }),   // e.g. "2M", "4M+3P", "5M/5P" (M=Mental, P=Physical)
      tolerance:    new StringField({ initial: '' }),
      // ⚠ LEGACY: the upstream table's name for the Edge column. The packs now use `edge`, but a
      // world item copied earlier keeps its Edge here — `DrugRules.drugEdge` reads both (TODO 124).
      effect:       new StringField({ initial: '' }),
      edge:         new StringField({ initial: '' }),   // "pre/post", e.g. "5/50" — M&M p.108
      fixFactor:    new StringField({ initial: '' }),   // longest an addict goes between doses, e.g. "2 days"
      damage:       new StringField({ initial: '' }),   // Power + Level, e.g. "6S Stun" — resisted with Body (M&M p.106)
      legality:     new StringField({ initial: '' }),
      speed:        new StringField({ initial: '' }),   // onset time, e.g. "Instant", "10 min", "1D6 hrs"
      vector:       new StringField({ initial: '' }),   // delivery method, e.g. "Inhalation", "Ingestion, Injection"
      availability: new StringField({ initial: '' }),
      cost:         new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:  new StringField({ initial: '' }),
      bookPage:     new StringField({ initial: '' }),
      notes:        new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Medical Equipment / Clinics / Hospitals ─────────────────────────────────────

export class MedicalData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      category:     new StringField({ initial: '' }),  // e.g. "Medical Equipment — General", "Medical Clinics — Alpha Grade", "Hospitals — Delta Grade"
      rating:       new StringField({ initial: '' }),   // some Biotech entries use signed modifiers ("-1", "+2") rather than a plain rating number
      availability: new StringField({ initial: '' }),
      weight:       new StringField({ initial: '' }),
      cost:         new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:  new StringField({ initial: '' }),
      bookPage:     new StringField({ initial: '' }),
      notes:        new HTMLField({ initial: '', required: false }),
    };
  }
}
