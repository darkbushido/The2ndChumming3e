/**
 * The weapon designer's catalogue rules — which chip a weapon sits under, its one-line description, and why an accessory
 * does not fit · TODO 300. Pure; no Foundry.
 *
 * The maintainer, 2026-11-12 (grill): chips by skill group, hand weapons only (firearms and melee — vehicle weapons stay
 * with vehicles). Accessories that don't fit are hidden behind "show the ones that don't fit", then shown dashed with an
 * amber reason — and can still be added: **warn, never refuse.** The one refusal stays `ItemMods.blocked` (a stock on a
 * rifle or shotgun), which `GearDesign.assemble` leaves out with its warning.
 */
import { ItemMods } from './item-mods.mjs';
import { WeaponAccessories } from './weapon-accessories.mjs';

/** Chips: [id, label, weapon category codes]. Firearms first; anything unlisted lands in 'other' (tasers, flamers…). */
export const GROUPS = [
  ['pistol', 'Pistols', ['HOPist', 'LPist', 'MPist', 'HPist', 'VHP', 'GJPist']],
  ['smg', 'SMGs', ['MaPist', 'SMG']],
  ['rifle', 'Rifles', ['Carb', 'AsRf', 'SptR', 'Snip', 'LCarb']],
  ['shotgun', 'Shotguns', ['ShtG']],
  ['mg', 'Heavy weapons', ['LMG', 'MMG', 'HMG', 'MinG', 'ACan']],
  ['launcher', 'Launchers', ['GrLn', 'MisLn', 'GATGM', 'MrTr', 'BlsTa']],
  ['melee', 'Melee', ['EDG', 'CLB', 'POL', 'WHP', 'UNA', 'CYB']],
  ['other', 'Other', []],
];

/** Category code → what it is, for a card's one line. */
export const CATEGORY_NAMES = {
  HOPist: 'Hold-out pistol', LPist: 'Light pistol', MPist: 'Medium pistol', HPist: 'Heavy pistol', VHP: 'Very heavy pistol',
  GJPist: 'Gyrojet pistol', MaPist: 'Machine pistol', SMG: 'Submachine gun', Carb: 'Carbine', LCarb: 'Light carbine',
  AsRf: 'Assault rifle', SptR: 'Sport rifle', Snip: 'Sniper rifle', ShtG: 'Shotgun', LMG: 'Light machine gun',
  MMG: 'Medium machine gun', HMG: 'Heavy machine gun', MinG: 'Minigun', ACan: 'Assault cannon', GrLn: 'Grenade launcher',
  MisLn: 'Missile launcher', GATGM: 'Guided anti-tank missile', MrTr: 'Mortar', BlsTa: 'Blowgun / dart', Tasr: 'Taser',
  Flthr: 'Flamethrower', Las: 'Laser', SpGn: 'Spear gun', BG: 'Blowgun', VJMP: 'Vehicle jump pistol',
  EDG: 'Edged weapon', CLB: 'Club', POL: 'Pole arm', WHP: 'Whip / flail', UNA: 'Unarmed', CYB: 'Cyber weapon', other: 'Melee weapon',
};

export const WeaponCatalog = {
  GROUPS,

  /** The chip a weapon sits under. Melee's own 'other' category is melee, not the firearm 'other'. */
  groupOf(item) {
    if (item?.type === 'melee') return 'melee';
    const cat = item?.system?.category;
    return (GROUPS.find(([id, , cats]) => id !== 'melee' && cats.includes(cat)) ?? GROUPS.at(-1))[0];
  },

  /** One line: what it is, and how it is held. */
  blurb(item) {
    const s = item?.system ?? {};
    const what = CATEGORY_NAMES[s.category] ?? (item?.type === 'melee' ? 'Melee weapon' : 'Firearm');
    const bits = [what];
    if (item?.type === 'melee' && s.reach != null && s.reach !== '') bits.push(`reach ${s.reach}`);
    if (s.hands) bits.push(Number(s.hands) === 1 ? 'one hand' : `${s.hands} hands`);
    if (s.smartgun) bits.push('smartgun');
    return bits.join(' · ');
  },

  /**
   * Why accessory `mod` does not fit the weapon `host` as built so far (the assembled weapon, mods installed), or null.
   * A reason, never a refusal — the card is still addable.
   */
  misfit(host, mod) {
    if (!host || !mod) return null;
    if (host.type === 'melee') return `${host.name} is a melee weapon — firearm accessories don't mount on it.`;
    const blocked = ItemMods.blocked(host, mod);
    if (blocked) return blocked;
    const warn = [...ItemMods.warnings(host, mod), ...(host.type === 'firearm' ? WeaponAccessories.installWarnings(host, mod) : [])];
    return warn[0] ?? null;
  },
};
