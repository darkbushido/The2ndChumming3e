/**
 * Mods installed inside an item — the Foundry side · TODO 276. The rules are scripts/data/item-mods.mjs.
 *
 * A host keeps its mods as data in `system.installed`; nothing here creates a document for an installed mod. The four
 * moves:
 *  - **install** — an item dropped on the host (its sheet, or its row on the actor sheet). From the SAME actor it moves
 *    (the loose copy is deleted); from a compendium, the sidebar or another actor it is copied. Warn, never refuse.
 *  - **uninstall** (⏏) — the mod comes out as a loose item on the host's actor (a sidebar host: a world item). A
 *    PERMANENT mod (a gas vent, `ModRemoval`, TODO 277) instead takes a gunsmith's Build/Repair test: success destroys
 *    the vent, failure destroys the barrel and the gun needs repair.
 *  - **remove** (🗑) — the mod is deleted, after a confirmation.
 *  - **open** (✎) — the mod's ordinary item sheet, on a TEMPORARY item whose `update` writes back into the host. The
 *    sheet's own handlers (the Level dropdown, the modifiers rows) all go through `item.update`, so one override covers
 *    every edit. ⚠ The temporary item is never saved: `update` must stay overridden, or an edit would try to update a
 *    document the server has never seen.
 */
import { ItemMods } from './data/item-mods.mjs';
import { ArmorMods } from './data/armor-mods.mjs';
import { CyberCapacity } from './data/cyber-capacity.mjs';
import { ModRemoval, CONTACT_RATES, REPAIR } from './data/mod-removal.mjs';
import { actorFrom, actorRef } from './data/actor-ref.mjs';

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
    // The one refusal (the maintainer, 2026-10-27): a stock on a rifle. Everything else warns and installs.
    const blocked = ItemMods.blocked(host, source);
    if (blocked) { ui.notifications.error(blocked); return false; }
    const graded = i => game.sr3e.SR3EActor.gradedEssenceCost(game.sr3e.SR3EActor.baseEssenceCost(i), i.system?.grade);
    for (const w of [...ItemMods.warnings(host, source), ...ArmorMods.installWarnings(host, source.toObject()),
      ...CyberCapacity.installWarnings(host, source.toObject(), graded)]) ui.notifications.warn(w);
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
    if (ModRemoval.rule(mod)) return SR3EItemMods.gunsmith(host, modId);
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

  /** Delete mod `modId` from `host`, after asking. A record fix: a permanent mod taken off IN PLAY goes through ⏏. */
  async remove(host, modId) {
    const mod = ItemMods.installed(host).find(m => m._id === modId);
    if (!mod) return false;
    const permanent = ModRemoval.rule(mod)
      ? ' <strong>This only corrects the record</strong> — taking a gas vent off in play is a gunsmith\'s test (⏏, TODO 277).' : '';
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'Remove mod' },
      content: `<p>Delete <strong>${foundry.utils.escapeHTML(mod.name ?? '')}</strong> from ${foundry.utils.escapeHTML(host.name)}? `
        + `It is gone, not put back in the inventory (⏏ does that).${permanent}</p>`,
    });
    if (!ok) return false;
    await host.update({ 'system.installed': ItemMods.uninstall(ItemMods.installed(host), modId).installed });
    SR3EItemMods._close(host, modId);
    return true;
  },

  /* ── A permanent mod: the gunsmith's test · TODO 277 ─────────────────────────────────────────────────────── */

  /**
   * Taking a gas vent off (the maintainer, 2026-10-27): pick the gunsmith — any character, a player's too — and the test
   * (the gun's B/R skill, TN, base time, labour), then roll. `removalRolled` resolves it after the last 💥.
   */
  async gunsmith(host, modId) {
    const mod = ItemMods.installed(host).find(m => m._id === modId);
    const rule = mod && ModRemoval.rule(mod);
    if (!rule) return null;
    const esc = v => foundry.utils.escapeHTML(String(v ?? ''));
    const skillName = ModRemoval.skillFor(host);
    const smiths = game.sr3e.sceneFirst(game.actors.filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a)));
    const own = host.parent && smiths.includes(host.parent) ? host.parent : smiths[0];
    const skillDice = actor => Number(actor?.items?.find(i => i.type === 'skill' && i.name === skillName)?.system?.rating) || 0;
    const isPC = actor => game.sr3e.SR3EQuery.isPlayerCharacter(actor);
    const rateFor = actor => (isPC(actor) ? 0 : CONTACT_RATES[1]);
    let choice = null;
    const wire = (_app, el) => {
      const q = s => el.querySelector(s);
      q('#gs-smith')?.addEventListener('change', () => {
        const a = smiths.find(x => actorRef(x) === q('#gs-smith').value);
        q('#gs-dice').value = String(skillDice(a));
        q('#gs-rate').value = String(rateFor(a));
      });
      q('#gs-level')?.addEventListener('change', () => { q('#gs-rate').value = String(CONTACT_RATES[q('#gs-level').value] ?? 0); });
    };
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Take ${mod.name} off ${host.name}` },
      content: `<div style="display:flex;flex-direction:column;gap:6px;padding:4px">
        <p style="margin:0;font-size:11px">A gas vent cannot simply be taken off (${esc(rule.page)}). A gunsmith's test: <strong>success destroys
          the vent</strong>; <strong>failure destroys the barrel</strong> — the gun then needs repair, and the vent stays. The time is the base ÷
          the successes; labour is by the hour (a gunsmith contact 100 / 50 / 25¥ at Level 1 / 2 / 3, CC p.79; a player character: nothing).</p>
        <label>Gunsmith <select id="gs-smith">${smiths.map(a => `<option value="${esc(actorRef(a))}"${a === own ? ' selected' : ''}>${esc(a.name)}${isPC(a) ? '' : ' (NPC)'}</option>`).join('')}</select></label>
        <label>${esc(skillName || 'Build/Repair skill')} dice <input id="gs-dice" type="number" min="0" value="${skillDice(own)}" style="width:56px"/></label>
        <label>Target number <input id="gs-tn" type="number" min="2" value="${rule.tn}" style="width:56px"/></label>
        <label>Base time (hours) <input id="gs-hours" type="number" min="0" step="0.5" value="${rule.baseHours}" style="width:64px"/></label>
        <label>Labour ¥ / hour <input id="gs-rate" type="number" min="0" value="${rateFor(own)}" style="width:72px"/>
          contact Level <select id="gs-level"><option value="">—</option>${Object.keys(CONTACT_RATES).map(l => `<option value="${l}">${l}</option>`).join('')}</select></label>
      </div>`,
      buttons: [
        { label: '🎲 Roll', action: 'roll', default: true, callback: (_e, _b, dlg) => {
          const q = s => dlg.element.querySelector(s);
          choice = { smith: q('#gs-smith').value, dice: Math.max(0, parseInt(q('#gs-dice').value) || 0),
            tn: Math.max(2, parseInt(q('#gs-tn').value) || rule.tn), baseHours: Math.max(0, Number(q('#gs-hours').value) || rule.baseHours),
            rate: Math.max(0, Number(q('#gs-rate').value) || 0) };
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
      render: (_event, dialog) => wire(dialog, dialog.element),
    });
    if (!choice) return null;
    const smith = actorFrom(choice.smith);
    if (!smith) { ui.notifications.warn('Pick the gunsmith.'); return null; }
    if (choice.dice < 1) ui.notifications.warn(`${smith.name} has no ${skillName || 'Build/Repair'} dice — enter what they default to (the GM's call).`);
    return smith.rollPool(choice.dice, choice.tn, `🔧 ${smith.name} takes ${mod.name} off ${host.name}`, {
      followUp: { kind: 'modRemoval', ctx: { hostUuid: host.uuid, modId, modName: mod.name, hostName: host.name, smithName: smith.name,
        tn: choice.tn, baseHours: choice.baseHours, rate: choice.rate } },
    });
  },

  /** FOLLOW_UPS.modRemoval — after the last 💥: destroy the vent, or the barrel. */
  async removalRolled(ctx, res) {
    const esc = v => foundry.utils.escapeHTML(String(v ?? ''));
    const s = res?.successes ?? 0;
    const out = ModRemoval.outcome(s, ctx.baseHours);
    const cost = ModRemoval.labour(ctx.rate, out.hours);
    const host = await fromUuid(ctx.hostUuid).catch(() => null);
    let line;
    if (!host) line = `${esc(ctx.hostName)} is gone — nothing changed.`;
    else {
      // The vent is gone either way — on a failure it goes with the barrel (the maintainer, 2026-10-27).
      if (host.isOwner) await host.update({ 'system.installed': ItemMods.uninstall(ItemMods.installed(host), ctx.modId).installed });
      SR3EItemMods._close(host, ctx.modId);
      if (out.removed && !out.barrelDestroyed) {
        line = `✅ ${esc(ctx.modName)} is off ${esc(ctx.hostName)} — <strong>destroyed</strong> in the work, not returned.`;
      } else {
        if (host.isOwner) await host.setFlag('The2ndChumming3e', 'needsRepair', { part: 'barrel', reason: `Barrel destroyed taking ${ctx.modName} off`, when: Date.now() });
        const cost = ModRemoval.repairCost(host, 'barrel');
        line = `❌ The barrel of ${esc(ctx.hostName)} is <strong>destroyed</strong>, and ${esc(ctx.modName)} with it — the gun needs repair `
          + `(the cost of ${esc(REPAIR.barrel.as)}${cost === null ? '' : `, ${cost.toLocaleString()}¥`}).`;
      }
    }
    const written = host && !host.isOwner ? ' <span style="color:var(--sr-amber)">(you cannot edit the gun — the GM applies this)</span>' : '';
    await ChatMessage.create({
      speaker: { alias: ctx.smithName },
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header">🔧 ${esc(ctx.smithName)} — ${esc(ctx.modName)} off ${esc(ctx.hostName)}</div>
        <div class="sr-staging-result">${s} success${s === 1 ? '' : 'es'} against TN ${ctx.tn}. ${line}${written}</div>
        <div style="font-size:11px;color:var(--sr-muted)">Time ${out.hours} h (base ${ctx.baseHours} h${s > 0 ? ` ÷ ${s}` : ''}) · labour ${cost ? `${cost.toLocaleString()}¥ (${ctx.rate}¥/h)` : 'none'} — not deducted (CC p.79; the maintainer's ruling, TODO 277)</div>
      </div>`,
    });
  },

  /**
   * ✔ Repaired — a gun whose barrel was destroyed (TODO 277). The repair costs the same as a barrel extension (the
   * maintainer, 2026-10-27); the dialog asks the cost (pre-filled when the figure is known), posts it and clears the mark.
   * Nothing is deducted.
   */
  async repaired(gun) {
    const r = ModRemoval.needsRepair(gun);
    if (!r) return false;
    const esc = v => foundry.utils.escapeHTML(String(v ?? ''));
    const part = r.part ?? 'barrel';
    const known = ModRemoval.repairCost(gun, part);
    let cost = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${gun.name} — repaired` },
      content: `<p>${esc(r.reason ?? 'Damaged')}. The repair costs the same as ${esc(REPAIR[part]?.as ?? 'the part')} (${esc(REPAIR[part]?.page ?? '')}).</p>
        <label>Cost (¥) <input id="rp-cost" type="number" min="0" value="${known ?? ''}" placeholder="${known === null ? 'enter it' : ''}" style="width:90px"/></label>`,
      buttons: [
        { label: '✔ Repaired', action: 'ok', default: true, callback: (_e, _b, dlg) => { cost = Math.max(0, Number(dlg.element.querySelector('#rp-cost').value) || 0); } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (cost === null) return false;
    await gun.unsetFlag('The2ndChumming3e', 'needsRepair');
    await ChatMessage.create({
      speaker: { alias: gun.parent?.name ?? gun.name },
      content: `<div class="sr-roll-card"><div class="sr-roll-header">🔧 ${esc(gun.name)} repaired</div>
        <div class="sr-staging-result">${esc(r.reason ?? 'Damaged')} — repaired for <strong>${cost.toLocaleString()}¥</strong>
        (the cost of ${esc(REPAIR[part]?.as ?? 'the part')}). Not deducted.</div></div>`,
    });
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
        const v = t.combine === 'any' ? t.short : `${t.short} ${x.value >= 0 && t.combine === 'add' ? '+' : ''}${x.value}`;
        return x.whenDeployed ? `${v} (set up)` : v;
      }).join(', '),
      deployable: ItemMods.deployable(m),
    }));
  },
};
