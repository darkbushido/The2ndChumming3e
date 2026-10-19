/**
 * The bracketed Recoil Compensation · SR3 p.276 (rules check 0.7.0, weapons.md #12).
 *
 *   "Numbers in parentheses refer to full recoil compensation that only applies when all integral accessories
 *    are used (folding or detachable stocks, and so forth)."                                    — SR3 p.276
 *
 * Firearms table pp.278-279 prints (1) for the Fichetti 500a, Ceska Black Scorpion, AK-97 SMG/Carbine, HK227-S
 * and Uzi III; 2(3) for the HK227 and Ingram Smartgun; (6) for the Ultimax MMG and RPK HMG. The bracketed
 * figure is the weapon's TOTAL: it replaces the plain one, it does not add to it.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { IntegralRC } from '../scripts/data/integral-rc.mjs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'integral-rc';
const sortKeys = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const hk227 = { recoilMod: 2, recoilModIntegral: 3 };
  t.is('HK227 2(3), stock not out: 2', IntegralRC.weaponComp(hk227, false), 2);
  t.is('HK227 2(3), stock out: 3 in all — NOT 2 + 3', IntegralRC.weaponComp(hk227, true), 3);
  const uzi = { recoilMod: 0, recoilModIntegral: 1 };
  t.eq('Uzi III (1): 0 carried, 1 with the stock', [IntegralRC.weaponComp(uzi, false), IntegralRC.weaponComp(uzi, true)], [0, 1]);
  const ultimax = { recoilModIntegral: 6 };
  t.eq('Ultimax MMG (6): 0 without the tripod (recoilMod blank), 6 with it', [IntegralRC.weaponComp(ultimax, false), IntegralRC.weaponComp(ultimax, true)], [0, 6]);
  t.is('a weapon with no bracket ignores the tick (SM-3 prints a plain 2)', IntegralRC.weaponComp({ recoilMod: 2, recoilModIntegral: null }, true), 2);
  t.is('…and a copy from before the field', IntegralRC.weaponComp({ recoilMod: 2 }, true), 2);
  t.eq('has(): 0 and 3 yes; null, blank, missing no', [IntegralRC.has({ recoilModIntegral: 0 }), IntegralRC.has({ recoilModIntegral: 3 }), IntegralRC.has({ recoilModIntegral: null }), IntegralRC.has({ recoilModIntegral: '' }), IntegralRC.has({})], [true, true, false, false, false]);
  t.ok('defaults unticked (the safe, lower figure)…', !IntegralRC.defaultInUse(hk227));
  t.ok('…remembers the shooter\'s last answer', IntegralRC.defaultInUse({ ...hk227, integralInUse: true }));
  t.ok('…but never ticks a weapon with no bracket', !IntegralRC.defaultInUse({ recoilMod: 2, integralInUse: true }));

  // The recoil TN uses it: 10 FA rounds from an Ultimax (heavy, x2) — plain 0 comp vs tripod 6: (10-0)x2 = 20 vs (10-6)x2 = 8 (p.115 worked example).
  const tn = comp => SR3EItem.recoilTN({ mode: 'FA', roundsBefore: 0, roundsThisShot: 10, totalComp: comp, isHeavy: true });
  t.eq('MMG, 10 rounds: no tripod +20, tripod (6) +8 (the book\'s worked +8)', [tn(IntegralRC.weaponComp(ultimax, false)), tn(IntegralRC.weaponComp(ultimax, true))], [20, 8]);

  /* ── the pack: exactly the book's bracketed rows ──────────────────────────── */
  const dir = new URL('../packs-src/sr3e-sr3-firearms/', import.meta.url);
  const docs = readdirSync(dir).map(f => JSON.parse(readFileSync(new URL(f, dir), 'utf8')).doc);
  const got = Object.fromEntries(docs.filter(d => IntegralRC.has(d.system)).map(d => [d.name, d.system.recoilModIntegral]).sort(([a], [b]) => a.localeCompare(b)));
  t.eq('the SR3 firearms pack carries the bracketed figure on exactly the book\'s nine rows', sortKeys(got), sortKeys({
    'AK-97 SMG/Carbine': 1, 'Ceska Black Scorpion': 1, 'Fichetti Security 500a': 1, 'Heckler & Koch HK227': 3,
    'Heckler & Koch HK227-S': 1, 'Ingram Smartgun Mod. 20t': 3, 'Uzi III': 1, 'Ultimax MMG': 6, 'RPK HMG': 6,
  }));
  const by = n => docs.find(d => d.name === n).system;
  t.eq('…HK227 and Ingram keep their plain 2', [by('Heckler & Koch HK227').recoilMod, by('Ingram Smartgun Mod. 20t').recoilMod], [2, 2]);

  /* ── the wiring, source-level ─────────────────────────────────────────────── */
  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the fire dialog starts from the bracketed-aware figure', /const weaponComp\s+= IntegralRC\.weaponComp\(weapon\.system, inUse0\)/.test(item));
  t.ok('…offers the tick only when the weapon has a bracketed RC', /hasIntegral \? `<label[^`]*id="sr-integral"/.test(item));
  t.ok('…ticking swaps the weapon figure', /#sr-integral'\)\?\.addEventListener\('change'[\s\S]{0,200}IntegralRC\.weaponComp\(weapon\.system, event\.target\.checked\)/.test(item));
  t.ok('…a typed figure is saved against the figure that was showing', /\[inUse \? 'system\.recoilModIntegral' : 'system\.recoilMod'\]: wComp/.test(item));
  t.ok('…the tick is remembered on the gun', /'system\.integralInUse': inUse/.test(item));
  t.ok('…the result carries the weapon figure, so a short burst recomputes with it', /weaponComp: wComp/.test(item) && /fireModeResult\.weaponComp \?\? this\.system\.recoilMod/.test(item));
  t.ok('FirearmData declares both fields', /recoilModIntegral: new NumberField\(\{ integer: true, nullable: true, initial: null, min: 0 \}\)/.test(read('scripts/data/ItemDataModels.js')) && /integralInUse:\s+new BooleanField\(\{ initial: false \}\)/.test(read('scripts/data/ItemDataModels.js')));
  t.ok('the item sheet has the field', /'recoilModIntegral'/.test(read('scripts/sheets/SR3EItemSheet.js')));
  t.ok('TESTING.md has the live step', /integral accessories in use/i.test(read('TESTING.md')));
}
