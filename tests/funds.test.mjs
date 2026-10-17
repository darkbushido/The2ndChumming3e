/**
 * ± Funds and giving money · TODO 192.
 *
 * Arithmetic and ledger wording are pure (`Funds`) and tested behaviourally; the dialog is sheet code and the
 * verb is a GM handler, neither importable without Foundry, so those are SOURCE-LEVEL checks backed by the
 * TESTING.md §47 steps in a live world.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Funds } from '../scripts/data/funds.mjs';

export const name = 'funds';
const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

export async function run(t) {
  const F = Funds;

  /* ── what was typed ── */
  t.is('plain', F.parseAmount('1500'), 1500);
  t.is('with a yen sign and commas', F.parseAmount('¥1,500'), 1500);
  t.is('spaces', F.parseAmount(' 1 500 '), 1500);
  t.is('a fraction is cut down', F.parseAmount('99.9'), 99);
  t.is('words are not a number', F.parseAmount('lots'), null);
  t.is('a minus sign is not a number (use the Take away action)', F.parseAmount('-5'), null);
  t.is('empty', F.parseAmount(''), null);
  t.is('absurd sums are capped', F.parseAmount('9'.repeat(30)), F.MAX_AMOUNT);

  /* ── adding and taking away ── */
  t.eq('add', F.change(1000, 250, 'add'), { from: 1000, to: 1250, delta: 250, short: false, shortBy: 0 });
  t.eq('subtract', F.change(1000, 250, 'subtract'), { from: 1000, to: 750, delta: -250, short: false, shortBy: 0 });
  t.eq('subtracting exactly the balance is not short', F.change(500, 500, 'subtract'), { from: 500, to: 0, delta: -500, short: false, shortBy: 0 });
  t.eq('subtracting more than there is: warned, stops at 0', F.change(300, 500, 'subtract'), { from: 300, to: 0, delta: -300, short: true, shortBy: 200 });
  t.eq('adding is never short', F.change(0, 10, 'add').short, false);

  /* ── giving: one calculation for both sides, nuyen conserved ── */
  const g = F.give(1000, 200, 300);
  t.eq('a gift moves the amount', [g.moved, g.payerTo, g.recipientTo, g.short], [300, 700, 500, false]);
  const s = F.give(300, 200, 500);
  t.eq('a short payer gives what they have, and the recipient gets exactly that',
    [s.moved, s.payerTo, s.recipientTo, s.short, s.shortBy], [300, 0, 500, true, 200]);
  t.is('…so the total across both is unchanged', s.payerTo + s.recipientTo, 300 + 200);
  t.is('a broke payer moves nothing', F.give(0, 200, 50).moved, 0);

  /* ── ledger wording ── */
  t.is('± with no reason is empty (the ledger reads "By hand")', F.reason({ side: 'adjust' }), '');
  t.is('± with a reason', F.reason({ side: 'adjust', text: ' sold a car ' }), 'sold a car');
  t.is('payer side names the recipient', F.reason({ side: 'give', other: 'Ploder' }), 'Gave to Ploder');
  t.is('recipient side names the payer and keeps the reason', F.reason({ side: 'receive', other: 'Ploder', text: 'cut of the run' }), 'Received from Ploder: cut of the run');
  t.ok('a reason is capped at the ledger\'s 200', F.reason({ side: 'adjust', text: 'x'.repeat(500) }).length === 200);

  /* ── who can be given to ── */
  const actors = [
    { id: 'me', type: 'character', name: 'Me' }, { id: 'b', type: 'character', name: 'Bravo' },
    { id: 'a', type: 'character', name: 'Alpha' }, { id: 'v', type: 'vehicle', name: 'Van' },
    { id: 't', type: 'character', name: 'Template' }, { id: 'n', type: 'npc', name: 'Goon' },
  ];
  t.eq('other live characters, by name — not yourself, vehicles, NPCs or templates',
    F.recipients(actors, 'me', a => a.id !== 't').map(o => o.id), ['a', 'b']);

  /* ── may pay out ── */
  const owns = (_a, u) => u.owner === true;
  t.is('an owner may', F.mayPayFrom({ id: 1 }, { owner: true }, owns), true);
  t.is('a GM may', F.mayPayFrom({ id: 1 }, { isGM: true }, owns), true);
  t.is('someone else may not', F.mayPayFrom({ id: 1 }, { owner: false }, owns), false);
  t.is('no user, no payment', F.mayPayFrom({ id: 1 }, null, owns), false);

  /* ── wiring, source-level ── */
  const q = read('scripts/SR3EQuery.js'), sheet = read('scripts/sheets/SR3EActorSheet.js');
  const i = q.indexOf("CONFIG.queries['sr3e.money.give']");
  const body = i < 0 ? '' : q.slice(i, q.indexOf('CONFIG.queries[', i + 1) < 0 ? undefined : q.indexOf('CONFIG.queries[', i + 1));
  t.ok('the verb is registered', i > 0);
  t.ok('…asserts it is the active GM, and dedupes with once()', /assertActiveGM\(\)/.test(body) && /SR3EQuery\.once\(\s*rid/.test(body));
  t.ok('…refuses a payer the requester does not own (no minting nuyen)', /Funds\.mayPayFrom\(payer, requester/.test(body));
  t.ok('…debits the payer AND credits the recipient from the live balances',
    /Funds\.give\(payer\.system\?\.nuyen, recipient\.system\?\.nuyen/.test(body)
    && /payer\.update\(\{ 'system\.nuyen': r\.payerTo \}/.test(body) && /recipient\.update\(\{ 'system\.nuyen': r\.recipientTo \}/.test(body));
  t.ok('…puts both sides in the 📒 Ledger with the giver as By', (body.match(/ledgerBy: by/g) ?? []).length >= 2 && /side: 'give'/.test(body) && /side: 'receive'/.test(body));
  t.ok('…puts the debit back if the credit fails', /Refund: the payment failed/.test(body));
  t.ok('…serialised under ONE key (A→B and B→A cannot deadlock)', /SR3EQueue\.run\('sr3e:money'/.test(body));
  t.ok('the sheet offers ± Funds beside Nuyen', /data-action="adjustFunds"/.test(sheet) && /adjustFunds:\s+SR3EActorSheet\._onAdjustFunds/.test(sheet));
  t.ok('the dialog is wired through DialogV2.wait\'s render option', /async _onAdjustFunds[\s\S]{0,3500}render: \(_event, dialog\) => wireDialog\(dialog, dialog\.element\)/.test(sheet));
  t.ok('the recipient list hides templates and goes through Funds.recipients',
    /Funds\.recipients\(game\.actors\.filter\(a => a\.type === 'character' && game\.sr3e\.isLiveActor\(a\)\)/.test(sheet));
  t.ok('a gift goes through the GM verb', /asGM\('sr3e\.money\.give'/.test(sheet));
  t.ok('± records a ledger reason and warns on a shortfall instead of refusing',
    /ledgerReason: Funds\.reason\(\{ side: 'adjust'/.test(sheet) && /nuyen stops at ¥0/.test(sheet));
}
