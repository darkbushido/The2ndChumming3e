/**
 * Token status effects — the GM chooses which of Foundry's core statuses the Token HUD offers · TODO 247.
 *
 * The rules (default SR3 set, always-shown ids, hide-never-remove) are pure, in `data/status-effects.mjs`.
 * This file is the Foundry side: the world setting, its menu, applying it to `CONFIG.statusEffects`, and a
 * Token HUD that still lists a hidden status a token already carries, so it can be clicked off.
 *
 * ⚠ No reload needed: hiding is `hud: false` on the config entry, and the HUD rebuilds its list on every
 * render — so the setting's onChange re-applies it live.
 */
import {
  SYSTEM_PREFIX, ALWAYS_SHOWN, SR3_REASONS, DEFAULT_SHOWN,
  applyStatusVisibility, hiddenActiveStatusIds, shownCoreIds,
} from './data/status-effects.mjs';

const SYS = 'The2ndChumming3e';
const SETTING = 'shownStatuses';

export class SR3EStatusEffects {
  /** Foundry's own status ids, captured before the system appends its sr3e-* ones. */
  static coreIds = new Set();
  /** Ids currently hidden by the setting. */
  static hidden = new Set();

  /** Call from init BEFORE the system pushes its own statuses. */
  static captureCore() {
    SR3EStatusEffects.coreIds = new Set([...CONFIG.statusEffects].map(s => s.id).filter(Boolean));
  }

  /** Call from init AFTER the system's statuses are in. Registers the setting and menu, applies it. */
  static register() {
    game.settings.register(SYS, SETTING, {
      scope: 'world',
      config: false,                       // edited through the menu below
      type: Array,
      default: [...DEFAULT_SHOWN],
      onChange: () => SR3EStatusEffects.apply(),
    });

    game.settings.registerMenu(SYS, 'statusEffectsMenu', {
      name: 'Token Status Effects',
      label: 'Configure Status Effects',
      hint: 'Choose which of Foundry\'s core status effects the Token HUD offers. The SR3 statuses (Sustaining, Full Defense, Astral …) are always there. Hiding a status removes nothing from tokens that already carry it.',
      icon: 'fas fa-person-falling-burst',
      type: SR3EStatusEffectsConfig,
      restricted: true,
    });

    CONFIG.Token.hudClass = SR3ETokenHUD;
    SR3EStatusEffects.apply();
  }

  static get saved() {
    try { return game.settings.get(SYS, SETTING); } catch { return undefined; }
  }

  /** Re-apply the setting to CONFIG.statusEffects; refresh an open HUD. */
  static apply() {
    SR3EStatusEffects.hidden = applyStatusVisibility(
      CONFIG.statusEffects, SR3EStatusEffects.saved, SR3EStatusEffects.coreIds, SR3EStatusEffects.hidden);
    const hud = globalThis.canvas?.tokens?.hud;
    if (hud?.rendered) hud.render();
  }
}

/* -------------------------------------------------------------------------- */

/**
 * The core Token HUD, plus: a status the setting hides but the token CARRIES is still listed, lit, so the
 * GM can click it off. Without this a world that hid, say, Frozen would leave every frozen token stuck
 * with an icon nobody can remove from the HUD.
 */
export class SR3ETokenHUD extends foundry.applications.hud.TokenHUD {
  _getStatusEffectChoices() {
    const choices = super._getStatusEffectChoices();
    const effects = this.actor?.effects ?? [];
    for (const id of hiddenActiveStatusIds(effects, SR3EStatusEffects.hidden)) {
      if (choices[id]) continue;
      const status = CONFIG.statusEffects.find(s => s.id === id);
      if (!status) continue;
      const overlay = effects.some(e => e.statuses?.size === 1 && e.statuses.has(id) && e.getFlag('core', 'overlay'));
      choices[id] = {
        _id: status._id, id,
        title: `${game.i18n.localize(status.name ?? '')} (hidden — click to remove)`,
        src: status.img, order: status.order ?? 0,
        isActive: true, isOverlay: overlay,
        cssClass: overlay ? 'active overlay' : 'active',
      };
    }
    return choices;
  }
}

/* -------------------------------------------------------------------------- */

/** Checkbox list for the Token Status Effects setting. Same shape as SR3ESourceBooksConfig. */
export class SR3EStatusEffectsConfig extends foundry.applications.api.ApplicationV2 {

  // Deliberately NOT tag:'form' — it writes one setting on Save (see SR3ESourceBooksConfig).
  static DEFAULT_OPTIONS = {
    id: 'sr3e-status-effects',
    classes: ['sr3e', 'sr3e-status-effects'],
    window: { title: 'SR3E — Token Status Effects', resizable: true },
    position: { width: 520, height: 620 },
  };

  async _renderHTML(_ctx, _opts) {
    const div = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto;padding:8px;';
    div.innerHTML = this._build();
    return div;
  }

  _replaceHTML(result, content, _opts) { content.replaceChildren(result); }

  _build() {
    const shown = shownCoreIds(SR3EStatusEffects.saved);
    const all = [...CONFIG.statusEffects];
    const label = s => foundry.utils.escapeHTML(game.i18n.localize(s.name ?? s.id));
    const icon = s => `<img src="${s.img}" alt="" style="width:20px;height:20px;border:0;flex-shrink:0;background:#2a2a2a;border-radius:3px;padding:1px"/>`;

    const coreRow = s => {
      const locked = ALWAYS_SHOWN.includes(s.id);
      const why = SR3_REASONS[s.id];
      const box = locked
        ? `<input type="checkbox" checked disabled title="The system sets this status itself, so it is always offered"
                  style="width:14px;height:14px;flex-shrink:0;opacity:.6"/>`
        : `<input type="checkbox" data-status="${s.id}" ${shown.has(s.id) ? 'checked' : ''}
                  style="width:14px;height:14px;flex-shrink:0;accent-color:var(--sr-accent)"/>`;
      return `
        <label style="display:flex;align-items:center;gap:8px;padding:4px;border-bottom:1px solid var(--sr-border);
               cursor:${locked ? 'default' : 'pointer'}">
          ${box}${icon(s)}
          <span style="flex:1">
            <span style="font-weight:500">${label(s)}</span>
            ${locked ? '<span style="font-size:10px;color:var(--sr-green);margin-left:6px">set by the system — always on</span>' : ''}
            ${why ? `<div style="font-size:10px;color:var(--sr-dim)">${foundry.utils.escapeHTML(why)}</div>` : ''}
          </span>
        </label>`;
    };

    const core = all.filter(s => SR3EStatusEffects.coreIds.has(s.id));
    const ours = all.filter(s => s.id?.startsWith(SYSTEM_PREFIX));

    return `
      <p style="font-size:12px;color:var(--sr-muted);margin:0 0 8px">
        Ticked statuses appear in the Token HUD. Hiding one deletes nothing: a token that already carries it
        keeps its icon, and the HUD still lists it (lit) so it can be clicked off. Applies at once — no reload.
      </p>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <button type="button" data-preset="all"     style="font-size:11px">Select all</button>
        <button type="button" data-preset="none"    style="font-size:11px">Select none</button>
        <button type="button" data-preset="default" style="font-size:11px">SR3 defaults</button>
      </div>
      <div>${core.map(coreRow).join('')}</div>
      <p style="font-size:11px;color:var(--sr-muted);margin:10px 0 4px">Always on — the system's own statuses:</p>
      <div style="display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11px;color:var(--sr-dim)">
        ${ours.map(s => `<span style="display:flex;align-items:center;gap:4px">${icon(s)}${label(s)}</span>`).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:10px">
        <button type="button" data-action="save" style="font-weight:600">Save</button>
      </div>`;
  }

  _onRender(_ctx, _opts) {
    const el = this.element;
    el.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.preset;
        el.querySelectorAll('input[data-status]').forEach(cb => {
          cb.checked = mode === 'all' ? true : mode === 'none' ? false : DEFAULT_SHOWN.includes(cb.dataset.status);
        });
      });
    });

    el.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      const next = [...el.querySelectorAll('input[data-status]')].filter(cb => cb.checked).map(cb => cb.dataset.status);
      await game.settings.set(SYS, SETTING, next);
      const hiddenN = SR3EStatusEffects.hidden.size;
      ui.notifications.info(`SR3E: token status effects updated — ${hiddenN} core status${hiddenN === 1 ? '' : 'es'} hidden.`);
      this.close();
    });
  }
}
