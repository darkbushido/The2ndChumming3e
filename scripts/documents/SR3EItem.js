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
    s.canDefault      = !isLan && s.skillType !== 'language';
    s.defaultingPool  = s.canDefault ? Math.max(1, attrValue - 2) : 0;
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
    if (options.pool != null) {
      pool = Math.max(1, options.pool);
    } else {
      pool = isDefaulting ? s.defaultingPool : Math.max(1, s.skillRating ?? 0);
    }

    if (pool < 1) {
      ui.notifications.warn(`No dice pool available for ${this.name}`);
      return null;
    }

    let label = `${this.name}`;
    if (isDefaulting) {
      label += ` (Defaulting: ${s.linkedAttribute} ${s.attributeValue} - 2 = ${pool})`;
    } else if (s.specialisation) {
      label += ` ${s.skillRating} (${s.skillRating + 2}) — ${s.specialisation}`;
    } else {
      label += ` (Rating ${s.skillRating} = ${pool} dice)`;
    }
    
    return actor.rollPool(pool, tn, label, options);
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
    const actor = this.actor;
    if (!actor) {
      ui.notifications.warn('No actor for this weapon.');
      return null;
    }

    // Parse attacker damage code (resolve STR against attacker)
    const rawDamage  = this.system.damage || '';
    const damageBase = SR3EItem.parseDamageCode(rawDamage, actor);
    if (!damageBase) {
      ui.notifications.warn(`${this.name} has no damage code set (e.g. 6M or (STR+2)M).`);
      return null;
    }

    // Select target
    const targetActor = await SR3EItem._promptTarget(actor);
    if (!targetActor) return null;

    // Get defender's equipped melee weapon, fall back to unarmed, then bare hands
    const defWeapon = SR3EItem._getEquippedMelee(targetActor);

    // Build rich pool info for both sides
    const atkInfo  = SR3EItem._buildMeleePoolInfo(actor, this);
    const defInfo  = SR3EItem._buildMeleePoolInfo(targetActor, defWeapon);
    const atkReach = this.system.reach ?? 0;
    const defReach = defWeapon?.system?.reach ?? 0;
    const atkTN    = Math.max(2, 4 - atkReach);
    const defTN    = Math.max(2, 4 - defReach);

    await game.sr3e.SR3EActor.postMeleeCard({
      attackerActorId:  actor.id,
      defenderActorId:  targetActor.id,
      atkWeaponId:      this.id,
      defWeaponId:      defWeapon?.id ?? null,
      atkWeaponName:    this.name,
      defWeaponName:    defWeapon?.name ?? 'Bare Hands',
      atkRawDamage:     rawDamage,
      atkDamageBase:    damageBase,
      defRawDamage:     defWeapon?.system?.damage ?? '',
      defDamageBase:    defWeapon ? SR3EItem.parseDamageCode(defWeapon.system?.damage ?? '', targetActor) : null,
      atkReach,
      defReach,
      atkTN,
      defTN,
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
        damage:   `${str}M`,
        reach:    0,
        category: 'UNA',
      },
    };
  }

  /**
   * Build a melee dice pool for an actor using their weapon.
   * Uses skill rating if available, otherwise defaults to Strength - 2.
   */
  static _buildMeleePoolInfo(actor, weapon) {
    const map       = SR3EItem.WEAPON_SKILL_MAP;
    const code      = weapon?.system?.category ?? '';
    const skillName = map[code]?.skill ?? (
      ['CYB','UNA'].includes(code) ? 'Unarmed Combat' : 'Armed Combat'
    );
    const skill     = actor.items.find(i =>
      i.type === 'skill' && (i.name === skillName || i.name.includes(skillName))
    );
    const str       = actor.system.attributes?.strength?.value ?? 1;
    const isDefault = !skill;
    const basePool  = isDefault ? Math.max(1, str - 2) : (skill.system.skillRating ?? 0);
    let specBonus   = 0;
    let specName    = '';
    if (skill?.system?.specialisation &&
        weapon?.name?.toLowerCase().includes(skill.system.specialisation.toLowerCase())) {
      specBonus = 2;
      specName  = skill.system.specialisation;
    }
    const skillDice  = Math.max(1, basePool + specBonus);
    const availPool  = actor.system.derived?.availableCombatPool ?? 0;
    return { skillName, skillRating: basePool, specName, specBonus, skillDice, availPool, isDefault };
  }

    static _buildMeleePool(actor, weapon) {
    if (!weapon) return Math.max(1, (actor.system.attributes?.strength?.value ?? 1) - 2);

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

    let pool = skill ? (skill.system.skillRating ?? 0) : Math.max(1, (actor.system.attributes?.strength?.value ?? 1) - 2);

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
   * Once at D, every 2 remaining successes = +1 power.
   * Returns { power, level, isStun, staged } where staged = number of stage steps taken.
   */
  static stageDamage(base, netSuccesses) {
    const STAGES = ['L', 'M', 'S', 'D'];
    let { power, level, isStun } = base;
    let idx     = STAGES.indexOf(level);
    let remaining = netSuccesses;
    let staged    = 0;

    while (remaining >= 2) {
      remaining -= 2;
      if (idx < STAGES.length - 1) {
        idx++;
        staged++;
      } else {
        // Already at D — each pair of remaining successes adds 1 to power
        power++;
      }
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

  const isAoE = this.system.isAoE ?? false;
  let rawDamage = this.system.damage || '';

  if (isAoE) {
    // ── AoE path ────────────────────────────────────────────────────────────
    // Step 1: Select all targets in blast radius
    const targetActors = await SR3EItem._promptTargetsAoE(actor);
    if (!targetActors || targetActors.length === 0) return null;

    // Step 2: Roll options (TN + damage code, optional Chunky Salsa)
    const weaponOpts = await SR3EItem._promptWeaponRollOptionsAoE(rawDamage, actor, targetActors);
    if (!weaponOpts) return null;

    const tn               = weaponOpts.tn;
    options.useKarma       = weaponOpts.useKarma;
    options.karmaReroll    = weaponOpts.karmaReroll;
    let effectiveRawDamage = weaponOpts.damageCode;
    let damageBase         = SR3EItem.parseDamageCode(effectiveRawDamage, actor);
    if (!damageBase) {
      ui.notifications.warn(`${this.name} has no damage code set. Edit the item to add one (e.g. 9M, 8M Stun).`);
    }

    // Step 3: Build attacker pool
    const skillName = this._getWeaponSkill();
    const skill     = actor.items.find(i =>
      i.type === 'skill' && (i.name === skillName || i.name.includes(skillName))
    );

    let pool  = 0;
    let label = `${this.name}`;
    if (damageBase) label += ` [${effectiveRawDamage}]`;
    label += ` → ${targetActors.length} target${targetActors.length !== 1 ? 's' : ''}`;

    if (skill) {
      pool = skill.system.skillRating || 0;
      const skillSpec  = skill.system.specialisation;
      const baseRating = skill.system.skillRating || 0;
      const specMatch  = skillSpec && (
        this.name.toLowerCase() === skillSpec.toLowerCase() ||
        this.name.toLowerCase().includes(skillSpec.toLowerCase())
      );
      if (specMatch) {
        pool += 2;
        label += ` (${skill.name} ${baseRating} (${baseRating + 2}) — ${skillSpec})`;
      } else {
        label += ` (${skill.name} ${baseRating})`;
      }
    } else {
      const attr      = this._getDefaultAttribute();
      const attrValue = actor.system.attributes?.[attr]?.value ?? 0;
      pool  = Math.max(1, attrValue - 2);
      label += ` (Defaulting: ${attr} - 2)`;
    }

    const availableCombatPool = actor.system.derived?.availableCombatPool ?? 0;
    if (availableCombatPool > 0) {
      const combatDice = await this._promptCombatPool(availableCombatPool);
      if (combatDice > 0) {
        await actor.spendCombatPool(combatDice);
        pool  += combatDice;
        label += ` + ${combatDice} Combat Pool`;
      }
    }

    pool  = Math.max(1, pool);

    options.weaponItemId   = this.id;
    options.actorId        = actor.id;
    options.rawDamage      = effectiveRawDamage;
    options.damageBase     = damageBase;
    options.isWeaponRoll   = true;
    options.isMelee        = false;
    options.isAoE          = true;
    options.aoeTargetIds   = targetActors.map(t => t.id);
    options.chunkySalsa    = weaponOpts.chunkySalsa ?? null;
    options.grenadeType    = weaponOpts.grenadeType ?? 'standard';
    options.skipWoundMod   = true;

    return actor.rollPool(pool, tn, label, options);
  }

  // ── Single-target path ─────────────────────────────────────────────────────
  // --- Step 1: Select target ---
  const targetActor = await SR3EItem._promptTarget(actor);
  if (!targetActor) return null;

  // --- Step 1.5: Ammo selection (firearms only) ---
  let ammoPowerMod = 0, ammoTNMod = 0;
  if (this.type === 'firearm') {
    const ammoItems = actor.items.filter(i => i.type === 'ammunition');
    if (ammoItems.length > 0) {
      const ammoResult = await SR3EItem._promptAmmoSelection(ammoItems, this.system.equippedAmmoId ?? '', this);
      if (ammoResult === null) return null; // cancelled
      ammoPowerMod = ammoResult.powerMod;
      ammoTNMod    = ammoResult.tnMod;
      // Persist the selected ammo on the weapon
      if (ammoResult.ammoId !== this.system.equippedAmmoId) {
        await this.update({ 'system.equippedAmmoId': ammoResult.ammoId });
      }
      // Apply power modifier to raw damage code default
      if (ammoPowerMod !== 0) {
        const parsed = SR3EItem.parseDamageCode(rawDamage, actor);
        if (parsed) {
          const newPower = parsed.power + ammoPowerMod;
          rawDamage = `${newPower}${parsed.level}${parsed.isStun ? ' Stun' : ''}`;
        }
      }
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
      const isHeavy = HEAVY_CATS.has(this.system.category ?? '');
      if (availableModes.length === 1 && availableModes[0] === 'SS') {
        fireModeResult = { mode: 'SS', rounds: 0, roundsWasted: 0, recoilTN: 0, additionalTNPenalty: 0 };
      } else {
        fireModeResult = await SR3EItem._promptFireMode(availableModes, actor, this.name, isHeavy);
        if (!fireModeResult) return null;
      }
      fireModeRounds = fireModeResult.rounds + (fireModeResult.roundsWasted ?? 0);

      // Apply mode damage modifiers to rawDamage
      const parsed = SR3EItem.parseDamageCode(rawDamage, actor);
      if (parsed) {
        const STAGES  = ['L','M','S','D'];
        let   power   = parsed.power;
        let   lvlIdx  = STAGES.indexOf(parsed.level ?? 'M');
        if (lvlIdx < 0) lvlIdx = 1;

        if (fireModeResult.mode === 'BF') {
          power  += 3;
          lvlIdx  = Math.min(3, lvlIdx + 1);
        } else if (fireModeResult.mode === 'FA') {
          power  += fireModeResult.rounds;
          const stagesUp = Math.floor(fireModeResult.rounds / 3);
          lvlIdx  = Math.min(3, lvlIdx + stagesUp);
        }

        rawDamage = `${power}${STAGES[lvlIdx]}${parsed.isStun ? ' Stun' : ''}`;
      }
    }
  }

  // --- Step 3: Roll options dialog (TN + damage code + vehicle modifier) ---
  const recoilTNMod  = fireModeResult?.recoilTN ?? 0;
  const woundPenalty = -(actor.system.woundMod ?? 0);
  const extraTNMod   = ammoTNMod + recoilTNMod + (fireModeResult?.additionalTNPenalty ?? 0) + woundPenalty;
  const tnBreakdownParts = [];
  if (recoilTNMod)                           tnBreakdownParts.push(`Recoil +${recoilTNMod}`);
  if (fireModeResult?.additionalTNPenalty)   tnBreakdownParts.push(`Multi-target +${fireModeResult.additionalTNPenalty}`);
  if (ammoTNMod)                             tnBreakdownParts.push(`Ammo TN${ammoTNMod > 0 ? '+' : ''}${ammoTNMod}`);
  if (woundPenalty > 0)                      tnBreakdownParts.push(`Wound +${woundPenalty}`);
  const weaponOpts = await SR3EItem._promptWeaponRollOptions(targetActor, rawDamage, actor, extraTNMod,
    tnBreakdownParts.length ? tnBreakdownParts.join(' | ') : null);
  if (!weaponOpts) return null;

  const tn = weaponOpts.tn;
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

  // --- Step 3: Defender declares dodge (vehicles cannot dodge) ---
  let committedDodgeDice = 0;
  if (targetActor.type !== 'vehicle') {
    const dodgeDeclaration = await SR3EItem._promptDodgeDeclaration(targetActor, actor.name, this.name);
    if (dodgeDeclaration === null) return null;  // cancelled
    if (dodgeDeclaration > 0) {
      committedDodgeDice = await targetActor.spendCombatPool(dodgeDeclaration);
    }
  }

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

  if (skill) {
    pool = skill.system.skillRating || 0;
    const skillSpec  = skill.system.specialisation;
    const baseRating = skill.system.skillRating || 0;
    const specMatch  = skillSpec && (
      this.name.toLowerCase() === skillSpec.toLowerCase() ||
      this.name.toLowerCase().includes(skillSpec.toLowerCase())
    );
    if (specMatch) {
      pool += 2;
      label += ` (${skill.name} ${baseRating} (${baseRating + 2}) — ${skillSpec})`;
    } else {
      label += ` (${skill.name} ${baseRating})`;
    }
  } else {
    const attr      = this._getDefaultAttribute();
    const attrValue = actor.system.attributes?.[attr]?.value ?? 0;
    pool  = Math.max(1, attrValue - 2);
    label += ` (Defaulting: ${attr} - 2)`;
  }

  // Attacker combat pool allocation
  const availableCombatPool = actor.system.derived?.availableCombatPool ?? 0;
  if (availableCombatPool > 0) {
    const combatDice = await this._promptCombatPool(availableCombatPool);
    if (combatDice > 0) {
      await actor.spendCombatPool(combatDice);
      pool  += combatDice;
      label += ` + ${combatDice} Combat Pool`;
    }
  }

  pool  = Math.max(1, pool);

  // Store full context — including committed dodge dice
  options.weaponItemId       = this.id;
  options.actorId            = actor.id;
  options.targetActorId      = targetActor.id;
  options.rawDamage          = effectiveRawDamage;
  options.damageBase         = damageBase;
  options.isWeaponRoll       = true;
  options.isMelee            = ['melee'].includes(this.type);
  options.committedDodgeDice = committedDodgeDice;
  options.skipWoundMod       = true;

  // Commit recoil — update rounds fired counter before the roll
  if (fireModeRounds > 0) {
    const currentRounds = actor.system.roundsFiredThisPhase ?? 0;
    await actor.update({ 'system.roundsFiredThisPhase': currentRounds + fireModeRounds });
  }

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

    let vcrLevel = 0;
    if (pilotActor) {
      const modeLabel  = vcrMode ? 'VCR' : 'RCR';
      const gunnery    = pilotActor.items.find(i => i.type === 'skill' && /gunnery/i.test(i.name));
      if (gunnery) {
        const base = gunnery.system.skillRating ?? gunnery.system.rating ?? 0;
        const spec  = gunnery.system.specialisation ?? '';
        const specMatch = spec && (
          this.name.toLowerCase().includes(spec.toLowerCase()) ||
          (this.system.weaponType ?? '').toLowerCase().includes(spec.toLowerCase())
        );
        pool      = specMatch ? base + 2 : base;
        poolLabel = specMatch
          ? `${pilotActor.name} (${modeLabel}): Gunnery ${base} (${pool}) — ${spec}`
          : `${pilotActor.name} (${modeLabel}): Gunnery ${base}`;
      } else {
        const int = pilotActor.system.attributes?.intelligence?.value
                 ?? pilotActor.system.attributes?.intelligence?.base ?? 1;
        pool      = Math.max(1, int - 2);
        poolLabel = `${pilotActor.name} (${modeLabel}): Defaulting — INT ${int} − 2`;
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

    // Step 3: Roll options dialog
    const baseSig  = targetActor.type === 'vehicle'
      ? (targetActor.system.attributes?.sig?.base ?? 4)
      : 4;
    const weaponOpts = await SR3EItem._promptVehicleWeaponRollOptions(
      this, targetActor, pool, poolLabel, baseSig, rawDamage, vcrLevel
    );
    if (!weaponOpts) return null;

    const finalPool = Math.max(1, pool + weaponOpts.fireControl);
    const tn        = weaponOpts.tn;
    const fcNote    = weaponOpts.fireControl > 0 ? ` + FC${weaponOpts.fireControl}` : '';
    const label     = `🚗 ${this.name} [${weaponOpts.damageCode}] vs ${targetActor.name} — ${poolLabel}${fcNote}`;

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
  static async _promptVehicleWeaponRollOptions(weapon, targetActor, pool, poolLabel, baseSig, rawDamage, vcrLevel = 0) {
    const isVehicleTarget = targetActor.type === 'vehicle';
    const sensorRating    = weapon.actor?.system.attributes?.sensor?.base ?? 0;
    const tnReduction     = vcrLevel > 0 ? vcrLevel : sensorRating;
    const tnReductionLabel = vcrLevel > 0 ? `VCR Lv${vcrLevel}` : `Sensor ${sensorRating}`;
    const defaultTN       = Math.max(2, baseSig - tnReduction);

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
          <label class="vw-field">Fire Control dice
            <input type="number" id="vw-fc" value="0" min="0" max="20"/>
          </label>
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
              fireControl: Math.max(0, parseInt(el.querySelector('#vw-fc')?.value)     || 0),
              damageCode:  el.querySelector('#vw-damage')?.value.trim() || rawDamage,
              avMunition:  el.querySelector('#vw-av')?.checked ?? false,
            };
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    return result;
  }

  /**
   * Multi-select target dialog for AoE weapons.
   * Returns array of Actor objects (may include vehicles), or null if cancelled.
   */
  static async _promptTargetsAoE(attacker) {
    const candidates = game.actors.contents.filter(a =>
      a.id !== attacker.id && game.sr3e.isLiveActor(a)
    );
    if (candidates.length === 0) {
      ui.notifications.warn('No valid targets found.');
      return null;
    }

    const choices = candidates.map(a => {
      const body = a.system.attributes?.body?.value ?? a.system.attributes?.body?.base ?? '?';
      return `
        <label class="sr-target-row">
          <input type="checkbox" name="target-actor" value="${a.id}"
                 style="width:13px;height:13px;margin:0;accent-color:var(--sr-accent);flex-shrink:0;appearance:auto;-webkit-appearance:checkbox"/>
          <span>${a.name} <span style="font-size:11px;color:var(--sr-muted)">(Body ${body})</span></span>
        </label>`;
    }).join('');

    let targetIds = [];
    let cancelled = true;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${attacker.name} — Who's in the blast?` },
      content: `<div class="sr-target-list">${choices}</div>`,
      buttons: [
        {
          label: 'Throw / Fire',
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
   * Ammo selection dialog — shown before weapon roll options for firearms.
   * Returns { ammoId, powerMod, tnMod } or null if cancelled.
   */
  static async _promptAmmoSelection(ammoItems, currentAmmoId, weapon) {
    const opts = [
      `<option value="" ${!currentAmmoId ? 'selected' : ''}>— No ammo modifier —</option>`,
      ...ammoItems.map(a => {
        const pm = a.system.powerMod ?? 0;
        const tm = a.system.tnMod ?? 0;
        const mods = [
          pm !== 0 ? `Power${pm > 0 ? '+' : ''}${pm}` : '',
          tm !== 0 ? `TN${tm > 0 ? '+' : ''}${tm}` : '',
        ].filter(Boolean).join(', ') || 'no modifier';
        return `<option value="${a.id}" ${a.id === currentAmmoId ? 'selected' : ''}>${a.name} (${mods})</option>`;
      }),
    ].join('');

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${weapon.name} — Select Ammo` },
      content: `
        <div style="padding:8px 0">
          <p style="margin:0 0 8px;font-size:12px;color:var(--sr-muted)">
            Select the ammo type loaded for this shot. Changing ammo counts as an action.
          </p>
          <select id="ammo-select" style="width:100%">${opts}</select>
        </div>`,
      buttons: [
        {
          label: 'Fire',
          action: 'fire',
          default: true,
          callback: (_e, _b, dialog) => {
            const sel    = dialog.element.querySelector('#ammo-select');
            const ammoId = sel?.value ?? '';
            const ammo   = ammoId ? ammoItems.find(a => a.id === ammoId) : null;
            result = {
              ammoId,
              powerMod: ammo?.system.powerMod ?? 0,
              tnMod:    ammo?.system.tnMod    ?? 0,
            };
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    return result;
  }

  /**
   * Roll options dialog for AoE weapons — TN, damage code, and optional Chunky Salsa
   * confined-space blast calculator with per-target distance inputs.
   */
  static async _promptWeaponRollOptionsAoE(rawDamage, actor, targetActors = []) {
    const karmaPool = actor?.system.karmaPool ?? 0;

    function calcBlast(power, charDist, walls) {
      const waves = [];
      const direct = power - charDist;
      if (direct > 0) waves.push({ label: `Direct (${charDist}m)`, power: direct });
      for (const w of walls) {
        let wp;
        if (w.type === 'same') {
          if (w.dist <= charDist) continue; // wall between blast and target — not a valid rebound
          wp = power - (2 * w.dist - charDist);
        } else {
          wp = power - (2 * w.dist + charDist);
        }
        if (wp > 0) {
          const wallLabel = w.type === 'same' ? 'Behind-target rebound' : 'Opp./side wall';
          waves.push({ label: `${wallLabel} @${w.dist}m`, power: wp });
        }
      }
      return waves;
    }

    function getWalls(el) {
      const walls = [];
      el.querySelectorAll('.sr-wall-row').forEach(row => {
        walls.push({
          type: row.querySelector('.sr-wall-type')?.value || 'same',
          dist: parseInt(row.querySelector('.sr-wall-dist')?.value) || 1,
        });
      });
      return walls;
    }

    function updatePreview(el) {
      const csEnabled = el.querySelector('#cs-toggle')?.checked;
      const csSection = el.querySelector('#cs-section');
      if (csSection) csSection.style.display = csEnabled ? 'block' : 'none';
      if (!csEnabled) return;

      const code = el.querySelector('#sr-damage')?.value.trim() || rawDamage;
      const m    = code.match(/^(\d+)\s*([LMSDlmsd])/i);
      if (!m) return;
      const basePower = parseInt(m[1]);
      const level     = m[2].toUpperCase();
      const walls     = getWalls(el);

      targetActors.forEach((ta, idx) => {
        const charDist   = parseInt(el.querySelector(`.cs-target-dist[data-idx="${idx}"]`)?.value) || 0;
        const waves      = calcBlast(basePower, charDist, walls);
        const totalPower = waves.reduce((s, w) => s + w.power, 0);
        const previewEl  = el.querySelector(`.cs-target-preview[data-idx="${idx}"]`);
        if (!previewEl) return;
        if (totalPower <= 0) { previewEl.textContent = '→ No hit'; return; }
        const detail = waves.length > 1 ? ` (${waves.map(w => w.power).join('+')}=)` : '';
        previewEl.textContent = `→ ${totalPower}${level}${detail}`;
      });
    }

    const targetRows = targetActors.map((ta, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin:3px 0;">
        <span style="flex:1;font-size:12px;">${ta.name}</span>
        <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;font-size:12px;">Dist:
          <input type="number" class="cs-target-dist" data-idx="${i}" value="0" min="0" style="width:50px;"/>m
        </label>
        <span class="cs-target-preview" data-idx="${i}" style="font-size:11px;color:var(--sr-amber);min-width:60px;text-align:right;"></span>
      </div>`).join('');

    const AOE_TITLE = 'AoE Weapon Roll Options';
    let aoeHookId;
    aoeHookId = Hooks.on('renderDialogV2', (app, html) => {
      if (app.options?.window?.title !== AOE_TITLE) return;
      Hooks.off('renderDialogV2', aoeHookId);
      const el = html?.querySelector ? html : (html?.[0] ?? null);
      if (!el) return;
      el.addEventListener('input',  () => updatePreview(el));
      el.addEventListener('change', () => updatePreview(el));
      el.addEventListener('click', event => {
        if (!event.target.closest('#sr-add-wall-btn')) return;
        const wallList = el.querySelector('#sr-wall-list');
        const div = document.createElement('div');
        div.className = 'sr-wall-row';
        div.style.cssText = 'display:flex;align-items:center;gap:8px;margin:3px 0;';
        div.innerHTML = `
          <select class="sr-wall-type" style="flex:1;">
            <option value="same">Behind target (further from blast)</option>
            <option value="opposite">Opposite / side wall</option>
          </select>
          <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;font-size:12px;">Dist:
            <input type="number" class="sr-wall-dist" value="3" min="1" style="width:50px;"/>m
          </label>
          <button type="button" class="sr-remove-wall-btn" style="padding:2px 8px;">✕</button>`;
        div.querySelector('.sr-remove-wall-btn').addEventListener('click', () => {
          div.remove();
          updatePreview(el);
        });
        wallList.appendChild(div);
        updatePreview(el);
      });
    });

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: AOE_TITLE },
      content: `
        <div style="padding:8px 0">
          <div style="margin-bottom:10px">
            <label>Target Number (TN):
              <input type="number" id="sr-tn" value="4" min="2" max="30" style="width:60px;margin-left:8px"/>
            </label>
          </div>
          <div style="margin-bottom:10px">
            <label>Damage Code:
              <input type="text" id="sr-damage" value="${rawDamage}" style="width:80px;margin-left:8px"/>
            </label>
          </div>
          <div style="margin-bottom:10px">
            <label>Grenade Type:
              <select id="sr-grenade-type" style="margin-left:8px">
                <option value="standard">Standard (1d6m scatter, −2m/hit)</option>
                <option value="aerodynamic">Aerodynamic (2d6m scatter, −4m/hit)</option>
                <option value="launcher">Grenade Launcher (3d6m scatter, −4m/hit)</option>
              </select>
            </label>
          </div>
          ${karmaPool > 0 ? `
            <div style="margin-bottom:10px">
              <label><input type="checkbox" id="sr-karma"/> Use Karma Pool (${karmaPool} available)</label>
            </div>
          ` : ''}
          <div style="margin-bottom:8px;padding:6px 8px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:bold;">
              <input type="checkbox" id="cs-toggle"/>
              💥 Confined Space (Chunky Salsa)?
            </label>
          </div>
          <div id="cs-section" style="display:none;padding:8px;background:var(--sr-surface);border:1px solid var(--sr-accent);border-radius:var(--r);margin-bottom:8px;">
            <div style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <strong style="font-size:12px;">Walls</strong>
                <button type="button" id="sr-add-wall-btn" style="padding:2px 10px;font-size:11px;">+ Add Wall</button>
              </div>
              <div id="sr-wall-list"></div>
            </div>
            ${targetActors.length > 0 ? `
              <div>
                <strong style="font-size:12px;display:block;margin-bottom:4px;">Distance from Blast Epicentre</strong>
                ${targetRows}
              </div>` : ''}
          </div>
          <div style="color:var(--sr-muted);font-size:11px">Rule of Six active. No dodge — all targets in blast soak.</div>
        </div>
      `,
      buttons: [
        {
          label: 'Roll',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            const el         = dialog.element;
            const tn         = Math.max(2, parseInt(el.querySelector('#sr-tn')?.value) || 4);
            const damageCode = el.querySelector('#sr-damage')?.value.trim() || rawDamage;
            const useKarma   = el.querySelector('#sr-karma')?.checked ?? false;
            const csEnabled  = el.querySelector('#cs-toggle')?.checked ?? false;

            let chunkySalsa = null;
            if (csEnabled && targetActors.length > 0) {
              const m = damageCode.match(/^(\d+)\s*([LMSDlmsd])/i);
              if (m) {
                const basePower = parseInt(m[1]);
                const level     = m[2].toUpperCase();
                const walls     = getWalls(el);
                chunkySalsa = targetActors.map((ta, idx) => {
                  const charDist   = parseInt(el.querySelector(`.cs-target-dist[data-idx="${idx}"]`)?.value) || 0;
                  const waves      = calcBlast(basePower, charDist, walls);
                  const totalPower = waves.reduce((s, w) => s + w.power, 0);
                  return { actorId: ta.id, name: ta.name, power: totalPower, level, waves };
                }).filter(t => t.power > 0);
              }
            }

            const grenadeType = el.querySelector('#sr-grenade-type')?.value ?? 'standard';
            result = { tn, damageCode, useKarma, karmaReroll: useKarma, chunkySalsa, grenadeType };
          }
        },
        { label: 'Cancel', action: 'cancel' }
      ]
    });
    return result;
  }

  static async _promptWeaponRollOptions(targetActor, rawDamage, actor, totalTNMod = 0, modBreakdown = null) {
    const isVehicle = targetActor.type === 'vehicle';
    const karmaPool = actor?.system.karmaPool ?? 0;
    const defaultTN = 4 + totalTNMod;
    const modNote   = (totalTNMod !== 0 || modBreakdown)
      ? `<div style="font-size:11px;color:var(--sr-amber);margin-bottom:8px">⚡ TN modifiers: ${modBreakdown ?? (totalTNMod > 0 ? `+${totalTNMod}` : totalTNMod)} (pre-applied)</div>`
      : '';

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Weapon Roll Options' },
      content: `
        <div style="padding:8px 0">
          ${modNote}
          <div style="margin-bottom:10px">
            <label>Target Number (TN):
              <input type="number" id="sr-tn" value="${defaultTN}" min="2" max="30" style="width:60px;margin-left:8px"/>
            </label>
          </div>
          <div style="margin-bottom:10px">
            <label>Damage Code:
              <input type="text" id="sr-damage" value="${rawDamage}" style="width:80px;margin-left:8px"/>
            </label>
          </div>
          ${isVehicle ? `
            <div style="margin-bottom:10px;padding:8px;background:var(--sr-surface);border:1px solid var(--sr-accent);border-radius:var(--r)">
              <div style="color:var(--sr-accent);font-size:11px;margin-bottom:6px">⚠ Vehicle target: Power ÷2 (round up), Stage −1 will be applied</div>
              <label style="font-size:12px">
                <input type="checkbox" id="sr-av"/>
                AV munition? <span style="color:var(--sr-muted);font-size:11px">(removes vehicle modifier)</span>
              </label>
            </div>
          ` : ''}
          ${karmaPool > 0 ? `
            <div style="margin-bottom:10px">
              <label><input type="checkbox" id="sr-karma"/> Use Karma Pool (${karmaPool} available)</label>
            </div>
          ` : ''}
          <div style="color:var(--sr-muted);font-size:11px">Rule of Six (exploding 6s) always active</div>
        </div>
      `,
      buttons: [
        {
          label: 'Roll',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            const html = dialog.element;
            const tn = Math.max(2, parseInt(html.querySelector('#sr-tn')?.value) || 4);
            const damageCode = html.querySelector('#sr-damage')?.value.trim() || rawDamage;
            const avMunition = html.querySelector('#sr-av')?.checked ?? false;
            const useKarma   = html.querySelector('#sr-karma')?.checked ?? false;
            result = { tn, damageCode, avMunition, useKarma, karmaReroll: useKarma };
          }
        },
        { label: 'Cancel', action: 'cancel' }
      ]
    });
    return result;
  }

  /**
   * Ask the defender to commit dodge dice before the attack is rolled.
   * Returns number of dice committed (0 = no dodge), or null if cancelled.
   */
  static async _promptDodgeDeclaration(defender, attackerName, weaponName) {
    if (defender.type === 'vehicle') return 0;  // vehicles cannot dodge

    // Full Defense: skip the dialog and auto-commit the reserved pool
    if ((defender.system.fullDefense ?? false) && (defender.system.fullDefensePool ?? 0) > 0) {
      const fd = defender.system.fullDefensePool;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: defender }),
        content: `<div class="sr-roll-card"><div class="sr-roll-header">🛡 ${defender.name} — Full Defense (${fd} dice auto-committed)</div></div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      });
      // Clear full defense after first use
      await defender.update({ 'system.fullDefense': false, 'system.fullDefensePool': 0 });
      return fd;
    }

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
          Do you want to try and dodge this attack?
        </p>
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
    });

    if (cancelled) return null;
    return dodgeDice;
  }

  /**
   * Prompt the attacker to select a target from all non-vehicle actors.
   * Returns the selected Actor or null if cancelled.
   */
  static async _promptTarget(attacker) {
    const _typeBadge = type => {
      if (type === 'npc')     return `<span style="font-size:10px;color:var(--sr-amber)"> [NPC]</span>`;
      if (type === 'vehicle') return `<span style="font-size:10px;color:var(--sr-accent)"> [Vehicle]</span>`;
      return '';
    };
    const candidates = game.actors.contents.filter(a =>
      a.id !== attacker.id && game.sr3e.isLiveActor(a)
    );

    if (!candidates.length) {
      ui.notifications.warn('No valid targets found.');
      return null;
    }

    const choices = candidates.map((a, i) => `
      <label class="sr-target-row">
        <input type="radio" name="target-actor" value="${a.id}" ${i === 0 ? 'checked' : ''}
               style="width:13px;height:13px;margin:0;accent-color:var(--sr-accent);flex-shrink:0;appearance:auto;-webkit-appearance:radio"/>
        <span>${a.name}${_typeBadge(a.type)}</span>
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
static async _promptFireMode(availableModes, actor, weaponName, isHeavy = false) {
  const comp        = actor.system.recoilCompensation ?? 0;
  const roundsBefore = actor.system.roundsFiredThisPhase ?? 0;
  const baseRecoil  = Math.max(0, roundsBefore - comp);
  const recoilMult  = isHeavy ? 2 : 1;

  // Stage-up helper
  function stageUp(level, times) {
    const S = ['L','M','S','D'];
    return S[Math.min(3, S.indexOf(level) + times)] ?? 'D';
  }

  // Build mode option rows (radio buttons with damage preview)
  const modeInfo = {
    SS: { label: 'SS — Single Shot',      rounds: 0, powerMod: 0, stageMod: 0, note: 'Standard single-shot, no recoil accumulation.' },
    SA: { label: 'SA — Semi-Auto',        rounds: 1, powerMod: 0, stageMod: 0, note: 'Second shot this phase: cumulative +1 recoil.' },
    BF: { label: 'BF — Burst Fire',       rounds: 3, powerMod: 3, stageMod: 1, note: 'Power +3, damage level +1.' },
    FA: { label: 'FA — Full Auto',        rounds: 3, powerMod: 0, stageMod: 0, note: 'Power +rounds, level +1/3 rounds (3–10 rounds, Complex Action).' },
  };

  const modeRows = availableModes.map((m, i) => {
    const info    = modeInfo[m] ?? { label: m, rounds: 1, powerMod: 0, stageMod: 0, note: '' };
    const isFirst = i === 0;
    const roundsPreview  = m === 'FA' ? '(see below)' : m === 'SS' ? '1 (no recoil)' : info.rounds;
    const recoilDisplay  = baseRecoil * recoilMult;
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
      <div style="font-size:11px;color:var(--sr-muted);margin-bottom:6px">Walking fire: 1 wasted round per metre between targets (smartguns: 0)</div>
      <label style="display:block;margin-bottom:4px">Which target in this phase?
        <select id="fa-target-num" style="margin-left:6px">
          <option value="1">1st (no penalty)</option>
          <option value="2">2nd (+2 TN)</option>
          <option value="3">3rd (+4 TN)</option>
          <option value="4">4th (+6 TN)</option>
          <option value="5">5th+ (+8 TN)</option>
        </select>
      </label>
      <label style="display:block">Metres to previous target (wasted rounds):
        <input type="number" id="fa-metres" value="0" min="0" max="30" style="width:55px;margin-left:6px"/>
      </label>
    </div>` : '';

  const recoilState = `
    <div style="margin-top:10px;padding:6px 8px;background:#0a0a0a;border:1px solid var(--sr-border);border-radius:var(--r);font-size:11px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span><strong>Recoil state:</strong>
      Compensation <strong>${comp}</strong> &nbsp;|&nbsp;
      Rounds fired this phase: <strong id="sr-rounds-fired">${roundsBefore}</strong>
      ${isHeavy ? '&nbsp;|&nbsp; <span style="color:var(--sr-amber)">⚠ Heavy weapon: 2× uncompensated recoil</span>' : ''}</span>
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
    el.querySelector('#sr-reset-recoil')?.addEventListener('click', async () => {
      await actor.update({ 'system.roundsFiredThisPhase': 0 });
      el.querySelector('#sr-rounds-fired').textContent = '0';
      el.querySelectorAll('.sr-recoil-preview').forEach(span => {
        span.textContent = span.dataset.mode === 'FA' ? '+0 recoil + multi-target (see below)' : '+0';
      });
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
        ${faSection}
        ${recoilState}
      </div>`,
    buttons: [
      {
        label: 'Confirm Mode',
        action: 'confirm',
        default: true,
        callback: (_e, _b, dialog) => {
          const el     = dialog.element;
          const mode   = el.querySelector('input[name="sr-fire-mode"]:checked')?.value ?? availableModes[0];
          let   rounds = modeInfo[mode]?.rounds ?? 1;
          let   additionalTNPenalty = 0;
          let   roundsWasted = 0;

          if (mode === 'FA') {
            rounds = Math.min(10, Math.max(3, parseInt(el.querySelector('#fa-rounds')?.value) || 3));
            const targetNum = parseInt(el.querySelector('#fa-target-num')?.value) || 1;
            const metres    = Math.max(0, parseInt(el.querySelector('#fa-metres')?.value) || 0);
            if (targetNum > 1) additionalTNPenalty = (targetNum - 1) * 2;
            if (metres > 0)    roundsWasted = metres;
          }

          // Recoil TN = uncompensated rounds fired before this shot × multiplier (2× for heavy weapons).
          // Rounds from THIS shot are added after the roll (they penalise future shots, not this one).
          const recoilTN = baseRecoil * recoilMult;
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
   * Parse a drain formula string into { tn, level }.
   * Handles all observed formats from scraped data:
   *   "(F/2)S"      → TN = floor(F/2),   level = S
   *   "(F/2M)"      → TN = floor(F/2),   level = M  (letter inside parens)
   *   "[(F/2)-1]D"  → TN = floor(F/2-1), level = D
   *   "(F-2)S"      → TN = floor(F-2),   level = S
   *
   * Strategy: substitute F first, normalise brackets, strip the level letter
   * (wherever it sits), then evaluate the remaining math expression.
   * TN is always clamped to a minimum of 2.
   *
   * Returns null if the string cannot be parsed.
   */
  static parseDrainFormula(drainStr, force) {
    if (!drainStr) return null;

    // Substitute force value and normalise brackets → parens
    let s = drainStr.trim()
      .replace(/\s/g, '')
      .replace(/F/gi, String(Number(force)))
      .replace(/\[/g, '(')
      .replace(/\]/g, ')');

    // Find the one level letter (L/M/S/D) — default to 'S' if absent
    const levelMatch = s.match(/[LMSDlmsd]/i);
    const level = levelMatch ? levelMatch[0].toUpperCase() : 'S';

    // Remove the level letter to leave a pure math expression
    const expr = s.replace(/[LMSDlmsd]/i, '');

    // Safety: only digits, operators, parens, dots allowed
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;

    let tn;
    try {
      // eslint-disable-next-line no-new-func
      tn = Math.floor(new Function(`"use strict"; return (${expr})`)());
    } catch {
      return null;
    }
    if (!isFinite(tn)) return null;
    return { tn: Math.max(2, tn), level };
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
   * Resolve spell attack TN and resist attribute from the spell's target field.
   * W(R) → Willpower, B(R) → Body, F(R) → Force, numeric → fixed TN.
   * Falls back to Mana=Essence / Physical=Body if target field is absent.
   */
  static _parseSpellTarget(spellTarget, targetActor, force, spellType) {
    const t = String(spellTarget ?? '').trim().toUpperCase();
    if (t === 'W(R)' || t === 'W') {
      const val = targetActor.system.attributes?.willpower?.value
               ?? targetActor.system.attributes?.willpower?.base ?? 3;
      return { tn: Math.max(2, val), resistAttr: 'willpower', resistName: 'Willpower', attrLabel: 'Willpower' };
    }
    if (t === 'B(R)' || t === 'B') {
      const val = targetActor.system.attributes?.body?.value
               ?? targetActor.system.attributes?.body?.base ?? 3;
      return { tn: Math.max(2, val), resistAttr: 'body', resistName: 'Body', attrLabel: 'Body' };
    }
    if (t === 'F(R)' || t === 'F') {
      return { tn: Math.max(2, force ?? 1), resistAttr: 'willpower', resistName: 'Willpower', attrLabel: 'Force' };
    }
    const numeric = parseInt(t);
    if (!isNaN(numeric) && t !== '') {
      return { tn: Math.max(2, numeric), resistAttr: 'willpower', resistName: 'Willpower', attrLabel: 'Fixed' };
    }
    // Fallback: original Mana→Essence / Physical→Body logic
    if (spellType === 'Physical') {
      const val = targetActor.system.attributes?.body?.value
               ?? targetActor.system.attributes?.body?.base ?? 3;
      return { tn: Math.max(2, val), resistAttr: 'body', resistName: 'Body', attrLabel: 'Body' };
    }
    const essVal = targetActor.system.attributes?.essence?.value ?? 6;
    return { tn: Math.max(2, essVal), resistAttr: 'willpower', resistName: 'Willpower', attrLabel: 'Essence' };
  }

  /**
   * Multi-select target dialog for spellcasting.
   * Shows each candidate's relevant TN (Essence or Body).
   * Returns array of Actor objects, or null if cancelled / nothing selected.
   */
  static async _promptTargetsMulti(attacker, spellType, spellTarget, force) {
    const candidates = game.actors.contents
      .filter(a => a.id !== attacker.id && a.type !== 'vehicle' && game.sr3e.isLiveActor(a));
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

    // Step 1: Choose Force
    let force       = null;
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
            Force &gt; ${sorceryRating} → Drain is
            <strong style="color:var(--sr-red)">Physical</strong>
            instead of Stun
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          Force: <input type="number" id="spell-force" min="1" max="99"
                 value="${Math.max(1, sorceryRating)}" style="width:60px"/>
        </div>
      `,
      buttons: [
        {
          label: 'Next',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dialog) => {
            castCancelled = false;
            force = Math.max(1, parseInt(dialog.element.querySelector('#spell-force')?.value) || 1);
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (castCancelled || force === null) return null;

    const drainIsPhysical = sorceryRating > 0 && force > sorceryRating;

    // Step 2: Select target(s)
    const spellType   = this.system.type ?? 'Mana';
    const spellTarget = this.system.target ?? '';
    const isAoE       = (this.system.range ?? 'LOS') === 'LOS (A)';

    let targetActors;
    let committedDodgeDice = 0;

    if (isAoE) {
      targetActors = await SR3EItem._promptTargetsMulti(actor, spellType, spellTarget, force);
      if (!targetActors || targetActors.length === 0) return null;
    } else {
      const targetActor = await SR3EItem._promptTarget(actor);
      if (!targetActor) return null;
      targetActors = [targetActor];

      const dodgeDeclaration = await SR3EItem._promptDodgeDeclaration(targetActor, actor.name, this.name);
      if (dodgeDeclaration === null) return null;
      if (dodgeDeclaration > 0) {
        committedDodgeDice = await targetActor.spendCombatPool(dodgeDeclaration);
      }
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

    // Step 4: TN from primary target
    const primaryTarget  = targetActors[0];
    const parsedTarget   = SR3EItem._parseSpellTarget(spellTarget, primaryTarget, force, spellType);
    const tn             = parsedTarget.tn;

    // Build damage context — power = Force, level from spell's damage field
    const level      = SR3EItem._parseSpellDamageLevel(this.system.damage);
    const isStun     = /stun/i.test(this.system.damage ?? '');
    const damageBase = { power: force, level, isStun };
    const rawDamage  = `${force}${level}`;
    const drainStr   = this.system.drain ?? '';

    const targetNames  = targetActors.map(t => t.name).join(', ');
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
      rawDamage,
      damageBase,
      drainStr,
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
      targetActorId:      primaryTarget.id,
      committedDodgeDice,
      physicalDice:       options.physicalDice ?? false,
    });
  }

  /**
   * Prompt for combat pool allocation
   * @private
   */
  async _promptCombatPool(maxDice) {
    if (maxDice <= 0) return 0;
    const actorName = this.actor?.name ?? 'Attacker';
    return new Promise(resolve => {
      new foundry.applications.api.DialogV2({
        window: { title: `${actorName} — Combat Pool` },
        content: `
          <p><strong>${actorName}</strong>, how many dice from your Combat Pool would you like to add to this attack?</p>
          <p style="font-size:11px;color:var(--sr-muted)">Available: <strong>${maxDice}</strong> dice (0 = none)</p>
          <input type="number" id="combat-dice" min="0" max="${maxDice}" value="0" style="width:80px"/>
        `,
        buttons: [
          {
            label: 'Confirm',
            action: 'roll',
            default: true,
            callback: (_event, _button, dialog) => {
              const dice = parseInt(dialog.element.querySelector('#combat-dice')?.value) || 0;
              resolve(Math.min(dice, maxDice));
            }
          },
          { label: 'Cancel', action: 'cancel', callback: () => resolve(0) },
        ],
      }).render(true);
    });
  }
}