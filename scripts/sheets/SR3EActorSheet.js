import { SR3E, getSpecializationsForSkill, skillTypeForCategory } from '../config.js';

/**
 * SR3EActorSheet — V2 Application framework (Foundry v13+).
 * Renders HTML directly from JS; no .hbs template files required.
 */
export class SR3EActorSheet extends foundry.applications.sheets.ActorSheetV2 {

  _activeTab = 'bio';

  /* ------------------------------------------------------------------ */
  /*  Static configuration                                                */
  /* ------------------------------------------------------------------ */

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'actor'],
    tag: 'form',
    position: { width: 780, height: 740 },
    resizable: true,
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      switchTab:      SR3EActorSheet._onSwitchTab,
      rollAttr:       SR3EActorSheet._onRollAttr,
      rollSkill:      SR3EActorSheet._onRollSkill,
      rollWeapon:     SR3EActorSheet._onRollWeapon,
      rollMelee:      SR3EActorSheet._onRollMelee,
      rollUnarmed:    SR3EActorSheet._onRollUnarmed,
      rollInitiative: SR3EActorSheet._onRollInitiative,
      itemCreate:     SR3EActorSheet._onItemCreate,
      browseSkills:   SR3EActorSheet._onBrowseSkills,
      itemEdit:       SR3EActorSheet._onItemEdit,
      itemDelete:     SR3EActorSheet._onItemDelete,
      woundBox:       SR3EActorSheet._onWoundBox,
      equipArmor:     SR3EActorSheet._onEquipArmor,
      equipMelee:     SR3EActorSheet._onEquipMelee,
        applyDamage:    SR3EActorSheet._onApplyDamage,
        healDamage:     SR3EActorSheet._onHealDamage,
        rollSpell:      SR3EActorSheet._onRollSpell,
        dispelSpell:    SR3EActorSheet._onDispelSpell,
        banishSpirit:   SR3EActorSheet._onBanishSpirit,
        summonSpirit:   SR3EActorSheet._onSummonSpirit,
        resetAllPools:     SR3EActorSheet._onResetAllPools,
        rollAstralCombat:  SR3EActorSheet._onRollAstralCombat,
        toggleFocus:       SR3EActorSheet._onToggleFocus,
        toggleFocusActive: SR3EActorSheet._onToggleFocusActive,
        rollAssensing:     SR3EActorSheet._onRollAssensing,
        castWard:          SR3EActorSheet._onCastWard,
        rollContested:     SR3EActorSheet._onRollContested,
        rollResistDamage:  SR3EActorSheet._onRollResistDamage,
        clearVCR:          SR3EActorSheet._onClearVCR,
        equipCyberdeck:    SR3EActorSheet._onEquipCyberdeck,
        ivisTest:          SR3EActorSheet._onIvisTest,
        ivisSpend:         SR3EActorSheet._onIvisSpend,
        ivisClear:         SR3EActorSheet._onIvisClear,
        setMatrixMode:     SR3EActorSheet._onSetMatrixMode,
        setAstralMode:     SR3EActorSheet._onSetAstralMode,
        ejectSlot:         SR3EActorSheet._onEjectSlot,
        toggleBurnSlot:    SR3EActorSheet._onToggleBurnSlot,
        rollSlotProgram:   SR3EActorSheet._onRollSlotProgram,
        createLinkVehicle: SR3EActorSheet._onCreateLinkVehicle,
        toggleVehicleMode: SR3EActorSheet._onToggleVehicleMode,
        openVehicle:       SR3EActorSheet._onOpenVehicle,
        openHost:          SR3EActorSheet._onOpenHost,
        toggleStored:      SR3EActorSheet._onToggleStored,
        toggleTemplate:    SR3EActorSheet._onToggleTemplate,
        deployTemplate:    SR3EActorSheet._onDeployTemplate,
        markAsLive:        SR3EActorSheet._onMarkAsLive,
        setOrthoAlertLevel:        SR3EActorSheet._onSetOrthoAlertLevel,
        setOrthoHost:              SR3EActorSheet._onSetOrthoHost,
        clearOrthoHost:            SR3EActorSheet._onClearOrthoHost,
        rollOrthodoxSystemTest:    SR3EActorSheet._onRollOrthodoxSystemTest,
        rollOrthodoxCybercombat:   SR3EActorSheet._onRollOrthodoxCybercombat,
        toggleOrthoMatrixCM:       SR3EActorSheet._onToggleOrthoMatrixCM,
        addOrthodoxCyberdeck:      SR3EActorSheet._onAddOrthodoxCyberdeck,
        addOrthodoxProgram:        SR3EActorSheet._onAddOrthodoxProgram,

        toggleFullDefense:  SR3EActorSheet._onToggleFullDefense,
        resetRecoil:        SR3EActorSheet._onResetRecoil,
        reloadWeapon:       SR3EActorSheet._onReloadWeapon,
        rollCybercombat:    SR3EActorSheet._onRollCybercombat,
        rollHackingAction:  SR3EActorSheet._onRollHackingAction,
        rollDumpshock:      SR3EActorSheet._onRollDumpshock,
        rollProgram:        SR3EActorSheet._onRollProgram,
        refreshHackingPool:      SR3EActorSheet._onRefreshHackingPool,
        awardKarma:              SR3EActorSheet._onAwardKarma,
        spendKarmaCalculator:    SR3EActorSheet._onSpendKarmaCalculator,
        useNodePrompt:           SR3EActorSheet._onUseNodePrompt,
        removeMatrixMark:        SR3EActorSheet._onRemoveMatrixMark,
        addMatrixMark:           SR3EActorSheet._onAddMatrixMark,
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Title                                                               */
  /* ------------------------------------------------------------------ */

  get title() { return `${this.actor.name} — ${this.actor.type}`; }

  /* ------------------------------------------------------------------ */
  /*  Rendering — V2 uses _renderHTML instead of _renderInner            */
  /* ------------------------------------------------------------------ */

  async _renderHTML(_context, _options) {
    const actor = this.actor;
    const sys   = actor.system;
    const html  = this._buildSheet(actor, sys);
    const div   = document.createElement('div');
    // Must be a flex column filling the window-content form so the height
    // chain reaches sheet-body and overflow-y:auto triggers correctly.
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;';
    div.innerHTML = html;
    return div;
  }

  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
    this._activateListeners(content);
  }

  // Called by Foundry after every render (initial open AND re-renders).
  // This is the correct place for Foundry hook registration — _replaceHTML
  // is skipped on the very first render (_insertElement is used instead).
  _onRender(context, options) {
    super._onRender?.(context, options);
    this._registerPersistentHooks();
    this._enrichBioFields();
    this._syncDuplicateInputs();
    this._wireOrthodoxProgramRatings();
  }

  _wireOrthodoxProgramRatings() {
    const root = this.element;
    if (!root) return;
    root.querySelectorAll('.odm-prog-rating').forEach(inp => {
      inp.addEventListener('change', async () => {
        const id  = inp.dataset.itemId;
        const val = parseInt(inp.value) || 0;
        if (!id) return;
        await this.actor.updateEmbeddedDocuments('Item', [{ _id: id, 'system.rating': val }]);
      });
    });
  }

  /**
   * Recoil Compensation is shown on two tabs (Attributes & Cyber). Only ONE copy carries the
   * `name="system.recoilCompensation"` — duplicate names make Foundry's FormDataExtended return
   * an array (`["0","0"]`), which fails NumberField validation ("must be a number"). The other
   * copy is a nameless `.recoil-comp` mirror. We sync all `.recoil-comp` inputs on `input`
   * (fires before the `change` that submits), so the single named input is fresh when the form
   * serialises regardless of which copy was edited.
   */
  _syncDuplicateInputs() {
    const root = this.element;
    if (!root) return;
    const inputs = root.querySelectorAll('.recoil-comp');
    if (inputs.length < 2) return;
    inputs.forEach(inp => {
      inp.addEventListener('input', () => {
        inputs.forEach(other => { if (other !== inp) other.value = inp.value; });
      });
    });
  }

  /** Fill the read-only enriched displays for bio/notes and wire the Edit toggles. */
  async _enrichBioFields() {
    const root = this.element;
    if (!root) return;
    const TE = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
    for (const wrap of root.querySelectorAll('.bio-rich')) {
      const ta   = wrap.querySelector('textarea');
      const disp = wrap.querySelector('.bio-display');
      const btn  = wrap.querySelector('.bio-edit-toggle');
      if (!ta || !disp) continue;
      const raw = ta.value ?? '';
      disp.innerHTML = raw.trim()
        ? await TE.enrichHTML(raw, { secrets: this.actor.isOwner, rollData: this.actor.getRollData?.() ?? {}, relativeTo: this.actor })
        : `<span style="color:var(--sr-dim)">${wrap.dataset.empty ?? ''}</span>`;
      btn?.addEventListener('click', () => {
        disp.style.display = 'none';
        ta.style.display   = '';
        btn.style.display  = 'none';
        ta.focus();
      });
    }
  }

  _registerPersistentHooks() {
    // Host hook — refresh when the linked host actor updates
    if (this._hostUpdateHookId) Hooks.off('updateActor', this._hostUpdateHookId);
    this._hostUpdateHookId = null;
    const trackedHostId = this.actor.system?.activeHostId ?? '';
    if (trackedHostId) {
      this._hostUpdateHookId = Hooks.on('updateActor', (updated) => {
        if (updated.id === trackedHostId) this.render();
      });
    }

    // Vehicle hooks — refresh vehicles tab when any vehicle is updated/deleted
    if (this._vehicleUpdateHookId) Hooks.off('updateActor', this._vehicleUpdateHookId);
    if (this._vehicleDeleteHookId) Hooks.off('deleteActor', this._vehicleDeleteHookId);
    this._vehicleUpdateHookId = Hooks.on('updateActor', (updated) => {
      if (updated.type === 'vehicle') this.render();
    });
    this._vehicleDeleteHookId = Hooks.on('deleteActor', (deleted) => {
      if (deleted.type === 'vehicle') this.render();
    });
  }

  _onClose(options) {
    super._onClose?.(options);
    if (this._vehicleUpdateHookId) { Hooks.off('updateActor', this._vehicleUpdateHookId); this._vehicleUpdateHookId = null; }
    if (this._vehicleDeleteHookId) { Hooks.off('deleteActor', this._vehicleDeleteHookId); this._vehicleDeleteHookId = null; }
    if (this._hostUpdateHookId)    { Hooks.off('updateActor', this._hostUpdateHookId);    this._hostUpdateHookId    = null; }
  }

  /* ------------------------------------------------------------------ */
  /*  Listener attachment (DOM only — hooks are in _registerPersistentHooks) */
  /* ------------------------------------------------------------------ */

  _activateListeners(html) {
    html.querySelectorAll('[data-action="switchTab"]').forEach(el =>
      el.addEventListener('click', ev => {
        this._activeTab = ev.currentTarget.dataset.tab;
        this.render();
      })
    );

    if (!this.isEditable) return;

    html.querySelectorAll('input, select, textarea').forEach(el =>
      el.addEventListener('change', ev => this._onFieldChange(ev))
    );

    // Matrix tab: make program rows draggable
    html.querySelectorAll('[data-matrix-program-id]').forEach(el => {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData('text/plain', JSON.stringify({
          type: 'sr3e-program',
          itemId: el.dataset.matrixProgramId,
        }));
        ev.dataTransfer.effectAllowed = 'copy';
      });
    });

    // Weapons tab: make weapon rows draggable to the hotbar (creates a fire macro).
    html.querySelectorAll('.weapon-section .item-row[data-item-id]').forEach(row => {
      const item = this.actor.items.get(row.dataset.itemId);
      if (!item || !['firearm', 'melee', 'projectile', 'thrown'].includes(item.type)) return;
      row.setAttribute('draggable', 'true');
      row.addEventListener('dragstart', ev => {
        ev.stopPropagation();
        ev.dataTransfer.setData('text/plain', JSON.stringify({ type: 'Item', uuid: item.uuid }));
        ev.dataTransfer.effectAllowed = 'copy';
      });
    });

    // Matrix tab: slot rows as drop targets
    html.querySelectorAll('[data-slot-row]').forEach(slotRow => {
      slotRow.addEventListener('dragover', ev => {
        if (slotRow.dataset.slotBurned === 'true') return;
        ev.preventDefault();
        slotRow.style.outline = '2px dashed var(--sr-accent)';
      });
      slotRow.addEventListener('dragleave', () => {
        slotRow.style.outline = '';
      });
      slotRow.addEventListener('drop', async ev => {
        ev.preventDefault();
        slotRow.style.outline = '';
        if (slotRow.dataset.slotBurned === 'true') return;
        let data;
        try { data = JSON.parse(ev.dataTransfer.getData('text/plain')); } catch { return; }
        if (data.type !== 'sr3e-program') return;
        const program = this.actor.items.get(data.itemId);
        if (!program) return;
        const deckId  = slotRow.dataset.deckId;
        const slotNum = parseInt(slotRow.dataset.slot);
        const deck    = this.actor.items.get(deckId);
        if (!deck) return;
        const slots = foundry.utils.deepClone(deck.system.utilitySlotsArray ?? []);
        const existing = slots.find(s => s.slot === slotNum);
        const utility = {
          name:          program.name,
          type:          program.system.type          ?? '',
          category:      program.system.category      ?? '',
          rating:        program.system.rating        ?? 0,
          currentRating: program.system.rating        ?? 0,
          multiplier:    program.system.multiplier    ?? 0,
          sizeMp:        program.system.sizeMp        ?? 0,
          degradable:    program.system.degradable    ?? false,
        };
        if (existing) {
          existing.utility = utility;
        } else {
          slots.push({ slot: slotNum, burned: false, utility });
          slots.sort((a, b) => a.slot - b.slot);
        }
        const memUsed = slots.reduce((sum, s) => sum + (s.utility?.sizeMp ?? 0), 0);
        await deck.update({
          'system.utilitySlotsArray':        slots,
          'system.attributes.memory.used':   memUsed,
        });
      });
    });

    // Magic tab: live tradition/type filtering
    const traditionSel = html.querySelector('#sr-magic-tradition');
    const typeSel      = html.querySelector('#sr-magic-type');
    const totemWrap    = html.querySelector('.sr-magic-totem-wrap');
    const elementWrap  = html.querySelector('.sr-magic-element-wrap');

    if (traditionSel) {
      const updateMagicUI = () => {
        const trad = traditionSel.value;
        const type = typeSel?.value ?? '';

        // Filter type options to those valid for the selected tradition
        if (typeSel) {
          typeSel.querySelectorAll('option').forEach(opt => {
            if (!opt.value) return;
            const entry = SR3E.magicTypes.find(t => t.name === opt.value);
            opt.style.display = (!trad || entry?.traditions.includes(trad)) ? '' : 'none';
          });
          // If the current selection is now hidden, clear it
          if (typeSel.value) {
            const entry = SR3E.magicTypes.find(t => t.name === typeSel.value);
            if (trad && !entry?.traditions.includes(trad)) typeSel.value = '';
          }
        }

        if (totemWrap)   totemWrap.style.display   = trad === 'Shamanic' ? 'flex' : 'none';
        if (elementWrap) elementWrap.style.display  = typeSel?.value === 'Elementalist' ? 'flex' : 'none';
      };

      traditionSel.addEventListener('change', updateMagicUI);
      if (typeSel) typeSel.addEventListener('change', updateMagicUI);
      updateMagicUI();
    }

    // html.querySelectorAll('[data-action="rollAttr"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onRollAttr.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="rollSkill"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onRollSkill.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="rollWeapon"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onRollWeapon.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="rollInitiative"]').forEach(el =>
    //   el.addEventListener('click', () => SR3EActorSheet._onRollInitiative.call(this))
    // );
    // html.querySelectorAll('[data-action="itemCreate"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onItemCreate.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="itemEdit"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onItemEdit.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="itemDelete"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onItemDelete.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="woundBox"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onWoundBox.call(this, ev, el))
    // );

    // Weapons tab: drag-and-drop section reordering
    // dragstart is on the h3 header (ev.target is the h3, not the section div)
    // dragover/drop are on the section wrapper
    let _wepDragSrc = null;
    html.querySelectorAll('h3.wep-section-hdr[draggable]').forEach(hdr => {
      hdr.addEventListener('dragstart', ev => {
        const section = hdr.closest('.weapon-section');
        if (!section) return;
        _wepDragSrc = section;
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', section.dataset.section);
        setTimeout(() => { if (_wepDragSrc) _wepDragSrc.style.opacity = '0.45'; }, 0);
      });
      hdr.addEventListener('dragend', () => {
        if (_wepDragSrc) _wepDragSrc.style.opacity = '';
        html.querySelectorAll('.weapon-section').forEach(s => s.classList.remove('wep-drag-over'));
        _wepDragSrc = null;
      });
    });
    html.querySelectorAll('.weapon-section').forEach(section => {
      section.addEventListener('dragover', ev => {
        if (!_wepDragSrc || section === _wepDragSrc) return;
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        html.querySelectorAll('.weapon-section').forEach(s => s.classList.remove('wep-drag-over'));
        section.classList.add('wep-drag-over');
      });
      section.addEventListener('dragleave', ev => {
        if (!ev.relatedTarget || !section.contains(ev.relatedTarget)) {
          section.classList.remove('wep-drag-over');
        }
      });
      section.addEventListener('drop', ev => {
        ev.preventDefault();
        if (!_wepDragSrc || _wepDragSrc === section) return;
        const allSections = [...html.querySelectorAll('.weapon-section')];
        const srcIdx  = allSections.indexOf(_wepDragSrc);
        const destIdx = allSections.indexOf(section);
        const newOrder = allSections.map(s => s.dataset.section);
        newOrder.splice(srcIdx, 1);
        newOrder.splice(destIdx, 0, _wepDragSrc.dataset.section);
        try { localStorage.setItem(`sr3e-weapons-order-${this.actor.id}`, JSON.stringify(newOrder)); } catch { /* ignore */ }
        this.render();
      });
    });

    // Cyber tab: make cyberware rows draggable onto the VCR slot
    html.querySelectorAll('[data-cyber-item-id]').forEach(row => {
      row.setAttribute('draggable', 'true');
      row.addEventListener('dragstart', ev => {
        ev.stopPropagation();
        ev.dataTransfer.setData('text/plain', JSON.stringify({
          type: 'sr3e-cyberware',
          itemId: row.dataset.cyberItemId,
        }));
        ev.dataTransfer.effectAllowed = 'copy';
        setTimeout(() => { row.style.opacity = '0.45'; }, 0);
      });
      row.addEventListener('dragend', () => { row.style.opacity = ''; });
    });

    const vcrSlot = html.querySelector('[data-vcr-drop]');
    if (vcrSlot) {
      vcrSlot.addEventListener('dragover', ev => {
        ev.preventDefault();
        vcrSlot.classList.add('sr-vcr-slot--hover');
        ev.dataTransfer.dropEffect = 'copy';
      });
      vcrSlot.addEventListener('dragleave', () => {
        vcrSlot.classList.remove('sr-vcr-slot--hover');
      });
      vcrSlot.addEventListener('drop', async ev => {
        ev.preventDefault();
        vcrSlot.classList.remove('sr-vcr-slot--hover');
        let data;
        try { data = JSON.parse(ev.dataTransfer.getData('text/plain')); } catch { return; }
        if (data.type !== 'sr3e-cyberware') return;
        const item = this.actor.items.get(data.itemId);
        if (!item) return;
        await this.actor.update({ 'system.activeVCRItemId': item.id });
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  HTML builders                                                       */
  /* ------------------------------------------------------------------ */

  _buildSheet(actor, sys) {
    return `
      <div class="sr3e-inner">
        ${this._header(actor, sys)}
        ${this._tabs()}
        <div class="sheet-body">
          ${this._tabBio(sys)}
          ${this._tabAttributes(sys)}
          ${this._tabSkills(actor)}
          ${this._tabWeapons(actor)}
          ${this._tabArmor(actor, sys)}
          ${this._tabMagic(actor, sys)}
          ${this._tabGear(actor)}
          ${this._tabContacts(actor)}
          ${this._tabVehicles(actor)}
          ${this._tabCyber(actor, sys)}
          ${this._tabMatrix(actor, sys)}
          ${this._tabStored(actor)}
        </div>
      </div>`;
  }

  _carryWeight(actor) {
    const CARRY_TYPES = new Set(['firearm', 'melee', 'projectile', 'thrown', 'armor', 'gear', 'ammunition', 'cyberdeck']);
    return actor.items
      .filter(i => CARRY_TYPES.has(i.type) && !i.getFlag('The2ndChumming3e', 'stored'))
      .reduce((sum, i) => sum + (i.system.weight ?? 0), 0);
  }

  _header(actor, sys) {
    const w          = sys.wounds ?? {};
    const isTemplate    = actor.getFlag('The2ndChumming3e', 'isTemplate');
    const compSrc       = !!actor._stats?.compendiumSource;
    const appearsInUI   = game.sr3e.isLiveActor(actor);

    const str     = sys.attributes?.strength?.value ?? 0;
    const carried = this._carryWeight(actor);
    let warningLine = '';
    if (str > 0 && carried >= str * 10) {
      warningLine = `<span style="display:block;font-size:10px;color:var(--sr-red);line-height:1.2">Incurring Damage</span>`;
    } else if (str > 0 && carried >= str * 5) {
      warningLine = `<span style="display:block;font-size:10px;color:var(--sr-amber);line-height:1.2">Encumbered</span>`;
    }
    const weightDisplay = `<span style="color:var(--sr-muted)">${carried.toFixed(1)} kg</span>${warningLine}`;

    const body         = sys.attributes?.body?.value ?? 0;
    const overflowVal  = w.overflow?.value ?? 0;
    const isDead       = body > 0 && overflowVal >= body;
    const deadHtml     = isDead
      ? `<span style="color:var(--sr-red);font-weight:bold;font-size:12px;letter-spacing:1px;margin-left:6px;">☠ DEAD</span>`
      : '';

    return `
      <header class="sheet-header">
        <div class="portrait-wrap">
          <img class="profile-img" src="${actor.img}" title="${actor.name}" data-action="editImage" data-edit="img"/>
        </div>
        <div class="header-fields">
          <div class="header-top">
            <input class="actor-name" type="text" name="name" value="${actor.name}"/>
            <div class="sr3e-template-controls">
              ${isTemplate === true
                ? `<span class="sr3e-template-badge">TEMPLATE</span>
                   <button type="button" class="sr3e-template-btn" data-action="deployTemplate" title="Create a working copy with the template flag removed">Deploy Copy</button>
                   <button type="button" class="sr3e-template-btn sr3e-template-btn-remove" data-action="toggleTemplate" title="Remove template flag — actor will appear in combat targeting">Remove Flag</button>`
                : !appearsInUI
                  ? `<button type="button" class="sr3e-template-btn sr3e-live-btn" data-action="markAsLive" title="Mark as live actor — will appear in targeting and linking dialogs">Mark as Live</button>`
                  : `<button type="button" class="sr3e-template-btn sr3e-template-mark" data-action="toggleTemplate" title="Mark as template — hides from combat targeting dialogs">Mark as Template</button>`
              }
            </div>
          </div>
          <div class="wound-tracks">
            ${this._woundTrack('stun', 'Stun', w.stun?.value ?? 0, 10)}
            ${this._woundTrack('physical', 'Physical', w.physical?.value ?? 0, 10)}
            <div class="overflow-track">
              <span class="wound-track-label" style="color:var(--sr-amber);font-size:11px;">↑ Overflow</span>
              <div style="display:flex;align-items:center;gap:6px;">
                <input type="number" name="system.wounds.overflow.value" value="${overflowVal}" min="0"
                  style="width:38px;text-align:center;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);color:var(--sr-text);padding:2px 4px;font-size:13px;"
                  title="Dead if this exceeds Body (${body})"/>
                ${deadHtml}
              </div>
            </div>
            ${(() => {
              const wm    = sys.woundMod    ?? 0;
              const stim  = sys.stimBonus   ?? 0;
              const rawWm = sys.rawWoundMod ?? wm;
              if ((w.stun?.value ?? 0) >= 10 || (w.physical?.value ?? 0) >= 10)
                return `<span class="wound-mod-display" style="color:var(--sr-red)">unconscious</span>`;
              if (rawWm < 0 && stim > 0) {
                const effStr = wm < 0 ? `TN+${-wm}, Init${wm}` : 'fully negated';
                const col    = wm < 0 ? 'var(--sr-amber)' : 'var(--sr-green)';
                return `<span class="wound-mod-display" style="color:${col}">Raw TN+${-rawWm} − Stim ${stim} → ${effStr}</span>`;
              }
              if (wm < 0)
                return `<span class="wound-mod-display" style="color:var(--sr-red)">TN+${-wm}, Init${wm}</span>`;
              return '';
            })()}
            <span class="wound-mod-display">
              Stim: <input type="number" name="system.stimBonus" value="${sys.stimBonus ?? 0}" min="0"
                style="width:36px;text-align:center;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);color:var(--sr-text);padding:1px 2px;font-size:12px;"
                title="Wound modifier reduction from stim patches or drugs (does not heal wounds)"/>
            </span>
            ${(() => { const rb = sys.attributes?.reaction?.reactionBonus ?? 0; return rb !== 0 ? `<span class="wound-mod-display" style="color:var(--sr-accent)">Init Mod: <strong>${rb > 0 ? '+' : ''}${rb}</strong></span>` : ''; })()}
            <span class="wound-mod-display">
              Carry: <strong>${weightDisplay}</strong>
            </span>
          </div>
        </div>
      </header>`;
  }

  _inlineField(label, name, value, type = 'text', width = 80) {
    return `<label class="inline-field">${label}
      <input type="${type}" name="${name}" value="${value ?? ''}" style="width:${width}px"/>
    </label>`;
  }

 _woundTrack(track, label, value, max) {
  const boxes = Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    const cls = n <= value ? 'wound-box filled' : 'wound-box';
    return `<div class="${cls}" data-action="woundBox" data-track="${track}" data-box="${n}"></div>`;
  }).join('');
  
  return `<div class="wound-track-container">
    <div class="wound-track">
      <span class="wound-track-label">${label}</span>
      <div class="wound-boxes">${boxes}</div>
    </div>
    <div class="damage-buttons">
      <button type="button" class="damage-btn" data-action="applyDamage" data-track="${track}" data-amount="1" title="Light (L)">L</button>
      <button type="button" class="damage-btn" data-action="applyDamage" data-track="${track}" data-amount="3" title="Moderate (M)">M</button>
      <button type="button" class="damage-btn" data-action="applyDamage" data-track="${track}" data-amount="6" title="Serious (S)">S</button>
      <button type="button" class="damage-btn" data-action="applyDamage" data-track="${track}" data-amount="10" title="Deadly (D)">D</button>
      <button type="button" class="damage-btn damage-btn-heal" data-action="healDamage" data-track="${track}" title="Heal 1 box">−</button>
    </div>
  </div>`;
}

  _tabs() {
    const tabs = [
      ['bio',         'Bio'],
      ['attributes',  'Attributes'],
      ['skills',      'Skills'],
      ['weapons',     'Weapons'],
      ['armor',       'Armor'],
      ['magic',       'Magic'],
      ['gear',        'Gear'],
      ['vehicles',    'Vehicles'],
      ['cyber',       'Cyber'],
      ['matrix',      'Matrix'],
      ['stored',      'Storage'],
      ['contacts',    'Contacts'],
    ];
    return `<nav class="sheet-tabs">
      ${tabs.map(([id, label]) =>
        `<a class="tab-btn ${this._activeTab === id ? 'active' : ''}"
            data-action="switchTab" data-tab="${id}">${label}</a>`
      ).join('')}
    </nav>`;
  }

  _tabAttributes(sys) {
  const attr    = sys.attributes ?? {};
  const d       = sys.derived    ?? {};
  const isAdept = (sys.magicType ?? '') === 'Adept';
  const cb      = d.cyberBonus  ?? {};
  const ab      = d.adeptBonus  ?? {};

  // Shorthands for tooltip formulas
  const _v = key => attr[key]?.value ?? 0;
  const qui = _v('quickness'), intl = _v('intelligence'), wil = _v('willpower'),
        cha = _v('charisma'),  mag  = _v('magic'),        rea = attr.reaction?.value ?? 0;
  const reactionBase  = attr.reaction?.base ?? 0;
  const reactionBonus = attr.reaction?.reactionBonus ?? 0;

  // Core attributes (2 columns)
  const coreAttrs = [
    ['body','Body'], ['quickness','Quickness'], ['strength','Strength'],
    ['charisma','Charisma'], ['intelligence','Intelligence'], ['willpower','Willpower']
  ];
  const _cyberKey = { body: 'bod', quickness: 'qui', strength: 'str', charisma: 'cha', intelligence: 'int', willpower: 'wil' };

  const attrBlocks = coreAttrs.map(([key, label]) => {
    const base     = attr[key]?.base ?? 3;
    const aug      = cb[_cyberKey[key]] ?? 0;
    const adept    = isAdept ? (ab[_cyberKey[key]] ?? 0) : 0;
    const showTotal = aug > 0 || adept > 0;
    return `
    <div class="attr-block">
      <span class="attr-label">${label}</span>
      <div class="attr-row">
        <input class="attr-input" type="number" name="system.attributes.${key}.base"
               value="${base}" min="1" max="30" title="Base"/>
        ${adept > 0 ? `<span class="attr-force-sep" title="Adept power bonus">+</span>
        <span class="attr-adept" title="Adept power bonus">${adept}</span>` : ''}
        ${aug > 0 ? `<span class="attr-force-sep" title="Cyber/bio augmentation">+</span>
        <span class="attr-aug" title="Cyber/bio augmentation">${aug}</span>` : ''}
        ${showTotal ? `<span class="attr-force-total" title="Effective">(${base + adept + aug})</span>` : ''}
        ${key === 'quickness' && (d.armorEncPenalty ?? 0) > 0 ? `<span class="attr-enc-penalty" title="Armor encumbrance penalty (equipped armor exceeds Quickness)">−${d.armorEncPenalty}</span>` : ''}
        <i class="fas fa-dice-d6 rollable" data-action="rollAttr" data-attr="${key}" title="Shift-Click to use Phys. Dice" ${label}"></i>
      </div>
    </div>`;
  }).join('');

  return `<div class="tab ${this._activeTab === 'attributes' ? 'active' : ''}" data-tab="attributes" style="overflow-y:auto">
    <div class="attributes-grid">
      ${attrBlocks}

      <!-- Magic -->
      <div class="attr-block attr-special">
        <span class="attr-label">Magic</span>
        <div class="attr-row">
          <input class="attr-input" type="number" name="system.attributes.magic.base"
                 value="${attr.magic?.base ?? 0}" min="0" max="12" title="Base"/>
          ${isAdept && (ab.mag ?? 0) > 0 ? `<span class="attr-force-sep" title="Adept power bonus">+</span>
          <span class="attr-adept" title="Adept power bonus">${ab.mag}</span>` : ''}
          <span class="attr-mod">${attr.magic?.value ?? 0}</span>
        </div>
      </div>

      <!-- Reaction (derived: floor((QUI+INT)/2) + bonus) -->
      <div class="attr-block attr-special"
           title="floor((QUI ${qui} + INT ${intl}) / 2) = ${reactionBase}${reactionBonus ? ` + bonus ${reactionBonus}` : ''}${(cb.rea??0) ? ` + cyber ${cb.rea}` : ''}${isAdept&&(ab.rea??0) ? ` + adept ${ab.rea}` : ''} = ${rea}">
        <span class="attr-label" style="color:var(--sr-amber)">Reaction</span>
        <div class="attr-row">
          <span class="attr-derived" style="color:var(--sr-amber)">${attr.reaction?.base ?? 0}</span>
          <span class="attr-force-sep" title="Manual bonus (drugs, etc.)">+</span>
          <input class="attr-input attr-force" type="number" name="system.attributes.reaction.reactionBonus"
                 value="${attr.reaction?.reactionBonus ?? 0}" title="Manual reaction bonus (drugs, etc.)"/>
          ${isAdept && (ab.rea ?? 0) > 0 ? `<span class="attr-force-sep" title="Adept power bonus">+</span>
          <span class="attr-adept" title="Adept power bonus">${ab.rea}</span>` : ''}
          ${(cb.rea ?? 0) > 0 ? `<span class="attr-force-sep" title="Cyber/bio augmentation">+</span>
          <span class="attr-aug" title="Cyber/bio augmentation">${cb.rea}</span>` : ''}
        </div>
      </div>

      <!-- Essence -->
      <div class="attr-block attr-special"
           title="6 - cyberware essence cost = ${attr.essence?.value ?? 6}${(d.totalBioIndex??0) > 0 ? ` | Bio Index ${d.totalBioIndex} / ${d.bioIndexCapacity} capacity` : ''}">
        <span class="attr-label" style="color:var(--sr-amber)">Essence</span>
        <div class="attr-row">
          <input class="attr-input" type="number" name="system.attributes.essence.value"
                 value="${attr.essence?.value ?? 6}" min="0" max="6" step="0.1"
                 style="color:var(--sr-amber)"/>
        </div>
      </div>

      <!-- Initiative Dice Bonus -->
      <div class="attr-block attr-special"
           title="1 base${(sys.initiativeDiceBonus??0) ? ` + manual ${sys.initiativeDiceBonus}` : ''}${(cb.initDice??0) ? ` + cyber ${cb.initDice}` : ''}${isAdept&&(ab.initDice??0) ? ` + adept ${ab.initDice}` : ''} = ${d.initiativeDice ?? 1}d6">
        <span class="attr-label">Init Dice +</span>
        <div class="attr-row">
          <input class="attr-input" type="number" name="system.initiativeDiceBonus"
                 value="${sys.initiativeDiceBonus ?? 0}" min="0" max="10" title="Manual init dice bonus"/>
          ${isAdept && (ab.initDice ?? 0) > 0 ? `<span class="attr-force-sep" title="Adept power bonus">+</span>
          <span class="attr-adept" title="Adept power bonus">${ab.initDice}</span>` : ''}
          ${(cb.initDice ?? 0) > 0 ? `<span class="attr-force-sep" title="Cyber/bio augmentation">+</span>
          <span class="attr-aug" title="Cyber/bio augmentation">${cb.initDice}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Derived Pools -->
    <div class="derived-section">
      <div class="derived-section-header">
        <h3 class="section-hdr">Derived Pools</h3>
        <button type="button" class="btn-sm" data-action="resetAllPools" title="Reset all pools to full">↺ Reset All Pools</button>
      </div>
      <div class="derived-grid">
        ${this._derivedBlock('Initiative', `${d.initiative ?? 0} + ${d.initiativeDice ?? 1}d6`,
          `<i class="fas fa-dice-d6 rollable" data-action="rollInitiative" title="Roll Initiative (Shift: physical dice)"></i>`,
          `REA (${rea}) + wound mod (${sys.woundMod ?? 0}) = ${d.initiative ?? 0} base + ${d.initiativeDice ?? 1}d6`)}
        ${this._poolBlock('Combat Pool',
          d.availableCombatPool ?? d.combatPool ?? 0,
          d.combatPool ?? 0,
          d.combatPoolBase ?? 0,
          'system.combatPoolSpent', 'system.combatPoolMod',
          `floor((QUI ${qui} + INT ${intl} + WIL ${wil}) / 2) = ${d.combatPoolBase ?? 0}`)}
        ${this._derivedBlock('Karma Pool',
          `<input type="number" name="system.karmaPool" value="${sys.karmaPool ?? 0}" class="pool-input" style="width:45px"/>`)}
        ${d.spellPool !== null && d.spellPool !== undefined
          ? this._poolBlock('Spell Pool',
              d.availableSpellPool ?? d.spellPool ?? 0,
              d.spellPool ?? 0,
              d.spellPoolBase ?? 0,
              'system.spellPoolSpent', 'system.spellPoolMod',
              `floor((INT ${intl} + WIL ${wil} + MAG ${mag}) / 3) = ${d.spellPoolBase ?? 0}`)
          : ''}
        ${d.astralPool !== null && d.astralPool !== undefined
          ? this._poolBlock('Astral Pool',
              d.availableAstralPool ?? d.astralPool ?? 0,
              d.astralPool ?? 0,
              d.astralPoolBase ?? 0,
              'system.astralPoolSpent', 'system.astralPoolMod',
              `floor((INT ${intl} + CHA ${cha} + WIL ${wil}) / 2) = ${d.astralPoolBase ?? 0}`)
          : ''}
        ${(sys.spellDefensePool ?? 0) > 0 ? this._derivedBlock('Spell Defense', `<span style="color:var(--sr-accent)">${sys.spellDefensePool} dice</span>`) : ''}
        ${d.hackingPool !== null ? this._poolBlock('Hacking Pool',
          d.availableHackingPool ?? 0,
          d.hackingPool ?? 0,
          d.hackingPoolBase ?? 0,
          'system.hackingPoolSpent', null,
          `floor((INT ${intl} + MPCP) / 3) = ${d.hackingPoolBase ?? 0}`) : ''}
      </div>
    </div>

    <!-- Recoil tracking -->
    <div class="derived-section" style="margin-top:8px">
      <div class="derived-section-header">
        <h3 class="section-hdr">Recoil</h3>
        <button type="button" class="btn-sm" data-action="resetRecoil" title="Reset rounds-fired counter (start of new Combat Phase)">↺ Reset Recoil</button>
      </div>
      <div class="derived-grid">
        ${this._derivedBlock('Compensation',
          `<input type="number" class="pool-input recoil-comp" value="${sys.recoilCompensation ?? 0}" min="0" max="20" style="width:48px;text-align:center"
                  title="Cyber/body recoil compensation — stacks with weapon-mounted comp (also editable on the Cyber tab)"/>`)}
        ${this._derivedBlock('Rounds This Phase',
          `<span style="color:${(sys.roundsFiredThisPhase ?? 0) > 0 ? 'var(--sr-amber)' : 'var(--sr-muted)'}">${sys.roundsFiredThisPhase ?? 0}</span>`,
          '')}
        ${this._derivedBlock('TN Penalty',
          `<span style="color:${Math.max(0,(sys.roundsFiredThisPhase ?? 0)-(sys.recoilCompensation ?? 0)) > 0 ? 'var(--sr-red)' : 'var(--sr-muted)'}">+${Math.max(0,(sys.roundsFiredThisPhase ?? 0)-(sys.recoilCompensation ?? 0))}</span>`,
          '')}
      </div>
    </div>

    <div style="margin-top:8px;padding:4px 0;border-top:1px solid var(--sr-border);display:flex;gap:6px;flex-wrap:wrap">
      <button type="button" class="btn-sm" data-action="rollContested"
              style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border)">
        ⚔ Contested Roll
      </button>
      <button type="button" class="btn-sm" data-action="rollResistDamage"
              style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border)"
              title="Shift-click to enter successes manually">
        🛡 Resist Damage
      </button>
      <button type="button" class="btn-sm" data-action="toggleFullDefense"
              style="background:${sys.fullDefense ? 'var(--sr-accent)' : 'var(--sr-surface)'};color:${sys.fullDefense ? '#fff' : 'var(--sr-text)'};border:1px solid ${sys.fullDefense ? 'var(--sr-accent)' : 'var(--sr-border)'};"
              title="Commit all combat pool dice to defense for this pass — auto-applied to next dodge declaration">
        🛡 Full Defense${sys.fullDefense ? ` (${sys.fullDefensePool ?? 0})` : ''}
      </button>
    </div>
  </div>`;
}

  _derivedBlock(label, value, extra = '', tooltip = '') {
    return `<div class="derived-block"${tooltip ? ` title="${tooltip}"` : ''}>
      <span class="derived-label">${label}</span>
      <span class="derived-value">${value}</span>
      ${extra}
    </div>`;
  }

  /**
   * Render an editable current/total pool block.
   * currentVal   — available dice right now
   * totalVal     — full pool size (base + mod)
   * baseVal      — derived base before mod (used to compute mod from typed total)
   * spentField   — system field name for "spent" counter, or null if no spent tracking
   * modField     — system field name for the pool mod / bonus
   */
  _poolBlock(label, currentVal, totalVal, baseVal, spentField, modField, tooltip = '') {
    const currentInput = spentField
      ? `<input type="number" class="pool-current-input" style="width:38px"
               data-spent-field="${spentField}"
               data-pool-total="${totalVal}"
               value="${currentVal}" min="0"/>`
      : `<span class="pool-current-static">${currentVal}</span>`;

    const totalInput = `<input type="number" class="pool-total-input" style="width:38px"
             data-mod-field="${modField}"
             data-pool-base="${baseVal}"
             value="${totalVal}" min="0"/>`;

    return `<div class="derived-block"${tooltip ? ` title="${tooltip}"` : ''}>
      <span class="derived-label">${label}</span>
      <span class="derived-value pool-value-pair">
        ${currentInput}
        <span class="pool-sep"> / </span>
        ${totalInput}
      </span>
    </div>`;
  }

  _tabSkills(actor) {
    const allSkills = actor.items.filter(i => i.type === 'skill')
      .sort((a, b) => a.name.localeCompare(b.name));
    const skillBonusDice = actor.system.derived?.skillBonusDice ?? {};
    // Whether to render the bonus-dice column at all. Adepts always get it (an adept with
    // no Improved Ability still expects to see the column); anyone else gets it only once
    // something actually grants them skill dice — cyberware or bioware — so non-augmented
    // characters are not given a permanently empty column.
    const showBonusCol = (actor.system.magicType ?? '') === 'Adept'
      || Object.values(skillBonusDice).some(n => n > 0);

    const _isComplete = s => (s.system.category ?? '') !== '' && (s.system.skillName ?? '') !== '' && (s.system.rating ?? 0) > 0;

    const _skillType = s => {
      const cat = s.system.category ?? '';
      if (cat) return skillTypeForCategory(cat);
      return s.system.skillType ?? 'active';
    };

    const complete   = allSkills.filter(_isComplete);
    const incomplete = allSkills.filter(s => !_isComplete(s));

    const activeSkills   = complete.filter(s => _skillType(s) === 'active');
    const knowledgeSkills= complete.filter(s => _skillType(s) === 'knowledge');
    const languageSkills = complete.filter(s => _skillType(s) === 'language');

    const _skillRow = s => {
      const rating   = s.system.rating ?? 0;
      const ia       = skillBonusDice[s.name] ?? 0;
      const specs    = s.system.specialisations ?? [];
      // Normalise to a {name, level} list, falling back to the legacy singular field.
      const specList = specs.length > 0
        ? specs
        : (s.system.specialisation ? [{ name: s.system.specialisation, level: 2 }] : []);
      const forceCell = (level) => showBonusCol ? `
        <span class="item-cell">
          ${level == null && ia > 0
            ? `<span class="attr-adept" title="Bonus dice — adept Improved Ability, cyberware or bioware">${ia}</span>`
            : `<span style="color:var(--sr-dim)">—</span>`}
        </span>` : '';
      const attrLabel = s.system.linkedAttribute === 'lan' ? 'LAN' : (s.system.linkedAttribute ?? '—');
      const ratingCell = (level) => level
        ? `${rating} <span style="color:var(--sr-accent)">(${rating + level})</span>`
        : `${rating}`;
      const specCell = (sp) => `<span class="item-cell" style="white-space:normal;overflow:visible"
            title="${sp ? `${sp.name} (+${sp.level})` : ''}">${sp ? sp.name : '—'}</span>`;

      const [firstSpec, ...extraSpecs] = specList;

      const mainRow = `
        <div class="item-row" data-item-id="${s.id}">
          <span class="item-name skill-name" data-action="rollSkill" data-item-id="${s.id}"
                title="Roll ${s.name}">${s.name}</span>
          <span class="item-cell">${attrLabel}</span>
          <span class="item-cell">${ratingCell(firstSpec?.level)}</span>
          ${forceCell(null)}
          ${specCell(firstSpec)}
          ${this._itemControls(s.id, true, 'rollSkill')}
        </div>`;

      // Each additional specialisation beyond the first gets its own continuation line,
      // repeating the rating (with that spec's own dice bonus) and its name — Skill/Attr
      // are left blank so it reads as "more of the row above", not a data error.
      const extraRows = extraSpecs.map(sp => `
        <div class="item-row item-row--spec-extra" data-item-id="${s.id}">
          <span class="item-name"></span>
          <span class="item-cell"></span>
          <span class="item-cell">${ratingCell(sp.level)}</span>
          ${forceCell(sp.level)}
          ${specCell(sp)}
          <div class="item-controls"></div>
        </div>`).join('');

      return mainRow + extraRows;
    };

    const header = `<div class="list-header"><span>Skill</span><span>Attr</span><span>Rtg</span>${showBonusCol ? '<span title="Bonus dice">+D</span>' : ''}<span>Spec</span><span></span></div>`;

    const _section = (label, color, skills) => skills.length === 0 ? '' : `
      <h3 class="section-hdr" style="margin-top:1rem;color:${color}">${label}</h3>
      ${header}
      ${skills.map(_skillRow).join('')}`;

    return `<div class="tab ${this._activeTab === 'skills' ? 'active' : ''}" data-tab="skills" style="overflow-y:auto">
      ${_section('Active Skills', 'var(--sr-accent)', activeSkills)}
      ${_section('Knowledge Skills', 'var(--sr-gold)', knowledgeSkills)}
      ${_section('Language Skills', 'var(--sr-green)', languageSkills)}
      ${incomplete.length ? `
        <h3 class="section-hdr" style="margin-top:1rem;color:var(--sr-amber)">Incomplete (set category, skill name, and rating)</h3>
        ${header}
        ${incomplete.map(_skillRow).join('')}
      ` : ''}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button type="button" class="btn-add" data-action="browseSkills">+ Browse Skills</button>
        <button type="button" class="btn-add" data-action="itemCreate" data-type="skill">+ Add Custom</button>
      </div>
    </div>`;
  }

  _tabWeapons(actor) {
  const _stored = i => !!i.getFlag('The2ndChumming3e', 'stored');
  const firearms    = actor.items.filter(i => i.type === 'firearm'    && !_stored(i));
  const melees      = actor.items.filter(i => i.type === 'melee'      && !_stored(i));
  const projectiles = actor.items.filter(i => i.type === 'projectile' && !_stored(i));
  const thrown      = actor.items.filter(i => i.type === 'thrown'     && !_stored(i));

  const BOW_CATS    = new Set(['Bow', 'LCB', 'MCB', 'HCB', 'SL']);
  const THROWN_CATS = new Set(['TK', 'SH', 'Imp', 'Ctrp', 'GR', 'BOL', 'THR', 'other']);
  const ARMED_CATS  = new Set(['EDG', 'CLB', 'POL', 'WHP']);
  const UNARMED_CATS = new Set(['CYB', 'UNA']);

  const armedMelee         = melees.filter(w => ARMED_CATS.has(w.system.category ?? ''));
  const unarmedCyber       = melees.filter(w => UNARMED_CATS.has(w.system.category ?? ''));
  const uncategorisedMelee = melees.filter(w => {
    const cat = w.system.category ?? '';
    return !ARMED_CATS.has(cat) && !UNARMED_CATS.has(cat);
  });

  const categorisedFirearms   = firearms.filter(w => (w.system.category ?? '') !== '');
  const uncategorisedFirearms = firearms.filter(w => (w.system.category ?? '') === '');

  const equippedMeleeId = actor.system.equippedMelee ?? '';
  const isAwakened      = (actor.system.attributes?.magic?.base ?? 0) > 0;

  const fRows = categorisedFirearms.length ? categorisedFirearms.map(w => `
    <div class="item-row" data-item-id="${w.id}">
      <span class="item-name">${w.name}</span>
      <span class="item-cell col-xs">${w.system.damage || '—'}</span>
      <span class="item-cell col-sm">${w.system.mode || '—'}</span>
      <span class="item-cell col-xs">${w.system.concealability ?? '—'}</span>
      <span class="item-cell col-xs">${w.system.weight ?? 0}</span>
      <span class="item-cell col-sm">${this._firearmAmmoCell(w)}</span>
      <span class="item-cell">${this._firearmLoadedCell(w)}</span>
      ${this._itemControls(w.id, true, 'rollWeapon', false, this._weaponOutOfAmmo(w), w.id)}
    </div>`).join('') : '<p class="empty-list">No firearms.</p>';

  const armedRows = armedMelee.length ? armedMelee.map(w => {
    const isEquipped  = equippedMeleeId === w.id;
    const isFocus     = w.system.isFocus     ?? false;
    const focusActive = w.system.focusActive ?? false;
    const focusTag    = isFocus ? ` <span style="color:var(--sr-accent);font-size:10px">[Focus${focusActive ? ' ✦' : ''}]</span>` : '';
    return `
    <div class="item-row ${isEquipped ? 'equipped' : ''}" data-item-id="${w.id}">
      <span class="item-name">${w.name}${isEquipped ? ' <span class="equipped-badge">✦ Equipped</span>' : ''}${focusTag}</span>
      <span class="item-cell col-xs">${w.system.damage || '—'}</span>
      <span class="item-cell">Reach ${w.system.reach ?? 0}</span>
      <span class="item-cell col-xs">${w.system.concealability ?? '—'}</span>
      <span class="item-cell col-xs">${w.system.weight ?? 0}</span>
      ${this._meleeControls(w.id, isEquipped, isAwakened, isFocus, focusActive, false)}
    </div>`;
  }).join('') : '<p class="empty-list">No armed melee weapons.</p>';

  const unarmedRows = unarmedCyber.length ? unarmedCyber.map(w => {
    const isEquipped  = equippedMeleeId === w.id;
    const isFocus     = w.system.isFocus     ?? false;
    const focusActive = w.system.focusActive ?? false;
    const focusTag    = isFocus ? ` <span style="color:var(--sr-accent);font-size:10px">[Focus${focusActive ? ' ✦' : ''}]</span>` : '';
    return `
    <div class="item-row ${isEquipped ? 'equipped' : ''}" data-item-id="${w.id}">
      <span class="item-name">${w.name}${isEquipped ? ' <span class="equipped-badge">✦ Equipped</span>' : ''}${focusTag}</span>
      <span class="item-cell col-xs">${w.system.damage || '—'}</span>
      <span class="item-cell">Reach ${w.system.reach ?? 0}</span>
      <span class="item-cell col-xs">${w.system.concealability ?? '—'}</span>
      <span class="item-cell col-xs">${w.system.weight ?? 0}</span>
      ${this._meleeControls(w.id, isEquipped, isAwakened, isFocus, focusActive, false)}
    </div>`;
  }).join('') : '';

  // WHAT ACTUALLY DEFENDS YOU — stated, not inferred (TODO 46).
  //
  // `SR3EItem._getEquippedMelee` falls through equipped item -> first CYB/UNA item ->
  // synthesised Bare Hands, and that fall-through is silent. A character carrying a pole
  // arm who never pressed Equip defends bare-handed at reach 0, and the only place that
  // surfaced was mid-combat, as a defaulting prompt nobody expected. Saying it on the
  // sheet is what makes it fixable BEFORE the fight.
  //
  // Amber specifically when armed melee weapons are owned but none is equipped, because
  // that combination is almost always an oversight rather than a choice — a character
  // with no melee weapons at all defending bare-handed is simply correct.
  const _equippedMeleeItem = equippedMeleeId ? actor.items.get(equippedMeleeId) : null;
  const _cyberFallback     = !_equippedMeleeItem
    ? unarmedCyber.find(w => w.system.category === 'CYB' || w.system.category === 'UNA')
    : null;
  const _defendsWith = _equippedMeleeItem ?? _cyberFallback ?? null;
  const _fallingBack = !_defendsWith && armedMelee.length > 0;

  const defenceLine = `
    <div style="margin:4px 6px 8px;font-size:11px;line-height:1.35;color:${
      _fallingBack ? 'var(--sr-amber)' : 'var(--sr-muted)'}">
      ${_fallingBack ? '⚠ ' : ''}Defends with:
      <strong>${_defendsWith ? _defendsWith.name : 'Bare Hands'}</strong>
      ${_defendsWith
        ? `(Reach ${_defendsWith.system.reach ?? 0})`
        : `(Reach 0, ${actor.system.attributes?.strength?.value ?? 1}M Stun)`}
      ${_fallingBack
        ? ` — nothing is equipped, so ${armedMelee.length === 1 ? 'your weapon is' : 'your weapons are'} not being used. Press <em>Equip</em>.`
        : ''}
    </div>`;

  // Built-in unarmed attack — always available, not a real item (uses STR / Unarmed Combat).
  const _unarmedStr = actor.system.attributes?.strength?.value ?? actor.system.attributes?.strength?.base ?? 1;
  const unarmedBuiltinRow = `
    <div class="item-row">
      <span class="item-name">Unarmed Combat <span style="font-size:10px;color:var(--sr-dim)">(built-in)</span></span>
      <span class="item-cell col-xs" title="(STR)M Stun">${_unarmedStr}M Stun</span>
      <span class="item-cell">Reach 0</span>
      <span class="item-cell col-xs">—</span>
      <span class="item-cell col-xs">—</span>
      <div class="item-controls"><i class="fas fa-dice-d6 rollable" data-action="rollUnarmed" title="Unarmed attack (Strength)"></i></div>
    </div>`;

  const trackOnProj = game.settings.get('The2ndChumming3e', 'trackAmmo');
  const _projRow = w => {
    const usesNocked = trackOnProj && (w._usesNockedAmmo?.() ?? false);
    const out        = usesNocked ? this._weaponOutOfAmmo(w) : false;
    return `
    <div class="item-row" data-item-id="${w.id}">
      <span class="item-name">${w.name}</span>
      <span class="item-cell col-xs">${w.system.damage || '—'}</span>
      <span class="item-cell">${w.system.strMin || '—'}</span>
      <span class="item-cell col-xs">${w.system.concealability ?? '—'}</span>
      <span class="item-cell col-xs">${w.system.weight ?? 0}</span>
      ${trackOnProj ? `<span class="item-cell">${this._bowNockedCell(w)}</span>` : ''}
      ${this._itemControls(w.id, true, 'rollWeapon', false, out, usesNocked ? w.id : null)}
    </div>`;
  };

  // Thrown weapons are consumed on use — show quantity and disable when empty (tracking on).
  const _thrownRow = w => {
    const trackOn = game.settings.get('The2ndChumming3e', 'trackAmmo');
    const qty     = w.system.quantity ?? 0;
    const out     = trackOn && qty <= 0;
    const qtyCol  = out ? 'var(--sr-red)' : (trackOn && qty <= 2 ? 'var(--sr-amber)' : 'var(--sr-muted)');
    return `
    <div class="item-row" data-item-id="${w.id}">
      <span class="item-name">${w.name}</span>
      <span class="item-cell col-xs">${w.system.damage || '—'}</span>
      <span class="item-cell">${w.system.strMin || '—'}</span>
      <span class="item-cell col-xs">${w.system.concealability ?? '—'}</span>
      <span class="item-cell" style="color:${qtyCol}">${trackOn ? `×${qty}` : '—'}</span>
      ${this._itemControls(w.id, true, 'rollWeapon', false, out)}
    </div>`;
  };

  const bows         = projectiles.filter(i => BOW_CATS.has(i.system.category ?? ''));
  const legacyThrown = projectiles.filter(i => THROWN_CATS.has(i.system.category ?? ''));
  const uncatProj    = projectiles.filter(i => {
    const cat = i.system.category ?? '';
    return !BOW_CATS.has(cat) && !THROWN_CATS.has(cat) && cat !== '';
  });
  const allThrown  = [...thrown, ...legacyThrown];

  const bowRows    = bows.length     ? bows.map(_projRow).join('')     : '<p class="empty-list">No bows or crossbows.</p>';
  const thrownRows = allThrown.length ? allThrown.map(_thrownRow).join('') : '<p class="empty-list">No thrown weapons.</p>';

  const uncatMeleeHtml = uncategorisedMelee.length ? `
    <h3 class="section-hdr" style="margin-top:0.75rem;color:var(--sr-amber)">Uncategorised Melee (set category in item sheet)</h3>
    <div class="list-header"><span>Name</span><span class="col-xs" title="Damage">Dam.</span><span>Reach/Mode</span><span class="col-xs" title="Concealability">Con.</span><span class="col-xs" title="Weight (kg)">KG</span><span></span></div>
    ${uncategorisedMelee.map(w => {
      const isEquipped  = equippedMeleeId === w.id;
      const isFocus     = w.system.isFocus     ?? false;
      const focusActive = w.system.focusActive ?? false;
      return `
      <div class="item-row" data-item-id="${w.id}">
        <span class="item-name">${w.name}</span>
        <span class="item-cell col-xs">${w.system.damage || '—'}</span>
        <span class="item-cell">Reach ${w.system.reach ?? 0}</span>
        <span class="item-cell col-xs">${w.system.concealability ?? '—'}</span>
        <span class="item-cell col-xs">${w.system.weight ?? 0}</span>
        ${this._meleeControls(w.id, isEquipped, isAwakened, isFocus, focusActive, false)}
      </div>`;
    }).join('')}` : '';

  const uncatFirearmsHtml = uncategorisedFirearms.length ? `
    <h3 class="section-hdr" style="margin-top:0.75rem;color:var(--sr-amber)">Uncategorised Firearms (set category in item sheet)</h3>
    <div class="list-header"><span>Name</span><span class="col-xs" title="Damage">Dam.</span><span class="col-sm">Mode</span><span class="col-xs" title="Concealability">Con.</span><span class="col-xs" title="Weight (kg)">KG</span><span class="col-sm">Ammo</span><span>Loaded Ammo</span><span></span></div>
    ${uncategorisedFirearms.map(w => `
      <div class="item-row" data-item-id="${w.id}">
        <span class="item-name">${w.name}</span>
        <span class="item-cell col-xs">${w.system.damage || '—'}</span>
        <span class="item-cell col-sm">${w.system.mode || '—'}</span>
        <span class="item-cell col-xs">${w.system.concealability ?? '—'}</span>
        <span class="item-cell col-xs">${w.system.weight ?? 0}</span>
        <span class="item-cell col-sm">${this._firearmAmmoCell(w)}</span>
        <span class="item-cell">${this._firearmLoadedCell(w)}</span>
        ${this._itemControls(w.id, true, 'rollWeapon', false, this._weaponOutOfAmmo(w), w.id)}
      </div>`).join('')}` : '';

  const _dragHdr = label => `<span class="wep-drag-grip" title="Drag to reorder">&#8942;&#8942;</span>${label}`;

  const sections = {
    'firearms': `
      <div class="weapon-section" data-section="firearms">
        <h3 class="section-hdr wep-section-hdr" draggable="true">${_dragHdr('Firearms')}</h3>
        <div class="list-header"><span>Name</span><span class="col-xs" title="Damage">Dam.</span><span class="col-sm">Mode</span><span class="col-xs" title="Concealability">Con.</span><span class="col-xs" title="Weight (kg)">KG</span><span class="col-sm">Ammo</span><span>Loaded Ammo</span><span></span></div>
        ${fRows}
        ${uncatFirearmsHtml}
        <button type="button" class="btn-add" data-action="itemCreate" data-type="firearm">+ Add Firearm</button>
      </div>`,
    'melee-armed': `
      <div class="weapon-section" data-section="melee-armed">
        <h3 class="section-hdr wep-section-hdr" draggable="true">${_dragHdr('Melee')} <span style="font-size:11px;font-weight:normal;color:var(--sr-muted)">(Edged / Clubs / Polearms / Whips)</span></h3>
        <div class="skill-note"><i class="fas fa-fist-raised"></i> Uses Armed Combat skills (Strength)</div>
        ${defenceLine}
        <div class="list-header"><span>Name</span><span class="col-xs" title="Damage">Dam.</span><span>Reach</span><span class="col-xs" title="Concealability">Con.</span><span class="col-xs" title="Weight (kg)">KG</span><span></span></div>
        ${armedRows}
        ${uncatMeleeHtml}
        <button type="button" class="btn-add" data-action="itemCreate" data-type="melee">+ Add Armed Melee</button>
      </div>`,
    'thrown': `
      <div class="weapon-section" data-section="thrown">
        <h3 class="section-hdr wep-section-hdr" draggable="true">${_dragHdr('Thrown Weapons')}</h3>
        <div class="list-header"><span>Name</span><span class="col-xs" title="Damage">Dam.</span><span>Str Min</span><span class="col-xs" title="Concealability">Con.</span><span>Qty</span><span></span></div>
        ${thrownRows}
        <button type="button" class="btn-add" data-action="itemCreate" data-type="thrown">+ Add Thrown Weapon</button>
      </div>`,
    'projectile': `
      <div class="weapon-section" data-section="projectile">
        <h3 class="section-hdr wep-section-hdr" draggable="true">${_dragHdr('Projectiles')} <span style="font-size:11px;font-weight:normal;color:var(--sr-muted)">(Bows &amp; Crossbows)</span></h3>
        <div class="list-header"><span>Name</span><span class="col-xs" title="Damage">Dam.</span><span>Str Min</span><span class="col-xs" title="Concealability">Con.</span><span class="col-xs" title="Weight (kg)">KG</span>${trackOnProj ? '<span title="Nocked arrow/bolt">Nocked</span>' : ''}<span></span></div>
        ${bowRows}
        ${uncatProj.length ? `
          <h3 class="section-hdr" style="margin-top:0.5rem;color:var(--sr-amber)">Uncategorised Projectiles</h3>
          ${uncatProj.map(_projRow).join('')}
        ` : ''}
        <button type="button" class="btn-add" data-action="itemCreate" data-type="projectile">+ Add Bow / Crossbow</button>
      </div>`,
    'cyber-unarmed': `
      <div class="weapon-section" data-section="cyber-unarmed">
        <h3 class="section-hdr wep-section-hdr" draggable="true">${_dragHdr('Cyber &amp; Unarmed')}</h3>
        <div class="skill-note"><i class="fas fa-hand-rock"></i> Uses Unarmed Combat skill (Strength)</div>
        <div class="list-header"><span>Name</span><span class="col-xs" title="Damage">Dam.</span><span>Reach</span><span class="col-xs" title="Concealability">Con.</span><span class="col-xs" title="Weight (kg)">KG</span><span></span></div>
        ${unarmedBuiltinRow}
        ${unarmedRows}
        <button type="button" class="btn-add" data-action="itemCreate" data-type="melee">+ Add Unarmed/Cyber</button>
      </div>`,
  };

  const DEFAULT_ORDER = ['firearms', 'melee-armed', 'thrown', 'projectile', 'cyber-unarmed'];
  let order = DEFAULT_ORDER;
  try {
    const stored = localStorage.getItem(`sr3e-weapons-order-${actor.id}`);
    if (stored) order = JSON.parse(stored);
  } catch { /* ignore */ }
  const fullOrder = [...order.filter(id => sections[id]), ...DEFAULT_ORDER.filter(id => !order.includes(id))];

  return `<div class="tab ${this._activeTab === 'weapons' ? 'active' : ''}" data-tab="weapons" style="overflow-y:auto">
    ${fullOrder.map(id => sections[id]).join('')}
  </div>`;
}

  _tabArmor(actor, sys) {
    const armors = actor.items.filter(i => i.type === 'armor' && !i.getFlag('The2ndChumming3e', 'stored'));

    const equippedArmor = sys.equippedArmor ? actor.items.get(sys.equippedArmor) : null;
    if (sys.equippedArmor && !equippedArmor) {
      sys.equippedArmor = "";
      actor.update({ "system.equippedArmor": "" });
    }

    const activeArmorDisplay = equippedArmor ? `
      <div class="active-armor-section">
        <div class="active-armor-header">
          <i class="fas fa-shield-alt"></i> Currently Equipped
        </div>
        <div class="active-armor-card">
          <span class="active-armor-name">${equippedArmor.name}</span>
          <div class="active-armor-stats">
            <span class="armor-badge ballistic">B: ${equippedArmor.system.ballistic ?? 0}</span>
            <span class="armor-badge impact">I: ${equippedArmor.system.impact ?? 0}</span>
          </div>
        </div>
      </div>
    ` : `
      <div class="active-armor-section" style="opacity: 0.7;">
        <div class="active-armor-header">
          <i class="fas fa-shield"></i> No Armor Equipped
        </div>
        <div class="active-armor-card">
          <span class="active-armor-name">Unarmored</span>
          <div class="active-armor-stats">
            <span class="armor-badge ballistic">B: 0</span>
            <span class="armor-badge impact">I: 0</span>
          </div>
        </div>
      </div>
    `;

    const aRows = armors.length ? armors.map(a => {
      const isEquipped = (sys.equippedArmor === a.id);
      return `
        <div class="item-row ${isEquipped ? 'equipped' : ''}" data-item-id="${a.id}">
          <span class="item-name">${a.name}</span>
          <span class="item-cell col-narrow">${a.system.ballistic ?? 0}B / ${a.system.impact ?? 0}I</span>
          <span class="item-cell col-xs">${a.system.concealability ?? '—'}</span>
          <span class="item-cell col-xs">${a.system.weight ?? 0}</span>
          <div class="item-controls">
            <i class="fas fa-home" data-action="toggleStored" data-item-id="${a.id}"
               style="color:var(--sr-dim)" title="Put in storage"></i>
            ${isEquipped ?
              `<i class="fas fa-shield-alt" style="color: var(--sr-accent);" title="Unequip" data-action="equipArmor" data-item-id="${a.id}"></i>` :
              `<i class="fas fa-shield" title="Equip" data-action="equipArmor" data-item-id="${a.id}"></i>`
            }
            <i class="fas fa-edit" data-action="itemEdit" data-item-id="${a.id}" title="Edit"></i>
            <i class="fas fa-trash" data-action="itemDelete" data-item-id="${a.id}" title="Delete"></i>
          </div>
        </div>
      `;
    }).join('') : '<p class="empty-list">No armor. Add some below.</p>';

    return `<div class="tab ${this._activeTab === 'armor' ? 'active' : ''}" data-tab="armor" style="overflow-y:auto">
      ${activeArmorDisplay}
      <div class="list-header"><span>Name</span><span class="col-narrow">B / I</span><span class="col-xs" title="Concealability">Con.</span><span class="col-xs" title="Weight (kg)">KG</span><span></span></div>
      ${aRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="armor">+ Add Armor</button>
    </div>`;
  }

  _tabProjectiles(actor) {
    const projectiles = actor.items.filter(i => i.type === 'projectile');

    const BOW_CATS    = new Set(['Bow', 'LCB', 'MCB', 'HCB', 'SL']);
    const THROWN_CATS = new Set(['TK', 'SH', 'Imp', 'Ctrp', 'GR', 'BOL', 'THR', 'other']);

    const bows   = projectiles.filter(i => BOW_CATS.has(i.system.category ?? ''));
    const thrown = projectiles.filter(i => THROWN_CATS.has(i.system.category ?? ''));
    const uncategorised = projectiles.filter(i => {
      const cat = i.system.category ?? '';
      return !BOW_CATS.has(cat) && !THROWN_CATS.has(cat);
    });

    const _row = w => `
      <div class="item-row" data-item-id="${w.id}">
        <span class="item-name">${w.name}</span>
        <span class="item-cell col-xs">${w.system.damage || '—'}</span>
        <span class="item-cell">${w.system.strMin || '—'}</span>
        <span class="item-cell col-xs">${w.system.concealability ?? '—'}</span>
        ${this._itemControls(w.id, true)}
      </div>`;

    const bowRows          = bows.length          ? bows.map(_row).join('')          : '<p class="empty-list">No bows or crossbows.</p>';
    const thrownRows       = thrown.length         ? thrown.map(_row).join('')        : '<p class="empty-list">No thrown weapons.</p>';
    const uncategorisedRows = uncategorised.length ? uncategorised.map(_row).join('') : '';

    return `<div class="tab ${this._activeTab === 'projectiles' ? 'active' : ''}" data-tab="projectiles">
      <h3 class="section-hdr">Bows & Crossbows (Projectile Weapons)</h3>
      <div class="list-header"><span>Name</span><span class="col-xs" title="Damage">Dam.</span><span>Str Min</span><span class="col-xs" title="Concealability">Con.</span><span></span></div>
      ${bowRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="projectile">+ Add Bow / Crossbow</button>

      <h3 class="section-hdr" style="margin-top:1rem">Thrown Weapons (Throwing Weapons)</h3>
      <div class="list-header"><span>Name</span><span class="col-xs" title="Damage">Dam.</span><span>Str Min</span><span class="col-xs" title="Concealability">Con.</span><span></span></div>
      ${thrownRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="projectile">+ Add Thrown Weapon</button>

      ${uncategorised.length ? `
        <h3 class="section-hdr" style="margin-top:1rem;color:var(--sr-amber)">Uncategorised (set category in item sheet)</h3>
        <div class="list-header"><span>Name</span><span class="col-xs" title="Damage">Dam.</span><span>Str Min</span><span class="col-xs" title="Concealability">Con.</span><span></span></div>
        ${uncategorisedRows}
      ` : ''}
    </div>`;
  }

  /**
   * Stockpile-total cell for a gear/ammo-tab row. Ammo items are a reservoir, not a
   * magazine — they are never reloaded here; weapons draw from them.
   */
  _ammoStockCell(a) {
    const rounds  = a.system.rounds ?? 0;
    const trackOn = game.settings.get('The2ndChumming3e', 'trackAmmo');
    const color   = (trackOn && rounds === 0) ? 'var(--sr-red)' : 'var(--sr-text)';
    return `<span style="color:${color}">${rounds}</span>`;
  }

  /** "Ammo" column for a firearm row — the capacity string (e.g. "60(c)"). */
  _firearmAmmoCell(w) {
    return w.system.ammunition || '—';
  }

  /** "Loaded Ammo" column for a firearm row — reload icon + loaded type/count. */
  _firearmLoadedCell(w) {
    const trackOn  = game.settings.get('The2ndChumming3e', 'trackAmmo');
    const type     = w.system.loadedAmmoType ?? 'regular';
    const label    = SR3E.ammoTypes[type]?.label ?? 'Regular';
    const magSize  = game.sr3e.SR3EItem._parseMagazineSize(w.system.ammunition ?? '');
    const loaded   = w.system.loadedRounds ?? 0;
    const countTxt = trackOn && magSize > 0 ? ` ${loaded}/${magSize}` : '';
    const color    = (trackOn && magSize > 0 && loaded === 0) ? 'var(--sr-red)'
                   : (trackOn && magSize > 0 && loaded <= magSize / 4) ? 'var(--sr-amber)'
                   : 'var(--sr-muted)';
    return `<span style="color:${color}">${label}${countTxt}</span>`;
  }

  _tabAmmo(actor) {
    const ammo     = actor.items.filter(i => i.type === 'ammunition');
    const ammoRows = ammo.length ? ammo.map(a => {
      const typeLabel = SR3E.ammoTypes[a.system.ammoType ?? 'regular']?.label ?? 'Regular';
      const mech      = a.system.loadMechanism ?? 'c';
      return `
      <div class="item-row" data-item-id="${a.id}">
        <span class="item-name">${a.name}</span>
        <span class="item-cell">${typeLabel}</span>
        <span class="item-cell" title="${SR3E.ammoLoadMechanisms[mech] ?? mech}">${mech}</span>
        <span class="item-cell">${this._ammoStockCell(a)}</span>
        ${this._itemControls(a.id, false)}
      </div>`;
    }).join('') : '<p class="empty-list">No ammunition.</p>';

    return `<div class="tab ${this._activeTab === 'ammo' ? 'active' : ''}" data-tab="ammo">
      <h3 class="section-hdr">Ammunition</h3>
      <div class="list-header"><span>Name</span><span>Type</span><span>Load</span><span>Stock</span><span></span></div>
      ${ammoRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="ammunition">+ Add Ammunition</button>
    </div>`;
  }

  _tabCyber(actor, sys) {
    const activeVCRId = sys.activeVCRItemId ?? '';
    const cyberware   = actor.items.filter(i => i.type === 'cyberware' && !i.getFlag('The2ndChumming3e', 'stored'))
      .sort((a, b) => a.name.localeCompare(b.name));
    const bioware     = actor.items.filter(i => i.type === 'bioware'   && !i.getFlag('The2ndChumming3e', 'stored'))
      .sort((a, b) => a.name.localeCompare(b.name));

    const cwRows = cyberware.length ? cyberware.map(c => {
      const rating = c.system.rating ?? 0;
      return `
        <div class="item-row" data-item-id="${c.id}" data-cyber-item-id="${c.id}">
          <span class="item-name">${c.name}</span>
          <span class="item-cell">${c.system.grade ?? '—'}</span>
          <span class="item-cell">${c.system.essenceCost ?? 0}</span>
          <span class="item-cell">${rating}</span>
          ${this._itemControls(c.id, false, 'rollWeapon', false)}
        </div>`;
    }).join('') : '<p class="empty-list">No cyberware.</p>';

    const bwRows = bioware.length ? bioware.map(b => `
      <div class="item-row" data-item-id="${b.id}">
        <span class="item-name">${b.name}</span>
        <span class="item-cell">${b.system.grade ?? '—'}</span>
        <span class="item-cell">${b.system.bioIndex ?? 0}</span>
        <span class="item-cell">${b.system.rating ?? 0}</span>
        ${this._itemControls(b.id, false, 'rollWeapon', false)}
      </div>`).join('') : '<p class="empty-list">No bioware.</p>';

    const vcrRating  = sys.derived?.vcrRating  ?? 0;
    const totalBio   = sys.derived?.totalBioIndex   ?? 0;
    const bioCap     = sys.derived?.bioIndexCapacity ?? 0;
    const bioOver    = sys.derived?.bioIndexOver     ?? false;
    const magicSupp  = sys.derived?.magicSuppressed  ?? false;
    const effMagic   = sys.derived?.effectiveMagic   ?? 0;
    const magicBase  = actor.system.attributes?.magic?.base ?? 0;

    const activeVCRItem = activeVCRId ? actor.items.get(activeVCRId) : null;
    const vcrSlot = activeVCRItem
      ? `<div class="sr-vcr-slot sr-vcr-slot--filled" data-vcr-drop>
           <span class="sr-vcr-slot-label">⚡ VCR</span>
           <span class="sr-vcr-slot-name">${activeVCRItem.name}</span>
           <span class="sr-vcr-slot-rating">Rating ${activeVCRItem.system.rating ?? 0}</span>
           <button type="button" class="sr-vcr-slot-clear" data-action="clearVCR" title="Remove VCR">✕</button>
         </div>`
      : `<div class="sr-vcr-slot" data-vcr-drop>
           <span class="sr-vcr-slot-label">⚡ VCR</span>
           <span class="sr-vcr-slot-placeholder">Drag a cyberware item here to set as active VCR</span>
         </div>`;

    const bioAlert = bioOver ? `
      <div class="sr-alert sr-alert--danger" style="margin-top:6px">
        ⚠ Bio Index ${totalBio} exceeds capacity ${bioCap} — character is taking damage
      </div>` : '';

    const magicAlert = magicSupp ? `
      <div class="sr-alert sr-alert--warn" style="margin-top:4px">
        ⚠ Magic suppressed by bioware — effective Magic ${Math.floor(effMagic)} (base ${magicBase})
      </div>` : '';

    const bioSummary = bioware.length ? `
      <div style="display:flex;align-items:center;gap:8px;margin:6px 0 2px;font-size:11px;color:var(--sr-muted)">
        <span>Bio Index:</span>
        <span style="color:${bioOver ? 'var(--sr-red)' : 'var(--sr-text)'};font-weight:600">${totalBio}</span>
        <span>/</span>
        <span>${bioCap}</span>
      </div>
      ${bioAlert}
      ${magicAlert}` : '';

    return `<div class="tab ${this._activeTab === 'cyber' ? 'active' : ''}" data-tab="cyber" style="overflow-y:auto">
      ${vcrSlot}
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:6px 8px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r)">
        <span class="field-label" style="margin:0">Recoil Compensation</span>
        <input type="number" name="system.recoilCompensation" value="${sys.recoilCompensation ?? 0}" min="0" max="20" class="pool-input recoil-comp" style="width:50px"
               title="Recoil compensation from cyberware, bioware, shock pads etc. (weapon-mounted comp is set on the weapon)"/>
        <span style="font-size:11px;color:var(--sr-muted)">from cyber/bio sources — stacks with weapon-mounted compensation</span>
      </div>
      <h3 class="section-hdr">Cyberware</h3>
      <div class="list-header"><span>Name</span><span>Grade</span><span>Essence</span><span>Rating</span><span></span></div>
      ${cwRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="cyberware">+ Cyberware</button>
      <h3 class="section-hdr" style="margin-top:1rem">Bioware</h3>
      <div class="list-header"><span>Name</span><span>Grade</span><span>Bio Index</span><span>Rating</span><span></span></div>
      ${bwRows}
      ${bioSummary}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="bioware">+ Bioware</button>
    </div>`;
  }

  _tabMatrix(actor, sys) {
    if (game.settings.get('The2ndChumming3e', 'matrixRuleset') === 'orthodox') {
      return this._tabMatrixOrthodox(actor, sys);
    }
    const modes = SR3E.matrixUserModes ?? [
      { name: 'Terminal',                abbreviation: 'TRM',     initiative: 'default', description: 'Classic computer terminal or device interface.' },
      { name: 'Augmented Reality',       abbreviation: 'AR',      initiative: 'default', description: 'Holographic overlay on real world.' },
      { name: 'Virtual Reality Cold Sim',abbreviation: 'VR-Cold', initiative: 'default', description: 'Full immersion via standard datajack or trodes.' },
      { name: 'Virtual Reality Hot Sim', abbreviation: 'VR-Hot',  initiative: 'matrix',  description: 'Full immersion with heightened reflexes.' },
    ];

    const currentMode    = sys.matrixUserMode ?? '';
    const activeHostId   = sys.activeHostId ?? '';
    const activeHost     = activeHostId ? game.actors.get(activeHostId) : null;
    const equippedDeckId = sys.equippedCyberdeck ?? '';
    const deck           = equippedDeckId ? actor.items.get(equippedDeckId) : null;
    const decks          = actor.items.filter(i => i.type === 'cyberdeck' && !i.getFlag('The2ndChumming3e', 'stored')).sort((a, b) => a.name.localeCompare(b.name));
    const programs       = actor.items.filter(i => i.type === 'program'   && !i.getFlag('The2ndChumming3e', 'stored')).sort((a, b) => a.name.localeCompare(b.name));

    const vcrActive = game.actors?.some(a =>
      a.type === 'vehicle' && a.system?.driverActorId === actor.id && a.system?.controlMode === 'vcr'
    ) ?? false;
    const vrActive  = currentMode === 'VR-Cold' || currentMode === 'VR-Hot';

    // --- User mode buttons ---
    const modeButtons = modes.map(m => {
      const active = currentMode === m.abbreviation;
      return '<button type="button"' +
        ' class="sr-veh-mode-btn' + (active ? ' sr-veh-vcr-active' : '') + '"' +
        ' data-action="setMatrixMode" data-mode="' + m.abbreviation + '"' +
        ' title="' + m.description + '">' + m.abbreviation + '</button>';
    }).join('');

    // --- Cyberdeck list rows ---
    const deckRows = decks.map(d => {
      const isEquipped = d.id === equippedDeckId;
      const da = d.system.attributes ?? {};
      const equippedBadge = isEquipped ? ' <span style="color:var(--sr-accent);font-size:10px">● equipped</span>' : '';
      const btnStyle = isEquipped ? ' style="color:var(--sr-accent)"' : '';
      return `<div class="item-row" data-item-id="${d.id}">
        <span class="item-name">${d.name}${equippedBadge}</span>
        <span class="item-cell">MPCP ${da.mpcp?.base ?? 0}</span>
        <span class="item-cell">FW ${da.firewall?.base ?? 0}</span>
        <span class="item-cell">Resp ${da.response?.base ?? 0}</span>
        <div class="item-controls">
          <i class="fas fa-home" data-action="toggleStored" data-item-id="${d.id}"
             style="color:var(--sr-dim)" title="Put in storage"></i>
          <button type="button" class="btn-xs" data-action="equipCyberdeck" data-item-id="${d.id}"
                  title="${isEquipped ? 'Unequip' : 'Equip'}"${btnStyle}>${isEquipped ? '✓ Eq.' : 'Equip'}</button>
          <i class="fas fa-edit" data-action="itemEdit" data-item-id="${d.id}" title="Edit"></i>
          <i class="fas fa-trash" data-action="itemDelete" data-item-id="${d.id}" title="Delete"></i>
        </div>
      </div>`;
    }).join('');

    // --- Equipped deck stats + utility slots ---
    let deckStats = '';
    let utilitySlotSection = '';
    if (deck) {
      const da  = deck.system.attributes   ?? {};
      const ds  = deck.system.derivedStats  ?? {};
      const totalSlots  = da.mpcp?.base ?? 0;
      const burnedCount = (deck.system.utilitySlotsArray ?? []).filter(s => s.burned).length;
      const mcm = deck.system.damage?.matrixConditionMonitor ?? { boxes: 10, current: 0 };
      const mcmBoxes = Array.from({ length: mcm.boxes ?? 10 }, (_, i) => {
        const filled = (i + 1) <= (mcm.current ?? 0);
        return `<div class="${filled ? 'wound-box filled' : 'wound-box'}" style="width:14px;height:14px"></div>`;
      }).join('');

      const modeData    = modes.find(m => m.abbreviation === currentMode);
      const response    = da.response?.base ?? 0;
      const reactionVal = actor.system.derived?.initiative ?? actor.system.attributes?.reaction?.value ?? 0;
      const matrixBase  = reactionVal + (response * 2);
      const matrixDice  = 1 + response;
      const initDisplay = modeData?.initiative === 'matrix'
        ? `<span style="color:var(--sr-accent)">${matrixBase} + ${matrixDice}d6 (Matrix)</span>`
        : `${actor.system.derived?.initiative ?? 0} + ${actor.system.derived?.initiativeDice ?? 1}d6`;

      deckStats = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0 10px">
          <div class="derived-block"><span class="derived-label">MPCP</span><span class="derived-value">${da.mpcp?.base ?? 0}</span></div>
          <div class="derived-block"><span class="derived-label">Firewall</span><span class="derived-value">${da.firewall?.base ?? 0}</span></div>
          <div class="derived-block"><span class="derived-label">Response</span><span class="derived-value">${response}</span></div>
          <div class="derived-block"><span class="derived-label">Memory</span><span class="derived-value">${da.memory?.used ?? 0}/${da.memory?.total ?? 0} Mp</span></div>
          <div class="derived-block"><span class="derived-label">Slots</span><span class="derived-value">${totalSlots - burnedCount}/${totalSlots}</span></div>
          <div class="derived-block"><span class="derived-label">DTR</span><span class="derived-value">${da.dataTransferRate?.value ?? 0} Mp/CT</span></div>
          <div class="derived-block"><span class="derived-label">Flux</span><span class="derived-value">${da.fluxRating?.value ?? 1}${da.fluxRating?.wireless ? ' ✦' : ''}</span></div>
          <div class="derived-block"><span class="derived-label">Hack Pool +</span><span class="derived-value">${ds.hackingPoolBonus ?? 0}</span></div>
          <div class="derived-block"><span class="derived-label">Matrix Init</span><span class="derived-value">${initDisplay}</span></div>
        </div>
        <div style="margin-bottom:10px">
          <span class="derived-label" style="display:block;margin-bottom:4px">Matrix CM</span>
          <div style="display:flex;gap:3px">${mcmBoxes}</div>
        </div>`;

      // Utility slots — slot count auto-derived from MPCP rating (totalSlots/burnedCount set above)
      const memTotal     = da.memory?.total ?? 0;
      const memUsed      = da.memory?.used  ?? 0;
      const memOver      = memUsed > memTotal && memTotal > 0;
      const memBarPct    = memTotal > 0 ? Math.min(100, Math.round(memUsed / memTotal * 100)) : 0;
      const memColor     = memOver ? 'var(--sr-red)' : 'var(--sr-accent)';
      const memTextColor = memOver ? 'var(--sr-red)' : 'var(--sr-green)';
      const storedSlots  = deck.system.utilitySlotsArray ?? [];

      const slotRows = Array.from({ length: totalSlots }, (_, i) => {
        const slotNum = i + 1;
        const entry   = storedSlots.find(s => s.slot === slotNum);
        const burned  = entry?.burned ?? false;
        const u       = entry?.utility ?? null;
        const maxRtg  = u?.rating ?? 0;
        const curRtg  = u?.currentRating ?? maxRtg;
        const degraded = u && curRtg < maxRtg;
        const ratingDisplay = degraded
          ? `<span style="color:var(--sr-amber)">${curRtg}/${maxRtg}</span>`
          : (maxRtg || '');
        const burnBtnStyle = burned ? 'background:var(--sr-red-bg);color:var(--sr-red)' : '';
        const rowOpacity   = burned ? 'opacity:0.45;' : '';
        const utilCell = u && !burned
          ? `<span class="item-name" style="flex:2">${u.name}</span>
             <span class="item-cell">${u.type || '—'}</span>
             <span class="item-cell">${ratingDisplay || '—'}</span>
             <span class="item-cell">${u.sizeMp ?? 0} Mp</span>
             <span class="item-cell" style="font-size:10px;color:var(--sr-amber)">${u.degradable ? '⚠ Deg.' : ''}</span>
             <div class="item-controls">
               <i class="fas fa-dice-d6 rollable" data-action="rollSlotProgram"
                  data-deck-id="${deck.id}" data-slot="${slotNum}"
                  title="Roll/Execute program (Shift: real dice)"></i>
               <button type="button" class="btn-xs" data-action="ejectSlot"
                       data-deck-id="${deck.id}" data-slot="${slotNum}"
                       style="color:var(--sr-red)" title="Eject program">✕</button>
             </div>`
          : `<span class="item-name" style="flex:2;color:var(--sr-dim);font-style:italic">
               ${burned ? '— burned —' : 'Drop program here…'}
             </span>
             <span class="item-cell"></span><span class="item-cell"></span>
             <span class="item-cell"></span><span class="item-cell"></span>
             <div class="item-controls"></div>`;
        return `<div class="item-row" style="${rowOpacity}cursor:${burned||!u?'default':'inherit'}"
                    data-slot-row data-slot="${slotNum}" data-deck-id="${deck.id}"
                    data-slot-burned="${burned}">
          <span class="item-cell" style="min-width:22px;color:var(--sr-muted)">${slotNum}</span>
          <button type="button" class="btn-xs" data-action="toggleBurnSlot"
                  data-deck-id="${deck.id}" data-slot="${slotNum}"
                  style="${burnBtnStyle}" title="${burned ? 'Unburn slot' : 'Mark slot as burned'}">
            ${burned ? '🔥' : '○'}
          </button>
          ${utilCell}
        </div>`;
      }).join('');

      const memBar = totalSlots > 0 ? `
        <div style="margin:4px 0 8px;padding:5px 8px;background:var(--sr-surface);border-radius:4px;font-size:12px">
          Memory: <strong style="color:${memTextColor}">${memUsed} / ${memTotal} Mp</strong>
          ${memOver ? ' <span style="color:var(--sr-red)">⚠ Over capacity</span>' : ''}
          <div style="height:4px;background:var(--sr-border);border-radius:2px;margin-top:4px">
            <div style="height:4px;border-radius:2px;width:${memBarPct}%;background:${memColor}"></div>
          </div>
        </div>` : '';

      utilitySlotSection = totalSlots > 0 ? `
        <h3 class="section-hdr" style="margin-top:0.8rem">Utility Slots — ${deck.name} (${totalSlots - burnedCount}/${totalSlots} slots)</h3>
        ${memBar}
        <div class="list-header"><span>#</span><span>Burn</span><span>Program</span><span>Type</span><span>Rtg</span><span>Size</span><span>Deg.</span><span></span></div>
        ${slotRows}` : `
        <h3 class="section-hdr" style="margin-top:0.8rem">Utility Slots — ${deck.name}</h3>
        <p class="empty-list">Set MPCP rating on the cyberdeck to enable slots.</p>`;
    }

    // --- Programs list (draggable into utility slots) ---
    const progRows = programs.length ? programs.map(p => `
      <div class="item-row" data-item-id="${p.id}" data-matrix-program-id="${p.id}"
           style="cursor:grab" title="Drag to install in a utility slot">
        <span class="item-name">${p.name}</span>
        <span class="item-cell">${p.system.type || '—'}</span>
        <span class="item-cell">${p.system.category || '—'}</span>
        <span class="item-cell">${p.system.rating ?? 0}</span>
        <span class="item-cell">${p.system.sizeMp ?? 0} Mp</span>
        <span class="item-cell">${p.system.degradable ? '⚠ Deg.' : ''}</span>
        ${this._itemControls(p.id, true, 'rollProgram', false)}
      </div>`).join('') : '<p class="empty-list">No programs.</p>';

    const conflictBanner = '';
    const modeDesc = currentMode
      ? `<div style="font-size:11px;color:var(--sr-muted);margin-bottom:10px">${modes.find(m => m.abbreviation === currentMode)?.description ?? ''}</div>`
      : '';
    const deckListHtml = decks.length
      ? `<div class="list-header"><span>Name</span><span>MPCP</span><span>FW</span><span>Resp</span><span></span></div>${deckRows}`
      : '<p class="empty-list">No cyberdecks.</p>';

    const inMatrix = vrActive || currentMode === 'TRM' || currentMode === 'AR';
    const hackSpent = sys.hackingPoolSpent ?? 0;
    const matrixInitBtn = (currentMode === 'VR-Hot' || currentMode === 'VR-Cold') ? `
      <button type="button" class="btn-roll" data-action="rollInitiative"
              style="background:var(--sr-surface);border-color:var(--sr-accent);color:var(--sr-accent)"
              title="Roll Matrix Initiative (Shift: physical dice)">⚡ Matrix Init</button>` : '';
    const refreshHackBtn = inMatrix && hackSpent > 0 ? `
      <button type="button" class="btn-sm" data-action="refreshHackingPool"
              title="Reset hacking pool to full">↺ Hack Pool</button>` : '';
    const inVR = currentMode === 'VR-Hot' || currentMode === 'VR-Cold';
    const dumpshockBtn = inVR ? `
        <button type="button" class="btn-roll" data-action="rollDumpshock"
                style="background:var(--sr-surface);border-color:var(--sr-amber);color:var(--sr-amber)"
                title="Trigger dumpshock (GM use — e.g. reboot, disconnect, power loss)">⚡ Dumpshock</button>` : '';
    const cybercombatBtn = inMatrix ? `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <button type="button" class="btn-roll" data-action="rollCybercombat"
                style="background:var(--sr-red-bg);border-color:var(--sr-red);color:var(--sr-red)"
                title="Initiate cybercombat against an IC actor">⚡ Cybercombat</button>
        <button type="button" class="btn-roll" data-action="rollHackingAction"
                style="background:var(--sr-surface);border-color:var(--sr-accent);color:var(--sr-accent)"
                title="Roll a hacking action against a host node (checks Security Threshold, may increment Overwatch)">🔓 Hacking Action</button>
        ${dumpshockBtn}
        ${matrixInitBtn}
        ${refreshHackBtn}
      </div>` : '';

    const hostBadge = activeHost
      ? `<button type="button" data-action="openHost" data-actor-id="${activeHost.id}"
               style="font-size:11px;color:var(--sr-accent);margin-left:6px;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline"
               title="Open host sheet">📡 ${activeHost.name}</button>`
      : (currentMode ? `<span style="font-size:11px;color:var(--sr-amber);margin-left:6px">⚠ No host selected</span>` : '');

    // ── Node tracking ─────────────────────────────────────────────────────────
    const currentNodeId = sys.currentMatrixNode ?? '';
    const matrixMarks   = Array.isArray(sys.matrixMarks) ? sys.matrixMarks : [];
    const linkLocked    = sys.linkLocked ?? false;
    const hostNodes     = activeHost ? (activeHost.system.nodes ?? []) : [];
    const currentNode   = hostNodes.find(n => n.id === currentNodeId) ?? null;

    const nodeOpts = hostNodes.map(n =>
      `<option value="${n.id}" ${n.id === currentNodeId ? 'selected' : ''}>${n.abbreviation ?? n.type ?? n.name}</option>`
    ).join('');

    const markChips = matrixMarks.map(nid => {
      const node  = hostNodes.find(n => n.id === nid);
      const label = node?.abbreviation ?? nid.substring(0, 6);
      return `<span title="${node?.name ?? nid}" style="display:inline-flex;align-items:center;gap:3px;background:var(--sr-green-bg);color:var(--sr-green);border-radius:3px;padding:1px 6px;font-size:11px;font-weight:600">
        ✓ ${label}
        <button type="button" data-action="removeMatrixMark" data-node-id="${nid}"
                style="background:none;border:none;cursor:pointer;color:var(--sr-muted);padding:0;margin-left:2px;line-height:1;font-size:10px">✕</button>
      </span>`;
    }).join('');

    let nodePromptsHtml = '';
    if (currentNode && activeHost) {
      const prompts = currentNode.prompts ?? [];
      const promptRows = prompts.map(p => {
        const marked    = matrixMarks.includes(currentNode.id);
        const needsMark = p.requiresMark && !marked;
        const rowStyle  = needsMark ? 'opacity:0.55' : '';
        const lockNote  = needsMark ? ' <span style="font-size:9px;color:var(--sr-amber)">(needs mark)</span>' : '';
        const owBadge   = p.overwatchOnFail ? '<span style="font-size:9px;color:var(--sr-amber);font-weight:600">OW↑</span>' : '<span></span>';
        const accessBadge = p.grantsAccess ? '<span style="font-size:9px;color:var(--sr-green);font-weight:600">+mark</span>' : '<span></span>';
        const promptJson  = JSON.stringify(p).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        return `<div class="item-row" style="${rowStyle}">
          <span class="item-name">${p.name}${lockNote}</span>
          <span class="item-cell" style="font-size:10px;color:var(--sr-muted)">${p.test ?? ''}</span>
          <span class="item-cell">${owBadge}</span>
          <span class="item-cell">${accessBadge}</span>
          <div class="item-controls">
            <button type="button" class="btn-xs" data-action="useNodePrompt"
                    data-node-id="${currentNode.id}"
                    data-prompt="${promptJson}"
                    title="${(p.description ?? p.name).replace(/"/g, '&quot;')}">Use</button>
          </div>
        </div>`;
      }).join('');
      nodePromptsHtml = `
        <h3 class="section-hdr" style="margin-top:0.8rem">Prompts — ${currentNode.abbreviation ?? currentNode.name}</h3>
        <div class="list-header"><span>Action</span><span>Test</span><span>OW</span><span>Mark</span><span></span></div>
        ${promptRows || '<p class="empty-list">No prompts defined for this node.</p>'}`;
    }

    const nodeTrackingHtml = activeHost ? `
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:6px 0">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px">
          Node:
          <select name="system.currentMatrixNode" style="min-width:110px">
            <option value="">— none —</option>
            ${nodeOpts}
          </select>
        </label>
        <label style="display:flex;align-items:center;gap:4px;font-size:12px">
          <input type="checkbox" name="system.linkLocked" ${linkLocked ? 'checked' : ''}>
          🔒 Link-Locked
        </label>
        <button type="button" class="btn-xs" data-action="addMatrixMark" title="Manually add a mark to a node">+ Mark</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
        ${markChips || '<span style="font-size:11px;color:var(--sr-muted)">No marks</span>'}
      </div>
      ${nodePromptsHtml}` : '';

    return `<div class="tab ${this._activeTab === 'matrix' ? 'active' : ''}" data-tab="matrix" style="overflow-y:auto">
      ${conflictBanner}
      <h3 class="section-hdr">User Mode</h3>
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px">
        <div class="sr-veh-modes" style="flex-wrap:wrap;gap:6px;margin:0">${modeButtons}</div>
        ${hostBadge}
      </div>
      ${modeDesc}
      ${nodeTrackingHtml}
      ${cybercombatBtn}
      <h3 class="section-hdr" style="margin-top:0.8rem">Cyberdecks</h3>
      ${deckListHtml}
      ${deck ? deckStats : ''}
      ${utilitySlotSection}
      <h3 class="section-hdr" style="margin-top:1rem">Programs</h3>
      <div class="list-header"><span>Name</span><span>Type</span><span>Category</span><span>Rtg</span><span>Size</span><span>Deg.</span><span></span></div>
      ${progRows}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button type="button" class="btn-add" data-action="itemCreate" data-type="cyberdeck">+ Add Cyberdeck</button>
        <button type="button" class="btn-add" data-action="itemCreate" data-type="program">+ Add Program</button>
      </div>
      ${this._riggerEWBlock(sys)}
    </div>`;
  }

  // Rigger Electronic-Warfare deck stats (Flux / Footprint dice on the vehicle side).
  // Display + edit only — the Signal Monitor and ECM/ECCM live on the controlled vehicle.
  _riggerEWBlock(sys) {
    const ew = sys.ew ?? {};
    const _f = (key, label, title) => `
      <label class="derived-block" title="${title}" style="cursor:text">
        <span class="derived-label">${label}</span>
        <input type="number" name="system.ew.${key}" value="${ew[key] ?? 0}" min="0"
               class="derived-value" style="width:100%;text-align:center;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:3px"/>
      </label>`;
    const ivis = ew.ivisPool ?? {};
    const ivisVal = ivis.value ?? 0;
    const ivisMax = ivis.max ?? 0;
    return `
      <h3 class="section-hdr" style="margin-top:1rem">Rigger — Electronic Warfare</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0">
        ${_f('deckRating',     'Deck',     'Remote-control deck rating — the TN an intruder rolls against your network')}
        ${_f('fluxRating',     'Flux',     'Deck Flux — broadcast range + complementary dice (min Flux, skill) in MIJI')}
        ${_f('protocolModule', 'Protocol', 'Protocol-emulation module rating — defender TN for Meaconing/Intrusion/Interference')}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0">
        <button type="button" class="btn-sm" data-action="ivisTest" title="BattleTac IVIS Test — Small Unit Tactics vs TN 5 (R3 p.96)">📶 IVIS Test</button>
        <span style="font-size:12px">IVIS Pool: <strong>${ivisVal}</strong> / ${ivisMax}</span>
        <button type="button" class="btn-xs" data-action="ivisSpend" ${ivisVal > 0 ? '' : 'disabled'} title="Spend 1 IVIS Pool die">−1</button>
        <button type="button" class="btn-xs" data-action="ivisClear" ${ivisMax > 0 ? '' : 'disabled'} title="Expire the IVIS Pool (task complete / new task)">Clear</button>
      </div>
      <div style="font-size:11px;color:var(--sr-muted)">Electronics (Electronic Warfare) skill drives all MIJI rolls. ECM/ECCM and the Signal Monitor live on the controlled vehicle. The IVIS Pool is shared by the drone group and refreshes each Combat Turn.</div>`;
  }

  // ── Orthodox SR3 Matrix Tab ─────────────────────────────────────────────────

  _tabMatrixOrthodox(actor, sys) {
    const deck     = sys.orthodoxDeck    ?? {};
    const run      = sys.orthodoxRunState ?? {};
    const intl     = sys.attributes?.intelligence?.value ?? 0;
    const reaction = sys.attributes?.reaction?.value ?? 0;

    const mccp     = deck.mccp     ?? 0;
    const masking  = deck.masking  ?? 0;
    const sleaze   = deck.sleazeRating ?? 0;
    const resp     = deck.responseIncrease ?? 0;

    // Derived
    const hackingPool    = mccp > 0 ? Math.floor((intl + mccp) / 3) : 0;
    const detectFactor   = sleaze > 0
      ? Math.ceil((masking + sleaze) / 2)
      : Math.ceil(masking / 2);
    const matrixReaction = reaction + resp * 2;
    const initDice       = 1 + resp;

    // Validation hints
    const personaTotal  = (deck.bod ?? 0) + (deck.evasion ?? 0) + (deck.masking ?? 0) + (deck.sensor ?? 0);
    const personaMax    = mccp * 3;
    const respMax       = mccp > 0 ? Math.floor(mccp / 4) : 0;
    const personaWarn   = mccp > 0 && personaTotal > personaMax
      ? `<span style="color:var(--sr-red);font-size:10px"> Total exceeds MPCP×3 (${personaMax})</span>` : '';
    const respWarn      = mccp > 0 && resp > respMax
      ? `<span style="color:var(--sr-red);font-size:10px"> Exceeds MPCP÷4 (${respMax})</span>` : '';

    // Run state
    const alertLevel  = run.alertLevel ?? 'none';
    const tally       = run.securityTally ?? 0;
    const hostId      = run.currentHostId ?? '';
    const currentHost = hostId ? game.actors.get(hostId) : null;
    const hostBadge   = currentHost
      ? `<span style="color:var(--sr-accent);font-size:11px">📡 ${currentHost.name}</span>`
      : `<span style="font-size:11px;color:var(--sr-muted)">Not logged in</span>`;

    const alertColors = { none: 'var(--sr-muted)', passive: 'var(--sr-amber)', active: 'var(--sr-red)' };
    const alertLabels = { none: 'No Alert', passive: 'Passive Alert', active: 'Active Alert' };
    const alertBtns   = ['none', 'passive', 'active'].map(lvl => {
      const active = alertLevel === lvl;
      return `<button type="button" class="sr-veh-mode-btn${active ? ' sr-veh-vcr-active' : ''}"
        style="${active ? `background:${alertColors[lvl]};color:#111` : ''}"
        data-action="setOrthoAlertLevel" data-level="${lvl}">${alertLabels[lvl]}</button>`;
    }).join('');

    const _stat = (label, name, val, title = '') => `
      <label class="derived-block" title="${title}">
        <span class="derived-label">${label}</span>
        <input type="number" name="system.orthodoxDeck.${name}" value="${val}" min="0"
               class="derived-value" style="width:100%;text-align:center;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:3px"/>
      </label>`;

    const _persona = (label, name, val) => _stat(label, name, val, `Persona program — max ${mccp} (MPCP Rating). Total of all four persona programs may not exceed MPCP×3.`);

    return `<div class="tab ${this._activeTab === 'matrix' ? 'active' : ''}" data-tab="matrix" style="overflow-y:auto">
      <h3 class="section-hdr" style="display:flex;align-items:center;justify-content:space-between;">
        <span>Cyberdeck</span>
        <button type="button" class="btn-xs" data-action="addOrthodoxCyberdeck"
          title="Pick a cyberdeck from the Orthodox SR3 compendium and load its stats">
          📦 Browse Cyberdecks
        </button>
      </h3>
      <div style="margin-bottom:6px">
        <label style="font-size:12px;display:flex;align-items:center;gap:6px">
          <span style="color:var(--sr-muted);min-width:80px">Model</span>
          <input type="text" name="system.orthodoxDeck.deckModel" value="${deck.deckModel ?? ''}"
                 style="flex:1;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:3px;padding:2px 4px;color:var(--sr-text)">
        </label>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px">
        ${_stat('MPCP', 'mccp', mccp, 'Master Persona Control Program — central cyberdeck rating. Persona programs may not exceed this value individually; total may not exceed MPCP×3.')}
        ${_stat('Hardening', 'hardening', deck.hardening ?? 0, 'Reduces Power of Black IC damage by this amount. Also raises TN for Gray IC Attack Tests by 1 per point of Hardening.')}
        ${_stat('Act. Mem', 'activeMemory', deck.activeMemory ?? 0, 'Active Memory (Mp) — limits utility programs loaded simultaneously. 1 Mp per Mp of utility rating.')}
        ${_stat('Store Mem', 'storageMemory', deck.storageMemory ?? 0, 'Storage Memory (Mp) — total storage for all programs.')}
        ${_stat('I/O Speed', 'ioSpeed', deck.ioSpeed ?? 0, 'Upload/download rate in Mp per Combat Turn.')}
        ${_stat('Response', 'responseIncrease', resp, `Response Increase — each point adds +2 to Reaction and +1d6 to initiative. Max 3; max = MPCP÷4 (${respMax}).`)}
      </div>
      <h3 class="section-hdr">Persona Programs${personaWarn}</h3>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px">
        ${_persona('Bod', 'bod', deck.bod ?? 0)}
        ${_persona('Evasion', 'evasion', deck.evasion ?? 0)}
        ${_persona('Masking', 'masking', masking)}
        ${_persona('Sensor', 'sensor', deck.sensor ?? 0)}
      </div>
      <div style="font-size:11px;color:var(--sr-muted);margin-bottom:8px">
        Persona total: <strong>${personaTotal}</strong> / ${personaMax} (MPCP×3) — no single program may exceed MPCP (${mccp}).
      </div>

      <h3 class="section-hdr">Utilities (Active)</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:6px">
        ${_stat('Sleaze', 'sleazeRating', sleaze, 'Sleaze utility rating — raises your Detection Factor: ⌈(Masking + Sleaze) ÷ 2⌉. A Deception program by any other name.')}
      </div>
      ${this._orthodoxProgramList(actor, sys)}

      <h3 class="section-hdr">Derived Stats</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
        <div class="derived-block" title="Hacking Pool = ⌊(Intelligence + MPCP) ÷ 3⌋. Adds to any System Test, attack or defence test, or manoeuvre test.">
          <span class="derived-label">Hacking Pool</span>
          <span class="derived-value">${hackingPool}</span>
        </div>
        <div class="derived-block" title="Detection Factor = ⌈(Masking + Sleaze) ÷ 2⌉ (or ½ Masking if no Sleaze). The host rolls its Security Value dice vs this TN.">
          <span class="derived-label">Detect. Factor</span>
          <span class="derived-value">${detectFactor}</span>
        </div>
        <div class="derived-block" title="Matrix Initiative = (Reaction + Response×2) + (1 + Response)d6. Wired reflexes and other physical enhancements do not apply.">
          <span class="derived-label">Matrix Init.</span>
          <span class="derived-value">${matrixReaction} + ${initDice}d6</span>
        </div>
      </div>
      ${resp > 0 ? `<div style="font-size:11px;color:var(--sr-muted);margin-bottom:8px">
        Response Increase ${resp}: Reaction ${reaction} + ${resp * 2} = ${matrixReaction}; ${initDice}d6 initiative dice${respWarn}
      </div>` : ''}

      <h3 class="section-hdr">Current Run</h3>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        ${hostBadge}
        <button type="button" class="btn-xs" data-action="setOrthoHost" title="${currentHost ? 'Change linked host' : 'Link to a host actor'}">
          ${currentHost ? '⇄ Change' : '📡 Set Host'}
        </button>
        ${currentHost ? `<button type="button" class="btn-xs" data-action="clearOrthoHost" title="Disconnect from host (log off)">✕ Log Off</button>` : ''}
        <label style="font-size:12px;display:flex;align-items:center;gap:6px">
          Security Tally:
          <input type="number" name="system.orthodoxRunState.securityTally" value="${tally}" min="0"
                 style="width:60px;text-align:center;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:3px;color:var(--sr-text)">
        </label>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        ${alertBtns}
      </div>
      <div style="font-size:11px;color:var(--sr-muted);margin-bottom:8px">
        The security tally accumulates as the host scores successes on Security Tests. Trigger steps (set by the GM on the Host sheet) activate IC and alerts. Passive Alert raises all subsystem ratings by 2.
      </div>

      <h3 class="section-hdr">Matrix Actions</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <button type="button" class="btn-roll" data-action="rollOrthodoxSystemTest"
                title="Run a System Test vs a host subsystem (Computer skill vs Subsystem Rating; host counter-rolls Security Value vs Detection Factor)"
                ${!currentHost ? 'disabled' : ''}>💻 System Test</button>
        <button type="button" class="btn-roll" data-action="rollOrthodoxCybercombat"
                title="Attack deployed IC on the current host (attack utility vs Cybercombat TN; IC soaks with Security Value)"
                ${!currentHost ? 'disabled' : ''}>⚔ Cybercombat</button>
      </div>
      ${!currentHost ? `<div style="font-size:11px;color:var(--sr-muted);margin-bottom:8px">Log on to a host to enable matrix actions.</div>` : ''}

      ${mccp > 0 ? this._orthodoxMatrixCMTrack(sys) : ''}

      ${this._riggerEWBlock(sys)}
    </div>`;
  }

  _orthodoxProgramList(actor, sys) {
    const programs = actor.items.filter(i => i.type === 'program');
    const memAvail = sys.orthodoxDeck?.activeMemory ?? 0;

    const CAT_LABELS = { utility: 'Utility', comms: 'Comms', attack: 'Attack', defense: 'Defense' };
    const CAT_COLORS = {
      utility:  'var(--sr-accent)',
      comms:    'var(--sr-muted)',
      attack:   'var(--sr-red)',
      defense:  'var(--sr-green)',
    };

    const memUsed = programs.reduce((sum, p) => {
      const r = p.system.rating ?? 0, m = p.system.multiplier ?? 0;
      return sum + (r * r * m);
    }, 0);
    const memOver = memAvail > 0 && memUsed > memAvail;

    const rows = programs.length
      ? programs.map(p => {
          const cat  = p.system.category ?? 'utility';
          const mult = p.system.multiplier ?? 0;
          const r    = p.system.rating ?? 0;
          const size = r > 0 ? r * r * mult : 0;
          return `
            <div class="item-row" data-item-id="${p.id}">
              <span class="item-name" style="cursor:pointer" data-action="itemEdit" data-item-id="${p.id}">${p.name}</span>
              <span class="item-cell" style="font-size:10px;color:${CAT_COLORS[cat] ?? 'var(--sr-muted)'}">
                ${CAT_LABELS[cat] ?? cat}
              </span>
              <span class="item-cell">
                <input type="number" class="odm-prog-rating" data-item-id="${p.id}"
                  value="${r}" min="0" max="20" title="Program rating"
                  style="width:38px;text-align:center;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:3px;color:var(--sr-text)">
              </span>
              <span class="item-cell" style="font-size:11px;color:var(--sr-muted);" title="Active memory used = Rating² × ${mult} Mp">
                ${size > 0 ? `${size} Mp` : `×${mult}`}
              </span>
              ${this._itemControls(p.id, false, null, false)}
            </div>`;
        }).join('')
      : `<p class="empty-list">No programs loaded.</p>`;

    const memBar = memAvail > 0
      ? `<div style="font-size:11px;margin-bottom:6px;${memOver ? 'color:var(--sr-red);font-weight:bold' : 'color:var(--sr-muted)'}">
           Active memory: <strong>${memUsed}</strong> / ${memAvail} Mp${memOver ? ' — OVER CAPACITY' : ' used'}
         </div>`
      : `<div style="font-size:11px;color:var(--sr-dim);margin-bottom:6px">Set Active Memory above to track capacity.</div>`;

    return `
      <div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <h3 class="section-hdr" style="margin:0">Loaded Programs</h3>
          <button type="button" class="btn-xs" data-action="addOrthodoxProgram"
            title="Add a program from the Orthodox SR3 compendium">
            + Browse Programs
          </button>
        </div>
        <div class="list-header">
          <span>Name</span>
          <span>Category</span>
          <span>Rating</span>
          <span>Mem (Mp)</span>
          <span></span>
        </div>
        ${rows}
        ${memBar}
      </div>`;
  }

  _orthodoxMatrixCMTrack(sys) {
    const cm    = sys.orthodoxMatrixCM?.value ?? 0;
    const max   = 10;
    const boxes = Array.from({ length: max }, (_, i) => {
      const n      = i + 1;
      const filled = n <= cm;
      const crash  = cm >= max;
      return `<div class="${filled ? 'wound-box filled' : 'wound-box'}${crash && filled ? ' wound-box-dead' : ''}"
        data-action="toggleOrthoMatrixCM" data-box="${n}"
        style="cursor:pointer;${filled && n === max ? 'outline:2px solid var(--sr-red);' : ''}"></div>`;
    }).join('');

    const crashBadge = cm >= max
      ? `<span style="color:var(--sr-red);font-size:11px;font-weight:bold;margin-left:8px">⚡ CRASHED — Dumpshock!</span>`
      : (cm >= 8 ? `<span style="color:var(--sr-amber);font-size:11px;margin-left:8px">+3 TN to all tests</span>`
        : cm >= 6 ? `<span style="color:var(--sr-amber);font-size:11px;margin-left:8px">+2 TN to all tests</span>`
        : cm >= 3 ? `<span style="color:var(--sr-amber);font-size:11px;margin-left:8px">+1 TN to all tests</span>` : '');

    return `
      <h3 class="section-hdr">Matrix Condition Monitor</h3>
      <div class="wound-track-container" style="margin-bottom:8px">
        <div class="wound-track">
          <span class="wound-track-label">Matrix CM</span>
          <div class="wound-boxes">${boxes}</div>
          ${crashBadge}
        </div>
        <div class="damage-buttons">
          <button type="button" class="damage-btn" data-action="toggleOrthoMatrixCM" data-amount="1"  title="Light (1 box)">L</button>
          <button type="button" class="damage-btn" data-action="toggleOrthoMatrixCM" data-amount="3"  title="Moderate (3 boxes)">M</button>
          <button type="button" class="damage-btn" data-action="toggleOrthoMatrixCM" data-amount="6"  title="Serious (6 boxes)">S</button>
          <button type="button" class="damage-btn" data-action="toggleOrthoMatrixCM" data-amount="10" title="Deadly — Crash">D</button>
          <button type="button" class="damage-btn damage-btn-heal" data-action="toggleOrthoMatrixCM" data-amount="-1" title="Heal 1 box">−</button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--sr-muted);margin-bottom:10px">
        Damage: 3/6/8/10 boxes = +1/+2/+3 TN or crash. Click boxes or use L/M/S/D buttons to apply damage.
      </div>`;
  }

  _tabGear(actor) {
    const gear  = actor.items.filter(i => i.type === 'gear'        && !i.getFlag('The2ndChumming3e', 'stored'));
    const ammo  = actor.items.filter(i => i.type === 'ammunition'  && !i.getFlag('The2ndChumming3e', 'stored'));
    const drugs = actor.items.filter(i => i.type === 'drug'        && !i.getFlag('The2ndChumming3e', 'stored'));

    const gRows = gear.length ? gear.map(g => `
      <div class="item-row" data-item-id="${g.id}">
        <span class="item-name">${g.name}</span>
        <span class="item-cell">×${g.system.quantity ?? 1}</span>
        <span class="item-cell">${g.system.cost ?? 0}¥</span>
        <span class="item-cell col-xs">${g.system.weight ?? 0}</span>
        ${this._itemControls(g.id, false, 'rollWeapon', false)}
      </div>`).join('') : '<p class="empty-list">No gear.</p>';

    const aRows = ammo.length ? ammo.map(a => {
      const typeLabel = SR3E.ammoTypes[a.system.ammoType ?? 'regular']?.label ?? 'Regular';
      const mech      = a.system.loadMechanism ?? 'c';
      return `
      <div class="item-row" data-item-id="${a.id}">
        <span class="item-name">${a.name}</span>
        <span class="item-cell">${typeLabel}</span>
        <span class="item-cell" title="${SR3E.ammoLoadMechanisms[mech] ?? mech}">${mech}</span>
        <span class="item-cell">${this._ammoStockCell(a)}</span>
        ${this._itemControls(a.id, false, 'rollWeapon', false)}
      </div>`;
    }).join('') : '<p class="empty-list">No ammunition.</p>';

    const dRows = drugs.length ? drugs.map(d => `
      <div class="item-row" data-item-id="${d.id}">
        <span class="item-name" title="${d.system.category ?? ''}">${d.name}</span>
        <span class="item-cell">${d.system.category ?? '-'}</span>
        <span class="item-cell">${d.system.addiction || '-'}</span>
        <span class="item-cell">${d.system.cost ?? 0}¥</span>
        ${this._itemControls(d.id, false)}
      </div>`).join('') : '<p class="empty-list">No drugs or toxins.</p>';

    return `<div class="tab ${this._activeTab === 'gear' ? 'active' : ''}" data-tab="gear" style="overflow-y:auto">
      <h3 class="section-hdr">Gear</h3>
      <div class="list-header"><span>Name</span><span>Qty</span><span>Cost</span><span class="col-xs" title="Weight (kg)">KG</span><span></span></div>
      ${gRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="gear">+ Add Gear</button>
      <h3 class="section-hdr" style="margin-top:1rem">Ammunition</h3>
      <div class="list-header"><span>Name</span><span>Type</span><span>Load</span><span>Stock</span><span></span></div>
      ${aRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="ammunition">+ Add Ammunition</button>
      <h3 class="section-hdr" style="margin-top:1rem">Drugs &amp; Toxins</h3>
      <div class="list-header"><span>Name</span><span>Category</span><span>Addiction</span><span>Cost</span><span></span></div>
      ${dRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="drug">+ Add Drug</button>
    </div>`;
  }

  _tabMagic(actor, sys) {
    const isAwakened = (sys.attributes?.magic?.base ?? 0) > 0;
    const spells     = actor.items.filter(i => i.type === 'spell');

    if (!isAwakened) return `
      <div class="tab ${this._activeTab === 'magic' ? 'active' : ''}" data-tab="magic">
        <p class="empty-list">Character is not Awakened (Magic attribute is 0).</p>
      </div>`;

    const d          = sys.derived ?? {};
    const mpAvail    = d.availableSpellPool ?? d.spellPool ?? 0;
    const mpTotal    = d.spellPool ?? 0;

    // Magic identity
    const tradition   = sys.magicTradition ?? '';
    const magicType   = sys.magicType      ?? '';
    const magicTotem  = sys.magicTotem     ?? '';
    const magicElement = sys.magicElement  ?? '';

    const typeEntry  = SR3E.magicTypes.find(t => t.name === magicType);
    // No type set → no restriction; otherwise derive from astral field
    const astralCap  = magicType ? (typeEntry?.astral ?? '') : 'projection';
    const canProject = astralCap === 'projection';
    const canPerceive = astralCap === 'projection' || astralCap === 'perception';

    const typeOptions = SR3E.magicTypes
      .filter(t => !tradition || t.traditions.includes(tradition))
      .map(t => `<option value="${t.name}" ${magicType === t.name ? 'selected' : ''}>${t.name}</option>`)
      .join('');

    const totemOptions = `
      <optgroup label="Totems">
        ${SR3E.magicTotems.map(t => `<option value="${t}" ${magicTotem === t ? 'selected' : ''}>${t}</option>`).join('')}
      </optgroup>
      <optgroup label="Loa">
        ${SR3E.magicLoa.map(l => `<option value="${l}" ${magicTotem === l ? 'selected' : ''}>${l}</option>`).join('')}
      </optgroup>`;

    const elementOptions = SR3E.magicElements
      .map(e => `<option value="${e}" ${magicElement === e ? 'selected' : ''}>${e}</option>`)
      .join('');

    const magicIdentityBlock = `
      <div style="margin-bottom:12px;padding:8px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r)">
        <div style="font-size:11px;color:var(--sr-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Magic Identity</div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px">Tradition
            <select name="system.magicTradition" id="sr-magic-tradition" style="font-size:12px">
              <option value="">—</option>
              <option value="Shamanic" ${tradition === 'Shamanic' ? 'selected' : ''}>Shamanic</option>
              <option value="Hermetic" ${tradition === 'Hermetic' ? 'selected' : ''}>Hermetic</option>
              <option value="Somatic"  ${tradition === 'Somatic'  ? 'selected' : ''}>Somatic</option>
            </select>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px">Type
            <select name="system.magicType" id="sr-magic-type" style="font-size:12px">
              <option value="">—</option>
              ${typeOptions}
            </select>
          </label>
          <div class="sr-magic-totem-wrap" style="display:${tradition === 'Shamanic' ? 'flex' : 'none'};align-items:center">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px">Totem / Loa
              <select name="system.magicTotem" id="sr-magic-totem" style="font-size:12px">
                <option value="">—</option>
                ${totemOptions}
              </select>
            </label>
          </div>
          <div class="sr-magic-element-wrap" style="display:${magicType === 'Elementalist' ? 'flex' : 'none'};align-items:center">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px">Element
              <select name="system.magicElement" id="sr-magic-element" style="font-size:12px">
                <option value="">—</option>
                ${elementOptions}
              </select>
            </label>
          </div>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px" title="Used for fooling wards (Masking metamagic) and other Initiate-only effects.">
            Initiate Grade
            <input type="number" name="system.initiateGrade" value="${sys.initiateGrade ?? 0}" min="0" style="width:50px;font-size:12px"/>
          </label>
        </div>
      </div>`;

    const astralMode = sys.astralMode ?? '';
    const astralModes = [
      { label: 'Physical Plane', value: 'physical', title: 'Active on the physical plane only.',              show: true        },
      { label: 'Dual Natured',   value: 'dual',     title: 'Perceives both planes simultaneously.',          show: canPerceive },
      { label: 'Astral Plane',   value: 'astral',   title: 'Astrally projected — physical body is vulnerable.', show: canProject },
    ];
    const astralModeButtons = astralModes
      .filter(m => m.show)
      .map(m =>
        `<button type="button" class="btn-add${astralMode === m.value ? ' sr-astral-active' : ''}"
          data-action="setAstralMode" data-mode="${m.value}" title="${m.title}"
          style="width:auto;margin:0">${m.label}</button>`
      ).join('');

    const isConjurer = magicType === 'Conjurer';
    const isSorcerer = magicType === 'Sorcerer';
    const isAdept    = magicType === 'Adept';

    const _spellRow = s => `
      <div class="item-row" data-item-id="${s.id}">
        <span class="item-name">${s.name}</span>
        <span class="item-cell">${s.system.category || '—'}</span>
        <span class="item-cell">${s.system.type || '—'}</span>
        <span class="item-cell">${s.system.range || '—'}</span>
        <span class="item-cell">${s.system.target || '—'}</span>
        <span class="item-cell">${s.system.drain || '—'}</span>
        <span class="item-cell">
          <button type="button" class="btn-xs" data-action="rollSpell" data-item-id="${s.id}">Cast</button>
        </span>
        ${this._itemControls(s.id, false)}
      </div>`;

    // Spells have no damage code (power = Force, level chosen at cast); only the drain code is required.
    const completeSpells   = spells.filter(s => (s.system.drain ?? '') !== '');
    const incompleteSpells = spells.filter(s => (s.system.drain ?? '') === '');

    const sRows = completeSpells.length ? completeSpells.map(_spellRow).join('') : '<p class="empty-list">No spells.</p>';
    const incompleteSpellRows = incompleteSpells.map(_spellRow).join('');

    const summonings  = actor.items.filter(i => i.type === 'summoning');
    const summonRows  = summonings.length ? summonings.map(s => `
      <div class="item-row" data-item-id="${s.id}">
        <span class="item-name">${s.name}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">${s.system.spiritType?.replace(/_/g, ' ') || '—'}</span>
        <span class="item-cell">
          <button type="button" class="btn-xs" data-action="summonSpirit" data-item-id="${s.id}">Summon</button>
        </span>
        ${this._itemControls(s.id, false)}
      </div>`).join('') : '<p class="empty-list">No conjuring entries.</p>';

    return `<div class="tab ${this._activeTab === 'magic' ? 'active' : ''}" data-tab="magic" style="overflow-y:auto">
      ${magicIdentityBlock}
      <div style="margin-bottom:10px">
        <div style="font-size:11px;color:var(--sr-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Astral</div>
        <div style="display:flex;gap:4px;align-items:center">
          ${astralModeButtons}
          <div style="margin-left:auto;display:flex;gap:4px">
            <button type="button" class="btn-add sr-btn-danger" data-action="rollAstralCombat"
                    style="width:auto;margin:0">Astral Combat</button>
            <button type="button" class="btn-add" data-action="rollAssensing"
                    style="width:auto;margin:0;border-style:solid;border-color:var(--sr-accent);color:var(--sr-accent)">Assensing</button>
            <button type="button" class="btn-add" data-action="castWard"
                    style="width:auto;margin:0;border-style:solid;border-color:var(--sr-border-hi);color:var(--sr-border-hi)">🛡 Cast Ward</button>
          </div>
        </div>
      </div>
      ${isAdept ? (() => {
        const powers  = actor.items.filter(i => i.type === 'adeptpower')
          .sort((a, b) => a.name.localeCompare(b.name));
        const ppUsed  = Math.round(powers.reduce((sum, p) => {
          const cost  = p.system.powerCost ?? 0;
          const lvl   = p.system.hasLevels ? (p.system.level ?? 1) : 1;
          return sum + cost * lvl;
        }, 0) * 100) / 100;
        const ppTotal = actor.system.attributes?.magic?.value ?? 0;
        const ppOver  = ppUsed > ppTotal;
        const pwRows  = powers.length ? powers.map(p => {
          const lvl      = p.system.hasLevels ? (p.system.level ?? 1) : '—';
          const cost     = p.system.powerCost ?? 0;
          const totalCost = p.system.hasLevels ? Math.round(cost * (p.system.level ?? 1) * 100) / 100 : cost;
          return `
          <div class="item-row" data-item-id="${p.id}">
            <span class="item-name">${p.name}</span>
            <span class="item-cell">${cost}</span>
            <span class="item-cell">${lvl}</span>
            <span class="item-cell">${totalCost}</span>
            ${this._itemControls(p.id, false)}
          </div>`;
        }).join('') : '<p class="empty-list">No adept powers.</p>';
        return `
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
          <h3 class="section-hdr" style="margin:0">Adept Powers</h3>
          <span style="font-size:12px;color:${ppOver ? 'var(--sr-red)' : 'var(--sr-muted)'}">
            Power Points: <strong>${ppUsed} / ${ppTotal}</strong>
          </span>
        </div>
        ${ppOver ? `<div class="sr-alert sr-alert--danger" style="margin-bottom:6px">⚠ Power points exceed Magic rating</div>` : ''}
        <div class="list-header">
          <span>Power</span><span>Cost/Lvl</span><span>Level</span><span>Total</span><span></span>
        </div>
        ${pwRows}
        <button type="button" class="btn-add" data-action="itemCreate" data-type="adeptpower">+ Add Power</button>`;
      })() : `
      ${!isConjurer ? `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
        <h3 class="section-hdr" style="margin:0">Sorcery</h3>
        <span style="font-size:12px;color:var(--sr-muted)">
          Spell Pool: <strong>${mpAvail} / ${mpTotal}</strong>
        </span>
      </div>
      <div class="list-header">
        <span>Spell</span><span>Category</span><span>Type</span><span>Range</span>
        <span>Target</span><span>Drain</span><span>Cast</span><span></span>
      </div>
      ${sRows}
      ${incompleteSpells.length ? `
        <h3 class="section-hdr" style="margin-top:1rem;color:var(--sr-amber)">Incomplete (missing drain formula)</h3>
        <div class="list-header">
          <span>Spell</span><span>Category</span><span>Type</span><span>Range</span>
          <span>Target</span><span>Drain</span><span>Cast</span><span></span>
        </div>
        ${incompleteSpellRows}
      ` : ''}
      <div style="display:flex;gap:6px;margin-top:4px">
        <button type="button" class="btn-add" data-action="itemCreate" data-type="spell">+ Add Spell</button>
        <button type="button" class="btn-add" data-action="dispelSpell">✦ Dispel Spell</button>
      </div>
      ` : ''}
      ${!isSorcerer ? `
      <h3 class="section-hdr" style="margin-top:1.2rem">Conjuring</h3>
      <div class="list-header">
        <span>Name</span><span>Spirit Type</span><span>Summon</span><span></span>
      </div>
      ${summonRows}
      <div style="display:flex;gap:6px;margin-top:4px">
        <button type="button" class="btn-add" data-action="itemCreate" data-type="summoning">+ Add Conjuring</button>
        <button type="button" class="btn-add" data-action="banishSpirit">🌀 Banish Spirit</button>
      </div>
      ` : ''}
      `}
      ${this._magicNotesCard(magicType, magicTotem, magicElement)}
    </div>`;
  }

  _magicNotesCard(magicType, totem, element) {
    let entry = null;
    let label = '';

    if (totem) {
      entry = SR3E.magicLoaData[totem] ?? SR3E.magicTotemData[totem] ?? null;
      label = totem;
    } else if (magicType === 'Elementalist' && element) {
      entry = SR3E.magicElementData[element] ?? null;
      label = `${element} Elementalist`;
    }

    if (!entry) return '';

    return `
      <div style="margin-top:1.2rem;padding:10px 12px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);font-size:12px">
        <div style="font-size:11px;color:var(--sr-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">${label}</div>
        <div style="color:var(--sr-dim);margin-bottom:4px"><span style="color:var(--sr-muted)">Environment: </span>${entry.environment}</div>
        <div style="color:var(--sr-green);margin-bottom:4px"><span style="color:var(--sr-muted)">Advantages: </span>${entry.advantages}</div>
        <div style="color:var(--sr-red)"><span style="color:var(--sr-muted)">Disadvantages: </span>${entry.disadvantages}</div>
      </div>`;
  }

  _tabContacts(actor) {
    const contacts = actor.items.filter(i => i.type === 'contact').sort((a, b) => a.name.localeCompare(b.name));

    const rows = contacts.length ? contacts.map(c => {
      const loyalty    = c.system.loyalty ?? 1;
      const connection = c.system.connection ?? 1;
      const archetype  = c.system.archetype || '—';
      const dots = (val, max = 6) => Array.from({ length: max }, (_, i) =>
        `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 1px;background:${i < val ? 'var(--sr-gold,#c8a040)' : 'var(--sr-border)'};"></span>`
      ).join('');
      return `
        <div class="item-row" data-item-id="${c.id}">
          <span class="item-name">${c.name}</span>
          <span class="item-cell" style="font-size:11px;color:var(--sr-muted)">${archetype}</span>
          <span class="item-cell" title="Loyalty ${loyalty}/6">${dots(loyalty)}</span>
          <span class="item-cell" title="Connection ${connection}/6">${dots(connection)}</span>
          ${this._itemControls(c.id, false)}
        </div>`;
    }).join('') : '<p class="empty-list">No contacts. Add some below.</p>';

    return `<div class="tab ${this._activeTab === 'contacts' ? 'active' : ''}" data-tab="contacts" style="overflow-y:auto">
      <h3 class="section-hdr">Contacts</h3>
      <div class="list-header">
        <span>Name</span>
        <span>Archetype</span>
        <span>Loyalty</span>
        <span>Connection</span>
        <span></span>
      </div>
      ${rows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="contact">+ Add Contact</button>
    </div>`;
  }

  _tabVehicles(actor) {
    const vehicles = game.actors?.filter(a =>
      a.type === 'vehicle' && a.system?.driverActorId === actor.id
    ) ?? [];

    const statKeys = [
      ['handling', 'Hand'],
      ['speed',    'Spd'],
      ['body',     'Body'],
      ['armor',    'Arm'],
      ['pilot',    'Pilot'],
      ['sensor',   'Sens'],
    ];

    const rows = vehicles.map(vActor => {
      const actorId = vActor.id;
      const attr    = vActor.system?.attributes ?? {};

      const statsHtml = statKeys.map(([key, label]) => `
        <span class="sr-veh-stat">
          <span class="sr-veh-stat-label">${label}</span>
          <span class="sr-veh-stat-val">${attr[key]?.base ?? 0}</span>
        </span>`).join('');

      const mode       = vActor.system?.controlMode ?? '';
      const vcrActive  = mode === 'vcr';
      const rcdActive  = mode === 'rcd';
      const autoActive = !vcrActive && !rcdActive;

      return `
        <div class="sr-veh-row">
          <button type="button" class="sr-veh-name-btn" data-action="openVehicle" data-actor-id="${actorId}"
                  title="Open vehicle sheet">${vActor.name}</button>
          <div class="sr-veh-stats">${statsHtml}</div>
          <div class="sr-veh-modes">
            <button type="button" class="sr-veh-mode-btn${vcrActive ? ' sr-veh-vcr-active' : ''}"
                    data-action="toggleVehicleMode" data-actor-id="${actorId}" data-mode="vcr">VCR</button>
            <button type="button" class="sr-veh-mode-btn${rcdActive ? ' sr-veh-rcd-active' : ''}"
                    data-action="toggleVehicleMode" data-actor-id="${actorId}" data-mode="rcd">RCD</button>
            <button type="button" class="sr-veh-mode-btn${autoActive ? ' sr-veh-auto-active' : ''}"
                    data-action="toggleVehicleMode" data-actor-id="${actorId}" data-mode="auto">Auto</button>
          </div>
        </div>`;
    }).join('');

    return `<div class="tab ${this._activeTab === 'vehicles' ? 'active' : ''}" data-tab="vehicles" style="overflow-y:auto">
      ${vehicles.length === 0
        ? '<p class="empty-list">No assigned vehicles. Set pilot on the vehicle sheet.</p>'
        : `<div class="sr-veh-header">
            <span>Vehicle</span><span>Stats</span><span class="col-sm">Mode</span>
           </div>${rows}`}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button type="button" class="btn-add" data-action="createLinkVehicle">+ Create &amp; Assign</button>
      </div>
    </div>`;
  }

  _tabStored(actor) {
    const WEAPON_TYPES = new Set(['firearm', 'melee', 'projectile', 'thrown']);
    const CYBER_TYPES  = new Set(['cyberware', 'bioware', 'cyberdeck', 'program']);

    const stored  = actor.items.filter(i => i.getFlag('The2ndChumming3e', 'stored'));
    const weapons = stored.filter(i => WEAPON_TYPES.has(i.type));
    const armors  = stored.filter(i => i.type === 'armor');
    const gear    = stored.filter(i => i.type === 'gear' || i.type === 'ammunition');
    const cyber   = stored.filter(i => CYBER_TYPES.has(i.type));

    const _storeControls = id => `<div class="item-controls">
      <i class="fas fa-home" data-action="toggleStored" data-item-id="${id}"
         style="color:var(--sr-gold)" title="Remove from storage"></i>
      <i class="fas fa-edit" data-action="itemEdit"   data-item-id="${id}" title="Edit"></i>
      <i class="fas fa-trash" data-action="itemDelete" data-item-id="${id}" title="Delete"></i>
    </div>`;

    const wRows = weapons.map(i => `
      <div class="item-row" data-item-id="${i.id}">
        <span class="item-name">${i.name}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">${i.type}</span>
        <span class="item-cell col-xs">${i.system.damage || '—'}</span>
        ${_storeControls(i.id)}
      </div>`).join('');

    const aRows = armors.map(i => `
      <div class="item-row" data-item-id="${i.id}">
        <span class="item-name">${i.name}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">armor</span>
        <span class="item-cell">${i.system.ballistic ?? 0}B / ${i.system.impact ?? 0}I</span>
        ${_storeControls(i.id)}
      </div>`).join('');

    const gRows = gear.map(i => `
      <div class="item-row" data-item-id="${i.id}">
        <span class="item-name">${i.name}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">${i.type}</span>
        <span class="item-cell"></span>
        ${_storeControls(i.id)}
      </div>`).join('');

    const cRows = cyber.map(i => `
      <div class="item-row" data-item-id="${i.id}">
        <span class="item-name">${i.name}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">${i.type}</span>
        <span class="item-cell">${i.system.rating ? `Rtg ${i.system.rating}` : '—'}</span>
        ${_storeControls(i.id)}
      </div>`).join('');

    const sections = [
      weapons.length ? `
        <h3 class="section-hdr">Weapons</h3>
        <div class="list-header"><span>Name</span><span>Type</span><span class="col-xs" title="Damage">Dam.</span><span></span></div>
        ${wRows}` : '',
      armors.length ? `
        <h3 class="section-hdr" style="margin-top:0.8rem">Armor</h3>
        <div class="list-header"><span>Name</span><span>Type</span><span>Protection</span><span></span></div>
        ${aRows}` : '',
      gear.length ? `
        <h3 class="section-hdr" style="margin-top:0.8rem">Gear &amp; Ammunition</h3>
        <div class="list-header"><span>Name</span><span>Type</span><span></span><span></span></div>
        ${gRows}` : '',
      cyber.length ? `
        <h3 class="section-hdr" style="margin-top:0.8rem">Cyber &amp; Tech</h3>
        <div class="list-header"><span>Name</span><span>Type</span><span>Rating</span><span></span></div>
        ${cRows}` : '',
    ].filter(Boolean).join('');

    return `<div class="tab ${this._activeTab === 'stored' ? 'active' : ''}" data-tab="stored" style="overflow-y:auto">
      ${stored.length === 0
        ? `<p class="empty-list">Nothing in storage. Click the <i class="fas fa-home"></i> icon on any item to store it.</p>`
        : sections}
    </div>`;
  }

  _tabBio(sys) {
    return `<div class="tab ${this._activeTab === 'bio' ? 'active' : ''}" data-tab="bio" style="overflow-y:auto">
      <h3 class="section-hdr">Personal Information</h3>
      <div class="bio-fields">
        ${this._inlineField('Species', 'system.metatype', sys.metatype, 'text', 100)}
        ${this._inlineField('Age', 'system.age', sys.age, 'text', 60)}
        ${this._inlineField('Gender', 'system.gender', sys.gender, 'text', 70)}
        ${this._inlineField('Height', 'system.height', sys.height, 'text', 80)}
        ${this._inlineField('Weight', 'system.weight', sys.weight, 'text', 80)}
        ${this._inlineField('Ethnicity', 'system.ethnicity', sys.ethnicity, 'text', 120)}
      </div>
      
      <h3 class="section-hdr" style="margin-top:1rem">Resources</h3>
      <div class="bio-fields">
        ${this._inlineField('Nuyen (¥)', 'system.nuyen', sys.nuyen, 'number', 100)}
        ${this._inlineField('Karma', 'system.karma', sys.karma, 'number', 80)}
        <button type="button" class="btn-sm" data-action="spendKarmaCalculator" style="align-self:flex-end">Spend Karma…</button>
      </div>

      <h3 class="section-hdr" style="margin-top:1rem">Reputation</h3>
      <div class="rep-grid">
        ${this._inlineField('Street Cred', 'system.streetCred', sys.streetCred, 'number', 55)}
        ${this._inlineField('Notoriety', 'system.notoriety', sys.notoriety, 'number', 55)}
        ${this._inlineField('Reputation', 'system.reputation', sys.reputation, 'number', 55)}
        ${this._inlineField('Total Karma', 'system.totalKarma', sys.totalKarma, 'number', 55)}
      </div>
      
      <h3 class="section-hdr" style="margin-top:1rem">Notes</h3>
      ${this._bioField('Background', 'system.biography', sys.biography, 'No background set.')}
      ${this._bioField('Notes', 'system.notes', sys.notes, 'No notes.')}
    </div>`;
  }

  /**
   * Rich text field: read-only enriched display (@UUID links, inline rolls) with an Edit
   * toggle revealing the textarea. Enrichment is filled in `_onRender`.
   */
  _bioField(label, name, value, emptyText) {
    return `
      <label class="bio-label">${label}</label>
      <div class="bio-rich" data-empty="${emptyText}">
        <div class="bio-display"></div>
        <textarea name="${name}" class="bio-text" style="display:none">${value ?? ''}</textarea>
        <button type="button" class="btn-sm bio-edit-toggle" style="margin-top:4px">✎ Edit</button>
      </div>`;
  }

  _itemControls(itemId, hasRoll, rollAction = 'rollWeapon', stored = null, rollDisabled = false, reloadId = null) {
    const reloadIcon = reloadId ? `<i class="fas fa-arrows-rotate rollable" data-action="reloadWeapon" data-item-id="${reloadId}"
      title="Reload — load ammo from stock" style="cursor:pointer"></i>` : '';
    const storeIcon = stored !== null ? `<i class="fas fa-home" data-action="toggleStored" data-item-id="${itemId}"
      style="color:${stored ? 'var(--sr-gold)' : 'var(--sr-dim)'}"
      title="${stored ? 'Remove from storage' : 'Put in storage'}"></i>` : '';
    const rollIcon = !hasRoll ? ''
      : rollDisabled
        ? `<i class="fas fa-dice-d6" style="opacity:0.25;cursor:not-allowed;text-decoration:line-through" title="Out of ammo — reload / restock"></i>`
        : `<i class="fas fa-dice-d6 rollable" data-action="${rollAction}" data-item-id="${itemId}" title="Shift+Click to use Real Dice"></i>`;
    // Order: reload, dice, edit, house (store), trash
    return `<div class="item-controls">
      ${reloadIcon}
      ${rollIcon}
      <i class="fas fa-edit" data-action="itemEdit" data-item-id="${itemId}" title="Edit"></i>
      ${storeIcon}
      <i class="fas fa-trash" data-action="itemDelete" data-item-id="${itemId}" title="Delete"></i>
    </div>`;
  }

  /** True when a weapon is empty and ammo tracking is on (so its roll icon is disabled). */
  _weaponOutOfAmmo(w) {
    if (!game.settings.get('The2ndChumming3e', 'trackAmmo')) return false;
    if (w.type === 'firearm') return (w.system.loadedRounds ?? 0) <= 0;
    if (w._usesNockedAmmo?.()) return (w.system.loadedRounds ?? 0) <= 0;  // bows/crossbows
    return false; // thrown handled in its own row renderer
  }

  /** "Nocked" cell for a depleting bow/crossbow — shows the loaded arrow/bolt (capacity 1). */
  _bowNockedCell(w) {
    if (!(w._usesNockedAmmo?.())) return '—';
    const noun   = w._weaponLoadMechanism() === 'bolt' ? 'Bolt' : 'Arrow';
    const loaded = w.system.loadedRounds ?? 0;
    const color  = loaded <= 0 ? 'var(--sr-red)' : 'var(--sr-text)';
    return `<span style="color:${color}">${loaded > 0 ? noun : 'empty'}</span>`;
  }

  _meleeControls(itemId, isEquipped, isAwakened = false, isFocus = false, focusActive = false, stored = null) {
    const storeIcon = stored !== null ? `<i class="fas fa-home" data-action="toggleStored" data-item-id="${itemId}"
      style="color:${stored ? 'var(--sr-gold)' : 'var(--sr-dim)'}"
      title="${stored ? 'Remove from storage' : 'Put in storage'}"></i>` : '';
    // A LABELLED BUTTON, not a bare icon (TODO 46). Reported from the table as "not
    // showing" — and it always was, but unequipped it rendered as one more grey glyph in a
    // row of four to six (home, dice, fist, edit, trash, plus Focus?/Active?), with nothing
    // marking the single control that decides how the character fights. Matching the
    // btn-xs style already used by Focus?/Active? in this same row makes it read as
    // something you press, and the equipped state is stated in words rather than in a
    // colour shift that means nothing until you have seen both states side by side.
    // Back to the fist ICON, not a text button (TODO 46, revised after play).
    //
    // `.item-controls` is a 108px flex strip styled for icons — dropping a padded,
    // bordered btn-xs into it crowds the row and breaks the alignment. (Focus?/Active?
    // are btn-xs and predate this; matching them was the wrong model to copy.)
    //
    // The original problem still has to be solved though: unequipped, the fist was one
    // more grey glyph among five and nothing marked the control that decides how the
    // character fights. So the icon now carries its own affordance — a bordered pill,
    // accent-filled when equipped — which reads as a control at icon size instead of
    // relying on a colour shift you can only interpret having seen both states.
    const equipIcon = `<i class="fas fa-hand-rock sr-equip-melee${isEquipped ? ' is-equipped' : ''}"
         data-action="equipMelee" data-item-id="${itemId}"
         title="${isEquipped
           ? 'Equipped — this weapon defends you. Click to unequip.'
           : 'Equip as active melee weapon — this is the weapon that defends you.'}"></i>`;
    const focusBtns = isAwakened ? `
      <button type="button" class="btn-xs" data-action="toggleFocus" data-item-id="${itemId}"
              title="Is this a Weapon Focus?"
              style="${isFocus ? 'background:var(--sr-accent);color:#fff' : ''}">Focus?</button>
      ${isFocus ? `<button type="button" class="btn-xs" data-action="toggleFocusActive" data-item-id="${itemId}"
              title="Is this Focus currently active/bonded?"
              style="${focusActive ? 'background:var(--sr-green);color:#fff' : ''}">Active?</button>` : ''}
    ` : '';
    return `<div class="item-controls">
      ${storeIcon}
      ${focusBtns}
      <i class="fas fa-dice-d6 rollable" data-action="rollMelee" data-item-id="${itemId}" title="Melee attack"></i>
      ${equipIcon}
      <i class="fas fa-edit" data-action="itemEdit" data-item-id="${itemId}" title="Edit"></i>
      <i class="fas fa-trash" data-action="itemDelete" data-item-id="${itemId}" title="Delete"></i>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Instance event handlers                                             */
  /* ------------------------------------------------------------------ */

  async _onFieldChange(ev) {
    const el = ev.currentTarget;

    // Pool current input: value = available, writes spent = total - available
    if (el.classList.contains('pool-current-input')) {
      const spentField = el.dataset.spentField;
      const total      = parseInt(el.dataset.poolTotal) || 0;
      const newAvail   = Math.max(0, parseInt(el.value) || 0);
      const spent      = Math.max(0, total - newAvail);
      if (spentField) await this.actor.update({ [spentField]: spent });
      return;
    }

    // Pool total input: value = desired total, writes mod = total - base
    if (el.classList.contains('pool-total-input')) {
      const modField  = el.dataset.modField;
      const base      = parseInt(el.dataset.poolBase) || 0;
      const newTotal  = Math.max(0, parseInt(el.value) || 0);
      const mod       = newTotal - base;
      if (modField) await this.actor.update({ [modField]: mod });
      return;
    }

    const name  = el.name;
    const value = el.type === 'checkbox' ? el.checked
                : el.type === 'number'   ? (parseFloat(el.value) || 0)
                : el.value;
    if (!name) return;
    await this.actor.update({ [name]: value });
  }

  /* ------------------------------------------------------------------ */
  /*  Static action handlers                                              */
  /* ------------------------------------------------------------------ */

  static async _onSwitchTab(ev, target) {
    this._activeTab = target.dataset.tab;
    this.render();
  }

  static async _onRollAttr(ev, target) {
    const physicalDice = ev.shiftKey ?? false;
    const attr  = (target ?? ev.currentTarget).dataset.attr;
    const actor = this.actor;

    if (!actor.system)            actor.system = {};
    if (!actor.system.attributes) actor.system.attributes = {};

    actor.prepareDerivedData();

    let val = 0;
    try {
      if (attr === 'reaction') {
        const reaction = actor.system.attributes?.reaction ?? {};
        val = reaction.value;
        if (!val) {
          const quick = actor.system.attributes?.quickness?.base ?? 3;
          const intel = actor.system.attributes?.intelligence?.base ?? 3;
          val = Math.floor((quick + intel) / 2) + (reaction.bonus ?? 0);
        }
      } else {
        const attrData = actor.system.attributes?.[attr];
        if (attrData) {
          val = attrData.value ?? attrData.base ?? 3;
        } else {
          const defaults = {
            body: 3, quickness: 3, strength: 3, charisma: 3,
            intelligence: 3, willpower: 3, essence: 6, magic: 0
          };
          val = defaults[attr] || 3;
          actor.system.attributes[attr] = { base: val, value: val };
        }
      }
    } catch (e) {
      console.error(`SR3E | Error getting attribute ${attr}:`, e);
      val = 3;
    }

    if (!val || val < 1 || isNaN(val)) {
      console.warn(`SR3E | Attribute ${attr} has invalid value, using default`);
      val = 3;
    }

    const rollOptions = await SR3EActorSheet._promptRollOptions(actor, { defaultPool: val, rollAttr: attr, physicalDice });
    if (rollOptions) {
      const selectedAttr = rollOptions.selectedAttr ?? attr;
      const label = selectedAttr.charAt(0).toUpperCase() + selectedAttr.slice(1);
      await actor.rollPool(rollOptions.pool ?? val, rollOptions.tn, label, rollOptions);
    }
  }

  static async _onRollSkill(ev, target) {
    const itemId = (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    const physicalDice = ev.shiftKey ?? false;
    const rollOptions  = await SR3EActorSheet._promptSkillRollOptions(this.actor, item, { physicalDice });
    if (!rollOptions) return;
    const selectedItem = this.actor.items.get(rollOptions.selectedSkillId) ?? item;
    await selectedItem.rollSkill(rollOptions.tn, { ...rollOptions, pool: rollOptions.pool });
  }

  static async _onRollWeapon(ev, target) {
    const itemId = (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await item.rollWeapon({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onRollInitiative(ev) {
    await this.actor.rollInitiative({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onItemCreate(ev, target) {
    const type = (target ?? ev.currentTarget).dataset.type;
    const item = await Item.create({ name: `New ${type}`, type }, { parent: this.actor });
    item?.sheet?.render(true);
  }

  static async _onBrowseSkills(_ev, _target) {
    const allSkills = SR3E.skills;
    const actor     = this.actor;

    // Build flat indexed list: { name, category, attribute }
    const entries = [];
    for (const [cat, skills] of Object.entries(allSkills)) {
      for (const s of skills) {
        entries.push({ name: s.name, category: cat, attribute: s.linkedAttribute });
      }
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));

    const rowsHtml = entries.map((e, i) => {
      const attrLabel = e.attribute === 'lan' ? 'LAN'
        : e.attribute ? e.attribute.charAt(0).toUpperCase() + e.attribute.slice(1, 3)
        : '—';
      return `<div class="sk-row" data-idx="${i}"
          data-search="${e.name.toLowerCase()} ${e.category.toLowerCase()}"
          style="padding:4px 8px;cursor:pointer;border-bottom:1px solid var(--sr-border);display:flex;gap:6px;align-items:center">
          <span style="font-size:10px;color:var(--sr-muted);min-width:120px">[${e.category}]</span>
          <span style="flex:1">${e.name}</span>
          <span style="font-size:10px;color:var(--sr-accent)">${attrLabel}</span>
        </div>`;
    }).join('');

    let selectedIdx = null;

    // DialogV2.wait() does not call its render option — use the Foundry hook instead
    let hookId = Hooks.on('renderDialogV2', (app, html) => {
      if (!html.querySelector?.('#sk-filter')) return;
      Hooks.off('renderDialogV2', hookId);

      const filterInput = html.querySelector('#sk-filter');
      const idxInput    = html.querySelector('#sk-idx');
      const rows        = html.querySelectorAll('.sk-row');

      filterInput.addEventListener('input', () => {
        const v = filterInput.value.toLowerCase();
        rows.forEach(r => {
          r.style.display = (!v || r.dataset.search.includes(v)) ? '' : 'none';
        });
      });

      filterInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') e.preventDefault();
      });

      rows.forEach(r => {
        r.addEventListener('click', () => {
          rows.forEach(rr => rr.style.background = '');
          r.style.background = 'color-mix(in srgb,var(--sr-accent) 20%,transparent)';
          idxInput.value = r.dataset.idx;
        });
      });

      // Foundry's own ApplicationV2 focus-management runs after this hook fires and
      // steals focus back to the default button — defer ours to win that race.
      requestAnimationFrame(() => filterInput.focus());
    });

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Browse Skills' },
      content: `
        <div style="padding:4px 0">
          <input id="sk-filter" type="text" placeholder="Type to filter…"
                 style="width:100%;margin-bottom:6px"/>
          <div style="max-height:360px;overflow-y:auto;border:1px solid var(--sr-border);border-radius:var(--r)">
            ${rowsHtml}
          </div>
          <input type="hidden" id="sk-idx" value=""/>
        </div>`,
      buttons: [
        { label: 'Add to Character', action: 'add', default: true,
          callback: (_e, _b, d) => {
            const v = d.element.querySelector('#sk-idx')?.value;
            selectedIdx = v !== '' && v != null ? parseInt(v) : null;
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (selectedIdx == null || isNaN(selectedIdx)) return;
    const def = entries[selectedIdx];
    if (!def) return;

    const existing = actor.items.find(i => i.type === 'skill' && i.name === def.name);
    if (existing) {
      ui.notifications.warn(`${def.name} is already on this character.`);
      return;
    }

    const [created] = await actor.createEmbeddedDocuments('Item', [{
      name:   def.name,
      type:   'skill',
      system: {
        category:        def.category,
        skillType:       skillTypeForCategory(def.category),
        skillName:       def.name,
        linkedAttribute: def.attribute,
        rating:          1,
      },
    }]);
    created?.sheet?.render(true);
  }

  static _onItemEdit(ev, target) {
    const itemId = (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    item?.sheet?.render(true);
  }

  static async _onItemDelete(ev, target) {
    const itemId = (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Delete ${item.name}?` },
      content: `<p>Delete <strong>${item.name}</strong>? This cannot be undone.</p>`
    });
    
    if (confirmed) {
      if (this.actor.system.equippedArmor === itemId) {
        await this.actor.update({ "system.equippedArmor": "" });
      }
      if (this.actor.system.equippedMelee === itemId) {
        await this.actor.update({ "system.equippedMelee": "" });
      }
      await item.delete();
    }
  }

  static async _onWoundBox(ev, target) {
    const el    = target ?? ev.currentTarget;
    const { track, box } = el.dataset;
    const cur    = this.actor.system.wounds?.[track]?.value ?? 0;
    const newVal = cur === parseInt(box) ? parseInt(box) - 1 : parseInt(box);
    await this.actor.update({ [`system.wounds.${track}.value`]: newVal });
  }

  static async _onRollMelee(ev, target) {
    const itemId = (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await item.rollMelee({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onRollUnarmed(_ev, _target) {
    const SR3EItem = game.sr3e.SR3EItem;
    await SR3EItem.rollMeleeAttack(this.actor, SR3EItem._unarmedWeapon());
  }

  static async _onRollSpell(ev, target) {
    const itemId = (target ?? ev.currentTarget).closest('[data-item-id]')?.dataset.itemId
                ?? (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await item.rollSpell({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onDispelSpell(_ev, _target) {
    await this.actor.rollDispel();
  }

  static async _onBanishSpirit(_ev, _target) {
    await this.actor.rollBanish();
  }

  static async _onSummonSpirit(ev, target) {
    const itemId = (target ?? ev.currentTarget).closest('[data-item-id]')?.dataset.itemId
                ?? (target ?? ev.currentTarget).dataset.itemId;
    const item = this.actor.items.get(itemId);
    const defaultType = item?.system?.spiritType ?? 'earth_elemental';
    const { SR3ESpiritSummoning } = await import('../documents/SR3ESpiritSummoning.js');
    await SR3ESpiritSummoning.openSummonDialog(this.actor, defaultType);
  }

  static async _onResetAllPools(_ev, _target) {
    await this.actor.update({
      'system.combatPoolSpent': 0,
      'system.spellPoolSpent':  0,
      'system.astralPoolSpent': 0,
    });
  }

  static async _onRollAstralCombat(ev, _target) {
    await this.actor.rollAstralCombat({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onCastWard(_ev, _target) {
    await game.sr3e.SR3EWard.openCastDialog(this.actor);
  }

  static async _onRollAssensing(ev, _target) {
    const actor       = this.actor;
    const physicalDice = ev.shiftKey ?? false;
    const intVal      = actor.system.attributes?.intelligence?.value ?? 1;
    const rollOptions = await SR3EActorSheet._promptRollOptions(actor, {
      defaultPool: intVal,
      poolNote: 'Intelligence',
      physicalDice,
      rollAttr: 'intelligence',
    });
    if (!rollOptions) return;
    await actor.rollPool(rollOptions.pool ?? intVal, rollOptions.tn, 'Assensing', {
      ...rollOptions,
      isAssensingRoll: true,
    });
  }

  static async _onToggleFocus(_ev, target) {
    const itemId = target.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    const current = item.system.isFocus ?? false;
    await item.update({ 'system.isFocus': !current, 'system.focusActive': false });
  }

  static async _onToggleFocusActive(_ev, target) {
    const itemId = target.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await item.update({ 'system.focusActive': !(item.system.focusActive ?? false) });
  }

  static async _onToggleStored(_ev, target) {
    const actor  = this.actor;
    const itemId = target.dataset.itemId;
    const item   = actor.items.get(itemId);
    if (!item) return;

    const storing     = !item.getFlag('The2ndChumming3e', 'stored');
    const itemUpdates = { 'flags.The2ndChumming3e.stored': storing };
    const actorUpdates = {};

    if (storing) {
      const sys = actor.system;
      if (sys.equippedArmor     === itemId) actorUpdates['system.equippedArmor']     = '';
      if (sys.equippedMelee     === itemId) actorUpdates['system.equippedMelee']     = '';
      if (sys.activeVCRItemId   === itemId) actorUpdates['system.activeVCRItemId']   = '';
      if (sys.equippedCyberdeck === itemId) actorUpdates['system.equippedCyberdeck'] = '';
      if (item.system.focusActive) itemUpdates['system.focusActive'] = false;
    }

    const promises = [item.update(itemUpdates)];
    if (Object.keys(actorUpdates).length) promises.push(actor.update(actorUpdates));
    await Promise.all(promises);
  }

  static async _onEquipMelee(ev, target) {
    const actor  = this.actor;
    const itemId = target.dataset.itemId;
    const current = actor.system.equippedMelee;
    await actor.update({ 'system.equippedMelee': current === itemId ? '' : itemId });
  }

  static async _onEquipArmor(ev, target) {
    const actor = this.actor;
    const itemId = target.dataset.itemId;
    const currentEquipped = actor.system.equippedArmor;
    const newEquipped = (currentEquipped === itemId) ? "" : itemId;
    await actor.update({ "system.equippedArmor": newEquipped });
  }

  static async _onApplyDamage(ev, target) {
    const track  = target.dataset.track;
    const amount = parseInt(target.dataset.amount);
    const w      = this.actor.system.wounds ?? {};
    const updates = {};

    const trackCur = w[track]?.value ?? 0;
    const trackMax = w[track]?.max   ?? 10;
    const trackNew = Math.min(trackMax, trackCur + amount);
    let   spill    = (trackCur + amount) - trackMax; // boxes that didn't fit

    updates[`system.wounds.${track}.value`] = trackNew;

    if (spill > 0) {
      if (track === 'stun') {
        // Stun overflow cascades into physical
        const physCur = w.physical?.value ?? 0;
        const physMax = w.physical?.max   ?? 10;
        const physNew = Math.min(physMax, physCur + spill);
        spill = (physCur + spill) - physMax;
        updates['system.wounds.physical.value'] = physNew;
      }
      // Physical overflow (or stun→physical that also overflows) → overflow box
      if (spill > 0) {
        updates['system.wounds.overflow.value'] = (w.overflow?.value ?? 0) + spill;
      }
    }

    await this.actor.update(updates);
  }

  static async _onHealDamage(ev, target) {
    const track = target.dataset.track;
    const w     = this.actor.system.wounds ?? {};

    if (track === 'physical') {
      // Drain overflow before healing physical boxes (mirrors the damage cascade in reverse)
      const overflow = w.overflow?.value ?? 0;
      if (overflow > 0) {
        await this.actor.update({ 'system.wounds.overflow.value': overflow - 1 });
      } else {
        await this.actor.update({ 'system.wounds.physical.value': Math.max(0, (w.physical?.value ?? 0) - 1) });
      }
    } else {
      await this.actor.update({ [`system.wounds.${track}.value`]: Math.max(0, (w[track]?.value ?? 0) - 1) });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Cyber tab handlers                                                 */
  /* ------------------------------------------------------------------ */

  static async _onClearVCR(_ev, _target) {
    await this.actor.update({ 'system.activeVCRItemId': '' });
  }

  static async _onIvisTest(_ev, _target) {
    return game.sr3e.SR3EMIJI?.openIVIS(this.actor);
  }

  static async _onIvisSpend(_ev, _target) {
    const cur = this.actor.system.ew?.ivisPool?.value ?? 0;
    if (cur <= 0) return;
    await this.actor.update({ 'system.ew.ivisPool.value': cur - 1 });
  }

  static async _onIvisClear(_ev, _target) {
    await this.actor.update({ 'system.ew.ivisPool.value': 0, 'system.ew.ivisPool.max': 0 });
  }

  static async _onEquipCyberdeck(ev, target) {
    const actor = this.actor;
    let itemId = target.dataset.itemId;

    // If sentinel, read the select element in the tab
    if (itemId === '__select__') {
      const select = target.closest('.tab')?.querySelector('#sr-deck-select');
      itemId = select?.value ?? '';
    }
    const current = actor.system.equippedCyberdeck ?? '';
    await actor.update({ 'system.equippedCyberdeck': current === itemId ? '' : itemId });
  }

  static async _onSetOrthoAlertLevel(_ev, target) {
    const level   = target.dataset.level;
    const current = this.actor.system.orthodoxRunState?.alertLevel ?? 'none';
    await this.actor.update({ 'system.orthodoxRunState.alertLevel': current === level ? 'none' : level });
  }

  static async _onSetOrthoHost(_ev, _target) {
    const actor   = this.actor;
    const hosts   = game.actors.filter(a => a.type === 'host');
    if (!hosts.length) { ui.notifications.warn('No host actors found.'); return; }
    const opts    = hosts.map(h => `<option value="${h.id}">${h.name}</option>`).join('');
    let chosen    = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Log On To Host' },
      content: `<label style="display:flex;align-items:center;gap:8px;margin:8px 0">
        Host: <select id="ortho-host-sel" style="flex:1">${opts}</select>
      </label>`,
      buttons: [
        { label: 'Log On', action: 'ok', default: true,
          callback: (_e, _b, dlg) => { chosen = dlg.element.querySelector('#ortho-host-sel')?.value; } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!chosen) return;
    await actor.update({ 'system.orthodoxRunState.currentHostId': chosen, 'system.orthodoxRunState.securityTally': 0, 'system.orthodoxRunState.alertLevel': 'none' });
  }

  static async _onClearOrthoHost(_ev, _target) {
    await this.actor.update({ 'system.orthodoxRunState.currentHostId': '', 'system.orthodoxRunState.securityTally': 0, 'system.orthodoxRunState.alertLevel': 'none' });
  }

  static async _onRollOrthodoxSystemTest(_ev, _target) {
    await this.actor.rollOrthodoxSystemTest();
  }

  static async _onRollOrthodoxCybercombat(_ev, _target) {
    await this.actor.rollOrthodoxCybercombat();
  }

  static async _onToggleOrthoMatrixCM(_ev, target) {
    const cur = this.actor.system.orthodoxMatrixCM?.value ?? 0;
    // data-box: individual box index (1-10); data-amount: L/M/S/D or heal (-1)
    let newVal;
    if (target.dataset.box) {
      const box = parseInt(target.dataset.box);
      newVal = cur >= box ? box - 1 : box;
    } else {
      const amount = parseInt(target.dataset.amount);
      newVal = amount < 0 ? Math.max(0, cur + amount) : Math.min(10, cur + amount);
    }
    newVal = Math.max(0, Math.min(10, newVal));
    await this.actor.update({ 'system.orthodoxMatrixCM.value': newVal });
  }

  static async _onAddOrthodoxCyberdeck() {
    const actor = this.actor;
    // Gather from every pack declaring cyberdeck items, not just the system's own —
    // sourcebook modules ship their own packs and a fixed pack id would ignore them.
    const docs = await game.sr3e.SR3EItem._documentsOfType('cyberdeck');
    if (!docs.length) {
      ui.notifications.warn('No cyberdecks found in any compendium — run the populate-odm-cyberdecks macro, or enable a sourcebook module that provides them.');
      return;
    }

    const rowsHtml = docs.map((d, i) => {
      const mpcp  = d.system.attributes?.mpcp?.base ?? 0;
      const mem   = d.system.attributes?.memory?.total ?? 0;
      const io    = d.system.attributes?.dataTransferRate?.value ?? 0;
      const odm   = d.system.modules?.find(m => m._odmType === 'orthodox') ?? {};
      const hard  = odm.hardening ?? 0;
      const resp  = odm.responseIncrease ?? 0;
      const cost  = (d.system.cost ?? 0).toLocaleString();
      return `
        <div class="sk-row" data-idx="${i}" data-search="${d.name.toLowerCase()}"
          style="padding:5px 8px;cursor:pointer;border-bottom:1px solid var(--sr-border);
                 display:grid;grid-template-columns:1fr 36px 60px 48px 36px 36px 72px;
                 align-items:center;gap:4px;font-size:12px">
          <span style="font-weight:500">${d.name}</span>
          <span style="color:var(--sr-accent);text-align:center" title="MPCP">${mpcp}</span>
          <span style="color:var(--sr-muted);text-align:center" title="Active Memory">${mem} Mp</span>
          <span style="color:var(--sr-muted);text-align:center" title="I/O Speed">${io}</span>
          <span style="color:var(--sr-muted);text-align:center" title="Hardening">${hard}</span>
          <span style="color:var(--sr-muted);text-align:center" title="Response+">${resp}</span>
          <span style="color:var(--sr-dim);text-align:right" title="Cost">¥${cost}</span>
        </div>`;
    }).join('');

    let selectedIdx = null;
    let hookId = Hooks.on('renderDialogV2', (_app, html) => {
      if (!html.querySelector?.('#odm-deck-filter')) return;
      Hooks.off('renderDialogV2', hookId);
      const filter = html.querySelector('#odm-deck-filter');
      const rows   = html.querySelectorAll('.sk-row');
      const idxIn  = html.querySelector('#odm-deck-idx');
      filter.addEventListener('input', () => {
        const q = filter.value.toLowerCase();
        rows.forEach(r => { r.style.display = (!q || r.dataset.search.includes(q)) ? '' : 'none'; });
      });
      filter.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
      rows.forEach(r => {
        r.addEventListener('click', () => {
          rows.forEach(rr => rr.style.background = '');
          r.style.background = 'color-mix(in srgb,var(--sr-accent) 20%,transparent)';
          idxIn.value = r.dataset.idx;
        });
      });
      requestAnimationFrame(() => filter.focus());
    });

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Browse Orthodox SR3 Cyberdecks' },
      position: { width: 560 },
      content: `
        <div style="padding:4px 0">
          <input id="odm-deck-filter" type="text" placeholder="Filter by name…"
            style="width:100%;margin-bottom:6px"/>
          <div style="display:grid;grid-template-columns:1fr 36px 60px 48px 36px 36px 72px;
                      padding:2px 8px;font-size:10px;color:var(--sr-muted);gap:4px;margin-bottom:2px">
            <span>Model</span><span style="text-align:center">MPCP</span>
            <span style="text-align:center">Act.Mem</span><span style="text-align:center">I/O</span>
            <span style="text-align:center" title="Hardening">Hard.</span>
            <span style="text-align:center" title="Response Increase">Resp+</span>
            <span style="text-align:right">Cost ¥</span>
          </div>
          <div style="max-height:340px;overflow-y:auto;border:1px solid var(--sr-border);border-radius:var(--r)">
            ${rowsHtml}
          </div>
          <input type="hidden" id="odm-deck-idx" value=""/>
          <p style="font-size:11px;color:var(--sr-muted);margin:6px 0 0">
            Selecting a deck fills in your Matrix tab stats (MPCP, Memory, I/O, Hardening, Response Increase).
          </p>
        </div>`,
      buttons: [
        { label: 'Load Stats', action: 'load', default: true,
          callback: (_e, _b, d) => {
            const v = d.element.querySelector('#odm-deck-idx')?.value;
            selectedIdx = (v !== '' && v != null) ? parseInt(v) : null;
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (selectedIdx == null || isNaN(selectedIdx)) return;
    const doc = docs[selectedIdx];
    if (!doc) return;

    const mpcp  = doc.system.attributes?.mpcp?.base ?? 0;
    const mem   = doc.system.attributes?.memory?.total ?? 0;
    const io    = doc.system.attributes?.dataTransferRate?.value ?? 0;
    const odm   = doc.system.modules?.find(m => m._odmType === 'orthodox') ?? {};

    await actor.update({
      'system.orthodoxDeck.deckModel':       doc.name,
      'system.orthodoxDeck.mccp':            mpcp,
      'system.orthodoxDeck.activeMemory':    mem,
      'system.orthodoxDeck.storageMemory':   odm.storageMemory   ?? 0,
      'system.orthodoxDeck.ioSpeed':         io,
      'system.orthodoxDeck.hardening':       odm.hardening       ?? 0,
      'system.orthodoxDeck.responseIncrease': odm.responseIncrease ?? 0,
    });
    ui.notifications.info(`${actor.name}: deck stats loaded from ${doc.name}.`);
  }

  static async _onAddOrthodoxProgram() {
    const actor = this.actor;
    // See _onAddOrthodoxCyberdeck — aggregate across packs so module content is included.
    const docs = await game.sr3e.SR3EItem._documentsOfType('program');
    if (!docs.length) {
      ui.notifications.warn('No programs found in any compendium — run the populate-odm-programs macro, or enable a sourcebook module that provides them.');
      return;
    }

    const CAT_LABELS = { utility: 'Utility', comms: 'Comms', attack: 'Attack', defense: 'Defense' };
    const CAT_COLORS = { utility: 'var(--sr-accent)', comms: 'var(--sr-muted)', attack: 'var(--sr-red)', defense: 'var(--sr-green)' };

    const rowsHtml = docs.map((d, i) => {
      const cat  = d.system.category ?? 'utility';
      const mult = d.system.multiplier ?? 0;
      return `
        <div class="sk-row" data-idx="${i}" data-search="${d.name.toLowerCase()} ${cat}"
          style="padding:5px 8px;cursor:pointer;border-bottom:1px solid var(--sr-border);
                 display:grid;grid-template-columns:1fr 72px 36px 80px;
                 align-items:center;gap:6px;font-size:12px">
          <span style="font-weight:500">${d.name}</span>
          <span style="color:${CAT_COLORS[cat] ?? 'var(--sr-muted)'};font-size:10px">${CAT_LABELS[cat] ?? cat}</span>
          <span style="color:var(--sr-muted);text-align:center" title="Size multiplier">×${mult}</span>
          <span style="color:var(--sr-dim);font-size:10px" title="Active memory at rating 1">1: ${mult} Mp · 4: ${16 * mult} Mp</span>
        </div>`;
    }).join('');

    let selectedIdx = null;
    let hookId = Hooks.on('renderDialogV2', (_app, html) => {
      if (!html.querySelector?.('#odm-prog-filter')) return;
      Hooks.off('renderDialogV2', hookId);
      const filter = html.querySelector('#odm-prog-filter');
      const rows   = html.querySelectorAll('.sk-row');
      const idxIn  = html.querySelector('#odm-prog-idx');
      filter.addEventListener('input', () => {
        const q = filter.value.toLowerCase();
        rows.forEach(r => { r.style.display = (!q || r.dataset.search.includes(q)) ? '' : 'none'; });
      });
      filter.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
      rows.forEach(r => {
        r.addEventListener('click', () => {
          rows.forEach(rr => rr.style.background = '');
          r.style.background = 'color-mix(in srgb,var(--sr-accent) 20%,transparent)';
          idxIn.value = r.dataset.idx;
        });
      });
      requestAnimationFrame(() => filter.focus());
    });

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Browse Orthodox SR3 Programs' },
      position: { width: 460 },
      content: `
        <div style="padding:4px 0">
          <input id="odm-prog-filter" type="text" placeholder="Filter by name or category…"
            style="width:100%;margin-bottom:6px"/>
          <div style="display:grid;grid-template-columns:1fr 72px 36px 80px;
                      padding:2px 8px;font-size:10px;color:var(--sr-muted);gap:6px;margin-bottom:2px">
            <span>Program</span><span>Category</span>
            <span style="text-align:center">Mult.</span>
            <span>Mem at Rtg 1 / 4</span>
          </div>
          <div style="max-height:360px;overflow-y:auto;border:1px solid var(--sr-border);border-radius:var(--r)">
            ${rowsHtml}
          </div>
          <input type="hidden" id="odm-prog-idx" value=""/>
          <p style="font-size:11px;color:var(--sr-muted);margin:6px 0 0">
            Program added at rating 0 — set the rating after adding. Mem = Rating² × Multiplier Mp.
          </p>
        </div>`,
      buttons: [
        { label: 'Add to Sheet', action: 'add', default: true,
          callback: (_e, _b, d) => {
            const v = d.element.querySelector('#odm-prog-idx')?.value;
            selectedIdx = (v !== '' && v != null) ? parseInt(v) : null;
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (selectedIdx == null || isNaN(selectedIdx)) return;
    const doc = docs[selectedIdx];
    if (!doc) return;

    // Don't add duplicates
    const existing = actor.items.find(i => i.type === 'program' && i.name === doc.name);
    if (existing) {
      ui.notifications.warn(`${doc.name} is already on this character.`);
      return;
    }

    await actor.createEmbeddedDocuments('Item', [doc.toObject()]);
  }

  static async _onSetMatrixMode(_ev, target) {
    const actor      = this.actor;
    const mode       = target.dataset.mode;
    const current    = actor.system.matrixUserMode ?? '';
    const oldHostId  = actor.system.activeHostId ?? '';

    // Toggle off — clear mode and host
    if (current === mode) {
      if (oldHostId) {
        const oldHost = game.actors.get(oldHostId);
        if (oldHost) {
          const users = (oldHost.system.activeUsers ?? []).filter(u => u.actorId !== actor.id);
          await oldHost.update({ 'system.activeUsers': users });
        }
      }
      await actor.update({ 'system.matrixUserMode': '', 'system.activeHostId': '' });
      return;
    }

    // Activating — show host selection dialog
    const hostActors = game.actors.filter(a => a.type === 'host' && game.sr3e.isLiveActor(a));

    if (!hostActors.length) {
      ui.notifications.warn('No host actors found. Create a Host actor to enable matrix targeting.');
      if (mode === 'VR-Cold' || mode === 'VR-Hot') {
        for (const v of game.actors.filter(a => a.type === 'vehicle' && a.system?.driverActorId === actor.id)) {
          if (v.system?.controlMode === 'vcr') await v.update({ 'system.controlMode': 'rcd' });
        }
      }
      await actor.update({ 'system.matrixUserMode': mode, 'system.activeHostId': '' });
      return;
    }

    const hostOpts = hostActors.map(a =>
      `<option value="${a.id}" ${a.id === oldHostId ? 'selected' : ''}>${a.name} [SR ${a.system.systemRating ?? '?'} / ${a.system.securityTierName ?? 'Green'}]</option>`
    ).join('');

    let hostId    = null;
    let confirmed = false;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${actor.name}: Enter Matrix — ${mode}` },
      content: `
        <div style="padding:8px 0">
          <p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">
            Mode: <strong>${mode}</strong> — select the host you are connecting to:
          </p>
          <label style="display:block">
            Host:
            <select id="matrix-host" style="width:100%;margin-top:4px">${hostOpts}</select>
          </label>
        </div>`,
      buttons: [
        {
          label: 'Connect',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dlg) => {
            hostId    = dlg.element.querySelector('#matrix-host')?.value ?? null;
            confirmed = true;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!confirmed || !hostId) return;

    const updates = { 'system.matrixUserMode': mode, 'system.activeHostId': hostId };

    // Activating VR — auto-deactivate any vehicle VCR
    if (mode === 'VR-Cold' || mode === 'VR-Hot') {
      for (const v of game.actors.filter(a => a.type === 'vehicle' && a.system?.driverActorId === actor.id)) {
        if (v.system?.controlMode === 'vcr') await v.update({ 'system.controlMode': 'rcd' });
      }
    }

    // Remove from old host if switching
    if (oldHostId && oldHostId !== hostId) {
      const oldHost = game.actors.get(oldHostId);
      if (oldHost) {
        const users = (oldHost.system.activeUsers ?? []).filter(u => u.actorId !== actor.id);
        await oldHost.update({ 'system.activeUsers': users });
      }
    }

    await actor.update(updates);

    // Add to new host's activeUsers list
    if (hostId !== oldHostId) {
      const host = game.actors.get(hostId);
      if (host) {
        const existing = host.system.activeUsers ?? [];
        if (!existing.some(u => u.actorId === actor.id)) {
          await host.update({
            'system.activeUsers': [...existing, {
              actorId: actor.id, name: actor.name,
              iconType: 'icon', currentNodeId: null,
              hidden: false, linkLocked: false,
              marks: [], marksFalsified: false,
            }],
          });
        }
      }
    }
  }

  static async _onSetAstralMode(_ev, target) {
    const actor   = this.actor;
    const mode    = target.dataset.mode;
    const current = actor.system.astralMode ?? '';
    await actor.update({ 'system.astralMode': current === mode ? '' : mode });
  }

  static async _onToggleFullDefense(_ev, _target) {
    await this.actor.toggleFullDefense();
  }

  static async _onResetRecoil(_ev, _target) {
    await this.actor.resetRecoil();
    ui.notifications.info('Recoil counter reset.');
  }

  static async _onReloadWeapon(_ev, target) {
    const weapon = this.actor.items.get(target.dataset.itemId);
    if (!weapon) return;
    await weapon.reload();
  }

  static async _onRollCybercombat(_ev, _target) {
    await this.actor.rollCybercombat();
  }

  static async _onRollHackingAction(_ev, _target) {
    await this.actor.rollHackingAction();
  }

  static async _onRollDumpshock(_ev, _target) {
    await this.actor.rollDumpshock();
  }

  static async _onRollProgram(ev, target) {
    const itemId = (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await this.actor.rollProgram(item, { physicalDice: ev.shiftKey ?? false });
  }

  static async _onRollSlotProgram(ev, target) {
    const actor  = this.actor;
    const deckId = target.dataset.deckId;
    const slot   = parseInt(target.dataset.slot);
    const deck   = actor.items.get(deckId);
    if (!deck) return;
    const entry = (deck.system.utilitySlotsArray ?? []).find(s => s.slot === slot);
    if (!entry?.utility) return;
    const u = entry.utility;
    // Use currentRating so degraded programs roll at their degraded value
    const synthetic = { id: null, name: u.name, system: { category: u.category ?? '', rating: u.currentRating ?? u.rating ?? 0 } };
    await actor.rollProgram(synthetic, { physicalDice: ev.shiftKey ?? false });
  }

  static async _onRefreshHackingPool(_ev, _target) {
    await this.actor.refreshHackingPool();
  }

  static async _onUseNodePrompt(_ev, target) {
    let promptData;
    try { promptData = JSON.parse(target.dataset.prompt ?? '{}'); } catch { promptData = {}; }
    const nodeId = target.dataset.nodeId ?? '';
    await this.actor.rollNodePrompt(promptData, nodeId);
  }

  static async _onRemoveMatrixMark(_ev, target) {
    const nodeId = target.dataset.nodeId ?? '';
    if (!nodeId) return;
    const marks = (this.actor.system.matrixMarks ?? []).filter(m => m !== nodeId);
    await this.actor.update({ 'system.matrixMarks': marks });
  }

  static async _onAddMatrixMark(_ev, _target) {
    const actor = this.actor;
    const nodes = game.actors.get(actor.system.activeHostId ?? '')?.system?.nodes ?? [];
    if (!nodes.length) { ui.notifications.warn('No host nodes found — connect to a host first.'); return; }
    const nodeOpts = nodes.map(n => `<option value="${n.id}">${n.abbreviation ?? n.name}</option>`).join('');
    let nodeId = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Add Matrix Mark' },
      content: `<div style="padding:8px 0"><label>Node: <select id="mark-node" style="width:100%;margin-top:4px">${nodeOpts}</select></label></div>`,
      buttons: [
        { label: 'Add Mark', action: 'confirm', default: true, callback: (_e, _b, dlg) => { nodeId = dlg.element.querySelector('#mark-node')?.value; } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!nodeId) return;
    const marks = [...new Set([...(actor.system.matrixMarks ?? []), nodeId])];
    await actor.update({ 'system.matrixMarks': marks });
  }

  static async _onEjectSlot(_ev, target) {
    const actor  = this.actor;
    const deckId = target.dataset.deckId;
    const slot   = parseInt(target.dataset.slot);
    const deck   = actor.items.get(deckId);
    if (!deck) return;

    const slots = foundry.utils.deepClone(deck.system.utilitySlotsArray ?? []);
    const idx   = slots.findIndex(s => s.slot === slot);
    if (idx !== -1) {
      slots[idx] = { slot, burned: slots[idx].burned ?? false };
    }
    const memUsed = slots.reduce((sum, s) => sum + (s.utility?.sizeMp ?? 0), 0);
    await deck.update({ 'system.utilitySlotsArray': slots, 'system.attributes.memory.used': memUsed });
  }

  static async _onToggleBurnSlot(_ev, target) {
    const actor  = this.actor;
    const deckId = target.dataset.deckId;
    const slot   = parseInt(target.dataset.slot);
    const deck   = actor.items.get(deckId);
    if (!deck) return;

    const slots = foundry.utils.deepClone(deck.system.utilitySlotsArray ?? []);
    const idx   = slots.findIndex(s => s.slot === slot);
    if (idx !== -1) {
      slots[idx].burned = !slots[idx].burned;
    } else {
      slots.push({ slot, burned: true });
    }
    await deck.update({ 'system.utilitySlotsArray': slots });
  }

  /* ------------------------------------------------------------------ */
  /*  Vehicle tab handlers                                               */
  /* ------------------------------------------------------------------ */

  static async _onOpenVehicle(_ev, target) {
    const actor = game.actors.get(target.dataset.actorId);
    actor?.sheet.render({ force: true });
  }

  static async _onOpenHost(_ev, target) {
    const actor = game.actors.get(target.dataset.actorId);
    actor?.sheet.render({ force: true });
  }

  static async _onCreateLinkVehicle(_ev, _target) {
    // Build compendium options from Actor packs (vehicles and drones)
    const vehiclePacks = game.packs.filter(p => p.metadata.type === 'Actor');
    const packGroups = [];
    for (const pack of vehiclePacks) {
      const index = await pack.getIndex();
      const entries = index.filter(e => e.type === 'vehicle');
      if (entries.length) {
        const opts = entries.map(e => `<option value="${pack.collection}|${e._id}">${e.name}</option>`).join('');
        packGroups.push(`<optgroup label="${pack.metadata.label}">${opts}</optgroup>`);
      }
    }
    const compendiumOpts = packGroups.join('');

    let choice = null;  // 'packCollection|docId' if from compendium, null if blank
    let name   = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Create & Link Vehicle' },
      content: `
        <div style="padding:8px 0">
          <label style="display:block;margin-bottom:6px">Source:
            <select id="veh-src" style="width:100%;margin-top:4px"
                    onchange="document.getElementById('veh-blank').style.display=this.value?'none':'block'">
              <option value="">-- Create blank --</option>
              ${compendiumOpts}
            </select>
          </label>
          <div id="veh-blank" style="margin-top:6px">
            <label>Name:
              <input id="veh-name" type="text" value="New Vehicle" style="width:100%;margin-top:4px"/>
            </label>
          </div>
        </div>`,
      buttons: [
        { label: 'Create', action: 'create', default: true,
          callback: (_e, _b, d) => {
            const el  = d.element;
            const src = el.querySelector('#veh-src')?.value ?? '';
            if (src) { choice = src; }
            else     { name   = el.querySelector('#veh-name')?.value.trim() || 'New Vehicle'; }
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    let newActor;
    if (choice) {
      const [collection, docId] = choice.split('|');
      const pack = game.packs.get(collection);
      const doc  = await pack.getDocument(docId);
      const data = doc.toObject();
      delete data._id;
      foundry.utils.setProperty(data, `flags.The2ndChumming3e.isTemplate`, false);
      newActor = await Actor.implementation.create(data);
    } else if (name) {
      newActor = await Actor.implementation.create({ name, type: 'vehicle' });
    } else {
      return;
    }

    await newActor.update({ 'system.driverActorId': this.actor.id });
    newActor.sheet.render(true);
  }

  static async _onToggleVehicleMode(_ev, target) {
    const actorId = target.dataset.actorId;
    const mode    = target.dataset.mode;  // 'vcr', 'rcd', or 'auto'
    const vActor  = game.actors.get(actorId);
    if (!vActor) return;

    if (mode === 'auto') {
      await vActor.update({ 'system.controlMode': '', 'system.driverActorId': '' });
      return;
    }

    if (mode === 'vcr') {
      // VCR is exclusive — drop other vehicles assigned to this character to RCD
      for (const v of game.actors.filter(a => a.type === 'vehicle' && a.system?.driverActorId === this.actor.id)) {
        if (v.id === actorId) continue;
        if (v.system?.controlMode === 'vcr') await v.update({ 'system.controlMode': 'rcd' });
      }
      // VCR and VR are mutually exclusive
      const matrixMode = this.actor.system.matrixUserMode ?? '';
      if (matrixMode === 'VR-Cold' || matrixMode === 'VR-Hot') {
        await this.actor.update({ 'system.matrixUserMode': '' });
      }
    }

    await vActor.update({ 'system.controlMode': mode });
  }

  static async _onRollContested(ev, _target) {
    await game.sr3e.SR3EActor.openContestedDialog(this.actor, ev.shiftKey);
  }

  static async _onRollResistDamage(ev, _target) {
    await this.actor.resistDamagePrompt(ev.shiftKey);
  }

  static async _onToggleTemplate(_ev, _target) {
    const actor   = this.actor;
    const current = !!actor.getFlag('The2ndChumming3e', 'isTemplate');
    await actor.setFlag('The2ndChumming3e', 'isTemplate', !current);
  }

  static async _onMarkAsLive(_ev, _target) {
    await this.actor.setFlag('The2ndChumming3e', 'isTemplate', false);
  }

  static async _onDeployTemplate(_ev, _target) {
    const actor = this.actor;
    const data  = actor.toObject();
    delete data._id;
    delete data._stats;
    data.name = `${data.name} (copy)`;
    foundry.utils.setProperty(data, 'flags.The2ndChumming3e.isTemplate', false);
    const newActor = await Actor.create(data);
    newActor.sheet.render(true);
  }

  /* ------------------------------------------------------------------ */
  /*  Shared roll-options dialog                                          */
  /* ------------------------------------------------------------------ */

  static async _promptRollOptions(actor, { defaultPool = null, poolNote = '', physicalDice = false, rollAttr = null } = {}) {
    const karmaPool    = actor?.system.karmaPool ?? 0;
    const woundPenalty = -(actor?.system.woundMod ?? 0);
    const woundNote    = woundPenalty > 0
      ? `<div class="roll-opts-wound-note">⚡ Wound TN +${woundPenalty} (pre-applied)</div>`
      : '';
    const attrs = actor?.system.attributes ?? {};

    const attrList = [
      { key: 'body',         label: 'Body',         val: attrs.body?.value         ?? attrs.body?.base         ?? 3 },
      { key: 'quickness',    label: 'Quickness',    val: attrs.quickness?.value    ?? attrs.quickness?.base    ?? 3 },
      { key: 'strength',     label: 'Strength',     val: attrs.strength?.value     ?? attrs.strength?.base     ?? 3 },
      { key: 'charisma',     label: 'Charisma',     val: attrs.charisma?.value     ?? attrs.charisma?.base     ?? 3 },
      { key: 'intelligence', label: 'Intelligence', val: attrs.intelligence?.value ?? attrs.intelligence?.base ?? 3 },
      { key: 'willpower',    label: 'Willpower',    val: attrs.willpower?.value    ?? attrs.willpower?.base    ?? 3 },
      { key: 'reaction',     label: 'Reaction',     val: attrs.reaction?.value     ?? 3 },
      { key: 'essence',      label: 'Essence',      val: attrs.essence?.value      ?? 6 },
      { key: 'magic',        label: 'Magic',        val: attrs.magic?.value        ?? attrs.magic?.base        ?? 0 },
    ];

    const selectedKey = rollAttr?.toLowerCase() ?? attrList[0].key;
    const selectedAttr = attrList.find(a => a.key === selectedKey) ?? attrList[0];
    const initialPool = defaultPool ?? selectedAttr.val;

    const optionsHtml = attrList.map(a =>
      `<option value="${a.key}" data-val="${a.val}"${a.key === selectedKey ? ' selected' : ''}>${a.label}</option>`
    ).join('');

    return new Promise(resolve => {
      new foundry.applications.api.DialogV2({
        window: { title: 'Roll Options' },
        content: `
          <div class="sr3e-roll-opts">
            <select id="sr-attr" class="roll-opts-attr"
              onchange="document.getElementById('sr-pool').value=this.options[this.selectedIndex].dataset.val">
              ${optionsHtml}
            </select>
            <span class="roll-opts-colon">:</span>
            <input type="number" id="sr-pool" class="roll-opts-pool" value="${initialPool}" min="1" max="30"/>
            <span class="roll-opts-dice-label">dice</span>
            ${poolNote ? `<p class="roll-opts-note">${poolNote}</p>` : ''}
            <label class="roll-opts-label" for="sr-tn">Target Number</label>
            <span></span>
            <input type="number" id="sr-tn" class="roll-opts-tn" value="${4 + woundPenalty}" min="2" max="30"/>
            ${woundNote}
            <span></span>
            ${karmaPool > 0 ? `<label class="roll-opts-karma"><input type="checkbox" id="sr-karma"/> Use Karma Pool (${karmaPool} available)</label>` : ''}
            ${physicalDice ? `<p class="roll-opts-physical">📋 Physical dice mode</p>` : ''}
          </div>
        `,
        buttons: [
          {
            label:  'Roll',
            action: 'roll',
            default: true,
            callback: (_e, _b, dialog) => {
              const html       = dialog.element;
              const tn         = parseInt(html.querySelector('#sr-tn')?.value) || 4;
              const useKarma   = html.querySelector('#sr-karma')?.checked ?? false;
              const poolEl     = html.querySelector('#sr-pool');
              const attrEl     = html.querySelector('#sr-attr');
              resolve({
                tn:           Math.max(2, tn),
                useKarma,
                karmaReroll:  useKarma,
                pool:         poolEl ? Math.max(1, parseInt(poolEl.value) || 1) : null,
                selectedAttr: attrEl?.value ?? selectedKey,
                physicalDice,
                skipWoundMod: true,
              });
            }
          },
          {
            label:  'Cancel',
            action: 'cancel',
            callback: () => resolve(null)
          }
        ]
      }).render(true);
    });
  }

  /* ------------------------------------------------------------------ */

  static async _promptSkillRollOptions(actor, defaultItem, { physicalDice = false } = {}) {
    const karmaPool    = actor?.system.karmaPool ?? 0;
    const woundPenalty = -(actor?.system.woundMod ?? 0);
    // No isAdept check: skillBonusDice is only populated for actors who earned the dice,
    // so re-gating here could only drop a bonus derivation already granted. It also now
    // carries cyberware/bioware skill bonuses, which have nothing to do with being an adept.
    const skillBonusDice = actor?.system.derived?.skillBonusDice ?? {};

    const skills = actor.items
      .filter(i => i.type === 'skill')
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!skills.length) return null;

    const defaultId = defaultItem?.id ?? skills[0].id;

    const optionsHtml = skills.map(sk => {
      const s          = sk.system;
      const forceBonus = skillBonusDice[sk.name] ?? 0;
      const pool       = s.rating
        ? Math.max(1, (s.rating ?? 0) + forceBonus)
        : Math.max(1, (s.attributeValue ?? 3));   // defaulting: full attribute (+4 TN at roll)
      return `<option value="${sk.id}" data-pool="${pool}" data-spec="${s.specialisation ?? ''}" data-default="${s.rating ? '0' : '1'}"${sk.id === defaultId ? ' selected' : ''}>${sk.name}</option>`;
    }).join('');

    const defSkill   = skills.find(sk => sk.id === defaultId) ?? skills[0];
    const defS       = defSkill.system;
    const defForce   = skillBonusDice[defSkill.name] ?? 0;
    const defPool    = defS.rating
      ? Math.max(1, (defS.rating ?? 0) + defForce)
      : Math.max(1, (defS.attributeValue ?? 3));   // defaulting: full attribute (+4 TN at roll)
    const defSpec    = defS.specialisation ?? '';

    const onSkillChange = `
      (function(sel){
        const opt   = sel.options[sel.selectedIndex];
        const pool  = parseInt(opt.dataset.pool);
        const spec  = opt.dataset.spec;
        const cb    = document.getElementById('sr-spec');
        const lbl   = document.getElementById('sr-spec-lbl');
        const poolEl = document.getElementById('sr-pool');
        cb.disabled = !spec;
        if (!spec) { cb.checked = false; lbl.textContent = 'No specialisation'; }
        else        { lbl.textContent = spec + ' (+2 dice)'; }
        poolEl.value = cb.checked ? pool + 2 : pool;
        const note = document.getElementById('sr-default-note');
        if (note) note.style.display = opt.dataset.default === '1' ? 'block' : 'none';
      })(this)
    `.replace(/\s+/g, ' ');

    const onSpecChange = `
      (function(cb){
        const sel   = document.getElementById('sr-skill');
        const pool  = parseInt(sel.options[sel.selectedIndex].dataset.pool);
        document.getElementById('sr-pool').value = cb.checked ? pool + 2 : pool;
      })(this)
    `.replace(/\s+/g, ' ');

    return new Promise(resolve => {
      new foundry.applications.api.DialogV2({
        window: { title: 'Roll Skill' },
        content: `
          <div class="sr3e-skill-opts">
            <select id="sr-skill" class="skill-opts-select" onchange="${onSkillChange}">
              ${optionsHtml}
            </select>
            <div class="skill-opts-spec-row">
              <input type="checkbox" id="sr-spec" ${defSpec ? '' : 'disabled'} onchange="${onSpecChange}"/>
              <label id="sr-spec-lbl" for="sr-spec" class="${defSpec ? '' : 'skill-opts-muted'}">
                ${defSpec ? defSpec + ' (+2 dice)' : 'No specialisation'}
              </label>
            </div>
            <div class="skill-opts-pool-row">
              <span class="skill-opts-pool-label">Dice pool</span>
              <input type="number" id="sr-pool" class="skill-opts-pool" value="${defPool}" min="1" max="30"/>
            </div>
            <div class="skill-opts-tn-row">
              <label class="skill-opts-tn-label" for="sr-tn">Target Number</label>
              <input type="number" id="sr-tn" class="skill-opts-tn" value="${4 + woundPenalty}" min="2" max="30"/>
            </div>
            ${woundPenalty > 0 ? `<div style="font-size:11px;color:var(--sr-amber);margin:4px 0 8px">⚡ Wound TN +${woundPenalty} (pre-applied)</div>` : ''}
            <div id="sr-default-note" style="font-size:11px;color:var(--sr-amber);margin:4px 0 8px;display:${defS.rating ? 'none' : 'block'}">↩ No skill — you'll <strong>choose how to default</strong> (specialization / skill / attribute) when you roll.</div>
            ${karmaPool > 0 ? `
              <label class="skill-opts-karma">
                <input type="checkbox" id="sr-karma"/> Use Karma Pool (${karmaPool} available)
              </label>
            ` : ''}
            ${physicalDice ? `<p class="skill-opts-physical">📋 Physical dice mode</p>` : ''}
          </div>
        `,
        buttons: [
          {
            label:  'Roll',
            action: 'roll',
            default: true,
            callback: (_e, _b, dialog) => {
              const html           = dialog.element;
              const tn             = parseInt(html.querySelector('#sr-tn')?.value) || 4;
              const useKarma       = html.querySelector('#sr-karma')?.checked ?? false;
              const poolEl         = html.querySelector('#sr-pool');
              const selectedSkillId = html.querySelector('#sr-skill')?.value ?? defaultId;
              resolve({
                tn:            Math.max(2, tn),
                useKarma,
                karmaReroll:   useKarma,
                pool:          poolEl ? Math.max(1, parseInt(poolEl.value) || 1) : defPool,
                selectedSkillId,
                physicalDice,
                skipWoundMod:  true,
              });
            }
          },
          {
            label:  'Cancel',
            action: 'cancel',
            callback: () => resolve(null)
          }
        ]
      }).render(true);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Karma                                                               */
  /* ------------------------------------------------------------------ */

  static _isActiveSkill(category) {
    const c = (category ?? '').toLowerCase();
    return !c.includes('knowledge') && !c.includes('language');
  }

  static _skillCost(newRating, attrRating, isActive) {
    const m = newRating <= attrRating        ? (isActive ? 1.5 : 1)
            : newRating <= 2 * attrRating    ? (isActive ? 2   : 1.5)
            :                                  (isActive ? 2.5 : 2);
    return Math.ceil(newRating * m);
  }

  static _specCost(newRating, attrRating) {
    const m = newRating <= attrRating     ? 0.5
            : newRating <= 2 * attrRating ? 1
            :                               1.5;
    return Math.ceil(newRating * m);
  }

  static async _onAwardKarma() {
    const actor = this.actor;
    let amount = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Award Karma — ${actor.name}` },
      content: `
        <div style="padding:8px">
          <label>Karma to award:
            <input type="number" id="karma-amount" value="3" min="1" style="width:60px;margin-left:8px"/>
          </label>
        </div>`,
      buttons: [
        {
          label: 'Award', action: 'award', default: true,
          callback: (_e, _b, dlg) => { amount = parseInt(dlg.element.querySelector('#karma-amount')?.value) || 0; }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!amount || amount <= 0) return;

    const karma      = actor.system.karma      ?? 0;
    const totalKarma = actor.system.totalKarma ?? 0;
    const karmaPool  = actor.system.karmaPool  ?? 0;
    const newTotal   = totalKarma + amount;
    const poolGained = Math.floor(newTotal / 20) - Math.floor(totalKarma / 20);

    await actor.update({
      'system.karma':      karma + amount,
      'system.totalKarma': newTotal,
      'system.karmaPool':  karmaPool + poolGained,
    });

    let msg = `${actor.name} awarded ${amount} karma (total: ${newTotal}).`;
    if (poolGained > 0) msg += ` +${poolGained} Karma Pool point${poolGained > 1 ? 's' : ''}!`;
    ui.notifications.info(msg);
  }

  static async _onSpendKarmaCalculator() {
    const actor  = this.actor;
    const sys    = actor.system;
    const karma  = sys.karma ?? 0;
    const attrs  = sys.attributes ?? {};
    const skills = actor.items.filter(i => i.type === 'skill').sort((a, b) => a.name.localeCompare(b.name));

    const IMPROVABLE_ATTRS = [
      { key: 'body',         label: 'Body' },
      { key: 'quickness',    label: 'Quickness' },
      { key: 'strength',     label: 'Strength' },
      { key: 'charisma',     label: 'Charisma' },
      { key: 'intelligence', label: 'Intelligence' },
      { key: 'willpower',    label: 'Willpower' },
    ];

    const row = (value, label, change, cost, canAfford) => `
      <label style="display:grid;grid-template-columns:14px 1fr auto auto;gap:6px;align-items:center;padding:3px 4px;border-radius:var(--r);${canAfford ? '' : 'opacity:0.45;'}cursor:${canAfford ? 'pointer' : 'not-allowed'}">
        <input type="radio" name="karma-choice" value="${value}" data-cost="${cost}" ${canAfford ? '' : 'disabled'}/>
        <span style="font-size:12px;white-space:nowrap">${label}</span>
        <span style="font-size:11px;color:var(--sr-muted);white-space:nowrap">${change}</span>
        <span style="font-size:12px;color:${canAfford ? 'var(--sr-gold)' : 'var(--sr-dim)'};font-weight:600;white-space:nowrap">${cost}</span>
      </label>`;

    const attrHtml = IMPROVABLE_ATTRS.map(a => {
      const cur  = attrs[a.key]?.base ?? 0;
      const next = cur + 1;
      const cost = 2 * next;
      return row(`attr:${a.key}`, a.label, `${cur} → ${next}`, cost, cost <= karma);
    }).join('');

    const skillHtml = [];
    for (const sk of skills) {
      const s          = sk.system;
      const rating     = s.rating ?? 0;
      if (rating === 0) continue;
      const linkedAttr = s.linkedAttribute ?? 'quickness';
      const attrRating = attrs[linkedAttr]?.base ?? 0;
      const isActive   = SR3EActorSheet._isActiveSkill(s.category);
      const specs      = s.specialisations ?? [];

      // Raise base skill
      const skillCost = SR3EActorSheet._skillCost(rating + 1, attrRating, isActive);
      skillHtml.push(row(`skill:${sk.id}:rating`, sk.name, `${rating} → ${rating + 1}`, skillCost, skillCost <= karma));

      // Add new specialisation (up to rating specs max)
      if (specs.length < rating) {
        const specRating = rating + 1;
        const cost = SR3EActorSheet._specCost(specRating, attrRating);
        skillHtml.push(row(`skill:${sk.id}:addspec`, `${sk.name} + specialisation`, `new (${specRating} dice)`, cost, cost <= karma));
      }

      // Improve existing lv1 specs to lv2
      specs.forEach((sp, specIdx) => {
        if ((sp.level ?? 1) >= 2) return;
        const specRating = rating + 2;
        const cost = SR3EActorSheet._specCost(specRating, attrRating);
        skillHtml.push(row(`skill:${sk.id}:improvespec:${specIdx}`, `${sk.name} — ${sp.name}`, `${rating+1} → ${rating+2} dice`, cost, cost <= karma));
      });
    }

    let chosen = null;
    let chosenCost = 0;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `Spend Karma — ${actor.name}` },
      content: `
        <div style="max-height:480px;overflow-y:auto;padding:4px 8px">
          <p style="margin:4px 0 8px;color:var(--sr-gold);font-weight:600">Available karma: ${karma}</p>
          <h4 style="margin:6px 0 4px;color:var(--sr-accent);font-size:12px;text-transform:uppercase;letter-spacing:.05em">Attributes (2 × new rating)</h4>
          <div style="display:flex;flex-direction:column;gap:1px">${attrHtml}</div>
          <h4 style="margin:10px 0 4px;color:var(--sr-accent);font-size:12px;text-transform:uppercase;letter-spacing:.05em">Skills</h4>
          <div style="display:flex;flex-direction:column;gap:1px">${skillHtml.join('') || '<p style="color:var(--sr-muted);font-size:12px">No improvable skills.</p>'}</div>
        </div>`,
      buttons: [
        {
          label: 'Spend Karma', action: 'spend', default: true,
          callback: (_e, _b, dlg) => {
            const checked = dlg.element.querySelector('input[name="karma-choice"]:checked');
            if (!checked) return;
            chosen     = checked.value;
            chosenCost = parseInt(checked.dataset.cost) || 0;
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!chosen || chosenCost <= 0) return;
    if (chosenCost > karma) { ui.notifications.warn('Not enough karma!'); return; }

    const parts  = chosen.split(':');
    const type   = parts[0];

    if (type === 'attr') {
      const key  = parts[1];
      const cur  = attrs[key]?.base ?? 0;
      await actor.update({ [`system.attributes.${key}.base`]: cur + 1, 'system.karma': karma - chosenCost });
      ui.notifications.info(`${actor.name}: ${key} raised to ${cur + 1} (${chosenCost} karma spent).`);
      return;
    }

    if (type === 'skill') {
      const skillId = parts[1];
      const action  = parts[2];
      const skill   = actor.items.get(skillId);
      if (!skill) return;

      if (action === 'rating') {
        const newRating = (skill.system.rating ?? 0) + 1;
        await skill.update({ 'system.rating': newRating });
        await actor.update({ 'system.karma': karma - chosenCost });
        ui.notifications.info(`${skill.name} raised to ${newRating} (${chosenCost} karma spent).`);

      } else if (action === 'addspec') {
        const predefined    = getSpecializationsForSkill(skill.system.category, skill.system.skillName);
        const fixedOptions  = predefined.filter(s => !s.endsWith('->'));
        const existingNames = new Set((skill.system.specialisations ?? []).map(sp => sp.name));
        const available     = fixedOptions.filter(s => !existingNames.has(s));

        let specName = null;
        await foundry.applications.api.DialogV2.wait({
          window: { title: `New Specialisation — ${skill.name}` },
          content: `
            <div style="padding:8px;display:flex;flex-direction:column;gap:6px">
              ${available.length > 0 ? `
                <label>From list:
                  <select id="spec-select" style="margin-left:8px">
                    <option value="">— or type a custom name below —</option>
                    ${available.map(s => `<option value="${s}">${s}</option>`).join('')}
                  </select>
                </label>` : ''}
              <label>${available.length > 0 ? 'Custom:' : 'Name:'}
                <input type="text" id="new-spec-name" style="width:180px;margin-left:8px"
                       ${available.length === 0 ? 'autofocus' : ''}
                       placeholder="${available.length > 0 ? 'Leave blank if selecting above' : 'Specialisation name'}"/>
              </label>
            </div>`,
          buttons: [
            {
              label: 'Add', action: 'add', default: true,
              callback: (_e, _b, dlg) => {
                const sel    = dlg.element.querySelector('#spec-select')?.value?.trim() ?? '';
                const custom = dlg.element.querySelector('#new-spec-name')?.value?.trim() ?? '';
                specName = sel || custom;
              }
            },
            { label: 'Cancel', action: 'cancel' },
          ],
        });
        if (!specName) return;
        const specs = [...(skill.system.specialisations ?? [])];
        specs.push({ name: specName, level: 1 });
        await skill.update({ 'system.specialisations': specs });
        await actor.update({ 'system.karma': karma - chosenCost });
        ui.notifications.info(`${skill.name}: "${specName}" added (${chosenCost} karma spent).`);

      } else if (action === 'improvespec') {
        const specIdx = parseInt(parts[3]);
        const specs   = [...(skill.system.specialisations ?? [])];
        if (isNaN(specIdx) || specIdx < 0 || specIdx >= specs.length) return;
        const specName = specs[specIdx].name;
        specs[specIdx] = { ...specs[specIdx], level: 2 };
        await skill.update({ 'system.specialisations': specs });
        await actor.update({ 'system.karma': karma - chosenCost });
        ui.notifications.info(`${skill.name} "${specName}" improved to level 2 (${chosenCost} karma spent).`);
      }
    }
  }
}