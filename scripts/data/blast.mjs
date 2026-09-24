/**
 * Blast falloff — how fast a grenade's Power drops with distance · SR3 p.119, p.283 (TODO 150). Pure.
 *
 * > "Different grenade types lose blast effect at different rates. Consult the Grenade Damage
 * > Table to find the grenade's Damage Code and Power reduction rate. … Distance reduces the Power
 * > Level, thereby reducing the damage. For example, a target standing 3 meters away from an
 * > offensive grenade blast would suffer 7S base damage (normal Damage Code of 10S, minus 3). A
 * > target standing 6 meters away from the blast point would suffer 4S base damage. A character
 * > standing 3 meters from the blast point of a defensive grenade would be subject to only a base
 * > 4S damage (10S - 6), while a target standing 6 meters away would be out of the grenade's blast
 * > effect entirely."                                                    — SR3 p.118-119
 *
 * GRENADE DAMAGE TABLE (p.119): Offensive 10S −1 per meter · Defensive 10S −1 per HALF meter ·
 * Concussion 12M (Stun) −1 per meter. The Explosives table (p.283) prints the same as the Blast
 * column: `–1/m`, `–1/.5m`, `–1/m`; commercial explosives `–3/m`, `–6/m`, `–12/m`.
 *
 * The falloff lives on the item as `system.blast`, in the book's own notation. Blank means the
 * ordinary −1/m, which is what every grenade shipped before this field existed already used.
 */
export const Blast = {
  /** Falloff used when an item names none — an offensive grenade's, p.119. */
  DEFAULT_PER_METRE: 1,

  /**
   * The Power lost per metre, from the book's notation: `-1/m` → 1, `–1/.5m` → 2, `-3/m` → 3.
   * Accepts the hyphen, the true minus and the en dash the PDF prints. Returns null when the string
   * is blank, `--`, or not a falloff, so callers can tell "none recorded" from a number.
   */
  perMetre(text) {
    const m = /^\s*[-−–]?\s*(\d*\.?\d+)\s*\/\s*(\d*\.?\d*)\s*m\s*$/i.exec(String(text ?? ''));
    if (!m) return null;
    const amount = Number(m[1]);
    const per    = m[2] === '' ? 1 : Number(m[2]);
    if (!(amount > 0) || !(per > 0)) return null;
    return amount / per;
  },

  /** The falloff to use for an item's `blast` string — its own, else the default. */
  rate(text) {
    return Blast.perMetre(text) ?? Blast.DEFAULT_PER_METRE;
  },

  /** Power at `metres` from the blast point. Never below 0; 0 means out of the blast entirely. */
  power(base, metres, perMetre = Blast.DEFAULT_PER_METRE) {
    return Math.max(0, (Number(base) || 0) - Math.max(0, Number(metres) || 0) * perMetre);
  },

  /** How far the blast reaches: the first whole metre at which Power has run out. */
  radius(base, perMetre = Blast.DEFAULT_PER_METRE) {
    return Math.max(1, Math.ceil((Number(base) || 0) / perMetre));
  },
};
