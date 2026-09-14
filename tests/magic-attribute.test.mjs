/**
 * The Magic ATTRIBUTE is the effective rating — F5 (TESTING.md).
 *
 * > "If the Force of the spell is greater than the caster's Magic Attribute, the Drain causes
 * > physical damage." — SR3 p.182; the same words for dispelling and for summoning, and a ward's
 * > maximum Force "equals your Magic Attribute".
 *
 * Essence loss lowers that attribute itself (*"a magician with an Essence Rating of 4.5 has a
 * Magic Rating of 4"*), which is `magic.value`. Casting read `value`; dispelling, banishing,
 * conjuring, wards and two Spell Pool recounts read `magic.base` — so one caster at one Force took
 * Physical Drain in one flow and Stun in another, and could spend Spell Pool the sheet did not show.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'magic-attribute';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  // The F5 repro: base 6, Essence has taken it to 4.
  const drained = { magic: { base: 6, value: 4 }, intelligence: { base: 5, value: 5 }, willpower: { base: 4, value: 4 } };

  t.is('the Magic Attribute is the effective rating (Essence 4.5 → Magic 4)', SR3EActor.magicAttribute(drained), 4);
  t.is('…falling back to base for an actor not yet derived', SR3EActor.magicAttribute({ magic: { base: 5 } }), 5);
  t.is('…0 for the mundane', SR3EActor.magicAttribute({}), 0);
  t.ok('Force 5 against that caster is Physical Drain — in every flow now', 5 > SR3EActor.magicAttribute(drained));

  t.is('Spell Pool reads the effective Magic: ⌊(5 + 4 + 4) ÷ 3⌋ = 4, not ⌊(5 + 4 + 6) ÷ 3⌋ = 5', SR3EActor.spellPoolFor(drained), 4);
  t.is('…and the effective Intelligence and Willpower the sheet shows',
    SR3EActor.spellPoolFor({ magic: { base: 6, value: 6 }, intelligence: { base: 4, value: 7 }, willpower: { base: 4, value: 4 } }), 5);
  t.is('…null for someone not Awakened', SR3EActor.spellPoolFor({ magic: { base: 0, value: 0 }, intelligence: { value: 6 } }), null);
  t.is('…an Awakened caster burned down to 0 still has a pool, off INT and WIL', SR3EActor.spellPoolFor({ magic: { base: 6, value: 0 }, intelligence: { value: 6 }, willpower: { value: 6 } }), 4);

  /* ── Every flow uses them ──────────────────────────────────────────────────────── */
  const actor = read('scripts/documents/SR3EActor.js');
  const method = name => { const i = actor.indexOf(name); return i < 0 ? '' : actor.slice(i, i + 6000); };
  t.ok('dispelling decides Physical Drain off the Magic Attribute', /drainIsPhysical = force > SR3EActor\.magicAttribute/.test(method('async rollDispel()')));
  t.ok('…and counts its Spell Pool with the one formula', /SR3EActor\.spellPoolFor/.test(method('async rollDispel()')));
  t.ok('banishing: the spirit resists against the Magic Attribute', /effectiveMagic = Math\.max\(1, SR3EActor\.magicAttribute/.test(method('async rollBanish()')));
  t.ok('spending Spell Pool caps at the pool the sheet shows', /SR3EActor\.spellPoolFor/.test(method('async spendSpellPool(')));
  t.ok('the Drain card\'s warning prints the Magic it compared against', /Force \(\$\{force\}\) &gt; Magic \(\$\{magicAttr\}\)/.test(actor));
  t.ok('the derivation uses the same formula', /const spellPoolBase = SR3EActor\.spellPoolFor\(attr\)/.test(actor));

  t.ok('casting counts its Spell Pool with the one formula', /SR3EActor\.spellPoolFor\(sAttr\)/.test(read('scripts/documents/SR3EItem.js')));
  t.ok('conjuring\'s Physical Drain reads the effective Magic', /magic\?\.value \?\? conjurer\.system\?\.attributes\?\.magic\?\.base/.test(read('scripts/documents/SR3ESpiritSummoning.js')));
  const ward = read('scripts/documents/SR3EWard.js');
  t.ok('a ward\'s Force defaults to, and is capped by, the effective Magic', /caster\.system\.attributes\?\.magic\?\.value \?\? caster/.test(ward));
  t.ok('a ward attacker\'s Magic reads effective first', !/magic\?\.base \?\? attacker\?\.system\?\.attributes\?\.magic\?\.value/.test(ward));

  /* ⚠ Ratchet: a `magic.base` read is an "is this character Awakened?" gate, the sheet's own
   * field, a write, or the fallback after `value`. Anything else is the F5 bug again. */
  const offenders = [];
  for (const file of ['scripts/documents/SR3EActor.js', 'scripts/documents/SR3EItem.js', 'scripts/documents/SR3ESpiritSummoning.js',
    'scripts/documents/SR3EWard.js', 'scripts/SR3EHealing.js', 'scripts/sr3e.js']) {
    read(file).split('\n').forEach((line, i) => {
      if (!/magic\??\.base/.test(line) || /^\s*(\*|\/\/|\/\*)/.test(line)) return;   // comments are not reads
      const ok = /magic\??\.value\s*\?\?[^;]*magic\??\.base/.test(line)            // value first
        || /const magicForCaps = attr\.magic\?\.base/.test(line)                      // adept caps: the STARTING Magic, by design
        || /case 'lose-magic'|const b = patient\.system\?\.attributes\?\.magic\?\.base/.test(line) // permanent loss writes base
        || /(?:<=|>)\s*0\b|\) > 0/.test(line)                                          // Awakened gate
        || /magic\??\.base \?\? 0;\s*$/.test(line) && /isAwakened|magicBase <= 0|if \(magicBase/.test(read(file).split('\n').slice(i, i + 3).join('\n'))
        || /system\.attributes\.magic\.base'?:/.test(line)                            // a write
        || /attr\.magic && magicBase > 0|Math\.min\(magicBase|magicSuppressed/.test(line) // the derivation itself
        || /magicBase\s*=\s*attr\.magic\?\.base \?\? 0;/.test(line);                    // …its input
      if (!ok) offenders.push(`${file}:${i + 1}`);
    });
  }
  t.is(`no rule reads base Magic${offenders.length ? ` — ${offenders.join(', ')}` : ''}`, offenders.length, 0);
}
