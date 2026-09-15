/**
 * Hands — what a character holds, and how many hands it takes · SR3 p.112 (TODO 49). Pure.
 *
 * ⚠ **SR3 does not model hands — it models a WHITELIST.** p.112, Using a Second Firearm:
 * > "Characters can use two pistol- or SMG-class weapons, one in each hand. Doing so, however,
 * > imposes a +2 target modifier to each weapon and negates any target number reductions from
 * > smartlinks, smart goggles or laser sights. Additionally, any uncompensated recoil modifiers
 * > applicable to one weapon also apply to the other weapon."
 * So a troll with two free hands still may not dual-wield assault rifles: the second-firearm rule is
 * gated on the weapon CLASS (`DUAL_WIELD_CATEGORIES`), not merely on free hands.
 *
 * ⚠ **No table says which weapons are two-handed.** The maintainer's decision (2026-09-15): a `hands`
 * field on every weapon, filled from its category (`defaultHands`) and editable per weapon for the
 * edges (a one-handed crossbow). A blank field reads as the category's default.
 * ⚠ **"In hand" is `ready`** (TODO 47) — a readied weapon is one being held. Over-filling the hands is
 * REPORTED, never refused.
 * ⚠ **The hand count is data, not the constant 2** — the request anticipates cyberware adding limbs
 * (`system.extraHands`, the GM's to set).
 */

/** Pistol- and SMG-class firearms — the only ones p.112 lets a character hold one in each hand. */
export const DUAL_WIELD_CATEGORIES = ['HOPist', 'LPist', 'MPist', 'HPist', 'VHP', 'MaPist', 'SMG'];
/** Other one-handed firearm categories (a taser, a gel-jet pistol) — one hand, but not p.112's class. */
const ONE_HAND_FIREARMS = [...DUAL_WIELD_CATEGORIES, 'Tasr', 'GJPist'];
const TWO_HAND_PROJECTILES = ['Bow', 'LCB', 'MCB', 'HCB'];
const TWO_HAND_MELEE = ['POL'];
const BODY = ['UNA', 'CYB'];

export const Hands = {
  DUAL_WIELD_CATEGORIES,

  /** The category default: 0 for the body's own weapons, else 1 or 2. */
  defaultHands(type, category) {
    const c = String(category ?? '');
    if (BODY.includes(c.toUpperCase())) return 0;
    if (type === 'firearm')    return ONE_HAND_FIREARMS.includes(c) ? 1 : 2;
    if (type === 'projectile') return TWO_HAND_PROJECTILES.includes(c) ? 2 : 1;
    if (type === 'melee')      return TWO_HAND_MELEE.includes(c) ? 2 : 1;
    if (type === 'thrown')     return 1;
    return 0;
  },

  /** This weapon's hands: the stored field when set (0-2), else the category default. */
  handsFor(item) {
    const v = item?.system?.hands;
    if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) return Math.max(0, Math.min(2, Number(v)));
    return Hands.defaultHands(item?.type, item?.system?.category);
  },

  /** How many hands the character has — 2 plus any the GM grants (extra cyber-limbs). */
  handCount(sys) { return 2 + Math.max(0, Math.trunc(Number(sys?.extraHands) || 0)); },

  /** What is in hand: readied weapons that take at least one hand. `isReady` is ReadyWeapon's. */
  inHand(items, isReady) {
    return [...(items ?? [])].filter(i => isReady(i) && Hands.handsFor(i) > 0 && ['firearm', 'melee', 'projectile', 'thrown'].includes(i.type))
      .map(i => ({ id: i.id, name: i.name, hands: Hands.handsFor(i) }));
  },

  /** Hands in use, and whether that is more than the character has. */
  usage(items, sys, isReady) {
    const held = Hands.inHand(items, isReady);
    const used = held.reduce((a, h) => a + h.hands, 0);
    const have = Hands.handCount(sys);
    return { held, used, have, over: used > have };
  },

  /** A pistol- or SMG-class gun — the only kind p.112 allows in each hand. */
  isDualWieldClass(item) {
    return item?.type === 'firearm' && DUAL_WIELD_CATEGORIES.includes(String(item?.system?.category ?? ''));
  },

  /**
   * Is this shot one of two guns held one in each hand? — `weapon` is p.112's class, and another
   * ready gun of that class is in hand too. The GM confirms it in the TN window (the Gear group).
   */
  secondGun(items, weapon, isReady) {
    if (!Hands.isDualWieldClass(weapon)) return null;
    return [...(items ?? [])].find(i => i.id !== weapon.id && Hands.isDualWieldClass(i) && isReady(i)) ?? null;
  },
};
