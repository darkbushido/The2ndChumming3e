/**
 * Token status effects — the GM trims Foundry's core list · TODO 247.
 *
 * The maintainer, in play 2026-10-23: "shadowrun doesnt use all of them and it would be nice to cut it
 * down". Three things this suite holds down:
 *
 *   1. **HIDE, NEVER REMOVE.** `toggleStatusEffect` throws for an id missing from CONFIG.statusEffects
 *      (Foundry 14.365.0 `actor.mjs:544`), and `specialStatusEffects` must keep resolving. So the filter
 *      sets `hud: false` and the list keeps every entry.
 *   2. **The ratchet.** Every core status id the system's code toggles or reads is in `ALWAYS_SHOWN` —
 *      reference a new one (say `toggleStatusEffect('restrain')`) without adding it and this fails.
 *   3. **A token that carries a hidden status can still clear it** — `hiddenActiveStatusIds` feeds the
 *      HUD subclass.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALWAYS_SHOWN, DEFAULT_SHOWN, SR3_REASONS, isSystemStatus, shownCoreIds, isShown,
  applyStatusVisibility, hiddenActiveStatusIds,
} from '../scripts/data/status-effects.mjs';

export const name = 'status-effects';

/** Foundry 14.365.0 `client/config.mjs` — the core status ids, in order. */
const FOUNDRY_CORE = ['dead', 'unconscious', 'sleep', 'stun', 'prone', 'restrain', 'paralysis', 'fly', 'blind',
  'deaf', 'silence', 'fear', 'burning', 'frozen', 'shock', 'corrode', 'bleeding', 'disease', 'poison', 'curse',
  'regen', 'degen', 'hover', 'burrow', 'upgrade', 'downgrade', 'invisible', 'target', 'eye', 'bless',
  'fireShield', 'coldShield', 'magicShield', 'holyShield'];
/** Foundry 14.365.0 `CONFIG.specialStatusEffects`. */
const SPECIAL = ['dead', 'invisible', 'blind', 'burrow', 'hover', 'fly'];

const SCRIPTS = fileURLToPath(new URL('../scripts/', import.meta.url));
function* files(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.m?js$/.test(n)) yield p;
  }
}

/** Status ids the code names: toggleStatusEffect('x'), statuses.has('x'), wrappers of toggleStatusEffect, consts. */
function referencedStatusIds() {
  const found = new Map();                      // id -> first file
  const add = (id, f) => { if (!found.has(id)) found.set(id, f.replace(SCRIPTS, '')); };
  for (const f of files(SCRIPTS)) {
    const src = readFileSync(f, 'utf8');
    const consts = Object.fromEntries([...src.matchAll(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*'([\w-]+)'/g)].map(m => [m[1], m[2]]));
    const arg = a => (/^['"]/.test(a) ? a.slice(1, -1) : consts[a]);
    const ARG = `(['"][\\w-]+['"]|[A-Z_][A-Z0-9_]*)`;
    const pats = [
      new RegExp(`toggleStatusEffect\\(\\s*${ARG}`, 'g'),
      new RegExp(`statuses\\??\\.has\\??\\.?\\(\\s*${ARG}`, 'g'),
      new RegExp(`hasStatusEffect\\??\\.?\\(\\s*${ARG}`, 'g'),
    ];
    // A local wrapper: `const set = (id, …) => actor.toggleStatusEffect(id, …)` → every `set('x'` counts.
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*[\w.?]*toggleStatusEffect\(/g)) {
      pats.push(new RegExp(`\\b${m[1]}\\(\\s*${ARG}`, 'g'));
    }
    for (const re of pats) for (const m of src.matchAll(re)) { const id = arg(m[1]); if (id) add(id, f); }
  }
  return found;
}

export async function run(t) {
  /* ==== the default set ==== */
  t.ok('every default id is a real Foundry core status', DEFAULT_SHOWN.every(id => FOUNDRY_CORE.includes(id)),
    DEFAULT_SHOWN.filter(id => !FOUNDRY_CORE.includes(id)).join(', '));
  t.ok('every always-shown id is in the default set (and has a reason)', ALWAYS_SHOWN.every(id => SR3_REASONS[id]));
  t.ok('every default id carries a reason', DEFAULT_SHOWN.every(id => typeof SR3_REASONS[id] === 'string' && SR3_REASONS[id].length > 10));
  t.ok('the default actually trims (fewer than half of core)', DEFAULT_SHOWN.length < FOUNDRY_CORE.length / 2);
  t.ok('the SR3 shock-weapon stun has its own status, so core "stun" is hidden by default (no two "Stunned")',
    !DEFAULT_SHOWN.includes('stun'));
  for (const id of ['invisible', 'blind', 'fly']) t.ok(`special status ${id} is shown by default`, DEFAULT_SHOWN.includes(id));

  /* ==== shownCoreIds ==== */
  t.eq('unset → the default', [...shownCoreIds(undefined)].sort(), [...DEFAULT_SHOWN].sort());
  t.eq('damaged (not an array) → the default', [...shownCoreIds('frozen')].sort(), [...DEFAULT_SHOWN].sort());
  t.eq('an empty choice still keeps the always-shown ids', [...shownCoreIds([])].sort(), [...ALWAYS_SHOWN].sort());
  t.ok('a saved choice is honoured', shownCoreIds(['frozen']).has('frozen') && !shownCoreIds(['frozen']).has('blind'));
  t.ok('non-strings in a saved choice are dropped', !shownCoreIds([3, null, 'deaf']).has(3));

  /* ==== isShown ==== */
  const core = new Set(FOUNDRY_CORE);
  const shown = shownCoreIds(['blind']);
  t.ok('a system status is always shown', isShown('sr3e-astral', shown, core) && isSystemStatus('sr3e-stunned'));
  t.ok('a module\'s status (not core) is never hidden', isShown('mymodule-hasted', shown, core));
  t.ok('an unticked core status is hidden', !isShown('frozen', shown, core));
  t.ok('a ticked core status is shown', isShown('blind', shown, core));
  t.ok('dead is shown even when unticked', isShown('dead', shown, core));

  /* ==== applyStatusVisibility — hide, never remove ==== */
  // `regen` arrives with a hud another module set — hidden by default, but that value is not ours to change.
  const list = () => [...FOUNDRY_CORE.map(id => (id === 'regen' ? { id, hud: { actorTypes: ['npc'] } } : { id, name: id, img: '' })),
    { id: 'sr3e-vr' }, { id: 'mod-x' }];
  const L = list();
  const before = L.length;
  let hidden = applyStatusVisibility(L, undefined, core);
  t.is('nothing is removed from the list', L.length, before);
  t.ok('every special status still resolves', SPECIAL.every(id => L.some(s => s.id === id)));
  t.ok('a hidden status gets hud:false', L.find(s => s.id === 'frozen').hud === false && hidden.has('frozen'));
  t.ok('a default status keeps no hud flag', !('hud' in L.find(s => s.id === 'blind')));
  t.ok('the always-shown ones are untouched', ALWAYS_SHOWN.every(id => !('hud' in L.find(s => s.id === id))));
  t.ok('system and module statuses untouched', !('hud' in L.find(s => s.id === 'sr3e-vr')) && !('hud' in L.find(s => s.id === 'mod-x')));
  t.eq('a hud someone else set is left alone', L.find(s => s.id === 'regen').hud, { actorTypes: ['npc'] });

  // Live re-apply: the GM ticks frozen and unticks blind.
  hidden = applyStatusVisibility(L, [...DEFAULT_SHOWN.filter(id => id !== 'blind'), 'frozen'], core, hidden);
  t.ok('re-apply: a status shown again loses its hud:false', !('hud' in L.find(s => s.id === 'frozen')) && !hidden.has('frozen'));
  t.ok('re-apply: a newly hidden one gains it', L.find(s => s.id === 'blind').hud === false && hidden.has('blind'));
  t.is('re-apply is idempotent', applyStatusVisibility(L, [...DEFAULT_SHOWN.filter(id => id !== 'blind'), 'frozen'], core, hidden).size, hidden.size);
  t.ok('a status this code did not hide is not un-hidden', (() => {
    const X = [{ id: 'deaf', hud: false }];
    applyStatusVisibility(X, ['deaf'], core, new Set());
    return X[0].hud === false;
  })());

  /* ==== hiddenActiveStatusIds — a carried hidden status stays clearable ==== */
  const fx = [{ statuses: new Set(['frozen']) }, { statuses: new Set(['blind']) }, { statuses: new Set(['curse', 'bless']) }, { statuses: [] }];
  t.eq('a single-status effect on a hidden id is listed', hiddenActiveStatusIds(fx, new Set(['frozen', 'curse'])), ['frozen']);
  t.eq('nothing hidden → nothing added', hiddenActiveStatusIds(fx, new Set()), []);
  t.eq('no effects → nothing', hiddenActiveStatusIds(undefined, new Set(['frozen'])), []);

  /* ==== the ratchet: every status id the code names stays available ==== */
  const refs = referencedStatusIds();
  t.ok('the scanner finds dead, unconscious and prone (it works)', ['dead', 'unconscious', 'prone'].every(id => refs.has(id)),
    [...refs.keys()].join(', '));
  const sys = readFileSync(join(SCRIPTS, 'sr3e.js'), 'utf8');
  for (const [id, f] of refs) {
    if (isSystemStatus(id)) t.ok(`${id} (${f}) is declared in CONFIG.statusEffects`, sys.includes(`id: '${id}'`));
    else t.ok(`core status '${id}' named in ${f} is ALWAYS_SHOWN`, ALWAYS_SHOWN.includes(id),
      `add '${id}' to ALWAYS_SHOWN in scripts/data/status-effects.mjs`);
  }
  t.ok('ALWAYS_SHOWN carries nothing the code no longer names', ALWAYS_SHOWN.every(id => refs.has(id)),
    ALWAYS_SHOWN.filter(id => !refs.has(id)).join(', '));

  /* ==== source-level: init applies it, and nothing removes a status ==== */
  const iCap = sys.indexOf('SR3EStatusEffects.captureCore()');
  const iPush = sys.indexOf('CONFIG.statusEffects.push(');
  const iReg = sys.indexOf('SR3EStatusEffects.register()');
  t.ok('sr3e.js captures the core ids BEFORE pushing its own', iCap > 0 && iCap < iPush);
  t.ok('sr3e.js registers/applies the setting AFTER pushing its own', iReg > iPush);
  const mod = readFileSync(join(SCRIPTS, 'SR3EStatusEffects.js'), 'utf8');
  t.ok('the setting re-applies live on change', /onChange:\s*\(\)\s*=>\s*SR3EStatusEffects\.apply\(\)/.test(mod));
  t.ok('the setting is world-scoped and GM-only (restricted menu)', /scope:\s*'world'/.test(mod) && /restricted:\s*true/.test(mod));
  t.ok('the HUD subclass is installed', /CONFIG\.Token\.hudClass\s*=\s*SR3ETokenHUD/.test(mod));
  t.ok('apply goes through the pure applyStatusVisibility', /applyStatusVisibility\(\s*\n?\s*CONFIG\.statusEffects/.test(mod));
  const REMOVES = /CONFIG\.statusEffects\s*=[^=]|CONFIG\.statusEffects\.(splice|pop|shift|length\s*=)|delete\s+CONFIG\.statusEffects/;
  const removers = [...files(SCRIPTS)].filter(f => REMOVES.test(readFileSync(f, 'utf8'))).map(f => f.replace(SCRIPTS, ''));
  t.eq('no script removes or replaces an entry of CONFIG.statusEffects (hide with hud:false instead)', removers, []);
}
