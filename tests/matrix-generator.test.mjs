/** Matrix host generator numbers · SR3 p.205 (Host Rating Table) · MDF p.24 (Memory). */
import { readFileSync } from 'node:fs';
import * as G from '../scripts/data/matrix-generator.mjs';

export const name = 'matrix-generator';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/** Small deterministic generator (mulberry32) so a failure reproduces. */
const seeded = seed => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export async function run(t) {
  // Extremes: rng 0 → every die 1, rng just under 1 → every die at its maximum.
  const low = () => 0, high = () => 0.999999;
  const ext = (difficulty, rng) => G.rollOrthodoxHost({ difficulty, rng });
  t.eq('Easy minimum: SV 4, subsystems 8', [ext('Easy', low).orthodoxSecurityValue, ext('Easy', low).orthodoxSubsystems.access], [4, 8]);
  t.eq('Easy maximum: SV 6, subsystems 10', [ext('Easy', high).orthodoxSecurityValue, ext('Easy', high).orthodoxSubsystems.slave], [6, 10]);
  t.eq('Average minimum: SV 7, subsystems 11', [ext('Average', low).orthodoxSecurityValue, ext('Average', low).orthodoxSubsystems.index], [7, 11]);
  t.eq('Average maximum: SV 9, subsystems 15', [ext('Average', high).orthodoxSecurityValue, ext('Average', high).orthodoxSubsystems.files], [9, 15]);
  t.eq('Hard minimum: SV 8, subsystems 13', [ext('Hard', low).orthodoxSecurityValue, ext('Hard', low).orthodoxSubsystems.control], [8, 13]);
  t.eq('Hard maximum: SV 12, subsystems 18', [ext('Hard', high).orthodoxSecurityValue, ext('Hard', high).orthodoxSubsystems.access], [12, 18]);

  const rng = seeded(1);
  let inRange = true;
  for (let i = 0; i < 200; i++) {
    const h = G.rollOrthodoxHost({ difficulty: 'Average', rng });
    if (h.orthodoxSecurityValue < 7 || h.orthodoxSecurityValue > 9) inRange = false;
    if (Object.values(h.orthodoxSubsystems).some(v => v < 11 || v > 15)) inRange = false;
  }
  t.ok('200 Average hosts stay inside the printed ranges', inRange);

  const h = G.rollOrthodoxHost({ difficulty: 'Hard', code: 'Red', rng: seeded(2) });
  t.eq('all five subsystems are present', Object.keys(h.orthodoxSubsystems).sort(), ['access', 'control', 'files', 'index', 'slave']);
  t.eq('the code is carried', h.orthodoxSecurityCode, 'Red');
  t.eq('an unknown code falls back to Green', G.rollOrthodoxHost({ code: 'Plaid', rng: low }).orthodoxSecurityCode, 'Green');
  t.eq('an unknown difficulty is treated as Average', G.rollOrthodoxHost({ difficulty: 'Nope', rng: low }).orthodoxSecurityValue, 7);

  // Defragged
  const d = G.rollDefraggedHost({ systemRating: 6, tier: 'Orange' });
  t.eq('Memory is System Rating × 500, MDF p.24', d.memoryTotal, 3000);
  t.eq('tier fills threshold and colour', [d.securityTierName, d.securityTierThreshold, d.securityTierColor], ['Orange', 3, '#dd6600']);
  t.eq('no tier given: the sheet\'s rating → tier suggestion', G.rollDefraggedHost({ systemRating: 9 }).securityTierName, 'Red');
  t.eq('rating is clamped to the model\'s 1–12', [G.rollDefraggedHost({ systemRating: 40 }).systemRating, G.rollDefraggedHost({ systemRating: 0 }).systemRating], [12, 1]);
  t.eq('a rolled rating is 4–9', [G.rollDefraggedHost({ rng: low }).systemRating, G.rollDefraggedHost({ rng: high }).systemRating], [4, 9]);
  t.eq('rating → tier follows the sheet', [1, 3, 5, 7, 9, 11, 12].map(G.suggestTier),
    ['Ivory', 'Blue', 'Green', 'Orange', 'Red', 'Black', 'Ultraviolet']);

  // IC proposal
  t.eq('an Ivory host fields no IC', G.suggestICCount('Ivory', 1), 0);
  t.eq('a Green rating-6 host fields 3 IC', G.suggestICCount('Green', 6), 3);
  t.eq('a Blue rating-2 host still fields 1', G.suggestICCount('Blue', 2), 1);
  t.ok('Black hosts may field Black IC, Green may not', G.IC_BY_TIER.Black.includes('Black') && !G.IC_BY_TIER.Green.includes('Black'));

  // The tier table must not drift from the host sheet's own.
  const sheet = read('scripts/sheets/SR3EHostSheet.js');
  const same = Object.entries(G.TIER_DATA).every(([name, v]) =>
    sheet.includes(`${name}:`) && sheet.includes(`color: '${v.color}', threshold: ${v.threshold}`));
  t.ok('TIER_DATA matches the host sheet\'s TIER_DATA', same);
}
