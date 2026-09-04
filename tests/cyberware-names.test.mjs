/**
 * Cyberware name expansion · TODO 87
 *
 * The packs inherited contracted names from the Shadowrun Character Generator's fixed-width UI.
 * `name` is now the book's wording; the upstream string is kept in `system.srcgName`.
 *
 * ⚠ **The whole point of this file is the SECOND section.** Renaming is easy; the failure mode
 * is silent. `SRCG_BONUSES` is keyed by the UPSTREAM name and is *generated* from upstream data,
 * so a rename that did not keep the old string would stop 43 of its 151 entries from ever
 * matching again — including all four Muscle Replacement grades — with no error at all. The
 * bonus would simply not be applied.
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

  /* ── Two the book settled that a guess would get wrong ───────────────────────────────── */
  t.is('Laser Mic. is a MICROPHONE (M&M p.14), not a microscope',
    expandCyberwareName('Eye, Laser Mic. [1]'), 'Eye, Laser Microphone [1]');
  t.is('Nano-Bio sys. is a NANO-BIOMONITOR (M&M p.91)',
    expandCyberwareName('Nano-Bio sys. Guardian'), 'Nano-biomonitor, Guardian');

  /* ════════════════════════════════════════════════════════════════════════════
   *  Why `srcgName` exists — the silent failure this prevents
   * ════════════════════════════════════════════════════════════════════════════ */

  const bonusKeys = Object.keys(SRCG_BONUSES);
  const wouldRename = bonusKeys.filter(k => expandCyberwareName(k) !== k);

  t.ok('SRCG_BONUSES names items this map renames — so the hazard is real',
    wouldRename.length > 20);
  t.ok('…specifically, a large minority of all bonus entries',
    wouldRename.length / bonusKeys.length > 0.2);

  /* The four grades whose Quickness carve-out was wired in 2026-09-01. If the rename broke
   * their lookup, Muscle Replacement would stop granting anything at all. */
  for (const n of ['Muscle Replac. [1]', 'Muscle Replac. [2]',
                   'Muscle Replac. [3]', 'Muscle Replac. [4]']) {
    t.ok(`${n} is keyed in SRCG_BONUSES by its UPSTREAM name`, Boolean(SRCG_BONUSES[n]));
    t.ok(`…and is one this map renames`, expandCyberwareName(n) !== n);
  }

  /* ⚠ Source-level invariant: the matcher must consult `srcgName` BEFORE `name`. Reproducing
   * this behaviourally needs a live world, so the check is on the source, like `pool-spend`. */
  const mig = readFileSync(new URL('../scripts/SR3EMigrations.js', import.meta.url), 'utf8');
  t.ok('_patchItemsByName keys on srcgName before name',
    /byName\[\s*item\.system\?\.srcgName\s*\|\|\s*item\.name\s*\]/.test(mig));

  /* ⚠ The regex registries were already stem-based and must STAY that way — they have to match
   * the abbreviation (old embedded copies) and the expansion (the packs) at once. */
  const cfg = readFileSync(new URL('../scripts/config.js', import.meta.url), 'utf8');
  const muscle = /\/\^muscle\\s\*replac\/i/.test(cfg);
  t.ok('quicknessNotForReaction still matches on a STEM, so it covers both spellings', muscle);
  t.ok('the stem matches the abbreviation', /^muscle\s*replac/i.test('Muscle Replac. [1]'));
  t.ok('…and the expansion',                /^muscle\s*replac/i.test('Muscle Replacement [1]'));
}
