/**
 * Build the web gear designer · TODO 298 (docs/web-designer-proposal.md).
 *
 *   npm run designer:build            → dist/designer/   (ignored; release.yml publishes it to Pages)
 *   npm run designer:build -- <dir>   → another folder
 *
 * No bundler. It writes three things:
 *  - the page itself, copied from `designer/`;
 *  - `lib/` — `scripts/data/gear-design.mjs` and every module it imports, copied AS-IS, so the page runs the system's own
 *    rules (one shared core — never a fork);
 *  - `catalogue.json` — the firearms, weapon accessories, ammunition and vehicle modifications from `packs-src/`, **stats only**.
 *
 * ⚠ **The catalogue is an allow-list.** A field reaches the public page only if `FIELDS` names it: names, numbers and the
 * book/page cite — never `description`, `notes` or any rulebook text (the maintainer, 2026-11-11). An installed (integral)
 * accessory is cut down the same way. `tests/designer.test.mjs` asserts nothing else leaks. ⚠ Nothing from `SR-OCR/` is
 * ever read here.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync, rmSync, cpSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ItemMods } from '../scripts/data/item-mods.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Which pack documents are in the catalogue, by kind. */
export const KIND_OF = doc => {
  if (doc?.type === 'firearm') return 'firearm';
  if (doc?.type === 'melee') return 'melee';   // TODO 300: melee weapons get their own chip
  if (doc?.type === 'ammunition') return 'ammo';
  if (doc?.type === 'gear' && doc?.system?.modFor === 'weapon') return 'mod';
  if (doc?.type === 'vehiclemod') return 'vmod';
  if (doc?.type === 'vehicle') return 'vehicle';   // a book vehicle (an Actor) — "modify a book vehicle"
  return null;
};

/** The allow-list: the only fields that reach the page. */
export const FIELDS = {
  top: ['_id', 'name', 'type'],
  firearm: ['category', 'concealability', 'ammunition', 'mode', 'damage', 'weight', 'availability', 'cost', 'streetIndex',
    'accessories', 'bookPage', 'hands', 'smartgun', 'laserSight', 'legality', 'recoilMod', 'recoilModIntegral', 'installed'],
  melee: ['category', 'concealability', 'reach', 'damage', 'weight', 'availability', 'cost', 'streetIndex', 'bookPage', 'hands', 'legality'],
  mod: ['category', 'concealability', 'rating', 'cost', 'weight', 'availability', 'streetIndex', 'bookPage', 'modFor',
    'legality', 'modifiers', 'mount'],
  ammo: ['concealability', 'damage', 'ammoType', 'rounds', 'weight', 'cost', 'availability', 'streetIndex', 'bookPage',
    'legality', 'gunClass'],
  vmod: ['cost', 'availability', 'streetIndex', 'cfCost', 'load', 'bookPage', 'rating', 'modFor', 'legality', 'designCost',
    'designCf', 'designLoad'],
  vehicle: ['vehicleType', 'cost', 'streetIndex', 'availability', 'seating', 'bookPage', 'attributes'],
  /** The one flag the rules read on an installed accessory. */
  flags: ['integral'],
};

const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj?.[k] !== undefined).map(k => [k, obj[k]]));

/** The system's own item icons and vehicle textures — the only pictures published (as `icons/<file>`). */
export const ICON = /^systems\/The2ndChumming3e\/styles\/(icons|textures\/vehicles)\/([\w-]+\.(?:svg|webp|png))$/;
/** Where a published `icons/<file>` comes from. */
const iconSource = new Map();

/** One document cut down to the allow-list. */
export function publicDoc(doc, kind = KIND_OF(doc)) {
  const out = pick(doc, FIELDS.top);
  // Its icon, as the page's own copy (`icons/`): a path, never text. Only the system's own icons are published.
  const icon = ICON.exec(String(doc.img ?? ''));
  if (icon) out.img = `icons/${icon[2]}`;
  out.system = pick(doc.system, FIELDS[kind]);
  // A vehicle's attributes are only its numbers — `{ handling: { base: 4, value: 4 } … }`, nothing else in them.
  if (kind === 'vehicle' && out.system.attributes) {
    out.system.attributes = Object.fromEntries(Object.entries(out.system.attributes).filter(([k]) => /^\w+$/.test(k))
      .map(([k, a]) => [k, pick(a, ['base', 'value'].filter(x => Number.isFinite(a?.[x])))]));
  }
  // A mod's mount is often only in its description ("Mount: Top") — which never ships. Publish what the rules read from it.
  if (kind === 'mod' && !out.system.mount) {
    const mounts = ItemMods.mountsOf(doc);
    if (mounts.length) out.system.mount = mounts.join('/');
  }
  if (Array.isArray(out.system.installed)) out.system.installed = out.system.installed.map(m => publicDoc(m, 'mod'));
  const flags = pick(doc.flags?.The2ndChumming3e, FIELDS.flags);
  if (Object.keys(flags).length) out.flags = { The2ndChumming3e: flags };
  return out;
}

/** `{ "<pack>/<id>": doc }` for every catalogue document, and the pack labels. */
export function catalogue(root = ROOT) {
  const manifest = JSON.parse(readFileSync(join(root, 'system.json'), 'utf8'));
  const label = Object.fromEntries((manifest.packs ?? []).map(p => [p.name, p.label]));
  const items = {};
  for (const pack of readdirSync(join(root, 'packs-src')).sort()) {
    if (!label[pack]) continue;   // undeclared → not shipped → not published
    for (const f of readdirSync(join(root, 'packs-src', pack)).filter(x => x.endsWith('.json')).sort()) {
      const { doc } = JSON.parse(readFileSync(join(root, 'packs-src', pack, f), 'utf8'));
      const kind = KIND_OF(doc);
      if (!kind || !doc._id) continue;
      items[`${pack}/${doc._id}`] = { kind, ...publicDoc(doc, kind) };
      for (const img of [doc.img, ...(doc.system?.installed ?? []).map(m => m.img)]) {
        const m = ICON.exec(String(img ?? ''));
        if (m) iconSource.set(m[2], join(root, 'styles', m[1], m[2]));
      }
    }
  }
  const packs = Object.fromEntries([...new Set(Object.keys(items).map(r => r.split('/')[0]))].map(p => [p, label[p]]));
  return { system: manifest.version, packs, items };
}

/** Every `scripts/data` module `entry` imports, transitively (relative imports only), entry first. */
export function moduleClosure(entry = 'gear-design.mjs', dir = join(ROOT, 'scripts', 'data')) {
  const seen = [];
  const visit = name => {
    if (seen.includes(name)) return;
    seen.push(name);
    const src = readFileSync(join(dir, name), 'utf8');
    for (const m of src.matchAll(/^\s*import\s[^'"]*from\s+['"]\.\/([\w.-]+\.mjs)['"]/gm)) visit(m[1]);
  };
  visit(entry);
  return seen;
}

/**
 * `mod-rating-table.mjs` for the page: only the weapon, ammunition and vehicle-mod rows, and in them only `RATING_FIELDS` — the
 * full table also holds cyberware, adept powers and per-level `description` text, none of which the page may publish.
 */
export const RATING_KINDS = ['weapon', 'ammunition', 'vehicle'];
export const RATING_FIELDS = ['availability', 'cost', 'weight', 'bookPage', 'concealability', 'streetIndex', 'cfCost', 'load'];
export async function ratingTable() {
  const { MOD_RATING_TABLE } = await import('../scripts/data/mod-rating-table.mjs');
  return Object.fromEntries(Object.entries(MOD_RATING_TABLE).filter(([k]) => RATING_KINDS.includes(k.split('|')[0]))
    .map(([k, levels]) => [k, Object.fromEntries(Object.entries(levels).map(([lv, row]) => [lv, pick(row, RATING_FIELDS)]))]));
}
let _table = null;
function ratingTableSource() {
  return '// Generated by tools/build-designer.mjs — weapon, ammunition and vehicle-mod rows of scripts/data/mod-rating-table.mjs, stats only.\n'
    + `export const MOD_RATING_TABLE = ${JSON.stringify(_table)};\nexport const COLLAPSED_SOURCES = {};\n`;
}

/** The marker that starts the vehicle designer's stylesheet block in styles/sr3e.css — it runs to the end of the file. */
export const CSS_MARKER = '/* 🛠 Vehicle Designer as a shop';
/** styles/sr3e.css's colour tokens (its first `:root` block) and the designer's block, so the page looks like the window. */
export function designerCss(css = readFileSync(join(ROOT, 'styles', 'sr3e.css'), 'utf8')) {
  const root = /^:root \{[\s\S]*?^\}/m.exec(css)?.[0] ?? '';
  const at = css.indexOf(CSS_MARKER);
  if (!root || at < 0) throw new Error('styles/sr3e.css: the :root tokens or the vehicle designer block moved — update tools/build-designer.mjs');
  return `/* Generated by tools/build-designer.mjs from styles/sr3e.css — do not edit. */
${root}
${css.slice(at)}`;
}

export async function build(out) {
  _table = await ratingTable();
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'lib'), { recursive: true });
  for (const f of readdirSync(join(ROOT, 'designer'))) copyFileSync(join(ROOT, 'designer', f), join(out, f));
  const mods = [...new Set([...moduleClosure(), ...moduleClosure('vehicle-designer-view.mjs'), ...moduleClosure('weapon-designer-view.mjs'), ...moduleClosure('book-vehicle-view.mjs')])];
  for (const f of mods) {
    if (f === 'mod-rating-table.mjs') writeFileSync(join(out, 'lib', f), ratingTableSource());
    else copyFileSync(join(ROOT, 'scripts', 'data', f), join(out, 'lib', f));
  }
  const cat = catalogue();
  writeFileSync(join(out, 'catalogue.json'), JSON.stringify(cat));
  // The Foundry designer's look (TODO 297) — its colours and its own stylesheet block — and the chassis pictures.
  writeFileSync(join(out, 'designer.css'), designerCss());
  cpSync(join(ROOT, 'styles', 'vehicles'), join(out, 'vehicles'), { recursive: true });
  // The weapon pictures (TODO 300) — the folder may hold none yet.
  mkdirSync(join(out, 'weapons'), { recursive: true });
  if (existsSync(join(ROOT, 'styles', 'weapons'))) cpSync(join(ROOT, 'styles', 'weapons'), join(out, 'weapons'), { recursive: true });
  // The item icons the catalogue names.
  mkdirSync(join(out, 'icons'), { recursive: true });
  const icons = new Set(Object.values(cat.items).flatMap(i => [i.img, ...(i.system.installed ?? []).map(m => m.img)]).filter(Boolean));
  for (const p of icons) copyFileSync(iconSource.get(p.slice('icons/'.length)), join(out, p));
  return { modules: mods.length, items: Object.keys(cat.items).length, system: cat.system };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv[2] ?? join(ROOT, 'dist', 'designer'));
  const r = await build(out);
  console.log(`designer ${r.system}: ${r.items} catalogue items, ${r.modules} rule modules → ${out}`);
}
