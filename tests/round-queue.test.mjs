/**
 * The round's action queue when combatants leave it mid-round (TODO 251).
 *
 * Seen in play, 2026-10-23: "the initiative tracker seems to fail after 4 or 5 rounds", with the GM removing
 * knocked-out combatants. Reproduced in the test world: removing the acting combatant made the next one act
 * twice, and the removed combatant's pass-2 slot handed the top tracker row an extra turn.
 */
import { readFileSync } from 'node:fs';
import { RoundQueue } from '../scripts/data/round-queue.mjs';

export const name = 'round-queue';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const P = RoundQueue.prune;
  // The live reproduction: Windage 26, Troll 14, SWAT 10, Ploder 4 → pass 2: Windage 16, Troll 4 → pass 3: Windage 6.
  const queue = [
    { id: 'win', score: 26, pass: 1 }, { id: 'troll', score: 14, pass: 1 }, { id: 'swat', score: 10, pass: 1 },
    { id: 'plo', score: 4, pass: 1 }, { id: 'win', score: 16, pass: 2 }, { id: 'troll', score: 4, pass: 2 },
    { id: 'win', score: 6, pass: 3 },
  ];
  const ids = r => r.queue.map(s => `${s.id}${s.pass}`);
  const without = (...gone) => ['win', 'troll', 'swat', 'plo'].filter(id => !gone.includes(id));

  /* ── The acting combatant is removed ─────────────────────────────────────── */
  const acting = P(queue, 1, without('troll'));
  t.eq('every one of the removed combatant\'s slots goes, pass 2 included', ids(acting), ['win1', 'swat1', 'plo1', 'win2', 'win3']);
  t.is('…the index lands on the next survivor (SWAT), who acts now', acting.queue[acting.index].id, 'swat');
  t.ok('…and says the acting slot was the one removed, so End Turn plays SWAT rather than skipping past', acting.actingRemoved);
  t.eq('…naming that slot, for the pass-change recoil reset', acting.removedSlot, { id: 'troll', score: 14, pass: 1 });

  /* ── Someone who already acted, or has yet to act, is removed ────────────── */
  const earlier = P(queue, 2, without('troll'));
  t.is('a removed slot BEFORE the index shifts it down: SWAT is still the one acting', earlier.queue[earlier.index].id, 'swat');
  t.ok('…and the acting slot was not removed', !earlier.actingRemoved && earlier.removedSlot === null);
  const later = P(queue, 2, without('plo'));
  t.is('a removed slot AFTER the index leaves it where it was', later.index, 2);
  t.is('…SWAT still acting', later.queue[later.index].id, 'swat');

  /* ── The end of the round ────────────────────────────────────────────────── */
  const last = P(queue, 6, without('win'));
  t.is('the last slot\'s combatant removed while acting → index past the end: the round is over', last.index, last.queue.length);
  t.ok('…flagged so End Turn starts the next round', last.actingRemoved);

  /* ── Nothing to do ───────────────────────────────────────────────────────── */
  const same = P(queue, 3, without());
  t.ok('nobody removed: unchanged, and no write is asked for', !same.changed && same.index === 3 && same.queue.length === queue.length);
  t.ok('…the original queue is untouched by a prune', P(queue, 1, without('troll')) && queue.length === 7);
  t.eq('an empty or missing queue is harmless', [P([], 0, []).index, P(undefined, 4, ['a']).queue.length], [0, 0]);
  t.is('an out-of-range index is clamped', P(queue, 99, without('troll')).index, 5);

  /* ── Where it is wired ───────────────────────────────────────────────────── */
  const combat = read('scripts/documents/SR3ECombat.js');
  const sr3e = read('scripts/sr3e.js');
  t.ok('SR3ECombat.pruneQueue prunes through RoundQueue.prune', /async pruneQueue\(\)[\s\S]{0,400}RoundQueue\.prune\(/.test(combat));
  t.ok('nextTurn prunes before advancing (the backstop when no GM saw the delete)',
    /async nextTurn\(\)\s*\{[\s\S]{0,400}await this\.pruneQueue\(\)/.test(combat));
  t.ok('…and plays the next survivor when the acting slot went, rather than advancing past them',
    /pruned\?\.actingRemoved[\s\S]{0,400}this\._applySlot\(pruned\.queue, pruned\.index\)/.test(combat));
  t.ok('a deleteCombatant hook prunes on the active GM as the combatant leaves',
    /Hooks\.on\('deleteCombatant'[\s\S]{0,300}activeGM\?\.isSelf[\s\S]{0,300}pruneQueue\(\)/.test(sr3e));
}
