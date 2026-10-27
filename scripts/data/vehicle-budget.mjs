/**
 * A vehicle's mods against its Cargo (CF) and Load — TODO 265, step c's first slice (the maintainer, 2026-10-27). Pure.
 *
 * Rigger 3 Revised p.124, *Weight and Space Restrictions*: certain modifications consume Cargo space (CF) or Load, and "no
 * vehicle can exceed its Cargo or Load ratings". A rigger may scrape up 1.5 CF (rounded down) for every passenger seat, at +1
 * Power to any crash or collision damage the occupants resist. Each mod's own *CF Consumed* / *Load Reduction* is its pack
 * `cfCost` / `load` (customization figures, R3R p.124).
 *
 * Warn, never refuse: the Mods tab shows used / available and warns when over; nothing stops an install. A figure this cannot
 * read ("weight of the missiles", FRA's "Upgrade") is listed as not counted, for the GM.
 *
 * ⚠ **Per point.** A few mods are bought in points and their figures are per point — the pack fields do not say so:
 * Vehicle Armor's Load (Body² × 5 kg per Armor point, R3R p.131) and Concealed Armor's CF and Load (3 CF and Body² × 5 kg per
 * point, p.132). `PER_POINT` multiplies those by the mod's rating. Ablative Armor's Body × 100 kg is for the mod (p.131); Smart
 * Armor's "3*Armor" is 3 CF per point of the VEHICLE's Armor (p.133).
 */

/** Mods whose figures are per point of their rating — by base name (the "(Vehicle)" tag and any level dropped). */
export const PER_POINT = {
  'Vehicle Armor':   { cf: false, load: true },
  'Concealed Armor': { cf: true,  load: true },
};

export const PAGE = 'R3R p.124';

const baseName = name => String(name ?? '').replace(/\s*\[\d+\]\s*$/, '').replace(/\s*\(Vehicle\)\s*$/i, '').trim();
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round = v => Math.round(v * 100) / 100;

export const VehicleBudget = {
  PER_POINT, PAGE,

  /**
   * A mod's CF: a number, `N*Armor` (N per point of the vehicle's Armor), or null when it cannot be read. Blank is 0 — the
   * book: "if no CF is listed … the modification does not require cargo space" (p.124).
   */
  cf(text, { armor = 0 } = {}) {
    const t = String(text ?? '').trim();
    if (t === '') return 0;
    if (/^\d+(?:\.\d+)?$/.test(t)) return Number(t);
    const m = /^(\d+(?:\.\d+)?)\s*[*x×]\s*armou?r$/i.exec(t);
    if (m) return Number(m[1]) * num(armor);
    return null;
  },

  /**
   * A mod's Load in kg, or null when it cannot be read. "15kg", a bare number (kg — the firearm conversion kits print
   * "0.5"), "Body*100kg" / "100kg x Body", "Body^2*5kg". "10kg+Weapon" is the 10 kg (the mounted weapon's own weight is the
   * weapon's, `weaponExtra`). Blank is 0 (p.124).
   */
  load(text, { body = 0 } = {}) {
    const t = String(text ?? '').trim().replace(/\s+/g, '');
    if (t === '') return 0;
    let m = /^(\d+(?:\.\d+)?)(?:kg)?$/i.exec(t);
    if (m) return Number(m[1]);
    m = /^body\^2[*x×](\d+(?:\.\d+)?)kg$/i.exec(t);
    if (m) return num(body) ** 2 * Number(m[1]);
    m = /^body[*x×](\d+(?:\.\d+)?)kg$/i.exec(t) ?? /^(\d+(?:\.\d+)?)kg[*x×]body$/i.exec(t);
    if (m) return num(body) * Number(m[1]);
    m = /^(\d+(?:\.\d+)?)kg\+weapon$/i.exec(t);
    if (m) return Number(m[1]);
    return null;
  },

  /** Does the mod's Load leave out a weapon the GM must add ("10kg+Weapon")? */
  weaponExtra(text) {
    return /\+\s*weapon/i.test(String(text ?? ''));
  },

  /** One mod's `{ name, cf, load, perPoint, weapon }` on this vehicle — null figures are unread. */
  of(mod, vehicle) {
    const sys = mod?.system ?? {};
    const attrs = vehicle?.attributes ?? vehicle?.system?.attributes ?? {};
    const ctx = { body: num(attrs.body?.value ?? attrs.body?.base), armor: num(attrs.armor?.value ?? attrs.armor?.base) };
    const per = PER_POINT[baseName(mod?.name)];
    const points = Math.max(1, num(sys.rating) || 1);
    let cf = VehicleBudget.cf(sys.cfCost, ctx);
    let load = VehicleBudget.load(sys.load, ctx);
    if (per?.cf && cf != null) cf *= points;
    if (per?.load && load != null) load *= points;
    return { name: mod?.name ?? '?', cf: cf == null ? null : round(cf), load: load == null ? null : round(load), perPoint: !!per,
      weapon: VehicleBudget.weaponExtra(sys.load) };
  },

  /** Passenger seats a rigger may scrape: seating less the driver's seat. */
  passengerSeats(seating) {
    return Math.max(0, Math.trunc(num(seating)) - 1);
  },

  /**
   * The vehicle's budget: `{ cf: { used, of, over, scrape }, load: { used, of, over }, rows, unread, warnings }`. `of` is the
   * vehicle's Cargo / Load as it stands (the GM's figure); `scrape` the CF passenger room could add (1.5 a seat, rounded down).
   */
  summary(vehicle, mods = []) {
    const sys = vehicle?.system ?? vehicle ?? {};
    const attrs = sys.attributes ?? {};
    const rows = [...mods].map(m => VehicleBudget.of(m, sys));
    const cfUsed = round(rows.reduce((s, r) => s + (r.cf ?? 0), 0));
    const loadUsed = round(rows.reduce((s, r) => s + (r.load ?? 0), 0));
    const cfOf = num(attrs.cargo?.value ?? attrs.cargo?.base);
    const loadOf = num(attrs.load?.value ?? attrs.load?.base);
    const seats = VehicleBudget.passengerSeats(sys.seating);
    const scrape = Math.floor(1.5 * seats);
    const cf = { used: cfUsed, of: cfOf, over: round(Math.max(0, cfUsed - cfOf)), scrape, seats };
    const load = { used: loadUsed, of: loadOf, over: round(Math.max(0, loadUsed - loadOf)) };
    const unread = rows.filter(r => r.cf == null || r.load == null).map(r => r.name);
    const warnings = [];
    if (cf.over > 0) {
      warnings.push(`The mods take ${cfUsed} CF; the vehicle has ${cfOf} — ${cf.over} over (${PAGE}: no vehicle can exceed its Cargo).`
        + (scrape > 0 ? ` Scraping passenger room gives up to ${scrape} CF (1.5 a seat, ${seats} seat${seats === 1 ? '' : 's'}) at +1 Power to crash damage.` : ''));
    }
    if (load.over > 0) warnings.push(`The mods weigh ${loadUsed} kg; the vehicle's Load is ${loadOf} kg — ${load.over} kg over (${PAGE}).`);
    if (rows.some(r => r.weapon)) warnings.push('A weapon mount\'s Load leaves out the weapon on it — add the weapon\'s weight (R3R p.136).');
    return { cf, load, rows, unread, warnings };
  },
};
