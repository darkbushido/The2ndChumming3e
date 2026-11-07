/**
 * R3R *Vehicle Design* — a chassis, a power plant, functional improvements, mods, and the final cost. TODO 287, slice 1.
 * Pure: no Foundry. The tables are `vehicle-design-tables.mjs`.
 *
 * The five steps (R3R p.104): chassis → power plant → design options → vehicle modifications → final cost.
 *   - The chassis sets Body (fixed), Handling, Armor, Autonav/Pilot, Sensor, CF and its maximum, seating, entry points, its
 *     Design Points and Mark-Up Factor (p.104, table p.202-205).
 *   - The power plant sets the starting and maximum Speed, Acceleration, Load, Economy, plus Signature and fuel, and adds
 *     its own Design Points. "If a chassis type is not listed under a particular power plant, the vehicle may not use that
 *     power plant" (p.110) — warned here, never refused.
 *   - Functional improvements (p.115-116): Acceleration 25 points per +1; Speed 2 per +1; Handling 25 per −1, no lower than
 *     half the chassis' figure rounded up; Economy 5 per 5% of the starting figure; Cargo 1 per +0.2 CF; Load 1 per +10 kg
 *     (per +1 kg at Body 0); Signature (levels)⁴ × 200. Each up to the plant's / chassis' maximum.
 *   - Smart materials (p.118): 100 points, Handling −1, the Speed / Acceleration / Load maxima × 1.15 (rounded to the
 *     nearest — the book's 270 → 311), Street Index +1.
 *   - Mods during design use their *Design Point* cost (p.112); their CF and Load come off the vehicle's.
 *   - Final cost (p.113): Design Point Value × (Mark-Up Factor + the GM's 0-3 for prototypes) × 100 nuyen; Street Index
 *     from the class; Availability = cost ÷ 20,000 rounded up, the same number the base time in days, minimum 2 / 24 h
 *     (read as 2 days — the example's "2/2 days"); +4 luxury, +6 security, +10 military; over 30 is out of reach.
 *
 * Warn, never refuse: every limit the book states comes back as a warning; the numbers are computed anyway. Every total
 * is the GM's to overwrite (the maintainer, 2026-11-07: "compute, GM edits").
 */
import { CHASSIS, POWER_PLANTS, PLANTS } from './vehicle-design-tables.mjs';

export const PAGES = {
  steps: 'R3R p.104', chassis: 'R3R p.202', plant: 'R3R p.194', improvements: 'R3R p.115-116', smart: 'R3R p.118',
  mods: 'R3R p.112', cost: 'R3R p.113',
};

/** Design Points per unit of each functional improvement (R3R p.115-116). */
export const RATES = { accel: 25, speed: 2, handling: 25, economyStep: 5, cargoPerPoint: 0.2, loadPerPoint: 10, loadPerPointBody0: 1, signature: 200 };

/** Street Index by class and the Availability / base-time modifier (R3R p.113). */
export const CLASSES = {
  standard: { label: 'Standard', streetIndex: 1, avail: 0 },
  luxury:   { label: 'Luxury',   streetIndex: 2, avail: 4 },
  security: { label: 'Security', streetIndex: 2, avail: 6 },
  military: { label: 'Military', streetIndex: 3, avail: 10 },
};

export const SMART = { dp: 100, factor: 1.15, handling: -1, streetIndex: 1 };
export const AVAIL = { per: 20000, min: 2, minHours: 24, outOfReach: 30 };

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Digits, + − × ÷ and brackets — the table's formulas — evaluated without `eval`. NaN when it is anything else. */
function arith(src) {
  let i = 0;
  const peek = () => src[i];
  const atom = () => {
    if (peek() === '(') { i++; const v = sum(); if (src[i++] !== ')') return NaN; return v; }
    if (peek() === '-') { i++; return -atom(); }
    const m = /^\d+(?:\.\d+)?/.exec(src.slice(i));
    if (!m) return NaN;
    i += m[0].length;
    return Number(m[0]);
  };
  const product = () => {
    let v = atom();
    while (peek() === '*' || peek() === '/') { const op = src[i++]; const r = atom(); v = op === '*' ? v * r : v / r; }
    return v;
  };
  function sum() {
    let v = product();
    while (peek() === '+' || peek() === '-') { const op = src[i++]; const r = product(); v = op === '+' ? v + r : v - r; }
    return v;
  }
  const v = sum();
  return i === src.length ? v : NaN;
}

export const VehicleDesign = {
  PAGES, RATES, CLASSES, SMART, AVAIL,

  chassis(id) { return CHASSIS.find(c => c.id === id) ?? null; },

  /** The Power Plant Table rows a chassis can use, all plants or one. */
  plantsFor(chassisId, code = null) {
    return POWER_PLANTS.filter(p => p.chassis.includes(chassisId) && (code == null || p.plant === code));
  },

  plantRow(id) { return POWER_PLANTS.find(p => p.id === id) ?? null; },

  /**
   * A printed cell as a number, with Body `B`. '5xB', '50-(5xB)', '10+(20xB)', '1.2÷B'. A pair keeps its first figure
   * ('30/25' surface/submerged, '25 (15)', Signature '6/4'), except `speedPair` where the second is the Speed and the
   * first the stall speed ('20/60', p.116). null when blank or unreadable.
   */
  cell(text, body = 0, { speedPair = false } = {}) {
    if (text == null || text === '') return null;
    if (typeof text === 'number') return text;
    let t = String(text).trim();
    if (/^\(.+\)\/\(.+\)$/.test(t)) t = t.replace(/^\((.+)\)\/.*$/, '$1');   // '(10-B)/(8-B)': the first
    const pair = /^(.+?)\/(.+)$/.exec(t);
    if (pair) t = speedPair ? pair[2] : pair[1];
    t = t.replace(/^(\d+(?:\.\d+)?)\s+\(.*\)$/, '$1');                          // '25 (15)' → '25', never '5+(20xB)'
    const v = arith(t.replace(/\s+/g, '').replace(/[x×]/g, '*').replace(/÷/g, '/').replace(/B/g, `(${num(body)})`));
    return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
  },

  /** The stall speed of an aircraft row ('20/60' → 20), else null. */
  stall(text, body = 0) {
    const m = /^(.+?)\/(.+)$/.exec(String(text ?? ''));
    return m && !/^\(/.test(String(text)) ? this.cell(m[1], body) : null;
  },

  /** "4/8" → { on: 4, off: 8 }; a single figure is both. null when none. */
  handling(text) {
    if (text == null) return null;
    const m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(text));
    if (m) return { on: Number(m[1]), off: Number(m[2]) };
    const n = Number(text);
    return Number.isFinite(n) ? { on: n, off: n } : null;
  },

  /** The best Handling a chassis' figure can be improved to — half of it, rounded up (p.115). */
  handlingFloor(chassisFigure) { return Math.ceil(num(chassisFigure) / 2); },

  /** Design Points for a Signature improvement of `levels` (p.116). */
  signatureCost(levels) { return num(levels) > 0 ? Math.pow(num(levels), 4) * RATES.signature : 0; },

  /** Design Points for `kg` of added Load (p.115-116). */
  loadCost(kg, body) { return num(kg) > 0 ? Math.ceil(num(kg) / (num(body) === 0 ? RATES.loadPerPointBody0 : RATES.loadPerPoint)) : 0; },

  /** Design Points for `cf` of added Cargo, 1 per 0.2 CF (p.115). */
  cargoCost(cf) { return num(cf) > 0 ? Math.ceil(Math.round(num(cf) / RATES.cargoPerPoint * 1000) / 1000) : 0; },

  /** A maximum raised by smart materials: × 1.15, to the nearest (p.118; the example's 270 → 311). */
  smartMax(max) { return max == null ? null : Math.round(num(max) * SMART.factor); },

  /**
   * Final cost (p.113): Design Point Value × (Mark-Up + extra) × 100, plus any nuyen-priced extras (the example's tires).
   */
  cost(dp, markUp, markUpExtra = 0, extraNuyen = 0) {
    return Math.round(num(dp) * (num(markUp) + num(markUpExtra)) * 100) + num(extraNuyen);
  },

  /** Availability and base time in days (p.113): cost ÷ 20,000 rounded up, minimum 2, plus the class modifier. */
  availability(cost, vehicleClass = 'standard') {
    // The maintainer, 2026-11-07: "the base is 2/24hours so a 2/2 days should be 2/48hrs. you cannot mod it lower then
    // 2/24hrs." So cost ÷ 20,000 (rounded up) is both the target number and the days; the floor is 2 and 24 hours.
    const n = Math.ceil(num(cost) / AVAIL.per);
    const mod = CLASSES[vehicleClass]?.avail ?? 0;
    const tn = Math.max(AVAIL.min, n) + mod;
    const hours = Math.max(AVAIL.minHours, n * 24) + mod * 24;
    const text = hours % 24 === 0 && hours > 24 ? `${tn}/${hours / 24} days` : `${tn}/${hours} hrs`;
    return { tn, hours, days: hours / 24, text, outOfReach: tn > AVAIL.outOfReach };
  },

  /**
   * Evaluate a design. Plain data in:
   *   { chassis, plant (a Power Plant row id, or a plant code — its first row for the chassis),
   *     improve: { accel, speed, handling, handlingOffRoad, economySteps, cargo, load, signature },
   *     freed: { cf, load } (removed seats, free — p.104), smartMaterials, mods: [{ name, dp, cf, load }], options: [{ name, dp, cf, load }] (other design options, GM-priced),
   *     markUpExtra, vehicleClass, streetIndexExtra, extraNuyen }
   * `improve` figures are the CHANGE: accel +2, handling −1 (as 1 — a reduction), cargo +2 CF, load +30 kg, signature +1.
   * Out: { chassis, plant, stats, dp: { total, lines }, cf, load, cost, streetIndex, price, availability, warnings }.
   */
  evaluate(design = {}) {
    const warnings = [];
    const ch = this.chassis(design.chassis);
    if (!ch) return { chassis: null, warnings: ['Pick a chassis (R3R p.202)'] };
    const body = this.cell(ch.body, 0) ?? 0;

    let row = this.plantRow(design.plant);
    if (!row && design.plant) row = this.plantsFor(ch.id, design.plant)[0] ?? null;
    if (row && !row.chassis.includes(ch.id)) warnings.push(`${PLANTS[row.plant]?.name ?? row.plant} is not listed for ${ch.name} — the book does not allow it (R3R p.110)`);
    if (!row) warnings.push(design.plant ? `No ${PLANTS[design.plant]?.name ?? design.plant} row for ${ch.name} in the Power Plant Table (R3R p.194-201)` : 'Pick a power plant (R3R p.194)');

    const imp = design.improve ?? {};
    const smart = !!design.smartMaterials;
    const lines = [];
    const line = (label, points, page) => { if (points) lines.push({ label, points, page }); };
    line(`Chassis: ${ch.name}`, ch.dp, ch.page);
    if (row) line(`Power plant: ${PLANTS[row.plant]?.name ?? row.plant}`, this.cell(row.dp, body) ?? 0, row.page);
    if (smart) line('Smart materials', SMART.dp, PAGES.smart);

    /* Handling: the chassis', −1 for smart materials, minus the bought reduction, never below half the chassis' (p.115). */
    const h = this.handling(ch.handling);
    const stats = { body: ch.body, armor: ch.armor, autonav: ch.autonav, sensor: ch.sensor, seating: ch.seating, entry: ch.entry };
    if (h) {
      const smartH = smart ? SMART.handling : 0;
      for (const [key, part, label] of [['handling', 'on', 'Handling'], ['handlingOffRoad', 'off', 'Off-road Handling']]) {
        const cut = Math.max(0, num(imp[key]));
        const floor = this.handlingFloor(h[part]);
        const v = h[part] + smartH - cut;
        if (v < floor) warnings.push(`${label} ${v} is below half the chassis' ${h[part]} (best ${floor}, R3R p.115)`);
        stats[key] = v;
        line(`${label} −${cut}`, cut * RATES.handling, PAGES.improvements);
      }
    }

    /* Speed, Acceleration, Load, Economy from the plant, against its maxima (× 1.15 with smart materials). */
    // 'stall/Speed' for aircraft and the rocket chassis; a submarine's 'surface/submerged' keeps its first figure.
    const aircraft = !!row && /\//.test(String(row.speed)) && ch.category !== 'sub';
    const rated = (start, max, add, label, per, page) => {
      const s = this.cell(start, body, { speedPair: aircraft });
      let m = this.cell(max, body, { speedPair: aircraft });
      if (smart && m != null) m = this.smartMax(m);
      const v = s == null ? null : s + num(add);
      if (v != null && m != null && v > m) warnings.push(`${label} ${v} is over the maximum ${m} (R3R p.115-116)`);
      if (per) line(`${label} +${num(add)}`, num(add) * per, page);
      return { value: v, max: m };
    };
    if (row) {
      const sp = rated(row.speed, row.speedMax, imp.speed, 'Speed', RATES.speed, PAGES.improvements);
      const ac = rated(row.accel, row.accelMax, imp.accel, 'Acceleration', RATES.accel, PAGES.improvements);
      stats.speed = sp.value; stats.speedMax = sp.max;
      stats.accel = ac.value; stats.accelMax = ac.max;
      stats.stall = aircraft ? this.stall(row.speed, body) : null;
      const sig = this.cell(row.sig, body);
      stats.sig = sig == null ? null : sig + num(imp.signature);
      line(`Signature +${num(imp.signature)}`, this.signatureCost(imp.signature), PAGES.improvements);
      const e0 = this.cell(row.econ, body), eMax = this.cell(row.econMax, body);
      const steps = Math.max(0, num(imp.economySteps));
      stats.economy = e0 == null ? null : Math.round(e0 * (1 + 0.05 * steps) * 1000) / 1000;
      if (stats.economy != null && eMax != null && stats.economy > eMax) warnings.push(`Economy ${stats.economy} is over the maximum ${eMax} (R3R p.115)`);
      line(`Economy +${steps * 5}%`, steps * RATES.economyStep, PAGES.improvements);
      stats.fuel = this.cell(row.fuel, body);
      stats.fuelUnit = PLANTS[row.plant]?.fuel ?? null;
      stats.peopleSpace = row.people ?? null;
    }

    /* Cargo (CF) and Load: the starting figure plus what was bought, less every option's and mod's share (p.111-112). */
    const extras = [...(design.options ?? []), ...(design.mods ?? [])];
    for (const x of extras) line(x.name ?? 'Option', num(x.dp), x.page ?? PAGES.mods);
    const cfAdd = Math.max(0, num(imp.cargo));
    const cfMax = this.cell(ch.maxCf, body);
    // Removed seats free their CF and Load at no cost (p.104) — the GM enters what was freed.
    const freed = design.freed ?? {};
    const cfTotal = (this.cell(ch.cf, body) ?? 0) + cfAdd + Math.max(0, num(freed.cf));
    if (cfMax != null && cfTotal > cfMax) warnings.push(`Cargo ${cfTotal} CF is over the chassis maximum ${cfMax} (R3R p.115)`);
    line(`Cargo +${cfAdd} CF`, this.cargoCost(cfAdd), PAGES.improvements);
    const cfUsed = extras.reduce((s, x) => s + num(x.cf), 0);

    const loadAdd = Math.max(0, num(imp.load));
    let loadTotal = null, loadMax = null;
    if (row) {
      loadTotal = (this.cell(row.load, body) ?? 0) + loadAdd + Math.max(0, num(freed.load));
      loadMax = this.cell(row.loadMax, body);
      if (smart && loadMax != null) loadMax = this.smartMax(loadMax);
      if (loadMax != null && loadTotal > loadMax) warnings.push(`Load ${loadTotal} kg is over the maximum ${loadMax} (R3R p.116)`);
    }
    line(`Load +${loadAdd} kg`, this.loadCost(loadAdd, body), PAGES.improvements);
    const loadUsed = extras.reduce((s, x) => s + num(x.load), 0);
    if (cfUsed > cfTotal) warnings.push(`Options and mods take ${cfUsed} CF of ${cfTotal} — "No vehicle can carry more design options than its CF or Load rating allows" (R3R p.111)`);
    if (loadTotal != null && loadUsed > loadTotal) warnings.push(`Options and mods take ${loadUsed} kg of ${loadTotal} kg Load (R3R p.111)`);
    stats.cargo = Math.round((cfTotal - cfUsed) * 100) / 100;
    stats.load = loadTotal == null ? null : loadTotal - loadUsed;

    const total = lines.reduce((s, l) => s + l.points, 0);
    const cost = this.cost(total, ch.markUp, design.markUpExtra, design.extraNuyen);
    const vclass = CLASSES[design.vehicleClass] ? design.vehicleClass : 'standard';
    const streetIndex = CLASSES[vclass].streetIndex + (smart ? SMART.streetIndex : 0) + num(design.streetIndexExtra);
    const availability = this.availability(cost, vclass);
    if (availability.outOfReach) warnings.push(`Availability ${availability.tn} — over 30 is out of the players' reach (R3R p.113)`);
    const extra = num(design.markUpExtra);
    if (extra < 0 || extra > 3) warnings.push(`A Mark-Up modifier of ${extra} — the book suggests 1 to 3 for prototypes and one-offs (R3R p.113)`);

    return {
      chassis: ch, plant: row, stats, warnings,
      dp: { total, lines },
      cf: { total: cfTotal, used: cfUsed, max: cfMax },
      load: { total: loadTotal, used: loadUsed, max: loadMax },
      markUp: ch.markUp + extra,
      cost, streetIndex, price: Math.round(cost * streetIndex), availability, vehicleClass: vclass,
    };
  },
};
