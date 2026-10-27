/**
 * Mods installed inside an item — `scripts/data/item-mods.mjs` · TODO 276.
 *
 * mod ──► host ──► actor: a host's effective value is its own modifiers plus its installed mods'; a host passes the
 * `toActor` targets up only when it should (installed cyberware, worn armour, carried gear — never a weapon, never
 * anything in Storage). Warn, never refuse: a mod for something else, or a mount already taken (SR3 p.280).
 */
import { ItemMods, TARGETS, MAX_DEPTH } from '../scripts/data/item-mods.mjs';
import { WeaponAccessories } from '../scripts/data/weapon-accessories.mjs';
import { readFileSync } from 'node:fs';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export const name = 'item-mods';

const mod = (name, modifiers = [], extra = {}) => ({ _id: `id-${name}`, name, type: 'gear', system: { modifiers, ...extra } });
const gun = (installed = [], modifiers = []) => ({ name: 'Ares Predator', type: 'firearm', system: { installed, modifiers } });

export async function run(t) {
  /* ── The vocabulary ─────────────────────────────────────────────────────────── */
  t.ok('every target says how it combines', Object.values(TARGETS).every(x => ['add', 'max', 'any'].includes(x.combine)));
  t.ok('…and where the book says so', Object.values(TARGETS).every(x => /p\.\d+/.test(x.page)));
  t.ok('vision climbs to the actor; a gun\'s RC does not', TARGETS.thermo.toActor && !TARGETS.rc.toActor);

  /* ── Effective values on the host ───────────────────────────────────────────── */
  const vent = mod('Gas Vent II', [{ target: 'rc', value: 2 }]);
  const pads = mod('Shock Pads', [{ target: 'rc', value: 1 }]);
  t.is('a gun with nothing installed has no RC from mods', ItemMods.value(gun(), 'rc'), 0);
  t.is('Gas Vent II: RC 2', ItemMods.value(gun([vent]), 'rc'), 2);
  t.is('RC adds: vent 2 + shock pads 1 = 3', ItemMods.value(gun([vent, pads]), 'rc'), 3);
  t.is('the host\'s own modifier counts too (built in)', ItemMods.value(gun([vent], [{ target: 'rc', value: 1 }]), 'rc'), 3);
  t.eq('the parts name each source; null is the item itself',
    ItemMods.effective(gun([vent], [{ target: 'rc', value: 1 }])).rc.parts, [{ source: null, value: 1 }, { source: 'Gas Vent II', value: 2 }]);
  t.is('describe(): one line for the tooltip', ItemMods.describe('rc', ItemMods.effective(gun([vent, pads])).rc), 'RC 3: Gas Vent II +2, Shock Pads +1');
  t.is('an on/off feature: a smartgun installed', ItemMods.value(gun([mod('Smartgun, external', [{ target: 'smartgun', value: 1 }])]), 'smartgun'), 1);
  t.is('…two of them are still one smartgun', ItemMods.value(gun([mod('A', [{ target: 'smartgun', value: 1 }]), mod('B', [{ target: 'smartgun', value: 1 }])]), 'smartgun'), 1);
  t.is('…a 0 does not switch it on', ItemMods.value(gun([mod('A', [{ target: 'smartgun', value: 0 }])]), 'smartgun'), 0);
  t.is('a target outside the vocabulary combines to 0', ItemMods.combine('nope', [5]), 0);
  t.eq('unknown targets are dropped, never guessed', ItemMods.modifiersOf(mod('X', [{ target: 'bogus', value: 9 }, { target: 'rc', value: '2' }])), [{ target: 'rc', value: 2 }]);
  t.eq('no system.installed / modifiers at all (a copy from before the fields): empty, not a throw', [ItemMods.installed({}), ItemMods.effective({ system: {} })], [[], {}]);

  // Nesting: a turret holding a gun holding a scope; capped so a cycle can never loop.
  const deep = { name: 'L0', system: { modifiers: [{ target: 'rc', value: 1 }], installed: [] } };
  let cur = deep;
  for (let i = 1; i <= MAX_DEPTH + 2; i++) { const next = { name: `L${i}`, system: { modifiers: [{ target: 'rc', value: 1 }], installed: [] } }; cur.system.installed.push(next); cur = next; }
  t.is(`nesting counts ${MAX_DEPTH} levels below the host and stops`, ItemMods.value(deep, 'rc'), MAX_DEPTH + 1);

  /* ── The readers: smartgun / laser sight (WeaponAccessories.flag) ───────────── */
  const smart = mod('Smartgun, external', [{ target: 'smartgun', value: 1 }]);
  t.ok('an installed external smartgun makes the gun smart', WeaponAccessories.flag(gun([smart]), 'smartgun'));
  t.ok('…even when the gun\'s own field says false (the mod was added later)', WeaponAccessories.flag({ ...gun([smart]), system: { installed: [smart], smartgun: false } }, 'smartgun'));
  t.ok('…but not a laser sight', !WeaponAccessories.flag({ ...gun([smart]), system: { installed: [smart], laserSight: false } }, 'laserSight'));
  t.ok('no mod: the stored field still answers', WeaponAccessories.flag({ system: { smartgun: true } }, 'smartgun') && !WeaponAccessories.flag({ system: { smartgun: false, accessories: 'Smartlink' } }, 'smartgun'));
  t.ok('no mod, no field: the text still answers', WeaponAccessories.flag({ system: { smartgun: null, accessories: 'Laser Sight' } }, 'laserSight'));

  /* ── What reaches the actor ─────────────────────────────────────────────────── */
  const eyes = { name: 'Cybereyes', type: 'cyberware', system: { installed: [mod('Thermographic Vision', [{ target: 'thermo', value: 1 }])] } };
  const totals = ItemMods.actorTotals([eyes]);
  t.is('a cybereye with thermographic installed gives the actor thermo', totals.thermo?.value, 1);
  t.eq('…and says where it came from', totals.thermo?.parts, [{ source: 'Cybereyes', via: 'Thermographic Vision', value: 1 }]);
  t.ok('a stand-alone implant with its own modifier works the same', ItemMods.actorTotals([{ name: 'Low-Light', type: 'cyberware', system: { modifiers: [{ target: 'lowLight', value: 1 }] } }]).lowLight?.value === 1);
  t.ok('stored cyberware gives nothing', !ItemMods.actorTotals([{ ...eyes, flags: { The2ndChumming3e: { stored: true } } }]).thermo);
  const goggles = { name: 'Helmet', type: 'armor', system: { worn: false, installed: [mod('Thermo Vision (Armor)', [{ target: 'thermo', value: 1 }])] } };
  t.ok('armour passes nothing while not worn…', !ItemMods.actorTotals([goggles]).thermo);
  t.ok('…and passes it while worn', ItemMods.actorTotals([{ ...goggles, system: { ...goggles.system, worn: true } }]).thermo?.value === 1);
  t.ok('a weapon never passes anything up — not even a vision target', !ItemMods.actorTotals([gun([mod('Thermal scope', [{ target: 'thermo', value: 1 }])])]).thermo);
  t.ok('a gun\'s RC never reaches the actor', !ItemMods.actorTotals([{ name: 'X', type: 'cyberware', system: { modifiers: [{ target: 'rc', value: 2 }] } }]).rc);

  /* ── Installing ─────────────────────────────────────────────────────────────── */
  let n = 0;
  const newId = () => `new${++n}`;
  const fromPack = { _id: 'abc', name: 'Gas Vent II (Weapon)', type: 'gear', _stats: { compendiumSource: 'x' }, folder: 'f', sort: 5, ownership: {}, system: { rating: 2 }, flags: { The2ndChumming3e: { stored: true } } };
  const one = ItemMods.install([], fromPack, newId);
  t.eq('install keeps the data, drops the scaffolding', Object.keys(one[0]).sort(), ['_id', 'flags', 'name', 'system', 'type']);
  t.is('…keeps its id when free', one[0]._id, 'abc');
  t.ok('…clears the Storage flag (a mod in a gun is not in the stash)', one[0].flags.The2ndChumming3e.stored === undefined);
  t.ok('…never mutates what it was given', fromPack._stats && fromPack.flags.The2ndChumming3e.stored === true);
  const two = ItemMods.install(one, fromPack, newId);
  t.eq('the same item twice gets a fresh id', two.map(m => m._id), ['abc', 'new1']);
  const out = ItemMods.uninstall(two, 'abc');
  t.eq('uninstall returns the rest and the mod', [out.installed.map(m => m._id), out.mod?.name], [['new1'], 'Gas Vent II (Weapon)']);
  t.is('uninstalling an id that is not there returns null', ItemMods.uninstall(two, 'zzz').mod, null);
  const edited = ItemMods.replace(two, 'new1', { _id: 'other', name: 'Gas Vent III', system: { rating: 3 } });
  t.eq('replace swaps the data and keeps the id', [edited[1]._id, edited[1].name, edited[0].name], ['new1', 'Gas Vent III', 'Gas Vent II (Weapon)']);

  /* ── Warnings — never a refusal ─────────────────────────────────────────────── */
  const scope = mod('Imaging Scope', [], { description: '<p><strong>Mount:</strong> Top</p>', modFor: 'weapon' });
  const laser = mod('Laser Sight', [], { description: '<p><strong>Mount:</strong> Top/Under</p>', modFor: 'weapon' });
  const sil   = mod('Silencer', [], { description: '<p><strong>Mount:</strong> Barrel</p>', modFor: 'weapon' });
  t.eq('mountsOf reads the description', [ItemMods.mountsOf(scope), ItemMods.mountsOf(laser), ItemMods.mountsOf(mod('Bipod', [], { description: 'Mount:</strong> Tripod' }))], [['Top'], ['Top', 'Under'], []]);
  t.eq('…a mount field wins over the text', ItemMods.mountsOf(mod('X', [], { mount: 'Barrel', description: 'Mount:</strong> Top' })), ['Barrel']);
  t.eq('an either-or laser goes under when the scope is on top', ItemMods.mountsInUse([laser, scope]), { Top: 'Imaging Scope', Under: 'Laser Sight' });
  t.eq('assignMounts goes by id — two of the same scope: the second holds no mount',
    ItemMods.assignMounts([scope, { ...scope, _id: 'x2' }]).map(m => [m.id, m.mount]), [['id-Imaging Scope', 'Top'], ['x2', '']]);
  t.eq('a free mount: no warning', ItemMods.warnings(gun([scope]), sil), []);
  t.eq('the top mount taken', ItemMods.warnings(gun([scope]), mod('Scope 2', [], { description: 'Mount:</strong> Top' })),
    ['The top mount already holds Imaging Scope (SR3 p.280: one accessory per mount).']);
  t.eq('a Top/Under laser fits under a scope — no warning', ItemMods.warnings(gun([scope]), laser), []);
  t.is('…but not when both are taken', ItemMods.warnings(gun([scope, laser]), laser).length, 1);
  const chemseal = mod('Chemical Seal (Armor)', [], { modFor: 'armor' });
  t.eq('an armour mod in a gun is warned about', ItemMods.warnings(gun(), chemseal), ['Chemical Seal (Armor) is a mod for armour, not a weapon.']);
  t.eq('an untagged mod (a cybereye option) warns about nothing', ItemMods.warnings({ type: 'cyberware', name: 'Cybereyes', system: {} }, mod('Thermographic Vision')), []);
  t.eq('a cyberlimb mod in a cyberlimb is right', ItemMods.warnings({ type: 'cyberware', name: 'Cyberarm', system: { cyberwareCategory: 'Cyberlimbs' } }, mod('Gyromount', [], { modFor: 'cyberlimb' })), []);
  t.ok('an item that takes no mods says so', ItemMods.warnings({ type: 'spell', name: 'Fireball' }, vent).some(w => /does not take mods/.test(w)));

  /* ── Source-level: the Foundry side (sheets cannot be imported without Foundry) ── */
  const models = read('scripts/data/ItemDataModels.js');
  // The class body: from its `export class` line to the next one.
  const body = cls => { const i = models.indexOf(`export class ${cls} `); return models.slice(i, models.indexOf('\nexport class', i + 1)); };
  const declares = (cls, field) => new RegExp(`\\b${field}:\\s+${field}Field\\(\\)`).test(body(cls));
  for (const cls of ['MeleeData', 'FirearmData', 'ArmorData', 'CyberwareData']) t.ok(`${cls} holds mods (installed) and has changes (modifiers)`, declares(cls, 'installed') && declares(cls, 'modifiers'));
  for (const cls of ['GearData', 'BiowareData', 'VehicleModData']) t.ok(`${cls} has changes (modifiers)`, declares(cls, 'modifiers'));
  t.ok('…and HOST_TYPES matches the types that declare installed', ItemMods.HOST_TYPES.join() === 'firearm,melee,armor,cyberware');
  t.ok('cyberware keeps its upstream `mods` string — the list is not called mods', /mods:\s+new StringField/.test(models) && !/\bmods:\s+installedField/.test(models));

  const glue = read('scripts/SR3EItemMods.js');
  t.ok('a mod opened from its host is a temporary item whose update writes into the host',
    /tmp\.update = async[\s\S]{0,300}host\.update\(\{ 'system\.installed': ItemMods\.replace/.test(glue));
  t.ok('…and it knows its host (the sheet reads _sr3eHost)', /tmp\._sr3eHost = host/.test(glue));
  t.ok('install moves a mod from the host\'s own actor, never deletes another actor\'s item',
    /source\.parent === host\.parent && source\.id !== host\.id\) await source\.delete\(\)/.test(glue));
  t.ok('install warns, never refuses: warnings go to notifications and the install goes ahead',
    /for \(const w of \[\.\.\.ItemMods\.warnings\(host, source\), \.\.\.ArmorMods\.installWarnings\(host, source\.toObject\(\)\)\]\) ui\.notifications\.warn\(w\);\s*const installed = ItemMods\.install/.test(glue));

  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('the item sheet sends a temporary mod\'s form to its own update, not core\'s submit',
    /_processSubmitData\(event, form, submitData, options\) \{\s*if \(this\.document\._sr3eHost\) return this\.document\.update\(submitData\);/.test(sheet));
  t.ok('…and is editable by whoever owns the host', /get isEditable\(\) \{\s*const host = this\.document\._sr3eHost;\s*return host \? host\.isOwner/.test(sheet));
  t.ok('the Installed mods and Changes sections are on the sheet', /\$\{this\._modsSection\(\)\}/.test(sheet) && /\$\{this\._modifiersSection\(\)\}/.test(sheet));
  t.ok('…wired before the isEditable bail-out, so ✎ works on a read-only sheet', /_onRender\(_context, _options\) \{\s*this\._wireMods\(this\.element\);\s*if \(!this\.isEditable\) return;/.test(sheet));

  const actorSheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('a mod dropped on a host\'s row is installed — only a mod, so a gun dragged over a gun still sorts',
    /ItemMods\.isHost\(host\)\s*&& \(ModFor\.of\(document\) \|\| ItemMods\.modifiersOf\(document\)\.length\)\) \{\s*return SR3EItemMods\.install\(host, document\);/.test(actorSheet));
  t.is('the 🔧 chip is on firearm, melee (×2), armour and cyberware rows', (actorSheet.match(/SR3EActorSheet\.modsChip\(/g) ?? []).length, 5);
  t.ok('the Changes editor keeps perRating when it rebuilds a row (a level-scaled mod must not lose it on any edit)',
    /const list = \(\) => \(item\.system\.modifiers \?\? \[\]\)\.map\(m => \(\{ target: m\.target, value: Number\(m\.value\) \|\| 0, perRating: m\.perRating === true \}\)\)/.test(sheet));
  t.ok('…and offers a per-level tick', /class="sr-modifier-per"/.test(sheet));
}
