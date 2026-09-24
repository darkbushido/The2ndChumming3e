/**
 * Which skill a thrown grenade (TODO 148), bow or crossbow (TODO 157) rolls.
 *
 * SR3 p.86: "Throwing Weapons governs the use of any item thrown by the user." Its
 * specialisations include "grenades". The category map had no entry for GR (or any thrown
 * category), so `_getWeaponSkill` fell through to 'Firearms' and the throw asked for a firearm
 * skill. A grenade LAUNCHER (GrLn) is a firearm and keeps Launch Weapons.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'grenade-skill';

export async function run(t) {
  const skill = (code, type = 'projectile') => SR3EItem.weaponSkillFor(code, type);

  t.is('a thrown grenade (GR) rolls Throwing Weapons', skill('GR'), 'Throwing Weapons');
  t.is('throwing knife, shuriken, bolas too', [skill('TK'), skill('SH'), skill('BOL')].join(), 'Throwing Weapons,Throwing Weapons,Throwing Weapons');
  t.is('a projectile of category `other` that is thrown (Smoke IR) is still Throwing Weapons', skill('other'), 'Throwing Weapons');
  t.is('a `thrown`-type item with no category is Throwing Weapons', skill('', 'thrown'), 'Throwing Weapons');
  t.is('a grenade LAUNCHER keeps Launch Weapons (SR3 p.86)', skill('GrLn', 'firearm'), 'Launch Weapons');
  t.is('pistols are untouched', skill('HPist', 'firearm'), 'Pistols');
  t.is('every thrown category names a throwing skill',
    SR3E.thrownCategories.filter(c => skill(c) !== 'Throwing Weapons').join(), '');

  // TODO 157 — SR3 p.86: "Projectile Weapons governs the use of muscle-powered projectile weapons."
  t.is('a bow rolls Projectile Weapons', skill('Bow'), 'Projectile Weapons');
  t.is('every bow/crossbow/sling category names it',
    SR3E.bowCategories.filter(c => skill(c) !== 'Projectile Weapons').join(), '');
  t.is('…and is not mistaken for a throwing skill', skill('LCB'), 'Projectile Weapons');

  // Every shipped grenade and thrown weapon agrees with its own `skill` field.
  const root = new URL('../packs-src/', import.meta.url);
  const bad = [];
  for (const dir of readdirSync(root).filter(d => d.includes('projectiles'))) {
    for (const f of readdirSync(new URL(`${dir}/`, root)).filter(f => f.endsWith('.json'))) {
      const s = JSON.parse(readFileSync(new URL(`${dir}/${f}`, root), 'utf8')).doc?.system;
      if (s?.category === 'GR' && skill('GR') !== 'Throwing Weapons') bad.push(f);
      if (s?.category === 'GR' && s.skill && s.skill !== 'Throwing Weapons') bad.push(`${f} (skill field ${s.skill})`);
    }
  }
  t.is('every shipped GR item names Throwing Weapons', bad.join(), '');
}
