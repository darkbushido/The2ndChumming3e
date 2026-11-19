/**
 * Two Cannon Companion firearms filed under the wrong weapon category — TODO 301.
 *
 * Found while TODO 300's weapon art was checked against the book (2026-11-19):
 *
 *   - **Street Sweeper** shipped as `Tasr` (taser). CC p.23 files it under SHOTGUNS: *"This jury-rigged
 *     shotgun is commonly used by sprawl gangers"* — muzzle-loaded with black-powder cubes and junk.
 *     As a `Tasr` it rolled Pistols and counted as a SHOCK weapon (`ShockStun`), which it is not.
 *     ⚠ The book keeps its odd range: *"Use taser ranges, but also apply rules for shotgun choke"* — so
 *     the fix also writes `rangeOverride` 5/10/12/15 (the taser bands, `SR3E.weaponRanges.Tasr`).
 *   - **Ballista** shipped as `BlsTa` (an upstream code, rolled as nothing). CC p.28: *"the Ballista
 *     consists of a backpack mechanism that deploys a shoulder-firing missile tube"* — a missile launcher
 *     (`MisLn`, Launch Weapons/Intelligence, SR3 p.86).
 *
 * ONE list, read by the pack source (`packs-src/sr3e-cc-firearms`, already corrected) and by the world
 * migration through `fixItem`.
 *
 * ⚠ **Guarded by the wrong value we shipped** (`from`): a field is rewritten only while it still holds it,
 * so a GM who re-filed the weapon keeps their choice — and a second run yields null.
 *
 * Pure — no Foundry.
 */

const CC23 = 'CC p.23', CC28 = 'CC p.28';

export const WeaponCategoryFixes = {
  FIXES: [
    { name: 'Street Sweeper ShtG', field: 'category',      from: 'Tasr',     to: 'ShtG',          source: CC23 },
    { name: 'Street Sweeper ShtG', field: 'skill',         from: 'Tasers',   to: 'Shotguns',      source: CC23 },
    { name: 'Street Sweeper ShtG', field: 'rangeOverride', from: '',         to: '5/10/12/15',    source: `${CC23}: "Use taser ranges"` },
    { name: 'Ballista Mis. Launcher', field: 'category',   from: 'BlsTa',    to: 'MisLn',         source: CC28 },
    { name: 'Ballista Mis. Launcher', field: 'skill',      from: 'Gunnery',  to: 'Launch Weapons', source: `${CC28}; SR3 p.86` },
    { name: 'Ballista Mis. Launcher', field: 'attribute',  from: 'quickness', to: 'intelligence', source: `${CC28}; SR3 p.86` },
  ],

  /** A firearm's update delta, or null. Matched by exact name, firearms only. */
  fixItem(item) {
    if (item?.type !== 'firearm') return null;
    const delta = {};
    for (const f of WeaponCategoryFixes.FIXES) {
      if (f.name !== item.name) continue;
      const now = item.system?.[f.field] ?? '';
      if (String(now) === String(f.from)) delta[`system.${f.field}`] = f.to;
    }
    // The picture followed the wrong category; replace it only while it is still the stock taser icon.
    if (item.name === 'Street Sweeper ShtG' && /\/icons\/firearm-taser\.svg$/.test(item.img ?? '')) {
      delta.img = String(item.img).replace(/firearm-taser\.svg$/, 'firearm-shotgun.svg');
    }
    return Object.keys(delta).length ? delta : null;
  },
};
