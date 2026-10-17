/**
 * Combat Pool — the figure and WHY it is that figure · TODO 213. Pure — no Foundry.
 *
 * Reported on prod, 2026-10-11: a character with Quickness 4, Intelligence 4, Willpower 2 showed Combat Pool 2
 * and nothing said why — a Gyro Mount not in Storage counts as worn, and a worn gyro halves the pool
 * (SR3 p.282, TODO 18): ⌊5 ÷ 2⌋ = 2. Armour takes dice too (SR3 p.285) and was just as invisible.
 *
 * The order is the rules' and is not new: (Q+I+W)/2 rounded down; plus the manual modifier and Combat Sense
 * (p.169); minus the armour penalty, floored at 0; then HALVED, rounded down, by a worn gyro harness.
 * `SR3EActor.prepareDerivedData` calls `figure()` for the number it uses and records the whole
 * `breakdown()` on `derived.combatPoolBreakdown`, so the sheet shows exactly what was computed.
 */
export const PAGE = 'SR3 p.282, p.285';

const int = n => Math.max(0, Math.floor(Number(n) || 0));
const signed = n => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

export const CombatPool = {
  PAGE,

  /**
   * The pool before spending.
   * @param {{base:number, mod?:number, sense?:number, armour?:number, gyro?:boolean}} p
   * @returns {{full:number, total:number}} `full` = before the gyro, `total` = after it.
   */
  figure({ base = 0, mod = 0, sense = 0, armour = 0, gyro = false } = {}) {
    const full = Math.max(0, (Number(base) || 0) + (Number(mod) || 0) + (Number(sense) || 0) - (Number(armour) || 0));
    return { full, total: gyro ? Math.floor(full / 2) : full };
  },

  /**
   * The inverse of `figure` for the sheet's Combat Pool box: the manual modifier that makes the pool read
   * `total` (TODO 225). `rest` is everything that is NOT the modifier — base + Combat Sense − armour — and
   * is NOT the displayed pool: a worn gyro halves the displayed pool (SR3 p.282), so subtracting the modifier
   * from the display undercounts `rest` and a typed 4 stored a modifier that showed 3.
   * Under a gyro `total` = ⌊full ÷ 2⌋, so `full` may be 2·total or 2·total + 1 — the smaller modifier wins.
   * Every whole total ≥ 0 is reachable; anything else (negative, fractional, not a number) is clamped /
   * rounded to the nearest and reported with `exact: false` so the sheet can warn — never refuse.
   * @returns {{mod:number, total:number, exact:boolean}} `total` = what the pool will actually read.
   */
  modForTotal({ rest = 0, total = 0, gyro = false } = {}) {
    const typed = Number(total);
    const want = Number.isFinite(typed) ? Math.max(0, Math.round(typed)) : 0;
    const exact = Number.isFinite(typed) && typed === want;
    const r = Math.trunc(Number(rest) || 0);
    const mod = (gyro ? want * 2 : want) - r;
    return { mod, total: CombatPool.figure({ base: r, mod, gyro }).total, exact };
  },

  /**
   * Everything the sheet shows. `gyroName` is the worn item's name (any truthy value turns the halving on
   * through `gyro`). `parts` is the attributes line, e.g. 'QUI 4 + INT 4 + WIL 2'.
   * @returns {{base:number, mod:number, sense:number, armour:number, gyro:boolean, gyroName:string,
   *   full:number, total:number, spent:number, available:number, reduced:boolean, lines:string[], note:string}}
   */
  breakdown({ base = 0, mod = 0, sense = 0, armour = 0, gyro = false, gyroName = '', spent = 0, parts = '' } = {}) {
    const b = int(base), m = Math.trunc(Number(mod) || 0), s = int(sense), a = int(armour), sp = int(spent);
    const { full, total } = CombatPool.figure({ base: b, mod: m, sense: s, armour: a, gyro });
    const available = Math.max(0, total - sp);
    const lines = [`Base ⌊(Quickness + Intelligence + Willpower) ÷ 2⌋${parts ? ` (${parts})` : ''} = ${b}`];
    if (s) lines.push(`Combat Sense ${signed(s)} (SR3 p.169)`);
    if (m) lines.push(`Manual modifier ${signed(m)}`);
    if (a) lines.push(`Armour ${signed(-a)} (worn armour vs Quickness, SR3 p.285)`);
    if (s || m || a) lines.push(`= ${full}${full === 0 && b + m + s - a < 0 ? ' (never below 0)' : ''}`);
    if (gyro) lines.push(`Gyro harness${gyroName ? ` (${gyroName})` : ''}: only half the pool, rounded down — ⌊${full} ÷ 2⌋ = ${total} (SR3 p.282; put it in Storage to stop wearing it)`);
    if (sp) lines.push(`Spent ${sp} → ${available} left of ${total}`);
    const note = gyro ? `${full} halved by gyro${gyroName ? ` · ${gyroName}` : ''}`
      : a ? `${a} less for armour (p.285)` : '';
    return { base: b, mod: m, sense: s, armour: a, gyro: !!gyro, gyroName: gyro ? String(gyroName ?? '') : '',
      full, total, spent: sp, available, reduced: !!gyro || a > 0, lines, note };
  },
};
