/**
 * Parse the Shadowrun Character Generator's `Mods` field into SR3E bonus fields.
 *
 * Upstream (`criticalfault/Shadowrun-Character-Generator`, `src/data/SR3/*.json`) encodes an
 * item's mechanical effects as a comma-separated list like `+2RCT,+1INI,`. **186 entries**
 * across Cyberware and Bioware carry one, and until now the system parsed none of them: the
 * `v2` populate rewrite dropped the handling the legacy macro had, so every shipped cyberware
 * and bioware document has empty `bonus*` fields.
 *
 * ## ⚠ Parse `Mods`, never `Notes`
 *
 * Established in upstream issue #199, where the maintainer confirmed it directly:
 * *"So Mods is authoritative. These codes do actually do stuff on the backend."* `Notes` is a
 * flattened human-readable view that is sometimes absent, sometimes disagrees, and cannot be
 * parsed reliably.
 *
 * ## ⚠ TWO racial encodings, and they coexist TODAY
 *
 * Not a future risk — both are in the data now, split by file, and the maintainer posted two
 * different maps from two different parts of his own codebase:
 *
 *   - **3-letter**, first letter replaced (`Bioware.json`): `R` racial, `N` natural, `X` both.
 *     `ROD`=Body `RTR`=Str `RCK`=Qui `RNT`=Int `NCT`=Reaction `NNI`=Init `XOD`/`XCK`/`XTR`
 *   - **4-letter**, `R` + the full code (`AdeptPowers.json`): `RBOD` `RSTR` `RQCK`
 *
 * The 3-letter scheme is not injective — racial Reaction would collide with plain `RCT`, which
 * is why Reaction uses `N` instead. Both forms are accepted here; neither of the maintainer's
 * own maps covers both.
 *
 * **SR3E collapses them all to the plain attribute.** We track no racial maxima, so `ROD`,
 * `BOD` and `XOD` are the same `bonusBod`. Suprathyroid Gland's `+1NCT,+1RTR,+1RCK,+1ROD`
 * becomes Reaction/Str/Qui/Body +1 each — exactly what its own `Notes` line says.
 *
 * ## ⚠ `Mods` is OVERLOADED — most codes are not attributes
 *
 * The maintainer confirmed these drive other systems entirely: `STG` (Suprathyroid Gland) and
 * `MNE` (Mnemonic Enhancer) alter **karma spending**, `DGX` (Digestive Expansion) alters
 * **lifestyle cost**. With `DJK` `PCL` `PCA` `MUL` `AST` they are feature flags, not bonuses.
 * A parser that assumes every token is an attribute invents phantom attributes for all of them.
 *
 * A third group is real but has **nowhere to go**: `IMP`/`BAL` are armour, `TAS`/`HAC`/`CPL`
 * are pools, `VCT`/`VNI`/`VCR` are rigger stats. No cyberware field holds them. They are
 * reported as `unmapped` rather than dropped, so importing can say what it could not carry.
 *
 * ⚠ **Nothing is silently discarded.** Every token lands in exactly one of `bonuses`, `flags`,
 * `unmapped` or `unparsed`. That is the whole design: this data has already lost information
 * once, and a parser that quietly ignores what it does not understand loses it again.
 */

/** Codes that map onto an SR3E `bonus*` field. Racial/natural variants collapse to the plain. */
const ATTRIBUTE_CODES = {
  // Body
  BOD: 'bonusBod', ROD: 'bonusBod', XOD: 'bonusBod', RBOD: 'bonusBod',
  // Quickness
  QCK: 'bonusQui', RCK: 'bonusQui', XCK: 'bonusQui', RQCK: 'bonusQui',
  // Strength
  STR: 'bonusStr', RTR: 'bonusStr', XTR: 'bonusStr', RSTR: 'bonusStr',
  // Intelligence — note RNT, not RINT
  INT: 'bonusInt', RNT: 'bonusInt', RINT: 'bonusInt',
  // Charisma and Willpower have no racial form in the data
  CHA: 'bonusCha', RCHA: 'bonusCha',
  WIL: 'bonusWil', RWIL: 'bonusWil',
  // Reaction uses N, because racial Reaction would collide with plain RCT
  RCT: 'bonusRea', NCT: 'bonusRea',
  // Initiative DICE — Wired Reflexes [1] is "+2RCT,+1INI", i.e. +2 Reaction and +1d6
  INI: 'bonusInitDice', NNI: 'bonusInitDice',
};

/**
 * Codes that are feature flags rather than modifiers. Confirmed by the upstream maintainer:
 * they drive karma spending, lifestyle costs and equipment presence.
 */
const FLAG_CODES = new Set(['DJK', 'PCL', 'PCA', 'MNE', 'AST', 'MUL', 'DGX', 'STG']);

/**
 * Real modifiers with no SR3E field on a cyberware/bioware item. Reported, never dropped.
 * `CPL` appears in the maintainer's Magic Panel map as Combat_Pool.
 *
 * ⚠ `IMP`/`BAL` are the exception now — they stay out of `bonuses` (and so out of the
 * generated `SRCG_BONUSES`) on purpose, because `SR3EActor.implantArmor` reads them from the
 * item's own `mods` string at derive time, with the nullable `bonusImpact`/`bonusBallistic`
 * fields as the GM's override. Mapping them here as well would add a second source for the
 * same number. TODO 75.
 */
const UNMAPPED_CODES = {
  IMP: 'impact armour', BAL: 'ballistic armour',
  TAS: 'Task Pool', HAC: 'Hacking Pool', CPL: 'Combat Pool',
  VCT: 'vehicle control reaction', VNI: 'vehicle initiative', VCR: 'VCR level',
  MAG: 'Magic',
};

/** `+2RCT` / `-1RCT` / `+DJK` (no number). */
const TOKEN = /^([+-]?\d*)\s*([A-Za-z]+)$/;

/**
 * @param {string} mods  the raw `Mods` string
 * @returns {{bonuses: object, flags: string[], unmapped: object[], unparsed: string[]}}
 *   `bonuses` keyed by SR3E field name; `unmapped` entries are `{code, value, meaning}`.
 */
export function parseMods(mods) {
  const bonuses  = {};
  const flags    = [];
  const unmapped = [];
  const unparsed = [];

  for (const raw of String(mods ?? '').split(',')) {
    const tok = raw.trim();
    if (!tok) continue;                       // trailing comma is the norm upstream

    const m = TOKEN.exec(tok);
    if (!m) { unparsed.push(tok); continue; }

    const code = m[2].toUpperCase();
    // `+DJK` carries no number; a flag does not need one.
    const value = m[1] === '' || m[1] === '+' || m[1] === '-' ? 1 : parseInt(m[1], 10);

    if (FLAG_CODES.has(code)) { flags.push(code); continue; }

    const field = ATTRIBUTE_CODES[code];
    if (field) {
      bonuses[field] = (bonuses[field] ?? 0) + value;
      continue;
    }

    if (UNMAPPED_CODES[code]) {
      unmapped.push({ code, value, meaning: UNMAPPED_CODES[code] });
      continue;
    }

    unparsed.push(tok);
  }

  return { bonuses, flags, unmapped, unparsed };
}

/** The tables, exposed so tooling and tests can report on coverage. */
export const SR3E_MOD_CODES = { ATTRIBUTE_CODES, FLAG_CODES, UNMAPPED_CODES };
