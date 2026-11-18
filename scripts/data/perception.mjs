/**
 * The Perception Test · SR3 p.231-232 — TODO 304. Pure: no Foundry.
 *
 * - p.231: *"The character's Intelligence Rating determines the number of dice to roll; the target number
 *   depends on the circumstances."* Base Target Number 4, modified by the Perception Test Modifiers Table.
 *   Things with their own number (a gun's Concealability) are tested against that number instead.
 * - p.231: a group test rolls the team's AVERAGE Intelligence plus one die per member — never when surprise
 *   is possible.
 * - p.232: the Perception Success Table — one success means *something* is there.
 * - p.232 footnote: visibility comes from the Visibility Table (p.111) — `SR3ECombatModifiers.visibilityModifier`.
 *   A slashed cell is cybernetic/natural vision.
 * - Enhanced Perception (adept, SR3 p.169) adds dice through the `perception` situational bonus.
 *
 * The system presents dice; the GM sets the number and reads the result. Nothing here decides an outcome.
 */

export const BASE_TN = 4;
export const MIN_TN = 2;

/** The Perception Test Modifiers Table · SR3 p.232, without the Visibility rows (those are p.111's table). */
export const PERCEPTION_MODIFIERS = Object.freeze([
  { key: 'distracted',    sense: 'any',   label: 'Perceiver is distracted',               mod: +2 },
  { key: 'verySmall',     sense: 'sight', label: 'Very small object',                     mod: +6 },
  { key: 'partHidden',    sense: 'sight', label: 'Object partially hidden',               mod: +2 },
  { key: 'bright',        sense: 'sight', label: 'Object brightly colored',               mod: -2 },
  { key: 'obvious',       sense: 'sight', label: 'Action very obvious',                   mod: -4 },
  { key: 'notObvious',    sense: 'sight', label: 'Action not obvious',                    mod: +4 },
  { key: 'gunshot',       sense: 'sound', label: 'Single gunshot',                        mod: -2 },
  { key: 'silencedShot',  sense: 'sound', label: 'Silenced single gunshot',               mod: 0 },
  { key: 'burst',         sense: 'sound', label: 'Burst fire',                            mod: -4 },
  { key: 'suppBurst',     sense: 'sound', label: 'Sound-suppressed burst fire',           mod: -2 },
  { key: 'auto',          sense: 'sound', label: 'Full autofire',                         mod: -6 },
  { key: 'suppAuto',      sense: 'sound', label: 'Sound-suppressed autofire',             mod: -4 },
  { key: 'grenade',       sense: 'sound', label: 'Grenade blast',                         mod: -8 },
  { key: 'yell',          sense: 'sound', label: 'A person’s yell',                  mod: -2 },
  { key: 'roomsAway',     sense: 'sound', label: 'Sound is rooms away',                   mod: +2 },
  { key: 'sameFloor',     sense: 'sound', label: 'Sound is on same floor',                mod: +4 },
  { key: 'floorsAway',    sense: 'sound', label: 'Sound is floors away',                  mod: +6 },
  // "Rating, or –2": an enhancement's rating as a reduction, else −2. Entered as a number by the player.
  { key: 'soundEnhance',  sense: 'sound', label: 'Perceiver has active sound enhancements', mod: null },
  { key: 'odorObvious',   sense: 'smell', label: 'Odor obvious',                          mod: -4 },
  { key: 'otherOdors',    sense: 'smell', label: 'Other odors present',                   mod: +2 },
  { key: 'tempExtreme',   sense: 'touch', label: 'Temperature extreme (hot or cold)',     mod: -4 },
  { key: 'gloves',        sense: 'touch', label: 'Perceiver wearing gloves',              mod: +2 },
  { key: 'tasteObvious',  sense: 'taste', label: 'Taste obvious',                         mod: -4 },
  { key: 'cold',          sense: 'taste', label: 'Perceiver has a cold',                  mod: +2 },
]);

export const SENSES = Object.freeze(['sight', 'sound', 'smell', 'touch', 'taste']);

/** "Rating, or –2" (p.232): a sound enhancement's rating as a reduction; with no rating, −2. */
export function soundEnhanceMod(rating) {
  const r = Math.trunc(Number(rating));
  return Number.isFinite(r) && r > 0 ? -r : -2;
}

/** The table rows a sense offers: its own plus the "any" rows. */
export function modifiersFor(sense) {
  return PERCEPTION_MODIFIERS.filter(m => m.sense === 'any' || m.sense === sense);
}

/**
 * The target number. `base` defaults to 4 (p.231) — or an item's own number (Concealability). Every number is
 * the GM's to change; the sum is floored at 2 like every SR3 target number.
 * @param {{base?:number, picks?:string[], soundRating?:number, visibility?:number, extra?:number}} o
 */
export function targetNumber({ base = BASE_TN, picks = [], soundRating = 0, visibility = 0, extra = 0 } = {}) {
  const b = Number.isFinite(Number(base)) && String(base) !== '' ? Math.trunc(Number(base)) : BASE_TN;
  let tn = b + (Math.trunc(Number(visibility)) || 0) + (Math.trunc(Number(extra)) || 0);
  for (const k of picks) {
    const row = PERCEPTION_MODIFIERS.find(m => m.key === k);
    if (!row) continue;
    tn += row.mod == null ? soundEnhanceMod(soundRating) : row.mod;
  }
  return Math.max(MIN_TN, tn);
}

/**
 * The dice: Intelligence, plus Enhanced Perception (the `perception` situational bonus, already capped at
 * derivation, SR3 p.169), plus any complementary or extra dice the player adds (p.231, p.97).
 */
export function dicePool({ intelligence = 0, situational = 0, extra = 0 } = {}) {
  const n = (Math.trunc(Number(intelligence)) || 0) + (Math.trunc(Number(situational)) || 0) + (Math.trunc(Number(extra)) || 0);
  return Math.max(0, n);
}

/** A group Perception Test (p.231): the average Intelligence (rounded down) plus one die per member. */
export function groupDice(intelligences = []) {
  const v = intelligences.map(Number).filter(Number.isFinite);
  if (!v.length) return 0;
  return Math.floor(v.reduce((a, b) => a + b, 0) / v.length) + v.length;
}

/** The Perception Success Table · SR3 p.232. */
export function successLine(successes) {
  const s = Math.max(0, Math.trunc(Number(successes) || 0));
  if (s === 0) return 'Nothing noticed.';
  if (s === 1) return 'Something is there.';
  if (s === 2) return 'Something is definitely there, and the perceiver suspects what general type of thing it is.';
  if (s === 3) return 'The perceiver knows what type of thing it is and suspects its exact nature.';
  return 'The perceiver knows what it is, but has no specifics without further information or examination.';
}

export const Perception = { BASE_TN, MIN_TN, PERCEPTION_MODIFIERS, SENSES, soundEnhanceMod, modifiersFor,
  targetNumber, dicePool, groupDice, successLine };
