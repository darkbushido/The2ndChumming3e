/**
 * Little Black Book contacts' gear, cyberware and spells against the book · TODO 84.
 * `scripts/data/johnson-gear-fixes.mjs` (shared by `tools/fix-johnson-gear.mjs` and the 0.9.0 migration) and the
 * audit's parsers (`tools/audit-johnson-gear.mjs`).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { JohnsonGearFixes as J, CONTACT_FIXES, CONTACTS_PACK } from '../scripts/data/johnson-gear-fixes.mjs';
import { fixEntries, idFor } from '../tools/fix-johnson-gear.mjs';
import { splitTop, readBook, compare } from '../tools/audit-johnson-gear.mjs';

export const name = 'johnson-gear';
const src = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = id => `Compendium.The2ndChumming3e.${CONTACTS_PACK}.Actor.${id}`;

export async function run(t) {
  const wiz = { name: 'Wiz Kid Ganger', type: 'npc', _stats: { compendiumSource: SRC('n8sEdmrXXrdH0oK4') } };
  const items = [
    { id: 'a', type: 'spell', name: 'Clout (F5)' },
    { id: 'b', type: 'spell', name: 'Powerbolt (F4)' },
    { id: 'c', type: 'spell', name: 'Treat (F4)' },
  ];
  const p = J.plan(wiz, items);
  t.eq('re-Forced from the exact old name', p.updates, [{ _id: 'a', name: 'Clout (F4)', 'system.force': 4 }]);
  t.eq('removed by exact name', p.deletes, ['b']);
  t.eq('added when absent', p.adds.map(a => a.name), ['Powerball (F4)']);
  t.eq('an edited Force is kept', J.plan(wiz, [{ id: 'a', type: 'spell', name: 'Clout (F6)' }, { id: 'p', type: 'spell', name: 'Powerball (F4)' }]), null);
  t.eq('already fixed → nothing', J.plan(wiz, [{ id: 'a', type: 'spell', name: 'Clout (F4)' }, { id: 'p', type: 'spell', name: 'Powerball (F4)' }]), null);

  // ⚠ The Mercenary's knowledge skill shares the removed gear's name.
  const merc = { name: 'Mercenary', type: 'npc', _stats: { compendiumSource: SRC('b6lYBmECTs8jtKHL') } };
  const mp = J.plan(merc, [{ id: 's', type: 'skill', name: 'Desert Wars' }, { id: 'g', type: 'gear', name: 'Desert Wars' }]);
  t.eq('the gear goes, never the skill', mp.deletes, ['g']);
  t.eq('a skill alone is never removed', J.plan(merc, [{ id: 's', type: 'skill', name: 'Desert Wars' }, { id: 'i', type: 'weapon', name: 'Ingram Valiant' }]), null);

  t.eq('gated: another source', J.entryFor({ name: 'Wiz Kid Ganger', type: 'npc', _stats: { compendiumSource: 'Compendium.x.y.Actor.z' } }), null);
  t.eq('gated: a PC of that name', J.entryFor({ name: 'Wiz Kid Ganger', type: 'character' }), null);
  t.eq('an unsourced NPC of that exact name', J.entryFor({ name: 'Wiz Kid Ganger', type: 'npc' })?.id, 'n8sEdmrXXrdH0oK4');
  t.ok('every entry names a page', CONTACT_FIXES.every(c => /^LBB p\.\d+$/.test(c.page)));

  // The migration copies an added item out of the pack contact, without its id.
  const m = await J.migrate(wiz, async () => ({ items: [{ _id: 'zz', name: 'Powerball (F4)', type: 'spell', system: { force: 4 } }] }), );
  t.eq('migrate: create copied, id dropped', m.creates, [{ name: 'Powerball (F4)', type: 'spell', system: { force: 4 } }]);
  const m2 = await J.migrate({ ...wiz, items }, async () => ({ items: [] }));
  t.eq('migrate: an add the pack lacks is skipped', m2.creates, []);

  // packs-src is already corrected: the tool is idempotent on it.
  const dir = new URL(`../packs-src/${CONTACTS_PACK}/`, import.meta.url);
  const entries = new Map();
  for (const f of readdirSync(dir)) {
    const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    entries.set(j._key, j.doc);
    for (const d of Object.values(j.embedded ?? {}).flat()) entries.set(`!actors.items!${j.doc._id}.${d._id}`, d);
  }
  t.eq('packs-src already corrected', fixEntries(entries, () => null), 0);
  t.eq('ids are derived', idFor('x|lbb-fix|y'), idFor('x|lbb-fix|y'));

  // The audit's parsers.
  t.eq('splitTop keeps brackets', splitTop('A (b, c), D [1, 2], E'), ['A (b, c)', 'D [1, 2]', 'E']);
  const book = readBook(['WIZ KID GANGER', '', 'B Q S I W C E M R PR', 'Spells: Clout 4, Powerball 4']);
  t.eq('readBook attributes to the header', book.get('WIZ KID GANGER')?.spells, ['Clout 4', 'Powerball 4']);
  t.ok('compare flags a Force', compare({ spells: ['Clout 4'] }, [{ type: 'spell', name: 'Clout (F5)' }]).spells?.force?.length === 1);

  // Wiring.
  const mig = src('scripts/SR3EMigrations.js');
  t.ok('0.9.0 migration uses JohnsonGearFixes.migrate', /fixActorItems:\s*actor => JohnsonGearFixes\.migrate\(actor\)/.test(mig));
  t.ok('_apply runs fixActorItems', /!m\.fixActorItems\) return count/.test(mig) && /createEmbeddedDocuments\('Item', p\.creates\)/.test(mig));
}
