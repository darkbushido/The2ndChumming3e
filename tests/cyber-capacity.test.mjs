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

  /* ── Grade — M&M p.36's cut (mods ruling Q15, 2026-11-07) ─────────────────── */
  // "Reduce the number of equipment capacity units available in a limb by 10 percent for alphaware, 20 percent for betaware
  // and 25 percent for deltaware. Round fractions to the nearest .25."
  t.eq('alpha −10%, beta −20%, delta −25% of 10', ['Alpha', 'Beta', 'Delta'].map(g => CyberCapacity.capacity(cw('Obvious Cyberarm', { grade: g }))), [9, 8, 7.5]);
  t.eq('…to the nearest .25: a synthetic hand\'s 1 → 1, .75, .75', ['Alpha', 'Beta', 'Delta'].map(g => CyberCapacity.capacity(cw('Synthetic Cyber Hand', { grade: g }))), [1, 0.75, 0.75]);
  t.is('…a device keeps its own ECU whatever its grade (the book cuts only the limb)', CyberCapacity.ecuOf(mod('Smartlink (Internal)', { grade: 'Delta' })), 0.5);
  t.is('…an eye\'s .5 Essence still follows the grade\'s Essence factor', CyberCapacity.capacity({ type: 'cyberware', name: 'Cybereyes', system: { cyberwareCategory: 'Eyeware', capacity: 0.5, grade: 'Delta' } }), 0.25);

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

  /* ── Built-ins addressed by path (TODO 276: Stress, Concealment, VCR, healing) ─ */
  const deep = { id: 'arm', ...cw('Obvious Cyberarm', { installed: [{ ...mod('Cyber Hand'), _id: 'hand', system: { cyberwareCategory: 'Cyberlimbs', installed: [mod('Datajack', { stress: 1 })] } }] }) };
  const deepFlat = [...CyberCapacity.flatten([deep])];
  t.eq('a built-in within a built-in carries the whole path', deepFlat.map(i => i.id), ['arm', 'arm.hand', 'arm.hand.Datajack']);
  t.eq('…and names its host and the host\'s kind', [deepFlat[2].hostName, deepFlat[1].hostKind], ['Cyber Hand', 'ecu']);
  const storedArm = { ...deep, flags: { The2ndChumming3e: { stored: true } } };
  t.ok('a stored limb\'s built-ins read as stored', [...CyberCapacity.flatten([storedArm])].slice(1).every(i => i.getFlag('The2ndChumming3e', 'stored') === true));
  t.ok('…and a fitted limb\'s do not', deepFlat.slice(1).every(i => !i.getFlag('The2ndChumming3e', 'stored')));
  const where = CyberCapacity.locate([deep], 'arm.hand.Datajack');
  t.eq('locate reads the path back to the actor\'s item and the mod', [where.top.id, where.path, where.mod.name], ['arm', ['hand', 'Datajack'], 'Datajack']);
  t.eq('…a plain id or a broken path is no built-in', [CyberCapacity.locate([deep], 'arm'), CyberCapacity.locate([deep], 'arm.nope'), CyberCapacity.locate([deep], 'leg.hand')], [null, null, null]);
  const out = CyberCapacity.patched(deep, ['hand', 'Datajack'], { 'system.stress': 4 });
  t.is('patched writes the change into the nested mod', out[0].system.installed[0].system.stress, 4);
  t.ok('…keeping its other fields and leaving the limb untouched',
    out[0].system.installed[0].system.cyberwareCategory === 'Cyberlimb Mods' && deep.system.installed[0].system.installed[0].system.stress === 1);
  const skull = { id: 'skull', ...cw('Obvious Cyberskull', { installed: [mod('Vehicle Control Rig [2]')] }) };
  t.is('findVcr: a rig built into a cyberskull', CyberCapacity.findVcr([skull])?.id, 'skull.VehicleControlRig2');
  t.is('…a loose one first, as before', CyberCapacity.findVcr([{ id: 'v', ...cw('VCR [1]') }, skull])?.id, 'v');
  t.is('…none: null', CyberCapacity.findVcr([deep]), null);

  /* ── Warnings ─────────────────────────────────────────────────────────────── */
  const full = cw('Obvious Cyber Hand', { installed: [mod('Foot Anchor')] });
  t.ok('over capacity warned (M&M p.37)', CyberCapacity.installWarnings(full, mod('Smartlink (Internal)'), graded).some(w => /holds 2 ECU/.test(w)));
  t.ok('another grade warned', CyberCapacity.installWarnings(cw('Obvious Cyberarm', { grade: 'Alpha' }), mod('Smartlink (Internal)'), graded).some(w => /match their host/.test(w)));
  t.ok('…"an Alpha", not "a Alpha" (seen live 2026-10-27)', CyberCapacity.installWarnings(cw('Obvious Cyberarm', { grade: 'Alpha' }), mod('Smartlink (Internal)'), graded).some(w => /grade in an Alpha Obvious Cyberarm/.test(w)));
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
  for (const [file, re] of [['scripts/documents/SR3EActor.js', /vcrLevelOf\(CyberCapacity\.findVcr\(rigger\.items\)\)/],
    ['scripts/documents/SR3EItem.js', /: CyberCapacity\.findVcr\(pilotActor\.items\);/],
    ['scripts/sheets/SR3EVehicleSheet.js', /droneRolls \? null : CyberCapacity\.findVcr\(driver\.items\)/],
    ['scripts/SR3EVehicleChase.js', /const vcr = CyberCapacity\.findVcr\(actor\.items\)/]]) {
    t.ok(`a built-in VCR is found: ${file}`, re.test(read(file)));
  }
  t.ok('no VCR finder searches the loose items only', !['scripts/documents/SR3EActor.js', 'scripts/documents/SR3EItem.js', 'scripts/sheets/SR3EVehicleSheet.js', 'scripts/SR3EVehicleChase.js']
    .some(f => /items\.find\(i\s*=>\s*i\.type === 'cyberware' &&\s*(\/vcr|\(i\.name\.toLowerCase\(\)\.includes\('vcr'\))/.test(read(f))));
  t.ok('dermal plating built into a limb counts for healing', /for \(const i of CyberCapacity\.flatten\(actor\?\.items \?\? \[\]\)\)/.test(read('scripts/SR3EHealing.js')));
  const stress = read('scripts/SR3EStress.js');
  t.ok('Stress lists built-ins, not stored ones', /implants\(actor\) \{\s*return \[\.\.\.CyberCapacity\.flatten\(actor\?\.items \?\? \[\]\)\]\.filter[\s\S]{0,140}'stored'\)\)/.test(stress));
  t.ok('…and writes a built-in\'s Stress into its limb', /where\.top\.update\(\{ 'system\.installed': CyberCapacity\.patched\(where\.top, where\.path, \{ 'system\.stress': after \}\) \}\)/.test(stress));
  t.ok('…the slots skip an eye\'s options (the eye entry carries their excess)', /!\(i\.builtIn && i\.hostKind === 'essence'\)/.test(stress) && /CyberCapacity\.nestedEssence\(i, graded\)/.test(stress));
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

  /* ── M&M p.39's prices (mods ruling Q16, 2026-11-07 — read from the page) ─── */
  const pack = rel => JSON.parse(read(`packs-src/${rel}`)).doc.system;
  t.eq('Cyberskates 1,000¥, retractable 2,500¥', [pack('sr3e-mm-cyberware/cyberskates-cyberlimb.sr3e-cyberware-0741.json').cost,
    pack('sr3e-mm-cyberware/cyberskates-retractable-cyberlimb.sr3e-cyberware-0742.json').cost], [1000, 2500]);
  const dni = pack('sr3e-sr3-cyberware/direct-neural-interface-cyberlimb.sr3e-cyberware-0743.json');
  t.eq('Direct Neural Interface 4,500¥, .1 Essence', [dni.cost, dni.essenceCost], [4500, 0.1]);
  t.is('….25 ECU', CyberCapacity.ecuOf(mod('Direct Neural Interface (Cyberlimb)')), 0.25);
  t.is('DNI adaptation: ×150% of the device', CyberCapacity.builtInCost(1000, { mmOn: true, dni: true }), 1500);
}
