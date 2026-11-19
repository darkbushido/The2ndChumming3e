/**
 * The web designer's 🛡 Armour tab · TODO 305 — `GearDesign.assembleArmor` (every figure from armor-mods.mjs), the link
 * round-trip, the view (chips, shelves, one of each mod, warnings shown) and the Foundry import (mods inside, not worn,
 * the recomputed price, a mismatch warned). The maintainer's grill, 2026-11-19.
 */
import { readFileSync } from 'node:fs';
import { GearDesign } from '../scripts/data/gear-design.mjs';
import { ArmorMods } from '../scripts/data/armor-mods.mjs';
import { ArmorDesignerView as V, ARMOR_TYPES, ARMOR_SHELVES } from '../scripts/data/armor-designer-view.mjs';
import { catalogue, moduleClosure, KIND_OF } from '../tools/build-designer.mjs';

export const name = 'armor-designer';
const src = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

export async function run(t) {
  const items = catalogue().items;
  const lookup = ref => items[ref] ?? null;
  const find = (kind, re) => Object.keys(items).find(r => items[r].kind === kind && re.test(items[r].name));

  /* ── The catalogue ───────────────────────────────────────────────────────── */
  t.ok('the catalogue has armour and armour mods', ['armor', 'amod'].every(k => Object.values(items).some(i => i.kind === k)));
  t.eq('a CC modification is an armour mod', KIND_OF({ type: 'gear', system: { modFor: 'armor' } }), 'amod');
  t.eq('a helmet option is an armour mod', KIND_OF({ type: 'armor', system: { modFor: 'armor' } }), 'amod');
  t.eq('plain armour is armour', KIND_OF({ type: 'armor', system: {} }), 'armor');
  t.ok('all six CC modifications are in the shop', ['Chemical Seal', 'Fire Resistance', 'Insulation', 'Nonconductive', 'Thermal Dampening', 'Gel Packs']
    .every(n => find('amod', new RegExp(`^${n}`))));

  /* ── assembleArmor ───────────────────────────────────────────────────────── */
  const jacket = find('armor', /^Armor Jacket$/);
  const insul = find('amod', /^Insulation/);
  const gel = find('amod', /^Gel Packs/);
  const design = { ...GearDesign.blank('0.8.0'), kind: 'armor', base: jacket, mods: [{ ref: insul, rating: 4 }] };
  const r = await GearDesign.assembleArmor(design, lookup, { newId: () => 'x'.repeat(16) });
  t.eq('the mod is installed inside the armour', r.armor.system.installed.map(m => m.rating ?? m.system.rating), [4]);
  t.is('Insulation 4 adds its level cost (900 + 600)', r.totals.cost, 1500);
  t.is('…its Concealability (6 − 2)', r.totals.conceal, 4);
  t.is('…and its weight (2 + 2 kg)', r.totals.weight, 4);
  t.eq('…Cold protection 4', r.totals.protections.map(p => [p.target, p.value]), [['resistCold', 4]]);
  t.is('the figures are ArmorMods\' own', r.totals.cost, ArmorMods.cost(r.armor));
  t.is('mod points count against the caps', r.totals.points, 4);

  const g = await GearDesign.assembleArmor({ ...design, mods: [{ ref: gel }] }, lookup);
  t.is('gel packs make the armour ×5 (900 → 4,500¥)', g.totals.cost, 4500);
  t.ok('…and hardened', g.totals.hardened && g.totals.gel);
  t.is('…Concealability halved (6 → 3)', g.totals.conceal, 3);

  const over = await GearDesign.assembleArmor({ ...design, mods: [{ ref: insul, rating: 10 }] }, lookup);
  t.ok('past the caps is warned (CC p.52)…', over.warnings.some(w => /CC p\.52/.test(w)));
  t.is('…never refused', over.armor.system.installed.length, 1);
  const named = await GearDesign.assembleArmor({ ...design, name: 'Lucky Coat' }, lookup);
  t.is('the design\'s name goes on the item', named.armor.name, 'Lucky Coat');
  const helmet = find('armor', /helmet/i);
  const hw = await GearDesign.assembleArmor({ ...design, base: helmet, name: 'Lucky Hat', mods: [{ ref: insul, rating: 1 }] }, lookup);
  t.ok('a renamed helmet is still warned as a helmet', hw.warnings.some(w => /helmets/.test(w)));
  const none = await GearDesign.assembleArmor({ ...design, base: '' }, lookup);
  t.ok('no armour is a warning', none.armor === null && none.warnings.some(w => /No armour/.test(w)));
  const unk = await GearDesign.assembleArmor({ ...design, mods: [{ ref: 'sr3e-cc-gear/nope' }] }, lookup);
  t.ok('an unknown mod is warned and left out', unk.warnings.some(w => /not found/.test(w)) && unk.armor.system.installed === undefined);

  /* ── The link ────────────────────────────────────────────────────────────── */
  const sent = { ...design, name: 'Cold Jacket', claimed: { cost: r.totals.cost, conceal: r.totals.conceal } };
  const back = await GearDesign.parse(`https://x/designer/#d=${await GearDesign.encode(sent)}`);
  t.is('the kind survives the link', back.design.kind, 'armor');
  t.eq('…and the base, mods and levels', [back.design.base, back.design.mods], [jacket, [{ ref: insul, rating: 4 }]]);
  t.eq('…and the claimed figures', back.design.claimed, { cost: 1500, conceal: 4 });
  t.eq('no ammo on armour', back.design.ammo, []);
  const cheat = GearDesign.mismatches({ ...back.design, claimed: { cost: 1, conceal: 9 } }, r.totals, '0.8.0');
  t.ok('a cheaper claimed price is warned', cheat.some(w => /says 1¥/.test(w)));
  t.ok('a claimed Concealability that differs is warned', cheat.some(w => /Concealability 9/.test(w)));

  /* ── The view ────────────────────────────────────────────────────────────── */
  t.eq('four chips', ARMOR_TYPES.map(([id]) => id), ['clothing', 'body', 'helmet', 'shield']);
  t.eq('two shelves', ARMOR_SHELVES.map(([id]) => id), ['mod', 'option']);
  t.is('a jacket is body armour', V.typeOf({ name: 'Armor Jacket' }), 'body');
  t.is('a helmet is a helmet', V.typeOf({ name: 'Security Helmet' }), 'helmet');
  t.is('a riot shield is a shield', V.typeOf({ name: 'Riot Shield' }), 'shield');
  t.is('a lined coat is clothing', V.typeOf({ name: 'Lined Coat' }), 'clothing');
  t.ok('every chip has armour', ARMOR_TYPES.every(([id]) => Object.values(items).some(i => i.kind === 'armor' && V.typeOf(i) === id)));
  t.is('a helmet option sits on the options shelf', V.shelfOf({ type: 'armor' }), 'option');
  const view = { design: over.armor ? { ...design, mods: [{ ref: insul, rating: 10 }] } : design, ui: {}, step: 2, items, r: over, img: () => '', finish: () => '<b>FIN</b>' };
  const html2 = V.html(view);
  t.ok('step 2 shows the rules\' warnings', /CC p\.52/.test(html2));
  t.ok('a mod in the cart is not offered again', html2.includes('✓ In cart') && !html2.includes(`data-aadd-mod="${insul}"`));
  t.ok('step 3 has the finish buttons', V.html({ ...view, step: 3 }).includes('<b>FIN</b>'));
  t.ok('no Foundry global in the view', !/(?<![.\w])(?:game|foundry|ui|Hooks|CONFIG)\.\w/.test(src('scripts/data/armor-designer-view.mjs').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));
  t.ok('the build copies the view', moduleClosure('armor-designer-view.mjs').includes('armor-mods.mjs') && /moduleClosure\('armor-designer-view\.mjs'\)/.test(src('tools/build-designer.mjs')));
  const app = src('designer/app.js');
  t.ok('the page has the Armour tab', /data-kind="armor"/.test(src('designer/index.html')) && /id="armor-root"/.test(src('designer/index.html')));
  t.ok('the page prices through assembleArmor and loads armour links', /GearDesign\.assembleArmor\(/.test(app) && /kind === 'armor'/.test(app));

  /* ── The Foundry import ──────────────────────────────────────────────────── */
  const imp = src('scripts/SR3EDesignImport.js');
  t.ok('the import runs the shared assembleArmor', /GearDesign\.assembleArmor\(/.test(imp));
  t.ok('it is created not worn', /createArmor[\s\S]{0,600}worn: false/.test(imp));
  t.ok('…on an owned actor or in the world', /createArmor[\s\S]{0,1200}actor\?\.isOwner[\s\S]{0,400}Item\.implementation\.createDocuments/.test(imp));
  t.ok('a mismatch is warned in the dialog (mismatches runs for every kind)', /GearDesign\.mismatches\(design, result\.totals/.test(imp));
}
