/**
 * Drugs — addiction, tolerance, Edge, withdrawal and effects · M&M pp.105-110, 117-123 (TODO 124).
 *
 * Pure: no Foundry. `scripts/SR3EDrugs.js` is the half that posts cards and writes the actor.
 *
 * ── The ratings (M&M p.108) ──────────────────────────────────────────────────────────────
 * - **Addiction Rating + Code** — `4M`, `5P`, `4M/5P`; SR2's packs write `4M+3P`. The rating is
 *   the TN of the test to resist; **M is resisted with Willpower, P with Body**, each separately.
 * - **Tolerance** — the TN of a Body test; no successes and the drug no longer satisfies.
 * - **Edge** — `pre/post`. Every time the doses taken reach a multiple of the Edge in force
 *   (pre- before addiction, post- after), Addiction and Tolerance each rise by 1.
 * - **Fix Factor** — the longest an addict can go between doses.
 *
 * ── The state, `system.substances[key]` ──────────────────────────────────────────────────
 * One record per drug the character has taken, keyed by `drugKey(name)` so two stacks of the
 * same drug share it. Everything in it is a plain number or flag the GM can edit on the sheet:
 *   { name, doses, base: {M,P}, current: {M,P}, toleranceBase, tolerance, edge: {pre,post},
 *     addicted: {M,P}, formerly: {M,P}, tolerant, toleranceDue,
 *     withdrawal: '' | 'withdrawal' | 'forced' | 'recovery', days, recoveryDays,
 *     active: null | { duration }, crash: null | { duration } }
 *
 * ⚠ Nothing here APPLIES a consequence. `takeDose` says which tests are owed; the result of each
 * test is applied by a button someone presses (the ethos: the system announces, people decide).
 */

const TYPES = ['M', 'P'];
/** Mental addiction is resisted with Willpower, physical with Body (M&M p.108). */
export const ADDICTION_ATTR = { M: 'willpower', P: 'body' };
export const ADDICTION_LABEL = { M: 'mental', P: 'physical' };

const num = v => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : null);
const clone = o => JSON.parse(JSON.stringify(o ?? {}));

/**
 * The effects each drug's text gives numbers for · M&M pp.117-123. Keyed by NAME, like
 * `SR3E.triggeredAugmentations`: the packs carry no effect data, and a registry with a page per
 * entry is checkable against the book, where prose on an item is not.
 *
 * `effect` / `crash.effect` keys: bod qui str cha int wil (attribute deltas), rea (Reaction),
 * initDice, painResistance (levels of the adept power), tn (added to every target number).
 * `crash.resist` is damage the user resists with Body when the drug wears off. `stunBoxes` is
 * damage that lasts only as long as the crash, so it is an injury-modifier offset, not boxes
 * ticked on the track. Everything the book says that has no number to apply goes in `note`.
 *
 * ⚠ **Durations are minutes and hours, not Combat Turns** — nothing counts them down. The card
 * rolls and states the duration; "Wears off" is a button.
 */
export const DRUG_EFFECTS = [
  { match: /^ACTH\b/i, page: 'M&M p.117',
    note: 'Inhaled, it triggers the adrenal pump (p.63) — trigger the pump from the Cyber tab. Not addictive; tolerance builds up.' },
  { match: /^Jazz\b/i, page: 'M&M p.119',
    effect: { qui: 2, initDice: 1 },
    duration: { dice: 1, mult: 10, unit: 'min' },
    crash: { resist: '8L', stun: true, effect: { qui: -1 }, duration: { dice: 1, mult: 10, unit: 'min' },
             note: '+1 to all tests involving concentration.' } },
  { match: /^Kamikaze\b/i, page: 'M&M pp.119-120',
    effect: { bod: 1, qui: 1, str: 2, wil: 1, initDice: 1, painResistance: 4 },
    duration: { dice: 1, mult: 10, unit: 'min' },
    crash: { resist: '6M', stun: true, effect: { qui: -1, wil: -1 }, duration: { dice: 1, mult: 10, unit: 'min' } },
    note: 'Every four applications inflict an automatic wound effect on cyberware or bioware (p.126).' },
  { match: /^Long Haul\b/i, page: 'M&M p.120',
    note: 'Awake for four days with no fatigue modifiers, then asleep for 8D6 hours (+6 to all TNs if kept awake). A second dose after the first wears off adds 1D6 × 2 days, then 10D Stun and the crash.' },
  { match: /^Psyche\b/i, page: 'M&M p.121',
    effect: { int: 1 },
    duration: { base: 12, minusBody: true, min: 1, unit: 'hr' },
    note: 'Awakened users gain Focused Concentration: +1 per sustained spell instead of +2 — apply by hand.' },
  { match: /^Bliss\b/i, page: 'M&M p.122',
    effect: { rea: -1, tn: 1, painResistance: 3 },
    duration: { base: 6, minusBody: true, min: 1, unit: 'hr' } },
  { match: /^Burn\b/i, page: 'M&M p.122',
    note: 'Its effects are simulated by the Stun damage taken (3D Stun).' },
  { match: /^Cram\b/i, page: 'M&M p.122',
    effect: { rea: 1, initDice: 1 },
    duration: { base: 12, minusBody: true, min: 1, unit: 'hr' },
    // "crash and suffer Moderate Stun damage for an equivalent duration" — damage that ends with
    // the crash, so it is carried as an injury-modifier offset (3 boxes = Moderate), not ticked.
    crash: { stunBoxes: 3, duration: { same: true }, note: 'Moderate Stun for the same duration.' } },
  { match: /^Nitro\b/i, page: 'M&M p.122',
    effect: { str: 2, wil: 2, painResistance: 6 },
    duration: { dice: 1, mult: 10, unit: 'min' },
    crash: { resist: '8D', stun: true },
    note: '+2 to all Perception Tests — apply by hand.' },
  { match: /^Novacoke\b|^Novocoke\b/i, page: 'M&M p.122',
    effect: { rea: 1, cha: 1, painResistance: 1 },
    duration: { base: 10, minusBody: true, min: 1, unit: 'hr' },
    crash: { chaTo: 1, wilHalf: true, duration: { same: true } },
    note: 'A +1 Perception Test modifier — apply by hand.' },
  { match: /^Zen\b/i, page: 'M&M p.122',
    effect: { rea: -2, wil: 1 },
    duration: { dice: 1, mult: 10, unit: 'min' },
    note: '+1 to all physical-related target numbers — apply by hand.' },
  { match: /^Deepweed\b/i, page: 'M&M p.123',
    effect: { wil: 1 },
    duration: { essencePlus: 1, max: 12, unit: 'hr' },
    crash: { effect: { tn: 2 }, duration: { same: true } },
    note: 'Forces any magically active user to astrally perceive, even an adept without astral access.' },
];

export const DrugRules = {
  DRUG_EFFECTS,

  /** `4M`, `5P`, `4M/5P`, `4M+3P` → `{ M, P }` (null where the drug has no such addiction). */
  parseAddiction(str) {
    const out = { M: null, P: null };
    for (const m of String(str ?? '').matchAll(/(\d+)\s*([MP])/gi)) out[m[2].toUpperCase()] = Number(m[1]);
    return out;
  },

  /** `5/50` → `{ pre: 5, post: 50 }`; `10/--` → `{ pre: 10, post: null }`; anything else → null. */
  parseEdge(str) {
    const m = /^\s*(\d+)\s*\/\s*(\d+|-+|—)?\s*$/.exec(String(str ?? ''));
    if (!m) return null;
    return { pre: Number(m[1]), post: /^\d+$/.test(m[2] ?? '') ? Number(m[2]) : null };
  },

  /**
   * The Edge of a drug item. ⚠ The packs stored it in `effect` (the upstream table's column name)
   * before `edge` existed, and world items keep that — so a legacy `effect` that PARSES as an Edge
   * is read; one that holds anything else ("Special", a damage code) is not.
   */
  drugEdge(sys) {
    return DrugRules.parseEdge(sys?.edge) ?? DrugRules.parseEdge(sys?.effect);
  },

  /** A drug's record key: the name, lower-cased, without the "(per dose)" packaging. */
  drugKey(name) {
    return String(name ?? '').toLowerCase().replace(/\((?:per|\d+)\s*dose[s]?\)/g, '')
      .normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'drug';
  },

  /** The effects entry for a drug name, or null. */
  effectsFor(name) {
    return DRUG_EFFECTS.find(e => e.match.test(String(name ?? '').trim())) ?? null;
  },

  /** A fresh record for a drug item's system data. */
  newSubstance(name, sys) {
    const base = DrugRules.parseAddiction(sys?.addiction);
    const tol  = num(String(sys?.tolerance ?? '').trim());
    return {
      name, doses: 0, base, current: { ...base },
      toleranceBase: tol, tolerance: tol, edge: DrugRules.drugEdge(sys), fixFactor: String(sys?.fixFactor ?? ''),
      addicted: { M: false, P: false }, formerly: { M: false, P: false },
      tolerant: false, toleranceDue: null,
      withdrawal: '', days: 0, recoveryDays: 0, active: null, crash: null,
    };
  },

  isAddicted(s) { return !!(s?.addicted?.M || s?.addicted?.P); },
  addictive(s)  { return TYPES.some(t => num(s?.base?.[t]) !== null); },

  /**
   * One dose · M&M pp.108-110. Returns `{ state, tests, raised, readdicted }`, where each test is
   * `{ kind: 'addiction', type, attr, tn }`; a tolerance test owed is left in `state.toleranceDue`.
   *
   * - **First use:** a test per addiction type against the BASE rating, and a tolerance test.
   * - **Every Edge doses** (pre- until addicted, post- after): Addiction and Tolerance +1 each;
   *   a type not yet addicted tests again at the MODIFIED rating, and tolerance tests again.
   * - **A dose during withdrawal, recovery or after kicking** re-addicts at once, +1 (p.110).
   *
   * ⚠ Edge counts TOTAL doses — *"Every time the number of applications taken equals a multiple
   * of the compound's (pre- or post-) Edge Rating"*. The book's Cram example agrees: dose 5 → 5,
   * then 10 doses later → 7.
   * ⚠ The tolerance test is made *"after the drug has been administered and its effects have
   * worn off"* — so it is recorded as due (`toleranceDue`), and offered when the drug wears off.
   */
  takeDose(state, sys = {}, name = '') {
    const s = state ? clone(state) : DrugRules.newSubstance(name, sys);
    const tests = [];
    const first = (s.doses ?? 0) === 0;
    s.doses = (s.doses ?? 0) + 1;

    // Relapse · p.110: a dose in withdrawal, recovery or after kicking re-addicts, rating +1.
    const wasHooked = TYPES.filter(t => s.addicted?.[t] || s.formerly?.[t]);
    let readdicted = false;
    if (wasHooked.length && (s.withdrawal || !DrugRules.isAddicted(s))) {
      for (const t of wasHooked) { s.addicted[t] = true; s.current[t] = (s.current[t] ?? s.base[t] ?? 0) + 1; }
      s.withdrawal = ''; s.days = 0; s.recoveryDays = 0;
      readdicted = true;
    }

    const edge = s.edge ? (DrugRules.isAddicted(s) ? s.edge.post : s.edge.pre) : null;
    const raised = !first && !!edge && s.doses % edge === 0;
    if (raised) {
      for (const t of TYPES) if (num(s.base[t]) !== null) s.current[t] = (s.current[t] ?? s.base[t]) + 1;
      if (num(s.tolerance) !== null) s.tolerance += 1;
    }

    if (first || raised) {
      for (const t of TYPES) {
        if (num(s.base[t]) === null || s.addicted[t]) continue;
        tests.push({ kind: 'addiction', type: t, attr: ADDICTION_ATTR[t], tn: first ? s.base[t] : s.current[t] });
      }
      if (num(s.tolerance) !== null && !s.tolerant) s.toleranceDue = s.tolerance;
    }
    return { state: s, tests, raised, readdicted };
  },

  /** An addiction test's result · p.108: one success stays clean; a failure addicts at base +1. */
  addictionResult(state, type, successes) {
    const s = clone(state);
    if ((Number(successes) || 0) >= 1) return { state: s, addicted: false };
    s.addicted[type] = true;
    s.current[type] = (s.base[type] ?? 0) + 1;
    return { state: s, addicted: true };
  },

  /** A tolerance test's result · p.109: NO successes and the character is immune to it. */
  toleranceResult(state, successes) {
    const s = clone(state);
    s.toleranceDue = null;
    if ((Number(successes) || 0) === 0) s.tolerant = true;
    return { state: s, tolerant: s.tolerant };
  },

  /**
   * The tests an addict makes against the CURRENT rating — to stretch a fix one Fix Factor period
   * (p.109), and the monthly Addiction Effects test (p.109, a failure costs a point of Body).
   */
  addictTests(state) {
    return TYPES.filter(t => state?.addicted?.[t])
      .map(t => ({ kind: 'addict', type: t, attr: ADDICTION_ATTR[t], tn: state.current?.[t] ?? state.base?.[t] ?? 0 }));
  },

  /**
   * Kicking the habit · p.109-110: a Willpower test against the current rating +1 (mental), +3
   * (physical) or +4 (both).
   * ⚠ With BOTH, the book names one "Addiction Rating" and the drug may carry two (Jazz 4M/5P) —
   * the higher is used here, and the TN is editable on the card.
   */
  kickTN(state) {
    const m = state?.addicted?.M ? (state.current?.M ?? 0) : null;
    const p = state?.addicted?.P ? (state.current?.P ?? 0) : null;
    if (m !== null && p !== null) return Math.max(m, p) + 4;
    if (p !== null) return p + 3;
    if (m !== null) return m + 1;
    return null;
  },

  /** Begin withdrawal — voluntary after kicking, or forced when no fix arrives (p.110). */
  startWithdrawal(state, forced = false) {
    const s = clone(state);
    s.withdrawal = forced ? 'forced' : 'withdrawal';
    s.days = 0;
    return s;
  },

  /**
   * One day passes · p.110. Voluntary withdrawal drops the rating 1 every TWO days; forced, 1
   * every day. At the base rating the character is no longer addicted and rests a number of days
   * equal to the Addiction Rating (recovery, +1 TN); then it is over.
   * ⚠ The rule sentence is followed, not the worked example: p.110 gives Twitch (13, base 4)
   * *"26 days (2 x 13)"*, which is 2 × the whole rating; the rule drops it to the base, 18 days.
   * The forced example (14 − 4 = 10 days) agrees with the rule.
   */
  passDay(state) {
    const s = clone(state);
    if (!s.withdrawal) return s;
    s.days = (s.days ?? 0) + 1;
    if (s.withdrawal === 'recovery') {
      if (s.days >= (s.recoveryDays ?? 0)) { s.withdrawal = ''; s.days = 0; s.recoveryDays = 0; }
      return s;
    }
    const drop = s.withdrawal === 'forced' ? 1 : (s.days % 2 === 0 ? 1 : 0);
    const hooked = TYPES.filter(t => s.addicted[t]);
    for (const t of hooked) s.current[t] = Math.max(s.base[t] ?? 0, (s.current[t] ?? 0) - drop);
    if (hooked.every(t => s.current[t] <= (s.base[t] ?? 0))) {
      for (const t of hooked) { s.addicted[t] = false; s.formerly[t] = true; }
      s.recoveryDays = Math.max(0, ...hooked.map(t => s.current[t] ?? 0));
      s.withdrawal = s.recoveryDays > 0 ? 'recovery' : '';
      s.days = 0;
    }
    return s;
  },

  /**
   * The standing target-number penalty · p.110 — withdrawal +2 (+4 concentration), forced +3 (+6),
   * recovery +1 (+2). `stunBoxes`: forced withdrawal *"will behave as if suffering the effects of
   * a persistent Moderate mental wound"* — 3 boxes on the Stun lookup, cumulative with real damage.
   */
  withdrawalPenalty(state) {
    switch (state?.withdrawal) {
      case 'withdrawal': return { tn: 2, concentration: 4, stunBoxes: 0 };
      case 'forced':     return { tn: 3, concentration: 6, stunBoxes: 3 };
      case 'recovery':   return { tn: 1, concentration: 2, stunBoxes: 0 };
      default:           return { tn: 0, concentration: 0, stunBoxes: 0 };
    }
  },

  /**
   * A duration, rolled · `d6()` returns 1-6. `{dice, mult, unit}` = mult × Nd6; `{base, minusBody,
   * min}` = base − Body (min); `{essencePlus, max}` = Essence + Nd6 (max); `{same}` = the drug's own.
   */
  rollDuration(spec, { body = 0, essence = 0 } = {}, d6 = () => Math.floor(Math.random() * 6) + 1) {
    if (!spec) return null;
    const unit = spec.unit === 'hr' ? 'hour' : 'minute';
    const plural = n => `${n} ${unit}${n === 1 ? '' : 's'}`;
    if (spec.dice) {
      const rolls = Array.from({ length: spec.dice }, d6);
      const amount = (spec.mult ?? 1) * rolls.reduce((a, b) => a + b, 0);
      return { amount, unit, text: plural(amount), how: `${spec.mult ?? 1} × ${spec.dice}D6 (${rolls.join(' + ')})` };
    }
    if (spec.minusBody) {
      const amount = Math.max(spec.min ?? 1, (spec.base ?? 0) - (Number(body) || 0));
      return { amount, unit, text: plural(amount), how: `${spec.base} − Body ${body}, minimum ${spec.min ?? 1}` };
    }
    if (spec.essencePlus) {
      const rolls = Array.from({ length: spec.essencePlus }, d6);
      const amount = Math.min(spec.max ?? Infinity, Math.floor(Number(essence) || 0) + rolls.reduce((a, b) => a + b, 0));
      return { amount, unit, text: plural(amount), how: `Essence ${Math.floor(Number(essence) || 0)} + ${spec.essencePlus}D6 (${rolls.join(' + ')})${spec.max ? `, maximum ${spec.max}` : ''}` };
    }
    return null;
  },

  /**
   * What every record adds up to, for `_prepareCharacter` · the active effects, the crashes, and
   * the withdrawal penalties. `{ attrs: {bod…wil}, rea, initDice, painResistance, tn,
   * concentration, stunBoxes, chaTo, wilHalf, sources: [{label, key, amount}] }`.
   * ⚠ Pain resistance from two drugs takes the LARGER, like the adept power beside it — the book
   * gives each as "equivalent to N levels of the adept power", not as something that stacks.
   */
  totals(substances) {
    const out = { attrs: { bod: 0, qui: 0, str: 0, cha: 0, int: 0, wil: 0 }, rea: 0, initDice: 0,
                  painResistance: 0, tn: 0, concentration: 0, stunBoxes: 0, chaTo: null, wilHalf: false, sources: [] };
    const add = (fx, label) => {
      for (const [k, v] of Object.entries(fx ?? {})) {
        if (!v) continue;
        if (k in out.attrs) out.attrs[k] += v;
        else if (k === 'rea' || k === 'initDice' || k === 'tn') out[k] += v;
        else if (k === 'painResistance') out.painResistance = Math.max(out.painResistance, v);
        else continue;
        out.sources.push({ label, key: k, amount: v });
      }
    };
    for (const s of Object.values(substances ?? {})) {
      if (!s) continue;
      const fx = DrugRules.effectsFor(s.name);
      if (s.active && fx?.effect) add(fx.effect, s.name);
      if (s.crash && fx?.crash) {
        add(fx.crash.effect, `${s.name} (crash)`);
        out.stunBoxes += fx.crash.stunBoxes ?? 0;
        if (fx.crash.chaTo !== undefined) out.chaTo = fx.crash.chaTo;
        if (fx.crash.wilHalf) out.wilHalf = true;
      }
      const w = DrugRules.withdrawalPenalty(s);
      if (w.tn) { out.tn += w.tn; out.concentration += w.concentration; out.sources.push({ label: `${s.name} (${s.withdrawal})`, key: 'tn', amount: w.tn }); }
      out.stunBoxes += w.stunBoxes;
    }
    return out;
  },
};
