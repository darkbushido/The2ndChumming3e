/**
 * Adept powers above Magic · SR3 p.168: "An adept cannot have more levels in a power than the adept's Magic
 * Attribute… an adept with Magic 4 cannot have more than 4 points worth of powers, none of which can have more
 * than four levels." The level is read from wherever it is stored (the 0.7.0 rules check found fixed-level
 * powers, whose level is in the NAME, were never checked).
 */
import { readFileSync } from 'node:fs';
const { AdeptLevels } = await import('../scripts/data/adept-levels.mjs');

export const name = 'adept-levels';

export async function run(t) {
  t.is('a levelled power reads system.level', AdeptLevels.levelOf('Mystic Armor*', { hasLevels: true, level: 3 }), 3);
  t.is('Improved Reflexes Level 3 carries its level in the name', AdeptLevels.levelOf('Imp. Reflexes Level 3', { hasLevels: false, level: 1 }), 3);
  t.is('Combat Sense +2', AdeptLevels.levelOf('Combat Sense +2', { hasLevels: false, level: 1 }), 2);
  t.is('Kinesics Level 3 / Delay Damage 2 / Flexibility 1',
    ['Kinesics Level 3', 'Delay Damage 2', 'Flexibility 1'].map(n => AdeptLevels.levelOf(n, { hasLevels: false })).join('/'), '3/2/1');
  t.is('a power with no level in its name is level 1', AdeptLevels.levelOf('Imp. Sense: Thermo Vision', { hasLevels: false }), 1);
  t.is('a magnification is not a level', AdeptLevels.levelOf('Imp. Sense: Vision Mag 3', { hasLevels: false }), 1);
  t.is('a levelled power ignores a trailing number in its name', AdeptLevels.levelOf('Imp. Phys. Attr.(BOD)>RACMOD*  1', { hasLevels: true, level: 2 }), 2);

  const powers = [
    { name: 'Imp. Reflexes Level 3', system: { hasLevels: false, level: 1 } },
    { name: 'Combat Sense +1', system: { hasLevels: false, level: 1 } },
    { name: 'Attribute Boost(STR)*', system: { hasLevels: true, level: 4 } },
    { name: 'Imp. Sense: Vision Mag 3', system: { hasLevels: false, level: 1 } },
  ];
  t.eq('Magic 2: Improved Reflexes 3 and Attribute Boost 4 are above Magic (the first cut flagged neither)',
    AdeptLevels.overMagic(powers, 2).map(o => `${o.name}:${o.level}`), ['Imp. Reflexes Level 3:3', 'Attribute Boost(STR)*:4']);
  t.eq('Magic 3: only Attribute Boost 4', AdeptLevels.overMagic(powers, 3).map(o => o.name), ['Attribute Boost(STR)*']);
  t.eq('Magic 4: nothing — a level equal to Magic is allowed', AdeptLevels.overMagic(powers, 4), []);
  t.eq('no powers, no warning', AdeptLevels.overMagic([], 0), []);

  const src = readFileSync(new URL('../scripts/documents/SR3EActor.js', import.meta.url), 'utf8');
  t.ok('the actor derivation reads every power through AdeptLevels.levelOf, not only hasLevels ones',
    /AdeptLevels\.levelOf\(item\.name, s\)/.test(src) && !/s\.hasLevels && lvl > magicForCaps/.test(src));
  const at = src.indexOf('AdeptLevels.levelOf(item.name, s)');
  const cont = src.indexOf("if (kind === 'attributeBoost') {", at);
  t.ok('…and before the Attribute Boost `continue`, which skipped the check', at > 0 && cont > at);
}
