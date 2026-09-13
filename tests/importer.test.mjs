/**
 * The character importer, end to end — the REAL macro, run against a real export.
 *
 * `scripts/macros/import-sr3-character.js` is a world Macro's body, not a module, so nothing
 * could import it and every fix to it shipped untested. This suite runs its source as an async
 * function with Foundry's globals stubbed just enough — `Actor.create` captures what it would
 * have created, the dialog answers with the fixture — and asserts on the result.
 *
 * Fixture: `fixtures/troll-export.json`, the Shadowrun Character Generator export of the troll
 * reported in play on 2026-09-11 (B5 Q5 S4 C2 I3 W2 allocated; imported without its racial
 * modifiers). Every assertion below was a live bug on this branch:
 *
 *   · racial modifiers not applied (TODO 93)                  · Charisma 0 not flagged
 *   · five of six active skills filed as knowledge (TODO 95)  · SV:/ST:/SF: prefixes misrouted
 *   · the alpha implant's graded Essence graded again (TODO 101)
 *
 * Each suite runs in its own process (tests/run.mjs), so stubbing globals here cannot leak.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
globalThis.game.sr3e = { ...(globalThis.game.sr3e ?? {}), SR3E, SR3EActor };
globalThis.game.user = { isGM: true };

export const name = 'importer';

/** Run the macro against one export; returns what it created and what it said. */
async function runImport(exportJson) {
  const text  = JSON.stringify(exportJson);
  const notes = [];
  globalThis.ui = { notifications: {
    info: m => notes.push(['info', m]), warn: m => notes.push(['warn', m]), error: m => notes.push(['error', m]) } };

  let created = null; const embedded = [];
  globalThis.Actor = { create: async (data) => {
    if (data.type !== 'character') return { id: 'veh' };
    created = data;
    return {
      id: 'A1', name: data.name, items: [],
      createEmbeddedDocuments: async (_t, docs) => { embedded.push(...docs); return docs.map((d, i) => ({ ...d, id: `i${i}` })); },
      update: async () => {}, sheet: { render: () => {} },
    };
  } };
  globalThis.foundry.applications = { api: { DialogV2: { wait: async (opts) => {
    opts.buttons.find(b => b.action === 'import')
      .callback(null, null, { element: { querySelector: () => ({ value: text }) } });
  } } } };

  const src = readFileSync(new URL('../scripts/macros/import-sr3-character.js', import.meta.url), 'utf8');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  let threw = null;
  try { await new AsyncFunction(src)(); } catch (e) { threw = e; }
  return { created, embedded, notes, threw };
}

export async function run(t) {
  const troll = JSON.parse(readFileSync(new URL('./fixtures/troll-export.json', import.meta.url), 'utf8'));
  const r = await runImport(troll);
  t.is('the macro runs without throwing', r.threw?.message ?? null, null);
  t.ok('…and creates a character', !!r.created);

  /* ── Metatype and racial modifiers (SR3 p.56) — TODO 93 ───────────────────────────── */
  const a = r.created.system.attributes;
  t.is('metatype is troll', r.created.system.metatype, 'troll');
  t.is('Body 5 + 5 = 10',          a.body.base, 10);
  t.is('Quickness 5 − 1 = 4',      a.quickness.base, 4);
  t.is('Strength 4 + 4 = 8',       a.strength.base, 8);
  t.is('Charisma 2 − 2 = 0',       a.charisma.base, 0);
  t.is('Intelligence 3 − 2 = 1',   a.intelligence.base, 1);
  t.is('Willpower 2 + 0 = 2',      a.willpower.base, 2);
  t.ok('the modifiers applied are announced',
    r.notes.some(([, m]) => /racial modifiers applied/i.test(m)));
  t.ok('Charisma below 1 is warned about, not clamped (p.55)',
    r.notes.some(([l, m]) => l === 'warn' && /CHA.*below 1/.test(m)));

  /* ── Skills land in the right place — TODO 95 ─────────────────────────────────────── */
  const skills = Object.fromEntries(r.embedded.filter(i => i.type === 'skill').map(s => [s.name, s.system]));
  for (const n of ['Shotguns', 'Gunnery', 'Car', 'Demolitions', 'Wilderness Survival', 'Vehicle Tactics']) {
    t.is(`${n} imports as ACTIVE`, SR3E.skillTypeForCategory(skills[n]?.category), 'active');
  }
  t.is('Wilderness Survival is filed under Survival skills', skills['Wilderness Survival']?.category, 'Survival skills');
  t.is('Shotguns keeps its rating 6', skills.Shotguns?.rating, 6);
  const know = r.embedded.filter(i => i.type === 'skill' && SR3E.skillTypeForCategory(i.system.category) !== 'active');
  t.ok('the SV:/ST:/SF:/BK: knowledge skills stay knowledge',
    know.length >= 5 && know.every(s => SR3E.skillTypeForCategory(s.system.category) === 'knowledge'
      || SR3E.skillTypeForCategory(s.system.category) === 'language'));

  /* ── Graded cyberware is graded once — TODO 101 ───────────────────────────────────── */
  const gun = r.embedded.find(i => i.type === 'cyberware');
  t.is('the alpha CyGun Shotgun keeps its graded 0.88', gun?.system.essenceCost, 0.88);
  t.is('…records its base 1.10',                         gun?.system.essenceCostBase, 1.1);
  t.is('…in the sheet\'s grade name',                    gun?.system.grade, 'Alpha');
  t.is('…and counts 0.88 installed, not 0.71',            SR3EActor.installedEssenceCost([gun]), 0.88);

  /* ── The other metatypes, and an export that carries no raceBonuses (TODO 93, 2nd pass) ──
   *
   * No elf, dwarf or ork export is to hand, so the troll's own allocation (B5 Q5 S4 C2 I3 W2)
   * is re-imported under each race with `raceBonuses` stripped — which also exercises the
   * p.56 table fallback, the path an older generator export takes. Expected values are the
   * book's Racial Modifications Table (SR3 p.56), not read back out of config.js. */
  const as = (race, bonuses = {}) => ({ ...troll, race, raceBonuses: bonuses });
  const attrs = r => { const x = r.created.system.attributes;
    return [x.body.base, x.quickness.base, x.strength.base, x.charisma.base, x.intelligence.base, x.willpower.base].join(' '); };
  const BOOK = {                                  //  B Q S C I W
    Dwarf: '6 5 6 2 3 3',                         // +1 B, +2 S, +1 W
    Elf:   '5 6 4 4 3 2',                         // +1 Q, +2 C
    Ork:   '8 5 6 1 2 2',                         // +3 B, +2 S, −1 C, −1 I
    Troll: '10 4 8 0 1 2',                        // the same figures as the export's own bonuses
  };
  for (const [race, want] of Object.entries(BOOK)) {
    const ri = await runImport(as(race));
    t.is(`${race} without raceBonuses: p.56 table applied (B Q S C I W)`, attrs(ri), want);
    t.ok(`…and the notification says it came from the table`,
      ri.notes.some(([l, m]) => l === 'info' && /from the SR3 p\.56 table/.test(m)));
  }

  const human = await runImport(as('Human'));
  t.is('Human: the allocation is the rating',  attrs(human), '5 5 4 2 3 2');
  t.ok('…with no racial notification', !human.notes.some(([, m]) => /racial modifiers applied/i.test(m)));
  t.is('…and metatype human', human.created.system.metatype, 'human');

  const odd = await runImport(as('Hobgoblin'));
  t.is('An unknown race imports at the allocation', attrs(odd), '5 5 4 2 3 2');
  t.ok('…and warns that nothing was applied',
    odd.notes.some(([l, m]) => l === 'warn' && /not in the Racial Modifications Table/.test(m)));
  t.is('…keeping the race it was given as the metatype', odd.created.system.metatype, 'hobgoblin');
}
