/**
 * Vehicle weapon mounts — hardpoints, firmpoints, pintles, rings and turrets · TODO 234 (TODO 265, step c's second slice). Pure.
 *
 * Rigger 3 Revised, *Vehicle Weapon Mounts* (printed pp.135-141; PDF page = printed + 2):
 *   - **p.135** Each hardpoint is worth 2 points and each firmpoint 1; "the total point value of all the hardpoints and
 *     firmpoints on a vehicle cannot exceed the vehicle's Body rating". Heavy weapons (MMGs and larger) and vehicle weapons
 *     must go on hardpoints; LMGs and small arms (assault rifles and smaller) can go on firmpoints.
 *   - **p.136** A fixed mount is a hardpoint or firmpoint with a weapon permanently affixed. Fixed mounts "reduce recoil
 *     modifiers by half before applying recoil compensation" and so cancel the heavy-weapon double. Any EXTERNAL mount is
 *     Signature −1; an internal mount is −1 only while its weapon is out. A personal firearm on a fixed mount or turret needs a
 *     firearm conversion kit; pintle and ring mounts do not.
 *   - **p.138** Pintle mounts take any firmpoint-sized weapon, count as one firmpoint, and give 2 points of recoil compensation.
 *   - **p.139** Ring mounts count as a hardpoint, take any man-portable heavy weapon or LMG, and give 6 points of RC.
 *   - **p.140** Turrets: Signature −1 each (a pop-up turret not while it is concealed); recoil halved before RC, the heavy
 *     double cancelled; the *Weapon Values Table* — a turret's size sets its hardpoints and Weapon Value, and the weapons on
 *     it may not exceed that value. Pop-up turrets are 1 Weapon Value lower (p.141; a pop-up micro-turret stays at 1).
 *
 * The maintainer, 2026-10-27: **a weapon LINKS to its mount** (`system.mountId` on the firearm or vehicle weapon — the id of a
 * `vehiclemod` on the same vehicle); **halved recoil rounds down**; the standing Signature reduction (external fixed mounts −1,
 * SR3 p.307; each turret −1) is APPLIED by `vehicle-mods.mjs` — the maintainer reversed "shown, never changed" the same day:
 * "I was wrong, External fixed mounts reduce the vehicle's Signature by 1 (SR3 p.307)". The conditional parts stay notes;
 * a mount changes a FIREARM's fire dialog now — vehicle-weapon recoil is TODO 282. Warn, never refuse.
 */

const baseName = name => String(name ?? '').replace(/\s*\[\d+\]\s*$/, '').replace(/\s*\(Vehicle\)\s*$/i, '').trim();

/** Turret sizes: hardpoints taken (micro: 1 firmpoint) and Weapon Value — R3R p.140, the Weapon Values Table. */
export const TURRETS = {
  micro:  { points: 1,  slot: 'firmpoint', hardpoints: 0, weaponValue: 1 },
  mini:   { points: 2,  slot: 'hardpoint', hardpoints: 1, weaponValue: 2 },
  small:  { points: 4,  slot: 'hardpoint', hardpoints: 2, weaponValue: 3 },
  medium: { points: 6,  slot: 'hardpoint', hardpoints: 3, weaponValue: 6 },
  large:  { points: 8,  slot: 'hardpoint', hardpoints: 4, weaponValue: 8 },
  xl:     { points: 10, slot: 'hardpoint', hardpoints: 5, weaponValue: 10 },
};

/** A firearm category's Weapon Value (R3R p.140). A category the table does not list (pistols, shotguns) is null. */
export const FIREARM_VALUES = {
  SMG: 1, MaPist: 1, Carb: 1, AsRf: 1, SptR: 1, Snip: 1, LCarb: 1, GrLn: 1,
  LMG: 1.5, MMG: 2, HMG: 2, MinG: 2, MisLn: 2, ACan: 3, MrTr: 4,
};

/** A vehicle weapon's Weapon Value by its `weaponType` (R3R p.140); railguns by their name. Null when not in the table. */
export const VEHICLE_WEAPON_VALUES = {
  autocannon: 3, laser: 3, mmg: 2, hmg: 2, missile: 2, 'water cannon': 3, mortar: 4,
  'light naval gun': 8, 'medium naval gun': 10,
};

/** Firearm categories that must go on a hardpoint: "heavy weapons (MMGs and larger)" — R3R p.135. */
export const HARDPOINT_ONLY = new Set(['MMG', 'HMG', 'MinG', 'ACan']);

export const PAGES = { points: 'R3R p.135', fixed: 'R3R p.136', pintle: 'R3R p.138', ring: 'R3R p.139', turret: 'R3R p.140' };

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const VehicleMounts = {
  TURRETS, FIREARM_VALUES, VEHICLE_WEAPON_VALUES, HARDPOINT_ONLY, PAGES,

  /**
   * What kind of mount a `vehiclemod` is, or null when it is not a weapon mount (the missile mounts are not: their launch
   * control systems take the points, p.137). `{ kind, points, slot, external, popup, remote, weaponValue, rc, halve }`.
   */
  kindOf(mod) {
    if (mod?.type && mod.type !== 'vehiclemod') return null;
    const n = baseName(mod?.name).toLowerCase();
    let m = /^(external|internal)\s+(hard|firm)point$/.exec(n);
    if (m) {
      const hard = m[2] === 'hard';
      return { kind: 'fixed', points: hard ? 2 : 1, slot: hard ? 'hardpoint' : 'firmpoint', external: m[1] === 'external',
        popup: false, remote: false, weaponValue: null, rc: 0, halve: true };
    }
    if (/^pintle mount\b/.test(n)) return { kind: 'pintle', points: 1, slot: 'firmpoint', external: true, popup: false, remote: false, weaponValue: null, rc: 2, halve: false };
    if (/^ring mount\b/.test(n)) return { kind: 'ring', points: 2, slot: 'hardpoint', external: true, popup: false, remote: false, weaponValue: null, rc: 6, halve: false };
    m = /^(remote\s+)?(micro|mini|small|medium|large|extra-large|extra-larget|ex-large)[\s-]*turret\s*(?:\((anti-air|pop-up)\))?$/.exec(n);
    if (m) {
      const size = /^(extra-large|extra-larget|ex-large)$/.test(m[2]) ? 'xl' : m[2];
      const t = TURRETS[size];
      const popup = m[3] === 'pop-up';
      const weaponValue = popup && size !== 'micro' ? t.weaponValue - 1 : t.weaponValue;
      return { kind: 'turret', size, points: t.points, slot: t.slot, external: true, popup, remote: !!m[1], weaponValue, rc: 0, halve: true };
    }
    return null;
  },

  /** A weapon's Weapon Value (R3R p.140), or null when the table does not list it. */
  weaponValue(weapon) {
    const sys = weapon?.system ?? {};
    if (weapon?.type === 'vehicleweapon') {
      const t = String(sys.weaponType ?? '').trim().toLowerCase();
      if (t === 'railgun') {
        const name = String(weapon.name ?? '').toLowerCase();
        return /heavy/.test(name) ? 10 : /medium/.test(name) ? 8 : /light/.test(name) ? 5 : null;
      }
      return VEHICLE_WEAPON_VALUES[t] ?? null;
    }
    const cat = String(sys.category ?? '');
    if (cat === 'MinG' && /vanquisher|vengeance/i.test(weapon?.name ?? '')) return 2.5;
    return FIREARM_VALUES[cat] ?? null;
  },

  /** Must this weapon go on a hardpoint? Vehicle weapons and heavy weapons, MMG and larger (R3R p.135). */
  needsHardpoint(weapon) {
    if (weapon?.type === 'vehicleweapon') return true;
    return HARDPOINT_ONLY.has(String(weapon?.system?.category ?? ''));
  },

  /** The mount a weapon is linked to on this vehicle: `{ mod, ...kindOf }`, or null (unlinked, gone, or not a mount). */
  mountOf(vehicleItems, weapon) {
    const id = String(weapon?.system?.mountId ?? '').trim();
    if (!id) return null;
    const mod = [...(vehicleItems ?? [])].find(i => (i.id ?? i._id) === id);
    const kind = mod ? VehicleMounts.kindOf(mod) : null;
    return kind ? { mod, ...kind } : null;
  },

  /**
   * What a firearm's mount does to its recoil: `{ halve, rc, label }` — fixed mounts and turrets halve (rounded down — the
   * maintainer, 2026-10-27) before RC and cancel the heavy double (pp.136, 140); a pintle adds RC 2 (p.138), a ring RC 6
   * (p.139). Null when the weapon is on no mount.
   */
  recoilFor(vehicleItems, weapon) {
    const m = VehicleMounts.mountOf(vehicleItems, weapon);
    if (!m) return null;
    const page = PAGES[m.kind];
    const label = m.halve
      ? `${m.mod.name}: recoil halved before compensation, no heavy-weapon doubling (${page})`
      : `${m.mod.name}: +${m.rc} recoil compensation (${page})`;
    return { halve: m.halve, rc: m.rc, label };
  },

  /**
   * The vehicle's mounts: `{ points: { used, of, over }, mounts: [...], signature: { reduction, notes }, warnings, notes }`.
   * `items` are the vehicle's items (mods and weapons together). `of` is the vehicle's Body as it stands.
   */
  summary(vehicle, items = []) {
    const sys = vehicle?.system ?? vehicle ?? {};
    const body = num(sys.attributes?.body?.base);   // the sheet edits `base`; a stored `value` is stale
    const list = [...items];
    const weapons = list.filter(i => i.type === 'firearm' || i.type === 'vehicleweapon');
    const mounts = list.map(mod => ({ mod, kind: VehicleMounts.kindOf(mod) })).filter(r => r.kind).map(({ mod, kind }) => {
      const id = mod.id ?? mod._id;
      const on = weapons.filter(w => String(w.system?.mountId ?? '') === id);
      const values = on.map(w => VehicleMounts.weaponValue(w));
      return { id, name: mod.name, ...kind, weapons: on.map(w => w.name),
        weaponValueUsed: values.reduce((s, v) => s + (v ?? 0), 0), unvalued: on.filter((_, i) => values[i] == null).map(w => w.name), on };
    });
    const used = mounts.reduce((s, m) => s + m.points, 0);
    const points = { used, of: body, over: Math.max(0, used - body) };
    const warnings = [];
    const notes = [];
    if (points.over > 0) {
      warnings.push(`The mounts take ${used} points (a hardpoint is 2, a firmpoint 1); the vehicle's Body is ${body} — ${points.over} over (${PAGES.points}).`);
    }
    for (const m of mounts) {
      const page = PAGES[m.kind];
      for (const w of m.on) {
        if (m.slot === 'firmpoint' && VehicleMounts.needsHardpoint(w)) {
          warnings.push(`${w.name} is on ${m.name}, a firmpoint — heavy weapons (MMG and larger) and vehicle weapons need a hardpoint (${PAGES.points}).`);
        } else if (m.kind === 'ring' && w.type === 'vehicleweapon') {
          warnings.push(`${w.name} is on ${m.name} — a ring mount takes man-portable heavy weapons and LMGs (${PAGES.ring}).`);
        }
        if (w.type === 'firearm' && (m.kind === 'fixed' || m.kind === 'turret')) {
          notes.push(`${w.name} on ${m.name}: a personal firearm on a fixed mount or turret needs a firearm conversion kit (${PAGES.fixed}).`);
        }
      }
      if (m.kind === 'turret') {
        if (m.weaponValueUsed > m.weaponValue) {
          warnings.push(`${m.name} carries Weapon Value ${m.weaponValueUsed}; it takes ${m.weaponValue} (${page}).`);
        }
        if (m.unvalued.length) notes.push(`${m.name}: ${m.unvalued.join(', ')} not in the Weapon Values Table — not counted (${page}).`);
      }
      if (m.kind === 'fixed' && m.on.length > 1) {
        notes.push(`${m.name} holds ${m.on.length} weapons — a fixed mount is one weapon permanently affixed (${PAGES.fixed}); twin mounts are two mounts.`);
      }
    }
    const orphans = weapons.filter(w => String(w.system?.mountId ?? '').trim() && !mounts.some(m => m.id === w.system.mountId));
    for (const w of orphans) warnings.push(`${w.name} names a mount that is not on this vehicle — pick its mount again.`);

    // Signature: `reduction` is applied by vehicle-mods.mjs (SR3 p.307; the maintainer, 2026-10-27); the conditional parts are notes.
    let reduction = 0;
    const sigNotes = [];
    if (mounts.some(m => m.kind === 'fixed' && m.external)) { reduction += 1; sigNotes.push(`external mounts −1 (${PAGES.fixed})`); }
    const turrets = mounts.filter(m => m.kind === 'turret' && !m.popup).length;
    if (turrets) { reduction += turrets; sigNotes.push(`${turrets} turret${turrets === 1 ? '' : 's'} −${turrets} (${PAGES.turret})`); }
    if (mounts.some(m => m.kind === 'fixed' && !m.external)) sigNotes.push(`−1 more while an internal mount's weapon is out (${PAGES.fixed})`);
    if (mounts.some(m => m.kind === 'turret' && m.popup)) sigNotes.push(`a pop-up turret −1 while it is up (${PAGES.turret})`);
    return { points, mounts: mounts.map(({ on: _on, ...m }) => m), signature: { reduction, notes: sigNotes }, warnings, notes };
  },
};
