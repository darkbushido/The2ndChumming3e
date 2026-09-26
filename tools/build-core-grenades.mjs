#!/usr/bin/env node
/**
 * Ship the SR3 core book's grenades in `sr3e-sr3-projectiles` — TODO 144.
 *
 *   node tools/build-core-grenades.mjs           write packs-src/sr3e-sr3-projectiles/*.json
 *   node tools/build-core-grenades.mjs --check   exit 1 if any file differs — changes nothing
 *
 * Source: **SR3 core rulebook, p.283, the Explosives Table** — "Grenades". Every row below is the
 * printed row, and the tests (`tests/core-grenades.test.mjs`) hold the same quotation:
 *
 *   Grenade Type            Conceal Damage      Blast  Weight Avail.        Cost St.Index Legal
 *   Offensive (HE or AP)    6       10S         –1/m   .25    4/4 days      30¥  2        3–J
 *   Defensive (HE or AP)    6       10S         –1/.5m .25    4/4 days      30¥  2        3–J
 *   Concussion              6       12M (Stun)  –1/m   .25    5/4 days      30¥  2        3–J
 *   Gas (Neuro-Stun VII)    5       Special     —      .25    8/4 days      60¥  2        3–J
 *   Smoke                   6       —           —      .25    3/24 hrs      30¥  2        5–J
 *   Smoke (IR)              6       —           —      .25    4/48 hrs      40¥  2        5–J
 *   Flash-Pak               12      Special     —      .2     3/36 hrs      250¥ 1        Legal
 *   Mini-grenade            8       by grenade  by grenade .1  +2/by grenade x2   +1       by grenade
 *
 * ⚠ "(HE or AP)" is ONE printed row, so each of Offensive and Defensive ships twice with identical
 *   numbers; the two differ only in the damage rules (p.119: "Determine damage from AP grenades
 *   according to the flechette rules (p. 116)"), which the notes state.
 * ⚠ The Mini-grenade row is a MODIFIER — "by grenade" — so it ships applied to each grenade a launcher
 *   can fire, as `ammunition` in `sr3e-sr3-ammunition` (TODO 163): Conceal 8, Weight .1, Availability +2,
 *   Cost ×2, Street Index +1; Damage, Blast and Legality the grenade's (`MiniGrenade.fromGrenade`). The
 *   Flash-Pak has none: it is a pak, not a grenade. Each mini-grenade is stated for the launcher class
 *   (`gunClass: 'GrLn'`), is loose rounds of one (the price is per grenade), and carries its grenade's
 *   `blast` / `flechette` / area, which the launcher reads from the round it was loaded with.
 * ⚠ `legal` is a boolean and the book prints a code ("3–J"); the code goes in the notes and `legal`
 *   is false for everything but the row printed "Legal".
 * ⚠ Ids are DERIVED from the name, so a re-run reuses the same keys and never orphans a document.
 *   Only files this tool owns (flagged `flags.The2ndChumming3e.generatedBy`) are ever rewritten or removed.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MiniGrenade } from '../scripts/data/mini-grenade.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR  = join(root, 'packs-src', 'sr3e-sr3-projectiles');
const AMMO_DIR = join(root, 'packs-src', 'sr3e-sr3-ammunition');
const CHECK = process.argv.includes('--check');

/** 16 hex chars derived from a string — stable across runs (same function as patch-johnson-stats). */
function idFor(text) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 16);
}

const AP = '<p>AP grenades are offensive or defensive grenades with high fragmentation; they are specifically designed to damage unarmored people. Determine damage from AP grenades according to the flechette rules (SR3 p.116, p.119).</p>';
const MINI = '<p>Also comes as a mini-grenade for a grenade launcher (SR3 p.283): same effects, weight .1, and it does not arm until it has travelled five metres. The mini-grenade ships in the ammunition pack.</p>';

/** The printed rows. `note` is the book's own explanation of the type. */
const ROWS = [
  { name: 'Offensive HE Grenade', conceal: '6', damage: '10S', blast: '-1/m',   weight: 0.25, avail: '4/4 days', cost: 30, index: '2', legality: '3-J', legal: false, note: MINI },
  { name: 'Offensive AP Grenade', conceal: '6', damage: '10S', blast: '-1/m',   weight: 0.25, avail: '4/4 days', cost: 30, index: '2', legality: '3-J', legal: false, note: AP, flechette: true },
  { name: 'Defensive HE Grenade', conceal: '6', damage: '10S', blast: '-1/.5m', weight: 0.25, avail: '4/4 days', cost: 30, index: '2', legality: '3-J', legal: false, note: MINI },
  { name: 'Defensive AP Grenade', conceal: '6', damage: '10S', blast: '-1/.5m', weight: 0.25, avail: '4/4 days', cost: 30, index: '2', legality: '3-J', legal: false, note: AP, flechette: true },
  { name: 'Concussion Grenade',   conceal: '6', damage: '12M Stun', blast: '-1/m', weight: 0.25, avail: '5/4 days', cost: 30, index: '2', legality: '3-J', legal: false,
    note: '<p>The book prints the Damage Code as "12M (Stun)".</p>' },
  { name: 'Gas Grenade (Neuro-Stun VII)', conceal: '5', damage: 'Special', blast: '', weight: 0.25, avail: '8/4 days', cost: 60, index: '2', legality: '3-J', legal: false,
    areaRadius: 10, areaEffect: 'A cloud of stun gas: everything within 10 m is exposed, for 2 Combat Turns (less in windy areas, at the gamemaster\'s discretion).',
    note: '<p>Instead of exploding, these cylindrical grenades release a cloud of stun gas — commonly Neuro-Stun VIII (see p.250), although they may be filled with other chemicals. The gas cloud affects everything within a 10-metre radius, and lasts for 2 Combat Turns (less in windy areas, at the gamemaster\'s discretion).</p>' },
  { name: 'Smoke Grenade',        conceal: '6', damage: '--', blast: '', weight: 0.25, avail: '3/24 hrs', cost: 30, index: '2', legality: '5-J', legal: false,
    areaRadius: 10, areaEffect: 'A smoke cloud 20 m across for 2 Combat Turns (less in windy areas): it obscures vision — apply the visibility modifiers (SR3 p.112).',
    note: '<p>Releases a cloud of smoke that fills an area 20 metres in diameter, lasting for 2 Combat Turns (less in windy areas). Smoke obscures vision, applying visibility modifiers to relevant tests.</p>' },
  { name: 'Smoke (IR) Grenade',   conceal: '6', damage: '--', blast: '', weight: 0.25, avail: '4/48 hrs', cost: 40, index: '2', legality: '5-J', legal: false,
    areaRadius: 10, areaEffect: 'An infra-red smoke cloud 20 m across for 2 Combat Turns: hot particles obscure thermographic vision as well as normal sight.',
    note: '<p>Infra-red smoke contains hot particles that obscure thermographic vision. Otherwise as a smoke grenade.</p>' },
  { name: 'Flash-Pak',            conceal: '12', damage: 'Special', blast: '', weight: 0.2, avail: '3/36 hrs', cost: 250, index: '1', legality: 'Legal', legal: true,
    areaEffect: 'Anyone facing it takes +4 to target numbers (+2 with flare compensation); it negates poor or no lighting modifiers but adds its own +2 from the strobing.',
    note: '<p>The size of a pack of cigarettes, this unit contains four quartz-halogen micro-flashes designed to fire in random strobe sequences to disorient, distract and blind opponents. Anyone facing a flash-pak receives a +4 target number modifier (+2 if the target has flare compensation). The pak also negates modifiers from poor or no lighting, but imposes its own +2 modifier because of the strobing flashes.</p>' },
];

const IMG = 'systems/The2ndChumming3e/styles/textures/projectile-weapons-default.webp';

/** Every grenade row but the Flash-Pak comes as a mini-grenade. */
const hasMini = row => row.name !== 'Flash-Pak';

/** "Offensive HE Grenade" → "Offensive HE Mini-grenade"; "Smoke (IR) Grenade" → "Smoke (IR) Mini-grenade". */
const miniName = name => /Grenade/.test(name) ? name.replace('Grenade', 'Mini-grenade') : `${name} Mini-grenade`;

function buildMiniDoc(row) {
  const name = miniName(row.name);
  const id   = idFor(`sr3e-sr3-ammunition|core-mini-grenade|${name}`);
  const m    = MiniGrenade.fromGrenade(row);
  const blastLine = m.blast ? `Blast ${m.blast.replace('-', '–')}.` : 'No blast.';
  const notes = `<p>A mini-grenade for a grenade launcher (SR3 p.283): the ${row.name}'s effects, fired rather than thrown. `
    + `It does not arm until it has travelled about five metres (SR3 p.118).</p>`
    + (row.flechette ? AP : '')
    + `<p>SR3 p.283, the Mini-grenade row applied to the ${row.name} row: Conceal 8, Weight .1, Availability ${row.avail} +2, `
    + `Cost ${row.cost}¥ ×2, Street Index ${row.index} +1. Legality ${m.legality}. ${blastLine}</p>`;
  return {
    _key: `!items!${id}`,
    doc: {
      _id: id,
      name,
      type: 'ammunition',
      system: {
        concealability: m.conceal,
        damage: m.damage,
        ammoType: 'regular',
        loadMechanism: 'm',
        countedIn: 'rounds',
        gunClass: MiniGrenade.LAUNCHER_CLASS,
        rounds: 1,
        reloads: 0,
        roundsPerReload: 0,
        weight: m.weight,
        availability: m.avail,
        cost: m.cost,
        streetIndex: m.index,
        bookPage: 'sr3.283',
        notes,
        blast: m.blast,
        ...(row.flechette ? { flechette: true } : {}),
        ...(row.areaRadius ? { areaRadius: row.areaRadius } : {}),
        ...(row.areaEffect ? { areaEffect: row.areaEffect } : {}),
      },
      effects: [],
      flags: { The2ndChumming3e: { generatedBy: 'build-core-grenades' } },
      img: IMG,
    },
    embedded: {},
  };
}

function buildDoc(row) {
  const id = idFor(`sr3e-sr3-projectiles|core-grenade|${row.name}`);
  const blastLine = row.blast ? `Blast ${row.blast.replace('-', '–')}.` : 'No blast.';
  const notes = `${row.note}<p>SR3 p.283 — Legality ${row.legality}. ${blastLine}</p>`;
  return {
    _key: `!items!${id}`,
    doc: {
      _id: id,
      name: row.name,
      type: 'projectile',
      system: {
        category: 'GR',
        skill: 'Throwing Weapons',
        attribute: 'strength',
        concealability: row.conceal,
        strMin: 0,
        damage: row.damage,
        weight: String(row.weight).replace(/^0\./, '.'),
        availability: row.avail,
        cost: row.cost,
        streetIndex: row.index,
        legal: row.legal,
        bookPage: 'sr3.283',
        notes,
        isAoE: true,
        blast: row.blast,
        ...(row.areaRadius ? { areaRadius: row.areaRadius } : {}),
        ...(row.areaEffect ? { areaEffect: row.areaEffect } : {}),   // no-damage area grenades (TODO 155)
        ...(row.flechette ? { flechette: true } : {}),   // AP: the flechette rules, SR3 p.119 (TODO 156)
        hands: 1,
      },
      effects: [],
      flags: { The2ndChumming3e: { generatedBy: 'build-core-grenades' } },
      img: IMG,
    },
    embedded: {},
  };
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fileNameFor = doc => `${slug(doc.doc.name)}.${doc.doc._id}.json`;

/** The pieces, on an object so a test (and a mutant) can reach them. */
export const CoreGrenades = { ROWS, buildDoc, buildMiniDoc, hasMini, fileNameFor };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = docs => new Map(docs.map(d => [CoreGrenades.fileNameFor(d), JSON.stringify(d, null, 2) + '\n']));
  const packs = [
    [DIR,      files(CoreGrenades.ROWS.map(CoreGrenades.buildDoc))],
    [AMMO_DIR, files(CoreGrenades.ROWS.filter(CoreGrenades.hasMini).map(CoreGrenades.buildMiniDoc))],
  ];
  let dirty = 0;
  for (const [dir, want] of packs) {
    for (const [file, text] of want) {
      const p = join(dir, file);
      const have = existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null;
      if (have !== text) { dirty++; console.log(`${CHECK ? 'differs' : 'write'}  ${file}`); if (!CHECK) writeFileSync(p, text); }
    }
    // Remove only files this tool wrote earlier and no longer wants.
    for (const f of readdirSync(dir).filter(f => f.endsWith('.json') && !want.has(f))) {
      if (JSON.parse(readFileSync(join(dir, f), 'utf8')).doc?.flags?.The2ndChumming3e?.generatedBy !== 'build-core-grenades') continue;
      dirty++; console.log(`${CHECK ? 'stale' : 'remove'}  ${f}`); if (!CHECK) unlinkSync(join(dir, f));
    }
  }
  console.log(dirty ? (CHECK ? `${dirty} file(s) out of date.` : `${dirty} file(s) written.`) : 'Up to date.');
  process.exit(CHECK && dirty ? 1 : 0);
}
