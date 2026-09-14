/**
 * Which actors a picker offers — F2 (TESTING.md), reported in play 2026-09-14:
 * *"they also show up on the rewards rollable table and a few other things they probably
 * shouldn't"* and *"chunky salsa lists everything, not just the actors on the scene."*
 *
 * Three rules, one per question a list has to answer:
 *   - templates never appear      → `game.sr3e.isLiveActor`
 *   - a party-only list is the party → `SR3EQuery.isPlayerCharacter` (Session Rewards)
 *   - a list about NOW is the scene → `sceneFirst` (`scripts/data/actor-scope.mjs`)
 *
 * The ratchet at the bottom reads every `game.actors` list in `scripts/`: each must use one of
 * those, or be an internal lookup named in ALLOW with its reason. A new picker cannot quietly
 * list every actor in the world again.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneFirst } from '../scripts/data/actor-scope.mjs';

export const name = 'actor-lists';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = rel => readFileSync(join(ROOT, rel), 'utf8');
/** The body of a top-level function or method, from its declaration to the next one. */
const body = (src, decl) => {
  const i = src.indexOf(decl);
  if (i < 0) return '';
  const next = src.slice(i + decl.length).search(/\n(?:async function |function |  static (?:async )?\w+\(|  async \w+\()/);
  return src.slice(i, next < 0 ? undefined : i + decl.length + next);
};

/** Internal lookups that must see every actor — none of them is a list a person picks from. */
const ALLOW = [
  [/_getMatrixFirewall/,                'finds the host an IC is stocked on'],
  [/Deployed IC bypass the template filter/, 'matrix targets on a host: its own template check, deployed IC by design'],
  [/spellDefensePool \?\? 0\) > 0/,     'who declared Spell Defense — only a live combatant can have'],
  [/tickAugmentations|tickAttributeBoosts/, 'per-round timers on every actor'],
  [/driverActorId === (?:actor|this\.actor)\.id/, 'the vehicles a character drives'],
  [/vcrActive|vcrVehicle|const veh = /, 'the vehicle a rigger is jumped into'],
  [/icTargets|deployedIC/,               'IC deployed on this host (deployment is the GM\'s act)'],
  [/infiltration\?\.turnsRemaining/,    'per-round infiltration timer'],
  [/patientsFor\(game\.user/,            'filtered inside patientsFor'],
  [/MIGRATIONS|_migrateActor|fixActor|migrate\(/, 'migration sweep — every actor, templates included'],
];

function* sources(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* sources(p);
    else if (/\.m?js$/.test(f)) yield p;
  }
}

export async function run(t) {
  /* ── sceneFirst ─────────────────────────────────────────────────────────────────── */
  const a = (id, tokens) => ({ id, getActiveTokens: () => Array(tokens).fill({}) });
  const world = [a('onA', 1), a('off', 0), a('onB', 2)];
  t.is('on a scene: only the actors with a token there', sceneFirst(world, { ready: true }).map(x => x.id).join(','), 'onA,onB');
  t.is('nothing on the canvas (theatre of the mind): everyone', sceneFirst([a('x', 0), a('y', 0)], { ready: true }).length, 2);
  t.is('no canvas and no scene at all: everyone', sceneFirst(world, { ready: false, scene: null }).length, 3);
  const scene = { tokens: [{ actorId: 'off' }, { actorId: 'elsewhere' }] };
  t.is('no drawn canvas, but a scene in play: its tokens decide (was: the whole world)',
    sceneFirst(world, { ready: false, scene }).map(x => x.id).join(), 'off');
  t.is('…an empty scene still falls back to everyone', sceneFirst(world, { ready: false, scene: { tokens: [] } }).length, 3);
  t.is('an actor without getActiveTokens is not on the scene, and does not throw', sceneFirst([{ id: 'z' }, a('onA', 1)], { ready: true }).map(x => x.id).join(), 'onA');

  /* ── The lists reported in play ─────────────────────────────────────────────────── */
  const sr3e = read('scripts/sr3e.js');
  const rewards = body(sr3e, 'async function _openSessionRewardDialog');
  t.ok('Session Rewards lists PLAYER characters (the GM\'s Chrome Threats and contacts were in it)', /isPlayerCharacter/.test(rewards));
  for (const [label, decl] of [['Chunky Salsa', 'function _openChunkySalsaCalculator'], ['Barrier Damage', 'async function _openBarrierDamageCalculator'],
    ['Falling Damage', 'async function _openFallingDamageCalculator'], ['Escape Artist', 'async function _openEscapeArtist']]) {
    const b = body(sr3e, decl);
    t.ok(`${label} is found in sr3e.js`, b.length > 0);
    t.ok(`${label} lists the actors on the scene`, /sceneFirst/.test(b));
    t.ok(`${label} hides templates`, /isLiveActor/.test(b));
  }
  t.ok('…Chunky Salsa opened by a grenade keeps the blast\'s own list', /opts\.actorIds\?\.length \? eligible\.filter/.test(body(sr3e, 'function _openChunkySalsaCalculator')));

  const actor = read('scripts/documents/SR3EActor.js');
  const contested = body(actor, 'static async openContestedDialog');
  t.ok('the contested roll offers live characters on the scene — not hosts, IC and vehicles', /sceneFirst/.test(contested) && /isLiveActor/.test(contested));
  t.ok('…and always the actor it was opened from', /new Set\(\[defaultActor/.test(contested));
  t.ok('the Orthodox IC attack offers the deckers on its host', /currentHostId === host\.id/.test(body(actor, 'async rollOrthodoxICAttack')));
  t.ok('…through isLiveActor, not a bare template flag', /isLiveActor/.test(body(actor, 'async rollOrthodoxICAttack')));

  const healing = read('scripts/SR3EHealing.js');
  t.ok('the medic list is the scene\'s', /sceneFirst/.test(body(healing, 'static _actorOptions')));
  t.ok('…keeping the pre-selected medic even from off the canvas', /!list\.includes\(chosen\)/.test(body(healing, 'static _actorOptions')));
  t.is('both healing caster lists are the scene\'s', (healing.match(/sceneFirst\(game\.actors\.filter\([^;]*sorcery/g) ?? []).length, 2);
  t.ok('the patient picker stays world-wide (downtime care is off the map)', !/sceneFirst/.test(body(healing, 'static patientsFor')));

  for (const [file, what] of [['scripts/sheets/SR3EHostSheet.js', 'IC picker'], ['scripts/sheets/SR3EHostSheetOrthodox.js', 'Orthodox IC picker']])
    t.ok(`the ${what} hides templates — deploying puts the stocked actor itself into combat`, /type === 'ic' && game\.sr3e\.isLiveActor/.test(read(file)));
  t.ok('the Orthodox host picker hides templates', /type === 'host' && game\.sr3e\.isLiveActor/.test(body(read('scripts/sheets/SR3EActorSheet.js'), 'static async _onSetOrthoHost')));

  /* ── The ratchet ────────────────────────────────────────────────────────────────── */
  const unfiltered = [];
  for (const file of sources(join(ROOT, 'scripts'))) {
    const src = readFileSync(file, 'utf8');
    const re = /game\.actors(?!\?*\.get\()(?!\.(?:size|length)\b)/g;
    let m;
    while ((m = re.exec(src))) {
      const stmtEnd = src.indexOf(';', m.index);
      const stmt = src.slice(Math.max(0, m.index - 120), stmtEnd < 0 ? m.index + 400 : stmtEnd + 1);
      const line = src.slice(src.lastIndexOf('\n', m.index) + 1, m.index);
      if (/^\s*(\/\*|\*|\/\/)/.test(line)) continue;              // a comment, not a list
      if (/isLiveActor|isPlayerCharacter|sceneFirst/.test(stmt)) continue;
      const around = src.slice(Math.max(0, m.index - 600), m.index + 600);
      if (ALLOW.some(([p]) => p.test(stmt) || p.test(around))) continue;
      unfiltered.push(`${relative(ROOT, file)}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  t.is(`every actor list hides templates, or is a named internal lookup${unfiltered.length ? ` — ${unfiltered.join(', ')}` : ''}`, unfiltered.length, 0);
}
