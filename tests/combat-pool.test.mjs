/**
 * Combat Pool and why it is lower · SR3 p.282 (gyro), p.285 (armour), p.169 (Combat Sense) — TODO 213.
 *
 * The reported case: Quickness 4, Intelligence 4, Willpower 2 → ⌊10 ÷ 2⌋ = 5, a worn Gyro Mount halves it to
 * ⌊5 ÷ 2⌋ = 2, and the sheet said nothing. `derived.combatPoolBeforeGyro` was computed and never read.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CombatPool } from '../scripts/data/combat-pool.mjs';

export const name = 'combat-pool';
const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

export async function run(t) {
  const C = CombatPool;
  /* ── the figure: the numbers prepareDerivedData always produced ── */
  t.eq('no extras: the base', C.figure({ base: 5 }), { full: 5, total: 5 });
  t.eq('the reported case: 5 halved by a gyro is 2', C.figure({ base: 5, gyro: true }), { full: 5, total: 2 });
  t.eq('an even pool halves exactly', C.figure({ base: 6, gyro: true }), { full: 6, total: 3 });
  t.eq('Combat Sense and the modifier add, armour subtracts', C.figure({ base: 5, mod: 1, sense: 3, armour: 2 }), { full: 7, total: 7 });
  t.eq('the gyro halves AFTER the rest (not before)', C.figure({ base: 5, mod: 1, sense: 3, armour: 2, gyro: true }), { full: 7, total: 3 });
  t.eq('armour cannot take it below 0', C.figure({ base: 2, armour: 5 }), { full: 0, total: 0 });
  t.eq('…and a negative modifier is allowed', C.figure({ base: 5, mod: -2 }), { full: 3, total: 3 });

  /* ── the inverse: typing a total into the box (TODO 225) ── */
  const inv = (rest, total, gyro) => C.modForTotal({ rest, total, gyro });
  t.eq('no gyro: base 5, typed 4 → mod −1', inv(5, 4, false), { mod: -1, total: 4, exact: true });
  t.eq('gyro worn: base 5, typed 4 → mod +3 (full 8 halves to 4)', inv(5, 4, true), { mod: 3, total: 4, exact: true });
  t.is('the reported bug: the old maths stored mod +2, which reads 3', C.figure({ base: 5, mod: 2, gyro: true }).total, 3);
  t.eq('gyro, typed 2 on a base of 5 → mod −1 (full 4)', inv(5, 2, true), { mod: -1, total: 2, exact: true });
  t.eq('gyro, odd rest: base 7, typed 3 → full 6, mod −1', inv(7, 3, true), { mod: -1, total: 3, exact: true });
  t.eq('gyro, typed 0 → full 0', inv(5, 0, true), { mod: -5, total: 0, exact: true });
  t.eq('no gyro, typed 0 → mod −rest', inv(5, 0, false), { mod: -5, total: 0, exact: true });
  t.eq('rest includes Combat Sense and armour (5 + 3 − 2 = 6), gyro, typed 4 → mod +2', inv(6, 4, true), { mod: 2, total: 4, exact: true });
  for (const gyro of [false, true]) for (let rest = 0; rest <= 9; rest++) for (let want = 0; want <= 9; want++) {
    const r = inv(rest, want, gyro);
    if (r.total !== want || !r.exact || C.figure({ base: rest, mod: r.mod, gyro }).total !== want) t.ok(`round trip rest ${rest} want ${want} gyro ${gyro}`, false);
  }
  t.ok('every whole total 0-9 round-trips with and without a gyro', true);
  t.eq('negative total clamps to 0 and warns', inv(5, -3, true), { mod: -5, total: 0, exact: false });
  t.eq('fractional total rounds to the nearest and warns', inv(5, 3.6, false), { mod: -1, total: 4, exact: false });
  t.eq('garbage reads as 0 and warns', inv(5, NaN, false), { mod: -5, total: 0, exact: false });

  /* ── the breakdown says why ── */
  const b = C.breakdown({ base: 5, gyro: true, gyroName: 'Gyro Mount', spent: 1, parts: 'QUI 4 + INT 4 + WIL 2' });
  t.is('total after the gyro', b.total, 2);
  t.is('the pool before the gyro', b.full, 5);
  t.is('available = total − spent', b.available, 1);
  t.is('it is flagged as reduced', b.reduced, true);
  t.ok('a line names the gyro item and the arithmetic', b.lines.some(l => /Gyro Mount/.test(l) && /⌊5 ÷ 2⌋ = 2/.test(l)));
  t.ok('a line gives the attribute sum', b.lines.some(l => /QUI 4 \+ INT 4 \+ WIL 2/.test(l) && /= 5/.test(l)));
  t.ok('a line shows what is spent', b.lines.some(l => /Spent 1/.test(l)));
  t.ok('the short note names the gyro', /5 halved by gyro · Gyro Mount/.test(b.note));
  const k = C.breakdown({ base: 5, mod: 1, sense: 3, armour: 2 });
  t.ok('Combat Sense, modifier and armour each get a line',
    k.lines.some(l => /Combat Sense \+3/.test(l)) && k.lines.some(l => /Manual modifier \+1/.test(l)) && k.lines.some(l => /Armour −2/.test(l) && /p\.285/.test(l)));
  t.is('armour alone is "reduced" with a note', [k.reduced, /2 less for armour/.test(k.note)].join(), 'true,true');
  const plain = C.breakdown({ base: 5 });
  t.is('a plain pool is not reduced and has one line', [plain.reduced, plain.lines.length, plain.note].join('|'), 'false|1|');
  t.is('a negative modifier shows with its minus', C.breakdown({ base: 5, mod: -2 }).lines.some(l => /Manual modifier −2/.test(l)), true);

  /* ── wiring, source-level ── */
  const act = read('scripts/documents/SR3EActor.js'), sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('prepareDerivedData records the breakdown', /combatPoolBreakdown,\s+\/\/ TODO 213/.test(act)
    && /CombatPool\.breakdown\(\{/.test(act) && /combatPoolBeforeGyro: gyroWorn \? combatPoolFull : null/.test(act));
  t.ok('the gyro item name goes into the breakdown', /gyroName: gyroItem\?\.name/.test(act));
  t.ok('the sheet reads the breakdown for the tooltip', /d\.combatPoolBreakdown\?\.lines/.test(sheet));
  t.ok('the sheet reads combatPoolBeforeGyro to say it is halved', /d\.combatPoolBeforeGyro/.test(sheet) && /halved by gyro/.test(sheet));
  t.ok('_poolBlock renders the note', /pool-note/.test(sheet));
  t.ok('the box writes its modifier through CombatPool.modForTotal, with the gyro flag (TODO 225)',
    /CombatPool\.modForTotal\(\{ rest: base, total: parseFloat\(el\.value\), gyro: el\.dataset\.poolGyro === '1' \}\)/.test(sheet)
    && /data-pool-gyro="1"/.test(sheet) && /!!d\.combatPoolBreakdown\?\.gyro/.test(sheet));
  t.ok('the box no longer passes the halved display as its base', !/\(d\.combatPool \?\? 0\) - \(sys\.combatPoolMod \?\? 0\),\s*\s*'system\.combatPoolSpent'/.test(sheet));
}
