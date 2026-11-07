/** Overwatch's crash trigger and Suppression · MDF p.22, p.26 · TODO 128. */
import { readFileSync } from 'node:fs';
import { OverwatchCrash } from '../scripts/data/overwatch-crash.mjs';

export const name = 'overwatch-crash';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  t.eq('an unsuppressed crash costs 1 Overwatch', OverwatchCrash.resolve({}),
    { overwatch: 1, degrade: 0, suppressed: false, newRating: 0 });
  t.eq('Suppression: no Overwatch, degrade 1 point', OverwatchCrash.resolve({ suppressionRating: 4, suppress: true }),
    { overwatch: 0, degrade: 1, suppressed: true, newRating: 3 });
  t.eq('choosing Suppression without the program still costs Overwatch',
    OverwatchCrash.resolve({ suppressionRating: 0, suppress: true }).overwatch, 1);
  t.eq('having Suppression but declining it costs Overwatch',
    OverwatchCrash.resolve({ suppressionRating: 4, suppress: false }).overwatch, 1);
  t.eq('degraded currentRating wins over rating',
    OverwatchCrash.effectiveRating({ rating: 5, currentRating: 2 }), 2);
  t.eq('no currentRating falls back to rating', OverwatchCrash.effectiveRating({ rating: 5 }), 5);
  t.eq('finds Suppression by name', OverwatchCrash.findSuppression(
    [{ name: 'Browse', system: { rating: 3 } }, { name: 'Suppression', system: { rating: 2 } }])?.name, 'Suppression');
  t.eq('a rating-0 Suppression is not usable', OverwatchCrash.findSuppression(
    [{ name: 'Suppression', system: { rating: 0 } }]), null);

  const sheet = read('scripts/documents/SR3EActor.js');
  const main = read('scripts/sr3e.js');
  t.ok('the IC wound card offers the crash button', /sr-icon-crash-btn/.test(sheet));
  t.ok('the crash button is wired and gated in sr3e.js', /\.sr-icon-crash-btn/.test(main));
  t.ok('the crash goes through _incrementOverwatch', /handleIconCrashClick[\s\S]*_incrementOverwatch/.test(sheet));
}
