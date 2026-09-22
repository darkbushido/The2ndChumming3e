const {
  StringField, NumberField, BooleanField,
  SchemaField, ArrayField, HTMLField, ObjectField,
} = foundry.data.fields;

/**
 * Attribute Boost state, per boostable Physical Attribute · *SR3 p.168-169*
 *
 * The power is ACTIVATED, not passive: a Magic Test grants `level` points for `turns`
 * Combat Turns, and when it lapses the adept owes a Drain Resistance Test.
 *
 * ⚠ **Deliberately NOT a `bonus*` field on the item.** That is the channel every other
 * adept power uses, and using it here would make the boost permanent, always-on, untested
 * and undrained — and would stack with the cyberware the power is expressly incompatible
 * with (p.169). Getting this wrong is the entire content of TODO 63.
 *
 * `turns` counts DOWN once per Combat Turn. 0 means inactive; the drain fires on the
 * transition to 0, not on every tick.
 */
function attributeBoostField() {
  const one = () => new SchemaField({
    level: new NumberField({ integer: true, initial: 0, min: 0 }),
    turns: new NumberField({ integer: true, initial: 0, min: 0 }),
  });
  return new SchemaField({ body: one(), quickness: one(), strength: one() });
}

/**
 * Spells the character is sustaining · *SR3 p.178*
 *
 * > "Characters sustaining spells have a +2 target modifier per sustained spell applied to all
 * > tests, including Drain Resistance Tests (but not normal Damage Resistance Tests). You can
 * > simultaneously sustain a number of spells equal to your Sorcery rating."
 *
 * One entry per spell held. `focus` marks one held by a sustaining focus (or a spirit), which the
 * character is NOT concentrating on, so it costs no TN — the GM's call, a tick on the Magic tab.
 * `id` is the entry's own key (a spell can be sustained twice, on two targets).
 */
function sustainedSpellsField() {
  return new ArrayField(new SchemaField({
    id:          new StringField({ required: true, initial: '' }),
    name:        new StringField({ initial: '' }),
    force:       new NumberField({ integer: true, initial: 1, min: 0 }),
    spellItemId: new StringField({ initial: '' }),
    target:      new StringField({ initial: '' }),
    focus:       new BooleanField({ initial: false }),
  }), { initial: [] });
}

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
    // Who was shot at this Combat Phase, in order (TODO 56.2): { phase: 'round|turn', targets: [{ key, tokenId }] }.
    // Prefills the fire dialog's target ordinal and walking-fire metres; scripts/data/phase-targets.mjs.
    targetsThisPhase:        new ObjectField(),
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
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
      biography:               new HTMLField({ initial: '', required: false }),
      notes:                   new HTMLField({ initial: '', required: false }),
      metatype:                new StringField({ initial: 'human' }),
      attributeBoost:          attributeBoostField(),
      // Triggered cyber/bioware, keyed by ITEM ID — see SR3E.triggeredAugmentations.
      // ⚠ An ObjectField because the keys are item ids, which a SchemaField cannot declare.
      augmentations:           new ObjectField(),
      // Drug use, keyed by `DrugRules.drugKey(name)` — doses, Addiction, Tolerance, withdrawal,
      // what is running (M&M pp.108-110, TODO 124). See scripts/data/drug-rules.mjs.
      substances:              new ObjectField(),
      // The Essence hole left by removed cyberware — M&M p.150's Essence Slot option (TODO 53). ONE pooled
      // number (the maintainer: "they just have an essence hole"), filled down by implants fitted into it.
      // ⚠ A RECORD, never a refund: removal leaves `essence.lost` alone (M&M p.147).
      essenceHole:             new NumberField({ initial: 0, min: 0 }),
      // The karma / nuyen ledger · TODO 79. Append-only for players; every entry is derived from
      // the WRITE in SR3EActor._preUpdate, so no call site can forget to record one.
      // { when, kind: 'karma'|'nuyen'|'pool', delta, from, to, reason, by } — scripts/data/ledger.mjs.
      ledger:                  new ArrayField(new ObjectField(), { initial: [] }),
      // Attribute Stress · M&M pp.124-131 (TODO 109), keyed by attribute name ({ body: 3, … }).
      // ⚠ An ObjectField because only the attributes that have taken Stress appear.
      attributeStress:         new ObjectField(),
      // TLE-x from a move-by-wire system · M&M p.60 (TODO 110): { has, surgeries }. Brain surgery
      // corrects it twice at most. Every effect is situational, so nothing reads this on a roll —
      // the sheet states it and the GM applies it. See scripts/data/move-by-wire.mjs.
      tlex:                    new ObjectField(),
      // Cybermancy · M&M pp.50-59 (TODO 111): { is, cds, treatments, cancer }. ⚠ A cyberzombie is the
      // ONE case where Essence may sit at or below 0 — see SR3EActor.essenceValue and essenceState.
      cybermancy:              new ObjectField(),
      // Hands beyond the two everyone has — extra cyber-limbs (TODO 49; SR3 core has no rule, the GM sets it).
      extraHands:              new NumberField({ integer: true, initial: 0, min: 0 }),
      sustainedSpells:         sustainedSpellsField(),
      gender:                 new StringField({ initial: '' }),
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
      // ⚠ SR3 p.244: "each character starts with 1 Karma Pool". This was 0 until
      // 2026-08-31; migration 0.4.5.7 corrects actors already in play. See TODO 80.
      karmaPool:               new NumberField({ integer: true, initial: 1, min: 0 }),
      /* Professional Rating · SR3 NPC stat, and the reason TODO 83 exists: all 62 actors in
       * `sr3e-mr-johnsons-contacts` carry theirs as PROSE in `notes` because there was no
       * field to put it in. 0 = not an archetype / not stated. */
      professionalRating:      new NumberField({ integer: true, initial: 0, min: 0 }),
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
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
      metatype:         new StringField({ initial: 'human' }),
      attributeBoost:   attributeBoostField(),
      augmentations:    new ObjectField(),
      substances:       new ObjectField(),   // drug use — see CharacterData (TODO 124)
      essenceHole:      new NumberField({ initial: 0, min: 0 }),   // TODO 53 — see CharacterData
      // The karma / nuyen ledger · TODO 79. Append-only for players; every entry is derived from
      // the WRITE in SR3EActor._preUpdate, so no call site can forget to record one.
      // { when, kind: 'karma'|'nuyen'|'pool', delta, from, to, reason, by } — scripts/data/ledger.mjs.
      ledger:                  new ArrayField(new ObjectField(), { initial: [] }),
      attributeStress:  new ObjectField(),   // TODO 109 — see CharacterData
      tlex:             new ObjectField(),   // TODO 110 — see CharacterData
      cybermancy:       new ObjectField(),   // TODO 111 — see CharacterData
      extraHands:       new NumberField({ integer: true, initial: 0, min: 0 }),   // TODO 49
      sustainedSpells:  sustainedSpellsField(),
      nuyen:           new NumberField({ integer: true, initial: 0, min: 0 }),
      // ⚠ NpcData has no karma/totalKarma/karmaPool at all — see TODO 83. An NPC that needs
      // a Karma Pool has to be built as a `character`, which is exactly what the 62 shipped
      // Little Black Book contacts are.
      professionalRating: new NumberField({ integer: true, initial: 0, min: 0 }),
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
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
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
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
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
      bookPage:     new StringField({ initial: '' }),   // TODO 117 — every shipped document carries a book and page
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
      /* Who else is aboard — TODO 74. Before this the only passenger list lived on a Chase Scene
       * participant, which exists only while a chase is open, so a crash outside a chase had no
       * way to know who was in the car. The driver is `driverActorId`, never repeated here.
       * `seating` is for display only; nothing caps this list. */
      passengerActorIds: new ArrayField(new StringField()),
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
