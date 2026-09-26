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
const { SR3EMigrations, defaultsToPin, DEFAULT_CHANGES } = await import('../scripts/SR3EMigrations.js');

export const name = 'migrations';

/** A stand-in embedded item. */
const item = (name, system = {}) => ({ id: `i-${name}`, name, system });
/** A stand-in actor carrying embedded items. */
const actor = (...items) => ({ name: 'Test', items });

export async function run(t) {
  const fill  = (sys, field, value) => SR3EMigrations._fillBlank(sys, field, value);

  /* ==== A changed DEFAULT keeps existing worlds as they were (TODO 55) ==== */
  const newer = (a, b) => { const p = v => v.split('.').map(Number); const [x, y] = [p(a), p(b)];
    for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0); } return false; };
  const unset = () => false;
  t.eq('a 0.5.2 world that never set trackAmmo keeps it OFF', defaultsToPin('0.5.2', unset, newer).map(c => [c.key, c.was]), [['trackAmmo', false]]);
  t.eq('…one that set it keeps its own choice', defaultsToPin('0.5.2', k => k === 'trackAmmo', newer), []);
  t.eq('a new world (no stamp) takes the new default', defaultsToPin('', unset, newer), []);
  t.eq('a world stamped 0.6.0 takes the new default', defaultsToPin('0.6.0', unset, newer), []);
  t.eq('trackAmmo\'s default changed in 0.6.0, from off', DEFAULT_CHANGES.find(c => c.key === 'trackAmmo'), { key: 'trackAmmo', version: '0.6.0', was: false });
  const main = fs.readFileSync(new URL('../scripts/sr3e.js', import.meta.url), 'utf8');
  const reg  = main.slice(main.indexOf("register('The2ndChumming3e', 'trackAmmo'"), main.indexOf("register('The2ndChumming3e', 'trackAmmo'") + 900);
  t.ok('trackAmmo is registered ON by default', /default: true,/.test(reg) && !/default: false/.test(reg));
  t.ok('…and its hint no longer says an empty gun still fires', !/never blocks a shot/.test(reg));
  const mig = fs.readFileSync(new URL('../scripts/SR3EMigrations.js', import.meta.url), 'utf8');
  t.ok('migrate() pins the old default before looking at migrations', mig.indexOf('defaultsToPin(stored') > 0
    && mig.indexOf('defaultsToPin(stored') < mig.indexOf('const pending = MIGRATIONS.filter'));
  t.ok('…reading whether the world stored one, not the value (which is the default when unset)', /store\?\.getSetting\(`\$\{SYSTEM\}\.\$\{key\}`\)/.test(mig));
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

  /* ════════════════════════════════════════════════════════════════════════════
   *  0.4.5.11 — Little Black Book stats out of prose · TODO 83
   *
   * ⚠ **Foundry EMBEDS, it does not link.** The pack is fixed by a tool, but anyone who
   * already dragged one of these 62 into a world holds their own copy and a pack fix reaches
   * them never. That is what this migration is for, and it is the rule most easily forgotten.
   * ════════════════════════════════════════════════════════════════════════════ */
  const lbb = list.find(m => m.version === '0.4.5.11');
  t.ok('the Little Black Book migration exists', !!lbb);
  t.ok('…and uses fixActor', typeof lbb?.fixActor === 'function');

  const NOTE = "<p>Mr. Johnson's Little Black Book, p.53. PR 3. Karma Pool 6.</p>";
  const jn = (over = {}) => ({ type: 'character', name: 'Yakuza Elder',
    system: { notes: NOTE, professionalRating: 0, karmaPool: 1, ...over } });

  t.is('PR is lifted out of the note',
    lbb.fixActor(jn())?.['system.professionalRating'], 3);
  t.is('…and the Karma Pool with it',
    lbb.fixActor(jn())?.['system.karmaPool'], 6);

  /* ⚠ **The citation is the gate, not parseability.** The parser will find "Karma Pool 6" in
   * anything; only the book reference makes it the book's data. A GM's own reminder must not
   * be promoted into a field. */
  t.is("a GM's own note with the same numbers is untouched",
    lbb.fixActor(jn({ notes: '<p>Tough. PR 3. Karma Pool 6.</p>' })), null);

  /* ⚠ `professionalRating` fills only at its schema default of 0 — unambiguous. */
  t.is('a PR somebody already set is left alone',
    lbb.fixActor(jn({ professionalRating: 5 }))?.['system.professionalRating'], undefined);

  /* ⚠ The Karma Pool ambiguity, asserted in both directions: 0 (pre-0.4.5.7 default) and 1
   * (current default) are filled; anything ABOVE 1 can only be a chosen value and is kept. */
  t.is('a Pool at the old default of 0 is filled',
    lbb.fixActor(jn({ karmaPool: 0 }))?.['system.karmaPool'], 6);
  t.is('a Pool at the current default of 1 is filled',
    lbb.fixActor(jn({ karmaPool: 1 }))?.['system.karmaPool'], 6);
  t.is('a Pool a GM raised is NOT overwritten',
    lbb.fixActor(jn({ karmaPool: 4 }))?.['system.karmaPool'], undefined);

  /* Idempotent — rule 2 of this file's contract. */
  t.is('a fully-migrated contact yields nothing',
    lbb.fixActor(jn({ professionalRating: 3, karmaPool: 6 })), null);

  /* The two records the book itself leaves incomplete: after the pack patch their notes are
   * complete, but a world holding a pre-patch copy still has the short version. */
  t.is('a note with no Karma Pool still yields the PR',
    lbb.fixActor(jn({ notes: "<p>Mr. Johnson's Little Black Book, p.67. PR 2.</p>" }))
      ?.['system.professionalRating'], 2);
  t.is('…and does not invent a Pool',
    lbb.fixActor(jn({ notes: "<p>Mr. Johnson's Little Black Book, p.67. PR 2.</p>" }))
      ?.['system.karmaPool'], undefined);

  t.is('a vehicle is skipped', lbb.fixActor({ type: 'vehicle', system: { notes: NOTE } }), null);
  t.is('an actor with no notes is skipped', lbb.fixActor({ type: 'character', system: {} }), null);

  /* ── 0.5.2: ratings out of names into the field (reported in play: "Medkit [6]") ─────── */
  const rt = list.find(m => m.version === '0.5.2');
  t.ok('0.5.2 exists and is a fixItem', typeof rt?.fixItem === 'function');
  const typed = (type, name, system = {}) => ({ id: `i-${name}`, type, name, system });
  t.is('a Medkit [6] with no rating gets 6',          rt.fixItem(typed('gear', 'Medkit [6]', { rating: 0 }))?.['system.rating'], 6);
  t.is('gear saved before the field existed gets it', rt.fixItem(typed('gear', 'Medkit Rating 4', {}))?.['system.rating'], 4);
  t.is('the shipped Vehicle Control Rig [2] (rating 0) gets 2',
    rt.fixItem(typed('cyberware', 'Vehicle Control Rig [2]', { rating: 0 }))?.['system.rating'], 2);
  t.is('bioware too', rt.fixItem(typed('bioware', 'Muscle Augmentation [3]', { rating: 0 }))?.['system.rating'], 3);
  t.is('medical keeps its rating a string', rt.fixItem(typed('medical', 'Trauma Patch [5]', { rating: '' }))?.['system.rating'], '5');
  t.is('a rating a GM typed is NOT overwritten', rt.fixItem(typed('gear', 'Medkit [6]', { rating: 4 })), null);
  t.is('gear with no rating anywhere: its legacy 0 becomes null, "no rating" (2026-09-14)',
    rt.fixItem(typed('gear', 'Predator 2', { rating: 0 }))?.['system.rating'], null);
  t.is('…a plain Medkit is filled from the table: 3 (SR3 p.304)', rt.fixItem(typed('gear', 'Medkit', { rating: 0 }))?.['system.rating'], 3);
  // ⚠ The 0.5.2 migration is left EXACTLY as it shipped — a world that already ran it never runs
  //   it again, so changing its behaviour now would reach only worlds that have not loaded since.
  //   TODO 122 needed no migration of its own: on an implant a legacy 0 and an explicit null read
  //   the same number (asserted in tests/item-rating.test.mjs), so no world's dice move.
  t.is('…an unrated cyberware kept its 0 in 0.5.2, and still does', rt.fixItem(typed('cyberware', 'Datajack', { rating: 0 })), null);
  t.is('…a gear null is already "none": nothing to do', rt.fixItem(typed('gear', 'Wrist Phone', { rating: null })), null);
  t.is('armour has no rating field — skipped', rt.fixItem(typed('armor', 'Helmet [2]', {})), null);
  const rtOnce = rt.fixItem(typed('gear', 'Medkit [6]', { rating: 0 }));
  t.is('idempotent: the migrated item yields nothing', rt.fixItem(typed('gear', 'Medkit [6]', { rating: rtOnce['system.rating'] })), null);

  /* ── 0.5.2: pre-filled clips counted in reloads (TODO 114, reported in play) ─────────── */
  const am = list.find(m => m.version === '0.5.2' && /reloads/i.test(m.label));
  t.ok('the reloads migration exists and is a fixItem', typeof am?.fixItem === 'function');
  const clip = (name, system = {}, parent = null) => ({ ...typed('ammunition', name, { countedIn: 'rounds', rounds: 0, reloads: 0, ammoType: 'regular', loadMechanism: 'c', ...system }), parent });
  const rev = { items: [{ type: 'firearm', system: { ammunition: '7(cy)' } }] };
  const cyl = am.fixItem(clip('7-round cy reload ×6', {}, rev));
  t.is('the reported "7-round cy reload ×6" becomes reloads', cyl?.['system.countedIn'], 'reloads');
  t.is('…6 of them', cyl?.['system.reloads'], 6);
  t.is('…7 rounds each', cyl?.['system.roundsPerReload'], 7);
  t.is('…fed to the 7(cy) revolver the character owns', cyl?.['system.loadMechanism'], 'cy');
  const imp = am.fixItem(clip('10-Rnd Clip (Explosive) ×2'));
  t.is('an imported Explosive clip left as Regular becomes Explosive', imp?.['system.ammoType'], 'explosive');
  t.is('…with no guns to go on, the mechanism is not guessed', imp?.['system.loadMechanism'], undefined);
  t.is('a single clip with no "×N" is one reload', am.fixItem(clip('15-Rnd Clip (Regular)'))?.['system.reloads'], 1);
  t.is('a GM\'s 42 rounds are NOT converted', am.fixItem(clip('7-round cy reload ×6', { rounds: 42 })), null);
  t.is('a type a GM chose is kept', am.fixItem(clip('10-Rnd Clip (Explosive)', { ammoType: 'gel' }))?.['system.ammoType'], undefined);
  t.is('a box of rounds is not a reload', am.fixItem(clip('Box of 50 rounds')), null);
  t.is('not ammunition: skipped', am.fixItem(typed('gear', '10-Rnd Clip (Regular)')), null);
  const tube = { items: [{ type: 'firearm', system: { ammunition: '5(m)' } }] };
  const byHand = am.fixItem(clip('5-Rnd Clip (Regular) ×3', {}, tube));
  t.is('a reload named for a hand-loaded gun (5(m)) becomes 15 loose rounds (SR3 p.280)', byHand?.['system.rounds'], 15);
  t.is('…fed to the internal magazine', byHand?.['system.loadMechanism'], 'm');
  t.is('…and is not given reloads', byHand?.['system.reloads'], undefined);
  t.is('idempotent: an item already counted in reloads yields nothing',
    am.fixItem(clip('7-round cy reload ×6', { countedIn: 'reloads', reloads: 6, roundsPerReload: 7 })), null);

  /* ── 0.6.2: clips 0.5.2 missed (TODO 143, reported in the trial session) ──────────────
   * system.json reached 0.5.2 four hours before the clip conversion was added under the same
   * number, so a world loaded in between never ran it. 0.6.2 runs it again, and converts a clip
   * given a round count when that count divides evenly. */
  const again = list.find(m => m.version === '0.6.2');
  t.ok('0.6.2 exists and is a fixItem', typeof again?.fixItem === 'function');
  const missed = again.fixItem(clip('10-Rnd Clip (Explosive) ×2'));
  t.is('a clip a 0.5.2-stamped world never converted becomes reloads', missed?.['system.countedIn'], 'reloads');
  t.is('…2 of them, as 0.5.2 would have made it', missed?.['system.reloads'], 2);
  t.is('…typed from its name', missed?.['system.ammoType'], 'explosive');
  const typedCount = again.fixItem(clip('10-Rnd Clip (Regular)', { rounds: 30 }));
  t.is('a "10-Rnd Clip" holding 30 rounds becomes reloads', typedCount?.['system.countedIn'], 'reloads');
  t.is('…3 clips of 10', [typedCount?.['system.reloads'], typedCount?.['system.roundsPerReload']].join(), '3,10');
  t.is('…and its round count is cleared, not left to be read twice', typedCount?.['system.rounds'], 0);
  const cy42 = again.fixItem(clip('7-round cy reload ×6', { rounds: 42 }, rev));
  t.is('the reported 42 rounds of 7-round speed loaders are 6 reloads', cy42?.['system.reloads'], 6);
  t.is('…fed to the 7(cy) revolver the character owns', cy42?.['system.loadMechanism'], 'cy');
  t.is('an uneven count stays loose rounds — the GM\'s call', again.fixItem(clip('10-Rnd Clip (Regular)', { rounds: 35 })), null);
  t.is('a hand-loaded gun\'s "clip" with rounds is already loose rounds', again.fixItem(clip('5-Rnd Clip (Regular)', { rounds: 15 }, tube)), null);
  t.is('a box of rounds is not touched', again.fixItem(clip('Box of 50 rounds', { rounds: 50 })), null);
  t.is('idempotent: its own output yields nothing',
    again.fixItem(clip('10-Rnd Clip (Regular)', { countedIn: 'reloads', reloads: 3, roundsPerReload: 10, rounds: 0 })), null);
  t.is('0.5.2\'s rule is unchanged: it still leaves a typed count alone', am.fixItem(clip('10-Rnd Clip (Regular)', { rounds: 30 })), null);
}
