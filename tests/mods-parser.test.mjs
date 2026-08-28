/**
 * The `Mods` parser — SR3EMods.parseMods.  · upstream issue #199
 *
 * The Shadowrun Character Generator encodes an item's mechanical effects as `+2RCT,+1INI,`.
 * 186 entries across Cyberware and Bioware carry one, and the system parsed NONE of them: the
 * `v2` populate rewrite dropped the handling the legacy macro had, so every shipped cyberware
 * and bioware document has empty `bonus*` fields. That is why Enhanced Articulation did
 * nothing when it was added to a character — and it is true of all ~900 of them.
 *
 * ⚠ PARSE `Mods`, NEVER `Notes`. The maintainer confirmed it: "So Mods is authoritative. These
 * codes do actually do stuff on the backend." `Notes` is a flattened human-readable view.
 *
 * Three things make this harder than it looks, and each has a section below:
 *
 *   1. TWO racial encodings coexist in the data TODAY — 3-letter (`ROD`) and 4-letter
 *      (`RBOD`) — and neither of the maintainer's own two maps covers both.
 *   2. Most codes are NOT attributes. `STG` and `MNE` alter karma spending, `DGX` alters
 *      lifestyle cost. Treating every token as a bonus invents phantom attributes.
 *   3. Some are real modifiers with nowhere to go (armour, pools, rigger stats). They must be
 *      REPORTED, not dropped — this data has already lost information once.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { parseMods, SR3E_MOD_CODES } = await import('../scripts/SR3EMods.js');

export const name = 'mods-parser';

export async function run(t) {
  const p = m => parseMods(m);
  const b = m => p(m).bonuses;

  /* ==== The book's own worked items ====
   *
   * Wired Reflexes is the check that the INI code means initiative DICE, not an initiative
   * bonus: SR3 gives Wired 1 "+2 Reaction and +1d6 initiative", and the data says "+2RCT,+1INI".
   */
  t.is('Wired Reflexes [1] — Reaction', b('+2RCT,+1INI,').bonusRea, 2);
  t.is('…and one initiative DIE',       b('+2RCT,+1INI,').bonusInitDice, 1);
  t.is('Wired Reflexes [3] — Reaction', b('+6RCT,+3INI,').bonusRea, 6);
  t.is('…and three dice',               b('+6RCT,+3INI,').bonusInitDice, 3);

  // Suprathyroid Gland: "+1NCT,+1RTR,+1RCK,+1ROD,+1STG,". Its own Notes line reads
  // "+1RCT,+1STR,+1QCK,+1BOD" — so racial/natural codes collapse to the plain attribute, and
  // the fifth token is a flag rather than a fifth attribute.
  const stg = p('+1NCT,+1RTR,+1RCK,+1ROD,+1STG,');
  t.is('Suprathyroid: Reaction',  stg.bonuses.bonusRea, 1);
  t.is('…Strength',               stg.bonuses.bonusStr, 1);
  t.is('…Quickness',              stg.bonuses.bonusQui, 1);
  t.is('…Body',                   stg.bonuses.bonusBod, 1);
  t.is('…and exactly four bonuses, not five', Object.keys(stg.bonuses).length, 4);
  t.is('…with STG kept as a flag', stg.flags.join(), 'STG');

  /* ==== 1. Both racial encodings ==== */
  t.is('3-letter racial Body (ROD)',  b('+1ROD').bonusBod, 1);
  t.is('4-letter racial Body (RBOD)', b('+1RBOD').bonusBod, 1);
  t.is('3-letter racial Str (RTR)',   b('+1RTR').bonusStr, 1);
  t.is('4-letter racial Str (RSTR)',  b('+1RSTR').bonusStr, 1);
  t.is('3-letter racial Qui (RCK)',   b('+1RCK').bonusQui, 1);
  t.is('4-letter racial Qui (RQCK)',  b('+1RQCK').bonusQui, 1);
  t.is('racial Intelligence is RNT, not RINT', b('+1RNT').bonusInt, 1);
  t.is('"both" racial+natural (XOD)', b('+1XOD').bonusBod, 1);
  t.is('…XCK',                        b('+1XCK').bonusQui, 1);
  t.is('…XTR',                        b('+1XTR').bonusStr, 1);

  // ⚠ Reaction uses N, not R, because racial Reaction would collide with plain RCT. That
  // collision is the reason the 3-letter scheme is not injective and the 4-letter one exists.
  t.is('natural Reaction (NCT) is Reaction', b('+1NCT').bonusRea, 1);
  t.is('plain RCT is also Reaction',         b('+1RCT').bonusRea, 1);
  t.is('natural Initiative (NNI) is dice',   b('+1NNI').bonusInitDice, 1);

  /* ==== 2. Feature flags are NOT bonuses ==== */
  for (const code of ['STG', 'MNE', 'DGX', 'DJK', 'PCL', 'PCA', 'MUL', 'AST']) {
    const r = p(`+1${code}`);
    t.is(`${code} produces no bonus`, Object.keys(r.bonuses).length, 0);
    t.is(`…and is reported as a flag`, r.flags.join(), code);
  }
  // Datajack appears BOTH as "+1DJK" and as "+DJK" with no number at all.
  t.is('a flag with no number still parses', p('+DJK').flags.join(), 'DJK');
  t.is('…and yields no bonus',               Object.keys(p('+DJK').bonuses).length, 0);

  /* ==== 3. Real modifiers with no SR3E field are REPORTED, not dropped ==== */
  const arm = p('+3IMP,+3BAL,');
  t.is('armour codes yield no attribute bonus', Object.keys(arm.bonuses).length, 0);
  t.is('…and are reported as unmapped',         arm.unmapped.length, 2);
  t.is('…carrying their value',                 arm.unmapped[0].value, 3);
  t.ok('…and a human-readable meaning',         /armour/.test(arm.unmapped[0].meaning));
  for (const code of ['TAS', 'HAC', 'CPL', 'VCT', 'VNI', 'VCR', 'MAG']) {
    t.is(`${code} is unmapped rather than dropped`, p(`+1${code}`).unmapped.length, 1);
  }

  /* ==== Negative modifiers ====
   *
   * ⚠ Three real entries carry a penalty — BIODYNE "Enable" Cyberlimbs (-1RCT) and Grade
   * Subdermal Armor [8]/[9] (+3BOD,-1RCT). The bonus fields had `min: 0`, so these were
   * silently stored as 0 and the items looked as though they had no penalty at all. The floor
   * was removed for exactly these.
   */
  t.is('a lone negative parses',            b('-1RCT,').bonusRea, -1);
  t.is('Grd. Subdermal Armor [8] — Body',   b('+3BOD,-1RCT,').bonusBod, 3);
  t.is('…and its Reaction PENALTY survives', b('+3BOD,-1RCT,').bonusRea, -1);

  /* ==== Accumulation and shape ==== */
  t.is('the same code twice accumulates', b('+1BOD,+2BOD').bonusBod, 3);
  t.is('racial and plain accumulate together — SR3E tracks no racial maxima',
    b('+1BOD,+1ROD').bonusBod, 2);
  t.is('a trailing comma is normal upstream and yields nothing extra',
    Object.keys(b('+1BOD,')).length, 1);
  t.is('an empty string yields nothing',   Object.keys(b('')).length, 0);
  t.is('undefined does not throw',         Object.keys(b(undefined)).length, 0);
  t.is('whitespace is tolerated',          b(' +1BOD , +1STR ').bonusBod, 1);
  t.is('lowercase codes are accepted',     b('+1bod').bonusBod, 1);

  /* ==== NOTHING IS SILENTLY DISCARDED ====
   *
   * The design rule: every token lands in exactly one of bonuses / flags / unmapped /
   * unparsed. A parser that quietly ignores what it does not understand loses this data a
   * second time, which is how it got lost the first time.
   */
  const junk = p('+1BOD,+1STG,+3IMP,%%%,');
  t.is('the attribute went to bonuses',  Object.keys(junk.bonuses).length, 1);
  t.is('the flag went to flags',         junk.flags.length, 1);
  t.is('the armour went to unmapped',    junk.unmapped.length, 1);
  t.is('and the junk went to unparsed',  junk.unparsed.length, 1);
  t.is('…named, so it can be chased',    junk.unparsed[0], '%%%');

  /* ==== The tables are internally consistent ==== */
  const { ATTRIBUTE_CODES, FLAG_CODES, UNMAPPED_CODES } = SR3E_MOD_CODES;
  const overlap = Object.keys(ATTRIBUTE_CODES)
    .filter(c => FLAG_CODES.has(c) || UNMAPPED_CODES[c]);
  t.is('no code is in two tables', overlap.join(), '');
  t.ok('every attribute code maps to a bonus* field',
    Object.values(ATTRIBUTE_CODES).every(f => /^bonus[A-Z]/.test(f)));
}
