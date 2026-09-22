import { Stress } from './data/stress.mjs';
import { MoveByWire } from './data/move-by-wire.mjs';
import { CyberSlots } from './data/cyber-slots.mjs';

/**
 * Stress on implants and Attributes — the GM's flow · *M&M pp.124-131* (TODO 109).
 *
 * Rules: `scripts/data/stress.mjs`. This file is the dialog, the writes and the card.
 *
 * ⚠ **GM-invoked, never automatic.** M&M hangs Stress off wound effects, which are a judgement about
 * what a particular wound did — exactly the kind of call this system leaves to the GM (see the design
 * ethos). ⚙ **Apply Stress** on the Cyber tab asks what took it and how much; the soak card does not
 * reach in and decide. `Stress.woundEffects` is there for when a GM wants the book's own answer.
 * ⚠ **The 1D6 ÷ 2 does NOT explode.** *"the Rule of Six does not apply to this roll"* (p.124), and this
 * system explodes 6s in every `rollPool` path — so it is rolled here, plainly.
 * ⚠ **The Stress Test itself is an ordinary Success Test** and goes through `rollPool`, so its 6s do
 * explode and its card behaves like every other roll. One success avoids failure.
 * ⚠ **Nothing is applied for you.** The card says whether the part failed; what a failed implant or
 * Attribute then does is the GM's, as damage always is here.
 */
export const SR3EStress = {
  /**
   * The character's move-by-wire system, if any · M&M p.60 (TODO 110) — `{ item, rating, willpower }`,
   * with the UNAUGMENTED Willpower the test rolls. Null when there is none.
   */
  moveByWire(actor) {
    const item = (actor?.items ?? []).find(i => MoveByWire.isSystem(i));
    if (!item) return null;
    return {
      item,
      rating:    game.sr3e.ItemRating.itemRating(item) || 1,
      willpower: Math.max(0, Number(actor?.system?.attributes?.willpower?.base) || 0),
    };
  },

  /** Implants that can take Stress: cyberware and bioware the character is actually carrying. */
  implants(actor) {
    return (actor?.items ?? []).filter(i => (i.type === 'cyberware' || i.type === 'bioware')
      && !i.getFlag?.('The2ndChumming3e', 'stored'));
  },

  /** The attributes M&M's Stress rules touch — the physical and mental eight, not the derived ones. */
  ATTRIBUTES: ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower', 'reaction'],

  /** What an attribute currently carries. */
  attributeStress(actor, key) {
    return Math.max(0, Number(actor?.system?.attributeStress?.[key]) || 0);
  },

  /** The unaugmented rating a Stress Test rolls half of · p.126. */
  unaugmented(actor, key) {
    const a = actor?.system?.attributes?.[key];
    return Math.max(0, Number(a?.base ?? a?.value) || 0);
  },

  /**
   * ⚙ Apply Stress — the GM picks what took it, and how much.
   * @param {Actor} actor
   */
  async open(actor, { target: preselect = '' } = {}) {
    if (!actor) return;
    if (!game.user.isGM) { ui.notifications.warn('Only the GM applies Stress.'); return; }

    const implants = SR3EStress.implants(actor);
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const opts = [
      ...implants.map(i => {
        const now = Math.max(0, Number(i.system?.stress) || 0);
        return `<option value="item:${i.id}">${esc(i.name)} — ${esc(i.type)} ${esc(i.system?.grade ?? '')} · Stress ${Stress.describe(now)}</option>`;
      }),
      ...SR3EStress.ATTRIBUTES.map(k => {
        const now = SR3EStress.attributeStress(actor, k);
        return `<option value="attr:${k}">${k[0].toUpperCase()}${k.slice(1)} (unaugmented ${SR3EStress.unaugmented(actor, k)}) · Stress ${Stress.describe(now)}</option>`;
      }),
    ].join('');

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${actor.name}: Apply Stress (${Stress.PAGE})` },
      content: `
        <p style="font-size:11px;color:var(--sr-muted);margin:0 0 6px">
          A wound effect inflicts <strong>1D6 ÷ 2</strong> Stress Points and then a Stress Test
          (M&amp;M p.124). The Rule of Six does not apply to that roll. Nothing is applied automatically —
          this is the GM saying what the wound did.
        </p>
        <label style="display:block;margin-bottom:6px">What took it
          <select id="sr-stress-target" style="width:100%">${opts}</select>
        </label>
        <label style="display:block;margin-bottom:6px">Stress Points
          <select id="sr-stress-source">
            <option value="roll">Roll 1D6 ÷ 2 (a wound effect)</option>
            <option value="fixed">Type a number</option>
          </select>
          <input type="number" id="sr-stress-points" value="1" min="0" max="20" style="width:60px;margin-left:6px"/>
        </label>
        <label style="display:block;font-size:12px">Cyberlimb Integrity Rating (lowers the TN)
          <input type="number" id="sr-stress-integrity" value="0" min="0" max="10" style="width:56px"/>
        </label>
        <label style="display:block;font-size:12px">Attribute boosted by bioware (raises the TN)
          <input type="number" id="sr-stress-boost" value="0" min="0" max="10" style="width:56px"/>
        </label>`,
      buttons: [
        { label: 'Apply', action: 'ok', default: true,
          callback: (_e, _b, dlg) => {
            const el = dlg.element;
            result = {
              target:    el.querySelector('#sr-stress-target')?.value ?? '',
              source:    el.querySelector('#sr-stress-source')?.value ?? 'roll',
              points:    parseInt(el.querySelector('#sr-stress-points')?.value) || 0,
              integrity: parseInt(el.querySelector('#sr-stress-integrity')?.value) || 0,
              boost:     parseInt(el.querySelector('#sr-stress-boost')?.value) || 0,
            };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
      render: (_event, dialog) => {
        const el  = dialog.element;
        // A wound effect (TODO 129) names the implant it hit, so the GM does not hunt for it in a
        // list of thirty. ⚠ Preselected, not forced — the dropdown stays open, because the book
        // gives the GM the pick within a slot and may have offered several candidates.
        if (preselect) {
          const sel = el.querySelector('#sr-stress-target');
          if (sel && [...sel.options].some(o => o.value === preselect)) sel.value = preselect;
        }
        const src = el.querySelector('#sr-stress-source');
        const pts = el.querySelector('#sr-stress-points');
        const sync = () => { if (pts) pts.style.display = src?.value === 'fixed' ? '' : 'none'; };
        src?.addEventListener('change', sync);
        sync();
      },
    });
    if (!result?.target) return;

    // ⚠ Plain 1D6, no explosions — "the Rule of Six does not apply to this roll" (p.124).
    let added = result.points, dieNote = '';
    if (result.source === 'roll') {
      const die = (await new Roll('1d6').evaluate()).total;
      added   = Stress.pointsFromDie(die);
      dieNote = `1D6 ÷ 2 → rolled ${die} = <strong>${added}</strong> Stress`;
    }

    await SR3EStress.apply(actor, result.target, added, { integrity: result.integrity, boost: result.boost, dieNote });
  },

  /** Add `added` Stress to an implant or attribute, write it, and post the card. */
  async apply(actor, target, added, { integrity = 0, boost = 0, dieNote = '' } = {}) {
    const [kind, id] = String(target).split(':');
    const item   = kind === 'item' ? actor.items.get(id) : null;
    const isItem = !!item;
    if (kind === 'item' && !item) return;

    const before = isItem ? (Math.max(0, Number(item.system?.stress) || 0)) : SR3EStress.attributeStress(actor, id);
    const after  = Math.max(0, before + Math.max(0, Math.trunc(Number(added) || 0)));
    const label  = isItem ? item.name : `${id[0].toUpperCase()}${id.slice(1)}`;

    if (isItem) await item.update({ 'system.stress': after });
    else        await actor.update({ [`system.attributeStress.${id}`]: after });

    // ⚠ The TN is the NEW total (p.126's worked example: 3 existing + 1 → TN 4), never what was added.
    const plan = Stress.plan({
      kind:      isItem ? item.type : 'attribute',
      grade:     isItem ? (item.system?.grade ?? '') : '',
      attribute: isItem ? 0 : SR3EStress.unaugmented(actor, id),
      points:    after,
      integrity: isItem ? (integrity || Number(item.system?.integrity) || 0) : 0,
      boost,
    });

    const payload = JSON.stringify({
      actorId: actor.id, targetLabel: label, dice: plan.dice, tn: plan.tn,
    }).replace(/'/g, '&#39;');

    // Move-by-wire · M&M p.60 (TODO 110): "Each time the character takes Stress, he must make an
    // unaugmented Willpower (move-by-wire rating x 2) Test. If he fails … he develops TLE-x."
    // ⚠ Offered, never rolled for them, and never applied — TLE-x is a state the GM sets.
    const mbw = SR3EStress.moveByWire(actor);
    const tlexBtn = (isItem && MoveByWire.isSystem(item)) || (!isItem && mbw && MoveByWire.STRESSED_ATTRIBUTES.includes(id))
      ? `<div class="sr-roll-meta" style="color:var(--sr-amber)">Move-by-wire ${mbw.rating}: an unaugmented
           Willpower (${MoveByWire.tlexTN(mbw.rating)}) Test, or TLE-x (${MoveByWire.PAGE}).</div>
         <div class="sr-soak-action">
           <button class="sr-stress-roll-btn" data-payload='${JSON.stringify({
             actorId: actor.id, targetLabel: `TLE-x — ${actor.name}`, dice: mbw.willpower,
             tn: MoveByWire.tlexTN(mbw.rating), tlex: true,
           }).replace(/'/g, '&#39;')}'>🎲 Willpower vs TLE-x</button>
         </div>`
      : '';

    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header">⚙ Stress — ${esc(label)}</div>
          ${dieNote ? `<div class="sr-roll-meta">${dieNote}</div>` : ''}
          <div class="sr-roll-meta">${before} → <strong>${Stress.describe(after)}</strong> (${Stress.PAGE})</div>
          ${tlexBtn}
          ${plan.autoFails
            ? `<div class="sr-roll-meta" style="color:var(--sr-red)">
                 Deadly Stress — <strong>it fails automatically</strong>; no test is rolled (M&amp;M p.126).
                 What a failed ${isItem ? 'implant' : 'Attribute'} does is the GM's call.</div>`
            : `<div class="sr-roll-meta">Stress Test: <strong>${plan.dice}</strong> dice vs TN <strong>${plan.tn}</strong>
                 — one success avoids failure.</div>
               <div class="sr-soak-action">
                 <button class="sr-stress-roll-btn" data-payload='${payload}'>🎲 Roll the Stress Test</button>
               </div>`}
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  },

  /**
   * The implants a character carries, as Essence-slot entries · M&M p.127.
   *
   * ⚠ **Graded Essence is what a slot holds.** An alphaware VCR occupies its GRADED 2.4, not the
   * base 3.0 — the slots are a picture of the Essence the character actually spent, and Leggy's
   * printed layout is built from graded figures.
   * ⚠ **Stored items are not installed** and take no slot.
   */
  slotEntries(actor, kind = 'cyberware') {
    return (actor?.items ?? [])
      .filter(i => i.type === kind && !i.getFlag?.('The2ndChumming3e', 'stored'))
      .map(i => ({
        id:      i.id,
        name:    i.name,
        essence: kind === 'bioware'
          ? Math.max(0, Number(i.system?.bioIndex) || 0)
          : game.sr3e.SR3EActor.gradedEssenceCost(
              game.sr3e.SR3EActor.baseEssenceCost(i), i.system?.grade),
      }))
      .filter(e => e.essence > 0);
  },

  /** Both assignments, with the cyberzombie's doubling applied when the flag is set · p.127. */
  assignments(actor) {
    const doubleUp = !!actor?.system?.cybermancy?.is;
    return {
      cyberware: CyberSlots.assignSlots(SR3EStress.slotEntries(actor, 'cyberware'), { doubleUp }),
      bioware:   CyberSlots.assignSlots(SR3EStress.slotEntries(actor, 'bioware'),   { doubleUp }),
    };
  },

  /**
   * 🎲 **Roll for wound effects** · M&M pp.126-129 — the GM's answer to "what took it".
   *
   * ⚠ **Offered, never automatic.** The soak card does not reach in: whether a wound did anything
   * to a cybersystem is a judgement about that wound, which is the design ethos here, and the book
   * hands the pick within a slot to the GM anyway.
   * ⚠ **Nothing is applied.** The card names what was hit and offers ⚙ Apply Stress pre-filled.
   */
  async openWoundEffects(actor) {
    if (!actor) return;
    if (!game.user.isGM) { ui.notifications.warn('Only the GM rolls wound effects.'); return; }

    const cyber = SR3EStress.slotEntries(actor, 'cyberware');
    const bio   = SR3EStress.slotEntries(actor, 'bioware');

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${actor.name}: Wound effects (${CyberSlots.PAGE})` },
      content: `
        <p style="font-size:11px;color:var(--sr-muted);margin:0 0 6px">
          Read the Damage Resistance Test as a Success Test against the boxes inflicted (M&amp;M p.127):
          the wound effects are the <strong>margin of failure</strong> — the boxes minus the highest
          die rolled. Type what was rolled, or the count directly.
        </p>
        <label style="display:block;margin-bottom:6px">Damage boxes inflicted
          <input type="number" id="sr-we-boxes" value="6" min="0" max="20" style="width:56px"/>
        </label>
        <label style="display:block;margin-bottom:6px">Highest die on the resistance roll
          <input type="number" id="sr-we-high" value="3" min="0" max="30" style="width:56px"/>
        </label>
        <label style="display:block;margin-bottom:6px">… or set the number of wound effects
          <input type="number" id="sr-we-count" value="" min="0" max="20" placeholder="auto" style="width:56px"/>
        </label>
        <label style="display:block;font-size:12px">
          <input type="checkbox" id="sr-we-electrical"/> Electrical attack (M&amp;M p.129)
        </label>
        <p style="font-size:11px;color:var(--sr-muted);margin:6px 0 0">
          Electrical damage skips the Wound Effect Table — every effect goes straight to the
          cybersystem, plus an extra 1D6 each where 1-2 damages another implant.
          ${cyber.length ? '' : '<br/><strong>This character has no cyberware</strong>, so cybersystem results are ignored.'}
          ${bio.length ? '' : '<br/><strong>No bioware</strong>, so bioware results are ignored.'}
        </p>`,
      buttons: [
        { label: 'Roll', action: 'ok', default: true,
          callback: (_e, _b, dlg) => {
            const el = dlg.element;
            const n = el.querySelector('#sr-we-count')?.value;
            result = {
              boxes:      parseInt(el.querySelector('#sr-we-boxes')?.value) || 0,
              highest:    parseInt(el.querySelector('#sr-we-high')?.value) || 0,
              count:      n === '' || n === null || n === undefined ? null : (parseInt(n) || 0),
              electrical: !!el.querySelector('#sr-we-electrical')?.checked,
            };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!result) return;

    const effects = result.count ?? CyberSlots.woundEffects([result.highest], result.boxes);
    if (effects <= 0) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="sr-roll-card"><div class="sr-roll-header">⚙ Wound effects — ${actor.name}</div>
          <div class="sr-roll-meta">A die reached the damage — <strong>no wound effects</strong> (M&amp;M p.127).</div></div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      });
      return;
    }

    const maps = SR3EStress.assignments(actor);
    const has  = { hasCyberware: cyber.length > 0, hasBioware: bio.length > 0 };
    const rows = [];

    for (let i = 0; i < effects; i++) {
      // ⚠ Electrical damage does NOT roll the Wound Effect Table — "apply the wound effect as
      //    described in Determine System Affected" (p.129). Only the extra spread die is rolled.
      const type = result.electrical
        ? { type: 'cyberware', label: 'Cybersystem damage (electrical)', page: 'M&M p.129' }
        : CyberSlots.woundEffectType((await new Roll('1d6').evaluate()).total);

      if (!CyberSlots.applies(type.type, has)) {
        rows.push({ type, ignored: true }); continue;
      }
      if (type.type === 'organic') { rows.push({ type }); continue; }

      const d = (await new Roll('1d6').evaluate()).total;
      const hit = CyberSlots.systemHit(maps[type.type], d);
      const extra = result.electrical
        ? CyberSlots.electricalSpreads((await new Roll('1d6').evaluate()).total)
        : false;
      rows.push({ type, d, hit, extra });
    }

    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const byName = new Map([...cyber, ...bio].map(e => [e.name, e.id]));

    const html = rows.map((r, i) => {
      if (r.ignored) {
        return `<div class="sr-roll-meta" style="color:var(--sr-dim)">${i + 1}. ${esc(r.type.label)} —
          the character has none, so this effect is <strong>ignored</strong> (${r.type.page}).</div>`;
      }
      if (r.type.type === 'organic') {
        return `<div class="sr-roll-meta">${i + 1}. <strong>Organic physical injury</strong> — the GM's
          call (${r.type.page}).</div>`;
      }
      const buttons = r.hit.empty ? '' : r.hit.candidates.map(c => {
        const id = byName.get(c.name);
        return id
          ? `<button class="sr-stress-apply-btn" data-payload='${JSON.stringify({
               actorId: actor.id, target: `item:${id}`,
             }).replace(/'/g, '&#39;')}'>⚙ Apply Stress — ${esc(c.name)}</button>`
          : '';
      }).join(' ');
      return `<div class="sr-roll-meta">${i + 1}. <strong>${esc(r.type.label)}</strong> — slot ${r.d}:
          ${r.hit.empty ? 'empty' : esc(r.hit.candidates.map(c => c.name).join(' / '))}
          ${r.hit.partial ? ` — <span style="color:var(--sr-amber)">${Math.round(r.hit.hitChance * 100)}% chance of a hit</span>` : ''}
        </div>
        <div class="sr-roll-meta" style="color:var(--sr-muted);font-size:11px">${esc(r.hit.note)}${
          r.extra ? ' ⚡ The extra die damages <strong>another</strong> implant too (M&amp;M p.129).' : ''}</div>
        ${buttons ? `<div class="sr-soak-action">${buttons}</div>` : ''}`;
    }).join('');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header">⚙ Wound effects — ${esc(actor.name)}</div>
          <div class="sr-roll-meta"><strong>${effects}</strong> wound effect${effects === 1 ? '' : 's'}
            ${result.count === null ? `(${result.boxes} boxes − highest die ${result.highest})` : '(set by the GM)'}
            · ${CyberSlots.PAGE}</div>
          ${html}
          <div class="sr-roll-meta" style="color:var(--sr-muted);font-size:11px">
            Nothing is applied. ⚙ Apply Stress rolls the 1D6 ÷ 2 and the Stress Test for the implant named.
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  },

  /** 🎲 on the card — an ordinary Success Test, so its 6s explode like everything else. */
  async roll(payload) {
    const actor = game.actors.get(payload?.actorId);
    if (!actor) return;
    const dice = Math.max(0, Number(payload.dice) || 0);
    const tn   = Math.max(2, Number(payload.tn) || 2);
    if (dice <= 0) {
      ui.notifications.warn(`${payload.targetLabel}: no dice to roll — it fails (M&M p.126).`);
      return;
    }
    await actor.rollPool(dice, tn, `${payload.tlex ? '🧠' : '⚙'} ${payload.tlex ? '' : 'Stress Test — '}${payload.targetLabel}`, {
      skipWoundMod: true, skipSustainMod: true,
      footerNote: payload.tlex
        ? `No successes and the character develops TLE-x (${MoveByWire.PAGE}): ${MoveByWire.tlexNote()}. Set it on the Cyber tab.`
        : 'One success avoids failure (M&M p.126). What a failure does is the GM\'s call.',
    });
  },
};
