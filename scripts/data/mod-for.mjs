/**
 * Every mod says what it is a mod FOR — `system.modFor` and a name tag · TODO 266.
 *
 * The maintainer, 2026-10-24: a mod is for an armour, a weapon, a cyberlimb or a vehicle, and the item must say so
 * — so that TODO 263's attach logic can WARN when a mod is put on the wrong parent (warn, never refuse). The truth
 * is the field `system.modFor` ('' | 'armor' | 'weapon' | 'cyberlimb' | 'vehicle'); the pack NAME carries it as a
 * trailing tag before any level: "Chemical Seal (Armor)", "Gas Vent IV (Weapon)", "Anti-Theft System (Vehicle)",
 * "Armor: Ballistic (Cyberlimb)"; an owned copy reads "Chemical Seal (Armor) [4]" (`ModRatings.syncName` keeps the
 * tag and swaps only the level).
 *
 * | what | modFor | how it is known |
 * |---|---|---|
 * | every `vehiclemod` | `vehicle` | the type |
 * | cyberware of category `Cyberlimb Mods` | `cyberlimb` | the category |
 * | gear of category `Firearms Accessories` (the core accessories, Cannon Companion customisation, Gyro Mount, Imaging Scope, STS, Gun Cam…) | `weapon` | the category |
 * | an `armor` item named "+…" (the helmet and clothing options of SR3 p.284: Signal Locator, Tracking Signal, Transceiver, vision, Chemseal…) | `armor` | the leading "+" |
 * | Cannon Companion pp.52-53 armour modifications — Chemical Seal, Fire Resistance, Insulation, Nonconductive, Thermal Dampening, Gel Packs | `armor` | gear of category "Stuff With Ratings" named so |
 * | a name that already ends in a tag ("Remote Trigger System (Weapon)") | that tag | the name says so |
 *
 * ⚠ **Anything else is NOT tagged** — a cybereye option, a headware add-on, a Smartlink: whether it is a mod for a
 * weapon or just an implant is the maintainer's call, so it gets no tag until he makes it.
 * ⚠ A value already in `system.modFor` is the truth and is never replaced — a GM who set it keeps it.
 *
 * Pure — no Foundry.
 */
import { ModRatings, MOD_TAGS } from './mod-ratings.mjs';

export const MOD_FOR_CHOICES = ['', ...Object.keys(MOD_TAGS)];

/** Gear that is an armour modification (Cannon Companion pp.52-53), by plain name — in category "Stuff With Ratings". */
export const ARMOR_MOD_GEAR = ['Chemical Seal', 'Fire Resistance', 'Insulation', 'Nonconductive', 'Thermal Dampening', 'Gel Packs (See Rules)'];

export const ModFor = {
  CHOICES: MOD_FOR_CHOICES,
  LABELS: { '': '—', armor: 'Armor', weapon: 'Weapon', cyberlimb: 'Cyberlimb', vehicle: 'Vehicle' },

  /** What the item is a mod for: its own `system.modFor` if set, else what its type, category and name say, else ''. */
  of(item) {
    const s = item?.system ?? {};
    if (s.modFor && MOD_TAGS[s.modFor]) return s.modFor;
    // A name that already ENDS in the tag says it itself — the Cannon Companion's "Remote Trigger System (Weapon)" (a
    // Surveillance gear row for a weapon) and "Laser Designator (Weapon)". Without this it would read as tagged yet not be.
    const said = ModRatings.tagOf(item?.name);
    if (said && ['gear', 'cyberware', 'armor', 'vehiclemod'].includes(item?.type)) return said;
    switch (item?.type) {
      case 'vehiclemod': return 'vehicle';
      case 'cyberware': return s.cyberwareCategory === 'Cyberlimb Mods' ? 'cyberlimb' : '';
      case 'gear':
        if (s.category === 'Firearms Accessories') return 'weapon';
        return s.category === 'Stuff With Ratings' && ARMOR_MOD_GEAR.includes(ModRatings.baseName(item.name)) ? 'armor' : '';
      case 'armor': return /^\s*\+/.test(String(item.name ?? '')) ? 'armor' : '';
      default: return '';
    }
  },

  /**
   * A pack (or world) document made a tagged mod, in place: `system.modFor` filled while blank, the name given its
   * tag (`ModRatings.tagged` — the level, if any, kept after it). Returns true when anything changed. A document
   * that is not a mod is left alone.
   */
  apply(doc) {
    const modFor = ModFor.of(doc);
    if (!modFor) return false;
    let changed = false;
    doc.system ??= {};
    if (!doc.system.modFor) { doc.system.modFor = modFor; changed = true; }
    const name = ModRatings.tagged(doc.name, doc.system.modFor);
    if (name !== doc.name) { doc.name = name; changed = true; }
    return changed;
  },

  /**
   * The 0.7.1 update for an owned copy: everything `ModRatings.migrateDelta` does (the level moved out of the
   * name, a dead compendium link repointed) AND the mod's tag — `system.modFor` filled while blank, the name
   * given its tag with the level kept. Null when there is nothing to do. Idempotent: a tagged name with `modFor` set yields null.
   *
   * ⚠ This RENAMES, and argues for it: only an item that IS a mod by its type, category or the "+" of an armour
   * option, only by appending " (Armor)" / " (Weapon)" / … — the name's own text is never touched, and the
   * level stays after the tag. `system.modFor` is filled only while blank.
   */
  migrateDelta(item) {
    const delta = ModRatings.migrateDelta(item) ?? {};
    const modFor = ModFor.of(item);
    if (modFor) {
      if (!item.system?.modFor) delta['system.modFor'] = modFor;
      const now = delta.name ?? item.name;
      const name = ModRatings.tagged(now, modFor);
      if (name !== item.name) delta.name = name;
      else delete delta.name;
    }
    return Object.keys(delta).length ? delta : null;
  },
};
