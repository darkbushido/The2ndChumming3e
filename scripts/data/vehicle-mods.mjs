/**
 * What a vehicle's mods change — TODO 265, step c's last slice (the maintainer, 2026-10-27). Pure — no Foundry.
 *
 * Rigger 3 Revised, *Vehicle Customization*. Only the mods the packs carry that change one of the vehicle's own numbers:
 *
 *   - **Vehicle Armor** (p.131): "Each level of armor increases the Armor rating of the vehicle by 1 point"; "For every 6 points
 *     of Armor added, increase the Handling of the vehicle by 1". A vehicle of Body 0 cannot carry it.
 *   - **Concealed Armor** (p.132): the same +1 per point and +1 Handling per full 6; "not compatible with standard vehicle armor".
 *   - **Ablative Armor** (p.131): "increase the vehicle's Armor Rating by … the ablative armor level x 2"; the Armor "may be
 *     raised to a maximum equal to the vehicle's Body". Its level drops as it is hit — the GM lowers the mod's rating.
 *   - **Advanced Drone Pilot** (p.127), **Autonavigation System** (p.127), **Sensors** (p.147), **ECM** (p.143), **ECCM**
 *     (p.145): rated systems — the mod's rating IS the vehicle's rating.
 *   - **Control** (p.129-130): Drive-by-Wire −1 Handling a level (to −3), and a one-time +10% the player splits among
 *     Acceleration, Speed and Load (`system.dbwSplit`, percentages); Improved Suspension −1 on-road Handling a level (to −2; a
 *     motorcycle's off-road too); Improved Control Surfaces (watercraft) −1 a level (to −2); neither of those two with
 *     drive-by-wire. Off-Road Suspension −1 off-road and +1 on-road Handling a level (±2), and Speed −15 once.
 *   - **Engine** (p.126): Turbocharging +15 Speed, +1 Acceleration, −1 Signature a level; aircraft (unless electric) cannot.
 *   - **Signature** (pp.134-135): Radar-Absorbent Materials +1 a level (to +3); Thermal Baffles +1 a level (to +2), also a + to
 *     thermographic Perception against it; Active Thermal Masking +1 a level only while it runs (shown, not applied); the
 *     Noisemaker Dispenser is a + to detect a boat for three turns once released (shown). **Weapon mounts** (SR3 p.307, R3R
 *     pp.136, 140): external fixed mounts −1, each turret −1 (`VehicleMounts.summary`) — the maintainer, 2026-10-27: "I was
 *     wrong, External fixed mounts reduce the vehicle's Signature by 1", reversing the earlier "shown, never changed". An
 *     internal mount's −1 while its weapon is out and a pop-up turret's while it is up stay notes.
 *
 * Price (the maintainer, 2026-10-27: "worked out on install"): the control, engine and signature mods are priced from the
 * vehicle (its cost, Body, type) — `price` works it out and `preCreateItem` fills a blank `system.cost` when one lands on a
 * vehicle; the item keeps it, editable.
 *
 * ⚠ **The maintainer's rulings, 2026-10-27:** the mods APPLY — the rolls read the effective figure — and the figure a GM typed
 * stays the vehicle's own (stock) value, editable (`attributes.X.base`); and a rated system gives **the higher** of the
 * vehicle's own rating and the mod's (a Sensors 2 on a Sensor 3 car leaves 3).
 *
 * Nothing computed is saved: `SR3EActor._prepareVehicle` puts the result in `attributes.X.value` (no sheet input binds it) and
 * `derived.ew`. Handling is a target number — a higher Handling is WORSE (SR3 p.134). Warn, never refuse.
 */
import { VehicleMounts } from './vehicle-mounts.mjs';

export const PAGES = {
  armor: 'R3R p.131', concealed: 'R3R p.132', ablative: 'R3R p.131', pilot: 'R3R p.127', autonav: 'R3R p.127',
  sensor: 'R3R p.147', ecm: 'R3R p.143', eccm: 'R3R p.145',
  dbw: 'R3R p.129', suspension: 'R3R p.129', control: 'R3R p.129', offroad: 'R3R p.129-130', turbo: 'R3R p.126',
  ram: 'R3R p.134', baffles: 'R3R p.135', masking: 'R3R p.134', noisemaker: 'R3R p.134', mounts: 'SR3 p.307',
};

/** The most levels a mod may add (its "Max Rating/Improvement"). Warned past, never refused. */
export const MAX_LEVEL = { dbw: 3, suspension: 2, control: 2, offroad: 2, ram: 3, baffles: 2, masking: 2 };

/** By base name (the "(Vehicle)" tag and any "[N]" level dropped): what the mod changes. */
export const EFFECTS = {
  'Vehicle Armor':                 { kind: 'armor' },
  'Concealed Armor':               { kind: 'concealed' },
  'Ablative Armor':                { kind: 'ablative' },
  'Advanced Drone Pilot':          { kind: 'rated', target: 'pilot',   label: 'Pilot' },
  'Autonavigation System':         { kind: 'rated', target: 'autonav', label: 'Autonav' },
  'Sensors':                       { kind: 'rated', target: 'sensor',  label: 'Sensor' },
  'ECM':                           { kind: 'rated', target: 'ecm',     label: 'ECM' },
  'ECCM':                          { kind: 'rated', target: 'eccm',    label: 'ECCM' },
  'Drive-by-Wire System':          { kind: 'dbw' },
  'Improved Suspension':           { kind: 'suspension' },
  'Improved Control Surfaces':     { kind: 'control' },
  'Off-Road Suspension':           { kind: 'offroad' },
  'Turbocharging/Superconductive Drive': { kind: 'turbo' },
  'Radar-Absorbent Materials':     { kind: 'ram' },
  'Thermal Baffles':               { kind: 'baffles' },
  'Active Thermal Masking':        { kind: 'masking' },
  'Noisemaker Dispenser':          { kind: 'noisemaker' },
};

/** The vehicle numbers this module changes. `ecm` / `eccm` live in `system.ew`, the rest in `system.attributes`. */
export const STATS = ['armor', 'handling', 'handlingOffRoad', 'speed', 'accel', 'sig', 'load', 'pilot', 'autonav', 'sensor', 'ecm', 'eccm'];

const WATER = ['boat', 'ship', 'submarine'];
const AIR = ['helicopter', 'fixedwing'];

/**
 * Prices from the vehicle (customization Parts Cost). `level` is the mod's rating; null = not priced from the vehicle.
 * Off-road suspension and thermal baffles price by vehicle type; a type the book does not name gives null (the GM prices it).
 */
export const PRICES = {
  dbw:        (v, level) => 0.25 * v.cost * level,                 // p.129: original cost × 0.25 a level
  suspension: (v, level) => 0.1 * v.cost * level,                  // p.129
  control:    (v, level) => 0.15 * v.cost * level,                 // p.129
  offroad:    (v, level) => ({ car: 0.35, military: 0.35, motorcycle: 0.2 }[v.type] ?? null) * v.cost * level,   // p.130
  turbo:      (v, level) => 0.1 * v.cost * level,                  // p.126: 10% of list a level
  ram:        (_v, level) => level ** 3 * 25000,                   // p.135: (levels)³ × 25,000¥
  baffles:    (v, level) => ({ car: 5000, military: 5000, motorcycle: 6000, fixedwing: 7500, helicopter: 10000, hovercraft: 3750,
    boat: 2500, ship: 2500, submarine: 2500, airship: 2500 }[v.type] ?? null) * v.body * level,               // p.135
  // p.134: the engine customization's cost × 2 for the first level, +0.25 for each more — the turbocharging on this vehicle.
  masking:    (v, level) => (v.turboCost > 0 ? v.turboCost * (2 + 0.25 * (level - 1)) : null),
};
const EW = ['ecm', 'eccm'];

const baseName = name => String(name ?? '').replace(/\s*\[\d+\]\s*$/, '').replace(/\s*\(Vehicle\)\s*$/i, '').trim();
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
/** A mod's rating — its `rating`, else a "[N]" level in its name, else 1. */
const ratingOf = mod => {
  const r = num(mod?.system?.rating);
  if (r > 0) return r;
  const m = /\[(\d+)\]\s*$/.exec(String(mod?.name ?? ''));
  return m ? Number(m[1]) : 1;
};

export const VehicleMods = {
  PAGES, EFFECTS, STATS,

  /** What this mod is, by name, or null when it changes none of the vehicle's numbers. */
  effectOf(mod) {
    if (mod?.type && mod.type !== 'vehiclemod') return null;
    return EFFECTS[baseName(mod?.name)] ?? null;
  },

  /** Handling added by armour: +1 for every FULL 6 points of vehicle or concealed armour added (R3R pp.131-132). */
  handlingFor(added) {
    return Math.floor(Math.max(0, added) / 6);
  },

  /** Ablative armour's gain: `want` (level × 2), the Armor raised no higher than Body and never lowered (R3R p.131). */
  ablativeGain(want, armor, body) {
    return Math.min(want, Math.max(0, body - armor));
  },

  /** A rated system: the HIGHER of the vehicle's rating and the mod's (the maintainer, 2026-10-27). */
  rated(own, mod) {
    return Math.max(own, mod);
  },

  /** The vehicle's own (typed) figure for a stat. */
  own(vehicle, stat) {
    const sys = vehicle?.system ?? {};
    return EW.includes(stat) ? num(sys.ew?.[stat]) : num(sys.attributes?.[stat]?.base);
  },

  /**
   * Every stat's effective figure and where it came from: `{ stats: { armor: { own, value, from: [{ name, change, page }] } … },
   * warnings, notes }`. `items` is the vehicle's items (anything not a vehiclemod is skipped).
   */
  effective(vehicle, items = []) {
    const own = Object.fromEntries(STATS.map(s => [s, VehicleMods.own(vehicle, s)]));
    const stats = Object.fromEntries(STATS.map(s => [s, { own: own[s], value: own[s], from: [] }]));
    const warnings = [];
    const notes = [];
    const body = VehicleMods.own(vehicle, 'body');
    const list = [...(items ?? [])].map(mod => ({ mod, fx: VehicleMods.effectOf(mod) })).filter(r => r.fx);

    // ── Armor: Vehicle and Concealed add a point a level; every full 6 added raises Handling by 1 (pp.131-132). ──
    let added = 0;
    for (const { mod, fx } of list.filter(r => r.fx.kind === 'armor' || r.fx.kind === 'concealed')) {
      const pts = ratingOf(mod);
      added += pts;
      stats.armor.from.push({ name: mod.name, change: `+${pts}`, page: PAGES[fx.kind] });
    }
    stats.armor.value += added;
    const kinds = new Set(list.map(r => r.fx.kind));
    if (kinds.has('concealed') && kinds.has('armor')) {
      warnings.push(`Concealed Armor is not compatible with standard vehicle armor (${PAGES.concealed}).`);
    }
    if (added > 0 && body <= 0) warnings.push(`A vehicle with Body 0 cannot carry vehicle armor (${PAGES.armor}).`);
    const heavier = VehicleMods.handlingFor(added);
    if (heavier > 0) {
      for (const s of ['handling', 'handlingOffRoad']) {
        stats[s].value += heavier;
        stats[s].from.push({ name: `${added} points of armor added`, change: `+${heavier}`, page: PAGES.armor });
      }
    }

    // ── Ablative: + level × 2, the Armor raised no higher than Body (p.131). Its level drops as it is hit. ──
    for (const { mod } of list.filter(r => r.fx.kind === 'ablative')) {
      const want = ratingOf(mod) * 2;
      const got = VehicleMods.ablativeGain(want, stats.armor.value, body);
      stats.armor.value += got;
      if (got > 0) stats.armor.from.push({ name: mod.name, change: `+${got}`, page: PAGES.ablative });
      if (got < want) notes.push(`${mod.name}: +${want} Armor, raised only to the vehicle's Body ${body} (+${got}) (${PAGES.ablative}).`);
    }

    // ── Rated systems: the higher of the vehicle's own rating and the mod's (the maintainer, 2026-10-27). ──
    for (const { mod, fx } of list.filter(r => r.fx.kind === 'rated')) {
      const r = ratingOf(mod);
      const st = stats[fx.target];
      const next = VehicleMods.rated(st.value, r);
      if (next !== st.value) {
        st.from.push({ name: mod.name, change: `${fx.label} ${r}`, page: PAGES[fx.target] });
        st.value = next;
      } else {
        notes.push(`${mod.name} (${r}) is no higher than the vehicle's ${fx.label} ${st.value} — it changes nothing.`);
      }
    }

    // ── Control, engine and signature mods (R3R pp.126-135): a change per level. ──
    const type = String(vehicle?.system?.vehicleType ?? '');
    const add = (stat, n, name, page) => {
      if (!n) return;
      stats[stat].value += n;
      stats[stat].from.push({ name, change: `${n > 0 ? '+' : '−'}${Math.abs(n)}`, page });
    };
    const over = (mod, kind, r) => {
      if (MAX_LEVEL[kind] && r > MAX_LEVEL[kind]) warnings.push(`${mod.name}: ${r} levels — the most is ${MAX_LEVEL[kind]} (${PAGES[kind]}).`);
    };
    let turboLevel = 0;
    for (const { mod, fx } of list) {
      const r = ratingOf(mod);
      const page = PAGES[fx.kind];
      over(mod, fx.kind, r);
      if (fx.kind === 'dbw') {
        add('handling', -r, mod.name, page);
        add('handlingOffRoad', -r, mod.name, page);
        // The one-time +10%, split as the player chose — not a level's worth (p.129). Read as rounded down (not ruled).
        const split = mod.system?.dbwSplit ?? {};
        const pct = { accel: num(split.accel), speed: num(split.speed), load: num(split.load) };
        const total = pct.accel + pct.speed + pct.load;
        if (total > 10) warnings.push(`${mod.name}: the split adds up to ${total}% — drive-by-wire gives 10% in all (${page}).`);
        if (total === 0) notes.push(`${mod.name}: a one-time +10% split among Acceleration, Speed and Load — set it on the mod (${page}).`);
        for (const s of ['accel', 'speed', 'load']) add(s, VehicleMods.splitGain(stats[s].own, pct[s]), `${mod.name} (+${pct[s]}%)`, page);
      } else if (fx.kind === 'suspension') {
        add('handling', -r, mod.name, page);
        if (type === 'motorcycle') add('handlingOffRoad', -r, mod.name, page);
      } else if (fx.kind === 'control') {
        add('handling', -r, mod.name, page);
        if (!WATER.includes(type)) warnings.push(`${mod.name} is for watercraft (${page}).`);
      } else if (fx.kind === 'offroad') {
        add('handlingOffRoad', -r, mod.name, page);
        add('handling', r, mod.name, page);
        add('speed', -15, mod.name, page);   // once, however many levels (p.129)
      } else if (fx.kind === 'turbo') {
        turboLevel += r;
        add('speed', 15 * r, mod.name, page);
        add('accel', r, mod.name, page);
        add('sig', -r, mod.name, page);
        if (AIR.includes(type)) warnings.push(`${mod.name}: aircraft cannot be turbocharged unless electrically powered (${page}).`);
        if (r > 1 && 15 * r > stats.speed.own * 0.5) warnings.push(`${mod.name}: past 1.5 × the vehicle's Speed (${page}).`);
      } else if (fx.kind === 'ram' || fx.kind === 'baffles') {
        add('sig', r, mod.name, page);
        if (fx.kind === 'baffles') notes.push(`${mod.name}: +${r} to Perception Tests against the vehicle by thermographic means other than a vehicle's sensors (${page}).`);
      } else if (fx.kind === 'masking') {
        notes.push(`${mod.name}: Signature +${r} while it runs (${60 - 5 * r} minutes), Speed −${15 * r} m/turn; then Signature 2 for 10 minutes (${page}).`);
      } else if (fx.kind === 'noisemaker') {
        notes.push(`${mod.name}: once released, +3 to every target number to detect or target the boat this Combat Turn and the next two (${page}).`);
        if (!WATER.includes(type)) warnings.push(`${mod.name} is for ships, subs and boats (${page}).`);
      }
    }
    const masking = list.filter(r => r.fx.kind === 'masking').reduce((s, r) => s + ratingOf(r.mod), 0);
    if (masking > turboLevel) warnings.push(`Active Thermal Masking ${masking} — one level for each level of engine customization (turbocharging ${turboLevel}) (${PAGES.masking}).`);
    if (kinds.has('dbw') && (kinds.has('suspension') || kinds.has('control'))) {
      warnings.push(`Improved suspension and improved control surfaces may not be used with drive-by-wire (${PAGES.dbw}).`);
    }

    // ── Weapon mounts' standing Signature (SR3 p.307; R3R pp.136, 140) — the maintainer, 2026-10-27. ──
    const fromMounts = VehicleMods.mountSignature(vehicle, items);
    if (fromMounts) add('sig', -fromMounts, 'weapon mounts', PAGES.mounts);
    return { stats, warnings, notes };
  },

  /** The mounts' standing Signature reduction — external fixed −1, each turret −1 (SR3 p.307, R3R p.140). Applied. */
  mountSignature(vehicle, items) {
    return VehicleMounts.summary(vehicle, items).signature.reduction;
  },

  /** Drive-by-wire's split: `pct` percent of the stat, rounded down (read as — the book does not say). */
  splitGain(own, pct) {
    return Math.floor(num(own) * num(pct) / 100);
  },

  /**
   * What this mod costs on this vehicle (customization Parts Cost), or null when it is not priced from the vehicle or the
   * vehicle lacks what it needs (no cost, a type the book does not name).
   */
  price(mod, vehicle, items = []) {
    const fx = VehicleMods.effectOf(mod);
    const fn = fx && PRICES[fx.kind];
    if (!fn) return null;
    const sys = vehicle?.system ?? {};
    const turbo = [...(items ?? [])].find(i => VehicleMods.effectOf(i)?.kind === 'turbo');
    const v = { cost: num(sys.cost), body: num(sys.attributes?.body?.base), type: String(sys.vehicleType ?? ''),
      turboCost: turbo ? 0.1 * num(sys.cost) * ratingOf(turbo) : 0 };
    if (fx.kind !== 'ram' && fx.kind !== 'baffles' && fx.kind !== 'masking' && v.cost <= 0) return null;
    const p = fn(v, ratingOf(mod));
    return Number.isFinite(p) && p > 0 ? Math.round(p) : null;
  },

  /**
   * A vehicle's effective figure for a stat — what a roll reads. Falls back to the typed figure where nothing was prepared (a
   * compendium entry's raw data). A stat this module does not change (Body, Cargo) is its typed figure.
   */
  stat(vehicle, stat) {
    const sys = vehicle?.system ?? {};
    if (EW.includes(stat)) return num(sys.derived?.ew?.[stat] ?? sys.ew?.[stat]);
    const a = sys.attributes?.[stat];
    // ⚠ Only the STATS are prepared; any other stat's stored `value` is stale (no input binds it) — read its base.
    return num(STATS.includes(stat) ? (a?.value ?? a?.base) : a?.base);
  },

  /** The paths `_prepareVehicle` writes: `{ 'attributes.armor.value': 6, …, 'derived.ew.ecm': 2 }` — every stat, changed or not. */
  derivedPaths(vehicle, items) {
    const { stats } = VehicleMods.effective(vehicle, items);
    return Object.fromEntries(STATS.map(s => [EW.includes(s) ? `derived.ew.${s}` : `attributes.${s}.value`, stats[s].value]));
  },
};

/** `VehicleMods.stat` — what a roll reads. ⚠ Readers go through this, never `attributes.X.base` (`tests/vehicle-mods.test.mjs`). */
export const vehicleStat = (vehicle, stat) => VehicleMods.stat(vehicle, stat);
