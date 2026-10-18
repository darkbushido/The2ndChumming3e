/**
 * APDS against vehicles and drones · SR3 p.116: "APDS halves (round down) the Ballistic Rating of armor … APDS
 * ammunition is not anti-vehicular and is therefore treated as normal ammunition against vehicles and drones."
 */
import { readFileSync } from 'node:fs';
const { Apds } = await import('../scripts/data/apds.mjs');

export const name = 'apds';

export async function run(t) {
  t.eq('APDS halves a person\'s Ballistic, round down: 5 → 2', [Apds.resolve(5, false).ballistic, Apds.resolve(5, false).halved], [2, true]);
  t.is('…8 → 4', Apds.resolve(8, false).ballistic, 4);
  t.eq('against a vehicle or drone the Armor stands: 6 → 6', [Apds.resolve(6, true).ballistic, Apds.resolve(6, true).halved], [6, false]);
  t.ok('…and the card says why', /not anti-vehicular/.test(Apds.resolve(6, true).note));
  const src = readFileSync(new URL('../scripts/documents/SR3EActor.js', import.meta.url), 'utf8');
  t.ok('the soak card asks Apds.resolve with whether the target is a vehicle', /Apds\.resolve\(ballistic, this\.type === 'vehicle'\)/.test(src));
}
