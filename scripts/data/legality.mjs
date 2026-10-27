/**
 * Legality — what an item's Legality Code says about buying it · *SR3 p.273* (2026-10-25). Pure — no Foundry.
 *
 * > "The price listed for all items in SR3 are the legal retail prices. That means that you can get items for the
 * > price listed, but must prove you are legally allowed to own them. For legal items, this isn't a problem —
 * > characters can probably pick them up at the corner Stuffer Shack. For restricted items — gear with a Legality
 * > Code — a permit is necessary to get the item legally." — p.273, Making Legal Purchases
 * > "If the restriction level is followed by a "P," then characters may be able to get permits" — p.273
 *
 * Reported 2026-10-25: 🛒 Buy gear sent every purchase through a contact. The maintainer: *"buying legal gear should
 * have the option of using a contact for a discount but it shouldnt force it."*
 *
 * ⚠ **Warn, never refuse.** `status` colours the dialog and picks its default; it never takes an option away. A
 * restricted item can still be bought "at the store" (the GM may rule the character has the permit, or forged one).
 *
 * The code lives in three fields: `system.legality` (gear, weapons, armour, ammunition, bioware, vehicle mods,
 * medical, drugs), `system.legalCode` (cyberware, from upstream) and `system.legalityCode` (Matrix Defragged decks).
 */
import { LEGALITY } from './legality-table.mjs';
import { LEGALITY_BY_NAME } from './legality-names.mjs';

export const PAGE = 'SR3 p.273';

/** `Compendium.The2ndChumming3e.<pack>.Item.<id>` — the system's own packs only. */
const SOURCE = /^Compendium\.The2ndChumming3e\.([^.]+)\.Item\.([A-Za-z0-9_-]+)$/;

/** The item types whose model declares `system.legality` (cyberware has `legalCode`, Defragged decks `legalityCode`). */
export const LEGALITY_TYPES = ['gear', 'firearm', 'melee', 'projectile', 'thrown', 'ammunition', 'armor', 'bioware',
  'vehiclemod', 'medical', 'drug'];

const text = v => String(v ?? '').trim().replace(/[–—]/g, '-');

export const Legality = {
  PAGE,

  /** The item's Legality Code as printed, or ''. */
  of(item) {
    const s = item?.system ?? {};
    return text(s.legality || s.legalCode || s.legalityCode);
  },

  /**
   * What a code means for buying:
   * | status | when | store default |
   * |---|---|---|
   * | `legal` | "Legal" | yes |
   * | `restricted` | a code ("6P-V", "2-K", "(8-Force)P-T") | no — a permit, `permit` says whether one exists |
   * | `deferred` | "As Weapon", "As compound" … — the book defers to another item | no |
   * | `unknown` | blank, or anything else | no |
   * @returns {{status: 'legal'|'restricted'|'deferred'|'unknown', code: string, permit: boolean, defersTo: string}}
   */
  classify(code) {
    const c = text(code);
    if (/^legal$/i.test(c)) return { status: 'legal', code: 'Legal', permit: false, defersTo: '' };
    const as = /^as\s+(.+)$/i.exec(c);
    if (as) return { status: 'deferred', code: c, permit: false, defersTo: as[1] };
    // "6P-V", "2-K", "8P-W", "(8-Force)P-T", "(-1)P-L": a restriction level, an optional P, a category.
    const m = /^(\([^)]*\)|-?\d+)\s*(P?)\s*-\s*([A-Z]{1,3})/i.exec(c);
    if (m && c) return { status: 'restricted', code: c, permit: m[2].toUpperCase() === 'P', defersTo: '' };
    return { status: 'unknown', code: c, permit: false, defersTo: '' };
  },

  /**
   * The 0.9.0 fill for an owned copy: its compendium document's code (`LEGALITY`), into `system.legality` while blank.
   * ⚠ Fill blanks, never overwrite — a code someone typed stays. Null when there is nothing to fill.
   *
   * ⚠ **Name fallback (2026-10-26):** the hand-kept packs' ids (`sr3e-firearm-0072`) are not valid Foundry document
   * ids, so a copy dropped from them carries a null `compendiumSource` and the link finds nothing. With no usable
   * source the code is read by exact item type + name (`LEGALITY_BY_NAME`; a name two documents give different codes
   * is not in it). A source that names one of our documents decides alone — name matching never second-guesses it.
   */
  fillDelta(item, table = LEGALITY, names = LEGALITY_BY_NAME) {
    if (!LEGALITY_TYPES.includes(item?.type) || String(item.system?.legality ?? '').trim()) return null;
    const m = SOURCE.exec(String(item?._stats?.compendiumSource ?? ''));
    const code = m ? table[m[1]]?.[m[2]]?.[0] : names[`${item.type}|${item.name}`];
    return code ? { 'system.legality': code } : null;
  },

  /** Does the dialog open on "at the store"? Only for an item the book calls Legal. */
  storeByDefault(code) {
    return Legality.classify(code).status === 'legal';
  },

  /** One line for the dialog and the card: what the code means for this purchase. */
  note(code) {
    const k = Legality.classify(code);
    switch (k.status) {
      case 'legal': return `Legal — sold openly at list price (${PAGE}).`;
      case 'restricted': return `Legality ${k.code} — restricted: buying it legally needs a permit${k.permit ? ' (one is available)' : ' (none is issued)'} (${PAGE}). The GM decides.`;
      case 'deferred': return `Legality "${k.code}" — as the ${k.defersTo.toLowerCase()} it is for (${PAGE}). The GM decides.`;
      default: return `No legality recorded for this item — the GM decides (${PAGE}).`;
    }
  },
};
