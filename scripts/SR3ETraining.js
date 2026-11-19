import { Training, RULES } from './data/training.mjs';
import { actorFrom, actorRef } from './data/actor-ref.mjs';
import { Funds } from './data/funds.mjs';

/**
 * Train first — the optional training roll offered by Spend Karma (TODO 309). Rules in
 * `data/training.mjs`: core SR3 p.245/p.95, or the Shadowrun Companion p.48-50 (world setting
 * `trainingRule`). Rolls and reports; Karma is bought separately, and an instructor's fee is
 * OFFERED as a 💴 button on the card — never charged on its own.
 */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const die = () => Math.ceil(CONFIG.Dice.randomUniform() * 6);
const FIELD = 'display:flex;flex-direction:column;gap:3px;color:var(--sr-muted);font-size:12px;';

export class SR3ETraining {
  static rule() {
    try { return game.settings.get('The2ndChumming3e', 'trainingRule') === RULES.companion ? RULES.companion : RULES.core; }
    catch { return RULES.core; }
  }

  /**
   * @param {Actor} actor
   * @param {string} choice   the Spend Karma radio value
   * @param {object} o        { karmaCost, isActive }
   */
  static async open(actor, choice, { karmaCost = 0, isActive = true } = {}) {
    const skill  = actor.items.get(String(choice).split(':')[1]);
    const target = Training.targetFor(choice, skill?.system);
    if (!skill || target === null) {
      ui.notifications.warn('Train first: pick one of the character\'s own skill rows (a skill not yet on the sheet can be added at rating 0 first).');
      return;
    }
    const rule    = SR3ETraining.rule();
    const comp    = rule === RULES.companion;
    const rating  = skill.system.rating ?? 0;
    const newSkill = rating === 0;
    const isSpec  = Training.isSpecialization(choice);
    const teachers = game.sr3e.sceneFirst(game.actors.filter(a => a.id !== actor.id
        && (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a)))
      .map(a => ({ a, skill: a.items.find(i => i.type === 'skill' && i.name === skill.name),
                   instr: a.items.find(i => i.type === 'skill' && /^instruction$/i.test(i.name)) }))
      .filter(t => t.skill);
    const opts = teachers.map(t => `<option value="${t.a.id}">${esc(t.a.name)} (${esc(skill.name)} ${t.skill.system.rating ?? 0}, Instruction ${t.instr?.system.rating ?? '—'})</option>`).join('');
    const base = Training.baseDays(karmaCost, isActive);

    const wireDialog = (_app, html) => {
      const q = s => html.querySelector(s);
      const draw = () => {
        const who = q('#tr-teacher').value;
        const live = teachers.find(t => t.a.id === who);
        q('#tr-virtual').style.display = who === 'virtual' ? 'grid' : 'none';
        q('#tr-fees').style.display = comp && live ? 'flex' : 'none';
        const tn = Training.tnFor(rule, target, { newSkill, instructor: !!who });
        q('#tr-tn').textContent = tn;
        if (comp && live) {
          const daily = Training.dailyFee(live.instr?.system.rating ?? 0, target, { overFourHours: q('#tr-long').checked });
          q('#tr-daily').value = daily;
        }
      };
      html.querySelectorAll('select, input[type=checkbox]').forEach(n => n.addEventListener('change', draw));
      html.querySelectorAll('input[type=number]').forEach(n => n.addEventListener('keydown', ev => { if (ev.key === 'Enter') ev.preventDefault(); }));
      draw();
    };

    let picked = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Train first — ${skill.name} → ${target}` },
      position: { width: 460 },
      render: (_event, dialog) => wireDialog(dialog, dialog.element),
      content: `<div style="padding:6px;display:flex;flex-direction:column;gap:6px;font-size:12px">
        <div>${comp
          ? `<b>Shadowrun Companion</b> (p.49): base time ${karmaCost} Karma × ${isActive ? 7 : 15} = <b>${base} days</b>; the test against TN <b id="tr-tn"></b> (new rating + 2) divides it by its successes.`
          : `<b>SR3 p.245</b>: ${esc(skill.name)} against TN <b id="tr-tn"></b> (twice the rating sought). A success means the GM may let the Karma buy go ahead.`}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px">
          <label style="${FIELD}">Dice <input type="number" id="tr-pool" value="${rating}" min="0"/></label>
          <label style="${FIELD}">Instructor <select id="tr-teacher"><option value="">None</option>${opts}<option value="virtual">Virtual instructor (chip)</option></select></label>
        </div>
        ${newSkill ? '<div style="color:var(--sr-amber)">Unskilled — default per the Default Table; set the dice (and the GM may raise the TN).</div>' : ''}
        <div id="tr-virtual" style="display:none;grid-template-columns:1fr 1fr;gap:6px 10px">
          <label style="${FIELD}">Chip's ${esc(skill.name)} rating <input type="number" id="tr-vskill" value="${target}" min="0"/></label>
          <label style="${FIELD}">Chip's Instruction rating <input type="number" id="tr-vinstr" value="4" min="0"/></label>
          <div style="grid-column:1/-1;color:var(--sr-muted)">${comp ? 'A virtual instructor makes no Instruction Test (Shadowrun Companion p.50).' : 'The chip rolls its Instruction rating against 4 (SR3 p.95).'}</div>
        </div>
        <div id="tr-fees" style="display:none;flex-direction:column;gap:4px">
          <label style="${FIELD}">Daily fee (¥, Suggested Instructor Fees Table, SC p.50 — the GM's to change) <input type="number" id="tr-daily" min="0" value="0"/></label>
          <label><input type="checkbox" id="tr-long"/> More than 4 hours of instruction a day (+50% daily fee)</label>
          <label><input type="checkbox" id="tr-class"/> Classroom setting (−50% total)</label>
          ${isSpec ? '<div style="color:var(--sr-muted)">A specialization: +50% of the total fee.</div>' : ''}
        </div>
        <div style="color:var(--sr-muted)">${comp ? 'An instructor rolls Instruction (4), or Charisma (8) without it; every 2 successes add 1 to your successes.' : 'An instructor rolls Instruction (4); every 2 successes add a die.'} Nothing is charged here — any fee is offered on the result card, and the Karma is bought afterwards.</div>
      </div>`,
      buttons: [
        { label: '🎲 Roll', action: 'roll', default: true, callback: (_e, _b, d) => {
          const q = s => d.element.querySelector(s);
          picked = {
            pool: Math.max(0, parseInt(q('#tr-pool')?.value) || 0),
            teacher: q('#tr-teacher')?.value ?? '',
            vskill: parseInt(q('#tr-vskill')?.value) || 0,
            vinstr: parseInt(q('#tr-vinstr')?.value) || 0,
            daily: Math.max(0, parseInt(q('#tr-daily')?.value) || 0),
            classroom: !!q('#tr-class')?.checked,
          };
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!picked) return;

    const live = teachers.find(t => t.a.id === picked.teacher);
    const virtual = picked.teacher === 'virtual';
    let instructionHits = null, teachNote = '';
    if (live) {
      for (const w of Training.instructorWarnings(live.skill.system.rating ?? 0, target)) ui.notifications.warn(`${live.a.name}: ${w}`);
      const n = live.instr?.system.rating ?? 0;
      const useCha = n <= 0;
      const dice = useCha ? (live.a.system.attributes?.charisma?.value ?? 0) : n;
      const tn = useCha ? Training.CHARISMA_DEFAULT_TN : Training.INSTRUCTION_TN;
      instructionHits = Training.rollSuccesses(dice, tn, die);
      teachNote = `${live.a.name}: ${useCha ? `Charisma ${dice} (8), no Instruction` : `Instruction ${n} (4)`} → ${instructionHits} success${instructionHits === 1 ? '' : 'es'}`;
    } else if (virtual) {
      for (const w of Training.instructorWarnings(picked.vskill, target)) ui.notifications.warn(`Virtual instructor: ${w}`);
      if (!comp) {
        instructionHits = Training.rollSuccesses(picked.vinstr, Training.INSTRUCTION_TN, die);
        teachNote = `Virtual instructor: Instruction ${picked.vinstr} (4) → ${instructionHits} success${instructionHits === 1 ? '' : 'es'}`;
      } else teachNote = 'Virtual instructor — no Instruction Test (SC p.50)';
    }

    const tn = Training.tnFor(rule, target, { newSkill, instructor: !!(live || virtual) });
    const coreBonus = comp ? 0 : Training.instructorBonus(instructionHits ?? 0);
    const ctx = {
      actorId: actorRef(actor), rule, skillName: skill.name, target, tn, base, teachNote,
      coreBonus, instructionHits: comp && live ? instructionHits : null,
      instructorName: live?.a.name ?? (virtual ? 'Virtual instructor' : ''),
      daily: comp && live ? picked.daily : 0, classroom: picked.classroom, isSpec,
    };
    const label = `Training: ${skill.name} → ${target} (TN ${tn})`;
    return game.sr3e.SR3EActor.rollThen(actor, picked.pool + coreBonus, tn, { label, followUp: { kind: 'training', ctx } });
  }

  /** The follow-up once the student's roll is final. Posts the result card. */
  static async rolled(ctx, res) {
    const actor = actorFrom(ctx.actorId);
    const hits  = res?.successes ?? 0;
    const lines = [];
    if (ctx.teachNote) lines.push(esc(ctx.teachNote) + (ctx.coreBonus ? ` → +${ctx.coreBonus} dice` : ''));
    let fee = 0, feeWhy = '';
    if (ctx.rule === RULES.companion) {
      const o = Training.companionOutcome({ base: ctx.base, studentHits: hits, instructionHits: ctx.instructionHits });
      lines.push(`${hits} success${hits === 1 ? '' : 'es'}${o.bonus ? ` + ${o.bonus} from the instructor` : ''} → <b>${o.days} days</b> of training (base ${ctx.base}, Shadowrun Companion p.49).`);
      if (o.failed) lines.push(`<span style="color:var(--sr-amber)">The instructor cannot teach this student (a test got no successes): one day's pay is forfeit and 1.5 days are added (SC p.49-50).</span>`);
      if (ctx.daily > 0) {
        fee = o.failed ? ctx.daily : Training.totalFee(ctx.daily, o.days, { specialization: ctx.isSpec, classroom: ctx.classroom });
        feeWhy = o.failed ? `${ctx.instructorName}: one day's fee (failed lesson)` : `${ctx.instructorName}: ${o.days} days × ¥${ctx.daily}${ctx.isSpec ? ', specialization +50%' : ''}${ctx.classroom ? ', classroom −50%' : ''}`;
        lines.push(`Instructor's fee: <b>¥${fee.toLocaleString('en-US')}</b> (${esc(feeWhy)}).`);
      }
      lines.push('After the training time, buy the rating with Spend Karma.');
    } else {
      lines.push(hits > 0
        ? `<span style="color:var(--sr-green)">${hits} success${hits === 1 ? '' : 'es'} — learned; buy it with Spend Karma (SR3 p.245).</span>`
        : `<span style="color:var(--sr-amber)">No successes — not learned yet. The GM decides how long until another try (SR3 p.245).</span>`);
    }
    const payload = esc(JSON.stringify({ actorId: ctx.actorId, amount: fee, reason: `Training ${ctx.skillName} → ${ctx.target}: ${feeWhy}` }));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header" style="background:var(--sr-accent);color:#fff">🎓 Training — ${esc(ctx.skillName)} → ${ctx.target}</div>
        <div class="sr-roll-body" style="padding:8px;font-size:12px;display:flex;flex-direction:column;gap:4px">
          ${lines.map(l => `<div>${l}</div>`).join('')}
          ${fee > 0 ? `<button type="button" class="sr-train-pay-btn" data-payload="${payload}">💴 Pay ¥${fee.toLocaleString('en-US')}</button>` : ''}
        </div></div>`,
    });
  }

  /** The 💴 button: confirm (editable) and debit the nuyen, with a 📒 Ledger reason. */
  static async pay(payload) {
    const actor = actorFrom(payload?.actorId);
    if (!actor) return false;
    const have = actor.system.nuyen ?? 0;
    let amount = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Pay the instructor — ${actor.name}` },
      content: `<div style="padding:6px;font-size:12px;display:flex;flex-direction:column;gap:6px">
        <label>Amount (¥) <input type="number" id="tp-amt" min="0" value="${payload.amount}"/></label>
        <div style="color:var(--sr-muted)">${esc(payload.reason)} — you have ¥${have.toLocaleString('en-US')}.</div></div>`,
      buttons: [
        { label: 'Pay', action: 'pay', default: true, callback: (_e, _b, d) => { amount = Math.max(0, parseInt(d.element.querySelector('#tp-amt')?.value) || 0); } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!amount) return false;
    const r = Funds.change(have, amount, 'subtract');
    if (r.short) ui.notifications.warn(`${actor.name} has only ¥${have.toLocaleString('en-US')} — it stops at ¥0.`);
    await actor.update({ 'system.nuyen': r.to }, { ledgerReason: payload.reason });
    ui.notifications.info(`${actor.name} paid ¥${(have - r.to).toLocaleString('en-US')} for training.`);
    return true;
  }
}
