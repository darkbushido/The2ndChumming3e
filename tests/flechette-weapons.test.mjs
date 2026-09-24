/**
 * A weapon or grenade carrying flechette uses the flechette rules — TODO 156.
 *
 *   "Guns with flechette ammo already figured into their Damage Code have an (f) notation following
 *    the Damage Code."                                                              — SR3 p.116
 *   "Against unarmored targets, flechette rounds increase their Damage Codes by one level. …
 *    Against armored targets … use either double its Impact Armor Rating or its normal Ballistic
 *    Armor Rating, whichever is higher. … Dermal armor negates the Damage Level increase."  — p.116
 *   "AP grenades … Determine damage from AP grenades according to the flechette rules (p. 116)." — p.119
 *
 * So an `(f)` code already CONTAINS the level increase (armour rule only: `flechette-coded`), and the
 * checkbox on a plain code brings the whole set (`flechette`). Only when nothing else is loaded.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'flechette-weapons';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const fa = (system, loaded) => SR3EItem.flechetteAmmo(system, loaded);

  t.is('a plain code with no checkbox is untouched', fa({ damage: '10S' }, 'regular'), 'regular');
  t.is('the checkbox on a plain code brings the full flechette rules', fa({ damage: '10S', flechette: true }, 'regular'), 'flechette');
  t.is('an (f) code has the level increase built in: armour rule only', fa({ damage: '10S(f)' }, 'regular'), 'flechette-coded');
  t.is('…even with the checkbox ticked too (no double count)', fa({ damage: '10S(f)', flechette: true }, 'regular'), 'flechette-coded');
  t.is('10S/10D(f): the flag is on the second alternative — the gun is not flechette', fa({ damage: '10S/10D(f)' }, 'regular'), 'regular');
  t.is('8D(f)/8S: the first alternative is', fa({ damage: '8D(f)/8S' }, 'regular'), 'flechette-coded');
  t.is('a weapon with other ammo loaded keeps it (the book does not say how they combine)', fa({ damage: '10S(f)' }, 'gel'), 'gel');
  t.is('…including APDS', fa({ damage: '9S', flechette: true }, 'apds'), 'apds');
  t.is('no ammo argument reads as regular', fa({ damage: '9S', flechette: true }), 'flechette');
  t.is('a nothing item is untouched', fa(undefined, 'regular'), 'regular');

  // Wiring (source-level: the throw, the attack and the soak card need a live world).
  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the ranged attack carries it to the soak card', /options\.ammoType\s+= SR3EItem\.flechetteAmmo\(this\.system, ammoType\)/.test(item));
  t.ok('the grenade throw carries it too', /options\.ammoType\s+= SR3EItem\.flechetteAmmo\(this\.system\)/.test(item));
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('each grenade\'s soak button carries the ammo type', /ammoType:\s+state\.ammoType \?\? null,\s+\/\/ flechette rules for an AP grenade/.test(actor));
  t.ok('the soak card reads `flechette-coded` as flechette with the level already in the code',
    /payload\.ammoType === 'flechette-coded'\s*\?\s*\{ armorEffect: 'flechette', levelBaked: true \}/.test(actor));
  t.ok('…and does not raise the level again when it is baked in', /ammoRules\.levelBaked && \(Math\.max\(ballistic, impact\) <= 0\)/.test(actor));
  t.ok('…while armoured targets still get the p.116 armour rule', /flechetteArmor\(\{ ballistic, impact \}\)/.test(actor));
  t.ok('`flechette-coded` is not a registered ammunition type (it would appear in every ammo picker)', !('flechette-coded' in SR3E.ammoTypes));

  // The sheet and data model.
  const models = read('scripts/data/ItemDataModels.js');
  t.is('firearm, projectile and thrown items carry the checkbox', (models.match(/flechette:\s+new BooleanField/g) ?? []).length, 3);
  t.is('…and the sheet offers it on all three',
    (read('scripts/sheets/SR3EItemSheet.js').match(/'Flechette rules \(p\.116\)', 'flechette'/g) ?? []).length, 3);

  // Shipped data: every firearm/projectile/thrown whose FIRST alternative is (f) is ticked, and the
  // core AP grenades (a plain 10S, p.119) are ticked too.
  const root = new URL('../packs-src/', import.meta.url);
  const unticked = [], ap = [];
  for (const dir of readdirSync(root)) {
    for (const f of readdirSync(new URL(`${dir}/`, root)).filter(f => f.endsWith('.json'))) {
      const d = JSON.parse(readFileSync(new URL(`${dir}/${f}`, root), 'utf8')).doc;
      if (!d || !['firearm', 'projectile', 'thrown'].includes(d.type)) continue;
      if (SR3EItem.parseDamageCode(d.system.damage)?.flechette && d.system.flechette !== true) unticked.push(`${dir}/${f}`);
      if (d.system.bookPage === 'sr3.283' && /AP Grenade/.test(d.name)) ap.push(d.system.flechette === true);
    }
  }
  t.is('every shipped weapon with an (f) code has the box ticked', unticked.join(), '');
  t.eq('both core AP grenades (Offensive, Defensive) are ticked', ap, [true, true]);

  const tool = fileURLToPath(new URL('../tools/fill-flechette-flag.mjs', import.meta.url));
  t.is('fill-flechette-flag --check is clean', spawnSync(process.execPath, [tool, '--check'], { encoding: 'utf8' }).status, 0);
}
