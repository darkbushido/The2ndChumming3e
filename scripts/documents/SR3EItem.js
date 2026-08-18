export class SR3EItem extends Item {

  /**
   * Foundry v13/v14: DocumentStatsField._shimData() installs a deprecated getter on
   * source.flags.exportSource before migrateData runs. When _addDataFieldMigration
   * then calls hasProperty(source, "flags.exportSource"), that getter fires and logs
   * a compatibility warning — even for fresh documents that never had exportSource data.
   * We pre-empt this by removing the shim getter (or migrating real data) ourselves
   * on the raw source object before super can trigger it.
   * @override
   */
  static migrateData(source) {
    if ( source.flags ) {
      const desc = Object.getOwnPropertyDescriptor(source.flags, "exportSource");
      if ( desc?.get ) {
        // Shim getter installed by _shimData — remove it so hasProperty returns false cleanly.
        delete source.flags.exportSource;
      } else if ( desc?.value !== undefined ) {
        // Real pre-v13 data: migrate to _stats ourselves on the plain object.
        source._stats ??= {};
        source._stats.exportSource = {
          worldId:       source.flags.exportSource?.world ?? null,
          uuid:          null,
          coreVersion:   source.flags.exportSource?.coreVersion ?? null,
          systemId:      source.flags.exportSource?.system ?? null,
          systemVersion: source.flags.exportSource?.systemVersion ?? null,
        };
        delete source.flags.exportSource;
      }
    }
    return super.migrateData(source);
  }

  /** @override */
  prepareData() {
    super.prepareData();
    
    if (this.type === 'skill') {
      this._prepareSkill();
    }
  }

  /**
   * Prepare skill data
   * @private
   */
  _prepareSkill() {
    const s = this.system;
    const actor = this.actor;
    
    if (!actor) return;
    
    const attrKey   = s.linkedAttribute || 'quickness';
    const isLan     = attrKey === 'lan';
    const attrValue = isLan ? 0 : (actor.system.attributes?.[attrKey]?.value ?? 0);

    let basePool = s.rating || 0;
    if (s.specialisation && basePool > 0) basePool += 2;

    s.dicePool        = basePool;
    // Category-derived (see _skillTypeOf) — a stored skillType of 'active' may just be
    // the schema default on a skill that was created without the field being set.
    s.canDefault      = !isLan && SR3EItem._skillTypeOf(this) !== 'language';
    // SR3: defaulting to an attribute uses the FULL attribute (TN +4, no pool dice).
    s.defaultingPool  = s.canDefault ? Math.max(1, attrValue) : 0;
    s.skillRating     = s.rating || 0;
    s.attributeValue  = attrValue;
    s.specializationBonus = (s.specialisation && s.rating > 0) ? 2 : 0;
  }

  /**
   * Roll a skill test
   */
  async rollSkill(tn = 4, options = {}) {
    const actor = this.actor;
    if (!actor) {
      ui.notifications.warn('This skill is not owned by an actor.');
      return null;
    }
    
    const s = this.system;
    const isDefaulting = !s.rating || s.rating === 0;

    if (isDefaulting && !s.canDefault) {
      ui.notifications.warn(`${this.name} cannot be defaulted.`);
      return null;
    }

    let pool;
    let label   = `${this.name}`;
    let defTnMod = 0;

    if (isDefaulting) {
      // SR3 Default Table — let the user choose specialization / skill / attribute.
      const def = await SR3EItem.promptDefaultChoice(actor, {
        linkedAttr: s.linkedAttribute,
        message:    `No <strong>${this.name}</strong> skill — choose how to default:`,
      });
      if (!def) return null;   // cancelled
      pool     = def.pool;
      defTnMod = def.tnMod;
      label   += ` — ${def.label}`;
    } else if (options.pool != null) {
      // Caller-supplied pool — already includes any bonus dice (see
      // SR3EActorSheet._promptSkillRollOptions). Adding them again here would double-count.
      pool   = Math.max(1, options.pool);
      label += s.specialisation
        ? ` ${s.skillRating} (${s.skillRating + 2}) — ${s.specialisation}`
        : ` (Rating ${s.skillRating} = ${pool} dice)`;
    } else {
      // Rolling the skill directly off the item: build the pool here, bonus dice included.
      const bonusDice = SR3EItem._skillBonusDice(actor, this);
      pool   = Math.max(1, (s.skillRating ?? 0) + bonusDice);
      const bonusNote = bonusDice ? ` +${bonusDice}` : '';
      label += s.specialisation
        ? ` ${s.skillRating}${bonusNote} (${s.skillRating + bonusDice + 2}) — ${s.specialisation}`
        : ` (Rating ${s.skillRating}${bonusNote} = ${pool} dice)`;
    }

    if (pool < 1) {
      ui.notifications.warn(`No dice pool available for ${this.name}`);
      return null;
    }

    // TN modifier from defaulting is baked in here.
    return actor.rollPool(pool, tn + defTnMod, label, { ...options });
  }

  /**
 * Roll a weapon attack with specialization bonus
 */
/**
   * Parse a damage code string (e.g. "9M", "12S Stun", "6L") into its components.
   * Returns { power, level, isStun } or null if unparseable.
   */
  /**
   * Melee attack — opposed test flow.
   * Attacker clicks weapon → selects target → boxing card → both roll → compare → soak.
   */
  async rollMelee() {
    if (!this.actor) { ui.notifications.warn('No actor for this weapon.'); return null; }
    return SR3EItem.rollMeleeAttack(this.actor, this);
  }

  /**
   * Synthetic "Unarmed Combat" attacker weapon (bare fists): (STR)M Stun, reach 0, UNA.
   * Not a real inventory item — used to launch an unarmed attack from the sheet or canvas.
   */
  static _unarmedWeapon() {
    return {
      id:       'unarmed',
      name:     'Unarmed Combat',
      type:     'melee',
      _unarmed: true,
      system:   { damage: '(STR)M Stun', reach: 0, category: 'UNA' },
    };
  }

  /**
   * Melee opposed-test flow for an attacker actor + attacker weapon (a real melee Item OR a
   * synthetic object like _unarmedWeapon). Select target → adjacency warn → boxing card.
   */
  static async rollMeleeAttack(actor, atkWeapon) {
    if (!actor || !atkWeapon) return null;

    // Parse attacker damage code (resolve STR against attacker)
    const rawDamage  = atkWeapon.system?.damage || '';
    const damageBase = SR3EItem.parseDamageCode(rawDamage, actor);
    if (!damageBase) {
      ui.notifications.warn(`${atkWeapon.name} has no damage code set (e.g. 6M or (STR+2)M).`);
      return null;
    }

    // Select target
    const targetActor = await SR3EItem._promptTarget(actor);
    if (!targetActor) return null;

    // Melee reaches adjacent squares only — warn (don't block) if the target is further.
    // Reach affects TN (below), not range.
    const atkTok = actor.getActiveTokens?.()[0] ?? null;
    const tgtTok = targetActor.getActiveTokens?.()[0] ?? null;
    if (atkTok && tgtTok && !SR3EItem._tokensAdjacent(atkTok, tgtTok)) {
      const dM = SR3EItem._measureDistance(atkTok, tgtTok);
      ui.notifications.warn(`${targetActor.name} is ${dM != null ? `${Math.round(dM)}m away` : 'not adjacent'} — out of reach for a melee attack.`);
    }

    // Get defender's equipped melee weapon, fall back to unarmed, then bare hands
    const defWeapon = SR3EItem._getEquippedMelee(targetActor);

    // Build rich pool info for both sides
    const atkInfo  = SR3EItem._buildMeleePoolInfo(actor, atkWeapon);
    const defInfo  = SR3EItem._buildMeleePoolInfo(targetActor, defWeapon);
    const atkReach = atkWeapon.system?.reach ?? 0;
    const defReach = defWeapon?.system?.reach ?? 0;

    // SR3 Default Table — either side may lack the skill. Prompt each defaulter
    // (attacker first, then defender) and patch their pool info / TN modifier.
    const _applyMeleeDefault = async (info, dActor, who, weapon) => {
      if (!info.isDefault) return true;
      // Name the WEAPON and the skill it actually needs (TODO 45).
      //
      // This message used to be the fixed string "has no Unarmed Combat / Martial Arts
      // skill" no matter what was being wielded. It masked TODO 46 for two days: a player
      // holding a pole arm saw an unarmed-skill complaint and reasonably concluded the
      // skill lookup was broken, when the real fault was that nothing was equipped and
      // `_getEquippedMelee` had fallen through to Bare Hands. Naming the weapon makes that
      // visible in the prompt itself — "Bare Hands needs…" is instantly recognisable as
      // wrong to someone who thinks they are holding a pole arm.
      //
      // `requiredSkill` / `unarmedContext` come from _buildMeleePoolInfo, which is what
      // actually performed the lookup — so the wording cannot drift from the rule. Read
      // before the lines below overwrite `skillName` with the chosen default's label.
      const needed   = info.requiredSkill ?? info.skillName;
      const unarmed  = info.unarmedContext === true;
      const def = await SR3EItem.promptDefaultChoice(dActor, {
        linkedAttr: 'strength',
        title:      `Defaulting — ${dActor.name} (${who})`,
        message:    `${weapon?.name ?? 'This weapon'} needs `
                  + `${unarmed ? 'Unarmed Combat / Martial Arts' : needed}, `
                  + `which ${dActor.name} does not have — choose how to default:`,
      });
      if (!def) return false;   // cancelled → abort the whole attack
      info.skillDice    = def.pool;
      info.skillName    = def.label;
      info.defaultTnMod = def.tnMod;
      info.availPool    = Math.min(dActor.system.derived?.availableCombatPool ?? 0, def.poolCap);
      return true;
    };
    if (!await _applyMeleeDefault(atkInfo, actor, 'attacker', atkWeapon))       return null;
    if (!await _applyMeleeDefault(defInfo, targetActor, 'defender', defWeapon)) return null;

    // Called shot (SR3 p.114) — attacker only; +4 TN to stage damage up one level or aim
    // at a sub-component. Take-aim folds in as −1 TN each. Cancelling aborts the attack.
    const calledShot = await SR3EItem._promptCalledShot(actor);
    if (!calledShot) return null;

    // ── Reach, and the election the longer-reach fighter is entitled to ──────────
    //
    // p.121: "Calculate the DIFFERENCE between the Reach Ratings of opponents. The
    // character with the longer (higher) Reach CAN CHOOSE to apply this number as either a
    // negative target number modifier to his attack test OR as a positive modifier to his
    // opponent's target number."
    //
    // The two are the same magnitude but not the same choice — the book gives the reason:
    // "beat the opponent's defenses" versus "make himself harder to hit". Against a
    // low-skill, high-pool opponent you want the penalty on them; when you simply need to
    // land the blow, you want the bonus on you.
    //
    // ⚠ Reach is a DIFFERENTIAL. Equal reach cancels and neither side benefits — two
    // staff-wielders both roll against 4, not against 2. Each side subtracting its own
    // reach was an old bug: the GAP came out right, which is why it survived play, but the
    // absolute level did not and armed-vs-armed melee was far bloodier than intended.
    //
    // Base TNs below therefore carry NO reach at all. It is applied from the holder's
    // election, which lives in that fighter's own corner of the card and defaults to the
    // self-bonus (what the system did unconditionally before).
    const reachDiff   = Math.abs(atkReach - defReach);
    const reachHolder = reachDiff === 0 ? null : (atkReach > defReach ? 'attacker' : 'defender');

    const baseAtkTN = Math.max(2, 4 + (atkInfo.defaultTnMod ?? 0) + (calledShot.tnMod ?? 0));
    const baseDefTN = Math.max(2, 4 + (defInfo.defaultTnMod ?? 0));

    // Default election: the holder takes the bonus themselves.
    const dfltAtkTN = Math.max(2, baseAtkTN - (reachHolder === 'attacker' ? reachDiff : 0));
    const dfltDefTN = Math.max(2, baseDefTN - (reachHolder === 'defender' ? reachDiff : 0));

    // ── The GM sets both target numbers ─────────────────────────────────────────
    // Relayed, so the window opens on the GM rather than on whoever swung. Cancelling
    // aborts the exchange before any card is posted.
    const gm = await game.sr3e.SR3EQuery.asGM('sr3e.melee.negotiate', {
      atkName:    actor.name,
      defName:    targetActor.name,
      baseAtkTN:  dfltAtkTN,
      baseDefTN:  dfltDefTN,
      baseNote:   reachHolder
        ? `Reach ${reachDiff} to ${reachHolder === 'attacker' ? actor.name : targetActor.name}`
        : null,
    }, { timeout: 300_000 });
    if (gm === null) return null;

    await game.sr3e.SR3EActor.postMeleeCard({
      attackerActorId:  actor.id,
      defenderActorId:  targetActor.id,
      atkWeaponId:      atkWeapon.id,
      defWeaponId:      defWeapon?.id ?? null,
      atkWeaponName:    atkWeapon.name,
      defWeaponName:    defWeapon?.name ?? 'Bare Hands',
      atkRawDamage:     rawDamage,
      atkDamageBase:    damageBase,
      defRawDamage:     defWeapon?.system?.damage ?? '',
      defDamageBase:    defWeapon ? SR3EItem.parseDamageCode(defWeapon.system?.damage ?? '', targetActor) : null,
      atkReach,
      defReach,
      reachDiff,
      reachHolder,
      // The TNs as posted already carry the DEFAULT reach election (−N to the holder).
      // `handleMeleeRoll` moves it if the holder elects otherwise; it needs only
      // reachDiff/reachHolder above, so no separate "base" TN is carried.
      atkTN:            gm.atkTN,
      defTN:            gm.defTN,
      gmSetTN:          gm.adjudicated === true,
      calledShot:       calledShot.calledShot,
      calledShotTarget: calledShot.calledShotTarget,
      atkInfo,
      defInfo,
    });
  }

  /**
   * Get the equipped melee weapon for an actor, or fall back to unarmed/bare hands.
   * Returns an item-like object or null for bare hands.
   */
  static _getEquippedMelee(actor) {
    const equippedId = actor.system.equippedMelee;
    if (equippedId) {
      const item = actor.items.get(equippedId);
      if (item) return item;
    }
    // Fall back to first unarmed/cyber item
    const unarmed = actor.items.find(i =>
      i.type === 'melee' &&
      ['CYB', 'UNA'].includes(i.system.category ?? '')
    );
    if (unarmed) return unarmed;
    // Bare hands — synthesise a minimal object
    const str = actor.system.attributes?.strength?.value ?? 2;
    return {
      id:     null,
      name:   'Bare Hands',
      type:   'melee',
      system: {
        damage:   `${str}M Stun`,
        reach:    0,
        category: 'UNA',
      },
    };
  }

  /**
   * Bonus dice this actor gets on a specific skill, from any source — adept Improved
   * Ability, or cyberware/bioware that boosts one named skill.
   *
   * Reads the derived `skillBonusDice` map and nothing else. There is deliberately NO
   * `magicType === 'Adept'` check here: the map is only ever populated for actors who
   * qualify (see SR3EActor._prepareCharacter), so re-checking at the point of use could
   * only ever discard a bonus that derivation already decided was earned. That mismatch
   * was the original bug — the sheet read the map and showed the dice, while the roll
   * paths never consulted it at all.
   *
   * Safe to call at roll time: a button click happens long after prepareDerivedData.
   * Do NOT fold this into SR3EItem.prepareDerivedData — Foundry prepares embedded items
   * BEFORE the actor's own derived data, so the map is not reliably populated yet.
   *
   * @param {Actor|null} actor
   * @param {Item|string|null} skill  Skill Item, or its name.
   * @returns {number} dice to add, 0 when none
   */
  static _skillBonusDice(actor, skill) {
    const name = typeof skill === 'string' ? skill : skill?.name;
    if (!name) return 0;
    return actor?.system?.derived?.skillBonusDice?.[name] ?? 0;
  }

  /**
   * Build a melee dice pool for an actor using their weapon.
   * Uses skill rating if available, otherwise defaults to full Strength (+4 TN, no pool).
   */
  static _buildMeleePoolInfo(actor, weapon) {
    const map       = SR3EItem.WEAPON_SKILL_MAP;
    const code      = weapon?.system?.category ?? '';
    const skillName = map[code]?.skill ?? (
      ['CYB','UNA'].includes(code) ? 'Unarmed Combat' : 'Armed Combat'
    );
    // Unarmed: Unarmed Combat and Martial Arts (MA:) skills are interchangeable —
    // use whichever has the highest rating; default to the attribute only if neither exists.
    const isUnarmedContext = ['CYB', 'UNA'].includes(code) || skillName === 'Unarmed Combat';
    let skill;
    if (isUnarmedContext) {
      const candidates = actor.items.filter(i =>
        i.type === 'skill' && (i.name === skillName || i.name.includes(skillName) || /^MA:/i.test(i.name))
      );
      skill = candidates.length
        ? candidates.reduce((best, s) => (s.system.rating ?? 0) > (best.system.rating ?? 0) ? s : best)
        : null;
    } else {
      skill = actor.items.find(i =>
        i.type === 'skill' && (i.name === skillName || i.name.includes(skillName))
      );
    }

    const str       = actor.system.attributes?.strength?.value ?? 1;
    const isDefault = !skill;
    // Defaulting to Strength uses the FULL attribute (SR3); +4 TN and no combat pool.
    const basePool  = isDefault ? Math.max(1, str) : (skill.system.skillRating ?? skill.system.rating ?? 0);
    let specBonus   = 0;
    let specName    = '';
    if (skill?.system?.specialisation &&
        weapon?.name?.toLowerCase().includes(skill.system.specialisation.toLowerCase())) {
      specBonus = 2;
      specName  = skill.system.specialisation;
    }
    // Improved Ability / augmentation dice, keyed on the skill actually used — which for
    // unarmed may be a martial art rather than Unarmed Combat itself. Not added when
    // defaulting: there is no skill to have improved.
    const bonusDice  = isDefault ? 0 : SR3EItem._skillBonusDice(actor, skill);
    const skillDice  = Math.max(1, basePool + specBonus + bonusDice);
    const availPool  = isDefault ? 0 : (actor.system.derived?.availableCombatPool ?? 0);
    // Display the actual martial-art skill name when one was used instead of "Unarmed Combat".
    const displayName = (skill && skill.name !== skillName && /^MA:/i.test(skill.name)) ? skill.name : skillName;
    // Returned so the defaulting prompt can describe the requirement the way the lookup
    // ACTUALLY behaved. Re-deriving it at the message would let the two drift: `CYB` maps
    // to Cyber Implant Combat but still accepts any MA: skill, so a message keyed on the
    // skill name alone would omit the martial arts that would have satisfied it.
    return { skillName: displayName, requiredSkill: skillName, unarmedContext: isUnarmedContext,
             skillRating: basePool, specName, specBonus, bonusDice, skillDice, availPool, isDefault };
  }

  /**
   * Effective skill type for a skill Item: 'active' | 'knowledge' | 'language'.
   *
   * Category wins whenever it is set, mirroring how the actor sheet classifies skills
   * for display. The stored `system.skillType` is NOT trustworthy on its own: the schema
   * defaults it to 'active', so any skill created without it explicitly set (notably
   * characters imported before the Nullsheen importer wrote the field) reads as active
   * regardless of its real category — which let knowledge skills such as `MA:` martial
   * arts appear as valid Combat-Pool-eligible defaulting targets.
   */
  static _skillTypeOf(skill) {
    const cat = skill?.system?.category ?? '';
    const fn  = game.sr3e?.SR3E?.skillTypeForCategory;
    if (cat && typeof fn === 'function') return fn(cat);
    return skill?.system?.skillType ?? 'active';
  }

  /**
   * Every pack that declares it holds `type` items AND belongs to a source book the
   * GM has switched on. Book membership comes from `flags.<system>.book` on the pack;
   * packs without it are system content and always included.
   *
   * Always prefer this over `game.packs.get('<system>.<pack>')`. Book content lives in
   * one pack per book, so a hard-coded pack id sees only a single book's worth and
   * silently ignores the rest.
   *
   * @param {string} type            Item type, e.g. 'cyberdeck'
   * @param {object} [opts]
   * @param {boolean} [opts.ignoreBookFilter]  Include disabled books too. For places
   *   that must see everything regardless of GM visibility choices — migrations and
   *   integrity checks, not player-facing pickers.
   * @returns {CompendiumCollection[]}
   */
  static _packsForType(type, { ignoreBookFilter = false } = {}) {
    const sysId = game.system.id;
    return game.packs.filter(p => {
      const types = p.metadata?.flags?.[sysId]?.itemTypes;
      if (!Array.isArray(types) || !types.includes(type)) return false;
      if (ignoreBookFilter) return true;
      return game.sr3e?.SR3ESourceBooks?.packAllowed(p) ?? true;
    });
  }

  /**
   * All documents of `type` across every pack that declares it, sorted by name.
   * Returns [] when nothing is available.
   */
  static async _documentsOfType(type) {
    const out = [];
    for (const pack of SR3EItem._packsForType(type)) {
      try { out.push(...await pack.getDocuments()); }
      catch (err) { console.warn(`SR3E | Could not read pack ${pack.collection}:`, err); }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * SR3 Default Table (p.85) — interactive defaulting prompt.
   * Shown whenever an actor lacks the appropriate skill for a test.
   *
   *   Default To      TN Modifier   Dice Pool
   *   Specialization      +3        = to 1/2 specialization's base skill
   *   Skill               +2        = to 1/2 base skill being used
   *   Attribute           +4        No pool dice allowed
   *
   * The "Dice Pool" column is the CAP ON POOL DICE, not the dice you roll. You roll
   * the FULL rating (p.84): "roll a number of dice equal to your rating in the default
   * skill… the maximum number of pool dice allowed is equal to half your rating in
   * that skill (round down)."
   *
   * The book's own examples pin both halves. Ratchet, Shotgun 5, defaulting to an
   * assault rifle: "Ratchet is rolling 5 dice (his rating in the default skill), plus
   * up to 2 dice from his Combat Pool". And for a specialization, Edged Weapons 4 with
   * a sword specialization rolls the SPECIALIZATION's rating and "can use up to 2 dice
   * from his Combat Pool (half of Edged Weapons 4)" — the cap comes off the related
   * base skill, not off the specialization.
   *
   * Reading that column as the dice to roll (which this did) halves every defaulted
   * test AND drops the cap, so it errs in both directions at once.
   *
   * Lists ALL of the actor's active skills/specialisations — the GM judges relevance.
   *
   * @param {Actor}  actor
   * @param {object} opts   { message, linkedAttr, title }
   * @returns {Promise<null|{mode,pool,tnMod,allowPool,poolCap,label}>}  null if cancelled.
   *          `pool` is the dice to ROLL; `poolCap` is the most pool dice that may be
   *          added on top (0 for the Attribute tier, so it alone expresses allowPool).
   */
  /**
   * The three Default Table tiers as data — dice to roll and pool cap per option.
   *
   * Pure, and deliberately separate from the dialog: this IS the rule, and burying it
   * in template literals is how it came to halve every defaulted test unnoticed. Kept
   * testable so the book's own examples can be asserted directly.
   *
   * @returns {{specializations: object[], skills: object[], attributes: object[]}}
   *          each entry `{ value, label, dice, cap }`.
   */
  static defaultTiers(actor, opts = {}) {
    const half   = r => Math.floor((r ?? 0) / 2);
    const skills = (actor.items ?? [])
      .filter(i => i.type === 'skill'
        && SR3EItem._skillTypeOf(i) === 'active'
        && (i.system.rating ?? 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Roll the full rating; cap the pool at half of it.
    const skillTier = skills.map(s => {
      const r = s.system.rating ?? 0;
      return { value: s.id, dice: r, cap: half(r),
               label: `${s.name} ${r} → ${r} dice (max ${half(r)} pool)` };
    });

    // One entry per specialisation, not per skill — a skill may carry several, and each
    // has its own rating. `specialisations` holds the BONUS as `level` (1 or 2), so the
    // specialisation's rating is base + level; SkillData.migrateData converts the legacy
    // `specialisation` string into this array, so it is the only source worth reading.
    // The pool cap comes off the RELATED BASE skill, not the specialisation (p.85).
    const specTier = skills.flatMap(s => {
      const base = s.system.rating ?? 0;
      // Martial arts cannot be specialised (Cannon Companion p.86). The picklist no longer
      // offers maneuvers as specialisations, but characters built before that fix still
      // carry one on the item — so skip them here too, or those characters keep being
      // offered a Specialization tier at base+1 dice that the rules do not allow.
      if (/^MA:/i.test(s.name ?? '')) return [];
      return (s.system.specialisations ?? []).map((sp, i) => {
        const dice = base + (sp.level ?? 1);
        return { value: `${s.id}:${i}`, dice, cap: half(base),
                 label: `${s.name} (${sp.name}) ${dice} → ${dice} dice `
                      + `(max ${half(base)} pool, ½ of base ${base})` };
      });
    });

    const ATTRS = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower', 'reaction'];
    const attrTier = ATTRS.map(k => {
      const v    = actor.system?.attributes?.[k]?.value ?? actor.system?.attributes?.[k]?.base ?? 0;
      const dice = Math.max(1, v);
      const lbl  = k.charAt(0).toUpperCase() + k.slice(1);
      return { value: k, dice, cap: 0, selected: k === (opts.linkedAttr ?? ''),
               label: `${lbl} ${v} → ${dice} dice` };
    });

    return { specializations: specTier, skills: skillTier, attributes: attrTier };
  }

  static async promptDefaultChoice(actor, opts = {}) {
    // Relay to whoever decides for this actor, unless we already ARE them (or
    // this call arrived over the wire, marked `_local`, and must not bounce
    // again). One guard here fixes every defaulting flow at once: the melee
    // defender, the vehicle pilot and the cybercombat defender were all being
    // asked to choose a defaulting tier on their OPPONENT's screen.
    if (!opts._local) {
      const { SR3EQuery } = game.sr3e;
      const deciderId = SR3EQuery.deciderFor(actor);
      if (deciderId && deciderId !== game.user.id) {
        return SR3EQuery.ask(deciderId, 'sr3e.default.choose', {
          exchangeId: foundry.utils.randomID(),
          actorUuid:  actor.uuid,
          message:    opts.message,
          linkedAttr: opts.linkedAttr,
          title:      opts.title,
        }, { fallback: null });   // unreachable decider → cancel, as today
      }
    }

    const tiers = SR3EItem.defaultTiers(actor, opts);
    const asOption = e =>
      `<option value="${e.value}" data-dice="${e.dice}" data-cap="${e.cap}"`
      + `${e.selected ? ' selected' : ''}>${e.label}</option>`;

    const skillOpts = tiers.skills.map(asOption).join('');
    const specOpts  = tiers.specializations.map(asOption).join('');
    const attrOpts  = tiers.attributes.map(asOption).join('');

    let hookId = Hooks.on('renderDialogV2', (app, html) => {
      if (!html.querySelector?.('#def-mode')) return;   // not our dialog
      Hooks.off('renderDialogV2', hookId);
      const modeSel  = html.querySelector('#def-mode');
      const rowSpec  = html.querySelector('#def-row-spec');
      const rowSkill = html.querySelector('#def-row-skill');
      const rowAttr  = html.querySelector('#def-row-attr');
      const diceEl   = html.querySelector('#def-dice');
      const tnEl     = html.querySelector('#def-tn');
      const poolEl   = html.querySelector('#def-pool');

      const refresh = () => {
        const mode = modeSel.value;
        rowSpec.style.display  = mode === 'specialization' ? 'block' : 'none';
        rowSkill.style.display = mode === 'skill'          ? 'block' : 'none';
        rowAttr.style.display  = mode === 'attribute'      ? 'block' : 'none';
        let sel, tnMod;
        if (mode === 'specialization') { sel = html.querySelector('#def-spec');  tnMod = 3; }
        else if (mode === 'skill')     { sel = html.querySelector('#def-skill'); tnMod = 2; }
        else                           { sel = html.querySelector('#def-attr');  tnMod = 4; }
        const opt = sel?.options[sel.selectedIndex];
        const cap = opt ? (parseInt(opt.dataset.cap) || 0) : 0;
        diceEl.textContent = opt ? (opt.dataset.dice ?? '0') : '0';
        tnEl.textContent   = `+${tnMod}`;
        poolEl.textContent = cap > 0 ? `up to ${cap}` : 'not allowed';
      };
      modeSel.addEventListener('change', refresh);
      html.querySelectorAll('#def-spec,#def-skill,#def-attr').forEach(s => s.addEventListener('change', refresh));
      refresh();
    });

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: opts.title ?? `Defaulting — ${actor.name}` },
      content: `
        <div style="padding:6px 0;font-size:13px;">
          <p style="margin:0 0 8px;">${opts.message ?? 'No appropriate skill detected — choose how to default:'}</p>
          <label style="display:block;margin-bottom:8px;">Default to:
            <select id="def-mode" style="width:100%;margin-top:3px;">
              <option value="specialization"${specOpts ? '' : ' disabled'}>Specialization (+3 TN, pool capped at ½ base skill)</option>
              <option value="skill"${skillOpts ? '' : ' disabled'}>Skill (+2 TN, pool capped at ½ rating)</option>
              <option value="attribute" selected>Attribute (+4 TN, no pool dice)</option>
            </select>
          </label>
          <label id="def-row-spec" style="display:none;margin-bottom:8px;">Specialization:
            <select id="def-spec" style="width:100%;margin-top:3px;">${specOpts || '<option disabled>— none —</option>'}</select>
          </label>
          <label id="def-row-skill" style="display:none;margin-bottom:8px;">Related skill:
            <select id="def-skill" style="width:100%;margin-top:3px;">${skillOpts || '<option disabled>— none —</option>'}</select>
          </label>
          <label id="def-row-attr" style="display:block;margin-bottom:8px;">Attribute:
            <select id="def-attr" style="width:100%;margin-top:3px;">${attrOpts}</select>
          </label>
          <div style="background:var(--sr-surface,#1c2030);border:1px solid var(--sr-border,#3a3f55);border-radius:6px;padding:6px;font-size:12px;">
            Dice rolled: <strong id="def-dice">?</strong> &nbsp;·&nbsp; TN modifier: <strong id="def-tn">+4</strong> &nbsp;·&nbsp; Extra pool dice: <strong id="def-pool">not allowed</strong>
          </div>
        </div>`,
      buttons: [
        {
          label: 'Confirm', action: 'confirm', default: true,
          callback: (_e, _b, dlg) => {
            const el   = dlg.element;
            const mode = el.querySelector('#def-mode')?.value ?? 'attribute';
            const pick = id => {
              const sel = el.querySelector(id);
              const opt = sel?.options[sel.selectedIndex];
              return { opt, dice: parseInt(opt?.dataset.dice) || 0, cap: parseInt(opt?.dataset.cap) || 0 };
            };
            if (mode === 'specialization') {
              const { opt, dice, cap } = pick('#def-spec');
              // value is "<skillId>:<index into specialisations>"
              const [skId, spIdx] = (opt?.value ?? '').split(':');
              const sk   = skId ? actor.items.get(skId) : null;
              const spec = sk?.system.specialisations?.[Number(spIdx)];
              result = { mode, pool: dice, tnMod: 3, allowPool: cap > 0, poolCap: cap,
                         label: sk
                           ? `Defaulting → ${sk.name} (${spec?.name ?? 'spec'}) ${dice} dice, TN +3, max ${cap} pool`
                           : 'Defaulting → specialization, TN +3' };
            } else if (mode === 'skill') {
              const { opt, dice, cap } = pick('#def-skill');
              const sk = opt ? actor.items.get(opt.value) : null;
              result = { mode, pool: dice, tnMod: 2, allowPool: cap > 0, poolCap: cap,
                         label: sk
                           ? `Defaulting → ${sk.name} ${dice} dice, TN +2, max ${cap} pool`
                           : 'Defaulting → skill, TN +2' };
            } else {
              const { opt, dice } = pick('#def-attr');
              const key = opt?.value ?? (opts.linkedAttr ?? 'body');
              const lbl = key.charAt(0).toUpperCase() + key.slice(1);
              result = { mode: 'attribute', pool: dice || 1, tnMod: 4, allowPool: false, poolCap: 0,
                         label: `Defaulting → ${lbl} ${dice || 1} dice, TN +4 (no pool)` };
            }
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    Hooks.off('renderDialogV2', hookId);
    return result;
  }

    static _buildMeleePool(actor, weapon) {
    if (!weapon) return Math.max(1, (actor.system.attributes?.strength?.value ?? 1));

    // Determine skill from weapon category
    const map = SR3EItem.WEAPON_SKILL_MAP;
    const code = weapon.system?.category ?? '';
    const skillName = map[code]?.skill ?? (
      ['CYB','UNA'].includes(code) ? 'Unarmed Combat' : 'Armed Combat'
    );

    const skill = actor.items.find(i =>
      i.type === 'skill' &&
      (i.name === skillName || i.name.includes(skillName))
    );

    let pool = skill ? (skill.system.skillRating ?? 0) : Math.max(1, (actor.system.attributes?.strength?.value ?? 1));

    // Specialisation bonus
    if (skill?.system?.specialisation &&
        weapon.name?.toLowerCase().includes(skill.system.specialisation.toLowerCase())) {
      pool += 2;
    }

    return Math.max(1, pool);
  }

  /**
   * Parse a damage code string into { power, level, isStun }.
   * Supports plain codes ("9M"), STR expressions ("(STR+3)M", "STR-1S", "(STR)L"),
   * and Stun suffix ("6M Stun").
   * Pass `actor` to resolve STR references; without it, STR expressions return null.
   */
  static parseDamageCode(code, actor = null) {
    if (!code) return null;
    const isStun = /stun/i.test(code);
    const s = code.trim().replace(/\s*(stun)?\s*$/i, '').trim();

    // Fast path: plain numeric code like "9M"
    const plain = s.match(/^(\d+)\s*([LMSDlmsd])$/i);
    if (plain) {
      return { power: parseInt(plain[1]), level: plain[2].toUpperCase(), isStun };
    }

    // STR expression: optional parens/brackets wrapping a math expression that may include STR
    // Accepts: (STR+3)M  STR-1S  (STR)L  (STR*2)M  [STR+2]M
    const exprMatch = s.match(/^[\[(]?(.*?)[\])]?\s*([LMSDlmsd])$/i);
    if (exprMatch && /STR/i.test(exprMatch[1])) {
      if (!actor) return null;
      const str    = actor.system.attributes?.strength?.value ?? 0;
      const expr   = exprMatch[1].replace(/STR/gi, String(str))
                                  .replace(/[^0-9+\-*/().]/g, '');
      if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;
      let power;
      try { power = Math.floor(new Function(`"use strict"; return (${expr})`)()) }
      catch { return null; }
      if (!isFinite(power)) return null;
      return { power: Math.max(0, power), level: exprMatch[2].toUpperCase(), isStun };
    }

    return null;
  }

  /**
   * Stage damage upward by the given number of net successes.
   * Rules: every 2 successes = +1 stage (L→M→S→D).
   *
   * ⚠ **SR3 gives two different answers past Deadly, and both are RAW.** This is not a
   * contradiction to tidy away — it is a general rule with a melee-specific exception,
   * and the specific one wins where it applies.
   *
   * **General (p.113), the default here.** Deadly is the ceiling and surplus successes
   * are discarded: *"If the weapon damage is staged below Light… then no damage is done.
   * On the other end of the spectrum, Deadly damage is the highest level of damage
   * possible."* Power matters twice over, because it is also the Damage Resistance TN —
   * an invented point makes the soak harder AND the wound worse.
   *
   * **Melee (p.122), `opts.meleeRules`.** *"If the Damage Level has been increased to
   * Deadly, extra successes can be used to stage the Power Rating up. For every two
   * successes the Power Rating increases by one."*
   *
   * **Astral combat counts as melee** — *"Astral combat uses the same rules as Melee
   * Combat"* (p.174) — so it passes the flag too. Matrix and contested tests do not:
   * nothing makes them melee, so they take the general rule.
   *
   * @param {{power:number, level:string, isStun:boolean}} base
   * @param {number} netSuccesses
   * @param {object} [opts]
   * @param {boolean} [opts.meleeRules=false]  apply the p.122 melee exception
   * @returns {{power:number, level:string, isStun:boolean, staged:number}}
   *          `staged` = number of LEVEL steps taken (Power bumps are not steps)
   */
  static stageDamage(base, netSuccesses, opts = {}) {
    const STAGES = ['L', 'M', 'S', 'D'];
    const { level, isStun } = base;
    let power     = base.power;
    let idx       = STAGES.indexOf(level);
    let remaining = netSuccesses;
    let staged    = 0;

    while (remaining >= 2 && idx < STAGES.length - 1) {
      remaining -= 2;
      idx++;
      staged++;
    }

    // Melee/astral only: what is left over past Deadly raises Power (p.122).
    // Everywhere else it is discarded (p.113).
    if (opts.meleeRules && idx === STAGES.length - 1 && remaining >= 2) {
      power += Math.floor(remaining / 2);
    }

    return { power, level: STAGES[idx], isStun, staged };
  }

  async rollWeapon(options = {}) {
  if (this.type === 'vehicleweapon') return this.rollVehicleWeapon(options);

  const actor = this.actor;
  if (!actor) {
    ui.notifications.warn('No actor for this weapon.');
    return null;
  }

  // Out-of-ammo guard (only when tracking) — empty weapons are inoperable.
  if (game.settings.get('The2ndChumming3e', 'trackAmmo')) {
    if (this.type === 'firearm' && (this.system.loadedRounds ?? 0) <= 0) {
      ui.notifications.warn(`${this.name} is empty — reload before firing.`);
      return null;
    }
    if (this._usesNockedAmmo() && (this.system.loadedRounds ?? 0) <= 0) {
      const noun = this._weaponLoadMechanism() === 'bolt' ? 'bolt' : 'arrow';
      ui.notifications.warn(`${this.name} has no ${noun} nocked — reload before firing.`);
      return null;
    }
    if (this._isConsumable() && (this.system.quantity ?? 0) <= 0) {
      ui.notifications.warn(`No ${this.name} left to throw.`);
      return null;
    }
  }

  const isAoE = this.system.isAoE ?? false;
  let rawDamage = this.system.damage || '';

  if (isAoE) {
    // ── AoE path (thrown / launched) ──────────────────────────────────────────
    // 1) Nominate the blast point with a template. 2) Roll to throw. 3) In resolution,
    //    scatter relocates the blast, re-detects who's caught (incl. the thrower!),
    //    optionally runs Chunky Salsa, then posts soak cards. See SR3EActor._postWaveCard.
    if (!canvas?.ready) {
      ui.notifications.warn('AoE attacks need a scene — place the attacker and targets on a map.');
      return null;
    }
    const power  = SR3EItem.parseDamageCode(rawDamage, actor)?.power ?? 5;
    const placed = await SR3EItem._placeBlastTemplate(actor, power);
    if (!placed) return null; // cancelled placement

    const aToken        = actor.getActiveTokens?.()[0] ?? null;
    const throwerCenter = aToken ? { x: aToken.center.x, y: aToken.center.y } : null;
    let throwDistance = null;
    if (throwerCenter) {
      try { throwDistance = canvas.grid.measurePath([throwerCenter, placed.center])?.distance ?? null; }
      catch { throwDistance = null; }
    }

    // Step 2: Roll options (TN auto range mod by grenade type, damage code, type, chunky)
    const weaponOpts = await SR3EItem._promptWeaponRollOptionsAoE(rawDamage, actor, { throwDistance });
    if (!weaponOpts) return null;

    let   tn                 = weaponOpts.tn;
    options.useKarma         = weaponOpts.useKarma;
    options.karmaReroll      = weaponOpts.karmaReroll;
    const effectiveRawDamage = weaponOpts.damageCode;
    const damageBase         = SR3EItem.parseDamageCode(effectiveRawDamage, actor);
    if (!damageBase) {
      ui.notifications.warn(`${this.name} has no damage code set. Edit the item to add one (e.g. 9M, 8M Stun).`);
      return null;
    }

    // Step 3: Build attacker (throwing) pool
    const skillName = this._getWeaponSkill();
    const skill     = actor.items.find(i =>
      i.type === 'skill' && (i.name === skillName || i.name.includes(skillName))
    );

    let pool  = 0;
    let label = `${this.name} [${effectiveRawDamage}] — Throw`;
    let defTnMod = 0, defAllowPool = false, defPoolCap = Infinity;
    if (skill) {
      // Improved Ability / augmentation dice for this weapon's skill.
      const bonusDice  = SR3EItem._skillBonusDice(actor, skill);
      pool = (skill.system.skillRating || 0) + bonusDice;
      const skillSpec  = skill.system.specialisation;
      const baseRating = skill.system.skillRating || 0;
      const bonusNote  = bonusDice ? ` +${bonusDice}` : '';
      const specMatch  = skillSpec && (
        this.name.toLowerCase() === skillSpec.toLowerCase() ||
        this.name.toLowerCase().includes(skillSpec.toLowerCase())
      );
      if (specMatch) {
        pool += 2;
        label += ` (${skill.name} ${baseRating}${bonusNote} (${baseRating + bonusDice + 2}) — ${skillSpec})`;
      } else {
        label += ` (${skill.name} ${baseRating}${bonusNote})`;
      }
    } else {
      // SR3 Default Table — let the user choose specialization / skill / attribute.
      const def = await SR3EItem.promptDefaultChoice(actor, {
        linkedAttr: this._getDefaultAttribute(),
        message:    `No <strong>${skillName}</strong> skill — choose how to default:`,
      });
      if (!def) return null;   // cancelled
      pool         = def.pool;
      defTnMod     = def.tnMod;
      defAllowPool = def.allowPool;
      defPoolCap   = def.poolCap;
      label       += ` — ${def.label}`;
    }

    // Combat pool allowed unless defaulting to an attribute, and capped by the
    // Default Table at half the rating being defaulted from (SR3 p.84-85).
    const availableCombatPool = Math.min(
      actor.system.derived?.availableCombatPool ?? 0, defPoolCap);
    // Unlike the single-target path this KEEPS the `> 0` guard, deliberately. The
    // AoE flow has no GM TN window (`_promptWeaponRollOptionsAoE` keeps its own
    // attacker-side TN), so the attacker's roll-options Confirm is already their
    // roll trigger — prompting again with nothing to allocate would be a dead click.
    if ((skill || defAllowPool) && availableCombatPool > 0) {
      const combatDice = await this._promptCombatPool(availableCombatPool);
      if (combatDice === null) return null;   // cancelled — abort before anything is committed
      if (combatDice > 0) {
        await actor.spendCombatPool(combatDice);
        pool  += combatDice;
        label += ` + ${combatDice} Combat Pool`;
      }
    }

    pool  = Math.max(1, pool);
    tn    = tn + defTnMod;   // bake defaulting TN modifier

    options.weaponItemId     = this.id;
    options.actorId          = actor.id;
    options.rawDamage        = effectiveRawDamage;
    options.damageBase       = damageBase;
    options.isWeaponRoll     = true;
    options.isMelee          = false;
    options.isAoE            = true;
    options.aoeCenter        = placed.center;          // nominated epicentre (canvas pixels)
    options.aoeRadius        = placed.radius;          // blast radius (metres)
    options.aoeThrowerCenter = throwerCenter;          // for relative scatter direction
    options.aoeChunky        = weaponOpts.useSalsaGUI; // resolve confined space after scatter
    options.grenadeType      = weaponOpts.grenadeType ?? 'standard';
    options.skipWoundMod     = true;

    await this._consumeThrown();
    return actor.rollPool(pool, tn, label, options);
  }

  // ── Single-target path ─────────────────────────────────────────────────────
  // --- Step 1: Select target (prefer a single canvas target so range can be measured) ---
  let targetActor, targetToken = null;
  const _acq = SR3EItem._acquireCanvasTarget();
  if (_acq) {
    targetActor = _acq.actor;
    targetToken = _acq.token;
  } else {
    targetActor = await SR3EItem._promptTarget(actor);
    if (!targetActor) return null;
    targetToken = targetActor.getActiveTokens?.()[0] ?? null;
  }

  // --- Step 1.5: Loaded ammo (firearms only) ---
  // Ammo is loaded into the weapon via the Reload button; firing uses whatever is loaded.
  let ammoType = 'regular';
  if (this.type === 'firearm') {
    const SR3E   = game.sr3e.SR3E;
    ammoType     = this.system.loadedAmmoType ?? 'regular';
    // Apply attack-time type rules (power modifier + stun flag) to the raw damage code.
    // Armour-interacting types (APDS/Flechette) and Anti-Vehicle resolve later.
    const rules  = SR3E.ammoTypes[ammoType] ?? {};
    const parsed = SR3EItem.parseDamageCode(rawDamage, actor);
    if (parsed && ((rules.powerMod ?? 0) !== 0 || rules.isStun)) {
      const newPower = parsed.power + (rules.powerMod ?? 0);
      const stun     = parsed.isStun || !!rules.isStun;
      rawDamage = `${newPower}${parsed.level}${stun ? ' Stun' : ''}`;
    }
  }

  // --- Step 2: Fire mode selection (firearms only) ---
  let fireModeResult = null;
  let fireModeRounds = 0;
  if (this.type === 'firearm') {
    const availableModes = this._getAvailableModes();
    if (availableModes.length > 0) {
      // SS-only weapons: skip the dialog — no recoil, no damage mods
      const HEAVY_CATS = new Set(['LMG', 'MMG', 'HMG', 'MinG']);
      const isHeavy   = HEAVY_CATS.has(this.system.category ?? '');
      const isShotgun = (this.system.category ?? '') === 'ShtG';
      if (availableModes.length === 1 && availableModes[0] === 'SS') {
        fireModeResult = { mode: 'SS', rounds: 0, roundsWasted: 0, recoilTN: 0, additionalTNPenalty: 0 };
      } else {
        fireModeResult = await SR3EItem._promptFireMode(availableModes, actor, this, isHeavy, isShotgun);
        if (!fireModeResult) return null;
      }

      // ── SHORT BURSTS (SR3 p.115) ──────────────────────────────────────────
      //
      // A burst fired on a nearly-empty clip is not simply a burst that hits less hard: at
      // two rounds it is +2 Power with NO level increase and +2 recoil, and at one round it
      // stops being a burst at all and resolves as a single shot. `resolveBurst` owns those
      // three cases; here we just adopt what it says.
      //
      // Only meaningful while `trackAmmo` is on — otherwise the clip is not modelled, the
      // available count is null, and every burst is a full burst exactly as before.
      let shortBurst = false;
      if (fireModeResult.mode === 'BF' && game.settings.get('The2ndChumming3e', 'trackAmmo')) {
        const burst = SR3EItem.resolveBurst(this.system.loadedRounds ?? 0);
        shortBurst  = burst.shortBurst;
        if (burst.mode !== fireModeResult.mode || burst.rounds !== fireModeResult.rounds) {
          fireModeResult.mode   = burst.mode;
          fireModeResult.rounds = burst.rounds;
          // Recoil was computed in the dialog for a FULL burst, so it has to be redone once
          // the clip has had its say. Same pure function the dialog used.
          fireModeResult.recoilTN = SR3EItem.recoilTN({
            mode:           burst.mode,
            roundsBefore:   actor.system.roundsFiredThisPhase ?? 0,
            roundsThisShot: burst.rounds,
            totalComp:      (actor.system.recoilCompensation ?? 0) + (this.system.recoilMod ?? 0),
            isHeavy, isShotgun, shortBurst,
          });
          ui.notifications.warn(burst.mode === 'SS'
            ? `${this.name} has 1 round left — resolving as a single shot, not a burst.`
            : `${this.name} has only 2 rounds left — SHORT BURST: +2 Power, no level increase.`);
        }
      }

      // ── Per-phase firing allowance ────────────────────────────────────────
      // Warns, never blocks: the caps are stated in Actions and this system does not model
      // the action economy, so phaseFireWarning() infers them from rounds fired. See its doc.
      const _phaseWarn = SR3EItem.phaseFireWarning(
        fireModeResult.mode, actor.system.roundsFiredThisPhase ?? 0, fireModeResult.rounds);
      if (_phaseWarn) ui.notifications.warn(_phaseWarn);

      // FA-only ammo (Tracer) warning
      const ammoRules = game.sr3e.SR3E.ammoTypes[ammoType] ?? {};
      if (ammoRules.faOnly && fireModeResult.mode !== 'FA') {
        ui.notifications.warn(`${ammoRules.label} ammo can only be used in Full Auto.`);
      }
      fireModeRounds = fireModeResult.rounds + (fireModeResult.roundsWasted ?? 0);

      // Apply mode damage modifiers to rawDamage
      const parsed = SR3EItem.parseDamageCode(rawDamage, actor);
      if (parsed) {
        // Pure, and shared with the fire-mode dialog's preview — see fireModeDamage.
        const staged = SR3EItem.fireModeDamage({
          power:    parsed.power,
          level:    parsed.level ?? 'M',
          mode:     fireModeResult.mode,
          rounds:   fireModeResult.rounds,
          isTracer: !!ammoRules.tracer,
          shortBurst,
        });
        rawDamage = `${staged.power}${staged.level}${parsed.isStun ? ' Stun' : ''}`;
      }
    }
  }

  // Range — auto-measured from tokens when available (firearms, bows/crossbows, thrown).
  // Passed to the roll dialog as an editable dropdown so the GM can override the band.
  let rangeInfo = null;
  if (['firearm', 'projectile', 'thrown'].includes(this.type)) {
    const bands  = this._getRangeBands(actor);
    const aToken = actor.getActiveTokens?.()[0] ?? null;
    const metres = SR3EItem._measureDistance(aToken, targetToken);
    if (bands && metres != null) {
      const band = SR3EItem._rangeBandForDistance(bands, metres);
      rangeInfo = { bandIdx: band.idx, distance: metres, beyond: band.beyond };
      if (band.beyond) ui.notifications.warn(`${targetActor.name} is beyond ${this.name}'s extreme range.`);
    }
  }

  // --- Step 3: Roll options dialog (TN + damage code + range + vehicle modifier) ---
  const recoilTNMod  = fireModeResult?.recoilTN ?? 0;
  const woundPenalty = -(actor.system.woundMod ?? 0);
  const extraTNMod   = recoilTNMod + (fireModeResult?.additionalTNPenalty ?? 0) + woundPenalty;
  const tnBreakdownParts = [];
  if (recoilTNMod)                           tnBreakdownParts.push(`Recoil +${recoilTNMod}`);
  if (fireModeResult?.additionalTNPenalty)   tnBreakdownParts.push(`Multi-target +${fireModeResult.additionalTNPenalty}`);
  if (woundPenalty > 0)                      tnBreakdownParts.push(`Wound +${woundPenalty}`);
  // Tracer TN bonus is conditional (beyond Short range, non-smartgun) so it is shown
  // as a note for the GM to apply manually rather than baked into the TN.
  const tracerRules = game.sr3e.SR3E.ammoTypes[ammoType] ?? {};
  if (tracerRules.tracer && fireModeResult?.mode === 'FA') {
    const tracerTN = Math.floor(fireModeResult.rounds / 3);
    if (tracerTN > 0) tnBreakdownParts.push(`Tracer −${tracerTN} (beyond Short, non-smartgun — apply manually)`);
  }
  // Called shots are forbidden in Full Auto (SR3 p.114); allowed for every other mode and
  // for melee/thrown/projectile single-target attacks.
  const calledShotAllowed = !(this.type === 'firearm' && fireModeResult?.mode === 'FA');

  // --- The GM sets the situational TN FIRST -------------------------------------
  //
  // Order matters for the human, not the code: the attacker should not be asked to
  // commit Combat Pool against a target number they cannot see yet. So the GM's
  // modifier window resolves BEFORE the attacker's screen opens, and its result
  // becomes the base the attacker's own declarations (range, called shot, take aim)
  // adjust from. Writes nothing either way — see the SR3EQuery negotiate handler.
  // Take Aim cap, SR3 p.107: "The maximum number of sequential Take Aim actions a
  // character may take is equal to one-half the character's base skill or
  // specialization (if applicable) with that weapon, rounded down." Resolved here
  // because the roll-options dialog opens before step 4 looks the skill up.
  const _aimSkillName = this._getWeaponSkill();
  const _aimSkill     = actor.items.find(i =>
    i.type === 'skill' && (i.name === _aimSkillName || i.name.includes(_aimSkillName)));
  const _maxAim = Math.max(0, Math.floor((_aimSkill?.system?.skillRating ?? 0) / 2));

  const _baseTNForGM = 4 + extraTNMod;
  const negotiation = await game.sr3e.SR3EQuery.asGM('sr3e.attack.negotiate', {
    attackerUuid: actor.uuid,
    defenderUuid: targetActor.uuid,
    weaponId:     this.id,
    attackerName: actor.name,
    targetName:   targetActor.name,
    weaponName:   this.name,
    baseTN:       _baseTNForGM,
    baseNote:     tnBreakdownParts.length ? tnBreakdownParts.join(' | ') : null,
  }, { timeout: 300_000 });

  if (negotiation === null) return null;   // GM cancelled the attack — nothing written

  // How much the GM moved the TN. Applied on top of the attacker's own dialog maths
  // so range/called-shot/aim keep working exactly as before rather than being
  // silently overridden.
  const gmTNDelta = Number.isFinite(negotiation?.tn) ? (negotiation.tn - _baseTNForGM) : 0;

  const weaponOpts = await SR3EItem._promptWeaponRollOptions(targetActor, rawDamage, actor, extraTNMod,
    tnBreakdownParts.length ? tnBreakdownParts.join(' | ') : null, rangeInfo, calledShotAllowed,
    // Lock the attacker's TN field only when a GM actually adjudicated. `negotiation.mods`
    // must NOT be used for this: the skip path returns `{}`, which is truthy, so the field
    // locked on every GM-run NPC attack with no window to unlock it (TODO 50).
    { gmTNDelta, gmSetTN: negotiation?.adjudicated === true, maxAim: _maxAim });
  if (!weaponOpts) return null;

  // Anti-Vehicle ammo bypasses the vehicle Power/2 reduction (same effect as the AV-munition checkbox)
  if (ammoType === 'antiVehicle') weaponOpts.avMunition = true;

  let tn = weaponOpts.tn;
  options.useKarma    = weaponOpts.useKarma;
  options.karmaReroll = weaponOpts.karmaReroll;

  // Resolve final damage (vehicle modifier unless AV munition)
  let effectiveRawDamage = weaponOpts.damageCode;
  let damageBase = SR3EItem.parseDamageCode(effectiveRawDamage, actor);
  if (!damageBase) {
    ui.notifications.warn(`${this.name} has no damage code set. Edit the item to add one (e.g. 9M, (STR+2)M, 6S Stun).`);
  }
  if (targetActor.type === 'vehicle' && !weaponOpts.avMunition && damageBase) {
    const levelDown = { D: 'S', S: 'M', M: 'L', L: 'L' };
    const newPower  = Math.ceil(damageBase.power / 2);
    const newLevel  = levelDown[damageBase.level] ?? damageBase.level;
    damageBase = { ...damageBase, power: newPower, level: newLevel };
    effectiveRawDamage = `${newPower}${newLevel}${damageBase.isStun ? ' Stun' : ''}`;
  }

  // The defender declares nothing yet — under RAW they decide after this roll
  // resolves (SR3 sequence step 4). See SR3EActor.handleDodgeDeclare.
  let committedDodgeDice = 0;

  // --- Step 4: Build attacker pool ---
  const skillName = this._getWeaponSkill();
  const skill = actor.items.find(i =>
    i.type === 'skill' &&
    (i.name === skillName || i.name.includes(skillName))
  );

  let pool  = 0;
  let label = `${this.name}`;
  if (damageBase) label += ` [${effectiveRawDamage}]`;
  label += ` vs ${targetActor.name}`;

  let defTnMod = 0, defAllowPool = false, defPoolCap = Infinity;
  if (skill) {
    // Improved Ability / augmentation dice for this weapon's skill.
    const bonusDice  = SR3EItem._skillBonusDice(actor, skill);
    pool = (skill.system.skillRating || 0) + bonusDice;
    const skillSpec  = skill.system.specialisation;
    const baseRating = skill.system.skillRating || 0;
    const bonusNote  = bonusDice ? ` +${bonusDice}` : '';
    const specMatch  = skillSpec && (
      this.name.toLowerCase() === skillSpec.toLowerCase() ||
      this.name.toLowerCase().includes(skillSpec.toLowerCase())
    );
    if (specMatch) {
      pool += 2;
      label += ` (${skill.name} ${baseRating}${bonusNote} (${baseRating + bonusDice + 2}) — ${skillSpec})`;
    } else {
      label += ` (${skill.name} ${baseRating}${bonusNote})`;
    }
  } else {
    // SR3 Default Table — let the user choose specialization / skill / attribute.
    const def = await SR3EItem.promptDefaultChoice(actor, {
      linkedAttr: this._getDefaultAttribute(),
      message:    `No appropriate weapon skill — choose how to default:`,
    });
    if (!def) return null;   // cancelled
    pool         = def.pool;
    defTnMod     = def.tnMod;
    defAllowPool = def.allowPool;
    defPoolCap   = def.poolCap;
    label       += ` — ${def.label}`;
  }

  // Combat Pool was allocated on the roll-options screen, alongside the GM's TN —
  // one dialog, one click, and the attacker could see what they were allocating
  // against. Pool is not allowed when defaulting to an attribute (SR3 Default Table).
  //
  // That screen opens BEFORE defaulting is resolved (skill lookup happens after), so
  // it cannot know the Default Table's pool cap at offer time. The cap is enforced
  // here instead, at the point of actually spending — clamping what was requested
  // rather than what was offered (SR3 p.84-85: half the rating defaulted from).
  {
    const requested  = (skill || defAllowPool)
      ? Math.min(Math.max(0, weaponOpts.poolDice ?? 0), defPoolCap)
      : 0;
    const combatDice = requested > 0 ? await actor.spendCombatPool(requested) : 0;
    if (combatDice > 0) {
      pool  += combatDice;
      label += ` + ${combatDice} Combat Pool`;
    }
  }

  // Note the called shot on the card label (the +4 TN is already baked into tn; a
  // stage-up has already been applied to effectiveRawDamage).
  if (weaponOpts.calledShot === 'stage') {
    label += ' — 🎯 Called Shot (damage staged up)';
  } else if (weaponOpts.calledShot === 'subtarget') {
    label += ` — 🎯 Called Shot${weaponOpts.calledShotTarget ? `: ${weaponOpts.calledShotTarget}` : ''}`;
  }

  pool  = Math.max(1, pool);
  tn    = tn + defTnMod;   // bake defaulting TN modifier

  // ╔════════════════════ POINT OF NO RETURN ════════════════════════════════╗
  // Every abort path is behind us: the fire-mode dialog, the GM's TN window, the
  // SR3 Default Table and the Combat Pool dialog can all still cancel ABOVE this
  // line, and cancelling any of them writes nothing anywhere.
  //
  // NOTHING belonging to the DEFENDER is touched here at all. Per the SR3 sequence
  // the defender does not decide until step 4, after this roll resolves, so their
  // pool is spent by SR3EActor.handleDodgeDeclare when they actually choose to
  // spend it. Only the attacker's own resources are committed below.
  //
  // DO NOT ADD A WRITE ABOVE THIS BLOCK. The attacker's own commits (recoil,
  // magazine, nocked round, thrown quantity) are all already below it.
  // ╚════════════════════════════════════════════════════════════════════════╝

  // Store full context
  options.weaponItemId       = this.id;
  options.actorId            = actor.id;
  options.targetActorId      = targetActor.id;
  options.rawDamage          = effectiveRawDamage;
  options.damageBase         = damageBase;
  options.isWeaponRoll       = true;
  options.isMelee            = ['melee'].includes(this.type);
  options.committedDodgeDice = committedDodgeDice;
  options.skipWoundMod       = true;
  options.ammoType           = ammoType;   // carried to the soak card for APDS/Flechette

  // Commit recoil — update rounds fired counter before the roll
  if (fireModeRounds > 0) {
    const currentRounds = actor.system.roundsFiredThisPhase ?? 0;
    await actor.update({ 'system.roundsFiredThisPhase': currentRounds + fireModeRounds });
  }

  // Decrement the weapon's loaded magazine when tracking is enabled. Bullets fired =
  // max(1, mode rounds) plus walking-fire waste. Warns (never blocks) when the mag runs dry.
  if (this.type === 'firearm' && game.settings.get('The2ndChumming3e', 'trackAmmo')) {
    const bulletsFired = Math.max(1, fireModeResult?.rounds ?? 1) + (fireModeResult?.roundsWasted ?? 0);
    const loaded       = this.system.loadedRounds ?? 0;
    if (loaded <= 0) {
      ui.notifications.warn(`${this.name} has no rounds loaded — firing anyway. Reload from the weapons tab.`);
    } else {
      const newLoaded = Math.max(0, loaded - bulletsFired);
      await this.update({ 'system.loadedRounds': newLoaded });
      if (newLoaded === 0)          ui.notifications.warn(`${this.name} is now empty — reload.`);
      else if (loaded < bulletsFired) ui.notifications.warn(`${this.name} ran dry mid-burst (${loaded} were loaded).`);
    }
  }

  // Bows/crossbows spend their single nocked arrow/bolt; must re-nock before firing again.
  if (this._usesNockedAmmo() && game.settings.get('The2ndChumming3e', 'trackAmmo')) {
    const loaded = this.system.loadedRounds ?? 0;
    if (loaded > 0) {
      await this.update({ 'system.loadedRounds': loaded - 1 });
      const noun = this._weaponLoadMechanism() === 'bolt' ? 'bolt' : 'arrow';
      ui.notifications.info(`${this.name} loosed — no ${noun} nocked. Reload to nock another.`);
    }
  }

  await this._consumeThrown();
  return actor.rollPool(pool, tn, label, options);
}

  /**
   * Vehicle / drone weapon attack flow.
   *
   * Pool:
   *   VCR / RCR mode (driverActorId set): pilot actor's Gunnery skill + wound mod
   *   Autonomous (no driverActorId):      vehicle's Pilot rating
   *
   * TN: target Sig + range modifier (editable)
   * Fire Control: bonus dice added to pool (vehicle mod)
   */
  async rollVehicleWeapon(options = {}) {
    const actor = this.actor;
    if (!actor) { ui.notifications.warn('No actor for this weapon.'); return null; }

    const rawDamage = this.system.damage || '';

    // Step 1: Target
    const targetActor = await SR3EItem._promptTarget(actor);
    if (!targetActor) return null;

    // Step 2: Resolve attacker pool
    const driverActId = actor.system.driverActorId?.trim() ?? '';
    const controlMode = actor.system.controlMode ?? '';
    const vcrMode     = controlMode === 'vcr';
    let   pilotActor  = driverActId ? game.actors.get(driverActId) : null;
    let   pool          = 0;
    let   poolLabel     = '';
    let   pilotWoundMod = 0;
    let   gunneryDefaulting   = false;
    let   gunneryDefTnMod     = 0;
    let   gunneryDefAllowPool = false;
    let   gunneryDefPoolCap   = Infinity;

    let vcrLevel = 0;
    if (pilotActor) {
      const modeLabel  = vcrMode ? 'VCR' : 'RCD';
      const gunnery    = pilotActor.items.find(i => i.type === 'skill' && /gunnery/i.test(i.name));
      if (gunnery) {
        // Improved Ability / augmentation dice on the gunner's Gunnery skill.
        const bonusDice = SR3EItem._skillBonusDice(pilotActor, gunnery);
        const base = (gunnery.system.skillRating ?? gunnery.system.rating ?? 0) + bonusDice;
        const shown = `${gunnery.system.skillRating ?? gunnery.system.rating ?? 0}${bonusDice ? ` +${bonusDice}` : ''}`;
        const spec  = gunnery.system.specialisation ?? '';
        const specMatch = spec && (
          this.name.toLowerCase().includes(spec.toLowerCase()) ||
          (this.system.weaponType ?? '').toLowerCase().includes(spec.toLowerCase())
        );
        pool      = specMatch ? base + 2 : base;
        poolLabel = specMatch
          ? `${pilotActor.name} (${modeLabel}): Gunnery ${shown} (${pool}) — ${spec}`
          : `${pilotActor.name} (${modeLabel}): Gunnery ${shown}`;
      } else {
        // SR3 Default Table — let the user choose specialization / skill / attribute for the pilot.
        const def = await SR3EItem.promptDefaultChoice(pilotActor, {
          linkedAttr: 'intelligence',
          message:    `${pilotActor.name} has no <strong>Gunnery</strong> skill — choose how to default:`,
        });
        if (!def) return null;   // cancelled
        pool                = def.pool;
        poolLabel           = `${pilotActor.name} (${modeLabel}): ${def.label}`;
        gunneryDefaulting   = true;
        gunneryDefTnMod     = def.tnMod;
        gunneryDefAllowPool = def.allowPool;
        gunneryDefPoolCap   = def.poolCap;
      }
      const stunVal = pilotActor.system.wounds?.stun?.value     ?? 0;
      const physVal = pilotActor.system.wounds?.physical?.value ?? 0;
      pilotWoundMod = -(game.sr3e.SR3EActor._trackMod(stunVal) + game.sr3e.SR3EActor._trackMod(physVal));
      pool += pilotWoundMod;

      if (vcrMode) {
        const activeVCRId = pilotActor.system.activeVCRItemId ?? '';
        const vcrItem = activeVCRId
          ? pilotActor.items.get(activeVCRId)
          : pilotActor.items.find(i => i.type === 'cyberware' && /vcr|vehicle\s*control\s*rig/i.test(i.name));
        if (vcrItem) vcrLevel = vcrItem.system.rating ?? 1;
      }
    } else {
      const pilotRating = actor.system.attributes?.pilot?.base ?? 0;
      pool      = pilotRating;
      poolLabel = `Autonomous: Pilot ${pilotRating}`;
    }

    // Control Pool for gunnery: VCR only (reaction.base + VCR level, no wired reflexes).
    // RCD cannot use Control Pool for weapon tests; Auto has no pool at all.
    let controlPoolMax = 0;
    if (vcrMode && pilotActor) {
      const reactionBase = pilotActor.system.attributes?.reaction?.base ?? 0;
      controlPoolMax = Math.max(0, reactionBase + vcrLevel);
    }
    // No pool dice allowed when defaulting to an attribute.
    if (gunneryDefaulting) controlPoolMax = Math.min(controlPoolMax, gunneryDefPoolCap);

    // Step 3: Roll options dialog
    const baseSig  = targetActor.type === 'vehicle'
      ? (targetActor.system.attributes?.sig?.base ?? 4)
      : 4;
    const weaponOpts = await SR3EItem._promptVehicleWeaponRollOptions(
      this, targetActor, pool, poolLabel, baseSig, rawDamage, vcrLevel, controlPoolMax
    );
    if (!weaponOpts) return null;

    const finalPool = Math.max(1, pool + weaponOpts.controlPool);
    const tn        = weaponOpts.tn + gunneryDefTnMod;   // bake defaulting TN modifier
    const cpNote    = weaponOpts.controlPool > 0 ? ` + CP${weaponOpts.controlPool}` : '';
    const label     = `🚗 ${this.name} [${weaponOpts.damageCode}] vs ${targetActor.name} — ${poolLabel}${cpNote}`;

    // Step 4: Vehicle damage modifier (unless AV munition)
    let effectiveRawDamage = weaponOpts.damageCode;
    let damageBase = SR3EItem.parseDamageCode(effectiveRawDamage, actor);
    if (!damageBase) {
      ui.notifications.warn(`${this.name} has no damage code set.`);
    }
    if (targetActor.type === 'vehicle' && !weaponOpts.avMunition && damageBase) {
      const levelDown = { D: 'S', S: 'M', M: 'L', L: 'L' };
      const newPower  = Math.ceil(damageBase.power / 2);
      const newLevel  = levelDown[damageBase.level] ?? damageBase.level;
      damageBase = { ...damageBase, power: newPower, level: newLevel };
      effectiveRawDamage = `${newPower}${newLevel}${damageBase.isStun ? ' Stun' : ''}`;
    }

    options.weaponItemId       = this.id;
    options.actorId            = actor.id;
    options.targetActorId      = targetActor.id;
    options.rawDamage          = effectiveRawDamage;
    options.damageBase         = damageBase;
    options.isWeaponRoll       = true;
    options.isMelee            = false;
    options.committedDodgeDice = 0;

    return actor.rollPool(finalPool, tn, label, options);
  }

  /**
   * Roll options dialog for vehicle weapon attacks.
   */
  static async _promptVehicleWeaponRollOptions(weapon, targetActor, pool, poolLabel, baseSig, rawDamage, vcrLevel = 0, controlPoolMax = 0) {
    const isVehicleTarget = targetActor.type === 'vehicle';
    const sensorRating    = weapon.actor?.system.attributes?.sensor?.base ?? 0;
    const tnReduction     = vcrLevel > 0 ? vcrLevel : sensorRating;
    const tnReductionLabel = vcrLevel > 0 ? `VCR Lv${vcrLevel}` : `Sensor ${sensorRating}`;
    const defaultTN       = Math.max(2, baseSig - tnReduction);

    // Signal-degradation modifiers on the firing vehicle's network: manual gunnery suffers the
    // Simsense penalty, indirect fire the System penalty (R3 p.145). Folded into the TN live.
    const SR3EActor = game.sr3e.SR3EActor;
    const simMod = SR3EActor._signalTierMod(weapon.actor?.system?.signalMonitor?.simsense ?? 0);
    const sysMod = SR3EActor._signalTierMod(weapon.actor?.system?.signalMonitor?.system ?? 0);
    const shotOpts = [
      ['direct',   0,      'Direct fire (no network mod)'],
      ['manual',   simMod, `Manual gunnery (Simsense +${simMod})`],
      ['indirect', sysMod, `Indirect fire (System +${sysMod})`],
    ];

    let hookId = Hooks.on('renderDialogV2', (_app, html) => {
      const el = html?.querySelector ? html : html?.[0];
      if (!el?.querySelector?.('#vw-shottype')) return;
      Hooks.off('renderDialogV2', hookId);
      const sel = el.querySelector('#vw-shottype');
      const sig = el.querySelector('#vw-sig');
      sel.addEventListener('change', () => {
        const mod = parseInt(sel.selectedOptions[0]?.dataset.mod) || 0;
        if (sig) sig.value = defaultTN + mod;
      });
    });

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${weapon.name} — Attack Options` },
      content: `
        <style>
          .vw-info { background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);padding:8px;font-size:12px;margin-bottom:10px; }
          .vw-info-row { display:flex;justify-content:space-between;margin:2px 0;color:var(--sr-muted); }
          .vw-info-row span:last-child { color:var(--sr-text);font-weight:bold; }
          .vw-grid { display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;font-size:12px; }
          .vw-full { grid-column:1/-1; }
          label.vw-field { display:flex;flex-direction:column;gap:3px;color:var(--sr-muted); }
          label.vw-field select, label.vw-field input {
            background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-accent);
            border-radius:var(--r);padding:2px 5px;width:100%;box-sizing:border-box;
          }
        </style>
        <div class="vw-info">
          <div class="vw-info-row"><span>Pool</span><span>${poolLabel}</span></div>
          <div class="vw-info-row"><span>Sensor</span><span>${sensorRating}</span></div>
          <div class="vw-info-row"><span>Target</span><span>${targetActor.name}${isVehicleTarget ? ` (Sig ${baseSig})` : ''}</span></div>
          ${tnReduction ? `<div class="vw-info-row">
            <span style="color:var(--sr-accent)">${tnReductionLabel} TN reduction</span>
            <span style="color:var(--sr-accent)">−${tnReduction} (${baseSig} → ${defaultTN})</span>
          </div>` : ''}
        </div>
        <div class="vw-grid">
          <label class="vw-field">Base TN (Sig)
            <input type="number" id="vw-sig" value="${defaultTN}" min="2" max="30"/>
          </label>
          <label class="vw-field">Range modifier
            <select id="vw-range">
              <option value="0">Short (+0)</option>
              <option value="2">Medium (+2)</option>
              <option value="4">Long (+4)</option>
              <option value="8">Extreme (+8)</option>
            </select>
          </label>
          ${(simMod || sysMod) ? `
          <label class="vw-field vw-full" title="Network degradation modifies gunnery through the drone">Shot type (signal degradation)
            <select id="vw-shottype">
              ${shotOpts.map(([k, m, lbl]) => `<option value="${k}" data-mod="${m}">${lbl}</option>`).join('')}
            </select>
          </label>` : ''}
          ${controlPoolMax > 0
            ? `<label class="vw-field">Control Pool dice (max ${controlPoolMax})
                 <input type="number" id="vw-fc" value="${controlPoolMax}" min="0" max="${controlPoolMax}"/>
               </label>`
            : `<label class="vw-field" style="color:var(--sr-muted)">Control Pool
                 <input type="number" id="vw-fc" value="0" min="0" max="0" disabled style="opacity:0.4"
                        title="Control Pool unavailable — VCR required for gunnery"/>
               </label>`
          }
          <label class="vw-field">Damage Code
            <input type="text" id="vw-damage" value="${rawDamage}"/>
          </label>
          ${isVehicleTarget ? `
            <div class="vw-full" style="padding:6px 8px;background:var(--sr-surface);border:1px solid var(--sr-accent);border-radius:var(--r);font-size:11px">
              <div style="color:var(--sr-accent);margin-bottom:4px">⚠ Vehicle target: Power ÷2 (round up), Stage −1</div>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="checkbox" id="vw-av"/>
                AV munition <span style="color:var(--sr-muted)">(removes vehicle modifier)</span>
              </label>
            </div>
          ` : ''}
        </div>
      `,
      buttons: [
        {
          label: 'Roll',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            const el  = dialog.element;
            const sig = Math.max(2, parseInt(el.querySelector('#vw-sig')?.value)   || baseSig);
            const rng = parseInt(el.querySelector('#vw-range')?.value) || 0;
            result = {
              tn:          Math.max(2, sig + rng),
              controlPool: Math.max(0, parseInt(el.querySelector('#vw-fc')?.value) || 0),
              damageCode:  el.querySelector('#vw-damage')?.value.trim() || rawDamage,
              avMunition:  el.querySelector('#vw-av')?.checked ?? false,
            };
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (hookId) Hooks.off('renderDialogV2', hookId);
    return result;
  }

  /**
   * True for weapons consumed on use (thrown weapons / grenades). Bows are reusable.
   */
  _isConsumable() {
    if (this.type === 'thrown') return true;
    if (this.type === 'projectile') {
      return game.sr3e.SR3E.thrownCategories.includes(this.system.category ?? '');
    }
    return false;
  }

  /**
   * True for bows/crossbows that nock a single arrow/bolt from the ammo stockpile
   * (capacity 1, deplete like firearm magazines). Slings are excluded by config.
   */
  _usesNockedAmmo() {
    return this.type === 'projectile'
      && !!game.sr3e.SR3E.nockedAmmoByCategory?.[this.system.category ?? ''];
  }

  /**
   * The loading mechanism this weapon feeds from — firearms parse it from their ammo-capacity
   * string ("15(c)" → 'c'); nocked bows/crossbows map their category → 'arrow' / 'bolt'.
   */
  _weaponLoadMechanism() {
    if (this.type === 'firearm') return SR3EItem._parseLoadMechanism(this.system.ammunition ?? '');
    if (this.type === 'projectile') return game.sr3e.SR3E.nockedAmmoByCategory?.[this.system.category ?? ''] ?? '';
    return '';
  }

  /**
   * Magazine size — firearms parse it from the ammo-capacity string; nocked bows/crossbows
   * hold exactly one round.
   */
  _weaponMagazineSize() {
    if (this.type === 'firearm') return SR3EItem._parseMagazineSize(this.system.ammunition ?? '');
    if (this._usesNockedAmmo()) return 1;
    return 0;
  }

  /**
   * Decrement a thrown weapon's quantity by one when ammo tracking is on.
   */
  async _consumeThrown() {
    if (!this._isConsumable()) return;
    if (!game.settings.get('The2ndChumming3e', 'trackAmmo')) return;
    const qty = this.system.quantity ?? 0;
    if (qty <= 0) return; // guarded earlier, but be safe
    const newQty = qty - 1;
    await this.update({ 'system.quantity': newQty });
    if (newQty === 0) ui.notifications.warn(`That was your last ${this.name}.`);
  }

  /**
   * Parse a weapon's loading mechanism from its ammo-capacity string.
   * e.g. "15(c)" → 'c', "5 (cy)" → 'cy', "40(sb)" → 'sb', "(Internal)" → 'internal'.
   * Matches the longest code first so "cy"/"sb" win over "c"/"s". Returns '' if none found.
   */
  static _parseLoadMechanism(ammoCapacityStr) {
    const m = String(ammoCapacityStr ?? '').match(/\(([^)]+)\)/);
    if (!m) return '';
    const code = m[1].trim().toLowerCase();
    const keys = Object.keys(game.sr3e.SR3E.ammoLoadMechanisms);
    // exact match first, then longest-prefix
    if (keys.includes(code)) return code;
    const sorted = keys.slice().sort((a, b) => b.length - a.length);
    return sorted.find(k => code.startsWith(k)) ?? '';
  }

  /**
   * Parse a weapon's magazine size (the number) from its ammo-capacity string.
   * e.g. "15(c)" → 15, "5 (cy)" → 5, "(Internal)" → 0. Returns 0 if no number.
   */
  static _parseMagazineSize(ammoCapacityStr) {
    const m = String(ammoCapacityStr ?? '').match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }

  /**
   * This weapon's range bands [shortMax, mediumMax, longMax, extremeMax] in metres.
   * Priority: weapon rangeOverride ("5/15/30/50") → fixed category table (firearms,
   * SR3E.weaponRanges) → Strength-scaled table (bows/thrown, SR3E.weaponRangeMultipliers
   * × the attacker's Strength). Returns null if none apply.
   */
  _getRangeBands(actor = this.actor) {
    const override = (this.system.rangeOverride ?? '').trim();
    if (override) {
      const parts = override.split(/[\/,\s]+/).map(Number).filter(n => !isNaN(n));
      if (parts.length === 4) return parts;
    }
    const cat = this.system.category ?? '';
    const fixed = game.sr3e.SR3E.weaponRanges?.[cat];
    if (fixed) return fixed;
    const mult = game.sr3e.SR3E.weaponRangeMultipliers?.[cat];
    if (mult) {
      const str = Math.max(1, actor?.system?.attributes?.strength?.value
                            ?? actor?.system?.attributes?.strength?.base ?? 1);
      return mult.map(m => m * str);
    }
    return null;
  }

  /**
   * Classify a distance (metres) into a range band. Returns
   * { idx, label, tnMod, beyond } — beyond=true means past Extreme (out of range).
   */
  static _rangeBandForDistance(bands, metres) {
    const labels = ['Short', 'Medium', 'Long', 'Extreme'];
    const tn     = game.sr3e.SR3E.rangeTN ?? [0, 1, 2, 3];
    for (let i = 0; i < 4; i++) {
      if (metres <= bands[i]) return { idx: i, label: labels[i], tnMod: tn[i] ?? 0, beyond: false };
    }
    return { idx: 3, label: 'Beyond Extreme', tnMod: tn[3] ?? 3, beyond: true };
  }

  /**
   * Grid distance (scene units, assumed metres) between two tokens, or null if it
   * can't be measured (missing token, different scenes, no canvas).
   */
  static _measureDistance(aToken, tToken) {
    if (!aToken || !tToken || !canvas?.ready) return null;
    const aScene = aToken.scene?.id ?? aToken.document?.parent?.id;
    const tScene = tToken.scene?.id ?? tToken.document?.parent?.id;
    if (aScene && tScene && aScene !== tScene) return null;
    const a = aToken.center ?? aToken.object?.center;
    const t = tToken.center ?? tToken.object?.center;
    if (!a || !t) return null;
    try {
      const path = canvas.grid.measurePath([a, t]);
      return path?.distance ?? null;
    } catch {
      return null;
    }
  }

  /**
   * True when two tokens occupy the same or an adjacent square (the 8 surrounding squares) —
   * "adjacent squares only" for melee, independent of the scene's diagonal rule. Returns true
   * when adjacency can't be determined (no canvas/tokens) so callers never warn spuriously.
   */
  static _tokensAdjacent(aToken, tToken) {
    if (!aToken || !tToken || !canvas?.ready) return true;
    const a = aToken.center ?? aToken.object?.center;
    const t = tToken.center ?? tToken.object?.center;
    if (!a || !t) return true;
    try {
      const ao = canvas.grid.getOffset(a);
      const to = canvas.grid.getOffset(t);
      return Math.abs(ao.i - to.i) <= 1 && Math.abs(ao.j - to.j) <= 1;
    } catch {
      const dM = SR3EItem._measureDistance(aToken, tToken);
      const gridM = canvas.dimensions?.distance ?? 1;
      return dM == null || dM <= gridM * 1.5;
    }
  }

  /**
   * Resolve the attack target. Prefers a single canvas target (the "T" tool) so its
   * token can be measured; returns { actor, token } or null to fall back to the dialog.
   */
  static _acquireCanvasTarget() {
    const targets = Array.from(game.user?.targets ?? []);
    if (targets.length === 1 && targets[0]?.actor) {
      return { actor: targets[0].actor, token: targets[0] };
    }
    return null;
  }

  /**
   * Reload this firearm from the actor's ammo stockpile.
   * Magazine size comes from the gun's ammo-capacity string; compatible stock is
   * filtered by loading mechanism. Full-swap: any rounds left in the old mag are
   * discarded. When ammo tracking is off, only the loaded type is set (no stock math).
   */
  async reload() {
    if (this.type !== 'firearm' && !this._usesNockedAmmo()) return;
    const actor = this.actor;
    if (!actor) return;
    const SR3E    = game.sr3e.SR3E;
    const trackOn = game.settings.get('The2ndChumming3e', 'trackAmmo');
    const gunMech = this._weaponLoadMechanism();
    const magSize = this._weaponMagazineSize();

    if (trackOn && magSize <= 0) {
      ui.notifications.warn(`${this.name} has no magazine size — set its ammo capacity (e.g. 15(c)) on the item.`);
      return;
    }

    let stock = actor.items.filter(i =>
      i.type === 'ammunition' && (!gunMech || (i.system.loadMechanism ?? 'c') === gunMech));
    if (trackOn) stock = stock.filter(i => (i.system.rounds ?? 0) > 0);
    if (stock.length === 0) {
      ui.notifications.warn(`No compatible ammo in stock for ${this.name}.`);
      return;
    }

    const chosenId = await SR3EItem._promptReloadChoice(stock, this, magSize, trackOn);
    if (!chosenId) return;
    const ammo = actor.items.get(chosenId);
    if (!ammo) return;
    const type      = ammo.system.ammoType ?? 'regular';
    const typeLabel = SR3E.ammoTypes[type]?.label ?? 'Regular';

    if (trackOn) {
      const avail  = ammo.system.rounds ?? 0;
      const loaded = Math.min(magSize, avail);
      await ammo.update({ 'system.rounds': Math.max(0, avail - loaded) });
      await this.update({ 'system.loadedAmmoType': type, 'system.loadedRounds': loaded });
      ui.notifications.info(`${this.name} loaded: ${loaded} × ${typeLabel}${loaded < magSize ? ` (stock ran short of ${magSize})` : ''}.`);
    } else {
      await this.update({ 'system.loadedAmmoType': type, 'system.loadedRounds': magSize });
      ui.notifications.info(`${this.name} loaded with ${typeLabel}.`);
    }
  }

  /**
   * Reload dialog — pick which compatible stockpile to load. Returns ammo item id or null.
   */
  static async _promptReloadChoice(stock, weapon, magSize, trackOn) {
    const SR3E      = game.sr3e.SR3E;
    const mech      = weapon._weaponLoadMechanism();
    const mechLabel = mech ? (SR3E.ammoLoadMechanisms[mech] ?? mech) : '';
    const opts = stock.map((a, i) => {
      const typeLabel = SR3E.ammoTypes[a.system.ammoType ?? 'regular']?.label ?? 'Regular';
      const stockTxt  = trackOn ? ` — ${a.system.rounds ?? 0} in stock` : '';
      return `<option value="${a.id}" ${i === 0 ? 'selected' : ''}>${a.name} (${typeLabel})${stockTxt}</option>`;
    }).join('');

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${weapon.name} — Reload` },
      content: `
        <div style="padding:8px 0">
          <p style="margin:0 0 8px;font-size:12px;color:var(--sr-muted)">
            Choose ammo to load${mechLabel ? ` (only <strong>${mechLabel}</strong>-fed ammo shown)` : ''}.${trackOn ? ` Loads up to <strong>${magSize}</strong> rounds; any in the current magazine are discarded.` : ''}
          </p>
          <select id="reload-select" style="width:100%">${opts}</select>
        </div>`,
      buttons: [
        {
          label: 'Reload',
          action: 'reload',
          default: true,
          callback: (_e, _b, dialog) => {
            result = dialog.element.querySelector('#reload-select')?.value ?? null;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    return result;
  }

  /**
   * Nominate a circular blast point on the canvas. Draws a plain PIXI circle that follows
   * the cursor — no MeasuredTemplate document OR placeable (both are deprecated in Foundry
   * v14, merged into Region) — so nothing here emits a compatibility warning. Left-click
   * detonates, right-click / Esc cancels. Returns { center, radius } (scene coords) or null.
   */
  static async _placeBlastTemplate(actor, radius) {
    if (!canvas?.ready) return null;
    const aToken = actor.getActiveTokens?.()[0] ?? null;
    const origin = aToken
      ? { x: aToken.center.x, y: aToken.center.y }
      : { x: canvas.dimensions.width / 2, y: canvas.dimensions.height / 2 };

    const pxPerM   = canvas.dimensions.size / canvas.dimensions.distance;
    const radiusPx = Math.max(1, radius * pxPerM);

    // The layer holding our graphics shares the scene coordinate system, so positions read
    // back directly as scene coords (what aoeCenter / token.center expect).
    const layer = canvas.interface ?? canvas.primary ?? canvas.stage;
    const g     = new PIXI.Graphics();
    layer.addChild(g);

    const draw = (x, y) => {
      g.clear();
      g.beginFill(0xcc3300, 0.20);
      g.lineStyle(2, 0xcc3300, 0.9);
      g.drawCircle(x, y, radiusPx);
      g.endFill();
    };
    const snap = (x, y) => {
      try {
        const p = canvas.grid.getSnappedPoint({ x, y }, { mode: CONST.GRID_SNAPPING_MODES.CENTER });
        return { x: p.x, y: p.y };
      } catch { return { x, y }; }
    };

    let cx = origin.x, cy = origin.y;
    draw(cx, cy);

    ui.notifications.info(`Aim the ${radius}m blast — left-click to detonate, right-click or Esc to cancel.`);

    return await new Promise(resolve => {
      const cleanup = () => {
        canvas.stage.off('pointermove', onMove);
        canvas.stage.off('pointerdown', onDown);
        window.removeEventListener('keydown', onKey, true);
        canvas.app?.view?.removeEventListener?.('contextmenu', onContext, true);
        try { g.destroy(); } catch { /* ignore */ }
      };
      const onMove = (event) => {
        try {
          const local = layer.toLocal(event.global);
          const s = snap(local.x, local.y);
          cx = s.x; cy = s.y;
          draw(cx, cy);
        } catch { /* ignore */ }
      };
      const onDown = (event) => {
        const btn = event.button ?? event.data?.button ?? 0;
        if (btn !== 0) return;          // let right-click reach the contextmenu handler
        cleanup();
        resolve({ center: { x: cx, y: cy }, radius });
      };
      const onContext = (event) => { event.preventDefault(); cleanup(); resolve(null); };
      const onKey = (event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cleanup(); resolve(null); } };

      canvas.stage.on('pointermove', onMove);
      canvas.stage.on('pointerdown', onDown);
      window.addEventListener('keydown', onKey, true);
      canvas.app?.view?.addEventListener?.('contextmenu', onContext, true);
    });
  }

  /**
   * Roll options for a thrown / launched AoE weapon: TN (auto range mod by grenade type),
   * damage code, grenade type, and a Confined Space (Chunky Salsa) tickbox. Targets and
   * scatter are resolved AFTER the throw roll. opts.throwDistance = thrower→nominated metres.
   * Returns { tn, damageCode, grenadeType, useSalsaGUI, useKarma, karmaReroll } or null.
   */
  static async _promptWeaponRollOptionsAoE(rawDamage, actor, opts = {}) {
    const SR3E       = game.sr3e.SR3E;
    const karmaPool  = actor?.system.karmaPool ?? 0;
    const throwDist  = opts.throwDistance ?? null;
    const str        = Math.max(1, actor?.system?.attributes?.strength?.value
                              ?? actor?.system?.attributes?.strength?.base ?? 1);
    const rangeTNarr = SR3E.rangeTN ?? [0, 1, 2, 5];
    const gTypes     = SR3E.grenadeTypes ?? {};

    // Range band for a grenade type at the throw distance → { label, tnMod, beyond } or null.
    function bandFor(type) {
      if (throwDist == null) return null;
      const cfg = gTypes[type]; if (!cfg) return null;
      const bands = cfg.rangeFixed ?? (cfg.rangeMult ? cfg.rangeMult.map(m => m * str) : null);
      if (!bands) return null;
      const labels = ['Short', 'Medium', 'Long', 'Extreme'];
      for (let i = 0; i < 4; i++) if (throwDist <= bands[i]) return { label: labels[i], tnMod: rangeTNarr[i] ?? 0, beyond: false };
      return { label: 'Beyond Extreme', tnMod: rangeTNarr[3] ?? 5, beyond: true };
    }

    const typeOpts  = Object.entries(gTypes).map(([k, v], i) =>
      `<option value="${k}" ${i === 0 ? 'selected' : ''}>${v.label}</option>`).join('');
    const initType  = Object.keys(gTypes)[0] ?? 'standard';
    const defaultTN = 4 + (bandFor(initType)?.tnMod ?? 0);

    const AOE_TITLE = 'AoE Weapon Roll Options';
    let aoeHookId;
    aoeHookId = Hooks.on('renderDialogV2', (app, html) => {
      if (app.options?.window?.title !== AOE_TITLE) return;
      Hooks.off('renderDialogV2', aoeHookId);
      const el = html?.querySelector ? html : (html?.[0] ?? null);
      if (!el) return;
      const sel  = el.querySelector('#sr-grenade-type');
      const tnIn = el.querySelector('#sr-tn');
      const note = el.querySelector('#sr-range-note');
      const recompute = () => {
        const b = bandFor(sel?.value);
        if (b && tnIn) tnIn.value = 4 + b.tnMod;
        if (note) note.textContent = b
          ? `Range: ${b.label} (${Math.round(throwDist)}m) → TN ${4 + b.tnMod}${b.beyond ? ' — beyond Extreme' : ''}`
          : '';
      };
      sel?.addEventListener('change', recompute);
      recompute();
    });

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: AOE_TITLE },
      content: `
        <div style="padding:8px 0">
          <div style="margin-bottom:10px"><label>Grenade Type:
            <select id="sr-grenade-type" style="margin-left:8px">${typeOpts}</select></label>
            <div id="sr-range-note" style="font-size:11px;color:var(--sr-amber);margin-top:4px"></div>
          </div>
          <div style="margin-bottom:10px"><label>Target Number (TN):
            <input type="number" id="sr-tn" value="${defaultTN}" min="2" max="30" style="width:60px;margin-left:8px"/></label></div>
          <div style="margin-bottom:10px"><label>Damage Code:
            <input type="text" id="sr-damage" value="${rawDamage}" style="width:80px;margin-left:8px"/></label></div>
          ${karmaPool > 0 ? `<div style="margin-bottom:10px"><label><input type="checkbox" id="sr-karma"/> Use Karma Pool (${karmaPool} available)</label></div>` : ''}
          <div style="margin-bottom:8px;padding:6px 8px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r)">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:bold">
              <input type="checkbox" id="salsa-toggle"/> 💥 Confined Space (Chunky Salsa)?
            </label>
            <div style="font-size:11px;color:var(--sr-muted);margin-top:4px">Resolved after the throw &amp; scatter, in the Chunky Salsa tool, on whoever is actually caught in the blast.</div>
          </div>
          <div style="color:var(--sr-muted);font-size:11px">Targets &amp; scatter are determined after you roll to throw. No dodge — those caught soak.</div>
        </div>
      `,
      buttons: [
        {
          label: 'Roll to Throw',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            const el = dialog.element;
            const useKarma = el.querySelector('#sr-karma')?.checked ?? false;
            result = {
              tn:          Math.max(2, parseInt(el.querySelector('#sr-tn')?.value) || 4),
              damageCode:  el.querySelector('#sr-damage')?.value.trim() || rawDamage,
              grenadeType: el.querySelector('#sr-grenade-type')?.value ?? initType,
              useSalsaGUI: el.querySelector('#salsa-toggle')?.checked ?? false,
              useKarma,
              karmaReroll: useKarma,
            };
          }
        },
        { label: 'Cancel', action: 'cancel' }
      ]
    });
    if (aoeHookId) Hooks.off('renderDialogV2', aoeHookId);
    return result;
  }

  static async _promptWeaponRollOptions(targetActor, rawDamage, actor, totalTNMod = 0, modBreakdown = null, rangeInfo = null, calledShotAllowed = true, gmCtx = {}) {
    const isVehicle  = targetActor.type === 'vehicle';
    const karmaPool  = actor?.system.karmaPool ?? 0;
    const rangeTNarr = game.sr3e.SR3E.rangeTN ?? [0, 1, 2, 5];
    const rangeLabels = ['Short', 'Medium', 'Long', 'Extreme'];

    // The GM has ALREADY set the situational TN by the time this opens — their
    // adjustment arrives as `gmCtx.gmTNDelta` and is folded into every TN the
    // dialog computes. The attacker's own declarations (range, called shot, take
    // aim) still adjust from there, because those are the attacker's call.
    const gmTNDelta   = Number(gmCtx.gmTNDelta) || 0;
    const gmWillSetTN = Boolean(gmCtx.gmSetTN) || gmTNDelta !== 0;
    // ⌊skill ÷ 2⌋ per SR3 p.107, computed by the caller which has the skill in hand.
    const maxAim      = Math.max(0, Number(gmCtx.maxAim) || 0);

    // Combat Pool is offered on THIS screen so the attacker allocates it while
    // looking at the target number they are allocating against — and so the whole
    // attack is one dialog instead of a chain of modals flashing past.
    const availPool = actor?.system?.derived?.availableCombatPool ?? 0;

    // Base TN excludes range; range is added from the (editable) dropdown below.
    // The GM's situational adjustment is folded in here so every downstream
    // computation — the default value and the live recompute — carries it.
    const baseTN     = 4 + totalTNMod + gmTNDelta;
    const initBand   = rangeInfo?.bandIdx ?? -1;
    const initRangeTN = initBand >= 0 ? (rangeTNarr[initBand] ?? 0) : 0;
    const defaultTN  = Math.max(2, baseTN + initRangeTN);

    const modNote   = (totalTNMod !== 0 || modBreakdown)
      ? `<div style="font-size:11px;color:var(--sr-amber);margin-top:4px">⚡ TN modifiers: ${modBreakdown ?? (totalTNMod > 0 ? `+${totalTNMod}` : totalTNMod)} (pre-applied)</div>`
      : '';

    // Range dropdown — pre-set to the measured band, but the GM can override it (the TN
    // recomputes live). Shows the measured distance for context.
    const rangeRow = rangeInfo ? `
      <div style="margin-bottom:10px">
        <label>Range:
          <select id="sr-range" data-base="${baseTN}" style="margin-left:8px">
            ${rangeLabels.map((l, i) => `<option value="${i}" ${i === initBand ? 'selected' : ''}>${l} (TN ${baseTN + (rangeTNarr[i] ?? 0)})</option>`).join('')}
          </select>
        </label>
        <span style="font-size:11px;color:var(--sr-muted);margin-left:8px">measured ${Math.round(rangeInfo.distance)}m${rangeInfo.beyond ? ' — beyond Extreme' : ''}</span>
      </div>` : '';

    // Called Shot (SR3 p.114) — declared before the roll. +4 TN for either staging the
    // base damage up one level OR aiming at a specific sub-component (vehicle-sized+).
    // Take Aim folds in as −1 TN per Simple Action. Not offered for Full-Auto (the caller
    // passes calledShotAllowed=false) or AoE (separate dialog entirely).
    const calledRow = calledShotAllowed ? `
      <div style="margin-bottom:10px;padding:8px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r)">
        <label>🎯 Called Shot:
          <select id="sr-called" style="margin-left:8px">
            <option value="none" selected>None</option>
            <option value="stage">Stage up damage (+4 TN)</option>
            <option value="subtarget">Specific sub-target (+4 TN)</option>
          </select>
        </label>
        <div id="sr-subtarget-row" style="margin-top:6px;display:none">
          <label>Component:
            <input type="text" id="sr-subtarget" placeholder="e.g. tires, window, fuel tank" style="width:170px;margin-left:8px"/>
          </label>
          <div style="font-size:10px;color:var(--sr-muted);margin-top:2px">Vehicle-sized or larger targets only — usually needs Moderate+ damage to destroy.</div>
        </div>
        <div style="margin-top:6px">
          <label>Take Aim (−1 TN each):
            <input type="number" id="sr-aim" value="0" min="0" max="${maxAim}"
                   style="width:50px;margin-left:8px" ${maxAim === 0 ? 'disabled' : ''}/>
          </label>
          <span style="font-size:10px;color:var(--sr-muted);margin-left:6px">
            1 Simple Action each${maxAim > 0
              ? ` · max <strong>${maxAim}</strong> (½ skill, rounded down — SR3 p.107)`
              : ' · no skill with this weapon, so no aiming'}.
          </span>
          <div style="font-size:10px;color:var(--sr-amber);margin-top:2px">
            ⚠ Aiming across multiple Combat Phases? Spending <em>any</em> pool dice loses the benefit (p.107).
          </div>
        </div>
      </div>` : '';

    // Live TN recompute, wired through DialogV2.wait's `render` option below.
    // NOT a `renderDialogV2` hook: that hook is global, so two attackers firing at
    // once register both handlers before either dialog renders — the first gets
    // wired twice with the second's closure, the second not at all, and the TN
    // silently stops updating. (The old comment here claimed `wait` does not call
    // `render`; that was wrong — see CLAUDE.md, corrected against dialog.mjs:420.)
    const wireRecompute = (_event, dialog) => {
      const el        = dialog.element;
      const tnInput   = el.querySelector('#sr-tn');
      const sel       = el.querySelector('#sr-range');
      const calledSel = el.querySelector('#sr-called');
      const aimInput  = el.querySelector('#sr-aim');
      const subRow    = el.querySelector('#sr-subtarget-row');
      const recompute = () => {
        const rangeTN = sel ? (rangeTNarr[parseInt(sel.value)] ?? 0) : initRangeTN;
        const called  = (calledSel && calledSel.value !== 'none') ? 4 : 0;
        // Clamp to the p.107 cap on READ — the input's `max` is advisory and a
        // typed value sails straight past it.
        const aim     = Math.min(maxAim, Math.max(0, parseInt(aimInput?.value) || 0));
        if (aimInput && (parseInt(aimInput.value) || 0) > maxAim) aimInput.value = maxAim;
        if (tnInput) tnInput.value = Math.max(2, baseTN + rangeTN + called - aim);
      };
      sel?.addEventListener('change', recompute);
      aimInput?.addEventListener('input', recompute);
      calledSel?.addEventListener('change', () => {
        if (subRow) subRow.style.display = calledSel.value === 'subtarget' ? '' : 'none';
        recompute();
      });
    };

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Weapon Roll Options' },
      content: `
        <div style="padding:8px 0">
          ${rangeRow}
          <div style="margin-bottom:10px">
            <label>Target Number (TN):
              <input type="number" id="sr-tn" value="${defaultTN}" min="2" max="30"
                     style="width:60px;margin-left:8px${gmWillSetTN ? ';opacity:.5' : ''}"
                     ${gmWillSetTN ? 'readonly tabindex="-1" title="The GM sets the final TN for this attack."' : ''}/>
            </label>
            ${gmWillSetTN
              ? `<div style="font-size:11px;color:var(--sr-green);margin-top:4px">
                   ✓ The GM has set this target number${gmTNDelta !== 0
                     ? ` (${gmTNDelta > 0 ? '+' : ''}${gmTNDelta} from situational modifiers)` : ''}.
                   Your range, called shot and take-aim choices adjust it below.
                 </div>`
              : ''}
            ${modNote}
          </div>
          <div style="margin-bottom:10px">
            <label>Damage Code:
              <input type="text" id="sr-damage" value="${rawDamage}" style="width:80px;margin-left:8px"/>
            </label>
          </div>
          ${calledRow}
          ${isVehicle ? `
            <div style="margin-bottom:10px;padding:8px;background:var(--sr-surface);border:1px solid var(--sr-accent);border-radius:var(--r)">
              <div style="color:var(--sr-accent);font-size:11px">⚠ Vehicle target: Power ÷2 (round up), Stage −1 will be applied <span style="color:var(--sr-muted)">(load Anti-Vehicle ammo to bypass)</span></div>
            </div>
          ` : ''}
          ${karmaPool > 0 ? `
            <div style="margin-bottom:10px">
              <label><input type="checkbox" id="sr-karma"/> Use Karma Pool (${karmaPool} available)</label>
            </div>
          ` : ''}
          <div style="margin:10px 0;padding:8px;background:var(--sr-surface);border-radius:var(--r)">
            <label>🎲 Combat Pool dice:
              <input type="number" id="sr-pool" value="0" min="0" max="${availPool}"
                     style="width:55px;margin-left:8px" ${availPool === 0 ? 'disabled' : ''}/>
            </label>
            <div style="font-size:10px;color:var(--sr-muted);margin-top:2px">
              ${availPool > 0
                ? `${availPool} available. Dice spent here are unavailable to resist damage.`
                : 'No Combat Pool available.'}
            </div>
          </div>
          <div style="color:var(--sr-muted);font-size:11px">Rule of Six (exploding 6s) always active</div>
        </div>
      `,
      buttons: [
        {
          // The attacker's roll trigger. The GM has already set the TN by this point,
          // so this dialog genuinely does roll — one screen, one click.
          label: '🎲 Roll',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            const html = dialog.element;
            const tn = Math.max(2, parseInt(html.querySelector('#sr-tn')?.value) || 4);
            const poolDice = Math.min(Math.max(0, parseInt(html.querySelector('#sr-pool')?.value) || 0), availPool);
            let damageCode = html.querySelector('#sr-damage')?.value.trim() || rawDamage;
            const useKarma   = html.querySelector('#sr-karma')?.checked ?? false;
            // Called shot: the TN penalty is already folded into #sr-tn above; here we
            // apply the "stage up one level" damage option and capture the sub-target.
            const calledShot       = html.querySelector('#sr-called')?.value ?? 'none';
            const calledShotTarget = (html.querySelector('#sr-subtarget')?.value || '').trim();
            if (calledShot === 'stage') {
              const p = SR3EItem.parseDamageCode(damageCode, actor);
              if (p) {
                const S = ['L', 'M', 'S', 'D'];
                let i = S.indexOf(p.level);
                i = i < 0 ? 1 : Math.min(3, i + 1);
                damageCode = `${p.power}${S[i]}${p.isStun ? ' Stun' : ''}`;
              }
            }
            // avMunition is now driven by Anti-Vehicle ammo type, not a manual checkbox
            result = { tn, damageCode, avMunition: false, useKarma, karmaReroll: useKarma,
                       calledShot, calledShotTarget, poolDice };
          }
        },
        { label: 'Cancel', action: 'cancel' }
      ],
      render: wireRecompute,
    });
    return result;
  }

  /**
   * Standalone Called Shot prompt (SR3 p.114) for flows that don't use the ranged
   * roll-options dialog — i.e. melee. Returns { calledShot, calledShotTarget, tnMod }
   * where tnMod = +4 (if a called shot is chosen) − take-aim points, or null if cancelled.
   */
  static async _promptCalledShot(actor) {
    let hookId = Hooks.on('renderDialogV2', (_app, html) => {
      const el = html?.querySelector ? html : html?.[0];
      if (!el?.querySelector?.('#sr-called-cs')) return; // not our dialog
      Hooks.off('renderDialogV2', hookId);
      const calledSel = el.querySelector('#sr-called-cs');
      const subRow    = el.querySelector('#sr-subtarget-row-cs');
      calledSel?.addEventListener('change', () => {
        if (subRow) subRow.style.display = calledSel.value === 'subtarget' ? '' : 'none';
      });
    });

    let result = { calledShot: 'none', calledShotTarget: '', tnMod: 0 };
    let cancelled = true;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Called Shot (optional)' },
      content: `
        <div style="padding:8px 0">
          <div style="margin-bottom:8px">
            <label>🎯 Called Shot:
              <select id="sr-called-cs" style="margin-left:8px">
                <option value="none" selected>None</option>
                <option value="stage">Stage up damage (+4 TN)</option>
                <option value="subtarget">Specific sub-target (+4 TN)</option>
              </select>
            </label>
          </div>
          <div id="sr-subtarget-row-cs" style="margin-bottom:8px;display:none">
            <label>Component:
              <input type="text" id="sr-subtarget-cs" placeholder="e.g. tires, window, fuel tank" style="width:170px;margin-left:8px"/>
            </label>
            <div style="font-size:10px;color:var(--sr-muted);margin-top:2px">Vehicle-sized or larger targets only.</div>
          </div>
          <div>
            <label>Take Aim (−1 TN each):
              <input type="number" id="sr-aim-cs" value="0" min="0" max="6" style="width:50px;margin-left:8px"/>
            </label>
          </div>
          <div style="color:var(--sr-muted);font-size:11px;margin-top:8px">The +4 TN is added to your attack TN on the boxing card.</div>
        </div>
      `,
      buttons: [
        {
          label: 'Confirm', action: 'confirm', default: true,
          callback: (_e, _b, dialog) => {
            cancelled = false;
            const html = dialog.element;
            const calledShot       = html.querySelector('#sr-called-cs')?.value ?? 'none';
            const calledShotTarget = (html.querySelector('#sr-subtarget-cs')?.value || '').trim();
            const aim = Math.max(0, parseInt(html.querySelector('#sr-aim-cs')?.value) || 0);
            const tnMod = (calledShot !== 'none' ? 4 : 0) - aim;
            result = { calledShot, calledShotTarget, tnMod };
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (hookId) Hooks.off('renderDialogV2', hookId);
    if (cancelled) return null;
    return result;
  }

  /**
   * Ask the defender to commit dodge dice before the attack is rolled.
   * Returns number of dice committed (0 = no dodge), or null if cancelled.
   */
  /**
   * The GM's TN window — requirement 3.
   *
   * Renders the SR3 p.112 modifier checkboxes, sums them live into an editable
   * TN, and clamps the DISPLAYED value at 2 while showing the raw sum when they
   * differ, so stacking modifiers past the floor stays visible instead of
   * silently vanishing.
   *
   * When this GM is also the defender's decider — a player shooting a GM-owned
   * NPC, the most common case — the dodge rows render INSIDE this window via
   * `opts.dodge`, so the GM is never asked twice for one attack.
   *
   * @param {object} ctx
   * @param {object} [opts]
   * @param {object} [opts.dodge]  { availPool, defenderName } to merge the dodge row in
   * @returns {Promise<null|{tn:number, mods:object, dodgeDice:number|null}>}  null = GM cancelled
   */
  /**
   * Read the GM window's modifier controls into a `sumModifiers` state object.
   *
   * Shared by the live recompute and the Confirm callback deliberately. They were two
   * near-identical inline loops; letting them drift would show the GM one target number
   * and commit a different one — the kind of bug nobody reports because the displayed
   * value looks right.
   *
   * @param {HTMLElement} el  the dialog element
   * @param {Function} visibilityModifier  injected so this stays free of the dynamic import
   */
  static _readGMModifierState(el, visibilityModifier) {
    const state = {};
    el.querySelectorAll('.sr-gm-mod').forEach(c => { if (c.checked) state[c.dataset.key] = true; });
    el.querySelectorAll('.sr-gm-mod-per').forEach(n => {
      const v = parseInt(n.value) || 0; if (v > 0) state[n.dataset.key] = v;
    });
    const cond = el.querySelector('.sr-gm-vis-cond')?.value ?? '';
    const vis  = el.querySelector('.sr-gm-vis-type')?.value ?? 'normal';
    state.visibility = cond ? visibilityModifier(cond, vis) : 0;
    return state;
  }

  /**
   * The GM's target-number window for MELEE.  · *SR3 p.123*
   *
   * Separate from `_promptGMAttackWindow` rather than a mode of it, because melee asks a
   * structurally different question. Ranged resolves ONE target number; melee resolves
   * TWO, and most rows move both at once in opposite directions — "friends in the melee"
   * is a single fact that helps one fighter and hurts the other by the same amount. A
   * shared window would have to special-case every row anyway.
   *
   * ⚠ **It returns final TNs, computed from DELTAS.** `rollMeleeAttack` has already built
   * both base TNs out of reach, defaulting tiers and any called shot; the modifier rows add
   * on top of those rather than replacing them, so `sumMeleeModifiers` hands back
   * `{atk, def}` deltas and the fields show base + delta. The GM can still overwrite either
   * field outright — that is the escape hatch, not the mechanism.
   *
   * ⚠ **Nothing in this window belongs to a fighter.** The reach election is the one melee
   * choice that is a player's: the longer-reach fighter picks whether their advantage lands
   * as a bonus to themselves or a penalty on the opponent. It lives in that fighter's own
   * corner of the boxing card. Putting it here would repeat precisely the mistake the
   * contested rework removed.
   *
   * @returns {Promise<{atkTN:number, defTN:number, adjudicated:boolean}|null>}
   *          null when the GM cancels the exchange outright.
   */
  static async _promptGMMeleeWindow(ctx) {
    const { meleeModifierGroups, sumMeleeModifiers, meleeVisibilityModifier,
            SR3E_VISIBILITY_TABLE, SR3E_VISION_TYPES } =
      await import('../SR3ECombatModifiers.js');

    const groups  = meleeModifierGroups();
    const baseAtk = Number(ctx.baseAtkTN) || 4;
    const baseDef = Number(ctx.baseDefTN) || 4;
    const atkName = ctx.atkName ?? 'Attacker';
    const defName = ctx.defName ?? 'Defender';

    const condOpts = ['<option value="">— not impaired —</option>']
      .concat(Object.keys(SR3E_VISIBILITY_TABLE).map(c => `<option value="${c}">${c}</option>`))
      .join('');
    const visOpts = SR3E_VISION_TYPES
      .map(v => `<option value="${v.key}">${v.label}</option>`).join('');

    const sideSelect = (id, label) => `
      <label style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:12px">
        <span style="min-width:200px">${label}</span>
        <select id="${id}" style="flex:1">
          <option value="">— neither —</option>
          <option value="attacker">${atkName}</option>
          <option value="defender">${defName}</option>
        </select>
      </label>`;

    const numberRow = (id, label, note, min, max) => `
      <label style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:12px">
        <span style="min-width:200px">${label}</span>
        <input type="number" id="${id}" value="0" min="${min}" max="${max}" style="width:56px"/>
        <span style="font-size:11px;color:var(--sr-muted)">${note}</span>
      </label>`;

    const rowHtml = (row) => {
      switch (row.kind) {
        case 'diff':       return numberRow('gmm-friends', row.label, row.note, -9, 9);
        case 'perAtk':     return numberRow('gmm-multi',   row.label, row.note, 0, 9);
        case 'side':       return sideSelect('gmm-superior', row.label);
        case 'sideOpposed': return sideSelect('gmm-prone', `${row.label} — who is DOWN`);
        case 'visibility':
          // Two axes, as in the ranged window: the condition, and which vision is in use.
          // Melee then HALVES the result (rounding down) except in Full Darkness —
          // `meleeVisibilityModifier` owns that rule, not this markup.
          return `
            <div style="margin:3px 0;font-size:12px">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="min-width:200px">${row.label}</span>
                <select id="gmm-vis-cond" style="flex:1">${condOpts}</select>
                <select id="gmm-vis-type" style="flex:1">${visOpts}</select>
              </div>
              <div style="font-size:11px;color:var(--sr-muted);margin-left:206px">${row.note}</div>
            </div>`;
        default:
          // An unrecognised kind renders as a plain note rather than vanishing: a silently
          // dropped row is a modifier the GM was meant to apply and never saw.
          return `<div style="margin:3px 0;font-size:12px;color:var(--sr-amber)">
                    ${row.label} — apply by hand (no control for kind "${row.kind}")
                  </div>`;
      }
    };

    const groupHtml = groups.map(g => `
      <fieldset style="border:1px solid var(--sr-border);border-radius:var(--r);margin:6px 0;padding:6px 8px">
        <legend style="font-size:11px;color:var(--sr-accent);padding:0 4px">${g.label}</legend>
        ${g.rows.map(rowHtml).join('')}
      </fieldset>`).join('');

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `GM — ${atkName} vs ${defName}` },
      content: `
        <div style="padding:4px 0;min-width:520px">
          <div style="font-size:11px;color:var(--sr-muted);margin-bottom:4px">
            Base target numbers already include reach, defaulting and any called shot.
            ${ctx.baseNote ? `<br>${ctx.baseNote}` : ''}
          </div>
          ${groupHtml}
          <div style="display:flex;gap:14px;align-items:center;margin-top:8px;flex-wrap:wrap">
            <label style="font-size:12px"><strong>${atkName}</strong> TN
              <input type="number" id="gmm-atk-tn" value="${baseAtk}" min="2" max="30" style="width:56px;margin-left:4px"/>
            </label>
            <label style="font-size:12px"><strong>${defName}</strong> TN
              <input type="number" id="gmm-def-tn" value="${baseDef}" min="2" max="30" style="width:56px;margin-left:4px"/>
            </label>
            <span id="gmm-note" style="font-size:11px;color:var(--sr-dim)"></span>
          </div>
        </div>`,

      // Per-dialog `render`, not the global `renderDialogV2` hook: two melee windows open
      // at once would cross-wire, and the symptom is a window that silently stops
      // recomputing (see CLAUDE.md).
      render: (_event, dialog) => {
        const el   = dialog.element;
        const read = () => ({
          friends:             parseInt(el.querySelector('#gmm-friends')?.value) || 0,
          superiorPosition:    el.querySelector('#gmm-superior')?.value || null,
          prone:               el.querySelector('#gmm-prone')?.value || null,
          multiTargetAtk:      parseInt(el.querySelector('#gmm-multi')?.value) || 0,
          visibilityCondition: el.querySelector('#gmm-vis-cond')?.value || '',
          visibilityVision:    el.querySelector('#gmm-vis-type')?.value || 'normal',
        });
        const refresh = () => {
          const st = read();
          const d  = sumMeleeModifiers(st);
          el.querySelector('#gmm-atk-tn').value = Math.max(2, baseAtk + d.atk);
          el.querySelector('#gmm-def-tn').value = Math.max(2, baseDef + d.def);
          const sign = n => `${n >= 0 ? '+' : ''}${n}`;
          const vis  = st.visibilityCondition
            ? meleeVisibilityModifier(st.visibilityCondition, st.visibilityVision) : null;
          el.querySelector('#gmm-note').textContent =
            `Δ ${sign(d.atk)} / ${sign(d.def)}`
            + (vis === null ? '' : ` · visibility halves to ${sign(vis)}`);
        };
        el.querySelectorAll('input, select').forEach(i => {
          i.addEventListener('input',  refresh);
          i.addEventListener('change', refresh);
        });
        refresh();
      },

      buttons: [
        {
          label: '✓ Set Target Numbers', action: 'ok', default: true,
          callback: (_e, _b, dialog) => {
            const el = dialog.element;
            result = {
              atkTN: Math.max(2, parseInt(el.querySelector('#gmm-atk-tn')?.value) || baseAtk),
              defTN: Math.max(2, parseInt(el.querySelector('#gmm-def-tn')?.value) || baseDef),
              adjudicated: true,
            };
          },
        },
        { label: 'Cancel exchange', action: 'cancel' },
      ],
    });
    return result;
  }

  static async _promptGMAttackWindow(ctx, opts = {}) {
    const { mvpModifierGroups, sumModifiers, clampTN, guessGearModifiers,
            SR3E_VISIBILITY_TABLE, SR3E_VISION_TYPES, visibilityModifier } =
      await import('../SR3ECombatModifiers.js');

    const groups  = mvpModifierGroups();
    const guessed = guessGearModifiers(ctx.attacker, ctx.weapon);
    const baseTN  = Number(ctx.baseTN) || 4;

    // Two columns. Each row is ONE grid item — label and its note wrapped together,
    // or the note would become a separate cell and every row after it would land in
    // the wrong column. `auto-fit` collapses to a single column on a narrow window
    // rather than squeezing, and `align-items:start` keeps rows of differing height
    // (the ones carrying notes) top-aligned instead of centred against their neighbour.
    const renderRow = m => {
      // Visibility is a two-axis table lookup, not a tick: the GM picks the CONDITION
      // and which vision the attacker is using, and the modifier derives from the
      // Visibility Table. Nothing is pre-selected — the system cannot reliably know
      // which eyes are in play (metatype is stored, but cybernetic vision is only
      // name-matchable, the same gap as TODO #18), so it asks rather than guesses.
      if (m.select === 'visibility') {
        const condOpts = ['<option value="">— not impaired —</option>']
          .concat(Object.keys(SR3E_VISIBILITY_TABLE)
            .map(c => `<option value="${c}">${c}</option>`)).join('');
        const visOpts = SR3E_VISION_TYPES
          .map(v => `<option value="${v.key}">${v.label}</option>`).join('');
        return `<div class="sr-gm-modrow" style="break-inside:avoid">
            <div style="display:flex;flex-direction:column;gap:3px;padding:2px 0">
              <span>${m.label}</span>
              <select class="sr-gm-vis-cond" style="width:100%">${condOpts}</select>
              <select class="sr-gm-vis-type" style="width:100%">${visOpts}</select>
              <div class="sr-gm-vis-note" style="font-size:10px;color:var(--sr-dim);line-height:1.25"></div>
            </div>
          </div>`;
      }

      const pre  = m.gear && guessed[m.key] ? 'checked' : '';
      const sign = m.mod > 0 ? `+${m.mod}` : `${m.mod}`;
      const hint = m.gear && guessed[m.key]
        ? ' <span style="color:var(--sr-gold);font-size:10px">detected</span>' : '';
      const note = m.note
        ? `<div style="font-size:10px;color:var(--sr-dim);margin-left:22px;line-height:1.25">${m.note}</div>`
        : '';
      const control = m.per
        ? `<input type="number" class="sr-gm-mod-per" data-key="${m.key}" value="0" min="0" max="10" style="width:44px;flex:none"/>
           <span>${m.label} <strong>${sign}</strong> each${hint}</span>`
        : `<input type="checkbox" class="sr-gm-mod" data-key="${m.key}" ${pre} style="flex:none"/>
           <span>${m.label} <strong>${sign}</strong>${hint}</span>`;
      return `<div class="sr-gm-modrow" style="break-inside:avoid">
          <label style="display:flex;align-items:center;gap:8px;padding:2px 0">${control}</label>
          ${note}
        </div>`;
    };

    // Headings span every column (`grid-column:1/-1`) so a group always starts on a fresh
    // line — otherwise a heading would drop into the right-hand column beside the previous
    // group's last row and appear to label it.
    const rowHtml = groups.map(g => `
      <div style="grid-column:1/-1;margin:8px 0 2px;padding-bottom:2px;
                  border-bottom:1px solid var(--sr-border);
                  font-size:10px;letter-spacing:.08em;text-transform:uppercase;
                  color:var(--sr-muted)">${g.label}${g.note
        ? ` <span style="text-transform:none;letter-spacing:0;color:var(--sr-dim)">— ${g.note}</span>`
        : ''}</div>
      ${g.rows.map(renderRow).join('')}`).join('');

    const dodgeHtml = opts.dodge ? `
      <hr style="margin:10px 0;border-color:var(--sr-border)"/>
      <div style="font-size:12px;margin-bottom:4px">
        <strong>${opts.dodge.defenderName}</strong> is yours to defend
        — available Combat Pool <strong>${opts.dodge.availPool}</strong>
      </div>
      <label style="display:flex;align-items:center;gap:8px">
        🎯 Dodge with
        <input type="number" id="sr-gm-dodge" min="0" max="${opts.dodge.availPool}"
               value="0" style="width:55px" ${opts.dodge.availPool === 0 ? 'disabled' : ''}/>
        dice
      </label>` : '';

    let result = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `GM — ${ctx.attackerName} → ${ctx.targetName} · ${ctx.weaponName}` },
      // Wide enough for the grid to actually resolve to two columns; below the
      // 240px minmax it collapses back to one rather than cramping.
      position: { width: 560 },
      content: `
        <div style="font-size:12px;color:var(--sr-muted);margin-bottom:6px">
          Base TN <strong>${baseTN}</strong>${ctx.baseNote ? ` — ${ctx.baseNote}` : ''}
        </div>
        <!-- The cap is viewport-relative, not a fixed pixel height. At 300px this scrolled on
             every screen regardless of how much room the window had, because the limit was on
             the LIST rather than on the dialog: making the window taller did nothing. 65vh lets
             the whole modifier set show on a normal display while still capping on a laptop or
             a short window, and the dialog auto-heights to whatever the list needs. -->
        <div style="max-height:65vh;overflow-y:auto;padding-right:4px;
                    display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
                    gap:0 18px;align-items:start">${rowHtml}</div>
        ${dodgeHtml}
        <hr style="margin:10px 0;border-color:var(--sr-border)"/>
        <label style="display:flex;align-items:center;gap:8px">
          <strong>Target Number</strong>
          <input type="number" id="sr-gm-tn" value="${baseTN}" min="2" max="30" style="width:60px"/>
        </label>
        <div id="sr-gm-tn-note" style="font-size:11px;color:var(--sr-dim);margin-top:4px"></div>
      `,
      buttons: [
        // NOT "Roll" — the GM sets the target number, the ATTACKER rolls. Labelling
        // this Roll made it look like the GM was rolling the player's dice.
        { label: '✓ Set Target Number', action: 'roll', default: true,
          callback: (_e, _b, dlg) => {
            const el   = dlg.element;
            const mods = SR3EItem._readGMModifierState(el, visibilityModifier);
            const dodgeEl = el.querySelector('#sr-gm-dodge');
            result = {
              // The typed field is authoritative — the GM may override the sum.
              tn:        clampTN(parseInt(el.querySelector('#sr-gm-tn')?.value)).tn,
              mods,
              dodgeDice: dodgeEl ? Math.min(parseInt(dodgeEl.value) || 0, opts.dodge.availPool) : null,
            };
          } },
        { label: 'Cancel attack', action: 'cancel' },
      ],
      // Per-dialog wiring. NOT a renderDialogV2 hook — with two attacks in flight
      // the global hook wires the first dialog twice (with the second's closure)
      // and the second not at all, and the GM's checkboxes silently stop working.
      render: (_event, dialog) => {
        const el   = dialog.element;
        const tnEl = el.querySelector('#sr-gm-tn');
        const note = el.querySelector('#sr-gm-tn-note');
        const visNote = el.querySelector('.sr-gm-vis-note');

        const recompute = () => {
          // Same reader the Confirm callback uses — two copies of this drifted apart
          // would show the GM one target number and commit another.
          const state = SR3EItem._readGMModifierState(el, visibilityModifier);

          // Show what the Visibility Table actually resolved to; the two dropdowns on
          // their own do not tell the GM whether they picked +2 or +8.
          if (visNote) {
            const cond = el.querySelector('.sr-gm-vis-cond')?.value ?? '';
            visNote.textContent = cond
              ? `${cond} → ${state.visibility >= 0 ? '+' : ''}${state.visibility} (SR3 p.112)`
              : '';
          }

          const { tn, floored, raw } = clampTN(baseTN + sumModifiers(state));
          tnEl.value      = tn;
          note.textContent = floored
            ? `Floored at ${tn} — modifiers summed to ${raw}. No target number can be less than 2 (SR3 p.112).`
            : '';
        };

        el.querySelectorAll('.sr-gm-mod, .sr-gm-mod-per, .sr-gm-vis-cond, .sr-gm-vis-type')
          .forEach(i => i.addEventListener('change', recompute));
        recompute();
      },
    });

    return result;
  }

  /**
   * Ask the defender how many Combat Pool dice to commit to dodging.
   *
   * **This function performs NO writes.** It used to announce Full Defense and
   * clear the flag inline, which meant a cancelled attack still consumed the
   * defender's whole declaration — and it cannot write anyway now that it runs
   * on the defender's client, which may not own... anything. It returns a number;
   * the GM commits it.
   *
   * @param {Actor}  defender
   * @param {string} attackerName
   * @param {string} weaponName
   * @param {object} [opts]
   * @param {string} [opts.exchangeId]  Lets the GM withdraw this dialog if the
   *   exchange resolves without it (timeout, or the GM rolling early).
   * @returns {Promise<number|null>}  Dice to commit; null if the user cancelled.
   *   Callers under a relay treat null as 0 — see the reaper rule in the plan.
   */
  static async _promptDodgeDeclaration(defender, attackerName, weaponName, opts = {}) {
    if (defender.type === 'vehicle') return 0;  // vehicles cannot dodge

    // Full Defense: the reserve is already declared, so there is nothing to ask.
    // Read only — the announcement and the clear are the GM's job, after commit.
    const reserved = game.sr3e.SR3EActor._fullDefenseDice(defender);
    if (reserved > 0) return reserved;

    const availPool  = defender.system.derived?.availableCombatPool ?? 0;
    const fdNote     = (defender.system.fullDefense ?? false)
      ? '<p style="color:var(--sr-amber);font-size:11px;margin-top:8px">Full Defense active — pool already committed</p>'
      : '';

    let dodgeDice = 0;
    let cancelled = true;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${defender.name} — Declare Response` },
      content: `
        <p style="margin-bottom:8px">
          <strong>${defender.name}</strong>, ${attackerName} is attacking you
          with <strong>${weaponName}</strong>.
        </p>
        ${Number.isFinite(opts.attackSuccesses) ? `
        <p style="margin-bottom:8px;padding:6px 8px;background:var(--sr-red-bg);border-radius:var(--r)">
          The attack scored <strong>${opts.attackSuccesses}</strong>
          success${opts.attackSuccesses === 1 ? '' : 'es'} — you must beat that to dodge it completely.
        </p>
        <p style="margin-bottom:8px;font-size:11px;color:var(--sr-amber)">
          Pool dice spent dodging are <strong>not</strong> available to resist the damage.
        </p>` : ''}
        <p style="margin-bottom:12px;font-size:11px;color:var(--sr-muted)">
          Your available Combat Pool: <strong>${availPool}</strong> dice
        </p>
        <div style="display:flex;flex-direction:column;gap:10px">
          <label style="display:flex;align-items:center;gap:8px">
            <input type="radio" name="dodge-choice" value="none" checked/>
            ❌ No dodge — save pool for soak
          </label>
          <label style="display:flex;align-items:center;gap:8px">
            <input type="radio" name="dodge-choice" value="dodge"/>
            🎯 Dodge with
            <input type="number" id="dodge-dice" min="1" max="${availPool}"
                   value="${Math.min(1, availPool)}" style="width:55px"
                   ${availPool === 0 ? 'disabled' : ''}/>
            dice
          </label>
        </div>
        ${availPool === 0
          ? '<p style="color:var(--sr-red);font-size:11px;margin-top:8px">No Combat Pool remaining — cannot dodge</p>'
          : ''}
        ${fdNote}
      `,
      buttons: [
        {
          label: 'Confirm',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dialog) => {
            cancelled = false;
            const choice = dialog.element.querySelector('input[name="dodge-choice"]:checked')?.value;
            if (choice === 'dodge') {
              dodgeDice = Math.min(
                parseInt(dialog.element.querySelector('#dodge-dice')?.value) || 0,
                availPool
              );
            }
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
      // Per-dialog wiring. NOT a `renderDialogV2` hook: that hook is global, so
      // two exchanges in flight would wire the first dialog twice (the second
      // time with the other's closure) and the second not at all. Registering
      // here also lets the GM withdraw this dialog if the exchange resolves
      // without it, rather than leaving a stale modal to be answered later.
      render: (_event, dialog) => {
        game.sr3e.SR3EQuery.trackDialog(opts.exchangeId, dialog);
        dialog.element.querySelector('#dodge-dice')?.addEventListener('focus', () => {
          const radio = dialog.element.querySelector('input[name="dodge-choice"][value="dodge"]');
          if (radio) radio.checked = true;   // typing dice implies you meant to dodge
        });
      },
    });

    game.sr3e.SR3EQuery.untrackDialog(opts.exchangeId);
    if (cancelled) return null;
    return dodgeDice;
  }

  /**
   * Prompt the attacker to select a target from all non-vehicle actors.
   * Returns the selected Actor or null if cancelled.
   */
  /**
   * Target-selection dialog.
   *
   * @param {Actor}   attacker
   * @param {object}  [opts]
   * @param {boolean} [opts.allowSelf]  Offer the attacker as a target. Spells only —
   *   you have line of sight to yourself, so Increase Reflexes, Heal and the rest are
   *   legal self-casts. Weapons leave this off: nothing should let a firearm pick its
   *   own wielder out of a list.
   * @returns {Promise<Actor|null>}  null when cancelled or nothing to target.
   */
  static async _promptTarget(attacker, { allowSelf = false } = {}) {
    const _typeBadge = type => {
      if (type === 'npc')     return `<span style="font-size:10px;color:var(--sr-amber)"> [NPC]</span>`;
      if (type === 'vehicle') return `<span style="font-size:10px;color:var(--sr-accent)"> [Vehicle]</span>`;
      return '';
    };
    const _selfBadge = `<span style="font-size:10px;color:var(--sr-green)"> [self]</span>`;

    const others = game.actors.contents.filter(a =>
      a.id !== attacker.id && game.sr3e.isLiveActor(a)
    );
    // Prefer actors with a token on the current scene; fall back to the full
    // world list when nothing is on canvas (theatre-of-the-mind).
    const onCanvas   = canvas?.ready ? others.filter(a => a.getActiveTokens().length > 0) : [];
    const candidates = [...(onCanvas.length ? onCanvas : others)];

    // Self is appended AFTER the canvas filter, so a caster with no token placed can
    // still be picked, and goes LAST so it is never the pre-checked default — a stray
    // Confirm should not Manabolt the caster. When it is the only candidate it lands at
    // index 0 and is selected normally.
    if (allowSelf && game.sr3e.isLiveActor(attacker)) candidates.push(attacker);

    if (!candidates.length) {
      ui.notifications.warn('No valid targets found.');
      return null;
    }

    const choices = candidates.map((a, i) => `
      <label class="sr-target-row">
        <input type="radio" name="target-actor" value="${a.id}" ${i === 0 ? 'checked' : ''}
               style="width:13px;height:13px;margin:0;accent-color:var(--sr-accent);flex-shrink:0;appearance:auto;-webkit-appearance:radio"/>
        <span>${a.name}${a.id === attacker.id ? _selfBadge : _typeBadge(a.type)}</span>
      </label>`).join('');

    let targetId = candidates[0].id;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${attacker.name} — Select Target` },
      content: `<div class="sr-target-list">${choices}</div>`,
      buttons: [
        {
          label: 'Confirm',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dialog) => {
            const checked = dialog.element.querySelector('input[name="target-actor"]:checked');
            targetId = checked?.value ?? null;
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!targetId) return null;
    return game.actors.get(targetId) ?? null;
  }
  /**
 * Mapping from weapon category to skill
 * Based on the codes from the firearms JSON
 */
static get WEAPON_SKILL_MAP() {
  return {
    // Pistols -> Pistols skill
    'HOPist': { skill: 'Pistols', attribute: 'quickness' },
    'LPist':  { skill: 'Pistols', attribute: 'quickness' },
    'MPist':  { skill: 'Pistols', attribute: 'quickness' },
    'HPist':  { skill: 'Pistols', attribute: 'quickness' },
    'VHP':    { skill: 'Pistols', attribute: 'quickness' },
    
    // Machine Pistols -> Submachine Guns skill
    'MaPist': { skill: 'Submachine Guns', attribute: 'quickness' },

    // SMGs -> Submachine Guns skill
    'SMG':    { skill: 'Submachine Guns', attribute: 'quickness' },

    // Carbines/Assault Rifles -> Assault Rifles skill
    'Carb':   { skill: 'Assault Rifles', attribute: 'quickness' },
    'AsRf':   { skill: 'Assault Rifles', attribute: 'quickness' },
    'LCarb':  { skill: 'Assault Rifles', attribute: 'quickness' },

    // Sport/Sniper Rifles -> Rifles skill
    'SptR':   { skill: 'Rifles', attribute: 'quickness' },
    'Snip':   { skill: 'Rifles', attribute: 'quickness' },

    // Machine Guns -> Heavy Weapons skill
    'LMG':    { skill: 'Heavy Weapons', attribute: 'strength' },
    'MMG':    { skill: 'Heavy Weapons', attribute: 'strength' },
    'HMG':    { skill: 'Heavy Weapons', attribute: 'strength' },
    'MinG':   { skill: 'Heavy Weapons', attribute: 'strength' },

    // Shotguns -> Shotguns skill
    'ShtG':   { skill: 'Shotguns', attribute: 'quickness' },

    // Special Weapons
    'Tasr':   { skill: 'Pistols',        attribute: 'quickness' },
    'GrLn':   { skill: 'Launch Weapons', attribute: 'intelligence' },
    'MisLn':  { skill: 'Gunnery',        attribute: 'intelligence' },
    'ACan':   { skill: 'Gunnery',        attribute: 'intelligence' },
    'Las':    { skill: 'Laser Weapons',  attribute: 'quickness' },
    'Net':    { skill: 'Spray Weapons',  attribute: 'strength' },
    'NtGn':   { skill: 'Spray Weapons',  attribute: 'strength' },
    'Flthr':  { skill: 'Spray Weapons',  attribute: 'strength' },
    'MulWea': { skill: 'Pistols',        attribute: 'quickness' },

    // Melee Weapons - Armed Combat
    'EDG': { skill: 'Edged Weapons',        attribute: 'strength' },
    'CLB': { skill: 'Clubs',               attribute: 'strength' },
    'POL': { skill: 'Pole Arms',           attribute: 'strength' },
    'WHP': { skill: 'Whips',              attribute: 'quickness' },

    // Melee Weapons - Unarmed Combat
    'CYB': { skill: 'Cyber Implant Combat', attribute: 'strength' },
    'UNA': { skill: 'Unarmed Combat',       attribute: 'strength' },
  };
}

/**
 * Extract weapon code from item
 * @private
 */
_getWeaponCode() {
  // If the item has a stored category (from import), use it
  if (this.system.category) {
    return this.system.category;
  }
  
  // Otherwise try to parse from name (for legacy items)
  const match = this.name.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

/**
 * Determine which skill governs a weapon
 * @private
 */
_getWeaponSkill() {
  const code = this._getWeaponCode();
  
  if (code && SR3EItem.WEAPON_SKILL_MAP[code]) {
    return SR3EItem.WEAPON_SKILL_MAP[code].skill;
  }
  
  // Fallback based on item type
  if (this.type === 'firearm') return 'Firearms';
  if (this.type === 'melee') return 'Armed Combat';
  if (this.type === 'bow') return 'Projectile Weapons';
  
  return 'Firearms';
}

/**
 * Get default attribute for weapon when defaulting
 * @private
 */
_getDefaultAttribute() {
  const code = this._getWeaponCode();

  if (code && SR3EItem.WEAPON_SKILL_MAP[code]) {
    return SR3EItem.WEAPON_SKILL_MAP[code].attribute;
  }

  // Fallbacks
  if (this.type === 'firearm') return 'quickness';
  if (this.type === 'melee') return 'strength';
  if (this.type === 'bow') return 'strength';

  return 'quickness';
}

/**
 * Parse the weapon's mode string into an array of available mode codes.
 * e.g. "SA/BF/FA" → ['SA','BF','FA'], "FA" → ['FA']
 */
_getAvailableModes() {
  const raw = (this.system.mode ?? '').toUpperCase();
  return raw.split('/').map(m => m.trim()).filter(m => ['SS','SA','BF','FA'].includes(m));
}

/**
 * Fire mode selection dialog. Returns { mode, rounds, additionalTNPenalty, roundsWasted } or null.
 */
/**
 * What a burst actually becomes when the clip is nearly empty. **Pure.**  · *SR3 p.115*
 *
 * > "If a burst ends up being a round short because of insufficient ammunition in the clip,
 * > the Power Rating increases by +2, but the Damage Level does not increase. A +2 recoil
 * > modifier also applies. If a burst consists of only one round due to insufficient
 * > ammunition, resolve it as a single-shot attack."
 *
 * Three outcomes, not one:
 *
 * | rounds available | mode fired | Power | Level | recoil |
 * |---|---|---|---|---|
 * | 3+ | BF | +3 | +1 | +3 |
 * | 2  | BF (short) | **+2** | **unchanged** | **+2** |
 * | 1  | **SS** | — | — | SS rules |
 *
 * ⚠ The one-round case changes the MODE, not just the numbers. Resolving it as a weak burst
 * would still apply burst recoil and burst damage; the book says it is a single shot, which
 * means no burst bonus at all and no burst recoil.
 *
 * ⚠ Only reachable when `trackAmmo` is on — with tracking off `available` is null and a
 * burst is always a full burst, which is the pre-existing behaviour and stays that way.
 *
 * @param {number|null} available rounds left in the clip, or null when not tracking
 * @returns {{mode:'BF'|'SS', rounds:number, shortBurst:boolean}}
 */
static resolveBurst(available) {
  if (available === null || available === undefined) return { mode: 'BF', rounds: 3, shortBurst: false };
  const have = Math.max(0, Math.trunc(Number(available) || 0));
  if (have >= 3) return { mode: 'BF', rounds: 3,    shortBurst: false };
  if (have === 2) return { mode: 'BF', rounds: 2,   shortBurst: true  };
  // One round, or an empty clip the caller has already warned about.
  return { mode: 'SS', rounds: Math.min(1, have), shortBurst: false };
}

/**
 * Has this actor already used up the mode's allowance this Combat Phase? **Pure.**
 *
 * SR3 caps every mode, and the system only ever warned about one of them:
 *
 * - **SS** — "cannot be fired again during the same Combat Phase" (p.114)
 * - **SA** — "can be fired twice in the same Combat Phase" (p.115)
 * - **BF** — "a character can fire up to two bursts per Combat Phase" (p.115)
 * - **FA** — "can fire up to 10 rounds in one Combat Phase" (p.116)
 *
 * ⚠ **This is a PROXY and says so.** The real limits are expressed in Actions — a Simple
 * Action per shot or burst, a Complex Action for full auto — and this system does not model
 * the action economy at all. All we have is `roundsFiredThisPhase`, so the caps are inferred
 * from rounds. In a phase that mixes modes the inference drifts: a 3-round burst followed by
 * an SA shot reads as 4 rounds and trips the SA cap early.
 *
 * That is why it returns a WARNING and never blocks. Minimal guardrails — the GM adjudicates
 * an unusual phase, and nobody is stopped from firing.
 *
 * @returns {string|null} the warning to show, or null when within the allowance
 */
static phaseFireWarning(mode, roundsBefore = 0, roundsThisShot = 0) {
  const before = Math.max(0, Math.trunc(Number(roundsBefore) || 0));
  switch (mode) {
    case 'SS':
      return before >= 1 ? 'SS weapons cannot fire twice in a combat phase.' : null;
    case 'SA':
      return before >= 2
        ? 'Semi-automatic weapons fire at most twice per Combat Phase (SR3 p.115).' : null;
    case 'BF':
      return before >= 6
        ? 'Burst fire is limited to two bursts per Combat Phase (SR3 p.115).' : null;
    case 'FA': {
      const total = before + Math.max(0, Math.trunc(Number(roundsThisShot) || 0));
      return total > 10
        ? `Full auto is limited to 10 rounds per Combat Phase — this would be ${total} (SR3 p.116).`
        : null;
    }
    default:
      return null;
  }
}

/**
 * TN penalty for engaging a fresh target this Combat Phase — **pure**.  · *SR3 p.112*
 *
 * The Ranged Combat Modifiers table states it flatly, with no mode attached:
 *
 *   > "Multiple targets — +2 per additional target that Combat Phase"
 *
 * ⚠ **This is NOT a full-auto rule**, and the book's layout is what makes it look like one.
 * The +2 is restated on p.116 under a *Multiple Targets* heading that sits inside FULL-AUTO
 * MODE — but what is genuinely full-auto-only is **walking the fire**: *"the attacker must
 * 'walk' the fire from one target to the next… one round is wasted for every meter of
 * distance between the two targets. Smartguns never waste rounds."* The modifier itself is
 * a p.112 table row and applies to every mode.
 *
 * That matters because two other modes can legitimately engage a second target in one phase:
 * SA *"can be fired twice in the same Combat Phase"* and BF *"a character can fire up to two
 * bursts per Combat Phase"* (both p.115). Keeping the ordinal inside the dialog's FA-only
 * section meant neither could ever take the penalty — and the GM window cannot supply it
 * either, since `multiTarget` carries no `mvp` flag and so is never rendered.
 *
 * The ordinal is 1-based and counts targets, not shots: a second burst at the SAME target is
 * still the 1st target and takes nothing.
 *
 * @param {number} ordinal  which target this is in the phase (1 = first, no penalty)
 * @returns {number} the TN modifier, never negative
 */
static multiTargetTN(ordinal) {
  const n = Math.trunc(Number(ordinal) || 1);
  return n > 1 ? (n - 1) * 2 : 0;
}

/**
 * Recoil TN penalty for one shot — **pure**.  · *SR3 p.111*
 *
 * `recoil = max(0, uncompensatedRounds − totalComp) × multiplier`
 *
 * Three things here are easy to get subtly wrong, and all three were locked inside a
 * closure in the fire-mode dialog where nothing could reach them:
 *
 * 1. **BF and FA count their OWN rounds; SS and SA do not.**
 *    - *Full auto*: "Each round fired imposes a +1 recoil modifier **for the entire
 *      burst**." The Wedge example (p.115) is decisive — his first 3-round burst "generates
 *      3 points of recoil", then at 6 rounds fired the modifier is 6, then at 10 it is 10.
 *    - *Burst fire*: "+3 recoil modifier **per burst fired**", so the first burst is +3.
 *    - *Semi-auto*: "The first shot is unmodified; the second shot… takes a +1 recoil
 *      modifier." Only the round already fired counts, never this one.
 *
 *    ⚠ FA used to be lumped in with SS/SA here, counting only rounds fired BEFORE the
 *    burst. Wedge's second burst came out +0 instead of +2 and his third +2 instead of +6 —
 *    understating recoil by more the longer the fight went on, which is precisely backwards
 *    from what the rule is for.
 *
 * 2. **Compensation is subtracted BEFORE the multiplier, never after.** "Heavy Weapons
 *    Fire: 2 × **uncompensated** recoil", and the book works it: a medium machine gun
 *    firing 10 rounds with 6 points of compensation is **+8** — (10 − 6) × 2, not
 *    (10 × 2) − 6 = 14. The two agree only when compensation is 0.
 *
 * 3. **The multiplier is per-MODE, not per-weapon.** Heavy weapons (LMG/MMG/HMG/MinG)
 *    double always; shotguns double **only in BF** ("Any shotgun fired in Burst-Fire Mode
 *    is also subjected to the double recoil modifier"). A shotgun firing SA is ×1.
 *
 * @param {object} o
 * @param {string} o.mode            SS · SA · BF · FA
 * @param {number} o.roundsBefore    rounds already fired this phase
 * @param {number} [o.roundsThisShot] rounds THIS full-auto burst fires (FA only; BF is
 *                                    always 3 and SS/SA contribute nothing)
 * @param {number} o.totalComp       actor recoil comp + weapon recoil mod
 * @param {boolean} [o.isHeavy]      LMG/MMG/HMG/MinG
 * @param {boolean} [o.isShotgun]    ShtG
 * @returns {number} TN penalty, never negative
 */
static recoilTN({ mode, roundsBefore = 0, roundsThisShot = 0, totalComp = 0,
                  isHeavy = false, isShotgun = false, shortBurst = false }) {
  const mult = (isHeavy || (isShotgun && mode === 'BF')) ? 2 : 1;
  // A SHORT BURST is its own case, not a burst that happens to fire two: "If a burst ends
  // up being a round short because of insufficient ammunition in the clip… A +2 recoil
  // modifier also applies" (p.115). So it contributes 2, not 3 — and a ONE-round burst is
  // not a burst at all, it resolves as single-shot, which contributes nothing.
  const own  = mode === 'BF' ? (shortBurst ? 2 : 3)
             : mode === 'FA' ? Math.max(0, Number(roundsThisShot) || 0)
             : 0;
  return Math.max(0, (roundsBefore + own) - totalComp) * mult;
}

/**
 * Damage code after the fire mode's own modifiers — **pure**.  · *SR3 p.113*
 *
 * - **BF**: Power +3 and Damage Level +1.
 * - **FA**: Power +rounds, Level +⌊rounds / 3⌋.
 * - **SS / SA**: unchanged.
 *
 * ⚠ **Tracer is not simply "FA with a bonus".** Every third round in a tracer belt raises
 * the Damage Level but adds nothing to Power, so Power gains `rounds − ⌊rounds/3⌋`. The
 * book's own example is an SMG 5M firing 10 rounds → **12D**, not 15D. Getting this wrong
 * inflates a burst by a quarter and looks entirely plausible on the card.
 *
 * Level is capped at Deadly. Power is not — staging past Deadly is a separate rule
 * (`stageDamage`), and this is the weapon's base code, before any successes.
 *
 * @returns {{power:number, level:string}}
 */
static fireModeDamage({ power, level = 'M', mode, rounds = 0, isTracer = false,
                        shortBurst = false }) {
  const STAGES = ['L', 'M', 'S', 'D'];
  let lvlIdx = STAGES.indexOf(level);
  if (lvlIdx < 0) lvlIdx = 1;
  let pwr = Number(power) || 0;

  if (mode === 'BF') {
    // ⚠ A short burst raises Power by 2 and does NOT raise the Damage Level (p.115). That
    // asymmetry is the whole rule — treating it as a weaker burst (+2 AND +1 level) is the
    // obvious mistake, and it makes a two-round burst hit harder than the book allows.
    pwr   += shortBurst ? 2 : 3;
    if (!shortBurst) lvlIdx = Math.min(3, lvlIdx + 1);
  } else if (mode === 'FA') {
    const rds = Math.max(0, Number(rounds) || 0);
    pwr   += isTracer ? (rds - Math.floor(rds / 3)) : rds;
    lvlIdx = Math.min(3, lvlIdx + Math.floor(rds / 3));
  }
  return { power: pwr, level: STAGES[lvlIdx] };
}

static async _promptFireMode(availableModes, actor, weapon, isHeavy = false, isShotgun = false) {
  const weaponName   = weapon.name;
  const actorComp    = actor.system.recoilCompensation ?? 0;
  const weaponComp   = weapon.system.recoilMod ?? 0;
  const roundsBefore = actor.system.roundsFiredThisPhase ?? 0;

  // Delegates to the pure `SR3EItem.recoilTN` so the dialog's preview and the TN actually
  // applied cannot drift apart — they are now the same function, and it is unit-tested.
  const recoilForMode = (mode, rounds, totalComp, faRounds = 3) =>
    SR3EItem.recoilTN({ mode, roundsBefore: rounds, roundsThisShot: faRounds,
                        totalComp, isHeavy, isShotgun });

  // Stage-up helper
  function stageUp(level, times) {
    const S = ['L','M','S','D'];
    return S[Math.min(3, S.indexOf(level) + times)] ?? 'D';
  }

  // Build mode option rows (radio buttons with damage preview)
  const modeInfo = {
    SS: { label: 'SS — Single Shot',      rounds: 0, powerMod: 0, stageMod: 0, note: 'Standard single-shot, no recoil accumulation.' },
    SA: { label: 'SA — Semi-Auto',        rounds: 1, powerMod: 0, stageMod: 0, note: 'Second shot this phase: cumulative +1 recoil.' },
    BF: { label: 'BF — Burst Fire',       rounds: 3, powerMod: 3, stageMod: 1, note: 'Power +3, damage level +1. Recoil stacks: +3 first burst, +6 second…' },
    FA: { label: 'FA — Full Auto',        rounds: 3, powerMod: 0, stageMod: 0, note: 'Power +rounds, level +1/3 rounds (3–10 rounds, Complex Action).' },
  };

  const totalComp = actorComp + weaponComp;
  const modeRows = availableModes.map((m, i) => {
    const info    = modeInfo[m] ?? { label: m, rounds: 1, powerMod: 0, stageMod: 0, note: '' };
    const isFirst = i === 0;
    const roundsPreview  = m === 'FA' ? '(see below)' : m === 'SS' ? '1 (no recoil)' : info.rounds;
    const recoilDisplay  = recoilForMode(m, roundsBefore, totalComp);
    const recoilPreview  = m === 'FA'
      ? `+${recoilDisplay} recoil + multi-target (see below)`
      : `+${recoilDisplay}`;
    return `
      <label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;cursor:pointer">
        <input type="radio" name="sr-fire-mode" value="${m}" ${isFirst ? 'checked' : ''} style="margin-top:2px"/>
        <span>
          <strong style="color:var(--sr-accent)">${info.label}</strong>
          <span style="font-size:11px;color:var(--sr-muted);margin-left:4px">— ${info.note}</span>
          <br><span style="font-size:11px">Rounds: <strong>${roundsPreview}</strong> &nbsp;|&nbsp; TN penalty this shot: <strong class="sr-recoil-preview" data-mode="${m}" style="color:var(--sr-amber)">${recoilPreview}</strong></span>
        </span>
      </label>`;
  }).join('');

  const isFAAvailable = availableModes.includes('FA');
  const secondSANote  = (availableModes.includes('SA') && roundsBefore >= 1)
    ? `<p style="color:var(--sr-amber);font-size:11px;margin:4px 0">⚠ You have already fired this phase (${roundsBefore} rounds) — any further shots incur cumulative recoil.</p>`
    : '';

  const faInitialDisplay = availableModes[0] === 'FA' ? 'block' : 'none';
  const faSection = isFAAvailable ? `
    <div id="fa-section" style="margin-top:8px;padding:8px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);display:${faInitialDisplay};">
      <label style="display:block;margin-bottom:6px"><strong>Rounds to fire (FA):</strong>
        <input type="number" id="fa-rounds" value="3" min="3" max="10" style="width:55px;margin-left:6px"/>
        <span style="font-size:11px;color:var(--sr-muted)">(3–10, Complex Action)</span>
      </label>
      <div style="font-size:11px;color:var(--sr-muted);margin-bottom:6px">Walking fire: 1 wasted round per metre between targets (smartguns: 0). Full-auto only — the +2 per target above applies to every mode.</div>
      <label style="display:block">Metres to previous target (wasted rounds):
        <input type="number" id="fa-metres" value="0" min="0" max="30" style="width:55px;margin-left:6px"/>
      </label>
    </div>` : '';

  // p.112's "Multiple targets +2 per additional target that Combat Phase" is a general row,
  // so it is asked for in EVERY mode — not inside `faSection`, where it used to live and
  // where SA's second shot and BF's second burst could never reach it.
  const targetOrdinal = `
    <label style="display:block;margin-top:8px;font-size:12px">Which <strong>target</strong> this Combat Phase?
      <select id="sr-target-num" style="margin-left:6px">
        <option value="1">1st (no penalty)</option>
        <option value="2">2nd (+2 TN)</option>
        <option value="3">3rd (+4 TN)</option>
        <option value="4">4th (+6 TN)</option>
        <option value="5">5th+ (+8 TN)</option>
      </select>
      <span style="font-size:11px;color:var(--sr-muted);margin-left:4px">(a further shot at the SAME target is still the 1st)</span>
    </label>`;

  const recoilState = `
    <div style="margin-top:10px;padding:6px 8px;background:#0a0a0a;border:1px solid var(--sr-border);border-radius:var(--r);font-size:11px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <strong>Recoil comp:</strong>
      <span title="Cyberware, bioware, shock pads etc. (from the actor)">Cyber/Body
        <input type="number" id="sr-actor-comp" value="${actorComp}" min="0" max="20" style="width:42px"/></span>
      <span>+</span>
      <span title="Gas vents, bipods etc. mounted on this weapon">Weapon
        <input type="number" id="sr-weapon-comp" value="${weaponComp}" min="0" max="20" style="width:42px"/></span>
      <span>= <strong id="sr-total-comp">${totalComp}</strong></span>
      <span>&nbsp;|&nbsp; Rounds fired this phase: <strong id="sr-rounds-fired">${roundsBefore}</strong></span>
      ${isHeavy ? '<span style="color:var(--sr-amber)">&nbsp;|&nbsp; ⚠ Heavy weapon: 2× uncompensated recoil</span>' : ''}
      ${isShotgun ? '<span style="color:var(--sr-amber)">&nbsp;|&nbsp; ⚠ Shotgun: 2× uncompensated recoil in Burst Fire</span>' : ''}
      <button id="sr-reset-recoil" type="button" style="margin-left:auto;padding:1px 7px;font-size:10px;cursor:pointer;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);color:var(--sr-muted)">↺ Reset</button>
    </div>`;

  const fireModeTitle = `${weaponName} — Fire Mode`;
  let fireModeHookId;
  fireModeHookId = Hooks.on('renderDialogV2', (app, html) => {
    if (app.options?.window?.title !== fireModeTitle) return;
    Hooks.off('renderDialogV2', fireModeHookId);
    const el = html?.querySelector ? html : (html?.[0] ?? null);
    if (!el) return;
    el.addEventListener('change', event => {
      if (event.target.name !== 'sr-fire-mode') return;
      const faEl = el.querySelector('#fa-section');
      if (faEl) faEl.style.display = event.target.value === 'FA' ? 'block' : 'none';
    });

    // Recompute the per-mode recoil previews from the current comp inputs and rounds count
    const refreshPreviews = () => {
      const aComp = Math.max(0, parseInt(el.querySelector('#sr-actor-comp')?.value)  || 0);
      const wComp = Math.max(0, parseInt(el.querySelector('#sr-weapon-comp')?.value) || 0);
      const total = aComp + wComp;
      const rounds = parseInt(el.querySelector('#sr-rounds-fired')?.textContent) || 0;
      const totalEl = el.querySelector('#sr-total-comp');
      if (totalEl) totalEl.textContent = String(total);
      // A full-auto burst's own rounds count toward its recoil, so the preview has to track
      // the rounds field — otherwise it shows a number the shot will not actually use.
      const faRounds = Math.max(3, parseInt(el.querySelector('#fa-rounds')?.value) || 3);
      el.querySelectorAll('.sr-recoil-preview').forEach(span => {
        const m = span.dataset.mode;
        const r = recoilForMode(m, rounds, total, faRounds);
        span.textContent = `+${r}`;
      });
    };
    el.querySelector('#sr-actor-comp')?.addEventListener('input', refreshPreviews);
    el.querySelector('#sr-weapon-comp')?.addEventListener('input', refreshPreviews);
    el.querySelector('#fa-rounds')?.addEventListener('input', refreshPreviews);

    el.querySelector('#sr-reset-recoil')?.addEventListener('click', async () => {
      await actor.update({ 'system.roundsFiredThisPhase': 0 });
      el.querySelector('#sr-rounds-fired').textContent = '0';
      refreshPreviews();
    });
  });

  let result = null;
  await foundry.applications.api.DialogV2.wait({
    window: { title: fireModeTitle },
    content: `
      <div style="padding:8px 0">
        ${secondSANote}
        <p style="margin:0 0 8px;font-size:12px;color:var(--sr-muted)">Select firing mode:</p>
        ${modeRows}
        ${targetOrdinal}
        ${faSection}
        ${recoilState}
      </div>`,
    buttons: [
      {
        label: 'Confirm Mode',
        action: 'confirm',
        default: true,
        callback: async (_e, _b, dialog) => {
          const el     = dialog.element;
          const mode   = el.querySelector('input[name="sr-fire-mode"]:checked')?.value ?? availableModes[0];
          let   rounds = modeInfo[mode]?.rounds ?? 1;
          let   additionalTNPenalty = 0;
          let   roundsWasted = 0;

          // Every mode — p.112's table row is not scoped to full auto (see multiTargetTN).
          additionalTNPenalty = SR3EItem.multiTargetTN(el.querySelector('#sr-target-num')?.value);

          if (mode === 'FA') {
            rounds = Math.min(10, Math.max(3, parseInt(el.querySelector('#fa-rounds')?.value) || 3));
            // Walking the fire IS full-auto-only (p.116).
            const metres = Math.max(0, parseInt(el.querySelector('#fa-metres')?.value) || 0);
            if (metres > 0) roundsWasted = metres;
          }

          // Read (possibly edited) compensation values and persist them so they stick for next time.
          const aComp = Math.max(0, parseInt(el.querySelector('#sr-actor-comp')?.value)  || 0);
          const wComp = Math.max(0, parseInt(el.querySelector('#sr-weapon-comp')?.value) || 0);
          if (aComp !== actorComp)  await actor.update({ 'system.recoilCompensation': aComp });
          if (wComp !== weaponComp) await weapon.update({ 'system.recoilMod': wComp });

          // Recoil per mode (see SR3EItem.recoilTN). BF and FA count their OWN rounds —
          // `rounds` is what this shot fires — while SS/SA count only what came before.
          // Passing `rounds` here is what makes Wedge's second burst +2 rather than +0.
          const recoilTN = recoilForMode(mode, roundsBefore, aComp + wComp, rounds);
          result = { mode, rounds, roundsWasted, recoilTN, additionalTNPenalty };
        },
      },
      { label: 'Cancel', action: 'cancel' },
    ],
  });

  return result;
}

  // ---------------------------------------------------------------------------
  // SPELLCASTING
  // ---------------------------------------------------------------------------

  /**
   * Parse a drain code into { tn, level }. Two components (SR3):
   *   • Drain Power (→ resist TN) = ⌊Force/2⌋ + the **modifier outside the brackets** (default 0;
   *     the ½F base is implicit and not written in the code).
   *   • Drain Level = the nominated Damage Level + the **modifier inside the brackets**
   *     (the inside may be written "+1" or "DL+1" / "Damage Level +1" — both mean +1 stage).
   * Examples (cast at Serious, Force 6): "(DL+1)" / "(+1)" → TN 3, level Deadly;
   *   "+1" → TN 4, level Serious; "+1(+1)" → TN 4, level Deadly.
   * Legacy fallback: if the code contains an explicit "F" formula (e.g. "(F/2+1)S"), that
   *   formula IS the TN and the level is the nominated level (or a bare letter for non-damaging
   *   spells). `damageLevel` is the cast's level (null for non-damaging spells). TN min 2.
   */
  static parseDrainFormula(drainStr, force, damageLevel = null) {
    if (!drainStr) return null;
    const STAGES = ['L', 'M', 'S', 'D'];
    const F      = Number(force) || 0;
    const halfF  = Math.floor(F / 2);

    // Normalise: uppercase, strip spaces, brackets→parens, "DAMAGE LEVEL" → "DL".
    const s = String(drainStr).toUpperCase()
      .replace(/\s/g, '')
      .replace(/\[/g, '(').replace(/\]/g, ')')
      .replace(/DAMAGELEVEL/g, 'DL');

    const shiftLevel = (mod) => {
      let idx = STAGES.indexOf(damageLevel ?? 'S');
      if (idx < 0) idx = 2;
      return STAGES[Math.max(0, Math.min(3, idx + (mod || 0)))];
    };

    // --- Legacy: an explicit F-formula is the drain Power itself. ---
    if (/F/.test(s)) {
      let level;
      const dl = s.match(/DL([+-]\d+)?/);
      if (dl)               level = shiftLevel(dl[1] ? parseInt(dl[1]) : 0);
      else if (damageLevel) level = damageLevel;
      else { const m = s.match(/[LMSD]/); level = m ? m[0] : 'S'; }
      const expr = s.replace(/DL([+-]\d+)?/, '').replace(/F/g, String(F))
        .replace(/[LMSD]/g, '').replace(/[()]/g, '');
      let tn = halfF;
      if (/\d/.test(expr) && /^[\d+\-*/.]+$/.test(expr)) {
        try { tn = Math.floor(new Function(`"use strict"; return (${expr})`)()); } catch { tn = halfF; }
      }
      if (!isFinite(tn)) tn = halfF;
      return { tn: Math.max(2, tn), level };
    }

    // --- Modifier model: Power mod is OUTSIDE brackets, Level mod is INSIDE brackets. ---
    const inside    = (s.match(/\(([^)]*)\)/) || ['', ''])[1];
    const outside   = s.replace(/\([^)]*\)/g, '');
    const powerMod  = parseInt((outside.match(/[+-]?\d+/) || ['0'])[0]) || 0;

    // A bare level letter inside brackets (e.g. "(M)", "(L)") is a fixed drain level used
    // by non-combat spells — not a modifier relative to the nominated damage level.
    if (/^[LMSD]$/.test(inside)) {
      return { tn: Math.max(2, halfF + powerMod), level: inside };
    }

    const levelMod  = parseInt((inside.replace(/DL/g, '').match(/[+-]?\d+/) || ['0'])[0]) || 0;
    return { tn: Math.max(2, halfF + powerMod), level: shiftLevel(levelMod) };
  }

  /**
   * Extract the damage level letter from a spell's damage field.
   * Accepts "S", "FORCE S", "9M", etc. — always returns L/M/S/D.
   */
  static _parseSpellDamageLevel(damageStr) {
    if (!damageStr) return 'M';
    const match = damageStr.trim().match(/([LMSDlmsd])/i);
    return match ? match[1].toUpperCase() : 'M';
  }

  /**
   * Resolve a spell's cast TN + resist attribute from its Target code (the cast TN AND the
   * attribute the target resists with). Any parenthetical suffix — (R)/(T)/(RC)/(V)/(DT) — is
   * descriptive only and stripped before parsing, so codes like "W(R)", "B(T)", "4(V)" never
   * misfire. Base codes:
   *   W → Willpower, B → Body, I → Intelligence, Q → Quickness (TN = that target attribute)
   *   F → Force (TN = the spell's Force; resist defaults to Willpower)
   *   a number → fixed TN (resist defaults to Willpower)
   *   anything else (incl. OR / blank) → Mana→Willpower, Physical→Body fallback.
   */
  static _parseSpellTarget(spellTarget, targetActor, force, spellType) {
    // Strip the parenthetical suffix and whitespace → bare base code.
    const base = String(spellTarget ?? '').toUpperCase().replace(/\([^)]*\)/g, '').trim();

    const ATTRS = {
      W: ['willpower',    'Willpower'],
      B: ['body',         'Body'],
      I: ['intelligence', 'Intelligence'],
      Q: ['quickness',    'Quickness'],
    };
    if (ATTRS[base]) {
      const [attr, name] = ATTRS[base];
      const val = targetActor?.system.attributes?.[attr]?.value
               ?? targetActor?.system.attributes?.[attr]?.base ?? 3;
      return { tn: Math.max(2, val), resistAttr: attr, resistName: name, attrLabel: name };
    }
    if (base === 'F') {
      // Force is the cast TN, not a target attribute; resist defaults to Willpower.
      return { tn: Math.max(2, force ?? 1), resistAttr: 'willpower', resistName: 'Willpower', attrLabel: 'Force' };
    }
    const numeric = parseInt(base);
    if (!isNaN(numeric) && base !== '') {
      return { tn: Math.max(2, numeric), resistAttr: 'willpower', resistName: 'Willpower', attrLabel: `Fixed ${numeric}` };
    }
    // Fallback (empty / OR / unrecognised): Mana → Willpower, Physical → Body.
    const isMana = spellType !== 'Physical';
    const attr   = isMana ? 'willpower' : 'body';
    const name   = isMana ? 'Willpower' : 'Body';
    const val    = targetActor?.system.attributes?.[attr]?.value
                ?? targetActor?.system.attributes?.[attr]?.base ?? 3;
    return { tn: Math.max(2, val), resistAttr: attr, resistName: name, attrLabel: name };
  }

  /**
   * Multi-select target dialog for spellcasting.
   * Shows each candidate's relevant TN (Essence or Body).
   * Returns array of Actor objects, or null if cancelled / nothing selected.
   */
  static async _promptTargetsMulti(attacker, spellType, spellTarget, force) {
    const all = game.actors.contents
      .filter(a => a.id !== attacker.id && a.type !== 'vehicle' && game.sr3e.isLiveActor(a));
    // Prefer actors with a token on the current scene; fall back to the full
    // world list when nothing is on canvas (theatre-of-the-mind).
    const onCanvas   = canvas?.ready ? all.filter(a => a.getActiveTokens().length > 0) : [];
    const candidates = onCanvas.length ? onCanvas : all;
    if (candidates.length === 0) {
      ui.notifications.warn('No valid targets found.');
      return null;
    }

    const choices = candidates.map(a => {
      const parsed = SR3EItem._parseSpellTarget(spellTarget, a, force, spellType);
      return `
        <label class="sr-target-row">
          <input type="checkbox" name="target-actor" value="${a.id}"
                 style="width:13px;height:13px;margin:0;accent-color:var(--sr-accent);flex-shrink:0;appearance:auto;-webkit-appearance:checkbox"/>
          <span>${a.name} <span style="font-size:11px;color:var(--sr-muted)">(${parsed.attrLabel} → TN ${parsed.tn})</span></span>
        </label>`;
    }).join('');

    let targetIds = [];
    let cancelled = true;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${attacker.name} — Select Target(s)` },
      content: `<div class="sr-target-list">${choices}</div>`,
      buttons: [
        {
          label: 'Cast',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dialog) => {
            cancelled = false;
            dialog.element.querySelectorAll('input[name="target-actor"]:checked')
              .forEach(cb => targetIds.push(cb.value));
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (cancelled || targetIds.length === 0) return null;
    return targetIds.map(id => game.actors.get(id)).filter(Boolean);
  }

  /**
   * Prompt the caster to allocate Spell Pool dice.
   */
  static async _promptMagicPool(actor, maxDice) {
    if (maxDice <= 0) return 0;
    let result = 0;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${actor.name} — Spell Pool` },
      content: `
        <p><strong>${actor.name}</strong>, how many Spell Pool dice to add?</p>
        <p style="font-size:11px;color:var(--sr-muted)">Available: <strong>${maxDice}</strong> (0 = none)</p>
        <input type="number" id="magic-dice" min="0" max="${maxDice}" value="0" style="width:80px"/>
      `,
      buttons: [
        {
          label: 'Confirm',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dialog) => {
            result = Math.min(
              parseInt(dialog.element.querySelector('#magic-dice')?.value) || 0,
              maxDice
            );
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    return result;
  }

  /**
   * Full spellcasting flow.
   *
   * 1. Choose Force
   * 2. Select targets
   * 3. Allocate Spell Pool
   * 4. Roll Sorcery + Spell Pool dice vs target Essence/Body
   * 5. On hit: each target gets a Resist Spell button (Willpower/Body, TN = Force)
   * 6. Drain button always posted for the caster
   */
  async rollSpell(options = {}) {
    const actor = this.actor;
    if (!actor) { ui.notifications.warn('No actor for this spell.'); return null; }

    const magicBase = actor.system.attributes?.magic?.base ?? 0;
    if (magicBase <= 0) {
      ui.notifications.warn(`${actor.name} is not Awakened (Magic attribute is 0).`);
      return null;
    }

    // Find Sorcery skill
    const sorcerySkill       = actor.items.find(i => i.type === 'skill' && /sorcery/i.test(i.name));
    const sorceryRating      = sorcerySkill?.system?.rating ?? 0;
    const sorcerySpec        = sorcerySkill?.system?.specialisation ?? '';
    const hasSpellcastingSpec = /spellcasting/i.test(sorcerySpec);

    // Area spells are encoded by an "(A)" suffix on the Range code (e.g. "LOS (A)").
    const isAoE     = /\(A\)/i.test(this.system.range ?? '');
    const magicAttr = actor.system.attributes?.magic?.value ?? magicBase;

    // Combat spells let the caster pick the Damage Level at cast time — it sets both the
    // target's damage and (per SR3) the caster's Drain level. Non-combat spells skip it.
    // (Spells have no fixed damage code; "Combat" category = damaging.)
    const isCombat     = (this.system.category ?? '') === 'Combat';
    const defaultLevel = SR3EItem._parseSpellDamageLevel(this.system.damage);
    const LEVEL_NAMES  = { L: 'Light', M: 'Moderate', S: 'Serious', D: 'Deadly' };

    // Step 1: Choose Force (+ Damage Level, + area radius for AoE spells)
    let force        = null;
    let damageLevel  = defaultLevel;
    let aoeRadius    = Math.max(1, magicAttr);
    let castCancelled = true;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${actor.name} — Cast ${this.name}` },
      content: `
        <p>Cast <strong>${this.name}</strong> at what Force?</p>
        <div style="font-size:12px;margin-bottom:8px">
          Sorcery dice:
          <strong>${hasSpellcastingSpec
            ? `${sorceryRating} <span style="color:var(--sr-accent)">(${sorceryRating + 2})</span> — Spellcasting spec`
            : (sorceryRating || '(none)')
          }</strong>
          <div style="color:var(--sr-muted);margin-top:4px">
            Force &gt; Magic ${magicAttr} → Drain is
            <strong style="color:var(--sr-red)">Physical</strong>
            instead of Stun
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          Force: <input type="number" id="spell-force" min="1" max="99"
                 value="${Math.max(1, sorceryRating)}" style="width:60px"/>
        </div>
        ${isCombat ? `
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
          Damage level:
          <select id="spell-damage" style="width:110px">
            ${['L', 'M', 'S', 'D'].map(l => `<option value="${l}" ${l === defaultLevel ? 'selected' : ''}>${LEVEL_NAMES[l]} (${l})</option>`).join('')}
          </select>
          <span style="font-size:11px;color:var(--sr-muted)">target damage &amp; drain level</span>
        </div>` : ''}
        ${isAoE ? `
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
          Area radius (m): <input type="number" id="spell-radius" min="1" max="99"
                 value="${aoeRadius}" style="width:60px"/>
          <span style="font-size:11px;color:var(--sr-muted)">default = Magic ${magicAttr}</span>
        </div>` : ''}
      `,
      buttons: [
        {
          label: 'Next',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dialog) => {
            castCancelled = false;
            force = Math.max(1, parseInt(dialog.element.querySelector('#spell-force')?.value) || 1);
            if (isCombat) damageLevel = dialog.element.querySelector('#spell-damage')?.value || defaultLevel;
            if (isAoE) aoeRadius = Math.max(1, parseInt(dialog.element.querySelector('#spell-radius')?.value) || aoeRadius);
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (castCancelled || force === null) return null;

    // SR3 RAW: Drain is Physical when the spell's Force exceeds the caster's Magic attribute.
    const drainIsPhysical = force > magicAttr;

    // Step 2: Select target(s)
    const spellType   = this.system.type ?? 'Mana';
    const spellTarget = this.system.target ?? '';

    let targetActors;
    let committedDodgeDice = 0;
    let aoeRegionId = null, aoeMarkerId = null, aoeCenter = null;

    if (isAoE) {
      // Nominate the area on the canvas, then auto-detect every live actor inside the radius
      // (no scatter, no falloff — each target resists at full Force). Off-canvas → manual list.
      if (canvas?.ready) {
        const placed = await SR3EItem._placeBlastTemplate(actor, aoeRadius);
        if (!placed) return null;   // cancelled placement
        aoeCenter = placed.center;
        targetActors = SR3EItem._actorsInRadius(aoeCenter, aoeRadius, actor);
        const marker = await game.sr3e.SR3EActor._drawBlastArea(aoeCenter, aoeRadius, { name: `${this.name} (area)`, color: '#8030c0' });
        aoeRegionId = marker.regionId;
        aoeMarkerId = marker.markerId;
        if (targetActors.length === 0) {
          ui.notifications.info(`${this.name}: no targets in the ${aoeRadius}m area — casting anyway (drain still applies).`);
        }
      } else {
        // No scene — fall back to the manual checkbox list.
        targetActors = await SR3EItem._promptTargetsMulti(actor, spellType, spellTarget, force);
        if (!targetActors || targetActors.length === 0) return null;
      }
    } else {
      // allowSelf: line of sight to yourself is line of sight. Health spells in
      // particular (Heal, Increase Attribute, Increase Reflexes) are normally self-cast.
      // The GM judges whether a given spell makes sense on its caster — minimal guardrails.
      const targetActor = await SR3EItem._promptTarget(actor, { allowSelf: true });
      if (!targetActor) return null;
      targetActors = [targetActor];
      // No dodge: combat spells are resisted (Willpower/Body vs Force), not dodged.
    }

    // Step 3: Spell Pool allocation — compute from raw fields, not derived cache
    const sAttr     = actor.system.attributes ?? {};
    const specBonus   = hasSpellcastingSpec ? 2 : 0;
    const sorceryDice = Math.max(0, sorceryRating + specBonus);

    const magicBase2 = sAttr.magic?.base ?? 0;
    const intVal     = sAttr.intelligence?.base ?? 0;
    const wilVal     = sAttr.willpower?.base    ?? 0;
    const spBase2    = Math.max(0, Math.floor((intVal + wilVal + magicBase2) / 3));
    const spTotal2   = spBase2 + (actor.system.spellPoolMod ?? 0);
    const availMagic = Math.max(0, spTotal2 - (actor.system.spellPoolSpent ?? 0));

    let magicDice = 0;
    if (availMagic > 0) {
      magicDice = await SR3EItem._promptMagicPool(actor, availMagic);
      if (magicDice > 0) await actor.spendSpellPool(magicDice);
    }

    const pool = Math.max(1, sorceryDice + magicDice);
    const spellPoolForDrain = Math.max(0, spTotal2 - (actor.system.spellPoolSpent ?? 0));

    // Step 4: SR3 combat spell = opposed test.
    //   Cast:   Sorcery vs TN = the spell's Target attribute on the target (W→Willpower,
    //           B→Body, F→Force, or a fixed number). For AoE the primary target sets the TN.
    //   Resist: target rolls that SAME attribute vs TN = Force (handled at resist time).
    //   Net successes (caster − resister) stage the base damage. No soak.
    const primaryTarget  = targetActors[0] ?? null;
    const parsedPrimary  = primaryTarget
      ? SR3EItem._parseSpellTarget(spellTarget, primaryTarget, force, spellType)
      : null;
    const tn             = parsedPrimary ? parsedPrimary.tn : Math.max(2, force);
    // Human-readable source of the cast TN, shown on the result card.
    let tnSource;
    if (!parsedPrimary || parsedPrimary.attrLabel === 'Force') tnSource = `Force ${force}`;
    else if (parsedPrimary.attrLabel.startsWith('Fixed'))      tnSource = 'fixed';
    else tnSource = `${primaryTarget.name}'s ${parsedPrimary.attrLabel}`;

    // Build damage context — power = Force, level chosen at cast (drives target damage AND drain level).
    // Damage track follows the spell Type: Mana → Stun, Physical → Physical.
    const level      = damageLevel;
    const isStun     = spellType !== 'Physical';
    const damageBase = { power: force, level, isStun };
    const rawDamage  = `${force}${level}`;
    const drainStr   = this.system.drain ?? '';

    const targetNames  = targetActors.length ? targetActors.map(t => t.name).join(', ')
                       : (isAoE ? `area (${aoeRadius}m)` : '—');
    const sorceryLabel = hasSpellcastingSpec
      ? `Sorcery ${sorceryRating} (${sorceryRating + 2}) — Spellcasting`
      : `Sorcery ${sorceryRating}`;
    const label        = `🔮 ${this.name} [F${force}] ${sorceryLabel} → ${targetNames}`;

    const spellContext = {
      attackerActorId:   actor.id,
      targetActorIds:    targetActors.map(t => t.id),
      spellId:           this.id,
      spellName:         this.name,
      force,
      spellType,
      spellTarget,
      isAoE,
      aoeRegionId,
      aoeMarkerId,
      tnSource,
      rawDamage,
      damageBase,
      drainStr,
      // SR3: failed-drain damage uses the nominated Damage Level (combat spells only).
      drainLevel:        isCombat ? damageLevel : null,
      sorceryRating,
      drainIsPhysical,
      spellPoolForDrain,
      committedDodgeDice,
    };

    return actor.rollPool(pool, tn, label, {
      isSpellRoll:        true,
      spellContext,
      rawDamage,
      damageBase,
      attackerActorId:    actor.id,
      targetActorId:      primaryTarget?.id ?? actor.id,
      committedDodgeDice,
      physicalDice:       options.physicalDice ?? false,
    });
  }

  /**
   * Live actors (excluding the caster and vehicles) whose token centre is within `radiusM`
   * metres of an area-spell's centre. Returns the actor list (deduped).
   */
  static _actorsInRadius(center, radiusM, caster) {
    const seen = new Set();
    const out  = [];
    for (const tok of (canvas?.tokens?.placeables ?? [])) {
      const a = tok.actor;
      if (!a || a.type === 'vehicle' || a.id === caster.id) continue;
      if (!game.sr3e.isLiveActor(a)) continue;
      if (seen.has(a.id)) continue;
      let dM; try { dM = canvas.grid.measurePath([center, tok.center])?.distance ?? Infinity; }
      catch { dM = Infinity; }
      if (dM <= radiusM) { seen.add(a.id); out.push(a); }
    }
    return out;
  }

  /**
   * Prompt for combat pool allocation
   * @private
   */
  /**
   * Ask the attacker how many Combat Pool dice to commit.
   *
   * @param   {number} maxDice  Available pool. 0 or less skips the dialog entirely.
   * @returns {Promise<number|null>}  Dice to commit, or **null if the user cancelled or
   *   dismissed the dialog** — callers must treat null as "abort the attack", matching
   *   `promptDefaultChoice` and `_promptDodgeDeclaration`. Returns 0 only when there was
   *   no pool to offer, or the user deliberately committed zero dice.
   */
  async _promptCombatPool(maxDice) {
    const actorName = this.actor?.name ?? 'Attacker';
    const hasPool   = maxDice > 0;

    // Stays null unless Confirm runs, so Cancel *and* dismissal (Esc / ✕) both yield null.
    // DialogV2.wait defaults rejectClose:false, so dismissal resolves rather than throwing.
    let dice = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: hasPool ? `${actorName} — Combat Pool` : `${actorName} — Ready to Roll` },
      content: hasPool
        ? `
        <p><strong>${actorName}</strong>, how many dice from your Combat Pool would you like to add to this attack?</p>
        <p style="font-size:11px;color:var(--sr-muted)">Available: <strong>${maxDice}</strong> dice (0 = none)</p>
        <input type="number" id="combat-dice" min="0" max="${maxDice}" value="0" style="width:80px"/>
      `
        : `
        <p><strong>${actorName}</strong> — the GM has set the target number.</p>
        <p style="font-size:11px;color:var(--sr-muted)">No Combat Pool available to allocate.</p>
      `,
      buttons: [
        {
          // The ATTACKER's roll trigger. The GM's window only sets the TN; this is
          // the click that actually throws the dice, so it is labelled accordingly.
          label: '🎲 Roll',
          action: 'roll',
          default: true,
          callback: (_event, _button, dialog) => {
            dice = hasPool
              ? Math.min(parseInt(dialog.element.querySelector('#combat-dice')?.value) || 0, maxDice)
              : 0;
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    return dice;
  }
}