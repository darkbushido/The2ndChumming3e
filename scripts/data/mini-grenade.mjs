/**
 * Mini-grenades — the rounds a grenade launcher fires · SR3 p.283, p.118 · TODO 163. **Pure.**
 *
 * > "Mini-grenades: Mini-grenades are bullet-like projectiles designed for grenade launchers." — SR3 p.283
 *
 * The Explosives Table prints the Mini-grenade row as a MODIFIER on the grenade it is made from:
 *
 *   Grenade Type   Conceal Damage      Blast       Weight Avail.          Cost St.Index Legal
 *   Mini-grenade   8       by grenade  by grenade  .1     +2/by grenade   x2   +1       by grenade
 *
 * So a Defensive mini-grenade keeps the defensive −1/.5m. Before this, a launcher had no grenade to
 * read: its Damage Code was "(Grenade)", typed at the roll, and its blast always fell off at −1/m.
 * Now each mini-grenade is an `ammunition` item carrying its grenade's Damage Code and `blast`, and the
 * launcher fires the one it was loaded with (`SR3EItem#_loadedGrenade`).
 *
 * > "…the minigrenades fired from standard grenade launchers do not actually arm until they have
 * > traveled about that distance [five meters]. They do not detonate if they hit anything before
 * > traveling five meters" — SR3 p.118. Stated in the roll dialog, never enforced.
 */
import { AmmoStock } from './ammo-stock.mjs';

export const MiniGrenade = {
  /** The Weapon Range Table class of a grenade launcher (SR3 p.111) — and of the rounds it takes. */
  LAUNCHER_CLASS: 'GrLn',

  /** Metres a mini-grenade travels before it arms · SR3 p.118. */
  ARMS_AT: 5,

  /** Is this weapon a grenade launcher? `system` is the weapon's. */
  isLauncher(system) {
    return AmmoStock.gunClass(system?.category) === MiniGrenade.LAUNCHER_CLASS;
  },

  /**
   * Is this ammunition a mini-grenade? Only a round stated for the launcher class counts — a launcher
   * fires "only mini-grenades" (SR3 p.279), so a box with no class is not offered to it (and so never
   * gets stamped as launcher ammunition by a first load).
   */
  isMiniGrenade(ammoSystem) {
    return String(ammoSystem?.gunClass ?? '').trim() === MiniGrenade.LAUNCHER_CLASS;
  },

  /**
   * The system a launched or thrown grenade's Damage Code, blast and area are read from: a launcher's
   * loaded mini-grenade, else the weapon itself (a thrown grenade, or a launcher with no load on record).
   * Reading the weapon for a launcher was the bug — every launched grenade fell off at −1/m.
   * @param {object} weaponSystem  the weapon's `system`
   * @param {object|null} loadedSystem  the loaded ammunition item's `system`, if any
   */
  round(weaponSystem, loadedSystem) {
    return MiniGrenade.isLauncher(weaponSystem) && loadedSystem ? loadedSystem : weaponSystem;
  },

  /** Would a mini-grenade fired `metres` away arm? Unknown distance → assume it does. */
  arms(metres) {
    return metres == null || !Number.isFinite(Number(metres)) || Number(metres) >= MiniGrenade.ARMS_AT;
  },

  /**
   * Availability "+2/by grenade": the rating rises by 2, the time is the grenade's. "4/4 days" →
   * "6/4 days". A string that doesn't start with a number is returned as it is.
   */
  availability(text) {
    const m = /^\s*(\d+)(.*)$/.exec(String(text ?? ''));
    return m ? `${Number(m[1]) + 2}${m[2]}` : String(text ?? '');
  },

  /**
   * The mini-grenade made from a grenade row, with the p.283 arithmetic: Conceal 8, Weight .1,
   * Availability +2, Cost ×2, Street Index +1; Damage, Blast and Legality as the grenade.
   * @param {{conceal?, damage, blast, weight?, avail, cost, index, legality}} g  the grenade's printed row
   */
  fromGrenade(g) {
    return {
      conceal:  '8',
      damage:   g.damage,
      blast:    g.blast,
      weight:   0.1,
      avail:    MiniGrenade.availability(g.avail),
      cost:     (Number(g.cost) || 0) * 2,
      index:    String((Number(g.index) || 0) + 1),
      legality: g.legality,
    };
  },
};
