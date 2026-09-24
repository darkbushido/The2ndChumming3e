/**
 * Hands · SR3 p.112 (TODO 49) — what a weapon takes, what a character holds, and the second-gun
 * guess in the GM's TN window.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Hands, DUAL_WIELD_CATEGORIES } from '../scripts/data/hands.mjs';
import { ReadyWeapon } from '../scripts/data/ready-weapon.mjs';
import { guessGearModifiers } from '../scripts/SR3ECombatModifiers.js';

export const name = 'hands';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const H = Hands;
  const w = (type, category, extra = {}) => ({ id: `${type}-${category}-${Math.random()}`, name: `${category}`, type, system: { category, ...extra } });

  /* ── The category defaults (no table — the maintainer's decision) ───────────── */
  t.eq('pistols and SMGs take one hand', ['HPist', 'LPist', 'HOPist', 'SMG', 'MaPist'].map(c => H.defaultHands('firearm', c)), [1, 1, 1, 1, 1]);
  t.eq('rifles, shotguns, machine guns, launchers take two', ['AsRf', 'ShtG', 'Snip', 'LMG', 'GrLn'].map(c => H.defaultHands('firearm', c)), [2, 2, 2, 2, 2]);
  t.eq('bows and crossbows two; a sling one', ['Bow', 'LCB', 'HCB', 'SL'].map(c => H.defaultHands('projectile', c)), [2, 2, 2, 1]);
  t.eq('pole arms two, other melee one, fists and cyber-melee none', ['POL', 'EDG', 'CLB', 'UNA', 'CYB'].map(c => H.defaultHands('melee', c)), [2, 1, 1, 0, 0]);
  t.is('a stored value wins — the one-handed crossbow', H.handsFor(w('projectile', 'LCB', { hands: 1 })), 1);
  t.is('…and 0 is a real value, not blank', H.handsFor(w('firearm', 'AsRf', { hands: 0 })), 0);
  t.is('a blank field reads the category default', H.handsFor(w('firearm', 'AsRf', { hands: null })), 2);

  /* ── What is in hand ───────────────────────────────────────────────────────── */
  const ready = i => ReadyWeapon.isReady(i);
  const rifle = w('firearm', 'AsRf'), pistol = w('firearm', 'HPist'), sword = w('melee', 'EDG'), holstered = w('firearm', 'HPist', { ready: false });
  t.eq('two hands, a rifle: full', H.usage([rifle], {}, ready).used, 2);
  t.ok('a rifle and a pistol ready is more than two hands — reported', H.usage([rifle, pistol], {}, ready).over);
  t.ok('…unless the GM gives a third hand', !H.usage([rifle, pistol], { extraHands: 1 }, ready).over);
  t.is('a holstered gun is not in hand', H.usage([holstered, sword], {}, ready).used, 1);
  t.is('fists take no hand', H.usage([w('melee', 'UNA')], {}, ready).used, 0);

  /* ── p.112: two guns, pistol or SMG class only ─────────────────────────────── */
  t.ok('a pistol with another ready pistol in the other hand', !!H.secondGun([pistol, w('firearm', 'SMG')], pistol, ready));
  t.ok('…not with the other one holstered', !H.secondGun([pistol, holstered], pistol, ready));
  t.ok('…and never a rifle, however many hands (the class whitelist, not free hands)', !H.secondGun([rifle, w('firearm', 'AsRf')], rifle, ready));
  t.eq('the whitelist is p.112\'s pistol and SMG classes', DUAL_WIELD_CATEGORIES, ['HOPist', 'LPist', 'MPist', 'HPist', 'VHP', 'MaPist', 'SMG']);

  const smartPistol = w('firearm', 'HPist', { accessories: 'Smartgun, Laser' });
  const actor = items => ({ items });
  const one = guessGearModifiers(actor([smartPistol, { id: 's', name: 'Smartlink', type: 'cyberware', system: {} }]), smartPistol);
  t.ok('one gun: smartlink and laser guessed, no second firearm', one.smartlink && one.laserSight && !one.secondFirearm);
  const two = guessGearModifiers(actor([smartPistol, w('firearm', 'LPist'), { id: 's', name: 'Smartlink', type: 'cyberware', system: {} }]), smartPistol);
  t.ok('a gun in each hand: +2 guessed, and smartlink, goggles and laser withdrawn ("negates", p.112)',
    two.secondFirearm && !two.smartlink && !two.smartGoggles && !two.laserSight);

  /* ── Data and wiring ──────────────────────────────────────────────────────── */
  const model = read('scripts/data/ItemDataModels.js');
  t.is('`hands` (nullable) on the four weapon models', (model.match(/hands:\s+new NumberField\(\{ integer: true, nullable: true, initial: null, min: 0, max: 2 \}\)/g) ?? []).length, 4);
  t.is('`extraHands` on characters and NPCs', (read('scripts/data/ActorDataModels.js').match(/extraHands:\s+new NumberField/g) ?? []).length, 2);
  t.ok('the second-firearm row renders now, in the guessed Gear group',
    /key: 'secondFirearm',\s+label: 'Using a second firearm',\s+mod: \+2,\s+mvp: true,\s+group: 'gear', gear: true/.test(read('scripts/SR3ECombatModifiers.js')));
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the Weapons tab says what is in hand, and the extra-hands box is the GM\'s',
    /\$\{this\._handsLine\(actor\)\}/.test(sheet) && /gm \? 'name="system\.extraHands"' : 'disabled'/.test(sheet));
  t.is('the item sheet has a Hands box on all four weapon types', (read('scripts/sheets/SR3EItemSheet.js').match(/this\._f\('Hands', 'hands'/g) ?? []).length, 4);

  // Every shipped weapon in the item packs carries its hands (tools/fill-weapon-hands.mjs).
  const src = new URL('../packs-src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  let weapons = 0; const blank = [];
  for (const p of readdirSync(src).filter(p => /-(firearms|melee|projectiles)$/.test(p))) {
    for (const f of readdirSync(join(src, p))) {
      const g = JSON.parse(readFileSync(join(src, p, f), 'utf8'));
      if (!['firearm', 'melee', 'projectile', 'thrown'].includes(g.doc?.type)) continue;
      weapons++;
      if (g.doc.system?.hands === null || g.doc.system?.hands === undefined) blank.push(`${p}/${g.doc.name}`);
    }
  }
  // 293 with the SR2 packs parked in archive/sr2/ (2026-09-24); 397 after the fan archive removed 115 firearms, 3 melee and 2 projectiles.
  t.ok('the weapon packs were found', weapons > 250, `${weapons}`);
  t.eq('…and every shipped weapon stores its hands', blank.slice(0, 5), []);
}
