/**
 * Implanted weapons get a weapon entry — TODO 151.
 *
 * Reported in play: *"Cyber weapons don't show up in the weapons list, and cannot be used in combat."*
 * A cyberweapon is two things in this system. The `cyberware` item (category `Cyberweapons`) carries the
 * Essence and the cost; the attack lives on a separate `melee` item (category `CYB`) in the melee packs,
 * and cyberguns had no weapon at all. Installing the implant gave the Essence loss and nothing to attack
 * with. This module turns an implant into the weapon item it implies, so the weapons list, the attack
 * picker and the melee flow — which already handle `CYB` melee — pick it up with no special case.
 *
 * The weapon is an ordinary, editable item linked back by `flags.The2ndChumming3e.cyberwareId`.
 * Cyberguns take their firing stats from the table below; the implant's own record has only a damage code.
 *
 * Pure: no Foundry globals.
 */

export const FLAG = 'cyberwareId';

/**
 * Cyberguns by the weapon code in their name — Man & Machine p.41 (the taser p.43), as vendored in
 * `rawdata/SRCG-SR3-Gear.json`. The book lists two magazines ("12(m)/12(c)"); the internal one (m) is
 * what every cybergun has, the clip needs the External Clip Port, so the weapon is built with (m).
 */
export const CYBERGUNS = {
  HOPist: { mode: 'SS',    ammunition: '2(m)',  concealability: '12', bookPage: 'mm.41' },
  LPist:  { mode: 'SA',    ammunition: '12(m)', concealability: '10', bookPage: 'mm.41' },
  MaPist: { mode: 'SA/BF', ammunition: '12(m)', concealability: '8',  bookPage: 'mm.41' },
  SMG:    { mode: 'SA/BF', ammunition: '12(m)', concealability: '6',  bookPage: 'mm.41' },
  HPist:  { mode: 'SA',    ammunition: '10(m)', concealability: '8',  bookPage: 'mm.41' },
  ShtG:   { mode: 'SA',    ammunition: '10(m)', concealability: '6',  bookPage: 'mm.41' },
  Tasr:   { mode: 'SA',    ammunition: '2(m)',  concealability: '10', bookPage: 'mm.43' },
};

export const CyberWeapons = {
  /** Is this item an implanted weapon (whether or not a damage code can be read off it)? */
  isCyberweapon(item) {
    return item?.type === 'cyberware' && item?.system?.cyberwareCategory === 'Cyberweapons';
  },

  /** Installed, not in storage — a stored implant is carried, not fitted, so it is no weapon. */
  installed(item) {
    return !item?.flags?.The2ndChumming3e?.stored;
  },

  /**
   * The damage code in an implant's description: "(STR+1)L, -1 Reach" → "(STR+1)L",
   * "10S Stun, 12 uses" → "10S Stun". Null when there is none ("Holds 2 Doses", "As Dart").
   */
  damage(text) {
    const m = /(\(\s*str\s*[-+]?\s*\d*\s*\)|\b\d+)\s*([LMSD])\b(\s+stun)?/i.exec(String(text ?? ''));
    if (!m) return null;
    const power = m[1].replace(/\s+/g, '').replace(/str/i, 'STR');
    return `${power}${m[2].toUpperCase()}${m[3] ? ' Stun' : ''}`;
  },

  /**
   * Reach from "…, -1 Reach". ⚠ The melee model's reach has `min: 0` (reach is a bonus to the wielder),
   * so a negative reach is stored as 0.
   */
  reach(text) {
    const m = /([-+]?\d+)\s*reach/i.exec(String(text ?? ''));
    return m ? Math.max(0, parseInt(m[1], 10)) : 0;
  },

  /** The cybergun code in a name: "CyGun Heavy(HPist)(CYB)" → "HPist". Null for a melee implant. */
  gunCode(name) {
    for (const [, code] of String(name ?? '').matchAll(/\(([A-Za-z]+)\)/g)) {
      if (Object.prototype.hasOwnProperty.call(CYBERGUNS, code)) return code;
    }
    return null;
  },

  /** The implant's name without its "(CYB)" tag, gun code or stray count: "Horn Implants, Retractable". */
  weaponName(name) {
    return String(name ?? '')
      .replace(/\((?:CYB|[A-Za-z]+Pist|SMG|ShtG|Tasr)\)/g, '')
      .replace(/\s+\d+\s*$/, '')
      .replace(/,\s*$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  },

  /**
   * The weapon item an implant implies, ready for `createEmbeddedDocuments`, or null when the implant
   * is not a weapon or has no damage code to attack with (a venom sack, a clip port).
   *
   * @param {{ id?: string, _id?: string, name: string, type: string, system: object }} cyberware
   * @returns {object|null}
   */
  weaponData(cyberware) {
    if (!CyberWeapons.isCyberweapon(cyberware)) return null;
    const sys    = cyberware.system ?? {};
    const damage = CyberWeapons.damage(sys.description);
    if (!damage) return null;
    const name  = CyberWeapons.weaponName(cyberware.name) || cyberware.name;
    const flags = { The2ndChumming3e: { [FLAG]: cyberware.id ?? cyberware._id ?? null } };
    const gun   = CyberWeapons.gunCode(cyberware.name);
    if (gun) {
      const g = CYBERGUNS[gun];
      return { name, type: 'firearm', flags, system: {
        category: gun, damage, mode: g.mode, ammunition: g.ammunition, concealability: g.concealability,
        hands: 0, ready: true, bookPage: sys.bookPage || g.bookPage,
      } };
    }
    return { name, type: 'melee', flags, system: {
      category: 'CYB', skill: 'Unarmed Combat', attribute: 'strength', damage,
      reach: CyberWeapons.reach(sys.description), hands: 0, ready: true, bookPage: sys.bookPage ?? '',
    } };
  },

  /** Is `weapon` the weapon entry for `cyberware` — linked by flag, or (for an older copy) by name? */
  isWeaponFor(weapon, cyberware) {
    if (weapon?.type !== 'melee' && weapon?.type !== 'firearm') return false;
    const linked = weapon.flags?.The2ndChumming3e?.[FLAG];
    const id     = cyberware.id ?? cyberware._id;
    if (linked) return linked === id;
    const want = CyberWeapons.weaponName(cyberware.name).toLowerCase();
    return !!want && CyberWeapons.weaponName(weapon.name).toLowerCase() === want;
  },

  /**
   * Implants on an actor that could be a weapon but have no weapon entry — the ones installed before
   * this fix, or while no GM was connected. The weapons tab offers to add each.
   *
   * @param {object[]} items  the actor's items
   * @returns {object[]} the cyberware items
   */
  missing(items = []) {
    const list    = [...items];
    const weapons = list.filter(i => i.type === 'melee' || i.type === 'firearm');
    return list.filter(i => CyberWeapons.installed(i) && CyberWeapons.weaponData(i)
      && !weapons.some(w => CyberWeapons.isWeaponFor(w, i)));
  },

  /** The weapon entries created for an implant (linked by flag only — never delete by name). */
  linkedTo(cyberwareId, items = []) {
    return [...items].filter(i => (i.type === 'melee' || i.type === 'firearm')
      && cyberwareId && i.flags?.The2ndChumming3e?.[FLAG] === cyberwareId);
  },
};
