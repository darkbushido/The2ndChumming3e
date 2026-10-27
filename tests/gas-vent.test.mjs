/**
 * ONE Gas Vent, Level 1-4 — the maintainer's ruling of 2026-10-27 (TODO 276).
 *
 * The packs shipped "Gas Vent I/II/III (Weapon)" (SR3 p.282, sr3e-sr3-gear) and "Gas Vent IV (Weapon)" (CC p.35,
 * sr3e-cc-gear) — one document per level, which TODO 261's sweep missed because the level is a roman numeral. Now: one
 * "Gas Vent (Weapon)" in sr3e-sr3-gear, the levels in the table (250 / 450 / 700 / 1,000¥), level 4 offered only while
 * the Cannon Companion is on, RC = the level; owned copies renamed and repointed by the 0.9.0 migration.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { ModRatings } from '../scripts/data/mod-ratings.mjs';
import { ModFor } from '../scripts/data/mod-for.mjs';
import { ModEffects } from '../scripts/data/mod-effects.mjs';
import { ItemMods } from '../scripts/data/item-mods.mjs';
import { MOD_RATING_TABLE, COLLAPSED_SOURCES } from '../scripts/data/mod-rating-table.mjs';
import { CROSS_PACK_FAMILIES } from '../tools/build-default-gear.mjs';

export const name = 'gas-vent';

const docsIn = pack => readdirSync(new URL(`../packs-src/${pack}/`, import.meta.url)).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(new URL(`../packs-src/${pack}/${f}`, import.meta.url), 'utf8')).doc);
const KEPT = 'a4b62ae9cd2730a3';

export async function run(t) {
  /* ── The name ──────────────────────────────────────────────────────────────── */
  t.eq('"Gas Vent II (Weapon)" is Gas Vent at level 2', ModRatings.splitName('Gas Vent II (Weapon)'), { stem: 'Gas Vent (Weapon)', rating: 2 });
  t.eq('…IV is 4, untagged too', ModRatings.splitName('Gas Vent IV'), { stem: 'Gas Vent', rating: 4 });
  for (const model of ['Ares Predator II', 'Smartlink II', 'Smart Goggles I', 'Plastic Compound IV', 'Fairlight Excalibur II', 'Neuro-stun IX', 'Type III Maglock']) {
    t.is(`"${model}" is a model, not a level`, ModRatings.splitName(model), null);
  }

  /* ── The pack ──────────────────────────────────────────────────────────────── */
  const sr3 = docsIn('sr3e-sr3-gear').filter(d => ModRatings.baseName(d.name) === 'Gas Vent');
  const cc  = docsIn('sr3e-cc-gear').filter(d => ModRatings.baseName(d.name) === 'Gas Vent');
  t.eq('ONE "Gas Vent (Weapon)" ships, in sr3e-sr3-gear, at level 1 — the lowest level\'s id kept', sr3.map(d => [d.name, d._id, d.system.rating]), [['Gas Vent (Weapon)', KEPT, 1]]);
  t.is('…and none in sr3e-cc-gear', cc.length, 0);
  t.eq('its levels: 250 / 450 / 700 / 1,000¥ (SR3 p.282, CC p.35)', [1, 2, 3, 4].map(l => MOD_RATING_TABLE['weapon|Gas Vent']?.[l]?.cost), [250, 450, 700, 1000]);
  t.is('level 4 cites the Cannon Companion', MOD_RATING_TABLE['weapon|Gas Vent'][4].bookPage, 'cc.35');
  t.ok('the merge is the builder\'s, not a hand edit', CROSS_PACK_FAMILIES.some(x => x.key === 'weapon|Gas Vent' && x.into === 'sr3e-sr3-gear' && x.from === 'sr3e-cc-gear'));
  t.eq('the deleted level documents point at the kept one — IV across packs', [
    COLLAPSED_SOURCES['sr3e-sr3-gear']?.cac4e7808bef4494, COLLAPSED_SOURCES['sr3e-sr3-gear']?.['1cf913cb9de7b39b'], COLLAPSED_SOURCES['sr3e-cc-gear']?.['5e0ae827eb731545'],
  ], [KEPT, KEPT, `sr3e-sr3-gear/${KEPT}`]);
  t.eq('RC = its level (perRating)', [1, 2, 3, 4].map(r => ItemMods.value({ system: { ...sr3[0].system, rating: r } }, 'rc')), [1, 2, 3, 4]);

  /* ── Level 4 only while the Cannon Companion is on ─────────────────────────── */
  const vent = sr3[0];
  const offered = allowed => Object.keys(ModRatings.levelsFor(vent, code => allowed.includes(code)) ?? {}).map(Number);
  t.eq('Cannon Companion on: 1-4', offered(['sr3', 'cc']), [1, 2, 3, 4]);
  t.eq('…off: 1-3', offered(['sr3']), [1, 2, 3]);
  t.eq('…no book filter given: every level', Object.keys(ModRatings.levelsFor(vent)).map(Number), [1, 2, 3, 4]);
  const atFour = { ...vent, system: { ...vent.system, rating: 4 } };
  t.ok('a vent already at level 4 keeps it selectable with the book off', ModRatings.options(atFour, undefined, { bookAllowed: c => c === 'sr3' }).some(o => o.value === 4 && o.selected));

  /* ── Owned copies (the 0.9.0 migration: ModFor.migrateDelta, ModEffects.fillDelta) ── */
  const src = (pack, id) => ({ _stats: { compendiumSource: `Compendium.The2ndChumming3e.${pack}.Item.${id}` } });
  t.eq('an owned "Gas Vent II (Weapon)" becomes "Gas Vent (Weapon) [2]", linked to the kept document',
    ModFor.migrateDelta({ type: 'gear', name: 'Gas Vent II (Weapon)', system: { rating: 2, category: 'Firearms Accessories', modFor: 'weapon' }, ...src('sr3e-sr3-gear', 'cac4e7808bef4494') }),
    { name: 'Gas Vent (Weapon) [2]', '_stats.compendiumSource': `Compendium.The2ndChumming3e.sr3e-sr3-gear.Item.${KEPT}` });
  t.eq('…an owned IV across packs too',
    ModFor.migrateDelta({ type: 'gear', name: 'Gas Vent IV (Weapon)', system: { rating: 4, category: 'Firearms Accessories', modFor: 'weapon' }, ...src('sr3e-cc-gear', '5e0ae827eb731545') }),
    { name: 'Gas Vent (Weapon) [4]', '_stats.compendiumSource': `Compendium.The2ndChumming3e.sr3e-sr3-gear.Item.${KEPT}` });
  t.eq('…a 0.7 copy with no rating gets its level from the name (fill blanks)',
    ModFor.migrateDelta({ type: 'gear', name: 'Gas Vent III', system: { rating: null, category: 'Firearms Accessories' } }),
    { name: 'Gas Vent (Weapon) [3]', 'system.rating': 3, 'system.modFor': 'weapon' });
  t.is('…a rating a GM typed is kept', ModFor.migrateDelta({ type: 'gear', name: 'Gas Vent II (Weapon)', system: { rating: 3, category: 'Firearms Accessories', modFor: 'weapon' } })?.['system.rating'], undefined);
  t.ok('…and every copy gains its RC change', ModEffects.fillDelta({ type: 'gear', name: 'Gas Vent II (Weapon)', system: {} })?.['system.modifiers']?.[0]?.perRating === true);
  t.is('…already migrated: nothing to do', ModFor.migrateDelta({ type: 'gear', name: 'Gas Vent (Weapon) [3]', system: { rating: 3, category: 'Firearms Accessories', modFor: 'weapon' } }), null);
}
