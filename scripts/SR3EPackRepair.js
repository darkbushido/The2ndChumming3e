import { PackRepair } from './data/pack-repair.mjs';

const SYSTEM = 'The2ndChumming3e';

/**
 * Remove the broken (`_id: null`) documents some installs carry in this system's compendium packs
 * (TODO 145). See `data/pack-repair.mjs` for what they are and why only provable duplicates go.
 *
 * ⚠ **Packs are otherwise never migrated** (SR3EMigrations: they ship as files). This is the exception
 * because the SHIPPED files are clean — the damage is in installed copies, which a Foundry update does not
 * replace — and a GM without filesystem access has no other way to clean them.
 *
 * ⚠ **Runs on every load, not once per version.** A scan of the indexes is cheap and writes nothing when
 * there is nothing to remove, and the records can come back with an old pack database, so a version stamp
 * would only hide them again.
 *
 * ⚠ **Never blocks the world.** The delete goes over the socket with the id `'null'` — the client's own
 * `deleteDocuments` refuses it, because the collection is keyed by a real null — and that is an internal
 * call. Any failure is a console warning and the pack is left as it was; the lock is restored on every path.
 */
export const SR3EPackRepair = {
  /** Our own Item/Actor packs — a module's broken pack is not ours to touch. */
  ownPacks() {
    return game.packs.filter(p => p.metadata?.packageName === SYSTEM
      && ['Item', 'Actor'].includes(p.documentName));
  },

  /** @returns {Promise<{removed:number, kept:string[], failed:string[]}>} */
  async run() {
    const result = { removed: 0, kept: [], failed: [] };
    if (!game.user.isGM) return result;
    if (game.users.activeGM && !game.users.activeGM.isSelf) return result;

    const SI = foundry.helpers?.SocketInterface ?? globalThis.SocketInterface;
    for (const pack of SR3EPackRepair.ownPacks()) {
      const plan = PackRepair.plan(pack.index.values());
      for (const b of plan.kept) result.kept.push(`${pack.collection}: ${b.name}`);
      if (!plan.removable.length) continue;
      if (!SI?.dispatch) { result.failed.push(`${pack.collection}: no socket interface`); continue; }

      const wasLocked = pack.locked;
      try {
        if (wasLocked) await pack.configure({ locked: false });
        // One key (`!items!null`) holds them all — a LevelDB cannot store two under the same key.
        await SI.dispatch('modifyDocument', {
          type: pack.documentName, action: 'delete',
          operation: { pack: pack.collection, ids: ['null'], modifiedTime: Date.now(), render: false, renderSheet: false, parentUuid: null },
        });
        pack.index.delete(null);   // this session's index, so nothing stale is shown until the next load
        result.removed += plan.removable.length;
      } catch (err) {
        console.warn(`SR3E | Could not remove the broken entry from ${pack.collection}:`, err);
        result.failed.push(`${pack.collection}: ${err?.message ?? err}`);
      } finally {
        if (wasLocked) { try { await pack.configure({ locked: true }); } catch { /* left unlocked; warned below */ } }
      }
    }

    if (result.removed) {
      console.log(`SR3E | Removed ${result.removed} broken compendium entr${result.removed === 1 ? 'y' : 'ies'} (_id: null).`);
      ui.notifications?.info(`SR3E: cleaned ${result.removed} broken compendium entr${result.removed === 1 ? 'y' : 'ies'} left by an older version.`);
    }
    if (result.kept.length) console.warn('SR3E | Broken compendium entries left alone (no identical twin):', result.kept);
    if (result.failed.length) console.warn('SR3E | Compendium cleanup could not finish:', result.failed);
    return result;
  },
};
