/**
 * Cybersystem damage — Essence slots, the Wound Effect Table, and which implant a wound hits.
 * *M&M pp.126-129* (TODO 129). Pure — no Foundry.
 *
 * > "In order to determine the cyberware that takes damage, all cyberware systems must be assigned
 * > to one of six Essence slots (one slot for each point of Essence). Each slot holds 1 Essence
 * > point of cyberware. Implants with an Essence Cost of more than 1 will take up more than one
 * > slot. Begin filling Essence slots with slot 1, and fill each slot completely before assigning
 * > cyberware to the next slot, in ascending order." — p.127
 * > "To determine which cyberware system is damaged by a wound effect, roll 1D6 and compare the
 * > result to the character's Essence slots. If the die roll result indicates a slot that contains
 * > no cyberware, ignore that wound effect." — p.127
 * > "If Leggy had rolled a 6, he might not have taken any damage at all because that slot is only
 * > half full. In that case, the gamemaster would have declared a 50-50 chance between the
 * > smartlink getting hit and no damage being done." — p.128
 *
 * ⚠ **A PARTLY FILLED SLOT IS A CHANCE, NOT A HIT.** The occupied fraction is the probability that
 * anything is struck at all. Treating a half-full slot as a guaranteed hit on its one implant is
 * the easy mistake and it silently doubles how often a smartlink breaks.
 * ⚠ **Nothing here decides anything.** Within a full slot holding several implants, the book hands
 * the pick to the GM — *"choose an appropriate cybersystem from that slot, choose randomly, or roll
 * a ten sided die"*. `systemHit` returns the candidates and their shares; it never picks one.
 * ⚠ **Ignore, do not re-roll.** A wound effect that lands on an empty slot, or on a type the
 * character has none of, is *"ignored"* — it does not become a hit somewhere else.
 * ⚠ **Accessories inside a cybereye/ear/limb are part of that system** *"unless the character paid
 * Essence for the item"* (p.127). This module weighs what it is given; the caller decides what is
 * a system of its own. The convention here: an implant with its own Essence Cost is its own entry.
 *
 * This is NOT [[essence-holes]]. The hole (#53, M&M p.150) records Essence spent on cyberware that
 * was REMOVED; these slots describe cyberware that is still installed.
 */
export const PAGE = 'M&M pp.126-129';

/** Six slots, one per point of Essence · p.127. */
export const SLOT_COUNT = 6;

/** How much Essence one slot holds · p.127. */
export const SLOT_SIZE = 1;

/** The Wound Effect Table · p.127. */
export const WOUND_EFFECT_TABLE = [
  { d6: [1, 2], type: 'cyberware', label: 'Cybersystem damage', page: 'M&M p.127' },
  { d6: [3, 4], type: 'bioware',   label: 'Bioware damage',     page: 'M&M p.128' },
  { d6: [5, 6], type: 'organic',   label: 'Organic physical injury', page: 'M&M p.129' },
];

/**
 * Electrical attacks · p.129 — *"roll an additional 1D6; on a result of 1 or 2, the attack damages
 * another piece of cyberware"*, once per wound effect, and every wound effect goes straight to
 * Determine System Affected rather than through the Wound Effect Table.
 */
export const ELECTRICAL = { extraOn: [1, 2], page: 'M&M p.129' };

const num = n => (Number.isFinite(Number(n)) ? Number(n) : 0);
/** Essence rounds to 2dp everywhere in this system; keep slot arithmetic there too. */
const r2 = n => Math.round(num(n) * 100) / 100;

export const CyberSlots = {
  PAGE, SLOT_COUNT, SLOT_SIZE, WOUND_EFFECT_TABLE, ELECTRICAL,

  /**
   * The Wound Effect Table · p.127.
   * @returns {{type:string, label:string, page:string}|null} null for a die outside 1-6.
   */
  woundEffectType(d6) {
    const d = Math.trunc(num(d6));
    return WOUND_EFFECT_TABLE.find(r => r.d6.includes(d)) ?? null;
  },

  /**
   * Does this wound effect apply at all? · p.127 — *"If a character with no cyberware rolls a
   * cybersystem damage result, or a character with no bioware rolls a bioware damage result,
   * ignore that wound effect."*
   */
  applies(type, { hasCyberware = false, hasBioware = false } = {}) {
    if (type === 'cyberware') return !!hasCyberware;
    if (type === 'bioware')   return !!hasBioware;
    return true;   // an organic injury always lands
  },

  /**
   * How many wound effects a wound inflicts · p.127 — the Damage Resistance Test read as a Success
   * Test against the boxes inflicted: *"the character suffers a number of wound effects equal to the
   * margin of failure (the difference between the highest roll and the number of damage boxes
   * suffered)"*.
   *
   * ⚠ **It is the HIGHEST DIE, not the successes.** Leggy's 1,1,2,2,3 against 6 boxes is 6 − 3 = 3
   * wound effects. Counting successes would give 0 and the rule would never fire.
   * ⚠ **Any die reaching the boxes means none at all** — *"If the character fails (does not roll any
   * numbers equal to the target number)"*.
   */
  woundEffects(dice, boxes) {
    const rolled = (Array.isArray(dice) ? dice : [dice]).map(num);
    const b = Math.max(0, Math.trunc(num(boxes)));
    const highest = rolled.length ? Math.max(...rolled) : 0;
    if (highest >= b) return 0;
    return b - highest;
  },

  /**
   * Fill the Essence slots · p.127. Implants are `{ name, essence }`, taken in the order given —
   * the book fills from the character's own list and never sorts.
   *
   * ⚠ **An implant costing more than 1 SPANS slots**, and its share in each is what a hit weighs.
   * ⚠ **`doubleUp` is the cyberzombie case** (p.127): *"Characters who have undergone cybermancy
   * will have more cyberware than Essence slots. In this case, the player must 'double up' on his
   * slots, making it possible for two systems to be damaged at the same time."* With it, filling
   * wraps back to slot 1 instead of spilling off the end, so a slot can hold more than 1.0.
   *
   * @returns {{slots:Array<{index:number, entries:Array<{name:string, amount:number}>, filled:number}>,
   *            overflow:number, doubled:boolean}}
   *   `overflow` is Essence that found no slot (only when `doubleUp` is false).
   */
  assignSlots(implants, { slotCount = SLOT_COUNT, doubleUp = false } = {}) {
    const slots = Array.from({ length: slotCount }, (_, i) => ({ index: i + 1, entries: [], filled: 0 }));
    let at = 0, overflow = 0, doubled = false;

    for (const imp of implants ?? []) {
      let left = r2(imp?.essence);
      const name = String(imp?.name ?? '');
      if (left <= 0) continue;

      while (left > 0) {
        if (at >= slotCount) {
          if (!doubleUp) { overflow = r2(overflow + left); break; }
          at = 0;               // wrap — the cyberzombie doubles up rather than losing the implant
          doubled = true;
        }
        const slot  = slots[at];
        // ⚠ On a wrapped pass the slot is already full, so `room` would be 0 and the loop would
        // spin. Once doubling has begun a slot simply takes the whole remainder of the implant.
        const room  = doubled && slot.filled >= SLOT_SIZE ? left : r2(SLOT_SIZE - slot.filled);
        const share = r2(Math.min(room, left));
        if (share > 0) {
          slot.entries.push({ name, amount: share });
          slot.filled = r2(slot.filled + share);
          left = r2(left - share);
        }
        if (slot.filled >= SLOT_SIZE && left > 0) at += 1;
        else if (left <= 0) { if (slot.filled >= SLOT_SIZE) at += 1; break; }
      }
    }
    return { slots, overflow, doubled };
  },

  /**
   * Determine System Affected · p.127-128. Roll 1D6 against the slots.
   *
   * @returns {{slot:number, empty:boolean, partial:boolean, hitChance:number,
   *            candidates:Array<{name:string, amount:number, share:number}>, note:string}}
   *   `hitChance` is the slot's filled fraction — 1 for a full slot, .5 for Leggy's half-full
   *   slot 6. `share` is each implant's portion OF THE FILLED PART, so the shares sum to 1 and
   *   feed the book's optional 1D10 within the slot.
   */
  systemHit(assignment, d6) {
    const slots = assignment?.slots ?? assignment ?? [];
    const d = Math.trunc(num(d6));
    const slot = slots.find(s => s.index === d) ?? null;

    if (!slot || !slot.entries.length) {
      return { slot: d, empty: true, partial: false, hitChance: 0, candidates: [],
        note: 'That slot holds no cyberware — ignore this wound effect (M&M p.127).' };
    }
    const filled  = r2(slot.filled);
    const partial = filled < SLOT_SIZE;
    const candidates = slot.entries.map(e => ({ ...e, share: filled ? r2(e.amount / filled) : 0 }));
    return {
      slot: d, empty: false, partial, hitChance: Math.min(1, filled), candidates,
      note: partial
        // ⚠ 50-50 at half full, and the book says so outright for exactly this case.
        ? `That slot is only ${Math.round(filled * 100)}% full — the GM declares a `
          + `${Math.round(filled * 100)}-${Math.round((1 - filled) * 100)} chance between a hit and no `
          + 'damage at all (M&M p.128).'
        : candidates.length > 1
          ? 'The GM chooses which of these takes the hit, picks randomly, or rolls 1D10 across the '
            + 'slot subdivided by Essence Cost (M&M p.127).'
          : 'That implant takes the hit (M&M p.127).',
    };
  },

  /** Electrical damage · p.129 — does this extra die damage another piece of cyberware? */
  electricalSpreads(d6) {
    return ELECTRICAL.extraOn.includes(Math.trunc(num(d6)));
  },
};
