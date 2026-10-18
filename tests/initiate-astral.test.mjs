/**
 * The initiate's Astral Pool and Astral Reaction · Magic in the Shadows p.58.
 *
 * > "Initiates receive a bonus to their Astral Reaction equal to their grade. They also gain access to a new pool,
 * > called the Astral Pool, which contains a number of dice equal to the initiate's grade. Astral Pool dice can be
 * > used for any test made while on the astral plane or metaplanes, except for Magical Skill Tests. They can be used
 * > to augment Astral Combat Tests (even when Sorcery is used) and Astral Perception Tests. Dice in the Astral Pool
 * > refresh the same way as other dice pools."
 *
 * ⚠ Distinct from the core Astral Combat Pool (SR3 p.174: ⌊Mental Attributes ÷ 2⌋), which stays as it was.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { SR3ECombat } = await import('../scripts/documents/SR3ECombat.js');
const { InitiateAstral } = await import('../scripts/data/initiate-astral.mjs');

export const name = 'initiate-astral';

function character(extra = {}, attrs = {}) {
  const a = { body: 3, quickness: 4, intelligence: 5, willpower: 4, charisma: 3, strength: 3, magic: 6, ...attrs };
  const actor = Object.create(SR3EActor.prototype);
  actor.system = {
    attributes: Object.fromEntries(Object.entries(a).map(([k, v]) => [k, { base: v, value: v }])),
    wounds: { physical: { value: 0, max: 10 }, stun: { value: 0, max: 10 } },
    combatPoolSpent: 0, spellPoolSpent: 0,
    ...extra,
  };
  actor.items = [];
  actor.type = 'character';
  actor.getFlag = () => undefined;
  return actor;
}

export async function run(t) {
  /* ── The pure rules ─────────────────────────────────────────────────────────── */
  t.is('Astral Reaction bonus equals the grade', InitiateAstral.reactionBonus(3), 3);
  t.is('…and a non-initiate (grade 0) gets none', InitiateAstral.reactionBonus(0), 0);
  t.is('Astral Reaction is Intelligence (SR3 p.174) plus the grade', InitiateAstral.astralReaction(5, 2), 7);
  t.is('Astral Initiative base is Intelligence + grade + 20 (the 1D6 is rolled)', InitiateAstral.initiativeBase(5, 2), 27);
  t.is('…which for a non-initiate is the plain Intelligence + 20 of SR3 p.174', InitiateAstral.initiativeBase(5, 0), 25);
  t.is('the pool is the grade', InitiateAstral.pool(3), 3);
  t.is('a non-initiate has no pool at all (null, not 0)', InitiateAstral.pool(0), null);
  t.is('a manual modifier adjusts the total', InitiateAstral.pool(3, 2), 5);
  t.is('available is total minus spent, never below 0', [InitiateAstral.available(3, 1), InitiateAstral.available(3, 9)].join('/'), '2/0');
  t.is('…and null with no pool', InitiateAstral.available(null, 0), null);
  t.ok('not allowed on a Magical Skill Test, allowed on any other',
    !InitiateAstral.allowedOnSkill('Magical skills') && InitiateAstral.allowedOnSkill('Physical skills'));
  t.ok('on the astral plane means perceiving or projecting, not physical',
    InitiateAstral.onAstralPlane('dual') && InitiateAstral.onAstralPlane('astral')
    && !InitiateAstral.onAstralPlane('physical') && !InitiateAstral.onAstralPlane(''));

  /* ── The derivation ─────────────────────────────────────────────────────────── */
  const grade2 = character({ initiateGrade: 2, initiatePoolSpent: 1 });
  grade2.prepareDerivedData();
  t.is('a grade-2 initiate has an Initiate Astral Pool of 2', grade2.system.derived.initiatePool, 2);
  t.is('…1 spent leaves 1', grade2.system.derived.availableInitiatePool, 1);
  t.is('…and the core Astral Combat Pool is untouched: floor((INT 5 + CHA 3 + WIL 4) / 2) = 6',
    grade2.system.derived.astralPool, Math.floor((5 + 3 + 4) / 2));
  t.is('…its own spend counter is separate (Astral Combat Pool spent stays 0)', grade2.system.derived.availableAstralPool, 6);
  const plain = character({});
  plain.prepareDerivedData();
  t.is('an Awakened non-initiate has no Initiate Astral Pool', plain.system.derived.initiatePool, null);
  t.is('…yet still has the Astral Combat Pool', plain.system.derived.astralPool, 6);
  const modded = character({ initiateGrade: 3, initiatePoolMod: 1 });
  modded.prepareDerivedData();
  t.is('the manual modifier is added', modded.system.derived.initiatePool, 4);

  /* ── Refresh: "the same way as other dice pools" ─────────────────────────────── */
  {
    const calls = [];
    const combat = Object.create(SR3ECombat.prototype);
    combat.combatants = { contents: [{ actor: {
      system: { initiatePoolSpent: 2 },
      resetRecoil: async () => {}, refreshCombatPool: async () => {}, refreshSpellPool: async () => {},
      refreshAstralPool: async () => {}, refreshHackingPool: async () => {},
      refreshInitiatePool: async () => calls.push('initiatePool'),
      update: async () => {},
    } }] };
    await combat._endOfTurnReset();
    t.is('a spent Initiate Astral Pool refreshes at the Combat Turn boundary', calls.join(','), 'initiatePool');
    const clean = [];
    combat.combatants = { contents: [{ actor: {
      system: { initiatePoolSpent: 0 },
      refreshInitiatePool: async () => clean.push('x'),
      update: async () => {},
    } }] };
    await combat._endOfTurnReset();
    t.is('…and a clean one is never written', clean.length, 0);
  }

  /* ── Wiring (source level: sheet and dialogs cannot be imported without Foundry) ─ */
  const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
  const actorSrc = read('../scripts/documents/SR3EActor.js');
  const sheetSrc = read('../scripts/sheets/SR3EActorSheet.js');
  const querySrc = read('../scripts/SR3EQuery.js');
  const modelSrc = read('../scripts/data/ActorDataModels.js');

  t.ok('astral Initiative adds the grade to Astral Reaction', /InitiateAstral\.initiativeBase\(intel, grade\)/.test(actorSrc));
  t.ok('the pool is persisted: initiatePoolSpent and initiatePoolMod are in the data model',
    /initiatePoolSpent:/.test(modelSrc) && /initiatePoolMod:/.test(modelSrc));
  t.ok('spending is routed through sr3e.pool.spend and sr3e.pool.refresh for a non-GM client',
    /pool: 'initiate'/.test(actorSrc) && /initiate:\s+'spendInitiatePool'/.test(querySrc) && /initiate:\s+'refreshInitiatePool'/.test(querySrc));
  t.ok('the counter is an accumulator, never relayed as an absolute', /'system\.initiatePoolSpent'/.test(querySrc));
  t.ok('Reset All Pools clears it', /'system\.initiatePoolSpent': 0/.test(sheetSrc));
  t.ok('the sheet shows it, named so it cannot be mistaken for the Astral Combat Pool',
    /_poolBlock\('Initiate Astral Pool'/.test(sheetSrc) && /_poolBlock\('Astral Combat Pool'/.test(sheetSrc));
  t.ok('astral combat offers it in each corner and rolls what the pool granted',
    /sr-astral-atk-ipool/.test(actorSrc) && /sr-astral-def-ipool/.test(actorSrc)
    && /atkPool \+= atkInitSpent/.test(actorSrc) && /defPool \+= defInitSpent/.test(actorSrc));
  t.ok('Astral Perception (assensing) always offers the row', /astralPerception: true/.test(sheetSrc));
  t.ok('the attribute and skill roll dialogs offer and read the row; rollPool charges it',
    (sheetSrc.match(/initiateRollRow\(actor/g) ?? []).length === 2
    && /readInitiateRollRow\(html\)/.test(sheetSrc) && /options\.initiatePoolDice/.test(actorSrc));
  t.ok('a Magical Skill Test refuses the dice with a note (MitS p.58)', /allowedOnSkill\(cat\)/.test(sheetSrc));
  t.ok('the corner field keys on its first sr- class (two-corner capture)', /class="\$\{initiateClass\} sr-astral-input"/.test(actorSrc));
}
