/**
 * R3R *Vehicle Design* — the design options catalogue (printed pp.115-121) · TODO 287, slice 3. Pure: no Foundry.
 *
 * Every option the chapter prices, as figures: its Design Points, CF Consumed and Load Reduction as functions of the
 * design (Body, Hull, the chassis' and the plant's Design Points, the plant's Load) and of the row's own inputs (a level,
 * persons, metres, CF designated). The functional improvements that are plain numbers (Speed, Acceleration, Handling,
 * Economy, Cargo, Load, Signature) stay in `VehicleDesign.evaluate`'s `improve`; smart materials stays its tickbox.
 *
 * The maintainer's rulings, 2026-11-08:
 *  - **Permanent effects apply** — Hybrid Engine and Fin Drive change the plant's figures before anything else, Removed
 *    Manual Controls adds its CF and Load, Setup/Breakdown halves the CF maximum. Effects that are a state (Hydrofoil while
 *    engaged) or a driving bonus (Structural Agility, the robot options) are notes for the GM.
 *  - **An input per row; the book's suggestion fills a "GM's discretion" figure** (Special Machinery: Body × 2 CF, 25 kg a
 *    CF) and stays editable. Restrictions (an airlock is for submarines, …) are warnings — warn, never refuse.
 *
 * ⚠ "Hull Factor" (Ducted Waterjet, EMD drive, Flight Deck, Depth, Auxiliary Engine) is not defined anywhere in R3R. It is
 * read here as the vehicle's Hull rating, and as its Body when it has none — TODO 287 lists it for the maintainer.
 * Nothing here is rulebook prose: names, figures, short tags and the printed page.
 */

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sq = n => n * n;

/** Fuel Tank Capacity Table (p.115): per increment, by plant. Body 0 battery / fuel-cell vehicles have their own row. */
export const FUEL_TANK = {
  E:    { step: '5 PF',     dp: 2,  cf: () => 0,              load: n => n * 1 },
  EC:   { step: '5 PF',     dp: 2,  cf: () => 0,              load: n => n * 1 },
  E0:   { step: '1 PF',     dp: 20, cf: () => 0,              load: n => Math.round(n * 0.2 * 100) / 100 },
  M:    { step: '5 bars',   dp: 2,  cf: n => n * 0.5,         load: () => 0 },
  G:    { step: '1 liter',  dp: 2,  cf: n => Math.ceil(n / 50), load: () => 0 },
  D:    { step: '1 liter',  dp: 2,  cf: n => Math.ceil(n / 50), load: () => 0 },
  JET:  { step: '10 liters', dp: 1, cf: n => Math.ceil(n * 10 / 50), load: () => 0 },
};

/** Special Storage Area (p.118): Design Points by the CF designated. */
export function storageCost(cf) {
  const c = num(cf);
  if (c <= 0) return 0;
  return c < 10 ? 3 : c < 100 ? 6 : c < 1000 ? 9 : 12;
}

/** Living Amenities (p.120): Design Points for `persons` at a level. Partial = half the cost of that level for one person. */
export const AMENITIES = { basic: { base: 0, per: 40 }, improved: { base: 50, per: 40 }, high: { base: 100, per: 40 } };
export function amenitiesCost(kind, persons, partial = 0) {
  const a = AMENITIES[kind] ?? AMENITIES.basic;
  const p = Math.max(0, num(persons));
  const full = p > 0 ? a.base + a.per * p : 0;
  return full + Math.max(0, num(partial)) * (a.base + a.per) / 2;
}

/** Setup/Breakdown base time in minutes (p.118): (Body × 2) + 1; each bought minute off, down to half (rounded down). */
export const setupBase = body => num(body) * 2 + 1;

/**
 * The catalogue. Each: { id, name, group, page, inputs: [[key, label, default]], dp(c), cf(c), load(c), warn(c) → string[],
 * note }. `c` is the pricing context: { body, hull (Hull rating, else Body), hasHull, category, drone, chassisDp, plantDp,
 * plantCode, startLoad, maxLoad, pilot (robotic pilot), adaptation, modNames, optionIds, ...the row's inputs }. An input is
 * never named `dp`, `cf` or `load` — those are the row's GM overrides.
 */
export const OPTIONS = [
  /* Functional improvements that need an input beyond a number (p.115-116). */
  {
    id: 'depth', name: 'Depth Enhancement', group: 'Functional', page: 'R3R p.115', inputs: [['metres', 'Metres', 10]],
    dp: c => Math.ceil(num(c.metres) / 10) * 2, cf: () => 0,
    load: c => Math.ceil(num(c.metres) / 10) * c.hull * c.hull * 2,
    note: 'Non-sub start: (Body × 10) + 100 m (× 3 unmanned); max = start × 2',
  },
  {
    id: 'entry', name: 'Extra Entry Points', group: 'Functional', page: 'R3R p.115', inputs: [['level', 'Points', 1]],
    dp: () => 0, cf: () => 0, load: () => 0,
    warn: c => { const max = c.hasHull ? c.hull * 2 : Math.ceil(c.body / 2); return num(c.level) > max ? [`Extra entry points ${c.level} — no more than ${max} (R3R p.115)`] : []; },
  },
  {
    id: 'fuel', name: 'Fuel Tank Enlargement', group: 'Functional', page: 'R3R p.115', inputs: [['level', 'Increments', 1]],
    dp: c => { const t = fuelRow(c); return t ? t.dp * num(c.level) : 0; },
    cf: c => { const t = fuelRow(c); return t ? t.cf(num(c.level)) : 0; },
    load: c => { const t = fuelRow(c); return t ? t.load(num(c.level)) : 0; },
    warn: c => (fuelRow(c) ? [] : ['No fuel tank row for this power plant (R3R p.115)']),
    note: 'Non-electric aircraft: +10% take-off and landing distance with full tanks',
  },

  /* Design enhancements (p.116-119). */
  {
    id: 'airlock', name: 'Airlock', group: 'Enhancement', page: 'R3R p.116', inputs: [['persons', 'Persons at once', 1]],
    dp: () => 500, cf: c => 40 + 40 * num(c.persons), load: () => 1000,
    warn: c => (c.category === 'sub' ? [] : ['An airlock is for submarines, or a vehicle with EnviroSeal (R3R p.116)']),
  },
  {
    id: 'aux-engine', name: 'Auxiliary Engine', group: 'Enhancement', page: 'R3R p.116', inputs: [['points', 'Its plant\'s points', null]],
    dp: c => (c.points == null || c.points === '' ? c.plantDp ?? 0 : num(c.points)),
    cf: c => (c.hasHull ? (c.hull + c.hull) * 2 : (c.body + 1) * 2), load: c => Math.round((c.maxLoad ?? 0) * 0.1),
    warn: c => (c.body === 0 ? ['A Body 0 vehicle cannot carry an auxiliary engine (R3R p.116)'] : []),
    note: 'Its Speed and Acceleration are half its plant\'s; one engine runs at a time',
  },
  {
    id: 'ballast', name: 'Ballast Tanks', group: 'Enhancement', page: 'R3R p.116', inputs: [],
    dp: c => sq(c.body) * 10, cf: c => sq(c.body) * 2, load: c => sq(c.body) * 25,
    warn: c => (['sub', 'ship'].includes(c.category) ? ['Ballast tanks are not for submarine or ship chassis (R3R p.116)'] : []),
    note: 'Needs the EnviroSeal engine modification (p.132)',
  },
  {
    id: 'waterjet', name: 'Ducted Waterjet Drive', group: 'Enhancement', page: 'R3R p.116', inputs: [],
    dp: c => 5000 * c.hull, cf: c => 4 * c.hull, load: c => 3 * c.hull,
    warn: c => (c.category === 'sub' ? [] : ['A ducted waterjet is for submarines only (R3R p.116)']),
    note: 'Engaged: Sonar Signature +2, Speed 20',
  },
  {
    id: 'emd', name: 'EMD Ducted Waterjet Drive', group: 'Enhancement', page: 'R3R p.116-117', inputs: [],
    dp: c => 50000 * c.hull, cf: c => 6 * c.hull, load: c => 4 * c.hull,
    warn: c => [
      ...(c.category === 'sub' ? [] : ['An EMD drive is for submarines only (R3R p.117)']),
      ...(c.plantCode && c.plantCode !== 'N' ? ['An EMD drive needs a nuclear power plant (R3R p.117)'] : []),
    ],
    note: 'Engaged: Sonar Signature +2; Signature −3 against magnetic-anomaly detectors',
  },
  {
    id: 'fin', name: 'Fin Drive', group: 'Enhancement', page: 'R3R p.117', inputs: [],
    dp: c => sq(c.body) * 100, cf: c => Math.max(0, c.body - 1), load: c => Math.round((c.startLoad ?? 0) / 2),
    warn: c => [
      ...(['boat', 'sub'].includes(c.category) && c.body <= 4 ? [] : ['A fin drive is for boats and submarines of Body 4 or less (R3R p.117)']),
      ...(c.smart ? ['A fin drive already uses smart materials — the vehicle cannot take both (R3R p.117)'] : []),
    ],
    effect: 'fin', note: 'Speed and Acceleration, starting and maximum, +25%; Street Index +1, Availability +4',
  },
  {
    id: 'hybrid', name: 'Hybrid Engine', group: 'Enhancement', page: 'R3R p.117', inputs: [],
    dp: c => Math.round((c.plantDp ?? 0) * 0.25), cf: () => 6, load: c => Math.round((c.startLoad ?? 0) / 2),
    warn: c => [
      ...(['bike', 'boat', 'car', 'special'].includes(c.category) ? [] : ['A hybrid engine is for bike, boat, car and special chassis (R3R p.117)']),
      ...(['M', 'G', 'D'].includes(c.plantCode) ? [] : ['A hybrid engine starts from a methane, gasoline or diesel plant (R3R p.117)']),
    ],
    effect: 'hybrid', note: 'Signature +1, Economy ×2, Acceleration −2 — before any other option',
  },
  {
    id: 'hydrofoil', name: 'Hydrofoil Capability', group: 'Enhancement', page: 'R3R p.117-118', inputs: [],
    dp: () => 50, cf: () => 8, load: () => 0,
    warn: c => (c.category === 'boat' && c.chassisId !== 'skiff' ? [] : ['Hydrofoils are for boats, except skiffs (R3R p.117)']),
    note: 'Engaged: Speed and Acceleration +25% (rounded down), Handling +2, Signature +1',
  },
  {
    id: 'stol', name: 'Improved Takeoff/Landing (STOL)', group: 'Enhancement', page: 'R3R p.118', inputs: [],
    dp: () => 250, cf: () => 0, load: () => 0,
    warn: c => (c.category === 'fixedwing' ? [] : ['STOL / VSTOL is for fixed-wing aircraft (R3R p.118)']),
  },
  {
    id: 'vstol', name: 'Improved Takeoff/Landing (VSTOL)', group: 'Enhancement', page: 'R3R p.118', inputs: [],
    dp: () => 400, cf: () => 0, load: () => 0,
    warn: c => (c.category === 'fixedwing' ? [] : ['STOL / VSTOL is for fixed-wing aircraft (R3R p.118)']),
  },
  {
    id: 'no-manual', name: 'Removed Manual Controls', group: 'Enhancement', page: 'R3R p.118', inputs: [],
    dp: () => 50, cf: () => 0, load: () => 0,
    effect: 'no-manual', note: 'Load +10 kg and CF +2; needs a datajack port (p.128) or rigger adaptation (p.130)',
  },
  {
    id: 'setup', name: 'Setup/Breakdown Time', group: 'Enhancement', page: 'R3R p.118', inputs: [['level', 'Minutes off', 0]],
    dp: c => c.body * 5 + c.body * 5 * Math.max(0, num(c.level)), cf: () => 0, load: () => 0,
    warn: c => {
      const out = [];
      if (c.drone ? c.body > 3 : c.body > 2) out.push('Setup/Breakdown is for drones of Body 3 or less and other vehicles of Body 2 or less (R3R p.118)');
      const most = Math.floor(setupBase(c.body) / 2);
      if (num(c.level) > setupBase(c.body) - most) out.push(`Setup/Breakdown no faster than ${most} minutes (R3R p.118)`);
      return out;
    },
    effect: 'setup', note: 'Base time (Body × 2) + 1 minutes; the chassis\' maximum CF is halved',
  },
  {
    id: 'machinery', name: 'Special Machinery', group: 'Enhancement', page: 'R3R p.118', inputs: [['space', 'CF', null], ['kg', 'Load kg', null]],
    dp: () => 0,
    cf: c => machineryCf(c),
    load: c => (c.kg == null || c.kg === '' ? 25 * machineryCf(c) : num(c.kg)),
    warn: c => { const cf = machineryCf(c); return cf > c.body * 2 ? [`Special machinery ${cf} CF — no more than Body × 2 = ${c.body * 2} (R3R p.118)`] : []; },
    note: 'Takes an extra Mark-Up modifier (p.113)',
  },
  {
    id: 'storage', name: 'Special Storage Area', group: 'Enhancement', page: 'R3R p.118', inputs: [['space', 'CF designated', 1]],
    dp: c => storageCost(c.space), cf: c => Math.ceil(Math.round(num(c.space) * 10) / 100), load: c => Math.round(num(c.space) / 10 * 100) / 100,
  },
  {
    id: 'agility', name: 'Structural Agility', group: 'Enhancement', page: 'R3R p.118-119', inputs: [['level', 'Level', 1]],
    dp: c => c.body * 150 * Math.max(0, num(c.level)), cf: () => 0, load: () => 0,
    warn: c => (c.modNames.some(n => /drive.by.wire/i.test(n)) ? [] : ['Structural Agility needs a drive-by-wire system fitted in the design (R3R p.119)']),
    note: '+1 Reaction (and Control Pool) per level when driving; no more levels than the drive-by-wire\'s',
  },
  {
    id: 'tailhook', name: 'Tailhook System', group: 'Enhancement', page: 'R3R p.119', inputs: [],
    dp: c => Math.round((c.chassisDp ?? 0) * 0.1), cf: c => Math.ceil(c.body / 2), load: c => c.body * 125,
    warn: c => (['fixedwing', 'vectored'].includes(c.category) ? [] : ['A tailhook is for aircraft (R3R p.119)']),
  },

  /* Facilities (p.119-120). */
  {
    id: 'flight-deck', name: 'Flight Deck', group: 'Facility', page: 'R3R p.119',
    inputs: [['metres', 'Length m', 100], ['catapult', 'Catapult (0/1)', 0], ['angled', 'Angled (0/1)', 0]],
    dp: c => { const deck = num(c.metres) * c.hull; return deck + (num(c.catapult) ? c.hull * 2 : 0) + (num(c.angled) ? Math.round(deck * 0.1) : 0); },
    cf: c => (num(c.catapult) ? c.hull * 2 : 0),
    load: c => (num(c.catapult) ? c.hull * 10 : 0) + (num(c.angled) ? num(c.metres) * 20 : 0),
    note: 'Launches or lands aircraft of less than half its Body (ships: Hull × 10)',
  },
  {
    id: 'amenities', name: 'Living Amenities', group: 'Facility', page: 'R3R p.119-120',
    inputs: [['kind', 'basic/improved/high', 'basic'], ['persons', 'Persons', 1], ['partial', 'Partial', 0]],
    dp: c => amenitiesCost(c.kind, c.persons, c.partial),
    cf: c => { const p = Math.max(0, num(c.persons)); return p > 0 ? 12 * p + 150 + 6 * p : 0; },
    load: c => { const p = Math.max(0, num(c.persons)); return p * 100 + p * 150; },
    warn: c => (AMENITIES[c.kind] ? [] : [`Amenities "${c.kind}" — basic, improved or high (R3R p.120)`]),
    note: 'CF and Load include the People Space (150 CF + 6 CF and 150 kg a person); trolls +50% People Space',
  },
  {
    id: 'workshop', name: 'Work Shop', group: 'Facility', page: 'R3R p.120', inputs: [['points', 'Shop\'s nuyen cost', 0]],
    dp: c => num(c.points), cf: () => 52, load: () => 250,
    note: 'Plus the People Space for the work (p.120 table)',
  },
  {
    id: 'facility', name: 'Facility', group: 'Facility', page: 'R3R p.120',
    inputs: [['kind', 'vehicle/electronics/other', 'other'], ['points', 'Facility\'s nuyen cost', 0]],
    dp: c => 250 + num(c.points), cf: c => (c.kind === 'vehicle' ? 500 : c.kind === 'electronics' ? 200 : 300), load: () => 1000,
    note: 'Plus the People Space for the work (p.120 table)',
  },

  /* Robot options (p.120-121) — robots must buy the robotic pilot. */
  {
    id: 'robot-pilot', name: 'Robotic-Pilot Advanced Programming', group: 'Robot', page: 'R3R p.121', inputs: [['level', 'Pilot', 1]],
    dp: c => Math.pow(Math.max(0, num(c.level)), 3) * 50, cf: () => 0, load: () => 0,
    warn: c => [
      ...(num(c.level) > 5 ? ['Robotic pilot rating no higher than 5 (R3R p.121)'] : []),
      ...(c.drone ? [] : ['Robot options are for drones (R3R p.120)']),
    ],
    note: 'Adaptation Pool = its rating; not with drone-pilot programming',
  },
  {
    id: 'fuzzy', name: 'Fuzzy Logic Augmentation', group: 'Robot', page: 'R3R p.120', inputs: [['level', 'Level', 1]],
    dp: c => c.adaptation * 100 * Math.max(0, num(c.level)), cf: () => 0, load: () => 0,
    warn: c => robotWarn(c, c.pilot, 'Pilot'), note: '+2 dice per level to Pilot on Comprehension Tests',
  },
  {
    id: 'neural', name: 'Improved Neural Network Algorithms', group: 'Robot', page: 'R3R p.120', inputs: [['level', 'Level', 1]],
    dp: c => sq(c.pilot) * 25 * Math.max(0, num(c.level)), cf: () => 0, load: () => 0,
    warn: c => robotWarn(c, c.pilot, 'Pilot'), note: '+1 Adaptation Pool die per level',
  },
  {
    id: 'multi-object', name: 'Multi-Object Manipulation', group: 'Robot', page: 'R3R p.120-121', inputs: [['level', 'Level', 1]],
    dp: c => c.adaptation * 100 * Math.max(0, num(c.level)), cf: () => 0, load: () => 0,
    warn: c => [
      ...robotWarn(c, c.adaptation, 'Adaptation Pool'),
      ...(c.modNames.some(n => /ivis/i.test(n)) ? [] : ['Multi-object manipulation needs the BattleTac IVIS Receiver Module (R3R p.121)']),
    ],
    note: '+1 IVIS Pool die per level',
  },
  {
    id: 'reflexes', name: 'Robotic Reflexes', group: 'Robot', page: 'R3R p.121', inputs: [['level', 'Level', 1]],
    dp: c => 100 * Math.max(0, num(c.level)), cf: () => 0, load: () => 0,
    warn: c => [...(num(c.level) > 3 ? ['Robotic reflexes no higher than 3 (R3R p.121)'] : []), ...robotWarn(c, null)],
    note: '+1 Initiative die per level under its own control',
  },
];

/** Special Machinery's CF: the GM's, else the book's recommendation, Body × 2 (p.118). */
const machineryCf = c => (c.space == null || c.space === '' ? c.body * 2 : num(c.space));

function fuelRow(c) {
  const code = c.plantCode;
  if ((code === 'E' || code === 'EC') && c.body === 0) return FUEL_TANK.E0;
  if (code === 'J') return FUEL_TANK.JET;
  return FUEL_TANK[code] ?? null;
}

function robotWarn(c, max, label) {
  const out = [];
  if (!c.optionIds.includes('robot-pilot')) out.push('Robot options need Robotic-Pilot Advanced Programming (R3R p.120)');
  if (max != null && num(c.level) > max) out.push(`Level ${c.level} is over the robot's ${label} ${max} (R3R p.120-121)`);
  return out;
}

const blank = v => v == null || v === '';

export const DesignOptions = {
  OPTIONS,

  get(id) { return OPTIONS.find(o => o.id === id) ?? null; },

  /** A new design row for a catalogue option: its id, name, page and default inputs. */
  newRow(id) {
    const o = this.get(id);
    if (!o) return null;
    const row = { id, name: o.name, page: o.page, dp: '', cf: '', load: '' };
    for (const [k, , d] of o.inputs) row[k] = d;
    return row;
  },

  /**
   * Price a catalogue row: `{ dp, cf, load, warnings, note, computed: { dp, cf, load } }`. A figure the GM typed on the row
   * (`dp` / `cf` / `load` not blank) wins over the computed one — "compute, GM edits".
   */
  price(row, ctx) {
    const o = this.get(row?.id);
    if (!o) return null;
    const c = { ...ctx, ...Object.fromEntries(o.inputs.map(([k, , d]) => [k, row[k] ?? d])) };
    const computed = { dp: num(o.dp(c)), cf: num(o.cf(c)), load: num(o.load(c)) };
    return {
      dp: blank(row.dp) ? computed.dp : num(row.dp),
      cf: blank(row.cf) ? computed.cf : num(row.cf),
      load: blank(row.load) ? computed.load : num(row.load),
      warnings: o.warn ? o.warn(c) : [],
      note: o.note ?? '', effect: o.effect ?? null, computed,
    };
  },
};
