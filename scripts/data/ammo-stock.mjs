/**
 * Ammunition stock — counted in loose ROUNDS or in RELOADS · TODO 114.
 *
 * Reported in play, 2026-09-13: a player with a *"7-round cy reload ×6"* expected a quantity of
 * **6** that drops by one each time the revolver is reloaded. The system counted the stockpile
 * only in rounds, so it wanted 42 and docked 7 per reload — and an ammunition item imported from
 * the generator (*"10-Rnd Clip (Explosive)"*, Amount 2) arrived with **0 rounds** and type
 * Regular, so it could not be loaded at all.
 *
 * Two units, chosen per item (`system.countedIn`):
 * - **rounds** — a box, a belt, loose cartridges. Reloading takes the magazine's worth of rounds.
 * - **reloads** — pre-filled clips, speed-loaders, cylinders. Reloading uses ONE, and loads its
 *   `roundsPerReload` (0 = "fills the gun", i.e. the gun's magazine size), never more than the
 *   magazine holds.
 *
 * Pure: no Foundry globals, so the rules are testable and mutable (`tests/ammo-stock.test.mjs`).
 * Methods live on one object so a mutant can replace one (see `ItemRating`).
 */

/** Ammunition types named in the generator's `N-Rnd Clip (Type)` → `SR3E.ammoTypes` keys. */
const TYPE_BY_LABEL = {
  regular: 'regular', explosive: 'explosive', 'ex explosive': 'exExplosive', 'ex-explosive': 'exExplosive',
  ex: 'exExplosive', gel: 'gel', apds: 'apds', flechette: 'flechette', tracer: 'tracer',
  av: 'antiVehicle', 'anti-vehicle': 'antiVehicle', 'anti vehicle': 'antiVehicle',
};

/** Words that make an ammunition name a pre-filled RELOAD rather than a box of rounds. */
const RELOAD_WORDS = /\b(clip|reload|mag|magazine|cylinder|speed-?loader)s?\b/i;

const whole = n => Math.max(0, Math.floor(Number(n) || 0));

export const AmmoStock = {
  /**
   * How an ammunition item is counted.
   * @returns {{unit:'rounds'|'reloads', field:'rounds'|'reloads', count:number, perReload:number}}
   */
  stock(sys = {}) {
    if (sys?.countedIn === 'reloads') {
      return { unit: 'reloads', field: 'reloads', count: whole(sys.reloads), perReload: whole(sys.roundsPerReload) };
    }
    return { unit: 'rounds', field: 'rounds', count: whole(sys?.rounds), perReload: 0 };
  },

  /**
   * Reload a gun whose magazine holds `magSize` from this stock.
   *
   * ⚠ **A reload is used up whole.** A 10-round clip in an 8-round gun loads 8 and the clip is
   * gone — the stock is counted in reloads, and there is no partial one to keep.
   * @returns {{unit:string, field:string, loaded:number, remaining:number, short:boolean, mismatch:boolean}}
   *   `short` — the magazine is not full; `mismatch` — the reload's size is not the magazine's.
   */
  reloadPlan(sys, magSize) {
    const st  = AmmoStock.stock(sys);
    const mag = whole(magSize);
    if (st.count <= 0) return { unit: st.unit, field: st.field, loaded: 0, remaining: 0, short: mag > 0, mismatch: false };
    if (st.unit === 'reloads') {
      const per    = st.perReload > 0 ? st.perReload : mag;
      const loaded = Math.min(mag, per);
      return { unit: st.unit, field: st.field, loaded, remaining: st.count - 1,
               short: loaded < mag, mismatch: st.perReload > 0 && st.perReload !== mag };
    }
    const loaded = Math.min(mag, st.count);
    return { unit: st.unit, field: st.field, loaded, remaining: st.count - loaded, short: loaded < mag, mismatch: false };
  },

  /** "6 reloads" / "42 rounds" — for the sheet and the reload dialog. */
  describe(sys) {
    const st = AmmoStock.stock(sys);
    if (st.unit === 'reloads') {
      const per = st.perReload > 0 ? ` of ${st.perReload}` : '';
      return `${st.count} reload${st.count === 1 ? '' : 's'}${per}`;
    }
    return `${st.count} round${st.count === 1 ? '' : 's'}`;
  },

  /** An ammunition type from a label ("EX Explosive", "AV"), or null if it names none we model. */
  typeFromLabel(label) {
    return TYPE_BY_LABEL[String(label ?? '').trim().toLowerCase()] ?? null;
  },

  /**
   * Read a pre-filled reload out of a name — *"10-Rnd Clip (Explosive)"*, *"7-round cy reload ×6"*,
   * *"12 rnd mag for P7M13"*. Null for anything that is not a reload (a box of 50, a belt).
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

  /**
   * The loading mechanism a reload of `size` rounds fits, from the capacity strings of the guns
   * the character owns (`"10(c)"`, `"10(c)/10(c)"`, `"6(cy)"`). Null unless exactly one
   * mechanism matches — two guns taking different 10-round reloads is the GM's call.
   */
  mechanismFor(size, capacities = []) {
    const found = new Set();
    for (const cap of capacities) {
      for (const m of String(cap ?? '').matchAll(/(\d+)\s*\(\s*([a-z]+)\s*\)/gi)) {
        if (Number(m[1]) === Number(size)) found.add(m[2].toLowerCase());
      }
    }
    return found.size === 1 ? [...found][0] : null;
  },
};
