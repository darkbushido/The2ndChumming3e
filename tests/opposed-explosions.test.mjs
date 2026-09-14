/**
 * Opposed rolls wait for their explosions — F4 (TESTING.md).
 *
 * The Rule of Six (SR3 p.38): above TN 6 a 6 is not yet a success and is rolled again, one 💥 click
 * per wave. Melee, astral, contested and cybercombat posted their result card straight after the
 * FIRST wave, so at TN 7+ (defaulting +4, a called shot +4) the winner was decided before anyone
 * rolled, and 💥 changed the dice but never the result.
 *
 * This drives the real code end to end — `_openOpposed` → the registered `sr3e.opposed.settle`
 * handler (the GM is this client) → the result poster — against a stubbed message store.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { SR3EQuery, SR3EQueue } = await import('../scripts/SR3EQuery.js');

export const name = 'opposed-explosions';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const die = (success, needsExplosion = false) => ({ success, needsExplosion, isOne: false, faces: [], total: 0, done: !needsExplosion });

export async function run(t) {
  // ── A message store, and the real handler registered against it ──────────────
  const messages = new Map();
  let seq = 0;
  globalThis.ChatMessage = {
    getSpeaker: () => ({}),
    create: async data => {
      const m = {
        id: `m${++seq}`, content: data.content, flags: structuredClone(data.flags ?? {}),
        getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
        async update(changes) {
          for (const [k, v] of Object.entries(changes)) {
            if (k === 'content') this.content = v;
            else if (k === 'flags.The2ndChumming3e.opposed') this.flags.The2ndChumming3e.opposed = structuredClone(v);
          }
        },
      };
      messages.set(m.id, m);
      return m;
    },
  };
  globalThis.CONST = { CHAT_MESSAGE_STYLES: { ROLL: 0, OTHER: 1 } };
  globalThis.game.messages = { get: id => messages.get(id) };
  globalThis.game.user = { id: 'gm', isGM: true };
  globalThis.game.sr3e = { SR3E, SR3EActor, SR3EQuery, SR3EQueue };
  globalThis.CONFIG.queries = {};
  SR3EQuery.register();

  const posted = [];
  const realMelee = SR3EActor._postMeleeResult;
  SR3EActor._postMeleeResult = async (ctx, atk, def) => {
    posted.push({ ctx, atk: atk.filter(d => d.success).length, def: def.filter(d => d.success).length });
  };
  try {
    /* ── Nothing explodes: post at once, exactly as before ──────────────────────── */
    const none = await SR3EActor._openOpposed('melee', { x: 1 }, [die(true), die(false)], [die(true)], { atkName: 'A', defName: 'D' });
    t.is('nothing to explode → no ⏳ card (the resolver posts the result itself)', none, null);
    t.is('…and no message', messages.size, 0);
    t.is('physical dice never explode', await SR3EActor._openOpposed('melee', {}, [die(false, true)], [die(true)], { physicalDice: true }), null);

    /* ── The attacker explodes, the defender does not ───────────────────────────── */
    const refs = await SR3EActor._openOpposed('melee', { kind: 'one' }, [die(true), die(false, true)], [die(true), die(true)],
      { atkName: 'Attacker', defName: 'Defender' });
    t.ok('an exploding side opens a ⏳ card', refs && refs.atk.messageId && refs.atk.side === 'atk' && refs.def.side === 'def');
    const rec = messages.get(refs.atk.messageId).getFlag('The2ndChumming3e', 'opposed');
    t.is('…the attacker still has explosions to roll', rec.atk.done, false);
    t.is('…the defender is final at wave 0', rec.def.done, true);
    t.is('…and no result yet — this is the bug: it used to post here, off wave 0', posted.length, 0);
    t.ok('the ⏳ card offers the GM ⚔ Resolve', /sr-opposed-resolve-btn/.test(messages.get(refs.atk.messageId).content));

    // The attacker's 💥 turns the 6 into a success: 2 hits, not 1.
    await SR3EActor._settleOpposedSide(refs.atk, [die(true), die(true)]);
    t.is('the attacker\'s last wave completes the set → the result posts once', posted.length, 1);
    t.is('…with the EXPLODED dice: 2 attacker successes, not wave 0\'s 1', posted[0].atk, 2);
    t.is('…the tie now goes to the attacker (p.122) — it was a loss on wave 0', `${posted[0].atk}-${posted[0].def}`, '2-2');
    t.ok('…and the ⏳ card says resolved, without the button', /resolved/.test(messages.get(refs.atk.messageId).content)
      && !/sr-opposed-resolve-btn/.test(messages.get(refs.atk.messageId).content));
    await SR3EActor._settleOpposedSide(refs.atk, [die(true), die(true)]);
    await SR3EActor._settleOpposedSide(refs.def, [die(true)]);
    t.is('a late or repeated settle posts nothing more', posted.length, 1);

    /* ── Both explode, on different clients: the result waits for the second ─────── */
    posted.length = 0;
    const both = await SR3EActor._openOpposed('melee', {}, [die(false, true)], [die(false, true)], { atkName: 'A', defName: 'D' });
    await SR3EActor._settleOpposedSide(both.atk, [die(true)]);
    t.is('one side final, the other still rolling → no result', posted.length, 0);
    await SR3EActor._settleOpposedSide(both.def, [die(false)]);
    t.is('…the second completes it', `${posted.length}:${posted[0]?.atk}-${posted[0]?.def}`, '1:1-0');

    /* ── ⚔ Resolve (GM): the dice as they stand ─────────────────────────────────── */
    posted.length = 0;
    const afk = await SR3EActor._openOpposed('melee', {}, [die(true), die(false, true)], [die(false, true)], { atkName: 'A', defName: 'D' });
    await SR3EActor._settleOpposedSide({ messageId: afk.atk.messageId, side: null }, null, { force: true });
    t.is('the GM\'s resolve posts with the wave-0 dice — an unrolled 6 counts as nothing', `${posted.length}:${posted[0]?.atk}-${posted[0]?.def}`, '1:1-0');
  } finally {
    SR3EActor._postMeleeResult = realMelee;
  }

  /* ── The pure rule ───────────────────────────────────────────────────────────────── */
  const base = { resolved: false, atk: { dice: [], done: false }, def: { dice: [], done: true } };
  t.is('settling the only open side completes it', SR3EActor.settleOpposed(base, 'atk', []).complete, true);
  t.is('settling the side already final changes nothing', SR3EActor.settleOpposed(base, 'def', []).changed, false);
  t.is('…and does not complete an open set', SR3EActor.settleOpposed(base, 'def', []).complete, false);
  t.is('settleOpposed does not mutate its input', (SR3EActor.settleOpposed(base, 'atk', []), base.atk.done), false);
  t.is('a resolved record is closed', SR3EActor.settleOpposed({ ...base, resolved: true }, 'atk', []).changed, false);
  t.is('every kind maps to a result card', ['melee', 'astral', 'contested', 'cybercombat']
    .every(k => typeof SR3EActor[{ melee: '_postMeleeResult', astral: '_postAstralResult', contested: '_postContestedResult', cybercombat: '_postCCResult' }[k]] === 'function'), true);

  /* ── Every opposed resolver goes through it ────────────────────────────────────────── */
  const actor = read('scripts/documents/SR3EActor.js');
  for (const [kind, poster] of [['melee', '_postMeleeResult'], ['astral', '_postAstralResult'],
    ['contested', '_postContestedResult'], ['cybercombat', '_postCCResult']]) {
    t.ok(`${kind}: opens the ⏳ card when a side explodes`, new RegExp(`_openOpposed\\('${kind}'`).test(actor));
    t.ok(`${kind}: posts its result immediately only when nothing explodes`, new RegExp(`if \\(!opposed\\) await SR3EActor\\.${poster}\\(`).test(actor));
  }
  t.is('each side\'s wave card carries its reference (8 wave cards)', (actor.match(/opposed:\s+opposed\?\.(atk|def) \?\? null/g) ?? []).length, 8);
  t.ok('the 💥 payload carries it on', /opposed:\s+state\.opposed\s+\?\? null/.test(actor));
  t.ok('a side\'s final exploded wave reports its dice', /allDone && state\.opposed && \(state\.wave \?\? 0\) > 0/.test(actor));
  t.ok('…AFTER its own wave card is posted, so the result lands below the dice that decided it (live check 2026-09-14)',
    actor.indexOf('allDone && state.opposed && (state.wave ?? 0) > 0') > actor.indexOf('${explodeBtn}\n        </div>'));
  t.ok('the GM serialises the settle per message', /SR3EQueue\.run\(`opposed:\$\{messageId\}`/.test(read('scripts/SR3EQuery.js')));
  t.ok('the resolve button is GM-only', /sr-opposed-resolve-btn[\s\S]{0,120}if \(!game\.user\.isGM\) return _denyBtn/.test(read('scripts/sr3e.js')));
}
