/**
 * Legwork — asking a contact, or the Matrix, what they know · *SR3 pp.253-256* (TODO 268). Pure — no Foundry.
 *
 * **What the book says** (core rulebook, printed pages; checked against the PDF 2026-10-25):
 *  - p.253: *"A Success Test using Etiquette (Street or Corporate), Target Number 4, typically serves to find
 *    out what a contact does or does not know."* Published adventures carry a Legwork section of success
 *    tables. *"Characters who roll more than one success gain all the information available to all previous
 *    levels of success."*
 *  - p.254, the fee: *"contact's Charisma x contact's Intelligence x 50. Divide that result by the number of
 *    successes achieved on the Etiquette Test. The result is in nuyen."* The GM may adjust it; *"Standard
 *    Negotiation procedures apply to determine the final payment."*
 *  - p.254, keeping an ear to the ground: *"the gamemaster makes an appropriate Etiquette Test for the contact
 *    at +2 against the target number given in the relevant success table. If the gamemaster rolls any
 *    successes, the contact reports the appropriate information to the runner in 2D6 hours"*; the fee as above.
 *  - p.254, rushing: *"If a player wishes to rush a meeting with a contact, they should make an Etiquette Test
 *    to do so. In addition, the Etiquette Test they make to get what they want out of the contact should suffer
 *    a +2 target number modifier."*
 *  - p.254, the Matrix: *"The Base Time for such a search is 2D6 hours. The decker makes a Success Test using
 *    his or her Etiquette (Matrix) Skill. The target number is the same as given on the relevant success table.
 *    Players may not use Hacking Pool dice … but can trade off Etiquette Test successes to reduce the base
 *    time."* At most *"half the character's Intelligence, rounded up"* searches at once.
 *  - p.256, contact levels: Level 2 — *"1 extra die for any Etiquette Tests made to acquire information"*;
 *    Level 3 — *"2 extra dice"*. Level 1 gives none.
 *
 * ⚠ **The contact LEVEL is not stored anywhere.** Contacts carry Loyalty and Connection (1-6), which are not
 *   SR3's Level 1-3 (p.255-256). Until TODO 281 settles how they relate, the Legwork dialog lets the GM pick the
 *   level, offering the Loyalty capped at 3 (`levelFromLoyalty`) — the maintainer's stopgap, 2026-10-25.
 * ⚠ **Tiers are CUMULATIVE.** Three successes reveal the 1-, 2- and 3-success rows, never just the third.
 * ⚠ **The +2 for an ear to the ground is on the CONTACT's test**, and the level dice are for the RUNNER's
 *   information test only — a Matrix search has neither, and no fee.
 * ⚠ The book gives no rounding for the fee; it is rounded to the nearest nuyen. No successes → no information
 *   and no fee (there is nothing to divide by).
 */

export const PAGE    = 'SR3 p.253-256';
export const BASE_TN = 4;

export const ASK    = 'ask';
export const EAR    = 'ear';
export const MATRIX = 'matrix';

export const MODES = {
  [ASK]:    { label: 'Ask the contact',                      page: 'SR3 p.253-254', test: 'Etiquette (Street or Corporate)' },
  [EAR]:    { label: 'Keep an ear to the ground (GM rolls)', page: 'SR3 p.254',     test: "the contact's Etiquette" },
  [MATRIX]: { label: 'Search the Matrix (decker)',           page: 'SR3 p.254-255', test: 'Etiquette (Matrix)' },
};

const int = v => Math.trunc(Number(v) || 0);

export const Legwork = {
  /** The book's fee · p.254. `fee` is null with no successes. */
  fee(charisma, intelligence, successes) {
    const base = Math.max(0, int(charisma)) * Math.max(0, int(intelligence)) * 50;
    const s = Math.max(0, int(successes));
    return { base, successes: s, fee: s > 0 ? Math.round(base / s) : null };
  },

  /**
   * The target number · p.253-254: the table's (default 4), +2 for an ear to the ground (the contact's test),
   * +2 for a rushed meeting (asking only), plus wounds (the runner's — not on the contact's test) and anything else.
   */
  targetNumber({ base = BASE_TN, mode = ASK, rushed = false, wounds = 0, other = 0 } = {}) {
    let tn = int(base) || BASE_TN;
    if (mode === EAR) tn += 2;
    if (mode === ASK && rushed) tn += 2;
    if (mode !== EAR) tn += Math.max(0, int(wounds));
    return Math.max(2, tn + int(other));
  },

  /** Extra dice for the contact's level · p.256 — the runner's information test only. */
  levelDice(level, mode = ASK) {
    if (mode !== ASK) return 0;
    const l = int(level);
    return l >= 3 ? 2 : l === 2 ? 1 : 0;
  },

  /** The level the dialog offers: the contact's Loyalty, held to 1-3 (a stopgap — see TODO 281). */
  levelFromLoyalty(loyalty) {
    return Math.min(3, Math.max(1, int(loyalty) || 1));
  },

  /** Searches a decker can run at once · p.254: half Intelligence, rounded up. */
  maxSearches(intelligence) {
    return Math.max(0, Math.ceil(int(intelligence) / 2));
  },

  /** An ear to the ground reports back on any success · p.254. */
  reportsBack(successes) {
    return int(successes) > 0;
  },

  /**
   * Etiquette dice for a test: the skill's rating, or the specialisation's when one is named and held
   * (`specialisations[].level` is the bonus over the base — `scripts/data/skill-rules.mjs`).
   * @param {{rating?:number, specialisations?:{name:string, level:number}[]}|null} skill
   * @returns {{dice:number, spec:string|null}}
   */
  etiquetteDice(skill, specName = '') {
    const rating = Math.max(0, int(skill?.rating));
    const want = String(specName ?? '').trim().toLowerCase();
    const spec = want ? (skill?.specialisations ?? []).find(s => String(s?.name ?? '').trim().toLowerCase() === want) : null;
    return spec ? { dice: rating + Math.max(0, int(spec.level)), spec: spec.name } : { dice: rating, spec: null };
  },

  /** The specialisation the dialog starts on: Matrix for a search, else Street, then Corporate · p.253-254. */
  defaultSpec(specNames, mode = ASK) {
    const names = (specNames ?? []).map(String);
    const find = re => names.find(n => re.test(n)) ?? '';
    if (mode === MATRIX) return find(/^matrix$/i);
    return find(/^street$/i) || find(/^corporate$/i);
  },

  /**
   * A RollTable's rows as tiers: `{ low, high, text }`, from `range` (Foundry's `[low, high]`) or `low`/`high`.
   * Sorted by the success count that reveals them.
   */
  tiers(results) {
    return [...(results ?? [])].map(r => {
      const low  = int(Array.isArray(r?.range) ? r.range[0] : r?.low);
      const high = int(Array.isArray(r?.range) ? r.range[1] : r?.high ?? low);
      return { low, high: Math.max(low, high), name: String(r?.name ?? ''), text: String(r?.text ?? r?.description ?? '') };
    }).sort((a, b) => a.low - b.low);
  },

  /** Every tier the successes reach · p.253 — cumulative, so N successes show every row from 1 to N. */
  revealed(results, successes) {
    const s = Math.max(0, int(successes));
    return Legwork.tiers(results).filter(r => r.low <= s);
  },

  /**
   * A success table's target number: the `legworkTN` flag, else "Target Number N" / "TN N" in its description,
   * else null (the dialog then uses 4).
   */
  tableTN(description, flagTN = null) {
    const f = int(flagTN);
    if (f >= 2) return f;
    const text = String(description ?? '').replace(/<[^>]*>/g, ' ');
    const m = /\b(?:target\s+number|TN)\s*[:=]?\s*(\d{1,2})\b/i.exec(text);
    const n = m ? int(m[1]) : 0;
    return n >= 2 ? n : null;
  },
};
