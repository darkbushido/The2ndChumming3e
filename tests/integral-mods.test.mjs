/**
 * A firearm's printed accessories as installed mods, marked integral — `scripts/data/integral-mods.mjs` · TODO 276 (step b).
 *
 * The maintainer's rulings of 2026-10-27: shown, never counted (the printed RC and flags already include them); the packs and
 * owned copies (fill blanks); the accessories text untouched; clear matches only.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { IntegralMods } from '../scripts/data/integral-mods.mjs';
import { ItemMods } from '../scripts/data/item-mods.mjs';
import { WeaponAccessories } from '../scripts/data/weapon-accessories.mjs';

export const name = 'integral-mods';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const ROOT = new URL('../', import.meta.url);

const gun = (accessories, extra = {}) => ({ type: 'firearm', name: 'Test Gun', system: { accessories, installed: [], ...extra } });
const one = token => { const m = IntegralMods.match(token); return m ? [m.name, m.rating, m.kind.mount] : null; };

export async function run(t) {
  /* ── Clear matches only ───────────────────────────────────────────────────── */
  t.eq('the Crusader\'s Gas Vent II(2RC): the one Gas Vent, level 2, on the barrel', one('Gas Vent II(2RC)'), ['Gas Vent (Weapon)', 2, 'Barrel']);
  t.eq('Gas Vent I(1RC) is level 1', one('Gas Vent I(1RC)'), ['Gas Vent (Weapon)', 1, 'Barrel']);
  t.eq('every laser-sight spelling', ['Laser Sight', 'Laser sight', 'Dual Laser sight', 'Laser'].map(x => one(x)?.[0]), Array(4).fill('Laser Sight (Weapon)'));
  t.eq('a smartlink is internal — no mount (SR3 p.281)', [one('Smartlink'), one('Smartlink-2')],
    [['Smartlink level I (Weapon)', null, ''], ['Smartlink level II (Weapon)', null, '']]);
  t.eq('stocks are named as printed, rated by their (NRC)', ['Fold Stock(1RC)', 'Fold. Stock(1RC)', 'Detach. Stock(1RC)', 'Retr. Stock(1RC)', 'Tele. Stock', 'Collapsible stock', 'Fold Stock(1RC'].map(x => one(x)?.slice(0, 2)),
    [['Folding Stock', 1], ['Folding Stock', 1], ['Detachable Stock', 1], ['Retractable Stock', 1], ['Telescoping Stock', 1], ['Collapsible Stock', 1], ['Folding Stock', 1]]);
  t.eq('pods: Bipod 2, Tripod 6 (SR3 p.282) whether or not the RC is printed', ['Folding Bipod(2RC)', 'Tripod', 'Tripod(6RC)', 'fold-out tripod(6RC)'].map(x => one(x)?.slice(0, 2)),
    [['Bipod (Weapon)', 2], ['Tripod (Weapon)', 6], ['Tripod (Weapon)', 6], ['Tripod (Weapon)', 6]]);
  t.eq('silencer and every suppressor spelling go on the barrel', ['Silencer', 'Sound Suppressor', 'Sound Suppresser', 'Suppressor'].map(x => one(x)?.[2]), Array(4).fill('Barrel'));
  t.eq('scopes: the level from "(N)" or "Mag:(N)"', ['Imaging Scope(1)', 'Optical Imaging Scope(2)', 'Low Light Mag:(2) Scope', 'Low-light Scope'].map(x => one(x)?.slice(0, 2)),
    [['Imaging Scope (Weapon)', 1], ['Imaging Scope (Weapon)', 2], ['Imaging Scope, Low-Light (Weapon)', 2], ['Imaging Scope, Low-Light (Weapon)', null]]);
  t.eq('…and a bare level (an owned "imaging scope 3"); "Smartlink II" is level II', [one('imaging scope 3')?.[1], one('Smartlink II')?.[0]], [3, 'Smartlink level II (Weapon)']);
  t.eq('RC accessories: shock pads, fore grip, hip brace', ['Shock Pads(1RC)', 'Foregrip(1RC)', 'Hip Brace(1RC)', 'Hip Pad Brace(1RC)'].map(x => one(x)?.[0]),
    ['Shock Pads (RC (Weapon)', 'Fore Grip (Weapon)', 'Hip Pad Bracing System (Weapon)', 'Hip Pad Bracing System (Weapon)']);
  t.ok('the deluxe gyro mount is the Cannon Companion\'s', /sr3e-cc-gear/.test(IntegralMods.match('Gyro Mount (Deluxe)')?.kind.source));
  t.eq('anything that is not clearly ONE accessory stays text (the ruling)',
    ['Either: Folding Bipod(2RC) or Shoulder Strap', 'RC(6)[Gas Vent III', 'Heavy Barrel(1RC)', 'Grenade Launcher 6(m)', 'Laser Designator',
      'Low-Light or Thermo Mag:(3) Scope', 'Fold Stock(1RC) -(Briefcase SMG)', 'BF = Complex Action', 'Mag:(2)', 'RC(2)', 'Pistol grips']
      .flatMap(x => IntegralMods.parse(x)), []);
  t.eq('two printed with no comma are split after the first ")"', IntegralMods.parse('Gas Vent II(2RC) Folding Tripod(6RC)').map(m => m.name), ['Gas Vent (Weapon)', 'Tripod (Weapon)']);
  t.eq('…and a note after one is dropped', IntegralMods.parse('Gas Vent II(2RC) See Rules').map(m => m.name), ['Gas Vent (Weapon)']);
  t.eq('the printed order is kept', IntegralMods.parse('Laser Sight, Gas Vent II(2RC), Fold Stock(1RC)').map(m => m.name), ['Laser Sight (Weapon)', 'Gas Vent (Weapon)', 'Folding Stock']);

  /* ── The entry ────────────────────────────────────────────────────────────── */
  const delta = IntegralMods.fillDelta(gun('Laser Sight, Gas Vent II(2RC)'));
  const [laser, vent] = delta['system.installed'];
  t.eq('flagged integral, with stable ids', [IntegralMods.isIntegral(laser), laser._id, vent._id], [true, 'integral00000001', 'integral00000002']);
  t.is('16 characters, as Foundry\'s ids', laser._id.length, 16);
  t.eq('the gear pack\'s mount, read from the description', [ItemMods.mountsOf(laser), ItemMods.mountsOf(vent)], [['Top', 'Under'], ['Barrel']]);
  t.eq('its change is the pack\'s (MOD_EFFECTS), shown', vent.system.modifiers, [{ target: 'rc', value: 1, perRating: true }]);
  t.eq('a weapon mod, costing nothing extra (part of the gun)', [vent.system.modFor, vent.system.cost, vent.system.rating], ['weapon', 0, 2]);
  t.ok('…its description names the printed token', /"Gas Vent II\(2RC\)"/.test(vent.system.description));

  /* ── Fill blanks, never twice ─────────────────────────────────────────────── */
  t.ok('the accessories text is never written', !Object.keys(delta).some(k => /accessories/.test(k)));
  t.is('marked done', delta['flags.The2ndChumming3e.integralDone'], true);
  const filled = gun('Laser Sight', { installed: delta['system.installed'] });
  t.is('a gun already holding an integral mod is left alone', IntegralMods.fillDelta(filled), null);
  t.is('…and a gun whose integral mods the GM took out stays that way', IntegralMods.fillDelta({ ...gun('Laser Sight'), flags: { The2ndChumming3e: { integralDone: true } } }), null);
  const own = { _id: 'mine', name: 'Imaging Scope (Weapon)', type: 'gear', system: {} };
  t.eq('a mod the GM already installed is kept, first', IntegralMods.fillDelta(gun('Laser Sight', { installed: [own] }))['system.installed'].map(m => m._id), ['mine', 'integral00000001']);
  t.eq('nothing to convert, or not a firearm: null', [IntegralMods.fillDelta(gun('BF = Complex Action')), IntegralMods.fillDelta(gun('')), IntegralMods.fillDelta({ type: 'melee', system: { accessories: 'Laser Sight' } })], [null, null, null]);

  /* ── Shown, never counted ─────────────────────────────────────────────────── */
  const crusader = gun('Gas Vent II(2RC)', { installed: IntegralMods.fillDelta(gun('Gas Vent II(2RC), Smartlink, Laser Sight'))['system.installed'] });
  t.is('an integral gas vent adds no RC — the printed RC has it', ItemMods.value(crusader, 'rc'), 0);
  t.eq('…nor an integral smartlink or laser sight', [ItemMods.value(crusader, 'smartgun'), ItemMods.value(crusader, 'laserSight')], [0, 0]);
  t.is('…so a gun whose flags say no is not switched on by one', WeaponAccessories.flag({ ...crusader, system: { ...crusader.system, smartgun: false } }, 'smartgun'), false);
  const added = { _id: 'v2', name: 'Gas Vent (Weapon)', type: 'gear', system: { rating: 3, modifiers: [{ target: 'rc', value: 1, perRating: true }] } };
  t.is('a vent the GM installs on top still counts', ItemMods.value({ ...crusader, system: { ...crusader.system, installed: [...crusader.system.installed, added] } }, 'rc'), 3);
  const rpk = gun('fold-out tripod(6RC)', { installed: IntegralMods.fillDelta(gun('fold-out tripod(6RC)'))['system.installed'] });
  t.eq('an integral tripod is no pod for the GM\'s window — it is the printed bracketed RC', ItemMods.pods(rpk), []);

  /* ── Mounts ───────────────────────────────────────────────────────────────── */
  const sm3 = IntegralMods.fillDelta(gun('Gas Vent II(2RC), Silencer'))['system.installed'];
  t.eq('two integral accessories printed on one mount share it, unwarned', ItemMods.assignMounts(sm3).map(r => [r.mount, r.wants]), [['Barrel', ''], ['Barrel', '']]);
  const later = { _id: 'x', name: 'Sound Suppresser (Weapon)', type: 'gear', system: { description: '<p><strong>Mount:</strong> Barrel</p>' } };
  t.eq('…a barrel accessory installed later is warned', ItemMods.assignMounts([...sm3, later]).at(-1).wants, 'Barrel');
  t.ok('…and the install warning names the integral one', ItemMods.warnings({ type: 'firearm', system: { installed: sm3 } }, later).some(w => /barrel mount already holds Gas Vent/.test(w)));

  /* ── Taking one out ───────────────────────────────────────────────────────── */
  t.ok('the GM is told the printed RC still includes it', /Gas Vent \(Weapon\) was built into Ares Crusader as printed — its RC still includes it/.test(IntegralMods.removedWarning({ name: 'Ares Crusader' }, vent)));
  t.ok('…or the smartgun flag', /smartgun flag/.test(IntegralMods.removedWarning({ name: 'G' }, IntegralMods.entryFor(IntegralMods.match('Smartlink'), 1))));

  /* ── The wiring (source-level) ────────────────────────────────────────────── */
  const mig = read('scripts/SR3EMigrations.js');
  t.ok('the 0.9.0 migration fills owned copies', /version: '0\.9\.0',\s*label: "A firearm's printed accessories are installed mods, marked integral \(TODO 276\)",[\s\S]{0,900}fixItem: item => IntegralMods\.fillDelta\(item\)/.test(mig));
  const mods = read('scripts/SR3EItemMods.js');
  t.ok('⏏ takes the integral flag off the loose copy', /if \(IntegralMods\.isIntegral\(mod\)\) delete data\.flags\.The2ndChumming3e\[IntegralMods\.FLAG\];/.test(mods));
  t.is('⏏ and 🗑 warn', (mods.match(/if \(IntegralMods\.isIntegral\(mod\)\) ui\.notifications\.warn\(IntegralMods\.removedWarning\(host, mod\)\);/g) ?? []).length, 2);
  t.ok('the rows say which are integral', /integral: IntegralMods\.isIntegral\(m\),/.test(mods));
  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('the sheet tags them and brackets their change', /r\.integral \? '<span class="sr-mod-integral"/.test(sheet) && /r\.integral && r\.changes \? `\(\$\{esc\(r\.changes\)\}\)`/.test(sheet));
  t.ok('…and does not call an integral pod the GM\'s', /\$\{r\.deployable && !r\.integral \?/.test(sheet));
  t.ok('the packs tool reads the same module', /IntegralMods\.fillDelta\(doc\)/.test(read('tools/fill-integral-mods.mjs')));

  /* ── The shipped packs are filled ─────────────────────────────────────────── */
  const left = [];
  let integrals = 0;
  const src = new URL('packs-src/', ROOT);
  for (const pack of readdirSync(src)) {
    const dir = new URL(`${pack}/`, src);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
      const docs = [j.doc, ...Object.values(j.embedded ?? {}).flat()];
      for (const d of docs) {
        if (d?.type !== 'firearm') continue;
        if (IntegralMods.fillDelta(d)) left.push(`${pack}: ${d.name}`);
        integrals += (d.system?.installed ?? []).filter(m => IntegralMods.isIntegral(m)).length;
      }
    }
  }
  t.eq('every shipped gun is filled (node tools/fill-integral-mods.mjs)', left, []);
  t.ok(`…${integrals} integral accessories across the packs`, integrals >= 120);
}
