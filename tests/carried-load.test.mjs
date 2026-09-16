/**
 * Carried load and Encumbrance · SR3 p.274 (TODO 126).
 *
 * ⚠ The book calls this optional — "the gamemaster can impose the following Encumbrance rules". Nothing
 * is enforced; the Gear tab shows the load and the tier.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { CarriedLoad, PAGE } from '../scripts/data/carried-load.mjs';

export const name = 'carried-load';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const C = CarriedLoad;
  const item = (type, system) => ({ type, system });

  /* ── What each item weighs ────────────────────────────────────────────────── */
  t.is('a weapon weighs its own weight', C.itemWeight(item('firearm', { weight: 2.5 })), 2.5);
  t.is('armour too', C.itemWeight(item('armor', { weight: 5 })), 5);
  t.is('five grenades at 0.5 weigh 2.5', C.itemWeight(item('thrown', { weight: 0.5, quantity: 5 })), 2.5);
  t.is('gear with no quantity counts once', C.itemWeight(item('gear', { weight: 3 })), 3);
  t.is('installed cyberware weighs nothing — it is not carried', C.itemWeight(item('cyberware', { weight: 4 })), 0);
  t.is('…nor does bioware, or a spell', C.itemWeight(item('bioware', { weight: 2 })) + C.itemWeight(item('spell', { weight: 9 })), 0);

  /* ── Ammunition is per round, so spending it lightens the load (TODO 126) ─── */
  t.is('50 APDS rounds at 0.025 weigh 1.25', C.itemWeight(item('ammunition', { weight: 0.025, countedIn: 'rounds', rounds: 50 })), 1.25);
  t.is('…10 left weigh 0.25', C.itemWeight(item('ammunition', { weight: 0.025, countedIn: 'rounds', rounds: 10 })), 0.25);
  t.is('four 10-round clips at 1.25 weigh 5', C.itemWeight(item('ammunition', { weight: 1.25, countedIn: 'reloads', reloads: 4 })), 5);
  t.is('an empty stock weighs nothing', C.itemWeight(item('ammunition', { weight: 1.25, countedIn: 'reloads', reloads: 0 })), 0);
  t.is('a total adds them up', C.total([item('firearm', { weight: 2.5 }), item('ammunition', { weight: 0.025, countedIn: 'rounds', rounds: 100 })]), 5);

  /* ── The tiers · p.274 ────────────────────────────────────────────────────── */
  t.eq('Strength 4: 20 / 40 / 60 / 80 kg', C.limits(4), { free: 20, light: 40, moderate: 60, serious: 80 });
  const at = (kg, str = 4, body = 4) => C.encumbrance(str, kg, body).key;
  t.is('exactly Strength × 5 is still free — "up to"', at(20), 'free');
  t.is('…a hair over is the Light tier', at(20.1), 'light');
  t.is('Strength × 10 exactly is still Light', at(40), 'light');
  t.is('over that is Moderate', at(40.1), 'moderate');
  t.is('over Strength × 15 is Serious', at(60.1), 'serious');
  t.is('over Strength × 20 the character passes out', at(80.1), 'collapse');
  const light = C.encumbrance(4, 30, 8);
  t.eq('the Light tier is a Stun wound, after (Body) Combat Turns — the book\'s Body 8 example',
    [light.wound, light.afterTurns], ['Light', 8]);
  t.ok('…and says what it costs', /box of Stun/.test(light.note));
  t.ok('Moderate halves movement and forbids running', /cannot run/.test(C.encumbrance(4, 50, 4).note) && /halved/.test(C.encumbrance(4, 50, 4).note));
  t.ok('Serious quarters it', /quartered/.test(C.encumbrance(4, 70, 4).note));
  t.is('Strength 0 is encumbered by anything at all', at(0.1, 0), 'collapse');
  t.is('the page is cited', PAGE, 'SR3 p.274');

  /* ── The shipped ammunition carries per-round weights ──────────────────────── */
  const root = new URL('../packs-src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  let bolts = null, apds = null, clip = null;
  for (const f of readdirSync(`${root}sr3e-sr3-ammunition`)) {
    const doc = JSON.parse(readFileSync(`${root}sr3e-sr3-ammunition/${f}`, 'utf8')).doc;
    if (doc.name === '10 Bolts')           bolts = doc.system;
    if (doc.name === 'APDS Rnds')          apds  = doc.system;
    if (doc.name === '10-Rnd Clip (APDS)') clip  = doc.system;
  }
  t.is('"10 Bolts" stores the weight of ONE bolt', bolts?.weight, 0.05);
  t.is('…which is what a single "Bolts" row says too', C.itemWeight({ type: 'ammunition', system: bolts }), 0.5);
  t.is('APDS rounds are 0.025 each', apds?.weight, 0.025);
  t.is('a 10-round clip is 1 kg, per clip', C.itemWeight({ type: 'ammunition', system: clip }), 1);

  /* ── The wiring, source-level ─────────────────────────────────────────────── */
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the Gear tab totals what is NOT stored', /const carried = actor\.items\.filter\(i => !i\.getFlag\('The2ndChumming3e', 'stored'\)\)/.test(sheet)
    && /CarriedLoad\.total\(carried\)/.test(sheet));
  t.ok('…and shows the tier, as the GM\'s call', /CarriedLoad\.encumbrance\(/.test(sheet) && /the GM's call/.test(sheet));
  t.ok('the builder stores ammunition weight per round', /Ammunition weight is PER ROUND/.test(read('tools/build-default-gear.mjs')));
}
