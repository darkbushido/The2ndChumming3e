/**
 * Ready Weapon and Quick Draw · SR3 p.107 (TODO 47) — the rules, and the wiring source-level.
 */
import { readFileSync } from 'node:fs';
import { ReadyWeapon } from '../scripts/data/ready-weapon.mjs';

export const name = 'ready-weapon';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const RW = ReadyWeapon;
  const gun = (ready, conceal = '6') => ({ type: 'firearm', system: { ready, concealability: conceal, category: 'HPist' } });

  /* ── Ready ─────────────────────────────────────────────────────────────────── */
  t.ok('a weapon put away is not ready', !RW.isReady(gun(false)));
  t.ok('a weapon with the field unset (already on a sheet before 0.6) reads as ready', RW.isReady({ type: 'firearm', system: {} }));
  t.ok('fists and cyber-melee are never holstered', RW.isReady({ type: 'melee', system: { ready: false, category: 'UNA' } })
    && RW.isReady({ type: 'melee', system: { ready: false, category: 'CYB' } }));
  t.ok('non-weapons are not gated', RW.isReady({ type: 'gear', system: { ready: false } }));

  /* ── Quick Draw · p.107 ────────────────────────────────────────────────────── */
  t.ok('a pistol-sized firearm (Concealability 4+) can be quick-drawn', RW.canQuickDraw(gun(false, '5')) && RW.canQuickDraw(gun(false, '4')));
  t.ok('…Concealability 3 cannot', !RW.canQuickDraw(gun(false, '3')));
  t.ok('…"4/6" reads its leading figure', RW.canQuickDraw(gun(false, '4/6')));
  t.ok('…a sword cannot — it is a pistol rule', !RW.canQuickDraw({ type: 'melee', system: { concealability: '6' } }));
  t.is('Reaction (4)', RW.quickDrawTN(), 4);
  t.is('+2 not in a proper holster', RW.quickDrawTN({ holstered: false }), 6);
  t.is('+2 more drawing two at once', RW.quickDrawTN({ holstered: false, two: true }), 8);
  t.ok('one success clears it; none does not', RW.quickDrawCleared(1) && !RW.quickDrawCleared(0));
  t.ok('only Simple Action shots — never full auto', RW.quickDrawModeOk('SA') && !RW.quickDrawModeOk('FA'));
  t.eq('throwing weapons ready ½ Quickness at a time, rounded down (at least one)', [5, 6, 1].map(q => RW.thrownPerReady(q)), [2, 3, 1]);

  /* ── Wiring ───────────────────────────────────────────────────────────────── */
  const model = read('scripts/data/ItemDataModels.js');
  const item  = read('scripts/documents/SR3EItem.js');
  const actor = read('scripts/documents/SR3EActor.js');
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  const main  = read('scripts/sr3e.js');
  t.is('`ready` (initial TRUE) on melee, projectile, thrown and firearm', (model.match(/ready:\s+new BooleanField\(\{ initial: true \}\)/g) ?? []).length, 4);
  t.ok('ranged attacks go through the gate — unless a Quick Draw card fires the drawn gun',
    /if \(!options\.quickDrawn && !\(await SR3EItem\._ensureReady\(actor, this\)\)\) return null;/.test(item));
  t.ok('…and a Quick Draw shot is not charged again (Quick Draw is the draw AND the shot)', /if \(!options\.quickDrawn\) game\.sr3e\.SR3EActionLedger\?\.charge\(actor, this\._isConsumable/.test(item));
  t.ok('melee attacks go through the gate', /rollMeleeAttack\(actor, atkWeapon\) \{[\s\S]{0,300}_ensureReady\(actor, atkWeapon\)/.test(item));
  t.ok('the gate warns and offers — Ready, Quick Draw, anyway — it never refuses', /'✋ Ready it \(Simple Action\)'[\s\S]{0,400}Quick Draw[\s\S]{0,300}'Attack anyway'/.test(item));
  t.ok('readying charges Ready Weapon; Quick Draw charges Quick Draw', /charge\(actor, 'readyWeapon', item\.name\)/.test(item) && /charge\(actor, 'quickDraw', item\.name\)/.test(item));
  t.ok('Quick Draw rolls through rollThen, so its 💥 settle before the gun is drawn', /rollThen\(actor, pool, tn, \{[\s\S]{0,200}kind: 'quickDraw'/.test(item)
    && /quickDraw:\s+\['SR3EItem', '_quickDrawRolled'\]/.test(actor));
  t.ok('🎯 Fire is the one decider\'s, one-shot', /\.sr-quickdraw-fire-btn[\s\S]{0,200}_checkBtn[\s\S]{0,200}_isDeciderId\(pl\.actorId\)[\s\S]{0,300}_claimBtn[\s\S]{0,200}rollWeapon\(\{ quickDrawn: true \}\)/.test(main));
  t.ok('the sheet has the ✋ toggle on every weapon row, and readying charges a Simple Action',
    /toggleReady:\s+SR3EActorSheet\._onToggleReady/.test(sheet) && (sheet.match(/\$\{this\._readyIcon\(itemId\)\}/g) ?? []).length === 2
    && /_onToggleReady[\s\S]{0,400}if \(now\) game\.sr3e\.SR3EActionLedger\?\.charge\(this\.actor, 'readyWeapon'/.test(sheet));
}
