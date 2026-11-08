/**
 * The spell audit — TODO 123, `audit/spells-audit.md`.
 *
 * Data: `SpellBookFixes` (scripts/data/spell-book-fixes.mjs) corrects the packs and owned copies against the
 * printed entries (SR3 pp.191-198, MitS pp.140-148, TWL pp.111-130). Rules: the Spell Pool cap on a Sorcery
 * Test (SR3 p.182, `SpellPoolCap`), Clout as a Stun ranged attack (SR3 p.197, `Clout`), and the sheet's
 * dropdowns keeping a value their list lacks (`keepValueOption`).
 *
 * ⚠ Calls go through the exported object (`SpellPoolCap.sorceryTest(…)`), never a destructured copy, so the
 *   mutants can bite.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
import { SpellBookFixes, SPELL_CORRECTIONS } from '../scripts/data/spell-book-fixes.mjs';
import { SpellPoolCap } from '../scripts/data/spell-pool-cap.mjs';
import { Clout } from '../scripts/data/clout.mjs';
import { keepValueOption } from '../scripts/data/select-keep.mjs';
import { fixEntries } from '../tools/fix-spell-book-values.mjs';

installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'spell-audit';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const spell = (name, bookPage, system = {}) => ({ name, type: 'spell', system: { bookPage, ...system } });

/** Every spell in packs-src, embedded copies included: `[pack, doc]`. */
function packSpells() {
  const out = [];
  const src = new URL('../packs-src/', import.meta.url);
  for (const pack of readdirSync(src)) {
    const dir = new URL(`${pack}/`, src);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
      for (const d of [j.doc, ...Object.values(j.embedded ?? {}).flat()]) if (d?.type === 'spell') out.push([pack, d]);
    }
  }
  return out;
}

export async function run(t) {
  /* ── The Spell Pool cap · SR3 p.182 ─────────────────────────────────────────── */
  t.is('Sorcery 3, Spell Pool 6: only 3 pool dice may join the test', SpellPoolCap.sorceryTest(6, 3), 3);
  t.is('a smaller pool is all available', SpellPoolCap.sorceryTest(2, 5), 2);
  t.is('dice withheld for an area spell lower the cap with the Sorcery dice (p.181)', SpellPoolCap.sorceryTest(6, 5 - 2), 3);
  t.is('no Sorcery dice, no pool dice', SpellPoolCap.sorceryTest(4, 0), 0);
  t.ok('the dialog says why when the cap bites', /SR3 p\.182/.test(SpellPoolCap.note(6, 3)));
  t.is('…and says nothing when it does not', SpellPoolCap.note(2, 5), '');
  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the cast offers SpellPoolCap.sorceryTest(available, Sorcery dice rolled)',
    /_promptMagicPool\(actor, SpellPoolCap\.sorceryTest\(availMagic, sorceryDice\)/.test(item));

  /* ── Clout · SR3 p.197 ──────────────────────────────────────────────────────── */
  t.ok('Clout is Clout', Clout.is('Clout') && Clout.is(' clout '));
  t.ok('…and nothing else is', !Clout.is('Clout Bolt') && !Clout.is('Fling') && !Clout.is(''));
  t.ok('Clout does stun damage even with a blank damage track', SR3EItem.spellDealsStun({ name: 'Clout', system: { damageTrack: '' } }));
  t.ok('…but a GM\'s Physical stands', !SR3EItem.spellDealsStun({ name: 'Clout', system: { damageTrack: 'Physical' } }));
  t.ok('Clout picks a Damage Level at cast (its Drain is "(Damage Level)")', /isCombat\s*=\s*SR3EItem\.spellChoosesDamageLevel\(this\.system\.category\) \|\| isClout/.test(item));
  t.ok('the cast context carries isClout', /\n\s*isClout,\r?\n/.test(item));
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('Clout takes the ranged dodge path, not the Spell Resistance Test', /if \(sc\.isElemental \|\| sc\.isFling \|\| sc\.isClout\) \{\r?\n\s*const staged/.test(actor));
  t.ok('…resisted on full Impact armour', /useImpact:\s*\(sc\.isFling \|\| sc\.isClout\) \? true : undefined/.test(actor));

  /* ── The sheet keeps a value its list lacks ──────────────────────────────── */
  t.ok('"LOS(A)" is kept as its own selected option', /value="LOS\(A\)" selected/.test(keepValueOption('LOS(A)', SR3E.spellRanges)));
  t.is('a listed value adds nothing', keepValueOption('LOS', SR3E.spellRanges), '');
  t.is('a blank adds nothing', keepValueOption('', SR3E.spellRanges), '');
  t.is('object options are read by value', keepValueOption('Stun', [{ value: 'Stun', label: 'Stun' }]), '');
  t.ok('_sel prepends it', /keepValueOption\(value, opts\) \+ opts\.map/.test(read('scripts/sheets/SR3EItemSheet.js')));
  t.ok('every Manipulation subtype is in the category list',
    ['Control', 'Elemental', 'Telekinetic', 'Transformation', 'Manipulation'].every(c => SR3E.spellCategories.includes(c)));

  /* ── The corrections ──────────────────────────────────────────────────────── */
  t.eq('Mass Blindness is Physical (MitS p.143)', SpellBookFixes.fixItem(spell('Mass Blindness', 'mits.143', { type: 'Mana' })), { 'system.type': 'Physical' });
  t.eq('Fashion drains +1(M) (MitS p.147)', SpellBookFixes.fixItem(spell('Fashion', 'mits.147', { drain: '+1(L)', category: 'Transformation' })), { 'system.drain': '+1(M)' });
  t.eq('Diagnose is Instant (MitS p.141)', SpellBookFixes.fixItem(spell('Diagnose', 'mits.141', { duration: 'Sustained' })), { 'system.duration': 'Instant' });
  t.eq('Ram is a touch spell (MitS p.140)', SpellBookFixes.fixItem(spell('Ram->', 'mits.140', { range: 'LOS' })), { 'system.range': 'T' });
  t.eq('Steam does Stun (MitS p.145)', SpellBookFixes.fixItem(spell('Steam', 'mits.145', { damageTrack: '' })), { 'system.damageTrack': 'Stun' });
  t.eq('Splash: area, Stun (TWL p.124)', SpellBookFixes.fixItem(spell('Splash', 'twl.124', { range: 'LOS', damageTrack: '' })),
    { 'system.range': 'LOS(A)', 'system.damageTrack': 'Stun' });
  t.eq('Clout: Telekinetic, Stun (SR3 p.197)', SpellBookFixes.fixItem(spell('Clout', 'sr3.197', { category: 'Transformation', damageTrack: '' })),
    { 'system.damageTrack': 'Stun', 'system.category': 'Telekinetic' });
  t.eq('Armor is a Transformation manipulation (SR3 p.198)', SpellBookFixes.fixItem(spell('Armor', 'sr3.198', { category: 'Manipulation' })), { 'system.category': 'Transformation' });
  t.eq('Control Thoughts is a Control manipulation (SR3 p.196)', SpellBookFixes.fixItem(spell('Control Thoughts', 'sr3.196', { category: 'Manipulation' })), { 'system.category': 'Control' });
  t.eq('a misspelt name is corrected, Force suffix kept', SpellBookFixes.fixItem(spell('Astral Barrior (F4)', 'sr3.198', { category: 'Transformation' })),
    { name: 'Astral Barrier (F4)' });
  t.is('a value a GM edited is left alone', SpellBookFixes.fixItem(spell('Fashion', 'mits.147', { drain: '+2(L)', category: 'Transformation' })), null);
  t.is('a GM\'s Physical track on Steam is left alone', SpellBookFixes.fixItem(spell('Steam', 'mits.145', { damageTrack: 'Physical' })), null);
  t.is('gated on the book: a fan-made "Armor" is left alone', SpellBookFixes.fixItem(spell('Armor', 'tss.4', { category: 'Manipulation' })), null);
  t.is('…and on the type', SpellBookFixes.fixItem({ ...spell('Armor', 'sr3.198', { category: 'Manipulation' }), type: 'armor' }), null);
  t.is('idempotent', SpellBookFixes.fixItem(spell('Mass Blindness', 'mits.143', { type: 'Physical' })), null);
  t.ok('every correction cites a page', SPELL_CORRECTIONS.every(c => /p\.\d/.test(c.page)));

  /* ── The packs carry it ───────────────────────────────────────────────────── */
  const spells = packSpells();
  t.ok('the packs hold spells to check', spells.length >= 244);
  const entries = new Map(spells.map(([p, d], i) => [`!items!${p}.${i}`, structuredClone(d)]));
  t.is('the fix tool would change nothing (packs-src corrected)', fixEntries(entries), 0);
  const byName = n => spells.filter(([, d]) => d.name === n).map(([, d]) => d);
  t.ok('no pack spell is spelt "Barrior" or "Potatoe"', !spells.some(([, d]) => /Barrior|Potatoe/.test(d.name)));
  t.ok('Thunderclap is Stun in the pack', byName('Thunderclap').every(d => d.system.damageTrack === 'Stun'));
  t.ok('…and every damageTrack is blank, Physical or Stun', spells.every(([, d]) => ['', 'Physical', 'Stun', undefined].includes(d.system.damageTrack)));
  // TODO 123: parseDrainFormula must read every shipped drain code.
  const unparsed = [...new Set(spells.map(([, d]) => d.system.drain).filter(Boolean))]
    .filter(code => !SR3EItem.parseDrainFormula(code, 6, 'M'));
  t.eq('parseDrainFormula reads every shipped drain code', unparsed, []);
  t.eq('a fixed-level code drains at its own level: Fashion +1(M), F6', SR3EItem.parseDrainFormula('+1(M)', 6), { tn: 4, level: 'M' });

  /* ── The migration ────────────────────────────────────────────────────────── */
  const mig = read('scripts/SR3EMigrations.js');
  t.ok('a 0.9.0 migration runs SpellBookFixes.fixItem', /version: '0\.9\.0',[\s\S]{0,1500}fixItem: item => SpellBookFixes\.fixItem\(item\)/.test(mig));
}
