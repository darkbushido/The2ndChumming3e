/**
 * A firearm's printed Recoil Compensation — `scripts/data/printed-rc.mjs` · TODO 280.
 *
 * Cannon Companion pp.116-118 (the weapon tables' RC column), p.78 (the Ares Thunderer: "3 points of recoil
 * compensation"); SR3 pp.278-279. "2(3)" is recoilMod 2, recoilModIntegral 3; "(1)" is a bracketed 1 alone (SR3 p.276).
 * Fill blanks only; a row is pinned to its name AND book page.
 *
 * ⚠ Calls go through `PrintedRC.x(…)`, never a destructured copy, so the mutants can bite.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { PrintedRC, PRINTED_RC } from '../scripts/data/printed-rc.mjs';
import { IntegralMods } from '../scripts/data/integral-mods.mjs';

export const name = 'printed-rc';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const gun = (name, bookPage, system = {}) => ({ name, type: 'firearm', system: { bookPage, ...system } });

/** Every firearm in packs-src, embedded copies included: `[pack, doc]`. */
function firearms() {
  const out = [];
  const src = new URL('../packs-src/', import.meta.url);
  for (const pack of readdirSync(src)) {
    const dir = new URL(`${pack}/`, src);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
      for (const d of [j.doc, ...Object.values(j.embedded ?? {}).flat()]) if (d?.type === 'firearm') out.push([pack, d]);
    }
  }
  return out;
}

export async function run(t) {
  /* ── The fill ─────────────────────────────────────────────────────────────── */
  t.eq('the Crusader (CC p.116: RC 2) gets its 2', PrintedRC.fillDelta(gun('Ares Crusader', 'cc.18')), { 'system.recoilMod': 2 });
  t.eq('"2(3)": both figures (Colt Cobra TZ-110)', PrintedRC.fillDelta(gun('Colt Cobra TZ-110', 'cc.21')), { 'system.recoilMod': 2, 'system.recoilModIntegral': 3 });
  t.eq('"(1)": the bracketed figure alone (Sandler TMP)', PrintedRC.fillDelta(gun('Sandler TMP', 'cc.21', { recoilMod: 0 })), { 'system.recoilModIntegral': 1 });
  t.eq('the FN MAG-5\'s gas vent and tripod: 2(8)', PrintedRC.fillDelta(gun('FN MAG-5 MMG', 'cc.26')), { 'system.recoilMod': 2, 'system.recoilModIntegral': 8 });
  t.eq('the Thunderer, CC p.78: 3', PrintedRC.fillDelta(gun('Ares Thunderer', 'cc.78')), { 'system.recoilMod': 3 });
  t.eq('0 and blank both count as unset for the plain RC', [0, '', null].map(v => PrintedRC.fillDelta(gun('Ares HVAR', 'cc.22', { recoilMod: v }))?.['system.recoilMod']), [3, 3, 3]);
  t.is('a figure a GM typed is left alone', PrintedRC.fillDelta(gun('Ares HVAR', 'cc.22', { recoilMod: 1 })), null);
  t.is('…so is a typed bracketed figure, even 0', PrintedRC.fillDelta(gun('Sandler TMP', 'cc.21', { recoilModIntegral: 0 })), null);
  t.eq('…and only the blank half of a "2(3)" fills', PrintedRC.fillDelta(gun('Colt Cobra TZ-110', 'cc.21', { recoilMod: 4 })), { 'system.recoilModIntegral': 3 });
  t.is('idempotent: a filled gun yields nothing', PrintedRC.fillDelta(gun('Colt Cobra TZ-110', 'cc.21', { recoilMod: 2, recoilModIntegral: 3 })), null);
  t.is('pinned to the book page: a hand-made "Ares Crusader" elsewhere is left alone', PrintedRC.fillDelta(gun('Ares Crusader', '')), null);
  t.is('…and to firearms', PrintedRC.fillDelta({ ...gun('Ares Crusader', 'cc.18'), type: 'gear' }), null);

  /* ── The Panther: two versions (the maintainer, 2026-10-27) ──────────────── */
  t.eq('the Panther prints (2)/(1) — the bipod version (2), the strap and hip brace (1)',
    [PrintedRC.fillDelta(gun('Panther Assault Cannon [Bipod]', 'cc.26')), PrintedRC.fillDelta(gun('Panther Assault Cannon [Shoulder Strap Hip-Brace]', 'cc.26'))],
    [{ 'system.recoilModIntegral': 2 }, { 'system.recoilModIntegral': 1 }]);
  // A world's old single Panther is the bipod version (the maintainer, 2026-10-27: "assume its a bipod and update").
  const oldPanther = (system = {}) => gun('Panther Assault Cannon', 'cc.26', {
    accessories: 'Either: Folding Bipod(2RC) or Shoulder Strap & Hip Brace(1RC)', notes: '',
    installed: [
      { _id: 'integral00000001', type: 'gear', name: 'Hip Pad Bracing System (Weapon)', flags: { The2ndChumming3e: { integral: true } } },
      { _id: 'gmsmartgun000001', type: 'gear', name: 'Smartgun System (Weapon)' }],
    ...system });
  const up = PrintedRC.fillDelta(oldPanther());
  t.eq('…an old single Panther becomes [Bipod], bracketed RC 2, its text the bipod’s',
    [up?.name, up?.['system.recoilModIntegral'], up?.['system.accessories']], ['Panther Assault Cannon [Bipod]', 2, 'Folding Bipod(2RC)']);
  t.eq('…its integral hip brace swapped for the bipod; a mod the GM installed stays',
    up?.['system.installed']?.map(m => m.name), ['Smartgun System (Weapon)', 'Bipod (Weapon)']);
  const typed = PrintedRC.fillDelta(oldPanther({ accessories: 'Bipod, my own', recoilModIntegral: 3 }));
  t.eq('…a GM’s own text and RC are kept — only the name changes', [typed?.name, typed?.['system.recoilModIntegral'], typed?.['system.accessories'], typed?.['system.installed']],
    ['Panther Assault Cannon [Bipod]', undefined, undefined, undefined]);
  t.is('…on CC p.26 only', PrintedRC.fillDelta(gun('Panther Assault Cannon', '')), null);
  t.is('…idempotent: the renamed bipod version needs nothing more',
    PrintedRC.fillDelta(gun('Panther Assault Cannon [Bipod]', 'cc.26', { recoilModIntegral: 2 })), null);

  /* ── The packs ────────────────────────────────────────────────────────────── */
  const all = firearms();
  const dead = PRINTED_RC.filter(([n, p]) => !all.some(([, d]) => d.name === n && d.system?.bookPage === p)).map(([n]) => n);
  t.eq('every row names a shipped gun (name and page)', dead, []);
  t.eq('every shipped gun has its printed RC (the tool ran)', all.filter(([, d]) => PrintedRC.fillDelta(d)).map(([p, d]) => `${p}: ${d.name}`), []);
  const panthers = all.filter(([, d]) => /^Panther Assault Cannon/.test(d.name)).map(([, d]) => [d.name, d.system.recoilModIntegral, d.system.accessories]).sort();
  t.eq('the Panther ships as its two versions, each with its own accessory', panthers, [
    ['Panther Assault Cannon [Bipod]', 2, 'Folding Bipod(2RC)'],
    ['Panther Assault Cannon [Shoulder Strap Hip-Brace]', 1, 'Shoulder Strap & Hip Brace(1RC)']]);

  // TODO 280's sweep: a gun whose integral RC accessories add up to more than its printed figures. What is left is a
  // gun the book prints "—" for (the Heavy Laser's tripod) or whose book is not in the library (TSS).
  const rcOf = d => (d.system?.installed ?? []).filter(m => IntegralMods.isIntegral(m))
    .reduce((s, m) => s + (m.system?.modifiers ?? []).filter(x => x.target === 'rc').reduce((a, x) => a + Number(x.value || 0), 0), 0);
  const short = all.filter(([, d]) => rcOf(d) > Number(d.system?.recoilMod || 0) + Number(d.system?.recoilModIntegral || 0))
    .map(([p, d]) => `${p.replace('sr3e-', '')}: ${d.name}`).sort();
  t.eq('only the guns no table fills are short of their integral RC', short, [
    'cc-firearms: Ares Heavy Laser Plus', 'tss-firearms: M-16B', 'tss-firearms: VC Boxlock Hammerless', 'tss-firearms: Win. 1300 Defender SS']);

  /* ── The migration (source-level) ─────────────────────────────────────────── */
  const mig = read('scripts/SR3EMigrations.js');
  t.ok('…and says it renames the old Panther', /PrintedRC\.oldPanther/.test(mig) && /assume its a bipod and update/.test(mig));
  t.ok('0.9.0 fills owned copies through PrintedRC', /version: '0\.9\.0',\s*label: "A firearm's printed Recoil Compensation \(TODO 280\)"[\s\S]*?fixItem: item => PrintedRC\.fillDelta\(item\)/.test(mig));
}
