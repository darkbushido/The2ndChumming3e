/**
 * The action ledger — what the combatant whose phase it is has spent · SR3 pp.105-108 (TODO 48).
 *
 * Rules: `scripts/data/action-economy.mjs` (pure, tested). This file stores and charges them.
 *
 * ⚠ **A combatant FLAG, not an in-memory Map.** The old Action Tracker kept its state in a `Map` in
 * the GM's browser: a player could not see it, a reload lost it, and a player's own roll could not
 * charge it. A flag is document data — synced to every client, kept across a refresh — and the GM
 * writes it (`sr3e.action.charge`), the same route pool spending takes.
 * ⚠ **Auto-MARK, never auto-ADVANCE.** A charge records the action; only the GM's click ends a turn.
 * A player's roll silently ending their own turn before they readied, aimed or took their second
 * Simple would be far worse than under-counting — and would take the phase out of reach of ↺ Undo.
 * ⚠ **Only the active combatant is charged** — the actor whose Combat Phase it is. An action taken
 * out of phase (a delayed action, the GM waving something through) is left for the GM's buttons.
 */
import { ActionEconomy } from './data/action-economy.mjs';

const FLAG = 'The2ndChumming3e';
const KEY  = 'actions';

export class SR3EActionLedger {
  static rules = ActionEconomy;

  static phase(combat) { return ActionEconomy.phaseKey(combat?.round, combat?.turn); }

  /** This phase's ledger for a combatant (an empty one if the stored ledger is from another phase). */
  static ledgerOf(combatant) {
    return ActionEconomy.ledgerFor(combatant?.getFlag?.(FLAG, KEY), SR3EActionLedger.phase(combatant?.parent));
  }

  /** The active combatant, if it is this actor (linked by actor, or by token for an unlinked one). */
  static activeFor(actor, combat = game.combat) {
    if (!actor || !combat?.started) return null;
    const cur = combat.combatant;
    if (!cur) return null;
    if (actor.isToken) return cur.tokenId === actor.token?.id ? cur : null;
    return cur.actorId === actor.id ? cur : null;
  }

  /** The snapshot each flow takes at its start, before any dialog spends anything — per actor. */
  static _pending = new Map();

  /**
   * Snapshot what an action can spend, at the very START of a flow (before its dialogs take pool dice
   * or ammunition). `charge` attaches it to the ledger entry, so the GM's undo knows what to put back.
   * ⚠ It stays until the next `begin` replaces it, so EVERY charge the flow makes carries it (TODO 152);
   * it is keyed to the phase, so it never leaks into the actor's next one. Anything that charges must
   * `begin` first, or it would carry the last flow's snapshot.
   */
  static begin(actor) {
    const cbt = SR3EActionLedger.activeFor(actor);
    if (!cbt) return;
    SR3EActionLedger._pending.set(actor.uuid, {
      phase: SR3EActionLedger.phase(cbt.parent),
      snap: ActionEconomy.snapshot({
        system: actor.system,
        items: actor.items.map(i => ({ id: i.id, name: i.name, type: i.type, system: i.system })),
      }),
    });
  }

  /**
   * Charge an action to an actor, if it is their Combat Phase. Fire-and-forget from the roll flows:
   * a failure here must never stop the roll it describes, so it is caught and logged.
   */
  static async charge(actor, actionKey, what = '') {
    const cbt = SR3EActionLedger.activeFor(actor);
    if (!cbt) return null;
    const snap = ActionEconomy.pendingSnap(SR3EActionLedger._pending.get(actor.uuid), SR3EActionLedger.phase(cbt.parent));
    try {
      return await game.sr3e.SR3EQuery.asGM('sr3e.action.charge', { combatantUuid: cbt.uuid, action: actionKey, what, snap });
    } catch (err) {
      console.warn('SR3E | could not charge the action:', err);
      return null;
    }
  }

  /** GM only: write a ledger for a combatant (the tracker's buttons, the undo). */
  static async write(combatant, ledger) {
    return combatant.setFlag(FLAG, KEY, ledger);
  }

  static register() {
    CONFIG.queries['sr3e.action.charge'] = async ({ rid, combatantUuid, action, what, snap, _requesterId }) =>
      game.sr3e.SR3EQuery.once(rid, async () => {
        game.sr3e.SR3EQuery.assertActiveGM();
        const cbt = fromUuidSync(combatantUuid);
        if (!cbt) throw new Error(`SR3E | action.charge: unknown combatant '${combatantUuid}'`);
        return game.sr3e.SR3EQueue.run(cbt.uuid, async () => {
          const by = game.users.get(_requesterId)?.name ?? '';
          const { ledger, over } = ActionEconomy.charge(SR3EActionLedger.ledgerOf(cbt), action, what, by, snap ?? null);
          await SR3EActionLedger.write(cbt, ledger);
          if (over) {
            ui.notifications?.warn(`${cbt.name}: ${ActionEconomy.ACTIONS[action]?.label ?? action} does not fit this Combat Phase `
              + '(two Simple or one Complex, SR3 p.105) — recorded anyway; the GM decides.');
          }
          return { over };
        });
      });
  }

  /* ── The tracker on the active combatant's row ─────────────────────────────────────────── */

  /**
   * Pips for everyone (action economy is public at the table), buttons for the GM. Called from the
   * `renderCombatTracker` hook in sr3e.js. ⚠ The GM's Complex and second-Simple buttons still end
   * the turn, as they always did; the charges a roll makes only mark. The second-Simple button lights
   * up once two Simples are taken (TODO 141), so the GM sees the phase is spent.
   */
  static renderTracker(combat, el) {
    if (!combat?.started || !combat.combatant) return;
    const cbt = combat.combatant;
    const row = el.querySelector(`[data-combatant-id="${cbt.id}"]`);
    if (!row || row.querySelector('.sr3e-action-tracker')) return;
    const l = SR3EActionLedger.ledgerOf(cbt);
    const gm = game.user.isGM;
    const pip = (on, cls, title) => `<span class="sr3e-pip ${cls}${on ? ' on' : ''}" title="${title}"></span>`;
    const summary = ActionEconomy.summary(l) || 'nothing yet';
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    row.style.flexWrap = 'wrap';
    const wrap = document.createElement('div');
    wrap.className = 'sr3e-action-tracker';
    wrap.innerHTML = `
      <div class="sr3e-pips" title="This Combat Phase: ${esc(summary)} — two Simple or one Complex, and one Free (SR3 p.105)">
        ${pip(l.complex > 0, 'complex', 'Complex Action')}
        ${pip(l.simple > 0, 'simple', 'Simple Action')}${pip(l.simple > 1, 'simple', 'Simple Action')}
        ${pip(l.free > 0, 'free', 'Free Action')}
        ${l.log.some(e => e.over) ? '<span class="sr3e-pip-over" title="More than the phase allows — recorded, not refused">⚠</span>' : ''}
      </div>
      ${gm ? `<div class="sr3e-act-buttons">
        <button type="button" class="sr3e-act-complex"${l.simple ? ' disabled' : ''} title="Complex Action — ends the turn">Complex</button>
        <button type="button" class="sr3e-act-simple1${l.simple ? ' used' : ''}" title="Mark a Simple Action used (click again to unmark)">Simple</button>
        <button type="button" class="sr3e-act-simple2${l.simple > 1 ? ' used' : ''}" title="Second Simple Action — ends the turn">Simple</button>
        <button type="button" class="sr3e-act-undo"${l.log.length ? '' : ' disabled'} title="Undo the last action recorded: ${esc(l.log.at(-1)?.what ?? '—')}">↺</button>
      </div>` : ''}`;
    row.appendChild(wrap);
    if (!gm) return;
    const q = s => wrap.querySelector(s);
    q('.sr3e-act-complex').addEventListener('click', async () => { await combat.nextTurn(); });
    // A toggle, as it always was: unmark the last Simple recorded, or mark one.
    q('.sr3e-act-simple1').addEventListener('click', async () => {
      const cur  = SR3EActionLedger.ledgerOf(cbt);
      const last = cur.log.map(e => e.cost).lastIndexOf('simple');
      const next = last >= 0 ? ActionEconomy.uncharge(cur, last)
                             : ActionEconomy.charge(cur, 'simpleAction', 'Simple Action (GM)', game.user.name).ledger;
      await SR3EActionLedger.write(cbt, next);
    });
    q('.sr3e-act-simple2').addEventListener('click', async () => { await combat.nextTurn(); });
    q('.sr3e-act-undo').addEventListener('click', () => SR3EActionLedger.openUndo(cbt));
  }

  /**
   * ↺ The GM's undo — pick an action from this phase; tick what to put back (every value that has
   * changed since the action began) and which chat cards to delete (every card since); confirm.
   * ⚠ Everything starts ticked, and every row can be unticked: the snapshot is the whole actor's
   * spendables, so something unrelated that happened in between (the same character's dodge) would
   * be undone too unless the GM spares it. That is the GM's call, which is why it is a list.
   */
  static async openUndo(cbt) {
    if (!game.user.isGM) return;
    const ledger = SR3EActionLedger.ledgerOf(cbt);
    if (!ledger.log.length) return;
    const actor = cbt.actor;
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const data = () => ({ system: actor?.system ?? {}, items: actor ? actor.items.map(i => ({ id: i.id, name: i.name, type: i.type, system: i.system })) : [] });
    const cardText = m => esc((m.content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90));
    const body = idx => {
      const e = ledger.log[idx];
      const plan = ActionEconomy.restorePlan(e.snap, data());
      const cards = e.snap ? game.messages.filter(m => (m.timestamp ?? 0) >= e.snap.at) : [];
      const rows = plan.map((p, i) => p.gone
        ? `<div class="sr3e-undo-row"><em>${esc(p.name)} was deleted since — recreate it by hand.</em></div>`
        : `<label class="sr3e-undo-row"><input type="checkbox" class="sr3e-undo-val" data-i="${i}" checked/>
            ${p.kind === 'item' ? `${esc(p.name)} · ` : ''}${esc(p.field)}: ${esc(ActionEconomy.display(p.now))} → <strong>${esc(ActionEconomy.display(p.back))}</strong></label>`).join('');
      const crows = cards.map(m => `<label class="sr3e-undo-row"><input type="checkbox" class="sr3e-undo-card" data-id="${m.id}" checked/> 🗨 ${cardText(m)}</label>`).join('');
      return `${e.snap ? '' : '<p><em>No snapshot for this action (it was marked by hand) — only its slot is freed.</em></p>'}
        <h4>Put back</h4>${rows || '<p><em>Nothing it spent has changed.</em></p>'}
        <h4>Delete chat cards</h4>${crows || '<p><em>None.</em></p>'}`;
    };
    const opts = ledger.log.map((e, i) => `<option value="${i}"${i === ledger.log.length - 1 ? ' selected' : ''}>${esc(e.what)} (${e.cost})${e.by ? ` — ${esc(e.by)}` : ''}</option>`).join('');
    let chosen = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Undo an action — ${cbt.name}` },
      content: `<div class="sr3e-undo"><select class="sr3e-undo-pick" style="width:100%">${opts}</select>
        <div class="sr3e-undo-body">${body(ledger.log.length - 1)}</div></div>`,
      buttons: [
        { label: '↩ Undo', action: 'undo', default: true, callback: (_e, _b, d) => {
          const el = d.element;
          chosen = {
            idx: Number(el.querySelector('.sr3e-undo-pick').value),
            vals: [...el.querySelectorAll('.sr3e-undo-val:checked')].map(x => Number(x.dataset.i)),
            cards: [...el.querySelectorAll('.sr3e-undo-card:checked')].map(x => x.dataset.id),
          };
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
      render: (_ev, d) => {
        const el = d.element;
        el.querySelector('.sr3e-undo-pick')?.addEventListener('change', ev => {
          el.querySelector('.sr3e-undo-body').innerHTML = body(Number(ev.target.value));
        });
      },
    });
    if (!chosen) return;
    const e = ledger.log[chosen.idx];
    const plan = ActionEconomy.restorePlan(e?.snap, data());
    const actorChanges = {};
    const itemChanges = new Map();
    for (const i of chosen.vals) {
      const p = plan[i];
      if (!p || p.gone) continue;
      if (p.kind === 'actor') actorChanges[`system.${p.field}`] = p.back;
      else itemChanges.set(p.id, { ...(itemChanges.get(p.id) ?? { _id: p.id }), [`system.${p.field}`]: p.back });
    }
    if (actor && Object.keys(actorChanges).length) await actor.update(actorChanges);
    if (actor && itemChanges.size) await actor.updateEmbeddedDocuments('Item', [...itemChanges.values()]);
    if (chosen.cards.length) await ChatMessage.deleteDocuments(chosen.cards.filter(id => game.messages.has(id)));
    await SR3EActionLedger.write(cbt, ActionEconomy.uncharge(SR3EActionLedger.ledgerOf(cbt), chosen.idx));
    ui.notifications.info(`Undone: ${e?.what ?? 'the action'} — ${chosen.vals.length} value${chosen.vals.length === 1 ? '' : 's'} put back, ${chosen.cards.length} card${chosen.cards.length === 1 ? '' : 's'} deleted.`);
  }
}
