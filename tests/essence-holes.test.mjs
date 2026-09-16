/**
 * Essence holes and the Essence Slot surgery option · M&M p.150 (TODO 53).
 *
 * The rule this sits beside: removing cyberware refunds nothing (M&M p.147, TODO 5). A hole is a record
 * of what came out; only a surgeon fitting the next implant into it, at +2 Threshold, spends it.
 */
import { readFileSync } from 'node:fs';
import { EssenceHoles, THRESHOLD_MOD } from '../scripts/data/essence-holes.mjs';

export const name = 'essence-holes';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const E = EssenceHoles;

  /* ── Recording a removal ──────────────────────────────────────────────────── */
  let holes = E.record([], { name: 'Wired Reflexes [2]', amount: 3, at: 1 });
  t.is('removing a 3.0 implant leaves a 3.0 hole', E.total(holes), 3);
  holes = E.record(holes, { name: 'Cybereyes', amount: 0.2, at: 2 });
  t.eq('…and they accumulate, newest last', holes.map(h => h.amount), [3, 0.2]);
  t.is('two holes total 3.2', E.total(holes), 3.2);
  t.eq('a free implant leaves no hole', E.record(holes, { name: 'Cosmetic', amount: 0 }).length, 2);
  t.eq('nothing recorded reads as no holes', [E.list({}), E.list({ essenceHoles: null }), E.total(undefined)], [[], [], 0]);

  /* ── Which hole gets filled ───────────────────────────────────────────────── */
  t.is('a 0.2 implant takes the snug 0.2 hole, not the 3.0 one', E.pick(holes, 0.2), 1);
  t.is('a 1.0 implant takes the 3.0 hole — the only one that covers it', E.pick(holes, 1), 0);
  t.is('a 4.0 implant takes the largest for the biggest discount', E.pick(holes, 4), 0);
  t.is('no holes, no pick', E.pick([], 1), -1);

  /* ── The discount ─────────────────────────────────────────────────────────── */
  const snug = E.fill(holes, 0.2);
  t.eq('0.2 into the 0.2 hole: free, and that hole is gone', [snug.discount, snug.charge, snug.holes.length], [0.2, 0, 1]);
  t.is('…the 3.0 hole is untouched', E.total(snug.holes), 3);
  const part = E.fill(holes, 4);
  t.eq('4.0 into a 3.0 hole: 3.0 off, 1.0 to pay', [part.discount, part.charge], [3, 1]);
  const waste = E.fill(holes, 1);
  t.eq('1.0 into the 3.0 hole: 1.0 off…', [waste.discount, waste.charge], [1, 0]);
  t.is('…and the other 2.0 is NOT lent to the next implant — the hole is consumed whole', waste.wasted, 2);
  t.is('…so only the 0.2 hole is left', E.total(waste.holes), 0.2);
  const none = E.fill([], 1);
  t.eq('no hole: full price, nothing consumed', [none.discount, none.charge, none.used], [0, 1, null]);
  t.eq('the surgery option costs +2 Threshold (M&M p.150)', [THRESHOLD_MOD, E.THRESHOLD_MOD, E.PAGE], [2, 2, 'M&M p.150']);

  /* ── The wiring, source-level ─────────────────────────────────────────────── */
  const main = read('scripts/sr3e.js');
  t.ok('a removal records a hole, on the GM', /_recordEssenceHoleOnRemoval/.test(main) && /Hooks\.on\('deleteItem', \(item\) => _recordEssenceHoleOnRemoval\(item\)\)/.test(main));
  t.ok('…and NEVER touches essence.lost — removal refunds nothing (M&M p.147)',
    !/essence\.lost/.test(main.slice(main.indexOf('function _recordEssenceHoleOnRemoval'), main.indexOf("Hooks.on('createItem'"))));
  t.ok('the install discount is opt-in, per implant', /if \(item\.system\?\.essenceSlot\)/.test(main) && /EssenceHoles\.fill\(EssenceHoles\.list\(actor\.system\), cost\)/.test(main));
  t.ok('…and writes the consumed holes back with the new loss', /changes\['system\.essenceHoles'\] = holeUpdate/.test(main));
  t.ok('an implant marked Essence Slot with no hole warns rather than discounting', /is marked Essence Slot but there is no hole/.test(main));
  t.ok('CyberwareData declares the option', /essenceSlot:\s+new BooleanField\(\{ initial: false \}\)/.test(read('scripts/data/ItemDataModels.js')));
  t.is('both actor types hold the holes', (read('scripts/data/ActorDataModels.js').match(/essenceHoles:\s+new ArrayField/g) ?? []).length, 2);
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the Cyber tab lists them, and only the GM can clear one', /data-action="clearEssenceHole"/.test(sheet)
    && /Only the GM can clear an Essence hole/.test(sheet));
  t.ok('the item sheet offers the tick beside the grade', /_check\(`Essence Slot \(\+\$\{game\.sr3e\.EssenceHoles\.THRESHOLD_MOD\} Threshold\)`, 'essenceSlot'/.test(read('scripts/sheets/SR3EItemSheet.js')));
}
