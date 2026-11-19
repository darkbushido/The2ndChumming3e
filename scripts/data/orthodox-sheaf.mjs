/**
 * An Orthodox SR3 host's Security Sheaf — Trigger Steps and IC · SR3 p.211-212 · TODO 128. Pure.
 *
 * What the book fixes (SR3 p.211, "Trigger Steps"):
 *   · each step adds **1D6 ÷ 2** plus a modifier by security code to the PREVIOUS step — Blue +4 (final range 5-7), Green
 *     +3 (4-6), Orange +2 (3-5), Red +1 (2-4). Rounding up is what makes those printed ranges come out (1D6 ÷ 2 → 1-3).
 *   · no alert runs REACTIVE IC; "in a typical security sheaf, the third or fourth trigger step activates a passive
 *     alert", under which steps "typically activate proactive white or gray IC"; active alert comes "on the second or
 *     third trigger step after the system goes to passive alert" and brings proactive and "sometimes black" IC (p.211-212).
 *   · Killer, Blaster, Ripper, Crippler, Sparky are proactive; Probe, Scramble, Tar Baby (and Tar Pit) reactive (p.227-231).
 *
 * What the book does NOT fix, and the maintainer ruled (2026-11-19) — all of it a STARTING POINT the dialog shows editable:
 *   · IC Rating: ramps from Security Value − 2 on the first IC up to the Security Value on the last (the p.211 sample
 *     climbs Probe-5, Probe-7, Killer-8, Killer-10; the Security Value is the IC's attack and resistance dice, p.212).
 *   · which types at which alert, and how many per code (`COUNTS`) — the alert ladder above, more IC on higher codes.
 *   · Black IC is left out: the Orthodox IC sheet has no Black type yet (TODO 128).
 */
import { dice } from './matrix-generator.mjs';

export const STEP_MODIFIER = { Blue: 4, Green: 3, Orange: 2, Red: 1 };
export const CODES = Object.keys(STEP_MODIFIER);

/** The types the ladder draws from, in the order of the book's alert ladder. */
export const TYPES_BY_ALERT = {
  any:     ['Probe', 'Scramble', 'Tar Baby'],
  passive: ['Crippler', 'Ripper', 'Blaster', 'Killer'],
  active:  ['Killer', 'Blaster', 'Sparky'],
};
export const REACTIVE = new Set(['Probe', 'Trace', 'Scramble', 'Tar Baby']);

/** IC per alert level by security code — a starting point: the book says only that higher codes keep more IC. */
export const COUNTS = {
  Blue:   { any: 2, passive: 1, active: 0 },
  Green:  { any: 2, passive: 2, active: 1 },
  Orange: { any: 2, passive: 2, active: 2 },
  Red:    { any: 2, passive: 2, active: 3 },
};

const ALERT_NOTE = { passive: 'Passive Alert', active: 'Active Alert' };

/** One Trigger Step gap — SR3 p.211: 1D6 ÷ 2 (rounded up) + the code's modifier. */
export function stepGap(code, rng = Math.random) {
  return Math.ceil(dice(1, 6, rng) / 2) + (STEP_MODIFIER[code] ?? STEP_MODIFIER.Green);
}

/** `n` cumulative Trigger Step tallies — each is the previous plus a fresh gap. */
export function rollTallies(code, n, rng = Math.random) {
  const out = [];
  let tally = 0;
  for (let i = 0; i < n; i++) { tally += OrthodoxSheaf.stepGap(code, rng); out.push(tally); }
  return out;
}

/** Ratings ramp Security Value − 2 → Security Value over `n` IC (never below 1). */
export function rampRatings(securityValue, n) {
  const sv = Math.max(1, Math.round(Number(securityValue) || 1));
  if (n <= 0) return [];
  if (n === 1) return [sv];
  return Array.from({ length: n }, (_, k) => Math.max(1, Math.round(sv - 2 + (2 * k) / (n - 1))));
}

/** Draw `count` types from a pool without repeats until it runs out, then again. */
function draw(pool, count, rng) {
  const out = [];
  let bag = [];
  for (let i = 0; i < count; i++) {
    if (!bag.length) bag = [...pool];
    out.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]);
  }
  return out;
}

/**
 * The whole proposal for an Orthodox host: `rows` in step order, each
 * `{ icType, rating, alertRequired, proactive, tally, event }`, plus `steps` (`{tally, event}` — what the host sheet
 * stores) and `ic` (what `orthodoxActiveIC` / the IC actors need). The first passive row carries the "Passive Alert" note
 * and the first active row the "Active Alert" one, so the third step goes passive and the fifth active on the usual shape.
 */
export function plan({ code = 'Green', securityValue = 6, rng = Math.random } = {}) {
  const counts = COUNTS[code] ?? COUNTS.Green;
  const levels = ['any', 'passive', 'active'];
  const types = levels.flatMap(level => draw(TYPES_BY_ALERT[level], counts[level], rng).map(icType => ({ icType, alertRequired: level })));
  const ratings = OrthodoxSheaf.rampRatings(securityValue, types.length);
  const tallies = OrthodoxSheaf.rollTallies(code, types.length, rng);
  const seen = new Set();
  const rows = types.map((t, i) => {
    const note = ALERT_NOTE[t.alertRequired] && !seen.has(t.alertRequired) ? ALERT_NOTE[t.alertRequired] : '';
    seen.add(t.alertRequired);
    return {
      ...t, rating: ratings[i], proactive: !REACTIVE.has(t.icType), tally: tallies[i],
      event: `${t.icType}-${ratings[i]}${note ? ` / ${note}` : ''}`,
    };
  });
  return {
    rows,
    steps: rows.map(r => ({ tally: r.tally, event: r.event })),
    ic: rows.map(({ icType, rating, alertRequired, proactive }) => ({ icType, rating, alertRequired, proactive })),
  };
}

export const OrthodoxSheaf = { STEP_MODIFIER, TYPES_BY_ALERT, COUNTS, REACTIVE, stepGap, rollTallies, rampRatings, plan };
