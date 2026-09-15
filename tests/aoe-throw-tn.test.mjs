/**
 * A wounded character throws a grenade at a wounded TN — found 2026-09-14, fixed on main.
 *
 * Wound modifiers apply to every test (SR3 p.126). The single-target weapon path pre-applies the
 * wound in its roll-options TN and then tells `rollPool` to skip it (`skipWoundMod`), so it is
 * counted once. The grenade path copied the skip and never did the pre-application: its dialog
 * built the TN as 4 + range alone, so a Serious wound never touched a throw. Layered armour
 * (SR3 p.285, Quickness-linked skills) was missing from it the same way.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'aoe-throw-tn';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const pre = o => SR3EItem.throwPreTN(o);
  t.is('unhurt, unlayered → +0', pre({}).mod, 0);
  t.is('Moderate wound (−2) → +2 on the throw', pre({ woundMod: -2 }).mod, 2);
  t.is('Serious (−3) → +3', pre({ woundMod: -3 }).mod, 3);
  t.is('woundMod is NEGATIVE — a stray positive never LOWERS the TN', pre({ woundMod: 2 }).mod, 0);
  t.is('layered armour adds on top (p.285)', pre({ woundMod: -1, armorQTN: 2 }).mod, 3);
  t.is('…and the dialog is told why', pre({ woundMod: -1, armorQTN: 2 }).parts.join(', '), 'Wound +1, Layered armour +2');
  t.is('nothing to say when nothing applies', pre({}).parts.length, 0);

  const item = read('scripts/documents/SR3EItem.js');
  const aoe  = item.slice(item.indexOf('_promptWeaponRollOptionsAoE(rawDamage, actor, {'), item.indexOf('// ── Single-target path'));
  const dlg  = item.slice(item.indexOf('static async _promptWeaponRollOptionsAoE'), item.indexOf('static async _promptWeaponRollOptions('));

  t.ok('the throw builds the pre-applied TN from the thrower\'s wound', /throwPreTN\(\{\s*woundMod:\s*actor\.system\.woundMod/.test(item));
  t.ok('…and hands it to the grenade dialog', /_promptWeaponRollOptionsAoE\(rawDamage, actor, \{ throwDistance, pre \}\)/.test(item));
  t.ok('…which starts its TN from it', /const baseTN\s+= 4 \+ pre\.mod/.test(dlg) && /defaultTN = baseTN \+/.test(dlg));
  t.ok('…and keeps it when the grenade type changes the range band', /tnIn\.value = baseTN \+ b\.tnMod/.test(dlg) && !/tnIn\.value = 4 \+/.test(dlg));
  t.ok('the roll still skips rollPool\'s wound modifier — counted once, not twice', /options\.skipWoundMod\s+= true/.test(aoe));
}
