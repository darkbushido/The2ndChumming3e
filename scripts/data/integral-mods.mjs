/**
 * A firearm's printed accessories as installed mods — TODO 276 (step b). Pure: no Foundry globals.
 *
 * A gun's free-text `accessories` ("Laser Sight, Gas Vent II(2RC)", "Fold Stock(1RC)") names what it was built with. The
 * maintainer's rulings of 2026-10-27:
 * - **Shown, not counted.** Each becomes an installed mod flagged `integral`: it takes its weapon mount (so a scope on a top
 *   that already holds an integral laser sight is warned) and shows in the 🔧 list, but its change (RC, smartgun, laser sight)
 *   is NOT added again — the printed RC, bracketed RC and the smartgun / laser-sight flags already include it
 *   (`ItemMods.effective` / `pods` skip it). Taken out, it is an ordinary mod again, and the gun's printed figures still
 *   include it: the GM edits them.
 * - **The packs and owned copies.** `tools/fill-integral-mods.mjs` fills `packs-src`; the 0.9.0 migration fills owned copies.
 *   FILL BLANKS ONLY: a gun that already holds an integral mod is left alone. Idempotent.
 * - **The text stays untouched** — notes like "BF = Complex Action" live there, and nothing is overwritten.
 * - **Clear matches only.** A token converts only when it IS one accessory (`KINDS`, anchored). "Either: Folding Bipod(2RC) or
 *   Shoulder Strap", "RC(6)[Gas Vent III", "Low-Light or Thermo Mag:(3) Scope", integral grenade launchers, designators and
 *   the heavy barrel stay text.
 *
 * Built from this table, not copied from the gear packs, so the packs tool and the (synchronous) migration make the same
 * entry. Names, mounts and pages are the gear packs' (SR3 p.282, CC p.35, M&M p.32); `modifiers` come from `MOD_EFFECTS`.
 */
import { MOD_EFFECTS } from './mod-effects.mjs';
import { WeaponAccessories } from './weapon-accessories.mjs';

export const FLAG = 'integral';

const GEAR = 'Compendium.The2ndChumming3e';
const RC = String.raw`(?:\s*\(\s*(\d+)\s*RC\s*\)?)?`;   // "(1RC)", "(2RC)", the CC slip "(1RC" without its paren
const re = body => new RegExp(`^(?:${body})${RC}$`, 'i');

/**
 * What a token can be. `key`: the `MOD_EFFECTS` key (the mod's change, shown — never counted). `rating`: from the token's
 * "(NRC)" / level, else `defaultRating`. `mount`: the gear pack's "Mount:" — an INTERNAL smartgun takes none (SR3 p.281).
 */
export const KINDS = [
  { re: /^(?:[\w-]+\s+)?laser(?:\s+sight)?$/i, name: 'Laser Sight (Weapon)', key: 'gear|Laser Sight', mount: 'Top/Under', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.dc95a8d435cb7c70` },
  { re: /^smartlink(?:\s*-?\s*1|\s+i)?$/i, name: 'Smartlink level I (Weapon)', key: 'gear|Smartlink level I', mount: '', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.976939c2631d86f8`, internal: true },
  { re: /^smartlink\s*-?\s*(?:2|ii)$/i, name: 'Smartlink level II (Weapon)', key: 'gear|Smartlink level II', mount: '', bookPage: 'mm.32',
    source: `${GEAR}.sr3e-mm-gear.Item.aabe6213f32bee71`, internal: true },
  { re: re(String.raw`gas\s+vent\s+(I{1,3}|IV|[1-4])`), name: 'Gas Vent (Weapon)', key: 'gear|Gas Vent', mount: 'Barrel', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.a4b62ae9cd2730a3`, level: true },
  { re: re(String.raw`(fold(?:ing)?\.?|detach(?:able)?\.?|retr(?:actable)?\.?|tele(?:scoping)?\.?|collapsible)\s+stock`), name: null, key: 'gear|Stock (Rigid',
    mount: '', bookPage: 'cc.35', defaultRating: 1, stock: true },
  { re: re(String.raw`silencer`), name: 'Silencer (Weapon)', key: null, mount: 'Barrel', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.510317e11b10f1f7` },
  { re: re(String.raw`(?:sound\s+)?suppress[eo]r`), name: 'Sound Suppresser (Weapon)', key: null, mount: 'Barrel', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.88b73237ab2bcc2d` },
  { re: /^(?:optical\s+)?imaging\s+scope\s*(?:\(\s*([1-3])\s*\)|([1-3]))$/i, name: 'Imaging Scope (Weapon)', key: 'gear|Imaging Scope', mount: 'Top', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.fb469e2e8f655dea`, level: true },
  { re: /^low[\s-]?light(?:\s+mag:?\s*\(\s*([1-3])\s*\))?\s+scope$/i, name: 'Imaging Scope, Low-Light (Weapon)', key: null, mount: 'Top', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.aa2218e2d2539062`, level: true },
  { re: re(String.raw`(?:fold(?:ing)?\s+)?bipod`), name: 'Bipod (Weapon)', key: 'gear|Bipod', mount: 'Under', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.6d0d7ade36b511d2`, defaultRating: 2 },
  { re: re(String.raw`(?:fold(?:ing|-out)?\s+)?tripod`), name: 'Tripod (Weapon)', key: 'gear|Tripod', mount: 'Under', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.56d0a68ea32d5456`, defaultRating: 6 },
  { re: re(String.raw`shock\s+pads?`), name: 'Shock Pads (RC (Weapon)', key: 'gear|Shock Pads (RC', mount: '', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.7ddcaa51f31d608d`, defaultRating: 1 },
  { re: re(String.raw`fore\s*grip`), name: 'Fore Grip (Weapon)', key: 'gear|Fore Grip', mount: 'Under', bookPage: 'cc.35',
    source: `${GEAR}.sr3e-cc-gear.Item.1ac15a5654fdee30`, defaultRating: 1 },
  { re: re(String.raw`hip\s+(?:pad\s+)?brac(?:e|ing(?:\s+system)?)`), name: 'Hip Pad Bracing System (Weapon)', key: 'gear|Hip Pad Bracing System', mount: '',
    bookPage: 'cc.35', source: `${GEAR}.sr3e-cc-gear.Item.1aa45599d499b565`, defaultRating: 1 },
  { re: /^gyro\s+mount\s*\(\s*deluxe\s*\)$/i, name: 'Gyro Mount (Weapon)', key: null, mount: 'Under', bookPage: 'cc.35',
    source: `${GEAR}.sr3e-cc-gear.Item.5d46066a18f5c692` },
  { re: /^gyro\s+mount$/i, name: 'Gyro Mount (Weapon)', key: null, mount: 'Under', bookPage: 'sr3.282',
    source: `${GEAR}.sr3e-sr3-gear.Item.1cd8f276561a6eda` },
];

const ROMAN = { I: 1, II: 2, III: 3, IV: 4 };
const STOCK_NAMES = { fold: 'Folding Stock', detach: 'Detachable Stock', retr: 'Retractable Stock', tele: 'Telescoping Stock', collapsible: 'Collapsible Stock' };

export const IntegralMods = {
  FLAG, KINDS,

  /**
   * The accessories text as tokens — `WeaponAccessories.tokens`. A token that is not one accessory as a whole but holds two
   * printed with no comma between them ("Gas Vent II(2RC) Folding Tripod(6RC)") is split after the first one's ")" —
   * only then, so "Low Light Mag:(2) Scope" stays one scope.
   */
  tokens(text) {
    return WeaponAccessories.tokens(text).flatMap(t => (IntegralMods.match(t) ? [t] : t.split(/(?<=\))\s+(?=[A-Za-z])/)))
      .map(s => s.trim()).filter(Boolean);
  },

  /** One token's accessory: `{ kind, rating, name, token }`, or null when it is not clearly one. */
  match(token) {
    const t = String(token ?? '').replace(/\s+/g, ' ').trim();
    for (const kind of KINDS) {
      const m = kind.re.exec(t);
      if (!m) continue;
      // The captures: a level ("II", "2") for a level family, else a stock's kind; the trailing "(NRC)" is the last group.
      const groups = m.slice(1);
      const rcText = groups.at(-1);
      let rating = kind.defaultRating ?? null;
      const level = groups.find(g => g != null && !/RC/i.test(g));   // "II", "(2)", or a bare "3" ("imaging scope 3")
      if (kind.level && level) rating = ROMAN[level.toUpperCase()] ?? Number(level);
      if (rcText && /RC/i.test(t) && !kind.level) rating = Number(rcText);
      let name = kind.name;
      if (kind.stock) {
        const word = String(groups[0] ?? '').toLowerCase().replace(/\.$/, '');
        name = STOCK_NAMES[Object.keys(STOCK_NAMES).find(k => word.startsWith(k))] ?? 'Stock';
      }
      return { kind, rating, name, token: t };
    }
    return null;
  },

  /** Every accessory the text clearly names, in printed order. */
  parse(text) {
    return IntegralMods.tokens(text).map(t => IntegralMods.match(t)).filter(Boolean);
  },

  /** Is this installed mod part of the gun as printed? */
  isIntegral(mod) {
    return mod?.flags?.The2ndChumming3e?.[FLAG] === true;
  },

  /** What the GM is told when an integral mod comes off: the printed figures still count it. Warned, never changed. */
  removedWarning(host, mod) {
    const what = (mod?.system?.modifiers ?? []).some(m => m?.target === 'rc') ? 'RC'
      : (mod?.system?.modifiers ?? []).some(m => m?.target === 'smartgun') ? 'smartgun flag'
        : (mod?.system?.modifiers ?? []).some(m => m?.target === 'laserSight') ? 'laser-sight flag' : 'figures';
    return `${mod?.name ?? 'The accessory'} was built into ${host?.name ?? 'the gun'} as printed — its ${what} still includes it. `
      + 'Edit the gun if it should not (TODO 276).';
  },

  /** A derived id, the same on every run: "integral0000000N" — 16 characters, as Foundry's ids. */
  idFor(index) {
    return `integral${String(index).padStart(8, '0')}`;
  },

  /** The installed-mod entry for one match. */
  entryFor(found, index) {
    const { kind, rating, name, token } = found;
    const effects = kind.key ? MOD_EFFECTS[kind.key] : null;
    const mount = kind.mount ? `<p><strong>Mount:</strong> ${kind.mount}</p>` : '';
    const internal = kind.internal ? ' An internal smartgun system — no mount (SR3 p.281).' : '';
    return {
      _id: IntegralMods.idFor(index), type: 'gear', name,
      system: {
        category: 'Firearms Accessories', modFor: 'weapon', quantity: 1, rating: rating ?? null, cost: 0, bookPage: kind.bookPage,
        description: `<p><strong>Integral</strong> — built into the gun as printed ("${token}"). The gun's own RC and flags already `
          + `include it, so its change is shown, never added again (TODO 276).${internal}</p>${mount}`,
        modifiers: effects ? effects.map(m => ({ ...m })) : [],
      },
      flags: { The2ndChumming3e: { [FLAG]: true, ...(kind.source ? { integralSource: kind.source } : {}) } },
    };
  },

  /**
   * What to fill on a gun: `{ 'system.installed': [...its mods, ...the integral ones] }`, or null — not a firearm, nothing
   * in the text converts, or it already holds an integral mod (FILL BLANKS: never twice, never over the GM's removal).
   */
  fillDelta(item) {
    if (item?.type !== 'firearm') return null;
    const installed = Array.isArray(item?.system?.installed) ? item.system.installed : [];
    if (installed.some(m => IntegralMods.isIntegral(m))) return null;
    if (item?.flags?.The2ndChumming3e?.integralDone) return null;
    const found = IntegralMods.parse(item?.system?.accessories);
    if (!found.length) return null;
    return {
      'system.installed': [...installed, ...found.map((f, i) => IntegralMods.entryFor(f, i + 1))],
      'flags.The2ndChumming3e.integralDone': true,
    };
  },
};
