/**
 * NPCs start with loaded guns and spare ammunition · TODO 270.
 *
 * The maintainer, 2026-10-25: *"if track ammo is on, NPCs should start with loaded weapons and 3-6 reloads"*.
 * Mr. Johnson's Little Black Book stat blocks carry guns and no ammunition, so with `trackAmmo` on every NPC met
 * in play stood there with an empty gun (`rollWeapon` bails on an empty magazine).
 *
 * Applied once, when a stat block becomes a world actor (`createActor` in `sr3e.js`):
 *   - every firearm that is empty is loaded to its magazine with regular rounds;
 *   - each gets a stock of **3–6 reloads** — pre-filled reloads for a clip, drum, cylinder or belt, the same
 *     number of magazines in loose rounds for an internal magazine or break action — stamped with the gun's
 *     class (`AmmoStock.classForType`, as a box bought for a gun is) so it loads only where it belongs.
 *
 * ⚠ **An actor that already carries ammunition is left alone** — its sheet says what it has (the example
 *   characters, an imported runner). Grenade launchers are skipped: a launcher loads a grenade ITEM
 *   (`MiniGrenade.isLauncher`, TODO 163), not regular rounds. A gun with no magazine size is skipped.
 * ⚠ Off with `trackAmmo` — nothing is counted, so there is nothing to give.
 *
 * Pure — no Foundry. Magazine size and mechanism come from `AmmoStock.capacities`, the parser the importer uses.
 */
import { AmmoStock, MECHANISM_KIND } from './ammo-stock.mjs';
import { MiniGrenade } from './mini-grenade.mjs';

/** What a pre-filled reload of each mechanism is called (`AmmoStock.fromName` reads these back). */
const RELOAD_NOUN = { c: 'Clip', d: 'Drum', cy: 'Speed Loader', belt: 'Belt' };

export const NpcAmmo = {
  MIN_RELOADS: 3,
  MAX_RELOADS: 6,

  /** A number of reloads, MIN_RELOADS..MAX_RELOADS inclusive. */
  rollReloads(rng = Math.random) {
    const span = NpcAmmo.MAX_RELOADS - NpcAmmo.MIN_RELOADS + 1;
    return NpcAmmo.MIN_RELOADS + Math.min(span - 1, Math.floor(rng() * span));
  },

  /** `{ size, mech }` of a firearm's first `N(code)` capacity, or null. "40(c)/Belt" → 40, 'c'. */
  magazine(system) {
    const cap = AmmoStock.capacities([system?.ammunition])[0];
    if (!cap || cap.size <= 0 || !(cap.mech in MECHANISM_KIND)) return null;
    return cap;
  },

  /**
   * What to load and give. Nothing is written here.
   * @param {Array<{_id, name, type, system}>} items  the actor's items
   * @param {{trackAmmo: boolean, rng?: () => number}} opts
   * @returns {{ guns: Array<{_id, 'system.loadedAmmoType', 'system.loadedRounds'}>, ammo: Array<object> }}
   *   `guns` — item updates; `ammo` — new ammunition item data (one per gun).
   */
  plan(items, { trackAmmo, rng = Math.random } = {}) {
    const none = { guns: [], ammo: [] };
    if (!trackAmmo) return none;
    const list = [...(items ?? [])];
    if (list.some(i => i?.type === 'ammunition')) return none;
    const guns = [];
    const ammo = [];
    for (const gun of list) {
      if (gun?.type !== 'firearm') continue;
      const sys = gun.system ?? {};
      if (Number(sys.loadedRounds) > 0 || MiniGrenade.isLauncher(sys)) continue;
      const mag = NpcAmmo.magazine(sys);
      if (!mag) continue;
      guns.push({ _id: gun._id, 'system.loadedAmmoType': 'regular', 'system.loadedRounds': mag.size });
      const reloads = NpcAmmo.rollReloads(rng);
      const gunClass = AmmoStock.classForType(sys, 'regular') ?? '';
      const base = { type: 'ammunition', system: { ammoType: 'regular', loadMechanism: mag.mech, gunClass } };
      if (AmmoStock.kind(mag.mech) === 'either') {
        Object.assign(base.system, { countedIn: 'reloads', reloads, roundsPerReload: mag.size, rounds: 0 });
        base.name = `${gun.name} — ${mag.size}-Rnd ${RELOAD_NOUN[mag.mech] ?? 'Clip'} (Regular)`;
      } else {
        Object.assign(base.system, { countedIn: 'rounds', rounds: reloads * mag.size });
        base.name = `${gun.name} — Rounds (Regular)`;
      }
      ammo.push(base);
    }
    return { guns, ammo };
  },
};
