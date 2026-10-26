/**
 * Buying ammunition FOR a gun — which compendium boxes fit it · SR3 pp.279-281 (requested 2026-10-25).
 *
 * The maintainer: *"its difficult to buy the right ammo, there should be a way on the guns description to buy its
 * specific ammo"* — and the box bought that way is stamped with the gun's class ("yes stamp it"). The SR3 ammunition
 * pack alone is 197 documents, one per clip size and type ("15-Rnd Clip (APDS)", "15-Rnd Clip (Gel)" …), so the
 * search for a Fichetti's ammo drowned in everyone else's.
 *
 * The rule is exactly the one `SR3EItem.reload()` loads by — never a second opinion:
 *   - **the loading mechanism and class** (`AmmoStock.fits`): a clip only its own mechanism, loose rounds any gun of
 *     their class (SR3 p.279, "each kind of gun can trade ammo with another of its class"); a box stated for another
 *     class is not offered;
 *   - **the ammunition types the gun takes** (`accepts` — `SR3EItem.weaponAcceptsAmmoType`): a flechette-coded gun
 *     takes only its own rounds (p.116), a shotgun-rules weapon normal or shot (p.277);
 *   - **a launcher fires only mini-grenades** (p.279) — `MiniGrenade.isMiniGrenade`;
 *   - and, shopping only: **a reload (clip, drum, belt) must be the gun's magazine size** — a 15-round clip for a
 *     15(c) Ares Predator. Reloading would swap in a wrong-size clip; buying one for this gun makes no sense.
 *
 * Pure — no Foundry. `accepts` is passed in because its rule lives on SR3EItem.
 */
import { AmmoStock } from './ammo-stock.mjs';
import { MiniGrenade } from './mini-grenade.mjs';

/**
 * Ammunition made for ONE kind of weapon, which the packs file as ordinary loose rounds with no class (the upstream
 * data has none), so `AmmoStock.fits` would offer Assault Cannon rounds to an Ares Predator. Shopping only: a box whose
 * NAME matches `box` is listed for a gun whose name or category matches `gun`, and for no other. Each is a book fact —
 * the rounds are printed for that weapon (SR3 p.279-281; Cannon Companion pp.37-42): an assault cannon's shells, a
 * dart or Narcoject pistol's darts, a taser's darts, gyrojet rockets, the speargun's spears, a blowgun's needles, net
 * and bola rounds for net guns, the Barret 121's own rounds, Big D for the Big D, flares and Flash-Paks for a flare
 * launcher, and mortar rounds and mines for no carried gun at all.
 */
export const WEAPON_SPECIFIC = [
  { box: /assault cannon/i, gun: /assault cannon|\bAsCn\b|panther/i },
  { box: /^dart,|narcoject/i, gun: /dart|narcoject/i },
  { box: /taser/i, gun: /taser/i },
  { box: /gyrojet/i, gun: /gyrojet/i },
  { box: /speargun|spears/i, gun: /spear/i },
  { box: /blowgun/i, gun: /blowgun/i },
  { box: /^net rnds|^bola rnds/i, gun: /net|bola/i },
  { box: /barret/i, gun: /barret/i },
  { box: /^big d\b/i, gun: /big d\b/i },
  { box: /flash-pak|micro flares|^flare rnds/i, gun: /flare/i },
  { box: /mortar|round b\b|\bmine\b/i, gun: /mortar/i },
];

/** The ammunition fields the 🛒 search index must carry for this filter. */
export const AMMO_INDEX_FIELDS = ['system.ammoType', 'system.loadMechanism', 'system.countedIn', 'system.rounds',
  'system.reloads', 'system.roundsPerReload', 'system.gunClass'];

export const AmmoShop = {
  AMMO_INDEX_FIELDS,

  /**
   * What a gun takes, in the terms the filter needs. `weapon` is `{ system, mech, magSize, launcher, accepts }` —
   * the Foundry side reads `mech` / `magSize` off the item (`_weaponLoadMechanism`, `_weaponMagazineSize`).
   */
  criteria({ system = {}, name = '', mech = '', magSize = 0, launcher = false, accepts = () => true, firearm = true } = {}) {
    return {
      gunName: `${name} ${system?.category ?? ''}`,
      mech: String(mech ?? '').toLowerCase(),
      magSize: Number(magSize) || 0,
      classes: firearm ? AmmoStock.gunClasses(system) : null,
      gunClass: firearm ? (AmmoStock.gunClass(system?.category) ?? '') : '',
      launcher: !!launcher,
      accepts,
    };
  },

  /** Does this ammunition (its `system`, and its `name` for `WEAPON_SPECIFIC`) fit the gun? */
  fits(sys = {}, crit, name = '') {
    if (!crit) return true;
    const special = WEAPON_SPECIFIC.find(w => w.box.test(String(name)));
    if (special && !special.gun.test(crit.gunName ?? '')) return false;
    if (!AmmoStock.fits(sys, crit.mech, crit.classes)) return false;
    if (!crit.accepts(sys.ammoType || 'regular')) return false;
    if (crit.launcher && !MiniGrenade.isMiniGrenade(sys)) return false;
    if (AmmoStock.unit(sys) === 'reloads' && crit.magSize > 0 && Number(sys.roundsPerReload) !== crit.magSize) return false;
    return true;
  },

  /** The class to stamp on a box bought for this gun — only while the box states none (fill blanks). */
  stamp(boxSystem = {}, crit) {
    if (!crit?.gunClass || String(boxSystem?.gunClass ?? '').trim()) return null;
    return crit.gunClass;
  },

  /** One line for the dialog: what this gun takes. */
  describe(name, crit) {
    const parts = [];
    if (crit?.magSize) parts.push(`${crit.magSize}-round ${crit.mech ? `(${crit.mech})` : 'magazine'}`);
    if (crit?.gunClass) parts.push(`${crit.gunClass} class`);
    if (crit?.launcher) parts.push('mini-grenades only');
    return `🔫 Ammunition for ${name}${parts.length ? ` — ${parts.join(', ')}` : ''} (SR3 p.279)`;
  },
};
