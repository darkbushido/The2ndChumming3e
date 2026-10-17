/**
 * Limited spells · SR3 p.180-181 — TODO 223.
 *
 * > "A limit may either reduce the Force of a spell for purposes of Drain, or reduce the Karma cost and
 * > difficulty to learn the spell, by its modifier. The player chooses which when the spell is learned.
 * > The reduction in Force for Drain purposes also affects whether or not the caster suffers stun or
 * > physical Drain damage."
 *
 * The book's example: Grandfather Bones, Magic 6, learns Fireball at Force 8 with the exclusive limit
 * (−2) taken off Drain; "he subtracts 2 from the Force before determining whether or not the Drain does
 * physical damage and before factoring in the spell's Drain Modifier." Taken off the cost instead, the
 * same spell costs 6 Karma and drains as Force 8 (Physical).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SpellLimits } = await import('../scripts/data/spell-limits.mjs');
const { GoodKarma } = await import('../scripts/data/karma-uses.mjs');
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'spell-limits';

const spell = (fetish = '', exclusive = '') => ({ system: { limitFetish: fetish, limitExclusive: exclusive } });
const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

export async function run(t) {
  /* ==== the modifiers ==== */
  t.is('a fetish is −1', SpellLimits.LIMITS.fetish.modifier, 1);
  t.is('an exclusive is −2', SpellLimits.LIMITS.exclusive.modifier, 2);

  /* ==== Drain Force: only a limit taken off DRAIN counts ==== */
  t.is('no limit: drains as the cast Force',                SpellLimits.drainForce(8, spell()), 8);
  t.is('an exclusive off Drain: Force 8 drains as 6',       SpellLimits.drainForce(8, spell('', 'drain')), 6);
  t.is('a fetish off Drain: Force 8 drains as 7',           SpellLimits.drainForce(8, spell('drain', '')), 7);
  t.is('both off Drain add: Force 8 drains as 5',           SpellLimits.drainForce(8, spell('drain', 'drain')), 5);
  t.is('an exclusive off the COST leaves Drain at 8',       SpellLimits.drainForce(8, spell('', 'learning')), 8);
  t.is('a fetish off the cost, an exclusive off Drain: 6',  SpellLimits.drainForce(8, spell('learning', 'drain')), 6);
  t.is('never below 0',                                     SpellLimits.drainForce(1, spell('drain', 'drain')), 0);
  t.is('an unrecognised side counts as no limit',           SpellLimits.drainForce(8, spell('bogus', 'DRAIN ')), 6);   // trimmed, case-folded
  t.is('a spell with no limit fields at all (old data)',    SpellLimits.drainForce(8, { system: {} }), 8);
  t.is('…and a missing spell',                              SpellLimits.drainForce(8, null), 8);

  /* ==== learning reduction: only a limit taken off the COST ==== */
  t.is('no limit',                          SpellLimits.learningReduction(spell()), 0);
  t.is('an exclusive off the cost',         SpellLimits.learningReduction(spell('', 'learning')), 2);
  t.is('a fetish off the cost',             SpellLimits.learningReduction(spell('learning', '')), 1);
  t.is('both off the cost',                 SpellLimits.learningReduction(spell('learning', 'learning')), 3);
  t.is('an exclusive off Drain costs nothing off the learning', SpellLimits.learningReduction(spell('', 'drain')), 0);
  t.is('Fireball at 8, exclusive off the cost, costs 6 Karma (the book)',
    GoodKarma.spellCost(8, SpellLimits.learningReduction(spell('', 'learning'))), 6);
  t.is('Fireball at 8, exclusive off Drain, costs the full 8',
    GoodKarma.spellCost(8, SpellLimits.learningReduction(spell('', 'drain'))), 8);

  /* ==== the book's example, end to end: Stun or Physical ==== */
  const bones = { magic: { value: 6, base: 6 } };
  const physical = (force, sp) => SR3EActor.drainIsPhysical(SpellLimits.drainForce(force, sp), bones);
  t.ok('Bones, Force 8, no limit: Physical',                          physical(8, spell()));
  t.ok('Bones, Force 8, exclusive off Drain: drains as 6 — STUN',     !physical(8, spell('', 'drain')));
  t.ok('Bones, Force 8, exclusive off the cost: still Physical',      physical(8, spell('', 'learning')));
  t.ok('Bones, Force 8, a fetish off Drain (7) is still Physical',    physical(8, spell('drain', '')));

  /* ==== …and the Drain Power: half the Drain Force, before the Drain Modifier ==== */
  const tnOf = (force, sp) => SR3EItem.parseDrainFormula('(DL+1)', SpellLimits.drainForce(force, sp), 'S').tn;
  t.is('Force 8 unlimited: Power 4',                   tnOf(8, spell()), 4);
  t.is('Force 8, exclusive off Drain: Power 3',        tnOf(8, spell('', 'drain')), 3);

  /* ==== warnings and notes: warn, never refuse ==== */
  t.eq('no limit, no warnings', SpellLimits.castWarnings(spell()), []);
  t.ok('a fetish warns that it must touch the caster (p.180)', /touching the caster/.test(SpellLimits.castWarnings(spell('drain', ''))[0]));
  t.ok('an exclusive warns that it is an Exclusive Action (p.160)', /Exclusive Action/.test(SpellLimits.castWarnings(spell('', 'learning'))[0]) && /p\.160/.test(SpellLimits.castWarnings(spell('', 'learning'))[0]));
  t.is('both warn', SpellLimits.castWarnings(spell('drain', 'drain')).length, 2);
  t.is('the card note is empty without a Drain limit', SpellLimits.drainNote(8, spell('', 'learning')), '');
  t.ok('the card note states the Drain Force and the cast Force', /drains as Force 6 \(cast at 8\)/.test(SpellLimits.drainNote(8, spell('', 'drain'))));
  t.is('describe', SpellLimits.describe(spell('drain', 'learning')), 'fetish −1 (Drain), exclusive −2 (learning)');
  t.is('describe: none', SpellLimits.describe(spell()), '');

  /* ==== source-level: the sheets and the cast actually read it ==== */
  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the cast takes the Drain Force from the spell\'s limits',
    /const drainForce\s*=\s*SpellLimits\.drainForce\(force, this\)/.test(item));
  t.ok('…and the Stun/Physical test is made on it, not on the cast Force',
    /drainIsPhysical\(drainForce,/.test(item) && !/drainIsPhysical\(force, actor\.system\.attributes,\s*\n?\s*\{ astral: actor\.system\.astralMode/.test(item));
  t.ok('…and it rides on the spell context', /spellContext = \{[\s\S]{0,2500}drainForce,/.test(item));
  t.ok('the warnings are notifications, never a return',
    /for \(const w of SpellLimits\.castWarnings\(this\)\) ui\.notifications\.warn/.test(item));

  const actor = read('scripts/documents/SR3EActor.js');
  t.is('both Drain buttons carry the Drain Force', (actor.match(/sc\.drainForce \?\? (sc\.force|force)/g) ?? []).length, 2);

  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('learning a spell records where each limit was taken',
    /'system\.limitFetish': fetish, 'system\.limitExclusive': exclusive/.test(sheet));
  t.ok('…the learning cost reads only the limits taken off the cost',
    /SpellLimits\.learningReduction\(chosen\)/.test(sheet) && /GK\.spellCost\(force, limit\)/.test(sheet));
  t.ok('…and the GM\'s undo restores the limits too', /\.\.\.wasLimits/.test(sheet));
  t.ok('the old free-number limit field is gone', !/id="sp-limit"/.test(sheet));

  const model = read('scripts/data/ItemDataModels.js');
  t.ok('the spell model declares both fields, blank by default (no migration: old spells are unlimited)',
    /limitFetish:\s*new StringField\(\{ initial: '' \}\)/.test(model) && /limitExclusive:\s*new StringField\(\{ initial: '' \}\)/.test(model));
  const isheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('both are editable on the spell sheet', /'limitFetish'/.test(isheet) && /'limitExclusive'/.test(isheet));
}
