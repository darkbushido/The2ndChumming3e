import { Legwork, ASK, EAR, MATRIX, BASE_TN, MODES, PAGE } from './data/legwork.mjs';
import { actorFrom, actorRef } from './data/actor-ref.mjs';

/**
 * 🔎 Legwork — asking a contact, keeping an ear to the ground, searching the Matrix · SR3 pp.253-256 (TODO 268).
 *
 * A GM tool on the Rollable Tables tab. The GM picks the runner and one of their contacts, the mode, the Etiquette
 * specialisation, the TN (4, or the chosen success table's) and the contact's Level; the test rolls through
 * `SR3EActor.rollThen`, so a 6 at TN 7+ is a 💥 click and the result waits for it. The card shows the successes,
 * every success-table row they reach (cumulative, p.253) and the fee (p.254). The rules are in
 * `scripts/data/legwork.mjs`, with the book's wording.
 *
 * ⚠ **The contact Level is the GM's pick in the dialog**, offered from Loyalty capped at 3 — contacts store
 *   Loyalty and Connection, not SR3's Level 1-3. A stopgap until TODO 267 goes over contacts.
 * ⚠ **The contact's Charisma and Intelligence come from its linked NPC or archetype** (`npcUuid`, then
 *   `archetypeUuid`); most contacts are bare items, so the GM can type them.
 * ⚠ **Offer, never apply**: the fee is shown, never charged — the GM adjusts it and Negotiation sets the price.
 * ⚠ The follow-up can run on a player's client (they click the 💥 on their runner's card), so the success
 *   table is read there by uuid; a player who cannot see the table gets a pointer to it instead of its rows.
 */

const esc = s => foundry.utils.escapeHTML(String(s ?? ''));
const num = v => { const n = parseInt(v); return Number.isFinite(n) ? n : null; };

export class SR3ELegwork {

  /** Runners — never templates, the scene's tokens first. */
  static people() {
    return game.sr3e.sceneFirst(game.actors
      .filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a)));
  }

  static contacts(actor) {
    return (actor?.items ?? []).filter(i => i.type === 'contact');
  }

  /** An actor's Etiquette skill as `{ rating, specialisations }`, or null. */
  static etiquette(actor) {
    const s = (actor?.items ?? []).find(i => i.type === 'skill' && /^etiquette$/i.test(String(i.name ?? '').trim()));
    return s ? { rating: s.system?.rating ?? 0, specialisations: s.system?.specialisations ?? [] } : null;
  }

  /** The statted actor behind a contact — its NPC (Meet the contact) first, then its archetype — or null. */
  static async contactActor(contact) {
    for (const uuid of [contact?.system?.npcUuid, contact?.system?.archetypeUuid]) {
      if (!uuid) continue;
      try {
        const a = await fromUuid(uuid);
        if (a?.documentName === 'Actor') return a;
      } catch { /* a dead link — try the next */ }
    }
    return null;
  }

  static attr(actor, key) {
    const a = actor?.system?.attributes?.[key];
    return a ? (a.value ?? a.base ?? null) : null;
  }

  /** The world's RollTables, for the success-table picker. */
  static tables() {
    return [...(game.tables ?? [])].filter(t => t.visible !== false).sort((a, b) => a.name.localeCompare(b.name));
  }

  static tableTN(table) {
    return table ? Legwork.tableTN(table.description, table.getFlag?.('The2ndChumming3e', 'legworkTN')) : null;
  }

  /* ------------------------------------------------------------------ */
  /*  The dialog                                                          */
  /* ------------------------------------------------------------------ */

  static async open() {
    if (!game.user.isGM) { ui.notifications.warn('Legwork is a GM tool.'); return; }
    const people = SR3ELegwork.people();
    if (!people.length) { ui.notifications.warn('There are no characters or NPCs in the world.'); return; }
    const start = people.find(a => SR3ELegwork.contacts(a).length) ?? people[0];
    const tables = SR3ELegwork.tables();
    const FIELD = 'display:flex;flex-direction:column;gap:3px;color:var(--sr-muted);font-size:12px;';
    const stats = new Map();   // contact id → { actor, cha, int, etiquette } (fromUuid is async)

    const wireDialog = (app, html) => {
      const el = html?.querySelector ? html : null;
      if (!el) return;
      const q = s => el.querySelector(s);
      const mode   = () => el.querySelector('input[name="lw-mode"]:checked')?.value ?? ASK;
      const runner = () => actorFrom(q('#lw-actor').value);
      const contact = () => SR3ELegwork.contacts(runner()).find(c => c.id === q('#lw-contact').value) ?? null;
      const show = (sel, on) => { const n = q(sel); if (n) n.style.display = on ? '' : 'none'; };

      const fillSpecs = () => {
        const m = mode();
        const who = m === EAR ? stats.get(contact()?.id)?.etiquette : SR3ELegwork.etiquette(runner());
        const specs = (who?.specialisations ?? []).map(s => s.name);
        const pick = Legwork.defaultSpec(specs, m);
        q('#lw-spec').innerHTML = `<option value="">Etiquette (base${who ? ` ${who.rating}` : ' — none'})</option>`
          + specs.map(s => `<option value="${esc(s)}"${s === pick ? ' selected' : ''}>Etiquette (${esc(s)})</option>`).join('');
      };

      const recompute = () => {
        const m = mode();
        const c = contact();
        const st = stats.get(c?.id);
        show('#lw-contact-row', m !== MATRIX || !!c);
        show('#lw-rushed-row', m === ASK);
        show('#lw-level-row', m === ASK);
        show('#lw-fee-row', m !== MATRIX);
        const who = m === EAR ? st?.etiquette : SR3ELegwork.etiquette(runner());
        const { dice } = Legwork.etiquetteDice(who, q('#lw-spec').value);
        const bonus = Legwork.levelDice(num(q('#lw-level').value), m);
        if (!q('#lw-dice').dataset.typed) q('#lw-dice').value = who || m !== EAR ? dice + bonus : '';
        const wounds = Math.max(0, -(Number(runner()?.system?.woundMod) || 0));
        const tn = Legwork.targetNumber({ base: num(q('#lw-tn').value) ?? BASE_TN, mode: m,
          rushed: q('#lw-rushed').checked, wounds, other: num(q('#lw-mod').value) ?? 0 });
        const d = num(q('#lw-dice').value);
        const parts = [
          m === EAR ? `${esc(c?.name ?? 'The contact')} rolls` : `${esc(runner()?.name ?? '')} rolls`,
          d == null ? '<span style="color:var(--sr-amber)">— enter the dice</span>' : `<strong>${d}</strong> dice`,
          `vs <strong>TN ${tn}</strong>`,
        ];
        const notes = [];
        if (bonus) notes.push(`+${bonus} for a Level ${num(q('#lw-level').value)} contact (SR3 p.256)`);
        if (m === EAR) notes.push('+2 TN: the contact asks around (SR3 p.254)');
        if (m === ASK && q('#lw-rushed').checked) notes.push('+2 TN for rushing the meet — the rush takes its own Etiquette Test first (SR3 p.254)');
        if (m !== EAR && wounds) notes.push(`+${wounds} TN for ${esc(runner()?.name)}'s wounds`);
        if (m === MATRIX) notes.push(`no Hacking Pool; at most ${Legwork.maxSearches(SR3ELegwork.attr(runner(), 'intelligence'))} searches at once (SR3 p.254)`);
        if (m === EAR && !st?.etiquette && !q('#lw-dice').dataset.typed) notes.push('<span style="color:var(--sr-amber)">the contact has no stats — enter its Etiquette dice</span>');
        q('#lw-out').innerHTML = `${parts.join(' ')}${notes.length ? `<div style="font-size:11px;color:var(--sr-muted)">${notes.join(' · ')}</div>` : ''}`;
      };

      const loadContact = async () => {
        const c = contact();
        if (c && !stats.has(c.id)) {
          const a = await SR3ELegwork.contactActor(c);
          stats.set(c.id, { actor: a, cha: SR3ELegwork.attr(a, 'charisma'), int: SR3ELegwork.attr(a, 'intelligence'), etiquette: SR3ELegwork.etiquette(a) });
        }
        const st = stats.get(c?.id);
        q('#lw-cha').value = st?.cha ?? '';
        q('#lw-int').value = st?.int ?? '';
        q('#lw-stats-note').textContent = !c ? '' : st?.actor
          ? `From ${st.actor.name}${st.actor.pack ? ' (archetype)' : ''}.`
          : 'This contact links to no stat block — type them in, or leave blank and set the fee by hand.';
        q('#lw-level').value = String(Legwork.levelFromLoyalty(c?.system?.loyalty));
        q('#lw-level-note').textContent = c ? `Loyalty ${c.system?.loyalty ?? 1} · Connection ${c.system?.connection ?? 1}` : '';
        fillSpecs();
        recompute();
      };

      const fillContacts = () => {
        const list = SR3ELegwork.contacts(runner());
        q('#lw-contact').innerHTML = list.length
          ? list.map(c => `<option value="${c.id}">${esc(c.name)}${c.system?.archetype ? ` — ${esc(c.system.archetype)}` : ''}</option>`).join('')
          : '<option value="">— no contacts —</option>';
        loadContact();
      };

      q('#lw-actor').addEventListener('change', () => { delete q('#lw-dice').dataset.typed; fillContacts(); });
      q('#lw-contact').addEventListener('change', () => { delete q('#lw-dice').dataset.typed; loadContact(); });
      el.querySelectorAll('input[name="lw-mode"]').forEach(r => r.addEventListener('change', () => {
        delete q('#lw-dice').dataset.typed; fillSpecs(); recompute();
      }));
      q('#lw-table').addEventListener('change', () => {
        const tn = SR3ELegwork.tableTN(game.tables.get(q('#lw-table').value));
        q('#lw-tn').value = tn ?? BASE_TN;
        recompute();
      });
      q('#lw-dice').addEventListener('input', () => { q('#lw-dice').dataset.typed = '1'; recompute(); });
      for (const id of ['#lw-spec', '#lw-level']) q(id).addEventListener('change', () => { delete q('#lw-dice').dataset.typed; recompute(); });
      for (const id of ['#lw-tn', '#lw-mod', '#lw-rushed']) { q(id).addEventListener('input', recompute); q(id).addEventListener('change', recompute); }
      // Enter in a number box must not fire the default button mid-edit.
      el.querySelectorAll('input[type="number"]').forEach(n => n.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); }));
      fillContacts();
    };

    let choice = null;
    await foundry.applications.api.DialogV2.wait({
      window:   { title: '🔎 Legwork' },
      position: { width: 500 },
      render: (_event, dialog) => wireDialog(dialog, dialog.element),
      content: `
        <div style="font-size:12px;margin-bottom:6px">An Etiquette Success Test; the successes reveal every row of the success
          table up to that many <em>(${PAGE})</em>.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;align-items:end">
          <label style="${FIELD}">Runner
            <select id="lw-actor">${SR3ELegwork.people().map(a => `<option value="${actorRef(a)}"${a === start ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
          <label id="lw-contact-row" style="${FIELD}">Contact
            <select id="lw-contact"></select></label>
        </div>
        <div style="margin:8px 0 2px;font-size:12px;color:var(--sr-muted)">What they do:</div>
        ${Object.entries(MODES).map(([k, m]) => `
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin:2px 0">
            <input type="radio" name="lw-mode" value="${k}"${k === ASK ? ' checked' : ''}/> ${esc(m.label)}
            <span style="color:var(--sr-muted)">— ${esc(m.test)} (${esc(m.page)})</span></label>`).join('')}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 10px;align-items:end;margin-top:6px">
          <label style="${FIELD};grid-column:1/3">Specialisation
            <select id="lw-spec"></select></label>
          <label id="lw-level-row" style="${FIELD}" title="SR3 p.256: Level 2 gives 1 extra die, Level 3 gives 2. Contacts store Loyalty and Connection, not a Level — pick it (TODO 267).">Contact Level
            <select id="lw-level"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>
            <span id="lw-level-note" style="font-size:10px"></span></label>
          <label style="${FIELD};grid-column:1/-1">Success table (optional — a world Rollable Table)
            <select id="lw-table"><option value="">— none: read the adventure's table by hand —</option>
              ${tables.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>
          <label style="${FIELD}">Table TN
            <input id="lw-tn" type="number" min="2" max="30" value="${BASE_TN}"/></label>
          <label style="${FIELD}" title="Anything else the GM applies; the runner's wounds are added for you">Other TN modifiers
            <input id="lw-mod" type="number" step="1" value="0"/></label>
          <label style="${FIELD}">Dice
            <input id="lw-dice" type="number" min="0" max="40"/></label>
          <label id="lw-rushed-row" style="display:flex;align-items:center;gap:6px;font-size:12px;grid-column:1/-1;cursor:pointer">
            <input id="lw-rushed" type="checkbox"/> Rushed meeting (+2 TN; the rush is its own Etiquette Test, SR3 p.254)</label>
        </div>
        <div id="lw-fee-row" style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;align-items:end;margin-top:6px">
          <label style="${FIELD}">Contact's Charisma
            <input id="lw-cha" type="number" min="0" max="20" placeholder="—"/></label>
          <label style="${FIELD}">Contact's Intelligence
            <input id="lw-int" type="number" min="0" max="20" placeholder="—"/></label>
          <div id="lw-stats-note" style="font-size:10px;color:var(--sr-muted);grid-column:1/-1"></div>
        </div>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:6px;cursor:pointer">
          <input id="lw-private" type="checkbox" checked/> Result card to the GM only</label>
        <div id="lw-out" style="font-size:12px;color:var(--sr-gold);margin-top:8px"></div>`,
      buttons: [
        { label: '🎲 Roll', action: 'roll', default: true, callback: (_e, _b, d) => {
          const q = s => d.element.querySelector(s);
          const m = d.element.querySelector('input[name="lw-mode"]:checked')?.value ?? ASK;
          choice = {
            mode: m, runnerRef: q('#lw-actor').value, contactId: q('#lw-contact').value,
            spec: q('#lw-spec').value, level: num(q('#lw-level').value) ?? 1,
            dice: num(q('#lw-dice').value), baseTN: num(q('#lw-tn').value) ?? BASE_TN, other: num(q('#lw-mod').value) ?? 0,
            rushed: m === ASK && q('#lw-rushed').checked, tableId: q('#lw-table').value,
            cha: num(q('#lw-cha').value), int: num(q('#lw-int').value), private: q('#lw-private').checked,
          };
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (choice) await SR3ELegwork.roll(choice, stats);
  }

  /** Roll the test the dialog set up. */
  static async roll(choice, stats = new Map()) {
    const runner  = actorFrom(choice.runnerRef);
    const contact = SR3ELegwork.contacts(runner).find(c => c.id === choice.contactId) ?? null;
    if (!runner) return;
    if (choice.mode !== MATRIX && !contact) { ui.notifications.warn(`${runner.name} has no contact to ask.`); return; }
    if (choice.dice == null || choice.dice < 1) { ui.notifications.warn('Enter the dice to roll.'); return; }

    const wounds = Math.max(0, -(Number(runner.system?.woundMod) || 0));
    const tn = Legwork.targetNumber({ base: choice.baseTN, mode: choice.mode, rushed: choice.rushed, wounds, other: choice.other });
    // The contact's own test rolls on its world NPC when it has one; otherwise on the runner's sheet as a dice
    // carrier (rollThen applies no wound or sustaining modifiers, so nothing of the runner's leaks in).
    const npc = choice.mode === EAR ? stats.get(contact?.id)?.actor : null;
    const roller = npc && !npc.pack ? npc : runner;
    const table = choice.tableId ? game.tables.get(choice.tableId) : null;
    const ctx = {
      mode: choice.mode, runnerName: runner.name, contactName: contact?.name ?? '',
      spec: choice.spec, level: choice.level, levelDice: Legwork.levelDice(choice.level, choice.mode),
      dice: choice.dice, tn, baseTN: choice.baseTN, rushed: choice.rushed, wounds: choice.mode === EAR ? 0 : wounds,
      tableUuid: table?.uuid ?? '', tableName: table?.name ?? '',
      cha: choice.cha, int: choice.int, private: !!choice.private,
      maxSearches: Legwork.maxSearches(SR3ELegwork.attr(runner, 'intelligence')),
    };
    const what = choice.mode === EAR ? `${contact.name} asks around for ${runner.name}`
      : choice.mode === MATRIX ? `${runner.name} searches the Matrix` : `${runner.name} asks ${contact.name}`;
    await game.sr3e.SR3EActor.rollThen(roller, choice.dice, tn, {
      label: `🔎 Legwork — ${what}`, followUp: { kind: 'legwork', ctx },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  The result — FOLLOW_UPS.legwork, after the last 💥                  */
  /* ------------------------------------------------------------------ */

  static async rolled(ctx, res) {
    const s = res?.successes ?? 0;
    const lines = [];
    const spec = ctx.spec ? `Etiquette (${esc(ctx.spec)})` : 'Etiquette';
    const head = ctx.mode === EAR ? `${esc(ctx.contactName)} keeps an ear to the ground for ${esc(ctx.runnerName)}`
      : ctx.mode === MATRIX ? `${esc(ctx.runnerName)} searches the Matrix`
      : `${esc(ctx.runnerName)} asks ${esc(ctx.contactName)}`;
    const faces = (res?.dice ?? []).map(d => d.total).join(', ');
    lines.push(`<div class="sr-staging-result"><strong>${s}</strong> success${s === 1 ? '' : 'es'} — ${spec}, ${ctx.dice} dice
      ${ctx.levelDice ? ` (incl. +${ctx.levelDice} for a Level ${ctx.level} contact)` : ''} vs TN ${ctx.tn}
      ${faces ? `<span style="color:var(--sr-muted);font-size:11px">[${esc(faces)}]</span>` : ''}</div>`);

    const mods = [];
    if (ctx.mode === EAR) mods.push(`table TN ${ctx.baseTN} +2 for asking around`);
    if (ctx.rushed) mods.push('+2 for the rushed meet (the rush is its own Etiquette Test, SR3 p.254)');
    if (ctx.wounds) mods.push(`+${ctx.wounds} wounds`);
    if (mods.length) lines.push(`<div class="sr-roll-meta" style="font-size:11px">${mods.join(' · ')}</div>`);

    if (ctx.mode === EAR) {
      if (Legwork.reportsBack(s)) {
        const hours = (await new Roll('2d6').evaluate()).total;
        lines.push(`<div class="sr-roll-meta">The contact reports back in <strong>${hours} hours</strong> (2D6), or when the GM decides (SR3 p.254).</div>`);
      } else {
        lines.push('<div class="sr-roll-meta">The contact hears nothing (SR3 p.254).</div>');
      }
    }
    if (ctx.mode === MATRIX) {
      const hours = (await new Roll('2d6').evaluate()).total;
      lines.push(`<div class="sr-roll-meta">Base time <strong>${hours} hours</strong> (2D6); successes can be traded to cut it.
        No Hacking Pool. At most ${ctx.maxSearches} searches at once (half Intelligence, rounded up) (SR3 p.254).</div>`);
    }

    if (ctx.mode !== MATRIX && s > 0) {
      if (ctx.cha != null && ctx.int != null) {
        const f = Legwork.fee(ctx.cha, ctx.int, s);
        lines.push(`<div class="sr-roll-meta">Fee: Charisma ${ctx.cha} × Intelligence ${ctx.int} × 50 = ${f.base.toLocaleString()}¥
          ÷ ${s} = <strong>${f.fee.toLocaleString()}¥</strong>. The GM may adjust it; Negotiation sets the final price (SR3 p.254).</div>`);
      } else {
        lines.push(`<div class="sr-roll-meta">Fee: the contact's Charisma × Intelligence × 50 ÷ ${s} — no stats were given (SR3 p.254).</div>`);
      }
    }

    lines.push(await SR3ELegwork.tiersHtml(ctx, s));

    const gm = game.users.filter(u => u.isGM).map(u => u.id);
    await ChatMessage.create({
      speaker: { alias: ctx.mode === EAR ? ctx.contactName || 'GM' : ctx.runnerName },
      content: `<div class="sr-roll-card sr-legwork-card">
        <div class="sr-roll-header">🔎 ${head}</div>
        ${lines.join('\n')}
      </div>`,
      ...(ctx.private ? { whisper: gm } : {}),
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  }

  /** The success-table rows the successes reach, or a pointer to the table. */
  static async tiersHtml(ctx, s) {
    if (!ctx.tableUuid) {
      return s > 0 ? `<div class="sr-roll-meta" style="font-size:11px;color:var(--sr-muted)">No success table chosen — read the adventure's table: every row up to ${s} (SR3 p.253).</div>` : '';
    }
    let table = null;
    try { table = await fromUuid(ctx.tableUuid); } catch { /* deleted, or not visible here */ }
    if (!table?.results) {
      return `<div class="sr-roll-meta" style="font-size:11px">GM: read <em>${esc(ctx.tableName)}</em>, every row up to ${s} (SR3 p.253).</div>`;
    }
    const rows = Legwork.revealed(table.results.contents.map(r => ({ range: r.range, name: r.name, description: r.description })), s);
    if (!rows.length) return `<div class="sr-roll-meta">Nothing from <em>${esc(table.name)}</em>.</div>`;
    const TE = foundry.applications.ux.TextEditor.implementation;
    const body = [];
    for (const r of rows) {
      const text = await TE.enrichHTML(r.text, { relativeTo: table, secrets: !!ctx.private });
      body.push(`<div style="border-top:1px solid var(--sr-border);padding:3px 0;font-size:12px">
        <strong>${esc(r.name || `${r.low}${r.high > r.low ? '+' : ''}`)}</strong> ${text}</div>`);
    }
    return `<div style="margin-top:4px"><div class="sr-roll-meta" style="font-size:11px">From <em>${esc(table.name)}</em> — every row up to ${s} (SR3 p.253):</div>${body.join('')}</div>`;
  }
}
