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
import { VehicleDesign, CLASSES } from './vehicle-design.mjs';
import { PLANTS } from './vehicle-design-tables.mjs';
import { VehicleDesignActor } from './vehicle-design-actor.mjs';
import { DesignOptions } from './design-options.mjs';
import { ModCatalog } from './mod-catalog.mjs';
import { WeaponArt } from './weapon-art.mjs';
import { VehicleMods } from './vehicle-mods.mjs';

export const FORMAT = 'sr3e-design';
export const SCHEMA = 1;
export const KINDS = ['weapon', 'vehicle'];
/** The system's id — compendium UUIDs are `Compendium.<SYSTEM_ID>.<pack>.Item.<id>`. */
export const SYSTEM_ID = 'The2ndChumming3e';
/** Caps on what a design may ask for — a link is untrusted input. Over the cap is cut, with a warning. */
export const LIMITS = { mods: 12, vehicleMods: 40, options: 40, ammo: 12, qty: 100, rating: 20, name: 80, figure: 100000, markUpExtra: 3 };
/** A vehicle design's functional improvements (R3R pp.115-116) — the keys `VehicleDesign.evaluate` reads from `improve`. */
export const IMPROVE_KEYS = ['accel', 'speed', 'handling', 'handlingOffRoad', 'economySteps', 'cargo', 'load', 'signature'];

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
  FORMAT, SCHEMA, KINDS, LIMITS, SYSTEM_ID,

  /** `"pack/id"` → `{ pack, id }`, or null when it is not a reference. */
  parseRef(ref) {
    const m = REF.exec(String(ref ?? ''));
    return m ? { pack: m[1], id: m[2] } : null;
  },

  /** The compendium UUID for a reference, or null — an Item's, or with `'Actor'` a book vehicle's. */
  uuidOf(ref, documentName = 'Item') {
    const r = GearDesign.parseRef(ref);
    return r ? `Compendium.${SYSTEM_ID}.${r.pack}.${documentName === 'Actor' ? 'Actor' : 'Item'}.${r.id}` : null;
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
    design.mods = list('mods', design.kind === 'vehicle' ? LIMITS.vehicleMods : LIMITS.mods,
      e => (e.rating == null || e.rating === '' ? { ref: e.ref } : { ref: e.ref, rating: clampInt(e.rating, 0, LIMITS.rating) }));
    design.ammo = design.kind === 'weapon' ? list('ammo', LIMITS.ammo, e => ({ ref: e.ref, qty: clampInt(e.qty ?? 1, 1, LIMITS.qty) })) : [];
    // A vehicle with a `base` is a BOOK vehicle plus aftermarket mods (the maintainer, 2026-11-12); without one, an R3R design.
    if (design.kind === 'vehicle') design.vehicle = GearDesign.normaliseVehicle(design.base ? {} : raw.vehicle, warnings);
    const claimed = raw.claimed && typeof raw.claimed === 'object' ? raw.claimed : {};
    design.claimed = Object.fromEntries(['cost', 'rc', 'dp'].filter(k => Number.isFinite(Number(claimed[k]))).map(k => [k, Number(claimed[k])]));
    return { design, warnings };
  },

  /**
   * A vehicle design's choices (everything but its mods, which ride `design.mods` as references), cleaned: a chassis and
   * plant the tables know, the improvements as clamped numbers, catalogue design options with their inputs only. ⚠ An
   * option's typed `dp` / `cf` / `load` (the in-Foundry designer's "compute, GM edits") is NOT read from a link — the GM
   * types it again in Foundry if they want it — so a link can never price an option by hand.
   */
  normaliseVehicle(raw, warnings = []) {
    const v = raw && typeof raw === 'object' ? raw : {};
    const out = { chassis: '', plant: '', improve: {}, freed: { cf: 0, load: 0 }, smartMaterials: false, options: [],
      markUpExtra: 0, vehicleClass: 'standard', streetIndexExtra: 0, extraNuyen: 0 };
    if (v.chassis && !VehicleDesign.chassis(v.chassis)) warnings.push(`Unknown chassis "${String(v.chassis).slice(0, 40)}" — left blank.`);
    out.chassis = VehicleDesign.chassis(v.chassis) ? v.chassis : '';
    // A Power Plant Table row id ('E:Sedan') or a bare plant code ('G') — anything else is not a plant.
    const plant = String(v.plant ?? '').slice(0, 80);
    if (plant && !VehicleDesign.plantRow(plant) && !PLANTS[plant]) warnings.push(`Unknown power plant "${plant.slice(0, 40)}" — left blank.`);
    out.plant = VehicleDesign.plantRow(plant) || PLANTS[plant] ? plant : '';
    const fig = x => Math.min(LIMITS.figure, Math.max(0, num(x)));
    for (const k of IMPROVE_KEYS) if (fig(v.improve?.[k]) > 0) out.improve[k] = fig(v.improve[k]);
    out.freed = { cf: fig(v.freed?.cf), load: fig(v.freed?.load) };
    out.smartMaterials = v.smartMaterials === true;
    const opts = Array.isArray(v.options) ? v.options : [];
    if (opts.length > LIMITS.options) warnings.push(`${opts.length} design options — only the first ${LIMITS.options} are read.`);
    for (const o of opts.slice(0, LIMITS.options)) {
      const row = DesignOptions.newRow(o?.id);
      if (!row) { warnings.push(`Unknown design option "${String(o?.id ?? '').slice(0, 30)}" — skipped.`); continue; }
      for (const [k] of DesignOptions.get(o.id).inputs) if (o[k] != null) row[k] = typeof row[k] === 'number' ? fig(o[k]) : String(o[k]).slice(0, 40);
      if (['dp', 'cf', 'load'].some(k => o[k] !== '' && o[k] != null)) warnings.push(`${row.name}: a hand-typed figure in the link is ignored — recomputed (type it again in Foundry if the GM allows it).`);
      out.options.push(row);
    }
    out.markUpExtra = Math.min(LIMITS.markUpExtra, fig(v.markUpExtra));
    out.vehicleClass = CLASSES[v.vehicleClass] ? v.vehicleClass : 'standard';
    out.streetIndexExtra = Math.min(10, fig(v.streetIndexExtra));
    out.extraNuyen = fig(v.extraNuyen);
    return out;
  },

  /** What a vehicle mod's printed design figures read against (R3R p.112) — the in-Foundry designer's `_ctx`. */
  vehicleCtx(vehicle) {
    const ch = VehicleDesign.chassis(vehicle?.chassis);
    const body = ch ? VehicleDesign.cell(ch.body, 0) : 0;
    const plant = VehicleDesign.plantRow(vehicle?.plant) ?? (ch ? VehicleDesign.plantsFor(ch.id, vehicle?.plant)[0] : null);
    return { body, chassis: ch?.dp ?? null, plant: plant ? VehicleDesign.cell(plant.dp, body) : null, pilot: null };
  },

  /**
   * A vehicle design as the in-Foundry Vehicle Designer's own design object (TODO 287/297), every mod priced from its
   * compendium entry by `lookup`: `{ designer, result, warnings, unknown, totals }`. `designer` opens in that window and
   * creates the vehicle through its Create button (`sr3e.actor.create`, so a player owns it) — the one create path.
   */
  async assembleVehicle(design, lookup) {
    const warnings = [], unknown = [];
    const v = design.vehicle ?? GearDesign.normaliseVehicle({});
    const ctx = GearDesign.vehicleCtx(v);
    const mods = [];
    for (const entry of design.mods) {
      const item = await lookup(entry.ref);
      if (!item) { unknown.push(entry.ref); continue; }
      if (item.type !== 'vehiclemod') { warnings.push(`${item.name} is not a vehicle modification — skipped.`); continue; }
      const level = ModCatalog.rated(item) ? (entry.rating ?? item.system?.rating ?? 1) : null;
      const row = VehicleDesignActor.modRow(item, { ...ctx, level: level ?? 1 });
      if (ModCatalog.aftermarket(item.name)) Object.assign(row, { dp: 0, unpriced: false });
      const max = ModCatalog.maxLevel(item);
      if (max && level > max) warnings.push(`${item.name}: level ${level} is over the book's maximum of ${max}.`);
      if (row.unpriced) warnings.push(`${item.name}: no design cost is printed — 0 points until the GM types one (R3R p.112).`);
      mods.push({ ...row, uuid: GearDesign.uuidOf(entry.ref), level });
    }
    const designer = { name: design.name, ...structuredClone(v), mods };
    const result = VehicleDesign.evaluate(designer);
    if (unknown.length) warnings.push(`${unknown.length} item(s) not found in this catalogue: ${unknown.join(', ')} — left out.`);
    warnings.push(...(result.warnings ?? []));
    const totals = { cost: num(result.price ?? result.cost), dp: num(result.dp?.total), chassis: result.chassis?.name ?? '' };
    return { designer, result, warnings: [...new Set(warnings)], unknown, totals };
  },

  /**
   * A BOOK vehicle with aftermarket mods (the maintainer, 2026-11-12: "Book stats + aftermarket mods") — no Design Points:
   * the vehicle's printed price plus each mod's, recomputed from `lookup(ref, documentName)`. Returns
   * `{ vehicle, mods, effective, warnings, unknown, totals: { cost, base, mods, cf, load } }`:
   *  - `vehicle` — the book vehicle's data (null when not found); import copies it (`sr3e.actor.create`) and embeds `mods`;
   *  - `mods` — each mod's data at its level (`ModRatings.withLevel`), a blank price filled from the vehicle
   *    (`VehicleMods.price`, R3R pp.126-135 — what `preCreateItem` does on install);
   *  - `effective` — `VehicleMods.effective`: the stats with the mods applied, and its warnings;
   *  - `cf` / `load` — the CF and Load the mods take (their printed figures at that level, R3R p.112), shown, never enforced.
   */
  async assembleBookVehicle(design, lookup) {
    const warnings = [], unknown = [];
    const vehicle = design.base ? await lookup(design.base, 'Actor') : null;
    if (design.base && !vehicle) unknown.push(design.base);
    else if (vehicle && vehicle.type !== 'vehicle') { warnings.push(`${vehicle.name} is not a vehicle.`); }
    const body = num(vehicle?.system?.attributes?.body?.base ?? vehicle?.system?.attributes?.body?.value);
    const mods = [];
    let cf = 0, load = 0;
    for (const entry of design.mods) {
      let mod = await lookup(entry.ref, 'Item');
      if (!mod) { unknown.push(entry.ref); continue; }
      if (mod.type !== 'vehiclemod') { warnings.push(`${mod.name} is not a vehicle modification — skipped.`); continue; }
      mod = structuredClone(mod);
      if (entry.rating != null && ModRatings.levelsOf(mod)) {
        if (!ModRatings.levelsOf(mod)[entry.rating]) warnings.push(`${mod.name}: level ${entry.rating} is not a printed level.`);
        mod = ModRatings.withLevel(mod, entry.rating);
      } else if (entry.rating != null) mod.system = { ...mod.system, rating: entry.rating };
      const max = ModCatalog.maxLevel(mod);
      if (max && entry.rating > max) warnings.push(`${mod.name}: level ${entry.rating} is over the book's maximum of ${max}.`);
      if (!(num(mod.system?.cost) > 0) && vehicle) {
        const price = VehicleMods.price(mod, vehicle, mods);
        if (price != null) mod.system = { ...mod.system, cost: price };
        else warnings.push(`${mod.name}: no price printed for this vehicle — 0¥ until the GM types one.`);
      }
      const row = VehicleDesignActor.modRow(mod, { body, level: entry.rating ?? mod.system?.rating ?? 1 });
      cf += num(row.cf);
      load += num(row.load);
      mods.push(mod);
    }
    const effective = vehicle ? VehicleMods.effective(vehicle, mods) : null;
    warnings.push(...(effective?.warnings ?? []));
    if (unknown.length) warnings.push(`${unknown.length} item(s) not found in this catalogue: ${unknown.join(', ')} — left out.`);
    const base = num(vehicle?.system?.cost);
    const modCost = mods.reduce((t, m) => t + num(m.system?.cost), 0);
    return { vehicle, mods, effective, warnings: [...new Set(warnings)], unknown,
      totals: { cost: base + modCost, base, mods: modCost, cf, load } };
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
    // Its model's picture, once the ComfyUI batch has drawn one (TODO 300); else the pack icon stays.
    const pic = base && WeaponArt.pictureOf(base.name);
    if (weapon && pic) weapon.img = pic;
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
    if ('dp' in design.claimed && 'dp' in totals && design.claimed.dp !== totals.dp) {
      out.push(`The design says ${design.claimed.dp} Design Points; recomputed: ${totals.dp}.`);
    }
    if ('rc' in design.claimed && 'rc' in totals && design.claimed.rc !== totals.rc) {
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
