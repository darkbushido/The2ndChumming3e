/**
 * Token senses — which SR3 ways of seeing a token has, and how each treats walls · TODO 299. Pure — no Foundry.
 *
 * The Foundry side (vision modes, detection modes, the hook that switches them) is `scripts/SR3ESenses.js`.
 * Settled with the maintainer, 2026-11-11 (grilling; notes `vision-modes-grill.md`):
 *
 * - **Low-light** needs SOME light — SR3 p.112 Visibility Table: Full Darkness +8/+8, Minimal Light +4/+2
 *   (normal +6). So dim light reads as bright, colour is kept, and true darkness stays dark.
 * - **Thermographic** ignores light; ordinary walls block it, and so do walls the GM flags as GLASS — a house
 *   rule, opt-in per wall. The book is silent on glass; p.112 only names Thermal Smoke as a block.
 * - **Ultrasound** (M&M p.20) builds its picture from sound: it ignores light, walls block it by their SOUND
 *   setting, and an invisibility spell does not hide a target from it (the target shows as an outline,
 *   +4 to act against it — the GM's to apply). **No book gives it a range**; 50 m is a house default,
 *   editable per token. Like sonar it also SHOWS the room — walls and surfaces out to that range, in the dark —
 *   as its own vision mode (the maintainer, live on the Vision test scene, 2026-11-11).
 * - **Astral** (SR3 pp.172-173): the astral plane is lit by auras, so light does not matter. A PERCEIVING
 *   character is still in their body and keeps ordinary walls. A PROJECTING astral form moves through solid
 *   objects, so only walls flagged as an astral barrier (a ward, with its Force) stop its sight. Astral-only
 *   forms (projecting characters, astral spirits) are seen only by astral sight. Dual-natured critters are
 *   always perceiving.
 * - Sources: metatype, cyberware, bioware (via `detectVision`), adept Improved Sense and WORN gear. Thermographic beats low-light
 *   beats normal as the default; the player may switch among what they have.
 */

/** Foundry vision-mode ids this system registers (plus core `basic`). */
export const VISION = Object.freeze({
  normal: 'basic',
  lowLight: 'sr3eLowLight',
  thermo: 'sr3eThermographic',
  ultrasound: 'sr3eUltrasoundVision',
  astral: 'sr3eAstral',
});

/** Foundry detection-mode ids this system registers. */
export const DETECTION = Object.freeze({
  thermo: 'sr3eThermographic',
  ultrasound: 'sr3eUltrasound',
  astral: 'sr3eAstralSight',
});

/** House default — M&M p.20 gives ultrasound vision no range (the maintainer, 2026-11-11). Metres. */
export const ULTRASOUND_RANGE = 50;

/**
 * "Unlimited" range for a detection mode. Foundry v14 stores the range as a REQUIRED FINITE number
 * (`common/documents/token.mjs:103`) — null and Infinity both fail validation (seen live, 2026-11-11). Scene units.
 */
export const UNLIMITED = 100000;

/** A detection range Foundry will accept: a finite number ≥ 0, else UNLIMITED. */
export function finiteRange(r) {
  const n = Number(r);
  return r !== null && r !== '' && Number.isFinite(n) && n >= 0 ? n : UNLIMITED;
}

/** The system's flag scope on walls and actors. */
export const FLAG_SCOPE = 'The2ndChumming3e';

/** Order of preference among the mundane vision modes: best first. */
const PREFERENCE = ['thermo', 'lowLight', 'ultrasound', 'normal'];

const LOW = /low[\s-]?light/i;
const THERMO = /thermograph|thermo\s*vision/i;
const ULTRA = /ultrasound/i;
/** Gear that is worn on the eyes — goggles, glasses, contacts, helmets, visors. Detectors and emitters are not. */
const EYEWEAR = /goggle|glasses|shades|contact|helmet|visor|vision/i;

/**
 * Is this gear something you wear to SEE with — goggles, glasses, a helmet, a sight — that grants low-light,
 * thermographic or ultrasound vision? Ultrasound emitters and detectors are not (they find a field, core p.293).
 */
export function isVisionGear(name = '') {
  const n = String(name);
  if (!(LOW.test(n) || THERMO.test(n) || ULTRA.test(n))) return false;
  if (ULTRA.test(n) && /emi?t+e?r|detector/i.test(n)) return false;
  // A weapon mod (scope, sight, flashlight) aims a gun; it does not change how the token sees the map.
  if (/\(weapon\)|scope|binocular|flash\s*light/i.test(n)) return false;
  return EYEWEAR.test(n) || /sight/i.test(n);
}

/**
 * Is gear worn? The item flag `worn` (the same flag armour uses, TODO 112), never while stored (TODO 113).
 */
export function isWornGear(item) {
  const f = item?.flags?.[FLAG_SCOPE] ?? {};
  return !!f.worn && !f.stored;
}

/**
 * The mundane senses an actor has.
 *
 * @param {object} actor  `{ system, items }` — items are `{ type, name, system }`
 * @param {object} vision the result of `detectVision(actor)` (`SR3ECombatModifiers.js`): racial, cyber, bioware
 * @returns {{ modes: string[], ultrasound: boolean, sources: Record<string, string[]> }}
 *   `modes` are keys of VISION in preference order, always ending with `normal`.
 */
export function mundaneSenses(actor, vision = {}) {
  const sources = { lowLight: [], thermo: [], ultrasound: [] };
  for (const n of vision.natural ?? []) sources[n.column]?.push(n.source ?? `racial (${vision.metatype})`);
  for (const c of vision.cyber ?? []) sources[c.column]?.push(c.source);

  for (const i of actor?.items ?? []) {
    const name = String(i?.name ?? '');
    if (i?.type === 'cyberware' && ULTRA.test(name)) sources.ultrasound.push(name);
    // Adept Improved Sense (Imp. Sense: Low-Light Vision / Thermo Vision) — natural to the adept.
    if (i?.type === 'adeptpower' && /sense/i.test(name)) {
      if (LOW.test(name)) sources.lowLight.push(name);
      if (THERMO.test(name)) sources.thermo.push(name);
    }
    if (i?.type !== 'gear' || !TokenSenses.isWornGear(i) || !TokenSenses.isVisionGear(name)) continue;   // via the object: mutants reach it
    if (LOW.test(name)) sources.lowLight.push(name);
    if (THERMO.test(name)) sources.thermo.push(name);
    if (ULTRA.test(name)) sources.ultrasound.push(name);
  }
  const modes = PREFERENCE.filter(k => k === 'normal' || sources[k]?.length);
  return { modes, ultrasound: sources.ultrasound.length > 0, sources };
}

/**
 * The actor's astral state for sight: '' (none), 'perceive' or 'project'.
 * `astralMode` 'dual' = perceiving; 'astral' = projecting. A dual-natured critter always perceives (SR3 p.173).
 */
export function astralState(astralMode, dualNatured = false) {
  if (astralMode === 'astral') return 'project';
  if (astralMode === 'dual' || dualNatured) return 'perceive';
  return '';
}

/**
 * The vision mode a token should use.
 * @param {string[]} modes    from `mundaneSenses` (keys of VISION)
 * @param {string} astral     from `astralState`
 * @param {string} [chosen]   a mode key the player picked, honoured while they still have it
 */
export function visionModeFor(modes, astral, chosen = '') {
  if (astral) return VISION.astral;
  if (chosen && modes.includes(chosen)) return VISION[chosen];
  return VISION[modes[0] ?? 'normal'];
}

/**
 * The SR3 detection modes a token should carry: `{ id, enabled, range }` (range in scene units, null =
 * unlimited — written as UNLIMITED). Core modes (lightPerception, basicSight) are left to Foundry.
 */
export function detectionModesFor({ modes = [], ultrasound = false, astral = '', ultrasoundRange = ULTRASOUND_RANGE } = {}) {
  const out = [];
  if (modes.includes('thermo')) out.push({ id: DETECTION.thermo, enabled: true, range: UNLIMITED });
  if (ultrasound) out.push({ id: DETECTION.ultrasound, enabled: true, range: ultrasoundRange });
  if (astral) out.push({ id: DETECTION.astral, enabled: true, range: UNLIMITED });
  return out;
}

/**
 * The `detectionModes` UPDATE for a token (Foundry v14 keys them by id — `common/documents/token.mjs:101`).
 * Ours that apply are enabled; ours that no longer apply are DISABLED rather than deleted, keeping the range the
 * GM typed on the token. Core and other modules' modes are not touched.
 *
 * @param {Record<string, {enabled:boolean, range:number|null}>} existing  the token's current detectionModes
 * @param {Array<{id:string, enabled:boolean, range:number|null}>} ours     from `detectionModesFor`
 */
export function detectionUpdate(existing = {}, ours = []) {
  const out = {};
  const want = new Map(ours.map(m => [m.id, m]));
  for (const id of Object.values(DETECTION)) {
    const prior = existing?.[id];
    if (want.has(id)) out[id] = { enabled: true, range: TokenSenses.finiteRange(prior?.range ?? want.get(id).range) };
    else if (prior) out[id] = { enabled: false, range: TokenSenses.finiteRange(prior.range) };
  }
  return out;
}

/**
 * The 👁 dialog's Dual Natured tick and the sheet's Dual Natured button are ONE switch: `system.astralMode` 'dual'
 * (the maintainer, live 2026-11-11 — ticking one did not move the other). The older `dualNatured` flag still reads
 * as ticked, and is cleared the first time the tick is saved.
 */
export function dualTicked(astralMode = '', flag = false) {
  return astralMode === 'dual' || !!flag;
}

/** The actor update for saving the tick. Unticking leaves a projecting form alone; it only ends perceiving. */
export function dualTickUpdate(astralMode = '', ticked = false, flag = false) {
  const upd = {};
  if (ticked && astralMode !== 'dual' && astralMode !== 'astral') upd['system.astralMode'] = 'dual';
  if (!ticked && astralMode === 'dual') upd['system.astralMode'] = 'physical';
  if (flag) upd[`flags.${FLAG_SCOPE}.dualNatured`] = false;
  return upd;
}

/**
 * Which wall rule shapes a token's SIGHT polygon (what it sees of the map, and the line of sight every sight-based
 * detection then uses): 'project' (astral form — ward walls only), 'thermo' (sight walls + glass),
 * 'ultrasound' (sonar — SOUND walls), or 'sight'.
 */
export function polygonSense(visionModeId, astralMode) {
  if (visionModeId === VISION.astral && astralMode === 'astral') return 'project';
  if (visionModeId === VISION.thermo) return 'thermo';
  if (visionModeId === VISION.ultrasound) return 'ultrasound';
  return 'sight';
}

/**
 * Does this wall stop the given sense? `wall` is `{ sight, sound, flags }` with Foundry's sense-type numbers
 * (0 = none). The flags are read from FLAG_SCOPE.
 *
 * - sight (normal / low-light / perceiving): the wall's SIGHT setting.
 * - thermo: SIGHT, or a GLASS flag (house rule).
 * - ultrasound: the SOUND setting.
 * - project: only a WARD flag (an astral barrier with a Force).
 */
export function wallBlocks(sense, wall = {}) {
  const f = wall.flags?.[FLAG_SCOPE] ?? {};
  switch (sense) {
    case 'thermo': return !!wall.sight || !!f.glass;
    case 'ultrasound': return !!wall.sound;
    case 'project': return wardForce(wall) > 0;
    default: return !!wall.sight;
  }
}

/** A wall's ward Force, 0 when it is not an astral barrier. */
export function wardForce(wall = {}) {
  const n = Math.trunc(Number(wall.flags?.[FLAG_SCOPE]?.ward) || 0);
  return Math.max(0, n);
}

/**
 * Is a token astral-only — seen only by astral sight? A projecting character (`astralMode` 'astral') or anything
 * carrying the `sr3e-astral` status (the GM marks an astral spirit that way). Dual-natured beings are not.
 */
export function isAstralOnly({ astralMode = '', statuses = [] } = {}) {
  return astralMode === 'astral' || [...statuses].includes('sr3e-astral');
}

/**
 * What an astral viewer reads off an aura without a roll — the first line of the Assensing Table only
 * (SR3 p.172, the maintainer 2026-11-11): 'awakened', 'mundane', or 'none' (no aura: vehicles, drones).
 * Everything else on that table stays an Assensing Test.
 */
export function auraKind({ type = '', magic = 0, dualNatured = false, statuses = [] } = {}) {
  if (type === 'vehicle' || type === 'ic' || type === 'agent' || type === 'host') return 'none';
  if (type === 'ward') return 'awakened';
  if ((Number(magic) || 0) > 0 || dualNatured || [...statuses].includes('sr3e-astral')) return 'awakened';
  return 'mundane';
}

export const TokenSenses = {
  VISION, DETECTION, ULTRASOUND_RANGE, FLAG_SCOPE, UNLIMITED, finiteRange,
  isVisionGear, isWornGear, mundaneSenses, astralState, visionModeFor, detectionModesFor, detectionUpdate,
  polygonSense, wallBlocks, wardForce, isAstralOnly, auraKind, dualTicked, dualTickUpdate,
};
