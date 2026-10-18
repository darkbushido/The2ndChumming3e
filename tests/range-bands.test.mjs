/**
 * Bow/crossbow range from the weapon's Strength Minimum, assault-cannon bands and recoil, minimum range.
 * SR3 p.110, p.111, p.118.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { RangeBands } = await import('../scripts/data/range-bands.mjs');
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'range-bands';

export async function run(t) {
  /* ── Bows and crossbows: the WEAPON's Strength Minimum, not the archer's ── */
  t.is('a Str Min 5 bow, archer Str 2: short range is 5 m', RangeBands.rangeStrength('Bow', 5, 2), 5);
  t.is('…an archer of Str 9 does not stretch it', RangeBands.rangeStrength('Bow', 5, 9), 5);
  t.is('a crossbow with no minimum entered uses its type: Light 3', RangeBands.rangeStrength('LCB', 0, 8), 3);
  t.is('…Medium 4', RangeBands.rangeStrength('MCB', 0, 8), 4);
  t.is('…Heavy 5', RangeBands.rangeStrength('HCB', 0, 8), 5);
  t.is('a crossbow with its own minimum (pistol crossbow, 2) uses that', RangeBands.rangeStrength('LCB', 2, 8), 2);
  t.is('a bow with no minimum entered falls back to the archer', RangeBands.rangeStrength('Bow', 0, 4), 4);
  t.is('thrown weapons keep the thrower\'s Strength (SR3 p.118)', RangeBands.rangeStrength('TK', 7, 4), 4);
  t.is('shuriken likewise', RangeBands.rangeStrength('SH', 3, 6), 6);

  const bow = (category, strMin) => ({ system: { category, strMin, rangeOverride: '' }, _getRangeBands: SR3EItem.prototype._getRangeBands });
  const archer = { system: { attributes: { strength: { value: 2 } } } };
  t.eq('_getRangeBands: Str Min 5 bow = 5/50/150/300 whatever the archer\'s Strength',
    bow('Bow', 5)._getRangeBands(archer), [5, 50, 150, 300]);
  t.eq('_getRangeBands: Medium Crossbow (Str Min 4) = 12/48/120/200',
    bow('MCB', 4)._getRangeBands(archer), [12, 48, 120, 200]);
  t.eq('_getRangeBands: a thrown knife still scales with the thrower (Str 2)',
    bow('TK', 0)._getRangeBands(archer), [2, 4, 6, 10]);

  /* ── Assault cannon · SR3 p.111, p.111 recoil ── */
  t.eq('Assault Cannon bands 0-100 / 101-300 / 301-900 / 901-2,400', SR3E.weaponRanges.ACan, [100, 300, 900, 2400]);
  t.ok('the assault cannon is a Heavy Weapon for recoil', RangeBands.isHeavyWeapon('ACan'));
  t.ok('so are the LMG, MMG, HMG', ['LMG', 'MMG', 'HMG'].every(c => RangeBands.isHeavyWeapon(c)));
  t.ok('a rifle is not', !RangeBands.isHeavyWeapon('AsRf'));
  t.is('assault cannon recoil doubles uncompensated recoil (10 rounds, 6 comp = +8)',
    SR3EItem.recoilTN({ mode: 'FA', roundsBefore: 0, roundsThisShot: 10, totalComp: 6, isHeavy: RangeBands.isHeavyWeapon('ACan') }), 8);
  t.is('the shipped assault cannon\'s skill is Heavy Weapons', SR3EItem.WEAPON_SKILL_MAP.ACan.skill, 'Heavy Weapons');

  /* ── Minimum range · SR3 p.111 asterisk ── */
  t.is('grenade launcher minimum 5 m', RangeBands.minimumRange('GrLn'), 5);
  t.is('missile launcher minimum 20 m', RangeBands.minimumRange('MisLn'), 20);
  t.is('a rifle has none', RangeBands.minimumRange('AsRf'), 0);
  t.ok('a missile at 12 m warns', /closer than 20 m/.test(RangeBands.minimumRangeWarning('MisLn', 12)));
  t.is('at exactly the minimum, no warning', RangeBands.minimumRangeWarning('MisLn', 20), '');
  t.is('a rifle at point blank, no warning', RangeBands.minimumRangeWarning('AsRf', 1), '');
  t.is('unknown distance, no warning', RangeBands.minimumRangeWarning('GrLn', null), '');

  const src = readFileSync(new URL('../scripts/documents/SR3EItem.js', import.meta.url), 'utf8');
  t.ok('rollWeapon warns of a minimum-range shot and shows it in the TN breakdown',
    /RangeBands\.minimumRangeWarning\(/.test(src) && /tnBreakdownParts\.push\(`⚠ \$\{minRangeWarning\}`\)/.test(src));
  t.ok("_getRangeBands reads the weapon's Strength Minimum via RangeBands.rangeStrength",
    /RangeBands\.rangeStrength\(cat, this\.system\.strMin/.test(src));
}
