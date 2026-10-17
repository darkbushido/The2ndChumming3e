/**
 * Changing a character's nuyen by an amount, and giving it to another character · TODO 192. Pure — no Foundry.
 *
 * Asked 2026-09-27: typing a new total into the Nuyen box to add or take away a sum is awkward, and there was
 * no way to pay another character. The maintainer decided to build BOTH — a ± control and a "give money"
 * action — each leaving a line in the 📒 Ledger (TODO 79).
 *
 * ⚠ **Warn, never refuse.** `system.nuyen` has a floor of 0 in the data model, so a sum larger than the
 * balance cannot go negative: the shortfall is REPORTED (`short`, `shortBy`) and the money that actually moves
 * is what the character has. In a gift that means the recipient gets exactly what left the payer — nuyen is
 * conserved, never made up from nothing.
 * ⚠ **Intent, not totals, goes to the GM.** The recipient belongs to another player, so the credit is relayed
 * to the GM as `+N` and added to the LIVE balance there; two gifts arriving together must both land
 * (`sr3e.money.give`, `SR3EQuery`).
 */
export const PAGE = 'TODO 192';

/** A sane ceiling — well past any campaign's money, well short of where a double loses integers. */
export const MAX_AMOUNT = 1_000_000_000_000;

const whole = n => Math.max(0, Math.floor(Number(n) || 0));

export const Funds = {
  PAGE, MAX_AMOUNT,

  /** What was typed → a whole amount ≥ 0, or null when it is not a number at all. `¥1,500` and `1 500` are fine. */
  parseAmount(raw) {
    const s = String(raw ?? '').replace(/[¥,\s]/g, '');
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    return Math.min(MAX_AMOUNT, Math.floor(Number(s)));
  },

  /**
   * Add to / take from a balance.
   * @param {number} have
   * @param {number} amount   a whole amount ≥ 0
   * @param {'add'|'subtract'} mode
   * @returns {{from:number, to:number, delta:number, short:boolean, shortBy:number}}
   *   `delta` is what the balance really changed by (negative for a subtraction); `short` — a subtraction
   *   bigger than the balance, which stops at 0.
   */
  change(have, amount, mode) {
    const from = whole(have), n = whole(amount);
    if (mode === 'add') return { from, to: from + n, delta: n, short: false, shortBy: 0 };
    const taken = Math.min(from, n);
    return { from, to: from - taken, delta: -taken, short: n > from, shortBy: Math.max(0, n - from) };
  },

  /**
   * One character pays another. The payer's side and the recipient's side, from one calculation, so they
   * cannot disagree.
   * @returns {{amount:number, moved:number, short:boolean, shortBy:number, payerFrom:number, payerTo:number,
   *   recipientFrom:number, recipientTo:number}} `moved` = what actually changes hands.
   */
  give(payerHave, recipientHave, amount) {
    const pay = Funds.change(payerHave, amount, 'subtract');
    const moved = -pay.delta;
    return {
      amount: whole(amount), moved, short: pay.short, shortBy: pay.shortBy,
      payerFrom: pay.from, payerTo: pay.to,
      recipientFrom: whole(recipientHave), recipientTo: whole(recipientHave) + moved,
    };
  },

  /**
   * The 📒 Ledger reason for one side. `side`: 'adjust' (the ± control, `text` only), 'give' (payer) or
   * 'receive' (recipient); `other` is the other character's name. An empty result reads "By hand" there.
   */
  reason({ side, text = '', other = '' } = {}) {
    const t = String(text ?? '').trim();
    const head = side === 'give' ? `Gave to ${other}` : side === 'receive' ? `Received from ${other}` : '';
    return (head && t ? `${head}: ${t}` : head || t).slice(0, 200);
  },

  /**
   * Who a character may give money to: other LIVE player-type characters (never a template, vehicle, IC or
   * host), by name. `isLive` is `game.sr3e.isLiveActor`. World-wide on purpose — a payment is not about the
   * scene (CLAUDE.md, actor-filter rules).
   */
  recipients(actors, payerId, isLive = () => true) {
    return [...(actors ?? [])]
      .filter(a => a && a.id !== payerId && a.type === 'character' && isLive(a))
      .map(a => ({ id: a.id, name: String(a.name ?? '') }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * May `userId` give from this actor? Only an OWNER (or a GM) pays out of a character. `isOwner(actor, user)`
   * is the Foundry check; passed in so this stays pure.
   */
  mayPayFrom(actor, user, isOwner) {
    return !!actor && !!user && (!!user.isGM || !!isOwner(actor, user));
  },
};
