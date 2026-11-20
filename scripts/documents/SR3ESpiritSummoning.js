import { actorFrom, actorRef } from '../data/actor-ref.mjs';
import { spiritIcon } from '../data/item-icons.mjs';
import { NatureSpirits } from '../data/nature-spirits.mjs';
import { InsectSpirits } from '../data/insect-spirits.mjs';
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

// Elementals and nature spirits are built from data/nature-spirits.mjs — SR3 pp.266-268.
export const SPIRIT_TYPES = {};

for (const [key, t] of Object.entries(NatureSpirits.ELEMENTALS)) {
  SPIRIT_TYPES[key] = {
    label:    t.label,
    category: 'elemental',
    spiritClass: t.line,
    attack:   NatureSpirits.ELEMENT_LINES[t.line].attack,
    weakness: t.weakness,
    stats:    (F) => NatureSpirits.stats(t.line, F),
    powers:   [...t.powers],
  };
}

for (const [key, t] of Object.entries(NatureSpirits.TYPES)) {
  SPIRIT_TYPES[key] = {
    label:    t.label,
    category: 'nature',
    domain:   t.domain,
    spiritClass: t.cls,
    attack:   NatureSpirits.CLASSES[t.cls].attack,
    stats:    (F) => NatureSpirits.stats(t.cls, F),
    powers:   [...t.powers],
  };
}

// ---- Insect spirits, true-form (MitS p.127-137; rules in data/insect-spirits.mjs) ----------------------------
for (const e of InsectSpirits.list()) {
  SPIRIT_TYPES[e.key] = {
    label:    e.label,
    category: 'insect',
    totem:    e.totem,
    colony:   InsectSpirits.colony(e.totem),
    insectType: e.type, insectCaste: e.caste,
    stats:    (F) => InsectSpirits.stats(e.type, e.caste, F),
    powers:   [...InsectSpirits.powers(e.type, e.caste), ...InsectSpirits.weaknesses().map(w => `Weakness: ${w}`)],
  };
}

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
    game.sr3e.SR3EActionLedger?.begin(conjurer);   // snapshot for the GM's undo (TODO 48)
    // "Force is greater than the summoner's Magic Attribute" — the EFFECTIVE rating (F5; it read `base`).
    const magicBase      = conjurer.system?.attributes?.magic?.value ?? conjurer.system?.attributes?.magic?.base ?? 0;
    // Drain's level (Force vs Charisma) and its resistance read the same, EFFECTIVE Charisma — the
    // Drain card resists with `drainResistRating`, which reads `value` first.
    const charisma       = conjurer.system?.attributes?.charisma?.value ?? conjurer.system?.attributes?.charisma?.base ?? 1;
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

    // Insect spirits (MitS p.127): offered to the GM and to insect-totem shamans; anyone else is warned, never refused.
    const totem     = conjurer.system?.magicTotem ?? '';
    const verdict   = InsectSpirits.summonVerdict({ isGM: !!game.user?.isGM, totem });
    const insectOptions = (verdict.offered || SPIRIT_TYPES[defaultSpiritType]?.category === 'insect')
      ? Object.entries(SPIRIT_TYPES).filter(([, v]) => v.category === 'insect')
        .map(([k, v]) => `<option value="${k}" ${k === defaultSpiritType ? 'selected' : ''}>${v.label}</option>`).join('')
      : '';
    // Host bodies for a flesh-form: any live actor, world-wide (a roster, like pilots) — usually a metahuman, "in a pinch" an animal.
    const hostOptions = game.actors
      .filter(a => game.sr3e.isLiveActor(a) && a.id !== conjurer.id)
      .map(a => `<option value="${actorRef(a)}">${a.name}</option>`).join('');
    const insectGroup = insectOptions ? `<optgroup label="── Insect Spirits (true-form) ──">${insectOptions}</optgroup>` : '';

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
            ${insectGroup}
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
        <div id="sr3e-insect-form" style="display:none; flex-direction:column; gap:6px;">
          <div style="display:grid; grid-template-columns:130px 1fr; align-items:center; gap:6px;">
            <label style="font-weight:bold;">Insect form</label>
            <select id="sr3e-insect-form-sel">
              <option value="true">True-form (no host needed)</option>
              <option value="flesh">Flesh-form (merges with a host)</option>
            </select>
          </div>
          <div id="sr3e-insect-hostrow" style="display:none; grid-template-columns:130px 1fr; align-items:center; gap:6px;">
            <label style="font-weight:bold;">Host body</label>
            <select id="sr3e-insect-host-sel"><option value="">— none chosen (host stats 3) —</option>${hostOptions}</select>
          </div>
          <label id="sr3e-insect-queenrow" style="display:none; font-size:0.85em;">
            <input type="checkbox" id="sr3e-insect-queen" /> A Queen/Mother helped summon (+2 to the host's target number)
          </label>
        </div>
        <div id="sr3e-insect-host" style="font-size:0.85em; display:none;">
          🐛 True-form insect spirits need no host body (MitS p.128). A <b>flesh-form</b> spirit does: it is incubated in a host for Force weeks, and the host's Willpower is tested against the spirit's Force (MitS p.129). <b>The host does not survive it</b> (GM's call). A flesh-form cannot be banished.
        </div>
        <div id="sr3e-insect-warn" style="color:var(--sr-amber,#c90); font-size:0.85em; display:none;">
          ⚠ ${conjurer.name}'s totem (${totem || 'none'}) is not an insect — only insect shamans summon insect spirits (MitS p.127). GM's call.
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
        const typeSel  = el.querySelector('#sr3e-spirit-type');
        const insWarn  = el.querySelector('#sr3e-insect-warn');
        const insHost  = el.querySelector('#sr3e-insect-host');
        const formBox  = el.querySelector('#sr3e-insect-form');
        const formSel  = el.querySelector('#sr3e-insect-form-sel');
        const hostRow  = el.querySelector('#sr3e-insect-hostrow');
        const queenRow = el.querySelector('#sr3e-insect-queenrow');
        const refresh  = () => {
          const def     = SPIRIT_TYPES[typeSel.value];
          const isIns   = def?.category === 'insect';
          const canFlesh = isIns && InsectSpirits.fleshAvailable(def.insectType, def.insectCaste);
          if (!canFlesh) formSel.value = 'true';
          const flesh   = canFlesh && formSel.value === 'flesh';
          if (formBox)  formBox.style.display  = canFlesh ? 'flex' : 'none';
          if (hostRow)  hostRow.style.display  = flesh ? 'grid' : 'none';
          if (queenRow) queenRow.style.display = flesh ? '' : 'none';
          if (insHost) insHost.style.display = isIns ? '' : 'none';
          if (insWarn) insWarn.style.display = SPIRIT_TYPES[typeSel.value]?.category === 'insect' && !InsectSpirits.isInsectTotem(totem) ? '' : 'none';
          const f      = parseInt(forceIn.value) || 0;
          const held   = Math.min(maxHold, Math.max(0, parseInt(holdIn?.value) || 0));
          const lvl    = SR3ESpiritSummoning._conjuringDrainLevel(f, charisma);
          const isPhys = f > magicBase;
          drainLbl.textContent = `Drain: ${drainName[lvl]} ${isPhys ? 'Physical' : 'Stun'} (TN ${Math.max(2, f)})`;
          if (physWarn) physWarn.style.display = isPhys ? '' : 'none';
          if (poolSpan) poolSpan.textContent = held > 0 ? `(− ${held} held = ${Math.max(1, conjuringSkill - held)})` : '';
        };
        forceIn.addEventListener('input', refresh);
        typeSel.addEventListener('change', refresh);
        formSel?.addEventListener('change', refresh);
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
            const fdef = SPIRIT_TYPES[result.typeKey];
            const fleshOk = fdef?.category === 'insect' && InsectSpirits.fleshAvailable(fdef.insectType, fdef.insectCaste);
            result.insectForm  = fleshOk && el.querySelector('#sr3e-insect-form-sel')?.value === 'flesh' ? 'flesh' : 'true';
            result.hostRef     = result.insectForm === 'flesh' ? (el.querySelector('#sr3e-insect-host-sel')?.value || null) : null;
            result.queenHelped = result.insectForm === 'flesh' && !!el.querySelector('#sr3e-insect-queen')?.checked;
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

    // Summon Nature Spirit — Complex, SR3 p.108 (TODO 48). Elementals take hours of ritual, not a phase.
    if (spiritDef.category === 'nature') game.sr3e.SR3EActionLedger?.charge(conjurer, 'summonSpirit', spiritDef.label);

    await conjurer.rollPool(
      pool,
      force,
      `🌀 ${conjurer.name} — Conjure ${spiritDef.label} [F${force}]`,
      {
        isConjuringRoll:  true,
        conjuringContext: {
          conjurerActorId: actorRef(conjurer),
          spiritTypeKey:   typeKey,
          spiritLabel:     result.insectForm === 'flesh' ? `${spiritDef.label} (flesh-form)` : spiritDef.label,
          insectForm:      result.insectForm ?? 'true',
          hostRef:         result.hostRef ?? null,
          queenHelped:     !!result.queenHelped,
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
    const conjurer  = actorFrom(conjurerActorId);
    const spiritDef = SPIRIT_TYPES[spiritTypeKey];
    if (!spiritDef) { ui.notifications.error(`Unknown spirit type: ${spiritTypeKey}`); return; }

    // Flesh-form insect (MitS p.128-129): the host's Willpower is tested against the spirit's Force, and the Transformation
    // Table says what comes out. The host is never deleted or damaged here — the card says what the book says; the GM decides.
    let flesh = null;
    if (payload.insectForm === 'flesh') flesh = await SR3ESpiritSummoning._fleshTransformation(payload, spiritDef);

    const spiritActor = await SR3ESpiritSummoning._createSpiritActor(conjurer, spiritDef, force, services, flesh);

    // Only join a fight that's already running — never start/activate combat from a summon.
    if (game.combat?.started) {
      await SR3ESpiritSummoning._addSpiritToCombat(spiritActor, force, spiritDef, flesh?.asFlesh ? flesh.stats.initiative : null);
    }

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: conjurer }),
      content: `
        ✅ <b>${conjurer?.name ?? 'Conjurer'}</b> successfully summoned a <b>${flesh?.asFlesh ? `${spiritDef.label} (flesh-form)` : spiritDef.label}</b> (Force ${force}). It is bound for <b>${services} service${services !== 1 ? 's' : ''}</b>.<br>
        <i>Powers: ${(flesh?.asFlesh ? flesh.powers : spiritDef.powers).join(', ')}.</i>
        ${flesh ? `<hr>${flesh.html}` : ''}
      `,
    });
  }

  // ---------------------------------------------------------------------------
  // Create a temporary world Actor for the spirit.
  // ---------------------------------------------------------------------------
  /**
   * Read a spirit flag, tolerating spirits summoned before the namespace was fixed.
   *
   * Spirits used to be created with `flags.sr3e.*`, which is not a valid flag scope —
   * only `core`, `world`, the system id and active module ids are (client-backend.mjs
   * `getFlagScopes`). A raw create payload is not validated, so the data was written
   * happily and then every `getFlag('sr3e', …)` **threw**.
   *
   * The legacy branch exists so a spirit already standing in someone's world keeps
   * working after the fix rather than becoming unbindable. It reads the raw path, never
   * `getFlag`, because `getFlag` would throw on the very scope it is trying to rescue.
   * Safe to delete once no pre-fix spirits can plausibly remain.
   */
  static _spiritFlag(actor, key) {
    return actor?.getFlag('The2ndChumming3e', key) ?? actor?.flags?.sr3e?.[key];
  }

  /**
   * Flesh-form insect: roll the host's Willpower against the spirit's Force (MitS p.129), read the Transformation Table
   * (p.128) and build the flesh-form's numbers from the host (p.128). Returns what the spirit actor and the card need.
   * A net 0 or fewer destroys the host and a TRUE-form emerges instead (`asFlesh: false`). Nothing is applied to the host.
   */
  static async _fleshTransformation(payload, spiritDef) {
    const { force } = payload;
    const host = payload.hostRef ? actorFrom(payload.hostRef) : null;
    const att  = k => host?.system?.attributes?.[k]?.value ?? host?.system?.attributes?.[k]?.base ?? 3;   // no host chosen → 3
    const hostStats = { body: att('body'), quickness: att('quickness'), strength: att('strength') };
    const wp   = att('willpower');
    const test = InsectSpirits.transformationTest({ hostWillpower: wp, force, queenHelped: !!payload.queenHelped });
    const rng  = () => (CONFIG.Dice?.randomUniform ?? Math.random)();
    const hostHits   = InsectSpirits.rollSuccesses(test.hostDice, test.hostTN, rng);
    const spiritHits = InsectSpirits.rollSuccesses(test.spiritDice, test.spiritTN, rng);
    const net     = hostHits - spiritHits;
    const outcome = InsectSpirits.transformation(net);
    const stats   = outcome.flesh ? InsectSpirits.fleshStats(spiritDef.insectType, spiritDef.insectCaste, force, hostStats) : null;
    const karmaPool = outcome.flesh
      ? InsectSpirits.karmaPool('flesh', { hostKarmaPool: host?.system?.karmaPool ?? 0, merge: outcome.merge })
      : InsectSpirits.karmaPool('true');
    const weeks = InsectSpirits.incubationWeeks(force);
    const hostName = host?.name ?? 'the host (none chosen — host stats taken as 3, edit the sheet)';
    const html = `
      <b>🐛 Flesh-form transformation</b> — ${hostName}<br>
      Host Willpower ${test.hostDice} dice vs TN ${test.hostTN}: <b>${hostHits}</b> · Spirit Force ${test.spiritDice} dice vs TN ${test.spiritTN}: <b>${spiritHits}</b> → host net successes <b>${net}</b>.<br>
      <i>${outcome.text}</i><br>
      Incubation: <b>${weeks} week${weeks !== 1 ? 's' : ''}</b>. Karma Pool ${karmaPool}.
      ${outcome.flesh ? 'A flesh-form cannot be banished.' : ''}
      <br><b>${hostName.split(' (')[0]} does not survive</b> once incubation begins, even if the spirit is later banished or idled (MitS p.129) — the GM decides; nothing was changed on the host.`;
    return {
      asFlesh: outcome.flesh, outcome, net, stats, karmaPool, html, hostName: host?.name ?? null,
      powers: [...InsectSpirits.fleshPowers(spiritDef.insectType, spiritDef.insectCaste), ...InsectSpirits.fleshWeaknesses().map(w => `Weakness: ${w}`)],
    };
  }

  static async _createSpiritActor(conjurer, spiritDef, force, services, flesh = null) {
    const isFlesh = !!flesh?.asFlesh;
    const stats = isFlesh ? flesh.stats : spiritDef.stats(force);
    const powers = isFlesh ? flesh.powers : spiritDef.powers;

    const spirit = await Actor.create({
      name:   `${spiritDef.label}${isFlesh ? ' (flesh)' : ''} F${force} [${conjurer?.name ?? '?'}]`,
      type:   'npc',
      img:    spiritIcon(spiritDef.category),
      prototypeToken: { texture: { src: spiritIcon(spiritDef.category) } },
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
        ...(flesh ? { karmaPool: flesh.karmaPool } : {}),
        // A flesh-form is a dual being (MitS p.128).
        ...(isFlesh ? { astralMode: 'dual' } : {}),
      },
      flags: {
        The2ndChumming3e: {
          isSpirit:       true,
          spiritType:     spiritDef.category === 'elemental' ? 'elemental' : spiritDef.category === 'insect' ? 'insect' : 'nature',
          ...(spiritDef.category === 'insect' ? { insectForm: isFlesh ? 'flesh' : 'true', insectTotem: spiritDef.totem } : {}),
          ...(isFlesh ? { fleshHost: flesh.hostName, transformation: flesh.outcome.key, incubationWeeks: InsectSpirits.incubationWeeks(force), banishable: false, dualBeing: true, naturalArmor: 0 } : {}),
          spiritTypeKey:  Object.keys(SPIRIT_TYPES).find(k => SPIRIT_TYPES[k] === spiritDef),
          spiritLabel:    spiritDef.label,
          spiritCategory: spiritDef.category,
          force,
          services,
          conjurerId:     conjurer?.id ?? null,
          powers,
          moveMultiplier: stats.moveMultiplier ?? null,
          attack:         spiritDef.attack ?? null,
          weakness:       spiritDef.weakness ?? null,
        },
      },
    });

    ui.notifications.info(`${spirit.name} created with ${services} service(s).`);
    return spirit;
  }

  // ---------------------------------------------------------------------------
  // Add the spirit to active combat.
  // ---------------------------------------------------------------------------
  static async _addSpiritToCombat(spiritActor, force, spiritDef, initOverride = null) {
    const combat = game.combat;
    if (!combat?.started) return;   // don't create/activate combat from a summon

    await combat.createEmbeddedDocuments('Combatant', [{ actorId: spiritActor.id, hidden: false }]);

    const initRoll  = await new Roll('1d6').evaluate();
    const baseInit  = initOverride ?? spiritDef.stats(force).initiative;
    const initScore = baseInit + initRoll.total;

    const combatant = combat.combatants.find(c => c.actorId === spiritActor.id);
    if (!combatant) return;

    await combatant.update({
      initiative: initScore,
      flags: {
        The2ndChumming3e: {
          baseInitiative:    initScore,
          currentInitiative: initScore,
          passesRemaining:   Math.ceil(initScore / 10),
          passNumber:        1,
          isSpirit:          true,
        },
      },
    });

    const phys = spiritDef.stats(force).initiativePhysical;
    ui.notifications.info(`${spiritActor.name} enters combat (astral Initiative: ${initScore}${phys != null ? `; physical F-based base ${phys} + 1D6` : ''}).`);
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
    // ⚠ Read and write must agree on a namespace. This read used the raw path
    // `flags.sr3e.services` while the write below used setFlag with the SYSTEM id, so a
    // spirit's services were decremented into a location nothing ever read: spend a
    // service, and the next call still saw the original count. The spirit never ran out
    // and never departed. Nothing errored, because a raw path read of a missing key is
    // simply undefined.
    const current = SR3ESpiritSummoning._spiritFlag(spiritActor, 'services') ?? 0;
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
