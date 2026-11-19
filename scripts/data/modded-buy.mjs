/**
 * Buy or build a modded item — its whole price before it reaches the sheet · TODO 283. Pure — no Foundry.
 *
 * One quote for every host type (scope ruled 2026-11-07, mods ruling Q21): a gun, armour, cyberware, or a vehicle, and
 * the mods going into it. Every part is priced the way the system already prices it once installed — this module only
 * gathers those prices before anything is created:
 *
 *   basis     where the price comes from
 *   fixed     the mod's own printed cost
 *   level     the picked level's printed cost (`ModRatings.withLevel`, TODO 261)
 *   host      worked out from the host: an internal smartgun (`WeaponAccessories.internalSmartgunCost`, SR3 p.281) or a
 *             vehicle customisation (`VehicleMods.price`, R3R pp.126-135) — only while the mod's own cost is blank
 *   built-in  a device built into a cyberlimb (`CyberCapacity.builtInCost`, SR3 p.303: ×4 with Man & Machine off)
 *   unpriced  no price anywhere — 0¥ and a warning; the GM types one
 *
 * Armour's total is `ArmorMods.cost` of the built armour (Gel Packs multiply the base ×5, CC p.53) and its Availability
 * `ArmorMods.availability` (×2/×4 and +N codes, CC p.52); every other host takes the slowest part's code (SR3 p.272,
 * the cart rule `Cart.slowest`, TODO 285).
 *
 * **Warn, never refuse.** Mount, capacity, `modFor` and vehicle-limit problems are warnings. The one refusal is
 * `ItemMods.blocked` (a stock on a rifle or shotgun): that mod is left out of the build and the total, with a warning.
 */
import { ItemMods } from './item-mods.mjs';
import { ModRatings } from './mod-ratings.mjs';
import { WeaponAccessories } from './weapon-accessories.mjs';
import { ArmorMods } from './armor-mods.mjs';
import { CyberCapacity } from './cyber-capacity.mjs';
import { VehicleMods } from './vehicle-mods.mjs';
import { Purchasing } from './purchasing.mjs';
import { Cart } from './cart.mjs';

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clone = d => structuredClone(d ?? {});

export const ModdedBuy = {
  /** What a host is, for the dialog: 'weapon' | 'armor' | 'cyberware' | 'vehicle' | '' (takes no mods). */
  kindOf(host) {
    if (host?.type === 'vehicle') return 'vehicle';
    if (host?.type === 'firearm' || host?.type === 'melee') return 'weapon';
    if (host?.type === 'armor') return 'armor';
    if (host?.type === 'cyberware') return 'cyberware';
    return '';
  },

  /** Is `mod` the right document type to offer for this host kind? Vehicles take vehiclemods; items take anything else. */
  offerable(kind, mod) {
    if (!kind || !mod) return false;
    if (kind === 'vehicle') return mod.type === 'vehiclemod';
    if (mod.type === 'vehiclemod' || mod.type === 'vehicle') return false;
    // A gun is not a gun mod ("Ingram Smartgun" matched a Smartgun search, live check 2026-11-19); a cyberlimb may hold a cyberweapon.
    if (['firearm', 'melee', 'projectile', 'thrown', 'ammunition'].includes(mod.type) && kind !== 'cyberware') return false;
    const modFor = mod.system?.modFor ?? '';
    const want = kind === 'cyberware' ? 'cyberlimb' : kind;
    return !modFor || modFor === want;
  },

  /** A part's Availability as a cart line's `{ tn, time, unit }` (unparsed → 0, which never wins `slowest`). */
  availOf(code) {
    const a = Purchasing.parseAvailability(code);
    return { tn: num(a.tn), time: num(a.time), unit: a.unit || 'day' };
  },

  /**
   * The quote. `host` is item or vehicle-actor data; `mods` is `[{ data, level, ref }]` (`ref` the mod's uuid, carried to the cart line) (level null for an unrated mod).
   * Options: `mmOn` (Man & Machine on — the built-in price), `newId` (an installed mod's `_id`).
   * Returns `{ kind, lines, total, slowest, warnings, built, mods }`:
   *  - `lines` — `[{ name, cost, basis, availability, part: 'host'|'mod' }]`, the host first;
   *  - `slowest` — `{ tn, time, unit, code, name }`: the Availability the whole lot is sourced against;
   *  - `built` — the host's data with the mods installed (`ItemMods.install`), or for a vehicle its data unchanged;
   *  - `mods` — the priced mod data as it will be installed / embedded (cost filled in), left-out ones dropped.
   */
  quote(host, mods = [], { mmOn = true, newId = () => Math.random().toString(36).slice(2, 18) } = {}) {
    const kind = ModdedBuy.kindOf(host);
    const warnings = [];
    if (!host) return { kind, lines: [], total: 0, slowest: { tn: 0, time: 0, unit: 'day', code: '', name: '' }, warnings: ['No host chosen.'], built: null, mods: [], refs: [] };
    if (!kind) warnings.push(`${host.name} does not take mods.`);
    let built = clone(host);
    const lines = [{ name: host.name, cost: Math.max(0, num(host.system?.cost)), basis: 'fixed', availability: String(host.system?.availability ?? ''), part: 'host' }];
    const priced = [], refs = [];
    const dni = (mods ?? []).some(m => /direct\s*neural|\bdni\b/i.test(m?.data?.name ?? ''));
    for (const entry of mods ?? []) {
      let mod = clone(entry?.data);
      if (!entry?.data) continue;
      let basis = 'fixed';
      if (entry.level != null && ModRatings.levelsOf(mod)) { mod = ModRatings.withLevel(mod, entry.level); basis = 'level'; }
      else if (entry.level != null) mod.system = { ...mod.system, rating: entry.level };
      if (!ModdedBuy.offerable(kind, mod)) warnings.push(`${mod.name} is not a mod for ${kind === 'armor' ? 'armour' : kind || host.name}.`);
      let cost = Math.max(0, num(mod.system?.cost));
      if (kind === 'vehicle') {
        if (!(cost > 0)) {
          const p = VehicleMods.price(mod, built, priced);
          if (p != null) { cost = p; basis = 'host'; } else basis = 'unpriced';
        }
      } else {
        const blocked = ItemMods.blocked(built, mod);
        if (blocked) { warnings.push(`${blocked} Left out.`); continue; }
        warnings.push(...ItemMods.warnings(built, mod));
        if (built.type === 'firearm') {
          warnings.push(...WeaponAccessories.installWarnings(built, mod));
          const smart = WeaponAccessories.internalSmartgunCost(built, mod);
          if (smart != null && !(cost > 0)) { cost = smart; basis = 'host'; }
        }
        if (built.type === 'armor') warnings.push(...ArmorMods.installWarnings(built, mod));
        if (ItemMods.hostKind(built) === 'cyberlimb' && !['cyberware', 'bioware'].includes(mod.type)) {
          cost = CyberCapacity.builtInCost(cost, { mmOn, dni });
          basis = 'built-in';
        }
        if (!(cost > 0)) basis = 'unpriced';
      }
      if (basis === 'unpriced') warnings.push(`${mod.name}: no price — 0¥ until the GM types one.`);
      mod.system = { ...mod.system, cost };
      priced.push(mod);
      refs.push({ itemUuid: entry.ref ?? '', level: entry.level ?? null, cost });
      lines.push({ name: mod.name, cost, basis, availability: String(mod.system?.availability ?? ''), part: 'mod' });
      if (kind !== 'vehicle') built = { ...built, system: { ...built.system, installed: ItemMods.install(ItemMods.installed(built), mod, newId) } };
    }
    if (kind === 'vehicle') warnings.push(...(VehicleMods.effective(built, priced).warnings ?? []));
    if (kind === 'armor') warnings.push(...ArmorMods.problems(built).map(p => (typeof p === 'string' ? p : p?.message ?? String(p))));

    // The total: armour by its own rule (the base ×5 under Gel Packs), everything else the sum of the lines.
    const total = kind === 'armor' ? ArmorMods.cost(built) : lines.reduce((s, l) => s + l.cost, 0);
    let slowest;
    const armourCode = kind === 'armor' ? ArmorMods.availability(built) : null;
    if (armourCode) slowest = { ...ModdedBuy.availOf(armourCode), code: armourCode, name: host.name };
    else {
      const parts = lines.filter(l => kind !== 'armor' || l.part === 'host').map(l => ({ ...ModdedBuy.availOf(l.availability), name: l.name, code: l.availability }));
      const s = Cart.slowest(parts);
      const tnFrom = parts.find(p => p.tn === s.tn && s.tn > 0);
      const timeFrom = parts.find(p => p.time === s.time && p.unit === s.unit && s.time > 0);
      slowest = { ...s, code: s.tn || s.time ? `${s.tn}/${s.time} ${s.unit}${s.time === 1 ? '' : 's'}` : '', name: [...new Set([tnFrom?.name, timeFrom?.name].filter(Boolean))].join(' / ') };
    }
    return { kind, lines, total: Math.round(total), slowest, warnings: [...new Set(warnings)], built, mods: priced, refs };
  },

  /**
   * The quote as one 🛒 cart line (TODO 285's shape) — `modded` carries what 💴 Pay needs to build it again:
   * the host's uuid, each mod's uuid, level and the price quoted (a host-priced mod keeps the price it was sold at).
   */
  cartLine(quote, { hostUuid, legality = '' } = {}) {
    const n = quote.mods.length;
    return {
      name: n ? `${quote.lines[0]?.name ?? 'item'} (+${n} mod${n === 1 ? '' : 's'})` : (quote.lines[0]?.name ?? 'item'),
      cost: quote.total, quantity: 1, index: num(quote.built?.system?.streetIndex) || 1,
      tn: quote.slowest.tn, time: quote.slowest.time, unit: quote.slowest.unit,
      itemUuid: hostUuid ?? '', level: null, gunClass: '', legality,
      modded: { hostUuid: hostUuid ?? '', vehicle: quote.kind === 'vehicle', mods: quote.refs.map(r => ({ ...r })) },
    };
  },
};
