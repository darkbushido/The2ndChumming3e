/**
 * Armour with mods installed · TODO 276 (the armour slice; TODO 263's rules). Pure — no Foundry.
 *
 * The mods live in the armour's `system.installed` (scripts/data/item-mods.mjs). What they change is rarely Ballistic or
 * Impact — none of the Cannon Companion's six does (CC pp.52-53). They change:
 *   - **the numbers on the item**: Concealability, weight, cost, Availability, Street Index — each mod's own figures
 *     (the level table already holds Insulation's −1 Concealability per 2 points and +.5 kg per point, CC p.53);
 *   - **what it protects against**: Power − per point vs contact chemicals, fire, cold, electricity (`resist*` targets,
 *     the GM applies it — announced on the soak card), and Thermal Dampening (max +8, CC p.53);
 *   - **Gel Packs** (CC p.53-54): the armour becomes HARDENED at its own ratings (unarmoured clothing: 1/1),
 *     Concealability halved (round down), weight +25%, and for the Combat Pool only its ratings count 50% higher
 *     (round down). +2 to the wearer's Knockdown TN (SR3 p.124 test).
 *
 * **Hardened armour** (CC p.51; the `hardened` field — the Cannon Companion's military armour — or gel packs): an attack
 * whose Power before any burst/full-auto bonus does not exceed the rating is deflected; above it, it reduces the Power
 * like any armour. Against APDS / anti-vehicle rounds it counts at half, rounded down. The soak card ANNOUNCES the
 * deflection; the GM applies wounds (`VehicleArmor.deflects` is the same comparison).
 *
 * **The maintainer's rulings, 2026-10-27:**
 *   - any armour may take mods; WARN (never refuse) when the host is not on CC p.52's list — SecureTech, a helmet, a
 *     shield, forearm guards — or an SR3 p.284 helmet option goes on something that is not a helmet or security armour;
 *   - Gel Packs cost ×5 the armour's OWN price in all (a 900¥ jacket → 4,500¥), Availability TN ×2 and time ×4;
 *   - Gel Packs do NOT count toward the mod-point caps (only rated mods do);
 *   - a rated mod's Availability (+1 / +12 hrs) applies ONCE per mod, not per point;
 *   - "nothing layers with hardened" and the gel restrictions are warnings.
 *
 * Caps (CC p.52): one mod's points ≤ the higher of Ballistic and Impact; all mods' points ≤ Ballistic + Impact;
 * unarmoured clothing 2 and 2. Thermal Dampening never above +8 (CC p.53).
 */
import { ItemMods, TARGETS } from './item-mods.mjs';

/** The Power-reduction targets, in the order the soak card lists them. */
export const RESISTS = ['resistChemical', 'resistFire', 'resistCold', 'resistElectric'];

/** Thermal Dampening's ceiling · CC p.53. */
export const THERMAL_MAX = 8;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const name = item => String(item?.name ?? '');
const round2 = n => Math.round(n * 100) / 100;

/** Armour CC p.52 does not list as taking modifications (the maintainer: warn, never refuse). */
const NOT_ON_CC_LIST = [
  { re: /^\s*secure\b/i,          why: 'SecureTech armour clothing takes no modifications (CC p.52)' },
  { re: /\bhelmet\b/i,            why: 'CC p.52 does not list helmets among the armour that takes modifications' },
  { re: /\bshield\b/i,            why: 'CC p.52 does not list shields among the armour that takes modifications' },
  { re: /\bforearm\s+guards?\b/i, why: 'CC p.52 does not list forearm guards among the armour that takes modifications' },
];

export const ArmorMods = {
  RESISTS, THERMAL_MAX,

  /** Does this mod carry gel packs? (A target, so a GM can mark a home-made one.) */
  isGelPack(mod) {
    return ItemMods.modifiersOf(mod).some(m => m.target === 'gelPacks' && m.value > 0);
  },

  /** Is it one of the CC pp.52-53 armour modifications — rated points or gel packs? */
  isArmorModification(mod) {
    return ItemMods.modifiersOf(mod).some(m => TARGETS[m.target]?.capped || m.target === 'gelPacks');
  },

  /** An SR3 p.284 helmet / security-armour option (Signal Locator, vision, Transceiver…): an armour item that is a mod. */
  isHelmetOption(mod) {
    return mod?.type === 'armor' && (mod?.system?.modFor === 'armor' || /^\s*\+/.test(name(mod)));
  },

  gelPacked(item) {
    return ItemMods.installed(item).some(m => ArmorMods.isGelPack(m));
  },

  /** Hardened — the armour itself (CC p.51 military armour) or by gel packs. */
  hardened(item) {
    return item?.system?.hardened === true || ArmorMods.gelPacked(item);
  },

  /** Its own Ballistic and Impact, unarmoured clothing with gel packs counting as 1/1 (CC p.53). */
  ratings(item) {
    const b = Math.max(0, num(item?.system?.ballistic));
    const i = Math.max(0, num(item?.system?.impact));
    if (b === 0 && i === 0 && ArmorMods.gelPacked(item)) return { ballistic: 1, impact: 1 };
    return { ballistic: b, impact: i };
  },

  /** The ratings the Combat Pool penalty reads: gel packs count 50% higher, rounded down (CC p.54). */
  poolRatings(item) {
    const r = ArmorMods.ratings(item);
    if (!ArmorMods.gelPacked(item)) return r;
    return { ballistic: Math.floor(r.ballistic * 1.5), impact: Math.floor(r.impact * 1.5) };
  },

  /** The non-gel mods — whose own figures add to the armour's. */
  _plainMods(item) {
    return ItemMods.installed(item).filter(m => !ArmorMods.isGelPack(m));
  },

  /**
   * Concealability with mods: `{ value, base }`, `value` null when the armour has no number ("-", blank). Each mod's own
   * signed figure adds (Insulation's −1 per 2 points is in its level); gel packs halve the result, rounded down.
   */
  concealability(item) {
    const raw = String(item?.system?.concealability ?? '').trim();
    const base = /^-?\d+$/.test(raw) ? Number(raw) : null;
    if (base === null) return { value: null, base: null };
    const delta = ArmorMods._plainMods(item).reduce((s, m) => s + (/^[+-]?\d+$/.test(String(m?.system?.concealability ?? '').trim()) ? Number(m.system.concealability) : 0), 0);
    let value = base + delta;
    if (ArmorMods.gelPacked(item)) value = Math.floor(value / 2);
    return { value, base };
  },

  /** Weight with mods (kg): its own, each mod's own, and gel packs +25% of the armour's own. */
  weight(item) {
    const base = Math.max(0, num(item?.system?.weight));
    const mods = ArmorMods._plainMods(item).reduce((s, m) => s + Math.max(0, num(m?.system?.weight)), 0);
    return round2(base + mods + (ArmorMods.gelPacked(item) ? base * 0.25 : 0));
  },

  /** Cost with mods (¥): gel packs make the armour's own price ×5 in all (the ruling); each other mod adds its own cost. */
  cost(item) {
    const base = Math.max(0, num(item?.system?.cost));
    const mods = ArmorMods._plainMods(item).reduce((s, m) => s + Math.max(0, num(m?.system?.cost)), 0);
    return (ArmorMods.gelPacked(item) ? base * 5 : base) + mods;
  },

  /**
   * Availability with mods, as printed ("3/36hrs" → "5/96hrs"). A "×2/×4" mod (Gel Packs, Thermal Dampening) multiplies
   * the armour's TN and time; a "+1/+12hrs" mod adds once (the ruling). Multipliers first. A time in another unit than
   * the added hours stays, and the hours are appended ("4/4days +12hrs"). `null` when the armour's own does not parse.
   */
  availability(item) {
    const m = /^\s*(\d+)\s*\/\s*([\d.]+)\s*([a-z]*)\s*$/i.exec(String(item?.system?.availability ?? ''));
    if (!m) return null;
    let tn = Number(m[1]), time = Number(m[2]);
    const unit = m[3];
    let extraHrs = 0;
    const mods = ItemMods.installed(item).map(x => String(x?.system?.availability ?? '').replace(/\s+/g, ''));
    for (const a of mods) {
      const mult = /^x(\d+)\/x(\d+)$/i.exec(a);
      if (mult) { tn *= Number(mult[1]); time *= Number(mult[2]); }
    }
    for (const a of mods) {
      const add = /^\+(\d+)\/\+([\d.]+)(hrs?|hours?)?$/i.exec(a);
      if (!add) continue;
      tn += Number(add[1]);
      if (/^hrs?$|^hours?$/i.test(unit)) time += Number(add[2]); else extraHrs += Number(add[2]);
    }
    return `${tn}/${round2(time)}${unit}${extraHrs ? ` +${extraHrs}hrs` : ''}`;
  },

  /** Street Index with mods: each mod's "+.25" / "+2" adds once. `null` when the armour's own is not a number. */
  streetIndex(item) {
    const base = Number(String(item?.system?.streetIndex ?? '').trim());
    if (!Number.isFinite(base) || String(item?.system?.streetIndex ?? '').trim() === '') return null;
    const add = ItemMods.installed(item).reduce((s, x) => {
      const r = /^\+\s*([\d.]+)$/.exec(String(x?.system?.streetIndex ?? '').trim());
      return s + (r ? Number(r[1]) : 0);
    }, 0);
    return round2(base + add);
  },

  /* ── Caps and warnings ───────────────────────────────────────────────────────── */

  /** The caps for this armour (CC p.52): `{ single, total }` — unarmoured clothing 2 and 2. Gel packs do not change them. */
  caps(item) {
    const b = Math.max(0, num(item?.system?.ballistic));
    const i = Math.max(0, num(item?.system?.impact));
    if (b === 0 && i === 0) return { single: 2, total: 2 };
    return { single: Math.max(b, i), total: b + i };
  },

  /** The rated points on the armour: `{ perMod: [{ name, points }], total }` — gel packs never count (the ruling). */
  points(item) {
    const perMod = ItemMods.installed(item)
      .map(m => ({ name: m?.name ?? '?', points: ItemMods.modifiersOf(m).filter(x => TARGETS[x.target]?.capped).reduce((s, x) => s + Math.max(0, x.value), 0) }))
      .filter(x => x.points > 0);
    return { perMod, total: perMod.reduce((s, x) => s + x.points, 0) };
  },

  /** Everything wrong with the armour as it stands — warnings, never refusals. */
  problems(item) {
    const out = [];
    const mods = ItemMods.installed(item);
    const n = name(item);
    if (mods.some(m => ArmorMods.isArmorModification(m))) {
      for (const h of NOT_ON_CC_LIST) if (h.re.test(n)) out.push(`${n}: ${h.why}.`);
    }
    const helmetish = /\bhelmet\b/i.test(n) || /\b(security|military)\b/i.test(n);
    for (const m of mods.filter(x => ArmorMods.isHelmetOption(x))) {
      if (!helmetish) out.push(`${m.name}: SR3 p.284 prints it as an option for security armour and helmets, not ${n}.`);
    }
    const caps = ArmorMods.caps(item);
    const pts = ArmorMods.points(item);
    for (const p of pts.perMod) {
      if (p.points > caps.single) out.push(`${p.name} is ${p.points} points; one mod may be at most ${caps.single} on ${n} (CC p.52).`);
    }
    if (pts.total > caps.total) out.push(`${n} carries ${pts.total} mod points; at most ${caps.total} (CC p.52).`);
    const thermal = ItemMods.value(item, 'thermalMasking');
    if (thermal > THERMAL_MAX) out.push(`Thermal Dampening ${thermal} — it never goes above +${THERMAL_MAX} (CC p.53).`);
    const gels = mods.filter(m => ArmorMods.isGelPack(m)).length;
    if (gels > 1) out.push(`${n} has ${gels} sets of gel packs; only one set per item (CC p.53).`);
    if (gels) {
      if (/form-?fitting/i.test(n)) out.push(`Gel packs are not allowed on form-fitting armour (CC p.53).`);
      if (/\bdiving\b/i.test(n))    out.push(`Gel packs are not allowed on diving armour (CC p.53).`);
      if (item?.system?.hardened === true) out.push(`Gel packs are not allowed on hardened armour (CC p.53).`);
    }
    return out;
  },

  /** The warnings installing `mod` into `armor` adds — what would newly be wrong. */
  installWarnings(armor, mod) {
    if (armor?.type !== 'armor') return [];
    const before = new Set(ArmorMods.problems(armor));
    const after = { ...armor, system: { ...(armor.system ?? {}), installed: [...ItemMods.installed(armor), mod] } };
    return ArmorMods.problems(after).filter(w => !before.has(w));
  },

  /* ── What the wearer gets ────────────────────────────────────────────────────── */

  /** A body piece, not a helmet or shield (those add in full and are not layering, SR3 p.285). */
  _isBody(item, isAccessory) {
    return !(isAccessory ?? (p => /\b(helmet|shield)\b/i.test(name(p))))(item);
  },

  /**
   * Warnings about what is worn together: a hardened (or gel-packed) body piece layered with another body piece —
   * "no other armour may be worn with hardened armour" (CC p.51), "a gel-packed item cannot be layered" (CC p.54).
   * A helmet or shield is not layering (SR3 p.285), so a hardened helmet on hardened armour is fine.
   */
  wornWarnings(worn, isAccessory) {
    const body = (worn ?? []).filter(i => ArmorMods._isBody(i, isAccessory));
    if (body.length < 2) return [];
    return body.filter(i => ArmorMods.hardened(i)).map(i =>
      `${name(i)} is ${ArmorMods.gelPacked(i) ? 'gel-packed' : 'hardened'} — nothing layers with it (CC p.51, p.54), yet ${body.filter(x => x !== i).map(name).join(', ')} is worn too.`);
  },

  /** +2 to the Knockdown TN when any worn armour has gel packs (CC p.54). */
  knockdownTN(worn) {
    return (worn ?? []).some(i => ArmorMods.gelPacked(i)) ? 2 : 0;
  },

  /**
   * What the worn armour protects against: `[{ target, label, value, sources }]` — the Power reductions, and Thermal
   * Dampening (capped at +8). Cumulative with the armour itself (CC p.52); the GM applies them.
   */
  protections(worn) {
    const out = [];
    for (const target of [...RESISTS, 'thermalMasking']) {
      const sources = [];
      let value = 0;
      for (const i of worn ?? []) {
        const v = ItemMods.value(i, target);
        if (v > 0) { value += v; sources.push(name(i)); }
      }
      if (target === 'thermalMasking') value = Math.min(THERMAL_MAX, value);
      if (value > 0) out.push({ target, label: TARGETS[target].label, short: TARGETS[target].short, value, sources });
    }
    return out;
  },

  /**
   * The hardened rating against an attack, or null when nothing hardened is worn: the worn hardened pieces layered (the
   * caller's `layer`, SR3 p.285) on the rating the attack uses, halved (round down) against APDS / anti-vehicle (CC p.51).
   */
  hardenedRating(worn, { useImpact = false, armorPiercing = false, layer } = {}) {
    const pieces = (worn ?? []).filter(i => ArmorMods.hardened(i));
    if (!pieces.length) return null;
    const key = useImpact ? 'impact' : 'ballistic';
    const r = layer ? layer(pieces)[key] : pieces.reduce((s, i) => Math.max(s, ArmorMods.ratings(i)[key]), 0);
    return armorPiercing ? Math.floor(r / 2) : r;
  },
};
