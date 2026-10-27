/**
 * Mods installed INSIDE an item, and what they change · TODO 276. Pure — no Foundry.
 *
 * The maintainer, 2026-10-27: a mod lives inside what it is installed on — "if we were adding a bag I wouldn't want a
 * list in gear of what's in the bag, I'd want to open the bag to see what's in there" — and its effects climb one level
 * at a time: "a cybereye with thermal vision adds the thermal vision attribute to the cybereye, which then adds it to the
 * actor". So:
 *
 *   mod  ──►  host item  ──►  actor
 *   Gas Vent II          Ares Predator: rc 2              (a weapon never passes anything up — the attack asks the gun)
 *   Thermographic  ──►   Cybereyes: thermo  ──►  thermo   (installed cyberware always does)
 *
 * **Storage.** A host carries its mods as full item data in `system.installed` (an array; each entry keeps its own
 * `_id`). They are not documents: they move, copy and delete with the host, in a sidebar item or a compendium too.
 * ⚠ Not `system.mods` — cyberware already has that, the upstream bonus string (`+2RCT`).
 *
 * **Effects.** Any item may carry `system.modifiers`, `[{ target, value, perRating }]`, from the fixed vocabulary `TARGETS`
 * (`perRating`: the value is per point of the item's rating — Fire Resistance [3] at 1 per point is 3). Each
 * target says how values combine (`add`, `max` — the highest one counts, the maintainer's "no stacking" for image
 * magnification — or `any`, an on/off feature) and whether it reaches the actor. A host's effective value is its own
 * modifiers plus its installed mods' (and theirs, `MAX_DEPTH` deep). Nothing computed is saved; the host's own fields
 * stay the base, editable by hand.
 *
 * **Warn, never refuse.** `warnings` says when a mod is for something else (`modFor`, TODO 266) or its mount is taken
 * (SR3 p.280: top, barrel and underbarrel, one accessory each); the install goes ahead regardless.
 */

/** The vocabulary. `combine`: add | max | any. `toActor`: the value climbs from a passing host to the actor. */
export const TARGETS = {
  rc:         { label: 'Recoil Compensation', short: 'RC',        combine: 'add', toActor: false, page: 'SR3 p.281' },
  smartgun:   { label: 'Smartgun system',     short: 'Smartgun',  combine: 'any', toActor: false, page: 'SR3 p.281' },
  laserSight: { label: 'Laser sight',         short: 'Laser',     combine: 'any', toActor: false, page: 'SR3 p.281' },
  lowLight:   { label: 'Low-light vision',    short: 'Low-light', combine: 'any', toActor: true,  page: 'SR3 p.299' },
  thermo:     { label: 'Thermographic vision', short: 'Thermo',   combine: 'any', toActor: true,  page: 'SR3 p.299' },
  // Image magnification — the range band shifts toward Short by the rating (SR3 p.110). The HIGHEST device counts, never the
  // sum (the maintainer, TODO 235): `max`. Read by scripts/data/magnification.mjs.
  magnification: { label: 'Image magnification', short: 'Mag',     combine: 'max', toActor: true,  page: 'SR3 p.110' },
  // Armour modifications (TODO 276, armour slice; scripts/data/armor-mods.mjs reads them). `capped`: counts toward an
  // armour's mod-point caps (CC p.52). Each lowers the Power of one kind of attack by its value — the GM applies it.
  resistChemical: { label: 'Power − vs contact chemicals', short: 'Chem seal', combine: 'add', toActor: false, capped: true, page: 'CC p.52' },
  resistFire:     { label: 'Power − vs fire',              short: 'Fire res.', combine: 'add', toActor: false, capped: true, page: 'CC p.52' },
  resistCold:     { label: 'Power − vs cold (Insulation)', short: 'Insulation', combine: 'add', toActor: false, capped: true, page: 'CC p.53' },
  resistElectric: { label: 'Power − vs electricity',       short: 'Nonconductive', combine: 'add', toActor: false, capped: true, page: 'CC p.53' },
  thermalMasking: { label: 'Thermal dampening (+ to be seen by thermo)', short: 'Thermal damp.', combine: 'add', toActor: false, capped: true, page: 'CC p.53' },
  gelPacks:       { label: 'Gel packs (hardened)',         short: 'Gel packs', combine: 'any', toActor: false, page: 'CC p.53' },
};

/** The item types that can hold mods. */
export const HOST_TYPES = ['firearm', 'melee', 'armor', 'cyberware'];

/** How deep mods nest — a turret holding a gun holding a scope. Deeper entries are ignored, never looped. */
export const MAX_DEPTH = 3;

/** The weapon mounts that hold one accessory each · SR3 p.280. Any other mount (Hand, Tripod, NA) holds none. */
export const MOUNTS = ['Top', 'Under', 'Barrel'];

const WEAPON_TYPES = ['firearm', 'melee', 'projectile', 'thrown'];
/** The Rifles-skill weapon categories (CLAUDE.md, weapon codes) — a rifle has its own stock. */
export const RIFLES = ['Carb', 'AsRf', 'SptR', 'Snip', 'LCarb'];
/** A name without its mod tag or level ("Stock (Rigid (Weapon)" → "Stock (Rigid"). Pure, no imports. */
const baseNameOf = item => String(item?.name ?? '').replace(/\s*\[\d+\]\s*$/, '').replace(/\s*\((?:Weapon|Armor|Cyberlimb|Vehicle)\)\s*$/, '').trim();
const SCAFFOLDING = ['_stats', 'folder', 'sort', 'ownership'];

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const ItemMods = {
  TARGETS, HOST_TYPES, MAX_DEPTH, MOUNTS,

  /** Can this item hold mods? */
  isHost(item) {
    return HOST_TYPES.includes(item?.type);
  },

  /** The mods installed in an item — always an array. */
  installed(item) {
    const list = item?.system?.installed;
    return Array.isArray(list) ? list : [];
  },

  /** The item's own modifiers, unknown targets dropped; a `perRating` value multiplied by the item's rating. */
  modifiersOf(item) {
    const list = item?.system?.modifiers;
    if (!Array.isArray(list)) return [];
    const rating = Math.max(0, num(item?.system?.rating));
    return list.filter(m => TARGETS[m?.target]).map(m => ({ target: m.target, value: m.perRating ? num(m.value) * rating : num(m.value) }));
  },

  /**
   * Every target the item has, from its own modifiers and its mods': `{ [target]: { value, parts } }`, where each part
   * is `{ source, value }` — `source` the mod's name, or null for the item itself. Only targets with a part appear.
   */
  effective(item) {
    const parts = {};
    const walk = (it, source, depth) => {
      for (const m of ItemMods.modifiersOf(it)) (parts[m.target] ??= []).push({ source, value: m.value });
      if (depth >= MAX_DEPTH) return;
      for (const mod of ItemMods.installed(it)) walk(mod, mod?.name ?? '?', depth + 1);
    };
    walk(item, null, 0);
    return Object.fromEntries(Object.entries(parts).map(([t, p]) => [t, { value: ItemMods.combine(t, p.map(x => x.value)), parts: p }]));
  },

  /** One target's values combined per its rule. `any` is 1 when any value is positive, else 0. */
  combine(target, values) {
    const vs = values.map(num);
    switch (TARGETS[target]?.combine) {
      case 'add': return vs.reduce((a, b) => a + b, 0);
      case 'max': return vs.length ? Math.max(...vs) : 0;
      case 'any': return vs.some(v => v > 0) ? 1 : 0;
      default:    return 0;
    }
  },

  /** One target's effective value on an item, or `fallback` when nothing sets it. */
  value(item, target, fallback = 0) {
    return ItemMods.effective(item)[target]?.value ?? fallback;
  },

  /** "RC 2 = Gas Vent II +2" — a part list as one line, for a tooltip. */
  describe(target, entry) {
    const t = TARGETS[target];
    if (!t || !entry) return '';
    const bit = p => `${p.source ?? 'built in'}${t.combine === 'any' ? '' : ` ${p.value >= 0 && t.combine === 'add' ? '+' : ''}${p.value}`}`;
    return `${t.short}${t.combine === 'any' ? '' : ` ${entry.value}`}: ${entry.parts.map(bit).join(', ')}`;
  },

  /**
   * Does this item's effect climb to its actor right now? Installed cyberware and bioware always, armour only while
   * worn, gear while carried — never anything in Storage, and never a weapon (the attack asks the gun it fires).
   */
  passesToActor(item) {
    if (item?.flags?.The2ndChumming3e?.stored === true) return false;
    switch (item?.type) {
      case 'cyberware': case 'bioware': case 'gear': return true;
      case 'armor': return item?.system?.worn === true;
      default: return false;
    }
  },

  /**
   * What the actor gets from its items: `{ [target]: { value, parts } }` over the `toActor` targets, each part
   * `{ source: host name, via: mod name | null, value }`.
   */
  actorTotals(items) {
    const parts = {};
    for (const item of items ?? []) {
      if (!ItemMods.passesToActor(item)) continue;
      for (const [target, entry] of Object.entries(ItemMods.effective(item))) {
        if (!TARGETS[target].toActor) continue;
        for (const p of entry.parts) (parts[target] ??= []).push({ source: item.name, via: p.source, value: p.value });
      }
    }
    return Object.fromEntries(Object.entries(parts).map(([t, p]) => [t, { value: ItemMods.combine(t, p.map(x => x.value)), parts: p }]));
  },

  /* ── Installing ──────────────────────────────────────────────────────────────── */

  /**
   * The installed list with `data` added: a plain copy, its document scaffolding dropped, the Storage flag cleared,
   * and an `_id` unique in the list (`newId` makes one when the data has none or it is taken).
   */
  install(installed, data, newId) {
    const list = Array.isArray(installed) ? installed : [];
    const entry = structuredClone(data ?? {});
    for (const k of SCAFFOLDING) delete entry[k];
    if (entry.flags?.The2ndChumming3e) delete entry.flags.The2ndChumming3e.stored;
    if (!entry._id || list.some(m => m._id === entry._id)) entry._id = newId();
    return [...list, entry];
  },

  /** `{ installed, mod }` — the list without the mod `id`, and the mod (null when it is not there). */
  uninstall(installed, id) {
    const list = Array.isArray(installed) ? installed : [];
    return { installed: list.filter(m => m._id !== id), mod: list.find(m => m._id === id) ?? null };
  },

  /** The installed list with mod `id` replaced by `data` (its `_id` kept). Unknown id: the list unchanged. */
  replace(installed, id, data) {
    const list = Array.isArray(installed) ? installed : [];
    return list.map(m => (m._id === id ? { ...structuredClone(data), _id: id } : m));
  },

  /* ── Warnings ────────────────────────────────────────────────────────────────── */

  /** What a host takes, as a `modFor` value — 'weapon', 'armor', 'cyberlimb', or '' (anything, no warning). */
  hostKind(item) {
    if (WEAPON_TYPES.includes(item?.type)) return 'weapon';
    if (item?.type === 'armor') return 'armor';
    if (item?.type === 'cyberware' && item?.system?.cyberwareCategory === 'Cyberlimbs') return 'cyberlimb';
    return '';
  },

  /**
   * The weapon mounts a mod can go on, from `system.mount`, else the description's "Mount: Top/Under" (the generated
   * accessories carry it there, TODO 259). Only `MOUNTS` count; anything else (Hand, Tripod, NA) is [].
   */
  mountsOf(mod) {
    const raw = mod?.system?.mount || /Mount:\s*(?:<\/strong>)?\s*([^<\n]+)/i.exec(String(mod?.system?.description ?? ''))?.[1] || '';
    return raw.split('/').map(s => s.trim()).map(s => MOUNTS.find(m => m.toLowerCase() === s.toLowerCase())).filter(Boolean);
  },

  /**
   * Which mount each installed mod holds, in list order: `[{ id, name, mount }]` (`mount` '' when it holds none). One-mount
   * mods first, then the either-or ones take the first mount still free (a Top/Under laser goes under when a scope is on
   * top).
   */
  assignMounts(installed) {
    const list = (Array.isArray(installed) ? installed : []).map(m => ({ id: m?._id ?? null, name: m?.name ?? '?', mounts: ItemMods.mountsOf(m), mount: '' }));
    const taken = new Set();
    for (const m of list.filter(x => x.mounts.length === 1)) {
      if (!taken.has(m.mounts[0])) { m.mount = m.mounts[0]; taken.add(m.mount); }
    }
    for (const m of list.filter(x => x.mounts.length > 1)) {
      const free = m.mounts.find(x => !taken.has(x));
      if (free) { m.mount = free; taken.add(free); }
    }
    return list.map(({ id, name, mount }) => ({ id, name, mount }));
  },

  /** `{ Top: name, … }` — the mounts in use and what holds each. */
  mountsInUse(installed) {
    const held = ItemMods.assignMounts(installed).filter(m => m.mount);
    return Object.fromEntries(MOUNTS.filter(k => held.some(m => m.mount === k)).map(k => [k, held.find(m => m.mount === k).name]));
  },

  /**
   * Why `mod` may NOT go into `host`, or null. ⚠ **The one refusal** in a system that otherwise warns — the maintainer,
   * 2026-10-27: *"you should not be able to install a stock on a rifle since it has one by default"* (SR3 p.277: rifle
   * stocks are part of the gun; CC p.34 / p.84: the Stock accessory is for SMG-sized and smaller weapons). Rifles are
   * the Rifles-skill categories; shotguns are not included (CC p.84 names them too — not ruled).
   */
  blocked(host, mod) {
    if (host?.type === 'firearm' && RIFLES.includes(host?.system?.category) && /^stock\b/i.test(baseNameOf(mod))) {
      return `${mod?.name ?? 'A stock'} cannot go on ${host?.name ?? 'a rifle'}: a rifle has its own stock (SR3 p.277).`;
    }
    return null;
  },

  /** Warnings for installing `mod` into `host` — strings, empty when there is nothing to say. Never a refusal. */
  warnings(host, mod) {
    const out = [];
    const kind = ItemMods.hostKind(host);
    const modFor = mod?.system?.modFor ?? '';
    if (modFor && kind && modFor !== kind) out.push(`${mod.name} is a mod for ${modFor === 'armor' ? 'armour' : `a ${modFor}`}, not ${kind === 'armor' ? 'armour' : `a ${kind}`}.`);
    if (!ItemMods.isHost(host)) out.push(`${host?.name ?? 'This item'} does not take mods.`);
    const wants = ItemMods.mountsOf(mod);
    if (wants.length) {
      const used = ItemMods.mountsInUse(ItemMods.installed(host));
      if (wants.every(m => used[m])) {
        const taken = wants.map(m => `the ${m.toLowerCase()} mount already holds ${used[m]}`).join(' and ');
        out.push(`${taken[0].toUpperCase()}${taken.slice(1)} (SR3 p.280: one accessory per mount).`);
      }
    }
    return out;
  },
};
