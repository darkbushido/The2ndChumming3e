import { Concealment, MODES, NOTICE, SEARCH_HALF, SEARCH_FULL, SEARCH_TABLE } from './data/concealment.mjs';

/**
 * 👁 Concealment — what a character carries that can be seen, and how well it is hidden · TODO 195.
 *
 * A GM tool (the Rollable Tables sidebar, and a button on a character's Attributes tab). It lists the weapons,
 * worn armour and visible implants a character has, each with its Concealability, least concealed first; the GM
 * ticks what to show, can correct a number, posts the list to chat for the table, and can roll the Perception
 * Test the book gives against any row. The rules and the heuristic for "visible" are in
 * `scripts/data/concealment.mjs`, with the book's wording and printed pages.
 *
 * ⚠ Offer, never apply: nothing here changes an item or a roll the table did not ask for. The numbers typed in
 * the dialog affect that card and that test only; they are not written back to the items.
 */

const esc = s => foundry.utils.escapeHTML(String(s ?? ''));
const json = o => JSON.stringify(o).replace(/'/g, '&#39;');

const ICON  = { weapon: '🔫', armor: '🛡', implant: '⚙' };
const STATE = {
  drawn:     'in hand',
  stowed:    'stowed',
  body:      'implanted weapon',
  worn:      'worn',
  obvious:   'obvious',
  disguised: 'disguised',
  judge:     'the GM decides',
};

export class SR3EConcealment {

  /** The actors this can be run on — never templates, the scene's tokens first. */
  static people() {
    return game.sr3e.sceneFirst(game.actors
      .filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a)));
  }

  /** The rows for one actor (see `Concealment.rows`). */
  static rowsFor(actor) {
    if (!actor) return [];
    const worn = game.sr3e.SR3EActor.wornArmorItems(actor).map(i => i.id);
    return Concealment.rows([...actor.items], { wornIds: worn });
  }

  /** What a row says about itself, in a few words. */
  static label(r) {
    if (r.state === 'drawn' || r.state === 'obvious') return STATE[r.state];
    if (r.state === 'judge' && r.conceal == null) return STATE.judge;
    return r.conceal == null ? `${STATE[r.state]}, no rating` : `Concealability ${r.conceal} · ${STATE[r.state]}`;
  }

  /* ------------------------------------------------------------------ */
  /*  The list                                                            */
  /* ------------------------------------------------------------------ */

  static async open(actor = null) {
    if (!game.user.isGM) { ui.notifications.warn('The Concealment view is a GM tool.'); return; }
    const people = SR3EConcealment.people();
    if (!people.length && !actor) { ui.notifications.warn('There are no characters or NPCs in the world.'); return; }
    const list  = actor && !people.includes(actor) ? [actor, ...people] : people;
    const start = actor ?? list[0];

    const wireDialog = (app, html) => {
      const el = html?.querySelector ? html : null;
      if (!el) return;
      const q = s => el.querySelector(s);
      let rows = [];
      const draw = () => {
        const a = game.actors.get(q('#cn-actor').value);
        rows = SR3EConcealment.rowsFor(a);
        q('#cn-rows').innerHTML = rows.length ? rows.map((r, i) => `
          <div class="cn-row" data-i="${i}" style="display:grid;grid-template-columns:auto 1fr 5em auto;gap:6px;align-items:center;padding:3px 0;border-bottom:1px solid var(--sr-border)">
            <input type="checkbox" class="cn-show" checked title="Show this on the card"/>
            <div style="font-size:12px">${ICON[r.kind] ?? ''} ${esc(r.name)}
              <div style="font-size:10px;color:var(--sr-muted)">${esc(STATE[r.state])}${r.note ? ` — ${esc(r.note)}` : ''}</div></div>
            <input type="number" class="cn-num" min="0" max="30" value="${r.conceal ?? ''}" placeholder="—"
                   title="Concealability — a target number, so lower is easier to spot. Edits affect this card only."
                   ${r.state === 'drawn' || r.state === 'obvious' ? 'disabled' : ''}/>
            <button type="button" class="cn-test btn-sm" title="Roll the Perception Test against this item (SR3 p.231)"
                    ${r.state === 'drawn' || r.state === 'obvious' ? 'disabled' : ''}>🔍</button>
          </div>`).join('')
          : `<p style="font-size:12px;color:var(--sr-muted)">Nothing visible: no weapons, no worn armour, no outward implants.</p>`;
        q('#cn-rows').querySelectorAll('.cn-test').forEach(b => b.addEventListener('click', () => {
          const i = Number(b.closest('.cn-row').dataset.i);
          const c = parseInt(b.closest('.cn-row').querySelector('.cn-num').value);
          SR3EConcealment.testDialog({ actorId: a?.id ?? '', name: rows[i].name, conceal: Number.isFinite(c) ? c : rows[i].conceal });
        }));
      };
      q('#cn-actor').addEventListener('change', draw);
      draw();
      app.sr3eRows = () => [...el.querySelectorAll('.cn-row')].map((row, i) => ({
        ...rows[i],
        show:    row.querySelector('.cn-show').checked,
        conceal: Number.isFinite(parseInt(row.querySelector('.cn-num').value)) ? parseInt(row.querySelector('.cn-num').value) : null,
      }));
    };

    let out = null;
    await foundry.applications.api.DialogV2.wait({
      window:   { title: '👁 Concealment' },
      position: { width: 520 },
      render: (_event, dialog) => wireDialog(dialog, dialog.element),
      content: `
        <label style="display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--sr-muted)">Whose
          <select id="cn-actor">${list.map(a => `<option value="${a.id}"${a.id === start.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
        <p style="font-size:11px;color:var(--sr-muted);margin:6px 0 2px">Least concealed first. Concealability is the target number of a
          Perception Test to notice the item (SR3 p.45, p.231, p.270) — the <em>lower</em> it is, the easier it is to spot.
          Untick what the table should not see; a number you change affects this card only.</p>
        <div id="cn-rows" style="max-height:340px;overflow:auto"></div>`,
      buttons: [
        { label: '📣 Post to chat', action: 'post', default: true,
          callback: (_e, _b, d) => { out = { actorId: d.element.querySelector('#cn-actor').value, rows: d.sr3eRows?.() ?? [] }; } },
        { label: 'Close', action: 'close' },
      ],
    });
    if (out) await SR3EConcealment.post(out.actorId, out.rows);
  }

  /* ------------------------------------------------------------------ */
  /*  The card                                                            */
  /* ------------------------------------------------------------------ */

  static cardHtml(actor, rows) {
    const shown = Concealment.sort(rows.filter(r => r.show !== false));
    const body = shown.length ? shown.map(r => {
      const testable = r.needsTest && r.conceal != null;
      const btn = testable
        ? `<button type="button" class="sr-conceal-test-btn" data-payload='${json({ actorId: actor.id, name: r.name, conceal: r.conceal })}'>🔍 Test</button>` : '';
      return `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:2px 0;border-bottom:1px solid var(--sr-border);font-size:12px">
          <span>${ICON[r.kind] ?? ''} ${esc(r.name)}</span>
          <span style="color:var(--sr-muted);white-space:nowrap">${esc(SR3EConcealment.label(r))}</span>${btn}
        </div>`;
    }).join('') : `<div style="font-size:12px;color:var(--sr-muted)">Nothing visible.</div>`;
    return `<div class="sr-roll-card sr-conceal-card">
        <div class="sr-roll-header">👁 What ${esc(actor.name)} is carrying</div>
        ${body}
        <div class="sr-roll-meta" style="font-size:10px;margin-top:4px">Least concealed first. Concealability is the target number to notice the item
          (SR3 p.45, p.231, p.270): the lower it is, the easier to spot.</div>
      </div>`;
  }

  static async post(actorId, rows) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    await ChatMessage.create({ speaker: { alias: 'GM' }, content: SR3EConcealment.cardHtml(actor, rows) });
  }

  /* ------------------------------------------------------------------ */
  /*  The Perception Test                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Roll the Perception Test the book gives against one item. Three readings of the target number are offered
   * because p.270 and p.237 disagree about a search (see `Concealment`); the GM picks.
   * @param {{actorId:string, name:string, conceal:number|null}} item  actorId = whose item
   */
  static async testDialog({ actorId = '', name = 'the item', conceal = null } = {}) {
    if (!game.user.isGM) { ui.notifications.warn('Only the GM rolls this test.'); return; }
    const observers = SR3EConcealment.people();
    if (!observers.length) { ui.notifications.warn('There is nobody to make the Perception Test.'); return; }
    const carrier = game.actors.get(actorId);
    const opt = (rows, sel) => rows.map(r => `<option value="${r.key}"${r.key === sel ? ' selected' : ''}>${esc(r.label)}${r.mod != null ? ` (${r.mod >= 0 ? '+' : ''}${r.mod})` : ''}</option>`).join('');
    const FIELD = 'display:flex;flex-direction:column;gap:3px;color:var(--sr-muted);font-size:12px;';

    const wireDialog = (app, html) => {
      const el = html?.querySelector ? html : null;
      if (!el) return;
      const q = s => el.querySelector(s);
      const mode = () => el.querySelector('input[name="cn-mode"]:checked')?.value ?? NOTICE;
      const state = () => {
        const m = mode();
        const s = Concealment.searchModifier({ professional: q('#cn-prof').value, time: q('#cn-time').value, searcher: q('#cn-searcher').value });
        q('#cn-search').style.display = m === SEARCH_FULL ? '' : 'none';
        const extra = (parseInt(q('#cn-mod').value) || 0) + (m === SEARCH_FULL ? s.mod : 0);
        const c = parseInt(q('#cn-c').value);
        q('#cn-out').textContent = m === SEARCH_FULL && s.found
          ? 'A strip search finds the weapon — no test (SR3 p.236).'
          : Number.isFinite(c) ? `Target number ${Concealment.targetNumber(c, m, extra)} (Concealability ${c}${m === SEARCH_HALF ? ', halved' : ''}${extra ? `, ${extra > 0 ? '+' : ''}${extra}` : ''})` : 'Enter the Concealability.';
      };
      q('#cn-observer').addEventListener('change', () => {
        const a = game.actors.get(q('#cn-observer').value);
        q('#cn-dice').value = a?.system?.attributes?.intelligence?.value ?? a?.system?.attributes?.intelligence?.base ?? 3;
      });
      el.querySelectorAll('input, select').forEach(n => { n.addEventListener('input', state); n.addEventListener('change', state); });
      q('#cn-observer').dispatchEvent(new Event('change'));
      state();
    };

    let choice = null;
    await foundry.applications.api.DialogV2.wait({
      window:   { title: `🔍 Perception — ${name}` },
      position: { width: 460 },
      render: (_event, dialog) => wireDialog(dialog, dialog.element),
      content: `
        <div style="font-size:12px;margin-bottom:6px">Noticing <strong>${esc(name)}</strong>${carrier ? ` on ${esc(carrier.name)}` : ''}.
          A Perception Test rolls Intelligence dice; one success means they noticed something (SR3 p.231-232).</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 10px;align-items:end">
          <label style="${FIELD};grid-column:1/-1">Who looks
            <select id="cn-observer">${observers.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label>
          <label style="${FIELD}">Dice (Intelligence)
            <input id="cn-dice" type="number" min="1" max="30" value="3"/></label>
          <label style="${FIELD}">Concealability
            <input id="cn-c" type="number" min="0" max="30" value="${conceal ?? ''}"/></label>
          <label style="${FIELD}" title="Perception Test Modifiers Table (p.232): distracted +2, partially hidden +2, brightly coloured −2, light and weather …">Other modifiers
            <input id="cn-mod" type="number" step="1" value="0"/></label>
        </div>
        <div style="margin:8px 0 2px;font-size:12px;color:var(--sr-muted)">How the target number is read — the book gives two for a search:</div>
        ${Object.entries(MODES).map(([k, m]) => `
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin:2px 0">
            <input type="radio" name="cn-mode" value="${k}"${k === NOTICE ? ' checked' : ''}/> ${esc(m.label)} <span style="color:var(--sr-muted)">(${esc(m.page)})</span></label>`).join('')}
        <div id="cn-search" style="display:none;grid-template-columns:1fr;gap:4px;margin-top:6px">
          <label style="${FIELD}">Searcher's professionalism <select id="cn-prof">${opt(SEARCH_TABLE.professional, 'trained')}</select></label>
          <label style="${FIELD}">Time spent <select id="cn-time">${opt(SEARCH_TABLE.time, 'standard')}</select></label>
          <label style="${FIELD}">Searcher is <select id="cn-searcher">${opt(SEARCH_TABLE.searcher, 'normal')}</select></label>
        </div>
        <div id="cn-out" style="font-size:12px;color:var(--sr-gold);margin-top:8px"></div>`,
      buttons: [
        { label: '🎲 Roll', action: 'roll', default: true, callback: (_e, _b, d) => {
          const q = s => d.element.querySelector(s);
          const m = d.element.querySelector('input[name="cn-mode"]:checked')?.value ?? NOTICE;
          const s = Concealment.searchModifier({ professional: q('#cn-prof').value, time: q('#cn-time').value, searcher: q('#cn-searcher').value });
          const extra = (parseInt(q('#cn-mod').value) || 0) + (m === SEARCH_FULL ? s.mod : 0);
          const c = parseInt(q('#cn-c').value);
          choice = { observerId: q('#cn-observer').value, dice: parseInt(q('#cn-dice').value) || 1, mode: m,
            found: m === SEARCH_FULL && s.found, conceal: Number.isFinite(c) ? c : null,
            tn: Number.isFinite(c) ? Concealment.targetNumber(c, m, extra) : null };
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!choice) return;
    const observer = game.actors.get(choice.observerId);
    if (choice.found) {
      await ChatMessage.create({ speaker: { alias: 'GM' }, content: `<div class="sr-roll-card">
        <div class="sr-roll-header">🔍 Strip search — ${esc(name)}</div>
        <div class="sr-staging-result">A strip search of 6-10 minutes finds the weapon without a test (SR3 p.236).</div></div>` });
      return;
    }
    if (!observer || choice.tn == null) { ui.notifications.warn('Pick who looks and enter the Concealability.'); return; }
    await observer.rollPool(choice.dice, choice.tn, `🔍 ${observer.name} looks for ${name}`, {
      followUp: { kind: 'concealPerception', ctx: { name, carrierName: carrier?.name ?? '', conceal: choice.conceal, tn: choice.tn, mode: choice.mode, observerName: observer.name } },
    });
  }

  /** The Perception Success Table · SR3 p.232, read on the roll's successes. */
  static perceptionLine(successes) {
    const s = Math.max(0, Math.trunc(Number(successes) || 0));
    if (s === 0) return 'Nothing noticed.';
    if (s === 1) return 'Something is there.';
    if (s === 2) return 'Something is definitely there, and the perceiver suspects what general type of thing it is.';
    if (s === 3) return 'The perceiver knows what type of thing it is and suspects its exact nature.';
    return 'The perceiver knows what it is, but has no specifics without further information or examination.';
  }

  /** FOLLOW_UPS.concealPerception — after the last 💥. */
  static async perceptionRolled(ctx, res) {
    const s = res?.successes ?? 0;
    await ChatMessage.create({
      speaker: { alias: 'GM' },
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header">🔍 ${esc(ctx.observerName)} — ${esc(ctx.name)}${ctx.carrierName ? ` on ${esc(ctx.carrierName)}` : ''}</div>
        <div class="sr-staging-result">${s} success${s === 1 ? '' : 'es'} against TN ${ctx.tn} — <strong>${esc(SR3EConcealment.perceptionLine(s))}</strong>
          <span style="color:var(--sr-muted);font-size:11px">(Perception Success Table, SR3 p.232; ${esc(MODES[ctx.mode]?.page ?? '')})</span></div>
      </div>`,
    });
  }
}
