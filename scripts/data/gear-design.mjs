/**
 * A gear design — the web designer's file and link, and the one way it becomes item data · TODO 298. Pure — no Foundry.
 *
 * The web page (`designer/`, GitHub Pages) and Foundry's importer (`scripts/SR3EDesignImport.js`) both call this module,
 * so a design means the same thing in both (docs/web-designer-proposal.md, "one shared core").
 *
 * **A design is references and choices, never numbers.** `base` and every mod and ammo entry name a compendium document as
 * `"<pack>/<id>"`; the rest is what the player picked (a mod's level, how many boxes of ammo). The receiving side looks
 * each reference up in ITS OWN catalogue and recomputes everything — a hand-edited link cannot make cheap gear. The
 * figures the page showed travel along as `claimed`, only so the importer can say when the two disagree.
 *
 * **Warn, never refuse.** An unknown reference, a mount already taken, a version mismatch — all warnings; the import goes
 * ahead. The one exception is `ItemMods.blocked` (a stock on a rifle or shotgun), the system's one refusal: that mod is
 * left out, with a warning saying why.
 *
 *   { format: 'sr3e-design', schema: 1, system: '0.8.0', kind: 'weapon', name: 'My Predator',
 *     base: 'sr3e-sr3-firearms/abc', mods: [{ ref: 'sr3e-sr3-gear/def', rating: 2 }], ammo: [{ ref: '…', qty: 2 }],
 *     claimed: { cost: 1250 } }
 */
import { ItemMods } from './item-mods.mjs';
import { ModRatings } from './mod-ratings.mjs';
import { WeaponAccessories } from './weapon-accessories.mjs';

export const FORMAT = 'sr3e-design';
export const SCHEMA = 1;
export const KINDS = ['weapon'];
/** The system's id — compendium UUIDs are `Compendium.<SYSTEM_ID>.<pack>.Item.<id>`. */
export const SYSTEM_ID = 'The2ndChumming3e';
/** Caps on what a design may ask for — a link is untrusted input. Over the cap is cut, with a warning. */
export const LIMITS = { mods: 12, ammo: 12, qty: 100, rating: 20, name: 80 };

const REF = /^([a-z0-9-]{1,64})\/([A-Za-z0-9_-]{1,64})$/;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.trunc(num(v))));

/* ── base64url ↔ bytes, with no Buffer (the browser has none) ─────────────────────────────── */
const toB64url = bytes => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = text => {
  const s = atob(String(text).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
};
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

export const GearDesign = {
  FORMAT, SCHEMA, KINDS, LIMITS,

  /** `"pack/id"` → `{ pack, id }`, or null when it is not a reference. */
  parseRef(ref) {
    const m = REF.exec(String(ref ?? ''));
    return m ? { pack: m[1], id: m[2] } : null;
  },

  /** The compendium UUID for a reference, or null. */
  uuidOf(ref) {
    const r = GearDesign.parseRef(ref);
    return r ? `Compendium.${SYSTEM_ID}.${r.pack}.Item.${r.id}` : null;
  },

  /** A blank design. */
  blank(system = '') {
    return { format: FORMAT, schema: SCHEMA, system: String(system), kind: 'weapon', name: '', base: '', mods: [], ammo: [], claimed: {} };
  },

  /**
   * Any incoming object as a well-formed design, plus what was wrong with it: `{ design, warnings }`. Unknown keys dropped,
   * references checked for shape, numbers clamped, lists capped (`LIMITS`). An older schema is upgraded here (there is
   * only schema 1 so far); a newer one is read as far as it can be, with a warning.
   */
  normalise(input) {
    const warnings = [];
    const raw = input && typeof input === 'object' ? input : {};
    if (raw.format !== FORMAT) warnings.push('This does not say it is an SR3 gear design — read as one anyway.');
    if (num(raw.schema) > SCHEMA) warnings.push(`The design is schema ${raw.schema}; this version reads schema ${SCHEMA} — anything newer is ignored.`);
    const design = GearDesign.blank(typeof raw.system === 'string' ? raw.system.slice(0, 20) : '');
    design.kind = KINDS.includes(raw.kind) ? raw.kind : 'weapon';
    if (raw.kind && raw.kind !== design.kind) warnings.push(`Unknown design kind "${String(raw.kind).slice(0, 20)}" — read as a weapon.`);
    design.name = String(raw.name ?? '').replace(/[<>]/g, '').slice(0, LIMITS.name).trim();
    if (raw.base && !GearDesign.parseRef(raw.base)) warnings.push('The base weapon reference is malformed.');
    design.base = GearDesign.parseRef(raw.base) ? raw.base : '';
    const list = (key, cap, shape) => {
      const src = Array.isArray(raw[key]) ? raw[key] : [];
      if (src.length > cap) warnings.push(`${src.length} ${key} — only the first ${cap} are read.`);
      const good = src.slice(0, cap).filter(e => GearDesign.parseRef(e?.ref));
      if (good.length < Math.min(src.length, cap)) warnings.push(`${Math.min(src.length, cap) - good.length} malformed ${key} reference(s) skipped.`);
      return good.map(shape);
    };
    design.mods = list('mods', LIMITS.mods, e => (e.rating == null || e.rating === '' ? { ref: e.ref } : { ref: e.ref, rating: clampInt(e.rating, 0, LIMITS.rating) }));
    design.ammo = list('ammo', LIMITS.ammo, e => ({ ref: e.ref, qty: clampInt(e.qty ?? 1, 1, LIMITS.qty) }));
    const claimed = raw.claimed && typeof raw.claimed === 'object' ? raw.claimed : {};
    design.claimed = Object.fromEntries(['cost', 'rc'].filter(k => Number.isFinite(Number(claimed[k]))).map(k => [k, Number(claimed[k])]));
    return { design, warnings };
  },

  /* ── The link and the file ────────────────────────────────────────────────────────────── */

  /** The design as a URL-hash payload: JSON, deflated, base64url. */
  async encode(design) {
    const bytes = new TextEncoder().encode(JSON.stringify(design));
    return toB64url(await pipe(bytes, new CompressionStream('deflate-raw')));
  },

  /** A hash payload back to a design object (not yet normalised). Throws on garbage. */
  async decode(payload) {
    const bytes = await pipe(fromB64url(payload), new DecompressionStream('deflate-raw'));
    return JSON.parse(new TextDecoder().decode(bytes));
  },

  /**
   * Whatever the user pasted — a designer link (`…#d=<payload>`), a bare payload, or the JSON file's text — as
   * `{ design, warnings }` (normalised). Throws when it is none of them.
   */
  async parse(text) {
    const s = String(text ?? '').trim();
    if (!s) throw new Error('Nothing to import.');
    let raw;
    if (s.startsWith('{')) raw = JSON.parse(s);
    else {
      const hash = /[#&?]d=([A-Za-z0-9_-]+)/.exec(s)?.[1] ?? (/^[A-Za-z0-9_-]+$/.test(s) ? s : null);
      if (!hash) throw new Error('That is not a designer link or design file.');
      raw = await GearDesign.decode(hash);
    }
    return GearDesign.normalise(raw);
  },

  /* ── Building the item ────────────────────────────────────────────────────────────────── */

  /**
   * The design as item data, recomputed from `lookup(ref) → item data | null` (may be async — Foundry reads its packs,
   * the page its catalogue). Returns `{ weapon, ammo, warnings, unknown, totals }`:
   *  - `weapon` — the base's data with each mod installed (`ItemMods.install`) at its level (`ModRatings.withLevel`);
   *  - `ammo` — `[{ data, qty }]`;
   *  - `unknown` — references the lookup did not find;
   *  - `totals` — `{ cost, rc, smartgun, laserSight, mounts }` from the rule modules.
   * `newId` makes an installed mod's `_id`.
   */
  async assemble(design, lookup, { newId = defaultId } = {}) {
    const warnings = [], unknown = [];
    const get = async ref => {
      const data = await lookup(ref);
      if (!data) unknown.push(ref);
      return data ? structuredClone(data) : null;
    };
    const base = design.base ? await get(design.base) : null;
    if (!design.base) warnings.push('No base weapon chosen.');
    if (base && base.type !== 'firearm' && base.type !== 'melee') warnings.push(`${base.name} is a ${base.type}, not a weapon.`);
    let weapon = base ?? null;
    let cost = num(base?.system?.cost);
    for (const entry of design.mods) {
      let mod = await get(entry.ref);
      if (!mod || !weapon) continue;
      if (entry.rating != null && ModRatings.levelsOf(mod)) {
        if (!ModRatings.levelsOf(mod)[entry.rating]) warnings.push(`${mod.name}: level ${entry.rating} is not a printed level.`);
        mod = ModRatings.withLevel(mod, entry.rating);
      }
      const blocked = ItemMods.blocked(weapon, mod);
      if (blocked) { warnings.push(`${blocked} Left out.`); continue; }
      warnings.push(...ItemMods.warnings(weapon, mod));
      if (weapon.type === 'firearm') warnings.push(...WeaponAccessories.installWarnings(weapon, mod));
      const smart = weapon.type === 'firearm' ? WeaponAccessories.internalSmartgunCost(weapon, mod) : null;
      if (smart != null && !(num(mod.system?.cost) > 0)) mod.system = { ...mod.system, cost: smart };
      cost += num(mod.system?.cost);
      weapon = { ...weapon, system: { ...weapon.system, installed: ItemMods.install(ItemMods.installed(weapon), mod, newId) } };
    }
    if (weapon && design.name) weapon.name = design.name;
    const ammo = [];
    for (const entry of design.ammo) {
      const data = await get(entry.ref);
      if (!data) continue;
      if (data.type !== 'ammunition') warnings.push(`${data.name} is not ammunition.`);
      cost += num(data.system?.cost) * entry.qty;
      // Bought `qty` times: one stockpile item holding them all (`rounds` is the total owned; reload-counted ammo, the reloads).
      if (data.type === 'ammunition' && entry.qty > 1) {
        data.system = { ...data.system, rounds: num(data.system?.rounds) * entry.qty };
        if (num(data.system.reloads)) data.system.reloads = num(data.system.reloads) * entry.qty;
        data.system.cost = num(data.system.cost) * entry.qty;
      }
      ammo.push({ data, qty: entry.qty });
    }
    if (unknown.length) warnings.push(`${unknown.length} item(s) not found in this catalogue: ${unknown.join(', ')} — left out.`);
    const totals = {
      cost,
      rc: weapon ? ItemMods.value(weapon, 'rc') : 0,
      smartgun: weapon?.type === 'firearm' ? WeaponAccessories.flag(weapon, 'smartgun') : false,
      laserSight: weapon?.type === 'firearm' ? WeaponAccessories.flag(weapon, 'laserSight') : false,
      mounts: weapon ? ItemMods.mountsInUse(ItemMods.installed(weapon)) : {},
    };
    return { weapon, ammo, warnings: [...new Set(warnings)], unknown, totals };
  },

  /**
   * Where the design's own figures, or the system version it was made with, differ from this side's: strings. The
   * recomputed figures are the ones imported (docs/web-designer-proposal.md, "Validation").
   */
  mismatches(design, totals, systemVersion = '') {
    const out = [];
    if (design.system && systemVersion && design.system !== systemVersion) {
      out.push(`Designed with system ${design.system}; this is ${systemVersion} — figures recomputed with this version's rules.`);
    }
    if ('cost' in design.claimed && design.claimed.cost !== totals.cost) {
      out.push(`The design says ${design.claimed.cost.toLocaleString()}¥; recomputed: ${totals.cost.toLocaleString()}¥ (imported at the recomputed price).`);
    }
    if ('rc' in design.claimed && design.claimed.rc !== totals.rc) {
      out.push(`The design says RC ${design.claimed.rc} from mods; recomputed: ${totals.rc}.`);
    }
    return out;
  },
};

/** A Foundry-shaped 16-character id, for the page; Foundry passes its own `randomID`. */
function defaultId() {
  const abc = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => abc[b % abc.length]).join('');
}
