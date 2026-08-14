/**
 * Which skill supplies the Electronic Warfare dice — SR3EMIJI._pickEwSkill.
 *
 * The old selector was `items.find(i => i.name.toLowerCase().includes('electronic'))`,
 * which is wrong in two independent ways. Both are pinned here because both are the kind
 * of thing a later "simplification" reintroduces: the substring test looks reasonable, and
 * `find` looks like "the electronics skill" if you have not noticed there are three.
 *
 *   1. THREE SR3 SKILLS CONTAIN THE SUBSTRING — `Electronics`, `Electronics B/R` and
 *      `Electronic Intelligence` are all real, all in `config.js`, and `find` returns the
 *      first in ITEM ORDER. So the dice a rigger rolled depended on the order they built
 *      their sheet in, which is invisible on screen and impossible to reason about.
 *
 *   2. THE SPECIALISATION WAS IGNORED — Electronic Warfare is a specialisation OF
 *      Electronics, and a specialisation's `level` is its bonus. Electronics 4 (Electronic
 *      Warfare +2) is 6 dice for an EW test; the old code rolled 4.
 *
 * The rule is a RANKING, not a filter: a loose match still counts, last, so nobody who
 * had dice before silently loses them. Ties inside a tier go to the higher rating, so the
 * answer never depends on item order again.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EMIJI } = await import('../scripts/SR3EMIJI.js');

export const name = 'ew-skill';

const skill = (name, rating, specialisations = []) => ({ name, rating, specialisations });
const EW    = level => [{ name: 'Electronic Warfare', level }];
const pick  = list => SR3EMIJI._pickEwSkill(list);

export async function run(t) {
  // ── Nothing to pick ────────────────────────────────────────────────────────
  t.is('no skills at all → 0 dice', pick([]).rating, 0);
  t.is('undefined list does not throw', pick(undefined).rating, 0);
  t.is('an unrelated skill is not an EW skill', pick([skill('Pistols', 6)]).rating, 0);

  // ── The specialisation is the point ────────────────────────────────────────
  t.is('Electronics 4 (Electronic Warfare +2) rolls 6 — the bonus was being dropped',
    pick([skill('Electronics', 4, EW(2))]).rating, 6);
  t.is('Electronics with no EW specialisation rolls its base rating',
    pick([skill('Electronics', 4)]).rating, 4);
  t.ok('the card names the specialisation, so the +2 is visible rather than mysterious',
    /Electronic Warfare/.test(pick([skill('Electronics', 4, EW(2))]).name));

  // ── Item order must not decide the dice — THE ORIGINAL BUG ─────────────────
  const bnr  = skill('Electronics B/R', 6);
  const elec = skill('Electronics', 3, EW(2));
  t.is('B/R listed first must not win — the EW specialisation outranks it',
    pick([bnr, elec]).rating, 5);
  t.is('and the reversed order gives the identical answer',
    pick([elec, bnr]).rating, 5);
  t.is('Electronic Intelligence 8 is a different skill — plain Electronics still wins',
    pick([skill('Electronic Intelligence', 8), skill('Electronics', 2)]).rating, 2);

  // ── Ranking, not filtering ─────────────────────────────────────────────────
  t.is('a loose match is still offered when it is all the rigger has — nobody loses dice',
    pick([skill('Electronics B/R', 5)]).rating, 5);
  t.is('between two loose matches the higher rating wins',
    pick([skill('Electronic Intelligence', 3), skill('Electronics B/R', 5)]).rating, 5);

  // ── Rigger 3’s own worked example (R3 p.37) ─────────────────────────────────
  //
  //   "Trixie has an Electronics Skill 4, with an Electronic Warfare specialization of 6.
  //    She rolls 6 dice against a Target Number 6."
  //
  // The book prints the exact case this selector exists for. Before the fix the code rolled
  // `skill.system.rating` — 4 — and R3 says 6.
  t.is("Trixie: Electronics 4 with an EW specialisation rolls 6 dice (R3 p.37)",
    pick([skill('Electronics', 4, EW(2))]).rating, 6);

  // Her Intrusion Factor then STARTS at that 6 before any successes are allocated:
  // "A rigger's Intrusion Factor is equal to his Electronics (Electronic Warfare) skill
  // plus any successes allocated" — 6, rising to 8 when she spends two. The system stores
  // `skill.rating + allocated`; this pins the baseline the sum depends on.
  t.is("and that same rating is the Intrusion Factor baseline",
    pick([skill('Electronics', 4, EW(2))]).rating + 2, 8);

  // ── A specialisation on an oddly-named skill still counts ──────────────────
  // The specialisation identifies the skill, so it is matched even when the parent skill's
  // name has no "electronic" in it — a renamed or houseruled skill still works.
  t.is('an Electronic Warfare specialisation is decisive regardless of the skill name',
    pick([skill('Signals', 4, EW(2))]).rating, 6);
}
