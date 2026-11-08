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

export const FLAG = 'design';

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

export const VehicleDesignActor = {
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
   * 2026-11-08: "Offer new ones, never remove"). A mod counts as carried when an item has its compendium source (or, for
   * an item without one, its name) as many times as the design lists it. Typed mods (no uuid) are left out: there is no
   * document to copy. Never lists anything to remove.
   */
  missingMods(designMods = [], items = []) {
    const have = new Map();
    for (const i of items) {
      if (i?.type !== 'vehiclemod') continue;
      const key = i._stats?.compendiumSource || i.flags?.core?.sourceId || `name:${i.name}`;
      have.set(key, (have.get(key) ?? 0) + 1);
      if (key !== `name:${i.name}`) have.set(`name:${i.name}`, (have.get(`name:${i.name}`) ?? 0) + 1);
    }
    const out = [];
    for (const m of designMods) {
      if (!m?.uuid) continue;
      const key = have.get(m.uuid) ? m.uuid : `name:${m.name}`;
      if (have.get(key)) have.set(key, have.get(key) - 1);
      else out.push(m);
    }
    return out;
  },

  /** A compendium mod's data as the vehicle's item at the design's level (rated mods carry it as `system.rating`). */
  modItemData(source, m) {
    const data = { ...source };
    delete data._id;
    data.system = { ...(source.system ?? {}) };
    if (m?.level != null && source.system?.rating != null) data.system.rating = Number(m.level) || data.system.rating;
    return data;
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
