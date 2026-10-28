/**
 * Rated mods: the level lives in `system.rating`, not the name — TODO 261.
 *
 * The maintainer, 2026-10-24: *"we want to remove the level from all mods and put them as a dropdown
 * inside the mod"* — for cyber, weapon and vehicle mods. The packs shipped one document per level,
 * named for it ("Anti-Theft System [10]", "STS (Beacon) Rating [3]", "Signal Booster [3]"). Now the
 * name is the mod ("Anti-Theft System"), the level is the rating field, and the item sheet offers the
 * levels the books print as a dropdown that brings that level's cost, CF, Essence and the rest with it
 * (`MOD_RATING_TABLE`, generated from the packs by `tools/build-mod-ratings.mjs`). Lists show
 * "Anti-Theft System [10]" through `displayName`.
 *
 * **Then the maintainer widened it to ALL gear** (2026-10-24: *"We shouldn't have any [N] gear — the point is
 * to move the level into the gear's doc"*): every rated item in every Item pack is ONE document, its levels in
 * the table, picked from the item sheet's Level dropdown or the 🛒 Buy gear dialog. "Chemical Seal Rating [10]"
 * is "Chemical Seal"; "Bug Scanner Lv [3]" is "Bug Scanner". The kinds — `kindOf`:
 *
 * | kind | which items |
 * |---|---|
 * | `vehicle` | every `vehiclemod` |
 * | `cyberlimb` | cyberware of category `Cyberlimb Mods` (the copies built INTO a limb, TODO 255) |
 * | `cyberware` | every other cyberware (Bodyware, Headware, Rigger…) |
 * | `weapon` | gear of category `Firearms Accessories` |
 * | `gear` | every other gear |
 * | `bioware` · `medical` · `ammunition` · `vehicleweapon` | those item types (tracker rounds, the AM-56 lure launcher) |
 *
 * The same name can be two kinds — the Hydraulic Jack is both Bodyware and a Cyberlimb Mod — and the table
 * keeps them apart (`cyberware|Hydraulic Jack`, `cyberlimb|Hydraulic Jack`).
 *
 * Pure — no Foundry.
 */
import { MOD_RATING_TABLE, COLLAPSED_SOURCES } from './mod-rating-table.mjs';
import { BookPage } from './book-page.mjs';

/**
 * A level written into a name: `[3]`, `Rating [3]`, `Lvl [3]`, `Lv [3]`, glued (`Bod[3]`) or spaced, with the
 * one upstream stray after it (`Protocol Emulation Module [10]  1`). Only a BRACKET counts — a bare
 * trailing number is a model ("Ares Predator 2").
 */
const LEVEL = /^(.*?)\s*(?:\b(?:Rating|Lvl|Lv)\s*)?\[(\d+)\](?:\s+\d+)?\s*$/;

/**
 * The same level written WITHOUT a bracket — "Medkit Rating 6", "Alpha Hospital Rating 3" (the upstream generator
 * writes both). Only a trailing "Rating N" / "Lvl N" / "Lv N": "Appropriate Utilities at Rating 4-8" is a range, and
 * a bare trailing number ("Ares Predator 2") is a model.
 */
const BARE = /^(.*?)\s+(?:Rating|Lvl|Lv)\s+(\d+)\s*$/;

/** `Compendium.The2ndChumming3e.<pack>.Item.<id>` — the system's own packs only. */
const SOURCE = /^Compendium\.The2ndChumming3e\.([^.]+)\.Item\.([A-Za-z0-9_-]+)$/;

/**
 * Families whose level is a BARE trailing number — the ones the " [N]" / "Rating N" rule skipped (TODO 266).
 *
 * ⚠ **A bare trailing number is a MODEL unless its stem is named here** ("Ares Predator 2", "Smart Goggles 1",
 * and the helmet options "Optical Vis. Mag 3" / "Elec. Vis. Mag 38" — MAGNIFICATION 3, SR3 p.284: *"Electronic
 * Magnification 3 (900¥), Optical Magnification 3 (1,200¥)"* — are not levels). Each entry is a book fact:
 *   - **Signal Locator** (1000¥ x Rating) and **Tracking Signal** (100¥ x Rating) — SR3 p.284, armour options;
 *   - **Transceiver Rtg. N** — the armour option, written "+Transceiver Rtg. 7" (the stem drops "Rtg.", the
 *     way "Rating" is dropped);
 *   - **Personal Comm Unit N** — a Cyberlimb Mod (cc-cyberware);
 *   - **Ritual Sorcery Materials - Combat Force N** — the Force is the level (mits-gear);
 *   - **Thermal Dampening Rat[8]MAX** — the Cannon Companion's level-8 row (p.53), upstream wrote "Rat[8]MAX".
 * The armour options carry a leading "+" in the old packs; it is not part of the stem.
 *
 * **The rest of "everything with a level"** (the maintainer, 2026-10-25: *"I want to do the same thing that we did
 * for mods to all the things that have levels … for the pocket/wrist computer its a rating that's measured in Mp"*):
 *   - **Memory in Mp** — Pocket / Wrist Computer, Telecom, Table Top PC, Data Display Unit (SR3 p.287) and headware
 *     Memory (SR3 p.298) written "(250Mp)" / "(250 Mps)"; the Optical Memory Chip "50MP" / "(100 mp) 1 (Cyberlimb)".
 *     The level IS the memory (`LEVEL_UNITS` labels it "250 Mp");
 *   - **ECCM +N** (the gear rating) and the **Virtual Instrument** chips, "Inst4Lev7" (level 7);
 *   - **SkillSoft Jukebox** — one item per memory size, the ports its level ("… 108MP 10 pts" / "8 prts" / "3 ports");
 *   - **fixed-level adept powers** — Imp. Reflexes / Kinesics / Penetrating Strike "Level N", Combat Sense "+N",
 *     Delay Damage / Flexibility / Enhanced Balance "N" (their level goes to `system.level`, `levelField`).
 * ⚠ Skillwires ("Skillwires [3] MP 27") carries a rating AND a memory size, and is left as it is.
 * `re` captures (1) the stem and (2) the level; a named group `tag` (a mod tag after the level) is put back on the stem.
 */
const BARE_LEVELS = [
  /^\+?\s*(Signal Locator|Tracking Signal)\s+(\d+)\s*$/,
  /^\+?\s*(Transceiver)\s+Rtg\.?\s+(\d+)\s*$/,
  /^(Personal Comm Unit)\s+(\d+)\s*$/,
  /^(Ritual Sorcery Materials - Combat)\s+Force\s+(\d+)\s*$/,
  /^(Thermal Dampening)\s+Rat\[(\d+)\]\s*MAX\s*$/,
  /^(Pocket Computer|Wrist Computer|Telecom|Table Top PC|Data Display Unit|Memory)\s*\(\s*(\d+)\s*Mps?\s*\)\s*$/i,
  /^(Optical Memory Chip)\s+(\d+)\s*MP\s*$/i,
  /^(Optical Memory Chip)\s*\(\s*(\d+)\s*mp\s*\)\s*1?\s*(?<tag>\(Cyberlimb\))?\s*$/i,
  /^(ECCM)\s*\+(\d+)\s*$/,
  /^(Virt Instr (?:Gen\.|Spec))\s+Inst\d+Lev(\d+)\s*$/,
  /^(SkillSoft Jukebox \d+MP)\s+(\d+)\s*(?:pts|prts|ports)\s*$/i,
  /^(Imp\. Reflexes|Kinesics|Penetrating Strike)\s+Level\s+(\d+)\s*$/,
  /^(Combat Sense)\s*\+(\d+)\s*$/,
  /^(Delay Damage|Flexibility|Enhanced Balance)\s+(\d+)\s*$/,
];

/**
 * Families whose level is a ROMAN numeral (the maintainer, 2026-10-27 — TODO 261's sweep missed them). Only the stems
 * named here: "Ares Predator II", "Smartlink II" (the Smartlink-2), "Smart Goggles I", "Plastic Compound IV", "Fairlight
 * Excalibur II", "Neuro-stun IX", the Type I-IV maglocks … are MODELS, not levels.
 *   - **Gas Vent I-IV** — SR3 p.282 prints the vents by RC (the level is the RC), CC p.35 adds IV (TODO 276).
 */
const ROMAN_LEVELS = [
  /^(Gas Vent)\s+(I|II|III|IV)\s*(?<tag>\(Weapon\))?\s*$/,
];
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

/** A level measured in something — the dropdown and the 🛒 picker say "250 Mp", not "250". Keyed by table key. */
export const LEVEL_UNITS = Object.fromEntries([
  'gear|Pocket Computer', 'gear|Wrist Computer', 'gear|Telecom', 'gear|Table Top PC', 'gear|Data Display Unit',
  'gear|Optical Memory Chip', 'cyberlimb|Optical Memory Chip', 'cyberware|Memory',
].map(k => [k, 'Mp']));

/**
 * The "what is this a mod FOR" tag every mod name ends with, before any level (TODO 266): "Chemical Seal (Armor)",
 * "Gas Vent IV (Weapon) [4]". `system.modFor` is the truth; the tag is how a list says it.
 */
export const MOD_TAGS = { armor: 'Armor', weapon: 'Weapon', cyberlimb: 'Cyberlimb', vehicle: 'Vehicle' };
const TAG = new RegExp(`\\s*\\((?:${Object.values(MOD_TAGS).join('|')})\\)\\s*$`);
const TAG_BEFORE_LEVEL = new RegExp(`\\s*\\((?:${Object.values(MOD_TAGS).join('|')})\\)(?=\\s*(?:\\[\\d+\\])?\\s*$)`);

const tidy = s => String(s ?? '').replace(/\s+/g, ' ').trim();

export const ModRatings = {
  /** The item's kind (see the table above) for a rated type, else null. */
  kindOf(item) {
    const s = item?.system ?? {};
    switch (item?.type) {
      case 'armor': return 'armor';        // the armour options (Signal Locator, Chemseal…) — TODO 266
      case 'vehiclemod': return 'vehicle';
      case 'cyberware': return s.cyberwareCategory === 'Cyberlimb Mods' ? 'cyberlimb' : 'cyberware';
      case 'gear': return s.category === 'Firearms Accessories' ? 'weapon' : 'gear';
      case 'bioware': return 'bioware';
      case 'medical': return 'medical';
      case 'ammunition': return 'ammunition';
      case 'vehicleweapon': return 'vehicleweapon';
      case 'adeptpower': return 'adeptpower';   // the fixed-level powers (2026-10-25)
      default: return null;
    }
  },

  /**
   * The field an item's level lives in: `level` for an adept power (its schema's own field, which the Power Point
   * cost and the effect readers use), `rating` for everything else.
   */
  levelField(item) {
    return item?.type === 'adeptpower' ? 'level' : 'rating';
  },

  /**
   * An item's level, read from `levelField` — what the name sync puts in the bracket. ⚠ For an adept power only when
   * it HAS printed levels (a collapsed fixed-level power): every power's `level` is at least the schema's 1, so
   * reading it for any power would name "Killing Hands" "Killing Hands [1]". Otherwise undefined — no sync.
   */
  levelValue(item, table = MOD_RATING_TABLE) {
    if (item?.type === 'adeptpower' && !ModRatings.levelsOf(item, table)) return undefined;
    return item?.system?.[ModRatings.levelField(item)];
  },

  /** The unit a level is measured in ("Mp"), or ''. */
  unitOf(item) {
    return LEVEL_UNITS[ModRatings.keyOf(item)] ?? '';
  },

  /** `{ stem, rating }` for a name carrying a level, else null. Spaces in the stem are tidied. */
  splitName(name) {
    const text = String(name ?? '');
    const m = LEVEL.exec(text) ?? BARE.exec(text) ?? BARE_LEVELS.map(re => re.exec(text)).find(Boolean)
      ?? ROMAN_LEVELS.map(re => re.exec(text)).find(Boolean);
    if (!m || !m[1].trim()) return null;
    const stem = [m[1], m.groups?.tag].filter(Boolean).join(' ');
    return { stem: stem.replace(/\s+/g, ' ').trim(), rating: ROMAN[m[2]] ?? Number(m[2]) };
  },

  /**
   * A name's plain item name — the key every name-keyed lookup uses (TODO 266). The trailing level
   * (" [4]", " Rating [4]", a bare-family number) comes off, then the trailing mod tag ("(Armor)"), and a
   * leading "+" (the old armour options). So "Chemical Seal (Armor) [4]", the 0.7.0 "Chemical Seal Rating [4]"
   * and the plain "Chemical Seal" are all "Chemical Seal".
   */
  baseName(name) {
    let t = tidy(name).replace(/^\+\s*/, '');
    const first = ModRatings.splitName(t);
    if (first) t = first.stem;
    t = t.replace(TAG, '');
    const second = ModRatings.splitName(t);        // "X [4] (Armor)" — a level written before the tag
    if (second) t = second.stem;
    return t.trim();
  },

  /** The name with its mod tag taken off and everything else kept — "X (Armor) [4]" → "X [4]". */
  untagged(name) {
    return String(name ?? '').replace(TAG_BEFORE_LEVEL, '');
  },

  /** A name's mod tag as a `modFor` key, or ''. */
  tagOf(name) {
    const m = /\((Armor|Weapon|Cyberlimb|Vehicle)\)(?=\s*(?:\[\d+\])?\s*$)/.exec(String(name ?? ''));
    return m ? Object.keys(MOD_TAGS).find(k => MOD_TAGS[k] === m[1]) : '';
  },

  /**
   * The name with its mod tag: "Chemical Seal" → "Chemical Seal (Armor)"; the level kept, after the tag
   * ("Chemical Seal [4]" → "Chemical Seal (Armor) [4]", the 0.7.0 "Chemical Seal Rating [4]" too). ⚠ Never
   * doubled: a name already carrying a tag has it REPLACED, so tagging twice is the same as once. An unknown
   * `modFor` returns the name as written. The old armour options' leading "+" goes (the tag says what it is).
   */
  tagged(name, modFor) {
    const tag = MOD_TAGS[modFor];
    const text = tidy(name);
    if (!tag) return text;
    const bare = text.replace(/^\+\s*/, '');
    const split = ModRatings.splitName(bare);
    let stem = (split ? split.stem : bare).replace(TAG, '').trim();
    stem = ModRatings.splitName(stem)?.stem ?? stem;
    return `${stem} (${tag})${split ? ` [${split.rating}]` : ''}`;
  },

  /**
   * An owned or world item's NAME kept in step with its level (the maintainer, 2026-10-24, "option 1"):
   * the packs name an item plainly ("Medkit"), and a copy of it reads "Medkit [5]" — the rating in square
   * brackets at the end. A name already carrying a level has that suffix SWAPPED for the current one; a
   * custom name keeps its own text, only the trailing bracket changes; idempotent.
   *
   * | rating | the name becomes |
   * |---|---|
   * | a number above 0 | the base name + ` [rating]` |
   * | `null` / `''` (cleared — "no rating") | the base name, the suffix dropped |
   * | `0`, missing, not a number | **unchanged** — legacy (`itemRating` reads the name then) |
   *
   * ⚠ Only a trailing LEVEL is touched: " [3]", " Rating [3]", " Lvl [3]", " Lv [3]", " Rating 3" (`splitName`).
   * "Gyro Mount (Deluxe)" and "Strength Enhancement [4] w/Torso" (a bracket that is not last) are not levels
   * and are returned as written. `type`, when given, must be a rated type — any other is returned unchanged.
   * Never for a compendium document: the packs stay plain (the hooks in `sr3e.js` skip them).
   * ⚠ A mod's TAG ("(Armor)", "(Weapon)" — TODO 266) is part of the stem: it is kept, only the trailing level is
   * swapped, and a tag is never doubled ("Chemical Seal (Armor) [4]" at rating 5 is "Chemical Seal (Armor) [5]").
   */
  syncName(name, rating, type = null) {
    const text = String(name ?? '');
    if (type !== null && !ModRatings.kindOf({ type })) return text;
    const split = ModRatings.splitName(text);
    const cleared = rating === null || rating === '';
    const n = Number(rating);
    if (!cleared && !(Number.isFinite(n) && n > 0)) return text;
    // A bracketed number elsewhere in the name is part of the name, not a level — leave such a name alone.
    if (!split && /\[\d+\]/.test(text)) return text;
    const base = split ? split.stem : text.trim();
    return cleared ? base : `${base} [${n}]`;
  },

  /**
   * A compendium document — the name sync never touches one (the packs stay plain: "Medkit"). True for a create
   * INTO a pack (options.pack), an item that lives in one (document.pack), and an item embedded in a pack's actor.
   */
  inPack(document, options) {
    return !!(options?.pack || document?.pack || document?.parent?.pack);
  },

  /**
   * The update that puts a mod's level in its rating and its name in step (`syncName`), or null when the
   * name carries no level to move. The rating field is filled from the name only while it is blank — a
   * GM who typed a different rating keeps theirs, and the name's stale level becomes theirs.
   *
   * ⚠ This RENAMES, which a fill-blanks migration never does — and argues for it: it touches only the
   * rated item types, only a name ending in a level, and the level is kept, in the field AND in the name's
   * bracket ("ECCM [3]" stays "ECCM [3]"; "Chemical Seal Rating [4]" becomes "Chemical Seal [4]").
   */
  renameDelta(item) {
    if (!ModRatings.kindOf(item)) return null;
    const split = ModRatings.splitName(item.name);
    if (!split) return null;
    const field = ModRatings.levelField(item);
    let rating = item.system?.[field];
    // ⚠ A fixed-level adept power stores `level: 1` whatever its name says (`hasLevels: false` — the schema's
    //   initial), so its `level` is never a choice anyone made: the name's level always fills it.
    const fill = rating === undefined || rating === null || rating === '' || Number(rating) === 0
      || (item.type === 'adeptpower' && !item.system?.hasLevels);
    // Medical's rating is a string field (some Biotech rows are signed modifiers).
    if (fill) rating = item.type === 'medical' ? String(split.rating) : split.rating;
    const delta = {};
    const name = ModRatings.syncName(item.name, rating, item.type);
    if (name !== item.name) delta.name = name;
    if (fill && rating !== item.system?.[field]) delta[`system.${field}`] = rating;
    return Object.keys(delta).length ? delta : null;
  },

  /**
   * What a rename leaves unsaid: a name's level that DISAGREES with a rating someone typed. The rating
   * wins (a GM's houserule) and the name's stale level goes — this is the line the migration logs.
   */
  renameConflict(item) {
    const split = ModRatings.kindOf(item) ? ModRatings.splitName(item.name) : null;
    if (item?.type === 'adeptpower' && !item.system?.hasLevels) return null;   // its `level` was never chosen
    const r = Number(ModRatings.levelValue(item));
    return split && r > 0 && r !== split.rating
      ? `${item.name}: the name says ${split.rating}, the rating field says ${r} — keeping ${r}` : null;
  },

  /**
   * A copy linked to a level document the collapse DELETED → the document that kept its family:
   * `Compendium.The2ndChumming3e.<pack>.Item.<id>`, or null when its source is not one of those (or was
   * never deleted). `table` is `COLLAPSED_SOURCES`: pack → { deleted id → kept id }.
   */
  repointSource(item, table = COLLAPSED_SOURCES) {
    const m = SOURCE.exec(String(item?._stats?.compendiumSource ?? ''));
    const kept = m && table[m[1]]?.[m[2]];
    if (!kept) return null;
    // 'pack/id' = the document went to ANOTHER pack (a removed SR3 armour option, for the Cannon Companion's).
    const [pack, id] = kept.includes('/') ? kept.split('/') : [m[1], kept];
    return `Compendium.The2ndChumming3e.${pack}.Item.${id}`;
  },

  /**
   * The whole 0.8.0 update for an owned copy: the rename, and its dead compendium link repointed.
   *
   * ⚠ The repoint OVERWRITES `_stats.compendiumSource`, and argues for it: it only fires on a link to a
   * document that NO LONGER EXISTS, so nothing anyone chose can be there — the one thing it replaces is
   * a dead address. Idempotent: the kept document is never in the deleted table.
   */
  migrateDelta(item) {
    const delta = ModRatings.renameDelta(item) ?? {};
    const to = ModRatings.repointSource(item);
    if (to) delta['_stats.compendiumSource'] = to;
    return Object.keys(delta).length ? delta : null;
  },

  /**
   * The table key for an item: kind and plain name (`baseName`) — the UNTAGGED name, so "Chemical Seal (Armor) [4]"
   * and the 0.7.0 "Chemical Seal Rating [4]" find the same row.
   */
  keyOf(item) {
    const kind = ModRatings.kindOf(item);
    if (!kind) return null;
    return `${kind}|${ModRatings.baseName(item.name)}`;
  },

  /** The levels the books print for this mod, `{ "1": { fields… }, … }`, or null when it has none. */
  levelsOf(item, table = MOD_RATING_TABLE) {
    const key = ModRatings.keyOf(item);
    return (key && table[key]) || null;
  },

  /**
   * The levels OFFERED: `levelsOf` without a level whose row names only books that are turned off — Gas Vent IV is the
   * Cannon Companion's (CC p.35), so it is offered only while that book is on (the maintainer, 2026-10-27). A row with no
   * `bookPage` of its own is the item's, always offered. `bookAllowed(code)` — `SR3ESourceBooks.optionalRuleAllowed`;
   * omitted, every level is offered.
   */
  levelsFor(item, bookAllowed = null, table = MOD_RATING_TABLE) {
    const levels = ModRatings.levelsOf(item, table);
    if (!levels || !bookAllowed) return levels;
    const offered = Object.fromEntries(Object.entries(levels).filter(([, row]) => {
      const codes = BookPage.codes(row?.bookPage);
      return !codes.length || codes.some(c => bookAllowed(c));
    }));
    return Object.keys(offered).length ? offered : null;
  },

  /**
   * The dropdown's options: every offered level (`levelsFor`), plus the item's own rating when it is not one of them
   * (a GM's houserule — or a level from a book since turned off — stays selectable). `{ value, label, selected }`, lowest first.
   */
  options(item, table = MOD_RATING_TABLE, { bookAllowed = null } = {}) {
    const levels = ModRatings.levelsFor(item, bookAllowed, table);
    if (!levels) return null;
    const current = Number(ModRatings.levelValue(item)) || null;
    const unit = ModRatings.unitOf(item);
    const values = new Set(Object.keys(levels).map(Number));
    if (current) values.add(current);
    return [...values].sort((a, b) => a - b).map(v => ({
      value: v, label: `${v}${unit ? ` ${unit}` : ''}${levels[v] ? '' : ' (not in the book)'}`, selected: v === current,
    }));
  },

  /**
   * The update for picking a level: the rating, and that level's printed fields (cost, CF, Essence,
   * availability… whatever differs between the levels). A level the books do not print changes only
   * the rating. Fields are written under `system.`.
   */
  ratingChange(item, rating, table = MOD_RATING_TABLE) {
    const delta = { [`system.${ModRatings.levelField(item)}`]: Number(rating) };
    const row = ModRatings.levelsOf(item, table)?.[Number(rating)];
    for (const [field, value] of Object.entries(row ?? {})) delta[`system.${field}`] = value;
    return delta;
  },

  /**
   * A plain copy of an item's data (`item.toObject()`) with a level applied — the rating and that level's
   * printed fields. 🛒 Buy gear uses it so the bought item has the picked level's numbers. A level the
   * books do not print changes only the rating. Pure: `data` is not touched.
   */
  withLevel(data, rating, table = MOD_RATING_TABLE) {
    const out = { ...data, system: { ...(data?.system ?? {}) } };
    for (const [path, value] of Object.entries(ModRatings.ratingChange(data, rating, table))) out.system[path.slice('system.'.length)] = value;
    if (data?.type === 'medical') out.system.rating = String(rating);
    return out;
  },
};
