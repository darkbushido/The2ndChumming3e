/**
 * Item pictures — `scripts/data/item-icons.mjs`, the icons `tools/build-item-icons.mjs` draws, and the
 * packs `tools/apply-item-icons.mjs` points at them. Asked for 2026-09-26: *"I just want to get away
 * from the foundry extra white icons."*
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { itemIcon, defaultImage, isStockImage, restockImage, allIconNames, TYPE_ART, ICON_DIR } from '../scripts/data/item-icons.mjs';
import { render, OUT } from '../tools/build-item-icons.mjs';

export const name = 'item-icons';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const I = n => `${ICON_DIR}/${n}.svg`;
const ammo = (system, name = 'Regular Rnds') => itemIcon({ type: 'ammunition', name, system });

export async function run(t) {
  /* ── Gear and medical ──────────────────────────────────────────────────────────── */
  t.is('gear by category: a credstick', itemIcon({ type: 'gear', system: { category: 'Credstick' } }), I('gear-credstick'));
  t.is('gear with no known category is the case', itemIcon({ type: 'gear', system: {} }), I('gear-case'));
  t.is('a slap patch', itemIcon({ type: 'medical', name: 'Trauma Patch' }), I('medical-patch'));
  t.is('a hospital', itemIcon({ type: 'medical', name: 'Alpha Hospital Rating 3' }), I('medical-clinic'));
  t.is('a medkit', itemIcon({ type: 'medical', name: 'Medkit Rating 3' }), I('medical-medkit'));

  /* ── Ammunition: magazine or loose, and the class of gun (SR3 p.279) ──────────── */
  t.is('a box of rounds with no class', ammo({ loadMechanism: 'c', countedIn: 'rounds' }), I('ammo-rounds'));
  t.is('a clip counted in reloads is a magazine', ammo({ loadMechanism: 'c', countedIn: 'reloads' }, '10-Rnd Clip (Gel)'), I('ammo-mag'));
  t.is('…for a heavy pistol', ammo({ loadMechanism: 'c', countedIn: 'reloads', gunClass: 'HPist' }), I('ammo-mag-pistol'));
  t.is('rounds for an SMG', ammo({ loadMechanism: 'c', countedIn: 'rounds', gunClass: 'SMG' }), I('ammo-rounds-smg'));
  t.is('rounds for an assault rifle', ammo({ countedIn: 'rounds', gunClass: 'AsRf' }), I('ammo-rounds-rifle'));
  t.is('a carbine\'s class alias is an assault rifle', ammo({ countedIn: 'rounds', gunClass: 'Carb' }), I('ammo-rounds-rifle'));
  t.is('shotgun shells', ammo({ countedIn: 'rounds', gunClass: 'ShtG' }), I('ammo-rounds-shotgun'));
  t.is('a cylinder counted in reloads is a magazine too', ammo({ loadMechanism: 'cy', countedIn: 'reloads', gunClass: 'LPist' }), I('ammo-mag-pistol'));
  t.is('a tube is loose whatever it says', ammo({ loadMechanism: 'm', countedIn: 'reloads' }, 'Offensive HE Mini-grenade'), I('ammo-minigrenade'));
  t.is('arrows', ammo({ loadMechanism: 'arrow' }, 'Arrows'), I('ammo-arrows'));
  t.is('bolts', ammo({ loadMechanism: 'bolt' }, 'Bolts'), I('ammo-bolts'));
  t.is('darts by name', ammo({ loadMechanism: 'c' }, 'Dart, Narcoject'), I('ammo-dart'));
  t.is('a belt by name', ammo({ loadMechanism: 'c' }, 'Assault Cannon Belt (100)'), I('ammo-belt'));
  t.is('a mortar round', ammo({ loadMechanism: 'c' }, 'HE Mortar Round B'), I('ammo-mortar'));
  t.is('a mine', ammo({ loadMechanism: 'c' }, 'Anti-Vehicle Mine'), I('ammo-mine'));

  /* ── Every other type: its painted texture, never a Foundry core icon ─────────── */
  t.is('a skill shows the skills texture', defaultImage({ type: 'skill' }), TYPE_ART.skill);
  t.is('a firearm keeps the firearms texture', defaultImage({ type: 'firearm', system: { category: 'SMG' } }), TYPE_ART.firearm);
  t.is('a type with no art has no default', defaultImage({ type: 'contact' }), null);
  t.ok('no type falls back to a Foundry core icon', Object.values(TYPE_ART).every(p => !p.startsWith('icons/')));

  /* ── Only a stock picture is ever replaced ────────────────────────────────────── */
  t.ok('Foundry\'s item bag is stock', isStockImage('icons/svg/item-bag.svg'));
  t.ok('none is stock', isStockImage(''));
  t.ok('a drawn icon is stock', isStockImage(I('ammo-rounds')));
  t.ok('the old medical texture is stock', isStockImage('systems/The2ndChumming3e/styles/textures/medical-default.webp'));
  t.ok('a picture someone chose is not', !isStockImage('worlds/test/my-gun.webp'));
  t.is('a chosen picture is left alone', restockImage({ type: 'gear', img: 'worlds/test/deck.webp', system: {} }), null);
  t.is('an item already right is left alone', restockImage({ type: 'skill', img: TYPE_ART.skill }), null);
  t.is('ammunition follows the class a gun stamps on it',
    restockImage({ type: 'ammunition', img: I('ammo-rounds'), name: 'Regular Rnds', system: { countedIn: 'rounds', gunClass: 'SMG' } }),
    I('ammo-rounds-smg'));

  /* ── The drawn icons ──────────────────────────────────────────────────────────── */
  const drawn = new Set(render().map(i => i.file.replace(/\.svg$/, '')));
  const missing = allIconNames().filter(n => !drawn.has(n));
  t.eq('every icon the mapping can name is drawn', missing, []);
  const stale = render().filter(({ file, text }) => !existsSync(join(OUT, file)) || readFileSync(join(OUT, file), 'utf8') !== text).map(i => i.file);
  t.eq('styles/icons matches the builder (run: node tools/build-item-icons.mjs)', stale, []);
  const extra = readdirSync(OUT).filter(f => f.endsWith('.svg') && !drawn.has(f.replace(/\.svg$/, '')));
  t.eq('no icon in styles/icons that the builder does not draw', extra, []);
  t.ok('icons reference nothing outside themselves (an <img> cannot load it)',
    render().every(({ text }) => !/(href|url\()\s*=?\s*["']?(?!#)(https?:|\/|\.)/.test(text.replace(/xmlns="[^"]+"/, ''))));

  /* ── The packs ────────────────────────────────────────────────────────────────── */
  const behind = [];
  const src = join(ROOT, 'packs-src');
  for (const pack of readdirSync(src)) {
    for (const f of readdirSync(join(src, pack)).filter(f => f.endsWith('.json'))) {
      const g = JSON.parse(readFileSync(join(src, pack, f), 'utf8'));
      const items = [[g._key, g.doc], ...Object.entries(g.embedded ?? {})].filter(([k]) => /^!(items|[a-z]+\.items)!/.test(k));
      for (const [, doc] of items) if (restockImage(doc)) behind.push(`${pack}: ${doc.name}`);
    }
  }
  t.eq('every shipped item carries its picture (run: node tools/apply-item-icons.mjs)', behind.slice(0, 5), []);

  /* ── The Foundry side (source-level: sr3e.js cannot be imported without Foundry) ── */
  const main = readFileSync(join(ROOT, 'scripts', 'sr3e.js'), 'utf8');
  t.ok('a new item gets its picture on create', /Hooks\.on\('preCreateItem'[\s\S]{0,120}restockImage\(document\)/.test(main));
  t.ok('ammunition\'s picture follows an update to its class', /Hooks\.on\('preUpdateItem'[\s\S]{0,300}restockImage\(/.test(main));
}
