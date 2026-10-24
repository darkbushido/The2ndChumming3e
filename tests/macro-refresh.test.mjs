/**
 * The system's world macros are refreshed, not just created · TODO 260.
 * The decision is pure (MacroRefresh); the hook's wiring is source-level.
 */
import { readFileSync } from 'node:fs';
import { MacroRefresh } from '../scripts/data/macro-refresh.mjs';

export const name = 'macro-refresh';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const M = MacroRefresh;
  const def = { name: 'SR3E Chrome Threat Generator', path: 'scripts/macros/generate-chrome-threat.js', img: 'x.svg' };
  const flagged = (command, path = def.path, nm = def.name) => ({ name: nm, type: 'script', command, flags: { The2ndChumming3e: { macroPath: path } } });
  const old = { name: def.name, type: 'script', command: 'old body', flags: {} };

  t.is('no macro: create', M.decide(def, null, 'new'), 'create');
  t.is('a flagged macro with the same body: skip', M.decide(def, flagged('new'), 'new'), 'skip');
  t.is('…a different line ending is not a difference', M.decide(def, flagged('a\r\nb'), 'a\nb'), 'skip');
  t.is('a flagged macro with an older body: refresh', M.decide(def, flagged('old body'), 'new'), 'refresh');
  t.is('an unflagged macro of the managed name (made before the flag): adopt', M.decide(def, old, 'new'), 'adopt');
  t.is('…adopted even when its body is already current (it gets the flag)', M.decide(def, { ...old, command: 'new' }, 'new'), 'adopt');

  t.is('find: the flagged macro wins, even renamed by the GM', M.find(def, [old, flagged('x', def.path, 'My copy')]).name, 'My copy');
  t.is('find: else the exact-name script macro', M.find(def, [{ name: 'Other', type: 'script' }, old]), old);
  t.is('find: a GM macro with another name is never taken', M.find(def, [{ name: 'Chrome Threat (mine)', type: 'script', command: 'x' }]), null);
  t.is('find: the managed name as a CHAT macro is not taken', M.find(def, [{ name: def.name, type: 'chat', command: 'x' }]), null);
  t.is('find: a macro flagged for ANOTHER path is not adopted by name', M.find(def, [flagged('x', 'scripts/macros/other.js')]), null);

  t.eq('changes: adopt sets the flag and the new body', M.changes(def, old, 'new'), { 'flags.The2ndChumming3e.macroPath': def.path, command: 'new' });
  t.eq('changes: a current body is not rewritten', M.changes(def, { ...old, command: 'new' }, 'new'), { 'flags.The2ndChumming3e.macroPath': def.path });
  t.eq('createData flags the macro with its path', M.createData(def, 'new').flags, { The2ndChumming3e: { macroPath: def.path } });
  t.is('createData is a script macro', M.createData(def, 'new').type, 'script');

  /* ── The hook ──────────────────────────────────────────────────────────────── */
  const main = read('scripts/sr3e.js');
  const hook = main.slice(main.indexOf('// Auto-create GM utility macros'), main.indexOf('// Auto-create organisational folders'));
  t.ok('the macro hook is a ready hook, GM-gated', /Hooks\.once\('ready'/.test(hook) && /if \(!game\.user\.isGM\) return;/.test(hook));
  t.ok('…and the loop runs on the ACTIVE GM only', /game\.users\.activeGM\?\.id === game\.user\.id/.test(hook) && /of isActiveGM \? macros : \[\]/.test(hook));
  t.ok('…it creates through the flag, refreshes through update, and finds by MacroRefresh', /MacroRefresh\.createData/.test(hook) && /existing\.update\(MacroRefresh\.changes/.test(hook) && /MacroRefresh\.find\(def, game\.macros\)/.test(hook));
  t.ok('…a fetch failure is caught per macro (never blocks the load)', /catch \(err\)[\s\S]{0,160}console\.warn/.test(hook));
  t.ok('…and what was refreshed is logged in one line', /console\.log\(`SR3E \| Refreshed world macro/.test(hook));
}
