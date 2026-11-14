/**
 * The weapon designer as a shop · TODO 300 — chips by skill group (firearms and melee), picture cards with a one-liner,
 * shelf icons, accessories that don't fit hidden behind a switch (shown dashed with an amber reason, still addable), and
 * the per-model picture pipeline. The maintainer's grill, 2026-11-12.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { WeaponCatalog as C, GROUPS, CATEGORY_NAMES } from '../scripts/data/weapon-catalog.mjs';
import { WeaponArt as A, PICTURES, GROUP_IDS, slug } from '../scripts/data/weapon-art.mjs';
import { WeaponDesignerView as V, MOD_SHELVES } from '../scripts/data/weapon-designer-view.mjs';
import { KIND_OF } from '../tools/build-designer.mjs';
import { batch, features, LOOKS } from '../tools/weapon-art-prompts.mjs';
import { realGun, credits, FREE } from '../tools/weapon-refs.mjs';

export const name = 'weapon-designer-shop';
const src = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

export async function run(t) {
  // Every shipped hand weapon has a chip, a known category name and a one-liner.
  const docs = [];
  for (const p of readdirSync(new URL('../packs-src/', import.meta.url)).filter(p => /-(firearms|melee)$/.test(p)))
    for (const f of readdirSync(new URL(`../packs-src/${p}/`, import.meta.url)).filter(f => f.endsWith('.json')))
      docs.push(JSON.parse(readFileSync(new URL(`../packs-src/${p}/${f}`, import.meta.url), 'utf8')).doc);
  t.ok('the packs ship firearms and melee weapons', docs.some(d => d.type === 'firearm') && docs.some(d => d.type === 'melee'));
  t.eq('every weapon category has a name', [...new Set(docs.map(d => d.system.category))].filter(c => !CATEGORY_NAMES[c]).sort(), []);
  t.eq('melee sits under Melee', [...new Set(docs.filter(d => d.type === 'melee').map(C.groupOf))], ['melee']);
  t.eq('a heavy pistol is a pistol', C.groupOf({ type: 'firearm', system: { category: 'HPist' } }), 'pistol');
  t.eq("a firearm's unknown category is Other", C.groupOf({ type: 'firearm', system: { category: 'Tasr' } }), 'other');
  t.eq('the view keeps typeOf for a category', V.typeOf('ShtG'), 'shotgun');
  t.eq('every group has a silhouette', GROUPS.map(([id]) => id).filter(id => !GROUP_IDS.includes(id)), []);
  t.eq('every shelf has its own icon', MOD_SHELVES.map(([id]) => A.shelf(id)).length, new Set(MOD_SHELVES.map(([id]) => A.shelf(id))).size);
  t.eq('blurb: what it is and how held', C.blurb({ type: 'firearm', system: { category: 'HPist', hands: 1 } }), 'Heavy pistol · one hand');
  t.eq('blurb: melee reach', C.blurb({ type: 'melee', system: { category: 'POL', reach: '2', hands: 2 } }), 'Pole arm · reach 2 · 2 hands');

  // Misfits: a reason, never a refusal.
  const rifle = { type: 'firearm', name: 'Rifle', system: { category: 'AsRf', installed: [] } };
  const stock = { type: 'gear', name: 'Stock (Weapon)', system: { modFor: 'weapon' } };
  t.ok('a stock on a rifle has a reason', /own stock/.test(C.misfit(rifle, stock)));
  t.ok('anything on a melee weapon has a reason', /melee/.test(C.misfit({ type: 'melee', name: 'Club', system: {} }, stock)));
  t.eq('no weapon yet: nothing to misfit', C.misfit(null, stock), null);

  // Art: a picture per model once drawn, else the group's silhouette; the list matches the folder.
  t.eq('slug', slug('Ares Predator II'), 'ares-predator-ii');
  t.ok('no picture → the silhouette', A.picture('Nothing Drawn Yet', 'rifle').includes('vd-pic-line') && A.pictureOf('Nothing Drawn Yet') === null);
  const dir = new URL('../styles/weapons/', import.meta.url);
  const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)).sort() : [];
  t.eq('PICTURES matches styles/weapons/*.webp', [...PICTURES].sort(), files);
  const b = batch();
  t.ok('the ComfyUI batch covers the hand weapons without pictures', b.length > 150 && b.every(e => e.slug && e.prompt.includes('white background')));
  t.ok('smartguns get LED lights in their prompt, others do not',
    b.some(e => e.smartgun) && b.every(e => e.prompt.includes('LED indicator lights') === e.smartgun));
  const alpha = b.find(e => e.name === 'Ares Alpha');
  t.ok('the Ares Alpha is drawn with its underbarrel grenade launcher', alpha?.prompt.includes('underbarrel grenade launcher'));
  t.eq('a belt-fed gun gets its belt; a smartlink is not mistaken for a part',
    features({ system: { accessories: 'Smartlink-2, Gas Vent 3', ammunition: '100(b)', mode: 'FA' } }),
    ['vented muzzle brake', 'ammunition belt feeding from a box', 'full-auto']);
  const guns = b.filter(e => e.group !== 'melee');
  t.eq('every firearm has a look note', guns.filter(e => !e.look).map(e => e.slug), []);
  const shippedSlugs = new Set(docs.map(d => slug(d.name)));   // a drawn gun keeps its note (it leaves the batch, not the packs)
  t.eq('no stale look notes', Object.keys(LOOKS).filter(k => k !== '_about' && !shippedSlugs.has(k)), []);
  t.ok('the briefcase SMG is drawn as a briefcase', /briefcase/.test(guns.find(e => e.slug === 'ares-exec-protector')?.prompt));
  t.eq('the batch has no duplicate slugs', b.length, new Set(b.map(e => e.slug)).size);
  t.ok('the keying script decontaminates the fringe', /decontaminat/i.test(src('tools/key-art.py')));

  // Reference photos (the maintainer, 2026-11-13: wiki images as reference art, with an attribution file).
  t.eq('the real gun a look note names', realGun('light machine gun, like an FN Minimi / M249 SAW'), 'FN Minimi');
  t.eq('a note that is the gun itself', realGun('classic AK-47 with wood furniture'), 'AK-47');
  const refs = JSON.parse(src('tools/data/weapon-refs.json'));
  const used = Object.entries(refs).filter(([k, r]) => k !== '_about' && r.file);
  t.ok('every reference photo is free-licensed with a source page', used.length > 100 && used.every(([, r]) => FREE.test(r.license) && r.url?.startsWith('https://commons.wikimedia.org/')));
  t.ok('high-tech guns take no photo reference', used.every(([k]) => !LOOKS[k]?.tech));
  t.eq('CREDITS.md is current', src('styles/weapons/CREDITS.md'), credits(refs));
  t.ok('the keying script greys out orange caps', /def de_orange/.test(src('tools/key-art.py')));

  // Catalogue and wiring.
  t.eq('the web catalogue carries melee', KIND_OF({ type: 'melee' }), 'melee');
  const view = src('scripts/data/weapon-designer-view.mjs');
  t.ok('step 1 lists melee too', /i\.kind === 'melee'/.test(view));
  t.ok("the shop has the don't-fit switch, dashed cards and the amber reason", view.includes('vd-wall-mods') && view.includes('vd-misfit') && view.includes('vd-amber'));
  t.ok('a misfit is still addable (warn, never refuse)', !/why \? '' : `<button/.test(view) && /data-wadd-mod/.test(view));
  t.ok('the importer uses the model picture', src('scripts/data/gear-design.mjs').includes('WeaponArt.pictureOf(base.name)'));
  t.ok('the page points the art at its own folder', src('designer/app.js').includes("WeaponArt.dir = 'weapons'"));
  t.ok('the build publishes the pictures', src('tools/build-designer.mjs').includes("'styles', 'weapons'"));
}
