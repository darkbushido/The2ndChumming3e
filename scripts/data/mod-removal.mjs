/**
 * Taking a permanent mod off — a gunsmith's test · TODO 277. Pure — no Foundry.
 *
 * SR3 p.281 says a gas vent cannot be removed once installed; the Cannon Companion's customisation rules (CC pp.79-81) let
 * a gunsmith work on a gun with a Build/Repair test, base time divided by the successes, labour by the hour. The
 * maintainer's ruling, 2026-10-27: *"removable at a gunsmith's test, time and labour. players can be the gunsmith. gas
 * vent is destroyed if the test is successful. barrel is destroyed on failure and gun needs to be repaired."*
 *
 *   - the test: the weapon's Build/Repair skill against the customisation's install TN (Gas Vent: Weapon B/R (5), base
 *     24 hours, CC p.81) — every number editable in the dialog;
 *   - **success** (1+): the vent comes off DESTROYED (not back into the inventory); time = base ÷ successes;
 *   - **failure** (0): the BARREL is destroyed, and the vent with it (the maintainer, 2026-10-27: "the vent should be
 *     destroyed with the barrel") — the gun needs repair (`needsRepair`);
 *   - **repair**: the cost of a barrel extension (the maintainer, 2026-10-27 — CC's design options, pp.74-78). Until CC's
 *     gunsmithing is built (TODO 279) that is taken as **50% of the gun's own cost** (the maintainer, 2026-10-27, an interim
 *     ruling) — pre-filled in the ✔ Repaired dialog, editable.
 *   - labour: a gunsmith contact charges 100 / 50 / 25¥ an hour at Level 1 / 2 / 3 (CC p.79); a player character doing the
 *     work charges nothing. The card states the cost; nothing is deducted (offer, never apply).
 */
import { ModRatings } from './mod-ratings.mjs';

/** Mods that cannot simply be taken off: `kind|name` → the test. */
export const PERMANENT = {
  'weapon|Gas Vent': { tn: 5, baseHours: 24, page: 'SR3 p.281; CC p.81' },
};

/**
 * What a destroyed part costs to put right, as a share of the gun's own cost. The barrel: *"it would cost the same as a
 * barrel extension"*, and *"for now assume its 50% the cost of the gun"* (the maintainer, 2026-10-27) — until CC's
 * gunsmithing (TODO 279) prices a barrel extension properly.
 */
export const REPAIR = {
  barrel: { share: 0.5, as: 'a barrel extension (for now 50% of the gun)', page: 'CC pp.74-78; interim ruling, TODO 279' },
};

/** A gunsmith contact's rate, ¥ an hour, by contact Level · CC p.79. */
export const CONTACT_RATES = { 1: 100, 2: 50, 3: 25 };

/** The Build/Repair skill for a firearm category (the B/R skills of SR3ESkills). */
const BR_BY_CATEGORY = [
  [/^(HOPist|LPist|MPist|HPist|VHP|Tasr)$/, 'Pistols B/R'],
  [/^(MaPist|SMG)$/,                        'Submachine Guns B/R'],
  [/^(AsRf|Carb|LCarb)$/,                   'Assault Rifles B/R'],
  [/^(SptR|Snip)$/,                         'Rifles B/R'],
  [/^ShtG$/,                                'Shotguns B/R'],
  [/^(LMG|MMG|HMG|MinG|ACan)$/,             'Heavy Weapons B/R'],
  [/^GrLn$/,                                'Launch Weapons B/R'],
];

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const ModRemoval = {
  PERMANENT, CONTACT_RATES, REPAIR,

  /** The removal test for this mod, or null when it comes off freely (⏏). */
  rule(mod) {
    return PERMANENT[ModRatings.keyOf(mod)] ?? null;
  },

  /** The B/R skill a gunsmith uses on this gun, or '' when the category names none. */
  skillFor(gun) {
    const cat = String(gun?.system?.category ?? '');
    return BR_BY_CATEGORY.find(([re]) => re.test(cat))?.[1] ?? '';
  },

  /** Hours the work takes: base ÷ successes, to a tenth (CC p.79); the base when it failed. */
  hours(baseHours, successes) {
    const s = Math.max(0, Math.trunc(num(successes)));
    return s > 0 ? Math.round((num(baseHours) / s) * 10) / 10 : num(baseHours);
  },

  /** Labour in ¥ — rate × hours, rounded. */
  labour(ratePerHour, hours) {
    return Math.round(Math.max(0, num(ratePerHour)) * Math.max(0, num(hours)));
  },

  /**
   * What the test did: `{ removed, barrelDestroyed, hours }`. One success is enough. Either way the vent is gone — on a
   * failure it goes with the barrel (the maintainer, 2026-10-27).
   */
  outcome(successes, baseHours) {
    const ok = Math.trunc(num(successes)) > 0;
    return { removed: true, barrelDestroyed: !ok, hours: ModRemoval.hours(baseHours, successes) };
  },

  /** The repair cost of a part of `gun` (`'barrel'`): its share of the gun's own cost, rounded; null for an unknown part. */
  repairCost(gun, part = 'barrel') {
    const share = REPAIR[part]?.share;
    if (!Number.isFinite(share)) return null;
    return Math.round(Math.max(0, num(gun?.system?.cost)) * share);
  },

  /** The repair record a failed removal leaves on the gun, or null. */
  needsRepair(gun) {
    const r = gun?.flags?.The2ndChumming3e?.needsRepair;
    return r && typeof r === 'object' ? r : null;
  },
};
