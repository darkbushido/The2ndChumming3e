/**
 * NPCs start with loaded guns and 3–6 reloads when ammunition is tracked · TODO 270.
 *
 * Reported in play, 2026-10-25: Mr. Johnson's Little Black Book NPCs came out with empty guns and no ammunition.
 * Fixture: every firearm the shipped contacts pack carries, so the test covers the real capacities.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NpcAmmo } from '../scripts/data/npc-ammo.mjs';
import { AmmoStock } from '../scripts/data/ammo-stock.mjs';

export const name = 'npc-ammo';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PACK = join(ROOT, 'packs-src', 'sr3e-mr-johnsons-contacts');
const gun = (o) => ({ _id: o.id ?? 'g1', name: o.name ?? 'Gun', type: 'firearm', system: { ammunition: '12(c)', category: 'HPist', ...o.system } });
const fixed = v => () => v;
/** The first ammunition planned — a blank one when nothing is, so a wrong plan fails assertions rather than throwing. */
const first = plan => plan.ammo[0] ?? { name: '', system: {} };

export async function run(t) {
  /* ── The pack's guns ──────────────────────────────────────────────────────── */
  const packGuns = [];
  for (const f of readdirSync(PACK).filter(n => n.endsWith('.json'))) {
    const g = JSON.parse(readFileSync(join(PACK, f), 'utf8'));
    for (const i of Object.values(g.embedded ?? {})) if (i.type === 'firearm') packGuns.push({ actor: g.doc.name, item: i, items: Object.values(g.embedded) });
  }
  t.ok("the contacts pack still ships guns (the fixture isn't vacuous)", packGuns.length >= 19);
  t.ok('…and no ammunition, which is the bug', packGuns.every(p => !p.items.some(i => i.type === 'ammunition')));
  for (const p of packGuns) {
    const plan = NpcAmmo.plan(p.items, { trackAmmo: true, rng: fixed(0) });
    const upd = plan.guns.find(u => u._id === p.item._id);
    t.ok(`${p.actor}: ${p.item.name} (${p.item.system.ammunition}) is loaded to its magazine`,
      upd && upd['system.loadedRounds'] === NpcAmmo.magazine(p.item.system).size && upd['system.loadedAmmoType'] === 'regular');
  }

  /* ── Off, or already supplied → nothing ──────────────────────────────────── */
  t.is('trackAmmo off → nothing', NpcAmmo.plan([gun({})], { trackAmmo: false }).guns.length, 0);
  t.is('an actor carrying any ammunition is left alone',
    NpcAmmo.plan([gun({}), { _id: 'a', type: 'ammunition', name: 'Box', system: {} }], { trackAmmo: true }).guns.length, 0);
  t.is('a gun already loaded is left alone', NpcAmmo.plan([gun({ system: { loadedRounds: 3 } })], { trackAmmo: true }).guns.length, 0);
  t.is('a grenade launcher is skipped (it loads a grenade item)', NpcAmmo.plan([gun({ system: { category: 'GrLn', ammunition: '6(m)' } })], { trackAmmo: true }).guns.length, 0);
  t.is('no magazine size → skipped', NpcAmmo.plan([gun({ system: { ammunition: '(Internal)' } })], { trackAmmo: true }).guns.length, 0);
  t.is('no items → nothing, no throw', NpcAmmo.plan(undefined, { trackAmmo: true }).ammo.length, 0);

  /* ── 3–6 reloads ─────────────────────────────────────────────────────────── */
  t.is('the lowest roll → 3 reloads', NpcAmmo.rollReloads(fixed(0)), 3);
  t.is('the highest roll → 6 reloads', NpcAmmo.rollReloads(fixed(0.9999)), 6);
  const seen = new Set();
  for (let i = 0; i < 40; i++) seen.add(NpcAmmo.rollReloads(fixed(i / 40)));
  t.is('every count from 3 to 6, and nothing else', [...seen].sort().join(), '3,4,5,6');

  /* ── The ammunition given ────────────────────────────────────────────────── */
  const clip = first(NpcAmmo.plan([gun({ name: 'Browning Max-Power', system: { ammunition: '10(c)' } })], { trackAmmo: true, rng: fixed(0.5) }));
  t.is('a clip gun gets pre-filled reloads', JSON.stringify([clip.system.countedIn, clip.system.reloads, clip.system.roundsPerReload, clip.system.loadMechanism]),
    JSON.stringify(['reloads', 5, 10, 'c']));
  t.is('…regular rounds, stamped with the gun\'s class', `${clip.system.ammoType} ${clip.system.gunClass}`, 'regular HPist');
  t.ok('…which fit the gun they were made for', AmmoStock.fits(clip.system, 'c', AmmoStock.gunClasses({ category: 'HPist' })));
  t.ok('…and not a rifle', !AmmoStock.fits(clip.system, 'c', AmmoStock.gunClasses({ category: 'AsRf' })));
  t.is('…named for the gun, readable as a reload', AmmoStock.fromName(clip.name)?.roundsPerReload, 10);
  const tube = first(NpcAmmo.plan([gun({ name: 'Defiance T-250', system: { ammunition: '5(m)', category: 'ShtG' } })], { trackAmmo: true, rng: fixed(0) }));
  t.is('an internal magazine gets the same number of magazines in loose rounds', JSON.stringify([tube.system.countedIn, tube.system.rounds]),
    JSON.stringify(['rounds', 15]));
  const cyl = first(NpcAmmo.plan([gun({ system: { ammunition: '6(cy)' } })], { trackAmmo: true, rng: fixed(0) }));
  t.is('a revolver gets speed loaders', `${cyl.system.loadMechanism} ${cyl.system.reloads}`, 'cy 3');
  const mp = first(NpcAmmo.plan([gun({ system: { ammunition: '40(c)', category: 'MaPist' } })], { trackAmmo: true }));
  t.is('a machine pistol\'s ammunition is light-pistol class (SR3 p.279)', mp.system.gunClass, 'LPist');
  const two = NpcAmmo.plan([gun({ id: 'a' }), gun({ id: 'b', system: { ammunition: '6(m)', category: 'Snip' } })], { trackAmmo: true });
  t.is('each gun gets its own load and its own stock', `${two.guns.length} ${two.ammo.length}`, '2 2');

  /* ── The hook ────────────────────────────────────────────────────────────── */
  const src = readFileSync(join(ROOT, 'scripts', 'sr3e.js'), 'utf8');
  const hook = src.slice(src.indexOf("Hooks.on('createActor'"), src.indexOf('🍀 Refresh Karma Pools'));
  t.ok('the createActor hook runs once, on the creating client, never for a pack document',
    /if \(userId !== game\.user\.id \|\| options\.pack \|\| actor\.pack\) return;/.test(hook));
  t.ok('…reads trackAmmo and plans through NpcAmmo', /game\.settings\.get\('The2ndChumming3e', 'trackAmmo'\)/.test(hook) && /NpcAmmo\.plan\(/.test(hook));
  t.ok('…loads the guns and creates the stock', /updateEmbeddedDocuments\('Item', guns\)/.test(hook) && /createEmbeddedDocuments\('Item', ammo\)/.test(hook));
}
