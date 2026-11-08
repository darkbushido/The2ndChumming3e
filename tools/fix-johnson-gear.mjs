#!/usr/bin/env node
/**
 * The Little Black Book contacts' gear, cyberware and spells, corrected against the book · TODO 84.
 *
 *   node tools/fix-johnson-gear.mjs           correct packs-src, then run: npm run packs:build
 *   node tools/fix-johnson-gear.mjs --check   exit 1 if anything would change — changes nothing
 *   npm run packs:install                     then copy to the install (Foundry CLOSED)
 *
 * The rule is `JohnsonGearFixes` (`scripts/data/johnson-gear-fixes.mjs`, shared with the 0.9.0 migration):
 * spells re-Forced only from their exact old name, items removed only by their exact shipped name, items
 * added only when the contact has nothing of that name — so a re-run is a no-op. Found by
 * `tools/audit-johnson-gear.mjs`; report in `audit/johnson-gear-audit.txt`.
 *
 * ⚠ Reads and writes `packs-src/` only (never a LevelDB). New embedded ids are DERIVED (`idFor`), so a re-run
 *   reuses keys, and each new id is appended to the actor's `items` array as well as given its own key.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { JohnsonGearFixes, CONTACTS_PACK } from '../scripts/data/johnson-gear-fixes.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'packs-src');

/** 16 hex chars from a string — stable (the same hash as `import-johnson-cyberware.mjs`). */
export function idFor(text) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 16);
}

const stats = (source = null) => ({
  coreVersion: '14', systemId: 'The2ndChumming3e', systemVersion: null, createdTime: 0, modifiedTime: 0,
  lastModifiedBy: null, compendiumSource: source, duplicateSource: null, exportSource: null,
});

/**
 * Apply the table to the contacts pack's entries (Map key → doc), in place. `lookup(pack, id)` returns a
 * compendium document. Returns the number of contacts changed.
 */
export function fixEntries(entries, lookup) {
  const actors = [...entries].filter(([k]) => k.startsWith('!actors!')).map(([, d]) => d);
  const itemsOf = a => (a.items ?? []).map(id => entries.get(`!actors.items!${a._id}.${id}`)).filter(Boolean);
  let changed = 0;
  for (const a of actors) {
    const plan = JohnsonGearFixes.plan({ ...a, _stats: { compendiumSource: `Compendium.The2ndChumming3e.${CONTACTS_PACK}.Actor.${a._id}` } }, itemsOf(a));
    if (!plan) continue;
    for (const u of plan.updates) {
      const doc = entries.get(`!actors.items!${a._id}.${u._id}`);
      doc.name = u.name;
      if (u['system.force'] !== undefined) doc.system.force = u['system.force'];
    }
    for (const id of plan.deletes) {
      entries.delete(`!actors.items!${a._id}.${id}`);
      a.items = a.items.filter(x => x !== id);
    }
    for (const add of plan.adds) {
      const id = idFor(`${a._id}|lbb-fix|${add.name}`);
      const s = add.source;
      let doc;
      if (s.pack) {
        const src = lookup(s.pack, s.id);
        if (!src) throw new Error(`${a.name}: no ${s.pack} entry ${s.id} for ${add.name}`);
        doc = { name: add.name, type: src.type, img: src.img, system: structuredClone(src.system ?? {}),
          _stats: stats(`Compendium.The2ndChumming3e.${s.pack}.Item.${s.id}`) };
        if (add.force) doc.system.force = add.force;
      } else if (s.copyOf) {
        const other = actors.find(x => x.name === s.copyOf.contact);
        const src = other && itemsOf(other).find(i => i.name === s.copyOf.item);
        if (!src) throw new Error(`${a.name}: no ${s.copyOf.item} on ${s.copyOf.contact} to copy`);
        doc = { name: src.name, type: src.type, img: src.img, system: structuredClone(src.system ?? {}),
          _stats: stats(src._stats?.compendiumSource ?? null) };
      } else {
        doc = { name: add.name, type: 'gear', img: 'systems/The2ndChumming3e/styles/icons/gear-case.svg',
          system: { quantity: 1, cost: 0, weight: 0, description: '', rating: null }, _stats: stats() };
      }
      entries.set(`!actors.items!${a._id}.${id}`, {
        ...doc, _id: id, effects: [], folder: null, sort: 0, ownership: structuredClone(a.ownership ?? { default: 0 }), flags: {},
      });
      a.items = [...(a.items ?? []), id];
    }
    changed++;
  }
  return changed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  const cache = new Map();
  const lookup = (pack, id) => {
    if (!cache.has(pack)) cache.set(pack, readSourceDir(join(SRC, pack)));
    return cache.get(pack).get(`!items!${id}`) ?? null;
  };
  const entries = readSourceDir(join(SRC, CONTACTS_PACK));
  const n = fixEntries(entries, lookup);
  if (n && !check) writeSourceDir(join(SRC, CONTACTS_PACK), entries);
  console.log(n ? `${check ? 'would change' : 'changed'} ${n} contact(s)${check ? '' : ' — now run: npm run packs:build'}` : 'nothing to change');
  process.exit(check && n ? 1 : 0);
}
