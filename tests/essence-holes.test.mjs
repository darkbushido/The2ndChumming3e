/**
 * The Essence hole and the Essence Slot surgery option · M&M p.150 (TODO 53).
 *
 * The maintainer's ruling (2026-09-16): one pooled hole, not a list of removed implants. A 3.0 hole with a
 * 2.0 implant fitted into it is a 1.0 hole, tracked until it is used up.
 * The rule this sits beside: removing cyberware refunds nothing (M&M p.147, TODO 5).
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { EssenceHoles, THRESHOLD_MOD } = await import('../scripts/data/essence-holes.mjs');

export const name = 'essence-holes';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const E = EssenceHoles;

  /* ── One pooled hole ──────────────────────────────────────────────────────── */
  t.is('removing a 3.0 implant makes a 3.0 hole', E.add(0, 3), 3);
  t.is('…and another 0.2 grows the same hole', E.add(3, 0.2), 3.2);
  t.eq('nothing recorded is no hole', [E.of({}), E.of({ essenceHole: null }), E.of(undefined)], [0, 0, 0]);
  t.is('float noise is rounded off', E.add(0.1, 0.2), 0.3);

  /* ── The maintainer's example ─────────────────────────────────────────────── */
  const first = E.fill(3, 2);
  t.eq('a 2.0 implant into a 3.0 hole: free, and a 1.0 hole is left', [first.discount, first.charge, first.hole], [2, 0, 1]);
  const second = E.fill(first.hole, 0.5);
  t.eq('…a 0.5 implant then takes half of that: free, 0.5 left', [second.charge, second.hole], [0, 0.5]);
  const third = E.fill(second.hole, 2);
  t.eq('…and a 2.0 implant finishes it: 0.5 off, 1.5 to pay, the hole zeroed', [third.discount, third.charge, third.hole], [0.5, 1.5, 0]);
  t.eq('no hole: full price', [E.fill(0, 1).discount, E.fill(0, 1).charge], [0, 1]);
  t.eq('the option costs +2 Threshold (M&M p.150)', [THRESHOLD_MOD, E.PAGE], [2, 'M&M p.150']);

  /* ── A player cannot change it ────────────────────────────────────────────── */
  const flat = { 'system.essenceHole': 6 };
  t.ok('a player\'s write to the hole is dropped', SR3EActor.stripPlayerEssenceWrites(flat, false) && !('system.essenceHole' in flat));
  const nested = { system: { essenceHole: 6 } };
  SR3EActor.stripPlayerEssenceWrites(nested, false);
  t.ok('…in the nested spelling too', !('essenceHole' in nested.system));
  const gm = { 'system.essenceHole': 6 };
  t.ok('…and the GM\'s is not', !SR3EActor.stripPlayerEssenceWrites(gm, true) && gm['system.essenceHole'] === 6);

  /* ── The wiring, source-level ─────────────────────────────────────────────── */
  const main = read('scripts/sr3e.js');
  t.ok('a removal adds to the hole, on the GM', /Hooks\.on\('deleteItem', \(item\) => _recordEssenceHoleOnRemoval\(item\)\)/.test(main)
    && /EssenceHoles\.add\(EssenceHoles\.of\(actor\.system\), amount\)/.test(main));
  t.ok('…and NEVER touches essence.lost — removal refunds nothing (M&M p.147)',
    !/essence\.lost/.test(main.slice(main.indexOf('function _recordEssenceHoleOnRemoval'), main.indexOf("Hooks.on('createItem'"))));
  t.ok('the install fills it opt-in, per implant, keeping what is left',
    /if \(item\.system\?\.essenceSlot\)/.test(main) && /EssenceHoles\.fill\(EssenceHoles\.of\(actor\.system\), cost\)/.test(main)
    && /changes\['system\.essenceHole'\] = holeUpdate/.test(main));
  t.ok('an implant marked Essence Slot with no hole warns rather than discounting', /is marked Essence Slot but there is no hole/.test(main));
  t.ok('no removed-implant list is kept any more', !/essenceHoles/.test(main) && !/essenceHoles/.test(read('scripts/data/ActorDataModels.js')));
  t.is('both actor types hold the one number', (read('scripts/data/ActorDataModels.js').match(/essenceHole:\s+new NumberField/g) ?? []).length, 2);
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the sheet shows it as a number only the GM can edit', /\$\{essGM \? 'name="system\.essenceHole"' : 'disabled'\}/.test(sheet));
  t.ok('CyberwareData declares the option', /essenceSlot:\s+new BooleanField\(\{ initial: false \}\)/.test(read('scripts/data/ItemDataModels.js')));
}
