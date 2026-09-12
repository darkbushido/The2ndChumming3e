/**
 * Racial modifiers at character import · SR3 p.56
 *
 * The Shadowrun Character Generator exports a character's attributes in two parts — the points
 * allocated (`attributes`) and the Racial Modifications Table's part (`raceBonuses`). The
 * importer read only the first until 2026-09-11, so every imported metahuman arrived at human
 * ratings. Reported in play: a troll allocated Body 5 came in as Body 5, not 10.
 *
 * ⚠ These modifiers are applied at IMPORT, never at derive time: 38 shipped metahumans already
 * store their finished ratings, and adding the table again would double-apply it to all of them.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'racial';

export async function run(t) {
  const R = SR3EActor.racialAttributes;

  /* ── The case reported in play ────────────────────────────────────────────────────── */
  // 5+5+4+2+3+2 = 21, exactly Priority D: these are allocation points, not ratings.
  const alloc = { Body: 5, Quickness: 5, Strength: 4, Charisma: 2, Intelligence: 3, Willpower: 2 };
  const trollBonuses = { Body: 5, Quickness: -1, Strength: 4, Charisma: -2,
                         Willpower: 0, Intelligence: -2, Notes: 'Thermographic Vision, …' };

  const troll = R({ allocation: alloc, race: 'Troll', raceBonuses: trollBonuses });
  t.is('troll Body 5 → 10',          troll.attributes.body, 10);
  t.is('troll Quickness 5 → 4',      troll.attributes.quickness, 4);
  t.is('troll Strength 4 → 8',       troll.attributes.strength, 8);
  t.is('troll Charisma 2 → 0',       troll.attributes.charisma, 0);
  t.is('troll Intelligence 3 → 1',   troll.attributes.intelligence, 1);
  t.is('troll Willpower 2 → 2',      troll.attributes.willpower, 2);
  t.is('the export\'s own bonuses were used', troll.source, 'export');

  /* ⚠ Charisma 0 is ILLEGAL (only Magic may be 0, p.56) — reported, never clamped to 1. */
  t.is('Charisma 0 is reported as below 1', troll.belowOne.join(), 'charisma');

  /* ⚠ The string `Notes` key must not be added to anything. */
  t.ok('Notes is ignored, not concatenated', Number.isFinite(troll.attributes.body));

  /* ── The book's table as fallback ─────────────────────────────────────────────────── */
  // The generator's default state is an all-zero raceBonuses, so zeros on a troll mean
  // "never filled in", not "a troll with no modifiers".
  const zeros = { Body: 0, Quickness: 0, Strength: 0, Charisma: 0, Willpower: 0, Intelligence: 0 };
  const fallback = R({ allocation: alloc, race: 'Troll', raceBonuses: zeros });
  t.is('all-zero raceBonuses on a troll falls back to the table', fallback.source, 'table');
  t.is('…giving the same Body', fallback.attributes.body, 10);
  t.is('an export with no raceBonuses at all also uses the table',
    R({ allocation: alloc, race: 'troll' }).attributes.strength, 8);

  /* Values arrive as strings from some panels (the generator itself parseInts them). */
  t.is('string bonuses are read as numbers',
    R({ allocation: alloc, race: 'Troll', raceBonuses: { ...zeros, Body: '5' } }).attributes.body, 10);

  /* ── Every metatype against SR3 p.56 ──────────────────────────────────────────────── */
  const ones = { Body: 3, Quickness: 3, Strength: 3, Charisma: 3, Intelligence: 3, Willpower: 3 };
  const at = race => R({ allocation: ones, race }).attributes;
  t.is('dwarf: +1 BOD +2 STR +1 WIL',
    JSON.stringify(at('Dwarf')), JSON.stringify({ body: 4, quickness: 3, strength: 5, charisma: 3, intelligence: 3, willpower: 4 }));
  t.is('elf: +1 QCK +2 CHA',
    JSON.stringify(at('Elf')),   JSON.stringify({ body: 3, quickness: 4, strength: 3, charisma: 5, intelligence: 3, willpower: 3 }));
  t.is('ork: +3 BOD +2 STR -1 CHA -1 INT',
    JSON.stringify(at('Ork')),   JSON.stringify({ body: 6, quickness: 3, strength: 5, charisma: 2, intelligence: 2, willpower: 3 }));
  t.is('human: unchanged', at('Human').body, 3);
  t.is('…and says so', R({ allocation: ones, race: 'Human' }).source, 'none');

  /* ⚠ An unknown race is flagged rather than guessed at. */
  const odd = R({ allocation: ones, race: 'Hobgoblin' });
  t.is('an unknown race applies nothing', odd.attributes.body, 3);
  t.is('…and reports itself', odd.source, 'unknown');

  /* ⚠ Only the six bought attributes — a racial Reaction would double-count QCK and INT. */
  const withRea = R({ allocation: alloc, race: 'Troll',
    raceBonuses: { ...trollBonuses, Reaction: 3, Initative: 1 } });
  t.ok('Reaction and Initative in raceBonuses are not attributes here',
    !('reaction' in withRea.attributes));

  /* ════════════════════════════════════════════════════════════════════════════
   *  Troll dermal armor · SR3 p.56 / p.281 — an AUGMENTATION, added at derive time
   * ════════════════════════════════════════════════════════════════════════════ */
  const derive = (metatype, body, items = []) => {
    const sys = { metatype, attributes: {}, wounds: {} };
    const attr = {};
    for (const k of ['body','quickness','strength','charisma','intelligence','willpower','reaction','essence','magic'])
      attr[k] = { base: 4, value: 4 };
    attr.body = { base: body, value: body };
    SR3EActor.prototype._prepareCharacter.call({ items, system: sys }, sys, attr);
    return { d: sys.derived, attr };
  };

  t.is('a troll gets +1 dermal armor', SR3EActor.racialDermalArmor('troll'), 1);
  t.is('…matched however the free-text field was typed', SR3EActor.racialDermalArmor(' Troll '), 1);
  t.is('an ork gets none', SR3EActor.racialDermalArmor('ork'), 0);
  t.is('a blank metatype gets none', SR3EActor.racialDermalArmor(undefined), 0);

  /* The book's own trolls print it in parentheses (Mr. Johnson's Little Black Book). Stored at
   * the unbracketed figure, each must come out at the bracketed one — no double count. */
  for (const [name, stored, printed] of [
    ['Dock Worker (p.67)', 10, 11], ['Club Owner (p.43)', 8, 9], ['Troll Street Dealer (p.57)', 8, 9],
  ]) {
    t.is(`${name}: Body ${stored} (${printed})`, derive('troll', stored).attr.body.value, printed);
  }
  t.is('…while the stored rating is untouched', derive('troll', 10).attr.body.base, 10);
  t.is('a human at Body 10 stays 10', derive('human', 10).attr.body.value, 10);

  /* ⚠ It stacks with Dermal Plating the way any two Body augmentations do — Mr. Fix-It (p.47)
   * prints 10 (12): dermal armor plus plastic bone lacing. */
  const lacing = { type: 'cyberware', system: { bonusBod: 1 } };
  t.is('Mr. Fix-It (p.47): troll 10 + bone lacing → 12', derive('troll', 10, [lacing]).attr.body.value, 12);

  /* ⚠ **Not in `cyberBonus`.** Attribute Boost reads that for the TECHNOLOGICAL increases it
   * cannot combine with (p.169); a troll's hide is not technology. */
  const tr = derive('troll', 10).d;
  t.is('dermal armor is reported as racial', tr.racialBonus.bod, 1);
  t.is('…and does NOT appear as a cyber bonus', tr.cyberBonus.bod, 0);

  /* ════════════════════════════════════════════════════════════════════════════
   *  Troll natural Reach · SR3 p.56, p.121 — "cumulative with weapon Reach"
   * ════════════════════════════════════════════════════════════════════════════ */
  const club   = { system: { reach: 1 } };
  const fists  = { system: { reach: 0 } };
  const trollA = { system: { metatype: 'troll' } };
  const human  = { system: { metatype: 'human' } };
  const reach  = (w, a) => SR3EActor.meleeReach(w, a).total;
  // The differential exactly as rollMeleeAttack takes it: |atk − def| of the two totals.
  const diff   = (w1, a1, w2, a2) => Math.abs(reach(w1, a1) - reach(w2, a2));

  t.is('a troll with a club fights at Reach 2', reach(club, trollA), 2);
  t.is('a bare-handed troll fights at Reach 1', reach(fists, trollA), 1);
  t.is('a human with a club fights at Reach 1', reach(club, human), 1);
  t.is('…and reports the natural part separately', SR3EActor.meleeReach(club, trollA).natural, 1);
  t.is('a missing weapon (bare hands) still gets natural Reach', reach(null, trollA), 1);
  t.is('a vehicle or spirit (no metatype) gets none', reach(club, { system: {} }), 1);
  t.is('matched however the free-text field was typed', reach(fists, { system: { metatype: ' Troll ' } }), 1);

  /* The book's own example (p.121): a sword (Reach 1) against an unarmed opponent is 1. */
  t.is('p.121: sword vs unarmed human is a difference of 1', diff(club, human, fists, human), 1);
  t.is('troll with a club vs unarmed human is a difference of 2', diff(club, trollA, fists, human), 2);
  t.is('unarmed troll vs human with a club: equal reach, difference 0', diff(fists, trollA, club, human), 0);
  /* ⚠ Equal reach must cancel. Adding the natural point to the DIFFERENCE instead of to each
   * fighter would give troll-vs-troll a phantom 1. */
  t.is('troll vs troll, same weapons: difference 0', diff(club, trollA, club, trollA), 0);

  /* ════════════════════════════════════════════════════════════════════════════
   *  Flechette vs dermal armor · SR3 p.116
   * ════════════════════════════════════════════════════════════════════════════ */
  const F = SR3EActor.flechetteRaisesLevel;
  t.is('an unarmoured human takes the level increase', F({ ballistic: 0, impact: 0, dermalArmor: 0 }), true);
  t.is('an unarmoured troll does not — dermal armor negates it',
    F({ ballistic: 0, impact: 0, dermalArmor: SR3EActor.racialDermalArmor('troll') }), false);
  t.is('an armoured target never takes it (flechetteArmor applies instead)', F({ ballistic: 2, impact: 1 }), false);
  t.is('impact alone counts as armoured', F({ ballistic: 0, impact: 1 }), false);
  t.is('no arguments reads as unarmoured, no dermal', F(), true);

  /* ── Which implants ARE dermal armor · M&M p.133: "dermal armor (plating or sheath)" ── */
  const D = (metatype, ...names) => SR3EActor.dermalArmorSources({
    system: { metatype }, items: names.map(n => (Array.isArray(n) ? { type: n[0], name: n[1] } : { type: 'cyberware', name: n })),
  });
  for (const n of ['Dermal Plating [1]', 'Dermal Plating 3', 'Dermal Sheath [2]',
                   'Dermal Sheath Ruthenium [1]', 'D. Sheath Ruthenium [3]']) {
    t.is(`"${n}" is dermal armor`, D('human', n).join(), n);
  }
  t.is('a troll is, by its hide', D('troll').join(), 'troll dermal armor');
  t.is('a troll with plating lists both', D('troll', 'Dermal Plating [2]').length, 2);
  t.is('a human with nothing has none', D('human').length, 0);
  /* ⚠ Orthoskin is bioware ARMOUR, named beside dermal armor as a different thing (M&M). */
  t.is('Orthoskin is not dermal armor', D('human', ['bioware', 'Orthoskin[2]']).length, 0);
  t.is('Subdermal Speakers / Display are not armour',
    D('human', 'Subdermal Speakers', '+Subdermal Display').length, 0);
  t.is('a GEAR item named Dermal Plating does not count', D('human', ['gear', 'Dermal Plating [1]']).length, 0);

  /* End to end as the soak card asks it: an unarmoured human with plating keeps the level. */
  t.is('unarmoured human with Dermal Plating: no flechette increase',
    F({ ballistic: 0, impact: 0, dermalArmor: D('human', 'Dermal Plating [1]').length }), false);
  t.is('unarmoured human with Orthoskin only: still takes it (armour not tracked yet)',
    F({ ballistic: 0, impact: 0, dermalArmor: D('human', ['bioware', 'Orthoskin[1]']).length }), true);

  t.is('SR3E.dermalArmorImplants matches the fallback in dermalArmorSources',
    SR3E.dermalArmorImplants.map(r => r.source).join(' | '),
    [/^\s*dermal\s+(plating|sheath)\b/i, /^\s*d\.\s*sheath\b/i, /^\s*dermal\s+armou?r\b/i].map(r => r.source).join(' | '));

  /* ════════════════════════════════════════════════════════════════════════════
   *  Dwarf resistance to disease and toxins · SR3 p.56 · TODO 98
   * ════════════════════════════════════════════════════════════════════════════ */
  const toxinOf = d => SR3EActor.situationalBonus(d.situationalBonuses, 'toxin');

  t.is('a dwarf has +2 against disease and toxins', toxinOf(derive('dwarf', 4).d).dice, 2);
  t.is('…matched however the free-text field was typed', toxinOf(derive(' Dwarf ', 4).d).dice, 2);
  t.is('a troll has none', toxinOf(derive('troll', 10).d).dice, 0);
  t.is('a human has none', toxinOf(derive('human', 4).d).dice, 0);

  /* ⚠ Dice on the TEST, never the attribute — +2 Body would add to every soak and knockdown. */
  t.is('a dwarf\'s Body attribute is unchanged by it', derive('dwarf', 4).attr.body.value, 4);

  /* ⚠ It SUMS with Nephritic Screen (M&M, +1): two sources covering one situation are two
   * purchases (see situationalBonus). */
  const screen = { type: 'bioware', name: 'Nephritic Screen', system: {} };
  t.is('dwarf + Nephritic Screen: +3', toxinOf(derive('dwarf', 4, [screen]).d).dice, 3);
  t.is('a human with Nephritic Screen alone: +1', toxinOf(derive('human', 4, [screen]).d).dice, 1);

  /* What the Body roll dialog offers. */
  const offer = SR3EActor.toxinResistanceOffer(derive('dwarf', 4, [screen]).d.situationalBonuses);
  t.is('the dialog offers the summed dice', offer.dice, 3);
  t.ok('…and names every source', /Dwarf resistance/.test(offer.label) && /Nephritic Screen/.test(offer.label));
  t.is('nothing to offer a human: empty label, so no checkbox is rendered',
    SR3EActor.toxinResistanceOffer(derive('human', 4).d.situationalBonuses).label, '');

  /* The config table must never be mutated through a derivation's copy. */
  const firstCopy = SR3EActor.racialSituational('dwarf')[0];
  if (firstCopy) firstCopy.dice = 99;
  t.is('racialSituational returns copies', SR3EActor.racialSituational('dwarf')[0]?.dice, 2);

  /* ── Config and fallback must agree ───────────────────────────────────────────────── */
  t.is('SR3E.racialModifiers matches the fallback mirror',
    JSON.stringify(SR3E.racialModifiers), JSON.stringify(SR3EActor._RACIAL_MODS_FALLBACK));
}
