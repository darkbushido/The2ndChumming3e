/**
 * Quick Strike · MITS p.151 (TODO 78) — a queue move, never an initiative write.
 */
import { readFileSync } from 'node:fs';
import { QuickStrike } from '../scripts/data/quick-strike.mjs';

export const name = 'quick-strike';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const Q = QuickStrike;
  // Pass 1: sam 18, kim 12, adept 9. Pass 2: sam 8, kim 2.
  const queue = [
    { id: 'sam', score: 18, pass: 1 }, { id: 'kim', score: 12, pass: 1 }, { id: 'adept', score: 9, pass: 1 },
    { id: 'sam', score: 8, pass: 2 }, { id: 'kim', score: 2, pass: 2 },
  ];

  /* ── The move ─────────────────────────────────────────────────────────────── */
  const r = Q.apply(queue, 0, 'adept');
  t.ok('at the start of pass 1 the adept may strike', r.ok);
  t.eq('…and acts first: adept, sam, kim, then pass 2 as it was', r.queue.map(s => `${s.id}${s.pass}`), ['adept1', 'sam1', 'kim1', 'sam2', 'kim2']);
  t.is('…the score is unchanged — "The adept\'s Initiative Score is not affected"', r.queue[0].score, 9);
  t.is('…it is the adept\'s own action, moved — nobody gains a slot', r.queue.length, queue.length);
  t.ok('…and it is the start of the pass', r.first);
  const late = Q.apply(queue, 1, 'adept');
  t.ok('after sam has acted it still plays the adept next', late.ok && late.queue[1].id === 'adept');
  t.ok('…but says the pass had begun', !late.first);
  t.eq('no action in pass 2 → refused ("cannot be used … when the adept does not have an action")',
    [Q.apply(queue, 3, 'adept').ok, Q.apply(queue, 3, 'adept').reason], [false, 'no action left in this Initiative Pass']);
  t.is('in pass 2, someone with a pass-2 action still to come can (kim)', Q.apply(queue, 3, 'kim').ok, true);
  t.is('…whose slot is the current one is already acting', Q.apply(queue, 2, 'adept').reason, 'already acting now');
  t.eq('the original queue is untouched', queue.map(s => s.id), ['sam', 'kim', 'adept', 'sam', 'kim']);

  /* ── Once per Combat Turn, unwounded ──────────────────────────────────────── */
  t.ok('used in round 2 → used in round 2', Q.usedThisTurn(2, 2));
  t.ok('…free again in round 3', !Q.usedThisTurn(2, 3));
  t.ok('never used', !Q.usedThisTurn(undefined, 1));
  // The maintainer's ruling (2026-09-15): "unwounded" (MITS p.151) = no injury modifier.
  t.ok('no injury modifier: unwounded', Q.unwounded({ woundMod: 0 }));
  t.ok('…including boxes that Pain Resistance takes below the first modifier', Q.unwounded({ woundMod: 0, wounds: { stun: { value: 2 } } }));
  t.ok('an injury modifier of −1 is wounded', !Q.unwounded({ woundMod: -1 }));
  t.ok('nothing derived yet reads as unwounded', Q.unwounded({}));

  /* ── The shipped power ────────────────────────────────────────────────────── */
  const doc = JSON.parse(read('packs-src/sr3e-mits-adept-powers/quick-strike.sr3e-adeptpower-0099.json')).doc;
  t.ok('the MITS pack\'s "Quick Strike" is recognised', Q.isPower(doc));
  t.ok('…and nothing else is', !Q.isPower({ type: 'adeptpower', name: 'Quickness' }) && !Q.isPower({ type: 'gear', name: 'Quick Strike' }));

  /* ── The wiring, source-level ─────────────────────────────────────────────── */
  const combat = read('scripts/documents/SR3ECombat.js'), main = read('scripts/sr3e.js');
  const qs = combat.slice(combat.indexOf('async quickStrike('), combat.indexOf('async _applySlot('));
  t.ok('quickStrike moves the queue and never writes initiative', /QuickStrike\.apply\(queue, index, combatantId\)/.test(qs) && !/initiative\s*:/.test(qs));
  t.ok('…flags the round it was used in', /quickStrikeRound: this\.round/.test(qs));
  t.ok('…and refuses a wounded adept unless the GM says go', /if \(wounded && !force\) return/.test(qs));
  t.ok('a player reaches it through a GM query, owner-checked', /CONFIG\.queries\['sr3e\.combat\.quickStrike'\]/.test(combat) && /testUserPermission\?\.\(user, 'OWNER'\)/.test(combat));
  t.ok('the query is registered and the ⚡ rendered from sr3e.js', /SR3ECombat\.registerQuickStrike\(\)/.test(main) && /SR3ECombat\.renderQuickStrike\(combat, el\)/.test(main));
}
