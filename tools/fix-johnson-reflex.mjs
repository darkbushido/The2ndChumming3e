/**
 * Reconcile the contacts' hand-set reflex bonuses with their now-real cyberware · TODO 86
 *
 * Before the cyberware split, three contacts carried their reflex bonuses as numbers written
 * straight onto the actor (`reaction.reactionBonus` / `reaction.diceBonus`) by the generator's
 * `wired()` / `boosted()` helpers, because the cyberware itself was an inert prose blob.
 *
 * ⚠ **Now that the implants are real items, those numbers DOUBLE-COUNT.**
 * `_prepareCharacter` computes `reaction.value = base + reactionBonus + reflexBonus(items)`, so
 * a hand-set +2 beside a Wired Reflexes item granting +2 yields +4.
 *
 * Each of the three is a *different* defect, and each is settled by the printed page.
 */
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE    = dirname(fileURLToPath(import.meta.url));
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');
const ROOT    = process.argv.includes('--install')
  ? INSTALL : join(HERE, '..');
const PACK    = join(ROOT, 'packs', 'sr3e-mr-johnsons-contacts');
const CHECK   = process.argv.includes('--check');

/**
 * ⚠ Every entry cites the book and states the arithmetic it lands on, because "clear the
 * duplicate" is only correct for one of the three.
 */
const FIXES = {
  /* p.58 — `B4 Q4 S4 I4 W4 C3 E3`, **R 4 (6)**, **INIT: 6 + 2D6**.
   * Cyberware includes Wired Reflexes 1, now imported as an item granting +2 Reaction and
   * +1 die. Base Reaction is (4+4)/2 = 4, so the item alone reaches the printed 6 and 2D6.
   * The hand-set +2/+1 is pure duplication. */
  'Gunsmith': { reactionBonus: 0, diceBonus: 0,
    why: 'Wired Reflexes 1 is now an item; book R 4 (6), INIT 6 + 2D6' },

  /* p.38 — `B5 Q4 S4 I3 W3 C2 E4.15 R3`, **INIT: 3 + 2D6**.
   * ⚠ **The book lists `Boosted Reflexes 1` FIRST in this contact's Cyberware line and the
   * generator omits it entirely** — which is why a hand-set `diceBonus: 1` existed at all. The
   * implant is added to the generator and imported here, so the die now comes from the item and
   * the hand-set number goes. Total is unchanged at 2D6; the cyberware list is now the book's. */
  'Corporate Security Guard': { reactionBonus: 0, diceBonus: 0, addImplant: 'Boosted Reflexes [1]',
    why: 'book lists Boosted Reflexes 1, which the generator dropped; INIT 3 + 2D6' },

  /* p.62 — `B5(7) Q4 S6 I4 W4 C3 E0.2 R4(8)`, **INIT: 4 + 1D6**, and its Cyberware line is
   * `Cybereyes (…), Cyberlegs (…), Smartlink 2, Vehicle Control Rig 2` — **no reflex cyberware
   * of any kind**.
   * ⚠ So this one is NOT a duplicate: the generator's `boosted(1)` is unsupported by the page.
   * One base die plus a hand-set +1 gives 2D6 where the book prints **1D6**. Clearing it is a
   * CORRECTION, not a de-duplication, and it changes the printed total.
   * ⚠ The `R 4 (8)` and `Rigged INIT: 8 + 3D6` come from the Vehicle Control Rig 2, which the
   * vehicle path derives at rig time — not from initiative dice on the actor. */
  'Highway Patrol': { reactionBonus: 0, diceBonus: 0,
    why: 'book lists no reflex cyberware and prints INIT 4 + 1D6' },
};

const db = new ClassicLevel(PACK, { valueEncoding: 'json' });
try { await db.open(); } catch (err) {
  if (/LOCK|lock/i.test(String(err?.message))) {
    console.error('ERROR: the pack is locked — close Foundry and try again.'); process.exit(1);
  }
  throw err;
}

/* Index the shipped packs so `addImplant` resolves to a real entry. */
const { readdirSync } = await import('node:fs');
const REPO = join(HERE, '..');
const idx = new Map();
for (const p of readdirSync(join(REPO, 'packs'))) {
  if (p === 'sr3e-mr-johnsons-contacts') continue;
  const d = new ClassicLevel(join(REPO, 'packs', p), { valueEncoding: 'json' });
  try { await d.open(); } catch { continue; }
  for await (const [k, v] of d.iterator()) {
    if (String(k).startsWith('!items!') && v?.name && !idx.has(v.name)) idx.set(v.name, { doc: v, pack: p });
  }
  await d.close();
}

function idFor(text) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 16);
}

let changed = 0;
const writes = [];
for await (const [key, a] of db.iterator()) {
  if (!String(key).startsWith('!actors!') || String(key).includes('.items')) continue;
  const fix = FIXES[a.name];
  if (!fix) continue;

  const r = a.system?.attributes?.reaction ?? {};
  const next = structuredClone(a);
  let did = [];

  if ((r.reactionBonus ?? 0) !== fix.reactionBonus || (r.diceBonus ?? 0) !== fix.diceBonus) {
    next.system.attributes.reaction = { ...r, reactionBonus: fix.reactionBonus, diceBonus: fix.diceBonus };
    did.push(`reflex ${r.reactionBonus ?? 0}/${r.diceBonus ?? 0} → ${fix.reactionBonus}/${fix.diceBonus}`);
  }

  if (fix.addImplant) {
    const already = (a.items ?? []).some(i => i === idFor(`${a.name}|${fix.addImplant}|`));
    const src = idx.get(fix.addImplant);
    if (!src) { console.error(`  ! ${fix.addImplant} is not in any pack`); }
    else if (!already) {
      const nid = idFor(`${a.name}|${fix.addImplant}|`);
      const now = Date.now();
      writes.push([`!actors.items!${a._id}.${nid}`, {
        _id: nid, name: src.doc.name, type: src.doc.type, img: src.doc.img ?? 'icons/svg/item-bag.svg',
        system: structuredClone(src.doc.system ?? {}), effects: [], folder: null, sort: 0,
        ownership: a.ownership ?? { default: 0 }, flags: {},
        _stats: { compendiumSource: `Compendium.The2ndChumming3e.${src.pack}.Item.${src.doc._id}`,
          duplicateSource: null, coreVersion: '14', systemId: 'The2ndChumming3e',
          systemVersion: null, createdTime: now, modifiedTime: now, lastModifiedBy: null },
      }]);
      next.items = [...(a.items ?? []), nid];
      did.push(`+ ${fix.addImplant}`);
    }
  }

  if (!did.length) continue;
  writes.push([key, next]);
  changed++;
  console.log(`  ${a.name.padEnd(26)} ${did.join(' · ')}`);
  console.log(`      ${fix.why}`);
}

if (!CHECK) for (const [k, v] of writes) await db.put(k, v);
await db.close();
console.log(`\n${CHECK ? 'Would change' : 'Changed'}: ${changed}`);
if (!CHECK && changed && !process.argv.includes('--install')) {
  console.log('Now run the same command with --install.');
}
