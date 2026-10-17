/**
 * Changing a character's nuyen by an amount, and giving it to another character · TODO 192. Pure — no Foundry.
 *
 * Asked 2026-09-27: typing a new total into the Nuyen box to add or take away a sum is awkward, and there was
 * no way to pay another character. The maintainer decided to build BOTH — a ± control and a "give money"
 * action — each leaving a line in the 📒 Ledger (TODO 79).
 *
 * ⚠ **± on your own sheet warns, never refuses.** `system.nuyen` has a floor of 0 in the data model, so a
 * Take away larger than the balance stops at 0: the shortfall is REPORTED (`short`, `shortBy`).
 * ⚠ **A GIFT is the exception — ruled 2026-10-17 by the maintainer, it is BLOCKED, not trimmed:** you cannot
 * give more than you have, and you cannot give a negative, zero or fractional amount (`validateGift`), and a
 * gift is only between two PLAYER characters (`giftParties`, `recipients`). The dialog disables Give with the
 * reason and the GM verb rejects the same cases. Nuyen is conserved: what arrives is exactly what left.
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
   * May this be given? A gift must be a WHOLE, POSITIVE amount no larger than the payer's balance (ruled
   * 2026-10-17). `raw` is what was typed or sent (`¥1,500`, `1 500`, a number).
   * @returns {{ok:boolean, amount:number, reason:string}}  `reason` is '' when ok
   */
  validateGift(raw, payerHave) {
    const s = String(raw ?? '').replace(/[¥,\s]/g, '');
    const bad = reason => ({ ok: false, amount: 0, reason });
    if (!/^-?\d+(\.\d+)?$/.test(s)) return bad('Type an amount of nuyen.');
    const n = Number(s);
    if (n < 0) return bad('You cannot give a negative amount.');
    if (!Number.isInteger(n)) return bad('Give a whole number of nuyen.');
    if (n === 0) return bad('Give more than ¥0.');
    if (n > MAX_AMOUNT) return bad('That is more than any character can hold.');
    const have = whole(payerHave);
    if (n > have) return bad(`You only have ¥${have.toLocaleString('en-US')} — you cannot give more than you have.`);
    return { ok: true, amount: n, reason: '' };
  },

  /**
   * Are these two allowed to exchange a gift? Both must be PLAYER characters (ruled 2026-10-17) and different.
   * `isPC` is `game.sr3e.SR3EQuery.isPlayerCharacter`, passed in so this stays pure.
   * @returns {{ok:boolean, reason:string}}
   */
  giftParties(payer, recipient, isPC = () => true) {
    const pc = a => a?.type === 'character' && !!isPC(a);
    if (!pc(payer)) return { ok: false, reason: 'Only a player character can give money.' };
    if (!pc(recipient)) return { ok: false, reason: 'Money can only be given to another player character.' };
    if (payer.id === recipient.id) return { ok: false, reason: 'A character cannot give money to themselves.' };
    return { ok: true, reason: '' };
  },

  /**
   * One player character gives to another. The payer's side and the recipient's side, from one calculation,
   * so they cannot disagree. A gift that fails `validateGift` moves NOTHING (`ok: false`, `reason`).
   * @returns {{ok:boolean, reason:string, amount:number, moved:number, payerFrom:number, payerTo:number,
   *   recipientFrom:number, recipientTo:number}} `moved` = what changes hands (0 when blocked).
   */
  give(payerHave, recipientHave, raw) {
    const v = Funds.validateGift(raw, payerHave);
    const moved = v.ok ? v.amount : 0;
    return {
      ok: v.ok, reason: v.reason, amount: v.amount, moved,
      payerFrom: whole(payerHave), payerTo: whole(payerHave) - moved,
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
   * Who a character may give money to: other LIVE PLAYER characters (never a template, NPC, vehicle, IC or
   * host), by name (ruled 2026-10-17). `isLive` is `game.sr3e.isLiveActor`, `isPC` is
   * `game.sr3e.SR3EQuery.isPlayerCharacter`. World-wide on purpose — a payment is not about the scene.
   */
  recipients(actors, payerId, isLive = () => true, isPC = () => true) {
    return [...(actors ?? [])]
      .filter(a => a && a.id !== payerId && a.type === 'character' && isLive(a) && isPC(a))
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
