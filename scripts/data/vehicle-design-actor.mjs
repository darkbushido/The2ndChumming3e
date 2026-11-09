/**
 * From a vehicle design to a vehicle actor — pure, so it can be tested · TODO 287, slice 2
 *
 * `VehicleDesign.evaluate` (R3R pp.109-121) gives the stats; this module turns them into the vehicle's fields, prices a
 * picked vehicle mod by its DESIGN figures (`design-costs.mjs`), and lists what a re-save would change. The maintainer's
 * rulings, 2026-11-07: the design is stored on the vehicle (`flags.The2ndChumming3e.design`); re-saving OFFERS the
 * changed stats (old → new, each ticked) rather than writing over hand edits — "offer, never apply".
 */
import { VehicleDesign } from './vehicle-design.mjs';
import { DesignCosts } from './design-costs.mjs';
import { ModRatings } from './mod-ratings.mjs';

export const FLAG = 'design';
/** Where an embedded mod records the compendium entry it came from — a flag, because a player may not write `_stats`. */
export const SOURCE_FLAG = 'designSource';

/** Chassis category → the vehicle sheet's type list (a drone chassis is a drone). */
export const TYPE_FOR = {
  bike: 'bike', boat: 'boat', car: 'car', fixedwing: 'aircraft', hover: 'hovercraft', rotor: 'aircraft',
  ship: 'boat', sub: 'boat', vectored: 'aircraft', special: 'other',
};

/** The fields a design writes, with a label for the re-save offer. Attributes write base AND value. */
export const FIELDS = [
  ['vehicleType', 'Type'], ['handling', 'Handling'], ['handlingOffRoad', 'Off-road Handling'], ['speed', 'Speed'],
  ['accel', 'Acceleration'], ['body', 'Body'], ['armor', 'Armor'], ['sig', 'Signature'], ['autonav', 'Autonav'],
  ['sensor', 'Sensor'], ['cargo', 'Cargo (CF)'], ['load', 'Load (kg)'], ['seating', 'Seating'], ['entryPoints', 'Entry points'],
  ['stallSpeed', 'Stall speed'], ['cost', 'Cost (¥)'], ['streetIndex', 'Street Index'], ['availability', 'Availability'],
];
const ATTRS = new Set(['handling', 'handlingOffRoad', 'speed', 'accel', 'body', 'armor', 'sig', 'autonav', 'sensor', 'cargo', 'load']);

const int = v => { const n = parseInt(String(v ?? '').replace(/,/g, ''), 10); return Number.isFinite(n) ? n : null; };
const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

/**
 * A trailer and the vehicle designed to tow it (the maintainer, 2026-11-09: a truck and its trailer designed together, as a
 * linked pair). Two actors, as the book has it — a trailer takes no power plant (R3R p.109) — each pointing at the other.
 */
export const TOW_FLAG = 'towLink';
/**
 * A tractor pulls up to five trailers — the Nordkapp-Conestoga Bergen's tractor module "can be connected with up to five
 * additional trailer modules" into a road train (R3R p.193). The maintainer, 2026-11-09: "maxing out at 5 seems fine".
 */
export const MAX_TRAILERS = 5;

export const VehicleDesignActor = {
  /**
   * A tractor's trailers from its link flag: `[{ uuid, name, hitched }]`. A link written before the road train (one
   * trailer as `other`) reads as that trailer, hitched.
   */
  trailersOf(flag) {
    if (Array.isArray(flag?.trailers)) return flag.trailers;
    return flag?.role === 'tow' && flag.other?.uuid ? [{ ...flag.other, hitched: true }] : [];
  },

  /**
   * The flag updates that link a trailer to its tractor: `{ trailer, tow, full }`. The trailer names its tractor; the
   * tractor's list gains the trailer, hitched (a trailer already on it is not added twice). With MAX_TRAILERS already on
   * the list, `full` is true and nothing is written. The GM still hitches them in play.
   */
  towLink(scope, trailer, tow, towFlag = null) {
    const ref = a => ({ uuid: a?.uuid ?? null, name: a?.name ?? '' });
    const list = this.trailersOf(towFlag).filter(t => t.uuid !== trailer?.uuid);
    if (list.length >= MAX_TRAILERS) return { trailer: null, tow: null, full: true };
    return {
      trailer: { [`flags.${scope}.${TOW_FLAG}`]: { role: 'trailer', other: ref(tow) } },
      tow: { [`flags.${scope}.${TOW_FLAG}`]: { role: 'tow', trailers: [...list, { ...ref(trailer), hitched: true }] } },
      full: false,
    };
  },

  /** The tractor's flag update that hitches (or unhitches) one of its trailers. */
  hitch(scope, towFlag, uuid, on) {
    const trailers = this.trailersOf(towFlag).map(t => (t.uuid === uuid ? { ...t, hitched: !!on } : t));
    return { [`flags.${scope}.${TOW_FLAG}`]: { role: 'tow', trailers } };
  },

  /**
   * Can the tractor pull what is hitched? House rule (the maintainer, 2026-11-09 — R3R prints no towing rule): its Load
   * must cover the hitched trailers' Load. `trailers` are `[{ hitched, load }]`. Warns, never blocks.
   * Out: { count, pulled, ok, warning }.
   */
  pull(towLoad, trailers = []) {
    const on = trailers.filter(t => t.hitched);
    const pulled = on.reduce((s, t) => s + (Number(t.load) || 0), 0);
    const ok = towLoad == null || pulled <= Number(towLoad);
    return {
      count: on.length, pulled, ok,
      warning: ok ? null : `The hitched trailers carry up to ${pulled.toLocaleString()} kg — more than this vehicle's Load of ${Number(towLoad).toLocaleString()} kg (house rule: a tractor's Load covers its trailers')`,
    };
  },

  /** The vehicle's values for a design result: `{ field: value }` — a figure the result lacks is left out. */
  values(result) {
    if (!result?.chassis) return {};
    const s = result.stats ?? {};
    const ch = result.chassis;
    const body = VehicleDesign.bodyOf(ch);
    const out = {
      vehicleType: ch.drone ? 'drone' : (TYPE_FOR[ch.category] ?? 'other'),
      handling: s.handling, handlingOffRoad: s.handlingOffRoad, speed: s.speed, accel: s.accel,
      body, armor: VehicleDesign.cell(ch.armor, body), sig: s.sig,
      autonav: VehicleDesign.cell(ch.autonav, body), sensor: VehicleDesign.cell(ch.sensor, body),
      cargo: s.cargo == null ? null : Math.floor(s.cargo), load: s.load,
      seating: int(ch.seating), entryPoints: ch.entry == null ? null : String(ch.entry),
      stallSpeed: s.stall, cost: result.cost, streetIndex: result.streetIndex, availability: result.availability?.text,
    };
    for (const k of Object.keys(out)) if (out[k] == null || (typeof out[k] === 'number' && !Number.isFinite(out[k]))) delete out[k];
    for (const k of ATTRS) if (k in out) out[k] = Math.max(0, Math.round(out[k]));
    return out;
  },

  /** The actor update for those values: attributes write `.base` and `.value`; the rest `system.<field>`. */
  update(values) {
    const u = {};
    for (const [k, v] of Object.entries(values)) {
      if (ATTRS.has(k)) { u[`system.attributes.${k}.base`] = v; u[`system.attributes.${k}.value`] = v; }
      else u[`system.${k}`] = v;
    }
    return u;
  },

  /** What a re-save would change on `actor` (its plain data): `[{ field, label, from, to }]`, unchanged fields left out. */
  changes(actor, values) {
    const rows = [];
    for (const [field, label] of FIELDS) {
      if (!(field in values)) continue;
      const from = get(actor, ATTRS.has(field) ? `system.attributes.${field}.value` : `system.${field}`);
      const to = values[field];
      if (String(from ?? '') !== String(to)) rows.push({ field, label, from: from ?? '', to });
    }
    return rows;
  },

  /** The update for the ticked rows only — what the GM accepted. */
  accepted(rows, ticked) {
    return VehicleDesignActor.update(Object.fromEntries(rows.filter(r => ticked.has(r.field)).map(r => [r.field, r.to])));
  },

  /**
   * The design's picked mods the vehicle does not carry yet — what Create embeds and a re-save OFFERS (the maintainer,
   * 2026-11-08: "Offer new ones, never remove"). A mod counts as carried when an item has its compendium source — our
   * `designSource` flag, else `_stats.compendiumSource` / `core.sourceId` (or, for
   * an item without one, its name) as many times as the design lists it. Typed mods (no uuid) are left out: there is no
   * document to copy. Never lists anything to remove.
   */
  missingMods(designMods = [], items = []) {
    // A pool of carried mods; each design mod consumes ONE item — by source first, else by name — so one item never
    // covers two design copies (§82 live check, 2026-11-08).
    const pool = items.filter(i => i?.type === 'vehiclemod').map(i => ({
      source: i.flags?.The2ndChumming3e?.[SOURCE_FLAG] || i._stats?.compendiumSource || i.flags?.core?.sourceId || null,
      name: i.name,
    }));
    const out = [];
    for (const m of designMods) {
      if (!m?.uuid) continue;
      let at = pool.findIndex(p => p.source === m.uuid);
      if (at < 0) at = pool.findIndex(p => p.name === m.name);
      if (at >= 0) pool.splice(at, 1);
      else out.push(m);
    }
    return out;
  },

  /**
   * A compendium mod's data as the vehicle's item at the design's level (rated mods carry it as `system.rating`). A mod
   * with printed levels (Amphibious Package 1-3) takes that level's cost, CF and the rest too (`ModRatings.withLevel`).
   */
  modItemData(source, m) {
    let data = { ...source };
    delete data._id;
    data.system = { ...(source.system ?? {}) };
    if (m?.level != null && source.system?.rating != null) {
      const level = Number(m.level) || data.system.rating;
      data = ModRatings.levelsOf(data) ? ModRatings.withLevel(data, level) : data;
      data.system.rating = level;
    }
    return data;
  },

  /**
   * The designer's mod list: one entry per name (the user, 2026-11-08: "datajack port shows up twice"). The same mod in
   * two books' packs (Datajack Port in SR3 and R3R) or twice in one pack (Pintle Mount) is offered once — the copy that
   * carries design figures, else an R3R one, else the first. Each keeps its `bookPage` for the label. Sorted by name.
   */
  pickList(index = []) {
    const score = e => (e.system?.designCost ? 2 : 0) + (/(^|,)r3\./.test(String(e.system?.bookPage ?? '')) ? 1 : 0);
    const best = new Map();
    for (const e of index) {
      const cur = best.get(e.name);
      if (!cur || score(e) > score(cur)) best.set(e.name, e);
    }
    return [...best.values()].sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * A picked vehicle mod as a design row `{ name, dp, cf, load, unpriced }`, priced by its DESIGN figures (R3R p.112) with
   * ctx `{ level, body, chassis, plant, pilot }`. CF and Load fall back to the customization figures when no design figure
   * is printed. `unpriced` = the Design Points could not be read — the GM types them (warn, never refuse).
   */
  modRow(item, ctx = {}) {
    const sys = item?.system ?? {};
    const level = ctx.level ?? sys.rating ?? 1;
    const c = { ...ctx, level };
    const dp = DesignCosts.points(sys.designCost, c);
    const cf = DesignCosts.points(sys.designCf, c) ?? DesignCosts.points(sys.cfCost, c);
    const load = DesignCosts.points(sys.designLoad, c) ?? DesignCosts.points(sys.load, c);
    return { name: item?.name ?? 'Mod', dp: dp ?? 0, cf: cf ?? 0, load: load ?? 0, unpriced: dp == null, source: sys.designCost ?? '' };
  },
};
