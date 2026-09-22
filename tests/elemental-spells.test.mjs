/**
 * Elemental Manipulation spells resolve as RANGED ATTACKS — rules-check 0.6.0, Finding 4.
 *
 * SR3 splits damaging spells into two families with different resolution. Combat spells
 * (Manabolt, Powerbolt, Stunbolt) are resisted by the targeted Attribute against Force and never
 * dodged. Elemental spells (Fireball, Flamethrower, Lightning Bolt, Acid Stream…) are not:
 *
 *   > "Elemental spells are treated like normal ranged attacks (see p. 109) using Sorcery as the
 *   > Ranged Combat Skill. … These spells can be dodged (see p. 113)."            — SR3 p.183
 *   > "For elemental spells, the Resistance Test is actually a Damage Resistance Test … The
 *   > Combat Pool may be used to resist elemental spells."                         — SR3 p.183
 *   > "Impact Armor protects against damage from elemental manipulations, but at only half its
 *   > normal rating (round down). The caster chooses the spell's Base Damage Level when it is
 *   > cast, which also determines the base Drain Level."                           — SR3 p.196
 *
 * Until this fix every elemental spell went down the combat-spell path: no dodge, a Willpower-only
 * resistance (its `4(RC)` Target code has no attribute in it), no armour at all — and no Damage
 * Level choice, because the dialog offered it to `Combat` only, so every Fireball was Moderate.
 *
 * The rules are pure statics and are unit-tested and mutated here; the wiring lives in
 * `_postWaveCard`, `_spellResistButton` and `_postSoakCard`, which need Foundry, so it is checked
 * at source level — each check pins code that carries behaviour, not merely a name.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'elemental-spells';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/** Every shipped spell document, from the pack sources. */
function shippedSpells() {
  const root = new URL('../packs-src/', import.meta.url);
  const out = [];
  for (const pack of readdirSync(root)) {
    if (!/-spells$/.test(pack)) continue;
    for (const f of readdirSync(new URL(`${pack}/`, root))) {
      if (!f.endsWith('.json')) continue;
      const doc = JSON.parse(readFileSync(new URL(`${pack}/${f}`, root), 'utf8')).doc;
      if (doc?.type === 'spell') out.push({ pack, ...doc });
    }
  }
  return out;
}

export async function run(t) {
  const actor = read('scripts/documents/SR3EActor.js');
  const item  = read('scripts/documents/SR3EItem.js');

  /* ══ Which spells are elemental ═══════════════════════════════════════════════════ */
  t.ok('Elemental is elemental', SR3EItem.isElementalSpell('Elemental'));
  t.ok('…whatever its case or padding', SR3EItem.isElementalSpell(' elemental '));
  t.ok('a Combat spell is not — Manabolt is still resisted, never dodged', !SR3EItem.isElementalSpell('Combat'));
  t.ok('…nor a Manipulation spell (Clout, Levitate)', !SR3EItem.isElementalSpell('Manipulation'));
  t.ok('…nor a blank category', !SR3EItem.isElementalSpell(undefined));

  // The shipped family, so a pack edit that re-categorises one cannot quietly send it back.
  const spells    = shippedSpells();
  const elemental = spells.filter(s => SR3EItem.isElementalSpell(s.system?.category));
  const names     = new Set(elemental.map(s => s.name));
  for (const n of ['Fireball', 'Flamethrower', 'Lightning Bolt', 'Ball Lightning', 'Acid Stream', 'Toxic Wave']) {
    t.ok(`the core book's ${n} (SR3 p.196-197) is elemental`, names.has(n));
  }
  t.is('17 elemental spells ship across the spell packs', elemental.length, 17);
  // Their damage field is blank, so the Damage Level MUST come from the cast dialog.
  t.ok('…and none carries a damage code — the level is chosen at casting',
    elemental.every(s => !String(s.system?.damage ?? '').trim()));

  /* ══ The Damage Level is chosen at casting · SR3 p.196 ════════════════════════════ */
  t.ok('an elemental spell offers the Damage Level choice', SR3EItem.spellChoosesDamageLevel('Elemental'));
  t.ok('…as a combat spell always did', SR3EItem.spellChoosesDamageLevel('Combat'));
  t.ok('…and a detection spell still does not', !SR3EItem.spellChoosesDamageLevel('Detection'));
  t.ok('the cast dialog asks the helper, not a literal "Combat"',
    /const isCombat\s*=\s*SR3EItem\.spellChoosesDamageLevel\(this\.system\.category\)/.test(item)
    && !/=== 'Combat'/.test(item));

  // MITS p.87, the one worked Fireball Drain in the library: "Mariah casts her spell at Force 4 and
  // base Moderate Damage, for a Drain of 3D" — and at the surged Force 7, "the Drain becomes 4D".
  // Fireball ships `+1(DL+2)`: ⌊F/2⌋+1, and the chosen level +2.
  const at4 = SR3EItem.parseDrainFormula('+1(DL+2)', 4, 'M');
  t.eq('Fireball, Force 4, Moderate → Drain 3D (MITS p.87)', [at4.tn, at4.level], [3, 'D']);
  const at7 = SR3EItem.parseDrainFormula('+1(DL+2)', 7, 'M');
  t.eq('…and at the surged Force 7 → 4D', [at7.tn, at7.level], [4, 'D']);
  // A Light Fireball is a lighter Drain — which is only reachable now the level can be chosen.
  const light = SR3EItem.parseDrainFormula('+1(DL+2)', 4, 'L');
  t.eq('a Light Fireball drains 3S', [light.tn, light.level], [3, 'S']);

  /* ══ Half Impact, round down · SR3 p.196 ══════════════════════════════════════════ */
  const half = (ballistic, impact) => SR3EActor.elementalImpact({ ballistic, impact });
  // Armour jacket, 5/3: Ballistic is the higher, so a mutant reading it would say 2 → wrong.
  t.is('armour jacket 5/3 protects as Impact 1', half(5, 3), 1);
  t.is('Impact 5 protects as 2 — rounded DOWN', half(1, 5), 2);
  t.is('Impact 6 protects as 3', half(8, 6), 3);
  t.is('no armour is no armour', half(0, 0), 0);
  t.is('a negative figure cannot add to the TN', half(0, -3), 0);

  /* ══ Secondary effects · SR3 p.196 ════════════════════════════════════════════════ */
  // "Add +2 to the Object Resistance if the spell has a base damage of Serious, and +4 if its base
  //  damage is Moderate. An elemental spell with a Damage Level of Light does not cause secondary effects."
  t.is('Light causes no secondary effects', SR3EItem.elementalSecondaryResistance('L'), null);
  t.is('Moderate: Object Resistance +4', SR3EItem.elementalSecondaryResistance('M'), 4);
  t.is('Serious: +2', SR3EItem.elementalSecondaryResistance('S'), 2);
  t.is('Deadly: unmodified', SR3EItem.elementalSecondaryResistance('D'), 0);

  /* ══ The wiring ═══════════════════════════════════════════════════════════════════ */
  t.ok('the cast carries isElemental in the spell context',
    /\/\/ Elemental Manipulation \(p\.183\)[^\n]*\n\s*isElemental,/.test(item));

  const btn = actor.slice(actor.indexOf('static _spellResistButton('),
    actor.indexOf('static _spellResistButton(') + 4000);
  t.ok('an elemental hit posts the DODGE declaration, not a spell resist (p.183)',
    /if \(sc\.isElemental\)[\s\S]*class="sr-dodge-declare-btn"/.test(btn));
  t.ok('…staged by the caster\'s successes on the ranged rule',
    /SR3EItem\.stageDamage\(sc\.damageBase, attackSuccesses\)/.test(btn));
  t.ok('…carrying the elemental flag to the soak card', /elemental:\s+true/.test(btn));
  t.ok('…before the combat-spell button is built', btn.indexOf('sc.isElemental') < btn.indexOf('sr-spell-soak-btn'));
  t.ok('a vehicle target goes straight to its resistance, as in the ranged flow',
    /tActor\.type === 'vehicle'\) return SR3EActor\._soakButtonHtml\(ctx\)/.test(btn));

  // The failed-dodge soak button LISTS its fields — the flag must be one of them, or a Fireball
  // that was partly dodged is soaked at full Ballistic.
  const soakBtn = actor.slice(actor.indexOf('static _soakButtonHtml('),
    actor.indexOf('static _soakButtonHtml(') + 1500);
  t.ok('the failed-dodge soak button carries the elemental flag', /elemental:\s+payload\.elemental === true/.test(soakBtn));

  const soak = actor.slice(actor.indexOf('async _postSoakCard(payload)'),
    actor.indexOf('async _postSoakCard(payload)') + 9000);
  t.ok('the soak card halves Impact for an elemental spell',
    /if \(payload\.elemental === true\)[\s\S]{0,200}SR3EActor\.elementalImpact\(\{ ballistic, impact \}\)/.test(soak));
  t.ok('…and resists with Impact, not Ballistic',
    /const usesImpact\s*=[^;]*payload\.elemental === true/.test(soak));
  // Mystic Armor is Impact armour (p.170), so it is halved with the rest: it must be added FIRST.
  t.ok('Mystic Armor is added before the halving (the maintainer, 2026-09-22)',
    soak.indexOf('impact += mysticArmor') < soak.indexOf('SR3EActor.elementalImpact('));
}
