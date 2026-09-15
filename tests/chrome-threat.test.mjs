/**
 * The Chrome Threat generator macro, run for real — and its auto-registration.
 *
 * `scripts/macros/generate-chrome-threat.js` is a world Macro's body, not a module, so (like
 * the importer) it is run as an async function with just enough Foundry stubbed: the dialog
 * answers with a chosen level/archetype/metatype, `Actor.create` captures what it would make.
 *
 * It is RANDOM, so every assertion is a property that must hold for any roll, and each
 * combination is run several times. The properties are the macro's own promises (its header)
 * checked against the SYSTEM's rules, not the macro's arithmetic — e.g. Essence is summed with
 * `SR3EActor.installedEssenceCost`, which is what the sheet will show, so a macro whose Essence
 * budget disagreed with the system's grading would fail here.
 *
 * Each suite runs in its own process (tests/run.mjs), so stubbing globals here cannot leak.
 */
import { readFileSync, existsSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'chrome-threat';

const SRC = readFileSync(new URL('../scripts/macros/generate-chrome-threat.js', import.meta.url), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/** Run the macro once; `answer` is the dialog's values, or null to press Cancel. */
async function generate(answer) {
  const made = [];
  const notes = [];
  globalThis.game.user = { isGM: true };
  globalThis.game.folders = { find: () => null };
  globalThis.Folder = { create: async d => ({ id: 'F1', ...d }) };
  globalThis.CONST = { ...globalThis.CONST, TOKEN_DISPOSITIONS: { HOSTILE: -1 } };
  globalThis.ui = { notifications: {
    info: m => notes.push(['info', m]), warn: m => notes.push(['warn', m]), error: m => notes.push(['error', m]) } };
  globalThis.Actor = { create: async (data) => {
    const rec = { data, items: [], updates: {} };
    made.push(rec);
    return {
      id: `A${made.length}`, name: data.name,
      createEmbeddedDocuments: async (_t, docs) => {
        rec.items = docs.map((d, i) => ({ ...d, id: `I${i}` }));
        return rec.items;
      },
      update: async u => Object.assign(rec.updates, u),
      sheet: { render: () => {} },
    };
  } };
  globalThis.foundry.applications = { api: { DialogV2: { wait: async (opts) => {
    if (!answer) return;
    const vals = { '#ct-level': answer.level, '#ct-arch': answer.arch,
                   '#ct-race': answer.race, '#ct-count': answer.count ?? 1 };
    opts.buttons.find(b => b.action === 'go')
      .callback(null, null, { element: { querySelector: sel => ({ value: String(vals[sel]) }) } });
  } } } };

  let threw = null;
  try { await new AsyncFunction(SRC)(); } catch (e) { threw = e; }
  return { made, notes, threw };
}

const ARCHS = { brawler: 1, gunner: 1, heavy: 1, sniper: null, zombie: null };   // min level filled below
const RACES = ['human', 'ork', 'troll'];
const REACTION_ENHANCERS = /Wired Reflexes|Reaction Enhancer|Boosted Reflexes|Synaptic Accelerator/i;
const ATTRS = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'];

export async function run(t) {
  /* ── Registration: the system adds it to every world's macro library ─────────────── */
  const entry = readFileSync(new URL('../scripts/sr3e.js', import.meta.url), 'utf8');
  const list  = entry.slice(entry.indexOf('const macros = ['), entry.indexOf('for (const def of macros)'));
  t.ok('the Chrome Threat Generator is on the auto-created macro list',
    /name:\s*'SR3E Chrome Threat Generator',\s*path:\s*'scripts\/macros\/generate-chrome-threat\.js'/.test(list));
  const paths = [...list.matchAll(/path:\s*'([^']+)'/g)].map(m => m[1]);
  t.ok('every auto-created macro path exists on disk (a 404 there fails silently in play)',
    paths.length >= 2 && paths.every(p => existsSync(new URL(`../${p}`, import.meta.url))));

  /* ── Cancel makes nothing ────────────────────────────────────────────────────────── */
  const none = await generate(null);
  t.is('Cancel: no error', none.threw?.message ?? null, null);
  t.is('Cancel: no actors', none.made.length, 0);

  /* ── The minimum levels the macro declares for its gated archetypes ─────────────── */
  const minOf = k => {
    const m = SRC.match(new RegExp(`${k}:\\s*\\{[\\s\\S]*?minLevel:\\s*(\\d+)`));
    return m ? Number(m[1]) : 1;
  };
  for (const k of Object.keys(ARCHS)) ARCHS[k] = ARCHS[k] ?? minOf(k);

  /* ── Every archetype × metatype × allowed level, several times ─────────────────── */
  let runs = 0; const fails = { threw: [], count: [], arms: [], essence: [], zombie: [], mbw: [], attrs: [], equip: [] };
  for (const [arch, minLevel] of Object.entries(ARCHS)) {
    for (const race of RACES) {
      for (let level = minLevel; level <= 10; level++) {
        for (let rep = 0; rep < 3; rep++) {
          runs++;
          const tag = `${arch}/${race}/L${level}`;
          const r = await generate({ level, arch, race, count: 1 });
          if (r.threw) { fails.threw.push(`${tag}: ${r.threw.message}`); continue; }
          if (r.made.length !== 1) { fails.count.push(tag); continue; }
          const { data, items, updates } = r.made[0];

          if (!items.some(i => i.type === 'cyberware' && /Pair Obvious Cyberarms/.test(i.name))) fails.arms.push(tag);

          // Essence as the SHEET will compute it (grades applied by the system, once).
          const essence = 6 - SR3EActor.installedEssenceCost(items);
          if (arch === 'zombie') { if (essence > 0.001) fails.zombie.push(`${tag}: ${essence.toFixed(2)}`); }
          else if (essence <= 0) fails.essence.push(`${tag}: ${essence.toFixed(2)}`);

          // Move-by-Wire excludes every other Reaction/Initiative enhancer (M&M p.60).
          const names = items.map(i => i.name);
          if (names.some(n => /Move-by-Wire/i.test(n)) && names.some(n => REACTION_ENHANCERS.test(n))) fails.mbw.push(tag);

          // Attributes include racial modifiers and stay legal (≥ 1, SR3 p.55).
          const a = data.system?.attributes ?? {};
          if (ATTRS.some(k => !((a[k]?.base ?? a[k]) >= 1))) fails.attrs.push(tag);

          // The kit's armour is equipped by id, pointing at an item that was actually created.
          const ids = new Set(items.map(i => i.id));
          if (!updates['system.equippedArmor'] || !ids.has(updates['system.equippedArmor'])) fails.equip.push(tag);
        }
      }
    }
  }

  t.ok(`ran ${runs} generations across every archetype, metatype and allowed level`, runs > 100);
  t.is('no generation throws',                             fails.threw.slice(0, 3).join(' | '), '');
  t.is('each makes exactly the one actor asked for',       fails.count.slice(0, 3).join(' | '), '');
  t.is('every threat has its pair of obvious cyberarms',   fails.arms.slice(0, 3).join(' | '), '');
  t.is('no non-zombie is generated dead (Essence > 0 by the system\'s grading, M&M p.54)',
    fails.essence.slice(0, 3).join(' | '), '');
  t.is('the cyberzombie really is at Essence 0 or below',  fails.zombie.slice(0, 3).join(' | '), '');
  t.is('Move-by-Wire never sits beside another Reaction enhancer', fails.mbw.slice(0, 3).join(' | '), '');
  t.is('every attribute is at least 1',                    fails.attrs.slice(0, 3).join(' | '), '');
  t.is('the armour is equipped, by the id of a created item', fails.equip.slice(0, 3).join(' | '), '');

  /* ── Count and the notification ──────────────────────────────────────────────────── */
  const three = await generate({ level: 3, arch: 'random', race: 'random', count: 3 });
  t.is('How many = 3 makes three', three.made.length, 3);
  t.ok('…and says so', three.notes.some(([l, m]) => l === 'info' && /3 level-3 chrome threat/.test(m)));
}
