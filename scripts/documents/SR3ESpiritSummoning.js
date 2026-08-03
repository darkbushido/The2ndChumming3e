/**
 * SR3ESpiritSummoning
 *
 * Handles the full conjuring flow:
 *   1. openSummonDialog(conjurerActor, spiritTypeKey?)
 *      → choose spirit type, force, services → roll Conjuring vs TN=Force (Rule of Six)
 *   2. On final wave: "Confirm Summoning" button (creates spirit actor) + Resist Drain button
 *   3. confirmSummoning(payload)  — static, called from chat button handler in sr3e.js
 *
 * Dismiss a spirit manually:
 *   SR3ESpiritSummoning.dismissSpirit(spiritActor)
 */

// ---------------------------------------------------------------------------
// Spirit definitions
// ---------------------------------------------------------------------------

const BASE_STATS = (F) => ({
  body:         F,
  quickness:    F,
  strength:     F,
  charisma:     F,
  intelligence: F,
  willpower:    F,
  essence:      F,
  magic:        F,
  reaction:     F,
  initiative:   F * 2 + 20,
});

export const SPIRIT_TYPES = {
  // ---- Elementals (SR3 p.258-261) ----------------------------------------
  earth_elemental: {
    label:    'Earth Elemental',
    category: 'elemental',
    stats: (F) => ({ ...BASE_STATS(F), body: F + 2, strength: F + 2 }),
    powers: ['Materialization', 'Engulf (Earth)', 'Movement', 'Concealment'],
  },
  air_elemental: {
    label:    'Air Elemental',
    category: 'elemental',
    stats: (F) => ({ ...BASE_STATS(F), quickness: F + 2 }),
    powers: ['Materialization', 'Engulf (Air)', 'Movement', 'Concealment', 'Immunity to Normal Weapons'],
  },
  fire_elemental: {
    label:    'Fire Elemental',
    category: 'elemental',
    stats: (F) => ({ ...BASE_STATS(F), body: F + 1 }),
    powers: ['Materialization', 'Engulf (Fire)', 'Movement', 'Concealment', 'Immunity to Normal Weapons'],
  },
  water_elemental: {
    label:    'Water Elemental',
    category: 'elemental',
    stats: (F) => ({ ...BASE_STATS(F), body: F + 1 }),
    powers: ['Materialization', 'Engulf (Water)', 'Movement', 'Concealment'],
  },

  // ---- Nature Spirits (SR3 p.262-266) -------------------------------------
  forest_spirit: {
    label:    'Forest Spirit',
    category: 'nature',
    domain:   'Forest',
    stats: (F) => ({ ...BASE_STATS(F), body: F + 2, strength: F + 2 }),
    powers: ['Accident', 'Concealment', 'Confusion', 'Fear', 'Guard', 'Materialization', 'Movement'],
  },
  river_spirit: {
    label:    'River Spirit',
    category: 'nature',
    domain:   'Water',
    stats: (F) => ({ ...BASE_STATS(F), body: F + 1 }),
    powers: ['Accident', 'Concealment', 'Confusion', 'Engulf (Water)', 'Guard', 'Materialization', 'Movement'],
  },
  wind_spirit: {
    label:    'Wind Spirit',
    category: 'nature',
    domain:   'Air',
    stats: (F) => ({ ...BASE_STATS(F), quickness: F + 2 }),
    powers: ['Accident', 'Concealment', 'Confusion', 'Guard', 'Materialization', 'Movement'],
  },
  field_spirit: {
    label:    'Field Spirit',
    category: 'nature',
    domain:   'Plains',
    stats: (F) => BASE_STATS(F),
    powers: ['Accident', 'Concealment', 'Confusion', 'Guard', 'Materialization', 'Movement'],
  },
  city_spirit: {
    label:    'City Spirit',
    category: 'nature',
    domain:   'Urban',
    stats: (F) => BASE_STATS(F),
    powers: ['Accident', 'Concealment', 'Confusion', 'Fear', 'Guard', 'Materialization', 'Movement'],
  },
  desert_spirit: {
    label:    'Desert Spirit',
    category: 'nature',
    domain:   'Desert',
    stats: (F) => ({ ...BASE_STATS(F), body: F + 1 }),
    powers: ['Accident', 'Concealment', 'Confusion', 'Guard', 'Materialization', 'Movement'],
  },
  mountain_spirit: {
    label:    'Mountain Spirit',
    category: 'nature',
    domain:   'Mountain',
    stats: (F) => ({ ...BASE_STATS(F), body: F + 3, strength: F + 3 }),
    powers: ['Accident', 'Concealment', 'Confusion', 'Guard', 'Materialization', 'Movement'],
  },
  swamp_spirit: {
    label:    'Swamp Spirit',
    category: 'nature',
    domain:   'Swamp',
    stats: (F) => ({ ...BASE_STATS(F), body: F + 1 }),
    powers: ['Accident', 'Concealment', 'Confusion', 'Fear', 'Guard', 'Materialization', 'Movement'],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export class SR3ESpiritSummoning {

  /**
   * Open the summoning dialog for a given conjurer.
   * @param {Actor}  conjurer
   * @param {string} [defaultSpiritType]  Pre-select this spirit type key.
   */
  static async openSummonDialog(conjurer, defaultSpiritType = 'earth_elemental') {
    const magicBase      = conjurer.system?.attributes?.magic?.base ?? 0;
    const charisma       = conjurer.system?.attributes?.charisma?.base ?? conjurer.system?.attributes?.charisma?.value ?? 1;
    const conjuringSkill = SR3ESpiritSummoning._getConjuringRating(conjurer);
    const maxHold        = Math.max(0, conjuringSkill - 1);   // keep ≥1 die for the Conjuring Test
    const drainName      = { L: 'Light', M: 'Moderate', S: 'Serious', D: 'Deadly' };

    const elementalOptions = Object.entries(SPIRIT_TYPES)
      .filter(([, v]) => v.category === 'elemental')
      .map(([k, v]) => `<option value="${k}" ${k === defaultSpiritType ? 'selected' : ''}>${v.label}</option>`)
      .join('');

    const natureOptions = Object.entries(SPIRIT_TYPES)
      .filter(([, v]) => v.category === 'nature')
      .map(([k, v]) => `<option value="${k}" ${k === defaultSpiritType ? 'selected' : ''}>${v.label} — ${v.domain}</option>`)
      .join('');

    const holdBackField = maxHold > 0
      ? `<div style="display:grid; grid-template-columns:130px 70px 1fr; align-items:center; gap:6px;">
           <label style="font-weight:bold;">Hold back dice</label>
           <input id="sr3e-summon-holdback" type="number" min="0" max="${maxHold}" value="0" />
           <span style="color:var(--color-text-dark-secondary,#888); font-size:0.85em;">saved for the Drain Resist (max ${maxHold})</span>
         </div>`
      : '';

    const content = `
      <div style="display:flex; flex-direction:column; gap:10px; padding:6px 2px;">
        <div style="display:grid; grid-template-columns:130px 1fr; align-items:center; gap:6px;">
          <label style="font-weight:bold;">Spirit Type</label>
          <select id="sr3e-spirit-type">
            <optgroup label="── Elementals ──">${elementalOptions}</optgroup>
            <optgroup label="── Nature Spirits ──">${natureOptions}</optgroup>
          </select>
        </div>
        <div style="display:grid; grid-template-columns:130px 70px 1fr; align-items:center; gap:6px;">
          <label style="font-weight:bold;">Force</label>
          <input id="sr3e-spirit-force" type="number" min="1" max="12" value="4" />
          <span style="color:var(--color-text-dark-secondary,#888); font-size:0.85em;">
            Conjuring skill: <b>${conjuringSkill}</b>
          </span>
        </div>
        ${holdBackField}
        <hr style="margin:2px 0;" />
        <div style="font-size:0.9em; color:var(--color-text-dark-secondary,#888);">
          Each success = one service the spirit owes (Conjuring Test vs TN = Force).
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.9em;">
          <span>Conjuring: <b>${conjuringSkill}</b> dice <span id="sr3e-conj-pool"></span> vs TN = Force</span>
          <span id="sr3e-drain-preview" style="color:#b44; font-weight:bold;">Drain: —</span>
        </div>
        <div id="sr3e-phys-warn" style="color:var(--sr-red,#c44); font-size:0.85em; display:none;">
          ⚠ Force &gt; Magic (${magicBase}) — Drain will be Physical!
        </div>
        <div style="font-size:0.8em; color:var(--color-text-dark-secondary,#888);">
          GM: totem modifiers &amp; spirit foci dice may be added to either test.
        </div>
      </div>
    `;

    let confirmed = false;
    let result    = {};

    await foundry.applications.api.DialogV2.wait({
      window: { title: `Summon Spirit — ${conjurer.name}` },
      content,
      render: (event, dialog) => {
        const el       = dialog.element;
        const forceIn  = el.querySelector('#sr3e-spirit-force');
        const holdIn   = el.querySelector('#sr3e-summon-holdback');
        const drainLbl = el.querySelector('#sr3e-drain-preview');
        const physWarn = el.querySelector('#sr3e-phys-warn');
        const poolSpan = el.querySelector('#sr3e-conj-pool');
        const refresh  = () => {
          const f      = parseInt(forceIn.value) || 0;
          const held   = Math.min(maxHold, Math.max(0, parseInt(holdIn?.value) || 0));
          const lvl    = SR3ESpiritSummoning._conjuringDrainLevel(f, charisma);
          const isPhys = f > magicBase;
          drainLbl.textContent = `Drain: ${drainName[lvl]} ${isPhys ? 'Physical' : 'Stun'} (TN ${Math.max(2, f)})`;
          if (physWarn) physWarn.style.display = isPhys ? '' : 'none';
          if (poolSpan) poolSpan.textContent = held > 0 ? `(− ${held} held = ${Math.max(1, conjuringSkill - held)})` : '';
        };
        forceIn.addEventListener('input', refresh);
        holdIn?.addEventListener('input', refresh);
        refresh();
      },
      buttons: [
        {
          label:   'Summon',
          icon:    '<i class="fas fa-hat-wizard"></i>',
          action:  'confirm',
          default: true,
          callback: (_e, _b, dialog) => {
            const el = dialog.element;
            confirmed       = true;
            result.typeKey  = el.querySelector('#sr3e-spirit-type').value;
            result.force    = Math.max(1, parseInt(el.querySelector('#sr3e-spirit-force').value) || 1);
            result.heldBack = Math.min(maxHold, Math.max(0, parseInt(el.querySelector('#sr3e-summon-holdback')?.value ?? '0') || 0));
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!confirmed) return;

    const spiritDef = SPIRIT_TYPES[result.typeKey];
    if (!spiritDef) { ui.notifications.error(`Unknown spirit type: ${result.typeKey}`); return; }

    const { force, heldBack, typeKey } = result;

    // Conjuring Test dice = Conjuring skill minus dice held back for the Drain Resistance.
    const pool = Math.max(0, conjuringSkill - heldBack);
    if (pool < 1) { ui.notifications.warn(`${conjurer.name}: no Conjuring dice left to roll — hold back fewer.`); return; }

    const drainIsPhysical = force > magicBase;
    const drainLevel      = SR3ESpiritSummoning._conjuringDrainLevel(force, charisma);

    await conjurer.rollPool(
      pool,
      force,
      `🌀 ${conjurer.name} — Conjure ${spiritDef.label} [F${force}]`,
      {
        isConjuringRoll:  true,
        conjuringContext: {
          conjurerActorId: conjurer.id,
          spiritTypeKey:   typeKey,
          spiritLabel:     spiritDef.label,
          force,
          drainIsPhysical,
          drainLevel,        // from the Force-vs-Charisma table
          heldBack,          // added to Charisma on the Drain Resistance Test
        },
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Called from chat button: create the spirit actor in the world.
  // payload: { conjurerActorId, spiritTypeKey, force, services }
  // ---------------------------------------------------------------------------
  static async confirmSummoning(payload) {
    const { conjurerActorId, spiritTypeKey, force, services } = payload;
    const conjurer  = game.actors.get(conjurerActorId);
    const spiritDef = SPIRIT_TYPES[spiritTypeKey];
    if (!spiritDef) { ui.notifications.error(`Unknown spirit type: ${spiritTypeKey}`); return; }

    const spiritActor = await SR3ESpiritSummoning._createSpiritActor(conjurer, spiritDef, force, services);

    // Only join a fight that's already running — never start/activate combat from a summon.
    if (game.combat?.started) {
      await SR3ESpiritSummoning._addSpiritToCombat(spiritActor, force, spiritDef);
    }

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: conjurer }),
      content: `
        ✅ <b>${conjurer?.name ?? 'Conjurer'}</b> successfully summoned a <b>${spiritDef.label}</b> (Force ${force}). It is bound for <b>${services} service${services !== 1 ? 's' : ''}</b>.<br>
        <i>Powers: ${spiritDef.powers.join(', ')}.</i>
      `,
    });
  }

  // ---------------------------------------------------------------------------
  // Create a temporary world Actor for the spirit.
  // ---------------------------------------------------------------------------
  static async _createSpiritActor(conjurer, spiritDef, force, services) {
    const stats = spiritDef.stats(force);

    const spirit = await Actor.create({
      name:   `${spiritDef.label} F${force} [${conjurer?.name ?? '?'}]`,
      type:   'npc',
      img:    `systems/sr3e/assets/spirits/${spiritDef.category}.svg`,
      system: {
        attributes: {
          body:         { value: stats.body,         base: stats.body },
          quickness:    { value: stats.quickness,    base: stats.quickness },
          strength:     { value: stats.strength,     base: stats.strength },
          charisma:     { value: stats.charisma,     base: stats.charisma },
          intelligence: { value: stats.intelligence, base: stats.intelligence },
          willpower:    { value: stats.willpower,    base: stats.willpower },
          essence:      { value: stats.essence,      base: stats.essence },
          magic:        { value: stats.magic,        base: stats.magic },
          reaction:     { value: stats.reaction,     base: stats.reaction },
        },
      },
      flags: {
        sr3e: {
          isSpirit:       true,
          spiritType:     spiritDef.category === 'elemental' ? 'elemental' : 'nature',
          spiritTypeKey:  Object.keys(SPIRIT_TYPES).find(k => SPIRIT_TYPES[k] === spiritDef),
          spiritLabel:    spiritDef.label,
          spiritCategory: spiritDef.category,
          force,
          services,
          conjurerId:     conjurer?.id ?? null,
          powers:         spiritDef.powers,
        },
      },
    });

    ui.notifications.info(`${spirit.name} created with ${services} service(s).`);
    return spirit;
  }

  // ---------------------------------------------------------------------------
  // Add the spirit to active combat.
  // ---------------------------------------------------------------------------
  static async _addSpiritToCombat(spiritActor, force, spiritDef) {
    const combat = game.combat;
    if (!combat?.started) return;   // don't create/activate combat from a summon

    await combat.createEmbeddedDocuments('Combatant', [{ actorId: spiritActor.id, hidden: false }]);

    const initRoll  = await new Roll('1d6').evaluate();
    const baseInit  = spiritDef.stats(force).initiative;
    const initScore = baseInit + initRoll.total;

    const combatant = combat.combatants.find(c => c.actorId === spiritActor.id);
    if (!combatant) return;

    await combatant.update({
      initiative: initScore,
      flags: {
        sr3e: {
          baseInitiative:    initScore,
          currentInitiative: initScore,
          passesRemaining:   Math.ceil(initScore / 10),
          passNumber:        1,
          isSpirit:          true,
        },
      },
    });

    ui.notifications.info(`${spiritActor.name} enters combat (Initiative: ${initScore}).`);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** SR3 Conjuring Drain Level from Force vs the conjurer's Charisma:
   *  F ≤ ½C → Light, ≤ C → Moderate, ≤ 1.5C → Serious, else Deadly. */
  static _conjuringDrainLevel(force, charisma) {
    const C = Math.max(1, charisma);
    if (force <= Math.floor(C / 2))   return 'L';
    if (force <= C)                   return 'M';
    if (force <= Math.floor(C * 1.5)) return 'S';
    return 'D';
  }

  static _getConjuringRating(actor) {
    // Look for a skill item named "Conjuring" (case-insensitive)
    const skillItem = actor.items?.find(
      i => i.type === 'skill' && i.name.toLowerCase() === 'conjuring'
    );
    if (skillItem) return skillItem.system?.rating ?? 0;
    // Fallback: legacy flat field
    return actor.system?.skills?.conjuring?.value ?? actor.system?.conjuring ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Spend one service. Auto-dismisses at 0.
  // ---------------------------------------------------------------------------
  static async spendService(spiritActor) {
    const current = spiritActor.flags?.sr3e?.services ?? 0;
    if (current <= 0) {
      ui.notifications.warn(`${spiritActor.name} has no services remaining.`);
      await SR3ESpiritSummoning.dismissSpirit(spiritActor);
      return;
    }
    const remaining = current - 1;
    await spiritActor.setFlag('The2ndChumming3e', 'services', remaining);
    ChatMessage.create({
      content: `<b>${spiritActor.name}</b> performs a service. <b>${remaining}</b> service(s) remaining.`,
    });
    if (remaining === 0) {
      ui.notifications.info(`${spiritActor.name} has fulfilled all services and departs.`);
      await SR3ESpiritSummoning.dismissSpirit(spiritActor);
    }
  }

  // ---------------------------------------------------------------------------
  // Dismiss / banish: remove from combat then delete.
  // ---------------------------------------------------------------------------
  static async dismissSpirit(spiritActor) {
    if (game.combat) {
      const combatant = game.combat.combatants.find(c => c.actorId === spiritActor.id);
      if (combatant) await game.combat.deleteEmbeddedDocuments('Combatant', [combatant.id]);
    }
    await spiritActor.delete();
    ui.notifications.info(`${spiritActor.name} has departed.`);
  }
}
