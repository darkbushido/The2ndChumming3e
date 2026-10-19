/**
 * A spell's Target code → its cast TN · SR3 pp.182, 192-197 — rules check 0.7.0.
 *
 * > "Target: 10 - Essence" (Heal, Treat, Decrease Attribute) · the Detection Spell Target Number table (p.192):
 * > in sight 4, out of sight 6, different plane 10, behind an astral barrier + Force · the Object Resistance
 * > Table (p.182): 3 / 5 / 8 / 10+ · "The target number is the Attribute to be increased" (p.194) ·
 * > Stabilize: "add the number of minutes elapsed" (p.194) · Fling: "Treat the Sorcery Test as a normal Ranged
 * > Combat Test" (p.197).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SpellTarget } from '../scripts/data/spell-target.mjs';

export const name = 'spell-target';
const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

const att = (o = {}) => ({ type: 'character', attributes: {
  willpower: { value: 4 }, body: { value: 5 }, strength: { value: 6 }, charisma: { value: 3 },
  intelligence: { value: 4 }, quickness: { value: 5 }, reaction: { value: 7 }, essence: { value: 6 }, ...o } });
const tn = (token, spellName = '', over = {}, inputs = {}, spellType = 'Mana') =>
  SpellTarget.resolve({ token, spellName, spellType, force: 5, target: att(over), inputs });

export async function run(t) {
  /* ==== the plain codes keep their meaning ==== */
  t.is('W is the target Willpower', tn('W(R)').tn, 4);
  t.is('B(T) is the target Body', tn('B(T)').tn, 5);
  t.is('F is the Force', tn('F').tn, 5);
  t.is('a number is fixed', tn('4(RC)').tn, 4);
  t.is('blank Mana is Willpower', tn('').tn, 4);
  t.is('blank Physical is Body', tn('', '', {}, {}, 'Physical').tn, 5);
  t.is('a fixed 1 is never below 2', tn('1').tn, 2);

  /* ==== classification of every token the pack ships ==== */
  const kinds = { '10-E(V)': 'essence', '10-E(R)': 'essence', DT: 'detect', 'DT(R)': 'detect', OR: 'object',
    'TOX(V)': 'toxin', 'DP(T)': 'disease', 'Att(V)': 'attribute', 'Rea(V)': 'reaction', 'REA(V)': 'reaction',
    '4+MIN V': 'stabilize', '4(V)': 'number', '6': 'number', W: 'attr', F: 'force', '': 'blank' };
  for (const [tok, k] of Object.entries(kinds)) t.is(`token "${tok}" is ${k}`, SpellTarget.kind(tok, 'x'), k);
  t.is('"See text" on Fling', SpellTarget.kind('See text', 'Fling'), 'fling');
  t.is('"See text" on anything else is unknown', SpellTarget.kind('See text', 'Mystery'), 'unknown');

  /* ==== every Target token in the spell pack is classified (none falls into "unknown") ==== */
  const dir = 'packs-src/sr3e-sr3-spells';
  const files = readdirSync(fileURLToPath(new URL(`../${dir}`, import.meta.url))).filter(f => f.endsWith('.json'));
  const bad = [];
  for (const f of files) {
    const d = JSON.parse(read(`${dir}/${f}`)).doc;
    if (SpellTarget.kind(d.system?.target, d.name) === 'unknown') bad.push(`${d.name} [${d.system?.target}]`);
  }
  t.eq('no shipped spell has a Target code the system cannot read', bad, []);

  /* ==== 10 - Essence (Heal, Treat, Decrease) · p.193 ==== */
  t.is('Essence 6 gives TN 4', tn('10-E(V)', 'Heal', { essence: { value: 6 } }).tn, 4);
  t.is('Essence 3 gives TN 7', tn('10-E(V)', 'Heal', { essence: { value: 3 } }).tn, 7);
  t.is('a fraction rounds up: Essence 5.5 gives 5', tn('10-E(V)', 'Treat', { essence: { value: 5.5 } }).tn, 5);
  t.is('never below 2: Essence 9', SpellTarget.essenceTN(9), 2);
  t.is('Decrease Attribute (B) resists with Body', tn('10-E(R)', 'Decrease Attribute (B)').resistAttr, 'body');
  t.is('Decrease Cyber Attribute (S) resists with Strength', tn('10-E(R)', 'Decrease Cyber Attribute (S)   1').resistAttr, 'strength');
  t.is('Heal keeps the Mana fallback', tn('10-E(V)', 'Heal').resistAttr, 'willpower');
  t.is('the healing flow uses the same rule', SpellTarget.essenceTN(4.2), Math.ceil(10 - 4.2));

  /* ==== Detection table · p.192 ==== */
  t.is('in sight 4', tn('DT', 'Detect Magic', {}, { row: 'sight' }).tn, 4);
  t.is('out of sight 6', tn('DT', 'Detect Life', {}, { row: 'out' }).tn, 6);
  t.is('a different plane 10', tn('DT(R)', 'Detect Enemies', {}, { row: 'plane' }).tn, 10);
  t.is('behind an astral barrier: + Force (in sight 4 + 5)', tn('DT', 'Detect Magic', {}, { row: 'sight', barrier: true }).tn, 9);
  t.is('no row chosen means out of sight', tn('DT').tn, 6);
  t.is('default row: on canvas and visible', SpellTarget.defaultDetectionRow({ onCanvas: true, visible: true }), 'sight');
  t.is('default row: on canvas but unseen', SpellTarget.defaultDetectionRow({ onCanvas: true, visible: false }), 'out');
  t.is('default row: no token', SpellTarget.defaultDetectionRow({}), 'out');
  t.ok('the card says which row', /Detection table \(p\.192\): in sight 4/.test(tn('DT', 'Detect Magic', {}, { row: 'sight' }).source));

  /* ==== Object Resistance Table · p.182 ==== */
  const or = k => tn('OR', 'Analyze Device', {}, { row: k }, 'Physical');
  t.is('natural 3', or('natural').tn, 3);
  t.is('low-tech 5', or('lowtech').tn, 5);
  t.is('high-tech 8', or('hightech').tn, 8);
  t.is('highly processed 10', or('processed').tn, 10);
  t.is('Analyze Device: familiarity -2', tn('OR', 'Analyze Device', {}, { row: 'hightech', familiar: true }, 'Physical').tn, 6);
  t.is('Force must be half the Resistance, rounded down', SpellTarget.objectMinForce(5), 2);
  t.ok('a Force too low is warned about, not refused', /too low/.test(SpellTarget.resolve({ token: 'OR', spellName: 'x', force: 3,
    target: att(), inputs: { row: 'hightech' } }).source));
  const veh = SpellTarget.resolve({ token: 'W', spellName: 'Manabolt', force: 6, target: { type: 'vehicle', attributes: {} }, inputs: { row: 'hightech' } });
  t.is('any spell on a vehicle uses the Object Resistance Table', veh.tn, 8);
  t.is('and says so', veh.kind, 'object');
  t.is('a fixed-number spell on a vehicle keeps its number', SpellTarget.resolve({ token: '4', force: 5, target: { type: 'vehicle' } }).tn, 4);

  /* ==== toxin Strength / disease Power ==== */
  const tox = tn('TOX(V)', 'Detox', {}, { strength: 6 });
  t.is('Detox: the toxin Strength entered', tox.tn, 6);
  t.ok('stated on the card', /toxin's Strength \(6, as entered\)/.test(tox.source));
  t.is('Cure Disease: the disease Power entered', tn('DP(T)', 'Cure Disease', {}, { strength: 5 }).tn, 5);
  const noTox = tn('TOX(V)', 'Antidote', {}, {});
  t.ok('not entered: a floor TN and the GM is told to set it', noTox.tn === 2 && noTox.check && /not entered/.test(noTox.source));

  /* ==== Increase Attribute / Reaction · p.194 ==== */
  t.is('Increase Attribute (S) is the target Strength', tn('Att(V)', 'Increased Attribute (S)').tn, 6);
  t.is('Increase Attribute (C) is the target Charisma', tn('Att(V)', 'Increased Attribute (C)').tn, 3);
  t.is('Cybered variant reads the cyber-modified rating', tn('Att(V)', 'Increased Cyber Attribute (Q)  1', { quickness: { value: 8 } }).tn, 8);
  t.is('Increase Reaction is the target Reaction', tn('Rea(V)', 'Increased Reaction').tn, 7);
  t.is('Increase Reflexes is the target Reaction', tn('REA(V)', 'Incr. Reflexes +2INI DIE', { reaction: { value: 9 } }).tn, 9);
  t.ok('an Attribute spell whose name hides the Attribute asks the GM to check', tn('Att(V)', 'Mystery').check);

  /* ==== Stabilize · p.194 ==== */
  t.is('Stabilize: 4 + minutes', tn('4+MIN V', 'Stabilize', {}, { minutes: 3 }).tn, 7);
  t.is('no minutes is 4', tn('4+MIN V', 'Stabilize').tn, 4);
  t.is('same rule as the healing flow', SpellTarget.stabilizeTN(12), 16);

  /* ==== Fling · p.197 ==== */
  t.is('Fling short 4', tn('See text', 'Fling', {}, { band: 'short' }, 'Physical').tn, 4);
  t.is('Fling long 6', tn('See text', 'Fling', {}, { band: 'long' }, 'Physical').tn, 6);
  t.is('Fling extreme 9', tn('See text', 'Fling', {}, { band: 'extreme' }, 'Physical').tn, 9);
  t.ok('Fling quotes the rule', /Ranged Combat Test/.test(tn('See text', 'Fling').source));

  /* ==== GM adjustment on every TN, floor 2 ==== */
  t.is('adjustment moves a table TN', tn('DT', 'Detect Magic', {}, { row: 'sight', adjust: 2 }).tn, 6);
  t.ok('and is stated', /GM \+2/.test(tn('DT', 'Detect Magic', {}, { row: 'sight', adjust: 2 }).source));
  t.is('never below 2', tn('DT', 'Detect Magic', {}, { row: 'sight', adjust: -9 }).tn, 2);

  /* ==== unknown tokens fall back and ask the GM to check ==== */
  const u = tn('ZZ', 'Mystery');
  t.ok('unknown: Willpower fallback, flagged for the GM', u.tn === 4 && u.check && /GM to check/.test(u.source));

  /* ==== wired into the cast (source level) ==== */
  const item = read('scripts/documents/SR3EItem.js');
  const heal = read('scripts/SR3EHealing.js');
  t.ok('_parseSpellTarget delegates to SpellTarget.resolve', /_parseSpellTarget\([^)]*\) \{\s*return SpellTarget\.resolve/.test(item));
  t.ok('the cast asks for the table / toxin / minutes inputs before computing the TN',
    /_promptSpellTNInputs\(actor, targetActors, this, force\)[\s\S]{0,900}targetTNs = Object\.fromEntries/.test(item));
  t.ok('a cancelled TN dialog cancels the cast', /tnInputs === null\) return null/.test(item));
  t.ok('the dialog is a DialogV2.wait', /static async _promptSpellTNInputs[\s\S]{0,9000}DialogV2\.wait/.test(item));
  t.ok('the card carries the non-simple TN source', /parsedPrimary\.source/.test(item));
  t.ok('Heal/Treat share the pure Essence rule', /healSpellTN\(essence\) \{ return SpellTarget\.essenceTN/.test(heal));
  t.ok('the Resist card passes the spell name (Decrease resists with the Attribute named)',
    /_parseSpellTarget\(spellTarget, this, force, spellType, \{ spellName \}\)/.test(read('scripts/documents/SR3EActor.js')));
}
