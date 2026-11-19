/** An Orthodox host's Trigger Steps and IC · SR3 p.211-212 · TODO 128. */
import * as O from '../scripts/data/orthodox-sheaf.mjs';

export const name = 'orthodox-sheaf';

const seeded = seed => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export async function run(t) {
  const low = () => 0, high = () => 0.999999;
  // The p.211 Trigger Step Table: final range Blue 5-7, Green 4-6, Orange 3-5, Red 2-4.
  const range = code => [O.OrthodoxSheaf.stepGap(code, low), O.OrthodoxSheaf.stepGap(code, high)];
  t.eq('Blue gaps run 5-7', range('Blue'), [5, 7]);
  t.eq('Green gaps run 4-6', range('Green'), [4, 6]);
  t.eq('Orange gaps run 3-5', range('Orange'), [3, 5]);
  t.eq('Red gaps run 2-4', range('Red'), [2, 4]);
  t.eq('1D6 ÷ 2 rounds UP (a roll of 2 and a roll of 1 both give 1)', [O.OrthodoxSheaf.stepGap('Blue', () => 0.17), O.OrthodoxSheaf.stepGap('Blue', () => 0)], [5, 5]);

  const tallies = O.OrthodoxSheaf.rollTallies('Blue', 5, seeded(1));
  t.ok('tallies are cumulative and strictly rising', tallies.every((v, i) => i === 0 || v > tallies[i - 1]));
  t.eq('Blue minimum run is 5, 10, 15 …', O.OrthodoxSheaf.rollTallies('Blue', 3, low), [5, 10, 15]);
  t.eq('Red maximum run is 4, 8, 12 …', O.OrthodoxSheaf.rollTallies('Red', 3, high), [4, 8, 12]);

  t.eq('ratings ramp from SV−2 to SV over five IC', O.OrthodoxSheaf.rampRatings(8, 5), [6, 7, 7, 8, 8]);
  t.eq('one IC takes the Security Value', O.OrthodoxSheaf.rampRatings(8, 1), [8]);
  t.eq('two IC are SV−2 and SV', O.OrthodoxSheaf.rampRatings(8, 2), [6, 8]);
  t.eq('a tiny Security Value never goes below 1', O.OrthodoxSheaf.rampRatings(1, 3), [1, 1, 1]);
  t.eq('no IC, no ratings', O.OrthodoxSheaf.rampRatings(8, 0), []);

  const green = O.OrthodoxSheaf.plan({ code: 'Green', securityValue: 7, rng: seeded(2) });
  t.eq('Green: 2 any + 2 passive + 1 active = 5 IC', [green.ic.length, green.steps.length], [5, 5]);
  t.eq('the alert ladder runs any, any, passive, passive, active', green.rows.map(r => r.alertRequired), ['any', 'any', 'passive', 'passive', 'active']);
  t.ok('the third step carries the Passive Alert note, the fifth the Active', /Passive Alert/.test(green.rows[2].event) && /Active Alert/.test(green.rows[4].event));
  t.ok('only the first row of each alert carries its note', !/Alert/.test(green.rows[3].event) && !/Alert/.test(green.rows[0].event));
  t.ok('reactive IC come first: Probe, Scramble or Tar Baby', green.rows.slice(0, 2).every(r => ['Probe', 'Scramble', 'Tar Baby'].includes(r.icType) && !r.proactive));
  t.ok('later IC are proactive', green.rows.slice(2).every(r => r.proactive));
  t.ok('the first IC rates SV−2, the last SV', green.rows[0].rating === 5 && green.rows[4].rating === 7);
  t.ok('an event reads "Type-Rating"', green.rows.every(r => r.event.startsWith(`${r.icType}-${r.rating}`)));
  t.eq('steps are what the host sheet stores', Object.keys(green.steps[0]).sort(), ['event', 'tally']);
  t.eq('a Blue host has 3 IC and only reaches passive alert',
    O.OrthodoxSheaf.plan({ code: 'Blue', securityValue: 5, rng: seeded(3) }).rows.map(r => r.alertRequired), ['any', 'any', 'passive']);
  t.eq('a Red host has three IC on active alert',
    O.OrthodoxSheaf.plan({ code: 'Red', securityValue: 9, rng: seeded(4) }).ic.filter(i => i.alertRequired === 'active').length, 3);
  t.eq('an unknown code is read as Green', O.OrthodoxSheaf.plan({ code: 'Plaid', securityValue: 6, rng: seeded(5) }).ic.length, 5);
  t.ok('no IC repeats inside one alert group where the pool allows', (() => {
    const p = O.OrthodoxSheaf.plan({ code: 'Orange', securityValue: 8, rng: seeded(6) });
    const g = a => p.rows.filter(r => r.alertRequired === a).map(r => r.icType);
    return new Set(g('any')).size === g('any').length && new Set(g('passive')).size === g('passive').length;
  })());
  t.ok('every type the plan can pick is one the Orthodox IC sheet knows', (() => {
    const known = new Set(['Probe', 'Trace', 'Blaster', 'Crippler', 'Tar Baby', 'Scramble', 'Killer', 'Ripper', 'Marker', 'Sparky']);
    return Object.values(O.TYPES_BY_ALERT).flat().every(x => known.has(x));
  })());
}
