/**
 * Drugs reach the character · TODO 124.
 *
 * `scripts/data/drug-rules.mjs` is tested on its own (drug-rules.test.mjs). This checks that what
 * it adds up to actually lands:
 *   · behaviourally, through `_prepareCharacter` — a running drug moves the attributes, Reaction
 *     and Initiative dice; forced withdrawal sets the standing TN and a Moderate Stun wound's
 *     modifier without touching the track; drug pain resistance takes the larger with the power;
 *   · `standingTN` (sustaining + drugs) is what every "all tests" site adds;
 *   · source-level, the parts that cannot run without Foundry — the carry through 💥, the chat-card
 *     gates, the sheet's actions, the data model.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'drug-wiring';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const CORE = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'];

function derive(substances = {}, { stun = 0, items = [], magicType = '' } = {}) {
  const sys = { magicType, metatype: 'human', augmentations: {}, attributeBoost: {}, substances, attributes: {},
                wounds: { stun: { value: stun }, physical: { value: 0 } } };
  const attr = {};
  for (const k of [...CORE, 'reaction', 'essence', 'magic']) attr[k] = { base: 4, value: 4 };
  attr.magic.base = 0;
  sys.woundMod = -SR3EActor._trackMod(stun);
  SR3EActor.prototype._prepareCharacter.call({ items, system: sys }, sys, attr);
  return { sys, d: sys.derived, attr };
}

export async function run(t) {
  /* ── A running drug · M&M pp.119-122 ────────────────────────────────────────── */
  const none = derive();
  const kam  = derive({ kamikaze: { name: 'Kamikaze', active: { duration: '30 minutes' } } });
  t.eq('Kamikaze: +1 Body, +1 Quickness, +2 Strength, +1 Willpower on the values every roll uses',
    ['body', 'quickness', 'strength', 'willpower'].map(k => kam.attr[k].value - none.attr[k].value), [1, 1, 2, 1]);
  // Jazz, not Kamikaze: +1 Quickness on these fixtures rounds to the same Reaction either way, so
  // only a +2 tells "reaches Reaction" from "does not".
  const jazz = derive({ jazz: { name: 'Jazz', active: {} } });
  t.eq('a drug\'s Quickness reaches Reaction — Jazz +2 Quickness "which can increase Reaction" (p.119)',
    [none.attr.reaction.value, jazz.attr.reaction.value], [4, 5]);
  t.is('…+1D6 Initiative', kam.d.initiativeDice - none.d.initiativeDice, 1);
  t.ok('…and every figure is named on the hover, as a drug',
    kam.d.attributeSources.strength.some(s => s.kind === 'drug' && s.label === 'Kamikaze' && s.amount === 2));
  const cram = derive({ cram: { name: 'Cram', active: {} } });
  t.is('Cram: +1 Reaction straight onto Reaction (p.122)', cram.attr.reaction.value - none.attr.reaction.value, 1);
  t.ok('…named on the Reaction hover', cram.d.attributeSources.reaction.some(s => s.kind === 'drug' && s.label === 'Cram'));
  const rec = derive({ cram: { name: 'Cram' } });
  t.is('a record with nothing running changes nothing', rec.attr.reaction.value, none.attr.reaction.value);

  const nova = derive({ novacoke: { name: 'Novacoke', crash: { duration: '6 hours' } } });
  t.eq('Novacoke\'s crash: Charisma to 1, Willpower halved (p.122)', [nova.attr.charisma.value, nova.attr.willpower.value], [1, 2]);

  /* ── Pain resistance · the larger of the drug's and the power's ─────────────── */
  const hurt = derive({}, { stun: 3 });
  const numb = derive({ k: { name: 'Kamikaze', active: {} } }, { stun: 3 });
  t.ok('a wounded character on Kamikaze (pain resistance 4) ignores 3 boxes of Stun', hurt.sys.woundMod < 0 && numb.sys.woundMod === 0);
  t.is('…and the track is untouched', numb.sys.wounds.stun.value, 3);

  /* ── Withdrawal · M&M p.110 ─────────────────────────────────────────────────── */
  const forced = derive({ cram: { name: 'Cram', withdrawal: 'forced', addicted: { M: true } } });
  t.is('forced withdrawal: +3 standing TN', forced.d.drugTN, 3);
  t.is('…+6 on concentration', forced.d.drugConcentrationTN, 6);
  t.is('…and a persistent Moderate mental wound: the Stun lookup reads 3 more boxes', forced.sys.woundMod, -SR3EActor._trackMod(3));
  t.is('…while the Stun track itself still reads 0', forced.sys.wounds.stun.value, 0);
  t.is('voluntary withdrawal: +2', derive({ c: { name: 'Cram', withdrawal: 'withdrawal' } }).d.drugTN, 2);
  t.is('recovery: +1', derive({ c: { name: 'Cram', withdrawal: 'recovery' } }).d.drugTN, 1);

  /* ── standingTN: sustaining + drugs, at every "all tests" site ──────────────── */
  const withTN = { system: { sustainedSpells: [], derived: { drugTN: 3 } } };
  t.is('standingTN reads the drug TN', SR3EActor.standingTN(withTN), 3);
  t.ok('…and the note says why', /Drugs \+3/.test(SR3EActor.standingNote({ system: { sustainedSpells: [], derived: { drugTN: 3, drugSources: [{ key: 'tn', label: 'Cram (forced)' }] } } })));
  t.is('the Dodge Test takes drugs as their own term', SR3EActor.dodgeTN({ drugs: 2 }), 6);
  t.ok('…and names them', SR3EActor.dodgeTNParts({ drugs: 2 }).some(p => /\+2 drugs/.test(p)));

  const actor = read('scripts/documents/SR3EActor.js');
  const item  = read('scripts/documents/SR3EItem.js');
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  const main  = read('scripts/sr3e.js');
  const miji  = read('scripts/SR3EMIJI.js');
  const leftovers = [actor, item, sheet, miji].join('\n').split('\n')
    .filter(l => /sustainingTN\(/.test(l) && !/static sustainingTN|Sustaining\.sustainingTN|SR3EActor\.sustainingTN\(actor\) \+ SR3EActor\.drugTN|sustain:\s|A\.sustainingTN\(actor\);\s*$/.test(l));
  t.eq('no TN site adds the sustaining TN without the drug TN (only the dodge `sustain:` terms and the Magic tab\'s own list remain)',
    leftovers.map(l => l.trim().slice(0, 90)), []);
  t.ok('rollPool adds standingTN (skipSustainMod still skips it)', /options\.skipSustainMod \? 0 : SR3EActor\.standingTN\(this\)/.test(actor));
  t.ok('both dodge prompts pass the defender\'s drugs', /drugs:\s+SR3EActor\.drugTN\(targetActor\)/.test(actor) && /drugs:\s+game\.sr3e\.SR3EActor\.drugTN\(defender\)/.test(item));

  /* ── The roll carries through 💥 and lands on the final wave ────────────────── */
  t.is('drugContext is carried at all three explosion-carry sites', (actor.match(/drugContext:\s+(options|state)\.drugContext/g) ?? []).length, 3);
  t.ok('…and the final wave hands it to SR3EDrugs.onRolled', /if \(allDone && state\.drugContext\) \{\s*await game\.sr3e\.SR3EDrugs\.onRolled\(state\.drugContext, successes\)/.test(actor));

  /* ── Chat-card gates · like the healing cards ───────────────────────────────── */
  t.ok('SR3EDrugs is on game.sr3e', /game\.sr3e = \{[^}]*\bSR3EDrugs\b/.test(main));
  t.ok('🎲 on a drug card rolls for exactly one user (_isDeciderId), one-shot',
    /\.sr-drug-roll-btn[\s\S]{0,160}_checkBtn[\s\S]{0,160}_isDeciderId\(pl\.rollerId\)[\s\S]{0,300}_claimBtn/.test(main));
  t.ok('a consequence button is the owner\'s or the GM\'s (_mineId), one-shot, and handed back when cancelled',
    /\.sr-drug-act-btn[\s\S]{0,160}_checkBtn[\s\S]{0,160}_mineId\(pl\.ownerId\)[\s\S]{0,300}_claimBtn[\s\S]{0,200}=== false/.test(main));
  t.ok('Dice and TN on a drug card are the GM\'s (wireCard)', /SR3EDrugs\.wireCard\(message, html\)/.test(main));

  /* ── The sheet and the data model ───────────────────────────────────────────── */
  t.ok('the sheet registers 💊 takeDrug and the record buttons', /takeDrug:\s+SR3EActorSheet\._onTakeDrug/.test(sheet) && /drugRecord:\s+SR3EActorSheet\._onDrugRecord/.test(sheet));
  t.ok('every drug row carries 💊', /data-action="takeDrug"/.test(sheet));
  t.ok('the Gear tab renders the Substance use block', /\$\{this\._substancesBlock\(actor\)\}/.test(sheet));
  t.is('`substances` is on characters AND NPCs', (read('scripts/data/ActorDataModels.js').match(/substances:\s+new ObjectField\(\)/g) ?? []).length, 2);
  const drugs = read('scripts/SR3EDrugs.js');
  t.ok('drug damage and crashes are resisted without armour — not an attack (M&M p.106)', /noArmor: true/.test(drugs));
  t.ok('only the addiction test uses UNaugmented attributes (p.108)', /const unaugmented = t\.kind === 'addiction';/.test(drugs));
}
