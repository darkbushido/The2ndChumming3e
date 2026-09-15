/**
 * Sustained spells · SR3 p.178, p.180, p.183.
 *
 * > "Characters sustaining spells have a +2 target modifier per sustained spell applied to all
 * > tests, including Drain Resistance Tests (but not normal Damage Resistance Tests). You can
 * > simultaneously sustain a number of spells equal to your Sorcery rating."  — p.178
 *
 * The maintainer (2026-09-14): "We do need a way to show sustained spells." The rule, where it is
 * applied and where it is deliberately not, and the flow that starts and ends a sustain.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const S = await import('../scripts/data/sustaining.mjs');

export const name = 'sustained-spells';

const read  = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const spell = (id, focus = false, force = 4) => ({ id, name: `Spell ${id}`, force, spellItemId: '', target: '', focus });
const mage  = (list = [], extra = {}) => ({
  id: 'mage', name: 'Mage', type: 'character',
  system: { sustainedSpells: list, woundMod: 0, attributes: { willpower: { value: 5, base: 5 }, magic: { value: 6, base: 6 } } },
  ...extra,
});

export async function run(t) {
  /* ── The rule ─────────────────────────────────────────────────────────────── */
  t.is('nothing sustained → +0', S.sustainingTN([]), 0);
  t.is('one spell → +2 (p.178)', S.sustainingTN([spell('a')]), 2);
  t.is('two spells → +4 — per spell', S.sustainingTN([spell('a'), spell('b')]), 4);
  t.is('a focus-held spell costs nothing', S.sustainingTN([spell('a'), spell('b', true)]), 2);
  t.is('no list at all (an old actor) → +0, no throw', S.sustainingTN(undefined), 0);
  t.is('SR3EActor.sustainingTN reads the actor', SR3EActor.sustainingTN(mage([spell('a'), spell('b')])), 4);
  t.is('…and a spirit or vehicle with no field → +0', SR3EActor.sustainingTN({ system: {} }), 0);

  t.ok('Sustained and Permanent spells can be held', S.isSustainable('Sustained') && S.isSustainable('Permanent') && S.isSustainable(' s '));
  t.ok('Instant ones cannot', !S.isSustainable('Instant') && !S.isSustainable('') && !S.isSustainable(undefined));

  t.is('the limit is the Sorcery rating: 3 held on Sorcery 3 is fine', S.overLimit([spell('a'), spell('b'), spell('c')], 3), false);
  t.is('…4 is over', S.overLimit([spell('a'), spell('b'), spell('c'), spell('d')], 3), true);
  t.is('…a focus-held spell does not count against it', S.overLimit([spell('a'), spell('b'), spell('c'), spell('d', true)], 3), false);

  const one = S.addSustained([], { name: 'Armor', force: 5, target: 'Self' }, 'x1');
  t.is('addSustained appends an entry with its id', `${one.length}:${one[0].id}:${one[0].force}:${one[0].focus}`, '1:x1:5:false');
  let threw = false; try { S.addSustained([], { name: 'Armor' }); } catch { threw = true; }
  t.ok('…and refuses an entry with no id (drop and focus find entries by it)', threw);
  const two = S.addSustained(one, { name: 'Armor', force: 3 }, 'x2');
  t.is('the same spell twice (two targets) is two entries', two.length, 2);
  t.is('addSustained does not mutate its input', one.length, 1);
  t.is('dropSustained removes by id, only that one', S.dropSustained(two, 'x1').map(e => e.id).join(), 'x2');
  const f = S.setSustainedFocus(two, 'x2', true);
  t.is('setSustainedFocus marks one entry', f.map(e => e.focus).join(), 'false,true');
  t.is('…without mutating', two[1].focus, false);
  t.is('the breakdown line', S.sustainingNote([spell('a'), spell('b'), spell('c', true)]), 'Sustaining 2 spells +4');
  t.is('…is empty with nothing held', S.sustainingNote([spell('a', true)]), '');

  /* ── Taking damage (p.178: "a caster who takes damage while sustaining…") ─────── */
  const w = { stun: { value: 2 }, physical: { value: 1 }, overflow: { value: 0 } };
  t.ok('Stun rising is damage', S.woundsRose(w, { stun: { value: 3 } }));
  t.ok('Physical rising is damage', S.woundsRose(w, { physical: { value: 4 } }));
  t.ok('healing is not', !S.woundsRose(w, { stun: { value: 0 } }));
  t.ok('an update that does not touch a track is not', !S.woundsRose(w, { stun: { max: 10 } }));

  /* ── Where it is applied ─────────────────────────────────────────────────────── */
  t.is('Dodge Test: +2 per spell on top of the p.113 modifiers', SR3EActor.dodgeTN({ woundMod: -1, sustain: 4 }), 9);
  t.ok('…and the defender is told why', SR3EActor.dodgeTNParts({ sustain: 2 }).some(p => /\+2 sustaining/.test(p)));
  t.is('…nothing sustained: the TN is unchanged', SR3EActor.dodgeTN({ woundMod: -1 }), 5);

  // rollPool — every skill, attribute, spell-cast and weapon roll.
  const cards = [];
  const roller = mage([spell('a'), spell('b', true)]);
  roller._rollWave = (n, tn) => Array.from({ length: n }, (_, i) => ({ index: i, total: 3, faces: [3], isOne: false, needsExplosion: false, done: true, success: 3 >= tn }));
  roller._postWaveCard = async s => { cards.push(s); };
  globalThis.game.actors = { find: () => null, get: () => roller };
  await SR3EActor.prototype.rollPool.call(roller, 3, 4, 'Sorcery');
  t.is('rollPool: TN 4 + 2 for the one spell held by concentration', cards[0]?.tn, 6);
  t.ok('…and the card says why', /Sustaining 1 spell \+2/.test(cards[0]?.label ?? ''));
  await SR3EActor.prototype.rollPool.call(roller, 3, 4, 'Soak-like', { skipSustainMod: true });
  t.is('skipSustainMod: a flow that pre-applied it (or must not take it) is left alone', cards[1]?.tn, 4);
  await SR3EActor.prototype.rollPool.call(roller, 3, 4, 'Healing', { skipWoundMod: true });
  t.is('skipWoundMod alone does NOT skip it — the healing tables price the wound, not the spells', cards[2]?.tn, 6);

  // Drain Resistance — p.178 names it; p.180 is the same +2, not a second one.
  const created = [];
  globalThis.ChatMessage = { create: async d => { created.push(d.content); return { id: 'm' }; }, getSpeaker: () => ({}) };
  const drainTN = html => Number(/class="sr-drain-tn" value="(\d+)"/.exec(html)?.[1]);
  const caster = mage([spell('a')]);
  await SR3EActor.prototype._postDrainCard.call(caster, { drainStr: '(F/2)', force: 6, drainIsPhysical: false, spellName: 'Armor' });
  t.is('Drain: ⌊6/2⌋ = 3, +2 for the spell held — ONCE (p.178 and p.180 are one modifier)', drainTN(created[0]), 5);
  await SR3EActor.prototype._postDrainCard.call(caster, { drainStr: '(F/2)', force: 6, drainIsPhysical: false, spellName: 'Armor', sustainTN: 0 });
  t.is('…a spell\'s own Drain counts what was held AT CASTING (sustainTN), not the spell itself', drainTN(created[1]), 3);
  await SR3EActor.prototype._postDrainCard.call(caster, { drainTNOverride: 4, drainLevel: 'M', resistAttr: 'charisma', drainIsPhysical: false, spellName: 'Conjure' });
  t.is('…conjuring Drain (TN = Force) takes it too', drainTN(created[2]), 6);
  t.ok('…and the card says so', /incl\. sustaining spells \+2/.test(created[0]));

  /* ── Source: every other site ────────────────────────────────────────────────── */
  const actor = read('scripts/documents/SR3EActor.js');
  const item  = read('scripts/documents/SR3EItem.js');
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  const main  = read('scripts/sr3e.js');
  const model = read('scripts/data/ActorDataModels.js');

  t.is('the field is on characters AND NPCs', (model.match(/sustainedSpells:\s+sustainedSpellsField\(\)/g) ?? []).length, 2);
  t.ok('melee: each fighter\'s own spells in their own TN', /baseAtkTN = [^;]*atkSust/.test(item) && /baseDefTN = [^;]*defSust/.test(item)
    && /atkSust\s+= A\.standingTN\(actor\)/.test(item) && /defSust\s+= A\.standingTN\(targetActor\)/.test(item));
  t.ok('…and the GM window is told', /A\.standingNote\(actor\)/.test(item) && /A\.standingNote\(targetActor\)/.test(item));
  // Drugs ride with sustaining (TODO 124): every site below reads `standingTN`, which is the sustain rule plus drugs.
  t.is('standingTN is the sustaining TN when no drug is running', SR3EActor.standingTN(mage([spell('a')])), 2);
  t.is('…plus the drug TN when one is (withdrawal +2, M&M p.110)', SR3EActor.standingTN({ ...mage([spell('a')]), system: { ...mage([spell('a')]).system, derived: { drugTN: 2 } } }), 4);
  t.ok('astral: both fighters (p.174 — the melee rules)', /const atkTN = [^;]*SR3EActor\.standingTN\(this\)/.test(actor)
    && /const defTN = [^;]*SR3EActor\.standingTN\(targetActor\)/.test(actor));
  t.ok('dodge: both dodge prompts pass the defender\'s', /sustain:\s+SR3EActor\.sustainingTN\(targetActor\)/.test(actor)
    && /sustain:\s+game\.sr3e\.SR3EActor\.sustainingTN\(defender\)/.test(item));
  t.ok('ranged: pre-applied in the roll-options TN, and rollPool told to skip it',
    /extraTNMod\s+= [^;]*\+ sustainTN;/.test(item) && /options\.skipSustainMod\s+= true/.test(item));
  t.is('the sheet\'s attribute and skill dialogs pre-apply it and skip it in rollPool',
    (sheet.match(/skipSustainMod: true/g) ?? []).length, 2);
  t.ok('…both pre-fill the TN with it', (sheet.match(/4 \+ woundPenalty \+ sustainTN \+ qtnFor/g) ?? []).length === 2);
  // The maintainer's ruling, 2026-09-14: p.178's "all tests" wins over p.183's "no target modifiers
  // … except where specifically noted" — so the Spell Resistance Test takes it through rollPool.
  const resist = actor.slice(actor.indexOf('isSpellResist:      true'), actor.indexOf('isSpellResist:      true') + 900);
  t.ok('Spell Resistance TAKES it — rollPool is not told to skip it (the maintainer\'s ruling)',
    resist.length > 100 && !/skipSustainMod: true/.test(resist.slice(0, resist.indexOf('});'))));

  /* ── Every site the wound modifier reaches, and the defences p.178 does not exclude ── */
  const miji = read('scripts/SR3EMIJI.js');
  t.ok('cybercombat: both sides (the defence avoids damage — p.125 spares it wounds, not spells)',
    /\(attacking \? SR3EActor\.woundTN\(actor\) : 0\) \+ SR3EActor\.standingTN\(actor\)/.test(actor));
  t.ok('contested: both corners', /woundTN\(picked\) \+ SR3EActor\.standingTN\(picked\)/.test(actor)
    && /oppTN:[^\n]*standingTN\(game\.actors\.get\(oppActId\)\)/.test(actor));
  t.ok('Orthodox System Test and attack: the decker', /utilMod \+ SR3EActor\.woundTN\(this\) \+ SR3EActor\.standingTN\(this\)/.test(actor)
    && /intruding\[secCode\] \?\? 4\) \+ SR3EActor\.woundTN\(this\) \+ SR3EActor\.standingTN\(this\)/.test(actor));
  t.ok('Orthodox IC attack: the decker\'s defence', /defTN\s+= atkTNOverride \+ SR3EActor\.standingTN\(deckerActor\)/.test(actor));
  t.ok('knockdown', /kdWound \+ SR3EActor\.standingTN\(target\)/.test(actor));
  t.ok('MIJI and every EW test — the rigger', /woundTN\(actor\) \+ game\.sr3e\.SR3EActor\.standingTN\(actor\)/.test(miji));
  t.ok('vehicle weapons: the gunner', /pilotSustain\s+= game\.sr3e\.SR3EActor\.standingTN\(pilotActor\)/.test(item)
    && /gunneryDefTnMod \+ pilotWoundMod \+ pilotSustain/.test(item));
  t.ok('Missile Parry: the defender', /missileParryTN\(baseRngTN\) \+ game\.sr3e\.SR3EActor\.standingTN\(defender\)/.test(item));
  const soak = actor.slice(actor.indexOf('static async handleSoakRollClick'), actor.indexOf('static async handleSoakRollClick') + 4000);
  t.ok('Damage Resistance does NOT take it (p.178) — the soak handler never reads it', soak.length > 100 && !/sustain/i.test(soak));
  t.ok('the cast records what was held at the moment, for its own Drain', /sustainTN:\s+game\.sr3e\.SR3EActor\.standingTN\(actor\)/.test(item)
    && /sustainTN:\s+sc\.sustainTN \?\? 0/.test(actor));
  t.ok('the cast card OFFERS 🔒 Sustain for a Sustained/Permanent spell that took effect',
    /successes > 0 && Sustaining\.isSustainable\(sc\.duration\)/.test(actor));
  t.ok('🔒 Sustain is gated to the caster\'s owner', /sr-sustain-btn[\s\S]{0,200}_mine\(pl\)/.test(main));
  t.ok('🎲 Keep rolls, so it is gated to the one decider', /sr-sustain-check-btn[\s\S]{0,200}_isDecider\(pl\)/.test(main));
  t.ok('taking damage while sustaining posts the Sorcery Test card (p.178)',
    /preUpdateActor[\s\S]{0,300}Sustaining\.woundsRose/.test(main) && /sr3eSustainCheck && userId === game\.user\.id/.test(main));
  t.ok('the token shows the Sustaining status', /set\('sr3e-sustaining'/.test(main));
  t.ok('the Magic tab shows the list, the cost and the Sorcery limit', /_sustainedBlock\(actor\)/.test(sheet) && /\(Sorcery\)/.test(sheet));
}
