/**
 * What a character is carrying, and the Encumbrance rules · *SR3 p.274* (TODO 126). Pure — no Foundry.
 *
 * > "If the player characters' equipment seems to be getting a bit out of hand, the gamemaster can impose
 * > the following Encumbrance rules. A character can carry up to his Strength x 5 in kilograms without
 * > appreciable effect. Twice that load (Strength x 10 kg) will leave the character in a state equivalent
 * > to a Light Wound on the Stun Condition Monitor. The wound occurs when a character carries the load a
 * > number of Combat Turns equal to his or her Body Rating. The character gains one box of Stun damage
 * > each Combat Turn until he or she collapses unconscious or drops the load … three times the allowed
 * > load (Strength x 15 kg) … a Moderate Wound; he cannot run and his movement rate is halved. Four times
 * > that load (Strength x 20 kg) … a Serious Wound after (Body) turns; he cannot run, and his movement
 * > drops to one-quarter … Any heavier load makes the character pass out from exertion."
 *
 * ⚠ **The book calls this optional** — *"the gamemaster CAN impose"*. Nothing here is enforced: the sheet
 * shows the load and the tier, and damage is applied by hand like every other wound in this system.
 * ⚠ **The tiers are "up to", not "at least".** Exactly Strength × 5 is still free; the Light tier starts
 * the moment the load passes it. So a Strength 4 character is free to 20 kg and lightly burdened at 20.1.
 * ⚠ **Stored gear does not count** (TODO 113) — the stash is not on the character, the same rule worn
 * armour, gyros and medkits already follow. The caller filters it; `itemWeight` only weighs an item.
 * ⚠ **Ammunition weight is PER ROUND (or per reload)**, so a box that has been fired down weighs less —
 * `tools/build-default-gear.mjs` stores it that way (TODO 126).
 * ⚠ **Cyberware and bioware weigh nothing here.** They are installed, not carried; the book's weights are
 * for what a character hauls around.
 */
export const PAGE = 'SR3 p.274';

/** Item types whose `weight` is for ONE of them and whose `quantity` says how many are carried. */
const STACKED = ['thrown', 'projectile', 'gear', 'medical', 'drug', 'ammunition'];
/** Installed, not carried. */
const WEIGHTLESS = ['cyberware', 'bioware', 'adeptpower', 'spell', 'skill', 'quality', 'contact', 'lifestyle'];

const r3 = n => Math.round((Number(n) || 0) * 1000) / 1000;

export const CarriedLoad = {
  PAGE,
  /** Multiples of Strength that bound each tier, and what the book says happens there. */
  TIERS: [
    { key: 'free',     mult: 5,  label: 'unencumbered',   wound: null,       note: 'no appreciable effect' },
    { key: 'light',    mult: 10, label: 'Light Wound',    wound: 'Light',    note: 'a box of Stun after (Body) Combat Turns, and one more each turn after' },
    { key: 'moderate', mult: 15, label: 'Moderate Wound', wound: 'Moderate', note: 'cannot run; movement halved' },
    { key: 'serious',  mult: 20, label: 'Serious Wound',  wound: 'Serious',  note: 'cannot run; movement quartered' },
  ],

  /** How much one item adds to the load, in kilograms. */
  itemWeight(item) {
    const type = item?.type ?? '';
    if (WEIGHTLESS.includes(type)) return 0;
    const w = Number(item?.system?.weight) || 0;
    if (!(w > 0)) return 0;
    if (type === 'ammunition') {
      const sys = item.system ?? {};
      const each = sys.countedIn === 'reloads' ? (Number(sys.reloads) || 0) : (Number(sys.rounds) || 0);
      return r3(w * each);
    }
    if (STACKED.includes(type)) {
      const q = Number(item?.system?.quantity);
      return r3(w * (Number.isFinite(q) && q > 0 ? q : 1));
    }
    return r3(w);
  },

  /** The load from a list of items already filtered to what is on the character. */
  total(items) {
    return r3((items ?? []).reduce((a, i) => a + CarriedLoad.itemWeight(i), 0));
  },

  /** The kilogram bounds for a Strength: `{ free, light, moderate, serious }`. */
  limits(strength) {
    const s = Math.max(0, Number(strength) || 0);
    return Object.fromEntries(CarriedLoad.TIERS.map(t => [t.key === 'free' ? 'free' : t.key, r3(s * t.mult)]));
  },

  /**
   * Where a load sits · p.274.
   * @returns {{key, label, wound, note, over:boolean, load:number, free:number, limits:object,
   *            afterTurns:number}} `afterTurns` — the Body rating the wound waits for.
   */
  encumbrance(strength, load, body = 0) {
    const limits = CarriedLoad.limits(strength);
    const kg     = r3(load);
    const turns  = Math.max(0, Number(body) || 0);
    const base   = { load: kg, free: limits.free, limits, afterTurns: turns };
    for (const t of CarriedLoad.TIERS) {
      // "up to his Strength x 5" — the tier holds while the load is no more than its bound.
      if (kg <= limits[t.key]) return { ...base, key: t.key, label: t.label, wound: t.wound, note: t.note, over: t.key !== 'free' };
    }
    return { ...base, key: 'collapse', label: 'passes out', wound: 'Deadly',
             note: 'any heavier load makes the character pass out from exertion', over: true };
  },
};
