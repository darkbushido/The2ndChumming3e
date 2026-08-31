/**
 * World migrations — SR3EMigrations.
 *
 * ⚠ THE PROBLEM THIS EXISTS FOR: **Foundry embeds items, it does not link them.** An actor
 * holding "Enhanced Articulation" carries its OWN copy, made at drag time. Correcting the
 * compendium entry changes nothing for anyone who already owns one, and there is no relink —
 * that copy is the character's item now, deliberately, because players customise them.
 *
 * So every pack correction needs a second pass over the world. Before this, there was none:
 * the system shipped no migration code at all, and the two earlier data-model additions were
 * designed around that (`essence.lost` is nullable precisely so old actors read correctly
 * without one).
 *
 * The two rules asserted here are the ones that make a migration safe to run repeatedly:
 *
 *   1. FILL BLANKS, DO NOT OVERWRITE DECISIONS. A GM who typed a value keeps it.
 *   2. BE IDEMPOTENT. A second run must change nothing.
 */
import fs from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EMigrations } = await import('../scripts/SR3EMigrations.js');

export const name = 'migrations';

/** A stand-in embedded item. */
const item = (name, system = {}) => ({ id: `i-${name}`, name, system });
/** A stand-in actor carrying embedded items. */
const actor = (...items) => ({ name: 'Test', items });

export async function run(t) {
  const fill  = (sys, field, value) => SR3EMigrations._fillBlank(sys, field, value);
  const patch = (a, byName) => SR3EMigrations._patchItemsByName(a, byName);

  /* ==== Rule 1: fill blanks, never overwrite ==== */
  t.is('an empty string is filled',    fill({ x: '' }, 'x', 'v'), 'v');
  t.is('undefined is filled',          fill({}, 'x', 'v'), 'v');
  t.is('null is filled',               fill({ x: null }, 'x', 'v'), 'v');
  // 0 counts as unset: it is the NumberField schema default, so a field never touched is
  // indistinguishable from one deliberately set to zero. That is the cost of the rule, and it
  // is why migrations name a specific item rather than sweeping a whole type.
  t.is('zero is treated as unset',     fill({ x: 0 }, 'x', 1), 1);

  t.is('an existing string is LEFT ALONE',  fill({ x: 'mine' }, 'x', 'v'), null);
  t.is('an existing number is left alone',  fill({ x: 3 }, 'x', 1), null);
  t.is('false is left alone — it is a real value, not a blank',
    fill({ x: false }, 'x', true), null);
  t.is('a value already equal to the target needs no write',
    fill({ x: 'v' }, 'x', 'v'), null);

  /* ==== Rule 2: patching an actor's embedded items ==== */
  const EA = {
    'Enhanced Articulation': {
      improvedSkillCategory: 'Combat skills, Physical skills',
      improvedSkillDice: 1,
    },
  };

  const fresh = actor(item('Enhanced Articulation', { improvedSkillCategory: '', improvedSkillDice: 0 }));
  const up    = patch(fresh, EA);
  t.ok('an actor with the item gets an update', Array.isArray(up) && up.length === 1);
  t.is('…addressed to that embedded item', up[0]._id, 'i-Enhanced Articulation');
  t.is('…setting the category', up[0]['system.improvedSkillCategory'], 'Combat skills, Physical skills');
  t.is('…and the dice',         up[0]['system.improvedSkillDice'], 1);

  // IDEMPOTENCE — the whole point. Simulate the write, then re-run.
  const done = actor(item('Enhanced Articulation', {
    improvedSkillCategory: 'Combat skills, Physical skills', improvedSkillDice: 1,
  }));
  t.is('re-running produces NO update', patch(done, EA), null);

  // A GM who typed their own categories keeps them.
  const edited = actor(item('Enhanced Articulation', {
    improvedSkillCategory: 'Combat skills', improvedSkillDice: 2,
  }));
  t.is('a GM-edited item is not touched at all', patch(edited, EA), null);

  // Partially filled: the blank half is completed, the set half is respected.
  const half = actor(item('Enhanced Articulation', {
    improvedSkillCategory: '', improvedSkillDice: 3,
  }));
  const halfUp = patch(half, EA);
  t.is('the blank field is filled', halfUp[0]['system.improvedSkillCategory'], 'Combat skills, Physical skills');
  t.ok('…and the GM\'s own dice value is left alone',
    !('system.improvedSkillDice' in halfUp[0]));

  /* ==== Actors without the item are untouched ==== */
  t.is('an actor with no matching item yields nothing',
    patch(actor(item('Cerebral Booster 1')), EA), null);
  t.is('an actor with no items at all yields nothing', patch(actor(), EA), null);
  t.is('a missing actor does not throw',               patch(undefined, EA), null);
  t.is('an actor whose items are not an array does not throw',
    patch({ items: null }, EA), null);

  /* ==== Several matching items on one actor ==== */
  const twice = actor(
    item('Enhanced Articulation', { improvedSkillCategory: '', improvedSkillDice: 0 }),
    item('Enhanced Articulation', { improvedSkillCategory: '', improvedSkillDice: 0 }),
  );
  t.is('both copies are patched', patch(twice, EA).length, 2);

  /* ==== The migration list itself ==== */
  const list = SR3EMigrations._migrations;
  t.ok('there is at least one migration', list.length >= 1);
  t.ok('every entry declares a version', list.every(m => typeof m.version === 'string' && m.version));
  t.ok('every entry declares a label',   list.every(m => typeof m.label === 'string' && m.label));

  // ⚠ Entries must be in ascending version order — `migrate()` runs them in array order and
  // filters on "newer than stored", so an out-of-order entry would run at the wrong time.
  const versions = list.map(m => m.version);
  const sorted = [...versions].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  t.is('migrations are in ascending version order', versions.join(), sorted.join());

  // ⚠ NO MIGRATION MAY BE NEWER THAN THE SYSTEM ITSELF. `migrate()` stamps
  // `game.system.version` when it finishes, so a migration numbered above that version never
  // gets stamped past — it re-runs on every single world load, for ever. Harmless because
  // every migration fills blanks only, and still wrong, and completely silent. Bump
  // system.json in the same commit that adds the migration.
  const sysVersion = JSON.parse(
    fs.readFileSync(new URL('../system.json', import.meta.url), 'utf8')).version;
  const cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  for (const m of list) {
    t.ok(`migration ${m.version} is not newer than system.json's ${sysVersion}`,
      cmp(m.version, sysVersion) <= 0);
  }

  // The first migration is Enhanced Articulation, and it must carry FIVE categories — the
  // book's Vehicle sentence is the one TODO 10 originally missed.
  const ea = list.find(m => m.items && m.items['Enhanced Articulation']);
  t.ok('Enhanced Articulation has a migration', !!ea);
  t.is('…covering five categories',
    ea.items['Enhanced Articulation'].improvedSkillCategory.split(',').length, 5);
  t.ok('…including Vehicle skills',
    /Vehicle skills/.test(ea.items['Enhanced Articulation'].improvedSkillCategory));
  t.ok('…and Build/Repair intact, slash and all',
    /Build\/Repair skills/.test(ea.items['Enhanced Articulation'].improvedSkillCategory));

  /* ════════════════════════════════════════════════════════════════════════════
   *  0.4.5.7 — the Karma Pool's starting point · SR3 p.244 (TODO 80)
   *
   * The FIRST migration to touch the actor document rather than its items, via the `fixActor`
   * hook. It is also only the second that can OVERWRITE — so what it declines to touch is
   * more important than what it changes.
   * ════════════════════════════════════════════════════════════════════════════ */
  const kp = list.find(m => m.version === '0.4.5.7');
  t.ok('the Karma Pool migration exists', !!kp);
  t.ok('…and uses fixActor, not items or fixItem', typeof kp?.fixActor === 'function');
  t.ok('…and declares neither of the item hooks', !kp?.items && !kp?.fixItem);

  const act = (over = {}) => ({ type: 'character', name: 'T', system: { karmaPool: 0, totalKarma: 0, ...over } });

  t.is('a fresh character goes 0 → 1',
    kp.fixActor(act())?.['system.karmaPool'], 1);
  t.is("Shetani's 3 becomes 4",
    kp.fixActor(act({ karmaPool: 3, totalKarma: 62 }))?.['system.karmaPool'], 4);
  t.is('20 career karma goes 1 → 2',
    kp.fixActor(act({ karmaPool: 1, totalKarma: 20 }))?.['system.karmaPool'], 2);

  /* ⚠ **Fill-blanks cannot express this**, which is the whole difficulty: 0 is both "never
   * touched" and a value a GM may have set deliberately. So the migration matches a Pool that
   * still equals EXACTLY what the old, wrong formula produced — floor(total / 20) — and leaves
   * anything else alone. These are the assertions that keep it from becoming a blunt +1. */
  t.is('a hand-raised Pool is left alone',
    kp.fixActor(act({ karmaPool: 7, totalKarma: 62 })), null);
  t.is('a hand-LOWERED Pool is left alone too',
    kp.fixActor(act({ karmaPool: 1, totalKarma: 62 })), null);
  t.is('an already-correct Pool is not bumped again',
    kp.fixActor(act({ karmaPool: 4, totalKarma: 62 })), null);

  /* ⚠ Idempotent, and this is the assertion that proves it: run the migration's own output
   * back through it and nothing more happens. Rule 2 of the file's contract. */
  const once = kp.fixActor(act({ karmaPool: 3, totalKarma: 62 }));
  t.is('running it twice changes nothing the second time',
    kp.fixActor(act({ karmaPool: once['system.karmaPool'], totalKarma: 62 })), null);

  t.is('a vehicle is not a character and is skipped',
    kp.fixActor({ type: 'vehicle', system: { karmaPool: 0, totalKarma: 0 } }), null);
  t.is('an npc IS corrected',
    kp.fixActor({ type: 'npc', name: 'N', system: { karmaPool: 0, totalKarma: 0 } })?.['system.karmaPool'], 1);
  t.is('an actor with no Pool field at all is skipped',
    kp.fixActor({ type: 'character', system: {} }), null);
}
