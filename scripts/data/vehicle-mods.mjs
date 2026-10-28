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
 *
 * ⚠ **The maintainer's rulings, 2026-10-27:** the mods APPLY — the rolls read the effective figure — and the figure a GM typed
 * stays the vehicle's own (stock) value, editable (`attributes.X.base`); and a rated system gives **the higher** of the
 * vehicle's own rating and the mod's (a Sensors 2 on a Sensor 3 car leaves 3).
 *
 * Nothing computed is saved: `SR3EActor._prepareVehicle` puts the result in `attributes.X.value` (no sheet input binds it) and
 * `derived.ew`. Handling is a target number — a higher Handling is WORSE (SR3 p.134). Warn, never refuse.
 */

export const PAGES = {
  armor: 'R3R p.131', concealed: 'R3R p.132', ablative: 'R3R p.131', pilot: 'R3R p.127', autonav: 'R3R p.127',
  sensor: 'R3R p.147', ecm: 'R3R p.143', eccm: 'R3R p.145',
};

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
};

/** The vehicle numbers this module changes. `ecm` / `eccm` live in `system.ew`, the rest in `system.attributes`. */
export const STATS = ['armor', 'handling', 'handlingOffRoad', 'pilot', 'autonav', 'sensor', 'ecm', 'eccm'];
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
    return { stats, warnings, notes };
  },

  /**
   * A vehicle's effective figure for a stat — what a roll reads. Falls back to the typed figure where nothing was prepared (a
   * compendium entry's raw data). A stat this module does not change (Body, Speed, Signature) is its typed figure.
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
