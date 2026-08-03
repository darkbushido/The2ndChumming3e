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
    installGame({ actors: all, sr3e: { isLiveActor: () => true } });
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
}
