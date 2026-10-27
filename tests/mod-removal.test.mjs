/**
 * Taking a gas vent off — the gunsmith's test · TODO 277 (the maintainer's ruling, 2026-10-27).
 *
 * *"removable at a gunsmith's test, time and labour. players can be the gunsmith. gas vent is destroyed if the test is
 * successful. barrel is destroyed on failure and gun needs to be repaired."* — the test from CC p.81 (Weapon B/R (5), base
 * 24 hours), time base ÷ successes and labour 100/50/25¥ an hour (CC p.79).
 */
import { readFileSync } from 'node:fs';
import { ModRemoval, CONTACT_RATES } from '../scripts/data/mod-removal.mjs';

export const name = 'mod-removal';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const vent = { type: 'gear', name: 'Gas Vent (Weapon) [3]', system: { category: 'Firearms Accessories', rating: 3 } };
  t.eq('a gas vent is permanent: Weapon B/R (5), base 24 hours (CC p.81)', ModRemoval.rule(vent), { tn: 5, baseHours: 24, page: 'SR3 p.281; CC p.81' });
  t.eq('…its old roman name too', ModRemoval.rule({ ...vent, name: 'Gas Vent II (Weapon)' })?.tn, 5);
  t.is('a laser sight comes off freely', ModRemoval.rule({ type: 'gear', name: 'Laser Sight (Weapon)', system: { category: 'Firearms Accessories' } }), null);

  t.eq('one success: off, the vent destroyed; 24 h', ModRemoval.outcome(1, 24), { removed: true, barrelDestroyed: false, hours: 24 });
  t.eq('three successes: a third of the time', ModRemoval.outcome(3, 24), { removed: true, barrelDestroyed: false, hours: 8 });
  t.eq('no successes: the barrel is destroyed — and the vent with it (the maintainer, 2026-10-27)', ModRemoval.outcome(0, 24), { removed: true, barrelDestroyed: true, hours: 24 });
  t.is('the repair costs the same as a barrel extension — not read from the book yet, so null (asked at ✔ Repaired)', ModRemoval.repairCost('barrel'), null);
  t.is('…an unknown part: null', ModRemoval.repairCost('stock'), null);
  t.is('time to a tenth (24 ÷ 7)', ModRemoval.hours(24, 7), 3.4);
  t.eq('contact rates by Level (CC p.79)', CONTACT_RATES, { 1: 100, 2: 50, 3: 25 });
  t.is('labour: 50¥ × 8 h', ModRemoval.labour(50, 8), 400);
  t.is('a player character doing it: nothing', ModRemoval.labour(0, 24), 0);
  t.eq('the B/R skill follows the gun', ['HPist', 'SMG', 'AsRf', 'Snip', 'ShtG', 'LMG', 'xyz'].map(c => ModRemoval.skillFor({ system: { category: c } })),
    ['Pistols B/R', 'Submachine Guns B/R', 'Assault Rifles B/R', 'Rifles B/R', 'Shotguns B/R', 'Heavy Weapons B/R', '']);
  t.eq('a failed removal\'s record is read off the gun', ModRemoval.needsRepair({ flags: { The2ndChumming3e: { needsRepair: { reason: 'Barrel destroyed' } } } }), { reason: 'Barrel destroyed' });
  t.is('…no record: null', ModRemoval.needsRepair({ flags: {} }), null);

  /* ── The Foundry side (source-level) ───────────────────────────────────────── */
  const glue = read('scripts/SR3EItemMods.js');
  t.ok('⏏ on a permanent mod goes to the gunsmith instead of the inventory', /if \(ModRemoval\.rule\(mod\)\) return SR3EItemMods\.gunsmith\(host, modId\);/.test(glue));
  t.ok('any live character can be the gunsmith — a player\'s too', /const smiths = game\.sr3e\.sceneFirst\(game\.actors\.filter\(a => \(a\.type === 'character' \|\| a\.type === 'npc'\) && game\.sr3e\.isLiveActor\(a\)\)\)/.test(glue));
  t.ok('the roll goes through rollPool with the modRemoval follow-up (explosion-safe)', /smith\.rollPool\([\s\S]{0,200}followUp: \{ kind: 'modRemoval'/.test(glue));
  t.ok('the vent is removed either way and nothing returns to the inventory', /else \{\s*\/\/ The vent is gone either way[^\n]*\n\s*if \(host\.isOwner\) await host\.update\(\{ 'system\.installed': ItemMods\.uninstall\(ItemMods\.installed\(host\), ctx\.modId\)\.installed \}\);/.test(glue)
    && !/removalRolled[\s\S]*createEmbeddedDocuments/.test(glue.slice(glue.indexOf('async removalRolled'), glue.indexOf('/** Open mod'))));
  t.ok('failure marks the gun as needing repair', /setFlag\('The2ndChumming3e', 'needsRepair', \{ part: 'barrel', reason: `Barrel destroyed/.test(glue));
  t.ok('labour is stated, never deducted', /not deducted/.test(glue) && !/nuyen/.test(glue.slice(glue.indexOf('async removalRolled'), glue.indexOf('/** Open mod'))));
  t.ok('the follow-up is registered', /modRemoval:\s+\['SR3EItemMods', 'removalRolled'\]/.test(read('scripts/documents/SR3EActor.js')));
  t.ok('firing a gun that needs repair warns, never refuses', /const repair = ModRemoval\.needsRepair\(this\);\s*if \(repair\) ui\.notifications\.warn/.test(read('scripts/documents/SR3EItem.js')));
  t.ok('the gun\'s sheet clears it with ✔ Repaired, which asks the cost', /sr-mod-repaired'\)\?\.addEventListener\('click', \(\) => SR3EItemMods\.repaired\(item\)\)/.test(read('scripts/sheets/SR3EItemSheet.js'))
    && /async repaired\(gun\)[\s\S]{0,1500}unsetFlag\('The2ndChumming3e', 'needsRepair'\)[\s\S]{0,400}Not deducted/.test(glue));
  t.ok('the character sheet shows it on the gun\'s row', /SR3EActorSheet\.repairChip\(w\)/.test(read('scripts/sheets/SR3EActorSheet.js')));
}
