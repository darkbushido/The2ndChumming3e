/**
 * A grenade's NPCs resisted in one go (TODO 249) and its marker cleared once the blast is resolved (TODO 250).
 *
 * The maintainer, 2026-10-23: "dealing with all the npcs in a grenade blast is annoying it should be all done
 * at once for NPCs only" · "the blast marker should go away as soon as everything has been resolved".
 *
 * Pure rules (scripts/data/blast-batch.mjs), the batch card's rendering and staging through the real
 * SR3EActor (with Foundry stubs), the auto-clear against a stubbed message store, and source-level checks
 * for the chat wiring. The dialog and the canvas are Foundry-only — see the branch's Foundry checklist.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { BlastBatch, BATCH_STEP, SOAK_STEP } = await import('../scripts/data/blast-batch.mjs');
const { OpenSteps, STEP_BUTTONS } = await import('../scripts/data/open-steps.mjs');

export const name = 'blast-batch';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const die = (total, { done = true, tn = 4 } = {}) =>
  ({ faces: [total], total, isOne: total === 1, success: done && total >= tn, done, needsExplosion: !done });

export async function run(t) {
  /* ── Who batches ────────────────────────────────────────────────────────────── */
  const pcs = new Set(['pc1']);
  const isPC = a => pcs.has(a.id);
  const targets = [
    { actorId: 'pc1', actor: { id: 'pc1', type: 'character' } },
    { actorId: 'n1',  actor: { id: 'n1',  type: 'npc' } },
    { actorId: 'car', actor: { id: 'car', type: 'vehicle' } },
    { actorId: 'n2',  actor: { id: 'n2',  type: 'character' } },   // a character no player owns is an NPC
  ];
  const { individual, batch } = BlastBatch.split(targets, isPC);
  t.eq('player characters keep their own soak cards', individual.map(x => x.actorId), ['pc1', 'car']);
  t.eq('every non-player person is batched, in card order', batch.map(x => x.actorId), ['n1', 'n2']);
  t.eq('a vehicle is never batched — its hardened armour (p.132) resists on its own card',
    BlastBatch.split([targets[2]], () => false).batch, []);
  t.eq('no targets: nothing either way', BlastBatch.split([], isPC), { individual: [], batch: [] });

  t.is('the blast key names the Region', BlastBatch.key('R1', null), 'region:R1');
  t.is('…or the local marker', BlastBatch.key(null, 'M1'), 'marker:M1');
  t.is('…and nothing when no marker was drawn', BlastBatch.key(null, null), null);

  /* ── When the blast is resolved ─────────────────────────────────────────────── */
  const soakKey = i => OpenSteps.key(SOAK_STEP, i);
  const batchKey = OpenSteps.key(BATCH_STEP, 0);
  const base = { individualIds: ['pc1', 'pc2'], batchIds: ['n1', 'n2'] };
  const rolled = (...ids) => ids.map(actorId => ({ actorId, rolled: true }));
  const clicked = { label: 'Resist damage' };

  t.ok('nothing done: not resolved', !BlastBatch.resolved({ ...base, acted: {}, soakCards: [] }));
  t.ok('a PC clicked Resist but has not rolled: NOT resolved (the soak card is still owed)',
    !BlastBatch.resolved({ ...base, acted: { [soakKey(0)]: clicked, [soakKey(1)]: clicked, [batchKey]: { data: { separate: [] } } },
      soakCards: [{ actorId: 'pc1', rolled: false }, ...rolled('pc2')] }));
  t.ok('every PC rolled and the NPC batch rolled: resolved',
    BlastBatch.resolved({ ...base, acted: { [soakKey(0)]: clicked, [soakKey(1)]: clicked, [batchKey]: { data: { separate: [] } } },
      soakCards: rolled('pc1', 'pc2') }));
  t.ok('…but not while the NPC batch is still owed',
    !BlastBatch.resolved({ ...base, acted: { [soakKey(0)]: clicked, [soakKey(1)]: clicked }, soakCards: rolled('pc1', 'pc2') }));
  t.ok('a soak card rolled for someone else does not count for this PC',
    !BlastBatch.resolved({ individualIds: ['pc1'], acted: { [soakKey(0)]: clicked }, soakCards: rolled('pc2') }));
  t.ok('a soak card with no click on the grenade card does not count (a different button index)',
    !BlastBatch.resolved({ individualIds: ['pc1'], acted: {}, soakCards: rolled('pc1') }));
  t.ok('an NPC the GM sent to its own card must roll it',
    !BlastBatch.resolved({ batchIds: ['n1', 'n2'], acted: { [batchKey]: { data: { separate: ['n2'] } } }, soakCards: [] }));
  t.ok('…and once it has, the blast is resolved',
    BlastBatch.resolved({ batchIds: ['n1', 'n2'], acted: { [batchKey]: { data: { separate: ['n2'] } } }, soakCards: rolled('n2') }));
  const dismissed = { label: OpenSteps.DISMISSED };
  t.ok('a PC step the GM ✕\'d counts as done — nobody will take it',
    BlastBatch.resolved({ individualIds: ['pc1'], acted: { [soakKey(0)]: dismissed }, soakCards: [] }));
  t.ok('…and so does a ✕\'d batch', BlastBatch.resolved({ batchIds: ['n1'], acted: { [batchKey]: dismissed }, soakCards: [] }));
  t.ok('isDismissed reads the ✕ label only', OpenSteps.isDismissed({ k: dismissed }, 'k') && !OpenSteps.isDismissed({ k: clicked }, 'k'));
  t.ok('the ⏳ panel\'s ✕ records that label', /OpenSteps\.DISMISSED/.test(read('scripts/SR3EOpenSteps.js')));
  t.ok('a blast that caught no one is not tracked (its marker stays until 🧹 Clear)', !BlastBatch.tracks({}));

  /* ── The batch button is a ⏳ step owed by the GM, recorded by its handler ─────── */
  t.ok('sr-blast-npc-btn is a step', OpenSteps.isStep(BATCH_STEP));
  t.ok('…that records itself (its dialog can be cancelled)', OpenSteps.recordsItself(BATCH_STEP));
  t.is('…and is owed by the GM: its payload names no owner', OpenSteps.ownerId({ blastKey: 'k', attackerActorId: 'a', targets: [] }), null);
  t.ok('…with a label', !!STEP_BUTTONS[BATCH_STEP].label);

  /* ── Explosions on the batch card ───────────────────────────────────────────── */
  t.eq('explodeIdx names the dice still to explode', BlastBatch.explodeIdx([die(6, { done: false }), die(3), die(6, { done: false })]), [0, 2]);
  t.ok('a finished set is done', BlastBatch.allDone([{ dice: [die(5)] }, { dice: [die(2)] }]));
  t.ok('…one pending die anywhere is not', !BlastBatch.allDone([{ dice: [die(5)] }, { dice: [die(6, { done: false })] }]));
  t.is('successes count hits', BlastBatch.successes([die(5), die(2), die(4)]), 2);

  /* ── The batch card through the real SR3EActor ──────────────────────────────── */
  const names = { n1: 'Ganger', n2: 'Thug' };
  game.actors = { get: id => (names[id] ? { id, name: names[id] } : null) };
  // 10M grenade at the blast point, thrown with 4 successes. Ganger soaks 1, Thug 6.
  const sp = (actorId, power = 10) => ({ actorId, targetActorId: actorId, stagedPower: power, stagedLevel: 'S', isStun: false,
    net: { attackHits: 4, basePower: power, baseLevel: 'M' }, carriedSuccesses: 0 });
  const row = (actorId, dice) => ({ actorId, name: names[actorId], incoming: '10S Physical', resist: 'Body', body: 4, cp: 0,
    armor: 'Ballistic 2', tn: 8, pool: dice.length, dice, glitch: false, notes: [], sp: sp(actorId), extraHtml: '' });
  const finished = { attackHits: 4, wave: 0, rows: [
    row('n1', [die(9, { tn: 8 }), die(3, { tn: 8 })]),
    row('n2', [9, 9, 9, 9, 9, 9].map(v => die(v, { tn: 8 }))),
  ] };
  const html = SR3EActor._blastBatchHtml(finished);
  // Net 4 − 1 = +3 → stages M up one → Serious (p.113/p.119, `netStagedDamage`); 4 − 6 = −2 → M down one → Light.
  t.ok('Ganger: net +3 from 10M → Serious, the same staging a soak card does', /Assign Serious Physical Wound to Ganger/.test(html));
  t.ok('Thug: net −2 from 10M → Light', /Assign Light Physical Wound to Thug/.test(html));
  t.is('one Assign button per NPC — offered, never applied', (html.match(/class="sr-assign-damage-btn"/g) ?? []).length, 2);
  t.is('…and one Knockdown test each', (html.match(/class="sr-knockdown-btn"/g) ?? []).length, 2);
  t.ok('the staging is the soak card\'s own (`_soakResultHtml`), not a copy',
    /SR3EActor\._soakResultHtml\(r\.sp, hits\)/.test(read('scripts/documents/SR3EActor.js')));
  t.ok('no 💥 on a finished batch', !/sr-blast-batch-explode-btn/.test(html));
  t.ok('the card shows TN and armour', /vs TN 8 \(Ballistic 2\)/.test(html));

  const pending = { attackHits: 4, wave: 0, rows: [
    row('n1', [die(6, { done: false, tn: 8 }), die(3, { tn: 8 })]),
    row('n2', [die(9, { tn: 8 })]),
  ] };
  const ph = SR3EActor._blastBatchHtml(pending);
  t.ok('dice still to explode: a 💥 for the lot', /sr-blast-batch-explode-btn" data-wave="0"/.test(ph) && /1 die, 1 NPC/.test(ph));
  t.ok('…and no results — nothing to assign until every wave is rolled', !/sr-assign-damage-btn/.test(ph));

  // The 💥 rolls the next wave for the NPCs that have one, and updates the card in place.
  let updated = null;
  const waves = [];
  const msg = { getFlag: () => pending, update: async u => { updated = u; } };
  game.messages = { get: () => msg, contents: [] };
  game.actors = { get: id => ({ id, name: names[id], _rollWave: (n, tn, first, dice, idx) => {
    waves.push({ id, n, first, idx });
    return dice.map((d, i) => (idx.includes(i) ? { ...d, faces: [...d.faces, 4], total: d.total + 4, success: true, done: true, needsExplosion: false } : d));
  } }) };
  await SR3EActor.handleBlastBatchExplode('m1');
  t.eq('only the NPC with a 6 rolls a wave, and not as a first wave', waves, [{ id: 'n1', n: 1, first: false, idx: [0] }]);
  t.is('the card is updated in place, wave 1', updated?.['flags.The2ndChumming3e.blastBatch']?.wave, 1);
  t.ok('…now with results', /sr-assign-damage-btn/.test(updated?.content ?? ''));
  t.is('the flag passed in was not mutated', pending.wave, 0);

  /* ── The marker clears once everyone has resisted ───────────────────────────── */
  const mk = (flags) => ({ flags, getFlag(scope, k) { return this.flags?.[k]; } });
  const grenade = mk({ blast: { key: 'region:R1', role: 'grenade', regionId: 'R1', markerId: null, sceneId: 'S1',
    individualIds: ['pc1'], batchIds: ['n1'] }, acted: { [soakKey(0)]: clicked } });
  const soakCard = mk({ blast: { key: 'region:R1', role: 'soak', actorId: 'pc1' }, acted: {} });
  let deleted = 0;
  game.user = { id: 'gm' };
  game.users = { activeGM: { id: 'gm' } };
  game.scenes = { get: () => ({ regions: { get: id => (id === 'R1' ? { delete: async () => { deleted++; } } : null) } }) };
  game.messages = { contents: [grenade, soakCard] };
  t.ok('PC not rolled yet: the marker stays', !(await SR3EActor.autoClearBlast(soakCard)) && deleted === 0);
  soakCard.flags.acted = { soaker: { label: 'Target' } };
  t.ok('PC rolled, NPC batch still owed: the marker stays', !(await SR3EActor.autoClearBlast(soakCard)) && deleted === 0);
  grenade.flags.acted[batchKey] = { label: 'x', data: { separate: [] } };
  t.ok('everyone has resisted: resolved', await SR3EActor.autoClearBlast(grenade));
  t.is('…and the active GM deletes the Region', deleted, 1);
  game.user = { id: 'player' };
  await SR3EActor.autoClearBlast(grenade);
  t.is('a player\'s client never deletes the Region', deleted, 1);
  let destroyed = 0;
  const local = mk({ blast: { key: 'marker:M1', role: 'grenade', regionId: null, markerId: 'M1', individualIds: [], batchIds: ['n1'] },
    acted: { [batchKey]: { label: 'x', data: { separate: [] } } } });
  game.messages = { contents: [local] };
  game.sr3e._blastMarkers = new Map([['M1', { destroy: () => { destroyed++; } }]]);
  await SR3EActor.autoClearBlast(local);
  t.ok('the client holding the local PIXI marker destroys it', destroyed === 1 && !game.sr3e._blastMarkers.has('M1'));
  t.ok('a card with no blast flag (a smoke cloud, a spell) is left alone', !(await SR3EActor.autoClearBlast(mk({}))));

  /* ── Source: wiring ─────────────────────────────────────────────────────────── */
  const actor = read('scripts/documents/SR3EActor.js');
  const sr3e  = read('scripts/sr3e.js');
  const aoe = actor.slice(actor.indexOf('if (state.isAoE && state.aoeCenter) {'), actor.indexOf('} else if (successes === 0) {'));
  t.ok('the grenade card splits its targets with isPlayerCharacter, never hasPlayerOwner',
    /BlastBatch\.split\(caught, a => game\.sr3e\.SR3EQuery\.isPlayerCharacter\(a\)\)/.test(aoe) && !/hasPlayerOwner/.test(aoe));
  t.ok('…posts individual Resist buttons for the individual targets only', /for \(const t of individual\)[\s\S]{0,1200}sr-soak-btn/.test(aoe));
  t.ok('…each carrying the blast key to its soak card', /blastKey,\s+\/\/ the soak card names its blast/.test(aoe));
  t.ok('…and one GM batch button for the NPCs', /class="sr-blast-npc-btn"/.test(aoe));
  t.ok('…and names its blast on the card (flags.blast)', /cardFlags = \{ blast: \{ key: blastKey, role: 'grenade'/.test(aoe));
  t.ok('…but never on an area-effect cloud (TODO 164)', /const blastKey = state\.aoeEffect \? null/.test(aoe));
  t.ok('the wave card carries cardFlags', /\.\.\.\(cardFlags \? \{ flags: \{ 'The2ndChumming3e': cardFlags \} \} : \{\}\)/.test(actor));
  t.ok('a soak card from a blast is flagged with it', /payload\.blastKey \? \{ blast: \{ key: payload\.blastKey, role: 'soak'/.test(actor));
  t.ok('the batch reads each NPC exactly as its soak card would (`_soakSetup`)', /return \{ i, t, actor, incoming, s: actor\._soakSetup\(incoming\) \}/.test(actor));
  t.ok('…and the soak card reads the same', /const s = this\._soakSetup\(payload\);/.test(actor));
  t.ok('the batch dialog is wired through wait()\'s render option',
    /handleBlastBatch[\s\S]*?render: \(_event, dialog\) => wireDialog\(dialog, dialog\.element\)/.test(actor));
  t.ok('Combat Pool starts at 0 in the batch', /class="sr-batch-cp" value="0"/.test(actor));
  t.ok('…and is charged after the roll through spendCombatPool', /_rollWave\(pool, choice\.tn, true\)[\s\S]{0,400}actor\.spendCombatPool\(useCP\)/.test(actor));
  t.ok('the batch step is recorded after the dialog, naming separate NPCs',
    /'sr3e\.card\.mark', \{\s*messageId, role: stepKey,[\s\S]{0,120}data: \{ separate:/.test(actor));
  const npcBtn = sr3e.slice(sr3e.indexOf("html.querySelectorAll('.sr-blast-npc-btn')"), sr3e.indexOf("html.querySelectorAll('.sr-blast-batch-explode-btn')"));
  t.ok('batch button: GM only', /if \(!game\.user\.isGM\) return _denyBtn\(btn,/.test(npcBtn));
  t.ok('…one-shot', /_checkBtn\(btn, mid, 'blastnpc', i\)/.test(npcBtn) && /_claimBtn\(btn, mid, 'blastnpc', i\)/.test(npcBtn));
  t.ok('…refused once recorded on the card', /_actedOn\(message\)\[OpenSteps\.key\('sr-blast-npc-btn', i\)\]/.test(npcBtn));
  t.ok('…and handed back when the dialog is cancelled', /=== false\) \{\s*_usedButtons\.delete\(`\$\{mid\}\|blastnpc\|\$\{i\}`\)/.test(npcBtn));
  const exBtn = sr3e.slice(sr3e.indexOf("html.querySelectorAll('.sr-blast-batch-explode-btn')"), sr3e.indexOf('// ☣ A gas cloud'));
  t.ok('batch 💥: GM only, one-shot per wave', /isGM\) return _denyBtn/.test(exBtn) && /_checkBtn\(btn, mid, 'blastbatchexplode', wave\)/.test(exBtn));
  t.ok('auto-clear runs on acted changes to a blast card',
    /Hooks\.on\('updateChatMessage'[\s\S]{0,200}flags\.The2ndChumming3e\.acted[\s\S]{0,200}SR3EActor\.autoClearBlast\(message\)/.test(sr3e));
  t.ok('🧹 Clear is still there', /html\.querySelectorAll\('\.sr-clear-blast-btn'\)/.test(sr3e));
  t.ok('auto-clear deletes Regions on the active GM only', /g\.regionId && game\.user\?\.id === game\.users\?\.activeGM\?\.id/.test(actor));
}
