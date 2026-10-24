/**
 * Naming an actor on a card so the button reaches the right one · TODO 260.
 *
 * Seen in play, 2026-10-24: Mark prone on one goon marked every goon copied from the same sidebar NPC, and freshly
 * dragged tokens arrived with old statuses. Reproduced in `test-shadowrun`: three wounds assigned to Goon A left the
 * sidebar NPC, Goon A AND Goon B at 3. An unlinked token's actor has the SAME id as its sidebar actor; cards carried
 * that id and buttons looked it up in `game.actors`.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { ActorRef, tokenRows, actorFrom } from '../scripts/data/actor-ref.mjs';

export const name = 'actor-ref';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const R = ActorRef;
  const base  = { id: 'GOON', name: 'SWAT', documentName: 'Actor', isToken: false };
  const goonA = { id: 'GOON', name: 'SWAT', documentName: 'Actor', isToken: true, uuid: 'Scene.S.Token.A.Actor.GOON' };
  const goonB = { id: 'GOON', name: 'SWAT', documentName: 'Actor', isToken: true, uuid: 'Scene.S.Token.B.Actor.GOON' };
  const pc    = { id: 'PC', name: 'Runner', documentName: 'Actor', isToken: false, uuid: 'Actor.PC' };

  /* ── What a card writes ─────────────────────────────────────────────────── */
  t.is('a linked / world actor is named by its id — unchanged, so old cards keep working', R.of(pc), 'PC');
  t.is('an unlinked token\'s actor is named by its uuid', R.of(goonA), 'Scene.S.Token.A.Actor.GOON');
  t.ok('…so two goons of one NPC get two references, though they share an id', R.of(goonA) !== R.of(goonB) && goonA.id === goonB.id);
  t.is('no actor: null', R.of(null), null);
  t.is('anything that is not a token actor (an item, a world actor) reads as its id', R.of({ id: 'ITEM' }), 'ITEM');

  /* ── What a button reads ────────────────────────────────────────────────── */
  const lookups = { byId: id => ({ GOON: base, PC: pc })[id], byUuid: u => ({ [goonA.uuid]: goonA, [goonB.uuid]: goonB, 'Item.X': { documentName: 'Item' } })[u] };
  t.is('a plain id resolves through the world actors, exactly as game.actors.get did', R.resolve('PC', lookups), pc);
  t.is('a token uuid resolves to THAT token\'s actor, not the sidebar NPC', R.resolve(goonB.uuid, lookups), goonB);
  t.is('a uuid naming something that is not an actor is refused', R.resolve('Item.X', lookups), null);
  t.is('a dead uuid is null, not a throw', R.resolve('Scene.gone.Token.x.Actor.y', { byId: () => null, byUuid: () => { throw new Error('gone'); } }), null);
  t.is('empty / non-string refs are null', [R.resolve('', lookups), R.resolve(null, lookups), R.resolve(5, lookups)].every(x => x === null), true);
  {
    const prev = { game: globalThis.game, fromUuidSync: globalThis.fromUuidSync };
    globalThis.game = { actors: { get: id => ({ PC: pc })[id] } };
    globalThis.fromUuidSync = u => (u === goonA.uuid ? goonA : null);
    t.ok('actorFrom reads the live game.actors and fromUuidSync at call time', actorFrom('PC') === pc && actorFrom(goonA.uuid) === goonA);
    globalThis.game = prev.game; globalThis.fromUuidSync = prev.fromUuidSync;
  }

  /* ── Comparing ─────────────────────────────────────────────────────────── */
  t.ok('a goon is never "the same" as its sidebar NPC — the whole bug', !R.same(goonA, base));
  t.ok('…nor as the other goon', !R.same(goonA, goonB));
  t.ok('a reference and its actor match', R.same(goonA.uuid, goonA) && R.same('PC', pc));

  /* ── The pickers' rows ─────────────────────────────────────────────────── */
  const rows = tokenRows([{ name: 'SWAT', actor: goonA }, { name: 'SWAT', actor: goonB }, { name: 'Runner', actor: pc }, { name: 'Runner', actor: pc }, { name: 'x', actor: null }]);
  t.eq('one row per unlinked token, a linked actor once, tokens with no actor skipped', rows.map(r => r.ref), [goonA.uuid, goonB.uuid, 'PC']);
  t.eq('…repeated names numbered', rows.map(r => r.name), ['SWAT 1', 'SWAT 2', 'Runner']);
  t.eq('…keep() filters (the attacker, templates)', tokenRows([{ actor: goonA }, { actor: pc }], a => a !== pc).map(r => r.ref), [goonA.uuid]);

  /* ── The ratchet: no card names an actor by bare id again ───────────────── */
  // A payload key `…ActorId: x.id` is exactly the bug. Only Foundry document fields and stored links may keep a
  // raw id — each named here with its reason.
  const ALLOWED = {
    'scripts/documents/SR3ESpiritSummoning.js': 'a Combatant document\'s actorId field',
    'scripts/documents/SR3EWard.js':            'casterActorId / creatorActorId stored on the ward actor',
    'scripts/sheets/SR3EActorSheet.js':         'driverActorId — the stored vehicle-driver link (sr3e.actor.create / sr3e.vehicle.link)',
  };
  const hits = execSync('git grep -nE "[A-Za-z]*[aA]ctorId\\s*:\\s*[A-Za-z_$][A-Za-z0-9_$.?]*\\?*\\.id\\b" -- scripts', {
    cwd: new URL('..', import.meta.url), encoding: 'utf8' }).split('\n').filter(Boolean);
  const stray = hits.filter(h => !ALLOWED[h.split(':')[0]] || !/driverActorId|casterActorId|creatorActorId|'Combatant'/.test(h));
  t.eq('no card payload names an actor by bare id (use actorRef) — only the stored links above', stray, []);
  t.ok('…and those are few: 7 lines', hits.length <= 7);
  t.ok('no module looks an actor up with game.actors.get any more (actorFrom) — only SR3EQuery.resolve, which is id-then-uuid itself',
    execSync('git grep -n "game\\.actors?\\?\\.get(" -- scripts', { cwd: new URL('..', import.meta.url), encoding: 'utf8' })
      .split('\n').filter(Boolean).every(l => /^scripts\/SR3EQuery\.js:/.test(l) || /^[^:]+:\d+:\s*\/\//.test(l)));
  t.ok('the target dialogs list tokens (tokenRows), not world actors',
    (read('scripts/documents/SR3EItem.js').match(/tokenRows\(scene\?\.tokens\?\.contents/g) ?? []).length === 2);
  t.ok('the auto-defeated hook matches an unlinked token\'s combatant by token, not by id',
    /actor\.isToken \? c\.tokenId === actor\.token\?\.id : c\.actorId === actor\.id/.test(read('scripts/sr3e.js')));
}
