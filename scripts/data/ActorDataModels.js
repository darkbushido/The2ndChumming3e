const {
  StringField, NumberField, BooleanField,
  SchemaField, ArrayField, HTMLField, ObjectField,
} = foundry.data.fields;

/** Basic persisted attribute: base, value, mod, force */
function _attr(base = 3) {
  return new SchemaField({
    base:  new NumberField({ required: true, integer: true, initial: base, min: 0, nullable: false }),
    value: new NumberField({ required: true, integer: true, initial: base, min: 0, nullable: false }),
    mod:   new NumberField({ required: true, integer: true, initial: 0, nullable: false }),
    force: new NumberField({ required: true, integer: true, initial: 0, min: 0, nullable: false }),
  });
}

/** Vehicle attribute: base + value only (no mod) */
function _vAttr(base = 0) {
  return new SchemaField({
    value: new NumberField({ integer: true, initial: base, min: 0 }),
    base:  new NumberField({ integer: true, initial: base, min: 0 }),
  });
}

/** Shared pool fields used by both character and npc */
function _pools() {
  return {
    combatPoolSpent:         new NumberField({ integer: true, initial: 0, min: 0 }),
    combatPoolMod:           new NumberField({ integer: true, initial: 0 }),
    spellPoolSpent:          new NumberField({ integer: true, initial: 0, min: 0 }),
    spellPoolMod:            new NumberField({ integer: true, initial: 0 }),
    astralPoolSpent:         new NumberField({ integer: true, initial: 0, min: 0 }),
    astralPoolMod:           new NumberField({ integer: true, initial: 0 }),
    hackingPoolSpent:        new NumberField({ integer: true, initial: 0, min: 0 }),
    spellDefensePool:        new NumberField({ integer: true, initial: 0, min: 0 }),
    spellDefenseSorceryDice: new NumberField({ integer: true, initial: 0, min: 0 }),
    fullDefense:             new BooleanField({ initial: false }),
    fullDefensePool:         new NumberField({ integer: true, initial: 0, min: 0 }),
    recoilCompensation:      new NumberField({ integer: true, initial: 0, min: 0 }),
    roundsFiredThisPhase:    new NumberField({ integer: true, initial: 0, min: 0 }),
    stimBonus:               new NumberField({ integer: true, initial: 0, min: 0 }),
  };
}

/** Rigger electronic-warfare deck stats (character / npc) */
function _ew() {
  return new SchemaField({
    deckRating:     new NumberField({ integer: true, initial: 0, min: 0 }), // remote-control deck rating
    fluxRating:     new NumberField({ integer: true, initial: 0, min: 0 }), // deck Flux
    protocolModule: new NumberField({ integer: true, initial: 0, min: 0 }), // protocol-emulation module
    // BattleTac IVIS Pool — shared by a drone group; refreshes each Combat Turn (max), expires on task end.
    ivisPool: new SchemaField({
      value: new NumberField({ integer: true, initial: 0, min: 0 }),
      max:   new NumberField({ integer: true, initial: 0, min: 0 }),
    }),
  });
}

/** Shared wound track */
function _wounds() {
  return new SchemaField({
    stun: new SchemaField({
      value: new NumberField({ integer: true, initial: 0, min: 0 }),
      max:   new NumberField({ integer: true, initial: 10 }),
    }),
    physical: new SchemaField({
      value: new NumberField({ integer: true, initial: 0, min: 0 }),
      max:   new NumberField({ integer: true, initial: 10 }),
    }),
    overflow: new SchemaField({
      value: new NumberField({ integer: true, initial: 0, min: 0 }),
    }),
  });
}

// ── Character ─────────────────────────────────────────────────────────────────

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      biography:               new HTMLField({ initial: '', required: false }),
      notes:                   new HTMLField({ initial: '', required: false }),
      metatype:                new StringField({ initial: 'human' }),
      gender:                  new StringField({ initial: '' }),
      age:                     new StringField({ initial: '' }),
      height:                  new StringField({ initial: '' }),
      weight:                  new StringField({ initial: '' }),
      ethnicity:               new StringField({ initial: '' }),
      reputation:              new NumberField({ integer: true, initial: 0, min: 0 }),
      notoriety:               new NumberField({ integer: true, initial: 0, min: 0 }),
      streetCred:              new NumberField({ integer: true, initial: 0, min: 0 }),
      nuyen:                   new NumberField({ integer: true, initial: 0, min: 0 }),
      karma:                   new NumberField({ integer: true, initial: 0 }),
      totalKarma:              new NumberField({ integer: true, initial: 0 }),
      karmaPool:               new NumberField({ integer: true, initial: 0, min: 0 }),
      hackingBonus:            new NumberField({ integer: true, initial: 0 }),
      initiativeDiceBonus:     new NumberField({ integer: true, initial: 0, min: 0 }),
      equippedArmor:           new StringField({ initial: '' }),
      equippedMelee:           new StringField({ initial: '' }),
      activeVCRItemId:         new StringField({ initial: '' }),
      equippedCyberdeck:       new StringField({ initial: '' }),
      matrixUserMode:          new StringField({ initial: '' }),
      activeHostId:            new StringField({ initial: '' }),
      currentMatrixNode:       new StringField({ initial: '' }),
      matrixMarks:             new ArrayField(new StringField(), { initial: [] }),
      linkLocked:              new BooleanField({ initial: false }),
      astralMode:              new StringField({ initial: '' }),
      magicTradition:          new StringField({ initial: '' }),
      magicType:               new StringField({ initial: '' }),
      magicTotem:              new StringField({ initial: '' }),
      magicElement:            new StringField({ initial: '' }),
      initiateGrade:           new NumberField({ integer: true, initial: 0, min: 0 }),
      ..._pools(),
      attributes: new SchemaField({
        body:         _attr(3),
        quickness:    _attr(3),
        strength:     _attr(3),
        charisma:     _attr(3),
        intelligence: _attr(3),
        willpower:    _attr(3),
        essence: new SchemaField({
          // `value` is DERIVED (base − lost) and rewritten every prepareDerivedData.
          // Never persist a meaningful number here; write `lost` instead.
          value: new NumberField({ initial: 6, nullable: false }),
          base:  new NumberField({ initial: 6, nullable: false }),
          // Essence loss is PERMANENT (M&M p.147) — removing the cyberware does not
          // refund it.
          //
          // ⚠ NULLABLE, and the null is load-bearing: `null` means "never recorded", so
          // the value is derived from installed cyberware instead (which is how actors
          // saved before this field existed stay correct without a migration script). Any
          // NUMBER — including 0 — is an authoritative statement and overrides the
          // hardware. That is what makes a GM correction stick.
          lost:  new NumberField({ initial: null, min: 0, nullable: true }),
          force: new NumberField({ initial: 0, min: 0 }),
        }),
        magic: new SchemaField({
          value: new NumberField({ integer: true, initial: 0, min: 0 }),
          base:  new NumberField({ integer: true, initial: 0, min: 0 }),
          mod:   new NumberField({ integer: true, initial: 0 }),
          force: new NumberField({ integer: true, initial: 0, min: 0 }),
        }),
        reaction: new SchemaField({
          value:         new NumberField({ integer: true, initial: 3, min: 0 }),
          base:          new NumberField({ integer: true, initial: 3, min: 0 }),
          reactionBonus: new NumberField({ integer: true, initial: 0 }),
          diceBonus:     new NumberField({ integer: true, initial: 0 }),
          override:      new BooleanField({ initial: false }),
          force:         new NumberField({ integer: true, initial: 0, min: 0 }),
        }),
      }),
      wounds:         _wounds(),
      ew:             _ew(),
      // ── Orthodox SR3 matrix decker fields ─────────────────────────────
      // Only surfaced when matrixRuleset === 'orthodox'. Stored directly on
      // the actor so the GM can edit them inline without opening an item sheet.
      orthodoxDeck: new SchemaField({
        deckModel:       new StringField({ initial: '' }),
        mccp:            new NumberField({ integer: true, initial: 0, min: 0 }),
        bod:             new NumberField({ integer: true, initial: 0, min: 0 }),
        evasion:         new NumberField({ integer: true, initial: 0, min: 0 }),
        masking:         new NumberField({ integer: true, initial: 0, min: 0 }),
        sensor:          new NumberField({ integer: true, initial: 0, min: 0 }),
        hardening:       new NumberField({ integer: true, initial: 0, min: 0 }),
        activeMemory:    new NumberField({ integer: true, initial: 0, min: 0 }),
        storageMemory:   new NumberField({ integer: true, initial: 0, min: 0 }),
        ioSpeed:         new NumberField({ integer: true, initial: 0, min: 0 }),
        responseIncrease: new NumberField({ integer: true, initial: 0, min: 0 }),
        sleazeRating:    new NumberField({ integer: true, initial: 0, min: 0 }),
      }),
      orthodoxRunState: new SchemaField({
        securityTally:   new NumberField({ integer: true, initial: 0, min: 0 }),
        alertLevel:      new StringField({ initial: 'none' }),  // none | passive | active
        currentHostId:   new StringField({ initial: '' }),
      }),
      orthodoxMatrixCM: new SchemaField({
        value: new NumberField({ integer: true, initial: 0, min: 0, max: 10 }),
      }),
    };
  }
}

// ── NPC ───────────────────────────────────────────────────────────────────────

export class NpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      metatype:         new StringField({ initial: 'human' }),
      nuyen:            new NumberField({ integer: true, initial: 0, min: 0 }),
      notes:            new HTMLField({ initial: '', required: false }),
      equippedMelee:    new StringField({ initial: '' }),
      activeVCRItemId:  new StringField({ initial: '' }),
      equippedCyberdeck: new StringField({ initial: '' }),
      matrixUserMode:   new StringField({ initial: '' }),
      activeHostId:     new StringField({ initial: '' }),
      currentMatrixNode: new StringField({ initial: '' }),
      matrixMarks:      new ArrayField(new StringField(), { initial: [] }),
      linkLocked:       new BooleanField({ initial: false }),
      astralMode:       new StringField({ initial: '' }),
      magicTradition:   new StringField({ initial: '' }),
      magicType:        new StringField({ initial: '' }),
      magicTotem:       new StringField({ initial: '' }),
      magicElement:     new StringField({ initial: '' }),
      initiateGrade:    new NumberField({ integer: true, initial: 0, min: 0 }),
      ..._pools(),
      attributes: new SchemaField({
        body:         _attr(3),
        quickness:    _attr(3),
        strength:     _attr(3),
        charisma:     _attr(3),
        intelligence: _attr(3),
        willpower:    _attr(3),
        essence: new SchemaField({
          value: new NumberField({ initial: 6 }),
          base:  new NumberField({ initial: 6 }),
          lost:  new NumberField({ initial: null, min: 0, nullable: true }),   // see CharacterData
          force: new NumberField({ initial: 0, min: 0 }),
        }),
        magic: new SchemaField({
          value: new NumberField({ integer: true, initial: 0, min: 0 }),
          base:  new NumberField({ integer: true, initial: 0, min: 0 }),
          force: new NumberField({ integer: true, initial: 0, min: 0 }),
        }),
        reaction: new SchemaField({
          value: new NumberField({ integer: true, initial: 3, min: 0 }),
          base:  new NumberField({ integer: true, initial: 3, min: 0 }),
          bonus: new NumberField({ integer: true, initial: 0 }),
          force: new NumberField({ integer: true, initial: 0, min: 0 }),
        }),
      }),
      wounds:         _wounds(),
      ew:             _ew(),
      orthodoxDeck: new SchemaField({
        deckModel:       new StringField({ initial: '' }),
        mccp:            new NumberField({ integer: true, initial: 0, min: 0 }),
        bod:             new NumberField({ integer: true, initial: 0, min: 0 }),
        evasion:         new NumberField({ integer: true, initial: 0, min: 0 }),
        masking:         new NumberField({ integer: true, initial: 0, min: 0 }),
        sensor:          new NumberField({ integer: true, initial: 0, min: 0 }),
        hardening:       new NumberField({ integer: true, initial: 0, min: 0 }),
        activeMemory:    new NumberField({ integer: true, initial: 0, min: 0 }),
        storageMemory:   new NumberField({ integer: true, initial: 0, min: 0 }),
        ioSpeed:         new NumberField({ integer: true, initial: 0, min: 0 }),
        responseIncrease: new NumberField({ integer: true, initial: 0, min: 0 }),
        sleazeRating:    new NumberField({ integer: true, initial: 0, min: 0 }),
      }),
      orthodoxRunState: new SchemaField({
        securityTally:   new NumberField({ integer: true, initial: 0, min: 0 }),
        alertLevel:      new StringField({ initial: 'none' }),
        currentHostId:   new StringField({ initial: '' }),
      }),
      orthodoxMatrixCM: new SchemaField({
        value: new NumberField({ integer: true, initial: 0, min: 0, max: 10 }),
      }),
    };
  }
}

// ── IC (Intrusion Countermeasure) ─────────────────────────────────────────────

export class ICData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      icType:           new StringField({ initial: 'Scrambler' }),
      grading:          new StringField({ initial: 'White' }),   // 'White' | 'Gray' | 'Black'
      rating:           new NumberField({ integer: true, initial: 1, min: 1 }),
      systemRating:     new NumberField({ integer: true, initial: 6, min: 1 }),  // host's System Rating — TN for attacks, pool for IC soak
      memoryRequired:   new NumberField({ integer: true, initial: 0, min: 0 }),
      damage:           new StringField({ initial: '' }),
      hostSecurityTier: new StringField({ initial: 'Green' }),   // used to derive initiativeDice
      activeHostId:     new StringField({ initial: '' }),
      currentMatrixNode: new StringField({ initial: '' }),
      deployed:         new BooleanField({ initial: false }),
      notes:            new HTMLField({ initial: '', required: false }),
      woundValue:       new NumberField({ integer: true, initial: 0, min: 0 }),
      // ── Orthodox SR3 matrix fields ─────────────────────────────────────────
      // Only used when game setting matrixRuleset === 'orthodox'.
      // Initiative = Rating + Nd6 where N is 1/2/3/4 for Blue/Green/Orange/Red host.
      // Attack pool and damage resistance both use the host's Security Value (SR3 p.223).
      orthodoxIcType:   new StringField({ initial: 'Probe' }),
      orthodoxProactive: new BooleanField({ initial: true }),
    };
  }
}

// ── Programming Agent ─────────────────────────────────────────────────────────

export class AgentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rating:           new NumberField({ integer: true, initial: 1, min: 1 }),
      graded:           new BooleanField({ initial: false }),
      hostSecurityTier: new StringField({ initial: 'Green' }),
      operatorActorId:  new StringField({ initial: '' }),
      activeHostId:     new StringField({ initial: '' }),
      additionalSkills: new ArrayField(new ObjectField(), { initial: [] }),
      utilities:        new ArrayField(new ObjectField(), { initial: [] }),
      specialAbilities: new ArrayField(new ObjectField(), { initial: [] }),
      woundValue:       new NumberField({ integer: true, initial: 0, min: 0 }),
      notes:            new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── DataHost ──────────────────────────────────────────────────────────────────

export class HostData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      systemRating:          new NumberField({ integer: true, initial: 6, min: 1, max: 12 }),
      securityTierName:      new StringField({ initial: 'Green' }),
      securityTierThreshold: new NumberField({ integer: true, initial: 2, min: 0 }),
      securityTierColor:     new StringField({ initial: '#00AA00' }),
      mainframeSupport:      new BooleanField({ initial: false }),
      memoryTotal:           new NumberField({ integer: true, initial: 3000, min: 0 }),
      memoryUsed:            new NumberField({ integer: true, initial: 0, min: 0 }),
      overwatchCurrent:      new NumberField({ integer: true, initial: 0, min: 0, max: 10 }),
      alertCount:            new NumberField({ integer: true, initial: 0, min: 0, max: 2 }),
      notes:                 new HTMLField({ initial: '', required: false }),
      // {id,name,type,abbreviation,iconShape,accessLevel,x,y,description,barrierProtected,barrierRating,markedBy[],prompts[]}
      nodes:       new ArrayField(new ObjectField()),
      // {id,fromId,toId,blocked,blockedBy}
      pathways:    new ArrayField(new ObjectField()),
      // {id,name,connectedNodeId,accessLevel,requiresPasscode,physicalLocation}
      ioPorts:     new ArrayField(new ObjectField()),
      // {step,label,triggered,ic[],description}
      triggerSteps: new ArrayField(new ObjectField()),
      // {actorId,name,memoryRequired}
      stockedIC:   new ArrayField(new ObjectField()),
      // {actorId,name,iconType,currentNodeId,hidden,linkLocked,marks[],marksFalsified}
      activeUsers: new ArrayField(new ObjectField()),
      // {actorId,name,iconType,currentNodeId,hidden,role}
      activeAgents: new ArrayField(new ObjectField()),
      // ── Orthodox SR3 matrix fields ─────────────────────────────────────────
      // Only used when game setting matrixRuleset === 'orthodox'.
      // Defragged fields above are unused in orthodox mode (left in place).
      orthodoxSecurityCode:  new StringField({ initial: 'Green' }), // Blue/Green/Orange/Red/Black
      orthodoxAlertLevel:    new StringField({ initial: 'passive' }), // passive | active | shutdown
      // Security Value — dice pool for IC attack tests and IC damage resistance tests (SR3 p.223)
      orthodoxSecurityValue: new NumberField({ integer: true, initial: 0, min: 0 }),
      // Each subsystem rated independently (0 = subsystem not present on this host)
      orthodoxSubsystems: new SchemaField({
        access:  new NumberField({ integer: true, initial: 0, min: 0 }),
        files:   new NumberField({ integer: true, initial: 0, min: 0 }),
        control: new NumberField({ integer: true, initial: 0, min: 0 }),
        index:   new NumberField({ integer: true, initial: 0, min: 0 }),
        slave:   new NumberField({ integer: true, initial: 0, min: 0 }),
      }),
      // {actorId, name, icType, rating, alertRequired}
      orthodoxActiveIC: new ArrayField(new ObjectField()),
    };
  }
}

// ── Ward (astral barrier, SR3 Core p.174 / MitS p.88-89) ──────────────────────

export class WardData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      force:          new NumberField({ integer: true, initial: 4, min: 0 }),     // derived: maxForce - damage
      maxForce:       new NumberField({ integer: true, initial: 4, min: 1 }),     // Force at creation — also the box-track size
      damage:         new NumberField({ integer: true, initial: 0, min: 0 }),     // boxes filled
      wardType:       new StringField({ initial: 'standard' }),                   // standard | alarm | polarized | masking
      isPermanent:    new BooleanField({ initial: false }),
      weeksRemaining: new NumberField({ integer: true, initial: 0, min: 0 }),      // ignored when isPermanent
      areaRadius:     new NumberField({ initial: 5, min: 0 }),                     // metres, for the boundary marker
      creatorActorId: new StringField({ initial: '' }),
      regionId:       new StringField({ initial: '' }),                           // boundary marker — Region id
      markerId:       new StringField({ initial: '' }),                           // boundary marker — local PIXI fallback id
      sceneId:        new StringField({ initial: '' }),
      notes:          new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Vehicle ───────────────────────────────────────────────────────────────────

export class VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      vehicleType:  new StringField({ initial: 'car' }),
      driverActorId: new StringField({ initial: '' }),
      controlMode:   new StringField({ initial: '' }),
      seating:      new NumberField({ integer: true, initial: 4, min: 0 }),
      entryPoints:  new StringField({ initial: '' }),
      cost:         new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:  new NumberField({ initial: 0, min: 0 }),
      availability: new StringField({ initial: '' }),
      bookPage:     new StringField({ initial: '' }),
      notes:        new HTMLField({ initial: '', required: false }),
      damage: new SchemaField({
        value: new NumberField({ integer: true, initial: 0, min: 0 }),
      }),
      attributes: new SchemaField({
        handling:        _vAttr(3),
        handlingOffRoad: _vAttr(3),
        speed:           _vAttr(0),
        accel:    _vAttr(0),
        body:     _vAttr(4),
        armor:    _vAttr(0),
        sig:      _vAttr(3),
        autonav:  _vAttr(0),
        pilot:    _vAttr(3),
        sensor:   _vAttr(3),
        cargo:    _vAttr(0),
        load:     _vAttr(0),
      }),
      // ── Electronic Warfare (network hub) ──
      ew: new SchemaField({
        ecm:        new NumberField({ integer: true, initial: 0, min: 0 }),
        eccm:       new NumberField({ integer: true, initial: 0, min: 0 }),
        fluxRating: new NumberField({ integer: true, initial: 0, min: 0 }), // vehicle's own transmitters
        footprint:  new NumberField({ integer: true, initial: 0, min: 0 }), // manual override; derived shown live
      }),
      // 3-channel Signal Monitor — 10 boxes each, degradation accumulates from MIJI
      signalMonitor: new SchemaField({
        command:  new NumberField({ integer: true, initial: 0, min: 0, max: 10 }),
        simsense: new NumberField({ integer: true, initial: 0, min: 0, max: 10 }),
        system:   new NumberField({ integer: true, initial: 0, min: 0, max: 10 }),
      }),
      // Infiltration state: which intruder has breached this network, and how far
      infiltration: new SchemaField({
        intruderActorId: new StringField({ initial: '' }),
        turnsRemaining:  new NumberField({ integer: true, initial: 0, min: 0 }), // counts down from 10
        intrusionFactor: new NumberField({ integer: true, initial: 0, min: 0 }),
        command:  new BooleanField({ initial: false }),   // breached channels
        simsense: new BooleanField({ initial: false }),
        system:   new BooleanField({ initial: false }),
      }),
    };
  }
}
