/**
 * Concealment — what someone is carrying that can be seen, and how well it is hidden · TODO 195.
 *
 * **What the book says** (core rulebook, printed pages):
 *  - p.45: gear has *"a Concealability, which is the target number for Perception Tests to notice the item
 *    when carried."*
 *  - p.231: *"For things that have specific numbers already assigned to them, such as the Concealability of
 *    guns, make the Perception Test against the relevant number."* A Perception Test rolls Intelligence dice;
 *    one success means *"someone has noticed something"* (the Perception Success Table, p.232).
 *  - p.270: *"Concealability measures how concealable the weapon is. This rating is used as the target number
 *    for Perception Tests directed at noticing the weapon."* (Its next sentence, that searches use half the
 *    rating, was RULED OUT by the maintainer 2026-10-17 — see below.)
 *  - p.237, Weapon Detection → Manual Detection: *"In all cases, make a standard Perception Test against the
 *    Concealability of the weapon in question. Apply the modifiers in the Physical Search Modifiers Table,
 *    p. 236."*
 *  - p.236, Physical Search Modifiers Table: the searcher's professionalism +2 / +1 / +0, time spent
 *    +2 … −3 (a 6-10 minute strip search: *"Weapon found"*), the searcher intimidated +2 / normal +0 / in
 *    complete control −2.
 *  - Cyberware: p.301 *"Synthetic cyberlimbs have a Concealability Rating"* (table, p.303: **8**), M&M p.21 the
 *    induction datajack: *"invisible to visual scans and have a Concealability of 10 against physical
 *    searches."* Obvious cyberlimbs *"will also draw the attention of security personnel"* (p.301), and
 *    *"cyber replacement of the ears typically features an obvious prosthesis"* (p.299).
 *
 * ⚠ **A search uses the FULL Concealability plus the Physical Search Modifiers Table (p.237, table p.236).**
 * p.270's "half the Concealability, rounded down" for searches was ruled out by the maintainer (2026-10-17) and
 * is not in the code. Two modes remain: `NOTICE` (p.45, p.231) and `SEARCH_FULL` (p.237).
 *
 * ⚠ **A LOWER Concealability is the WORSE hidden one**: it is the target number, so the item is easier to spot.
 * "Least concealed first" therefore sorts ascending, with things that need no test at all (in hand, obvious
 * chrome) ahead of everything.
 *
 * ⚠ **"Visible" is a judgement, so the heuristic is spelled out** (`classify`, and the Foundry side's dialog
 * lets the GM untick any row): a weapon in hand is plain sight; a stowed weapon is hidden to a degree (its
 * Concealability); worn armour is shown (its Concealability); an implant is shown only when its category and
 * name mark an outward part (obvious cyberlimbs, cyberears, synthetic limbs, cybereyes, a datajack); an
 * implanted weapon is listed as a weapon. Everything internal is left out.
 *
 * Pure: no Foundry globals.
 */

export const PAGES = {
  gear:        'SR3 p.45',
  perception:  'SR3 p.231-232',
  gearTable:   'SR3 p.270',
  search:      'SR3 p.236-237',
  synthetic:   'SR3 p.301, p.303',
};

/** How a Perception Test against an item is aimed. */
export const NOTICE      = 'notice';        // p.45, p.231 — the full Concealability
export const SEARCH_FULL = 'search-full';   // p.237 — the full Concealability, plus the Physical Search table
// p.270's half-rating for searches was ruled out by the maintainer (2026-10-17): there is no half mode.

export const MODES = {
  [NOTICE]:      { label: 'Noticing it on someone (Concealability)',                     page: 'SR3 p.45, p.231' },
  [SEARCH_FULL]: { label: 'A search — the Concealability, with the search table',        page: 'SR3 p.236-237' },
};

/** Physical Search Modifiers Table · SR3 p.236. `found` = no test: the weapon is found. */
export const SEARCH_TABLE = {
  professional: [
    { key: 'amateur',  label: 'Average/Amateur (Professional Rating 1)',   mod: 2 },
    { key: 'semi',     label: 'Semi-trained (Professional Rating 2)',      mod: 1 },
    { key: 'trained',  label: 'Trained or better (Professional Rating 3 or 4)', mod: 0 },
  ],
  time: [
    { key: 'cursory',  label: 'Cursory — a very quick pat-down (1-2 seconds)', mod: 2 },
    { key: 'brisk',    label: 'Brisk — a fast pat-down (3-5 seconds)',         mod: 1 },
    { key: 'standard', label: 'Standard (6-20 seconds)',                       mod: 0 },
    { key: 'detailed', label: 'Detailed (21-60 seconds)',                      mod: -1 },
    { key: 'deliberate', label: 'Deliberate (1-2 minutes)',                    mod: -2 },
    { key: 'strip-ish', label: 'Practically a fraggin strip search (3-5 minutes)', mod: -3 },
    { key: 'strip',    label: 'Strip search (6-10 minutes) — the weapon is found', found: true },
  ],
  searcher: [
    { key: 'fearful',  label: 'Intimidated/Fearful',            mod: 2 },
    { key: 'normal',   label: 'Working under normal conditions', mod: 0 },
    { key: 'control',  label: 'In complete control',            mod: -2 },
  ],
};

const clampInt = v => Math.trunc(Number(v) || 0);

export const Concealment = {
  /**
   * An item's Concealability as a number — the leading figure of a cell like "5", "4/6" or "6 (8 w/ …)".
   * Null when the cell is blank or a dash ("—"): no rating to test against.
   */
  parse(raw) {
    const m = /-?\d+/.exec(String(raw ?? ''));
    return m ? Number(m[0]) : null;
  },

  /**
   * The target number of a Perception Test against Concealability `c`, by `mode`. Floored at 2: *"no target
   * number can ever be less than 2"* (p.112).
   * @param {number} c
   * @param {string} [mode]  NOTICE | SEARCH_FULL (both use the whole Concealability; the search's table rides in `mod`)
   * @param {number} [mod]   modifiers on top (the search table, the Perception Test Modifiers Table)
   */
  targetNumber(c, mode = NOTICE, mod = 0) {
    void mode;   // both modes use the whole Concealability
    return Math.max(2, Math.max(0, clampInt(c)) + clampInt(mod));
  },

  /**
   * The Physical Search Modifiers Table's total · SR3 p.236.
   * @returns {{ mod:number, found:boolean }}  `found`: a strip search — no test, the weapon is found
   */
  searchModifier({ professional = 'trained', time = 'standard', searcher = 'normal' } = {}) {
    const pick = (rows, key) => rows.find(r => r.key === key) ?? { mod: 0 };
    const t = pick(SEARCH_TABLE.time, time);
    return {
      mod:   (pick(SEARCH_TABLE.professional, professional).mod ?? 0) + (t.mod ?? 0) + (pick(SEARCH_TABLE.searcher, searcher).mod ?? 0),
      found: t.found === true,
    };
  },

  /**
   * How an implant shows from outside, by its category and name — `null` when it is internal.
   *   obvious   — plain sight, no test (obvious chrome; cyberears' prosthesis)
   *   disguised — has a Concealability (synthetic limbs 8, p.303; an induction datajack 10, M&M p.21)
   *   judge     — the book leaves it to the gamemaster (cybereyes: "indistinguishable … or outlandish", p.299)
   * Weapons are not here: an implanted weapon is a weapon entry of its own and is listed as one.
   * @returns {{ state:'obvious'|'disguised'|'judge', conceal:number|null, note:string }|null}
   */
  classifyImplant(item) {
    if (item?.type !== 'cyberware') return null;
    if (item.flags?.The2ndChumming3e?.stored) return null;          // in the stash, not in the body
    const cat  = String(item.system?.cyberwareCategory ?? '');
    const name = String(item.name ?? '');
    if (cat === 'Cyberweapons') return null;
    if (cat === 'Cyberlimbs') {
      // The category also holds the enhancements and accessories ("Quickness [5] w/Torso", "Induction Pad") —
      // only the limb itself shows.
      if (!/cyber(?:arm|leg|skull|torso|limb)|kid stealth/i.test(name)) return null;
      if (/synthetic/i.test(name)) {
        return { state: 'disguised', conceal: 8,
          note: 'Synthetic limb: Concealability 8 (p.303); clothing over it adds 3 (p.301); enhancements change it — edit the number' };
      }
      return { state: 'obvious', conceal: null, note: 'Obvious chrome (M&M p.32; SR3 p.301)' };
    }
    if (cat === 'Earware' && /ears?,? cyber replacement|cyberears?/i.test(name)) {
      return { state: 'obvious', conceal: null, note: 'Cyberears typically feature an obvious prosthesis (SR3 p.299)' };
    }
    if (cat === 'Eyeware' && /cyber replacement|cosmetic|mirrored/i.test(name)) {
      return { state: 'judge', conceal: null, note: 'Cybereyes may be indistinguishable from biological eyes, or outlandish (SR3 p.299) — the GM decides' };
    }
    if (/induction datajack/i.test(name)) {
      return { state: 'disguised', conceal: 10, note: 'Induction datajack: Concealability 10 against physical searches (M&M p.21)' };
    }
    if (cat === 'Headware' && /^datajack\b/i.test(name)) {
      return { state: 'judge', conceal: null, note: 'A datajack is common and unremarkable (SR3 p.93) but it is on the head — the GM decides' };
    }
    return null;
  },

  /**
   * Everything an actor carries that can be seen, as rows. `items` are the actor's items; `wornIds` the ids of
   * the armour actually worn (the actor's own `wornArmorItems`).
   *
   * @returns {Array<{ id:string, name:string, kind:'weapon'|'armor'|'implant',
   *   state:'drawn'|'stowed'|'body'|'worn'|'obvious'|'disguised'|'judge',
   *   conceal:number|null, raw:string, needsTest:boolean, note:string }>}
   */
  rows(items = [], { wornIds = [] } = {}) {
    const worn = new Set(wornIds);
    const out = [];
    const WEAPONS = ['firearm', 'melee', 'projectile', 'thrown'];
    for (const i of items) {
      const sys = i.system ?? {};
      const stored = i.flags?.The2ndChumming3e?.stored === true;
      if (WEAPONS.includes(i.type)) {
        if (stored) continue;
        const cat = String(sys.category ?? '').toUpperCase();
        if (cat === 'UNA') continue;                                // fists are not carried
        const c = Concealment.parse(sys.concealability);
        const body = cat === 'CYB' || sys.hands === 0;              // an implanted weapon: never "in hand"
        const drawn = !body && sys.ready !== false;
        out.push({
          id: i.id, name: i.name, kind: 'weapon', conceal: c, raw: String(sys.concealability ?? ''),
          state: body ? 'body' : drawn ? 'drawn' : 'stowed',
          needsTest: !drawn,
          note: body ? 'Implanted weapon — retracted until used'
              : drawn ? 'In hand: plain sight, nothing to notice'
              : c == null ? 'No Concealability on the item — set it' : '',
        });
      } else if (i.type === 'armor') {
        if (!worn.has(i.id)) continue;
        const c = Concealment.parse(sys.concealability);
        out.push({
          id: i.id, name: i.name, kind: 'armor', conceal: c, raw: String(sys.concealability ?? ''),
          state: 'worn', needsTest: true,
          note: c == null ? 'No Concealability on the item — set it' : '',
        });
      } else if (i.type === 'cyberware') {
        const k = Concealment.classifyImplant(i);
        if (!k) continue;
        out.push({
          id: i.id, name: i.name, kind: 'implant', conceal: k.conceal, raw: k.conceal == null ? '' : String(k.conceal),
          state: k.state, needsTest: k.state === 'disguised' || (k.state === 'judge' && k.conceal != null), note: k.note,
        });
      }
    }
    return Concealment.sort(out);
  },

  /** Least concealed first: nothing-to-test rows, then ascending Concealability, then the unrated. Stable by name. */
  sort(rows) {
    const rank = r => {
      if (r.state === 'judge' && r.conceal == null) return 1e5;   // the GM's call, after the rated ones
      if (!r.needsTest) return -1;                  // in hand / obvious — as visible as it gets
      return r.conceal == null ? 1e6 : r.conceal;   // …and the unrated last
    };
    return [...rows].sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name)));
  },
};
