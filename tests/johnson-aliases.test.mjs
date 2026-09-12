/**
 * Splitting and aliasing the Little Black Book contacts' cyberware · TODO 86
 *
 * The contacts carried their chrome as one prose blob per contact. `splitCyberware` breaks it
 * into implants and `resolveImplant` / `resolveMod` translate the book's wording into the
 * shipped packs' names.
 *
 * ⚠ **Every failure in this area is SILENT.** A bad split or a stale alias means the implant is
 * skipped, and a contact simply has less chrome than the book gave them — nothing errors.
 *
 * The last section resolves every alias against the REAL packs. It degrades to a warning rather
 * than a failure when the databases cannot be opened, because a LevelDB allows one process and
 * `npm test` must not fail merely because Foundry happens to be running.
 */
import { splitCyberware, splitTopLevel } from '../tools/lib/cyberware-split.mjs';
import {
  IMPLANT_ALIASES, EYE_MOD_ALIASES, EAR_MOD_ALIASES, SPELL_ALIASES,
  resolveImplant, resolveMod, resolveSpell,
} from '../tools/lib/johnson-aliases.mjs';

export const name = 'johnson-aliases';

export async function run(t) {
  /* ── Splitting ───────────────────────────────────────────────────────────────────────── */

  /* ⚠ **Commas inside `(…)` are sub-modifications, not siblings.** SR3 p.300 gives cybereyes a
   * .5 Essence allowance their mods ride inside, so splitting on every comma both invents three
   * free-standing implants and charges Essence three times. This is the single most important
   * behaviour in the file. */
  const corp = splitCyberware(
    'Cybereyes (Display Link, Flare Compensation, Low Light), Muscle Replacement 1, '
    + 'Reaction Enhancers 2, Wired Reflexes 2 w/Reflex Trigger');
  t.is('Corp Bodyguard splits into 5 implants, not 8', corp.length, 5);
  t.is('the eyes keep their three mods', corp[0].mods.length, 3);
  t.is('…and the eyes are one implant', corp[0].name, 'Cybereyes');

  /* ⚠ `w/` is a separator: two implants printed together. */
  t.is('w/ splits Wired Reflexes from its Reflex Trigger', corp[3].name, 'Wired Reflexes 2');
  t.is('…and the trigger is its own implant', corp[4].name, 'Reflex Trigger');

  t.is('top-level split ignores nested commas',
    splitTopLevel('A (x, y), B, C (z)').length, 3);
  t.is('bracketed contents are nested too',
    splitTopLevel('Headware Memory [300 Mp], Datajack').length, 2);

  /* ⚠ A grade multiplies Essence and must leave the name; a rating or a memory size must not. */
  const alpha = splitCyberware('Cybereyes [Alphaware] (Image Link)')[0];
  t.is('[Alphaware] is lifted out as a grade', alpha.grade, 'Alphaware');
  t.is('…and removed from the name', alpha.name, 'Cybereyes');
  const mem = splitCyberware('Headware Memory [300 Mp]')[0];
  t.is('[300 Mp] is NOT a grade', mem.grade, null);
  t.is('…and survives in the name', mem.name, 'Headware Memory [300 Mp]');
  const rated = splitCyberware('Headware Radio [Rating 3]')[0];
  t.is('[Rating 3] is not a grade either', rated.grade, null);

  /* ── Resolution ──────────────────────────────────────────────────────────────────────── */

  t.is('Cybereyes → the pack\'s replacement entry',
    resolveImplant('Cybereyes'), 'Eyes, Cyber Replacement');
  t.is('Smartlink 2 is Smartlink II, not "Smartlink [2]"',
    resolveImplant('Smartlink 2'), 'Smartlink II');
  t.is('Reaction Enhancers 2 IS bracketed — the families differ',
    resolveImplant('Reaction Enhancers 2'), 'Reaction Enhancer [2]');
  t.is('Headware Memory [300 Mp] → Memory (300 Mps)',
    resolveImplant('Headware Memory [300 Mp]'), 'Memory (300 Mps)');
  t.is('Headware Radio [Rating 3] → Radio [3]',
    resolveImplant('Headware Radio [Rating 3]'), 'Radio [3]');
  t.is('Cerebral Booster has NO space before its bracket',
    resolveImplant('Cerebral Booster 1'), 'Cerebral Booster[1]');

  /* ⚠ The material is a qualifier in the mods, and the pack says "Bone Lace", not "Bone Lacing". */
  t.is('Bone Lacing (Plastic) reads its material from the mods',
    resolveImplant('Bone Lacing', ['Plastic']), 'Bone Lace, Plastic');
  t.is('…and without one it does not guess', resolveImplant('Bone Lacing', []), null);

  t.is('an eye mod resolves against the eye map',
    resolveMod('Low Light', 'eye'), 'Eyes, Low-Light');
  t.is('an ear mod resolves against the ear map',
    resolveMod('Hearing Amplification', 'ear'), 'Ear Hearing Amplification');

  /* ⚠ **Two fallbacks, each for a real fault in the book's own data.** */
  t.is('Trid Pirate p.42: vision mods listed on an EAR still resolve',
    resolveMod('Opticam', 'ear'), 'Eyes, Opticam');
  t.is('Mercenary p.40: a misplaced paren puts an IMPLANT inside the eye mods',
    resolveMod('Smartlink 2', 'eye'), 'Smartlink II');

  t.is('an unknown mod is not invented', resolveMod('Cyberholster in right leg', 'eye'), null);

  t.is('Increase Reflexes (+2) → the pack\'s spelling',
    resolveSpell('Increase Reflexes (+2)'), 'Incr. Reflexes +2INI DIE');
  t.is('Hot Potato → the pack\'s TYPO, deliberately',
    resolveSpell('Hot Potato'), 'Hot Potatoe');
  t.is('a spell needing no alias returns null', resolveSpell('Manabolt'), null);

  /* ── Every alias must name something that actually ships ─────────────────────────────── */
  const names = new Set();
  let readable = true;
  try {
    const { ClassicLevel } = await import('classic-level');
    const { readdirSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const packs = join(dirname(fileURLToPath(import.meta.url)), '..', 'packs');
    for (const p of readdirSync(packs)) {
      const db = new ClassicLevel(join(packs, p), { valueEncoding: 'json' });
      try { await db.open(); } catch { readable = false; continue; }
      for await (const [k, v] of db.iterator()) {
        if (String(k).startsWith('!items!') && v?.name) names.add(v.name);
      }
      await db.close();
    }
  } catch { readable = false; }

  if (!readable || names.size === 0) {
    // ⚠ Not a failure: a LevelDB allows one process, so an open Foundry legitimately blocks this.
    t.ok('pack cross-check SKIPPED — could not open the packs (is Foundry running?)', true);
    return;
  }

  const targets = [
    ...Object.values(IMPLANT_ALIASES), ...Object.values(EYE_MOD_ALIASES),
    ...Object.values(EAR_MOD_ALIASES), ...Object.values(SPELL_ALIASES),
  ];
  const dead = [...new Set(targets)].filter(n => !names.has(n));
  t.is(dead.length ? `aliases naming nothing that ships: ${dead.join(', ')}`
                   : `every alias resolves to a real pack entry (${targets.length} checked)`,
    dead.length, 0);

  /* The rated patterns build names rather than listing them, so spot-check one per family. */
  const built = ['Smartlink II', 'Reaction Enhancer [2]', 'Memory (300 Mps)', 'Radio [3]',
    'Boosted Reflexes [1]', 'Wired Reflexes [2]', 'Muscle Replacement [1]',
    'Cerebral Booster[1]', 'Filter: Air [10]', 'Vehicle Control Rig [2]', 'Sound Filter [5]',
    'Eyes, Vision Magnification, Electronic[3]'];
  const badBuilt = built.filter(n => !names.has(n));
  t.is(badBuilt.length ? `rated patterns building missing names: ${badBuilt.join(', ')}`
                       : 'every rated pattern builds a name that ships',
    badBuilt.length, 0);
}
