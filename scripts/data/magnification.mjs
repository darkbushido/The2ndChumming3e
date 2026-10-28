/**
 * Image magnification moves the target closer · SR3 p.110, p.113 — TODO 276 (and TODO 235's request). Pure — no Foundry.
 *
 * SR3 p.110: magnification systems change a weapon's range category by a number equal to the device's rating — a Rating 2
 * device at Long range shifts two places toward Short (base TN 6 becomes 4), never below Short. p.113: image magnification
 * reduces the weapon's range to its target and the associated base target number.
 *
 * **Which device.** The shooter's best one in use, and only one — they do not stack (the maintainer, 2026-10-24, TODO 235):
 *   - a scope installed in the weapon fired (`magnification` on the gun — the Imaging Scope's level, SR3 p.282);
 *   - what the shooter carries to the actor (`ItemMods.actorTotals`): a worn helmet's Electronic / Optical Magnification
 *     (rating 3, SR3 p.284), cybereyes' Vision Magnification (rated, SR3 p.299).
 * The range dropdown is pre-set to the shifted band and stays editable; the GM window's "Image magnification" row says so.
 */
import { ItemMods } from './item-mods.mjs';

export const Magnification = {
  /**
   * The magnification in use: `{ rating, source }` — the highest of the weapon's own and the shooter's; rating 0 with a
   * null source when there is none. `actorItems` are the shooter's items (worn armour and cyberware pass it up).
   */
  best(weapon, actorItems) {
    const options = [];
    const own = ItemMods.effective(weapon).magnification;
    for (const p of own?.parts ?? []) options.push({ rating: p.value, source: p.source ? `${weapon?.name} (${p.source})` : weapon?.name });
    for (const p of ItemMods.actorTotals(actorItems).magnification?.parts ?? []) {
      options.push({ rating: p.value, source: p.via ? `${p.source} (${p.via})` : p.source });
    }
    const top = options.filter(o => o.rating > 0).sort((a, b) => b.rating - a.rating)[0];
    return top ? { rating: Math.trunc(top.rating), source: top.source } : { rating: 0, source: null };
  },

  /** The band after magnification: `rating` places toward Short, never below it (index 0). An unknown band stays. */
  shift(bandIdx, rating) {
    const i = Number(bandIdx);
    if (!Number.isInteger(i) || i < 0) return bandIdx;
    return Math.max(0, i - Math.max(0, Math.trunc(Number(rating) || 0)));
  },
};
