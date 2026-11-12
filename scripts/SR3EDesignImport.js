/**
 * 📥 Import a gear design from the web designer · TODO 298 (docs/web-designer-proposal.md). The rules are
 * scripts/data/gear-design.mjs — the same module the web page runs.
 *
 * Paste a designer link or the JSON file's text; the dialog looks every reference up in THIS world's compendiums,
 * recomputes the weapon with the system's own rules, and shows the result and every warning (a mismatch with the
 * page's figures, an item this world doesn't have, a mount already taken). Import goes ahead regardless — warn, never
 * refuse — onto an actor you own, or (GM) as a world item. A VEHICLE design opens the 🛠 Vehicle Designer (TODO 287/297)
 * filled in, on its summary: its Create button makes the vehicle — the one create path (`sr3e.actor.create`, a player
 * owns the result). A BOOK vehicle with aftermarket mods (a design with `base`) is copied from its compendium through the same
 * verb and gets its mods, priced as the page priced them. Reached from the Items directory header and the managed "SR3E Import Gear Design" macro.
 */
import { GearDesign } from './data/gear-design.mjs';
import { actorFrom } from './data/actor-ref.mjs';

const esc = v => foundry.utils.escapeHTML(String(v ?? ''));
const yen = n => `${Math.round(Number(n) || 0).toLocaleString()}¥`;

export const SR3EDesignImport = {
  /** Look a design reference up in this world's packs: the document's data (an Item, or with `'Actor'` a vehicle), or null. */
  async lookup(ref, documentName = 'Item') {
    const uuid = GearDesign.uuidOf(ref, documentName);
    if (!uuid) return null;
    try {
      const doc = await fromUuid(uuid);
      return doc?.documentName === documentName ? doc.toObject() : null;
    } catch { return null; }
  },

  /** The parsed, recomputed design for `text`: `{ design, result, warnings }`. Throws when `text` is not a design. */
  async prepare(text) {
    const { design, warnings } = await GearDesign.parse(text);
    const result = design.kind === 'vehicle' && design.base ? await GearDesign.assembleBookVehicle(design, SR3EDesignImport.lookup)
      : design.kind === 'vehicle'
      ? await GearDesign.assembleVehicle(design, SR3EDesignImport.lookup)
      : await GearDesign.assemble(design, SR3EDesignImport.lookup, { newId: () => foundry.utils.randomID() });
    return { design, result, warnings: [...warnings, ...GearDesign.mismatches(design, result.totals, game.system.version), ...result.warnings] };
  },

  /** Where an import can go: actors the user owns (live, not templates), and — for the GM — the world. */
  targets() {
    const actors = game.actors.filter(a => a.isOwner && (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a));
    const rows = actors.map(a => ({ value: a.id, label: a.name }));
    if (game.user.isGM) rows.push({ value: '', label: '— World item (Items directory) —' });
    const mine = game.user.character?.id;
    return rows.sort((a, b) => (b.value === mine) - (a.value === mine));
  },

  /** Open the paste dialog; `text` pre-fills it (the macro passes a link). */
  async open(text = '') {
    const targets = SR3EDesignImport.targets();
    let prepared = null, chosen = null;
    const wire = (_app, el) => {
      const area = el.querySelector('#sr3e-design-text');
      const out = el.querySelector('#sr3e-design-preview');
      let seq = 0;
      const refresh = async () => {
        const mine = ++seq;
        prepared = null;
        if (!area.value.trim()) { out.innerHTML = '<p class="sr-muted">Paste a link from the web designer, or the JSON file\'s text.</p>'; return; }
        try {
          const p = await SR3EDesignImport.prepare(area.value);
          if (mine !== seq) return;
          prepared = p;
          el.querySelector('.sr3e-design-target-row').hidden = p.design.kind === 'vehicle';
          if (p.design.kind === 'vehicle' && p.design.base) {
            const { vehicle, mods, totals } = p.result;
            out.innerHTML = `<p><strong>${esc(p.design.name || vehicle?.name || 'No vehicle')}</strong>${vehicle ? ` — ${esc(vehicle.name)}, ${yen(totals.cost)} recomputed` : ''}</p>`
              + `<p class="sr-muted">${mods.length ? `Mods: ${mods.map(m => esc(m.name)).join(', ')}` : 'No modifications.'}<br>Import copies the vehicle from the compendium as yours, with these mods.</p>`
              + p.warnings.map(w => `<p style="color:var(--sr-amber)">⚠ ${esc(w)}</p>`).join('');
            return;
          }
          if (p.design.kind === 'vehicle') {
            const { designer, totals } = p.result;
            out.innerHTML = `<p><strong>${esc(designer.name || totals.chassis || 'No chassis')}</strong>${totals.chassis ? ` — ${esc(totals.chassis)}, ${totals.dp} Design Points, ${yen(totals.cost)} recomputed` : ''}</p>`
              + `<p class="sr-muted">${designer.mods.length ? `Mods: ${designer.mods.map(m => esc(m.name)).join(', ')}` : 'No modifications.'}<br>Import opens the 🛠 Vehicle Designer — check it, then Create.</p>`
              + p.warnings.map(w => `<p style="color:var(--sr-amber)">⚠ ${esc(w)}</p>`).join('');
            return;
          }
          const { weapon, ammo, totals } = p.result;
          out.innerHTML = `<p><strong>${esc(weapon?.name ?? 'No weapon')}</strong>${weapon ? ` — ${yen(totals.cost)} recomputed` : ''}</p>`
            + (weapon ? `<p class="sr-muted">${installedList(weapon)}${ammo.length ? `<br>Ammo: ${ammo.map(a => `${esc(a.data.name)} ×${a.qty}`).join(', ')}` : ''}</p>` : '')
            + p.warnings.map(w => `<p style="color:var(--sr-amber)">⚠ ${esc(w)}</p>`).join('');
        } catch (err) {
          if (mine === seq) out.innerHTML = `<p style="color:var(--sr-red)">${esc(err.message)}</p>`;
        }
      };
      area.addEventListener('input', foundry.utils.debounce(refresh, 250));
      area.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault(); });
      refresh();
    };
    await foundry.applications.api.DialogV2.wait({
      window: { title: '📥 Import gear design' },
      position: { width: 520 },
      content: `<div class="sr3e-inner">
        <label for="sr3e-design-text">Designer link or JSON</label>
        <textarea id="sr3e-design-text" rows="4" style="width:100%">${esc(text)}</textarea>
        <div class="sr3e-design-target-row"><label for="sr3e-design-target">Import onto</label>
        <select id="sr3e-design-target">${targets.map(t => `<option value="${esc(t.value)}">${esc(t.label)}</option>`).join('')}</select></div>
        <div id="sr3e-design-preview"></div></div>`,
      buttons: [
        { label: 'Import', action: 'import', default: true, callback: (_e, _b, dialog) => { chosen = dialog.element.querySelector('#sr3e-design-target')?.value ?? null; } },
        { label: 'Cancel', action: 'cancel' },
      ],
      render: (_event, dialog) => wire(dialog, dialog.element),
    });
    if (chosen === null) return null;
    if (prepared?.design.kind === 'vehicle' && prepared.design.base) {
      if (!prepared.result.vehicle) { ui.notifications.warn('Nothing to import — this world does not have that vehicle.'); return null; }
      return SR3EDesignImport.createVehicle(prepared.design, prepared.result);
    }
    if (prepared?.design.kind === 'vehicle') {
      if (!prepared.result.designer.chassis) { ui.notifications.warn('Nothing to import — the design has no chassis.'); return null; }
      return game.sr3e.SR3EVehicleDesigner.open(null, { design: prepared.result.designer });
    }
    if (!targets.length) { ui.notifications.warn('You own no character to import onto.'); return null; }
    if (!prepared?.result?.weapon) { ui.notifications.warn('Nothing to import — the design has no weapon this world knows.'); return null; }
    return SR3EDesignImport.create(prepared.result, chosen);
  },

  /**
   * Copy a book vehicle from its compendium (`sr3e.actor.create` — the requester owns it) and add its mods, as priced by
   * `GearDesign.assembleBookVehicle`. Returns the new actor, or null.
   */
  async createVehicle(design, result) {
    const ref = GearDesign.parseRef(design.base);
    let created = null;
    try {
      const res = await game.sr3e.SR3EQuery.asGM('sr3e.actor.create', { source: `${GearDesign.SYSTEM_ID}.${ref.pack}|${ref.id}`, name: design.name || null });
      created = res?.uuid ? await fromUuid(res.uuid) : null;
    } catch (err) {
      console.error('SR3E | design import: vehicle create failed:', err);
      ui.notifications.error('Could not create the vehicle — is a GM connected?');
      return null;
    }
    if (!created) return null;
    const mods = result.mods.map(m => {
      const data = foundry.utils.deepClone(m);
      delete data._id;
      data.flags = foundry.utils.mergeObject(data.flags ?? {}, { The2ndChumming3e: { designImport: true } });
      return data;
    });
    const made = mods.length ? await created.createEmbeddedDocuments('Item', mods) : [];
    if ((made?.length ?? 0) < mods.length) ui.notifications.warn(`${created.name}: only ${made?.length ?? 0} of ${mods.length} mod(s) were added — drop the rest on the sheet.`);
    ui.notifications.info(`${created.name} imported with ${made?.length ?? 0} mod(s).`);
    created.sheet?.render(true);
    return created;
  },

  /** Create the weapon and its ammo on actor `actorId`, or in the world when it is ''. Returns the created items. */
  async create(result, actorId) {
    const items = [result.weapon, ...result.ammo.map(a => a.data)].map(d => {
      const data = foundry.utils.deepClone(d);
      delete data._id;
      data.flags = foundry.utils.mergeObject(data.flags ?? {}, { The2ndChumming3e: { designImport: true } });
      return data;
    });
    if (actorId) {
      const actor = actorFrom(actorId);
      if (!actor?.isOwner) { ui.notifications.warn('You don\'t own that actor.'); return []; }
      const created = await actor.createEmbeddedDocuments('Item', items);
      ui.notifications.info(`${result.weapon.name} imported onto ${actor.name}.`);
      return created;
    }
    const created = await Item.implementation.createDocuments(items);
    ui.notifications.info(`${result.weapon.name} imported into the Items directory.`);
    return created;
  },
};

/** "Installed: Silencer, Imaging Scope" for the preview. */
function installedList(weapon) {
  const names = (weapon?.system?.installed ?? []).map(m => esc(m.name));
  return names.length ? `Installed: ${names.join(', ')}` : 'No accessories.';
}
