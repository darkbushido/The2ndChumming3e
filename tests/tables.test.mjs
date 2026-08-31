/**
 * The lookup tables, checked cell by cell against the printed books.
 *
 * ⚠ **Why this file exists.** Asked on 2026-08-30 whether the crash flow was tested, the honest
 * answer was no — and the sweep that followed found that several of the most-used tables in the
 * system had never been checked against anything. `_trackMod` decides the wound modifier on
 * *every roll in the game* and had zero coverage. So did every range band, the grenade scatter
 * table, and the whole crash path.
 *
 * A transcribed table is a claim, and an unchecked claim is a guess that looks like data. These
 * are the numbers a GM would otherwise have to catch at the table.
 *
 * **The sweep found one real defect**, recorded below: grenades were using the firearms
 * target-number row, making every long-range throw two points easier than the book allows.
 *
 * Sources are the SR3 core rulebook; page numbers are BOOK pages.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'tables';

export async function run(t) {

  /* ════════════════════════════════════════════════════════════════════════════
   *  DAMAGE MODIFIERS TABLE · p.126, and the box thresholds that feed it
   *
   *    Damage Level   Injury Modifier   Initiative Modifier
   *    Uninjured           None                None
   *    Light                +1                  -1
   *    Moderate             +2                  -2
   *    Serious              +3                  -3
   *
   * The BOX thresholds are not in that table — they come from the Condition Monitor, and the
   * book pins them twice in worked prose:
   *   "a character whose Serious wound is reduced to a Moderate wound should have only THREE
   *    boxes of damage filled in"                                                    (p.126)
   *   "Cybersushi fills in 6 BOXES on his Physical Condition Monitor" — after his damage was
   *    staged down to Serious                                                        (p.222)
   * ════════════════════════════════════════════════════════════════════════════ */
  const mod = b => SR3EActor._trackMod(b);

  t.is('0 boxes is uninjured — no modifier', mod(0), 0);
  t.is('1 box is Light — +1', mod(1), 1);
  t.is('2 boxes still Light', mod(2), 1);
  t.is('3 boxes is Moderate — the book says so outright', mod(3), 2);
  t.is('4 boxes still Moderate', mod(4), 2);
  t.is('5 boxes still Moderate', mod(5), 2);
  t.is('6 boxes is Serious — Cybersushi\'s 6', mod(6), 3);
  t.is('9 boxes still Serious', mod(9), 3);
  t.is('10 boxes — Deadly, and the modifier does not climb past 3', mod(10), 3);
  t.is('an overflowing track does not keep climbing', mod(14), 3);

  // ⚠ The boundaries are where this goes wrong, and each is one box wide.
  t.ok('the Light/Moderate boundary is at 3, not 4', mod(2) === 1 && mod(3) === 2);
  t.ok('the Moderate/Serious boundary is at 6, not 5', mod(5) === 2 && mod(6) === 3);
  // Monotonic: more damage can never mean a smaller penalty.
  let monotone = true;
  for (let b = 1; b <= 20; b++) if (mod(b) < mod(b - 1)) monotone = false;
  t.ok('the modifier never decreases as damage rises', monotone);

  /* ════════════════════════════════════════════════════════════════════════════
   *  WEAPON RANGE TABLE · p.111 — every printed row
   *
   * Target numbers across the top: 4 / 5 / 6 / 9, i.e. modifiers 0 / +1 / +2 / +5.
   * Config stores the MAXIMUM of each band.
   * ════════════════════════════════════════════════════════════════════════════ */
  t.eq('range TN modifiers are 0/+1/+2/+5 for TN 4/5/6/9', SR3E.rangeTN, [0, 1, 2, 5]);

  const BOOK_RANGES = {
    HOPist: [5, 15, 30, 50],        // Hold-out Pistol   0-5   6-15    16-30   31-50
    LPist:  [5, 15, 30, 50],        // Light Pistol      0-5   6-15    16-30   31-50
    HPist:  [5, 20, 40, 60],        // Heavy Pistol      0-5   6-20    21-40   41-60
    SMG:    [10, 40, 80, 150],      // SMG               0-10  11-40   41-80   81-150
    Tasr:   [5, 10, 12, 15],        // Taser             0-5   6-10    11-12   13-15
    ShtG:   [10, 20, 50, 100],      // Shotgun           0-10  11-20   21-50   51-100
    SptR:   [100, 250, 500, 750],   // Sporting Rifle    0-100 101-250 251-500 501-750
    Snip:   [150, 300, 700, 1000],  // Sniper Rifle      0-150 151-300 301-700 701-1000
    AsRf:   [50, 150, 350, 550],    // Assault Rifle     0-50  51-150  151-350 351-550
    LMG:    [75, 200, 400, 800],    // Light MG          0-75  76-200  201-400 401-800
    MMG:    [80, 250, 750, 1200],   // Medium MG         0-80  81-250  251-750 751-1200
    HMG:    [80, 250, 800, 1500],   // Heavy MG          0-80  81-250  251-800 801-1500
    MinG:   [100, 300, 900, 2400],  // Assault Cannon    0-100 101-300 301-900 901-2400
    GrLn:   [50, 100, 150, 300],    // Grenade Launcher  5-50  51-100  101-150 151-300
    MisLn:  [150, 450, 1200, 3000], // Missile Launcher  20-150 151-450 451-1200 1201-3000
  };
  for (const [code, bands] of Object.entries(BOOK_RANGES)) {
    t.eq(`${code} range bands match the book`, SR3E.weaponRanges[code], bands);
  }

  // Bands must ascend, or `_rangeBandForDistance` (first band the distance fits) misclassifies.
  const ascending = Object.entries(SR3E.weaponRanges)
    .filter(([, b]) => !b.every((v, i) => i === 0 || v > b[i - 1]))
    .map(([c]) => c);
  t.is(ascending.length ? `range bands out of order: ${ascending.join(', ')}`
                        : 'every weapon\'s range bands ascend', ascending.length, 0);

  /* ==== IMPACT PROJECTILE WEAPONS · p.111 — Strength multipliers ==== */
  const BOOK_MULTS = {
    Bow: [1, 10, 30, 60],   // 0-STR    to STRx10  to STRx30  to STRx60
    LCB: [2, 8, 20, 40],    // 0-STRx2  to STRx8   to STRx20  to STRx40
    MCB: [3, 12, 30, 50],   // 0-STRx3  to STRx12  to STRx30  to STRx50
    HCB: [5, 15, 40, 60],   // 0-STRx5  to STRx15  to STRx40  to STRx60
    TK:  [1, 2, 3, 5],      // 0-STR    to STRx2   to STRx3   to STRx5
    SH:  [1, 2, 5, 7],      // 0-STR    to STRx2   to STRx5   to STRx7
  };
  for (const [code, mults] of Object.entries(BOOK_MULTS)) {
    t.eq(`${code} Strength multipliers match the book`, SR3E.weaponRangeMultipliers[code], mults);
  }
  // ⚠ Shuriken and Thrown Knife are NOT the same past Medium — 3/5 against 5/7. Copying one
  // from the other is the obvious mistake and the book distinguishes them.
  t.ok('Shuriken outranges the Thrown Knife at Long and Extreme',
    SR3E.weaponRangeMultipliers.SH[2] > SR3E.weaponRangeMultipliers.TK[2]
    && SR3E.weaponRangeMultipliers.SH[3] > SR3E.weaponRangeMultipliers.TK[3]);

  /* ════════════════════════════════════════════════════════════════════════════
   *  GRENADE RANGE TABLE · p.119
   *
   *                    Target Number:  4      5       8        9
   *    Standard          0-STRx3  to STRx5   to STRx10  to STRx20   1D6 scatter
   *    Aerodynamic       0-STRx3  to STRx5   to STRx20  to STRx30   2D6 scatter
   *    Grenade Launcher  5-50     51-100     101-150    151-300     3D6 scatter
   * ════════════════════════════════════════════════════════════════════════════ */
  const g = SR3E.grenadeTypes;
  t.eq('Standard grenade range multipliers',    g.standard.rangeMult,    [3, 5, 10, 20]);
  t.eq('Aerodynamic grenade range multipliers', g.aerodynamic.rangeMult, [3, 5, 20, 30]);
  t.eq('Grenade launcher fixed bands',          g.launcher.rangeFixed,   [50, 100, 150, 300]);
  t.is('Standard scatters 1D6',    g.standard.scatterDice,    1);
  t.is('Aerodynamic scatters 2D6', g.aerodynamic.scatterDice, 2);
  t.is('Launcher scatters 3D6',    g.launcher.scatterDice,    3);
  // Aerodynamic outranges standard at Long and Extreme but scatters further — the trade the
  // table exists to express.
  t.ok('aerodynamic throws further than standard',
    g.aerodynamic.rangeMult[2] > g.standard.rangeMult[2]);
  t.ok('…and scatters more when it misses',
    g.aerodynamic.scatterDice > g.standard.scatterDice);

  /* ==== THE DEFECT THIS SWEEP FOUND ====
   *
   * The GRENADE RANGE TABLE heads its columns **4 / 5 / 8 / 9** — Long is EIGHT. The WEAPON
   * RANGE TABLE says the same from the other side: the launcher's Long band carries the
   * footnote "** Target number 8: see page 119".
   *
   * The grenade flow read `rangeTN` — the FIREARMS row — so every long-range throw was TN 6,
   * two points easier than the book allows. Nothing distinguished the two tables, and the
   * shared array looked authoritative because every other weapon genuinely uses it.
   */
  t.eq('grenades have their OWN target-number row', SR3E.grenadeRangeTN, [0, 1, 4, 5]);
  t.is('a long-range grenade is TN 8, not 6', 4 + SR3E.grenadeRangeTN[2], 8);
  t.is('…where a long-range rifle shot is 6',  4 + SR3E.rangeTN[2],       6);
  t.ok('the two rows differ ONLY at Long',
    SR3E.grenadeRangeTN[0] === SR3E.rangeTN[0]
    && SR3E.grenadeRangeTN[1] === SR3E.rangeTN[1]
    && SR3E.grenadeRangeTN[2] !== SR3E.rangeTN[2]
    && SR3E.grenadeRangeTN[3] === SR3E.rangeTN[3]);

  /* ════════════════════════════════════════════════════════════════════════════
   *  IMPACT DAMAGE LEVELS TABLE · p.147, and crash Power · p.145
   *
   *    Vehicle Speed (m/turn)   Damage Level
   *              1-20           Light (L)
   *             21-60           Moderate (M)
   *            61-200           Serious (S)
   *              201+           Destroyed (D)
   *
   *    "The Power of a crash is equal to the vehicle's speed divided by 10 and rounded up"
   * ════════════════════════════════════════════════════════════════════════════ */
  const crash = s => SR3EActor.crashDamage(s);

  t.is('20 m/turn is Light',        crash(20).level,  'L');
  t.is('21 m/turn is Moderate',     crash(21).level,  'M');
  t.is('60 m/turn still Moderate',  crash(60).level,  'M');
  t.is('61 m/turn is Serious',      crash(61).level,  'S');
  t.is('200 m/turn still Serious',  crash(200).level, 'S');
  t.is('201 m/turn is Destroyed',   crash(201).level, 'D');
  t.is('very fast is still D',      crash(900).level, 'D');
  // ⚠ Each boundary is exact and each is off-by-one bait.
  t.ok('the L/M boundary is 21, not 20', crash(20).level === 'L' && crash(21).level === 'M');
  t.ok('the M/S boundary is 61, not 60', crash(60).level === 'M' && crash(61).level === 'S');
  t.ok('the S/D boundary is 201, not 200', crash(200).level === 'S' && crash(201).level === 'D');

  t.is('Power is speed ÷ 10, rounded UP', crash(55).power, 6);
  t.is('…exactly divisible stays exact',  crash(60).power, 6);
  t.is('…and rounds up, not down',        crash(61).power, 7);
  t.is('Power floors at 1 — a crawling vehicle still hits something', crash(1).power, 1);
  t.is('a stopped vehicle still floors at 1', crash(0).power, 1);
  t.is('negative speed does not produce negative Power', crash(-50).power, 1);
  t.is('undefined does not throw', crash(undefined).power, 1);

  /* ⚠ THE UNIT. Speed is metres per Combat Turn, stored as km/h ÷ 1.2. A car at 96 km/h is
   * 80 m/turn — Power 8, Serious. Typing the km/h figure straight in gives Power 10, a fifth
   * too much, and the two are close enough that nothing looks wrong. */
  const kmh = 96, mpt = Math.round(kmh / 1.2);
  t.is('96 km/h is 80 m/turn', mpt, 80);
  t.is('…which is Power 8', crash(mpt).power, 8);
  t.is('…and Serious', crash(mpt).level, 'S');
  t.ok('passing raw km/h instead would overstate the Power', crash(kmh).power > crash(mpt).power);

  /* ════════════════════════════════════════════════════════════════════════════
   *  Sanity across the config tables — shape, not values
   * ════════════════════════════════════════════════════════════════════════════ */
  const badLen = Object.entries(SR3E.weaponRanges).filter(([, b]) => b.length !== 4).map(([c]) => c);
  t.is(badLen.length ? `range bands must have 4 entries: ${badLen.join(', ')}`
                     : 'every weapon range has exactly 4 bands', badLen.length, 0);

  const badMult = Object.entries(SR3E.weaponRangeMultipliers)
    .filter(([, b]) => b.length !== 4).map(([c]) => c);
  t.is(badMult.length ? `multipliers must have 4 entries: ${badMult.join(', ')}`
                      : 'every Strength multiplier set has exactly 4 bands', badMult.length, 0);

  t.is('rangeTN has one modifier per band', SR3E.rangeTN.length, 4);
  t.is('grenadeRangeTN has one modifier per band', SR3E.grenadeRangeTN.length, 4);

  // Every nocked-ammo category must have range bands, or a bow classifies as "other".
  const missingBands = Object.keys(SR3E.nockedAmmoByCategory)
    .filter(c => !SR3E.weaponRangeMultipliers[c]);
  t.is(missingBands.length ? `bow/crossbow categories with no range bands: ${missingBands.join(', ')}`
                           : 'every nocked-ammo category has range bands', missingBands.length, 0);
}
