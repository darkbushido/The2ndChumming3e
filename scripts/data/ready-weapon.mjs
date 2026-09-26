/**
 * Ready Weapon and Quick Draw · SR3 p.107 (TODO 47). Pure: no Foundry.
 *
 * > "A character may ready a weapon by spending a Simple Action … Readying entails drawing a firearm
 * > from a holster, drawing a throwing or melee weapon from a sheath, picking up any kind of weapon,
 * > nocking an arrow … A weapon must be ready before it can be used."
 * > "A character may attempt to quick-draw a pistol or pistol-sized weapon (Concealability 4 or
 * > greater) and immediately fire it by expending a Quick Draw action … a Reaction (4) Test. Only 1
 * > success is necessary … If the pistol is not held in a proper holster, add a +2 target modifier …
 * > If the test fails, he cannot fire the gun this Combat Phase. Only weapons that can be fired with
 * > a Simple Action can be quick-drawn. Two weapons may be quick-drawn … an additional +2 … to each."
 *
 * ⚠ **Not ready is a legal state to attack from, at a price** — Quick Draw is the book's own answer
 * to "I haven't drawn it". So firing an unready weapon WARNS and offers Ready or Quick Draw; it never
 * refuses (minimal guardrails — the same call TODO 44 made for melee range).
 * ⚠ **Everything already on a sheet reads as ready** (the field's initial is true): a world full of
 * characters who suddenly cannot fight would be a worse bug than the one being fixed.
 * ⚠ **A weapon that ARRIVES on a character arrives put away** (TODO 135/136) — bought, dragged in,
 * imported or made on the sheet. The initial true made every new character start with every gun,
 * blade and grenade in hand. `putAwayOnCreate` decides; the `preCreateItem` hook in sr3e.js applies it.
 */

/** The item types that can be readied. */
export const READY_TYPES = ['firearm', 'melee', 'projectile', 'thrown'];
/** Categories that are part of the body — never holstered, always ready (unarmed, cyber-melee). */
export const ALWAYS_READY_CATEGORIES = ['UNA', 'CYB'];

export const ReadyWeapon = {
  READY_TYPES,

  /** Is this one of the body's own weapons (unarmed, cyber-melee) — never holstered, never equipped? */
  isBodyWeapon(item) {
    return ALWAYS_READY_CATEGORIES.includes(String(item?.system?.category ?? '').toUpperCase());
  },

  /** Is this weapon in hand? Non-weapons, the body's own weapons and anything unset read as ready. */
  isReady(item) {
    if (!READY_TYPES.includes(item?.type)) return true;
    if (ReadyWeapon.isBodyWeapon(item)) return true;
    return item?.system?.ready !== false;
  },

  /** Concealability as a number — the leading figure of a cell like "5" or "4/6"; 0 if none. */
  concealability(sys) {
    const m = /\d+/.exec(String(sys?.concealability ?? ''));
    return m ? Number(m[0]) : 0;
  },

  /** A pistol or pistol-sized FIREARM, Concealability 4 or greater (p.107). */
  canQuickDraw(item) {
    return item?.type === 'firearm' && ReadyWeapon.concealability(item.system) >= 4;
  },

  /** Only weapons fired with a Simple Action — so never full auto (p.107; FA is Complex, p.108). */
  quickDrawModeOk(mode) { return String(mode ?? '').toUpperCase() !== 'FA'; },

  /** The Reaction Test's TN: 4, +2 not in a proper holster, +2 for each of two drawn together. */
  quickDrawTN({ holstered = true, two = false } = {}) {
    return 4 + (holstered ? 0 : 2) + (two ? 2 : 0);
  },

  /** One success clears the weapon; none and it cannot be fired this Combat Phase. */
  quickDrawCleared(successes) { return (Number(successes) || 0) >= 1; },

  /**
   * Does a weapon being created on this actor start put away? True for a character's or NPC's
   * holsterable weapons; never for the body's own (fists, cyber-melee), a weapon that takes no hand
   * (a cybergun — `hands: 0`, set by cyber-weapons.mjs) or a vehicle's mounts.
   */
  putAwayOnCreate(item, parentType) {
    if (!['character', 'npc'].includes(parentType)) return false;
    if (!READY_TYPES.includes(item?.type)) return false;
    if (item?.system?.hands === 0) return false;
    return !ReadyWeapon.isBodyWeapon(item);
  },

  /** Throwing weapons ready in batches: half Quickness, rounded down, per Ready Weapon (p.107). */
  thrownPerReady(quickness) { return Math.max(1, Math.floor((Number(quickness) || 0) / 2)); },
};
