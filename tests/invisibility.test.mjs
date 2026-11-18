/**
 * Invisibility → the core `invisible` status · SR3 p.196. The shipped bug: an Invisibility spell put only
 * `sr3e-sustaining` on the caster; the subject's token never went invisible.
 */
import { readFileSync } from 'node:fs';
import { InvisibilityRules as IR } from '../scripts/data/invisibility.mjs';

export const name = 'invisibility';

export async function run(t) {
  t.eq('Invisibility is plain', IR.invisibilityKind('Invisibility'), 'plain');
  t.eq('Improved Invisibility is improved', IR.invisibilityKind('Improved Invisibility'), 'improved');
  t.eq('case-insensitive', IR.invisibilityKind('improved invisibility'), 'improved');
  t.eq('another spell is not', IR.invisibilityKind('Physical Mask'), null);
  t.eq('no name', IR.invisibilityKind(undefined), null);

  const sp = (nm, target = '') => ({ name: nm, target, force: 4 });
  t.eq('no target → the caster', IR.coveredNames(sp('Invisibility'), 'Mage'), ['Mage']);
  t.eq('"—" → the caster', IR.coveredNames(sp('Invisibility', '—'), 'Mage'), ['Mage']);
  t.eq('targets split on commas', IR.coveredNames(sp('Invisibility', 'Sam, Troll'), 'Mage'), ['Sam', 'Troll']);

  const mage = { name: 'Mage', sustainedSpells: [sp('Invisibility', 'Sam')] };
  t.eq('cast on another: the target is invisible', IR.invisibilityOn('Sam', [mage]), 'plain');
  t.eq('cast on another: the caster is not', IR.invisibilityOn('Mage', [mage]), null);
  t.eq('cast on self', IR.invisibilityOn('Mage', [{ name: 'Mage', sustainedSpells: [sp('Invisibility')] }]), 'plain');
  t.eq('no spells → not invisible', IR.invisibilityOn('Sam', [{ name: 'Mage', sustainedSpells: [] }]), null);
  t.eq('other spells do not count', IR.invisibilityOn('Sam', [{ name: 'Mage', sustainedSpells: [sp('Armor', 'Sam')] }]), null);
  const both = [mage, { name: 'Shaman', sustainedSpells: [sp('Improved Invisibility', 'Sam')] }];
  t.eq('improved wins over plain', IR.invisibilityOn('Sam', both), 'improved');
  t.eq('names touched', IR.namesTouched([sp('Invisibility', 'Sam'), sp('Armor', 'Joe')], 'Mage'), ['Sam']);

  const src = readFileSync(new URL('../scripts/sr3e.js', import.meta.url), 'utf8');
  t.ok('the updateActor hook syncs invisibility on a sustainedSpells change',
    /'sustainedSpells' in sys\)[\s\S]{0,200}_syncInvisibility\(actor\)/.test(src));
  t.ok('a GM-set status (no flag) is never removed', /if \(!ours && !names\.has/.test(src));
  /* ── Technological viewers see through PLAIN Invisibility (SR3 p.195; the maintainer, 2026-11-18) ── */
  const T = IR.techSight;
  t.eq('a drone/vehicle is a sensor', T({ actorType: 'vehicle' }), { all: true, thermo: true });
  t.eq('a camera-flagged token is a sensor', T({ actorType: 'npc', camera: true }).all, true);
  t.eq('cybereyes make all sight technological', T({ actorType: 'character', replacedBy: 'Cybereyes' }).all, true);
  t.eq("Cat's Eyes are living eyes", T({ actorType: 'character', replacedBy: "Cat's Eyes" }), { all: false, thermo: false });
  t.eq('a thermographic implant is tech thermo only', T({ cyberThermo: true }), { all: false, thermo: true });
  t.eq('thermographic goggles are tech thermo', T({ gearThermo: true }).thermo, true);
  t.eq('a troll\'s own eyes are not', T({ actorType: 'character' }), { all: false, thermo: false });
  t.eq('plain + tech viewer → sees', IR.seesThrough('plain', true), true);
  t.eq('improved + tech viewer → fooled', IR.seesThrough('improved', true), false);
  t.eq('plain + living eyes → fooled', IR.seesThrough('plain', false), false);
  t.eq('GM-set status (no spell) → fooled', IR.seesThrough(null, true), false);

  const senses = readFileSync(new URL('../scripts/SR3ESenses.js', import.meta.url), 'utf8');
  t.ok('thermographic detection lets tech thermo through', /techSeesInvisible\(visionSource, target, true\)/.test(senses));
  t.ok('core sight lets a tech viewer through', /techSeesInvisible\(visionSource, target\)\)/.test(senses));
  t.ok('plan() stores the viewer\'s techSight on the token', /flags\.\$\{SYS\}\.techSight/.test(senses));
}
