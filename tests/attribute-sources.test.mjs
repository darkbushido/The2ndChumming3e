/**
 * Every attribute modifier explains itself on hover · TODO 100 (requested in play, 2026-09-13).
 *
 * *"when you moused over the modifiers it explained what's going on."* `_prepareCharacter` now
 * records `derived.attributeSources` — each bonus by name, as it is applied — and the sheet renders
 * them with `SR3EActor.attributeBreakdown`.
 *
 * ⚠ The invariant that matters most: **base + the recorded sources = the value every roll uses.**
 * A tooltip that disagrees with the number beside it is worse than none. It also caught a real
 * display bug: the sheet summed its own total from base + adept + cyber + racial, so an Attribute
 * Boost or a running Adrenal Pump raised the attribute without the total changing.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'attribute-sources';

const CORE = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'];

function derive(items, { magicType = '', metatype = 'human', augmentations = {}, attributeBoost = {}, base = {} } = {}) {
  const sys = { magicType, metatype, augmentations, attributeBoost, attributes: {}, wounds: { stun: { value: 0 }, physical: { value: 0 } } };
  const attr = {};
  for (const k of [...CORE, 'reaction', 'essence', 'magic']) attr[k] = { base: base[k] ?? 4, value: base[k] ?? 4 };
  attr.magic.base = base.magic ?? (magicType ? 6 : 0);
  sys.woundMod = 0;
  SR3EActor.prototype._prepareCharacter.call({ items, system: sys }, sys, attr);
  return { d: sys.derived, attr };
}
const sum = list => list.reduce((a, x) => a + (x.amount || 0), 0);

export async function run(t) {
  /* ── Cyberware and bioware, by name ─────────────────────────────────────────────── */
  const muscle = { id: 'm', type: 'cyberware', name: 'Muscle Replac. [2]', system: { bonusQui: 2, bonusStr: 2 } };
  const tailored = { id: 'tp', type: 'bioware', name: 'Tailored Pheromones [1]', system: { bonusCha: 1 } };
  const a = derive([muscle, tailored]);
  const q = a.d.attributeSources.quickness;
  t.is('Muscle Replacement names itself on Quickness', q[0]?.label, 'Muscle Replac. [2]');
  t.is('…with its +2', q[0]?.amount, 2);
  t.is('…as cyberware', q[0]?.kind, 'cyber');
  t.is('Tailored Pheromones is bioware on Charisma', a.d.attributeSources.charisma[0]?.kind, 'bio');
  t.ok('an attribute nothing touches has no sources', a.d.attributeSources.body.length === 0);
  t.ok('Muscle Replacement\'s Quickness is noted as not counting toward Reaction (M&M p.60)',
    a.d.attributeSources.reaction.some(x => x.kind === 'note' && /Muscle Replac/.test(x.label) && /M&M p\.60/.test(x.note)));

  /* ── Adept powers carry their level ─────────────────────────────────────────────── */
  const ipa = { id: 'ipa', type: 'adeptpower', name: 'Improved Physical Attribute (STR)', system: { hasLevels: true, level: 3, bonusStr: 1 } };
  const ad = derive([ipa], { magicType: 'Adept' });
  t.is('a levelled power shows the multiplied bonus', ad.d.attributeSources.strength[0]?.amount, 3);
  t.is('…and names its level', ad.d.attributeSources.strength[0]?.label, 'Improved Physical Attribute (STR) 3');

  /* ── Racial dermal armor ────────────────────────────────────────────────────────── */
  const troll = derive([], { metatype: 'troll' });
  t.ok('a troll\'s Body names dermal armor (SR3 p.56)',
    troll.d.attributeSources.body.some(x => x.kind === 'racial' && /dermal/i.test(x.label) && x.note === 'SR3 p.56'));

  /* ── What is running now: the Adrenal Pump and the Pain Editor ──────────────────── */
  const pump   = { id: 'pump', type: 'bioware', name: 'Adrenal Pump [2](trig)', system: {} };
  const editor = { id: 'ed', type: 'bioware', name: 'Pain Editor', system: {} };
  const run2 = derive([pump, editor], { augmentations: { pump: { turns: 3 }, ed: { active: true } } });
  const s = run2.d.attributeSources;
  t.is('a running pump adds +2 Quickness at level 2', s.quickness.find(x => x.kind === 'triggered')?.amount, 2);
  t.ok('…and says how long it has left', /3 Combat Turns left/.test(s.quickness.find(x => x.kind === 'triggered')?.label ?? ''));
  t.is('…and cites M&M p.63', s.quickness.find(x => x.kind === 'triggered')?.note, 'M&M p.63');
  t.is('the pump\'s Reaction bonus is named too', s.reaction.find(x => x.kind === 'triggered')?.amount, 4);
  t.is('a Pain Editor\'s −1 Intelligence is a source', s.intelligence.find(x => x.kind === 'triggered')?.amount, -1);

  /* ── Attribute Boost ────────────────────────────────────────────────────────────── */
  const boosted = derive([], { magicType: 'Adept', attributeBoost: { strength: { level: 2, turns: 1 } } });
  const b = boosted.d.attributeSources.strength.find(x => x.kind === 'boost');
  t.is('an active boost is a source', b?.amount, 2);
  t.ok('…singular when one turn is left', /1 Combat Turn left/.test(b?.label ?? ''));

  /* ── Reaction: only the package that counts (SR3 p.169) ─────────────────────────── */
  const wired = { id: 'w', type: 'cyberware', name: 'Wired Reflexes [2]', system: { bonusRea: 4, bonusInitDice: 2 } };
  const ir    = { id: 'ir', type: 'adeptpower', name: 'Imp. Reflexes Level 1', system: { hasLevels: false, level: 1, bonusRea: 2, bonusInitDice: 1 } };
  const both  = derive([wired, ir], { magicType: 'Adept' }).d.attributeSources.reaction;
  const kept  = both.filter(x => x.amount);
  t.is('with both packages, one is credited', kept.length, 1);
  t.ok('…and the other is named as not applied, with the rule', both.some(x => !x.amount && /not applied/.test(x.note ?? '') && /p\.169/.test(x.note ?? '')));
  const dice = derive([wired, ir], { magicType: 'Adept' }).d.attributeSources.initiativeDice;
  t.is('Initiative dice: the same package is credited', dice.filter(x => x.amount).length, 1);
  t.ok('…and the dropped one is named', dice.some(x => !x.amount && /p\.169/.test(x.note ?? '')));
  t.is('wired reflexes alone: its dice are named', derive([wired]).d.attributeSources.initiativeDice[0]?.label, 'Wired Reflexes [2]');

  /* ── Reaction's hover shows the numbers Reaction was built from ─────────────────── */
  // Found live 2026-09-14: the sheet printed the FINAL Quickness 7 and Intelligence 3 above a base
  // of 4 — Muscle Replacement's Quickness skips Reaction, and the pump and Pain Editor land after it.
  const mr = { id: 'mr', type: 'cyberware', name: 'Muscle Replac. [2]', system: { bonusQui: 2, bonusStr: 2 } };
  const busy = derive([mr, pump, editor], { augmentations: { pump: { turns: 3 }, ed: { active: true } } });
  const ri = busy.d.reactionInputs;
  t.is('Reaction was built from Quickness 4 (the implant\'s +2 excluded, the pump\'s +1 not yet on)', ri?.quickness, 4);
  t.is('…and Intelligence 4 (the Pain Editor\'s −1 not yet on)', ri?.intelligence, 4);
  t.is('…so the hover adds up to the base', Math.max(1, Math.floor((ri.quickness + ri.intelligence) / 2)), busy.attr.reaction.base);
  t.ok('…while the final values differ — which is why they are recorded', busy.attr.quickness.value !== ri.quickness && busy.attr.intelligence.value !== ri.intelligence);
  t.ok('the sheet reads the recorded inputs', /d\.reactionInputs\?\.quickness/.test(readFileSync(new URL('../scripts/sheets/SR3EActorSheet.js', import.meta.url), 'utf8')));

  /* ── The invariant: base + sources = value ──────────────────────────────────────── */
  for (const [what, r] of [['cyber + bio', a], ['adept', ad], ['troll', troll], ['pump + editor', run2], ['boost', boosted]]) {
    for (const k of CORE) {
      t.is(`${what}: ${k} — base + sources = the value rolled`, r.attr[k].base + sum(r.d.attributeSources[k]), r.attr[k].value);
    }
  }

  /* ── The hover text ─────────────────────────────────────────────────────────────── */
  const text = SR3EActor.attributeBreakdown({ label: 'Quickness', base: 4, total: 7, sources: [
    { label: 'Muscle Replac. [2]', amount: 2, kind: 'cyber' },
    { label: 'Adrenal Pump [1](trig) — 3 Combat Turns left', amount: 1, kind: 'triggered', note: 'M&M p.63' },
    { label: 'Pain Editor', amount: -1, kind: 'triggered', note: 'M&M p.71' },
    { label: 'Wired Reflexes [2]', amount: 0, kind: 'cyber', note: '+4 not applied' },
  ] }).split('\n');
  t.is('the heading carries the total', text[0], 'Quickness 7');
  t.is('then the base', text[1], 'Base 4');
  t.is('a bonus: sign, name, kind', text[2], '+2  Muscle Replac. [2] (cyberware)');
  t.is('a running one: its note too', text[3], '+1  Adrenal Pump [1](trig) — 3 Combat Turns left (switched on · M&M p.63)');
  t.is('a penalty reads as a minus', text[4], '−1  Pain Editor (switched on · M&M p.71)');
  t.is('a bonus that did not apply is a note', text[5], '—  Wired Reflexes [2]: +4 not applied');
  t.is('sum by kind', SR3EActor.attributeSourceSum([{ kind: 'boost', amount: 2 }, { kind: 'triggered', amount: -1 }, { kind: 'cyber', amount: 3 }], ['boost', 'triggered']), 1);

  /* ── The sheet renders it (source level: the sheet needs Foundry) ───────────────── */
  const sheet = readFileSync(new URL('../scripts/sheets/SR3EActorSheet.js', import.meta.url), 'utf8');
  t.ok('the total is the attribute\'s real value, not a sum the sheet makes up', /const total\s+= attr\[key\]\?\.value/.test(sheet));
  t.ok('…and hovers the full breakdown', /SA\.attributeBreakdown\(\{ label, base, sources: srcs, total \}\)/.test(sheet));
  t.ok('boost, switched-on cyberware and running drugs have their own chip', /SA\.attributeSourceSum\(srcs, \['boost', 'triggered', 'drug'\]\)/.test(sheet) && /class="attr-live"/.test(sheet));
  t.ok('the cyber chip names the items', /_named\(srcs, \['cyber', 'bio'\]/.test(sheet));
  t.ok('the armour TN chip names the armour worn', /Layered armour — \$\{wornArmour\.join/.test(sheet));
  t.ok('Reaction hovers its breakdown', /label: 'Reaction', total: rea/.test(sheet));
  t.ok('no chip is left with the old generic tooltip', !/title="Cyber\/bio augmentation"|title="Adept power bonus"/.test(sheet));
}
