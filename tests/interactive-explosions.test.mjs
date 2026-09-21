/**
 * Every explosion is interactive, and the next step waits for it — 2026-09-14.
 *
 * The maintainer: "all explosions should be interactive, we should wait for dice explosions to
 * finish before queing up other things." The Rule of Six (SR3 p.38): above TN 6 a 6 is rolled
 * again. MIJI (the contest, infiltration, detection, ECCM, footprint, IVIS), the three Orthodox
 * Matrix cards, fooling a ward and a spirit resisting banishment rolled those waves in a silent
 * loop (`_resolveRoll`) and went straight on — the dice were right, but nobody rolled them and the
 * next dialog arrived first. The Chase Scene's Driver Points (an Open Test, p.40) did the same.
 *
 * Now `SR3EActor.rollOpposedPair` (two rolls compared, on the F4 ⏳ card) and `SR3EActor.rollThen`
 * (one roll, then a step) put every 6 on a 💥 card. Driven here through the real registry and the
 * real `sr3e.opposed.settle` handler, with a stubbed message store.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { SR3EQuery, SR3EQueue } = await import('../scripts/SR3EQuery.js');
const { SR3EMIJI } = await import('../scripts/SR3EMIJI.js');
const { SR3EWard } = await import('../scripts/documents/SR3EWard.js');
const { SR3EPurchase } = await import('../scripts/SR3EPurchase.js');
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');   // Quick Draw's follow-up (TODO 47)
const { openTestFirstWave, openTestExplode, openTestPending, openTestHighest } = await import('../scripts/data/open-test.mjs');

export const name = 'interactive-explosions';

const root = new URL('../', import.meta.url);
const read = rel => readFileSync(new URL(rel, root), 'utf8');
const die  = (success, needsExplosion = false, total = success ? 5 : 2) =>
  ({ success, needsExplosion, isOne: total === 1, faces: [total], total, done: !needsExplosion });
const seq  = arr => { let i = 0; return () => arr[i++]; };

/** A stub roller: each `_rollWave` call hands back the next prepared wave; wave cards are recorded. */
function stubActor(id, waves, cards) {
  const queue = [...waves];
  return {
    id, name: id,
    _rollWave: () => queue.shift(),
    _postWaveCard: async state => { cards.push({ id, ...state }); },
  };
}

export async function run(t) {
  // ── A message store, and the real settle handler registered against it ───────────
  const messages = new Map();
  let seqId = 0;
  const created = [];
  globalThis.ChatMessage = {
    getSpeaker: () => ({}),
    create: async data => {
      const m = {
        id: `m${++seqId}`, content: data.content, flags: structuredClone(data.flags ?? {}),
        getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
        async update(changes) {
          for (const [k, v] of Object.entries(changes)) {
            if (k === 'content') this.content = v;
            else if (k === 'flags.The2ndChumming3e.opposed') this.flags.The2ndChumming3e.opposed = structuredClone(v);
          }
        },
      };
      messages.set(m.id, m);
      created.push(m);
      return m;
    },
  };
  globalThis.CONST = { CHAT_MESSAGE_STYLES: { ROLL: 0, OTHER: 1 } };
  globalThis.game.messages = { get: id => messages.get(id) };
  globalThis.game.user = { id: 'gm', isGM: true };
  globalThis.game.sr3e = { SR3E, SR3EActor, SR3EItem, SR3EQuery, SR3EQueue, SR3EMIJI, SR3EWard, SR3EPurchase };
  globalThis.CONFIG.queries = {};
  SR3EQuery.register();

  /* ── The registries: every kind reaches a real method ──────────────────────────── */
  const resolves = ([cls, fn]) => typeof (cls === 'SR3EActor' ? SR3EActor : game.sr3e[cls])?.[fn] === 'function';
  for (const [kind, entry] of Object.entries(SR3EActor.OPPOSED_RESULTS)) {
    t.ok(`opposed kind '${kind}' → ${entry.join('.')} exists`, resolves(entry));
  }
  for (const [kind, entry] of Object.entries(SR3EActor.FOLLOW_UPS)) {
    t.ok(`follow-up '${kind}' → ${entry.join('.')} exists`, resolves(entry));
  }
  let threw = false;
  try { SR3EActor.postOpposedResult('no-such-kind', {}, [], []); } catch { threw = true; }
  t.ok('an unknown kind throws rather than silently posting nothing', threw);

  /* ── rollThen: one roll, then a step ───────────────────────────────────────────── */
  const followed = [];
  SR3EActor.FOLLOW_UPS.__test = ['SR3EActor', '__testFollowUp'];
  SR3EActor.__testFollowUp = (ctx, res) => { followed.push({ ctx, res }); };

  let cards = [];
  await SR3EActor.rollThen(stubActor('Rigger', [[die(true), die(false)]], cards), 2, 5,
    { label: 'Detect', followUp: { kind: '__test', ctx: { n: 1 } } });
  t.is('nothing to explode → the step runs at once', followed.length, 1);
  t.is('…with the roll\'s successes', followed[0]?.res.successes, 1);
  t.is('…and its ctx', followed[0]?.ctx.n, 1);
  t.is('…and no extra wave card (unchanged at TN ≤ 6)', cards.length, 0);

  followed.length = 0; cards = [];
  await SR3EActor.rollThen(stubActor('Rigger', [[die(true), die(false, true, 6)]], cards), 2, 8,
    { label: '📡 Infiltration', followUp: { kind: '__test', ctx: { n: 2 } } });
  t.is('a 6 at TN 8 → the step WAITS (this is the bug: it used to run here, off a silent loop)', followed.length, 0);
  t.is('…a wave card is posted for the roller to click 💥', cards.length, 1);
  t.ok('…carrying the step, at wave 0, with the TN and label', cards[0]?.followUp?.kind === '__test'
    && cards[0].wave === 0 && cards[0].tn === 8 && cards[0].label === '📡 Infiltration');
  // The last 💥: `_postWaveCard` calls runFollowUp with the final dice (source check below).
  followed.length = 0;
  if (cards[0]) await SR3EActor.runFollowUp(cards[0].followUp, [die(true), die(true, false, 9)]);
  t.is('the last wave runs the step with the EXPLODED dice', followed[0]?.res.successes, 2);

  /* ── rollOpposedPair: two rolls compared ──────────────────────────────────────── */
  const posted = [];
  SR3EActor.OPPOSED_RESULTS.__test = ['SR3EActor', '__testResult'];
  SR3EActor.__testResult = (ctx, a, d) => { posted.push({ ctx, a: a.filter(x => x.success).length, d: d.filter(x => x.success).length }); };

  cards = [];
  await SR3EActor.rollOpposedPair('__test', { k: 1 },
    { actor: stubActor('Int', [[die(true)]], cards), pool: 1, tn: 4, label: 'I' },
    { actor: stubActor('Def', [[die(false)]], cards), pool: 1, tn: 4, label: 'D' });
  t.is('nothing explodes → the result posts at once', posted.length, 1);
  t.is('…with no ⏳ card and no wave cards', `${messages.size}:${cards.length}`, '0:0');

  posted.length = 0; cards = [];
  await SR3EActor.rollOpposedPair('__test', { k: 2 },
    { actor: stubActor('Int', [[die(true), die(false, true, 6)]], cards), pool: 2, tn: 7, label: '⚡ Int' },
    { actor: stubActor('Def', [[die(true)]], cards), pool: 1, tn: 4, label: '⚡ Def' });
  t.is('the intruder has a 6 at TN 7 → no result yet', posted.length, 0);
  t.is('…one ⏳ card', messages.size, 1);
  t.is('…and a wave card for the side that explodes only', cards.map(c => c.id).join(), 'Int');
  const ref = cards[0]?.opposed;
  t.ok('…carrying its reference to the ⏳ card', ref?.messageId && ref.side === 'atk');
  await SR3EActor._settleOpposedSide(ref, [die(true), die(true, false, 9)]);
  t.is('the intruder\'s last wave completes the pair → the result posts once', posted.length, 1);
  t.is('…off the exploded dice (2 v 1, not 1 v 1)', `${posted[0]?.a}-${posted[0]?.d}`, '2-1');

  /* ── The real posters, reached through the registry ─────────────────────────────── */
  const before = created.length;
  await SR3EActor.postOpposedResult('miji', {
    intruderName: 'Trixie', targetVehicleName: 'Drone', operationLabel: 'Jamming', channelLabel: 'Command',
    targetVehicleId: 'v1', channel: 'command',
  }, [die(true), die(true)], [die(false)]);
  const mijiCard = created.slice(before).map(m => m.content).join('');
  t.ok('MIJI: the registry reaches its result card, and the intruder wins by 2', /Intruder wins by <strong>2<\/strong>/.test(mijiCard));

  globalThis.game.actors = { get: id => ({ a1: { id: 'a1', name: 'Initiate' }, w1: { id: 'w1', name: 'Ward', system: { force: 4 } } })[id] };
  const b2 = created.length;
  await SR3EActor.postOpposedResult('ward-fool', { attackerActorId: 'a1', wardActorId: 'w1', grade: 2 },
    [die(true)], [die(true)]);
  t.ok('ward fool: a tie favours the ward', /Ward holds/.test(created.slice(b2).map(m => m.content).join('')));

  /* ── The Open Test (Chase Scene Driver Points, SR3 p.40) ────────────────────────── */
  const w0 = openTestFirstWave(3, seq([6, 3, 6]));
  t.is('open test: two 6s pending after the first wave', openTestPending(w0), 2);
  const w1 = openTestExplode(w0, seq([6, 2]));
  t.is('…each 6 rolls again and adds (12, still pending; 8, final)', w1.map(d => `${d.total}${d.pending ? '+' : ''}`).join(), '12+,3,8');
  t.is('…the first wave is not mutated', w0[0].total, 6);
  const w2 = openTestExplode(w1, seq([1]));
  t.is('…until nothing is pending', openTestPending(w2), 0);
  t.is('…and the result is the highest single die', openTestHighest(w2), 13);
  t.is('a die that never showed a 6 is never re-rolled', openTestExplode([{ faces: [4], total: 4, pending: false }], seq([6]))[0].total, 4);

  /* ── Source: nothing rolls an explosion silently any more ─────────────────────────── */
  const files = [];
  const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); statSync(p).isDirectory() ? walk(p) : /\.m?js$/.test(f) && files.push(p); } };
  walk(new URL('scripts', root).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  const all = files.map(f => [f, readFileSync(f, 'utf8')]);
  t.is('no silent resolver is defined (_resolveRoll / _resolveOrthoRoll)',
    all.filter(([, s]) => /static _resolve(Ortho)?Roll\(/.test(s)).map(([f]) => f).join(), '');
  const later = all.flatMap(([f, s]) => [...s.matchAll(/\._rollWave\(([^;]*?)\)\s*[;,]/g)]
    .filter(m => !/,\s*true\s*$/.test(m[1].replace(/\/\*.*?\*\//g, '').trim())).map(() => f));
  t.is('the only later-wave roll is handleExplosionClick — i.e. a 💥 click', later.length, 1);
  t.is('…and no other call passes isFirstWave = false (the shape of every silent loop)',
    all.flatMap(([, s]) => s.match(/\._rollWave\([^)]*\bfalse\b/g) ?? []).length, 1);
  t.ok('…and it is in handleExplosionClick', /handleExplosionClick[\s\S]{0,300}_rollWave\(/.test(read('scripts/documents/SR3EActor.js')));
  t.ok('the Chase Scene no longer loops its 6s', !/while \(roll === 6\)/.test(read('scripts/SR3EVehicleChase.js')));

  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the 💥 payload carries the step on', /followUp:\s+state\.followUp\s+\?\? null/.test(actor));
  t.ok('the step runs on the final wave, AFTER that wave\'s card is posted',
    actor.indexOf('allDone && state.followUp') > actor.indexOf('${explodeBtn}\n        </div>'));
  t.ok('banishing: the spirit resists on its own wave card when it explodes', /kind: 'banish'/.test(actor));

  const miji = read('scripts/SR3EMIJI.js');
  t.ok('MIJI contest → rollOpposedPair', /rollOpposedPair\('miji'/.test(miji));
  for (const kind of ['miji.infiltrate', 'miji.detect', 'miji.ivis', 'miji.eccm', 'miji.footprint']) {
    t.ok(`${kind} → rollThen`, new RegExp(`kind: '${kind.replace('.', '\\.')}'`).test(miji));
  }
  for (const kind of ['ortho-system', 'ortho-ic', 'ortho-cc']) {
    t.ok(`${kind} → rollOpposedPair`, new RegExp(`rollOpposedPair\\('${kind}'`).test(actor));
  }
  t.ok('ward fool → rollOpposedPair', /rollOpposedPair\('ward-fool'/.test(read('scripts/documents/SR3EWard.js')));
  t.ok('the chase 💥 is gated to the user who rolled', /sr-chase-open-explode-btn[\s\S]{0,300}pl\.userId !== game\.user\.id/.test(read('scripts/sr3e.js')));

  /* ── A 💥 is rolled ONCE — on the message, not only in memory (2026-09-14) ─────── */
  // `_usedButtons` resets on reload by design, so an old wave card's 💥 could be clicked after an
  // F5 and post a new wave for a finished roll; two clients could each roll the same wave.
  const main = read('scripts/sr3e.js');
  const explodeHandler = main.slice(main.indexOf("querySelectorAll('.sr-explode-btn')"), main.indexOf("querySelectorAll('.sr-chase-open-explode-btn')"));
  const chaseHandler   = main.slice(main.indexOf("querySelectorAll('.sr-chase-open-explode-btn')"), main.indexOf('"Resist Damage" button'));
  for (const [what, src, cls] of [['💥', explodeHandler, 'explode'], ['chase 💥', chaseHandler, 'chaseexplode']]) {
    t.ok(`${what}: a 💥 already rolled renders spent, from the message flag`, new RegExp(`_explosionRolled\\(message, '${cls}', i\\)\\) return _spentExplodeBtn`).test(src));
    t.ok(`${what}: the click claims it on the message and stops if someone already did`,
      new RegExp(`if \\(!await _claimExplosion\\(mid, '${cls}', i\\)\\) return _spentExplodeBtn`).test(src));
  }
  t.ok('…the claim comes BEFORE the roll', explodeHandler.indexOf('_claimExplosion') < explodeHandler.indexOf('handleExplosionClick'));
  t.ok('…the chase checks its window BEFORE claiming, so a closed window cannot lock the button',
    chaseHandler.indexOf('instance?.rendered') < chaseHandler.indexOf('_claimExplosion'));
  t.ok('the claim is the append-only, GM-serialised card ledger — the first claim stands',
    /async function _claimExplosion[\s\S]{0,200}_markActed\(mid, _explodeRole\(cls, i\)/.test(main) && /return !res\?\.already/.test(main));
}
