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
      pool   = Math.max(1, options.pool);
      label += s.specialisation
        ? ` ${s.skillRating} (${s.skillRating + 2}) — ${s.specialisation}`
        : ` (Rating ${s.skillRating} = ${pool} dice)`;
    } else {
      pool   = Math.max(1, s.skillRating ?? 0);
      label += s.specialisation
        ? ` ${s.skillRating} (${s.skillRating + 2}) — ${s.specialisation}`
        : ` (Rating ${s.skillRating} = ${pool} dice)`;
    }

    if (pool < 1) {
      ui.notifications.warn(`No dice pool available for ${this.name}`);
      return null;
    }

    // TN modifier from defaulting is baked in here; rollPool's own +4 flag is not used.
    return actor.rollPool(pool, tn + defTnMod, label, { ...options, defaulting: false });
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
    const _applyMeleeDefault = async (info, dActor, who) => {
      if (!info.isDefault) return true;
      const def = await SR3EItem.promptDefaultChoice(dActor, {
        linkedAttr: 'strength',
        title:      `Defaulting — ${dActor.name} (${who})`,
        message:    `${dActor.name} has no Unarmed Combat / Martial Arts skill — choose how to default:`,
      });
      if (!def) return false;   // cancelled → abort the whole attack
      info.skillDice    = def.pool;
      info.skillName    = def.label;
      info.defaultTnMod = def.tnMod;
      info.availPool    = def.allowPool ? (dActor.system.derived?.availableCombatPool ?? 0) : 0;
      return true;
    };
    if (!await _applyMeleeDefault(atkInfo, actor, 'attacker'))       return null;
    if (!await _applyMeleeDefault(defInfo, targetActor, 'defender')) return null;

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
      // Defaulting adds the chosen TN modifier (+2 skill / +3 spec / +4 attribute).
      atkTN:            Math.max(2, 4 - atkReach + (atkInfo.defaultTnMod ?? 0)),
      defTN:            Math.max(2, 4 - defReach + (defInfo.defaultTnMod ?? 0)),
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
    const skillDice  = Math.max(1, basePool + specBonus);
    const availPool  = isDefault ? 0 : (actor.system.derived?.availableCombatPool ?? 0);
    // Display the actual martial-art skill name when one was used instead of "Unarmed Combat".
    const displayName = (skill && skill.name !== skillName && /^MA:/i.test(skill.name)) ? skill.name : skillName;
    return { skillName: displayName, skillRating: basePool, specName, specBonus, skillDice, availPool, isDefault };
  }

  /**
   * SR3 Default Table — interactive defaulting prompt.
   * Shown whenever an actor lacks the appropriate skill for a test. The user
   * chooses to default to:
   *   - a Specialization  (+3 TN, ½ the underlying skill's base rating, pool allowed)
   *   - a related Skill   (+2 TN, ½ the chosen skill's rating, pool allowed)
   *   - an Attribute      (+4 TN, full attribute, NO extra pool dice)
   * "½ rating" rounds down. Lists ALL of the actor's active skills/specialisations
   * (the GM judges relevance — minimal guardrails).
   *
   * @param {Actor}  actor
   * @param {object} opts   { message, linkedAttr, title }
   * @returns {Promise<null|{mode,pool,tnMod,allowPool,label}>}  null if cancelled.
   */
  static async promptDefaultChoice(actor, opts = {}) {
    const half   = r => Math.floor((r ?? 0) / 2);
    const skills = actor.items
      .filter(i => i.type === 'skill'
        && (i.system.skillType ?? 'active') === 'active'
        && (i.system.rating ?? 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
    const specSkills = skills.filter(s => (s.system.specialisation ?? '').trim() !== '');

    const skillOpts = skills.map(s => {
      const r = s.system.rating ?? 0;
      return `<option value="${s.id}" data-dice="${half(r)}">${s.name} ${r} → ${half(r)} dice</option>`;
    }).join('');
    const specOpts = specSkills.map(s => {
      const r = s.system.rating ?? 0;
      return `<option value="${s.id}" data-dice="${half(r)}">${s.name} (${s.system.specialisation}) — base ${r} → ${half(r)} dice</option>`;
    }).join('');

    const ATTRS = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower', 'reaction'];
    const attrOpts = ATTRS.map(k => {
      const v   = actor.system.attributes?.[k]?.value ?? actor.system.attributes?.[k]?.base ?? 0;
      const sel = k === (opts.linkedAttr ?? '') ? ' selected' : '';
      const lbl = k.charAt(0).toUpperCase() + k.slice(1);
      return `<option value="${k}" data-dice="${Math.max(1, v)}"${sel}>${lbl} ${v} → ${Math.max(1, v)} dice</option>`;
    }).join('');

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
        let sel, tnMod, allowPool;
        if (mode === 'specialization') { sel = html.querySelector('#def-spec');  tnMod = 3; allowPool = true; }
        else if (mode === 'skill')     { sel = html.querySelector('#def-skill'); tnMod = 2; allowPool = true; }
        else                           { sel = html.querySelector('#def-attr');  tnMod = 4; allowPool = false; }
        const opt = sel?.options[sel.selectedIndex];
        diceEl.textContent = opt ? (opt.dataset.dice ?? '0') : '0';
        tnEl.textContent   = `+${tnMod}`;
        poolEl.textContent = allowPool ? 'allowed' : 'not allowed';
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
              <option value="specialization"${specOpts ? '' : ' disabled'}>Specialization (+3 TN, ½ base skill)</option>
              <option value="skill"${skillOpts ? '' : ' disabled'}>Skill (+2 TN, ½ skill rating)</option>
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
            Dice pool: <strong id="def-dice">?</strong> &nbsp;·&nbsp; TN modifier: <strong id="def-tn">+4</strong> &nbsp;·&nbsp; Extra pool dice: <strong id="def-pool">not allowed</strong>
          </div>
        </div>`,
      buttons: [
        {
          label: 'Confirm', action: 'confirm', default: true,
          callback: (_e, _b, dlg) => {
            const el   = dlg.element;
            const mode = el.querySelector('#def-mode')?.value ?? 'attribute';
            if (mode === 'specialization') {
              const sel = el.querySelector('#def-spec');
              const opt = sel?.options[sel.selectedIndex];
              const sk  = opt ? actor.items.get(opt.value) : null;
              result = { mode, pool: parseInt(opt?.dataset.dice) || 0, tnMod: 3, allowPool: true,
                         label: sk ? `Defaulting → ${sk.name} spec (½ base ${sk.system.rating}), TN +3` : 'Defaulting → specialization, TN +3' };
            } else if (mode === 'skill') {
              const sel = el.querySelector('#def-skill');
              const opt = sel?.options[sel.selectedIndex];
              const sk  = opt ? actor.items.get(opt.value) : null;
              result = { mode, pool: parseInt(opt?.dataset.dice) || 0, tnMod: 2, allowPool: true,
                         label: sk ? `Defaulting → ${sk.name} (½ of ${sk.system.rating}), TN +2` : 'Defaulting → skill, TN +2' };
            } else {
              const sel = el.querySelector('#def-attr');
              const opt = sel?.options[sel.selectedIndex];
              const key = opt?.value ?? (opts.linkedAttr ?? 'body');
              const lbl = key.charAt(0).toUpperCase() + key.slice(1);
              result = { mode: 'attribute', pool: parseInt(opt?.dataset.dice) || 1, tnMod: 4, allowPool: false,
                         label: `Defaulting → ${lbl} ${opt?.dataset.dice ?? ''}, TN +4 (no pool)` };
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

  // Out-of-ammo guard (only when tracking) — empty weapons are inoperable.
  if (game.settings.get('The2ndChumming3e', 'trackAmmo')) {
    if (this.type === 'firearm' && (this.system.loadedRounds ?? 0) <= 0) {
      ui.notifications.warn(`${this.name} is empty — reload before firing.`);
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
    let defTnMod = 0, defAllowPool = false;
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
      // SR3 Default Table — let the user choose specialization / skill / attribute.
      const def = await SR3EItem.promptDefaultChoice(actor, {
        linkedAttr: this._getDefaultAttribute(),
        message:    `No <strong>${skillName}</strong> skill — choose how to default:`,
      });
      if (!def) return null;   // cancelled
      pool         = def.pool;
      defTnMod     = def.tnMod;
      defAllowPool = def.allowPool;
      label       += ` — ${def.label}`;
    }

    // Combat pool allowed unless defaulting to an attribute.
    const availableCombatPool = actor.system.derived?.availableCombatPool ?? 0;
    if ((skill || defAllowPool) && availableCombatPool > 0) {
      const combatDice = await this._promptCombatPool(availableCombatPool);
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
    options.defaulting       = false;                  // TN modifier already baked into tn
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
      const isHeavy = HEAVY_CATS.has(this.system.category ?? '');
      if (availableModes.length === 1 && availableModes[0] === 'SS') {
        fireModeResult = { mode: 'SS', rounds: 0, roundsWasted: 0, recoilTN: 0, additionalTNPenalty: 0 };
      } else {
        fireModeResult = await SR3EItem._promptFireMode(availableModes, actor, this, isHeavy);
        if (!fireModeResult) return null;
      }

      // SS warning — single-shot weapons cannot fire twice in a combat phase
      if (fireModeResult.mode === 'SS' && (actor.system.roundsFiredThisPhase ?? 0) >= 1) {
        ui.notifications.warn('SS weapons cannot fire twice in a combat phase.');
      }
      // FA-only ammo (Tracer) warning
      const ammoRules = game.sr3e.SR3E.ammoTypes[ammoType] ?? {};
      if (ammoRules.faOnly && fireModeResult.mode !== 'FA') {
        ui.notifications.warn(`${ammoRules.label} ammo can only be used in Full Auto.`);
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
          const rds      = fireModeResult.rounds;
          const stagesUp = Math.floor(rds / 3);
          // Tracer: the every-third tracer rounds raise the Damage Level but do NOT
          // add to Power (e.g. SMG 5M firing 10 rounds → 12D, not 15D).
          power  += ammoRules.tracer ? (rds - Math.floor(rds / 3)) : rds;
          lvlIdx  = Math.min(3, lvlIdx + stagesUp);
        }

        rawDamage = `${power}${STAGES[lvlIdx]}${parsed.isStun ? ' Stun' : ''}`;
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
  const weaponOpts = await SR3EItem._promptWeaponRollOptions(targetActor, rawDamage, actor, extraTNMod,
    tnBreakdownParts.length ? tnBreakdownParts.join(' | ') : null, rangeInfo);
  if (!weaponOpts) return null;

  // Anti-Vehicle ammo bypasses the vehicle Power/2 reduction (same effect as the AV-munition checkbox)
  if (ammoType === 'antiVehicle') weaponOpts.avMunition = true;

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

  let defTnMod = 0, defAllowPool = false;
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
    // SR3 Default Table — let the user choose specialization / skill / attribute.
    const def = await SR3EItem.promptDefaultChoice(actor, {
      linkedAttr: this._getDefaultAttribute(),
      message:    `No appropriate weapon skill — choose how to default:`,
    });
    if (!def) return null;   // cancelled
    pool         = def.pool;
    defTnMod     = def.tnMod;
    defAllowPool = def.allowPool;
    label       += ` — ${def.label}`;
  }

  // Attacker combat pool allocation — allowed unless defaulting to an attribute.
  const availableCombatPool = actor.system.derived?.availableCombatPool ?? 0;
  if ((skill || defAllowPool) && availableCombatPool > 0) {
    const combatDice = await this._promptCombatPool(availableCombatPool);
    if (combatDice > 0) {
      await actor.spendCombatPool(combatDice);
      pool  += combatDice;
      label += ` + ${combatDice} Combat Pool`;
    }
  }

  pool  = Math.max(1, pool);
  tn    = tn + defTnMod;   // bake defaulting TN modifier

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
  options.defaulting         = false;        // TN modifier already baked into tn
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

    let vcrLevel = 0;
    if (pilotActor) {
      const modeLabel  = vcrMode ? 'VCR' : 'RCD';
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
    if (gunneryDefaulting && !gunneryDefAllowPool) controlPoolMax = 0;

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
    options.defaulting         = false;   // TN modifier already baked into tn

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
    if (this.type !== 'firearm') return;
    const actor = this.actor;
    if (!actor) return;
    const SR3E    = game.sr3e.SR3E;
    const trackOn = game.settings.get('The2ndChumming3e', 'trackAmmo');
    const gunMech = SR3EItem._parseLoadMechanism(this.system.ammunition ?? '');
    const magSize = SR3EItem._parseMagazineSize(this.system.ammunition ?? '');

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
    const mech      = SR3EItem._parseLoadMechanism(weapon.system.ammunition ?? '');
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
   * Tokens whose centre is within `radius` metres of the blast centre (excluding the
   * attacker's own token). Returns [{ actor, token, distance }].
   */
  static _tokensInBlast(center, radius, attacker) {
    const out = [];
    for (const tok of (canvas.tokens?.placeables ?? [])) {
      if (!tok.actor || tok.actor.id === attacker.id) continue;
      let d;
      try { d = canvas.grid.measurePath([center, tok.center])?.distance ?? Infinity; }
      catch { d = Infinity; }
      if (d <= radius) out.push({ actor: tok.actor, token: tok, distance: d });
    }
    return out;
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

  static async _promptWeaponRollOptions(targetActor, rawDamage, actor, totalTNMod = 0, modBreakdown = null, rangeInfo = null) {
    const isVehicle  = targetActor.type === 'vehicle';
    const karmaPool  = actor?.system.karmaPool ?? 0;
    const rangeTNarr = game.sr3e.SR3E.rangeTN ?? [0, 1, 2, 5];
    const rangeLabels = ['Short', 'Medium', 'Long', 'Extreme'];

    // Base TN excludes range; range is added from the (editable) dropdown below.
    const baseTN     = 4 + totalTNMod;
    const initBand   = rangeInfo?.bandIdx ?? -1;
    const initRangeTN = initBand >= 0 ? (rangeTNarr[initBand] ?? 0) : 0;
    const defaultTN  = baseTN + initRangeTN;

    const modNote   = (totalTNMod !== 0 || modBreakdown)
      ? `<div style="font-size:11px;color:var(--sr-amber);margin-bottom:8px">⚡ TN modifiers: ${modBreakdown ?? (totalTNMod > 0 ? `+${totalTNMod}` : totalTNMod)} (pre-applied)</div>`
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

    // Live TN recompute when the range band changes (DialogV2.wait does not call `render`).
    let hookId = null;
    if (rangeInfo) {
      hookId = Hooks.on('renderDialogV2', (_app, html) => {
        const el = html?.querySelector ? html : html?.[0];
        if (!el?.querySelector?.('#sr-range')) return;
        Hooks.off('renderDialogV2', hookId);
        const sel     = el.querySelector('#sr-range');
        const tnInput = el.querySelector('#sr-tn');
        sel.addEventListener('change', () => {
          const base = parseInt(sel.dataset.base) || 4;
          tnInput.value = base + (rangeTNarr[parseInt(sel.value)] ?? 0);
        });
      });
    }

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Weapon Roll Options' },
      content: `
        <div style="padding:8px 0">
          ${modNote}
          ${rangeRow}
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
              <div style="color:var(--sr-accent);font-size:11px">⚠ Vehicle target: Power ÷2 (round up), Stage −1 will be applied <span style="color:var(--sr-muted)">(load Anti-Vehicle ammo to bypass)</span></div>
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
            const useKarma   = html.querySelector('#sr-karma')?.checked ?? false;
            // avMunition is now driven by Anti-Vehicle ammo type, not a manual checkbox
            result = { tn, damageCode, avMunition: false, useKarma, karmaReroll: useKarma };
          }
        },
        { label: 'Cancel', action: 'cancel' }
      ]
    });
    if (hookId) Hooks.off('renderDialogV2', hookId); // safety if the dialog never matched
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
static async _promptFireMode(availableModes, actor, weapon, isHeavy = false) {
  const weaponName   = weapon.name;
  const actorComp    = actor.system.recoilCompensation ?? 0;
  const weaponComp   = weapon.system.recoilMod ?? 0;
  const roundsBefore = actor.system.roundsFiredThisPhase ?? 0;
  const recoilMult   = isHeavy ? 2 : 1;

  // Recoil TN for a given mode, reduced by total compensation, × heavy multiplier.
  //  BF: cumulative AND counts its own 3 rounds — +3 first burst, +6 second, +9 third…
  //  SS/SA/FA: cumulative on the rounds already fired this phase (this shot's rounds
  //            are added afterwards, so they penalise the NEXT shot, not this one).
  function recoilForMode(mode, rounds, totalComp, mult) {
    if (mode === 'BF') return Math.max(0, (rounds + 3) - totalComp) * mult;
    return Math.max(0, rounds - totalComp) * mult;
  }

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
    const recoilDisplay  = recoilForMode(m, roundsBefore, totalComp, recoilMult);
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
      el.querySelectorAll('.sr-recoil-preview').forEach(span => {
        const m = span.dataset.mode;
        const r = recoilForMode(m, rounds, total, recoilMult);
        span.textContent = m === 'FA' ? `+${r} recoil + multi-target (see below)` : `+${r}`;
      });
    };
    el.querySelector('#sr-actor-comp')?.addEventListener('input', refreshPreviews);
    el.querySelector('#sr-weapon-comp')?.addEventListener('input', refreshPreviews);

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

          if (mode === 'FA') {
            rounds = Math.min(10, Math.max(3, parseInt(el.querySelector('#fa-rounds')?.value) || 3));
            const targetNum = parseInt(el.querySelector('#fa-target-num')?.value) || 1;
            const metres    = Math.max(0, parseInt(el.querySelector('#fa-metres')?.value) || 0);
            if (targetNum > 1) additionalTNPenalty = (targetNum - 1) * 2;
            if (metres > 0)    roundsWasted = metres;
          }

          // Read (possibly edited) compensation values and persist them so they stick for next time.
          const aComp = Math.max(0, parseInt(el.querySelector('#sr-actor-comp')?.value)  || 0);
          const wComp = Math.max(0, parseInt(el.querySelector('#sr-weapon-comp')?.value) || 0);
          if (aComp !== actorComp)  await actor.update({ 'system.recoilCompensation': aComp });
          if (wComp !== weaponComp) await weapon.update({ 'system.recoilMod': wComp });

          // Recoil per mode (see recoilForMode): BF stacks +3/+6/+9…; SS/SA/FA use the
          // rounds fired before this shot. This shot's rounds are committed after the roll.
          const recoilTN = recoilForMode(mode, roundsBefore, aComp + wComp, recoilMult);
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