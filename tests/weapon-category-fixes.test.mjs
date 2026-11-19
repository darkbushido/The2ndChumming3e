/**
 * TODO 301 — the Street Sweeper (CC p.23) is a shotgun and the Ballista (CC p.28) a missile launcher.
 * The pure fix, the migration's wiring, and the pack source itself.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WeaponCategoryFixes } from '../scripts/data/weapon-category-fixes.mjs';
import { ShockStun } from '../scripts/data/shock-stun.mjs';

export const name = 'weapon-category-fixes';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TASER_IMG = 'systems/The2ndChumming3e/styles/icons/firearm-taser.svg';
const sweeper = (system = {}, img = TASER_IMG) => ({ type: 'firearm', name: 'Street Sweeper ShtG', img,
  system: { category: 'Tasr', skill: 'Tasers', attribute: 'quickness', ...system } });
const ballista = (system = {}) => ({ type: 'firearm', name: 'Ballista Mis. Launcher',
  system: { category: 'BlsTa', skill: 'Gunnery', attribute: 'quickness', ...system } });
const pack = f => JSON.parse(readFileSync(join(ROOT, 'packs-src/sr3e-cc-firearms', f), 'utf8')).doc;

export async function run(t) {
  const fix = i => WeaponCategoryFixes.fixItem(i);

  t.eq('Street Sweeper as shipped → shotgun with taser ranges (CC p.23)', fix(sweeper()), {
    'system.category': 'ShtG', 'system.skill': 'Shotguns', 'system.rangeOverride': '5/10/12/15',
    img: 'systems/The2ndChumming3e/styles/icons/firearm-shotgun.svg' });
  t.eq('Ballista as shipped → missile launcher, Launch Weapons/Intelligence (CC p.28)', fix(ballista()), {
    'system.category': 'MisLn', 'system.skill': 'Launch Weapons', 'system.attribute': 'intelligence' });

  t.eq('a GM\'s own category, skill, range and picture are kept', fix(sweeper({ category: 'HPist', skill: 'Pistols', rangeOverride: '1/2/3/4' }, 'my.png')), null);
  t.eq('a GM\'s Ballista attribute is kept, the rest corrected', fix(ballista({ attribute: 'strength' })), {
    'system.category': 'MisLn', 'system.skill': 'Launch Weapons' });
  t.is('another firearm is untouched', fix({ type: 'firearm', name: 'Defiance Super Shock', system: { category: 'Tasr', skill: 'Tasers' } }), null);
  t.is('a non-firearm of the same name is untouched', fix({ type: 'gear', name: 'Street Sweeper ShtG', system: { category: 'Tasr' } }), null);

  // Idempotent: applying the delta then fixing again yields null.
  const apply = (item, d) => { const s = { ...item.system }; let img = item.img;
    for (const [k, v] of Object.entries(d ?? {})) k === 'img' ? (img = v) : (s[k.slice(7)] = v); return { ...item, img, system: s }; };
  t.is('a second run changes nothing (sweeper)', fix(apply(sweeper(), fix(sweeper()))), null);
  t.is('a second run changes nothing (ballista)', fix(apply(ballista(), fix(ballista()))), null);
  t.ok('a fixed Street Sweeper is no longer a shock weapon', ShockStun.isShock(sweeper().system) && !ShockStun.isShock(apply(sweeper(), fix(sweeper())).system));

  t.ok('every entry names its book and page', WeaponCategoryFixes.FIXES.every(f => /CC p\.\d+/.test(f.source)));

  // The pack source carries the fix.
  const sw = pack('street-sweeper-shtg.sr3e-firearm-0925.json'), bl = pack('ballista-mis-launcher.sr3e-firearm-1201.json');
  t.eq('pack: Street Sweeper', [sw.system.category, sw.system.skill, sw.system.rangeOverride, /firearm-shotgun/.test(sw.img)], ['ShtG', 'Shotguns', '5/10/12/15', true]);
  t.eq('pack: Ballista', [bl.system.category, bl.system.skill, bl.system.attribute], ['MisLn', 'Launch Weapons', 'intelligence']);
  t.is('pack: both already fixed', fix(sw) ?? fix(bl), null);

  t.ok('a migration applies the fixes to owned copies',
    /label: 'Street Sweeper is a shotgun[\s\S]{0,1200}fixItem: WeaponCategoryFixes\.fixItem/.test(readFileSync(join(ROOT, 'scripts/SR3EMigrations.js'), 'utf8')));
}
