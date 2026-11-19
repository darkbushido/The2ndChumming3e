/**
 * SR3 senses on the canvas — low-light, thermographic, ultrasound, astral · TODO 299.
 *
 * The rules (who has what, which walls stop which sense, what an aura shows) are pure, in
 * `data/token-senses.mjs`, with their book pages. This file is the Foundry v14 side, checked against the
 * 14.365 source (`client/config.mjs` visionModes/detectionModes, `canvas/perception/detection-mode.mjs`,
 * `canvas/groups/visibility.mjs` testVisibility, `canvas/geometry/clockwise-sweep.mjs` _testEdgeInclusion):
 *
 * - **Vision modes** (how the map LOOKS): `sr3eLowLight`, `sr3eThermographic`, `sr3eAstral`.
 * - **Detection modes** (which tokens are SEEN): `sr3eThermographic`, `sr3eUltrasound`, `sr3eAstralSight`.
 * - **The sight polygon** is subclassed so that a thermographic viewer is also stopped by GLASS-flagged walls and
 *   a projecting astral form only by WARD-flagged walls. Every sight-based detection reads that polygon, so the
 *   map and the tokens agree.
 * - **Core lightPerception/basicSight** are replaced by subclasses that never see an astral-only token, and that
 *   leave an aura to astral sight when the viewer is in astral vision (so the aura glows).
 *
 * ⚠ Offer, never apply outcomes: nothing here touches a roll. Modifiers (ward Force, ultrasound +4) are reminders.
 * ⚠ Everything stays editable: the token config still offers every mode, and the 👁 HUD dialog sets the choice.
 */
import {
  VISION, DETECTION, FLAG_SCOPE, ULTRASOUND_RANGE,
  mundaneSenses, astralState, visionModeFor, detectionModesFor, detectionUpdate,
  polygonSense, wallBlocks, wardForce, isAstralOnly, auraKind, dualTicked, astralModeFromStatus, tileAura, paletteEntries, paletteClick,
} from './data/token-senses.mjs';
import { SR3E } from './config.js';
import { detectVision } from './SR3ECombatModifiers.js';
import { InvisibilityRules } from './data/invisibility.mjs';
import { TokenSenses } from './data/token-senses.mjs';

const SYS = FLAG_SCOPE;

/** Read the facts the pure rules need off a Foundry token placeable. */
function tokenFacts(token) {
  const actor = token?.actor;
  const doc = token?.document;
  const statuses = [...(actor?.statuses ?? doc?.actor?.statuses ?? [])];
  return {
    type: actor?.type ?? '',
    astralMode: actor?.system?.astralMode ?? '',
    magic: actor?.system?.attributes?.magic?.value ?? 0,
    dualNatured: !!actor?.getFlag?.(SYS, 'dualNatured'),
    statuses,
  };
}

/**
 * Does this viewer, in this sense, see through the target's invisibility? Only PLAIN Invisibility, only for a
 * technological viewer (`data/invisibility.mjs`, SR3 p.195-196). `thermo` asks about the viewer's thermographic.
 */
function techSeesInvisible(visionSource, target, thermo = false) {
  const kind = InvisibilityRules.kindOnToken(target?.actor?.statuses ?? target?.document?.actor?.statuses);
  if (kind !== 'plain') return false;
  const viewer = visionSource?.object;
  const t = viewer?.actor?.type === 'vehicle' || viewer?.actor?.getFlag?.(SYS, 'camera')
    ? { all: true, thermo: true }
    : (viewer?.document?.getFlag?.(SYS, 'techSight') ?? { all: false, thermo: false });
  return InvisibilityRules.seesThrough(kind, thermo ? (t.thermo || t.all) : t.all);
}

function astralOnlyToken(target) {
  return target instanceof foundry.canvas.placeables.Token && isAstralOnly(tokenFacts(target));
}

function inAstralVision(visionSource) {
  return visionSource?.object?.document?.sight?.visionMode === VISION.astral;
}

export class SR3ESenses {

  /** Call from init. Registers modes, the polygon backend and the core-mode replacements. */
  static register() {
    const P = foundry.canvas.perception;
    const VM = P.VisionMode;
    const S = foundry.canvas.rendering.shaders;
    const L = VM.LIGHTING_LEVELS;
    const V = VM.LIGHTING_VISIBILITY;
    const GlowOverlayFilter = foundry.canvas.rendering.filters.GlowOverlayFilter;

    // ── Vision modes ────────────────────────────────────────────────────────────────────────────
    Object.assign(CONFIG.Canvas.visionModes, {
      // SR3 p.112: low-light needs some light. Dim reads as bright, colour kept, darkness stays dark.
      [VISION.lowLight]: new VM({
        id: VISION.lowLight,
        label: 'SR3E.Senses.LowLight',
        lighting: {
          levels: { [L.DIM]: L.BRIGHT },
          background: { visibility: V.REQUIRED },
        },
        vision: {
          darkness: { adaptive: false },
          defaults: { attenuation: 0, contrast: 0, saturation: 0, brightness: 0 },
        },
      }),
      // Heat, not light: lighting off, a warm tint over a desaturated map.
      [VISION.thermo]: new VM({
        id: VISION.thermo,
        label: 'SR3E.Senses.Thermographic',
        canvas: {
          shader: S.AmplificationSamplerShader,
          uniforms: { saturation: -0.6, tint: [1.0, 0.45, 0.2] },
        },
        lighting: {
          background: { visibility: V.DISABLED },
          illumination: { visibility: V.DISABLED },
          coloration: { visibility: V.DISABLED },
        },
        vision: {
          darkness: { adaptive: false },
          defaults: { attenuation: 0, contrast: 0.1, saturation: -0.6, brightness: 1 },
          background: { shader: S.AmplificationBackgroundVisionShader },
        },
      }),
      // M&M p.20, sonar/lidar: shapes and distance out to the ultrasound range, light or dark, NEVER colour — pure grey, fading with distance.
      [VISION.ultrasound]: new VM({
        id: VISION.ultrasound,
        label: 'SR3E.Senses.Ultrasound',
        canvas: {
          shader: S.ColorAdjustmentsSamplerShader,
          uniforms: { contrast: 0.3, saturation: -1.0, brightness: 0 },
        },
        lighting: {
          background: { visibility: V.DISABLED },
          illumination: { visibility: V.DISABLED },
          coloration: { visibility: V.DISABLED },
        },
        vision: {
          darkness: { adaptive: false },
          defaults: { attenuation: 0.8, contrast: 0.3, saturation: -1, brightness: 1 },
        },
      }),
      // SR3 p.173: the astral is lit by auras, so light does not matter; mundane things are grey.
      [VISION.astral]: new VM({
        id: VISION.astral,
        label: 'SR3E.Senses.Astral',
        canvas: {
          shader: S.ColorAdjustmentsSamplerShader,
          uniforms: { contrast: 0, saturation: -1.0, brightness: 0 },
        },
        lighting: {
          background: { visibility: V.DISABLED },
          illumination: { visibility: V.DISABLED },
          coloration: { visibility: V.DISABLED },
          darkness: { visibility: V.DISABLED },
        },
        vision: {
          darkness: { adaptive: false },
          defaults: { attenuation: 0, contrast: 0, saturation: -1, brightness: 1 },
        },
      }),
    });

    // ── Detection modes ─────────────────────────────────────────────────────────────────────────
    class SR3EThermographic extends P.DetectionMode {
      static getDetectionFilter() {
        return this._detectionFilter ??= GlowOverlayFilter.create({ glowColor: [1, 0.45, 0.15, 1] });
      }
      _canDetect(visionSource, target) {
        if (!(target instanceof foundry.canvas.placeables.Token)) return false;
        if (astralOnlyToken(target)) return false;
        const src = visionSource.object.document;
        const tgt = target.document;
        const SE = CONFIG.specialStatusEffects;
        if (src.hasStatusEffect(SE.BLIND) || src.hasStatusEffect(SE.BURROW)) return false;
        if (tgt.hasStatusEffect(SE.BURROW)) return false;
        return !tgt.hasStatusEffect(SE.INVISIBLE) || techSeesInvisible(visionSource, target, true);
      }
      // Line of sight: the viewer's sight polygon, which already counts glass for a thermographic viewer.
    }

    class SR3EUltrasound extends P.DetectionMode {
      static getDetectionFilter() {
        return this._detectionFilter ??= GlowOverlayFilter.create({ glowColor: [0.55, 0.75, 1, 1] });
      }
      /** M&M p.20: not fooled by invisibility (the target is an outline — +4, the GM's). Light is irrelevant. */
      _canDetect(visionSource, target) {
        if (!(target instanceof foundry.canvas.placeables.Token)) return false;
        if (astralOnlyToken(target)) return false;
        const SE = CONFIG.specialStatusEffects;
        if (visionSource.object.document.hasStatusEffect(SE.BURROW)) return false;
        return !target.document.hasStatusEffect(SE.BURROW);
      }
      /** Walls stop it by their SOUND setting (`DetectionMode.type` is only a label, so test the sound polygon). */
      _testLOS(visionSource, mode, target, test) {
        return !this.constructor._testCollision(visionSource, test, { type: 'sound', angle: 360 });
      }
    }

    class SR3EAstralSight extends P.DetectionMode {
      static getDetectionFilter() {
        return this._detectionFilter ??= GlowOverlayFilter.create({ glowColor: [0.95, 0.8, 0.35, 1] });
      }
      /** SR3 p.172: anything with an aura, and every astral form. Light and invisibility do not matter. */
      _canDetect(_visionSource, target) {
        if (!(target instanceof foundry.canvas.placeables.Token)) return false;
        return auraKind(tokenFacts(target)) !== 'none';
      }
      // Line of sight: the sight polygon — ordinary walls when perceiving, ward walls only when projecting.
    }

    const T = P.DetectionMode.DETECTION_TYPES;
    Object.assign(CONFIG.Canvas.detectionModes, {
      [DETECTION.thermo]: new SR3EThermographic({ id: DETECTION.thermo, label: 'SR3E.Senses.Thermographic', type: T.SIGHT }),
      [DETECTION.ultrasound]: new SR3EUltrasound({ id: DETECTION.ultrasound, label: 'SR3E.Senses.Ultrasound', type: T.SOUND, angle: false }),
      [DETECTION.astral]: new SR3EAstralSight({ id: DETECTION.astral, label: 'SR3E.Senses.Astral', type: T.OTHER }),
    });

    // ── Core sight never sees an astral-only token; in astral vision it leaves auras to astral sight ──
    const guard = Base => class extends Base {
      _canDetect(visionSource, target, level) {
        if (astralOnlyToken(target)) return false;
        if (inAstralVision(visionSource) && target instanceof foundry.canvas.placeables.Token
          && auraKind(tokenFacts(target)) !== 'none') return false;
        // A camera, drone or cybereye sees through PLAIN Invisibility (SR3 p.195) — core's own checks, minus INVISIBLE.
        if (target instanceof foundry.canvas.placeables.Token && techSeesInvisible(visionSource, target)) {
          const SE = CONFIG.specialStatusEffects;
          const src = visionSource.object.document;
          if (this.walls && visionSource.blinded?.darkness) return false;
          if (src.hasStatusEffect(SE.BLIND) || src.hasStatusEffect(SE.BURROW)) return false;
          return !target.document.hasStatusEffect(SE.BURROW);
        }
        return super._canDetect(visionSource, target, level);
      }
    };
    const dm = CONFIG.Canvas.detectionModes;
    for (const [id, Base] of [['lightPerception', P.DetectionModeLightPerception], ['basicSight', P.DetectionModeDarkvision]]) {
      const old = dm[id];
      const Guarded = guard(Base);
      dm[id] = new Guarded({ id, label: old.label, type: old.type, walls: old.walls, angle: old.angle, tokenConfig: old.tokenConfig });
    }

    // ── The sight polygon: glass for thermographic eyes, SOUND walls for sonar, wards only for an astral form ──────────────
    const Sweep = CONFIG.Canvas.polygonBackends.sight;
    class SR3ESightPolygon extends Sweep {
      _testEdgeInclusion(edge, edgeTypes) {
        const token = this.config?.source?.object;
        if (this.config?.type !== 'sight' || edge.type !== 'wall' || !token?.document) {
          return super._testEdgeInclusion(edge, edgeTypes);
        }
        const sense = polygonSense(token.document.sight?.visionMode, token.actor?.system?.astralMode ?? '');
        if (sense === 'sight') return super._testEdgeInclusion(edge, edgeTypes);
        const wall = { sight: edge.sight, sound: edge.sound, flags: edge.object?.document?.flags };
        if (!wallBlocks(sense, wall)) return false;
        if (edge.sight) return super._testEdgeInclusion(edge, edgeTypes);
        return !!edge.orientPoint(this.origin);   // flagged only (glass, a ward with sight off): still a wall
      }
    }
    CONFIG.Canvas.polygonBackends.sight = SR3ESightPolygon;

    // ── Projecting astral forms move through solid objects (SR3 p.173) ──────────────────────────────
    const TokenClass = CONFIG.Token.objectClass;
    CONFIG.Token.objectClass = class SR3EToken extends TokenClass {
      _getDragConstrainOptions() {
        const opts = super._getDragConstrainOptions();
        if (this.actor?.system?.astralMode === 'astral') opts.ignoreWalls = true;
        return opts;
      }
    };

    SR3ESenses._hooks();
  }

  /** The vision mode and detection-mode update for one token of `actor`. */
  static plan(actor, tokenDoc) {
    const senses = mundaneSenses(actor, detectVision(actor));
    const astral = astralState(actor.system?.astralMode ?? '', !!actor.getFlag?.(SYS, 'dualNatured'));
    const chosen = actor.getFlag?.(SYS, 'vision') ?? '';
    const range = actor.getFlag?.(SYS, 'ultrasoundRange') ?? ULTRASOUND_RANGE;
    const visionMode = visionModeFor(senses.modes, astral, chosen);
    const ours = detectionModesFor({ modes: senses.modes, ultrasound: senses.ultrasound, astral, ultrasoundRange: range });
    const detection = detectionUpdate(tokenDoc?.detectionModes ?? {}, ours);
    const defaults = CONFIG.Canvas.visionModes[visionMode]?.vision?.defaults ?? {};
    const update = { 'sight.visionMode': visionMode };
    for (const [k, v] of Object.entries(defaults)) if (v !== undefined && v !== null) update[`sight.${k}`] = v;
    // Sonar reaches as far as the ultrasound range and no further.
    if (visionMode === VISION.ultrasound) update['sight.range'] = range;
    for (const [id, m] of Object.entries(detection)) update[`detectionModes.${id}`] = m;
    // Technological sight sees through plain Invisibility (SR3 p.195) — read at detection time.
    const vision = detectVision(actor);
    update[`flags.${SYS}.techSight`] = InvisibilityRules.techSight({
      actorType: actor.type,
      camera: !!actor.getFlag?.(SYS, 'camera'),
      replacedBy: vision.replacedBy,
      cyberThermo: (vision.cyber ?? []).some(c => c.column === 'thermo'),
      gearThermo: [...(actor.items ?? [])].some(i => i?.type === 'gear' && TokenSenses.isWornGear(i)
        && TokenSenses.isVisionGear(i.name) && /thermograph|thermo\s*vision/i.test(i.name ?? '')),
    });
    return { senses, astral, visionMode, update };
  }

  /** Re-apply senses to every token of `actor` on every scene this client may write. */
  static async apply(actor) {
    if (!actor || !['character', 'npc'].includes(actor.type)) return;
    const docs = actor.isToken ? [actor.token] : game.scenes.contents.flatMap(s => s.tokens.filter(t => t.actorId === actor.id && t.actorLink));
    for (const doc of docs) {
      if (!doc?.isOwner) continue;
      const { update } = SR3ESenses.plan(actor, doc);
      const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
      const changed = Object.entries(update).some(([k, v]) => !same(foundry.utils.getProperty(doc._source, k), v));
      if (changed) await doc.update(update);
    }
  }

  static _hooks() {
    // A new token starts with its senses (on the creating client, before the write).
    Hooks.on('preCreateToken', (doc, data) => {
      const actor = doc.actor;
      if (!actor || !['character', 'npc'].includes(actor.type)) return;
      if (data.sight?.visionMode && data.sight.visionMode !== 'basic') return;   // a mode the creator chose stays
      const { update } = SR3ESenses.plan(actor, doc);
      doc.updateSource(foundry.utils.expandObject(update));
    });

    // astralMode, dual-natured or a chosen mode changed → switch (active GM writes, as the status hook does).
    Hooks.on('updateActor', (actor, changes) => {
      if (!game.users.activeGM?.isSelf) return;
      const f = changes.flags?.[SYS] ?? {};
      if (changes.system && 'astralMode' in changes.system) return SR3ESenses.apply(actor);
      if ('dualNatured' in f || 'vision' in f || 'ultrasoundRange' in f || 'camera' in f || 'metatype' in (changes.system ?? {})) return SR3ESenses.apply(actor);
    });

    // Eyes, goggles and powers come and go.
    const itemHook = item => {
      if (!game.users.activeGM?.isSelf || !item.parent) return;
      if (['cyberware', 'bioware', 'gear', 'adeptpower'].includes(item.type)) SR3ESenses.apply(item.parent);
    };
    Hooks.on('createItem', itemHook);
    Hooks.on('deleteItem', itemHook);
    Hooks.on('updateItem', itemHook);

    // Dual-natured critters show the Dual-Natured status (SR3 p.173).
    Hooks.on('updateActor', async (actor, changes) => {
      if (!game.users.activeGM?.isSelf) return;
      if (!('dualNatured' in (changes.flags?.[SYS] ?? {}))) return;
      await actor.toggleStatusEffect('sr3e-dual', { active: dualTicked(actor.system?.astralMode, actor.getFlag(SYS, 'dualNatured')) });
    });

    // The HUD's Dual-Natured status drives the sheet's Dual Natured button (sr3e.js mirrors the other way;
    // writing only on a difference stops the two hooks bouncing).
    const statusHook = on => async effect => {
      if (!game.users.activeGM?.isSelf || !effect.statuses?.has?.('sr3e-dual')) return;
      const actor = effect.parent;
      if (!(actor instanceof Actor) || actor.getFlag(SYS, 'dualNatured')) return;
      const next = astralModeFromStatus(actor.system?.astralMode ?? '', on);
      if (next) await actor.update({ 'system.astralMode': next });
    };
    Hooks.on('createActiveEffect', statusHook(true));
    Hooks.on('deleteActiveEffect', statusHook(false));

    // Wall config: Glass (thermographic) and Ward Force (astral barrier).
    Hooks.on('renderWallConfig', (app, html) => {
      const el = html instanceof HTMLElement ? html : html?.[0];
      if (!el || el.querySelector('.sr3e-wall-senses')) return;
      const f = app.document?.flags?.[SYS] ?? {};
      const box = document.createElement('fieldset');
      box.className = 'sr3e-wall-senses';
      box.innerHTML = `<legend>${game.i18n.localize('SR3E.Senses.WallLegend')}</legend>
        <div class="form-group"><label>${game.i18n.localize('SR3E.Senses.Glass')}</label>
          <input type="checkbox" name="flags.${SYS}.glass" ${f.glass ? 'checked' : ''}>
          <p class="hint">${game.i18n.localize('SR3E.Senses.GlassHint')}</p></div>
        <div class="form-group"><label>${game.i18n.localize('SR3E.Senses.Ward')}</label>
          <input type="number" min="0" step="1" name="flags.${SYS}.ward" value="${Number(f.ward) || 0}">
          <p class="hint">${game.i18n.localize('SR3E.Senses.WardHint')}</p></div>`;
      const footer = el.querySelector('footer, .form-footer');
      (footer?.parentElement ?? el.querySelector('.window-content') ?? el).insertBefore(box, footer ?? null);
    });

    // Magical tiles: an Aura select in Tile Config; glow / hide on every tile refresh and sight change.
    Hooks.on('renderTileConfig', (app, html) => {
      const el = html instanceof HTMLElement ? html : html?.[0];
      if (!el || el.querySelector('.sr3e-tile-aura')) return;
      const v = app.document?.flags?.[SYS]?.aura ?? '';
      const opt = (val, key) => `<option value="${val}" ${v === val ? 'selected' : ''}>${game.i18n.localize(key)}</option>`;
      const box = document.createElement('fieldset');
      box.className = 'sr3e-tile-aura';
      box.innerHTML = `<legend>${game.i18n.localize('SR3E.Senses.TileLegend')}</legend>
        <div class="form-group"><label>${game.i18n.localize('SR3E.Senses.TileAura')}</label>
          <select name="flags.${SYS}.aura">${opt('', 'SR3E.Senses.TileNone')}${opt('aura', 'SR3E.Senses.TileGlow')}${opt('astral', 'SR3E.Senses.TileAstral')}</select>
          <p class="hint">${game.i18n.localize('SR3E.Senses.TileHint')}</p></div>`;
      const footer = el.querySelector('footer, .form-footer');
      (footer?.parentElement ?? el.querySelector('.window-content') ?? el).insertBefore(box, footer ?? null);
    });
    Hooks.on('refreshTile', tile => SR3ESenses._tileAura(tile));
    Hooks.on('sightRefresh', () => { for (const t of canvas.tiles?.placeables ?? []) SR3ESenses._tileAura(t); });
    Hooks.on('controlToken', () => { for (const t of canvas.tiles?.placeables ?? []) SR3ESenses._tileAura(t); });

    // 👁 Senses on the Token HUD — choose among the modes this character has; GM sets dual-natured and range.
    Hooks.on('renderTokenHUD', (hud, html) => SR3ESenses._visionPalette(hud, html));

    // Hovering a token with astral sight: Awakened or mundane — the first line of the Assensing Table only.
    Hooks.on('hoverToken', (token, hovered) => SR3ESenses._auraHint(token, hovered));

    // Ward walls glow for a viewer in astral vision.
    Hooks.on('sightRefresh', () => SR3ESenses._drawWards());
  }

  /** The actor's astral capability (TokenSenses.astralAccess), from its magic type and adept powers. */
  static access(actor) {
    const magicType = actor.system?.magicType ?? '';
    return TokenSenses.astralAccess({
      magic: actor.system?.attributes?.magic?.base ?? actor.system?.attributes?.magic?.value ?? 0,
      magicType,
      typeCap: SR3E.magicTypes?.find(t => t.name === magicType)?.astral ?? '',
      items: actor.items ?? [],
    });
  }

  /**
   * 👁 on the Token HUD opens a side column like the status effects (core `togglePalette` takes any `data-palette`
   * — Foundry 14.365.0 `placeable-hud.mjs:218`): Best, each mode the token has, Dual Natured and Astral for those
   * who may use them. The GM sees the rest greyed and may still click (warn, never refuse).
   */
  static _visionPalette(hud, html) {
    const actor = hud.object?.actor;
    if (!actor?.isOwner || !['character', 'npc'].includes(actor.type)) return;
    const el = html instanceof HTMLElement ? html : html?.[0];
    if (!el || el.querySelector('.sr3e-senses-hud')) return;
    const { senses } = SR3ESenses.plan(actor, hud.object.document);
    const entries = paletteEntries({
      modes: senses.modes, chosen: actor.getFlag(SYS, 'vision') ?? '', astralMode: actor.system?.astralMode ?? '',
      access: SR3ESenses.access(actor), isGM: game.user.isGM,
    });
    const LABEL = { best: 'SR3E.Senses.Best', normal: 'SR3E.Senses.Normal', lowLight: 'SR3E.Senses.LowLight',
      thermo: 'SR3E.Senses.Thermographic', ultrasound: 'SR3E.Senses.Ultrasound',
      dual: 'SR3E.Senses.PaletteDual', astral: 'SR3E.Senses.PaletteAstral' };
    const ICON = { best: 'fa-wand-magic-sparkles', normal: 'fa-eye', lowLight: 'fa-moon', thermo: 'fa-temperature-half',
      ultrasound: 'fa-wave-square', dual: 'fa-eye-low-vision', astral: 'fa-ghost' };

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'control-icon sr3e-senses-hud';
    btn.dataset.action = 'togglePalette';
    btn.dataset.palette = 'sr3eVision';
    btn.dataset.tooltip = game.i18n.localize('SR3E.Senses.HudTip');
    btn.innerHTML = '<i class="fas fa-eye"></i>';

    const pal = document.createElement('div');
    pal.className = 'palette palette-list sr3e-vision-palette';
    pal.dataset.palette = 'sr3eVision';
    const why = k => game.i18n.localize(k === 'astral' ? 'SR3E.Senses.CannotProject' : 'SR3E.Senses.CannotPerceive');
    pal.innerHTML = entries.map((e, i) => `<a class="palette-list-entry${e.active ? ' active' : ''}${e.eligible ? '' : ' sr3e-ineligible'}"
        data-sr3e-entry="${i}"${e.eligible ? '' : ` data-tooltip="${why(e.key)}"`}>
        <span><i class="fas ${ICON[e.key]} fa-fw" inert></i> ${game.i18n.localize(LABEL[e.key])}</span></a>`).join('')
      + (senses.ultrasound ? `<label class="sr3e-us-range">${game.i18n.localize('SR3E.Senses.UltrasoundRangeShort')}
        <input type="number" min="0" value="${actor.getFlag(SYS, 'ultrasoundRange') ?? ULTRASOUND_RANGE}"></label>` : '');

    pal.querySelectorAll('[data-sr3e-entry]').forEach(a => a.addEventListener('click', async ev => {
      ev.preventDefault(); ev.stopPropagation();
      const e = entries[Number(a.dataset.sr3eEntry)];
      if (!e.eligible) ui.notifications.warn(game.i18n.format('SR3E.Senses.GmOverride', { name: actor.name }));
      await actor.update(paletteClick(e, actor.system?.astralMode ?? ''));
      await SR3ESenses.apply(actor);
      hud.render();
    }));
    const range = pal.querySelector('.sr3e-us-range input');
    range?.addEventListener('keydown', ev => ev.stopPropagation());
    range?.addEventListener('change', async ev => {
      await actor.update({ [`flags.${SYS}.ultrasoundRange`]: Math.max(0, Number(ev.target.value) || 0) });
      await SR3ESenses.apply(actor);
    });

    (el.querySelector('.col.right') ?? el.querySelector('.col.left') ?? el).append(btn, pal);
  }

  /** Show, hide and glow one tile by its `aura` flag (TokenSenses.tileAura). */
  static _tileAura(tile) {
    const mesh = tile?.mesh;
    if (!mesh) return;
    const aura = tile.document?.flags?.[SYS]?.aura ?? '';
    const { show, glow } = tileAura(aura, { isGM: game.user.isGM, astralViewer: SR3ESenses.viewerIsAstral() });
    mesh.visible = !!tile.visible && show;
    const GlowOverlayFilter = foundry.canvas.rendering.filters.GlowOverlayFilter;
    SR3ESenses._tileGlow ??= GlowOverlayFilter.create({ glowColor: [0.95, 0.8, 0.35, 1] });
    const others = (mesh.filters ?? []).filter(f => f !== SR3ESenses._tileGlow);
    mesh.filters = glow ? [...others, SR3ESenses._tileGlow] : (others.length ? others : null);
  }

  /** Is this client looking through astral sight right now? */
  static viewerIsAstral() {
    const controlled = canvas.tokens?.controlled ?? [];
    return controlled.some(t => t.document.sight?.visionMode === VISION.astral);
  }

  static _auraHint(token, hovered) {
    document.querySelector('.sr3e-aura-hint')?.remove();
    if (!hovered || !SR3ESenses.viewerIsAstral() || !token.visible) return;
    const kind = auraKind(tokenFacts(token));
    if (kind === 'none') return;
    const p = canvas.clientCoordinatesFromCanvas(token.center);
    const div = document.createElement('div');
    div.className = 'sr3e-aura-hint';
    div.textContent = game.i18n.localize(kind === 'awakened' ? 'SR3E.Senses.AuraAwakened' : 'SR3E.Senses.AuraMundane');
    Object.assign(div.style, { position: 'fixed', left: `${p.x}px`, top: `${p.y - token.h / 2 * canvas.stage.scale.y - 24}px` });
    document.body.appendChild(div);
  }

  static _drawWards() {
    const layer = canvas.interface;
    if (!layer) return;
    let g = SR3ESenses._wardGraphics;
    if (!g || g.destroyed) { g = SR3ESenses._wardGraphics = new PIXI.Graphics(); layer.addChild(g); }
    g.clear();
    if (!SR3ESenses.viewerIsAstral()) return;
    for (const w of canvas.walls?.placeables ?? []) {
      const force = wardForce(w.document);
      if (!force) continue;
      const [x0, y0, x1, y1] = w.document.c;
      g.lineStyle(6, 0xb070ff, 0.75).moveTo(x0, y0).lineTo(x1, y1);
    }
  }
}
