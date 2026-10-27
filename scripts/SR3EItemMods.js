/**
 * Mods installed inside an item — the Foundry side · TODO 276. The rules are scripts/data/item-mods.mjs.
 *
 * A host keeps its mods as data in `system.installed`; nothing here creates a document for an installed mod. The four
 * moves:
 *  - **install** — an item dropped on the host (its sheet, or its row on the actor sheet). From the SAME actor it moves
 *    (the loose copy is deleted); from a compendium, the sidebar or another actor it is copied. Warn, never refuse.
 *  - **uninstall** (⏏) — the mod comes out as a loose item on the host's actor (a sidebar host: a world item).
 *  - **remove** (🗑) — the mod is deleted, after a confirmation.
 *  - **open** (✎) — the mod's ordinary item sheet, on a TEMPORARY item whose `update` writes back into the host. The
 *    sheet's own handlers (the Level dropdown, the modifiers rows) all go through `item.update`, so one override covers
 *    every edit. ⚠ The temporary item is never saved: `update` must stay overridden, or an edit would try to update a
 *    document the server has never seen.
 */
import { ItemMods } from './data/item-mods.mjs';

/** Open embedded sheets, keyed `hostUuid|modId`, so ✎ twice brings the same window forward. */
const _open = new Map();

const newId = () => foundry.utils.randomID();

export const SR3EItemMods = {
  /**
   * Install `source` (an Item document) into `host`. Returns true when it was installed.
   * @param {Item} host
   * @param {Item} source
   */
  async install(host, source) {
    if (!host || !source || source.documentName !== 'Item') return false;
    if (source.uuid === host.uuid) return false;
    if (!host.isOwner) { ui.notifications.warn(`You don't own ${host.name}.`); return false; }
    for (const w of ItemMods.warnings(host, source)) ui.notifications.warn(w);
    const installed = ItemMods.install(ItemMods.installed(host), source.toObject(), newId);
    await host.update({ 'system.installed': installed });
    // Moved, not copied, when it came from the host's own actor — the scope is in the gun now, not in the bag too.
    if (host.parent && source.parent === host.parent && source.id !== host.id) await source.delete();
    ui.notifications.info(`${source.name} installed in ${host.name}.`);
    return true;
  },

  /** Take mod `modId` out of `host` as a loose item — on the host's actor, else in the world (GM). */
  async uninstall(host, modId) {
    const { installed, mod } = ItemMods.uninstall(ItemMods.installed(host), modId);
    if (!mod) return null;
    const data = foundry.utils.deepClone(mod);
    delete data._id;
    let created;
    if (host.parent) [created] = await host.parent.createEmbeddedDocuments('Item', [data]);
    else created = await Item.implementation.create({ ...data, folder: host.folder?.id ?? null });
    if (!created) return null;
    await host.update({ 'system.installed': installed });
    SR3EItemMods._close(host, modId);
    ui.notifications.info(`${mod.name} taken out of ${host.name}${host.parent ? ` — it is in ${host.parent.name}'s inventory` : ''}.`);
    return created;
  },

  /** Delete mod `modId` from `host`, after asking. */
  async remove(host, modId) {
    const mod = ItemMods.installed(host).find(m => m._id === modId);
    if (!mod) return false;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'Remove mod' },
      content: `<p>Delete <strong>${foundry.utils.escapeHTML(mod.name ?? '')}</strong> from ${foundry.utils.escapeHTML(host.name)}? `
        + 'It is gone, not put back in the inventory (⏏ does that).</p>',
    });
    if (!ok) return false;
    await host.update({ 'system.installed': ItemMods.uninstall(ItemMods.installed(host), modId).installed });
    SR3EItemMods._close(host, modId);
    return true;
  },

  /** Open mod `modId`'s item sheet. Edits write back into the host. */
  async open(host, modId) {
    const key = `${host.uuid}|${modId}`;
    const already = _open.get(key);
    if (already?.rendered) { already.bringToFront(); return already; }
    const data = ItemMods.installed(host).find(m => m._id === modId);
    if (!data) return null;
    const tmp = SR3EItemMods.temporaryItem(host, data);
    const sheet = tmp.sheet;
    _open.set(key, sheet);
    sheet.render(true);
    return sheet;
  },

  /**
   * A temporary Item for one installed mod: never saved, owned by whoever owns the host, and `update` rewritten to
   * apply the change to itself and write the result back into the host's `system.installed`.
   */
  temporaryItem(host, data) {
    const modId = data._id;
    const source = foundry.utils.deepClone(data);
    source.ownership = { default: host.isOwner ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER };
    const tmp = new Item.implementation(source);
    tmp._sr3eHost = host;
    tmp.update = async (changes = {}) => {
      tmp.updateSource(foundry.utils.expandObject(changes));
      const saved = tmp.toObject();
      delete saved.ownership;
      await host.update({ 'system.installed': ItemMods.replace(ItemMods.installed(host), modId, saved) });
      tmp.sheet?.render();
      return tmp;
    };
    return tmp;
  },

  _close(host, modId) {
    const key = `${host.uuid}|${modId}`;
    _open.get(key)?.close();
    _open.delete(key);
  },

  /** The Item a drop event carries, or null. */
  async droppedItem(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== 'Item' || !data.uuid) return null;
    return fromUuid(data.uuid);
  },

  /** The host's installed mods as rows for a sheet — name, mount, what it changes. */
  rows(host) {
    const mounts = ItemMods.assignMounts(ItemMods.installed(host));
    return ItemMods.installed(host).map((m, i) => ({
      id: m._id,
      name: m.name ?? '?',
      img: m.img ?? 'icons/svg/item-bag.svg',
      mount: mounts[i].mount,
      changes: ItemMods.modifiersOf(m).map(x => {
        const t = ItemMods.TARGETS[x.target];
        return t.combine === 'any' ? t.short : `${t.short} ${x.value >= 0 && t.combine === 'add' ? '+' : ''}${x.value}`;
      }).join(', '),
    }));
  },
};
