/**
 * Ammunition stock and reloading — by the gun's loading mechanism · TODO 114, SR3 p.280.
 *
 * Reported in play, 2026-09-13: a *"7-round cy reload ×6"* should read 6 and drop by one per
 * reload. The system counted every stock in rounds, so it wanted 42 and docked 7. The maintainer
 * settled the model the same night: **the book's Ammo Reloading Table** (SR3 p.280):
 *
 * | Method | Action | Result |
 * |---|---|---|
 * | Removable Clip (c) | Simple | remove or insert clip (p.107: remove, then another Simple to insert) |
 * |                    | Complex | insert (Quickness) rounds into clip |
 * | Break Action (b) | Complex | insert 2 rounds |
 * | Internal Magazine (m) | Complex | insert (Quickness) rounds |
 * | Cylinder (cy) | Complex | insert (Quickness) rounds — or use a speed loader |
 * | Belt Feed (belt) | Complex | insert belt — or insert (Quickness × 2) rounds into the belt |
 *
 * So each mechanism is one of two kinds (`MECHANISM_KIND`):
 * - **either** — clip, drum, cylinder, belt: the table gives two methods, so the ITEM says which it
 *   is (`countedIn`). **Reloads** (pre-filled clips, speed loaders, belts) are swapped: one is used,
 *   its rounds go in (never more than the gun holds) and **the rounds left in the old one are
 *   lost** — the maintainer's rule. **Loose rounds** are inserted by hand and top up.
 * - **loose** — internal magazine, break action, single-shot, arrows and bolts: rounds only.
 *
 * Loose rounds **top up** the gun, a Complex Action per (Quickness) rounds (2 for break action),
 * and **nothing is lost** (the maintainer: *"reloading a weapon using a clip should lose the old
 * rounds. anything that's going round by round … shouldn't lose the unused rounds"*). Loading a
 * different type round by round unloads the unfired rounds back into stock.
 *
 * ⚠ The action cost is SHOWN, never enforced — the system does not model the action economy
 * (TODO 48). A player in a firefight can load only part of a magazine; the reload dialog asks how
 * many rounds and says how many actions that takes.
 *
 * Pure: no Foundry globals, so the rules are testable and mutable (`tests/ammo-stock.test.mjs`).
 * Methods live on one object so a mutant can replace one (see `ItemRating`).
 */

/** How each loading mechanism reloads — SR3 p.280. A code not listed is loose rounds. */
export const MECHANISM_KIND = {
  c: 'either', d: 'either', cy: 'either', belt: 'either',
  m: 'loose', b: 'loose', sb: 'loose', internal: 'loose', arrow: 'loose', bolt: 'loose',
};

/** Ammunition types named in the generator's `N-Rnd Clip (Type)` → `SR3E.ammoTypes` keys. */
const TYPE_BY_LABEL = {
  regular: 'regular', explosive: 'explosive', 'ex explosive': 'exExplosive', 'ex-explosive': 'exExplosive',
  ex: 'exExplosive', gel: 'gel', apds: 'apds', flechette: 'flechette', tracer: 'tracer',
  av: 'antiVehicle', 'anti-vehicle': 'antiVehicle', 'anti vehicle': 'antiVehicle',
};

/** Words that make an ammunition name a pre-filled RELOAD rather than a box of rounds. */
const RELOAD_WORDS = /\b(clip|reload|mag|magazine|cylinder|speed-?loader|belt|drum)s?\b/i;

const whole = n => Math.max(0, Math.floor(Number(n) || 0));
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Firearm categories that are not rows of the Weapon Range Table (SR3 p.111), folded into the row
 * `SR3E.weaponRanges` already reads them as ("≈ light, not in book"), so ammunition sharing agrees
 * with range. Everything else is its own class.
 */
const CLASS_ALIASES = { MPist: 'LPist', MaPist: 'LPist', VHP: 'HPist', LCarb: 'AsRf', Carb: 'AsRf' };

/** The classes an ammunition item can be stated for — the Weapon Range Table's rows (SR3 p.111). */
export const GUN_CLASSES = {
  HOPist: 'Hold-out pistol', LPist: 'Light pistol', HPist: 'Heavy pistol', Tasr: 'Taser', SMG: 'SMG',
  ShtG: 'Shotgun (pistol or rifle)', SptR: 'Sporting rifle', Snip: 'Sniper rifle', AsRf: 'Assault rifle',
  LMG: 'Light machine gun', MMG: 'Medium machine gun', HMG: 'Heavy machine gun', ACan: 'Assault cannon',
  MinG: 'Minigun', GrLn: 'Grenade launcher', MisLn: 'Missile launcher',
};

export const AmmoStock = {
  /** 'either' | 'loose' for a loading mechanism code. */
  kind(mech) {
    return MECHANISM_KIND[String(mech ?? 'c').toLowerCase()] ?? 'loose';
  },

  /** 'reloads' or 'rounds' — what this item's stock is counted in. A clip, drum, cylinder or belt
   *  item says for itself (`countedIn`); everything else is loose rounds, whatever it says. */
  unit(sys = {}) {
    return AmmoStock.kind(sys?.loadMechanism) === 'either' && sys?.countedIn === 'reloads' ? 'reloads' : 'rounds';
  },

  /** @returns {{unit:'rounds'|'reloads', field:'rounds'|'reloads', count:number, perReload:number}} */
  stock(sys = {}) {
    if (AmmoStock.unit(sys) === 'reloads') {
      return { unit: 'reloads', field: 'reloads', count: whole(sys.reloads), perReload: whole(sys.roundsPerReload) };
    }
    return { unit: 'rounds', field: 'rounds', count: whole(sys?.rounds), perReload: 0 };
  },

  /**
   * Reload a gun whose magazine holds `magSize`, which has `current.rounds` of `current.type` in it.
   *
   * ⚠ **Swapping loses what was in the old one** — the maintainer's rule and the physical fact.
   * ⚠ **A reload is used up whole**: a 10-round clip in an 8-round gun loads 8 and is gone.
   * ⚠ **Loose rounds TOP UP**; `want` caps how many go in this time (a Complex Action per
   *   Quickness rounds). A different ammunition type cannot share the gun, so the unfired rounds
   *   come out and go back into stock (`returned`) — round by round never loses one.
   * @param {object} sys  the ammunition item's system data
   * @param {number} magSize
   * @param {{rounds?:number, type?:string|null}} [current]  what is in the gun now
   * @param {{want?:number|null}} [opts]  loose rounds to load this time (default: fill it)
   * @returns {{unit, field, loaded, remaining, taken, discarded, returned, short, mismatch, topUp}}
   *   `loaded` — rounds in the gun afterwards; `taken` — out of the stock, in its own unit;
   *   `discarded` — rounds lost with a swapped reload; `returned` — unfired rounds of another type
   *   unloaded back into stock (loose rounds only).
   */
  reloadPlan(sys, magSize, current = {}, opts = {}) {
    const st  = AmmoStock.stock(sys);
    const mag = whole(magSize);
    const inGun = Math.min(mag, whole(current?.rounds));
    if (st.unit === 'reloads') {
      if (st.count <= 0) return { unit: st.unit, field: st.field, loaded: inGun, remaining: 0, taken: 0, discarded: 0, returned: 0, short: inGun < mag, mismatch: false, topUp: false };
      const per    = st.perReload > 0 ? st.perReload : mag;
      const loaded = Math.min(mag, per);
      return { unit: st.unit, field: st.field, loaded, remaining: st.count - 1, taken: 1, discarded: inGun, returned: 0,
               short: loaded < mag, mismatch: st.perReload > 0 && st.perReload !== mag, topUp: false };
    }
    // ⚠ Round by round NEVER loses a round (the maintainer, 2026-09-13: "anything that's going round
    // by round … shouldn't lose the unused rounds"). A different type cannot share the gun, so the
    // unfired ones are UNLOADED back into stock (`returned`) — never discarded.
    const same   = inGun > 0 && (current?.type ?? null) === (sys?.ammoType ?? 'regular');
    const kept   = same ? inGun : 0;
    const room   = mag - kept;
    const want   = opts?.want === null || opts?.want === undefined ? room : Math.min(room, whole(opts.want));
    const taken  = Math.min(want, st.count);
    const loaded = kept + taken;
    return { unit: st.unit, field: st.field, loaded, remaining: st.count - taken, taken, discarded: 0,
             returned: same ? 0 : inGun, short: loaded < mag, mismatch: false, topUp: same };
  },

  /**
   * Can this stock go into a gun loaded by `gunMech`? (blank = the gun does not say: anything).
   *
   * ⚠ **Loose rounds fit every firearm OF THEIR CLASS** (`classFits`, SR3 p.279 — TODO 173). By
   * mechanism, a box of rounds is loaded by hand whatever the gun takes —
   * every row of the Ammo Reloading Table (SR3 p.280) has an "insert rounds" method. Only a pre-filled
   * RELOAD (clip, speed loader, belt) is shaped for one mechanism. Every shipped box of rounds says
   * `c`, so matching on the mechanism alone left 74 shipped guns — revolvers, tube-fed shotguns,
   * break actions — with nothing to load (found checking TODO 23, 2026-09-15).
   * ⚠ Arrows and bolts are the exception both ways: a bow takes only arrows, a crossbow only bolts,
   * and neither fits a gun.
   */
  fits(sys, gunMech, gunClass = null) {
    if (!AmmoStock.classFits(sys, gunClass)) return false;
    const gun  = String(gunMech ?? '').toLowerCase();
    if (!gun) return true;
    const mech = String(sys?.loadMechanism ?? 'c').toLowerCase();
    if (mech === gun) return true;
    const nocked = m => m === 'arrow' || m === 'bolt';
    return AmmoStock.unit(sys) === 'rounds' && !nocked(mech) && !nocked(gun);
  },

  /**
   * The ammunition CLASS a firearm takes · SR3 p.279 — "ammunition is also defined by the class of gun
   * for which it was made (light pistol, assault rifle, MMG). In Shadowrun, each kind of gun can trade
   * ammo with another of its class. … Use the categories shown on the Weapon Range Table, p. 111 …
   * Shotguns, whether pistols or rifles, can share ammo." Null for no category.
   */
  gunClass(category) {
    const c = String(category ?? '').trim();
    if (!c) return null;
    return CLASS_ALIASES[c] ?? c;
  },

  /**
   * Does this stock's class suit a gun of `gunClass`? (TODO 173, the maintainer's choice to enforce it.)
   *
   * ⚠ **A blank class is "not stated yet", and fits anything.** The book prices ammunition by type, not
   * class ("Standard ammo costs 20¥ for 10 rounds"), and no shipped box names one — so the class is a
   * property of the purchase, stated the first time a gun loads from it (`reload` stamps it). After
   * that the box goes only into guns of its class. The GM edits it on the item.
   * ⚠ A gun with no category constrains nothing — fail open, the same way `fits` treats a blank mechanism.
   */
  classFits(sys, gunClass) {
    const mine = String(sys?.gunClass ?? '').trim();
    return !mine || !gunClass || mine === gunClass;
  },

  /**
   * What loading takes, from the Ammo Reloading Table (SR3 p.280) — shown, never enforced.
   * Loose rounds go at the GUN's rate (`gunMech`) — a box marked for clips still loads a break action
   * 2 rounds at a time.
   * @returns {{complex:number, simple:number, text:string}}
   */
  reloadActions(sys, { taken = 0, quickness = 1, gunMech = null } = {}) {
    const own  = String(sys?.loadMechanism ?? 'c').toLowerCase();
    const mech = AmmoStock.unit(sys) === 'rounds' && gunMech ? String(gunMech).toLowerCase() : own;
    if (AmmoStock.unit(sys) === 'reloads') {
      if (mech === 'c' || mech === 'd') {
        return { complex: 0, simple: 2, text: 'Simple Action to remove the old clip, another to insert the new one (SR3 p.107, p.280) — a smartlink ejects it with a Free Action' };
      }
      const what = mech === 'cy' ? 'use a speed loader' : mech === 'belt' ? 'insert a belt' : 'load it';
      return { complex: 1, simple: 0, text: `Complex Action to ${what} (SR3 p.280)` };
    }
    if (mech === 'arrow' || mech === 'bolt') return { complex: 0, simple: 0, text: '' };
    // p.280: a break action takes 2 rounds a Complex Action; a BELT takes (Quickness × 2) — it read
    // Quickness like everything else until the 0.6.1 rules check (TODO 173); the rest take Quickness.
    const q       = Math.max(1, whole(quickness));
    const each    = mech === 'b' ? 2 : mech === 'belt' ? q * 2 : q;
    const complex = taken > 0 ? Math.ceil(taken / each) : 0;
    const how     = mech === 'b' ? '2 rounds each'
                  : mech === 'belt' ? `Quickness ${q} × 2: ${plural(each, 'round')} each`
                  : `Quickness ${each}: ${plural(each, 'round')} each`;
    const into    = mech === 'c' || mech === 'd' ? ' into the clip' : '';
    return { complex, simple: 0, text: `${plural(complex, 'Complex Action')} to insert ${plural(taken, 'round')}${into} (${how}, SR3 p.280)` };
  },

  /** "6 reloads of 7" / "42 rounds" — for the sheet and the reload dialog. */
  describe(sys) {
    const st = AmmoStock.stock(sys);
    if (st.unit === 'reloads') return `${plural(st.count, 'reload')}${st.perReload > 0 ? ` of ${st.perReload}` : ''}`;
    return plural(st.count, 'round');
  },

  /** An ammunition type from a label ("EX Explosive", "AV"), or null if it names none we model. */
  typeFromLabel(label) {
    return TYPE_BY_LABEL[String(label ?? '').trim().toLowerCase()] ?? null;
  },

  /**
   * Read a pre-filled reload out of a name — *"10-Rnd Clip (Explosive)"*, *"7-round cy reload ×6"*,
   * *"12 rnd mag for P7M13"*. Null for anything that is not a reload (a box of 50).
   * @returns {{roundsPerReload:number, reloads:number|null, ammoType:string|null}|null}
   *   `reloads` — from a trailing `×N` (the importer's own suffix), else null.
   */
  fromName(name) {
    const s = String(name ?? '');
    if (!RELOAD_WORDS.test(s)) return null;
    const size = /(\d+)\s*-?\s*(?:rnd|round)s?\b/i.exec(s);
    if (!size) return null;
    const qty  = /[×x]\s*(\d+)\s*$/i.exec(s);
    const type = /\(([^)]+)\)\s*(?:[×x]\s*\d+\s*)?$/i.exec(s);
    return { roundsPerReload: Number(size[1]), reloads: qty ? Number(qty[1]) : null,
             ammoType: AmmoStock.typeFromLabel(type?.[1]) };
  },

  /** Every `size(code)` in capacity strings — `"10(c)/10(c)"`, `"6(cy)"`, `"50(belt)"`. */
  capacities(capacities = []) {
    const out = [];
    for (const cap of capacities) {
      for (const m of String(cap ?? '').matchAll(/(\d+)\s*\(\s*([a-z]+)\s*\)/gi)) out.push({ size: Number(m[1]), mech: m[2].toLowerCase() });
    }
    return out;
  },

  /** The mechanism a reload of `size` rounds fits, from the character's guns. Null unless exactly one. */
  mechanismFor(size, capacities = []) {
    const found = new Set(AmmoStock.capacities(capacities).filter(c => c.size === Number(size)).map(c => c.mech));
    return found.size === 1 ? [...found][0] : null;
  },
};
