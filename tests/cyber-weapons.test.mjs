/**
 * Implanted weapons get a weapon entry — scripts/data/cyber-weapons.mjs (TODO 151).
 *
 * Reported in play: cyber weapons did not show up in the weapons list and could not be used in
 * combat. The implant (`cyberware`, category Cyberweapons) carried Essence and cost only; the attack
 * needed a separate `melee` item, and cyberguns had none at all.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { CyberWeapons, CYBERGUNS, FLAG } from '../scripts/data/cyber-weapons.mjs';

export const name = 'cyber-weapons';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const implant = (name, description, extra = {}) => ({
  id: `cw-${name.replace(/\W+/g, '')}`, name, type: 'cyberware',
  system: { cyberwareCategory: 'Cyberweapons', description, bookPage: 'sr3.302' }, flags: {}, ...extra,
});

export async function run(t) {
  /* ── Damage codes off the implant's description ──────────────────────────────── */
  t.is('(STR)M', CyberWeapons.damage('(STR)M'), '(STR)M');
  t.is('a trailing reach note is not part of the code', CyberWeapons.damage('(STR+1)L, -1 Reach'), '(STR+1)L');
  t.is('lower-case Str is normalised', CyberWeapons.damage('(Str-1)L, -2 climbing TNs'), '(STR-1)L');
  t.is('a Stun code keeps its track', CyberWeapons.damage('8S Stun, 12 uses'), '8S Stun');
  t.is('a plain code', CyberWeapons.damage('9M'), '9M');
  t.is('"Holds 2 Doses" is not 2D', CyberWeapons.damage('Holds 2 Doses'), null);
  t.is('no description, no code', CyberWeapons.damage(''), null);
  t.is('reach from "-1 Reach" is stored as 0 (the melee model has min 0)', CyberWeapons.reach('(STR)M, -1 Reach'), 0);
  t.is('no reach note → 0', CyberWeapons.reach('(STR)L'), 0);

  /* ── The weapon an implant implies ───────────────────────────────────────────── */
  const spur = implant('Spur(CYB)', '(STR)M');
  const w = CyberWeapons.weaponData(spur);
  t.is('a spur becomes a melee weapon', w?.type, 'melee');
  t.is('…in the CYB category the weapons tab and melee flow already read', w?.system.category, 'CYB');
  t.is('…with its damage', w?.system.damage, '(STR)M');
  t.is('…named without the (CYB) tag', w?.name, 'Spur');
  t.is('…linked back to the implant', w?.flags.The2ndChumming3e[FLAG], spur.id);
  t.is('…using no hands (it is the body\'s own)', w?.system.hands, 0);

  const heavy = CyberWeapons.weaponData(implant('CyGun Heavy(HPist)(CYB)', '9M', { system: { cyberwareCategory: 'Cyberweapons', description: '9M', bookPage: 'mm.41' } }));
  t.is('a cybergun becomes a FIREARM', heavy?.type, 'firearm');
  t.is('…in its gun category (Heavy Pistol → Pistols skill)', heavy?.system.category, 'HPist');
  t.is('…with firing stats from M&M p.41 (internal magazine)', `${heavy?.system.mode} ${heavy?.system.ammunition}`, 'SA 10(m)');
  t.is('…named plainly', heavy?.name, 'CyGun Heavy');
  const taser = CyberWeapons.weaponData(implant('CyGun Taser(Tasr)(CYB)', '10S Stun'));
  t.is('the cyber-taser fires Stun', `${taser?.type} ${taser?.system.damage}`, 'firearm 10S Stun');
  t.is('a stray count in the name is dropped', CyberWeapons.weaponName('Horn Implants, Retractable(CYB)  1'), 'Horn Implants, Retractable');

  t.is('a venom sack is no weapon', CyberWeapons.weaponData(implant('Venom Sack(CYB)', 'Holds 2 Doses')), null);
  t.is('an Oral Dart with no code is no weapon', CyberWeapons.weaponData(implant('Oral Dart(CYB)', '')), null);
  t.is('other cyberware is no weapon', CyberWeapons.weaponData({ ...spur, system: { ...spur.system, cyberwareCategory: 'Headware' } }), null);
  t.is('a melee item is not an implant', CyberWeapons.weaponData({ ...spur, type: 'melee' }), null);

  /* ── Which implants still need a weapon entry ─────────────────────────────────── */
  t.eq('an implant with no weapon is missing one', CyberWeapons.missing([spur]).map(i => i.id), [spur.id]);
  const linked = { id: 'w1', name: 'Anything', type: 'melee', flags: { The2ndChumming3e: { [FLAG]: spur.id } } };
  t.eq('…not once its linked weapon exists', CyberWeapons.missing([spur, linked]), []);
  const packCopy = { id: 'w2', name: 'Spur', type: 'melee', flags: {} };
  t.eq('…nor when the pack\'s own "Spur" melee item is already there (no duplicate)', CyberWeapons.missing([spur, packCopy]), []);
  const otherLink = { id: 'w3', name: 'Spur', type: 'melee', flags: { The2ndChumming3e: { [FLAG]: 'someone-else' } } };
  t.eq('…but a weapon linked to ANOTHER implant does not count for this one', CyberWeapons.missing([spur, otherLink]).length, 1);
  const stored = implant('Spur(CYB)', '(STR)M', { flags: { The2ndChumming3e: { stored: true } } });
  t.eq('a stored (not fitted) implant is not offered', CyberWeapons.missing([stored]), []);
  t.eq('removal deletes only weapons LINKED to the implant, never a same-named one',
    CyberWeapons.linkedTo(spur.id, [linked, packCopy, otherLink]).map(i => i.id), ['w1']);

  /* ── Every shipped cyberweapon ──────────────────────────────────────────────────── */
  const dir = new URL('../packs-src/', import.meta.url);
  const shipped = [];
  for (const pack of readdirSync(dir)) {
    for (const f of readdirSync(new URL(`${pack}/`, dir))) {
      if (!f.endsWith('.json')) continue;
      const doc = JSON.parse(readFileSync(new URL(`${pack}/${f}`, dir), 'utf8')).doc;
      if (CyberWeapons.isCyberweapon(doc)) shipped.push(doc);
    }
  }
  t.ok('the packs ship cyberweapons to check', shipped.length >= 20);
  const armed = shipped.filter(d => CyberWeapons.weaponData(d));
  t.ok('most shipped cyberweapons become a weapon', armed.length >= 20);
  for (const d of armed) {
    const wd = CyberWeapons.weaponData(d);
    const ok = wd.type === 'melee' || Object.prototype.hasOwnProperty.call(CYBERGUNS, wd.system.category);
    t.ok(`${d.name} → ${wd.type} ${wd.system.damage}`, ok && /^(\(STR[-+]?\d*\)|\d+)[LMSD]( Stun)?$/.test(wd.system.damage));
  }

  /* ── Wiring (source level) ───────────────────────────────────────────────────────── */
  const main = read('scripts/sr3e.js');
  t.ok('installing an implant makes its weapon (GM-gated, like the Essence hook)',
    /Hooks\.on\('createItem', \(item\) => _armImplant\(item\)\)/.test(main)
    && /function _armImplant\(item\) \{[\s\S]{0,200}activeGM\?\.isSelf/.test(main));
  t.ok('removing it removes the linked weapon',
    /Hooks\.on\('deleteItem', \(item\) => _disarmImplant\(item\)\)/.test(main)
    && /CyberWeapons\.linkedTo\(item\.id, actor\.items\)/.test(main));
  t.ok('the attack picker lists body weapons without an Equip',
    /actor\.system\.equippedMelee === i\.id \|\| ReadyWeapon\.isBodyWeapon\(i\)/.test(main));
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the weapons tab offers an implant that has no weapon yet', /CyberWeapons\.missing\(\[\.\.\.actor\.items\]\)/.test(sheet)
    && /data-action="armImplant"/.test(sheet) && /armImplant:\s+SR3EActorSheet\._onArmImplant/.test(sheet));
}
