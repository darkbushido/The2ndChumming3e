/**
 * Meet the contact — turn a Little Black Book archetype into a person · TODO 262.
 *
 * The GM opens it from a contact linked to an archetype (🎲 on the Contacts tab) or from a macro
 * (`game.sr3e.SR3EMeetContact.open({ archetypeUuid })`). The dialog proposes a metatype (the book's, as an
 * example — changeable), a gender, a face from any active portrait module and a name that fits the face.
 * **Create NPC** copies the archetype's stat block through the GM verb `sr3e.actor.create` with that name and
 * picture, and — opened from a contact — points the contact at the new NPC so its player sees the face.
 *
 * ⚠ **Offer, never apply.** Nothing is written until Create NPC. The contact's own name and picture change only
 * when the GM leaves "Show this on the contact" ticked, and a picture someone chose is never replaced.
 * ⚠ **No portrait module → no grid**, names still work. The rules: `.claude/rules/portraits.md`.
 */
import { Portraits, DEMOGRAPHICS } from './data/portraits.mjs';
import { Names } from './data/names.mjs';

const PAGE = 24;

export class SR3EMeetContact {
  /** Merged portrait index, loaded once per session (`reload()` after a module update). */
  static _index = null;

  static async index() {
    if (SR3EMeetContact._index) return SR3EMeetContact._index;
    const loaded = [];
    for (const { moduleId, url } of Portraits.sources(game.modules)) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        const ix = Portraits.validate(res.ok ? await res.json() : null, moduleId);
        if (!ix.ok) console.warn(`SR3E | portraits from ${moduleId}: ${ix.error}`);
        loaded.push(ix);
      } catch (err) {
        console.warn(`SR3E | portraits from ${moduleId} could not be read:`, err);
      }
    }
    SR3EMeetContact._index = Portraits.merge(loaded);
    return SR3EMeetContact._index;
  }

  static reload() { SR3EMeetContact._index = null; }

  /**
   * @param {{archetypeUuid: string, contact?: Item}} opts
   */
  static async open({ archetypeUuid, contact = null } = {}) {
    if (!game.user.isGM) {
      ui.notifications.warn('SR3E: only the GM can meet a contact.');
      return null;
    }
    const archetype = archetypeUuid ? await fromUuid(archetypeUuid) : null;
    if (!archetype?.pack) {
      ui.notifications.warn('SR3E: link the contact to a Little Black Book archetype first.');
      return null;
    }
    const index = await SR3EMeetContact.index();
    const metatypes = game.sr3e.SR3E.metatypes;
    const bookMeta = String(archetype.system?.metatype || 'human').toLowerCase();
    const mapping = Portraits.archetypeJob(index, archetype.name);
    const state = {
      metatype: metatypes.some(m => m.value === bookMeta) ? bookMeta : 'human',
      gender: Portraits.normaliseGender(archetype.system?.gender) ?? (Math.random() < 0.5 ? 'female' : 'male'),
      job: mapping?.job ?? null,
      group: mapping?.job ? index.jobs[mapping.job] ?? null : null,
      ages: mapping?.ages ?? null,
      chosen: null,            // the picked portrait entry
      shown: PAGE,
      nameEdited: false,
    };
    const hasPortraits = index.entries.length > 0;
    const showOnContact = !!contact;

    const content = `
      <div class="sr3e-meet" style="display:flex;flex-direction:column;gap:6px;min-width:560px">
        <div style="color:var(--sr-muted);font-size:12px">${archetype.name} · ${archetype.system?.bookPage ?? ''}
          · the book's ${bookMeta}${mapping && !mapping.exact ? ' · <em>stand-in portraits until this archetype has its own</em>' : ''}</div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <label>Metatype <select id="meet-meta">${metatypes.map(m =>
            `<option value="${m.value}" ${m.value === state.metatype ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
          <button type="button" id="meet-meta-roll" title="Roll by Seattle's population" style="flex:0 0 auto;width:auto">🎲 Seattle mix</button>
          <label><input type="radio" name="meet-gender" value="female" ${state.gender === 'female' ? 'checked' : ''}/> female</label>
          <label><input type="radio" name="meet-gender" value="male" ${state.gender === 'male' ? 'checked' : ''}/> male</label>
        </div>
        <div id="meet-warn" style="color:var(--sr-amber);font-size:12px" hidden></div>
        ${hasPortraits
          ? `<div id="meet-grid" style="display:grid;grid-template-columns:repeat(6,80px);gap:4px;max-height:340px;overflow-y:auto"></div>
             <button type="button" id="meet-more" style="width:auto">More faces</button>`
          : `<p style="color:var(--sr-muted);font-size:12px">No portrait module is active, so the NPC keeps the archetype's picture.</p>`}
        <div style="display:flex;gap:6px;align-items:center">
          <label style="flex:1">Name <input id="meet-name" type="text" style="width:75%"/></label>
          <button type="button" id="meet-name-roll" title="Another name" style="flex:0 0 auto;width:auto">🎲</button>
        </div>
        ${showOnContact ? `<label><input id="meet-on-contact" type="checkbox" checked/> Show this name and face on the contact
          <span style="color:var(--sr-muted)">(${contact.name})</span></label>` : ''}
      </div>`;

    let result = null;
    const wireMeet = (_app, el) => {
      const grid = el.querySelector('#meet-grid');
      const more = el.querySelector('#meet-more');
      const warn = el.querySelector('#meet-warn');
      const nameIn = el.querySelector('#meet-name');

      const rollName = () => {
        nameIn.value = Names.generate({ ethnicity: state.chosen?.ethnicity ?? null, gender: state.gender,
                                        metatype: state.metatype, group: state.group }).full;
        state.nameEdited = false;
      };
      const drawWarn = () => {
        warn.hidden = state.metatype === bookMeta;
        warn.textContent = `Stats stay the book's ${bookMeta}: adjust attributes by hand for a ${state.metatype}.`;
      };
      const drawGrid = () => {
        if (!grid) return;
        const list = Portraits.candidates(index, { metatype: state.metatype, gender: state.gender, job: state.job, ages: state.ages });
        if (state.chosen && !list.some(e => e.src === state.chosen.src)) state.chosen = null;
        grid.replaceChildren(...list.slice(0, state.shown).map(e => {
          const img = document.createElement('img');
          img.src = e.src;
          img.loading = 'lazy';
          img.width = 80;
          img.height = 80;
          img.title = `${e.metatype} · ${e.job.replace(/_/g, ' ')} · ${e.age} · ${e.lifestyle} (${e.match})`;
          img.style.cssText = `cursor:pointer;border:2px solid ${state.chosen?.src === e.src ? 'var(--sr-gold)' : 'transparent'};border-radius:4px`;
          img.addEventListener('click', () => {
            state.chosen = e;
            if (!state.nameEdited) rollName();
            drawGrid();
          });
          return img;
        }));
        if (!list.length) grid.textContent = 'No portraits for this combination.';
        if (more) more.hidden = list.length <= state.shown;
      };

      el.querySelector('#meet-meta')?.addEventListener('change', ev => {
        state.metatype = ev.target.value; state.shown = PAGE; drawWarn(); drawGrid(); if (!state.nameEdited) rollName();
      });
      el.querySelector('#meet-meta-roll')?.addEventListener('click', () => {
        const sel = el.querySelector('#meet-meta');
        sel.value = Portraits.rollMetatype(Math.random, DEMOGRAPHICS);
        sel.dispatchEvent(new Event('change'));
      });
      el.querySelectorAll('input[name="meet-gender"]').forEach(r => r.addEventListener('change', ev => {
        state.gender = ev.target.value; state.shown = PAGE; drawGrid(); if (!state.nameEdited) rollName();
      }));
      more?.addEventListener('click', () => { state.shown += PAGE; drawGrid(); });
      el.querySelector('#meet-name-roll')?.addEventListener('click', rollName);
      nameIn.addEventListener('input', () => { state.nameEdited = true; });
      nameIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') ev.preventDefault(); });
      drawWarn();
      drawGrid();
      rollName();
    };

    await foundry.applications.api.DialogV2.wait({
      window: { title: `Meet the contact — ${archetype.name}` },
      position: { width: 600 },
      content,
      buttons: [
        { label: 'Create NPC', action: 'create', default: true,
          callback: (_e, _b, dialog) => {
            const el = dialog.element;
            result = {
              name: el.querySelector('#meet-name')?.value.trim() || archetype.name,
              portrait: state.chosen,
              metatype: state.metatype,
              gender: state.gender,
              onContact: !!el.querySelector('#meet-on-contact')?.checked,
            };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
      render: (_event, dialog) => wireMeet(dialog, dialog.element),
    });
    if (!result) return null;
    return SR3EMeetContact._apply(archetype, contact, result);
  }

  /** The only writes: create the NPC through the GM verb, then (if ticked) point the contact at it. */
  static async _apply(archetype, contact, r) {
    const img = r.portrait?.src ?? null;
    let created;
    try {
      created = await game.sr3e.SR3EQuery.asGM('sr3e.actor.create', {
        source: `${archetype.pack}|${archetype.id}`,
        name: r.name,
        set: { img, tokenImg: img, metatype: r.metatype, gender: r.gender, ethnicity: r.portrait?.ethnicity ?? '' },
      });
    } catch (err) {
      console.error('SR3E | meet the contact failed:', err);
      ui.notifications.error('Could not create the NPC — is a GM connected?');
      return null;
    }
    if (contact && r.onContact) {
      const changes = { 'system.npcUuid': created.uuid, name: r.name };
      // A picture someone chose for the contact is never replaced; a stock icon is.
      if (img && Portraits.isStockImg(contact.img)) changes.img = img;
      await contact.update(changes);
    } else if (contact) {
      await contact.update({ 'system.npcUuid': created.uuid });
    }
    const npc = await fromUuid(created.uuid);
    npc?.sheet?.render(true);
    return npc;
  }
}
