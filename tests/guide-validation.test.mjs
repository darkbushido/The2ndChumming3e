/**
 * Three rules the guide validation caught the code getting wrong (2026-09-22).
 *
 * All three were verified against the PDF before anything was changed, and all three had shipped:
 * two silently, one with CLAUDE.md describing the wrong behaviour as though it were settled. The
 * quotes below are the printed pages, and they are what these assertions defend.
 *
 * ⚠ These are source-level checks. The grenade branch lives inside `_postWaveCard`, the drain TN
 * inside `_postDrainCard`, and the Force cap inside a `DialogV2` callback — none of which can be
 * imported without Foundry. The arithmetic each one relies on (`stageDamage`) is unit-tested and
 * mutated elsewhere; what is checkable here is that each rule is WIRED, which is precisely what was
 * missing. (See the ledger note about a call site not being a working feature — the lesson there
 * was that greping for a call proves nothing, so each check below pins behaviour-bearing code, not
 * just a name.)
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'guide-validation';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const actor = read('scripts/documents/SR3EActor.js');
  const item = read('scripts/documents/SR3EItem.js');
  const models = read('scripts/data/ItemDataModels.js');

  /* ══ 1. Grenade blast stages by the THROW's successes · SR3 p.119 ══════════ */
  // "If the attacker rolled more successes, the Damage Level of the blast increases one level for
  //  every two successes over the target's success total."
  //
  // ⚠ Only half of this was implemented. The soak card already staged DOWN on the target's Body
  //   successes; the thrower's successes did nothing but tighten the scatter, so a perfect throw
  //   hit no harder than a fumbled one.
  const aoe = actor.slice(actor.indexOf('state.isAoE && state.aoeCenter'),
    actor.indexOf('state.isAoE && state.aoeCenter') + 7000);
  t.ok('the blast stages the level by the throw\'s successes',
    /SR3EItem\.stageDamage\(\{ power: t\.power, level: t\.level, isStun \}, successes\)/.test(aoe));
  // ⚠ It takes a PARSED code, not a string. The first attempt passed `` `${t.power}${t.level}` ``,
  //   which destructures to undefined and stages from nothing — it produced a Moderate with no
  //   Power at all. Play would not have shown that; this assertion did.
  t.ok('…never a template string, which stages from undefined',
    !/stageDamage\(`/.test(aoe));
  t.ok('…and says so on the card when it moved', /staged up by \$\{successes\}/.test(aoe));
  // ⚠ POWER must NOT be staged: it is the distance-reduced blast Power and also the Damage
  //   Resistance TN, so staging it would make the wound both likelier and worse, twice over.
  t.ok('…taking the staged LEVEL only, never the power',
    /return \{ \.\.\.t, baseLevel: t\.level, level: up\.level, staged: up\.level !== t\.level \}/.test(aoe));
  // The arithmetic itself, on the book's own shape: 10S at 3m is 7S, and 4 net successes → 2 stages.
  const blast = SR3EItem.stageDamage({ power: 7, level: 'S' }, 4);
  t.eq('4 hits on a 7S blast is 7D — power untouched, level +2', [blast.power, blast.level], [7, 'D']);
  t.is('…and 1 hit is not yet a stage', SR3EItem.stageDamage({ power: 7, level: 'S' }, 1).level, 'S');
  t.ok('the optional half-Power rule is named as NOT implemented', /OPTIONAL rule/.test(aoe));

  /* ══ 2. The Sorcery Test's Rule of One costs +2 Drain · SR3 p.182 ══════════ */
  // "If the results are all ones (see Rule Of One, p. 38), the spell fails and the target number
  //  for the Drain Resistance Test is increased by +2."
  //
  // ⚠ The glitch was already computed for the dice card and simply never reached the drain.
  t.ok('the cast carries its glitch to the drain', /castGlitch:\s+!!glitch/.test(actor));
  t.ok('…and the drain adds +2 for it', /const castGlitch = !!payload\.castGlitch;\s*\n\s*if \(castGlitch\) drainTN \+= 2;/.test(actor));
  // ⚠ Cumulative with sustaining, not an alternative to it — a glitched cast while sustaining pays
  //   both, and the two must stay separate additions.
  const drainFn = actor.slice(actor.indexOf('async _postDrainCard'), actor.indexOf('async _postDrainCard') + 2600);
  t.ok('…on top of the sustaining modifier, not instead of it',
    drainFn.indexOf('drainTN += sustainTN') < drainFn.indexOf('if (castGlitch) drainTN += 2'));
  t.ok('…and the card says why the number moved', /Rule of One on the Sorcery Test/.test(actor));

  /* ══ 3. A spell is learned at a Force and cast at or below it · SR3 p.178 ══ */
  // "Spellcasters learn spells at a specific Force. They can cast the spell at a lower Force, if
  //  desired, but can never cast the spell at a higher Force than they have learned."
  //
  // ⚠ There was no FIELD at all, so the limit could not even be shown, let alone applied.
  const spellModel = models.slice(models.indexOf('class SpellData'), models.indexOf('class SpellData') + 1800);
  t.ok('SpellData records the learned Force', /force:\s+new NumberField\(\{ integer: true, nullable: true, initial: null, min: 1 \}\)/.test(spellModel));
  // ⚠ NULL means NOT RECORDED, not zero. Every shipped spell predates the field; reading a null as
  //   0 would cap every existing spell at 0 and make the whole library uncastable.
  t.ok('…null is "not recorded", so it caps nothing',
    /Number\(this\.system\.force\) > 0 \? Number\(this\.system\.force\) : null/.test(item));
  t.ok('…and the dialog says so rather than silently allowing anything',
    /no learned Force recorded on this spell — uncapped/.test(item));
  t.ok('the dialog caps the input at the learned Force', /max="\$\{learnedForce \?\? 99\}"/.test(item));
  // ⚠ `max` is a hint the browser applies to spinner clicks only — a typed value sails past it, the
  //   same defect the drain-pool note records. The clamp on READ is what actually enforces it.
  t.ok('…and clamps on read, which is what actually enforces it',
    /if \(learnedForce\) force = Math\.min\(force, learnedForce\);/.test(item));
  const itemSheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('the item sheet can record it, or nothing could ever be capped',
    /_f\('Learned Force', 'force'/.test(itemSheet));
  t.ok('…and its placeholder says blank means not recorded',
    /placeholder="not recorded"/.test(itemSheet));
  t.ok('…defaulting to the learned Force, so casting lower is a choice',
    /const defaultForce = learnedForce \?\? Math\.max\(1, sorceryRating\)/.test(item));
}
