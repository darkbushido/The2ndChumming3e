/**
 * Initiative ordering — SR3ECombat.buildRoundQueue and _assignTieBreaks.
 *
 * Three bugs are guarded here, two of which shared a root cause:
 *
 *  - Tied combatants were skipped. The queue sorted with no tie-break, so JS's stable
 *    sort left ties in insertion order while Foundry's `turns` held them in id order.
 *    Position was then INFERRED by searching the queue for the active combatant, so the
 *    disagreement silently truncated the pass.
 *  - A GM re-roll broke the order, via that same inference.
 *  - A finished round ended the encounter instead of starting the next one.
 *
 * Every test deliberately supplies combatants in an order that does NOT match id order,
 * so a regression to insertion-order sorting fails rather than passing by luck.
 */
import { installGlobals, useScriptedRolls } from './helpers/foundry.mjs';
installGlobals();
const { SR3ECombat } = await import('../scripts/documents/SR3ECombat.js');

export const name = 'initiative';

/** A combat stub carrying just what the queue builder reads. */
function makeCombat(list, mode = 'sr3') {
  globalThis.game = { settings: { get: () => mode } };
  const combat = Object.create(SR3ECombat.prototype);
  const written = {};
  combat.combatants = {
    contents: list.map(([id, initiative, reaction = 0]) => ({
      id, name: id, initiative,
      actor: { system: { attributes: { reaction: { value: reaction } } } },
      flags: { The2ndChumming3e: {} },
    })),
  };
  combat.updateEmbeddedDocuments = async (_type, updates) => {
    for (const u of updates) {
      const rank = u.flags.The2ndChumming3e.tieBreak;
      written[u._id] = rank;
      combat.combatants.contents.find(c => c.id === u._id).flags.The2ndChumming3e.tieBreak = rank;
    }
  };
  return { combat, written };
}

const slots  = (list, mode) => makeCombat(list, mode).combat.buildRoundQueue().map(s => `${s.id}@${s.score}`);
const passOf = (list, mode) => makeCombat(list, mode).combat.buildRoundQueue().map(s => `${s.id}p${s.pass}`);

/** Resolve tie-breaks first, then return the pass-1 order. */
async function resolved(list) {
  const { combat, written } = makeCombat(list);
  await combat._assignTieBreaks();
  return {
    ranks: written,
    order: combat.buildRoundQueue().filter(s => s.pass === 1).map(s => s.id),
  };
}

export async function run(t) {
  /* ---- SR3: pass-grouped ---- */
  t.eq('everyone acts once before anyone acts twice',
    slots([['a', 21], ['b', 4]], 'sr3'), ['a@21', 'b@4', 'a@11', 'a@1']);
  t.eq('pass numbers increment per action',
    passOf([['a', 21], ['b', 4]], 'sr3'), ['ap1', 'bp1', 'ap2', 'ap3']);

  /* ---- SR2: interleaved ---- */
  t.eq('a fast combatant acts twice before a slow one acts once',
    slots([['a', 21], ['b', 4]], 'sr2'), ['a@21', 'a@11', 'b@4', 'a@1']);
  t.eq('the documented three-way example',
    slots([['sam', 33], ['viz', 11], ['rex', 2]], 'sr2'),
    ['sam@33', 'sam@23', 'sam@13', 'viz@11', 'sam@3', 'rex@2', 'viz@1']);

  /* ---- boundaries ---- */
  t.eq('initiative 10 grants exactly one action', slots([['a', 10]], 'sr3'), ['a@10']);
  t.eq('initiative 11 grants two', slots([['a', 11]], 'sr3'), ['a@11', 'a@1']);
  t.eq('initiative 1 grants one', slots([['a', 1]], 'sr3'), ['a@1']);
  t.eq('zero, null and negative initiative are excluded',
    slots([['a', 0], ['b', null], ['c', -5], ['d', 3]], 'sr3'), ['d@3']);
  t.eq('nobody rolled yields an empty queue', slots([['a', null]], 'sr3'), []);

  // Each combatant must get exactly ceil(init / 10) actions — 10 gives one, not two.
  for (const mode of ['sr3', 'sr2']) {
    const list = [['a', 23], ['b', 10], ['c', 10], ['d', 1]];
    const counts = {};
    for (const s of makeCombat(list, mode).combat.buildRoundQueue()) {
      counts[s.id] = (counts[s.id] ?? 0) + 1;
    }
    t.eq(`${mode}: every combatant gets exactly ceil(init/10) actions`,
      counts, Object.fromEntries(list.map(([id, i]) => [id, Math.ceil(i / 10)])));
  }

  /* ---- ties: nobody may be dropped ---- */
  t.is('two tied combatants both get a slot',
    makeCombat([['b', 10], ['a', 10]], 'sr3').combat.buildRoundQueue().length, 2);
  t.is('three tied combatants all get a slot',
    makeCombat([['c', 7], ['a', 7], ['b', 7]], 'sr3').combat.buildRoundQueue().length, 3);
  t.is('ties survive in SR2 too',
    makeCombat([['b', 10], ['a', 10]], 'sr2').combat.buildRoundQueue().length, 2);

  /* ---- tie-break: Reaction, then dice ---- */
  t.eq('higher Reaction acts first, against what id order would choose',
    (await resolved([['a', 10, 3], ['z', 10, 8]])).order, ['z', 'a']);
  t.eq('a three-way tie orders by Reaction',
    (await resolved([['a', 10, 1], ['b', 10, 2], ['c', 10, 9]])).order, ['c', 'b', 'a']);
  t.eq('untied combatants all rank 0',
    (await resolved([['a', 20, 5], ['b', 9, 5]])).ranks, { a: 0, b: 0 });

  useScriptedRolls([6, 2]);
  t.eq('equal Reaction is settled by dice',
    (await resolved([['a', 10, 5], ['b', 10, 5]])).order, ['a', 'b']);

  // 4/4 ties, so both re-roll; b then wins 5 to 1.
  useScriptedRolls([4, 4, 1, 5]);
  t.eq('tied dice are re-rolled until one is higher',
    (await resolved([['a', 10, 5], ['b', 10, 5]])).order, ['b', 'a']);

  useScriptedRolls([6, 1]);
  t.eq('Reaction splits the group before any dice are thrown',
    (await resolved([['a', 10, 5], ['b', 10, 5], ['c', 10, 9]])).order, ['c', 'a', 'b']);

  const unused = useScriptedRolls([9, 9, 9]);
  await resolved([['a', 10, 5], ['b', 12, 5]]);
  t.is('no dice are rolled when nobody is tied', unused.remaining(), 3);
}
