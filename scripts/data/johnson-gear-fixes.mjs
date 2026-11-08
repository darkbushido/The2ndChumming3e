/**
 * The Little Black Book contacts' gear, cyberware and spells corrected against the book · TODO 84.
 * **Pure — no Foundry.** Record: `audit/johnson-contacts-audit.txt` (attributes) and
 * `audit/johnson-gear-audit.txt` (this), from `tools/audit-johnson-gear.mjs`.
 *
 * One table, three users: `tools/fix-johnson-gear.mjs` corrects `packs-src`, the generator
 * (`scripts/macros/populate-mr-johnsons-contacts.js`) was edited to match by hand, and the 0.9.0 migration
 * corrects contacts already in a world (the maintainer, 2026-11-08: "Full migration").
 *
 * ⚠ **The migration OVERWRITES, adds and removes, and argues for it:** each change applies only while the
 *   copy still holds exactly what the old pack shipped. A spell is renamed only from its exact old name
 *   ("Clout (F5)"); an item is removed only by its exact shipped name; an item is added only when the
 *   contact has nothing of that name. A GM who renamed, re-Forced or deleted something keeps their version.
 *   Gated on the contact: its `compendiumSource` names the contacts pack entry, else its exact name on an NPC.
 *
 * `add[].source` says where the item comes from in the pack tool: a compendium entry (`pack`/`id`), another
 * contact's already-imported copy (`copyOf`), or a bare gear stub like every other unmatched contact gear.
 */

export const CONTACTS_PACK = 'sr3e-mr-johnsons-contacts';

const spellForce = (from, to) => {
  const name = /^(.*?)\s*\(F\d+\)$/.exec(from)[1];
  return { from, to: `${name} (F${to})`, force: to };
};

/** `{ contact, id, page, rename: [{from, to, force?}], remove: [name], add: [{name, source, force?}] }` */
export const CONTACT_FIXES = [
  { contact: 'Antiquities and Oddities Dealer', id: 'gpA8WF1Kdu5GXDUQ', page: 'LBB p.59',
    // "Analyze Magic 5, Analyze Truth 4, Antidote 4, Astral Window 4, Calm Pack 4, …, Influence 4, …, Stunball 5"
    rename: [spellForce('Analyze Truth (F5)', 4), spellForce('Calm Pack (F6)', 4), spellForce('Stunball (F4)', 5)],
    remove: [],
    add: [
      { name: 'Analyze Magic (F5)', force: 5, source: { pack: 'sr3e-mits-spells', id: 'sr3e-spell-0020' } },
      { name: 'Astral Window (F4)', force: 4, source: { pack: 'sr3e-mits-spells', id: 'sr3e-spell-0023' } },
      { name: 'Influence (F4)', force: 4, source: { pack: 'sr3e-sr3-spells', id: 'sr3e-spell-0156' } },
    ] },
  { contact: 'Artificer/Enchanter', id: 'i9Xj7a03tQrOWxNE', page: 'LBB p.60',
    rename: [spellForce('Analyze Device (F3)', 4), spellForce('Physical Barrier (F5)', 4)], remove: [], add: [] },
  { contact: 'Club Owner', id: 'yHnq9GyQocJmTjfi', page: 'LBB p.42',
    rename: [], remove: [], add: [{ name: 'Simsense Player', source: { stub: true } }] },
  { contact: 'Lorekeeper', id: '0ZnsivKcKAAnsgb1', page: 'LBB p.59',
    rename: [spellForce('Silence (F4)', 3)], remove: [],
    add: [{ name: 'Lock (F3)', force: 3, source: { pack: 'sr3e-mits-spells', id: 'sr3e-spell-0185' } }] },
  // The generator entered the knowledge skill "Desert Wars" as gear where the book prints "Ingram Valiant".
  { contact: 'Mercenary', id: 'b6lYBmECTs8jtKHL', page: 'LBB p.40',
    rename: [], remove: ['Desert Wars'],
    add: [{ name: 'Ingram Valiant', source: { pack: 'sr3e-sr3-firearms', id: 'sr3e-firearm-1134' } }] },
  { contact: 'Mr. Fix-It', id: 'uMiGWAP42oex9rPw', page: 'LBB p.47',
    rename: [], remove: [],
    add: [{ name: 'Muscle Replacement [2]', source: { copyOf: { contact: 'Mercenary', item: 'Muscle Replacement [2]' } } }] },
  // The book prints two Gear lines; the maintainer, 2026-11-08: both are hers.
  { contact: 'Security Rigger', id: 'IknZhjbhtsmRfTHE', page: 'LBB p.40',
    rename: [], remove: [],
    add: [
      { name: 'Lined Coat', source: { pack: 'sr3e-sr3-armor', id: 'sr3e-armor-0026' } },
      { name: 'Ares Predator 2', source: { copyOf: { contact: 'Mr. Fix-It', item: 'Ares Predator 2' } } },
      { name: 'Electronics Kit', source: { copyOf: { contact: 'Tamanous Member', item: 'Electronics Kit' } } },
      { name: 'Palmtop Computer', source: { stub: true } },
      { name: 'Renraku Kraftwerk-8', source: { pack: 'sr3e-sr3-odm-cyberdecks', id: 'cf3087ffcace6669' } },
    ] },
  { contact: 'Sleazy Tabloid Reporter', id: 'iSnbkIgiqhed9M7K', page: 'LBB p.41',
    rename: [], remove: [], add: [{ name: 'Sony HB500 Portacam', source: { pack: 'sr3e-sr3-gear', id: '05fc15c16211a1c3' } }] },
  { contact: 'Talislegger', id: '9BdiJphXIGFuZs8e', page: 'LBB p.60',
    rename: [spellForce('Shape Earth (F5)', 4)], remove: [], add: [] },
  { contact: 'Tamanous Member', id: 'U7hLBhYLaMu45UkI', page: 'LBB p.50',
    rename: [], remove: [], add: [{ name: 'Body Bags', source: { stub: true } }] },
  // Not printed in his entry (the maintainer, 2026-11-08: remove it).
  { contact: 'Taxi Driver', id: '0yhDmnZRQKj25SJW', page: 'LBB p.67',
    rename: [], remove: ['Biomonitor'], add: [] },
  // "Powerball 4", not Powerbolt; "Clout 4".
  { contact: 'Wiz Kid Ganger', id: 'n8sEdmrXXrdH0oK4', page: 'LBB p.61',
    rename: [spellForce('Clout (F5)', 4)], remove: ['Powerbolt (F4)'],
    add: [{ name: 'Powerball (F4)', force: 4, source: { pack: 'sr3e-sr3-spells', id: 'sr3e-spell-0007' } }] },
];

export const JohnsonGearFixes = {
  /** The table entry for this actor, or null. `_stats.compendiumSource` first, else an NPC of that exact name. */
  entryFor(actor) {
    const src = String(actor?._stats?.compendiumSource ?? '');
    const bySource = CONTACT_FIXES.find(c => src.endsWith(`${CONTACTS_PACK}.Actor.${c.id}`));
    if (bySource) return bySource;
    if (src && !src.includes(CONTACTS_PACK)) return null;   // copied from something else entirely
    return actor?.type === 'npc' ? (CONTACT_FIXES.find(c => c.contact === actor.name) ?? null) : null;
  },

  /**
   * What to change on one contact: `{ updates: [{_id, name, 'system.force'?}], deletes: [id], adds: [entry] }`,
   * or null. `items` = the actor's items (`{ id|_id, name }`). Only exact shipped names move.
   */
  plan(actor, items = actor?.items ?? []) {
    const e = JohnsonGearFixes.entryFor(actor);
    if (!e) return null;
    // ⚠ Never a skill: the Mercenary's knowledge skill "Desert Wars" shares the name of the gear stub removed.
    const list = [...items].filter(i => i.type !== 'skill');
    const idOf = i => i.id ?? i._id;
    const updates = [], deletes = [], adds = [];
    for (const r of e.rename) {
      const it = list.find(i => i.name === r.from);
      if (it && !list.some(i => i.name === r.to)) {
        updates.push({ _id: idOf(it), name: r.to, ...(r.force ? { 'system.force': r.force } : {}) });
      }
    }
    for (const n of e.remove) {
      const it = list.find(i => i.name === n);
      if (it) deletes.push(idOf(it));
    }
    for (const a of e.add) {
      if (!list.some(i => i.name === a.name)) adds.push(a);
    }
    return updates.length || deletes.length || adds.length ? { updates, deletes, adds } : null;
  },

  /**
   * The migration's item changes for one world actor, or null. Added items are copied from the CORRECTED pack
   * contact (`fetchPackActor(id)` → its document, default the installed pack), so the world gets what the pack ships.
   * An add the pack contact lacks is skipped, never invented.
   */
  async migrate(actor, fetchPackActor = id => globalThis.game?.packs?.get(`The2ndChumming3e.${CONTACTS_PACK}`)?.getDocument(id)) {
    const p = JohnsonGearFixes.plan(actor);
    if (!p) return null;
    const creates = [];
    if (p.adds.length) {
      const src = await fetchPackActor(JohnsonGearFixes.entryFor(actor).id);
      for (const a of p.adds) {
        const it = [...(src?.items ?? [])].find(i => i.name === a.name);
        if (!it) continue;
        const data = typeof it.toObject === 'function' ? it.toObject() : structuredClone(it);
        delete data._id;
        creates.push(data);
      }
    }
    return { updates: p.updates, deletes: p.deletes, creates };
  },
};
