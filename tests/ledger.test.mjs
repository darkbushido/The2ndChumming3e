/**
 * The karma / nuyen ledger · TODO 79.
 *
 * ⚠ **The design claim this suite exists to protect:** every entry is derived from the WRITE, in
 * `SR3EActor._preUpdate`, not from a call site. That is what makes "where did that 40 karma go?"
 * answerable — the Session Rewards tool, Award Karma, the Spend calculator, a healing bill and a
 * player typing in the box are all recorded by one piece of code. The source-level sweep at the
 * bottom is the part that cannot be written any other way: it walks every `system.karma` /
 * `system.nuyen` writer in `scripts/` and fails if one appeared that `_preUpdate` would not see.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { Ledger, MAX_ENTRIES } = await import('../scripts/data/ledger.mjs');

export const name = 'ledger';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const L = Ledger;

  /* ── Entries are derived from what CHANGED ────────────────────────────────── */
  const before = { karma: 10, nuyen: 5000, karmaPool: 2 };
  t.eq('an award of 5 karma is one entry',
    L.diff(before, { karma: 15 }, { when: 1 }).map(e => [e.kind, e.delta, e.from, e.to]),
    [['karma', 5, 10, 15]]);
  t.eq('spending nuyen is negative', L.diff(before, { nuyen: 4500 }, { when: 1 }).map(e => e.delta), [-500]);
  t.is('two fields at once are two entries', L.diff(before, { karma: 15, nuyen: 4500 }).length, 2);
  t.is('the Karma Pool is tracked separately from Good Karma',
    L.diff(before, { karmaPool: 3 })[0].kind, 'pool');

  // ⚠ Foundry re-sends unchanged fields on a form submit; logging those would bury the real ones.
  t.is('a write that changes nothing is NOT an entry', L.diff(before, { karma: 10 }).length, 0);
  t.is('…nor a field the update never mentions', L.diff(before, {}).length, 0);

  const reasoned = L.diff(before, { karma: 15 }, { reason: 'Session rewards', by: 'Gamemaster' })[0];
  t.eq('the reason and the author ride along', [reasoned.reason, reasoned.by], ['Session rewards', 'Gamemaster']);
  // ⚠ "Log an unexplained adjustment as an entry with an empty reason rather than blocking it."
  t.is('no reason still makes an entry', L.diff(before, { karma: 15 })[0].reason, '');

  /* ── Append, and the cap ──────────────────────────────────────────────────── */
  t.is('append adds', L.append([{ a: 1 }], [{ a: 2 }]).length, 2);
  t.is('…and never mutates what it was given', (() => { const a = [{ a: 1 }]; L.append(a, [{ a: 2 }]); return a.length; })(), 1);
  const many = Array.from({ length: MAX_ENTRIES + 10 }, (_, i) => ({ when: i }));
  const capped = L.append(many, [{ when: 9999 }]);
  t.is(`capped at ${MAX_ENTRIES}`, capped.length, MAX_ENTRIES);
  t.is('…trimmed OLDEST first, so the newest survives', capped.at(-1).when, 9999);

  /* ── Append-only for players ──────────────────────────────────────────────── */
  const cur = [L.entry({ kind: 'karma', delta: 5, reason: 'earned' })];
  t.ok('a player may append', L.reconcile(cur, [...cur, L.entry({ kind: 'karma', delta: 1 })]).ok);
  t.ok('…but not delete', !L.reconcile(cur, []).ok);
  // ⚠ Compared by CONTENT: a same-length array with an edited reason is a rewrite, and a
  //   length check alone would wave it straight through.
  t.ok('…and not rewrite the past, even at the same length',
    !L.reconcile(cur, [{ ...cur[0], reason: 'a gift' }]).ok);
  t.ok('a GM may do either — they are trusted (the ethos)', L.reconcile(cur, [], { isGM: true }).ok);

  /* ── Reading it back ──────────────────────────────────────────────────────── */
  const hist = [
    L.entry({ kind: 'karma', delta: 10, when: 100 }),
    L.entry({ kind: 'nuyen', delta: -500, when: 300 }),
    L.entry({ kind: 'karma', delta: -6, when: 200 }),
  ];
  t.eq('totals are per kind', [L.totals(hist).karma, L.totals(hist).nuyen], [4, -500]);
  t.eq('recent is newest first', L.recent(hist).map(e => e.when), [300, 200, 100]);
  t.eq('…and can be filtered to one kind', L.recent(hist, { kind: 'karma' }).map(e => e.when), [200, 100]);
  t.eq('the sign is never dropped', [L.formatDelta('karma', 5), L.formatDelta('karma', -5)], ['+5', '−5']);
  t.is('nuyen carries its symbol and separators', L.formatDelta('nuyen', -1500), '−¥1,500');

  /* ── recordLedger: the entry rides along in the SAME update ───────────────── */
  const actor = { system: { karma: 10, nuyen: 5000, karmaPool: 1, ledger: [] } };
  const changed = { 'system.karma': 20 };
  SR3EActor.recordLedger(actor, changed, { ledgerReason: 'Session rewards' }, { isGM: true, name: 'GM' });
  t.is('the update now carries the ledger', changed['system.ledger']?.length, 1);
  t.eq('…describing the change', [changed['system.ledger'][0].delta, changed['system.ledger'][0].reason],
    [10, 'Session rewards']);

  // ⚠ Without this guard every append would describe itself, for ever.
  const selfWrite = { 'system.ledger': [L.entry({ kind: 'karma', delta: 1 })] };
  SR3EActor.recordLedger({ system: { ledger: [] } }, selfWrite, {}, { isGM: true });
  t.is('a write to the ledger itself is not described', selfWrite['system.ledger'].length, 1);

  const nested = { system: { karma: 12 } };
  SR3EActor.recordLedger(actor, nested, {}, { isGM: false, name: 'Player2' });
  t.ok('the nested spelling is caught too', (nested.system.ledger ?? []).length === 1);
  t.is('…and names who did it', nested.system.ledger[0].by, 'Player2');

  const untouched = { 'system.notes': 'hi' };
  SR3EActor.recordLedger(actor, untouched, {}, { isGM: true });
  t.is('an unrelated update is left alone', untouched['system.ledger'], undefined);

  // A player trying to rewrite history has the write dropped, not the whole update.
  const rewrite = { 'system.ledger': [] };
  SR3EActor.recordLedger({ system: { ledger: cur } }, rewrite, {}, { isGM: false });
  t.is('a player\'s attempt to clear it is dropped', rewrite['system.ledger'], undefined);

  /* ── The wiring, source-level ─────────────────────────────────────────────── */
  const actorSrc = read('scripts/documents/SR3EActor.js');
  t.ok('_preUpdate records the ledger', /_preUpdate\(changed, options, user\)[\s\S]{0,900}SR3EActor\.recordLedger\(this, changed, options, user\)/.test(actorSrc));
  t.ok('both actor types store it',
    (read('scripts/data/ActorDataModels.js').match(/ledger:\s+new ArrayField/g) ?? []).length === 2);
  t.ok('the sheet shows it', /_ledgerTable\(this\.actor\)/.test(read('scripts/sheets/SR3EActorSheet.js')));

  /**
   * ⚠ **THE RATCHET.** Every writer of karma or nuyen must go through `actor.update`, so that
   * `_preUpdate` sees it. A new flow that writes one of these fields some other way — a direct
   * document mutation, a GM-relayed `sr3e.actor.set` with a raw field — would spend a player's
   * karma with no record, and nothing else in the suite would notice.
   */
  const WRITERS = ['scripts/sr3e.js', 'scripts/sheets/SR3EActorSheet.js', 'scripts/SR3EHealing.js',
    'scripts/documents/SR3EActor.js', 'scripts/SR3EDrugs.js', 'scripts/SR3EStress.js'];
  const offenders = [];
  for (const f of WRITERS) {
    const src = read(f);
    for (const m of src.matchAll(/['"`]system\.(karma|nuyen|karmaPool|totalKarma)['"`]/g)) {
      // ⚠ A WINDOW, not the line. An `actor.update({ ... })` spans several lines, so a
      //   line-based check calls every continuation line an offender — which is noise, and noise
      //   in a ratchet is how a ratchet gets deleted.
      const before = src.slice(Math.max(0, m.index - 400), m.index);
      const NL = String.fromCharCode(10);
      const line   = src.slice(src.lastIndexOf(NL, m.index) + 1, src.indexOf(NL, m.index));
      const lastOpen  = Math.max(before.lastIndexOf('.update('), before.lastIndexOf('updates['),
                                 before.lastIndexOf('updates ='), before.lastIndexOf('setProperty('));
      const inComment = /\/\*(?![\s\S]*\*\/)/.test(before) || /^\s*(\*|\/\/)/.test(line);
      const isRead    = /\?\?|getProperty|TRACKED|===|!==/.test(line) && !/\.update\(/.test(line);
      const isField   = /_inlineField|name="system\.|data-field/.test(line);
      if (inComment || isRead || isField || lastOpen >= 0) continue;
      offenders.push(`${f}: ${line.trim().slice(0, 80)}`);
    }
  }
  t.is(`every karma/nuyen write goes through actor.update, so _preUpdate sees it${offenders.length ? ` — ${offenders.slice(0, 4).join(' | ')}` : ''}`,
    offenders.length, 0);

  // The known writers each explain themselves, so the "why" column is not blank where it could be full.
  t.ok('Session Rewards names itself', /ledgerReason: 'Session rewards'/.test(read('scripts/sr3e.js')));
  t.ok('Award Karma names itself', /ledgerReason: 'Karma award'/.test(read('scripts/sheets/SR3EActorSheet.js')));
  t.is('every Spend-calculator purchase names what it bought',
    (read('scripts/sheets/SR3EActorSheet.js').match(/ledgerReason: `/g) ?? []).length, 6);
  t.ok('a healing bill names the treatment', /ledgerReason: `Medical: /.test(read('scripts/SR3EHealing.js')));
}
