import { Stress } from './data/stress.mjs';
import { MoveByWire } from './data/move-by-wire.mjs';

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
  async open(actor) {
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
