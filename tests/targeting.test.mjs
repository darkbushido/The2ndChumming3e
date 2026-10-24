/**
 * Target selection — SR3EItem._promptTarget.
 *
 * The bug this guards: the caster was filtered out of the candidate list
 * unconditionally, so a line-of-sight spell could not be cast on its own caster.
 * Self-targeting is opt-in via { allowSelf: true } because the same function serves
 * rollWeapon / rollMeleeAttack / rollVehicleWeapon, where a wielder must never be
 * offered as a target for their own gun.
 */
import { installGlobals, installGame, makeActor } from './helpers/foundry.mjs';
installGlobals();
globalThis.foundry.utils.escapeHTML ??= s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

// Capture the dialog markup and answer with whatever is pre-checked, so the assertions
// see exactly the choices a user would have been shown.
let rendered = null;
globalThis.foundry.applications.api.DialogV2 = {
  async wait(cfg) {
    rendered = cfg.content;
    const checked = /value="([^"]+)"[^>]*checked/.exec(cfg.content);
    cfg.buttons.find(b => b.action === 'confirm')
      ?.callback(null, null, { element: { querySelector: () => (checked ? { value: checked[1] } : null) } });
  },
};

const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');
const { sceneFirst } = await import('../scripts/data/actor-scope.mjs');

export const name = 'targeting';

export async function run(t) {
  const caster = makeActor({ id: 'CASTER', name: 'Dave Decker' });

  /**
   * @param actors  other actors present
   * @param opts    casterHasToken / canvasReady / allowSelf
   * @returns rows as [{id, checked}] plus the actor the dialog returned
   */
  async function offer(actors, { casterHasToken = true, canvasReady = true, allowSelf } = {}) {
    caster.getActiveTokens = () => (casterHasToken ? [{}] : []);
    const all = [caster, ...actors];
    installGame({ actors: all, sr3e: { isLiveActor: () => true, sceneFirst } });
    globalThis.canvas = { ready: canvasReady };
    rendered = null;

    const picked = await SR3EItem._promptTarget(caster, allowSelf === undefined ? undefined : { allowSelf });
    const rows = [...(rendered?.matchAll(/value="([^"]+)"([^>]*)/g) ?? [])]
      .map(m => ({ id: m[1], checked: /checked/.test(m[2]) }));
    return { rows, ids: rows.map(r => r.id), picked: picked?.id ?? null, html: rendered ?? '' };
  }

  const withToken = (id, name = id, type = 'character') =>
    Object.assign(makeActor({ id, name, type }), { getActiveTokens: () => [{}] });
  const grunt = withToken('GRUNT', 'Ganger', 'npc');
  const rival = withToken('RIVAL', 'Rival');

  /* ---- weapons: the caster must never be offered ---- */
  const weapon = await offer([grunt, rival]);
  t.eq('weapon path lists only other actors', weapon.ids, ['GRUNT', 'RIVAL']);
  t.is('weapon path preselects the first', weapon.picked, 'GRUNT');

  const weaponAlone = await offer([]);
  t.eq('weapon path with no other actors offers nothing', weaponAlone.ids, []);
  t.is('weapon path with no targets returns null', weaponAlone.picked, null);

  /* ---- spells: self is offered, last, unchecked ---- */
  const spell = await offer([grunt, rival], { allowSelf: true });
  t.ok('spell path offers the caster', spell.ids.includes('CASTER'));
  t.is('caster is listed last', spell.ids.at(-1), 'CASTER');
  t.is('caster is NOT preselected — a stray Confirm must not self-target',
    spell.rows.find(r => r.id === 'CASTER')?.checked, false);
  t.ok('caster row is marked [self]', /\[self\]/.test(spell.html));

  /* ---- the case that would have shipped broken ---- */
  // Self is appended AFTER the on-canvas filter. That filter prefers actors with tokens
  // and only falls back to the world list when none are found, so a caster with no token
  // placed while others have one would otherwise vanish from their own spell's list.
  const noToken = await offer([grunt], { casterHasToken: false, allowSelf: true });
  t.ok('caster with no token placed is still offered', noToken.ids.includes('CASTER'));

  const soloCaster = await offer([], { allowSelf: true });
  t.eq('caster alone is the only candidate', soloCaster.ids, ['CASTER']);
  t.is('caster alone is preselected', soloCaster.rows[0]?.checked, true);
  t.is('caster alone is returned', soloCaster.picked, 'CASTER');

  const offCanvas = await offer([grunt], { canvasReady: false, allowSelf: true });
  t.ok('theatre-of-the-mind still offers the caster', offCanvas.ids.includes('CASTER'));

  /* ---- TODO 260: one row per TOKEN — unlinked goons are separate targets ---- */
  // Seen in play 2026-10-24: a list of world actors handed back the sidebar NPC, so the attack (and Mark prone)
  // landed on every unlinked copy of it. Two goons of one NPC share its id; only their uuids differ.
  {
    const base = makeActor({ id: 'GOON', name: 'SWAT Team Member', type: 'npc' });
    const synth = tok => Object.assign(makeActor({ id: 'GOON', name: 'SWAT Team Member', type: 'npc' }),
      { isToken: true, uuid: `Scene.S.Token.${tok}.Actor.GOON`, documentName: 'Actor' });
    const goonA = synth('A'), goonB = synth('B');
    const pc = Object.assign(makeActor({ id: 'PC', name: 'Runner' }), { documentName: 'Actor' });
    installGame({ actors: [caster, base, pc], sr3e: { isLiveActor: () => true, sceneFirst } });
    globalThis.game.scenes = { viewed: { tokens: { contents: [
      { name: 'SWAT Team Member', actor: goonA }, { name: 'SWAT Team Member', actor: goonB },
      { name: 'Runner', actor: pc }, { name: 'Runner', actor: pc },               // a linked PC with two tokens: one row
      { name: 'Dave Decker', actor: caster },
    ] } } };
    globalThis.fromUuidSync = uuid => ({ 'Scene.S.Token.A.Actor.GOON': goonA, 'Scene.S.Token.B.Actor.GOON': goonB })[uuid] ?? null;
    globalThis.canvas = { ready: true };
    rendered = null;
    const picked = await SR3EItem._promptTarget(caster);
    const ids = [...(rendered?.matchAll(/value="([^"]+)"/g) ?? [])].map(m => m[1]);
    t.eq('each unlinked goon is its own row, named by its token; a linked PC once; never the attacker',
      ids, ['Scene.S.Token.A.Actor.GOON', 'Scene.S.Token.B.Actor.GOON', 'PC']);
    t.ok('…repeated names are numbered so the GM can tell them apart', /SWAT Team Member 1/.test(rendered) && /SWAT Team Member 2/.test(rendered));
    t.is('…and the pick is THAT goon\'s own actor, not the sidebar NPC', picked, goonA);
    delete globalThis.game.scenes; delete globalThis.fromUuidSync;
  }
}
