/**
 * Buying gear — Availability, Street Index and the deal · *SR3 pp.272-273* (TODO 82). Pure — no Foundry.
 *
 * > "In order to purchase gear, characters must use an appropriate contact to see if the item is
 * > available … Two factors determine whether the gear is obtainable and how much it will cost:
 * > Availability and Street Index." — p.272
 * > "the player gets in touch with a contact (usually a fixer) and makes an Etiquette Test. He or
 * > she rolls a number of dice equal to the character's Etiquette Skill … Some contacts will be
 * > better sources for certain types of gear. Talismongers, for example, are an ideal contact for
 * > magical items, but not very good at acquiring weapons." — p.272
 * > "The gamemaster divides the successes from the Etiquette Test into the base time needed to
 * > obtain the item (the number after the slash) … Halfway through this period, face-to-face
 * > negotiations to determine the actual cost take place." — p.272
 * > "the character may add 2 days to the acquisition time period and .1 to the Street Index
 * > (increasing the cost) in order to reduce the Availability target number by 1." — p.272
 * > "The asking street price for gear is equal to the Cost of the item multiplied by the Street
 * > Index … Source and buyer participate in a Success Contest, pitting their Negotiations Skill
 * > Ratings against each other's Intelligence. Whoever rolls the most successes … may adjust the
 * > price in his or her favor by 5 percent for every net success." — p.273
 *
 * ⚠ **The Availability CODE is two numbers**: `24/14 days` is target number 24 and a base time of
 * 14 days. The TN is what the Etiquette Test rolls against; the time is what the successes divide
 * into. Reading the pair as one number is the obvious mistake and it makes every item instant.
 *
 * ⚠ **Successes DIVIDE the time; they do not reduce the target number.** A character who wants an
 * easier TN pays for it separately, in days and Street Index, *before* rolling.
 *
 * ⚠ **The time bought back is added to the BASE TIME, and the extra days are 2 PER POINT** — the
 * book's Cheshire works it as 24 → 12 costing "24 extra days (2 x 12 = 24)", so the base becomes
 * 14 + 24 = 38 days. Charging 2 days once, or reducing the time instead of the base, both look
 * right until you check them against her 19 days.
 *
 * ⚠ **Negotiation is a Success Contest, and it can go either way.** *"If the player loses, the
 * gamemaster can either raise the price or demand the extra percentage up front."* So the net is
 * signed: 5% off per net success to the buyer, 5% **on** per net success to the source.
 *
 * ⚠ **Nothing here is enforced.** It returns numbers and the flow shows them; the GM sets the
 * Availability TN for their campaign (*"intended as a guideline for the gamemaster"*, p.272), and
 * whether a given contact can source a given thing is a judgement the book hands them outright.
 */
export const PAGE = 'SR3 pp.272-273';

/** What a point of Availability reduction costs · p.272. */
export const REDUCTION = { daysPerPoint: 2, streetIndexPerPoint: 0.1, page: 'SR3 p.272' };

/** Per net success in the negotiation · p.273. */
export const NEGOTIATION_STEP = 0.05;

/** Gear modified for a metatype costs more · p.272. */
export const RACIAL_SURCHARGE = { dwarf: 0.10, troll: 0.25, page: 'SR3 p.272' };

/**
 * Which archetypes are a good source for what. ⚠ **A HINT, never a gate** — the book names
 * talismongers and weapons as its example and leaves the rest to the GM, so this colours the
 * dialog and nothing more. An archetype not listed here is not refused; it simply has no opinion.
 */
export const SOURCE_AFFINITY = {
  fixer:        { good: ['gear', 'firearm', 'melee', 'projectile', 'thrown', 'ammunition', 'armor'], note: 'the usual middleman (p.272)' },
  talismonger:  { good: ['focus', 'spell', 'magical'], bad: ['firearm', 'melee', 'projectile', 'ammunition'], note: 'ideal for magical items, poor for weapons (p.272)' },
  armorer:      { good: ['firearm', 'melee', 'projectile', 'thrown', 'ammunition', 'armor'], note: 'weapons and armour' },
  'street doc': { good: ['cyberware', 'bioware', 'medical'], note: "'ware and medical supplies" },
  decker:       { good: ['cyberdeck', 'program'], note: 'decks and utilities' },
  rigger:       { good: ['vehicle', 'vehiclemod', 'drone'], note: 'vehicles and drones' },
  mechanic:     { good: ['vehicle', 'vehiclemod'], note: 'vehicles and mods' },
};

const num = n => (Number.isFinite(Number(n)) ? Number(n) : 0);
/** Nuyen is whole; a fraction of a nuyen is not a thing anyone hands over. */
const money = n => Math.round(num(n));
/** Street Index is printed to one decimal (3 → 4.2), so keep it there and off float noise. */
const si = n => Math.round(num(n) * 10) / 10;

export const Purchasing = {
  PAGE, REDUCTION, NEGOTIATION_STEP, RACIAL_SURCHARGE, SOURCE_AFFINITY,

  /**
   * Parse an Availability code · p.272 — `"24/14 days"`, `"8/14 days"`, `"2/36 hrs"`, `"Always"`.
   * @returns {{tn:number, time:number, unit:string, always:boolean, raw:string}}
   *   `always` is the book's "Always": on the shelf, no test.
   */
  parseAvailability(code) {
    const raw = String(code ?? '').trim();
    if (!raw) return { tn: 0, time: 0, unit: '', always: false, raw, unknown: true };
    if (/^always$/i.test(raw)) return { tn: 0, time: 0, unit: '', always: true, raw };
    const m = raw.match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(hrs?|hours?|days?|months?|weeks?)?/i);
    if (!m) return { tn: 0, time: 0, unit: '', always: false, raw, unknown: true };
    return {
      tn: num(m[1]), time: num(m[2]),
      unit: (m[3] ?? 'days').toLowerCase().replace(/s$/, '').replace('hr', 'hour'),
      always: false, raw,
    };
  },

  /**
   * Buying the target number down before the roll · p.272.
   * @returns {{tn:number, reducedBy:number, extraDays:number, streetIndex:number, baseTime:number}}
   */
  reduceAvailability(avail, streetIndex, reduceBy = 0) {
    const by = Math.max(0, Math.floor(num(reduceBy)));
    const capped = Math.min(by, Math.max(0, num(avail?.tn)));   // never below 0
    return {
      tn:          num(avail?.tn) - capped,
      reducedBy:   capped,
      extraDays:   capped * REDUCTION.daysPerPoint,
      streetIndex: si(num(streetIndex) + capped * REDUCTION.streetIndexPerPoint),
      // ⚠ Added to the BASE time, which the successes then divide (Cheshire: 14 + 24 = 38).
      baseTime:    num(avail?.time) + capped * REDUCTION.daysPerPoint,
    };
  },

  /**
   * How long the source takes · p.272 — *"The base time divided by the number of successes"*.
   * @returns {{time:number|null, halfway:number|null, found:boolean}} `found: false` on no successes.
   */
  acquisitionTime(baseTime, successes) {
    const s = Math.max(0, Math.floor(num(successes)));
    if (s <= 0) return { time: null, halfway: null, found: false };
    const time = num(baseTime) / s;
    // ⚠ Negotiations happen HALFWAY THROUGH, not at delivery — that is when the price is settled.
    return { time, halfway: time / 2, found: true };
  },

  /** The asking price before haggling · p.273 — cost × Street Index, then any racial surcharge. */
  askingPrice(cost, streetIndex, { metatype = '' } = {}) {
    const base = num(cost) * (num(streetIndex) || 1);
    const key = String(metatype).toLowerCase();
    const sur = RACIAL_SURCHARGE[key] ?? 0;
    return { base: money(base), surcharge: money(base * sur), total: money(base * (1 + sur)), surchargeRate: sur };
  },

  /**
   * The Success Contest over price · p.273.
   * @param {number} buyerHits  the buyer's Negotiation successes
   * @param {number} sourceHits the source's
   * @returns {{net:number, toBuyer:boolean, adjustment:number, price:number, percent:number}}
   *   `adjustment` is signed: negative is money off.
   */
  negotiate(price, buyerHits, sourceHits) {
    const net = Math.floor(num(buyerHits)) - Math.floor(num(sourceHits));
    const percent = Math.abs(net) * NEGOTIATION_STEP;
    // ⚠ Signed on purpose: "If the player loses, the gamemaster can either raise the price or
    //   demand the extra percentage up front" — losing is not merely failing to save.
    const adjustment = -net * NEGOTIATION_STEP * num(price);
    return {
      net, toBuyer: net > 0, percent,
      adjustment: money(adjustment),
      price: Math.max(0, money(num(price) + adjustment)),
    };
  },

  /**
   * Is this contact a good source for this item? · p.272. A hint for the dialog.
   * @returns {{rating:'good'|'poor'|'unknown', note:string}}
   */
  affinity(archetype, itemType) {
    const key = String(archetype ?? '').toLowerCase().trim();
    const hit = Object.entries(SOURCE_AFFINITY).find(([k]) => key.includes(k));
    if (!hit) return { rating: 'unknown', note: '' };
    const [, spec] = hit;
    if ((spec.bad ?? []).includes(itemType)) return { rating: 'poor', note: spec.note };
    if ((spec.good ?? []).includes(itemType)) return { rating: 'good', note: spec.note };
    return { rating: 'unknown', note: spec.note };
  },

  /** `19 days`, `9.5 hours` — one decimal, because the book's own answers are not whole. */
  formatTime(time, unit) {
    if (time === null || time === undefined) return '—';
    const t = Math.round(num(time) * 10) / 10;
    return `${t} ${unit || 'day'}${t === 1 ? '' : 's'}`;
  },
};
