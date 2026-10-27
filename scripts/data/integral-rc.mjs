/**
 * The bracketed Recoil Compensation — "when all integral accessories are used" · SR3 p.276. Pure — no Foundry.
 *
 * > "Recoil Compensation (RC) lists the available points of recoil compensation when firing the weapon. Numbers
 * > in parentheses refer to full recoil compensation that only applies when all integral accessories are used
 * > (folding or detachable stocks, and so forth)."                                              — SR3 p.276
 *
 * Firearms table pp.278-279: the Fichetti 500a, Ceska Black Scorpion, AK-97 SMG/Carbine, HK227-S and Uzi III print
 * "(1)" (a stock); the HK227 and Ingram Smartgun "2(3)"; the Ultimax MMG and RPK HMG "(6)" (the tripod).
 *
 * ⚠ **The bracketed figure REPLACES the plain one — it is the weapon's TOTAL "full recoil compensation", not an
 * addition to it.** "2(3)" is 2 from the Rating 2 gas vent and 3 in all (the stock's 1 on top, p.277: "a retractable
 * stock that provides 1 point of recoil compensation"); "(1)" and "(6)" have no plain figure ("--"), so 0 and 1 / 6.
 * Adding 3 to 2 would double count the vent.
 *
 *   `system.recoilMod`          the figure outside the brackets — the weapon as carried (blank/0 for "--")
 *   `system.recoilModIntegral`  the bracketed figure, null when the row prints none
 *   `system.integralInUse`      the shooter's last answer in the fire dialog (the stock folded out, the tripod set up)
 *
 * The book says nothing about WHEN a stock or tripod counts as in use, so the dialog asks, and defaults to what the
 * shooter answered last time for that gun (unticked on a new one: the plain figure is the safe, lower one).
 */
import { ItemMods } from './item-mods.mjs';

/*
 * **Installed mods add on top** (TODO 276): a gas vent or shock pads installed in the gun (`system.installed`) add their RC
 * to whichever figure is in use — `modsComp`. `totalComp` is what the shot gets; `weaponComp` stays the gun's own
 * printed figure, so a number typed over the total is written back to the base WITHOUT the mods (`baseFor`).
 */
export const IntegralRC = {
  /** Does this weapon print a bracketed figure? Null / blank / junk: no. */
  has(system) {
    const v = system?.recoilModIntegral;
    return v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  },

  /** The weapon's own Recoil Compensation for this shot: the bracketed total when its integral accessories are in use. */
  weaponComp(system, inUse = false) {
    if (inUse && IntegralRC.has(system)) return Math.max(0, Math.trunc(Number(system.recoilModIntegral)));
    return Math.max(0, Math.trunc(Number(system?.recoilMod) || 0));
  },

  /** RC from the mods installed in the weapon (Gas Vent II +2, shock pads +1). */
  modsComp(system) {
    return Math.max(0, ItemMods.value({ system }, 'rc'));
  },

  /** The weapon's whole Recoil Compensation for this shot: its own figure plus its installed mods'. */
  totalComp(system, inUse = false) {
    return IntegralRC.weaponComp(system, inUse) + IntegralRC.modsComp(system);
  },

  /** The base figure to store when the shooter typed `typed` over the total — the mods' part taken back off. */
  baseFor(system, typed) {
    return Math.max(0, Math.trunc(Number(typed) || 0) - IntegralRC.modsComp(system));
  },

  /** Is the tick pre-set? Only a weapon with a bracketed figure can be ticked; the gun remembers its last answer. */
  defaultInUse(system) {
    return IntegralRC.has(system) && system?.integralInUse === true;
  },
};
