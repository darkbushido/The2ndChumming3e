/**
 * Cyberware name expansion · TODO 87
 *
 * The packs inherited contracted names from the Shadowrun Character Generator's fixed-width UI.
 * `name` is now the book's wording; the upstream string is kept in `system.srcgName`.
 *
 * ⚠ **The whole point of this file is the SECOND section.** Renaming is easy; the failure mode
 * is silent. **43 of `SRCG_BONUSES`' 151 entries name an item this map renames** — including all
 * four Muscle Replacement grades — and a mismatch between the two sides raises nothing at all.
 * The bonus is simply not applied.
 *
 * `expandCyberwareName` is the normaliser on BOTH sides: `build-mods-bonuses.mjs` runs the map's
 * keys through it when generating, and `_patchItemsByName` runs the item through it when looking
 * up. The tests below pin that agreement, including the four combinations of
 * abbreviated/expanded `name` and present/absent `srcgName` that occur in the wild.
 */
import { readFileSync } from 'node:fs';
const { CYBERWARE_NAMES, expandCyberwareName } = await import('../scripts/data/cyberware-names.js');
const { SRCG_BONUSES } = await import('../scripts/data/srcg-bonuses.js');

export const name = 'cyberware-names';

export async function run(t) {
  /* ── The map itself ──────────────────────────────────────────────────────────────────── */

  const noop = Object.entries(CYBERWARE_NAMES).filter(([k, v]) => k === v);
  t.is(noop.length ? `entries that change nothing: ${noop.map(e => e[0]).join(', ')}`
                   : 'every entry actually expands something', noop.length, 0);

  const shrink = Object.entries(CYBERWARE_NAMES).filter(([k, v]) => v.length < k.length);
  t.is(shrink.length ? `entries that CONTRACT: ${shrink.map(e => e[0]).join(', ')}`
                     : 'no entry makes a name shorter', shrink.length, 0);

  /* ⚠ A key that is a prefix of another must not steal its match. `Str Enh` vs
   * `Str Modified Limit Increase`, `Tailored Pherom.` vs `Cult. Tailored Pherom.` */
  t.is('longest key wins: Cultured, not a stray Tailored match',
    expandCyberwareName('Cult. Tailored Pherom.[1]'), 'Cultured Tailored Pheromones[1]');
  t.is('…and the shorter key still resolves on its own',
    expandCyberwareName('Tailored Pherom.[2](NotCult.)'), 'Tailored Pheromones[2](NotCult.)');

  /* ── Prefix semantics: the suffix must ride along untouched ──────────────────────────── */
  t.is('rating suffix preserved',   expandCyberwareName('Muscle Replac. [1]'), 'Muscle Replacement [1]');
  t.is('(Pair) preserved',          expandCyberwareName('Str Enh [3] (Pair)'), 'Strength Enhancement [3] (Pair)');
  t.is('mid-name qualifier preserved — no entry of its own needed',
    expandCyberwareName('Str Enh [4]  w/Torso'), 'Strength Enhancement [4]  w/Torso');
  t.is('no-space bracket preserved',
    expandCyberwareName('Eyes, Vis Mag Ele[1]'), 'Eyes, Vision Magnification, Electronic[1]');
  t.is('an unknown name is returned unchanged',
    expandCyberwareName('Datajack'), 'Datajack');
  t.is('…including one already expanded (idempotent)',
    expandCyberwareName('Muscle Replacement [1]'), 'Muscle Replacement [1]');

  /* ⚠ **IDEMPOTENCE IS NOT FREE HERE, and this caught a real bug before it shipped.**
   * 14 entries expand by APPENDING, so the result still starts with the key:
   * `Reaction Enhance` → `Reaction Enhancer`, `Cosmetic Mod` → `Cosmetic Modification`,
   * `Spur, Retract` → `Spur, Retractable`. A naive prefix expansion run over an
   * already-expanded name appends the tail twice — `Reaction Enhancerr`,
   * `Cosmetic Modificationification` — and then matches nothing in `SRCG_BONUSES`.
   * The function checks the expanded forms first for exactly this reason. */
  const doubles = Object.entries(CYBERWARE_NAMES)
    .filter(([, v]) => expandCyberwareName(v) !== v)
    .map(([k, v]) => `${k} → ${v} → ${expandCyberwareName(v)}`);
  t.is(doubles.length ? `entries that double-expand: ${doubles.slice(0, 3).join(' · ')}`
                      : 'no entry double-expands — every expansion is a fixed point',
    doubles.length, 0);
  t.is('the sharpest case by name', expandCyberwareName('Reaction Enhancer [2]'), 'Reaction Enhancer [2]');
  t.is('…and it still expands the ABBREVIATION it came from',
    expandCyberwareName('Reaction Enhance [2]'), 'Reaction Enhancer [2]');
  t.is('append-style expansion is a fixed point',
    expandCyberwareName('Spur, Retractable'), 'Spur, Retractable');

  /* ── Two the book settled that a guess would get wrong ───────────────────────────────── */
  t.is('Laser Mic. is a MICROPHONE (M&M p.14), not a microscope',
    expandCyberwareName('Eye, Laser Mic. [1]'), 'Eye, Laser Microphone [1]');
  t.is('Nano-Bio sys. is a NANO-BIOMONITOR (M&M p.91)',
    expandCyberwareName('Nano-Bio sys. Guardian'), 'Nano-biomonitor, Guardian');

  /* ════════════════════════════════════════════════════════════════════════════
   *  Why `srcgName` exists — the silent failure this prevents
   * ════════════════════════════════════════════════════════════════════════════ */

  const bonusKeys = Object.keys(SRCG_BONUSES);

  /* ⚠ **How many entries the rename touched** — measured by how many bonus keys are now an
   * EXPANDED form, i.e. would have been abbreviated before. This is the size of the silent
   * failure that `expandCyberwareName` on both sides prevents; it must not quietly shrink,
   * because a drop means the generator stopped expanding and the map is drifting back. */
  const VALUES = [...new Set(Object.values(CYBERWARE_NAMES))];
  const touched = bonusKeys.filter(k => VALUES.some(v => k.startsWith(v)));

  t.ok(`SRCG_BONUSES entries that this map renames: ${touched.length} — the hazard is real`,
    touched.length > 20);
  t.ok('…a large minority of all bonus entries',
    touched.length / bonusKeys.length > 0.2);

  /* The four grades whose Quickness carve-out was wired in 2026-09-01. If the two sides
   * disagreed, Muscle Replacement would stop granting anything at all. */
  for (const n of ['Muscle Replac. [1]', 'Muscle Replac. [2]',
                   'Muscle Replac. [3]', 'Muscle Replac. [4]']) {
    t.ok(`${n} resolves through the expansion`, Boolean(SRCG_BONUSES[expandCyberwareName(n)]));
    t.ok(`…and the raw upstream key is NOT what the map uses now`,
      !Object.hasOwn(SRCG_BONUSES, n));
  }

  /* ⚠ **The generated map must never regress to upstream spellings.** Run
   * `build-mods-bonuses.mjs` without the expansion and these come back abbreviated, at which
   * point every renamed item silently loses its bonus. */
  const stale = bonusKeys.filter(k => expandCyberwareName(k) !== k);
  t.is(stale.length
        ? `keys still abbreviated — regenerate with the expansion: ${stale.slice(0, 5).join(', ')}`
        : 'every SRCG_BONUSES key is already the expanded form',
    stale.length, 0);

  /* The four real-world shapes an item can have. */
  const look = it => SRCG_BONUSES[expandCyberwareName(it.system?.srcgName || it.name)];
  t.ok('pack item after the rename resolves',
    Boolean(look({ name: 'Muscle Replacement [1]', system: { srcgName: 'Muscle Replac. [1]' } })));
  t.ok('an embedded copy from before the migration resolves',
    Boolean(look({ name: 'Muscle Replac. [1]', system: {} })));
  t.ok('an item that was never abbreviated resolves',
    Boolean(look({ name: 'Bone Lace, Aluminium', system: {} })));
  t.ok('a GM-renamed item still resolves through srcgName',
    Boolean(look({ name: 'Bobs Chrome', system: { srcgName: 'Muscle Replac. [3]' } })));
  t.ok('…and something genuinely unknown does not',
    !look({ name: 'Nonexistent Widget', system: {} }));

  /* ⚠ Source-level: the consumer must NORMALISE, not compare raw strings, and must read
   * `srcgName` before `name` — it is the upstream identity and survives a GM rename.
   * Reproducing this behaviourally needs a live world, so like `pool-spend` it is checked
   * against the source. */
  const mig = readFileSync(new URL('../scripts/SR3EMigrations.js', import.meta.url), 'utf8');
  t.ok('_patchItemsByName passes the item through expandCyberwareName',
    /byName\[\s*expandCyberwareName\(/.test(mig));
  t.ok('…reading srcgName before name',
    /item\.system\?\.srcgName\s*\|\|\s*item\.name/.test(mig));

  /* ⚠ The regex registries were already stem-based and must STAY that way — they have to match
   * the abbreviation (old embedded copies) and the expansion (the packs) at once. */
  const cfg = readFileSync(new URL('../scripts/config.js', import.meta.url), 'utf8');
  const muscle = /\/\^muscle\\s\*replac\/i/.test(cfg);
  t.ok('quicknessNotForReaction still matches on a STEM, so it covers both spellings', muscle);
  t.ok('the stem matches the abbreviation', /^muscle\s*replac/i.test('Muscle Replac. [1]'));
  t.ok('…and the expansion',                /^muscle\s*replac/i.test('Muscle Replacement [1]'));
}
