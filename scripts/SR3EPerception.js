/**
 * 👁 Perception Test — TODO 304 · SR3 p.231-232.
 *
 * Opened from the character sheet (under 🩹 Healing). Intelligence dice against TN 4 plus the Perception Test
 * Modifiers Table and the Visibility Table — every number editable: the GM names the target number, the
 * player rolls, the table reads the Perception Success Table. Nothing is decided for anyone.
 * Rules: `scripts/data/perception.mjs`. Visibility and the character's eyes: `SR3ECombatModifiers.js`.
 */
import { Perception, SENSES, PERCEPTION_MODIFIERS } from './data/perception.mjs';
import { SR3E_VISIBILITY_TABLE, SR3E_VISION_TYPES, detectVision, visionOptions, bestVisionKey, visibilityModifier } from './SR3ECombatModifiers.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FIELD = 'display:flex;flex-direction:column;gap:3px;color:var(--sr-muted);font-size:12px;';

export class SR3EPerception {
  /** What the dialog starts from — pure enough to test: Intelligence, Enhanced Perception, the eyes. */
  static start(actor) {
    const intelligence = actor?.system?.attributes?.intelligence?.value ?? actor?.system?.attributes?.intelligence?.base ?? 0;
    const sits = actor?.system?.derived?.situationalBonuses ?? [];
    const perc = sits.filter(b => b?.situation === 'perception');
    const situational = perc.reduce((a, b) => a + (Math.trunc(Number(b.dice)) || 0), 0);
    const vision = detectVision(actor);
    return { intelligence, situational, labels: perc.map(b => b.label).filter(Boolean), vision, visions: visionOptions(vision) };
  }

  static async open(actor) {
    if (!actor) return;
    const st = SR3EPerception.start(actor);
    const visionLabel = k => SR3E_VISION_TYPES.find(t => t.key === k)?.label ?? k;
    const rows = PERCEPTION_MODIFIERS.map(m => `
      <label class="pc-row" data-sense="${m.sense}" style="display:flex;align-items:center;gap:6px;font-size:12px;margin:1px 0">
        <input type="checkbox" class="pc-pick" value="${m.key}"/> ${esc(m.label)}
        <span style="color:var(--sr-muted)">${m.mod == null ? '(− rating, or −2)' : `(${m.mod >= 0 ? '+' : ''}${m.mod})`}</span>
        ${m.mod == null ? '<input type="number" class="pc-sound-rating" min="0" max="10" value="0" style="width:40px" title="The enhancement\'s rating; 0 = −2"/>' : ''}
      </label>`).join('');

    const wireDialog = (_app, html) => {
      const el = html?.querySelector ? html : null;
      if (!el) return;
      const q = s => el.querySelector(s);
      const read = () => {
        const sense = q('#pc-sense').value;
        const cond = q('#pc-cond').value;
        const vis = sense === 'sight' ? visibilityModifier(cond, q('#pc-vision').value) : 0;
        const picks = [...el.querySelectorAll('.pc-pick:checked')]
          .filter(c => { const s = c.closest('.pc-row').dataset.sense; return s === 'any' || s === sense; }).map(c => c.value);
        return { sense, picks, vis };
      };
      const draw = () => {
        const { sense, picks, vis } = read();
        el.querySelectorAll('.pc-row').forEach(r => { r.style.display = r.dataset.sense === 'any' || r.dataset.sense === sense ? '' : 'none'; });
        q('#pc-sight').style.display = sense === 'sight' ? '' : 'none';
        const tn = Perception.targetNumber({ base: q('#pc-base').value, picks, visibility: vis,
          soundRating: q('.pc-sound-rating')?.value, extra: q('#pc-extra').value });
        q('#pc-tn').value = tn;
        const dice = Perception.dicePool({ intelligence: q('#pc-int').value, situational: q('#pc-sit').value, extra: q('#pc-dx').value });
        q('#pc-out').textContent = `${dice} dice against TN ${tn}${vis ? ` (visibility ${vis >= 0 ? '+' : ''}${vis})` : ''} — the wound modifier is added when rolled.`;
      };
      q('#pc-cond').addEventListener('change', () => { q('#pc-vision').value = bestVisionKey(st.vision, q('#pc-cond').value); draw(); });
      el.querySelectorAll('input:not(#pc-tn), select').forEach(n => { n.addEventListener('input', draw); n.addEventListener('change', draw); });
      draw();
    };

    let choice = null;
    await foundry.applications.api.DialogV2.wait({
      window:   { title: `👁 Perception Test — ${actor.name}` },
      position: { width: 480 },
      render: (_event, dialog) => wireDialog(dialog, dialog.element),
      content: `
        <div style="font-size:12px;margin-bottom:6px">Intelligence dice against a target number the GM names — 4 to start,
          or an item's own number such as its Concealability (SR3 p.231-232). Every number is yours to change.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 10px;align-items:end">
          <label style="${FIELD}">Sense <select id="pc-sense">${SENSES.map(s => `<option value="${s}">${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></label>
          <label style="${FIELD}">Intelligence <input id="pc-int" type="number" min="0" max="30" value="${st.intelligence}"/></label>
          <label style="${FIELD}" title="${esc(st.labels.join(', ') || 'Enhanced Perception (SR3 p.169)')}">Enhanced Perception
            <input id="pc-sit" type="number" min="0" max="30" value="${st.situational}"/></label>
          <label style="${FIELD}" title="Complementary skills (p.97) and anything else the GM allows">Other dice
            <input id="pc-dx" type="number" min="-30" max="30" value="0"/></label>
          <label style="${FIELD}" title="4 (p.231), or the thing's own number">Base TN <input id="pc-base" type="number" min="0" max="30" value="${Perception.BASE_TN}"/></label>
          <label style="${FIELD}" title="Anything else the GM rules">Other TN mods <input id="pc-extra" type="number" value="0"/></label>
        </div>
        <div id="pc-sight" style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;margin-top:6px">
          <label style="${FIELD}">Visibility (p.111) <select id="pc-cond"><option value="">Clear</option>${Object.keys(SR3E_VISIBILITY_TABLE).map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select></label>
          <label style="${FIELD}">Seeing with <select id="pc-vision">${st.visions.map(k => `<option value="${k}">${esc(visionLabel(k))}</option>`).join('')}</select></label>
        </div>
        <div style="margin:8px 0 2px;font-size:12px;color:var(--sr-muted)">Perception Test Modifiers (p.232):</div>
        <div style="max-height:200px;overflow:auto">${rows}</div>
        <label style="${FIELD};margin-top:6px">Target number (the GM's call — overrides the sum)
          <input id="pc-tn" type="number" min="2" max="40" value="${Perception.BASE_TN}"/></label>
        <div id="pc-out" style="font-size:12px;color:var(--sr-gold);margin-top:6px"></div>`,
      buttons: [
        { label: '🎲 Roll', action: 'roll', default: true, callback: (_e, _b, d) => {
          const q = s => d.element.querySelector(s);
          choice = {
            dice: Perception.dicePool({ intelligence: q('#pc-int').value, situational: q('#pc-sit').value, extra: q('#pc-dx').value }),
            tn: Math.max(Perception.MIN_TN, parseInt(q('#pc-tn').value) || Perception.BASE_TN),
            sense: q('#pc-sense').value,
          };
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!choice) return;
    await actor.rollPool(choice.dice, choice.tn, `👁 ${actor.name} — Perception (${choice.sense})`, {
      followUp: { kind: 'perception', ctx: { name: actor.name, tn: choice.tn, sense: choice.sense } },
    });
  }

  /** FOLLOW_UPS.perception — after the last 💥: the Perception Success Table, read, not ruled. */
  static async rolled(ctx, res) {
    const s = res?.successes ?? 0;
    await ChatMessage.create({
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header">👁 ${esc(ctx.name)} — Perception (${esc(ctx.sense)})</div>
        <div class="sr-staging-result">${s} success${s === 1 ? '' : 'es'} against TN ${ctx.tn} — <strong>${esc(Perception.successLine(s))}</strong>
          <span style="color:var(--sr-muted);font-size:11px">(Perception Success Table, SR3 p.232 — the GM says what is there)</span></div>
      </div>`,
    });
  }
}
