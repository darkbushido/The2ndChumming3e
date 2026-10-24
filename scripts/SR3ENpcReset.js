/**
 * 🧹 Reset shared NPCs — the GM tool for TODO 260 (rules in `data/npc-reset.mjs`).
 *
 * Sidebar NPCs whose tokens are unlinked may still carry wounds and statuses from before 216fe433, when a wound or
 * status on one goon landed on the sidebar actor itself. Lists them with what each carries; nothing ticked; clears
 * only what the GM ticks.
 */
import { NpcReset } from './data/npc-reset.mjs';
import { actorFrom } from './data/actor-ref.mjs';

const esc = s => foundry.utils.escapeHTML(String(s ?? ''));

export class SR3ENpcReset {
  static async open() {
    if (!game.user.isGM) return;
    const rows = NpcReset.offer(game.actors.contents);
    if (!rows.length) {
      ui.notifications.info('Reset shared NPCs: no sidebar NPC with unlinked tokens carries wounds or statuses.');
      return;
    }
    const list = rows.map(({ actor, c }) => `
      <label style="display:flex;align-items:center;gap:8px;margin:3px 0;cursor:pointer;">
        <input type="checkbox" data-actor-id="${esc(actor.id)}"/>
        <span>${esc(actor.name)}</span>
        <span style="color:var(--sr-muted);font-size:11px">${esc(NpcReset.describe(c))}</span>
      </label>`).join('');

    let ids = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: '🧹 Reset shared NPCs' },
      content: `
        <div style="padding:8px 0">
          <p style="margin:0 0 6px;font-size:12px">These sidebar NPCs have <strong>unlinked</strong> tokens and carry wounds or
            statuses. Before the TODO 260 fix, damage or a status on one goon landed here, and every token dragged out
            since started with it. Resetting zeroes the wound tracks and removes the statuses; tokens on a scene that
            have their own damage keep it.</p>
          <p style="margin:0 0 6px;font-size:11px;color:var(--sr-muted)">Reset:
            <label style="margin-left:10px;cursor:pointer"><input type="checkbox" id="sr-npcreset-all"/> All</label></p>
          <div>${list}</div>
        </div>`,
      render: (_event, dialog) => {
        const all = dialog.element.querySelector('#sr-npcreset-all');
        const boxes = [...dialog.element.querySelectorAll('[data-actor-id]')];
        all?.addEventListener('change', () => boxes.forEach(cb => { cb.checked = all.checked; }));
      },
      buttons: [
        { label: 'Reset', action: 'reset', default: true,
          callback: (_e, _b, dialog) => { ids = [...dialog.element.querySelectorAll('[data-actor-id]:checked')].map(cb => cb.dataset.actorId); } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!ids) return;
    if (!ids.length) { ui.notifications.warn('Reset shared NPCs: nobody was ticked, so nothing changed.'); return; }

    const done = [];
    for (const id of ids) {
      const actor = actorFrom(id);   // a plain id: the sidebar actor, which is the point here
      if (!actor) continue;
      const c = NpcReset.collected(actor);
      const delta = NpcReset.woundDelta(c);
      if (Object.keys(delta).length) await actor.update(delta);
      if (c.effects.length) await actor.deleteEmbeddedDocuments('ActiveEffect', c.effects.map(e => e.id));
      if (c.stunTurns) await actor.unsetFlag('The2ndChumming3e', 'stunTurns');
      done.push(`${actor.name} (${NpcReset.describe(c)})`);
    }
    await ChatMessage.create({
      speaker: { alias: 'GM' },
      whisper: game.users.filter(u => u.isGM).map(u => u.id),
      content: `<div class="sr-roll-card"><div class="sr-roll-header">🧹 Shared NPCs reset</div>
        ${done.map(d => `<div class="sr-roll-meta">${esc(d)}</div>`).join('')}</div>`,
    });
    ui.notifications.info(`Reset ${done.length} shared NPC${done.length === 1 ? '' : 's'}.`);
  }
}
