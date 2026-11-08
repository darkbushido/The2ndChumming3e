/**
 * Matrix host generator — pure rules, no Foundry. The sidebar buttons (`SR3EMatrixGenerator.js`) call these and
 * create the documents; every number is rolled HERE so it can be tested.
 *
 * ⚠ The generator only PROPOSES. The dialog shows the rolled values editable, the GM changes what they like, and
 * nothing is applied to a character (warn, never refuse; offer, never apply).
 *
 * Orthodox SR3 — Host Rating Table, SR3 p.205 (PDF p.207):
 *     Intrusion Difficulty | Security Value | Subsystem Ratings
 *     Easy                 | 1D3 + 3        | 1D3 + 7
 *     Average              | 1D3 + 6        | 2D3 + 9
 *     Hard                 | 2D3 + 6        | 1D6 + 12
 * The book does NOT pair a security code with a difficulty ("Intrusion Difficulty is based on …" the host's use).
 * `SUGGESTED_DIFFICULTY` below is a starting point for the dialog, not a rule.
 *
 * Matrix Defragged v2 — Memory is System Rating × 500 Mp (MDF p.24); the tier names, thresholds and colours are the
 * host sheet's own table (MDF p.7-8), and the rating → tier suggestion is the sheet's (`SR3EHostSheet` rating input).
 */

import { AGENT_IC, PASSIVE_IC, icMemory } from './ic-memory.mjs';
export { AGENT_IC, PASSIVE_IC, icMemory };

export const DIFFICULTIES = ['Easy', 'Average', 'Hard'];
export const ORTHODOX_CODES = ['Blue', 'Green', 'Orange', 'Red'];
export const SUBSYSTEMS = ['access', 'control', 'index', 'files', 'slave'];

/** A starting point only — SR3 p.205 gives no pairing. */
export const SUGGESTED_DIFFICULTY = { Blue: 'Easy', Green: 'Average', Orange: 'Average', Red: 'Hard' };

/** Tier → threshold and colour, identical to `TIER_DATA` in the host sheet (a test compares them). */
export const TIER_DATA = {
  Ivory:       { color: '#e8e4d4', threshold: 0 },
  Blue:        { color: '#3377cc', threshold: 1 },
  Green:       { color: '#00aa44', threshold: 2 },
  Orange:      { color: '#dd6600', threshold: 3 },
  Red:         { color: '#cc2222', threshold: 4 },
  Black:       { color: '#222222', threshold: 5 },
  Ultraviolet: { color: '#8800dd', threshold: 6 },
};

/** `n` dice of `sides` sides. `rng` is injectable so tests are deterministic. */
export function dice(n, sides, rng = Math.random) {
  let total = 0;
  for (let i = 0; i < n; i++) total += 1 + Math.floor(rng() * sides);
  return total;
}

const FORMULAS = {
  Easy:    { value: [1, 3, 3],  subsystem: [1, 3, 7] },
  Average: { value: [1, 3, 6],  subsystem: [2, 3, 9] },
  Hard:    { value: [2, 3, 6],  subsystem: [1, 6, 12] },
};
const roll = ([n, sides, plus], rng) => dice(n, sides, rng) + plus;

/** The Orthodox host numbers for one Intrusion Difficulty. Each subsystem is rolled on its own. */
export function rollOrthodoxHost({ difficulty = 'Average', code = 'Green', rng = Math.random } = {}) {
  const f = FORMULAS[difficulty] ?? FORMULAS.Average;
  const subsystems = {};
  for (const s of SUBSYSTEMS) subsystems[s] = roll(f.subsystem, rng);
  return {
    orthodoxSecurityCode:  ORTHODOX_CODES.includes(code) ? code : 'Green',
    orthodoxSecurityValue: roll(f.value, rng),
    orthodoxSubsystems:    subsystems,
  };
}

/** The sheet's own rating → tier suggestion (a starting point the GM overrides). */
export function suggestTier(systemRating) {
  const r = Number(systemRating) || 1;
  return r <= 1 ? 'Ivory' : r <= 3 ? 'Blue' : r <= 5 ? 'Green' : r <= 7 ? 'Orange'
       : r <= 9 ? 'Red' : r <= 11 ? 'Black' : 'Ultraviolet';
}

/** The Defragged host numbers. Rating defaults to 1D6+3 (4–9), the range the tier table spans in play. */
export function rollDefraggedHost({ systemRating, tier, rng = Math.random } = {}) {
  const rating = Math.max(1, Math.min(12, Math.round(systemRating ?? (dice(1, 6, rng) + 3))));
  const name = TIER_DATA[tier] ? tier : suggestTier(rating);
  const t = TIER_DATA[name];
  return {
    systemRating:          rating,
    securityTierName:      name,
    securityTierColor:     t.color,
    securityTierThreshold: t.threshold,
    mainframeSupport:      false,
    memoryTotal:           rating * 500,       // MDF p.24
  };
}

/**
 * Which grading of IC a host of this tier would plausibly field — a SUGGESTION for the dialog.
 * MDF p.24: Gray and Black IC need Mainframe Support (the stocking report names them).
 */
export const IC_BY_TIER = {
  Ivory: [], Blue: ['White'], Green: ['White'], Orange: ['White', 'Gray'],
  Red: ['White', 'Gray'], Black: ['Gray', 'Black'], Ultraviolet: ['Gray', 'Black'],
};

/** How many IC to deploy by default: one per two points of rating, at least 1 unless the host is Ivory. */
export function suggestICCount(tier, rating) {
  if (!(IC_BY_TIER[tier]?.length)) return 0;
  return Math.max(1, Math.floor((rating ?? 4) / 2));
}

/**
 * A proposed IC set for a host — a SUGGESTION the dialog shows editable (offer, never apply).
 *
 * Each IC is picked from the book's agents (`AGENT_IC`, MDF pp.40-44) whose grading the tier plausibly fields
 * (`IC_BY_TIER`), at the host's System Rating (the `ic` actor's own convention: `systemRating`/`rating`), costing
 * `icMemory` Mp (Rating² × Final Multiplier, MDF p.33). Stocking is bounded by the host's Memory, System Rating × 500
 * (MDF p.24): the proposal stops adding IC before it would exceed `memoryTotal`. Gray and Black IC need the Mainframe
 * Support module (MDF p.24), so `needsMainframe` says so — the generator never switches it on.
 */
export function proposeIC({ tier, systemRating, memoryTotal, count, rng = Math.random } = {}) {
  const rating = Math.max(1, Math.round(Number(systemRating) || 1));
  const gradings = IC_BY_TIER[tier] ?? [];
  const pool = Object.keys(AGENT_IC).filter(n => gradings.includes(AGENT_IC[n].grading));
  const want = count ?? suggestICCount(tier, rating);
  const budget = memoryTotal ?? rating * 500;
  const picks = [];
  let used = 0;
  const left = [...pool];
  while (picks.length < want && left.length) {
    const name = left.splice(Math.floor(rng() * left.length), 1)[0];
    const memoryRequired = icMemory(name, rating);
    if (used + memoryRequired > budget) continue;          // too big for what is left — try another
    picks.push({ name, grading: AGENT_IC[name].grading, rating, memoryRequired });
    used += memoryRequired;
  }
  return { ic: picks, used, total: budget, needsMainframe: picks.some(p => p.grading !== 'White') };
}
