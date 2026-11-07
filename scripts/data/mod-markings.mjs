/**
 * The markings that say what kind of mod an item is (TODOs 256 and 259, mods ruling Q22 — the maintainer chose "only the
 * cheap, high-value parts": the sheet chips, the description line, the `mount` field and the two internal smartgun items;
 * no renames, no pack folders). Read from the item's own data, so owned copies show them at once — nothing to migrate.
 *
 *  · 🦾 — cyberware built into a cyberlimb (`ModFor.of` → 'cyberlimb': its `modFor`, its "(Cyberlimb)" tag, or the
 *    `Cyberlimb Mods` category). The 82 pack entries that share a name with the ordinary implant are told apart by it.
 *  · a mount chip — a weapon mod's mount ("Top/Under", "Barrel"), as `ItemMods.mountsOf` reads it.
 *  · the description line — a fixed first line on the item sheet, above the description (not written into it).
 */
import { ItemMods } from './item-mods.mjs';
import { ModFor } from './mod-for.mjs';

export const LIMB_LINE = 'Built into a cyberlimb: it takes the limb\'s capacity, not Essence, while the limb has room (SR3 p.303; M&M pp.35–36).';
export const MOUNT_LINE = 'A weapon mod: it takes the gun\'s {mount} mount — one accessory per mount (SR3 p.280).';
export const INTERNAL_LINE = 'A weapon mod built into the gun: it takes no mount (SR3 p.280).';

export const ModMarkings = {
  LIMB_LINE, MOUNT_LINE, INTERNAL_LINE,

  /** Built into a cyberlimb? Cyberware only. */
  isLimbMod(item) {
    return item?.type === 'cyberware' && ModFor.of(item) === 'cyberlimb';
  },

  /** A weapon mod's mount, "Top/Under" — '' for anything else or a mod that takes none. */
  mountOf(item) {
    if (item?.type !== 'gear' || ModFor.of(item) !== 'weapon') return '';
    const held = ItemMods.mountsOf(item).join('/');
    if (held) return held;
    // "Internal" holds no mount (SR3 p.280's three are Top, Under and Barrel), but it is still worth saying.
    const raw = item.system?.mount || /Mount:\s*(?:<\/strong>)?\s*([^<\n]+)/i.exec(String(item.system?.description ?? ''))?.[1] || '';
    return /^\s*internal\s*$/i.test(raw) ? 'Internal' : '';
  },

  /** The chip after a row's name: `{ text, tip }`, or null. */
  chip(item) {
    if (ModMarkings.isLimbMod(item)) return { text: '🦾', tip: LIMB_LINE };
    const mount = ModMarkings.mountOf(item);
    return mount ? { text: mount, tip: ModMarkings.mountLine(mount) } : null;
  },

  /** The line the item sheet shows first: '' for an item that is neither. */
  line(item) {
    if (ModMarkings.isLimbMod(item)) return LIMB_LINE;
    const mount = ModMarkings.mountOf(item);
    return mount ? ModMarkings.mountLine(mount) : '';
  },

  mountLine(mount) {
    return mount === 'Internal' ? INTERNAL_LINE : MOUNT_LINE.replace('{mount}', mount);
  },
};
