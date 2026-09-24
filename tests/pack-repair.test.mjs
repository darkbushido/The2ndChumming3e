/**
 * Removing the broken (`_id: null`) compendium entries — TODO 145.
 *
 * Older builds shipped a document stored under `!items!null` in each pack, and a Foundry update does
 * not replace an existing pack database, so installed copies keep them (75 packs on the production
 * server checked; the v0.6.0 tag has none). They crash core's compendium search. The repair removes one
 * ONLY when a properly keyed entry of the same name and type is in the same pack — the rule
 * `tools/check-packs.mjs --fix` uses — and reports the rest.
 */
import { readFileSync } from 'node:fs';
import { PackRepair } from '../scripts/data/pack-repair.mjs';

export const name = 'pack-repair';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const good = { _id: 'sr3e-armor-0270', name: '+Tracking Signal 10', type: 'armor' };
  const bad  = { _id: null,              name: '+Tracking Signal 10', type: 'armor' };
  const orphan = { _id: null, name: 'Only Copy', type: 'armor' };
  const sameNameOtherType = { _id: null, name: '+Tracking Signal 10', type: 'gear' };

  t.ok('a null _id is broken', PackRepair.isBroken(bad));
  t.ok('a missing _id is broken', PackRepair.isBroken({ name: 'x' }));
  t.ok('an empty _id is broken', PackRepair.isBroken({ _id: '', name: 'x' }));
  t.ok('a real _id is not', !PackRepair.isBroken(good));

  const p = PackRepair.plan([good, bad]);
  t.is('a broken entry with an identical twin is removable', p.removable.length, 1);
  t.is('…and nothing is kept back', p.kept.length, 0);

  const q = PackRepair.plan([good, orphan]);
  t.is('a broken entry with no twin is NEVER removable — it may be the only copy', q.removable.length, 0);
  t.eq('…it is reported instead', q.kept.map(e => e.name), ['Only Copy']);

  const r = PackRepair.plan([good, sameNameOtherType]);
  t.is('the same name of a different type is not a twin', r.removable.length, 0);

  t.is('a clean pack has nothing to do', PackRepair.plan([good, { _id: 'b', name: 'y', type: 'armor' }]).broken.length, 0);
  t.is('an empty or missing index is fine', PackRepair.plan(undefined).broken.length, 0);
  t.is('two broken entries, one twinned: only that one goes', PackRepair.plan([good, bad, orphan]).removable.length, 1);

  // Wiring (source-level: it needs a live world and a socket).
  const src = read('scripts/SR3EPackRepair.js');
  t.ok('only the active GM runs it', /if \(!game\.user\.isGM\) return result;\s*if \(game\.users\.activeGM && !game\.users\.activeGM\.isSelf\) return result;/.test(src));
  t.ok('only this system\'s own Item/Actor packs', /packageName === SYSTEM/.test(src) && /\['Item', 'Actor'\]/.test(src));
  t.ok('a delete happens only for a pack the planner says is removable', /if \(!plan\.removable\.length\) continue;/.test(src));
  t.ok('the lock is restored in a finally, on every path', /finally \{\s*if \(wasLocked\)/.test(src));
  t.ok('a failure is a warning, never a throw out of the runner', /catch \(err\) \{\s*console\.warn/.test(src));
  const main = read('scripts/sr3e.js');
  t.ok('it runs at ready, after the migrations', main.indexOf('SR3EMigrations.migrate()') < main.indexOf('SR3EPackRepair.run()'));
  t.ok('…and a failure there cannot stop the world loading', /try \{ await SR3EPackRepair\.run\(\); \} catch/.test(main));
  t.ok('it does not go through a migration stamp (it must rescan every load)', !/SR3EPackRepair/.test(read('scripts/SR3EMigrations.js')));
}
