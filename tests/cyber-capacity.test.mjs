/**
 * What a cyberlimb or a cybereye holds — scripts/data/cyber-capacity.mjs · TODO 276 (the cyberlimb slice).
 *
 * M&M p.36-37 (ECU), SR3 p.299 (an eye replacement holds .5 Essence of mods free), SR3 p.303 (built-in price ×4); the
 * maintainer's rulings of 2026-10-27: capacity reduced by the grade's Essence factor (to audit), synthetic +50% not on
 * built-ins, a direct neural interface's +50% stacks.
 */
import { readFileSync } from 'node:fs';
import { CyberCapacity } from '../scripts/data/cyber-capacity.mjs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'cyber-capacity';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const cw = (name, system = {}) => ({ type: 'cyberware', name, system: { cyberwareCategory: 'Cyberlimbs', capacity: 0, grade: 'Standard', ...system } });
const mod = (name, system = {}, extra = {}) => ({ _id: name.replace(/\W/g, ''), type: 'cyberware', name, system: { cyberwareCategory: 'Cyberlimb Mods', grade: 'Standard', ...system }, ...extra });
const graded = i => (Number(i?.system?.essenceCost) || 0) * CyberCapacity.gradeMult(i?.system?.grade);

export async function run(t) {
  /* ── Limbs (M&M p.37) ─────────────────────────────────────────────────────── */
  t.eq('obvious / synthetic arm 10 / 5, leg 20 / 10', ['Obvious Cyberarm', 'Synthetic Cyberarm', 'Obvious Cyberleg', 'Synthetic Cyberleg'].map(n => CyberCapacity.limbEcu(cw(n))), [10, 5, 20, 10]);
  t.eq('hand, forearm, foreleg, skull, torso', ['Obvious Cyber Hand', 'Synthetic Cyber Forearm', 'Obvious Cyber Foreleg', 'Obvious Cyberskull', 'Synthetic Cybertorso'].map(n => CyberCapacity.limbEcu(cw(n))), [2, 2, 8, 2, 3]);
  t.is('Kid Stealth leg 10', CyberCapacity.limbEcu(cw('Kid Stealth Leg')), 10);
  t.is('a pair is two limbs', CyberCapacity.limbEcu(cw('Pair Obvious Cyberarms')), 20);
  t.eq('a limb option is not a limb', ['Strength Enhancement [4] (Pair)', 'Quickness [2] (Pair)', 'Smartlink (Internal)', 'Fingertip Compartment'].map(n => CyberCapacity.limbEcu(cw(n))), [null, null, null, null]);
  t.is('a limb holds ECU', CyberCapacity.kind(cw('Obvious Cyberarm')), 'ecu');
  t.is('…a typed capacity wins', CyberCapacity.capacity(cw('Obvious Cyberarm', { capacity: 12 })), 12);

  /* ── Grade — the capacity follows the grade's Essence factor (the ruling) ── */
  t.eq('alpha ×.8, beta ×.6, delta ×.5 of 10', ['Alpha', 'Beta', 'Delta'].map(g => CyberCapacity.capacity(cw('Obvious Cyberarm', { grade: g }))), [8, 6, 5]);
  t.is('…a delta smartlink takes .25 of a delta arm\'s 5 — the same share as standard', CyberCapacity.ecuOf(mod('Smartlink (Internal)', { grade: 'Delta' })), 0.25);
  t.ok('…so a grade-matched limb holds as many mods', (() => {
    const fill = g => CyberCapacity.used(cw('Obvious Cyberarm', { grade: g, installed: Array.from({ length: 20 }, (_, i) => mod(`Smartlink ${i}`, { grade: g })) })).used / CyberCapacity.capacity(cw('Obvious Cyberarm', { grade: g }));
    return fill('Standard') === fill('Delta');
  })());

  /* ── ECU (M&M p.36) ───────────────────────────────────────────────────────── */
  t.eq('the table: smartlink .5, datajack .5, hold-out cybergun 1, heavy pistol 2.5, foot anchor 4',
    ['Smartlink (Internal)', 'Datajack', 'Hold-out Pistol', 'Heavy Pistol', 'Foot Anchor'].map(n => CyberCapacity.ecuOf(mod(n))), [0.5, 0.5, 1, 2.5, 4]);
  t.is('hydraulic jacks 4 + .5 per rating', CyberCapacity.ecuOf(mod('Hydraulic Jacks', { rating: 4 })), 6);
  t.eq('Strength Enhancement: nothing up to 3, 1 per point over', [3, 5].map(r => CyberCapacity.ecuOf(mod('Strength Enhancement', { rating: r }))), [0, 2]);
  t.is('a typed ECU wins (the GM\'s sizes, M&M p.37)', CyberCapacity.ecuOf(mod('Pocket Secretary', { ecu: 1 })), 1);
  t.is('unknown: null', CyberCapacity.ecuOf(mod('Mystery Box')), null);
  const arm = cw('Obvious Cyberarm', { installed: [mod('Smartlink (Internal)'), mod('Heavy Pistol'), mod('Mystery Box')] });
  t.eq('used: 3 ECU, the unknown named', CyberCapacity.used(arm), { used: 3, unknown: ['Mystery Box'] });

  /* ── Eyes (SR3 p.299): .5 Essence of mods free ────────────────────────────── */
  const eye = (installed, grade = 'Standard') => ({ type: 'cyberware', name: 'Eyes, Cyber Replacement', system: { cyberwareCategory: 'Eyeware', capacity: 0.5, essenceCost: 0.2, grade, installed } });
  const opt = (n, ess, grade = 'Standard') => ({ _id: n, type: 'cyberware', name: n, system: { cyberwareCategory: 'Eyeware', essenceCost: ess, grade } });
  t.is('an eye replacement holds Essence', CyberCapacity.kind(eye([])), 'essence');
  t.is('mods within .5: no Essence beyond the eye', CyberCapacity.nestedEssence(eye([opt('Low-Light', .2), opt('Thermo', .2)]), graded), 0);
  t.is('…over it: the excess', CyberCapacity.nestedEssence(eye([opt('Low-Light', .2), opt('Thermo', .2), opt('Flare', .1), opt('Mag', .2)]), graded), 0.2);
  t.is('a delta eye holds .25 — and four delta mods of .1 cost .2 Essence ×.5 each: still free', CyberCapacity.nestedEssence(eye([opt('a', .1, 'Delta'), opt('b', .1, 'Delta'), opt('c', .1, 'Delta'), opt('d', .1, 'Delta'), opt('e', .1, 'Delta')], 'Delta'), graded), 0);
  t.is('a limb\'s built-ins count in full (their own reduced Essence, M&M p.36)', CyberCapacity.nestedEssence(cw('Obvious Cyberarm', { installed: [mod('Smartlink (Internal)', { essenceCost: 0.25 })] }), graded), 0.25);

  /* ── Built-in implants reach the character ─────────────────────────────────── */
  const flat = [...CyberCapacity.flatten([{ id: 'arm', ...cw('Obvious Cyberarm', { installed: [mod('Strength Enhancement', { bonusStr: 2 })] }) }])];
  t.eq('flatten yields the limb, then its built-ins (marked)', flat.map(i => [i.name, i.builtIn === true, i.id]), [['Obvious Cyberarm', false, 'arm'], ['Strength Enhancement', true, 'arm.StrengthEnhancement']]);
  t.is('…a gear device built in is not cyberware — not yielded', [...CyberCapacity.flatten([{ id: 'a', ...cw('Obvious Cyberarm', { installed: [{ _id: 'g', type: 'gear', name: 'Pocket Secretary', system: {} }] }) }])].length, 1);

  /* ── Warnings ─────────────────────────────────────────────────────────────── */
  const full = cw('Obvious Cyber Hand', { installed: [mod('Foot Anchor')] });
  t.ok('over capacity warned (M&M p.37)', CyberCapacity.installWarnings(full, mod('Smartlink (Internal)'), graded).some(w => /holds 2 ECU/.test(w)));
  t.ok('another grade warned', CyberCapacity.installWarnings(cw('Obvious Cyberarm', { grade: 'Alpha' }), mod('Smartlink (Internal)'), graded).some(w => /match their host/.test(w)));
  t.ok('an unknown size warned', CyberCapacity.installWarnings(cw('Obvious Cyberarm'), mod('Mystery Box'), graded).some(w => /not known/.test(w)));
  t.eq('a fitting, matching mod: nothing', CyberCapacity.installWarnings(cw('Obvious Cyberarm'), mod('Smartlink (Internal)'), graded), []);

  /* ── Price (SR3 p.303; the rulings) ───────────────────────────────────────── */
  t.is('Man & Machine off: ×4', CyberCapacity.builtInCost(500, { mmOn: false }), 2000);
  t.is('…on: the normal price', CyberCapacity.builtInCost(500, { mmOn: true }), 500);
  t.is('a DNI\'s +50% stacks on the ×4 (the maintainer)', CyberCapacity.builtInCost(500, { mmOn: false, dni: true }), 3000);

  /* ── Wiring (source-level) ────────────────────────────────────────────────── */
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('Essence adds each host\'s built-ins through nestedEssence', /total \+= CyberCapacity\.nestedEssence\(item, graded\);/.test(actor));
  t.ok('attribute bonuses read built-ins', /for \(const item of CyberCapacity\.flatten\(this\.items \?\? \[\]\)\) \{\s*if \(item\.type !== 'cyberware' && item\.type !== 'bioware'\) continue;/.test(actor));
  t.ok('implant and dermal armour read built-ins', /static implantArmor\(items\) \{[\s\S]{0,120}CyberCapacity\.flatten\(items/.test(actor) && /static dermalArmorSources\(actor\)[\s\S]{0,400}CyberCapacity\.flatten\(actor\?\.items/.test(actor));
  t.ok('vision names read built-ins', /const named\s+= \[\.\.\.CyberCapacity\.flatten\(items\)\];/.test(read('scripts/SR3ECombatModifiers.js')));
  t.ok('install warns about capacity and grade', /CyberCapacity\.installWarnings\(host, source\.toObject\(\), graded\)/.test(read('scripts/SR3EItemMods.js')));

  /* ── The character's Essence (SR3EActor.installedEssenceCost) ──────────────── */
  const armWith = cw('Obvious Cyberarm', { essenceCost: 1, installed: [mod('Smartlink (Internal)', { essenceCost: 0.25 })] });
  const eyes = { type: 'cyberware', name: 'Eyes, Cyber Replacement', system: { cyberwareCategory: 'Eyeware', capacity: 0.5, essenceCost: 0.2, grade: 'Standard',
    installed: [{ _id: 'll', type: 'cyberware', name: 'Low-Light', system: { essenceCost: 0.2 } }, { _id: 'th', type: 'cyberware', name: 'Thermo', system: { essenceCost: 0.2 } }] } };
  t.is('arm 1 + its smartlink .25 = 1.25', SR3EActor.installedEssenceCost([armWith]), 1.25);
  t.is('eyes .2 with .4 of mods inside the free .5: .2', SR3EActor.installedEssenceCost([eyes]), 0.2);
  t.is('the same mods LOOSE (as before): .2 + .2 + .2', SR3EActor.installedEssenceCost([{ ...eyes, system: { ...eyes.system, installed: [] } },
    { type: 'cyberware', name: 'Low-Light', system: { essenceCost: 0.2 } }, { type: 'cyberware', name: 'Thermo', system: { essenceCost: 0.2 } }]), 0.6);
  t.eq('implant armour from a limb\'s built-in plating counts', SR3EActor.implantArmor([{ id: 'a', ...cw('Obvious Cyberarm', { installed: [mod('Armor: Ballistic', { bonusBallistic: 2 })] }) }]).ballistic, 2);
}
