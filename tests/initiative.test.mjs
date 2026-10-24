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

  /* ---- end-of-turn resets ----
   * Three separate bugs came from state that only endCombat() reset: recoil, the dice
   * pools, and Full Defense. They were invisible because every round used to call
   * endCombat. These assertions pin the whole set to the turn boundary.
   */
  {
    const calls = [];
    // Every tracked value is dirty, so every reset is expected to fire. The spent/fired
    // counters are load-bearing: the resets are dirty-checked, so an actor with nothing
    // spent would legitimately produce no calls at all.
    const mkActor = () => ({
      system: {
        fullDefense: true, fullDefensePool: 4,
        roundsFiredThisPhase: 3,
        combatPoolSpent: 2, spellPoolSpent: 1,
        astralPoolSpent: 1, hackingPoolSpent: 1,
      },
      resetRecoil:        async () => calls.push('recoil'),
      refreshCombatPool:  async () => calls.push('combatPool'),
      refreshSpellPool:   async () => calls.push('spellPool'),
      refreshAstralPool:  async () => calls.push('astralPool'),
      refreshHackingPool: async () => calls.push('hackingPool'),
      update:             async u  => calls.push(`update:${JSON.stringify(u)}`),
    });
    const combat = Object.create(SR3ECombat.prototype);
    combat.combatants = { contents: [{ actor: mkActor() }] };
    await combat._endOfTurnReset();

    t.ok('recoil resets at the turn boundary',        calls.includes('recoil'));
    t.ok('Combat Pool refreshes at the turn boundary', calls.includes('combatPool'));
    t.ok('Spell Pool refreshes',                       calls.includes('spellPool'));
    t.ok('Astral Pool refreshes',                      calls.includes('astralPool'));
    t.ok('Hacking Pool refreshes',                     calls.includes('hackingPool'));
    t.ok('Full Defense is cleared',
      calls.some(c => c.startsWith('update:') && c.includes('"system.fullDefense":false')),
      `updates seen: ${calls.filter(c => c.startsWith('update:')).join(' | ') || 'none'}`);
    t.ok('the Full Defense pool is zeroed too',
      calls.some(c => c.includes('"system.fullDefensePool":0')));
  }

  // An actor NOT in Full Defense must not be written to needlessly.
  {
    const calls = [];
    const combat = Object.create(SR3ECombat.prototype);
    combat.combatants = { contents: [{ actor: {
      system: { fullDefense: false },
      resetRecoil: async () => {}, refreshCombatPool: async () => {},
      refreshSpellPool: async () => {}, refreshAstralPool: async () => {},
      refreshHackingPool: async () => {},
      update: async () => calls.push('update'),
    } }] };
    await combat._endOfTurnReset();
    t.is('no needless write when Full Defense was not active', calls.length, 0);
  }

  /* ---- the reset is dirty-checked, so overlapping calls are free ----
   * Three call sites now overlap by design — Begin Encounter, startCombat and _newRound —
   * and every reset helper writes unconditionally, firing the updateActor hook that drives
   * status icons and the auto-defeated logic. An already-clean actor must produce silence,
   * or starting a fight would fire that hook several times per combatant for no change.
   */
  {
    const calls = [];
    const combat = Object.create(SR3ECombat.prototype);
    combat.combatants = { contents: [{ actor: {
      system: {
        fullDefense: false, roundsFiredThisPhase: 0,
        combatPoolSpent: 0, spellPoolSpent: 0,
        astralPoolSpent: 0, hackingPoolSpent: 0,
      },
      resetRecoil:        async () => calls.push('recoil'),
      refreshCombatPool:  async () => calls.push('combatPool'),
      refreshSpellPool:   async () => calls.push('spellPool'),
      refreshAstralPool:  async () => calls.push('astralPool'),
      refreshHackingPool: async () => calls.push('hackingPool'),
      update:             async () => calls.push('update'),
    } }] };
    await combat._endOfTurnReset();
    await combat._endOfTurnReset();   // the overlap the three call sites create
    t.is('an already-clean actor is never written to', calls.length, 0,
      `unexpected writes: ${calls.join(' | ')}`);
  }

  // Each field is checked independently — a stale Combat Pool must not be skipped just
  // because recoil happens to be clean, which a single combined guard would do.
  {
    const calls = [];
    const combat = Object.create(SR3ECombat.prototype);
    combat.combatants = { contents: [{ actor: {
      system: { combatPoolSpent: 3, roundsFiredThisPhase: 0, fullDefense: false },
      resetRecoil:        async () => calls.push('recoil'),
      refreshCombatPool:  async () => calls.push('combatPool'),
      refreshSpellPool:   async () => calls.push('spellPool'),
      refreshAstralPool:  async () => calls.push('astralPool'),
      refreshHackingPool: async () => calls.push('hackingPool'),
      update:             async () => calls.push('update'),
    } }] };
    await combat._endOfTurnReset();
    t.is('a spent Combat Pool still refreshes on its own', calls.join(','), 'combatPool');
  }

  /* ---- round 1 refreshes too ----
   * The regression this guards: _endOfTurnReset had exactly ONE caller, _newRound, so
   * combat STARTED without a refresh. Round 1 inherited whatever was left over and
   * endCombat's optional prompt was the only thing cleaning up for the next fight —
   * decline it, or close a tracker without it, and the next fight opened depleted.
   * RAW p.104 makes "All Dice Pools Refresh" step 1, and round 1 is a Combat Turn.
   */
  {
    const order = [];
    const combat = Object.create(SR3ECombat.prototype);
    combat.combatants     = { contents: [] };
    combat._endOfTurnReset = async () => { order.push('reset'); };
    combat.rebuildQueue    = async () => { order.push('rebuildQueue'); return []; };
    await combat.startCombat();

    // Asserted as the exact sequence, not `indexOf(reset) < indexOf(rebuildQueue)`: with
    // the reset missing, indexOf returns -1 and that comparison passes trivially, so the
    // ordering check would have silently kept passing through the very regression it is
    // here to catch.
    t.is('starting combat refreshes the pools, before building the queue',
      order.join(' → '), 'reset → rebuildQueue');
  }

  // An actorless combatant must not throw.
  {
    const combat = Object.create(SR3ECombat.prototype);
    combat.combatants = { contents: [{ actor: null }] };
    let threw = false;
    try { await combat._endOfTurnReset(); } catch { threw = true; }
    t.is('a combatant with no actor is skipped, not fatal', threw, false);
  }

  /* ---- TODO 242: the tracker lists tied combatants in the order they act ---- */
  // Seen in play, 2026-10-23. Core's _sortCombatants breaks ties by id; the queue by the tieBreak rank.
  {
    Number.isNumeric ??= n => typeof n === 'number' ? Number.isFinite(n) : (n !== '' && n !== null && Number.isFinite(Number(n)));
    // 'zz' wins on Reaction, so acts before 'aa' — the id order says the opposite.
    const { combat } = makeCombat([['aa', 12, 3], ['zz', 12, 6], ['mid', 20], ['none', null]]);
    await combat._assignTieBreaks();
    const rows = combat.combatants.contents.slice().sort(SR3ECombat.prototype._sortCombatants).map(c => c.id);
    const acts = combat.buildRoundQueue().filter(s => s.pass === 1).map(s => s.id);
    t.eq('tracker rows: initiative first, then the tie-break rank', rows, ['mid', 'zz', 'aa', 'none']);
    t.eq('…the same order the queue plays them', rows.slice(0, 3), acts);
    t.is('the comparator works unbound, as core calls it', [combat.combatants.contents[0], combat.combatants.contents[1]]
      .sort(SR3ECombat.prototype._sortCombatants)[0].id, 'zz');
  }
  {
    // Found checking 242 live: core keeps `turn` on the same combatant across the tie-break re-sort, so a fresh
    // combat pointed at the id-first combatant instead of whoever acts first.
    const applied = [];
    const combat = Object.create(SR3ECombat.prototype);
    combat.combatants      = { contents: [] };
    combat._endOfTurnReset = async () => {};
    combat.rebuildQueue    = async () => [{ id: 'first', score: 12, pass: 1 }, { id: 'second', score: 12, pass: 1 }];
    combat._applySlot      = async (q, i) => { applied.push(q[i].id); };
    await combat.startCombat();
    t.eq('starting combat points the tracker at the first slot of the queue', applied, ['first']);
  }
  t.ok('a GM\'s initiative edit re-points the turn after the re-sort',
    /Hooks\.on\('updateCombatant'[\s\S]{0,900}rebuildQueue\(\)[\s\S]{0,300}_applySlot\(queue, index\)/.test(
      (await import('node:fs')).readFileSync(new URL('../scripts/sr3e.js', import.meta.url), 'utf8')));

  /* ---- TODO 243: the Next Round control runs the same upkeep as End Turn ---- */
  // Seen in play, 2026-10-23: Full Defense stayed on into the next round. Core's Next Round calls
  // Combat#nextRound directly, and only the End Turn route (_newRound) ran the reset.
  {
    const base = Object.getPrototypeOf(SR3ECombat.prototype);
    const had  = Object.prototype.hasOwnProperty.call(base, 'nextRound');
    const old  = base.nextRound;
    const steps = [];
    base.nextRound = async function () { steps.push('core'); this.round = (this.round ?? 1) + 1; return this; };
    const mk = () => {
      const combat = Object.create(SR3ECombat.prototype);
      combat.combatants      = { contents: [] };
      combat._endOfTurnReset = async () => { steps.push('reset'); };
      combat._countDownStun  = async () => { steps.push('stun'); };
      combat.rollInitiative  = async () => { steps.push('roll'); };
      combat.rebuildQueue    = async () => [{ id: 'a', score: 9, pass: 1 }];
      combat._applySlot      = async () => { steps.push('apply'); };
      return combat;
    };
    const prevGame = globalThis.game;
    globalThis.game = { ...prevGame, user: { isGM: true } };
    await mk().nextRound();
    t.eq('Next Round (the tracker control): core, then Full Defense/pools reset, stun, re-roll, first slot',
      steps.splice(0), ['core', 'reset', 'stun', 'roll', 'apply']);
    await mk()._newRound();
    t.eq('…the last End Turn of a round takes exactly the same path', steps.splice(0), ['core', 'reset', 'stun', 'roll', 'apply']);
    globalThis.game = { ...prevGame, user: { isGM: false } };
    await mk().nextRound();
    t.eq('…a player cannot start the round (the upkeep writes other people\'s actors)', steps.splice(0), []);
    globalThis.game = prevGame;
    if (had) base.nextRound = old; else delete base.nextRound;
  }

  /* ---- TODO 252: the unconscious get no turns from the next round ---- */
  // Requested in play, 2026-10-23 ("a bug", the maintainer): someone knocked unconscious leaves the order at the
  // next round. A full track marks the combatant defeated (sr3e.js updateActor); they stay on the tracker.
  {
    const { combat } = makeCombat([['a', 21], ['ko', 15], ['b', 4]]);
    combat.combatants.contents.find(c => c.id === 'ko').isDefeated = true;
    t.eq('a defeated combatant has no slot in the round', combat.buildRoundQueue().map(s => `${s.id}@${s.score}`),
      ['a@21', 'b@4', 'a@11', 'a@1']);
    combat.combatants.contents.find(c => c.id === 'ko').isDefeated = false;
    t.ok('…and once healed (no longer defeated), acts again', combat.buildRoundQueue().some(s => s.id === 'ko'));
  }
  {
    const { combat, written } = makeCombat([['x', 12, 3], ['ko', 12, 3]]);
    combat.combatants.contents.find(c => c.id === 'ko').isDefeated = true;
    await combat._assignTieBreaks();
    t.ok('no tie-break dice-off with an unconscious combatant', !('ko' in written) && written.x === 0);
  }
  {
    // The round's re-roll skips them; asked for by id (the GM, deliberately), anyone still rolls.
    const rolled = [];
    const mk = (id, isDefeated) => ({ id, isDefeated, initiative: 10, actor: {
      type: 'character', system: {}, clearSpellDefense: async () => {}, rollInitiative: async () => { rolled.push(id); return 10; },
    }, update: async () => {} });
    const list = [mk('a', false), mk('ko', true)];
    const combat = Object.create(SR3ECombat.prototype);
    combat.combatants = { contents: list, get: id => list.find(c => c.id === id), find: f => list.find(f) };
    combat.rebuildQueue = async () => [];
    globalThis.game = { ...globalThis.game, sr3e: { SR3EActor: { promptSpellDefenseDeclaration: async () => {} } } };
    await combat.rollInitiative();
    t.eq('the new round\'s initiative roll skips the defeated', rolled, ['a']);
    rolled.length = 0;
    await combat.rollInitiative(['ko']);
    t.eq('…a roll asked for by id still rolls them', rolled, ['ko']);
  }
}

