/**
 * Drugs in play — taking a dose, the tests it owes, wearing off, crashing, withdrawal · TODO 124.
 *
 * The rules are `scripts/data/drug-rules.mjs` (pure, tested); this is the half that posts cards and
 * writes `system.substances`. Same shape as the healing helper (TODO 115):
 *   · 💊 on a drug row → `take()` → a dose card: what it does, how long, and a roll card per test;
 *   · a roll card's 🎲 → `rollPool` with a `drugContext` → `onRolled()` on the final wave (after any
 *     💥) → a result card that OFFERS the consequence as a button (`.sr-drug-act-btn`);
 *   · the Substances block on the Gear tab: wears off, crash over, a day passes, kick the habit …
 * ⚠ Nothing is applied until someone clicks — the ethos: the system announces, people decide.
 * ⚠ Writes go through `sr3e.actor.set` when the clicker does not own the character (every value
 *   here is absolute, so the plain set verb is the right one).
 */
import { DrugRules, ADDICTION_LABEL } from './data/drug-rules.mjs';

const FLAG = 'The2ndChumming3e';
const esc  = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pay  = o => esc(JSON.stringify(o));
const ATTR_NAME = { willpower: 'Willpower', body: 'Body' };

export class SR3EDrugs {
  static rules = DrugRules;

  /* ── State ──────────────────────────────────────────────────────────────────────────────── */

  static record(actor, key) { return actor?.system?.substances?.[key] ?? null; }

  /** Write one record (or delete it with `null`). The owner writes; anyone else asks the GM. */
  static async write(actor, key, state) {
    return SR3EDrugs._set(actor, state === null ? { [`system.substances.-=${key}`]: null } : { [`system.substances.${key}`]: state });
  }

  static async _set(actor, changes) {
    if (actor.isOwner) return actor.update(changes);
    return game.sr3e.SR3EQuery.asGM('sr3e.actor.set', { uuid: actor.uuid, changes });
  }

  /* ── Taking a dose · M&M pp.105-109 ─────────────────────────────────────────────────────── */

  /** 💊 on a drug row. */
  static async take(actor, item) {
    if (!actor || item?.type !== 'drug') return;
    const key  = DrugRules.drugKey(item.name);
    const prev = SR3EDrugs.record(actor, key);
    const { state, tests, raised, readdicted } = DrugRules.takeDose(prev, item.system, item.name);
    const fx   = DrugRules.effectsFor(item.name);
    const attr = actor.system.attributes ?? {};
    const dur  = DrugRules.rollDuration(fx?.duration, { body: attr.body?.value ?? 0, essence: attr.essence?.value ?? 0 });
    if (fx?.effect) { state.active = { duration: dur?.text ?? '' }; state.crash = null; }
    await SR3EDrugs.write(actor, key, state);

    const lines = [];
    lines.push(`Dose ${state.doses}${state.edge ? ` · Edge ${state.edge.pre}/${state.edge.post ?? '—'}` : ''} · ${esc(item.system.vector || 'vector —')} · onset ${esc(item.system.speed || '—')}`);
    if (readdicted) lines.push(`<strong style="color:var(--sr-red)">Relapse</strong> — addicted again, Addiction +1 (M&M p.110).`);
    if (raised) lines.push(`Edge reached — Addiction and Tolerance each +1 (now ${SR3EDrugs.ratingText(state)}, Tolerance ${state.tolerance ?? '—'}).`);
    if (fx?.effect) lines.push(`<strong>${SR3EDrugs.effectText(fx.effect)}</strong>${dur ? ` for <strong>${esc(dur.text)}</strong> <span class="sr-roll-meta">(${esc(dur.how)})</span>` : ''} — ${esc(fx.page)}.`);
    if (fx?.note) lines.push(`<span class="sr-roll-meta">${esc(fx.note)}</span>`);
    if (!fx) lines.push('<span class="sr-roll-meta">No game effects are recorded for this drug — the GM applies its text.</span>');
    const actions = [];
    if (item.system.damage && /^\d+\s*[LMSD]/i.test(item.system.damage)) {
      actions.push({ act: 'resist', ownerId: actor.id, damage: item.system.damage, what: item.name,
        label: `🩸 Resist ${item.system.damage} with Body — once the onset (${item.system.speed || 'Speed'}) has passed` });
    }
    await SR3EDrugs._postAction(actor, `💊 ${actor.name} takes ${item.name}`, lines, actions);
    for (const t of tests) await SR3EDrugs.postTest(actor, key, t);
    // No running effect to wait for: the tolerance test is due now (p.109).
    if (!state.active && state.toleranceDue) await SR3EDrugs.postTest(actor, key, { kind: 'tolerance', tn: state.toleranceDue });
  }

  /* ── Tests ─────────────────────────────────────────────────────────────────────────────── */

  /**
   * A roll card for one test. Dice: the UNAUGMENTED attribute for addiction (p.108 says so outright);
   * the tolerance test is "a Body (Tolerance) Test". A dwarf rolls +2 Body dice against PHYSICAL
   * addiction, not mental (p.108).
   * ⚠ No wound or sustaining modifier: the TN is the rating the book names, like the healing tables.
   */
  static async postTest(actor, key, t) {
    const s = SR3EDrugs.record(actor, key) ?? {};
    const drug = s.name ?? key;
    const attr = t.kind === 'tolerance' ? 'body' : (t.attr ?? 'willpower');
    const a    = actor.system.attributes?.[attr] ?? {};
    // Only the addiction test says "unaugmented" (p.108); the fix, monthly and kicking tests name
    // the attribute plainly.
    const unaugmented = t.kind === 'addiction';
    let pool = unaugmented ? (a.base ?? 0) : (a.value ?? a.base ?? 0);
    const dwarf = attr === 'body' && t.type === 'P' && /dwarf/i.test(actor.system.metatype ?? '');
    if (dwarf) pool += 2;
    const what = {
      addiction: `resist ${ADDICTION_LABEL[t.type]} addiction — one success stays clean (M&M p.108)`,
      tolerance: 'tolerance — no successes and the drug no longer satisfies (M&M p.109)',
      fix:       `stretch the fix — success skips one Fix Factor period (M&M p.109)`,
      monthly:   `the month's Addiction Effects test — failure costs a point of Body (M&M p.109)`,
      kick:      'kick the habit (M&M pp.109-110)',
    }[t.kind];
    const ctx = { kind: t.kind, key, type: t.type ?? null, attr, pool, tn: t.tn, rollerId: actor.id, drug,
                  title: `${actor.name} — ${drug}: ${ATTR_NAME[attr]} (${t.tn})` };
    const content = `<div class="sr-roll-card sr-drug-card">
      <div class="sr-roll-header">💊 ${esc(ctx.title)}</div>
      <div class="sr-heal-line">${esc(what)}</div>
      ${unaugmented ? `<div class="sr-roll-meta">Unaugmented ${ATTR_NAME[attr]} (${a.base ?? 0})${dwarf ? ' + 2 dice, a dwarf against physical addiction' : ''}.</div>` : ''}
      <div class="sr-soak-pool-row">
        <span>Dice</span><input type="number" class="sr-drug-pool" value="${pool}" min="0"/>
        <span>TN</span><input type="number" class="sr-drug-tn" value="${t.tn}" min="2"/>
      </div>
      <button type="button" class="sr-drug-roll-btn" data-payload='${pay(ctx)}'>🎲 Roll (${esc(actor.name)})</button>
    </div>`;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, style: CONST.CHAT_MESSAGE_STYLES.OTHER });
  }

  /** Dice and TN are the GM's to change (saved on the message, like the healing cards). */
  static wireCard(message, html) {
    const saved = message?.getFlag?.(FLAG, 'drugRoll') ?? {};
    for (const [cls, key] of [['.sr-drug-pool', 'pool'], ['.sr-drug-tn', 'tn']]) {
      const input = html.querySelector(cls);
      if (!input) continue;
      if (Number.isFinite(saved[key])) input.value = saved[key];
      if (!game.user.isGM) { input.readOnly = true; input.title = 'Set by the GM'; continue; }
      input.addEventListener('change', () => {
        const v = parseInt(input.value);
        if (Number.isFinite(v)) message.setFlag(FLAG, 'drugRoll', { ...(message.getFlag(FLAG, 'drugRoll') ?? {}), [key]: v });
      });
    }
  }

  static async rollFromCard(btn, p) {
    const card  = btn.closest('.sr-drug-card');
    const saved = game.messages?.get(btn.closest('[data-message-id]')?.dataset.messageId)?.getFlag(FLAG, 'drugRoll') ?? {};
    let pool = game.user.isGM ? parseInt(card?.querySelector('.sr-drug-pool')?.value) : NaN;
    let tn   = game.user.isGM ? parseInt(card?.querySelector('.sr-drug-tn')?.value) : NaN;
    if (!Number.isFinite(pool)) pool = saved.pool ?? p.pool;
    if (!Number.isFinite(tn))   tn   = saved.tn ?? p.tn;
    const roller = game.actors.get(p.rollerId);
    if (!roller) { ui.notifications.warn('That character no longer exists.'); return; }
    if (pool <= 0) { ui.notifications.warn(`${roller.name} has no dice for this.`); return; }
    await roller.rollPool(pool, tn, p.title, { drugContext: { ...p, pool, tn }, skipWoundMod: true, skipSustainMod: true });
  }

  /** The final wave of a drug test — what it means, and the button that applies it. */
  static async onRolled(ctx, successes) {
    const actor = game.actors.get(ctx.rollerId);
    if (!actor) return;
    const n = Number(successes) || 0;
    const s = SR3EDrugs.record(actor, ctx.key);
    const by = { ownerId: actor.id, key: ctx.key };
    const good = 'var(--sr-green)', bad = 'var(--sr-red)';
    const drug = ctx.drug;
    switch (ctx.kind) {
      case 'addiction': {
        if (n >= 1) return SR3EDrugs._postAction(actor, `✔ ${actor.name} stays clean of ${drug}`, [`${n} success${n === 1 ? '' : 'es'} — not ${ADDICTION_LABEL[ctx.type]}ly addicted.`], [], { color: good });
        const to = (s?.base?.[ctx.type] ?? 0) + 1;
        return SR3EDrugs._postAction(actor, `✖ ${actor.name} is hooked on ${drug}`, [`No successes — ${ADDICTION_LABEL[ctx.type]} addiction. Once addicted the rating reverts to the base +1 (${to}), M&M p.108.${s?.fixFactor ? ` A fix is needed every ${esc(s.fixFactor)} (the Fix Factor).` : ''}`],
          [{ act: 'addicted', ...by, type: ctx.type, label: `✔ Mark addicted (${ADDICTION_LABEL[ctx.type]}, Addiction ${to})` }], { color: bad });
      }
      case 'tolerance':
        if (n > 0) return SR3EDrugs._postAction(actor, `✔ No tolerance to ${drug}`, [`${n} success${n === 1 ? '' : 'es'} — it still satisfies.`], [{ act: 'toleranceDone', ...by, label: '✔ Noted' }], { color: good });
        return SR3EDrugs._postAction(actor, `✖ ${actor.name} is tolerant of ${drug}`,
          ['No successes — it no longer appeases the craving. A stronger drug, or a double dose (overdose risk, p.107), is needed; at the GM\'s discretion it has half its effect (M&M p.109).'],
          [{ act: 'tolerant', ...by, label: '✔ Mark tolerant' }], { color: bad });
      case 'fix':
        if (n > 0) return SR3EDrugs._postAction(actor, `✔ ${actor.name} holds off`, ['One Fix Factor period can be skipped before the next craving (M&M p.109) — once.'], [], { color: good });
        return SR3EDrugs._postAction(actor, `✖ ${actor.name} needs a fix`, ['No dose in time means forced withdrawal (M&M p.110).'],
          [{ act: 'withdrawal', ...by, forced: true, label: '⛓ Begin forced withdrawal' }], { color: bad });
      case 'monthly': {
        if (n > 0) return SR3EDrugs._postAction(actor, `✔ ${actor.name} weathers the month`, [], [], { color: good });
        const body = actor.system.attributes?.body?.base ?? 0;
        if (body <= 1) {
          return SR3EDrugs._postAction(actor, `✖ ${actor.name}: Body is already 1`,
            ['No further Body is lost, but the Racial Modified Limit and Attribute Maximum for Body drop by 1, and each week after: one box from the Physical or Stun Condition Monitor, or 0.25 Essence — the player\'s choice (M&M p.109). Awakened: check for Magic Loss.'], [], { color: bad });
        }
        return SR3EDrugs._postAction(actor, `✖ ${actor.name} loses Body to ${drug}`, ['A permanent loss (M&M p.109).'],
          [{ act: 'loseBody', ownerId: actor.id, label: `✔ Lose 1 Body (${body} → ${body - 1}, permanent)` }], { color: bad });
      }
      case 'kick':
        if (n > 0) return SR3EDrugs._postAction(actor, `✔ ${actor.name} kicks ${drug}`, ['Immediate withdrawal: the rating drops 1 every two days to its base; +2 to all TNs meanwhile (+4 concentrating) — M&M p.110.'],
          [{ act: 'withdrawal', ...by, forced: false, label: '✔ Begin withdrawal' }], { color: good });
        return SR3EDrugs._postAction(actor, `✖ ${actor.name} caves in`, ['They do whatever they can to get the next fix. Kept from it by others, it is forced withdrawal (M&M p.110).'],
          [{ act: 'withdrawal', ...by, forced: true, label: '⛓ Kept from it — forced withdrawal' }], { color: bad });
      default: return null;
    }
  }

  /* ── Record actions (chat buttons and the sheet) ────────────────────────────────────────── */

  static async act(btn, p) {
    const actor = game.actors.get(p.ownerId);
    if (!actor) { ui.notifications.warn('That character no longer exists.'); return false; }
    const s = SR3EDrugs.record(actor, p.key);
    const say = (text, color = '') => ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card"><div class="sr-roll-result"${color ? ` style="color:${color}"` : ''}>${text}</div></div>` });
    switch (p.act) {
      case 'addicted':
        if (!s) return false;
        await SR3EDrugs.write(actor, p.key, DrugRules.addictionResult(s, p.type, 0).state);
        return say(`✔ ${esc(actor.name)} is addicted to ${esc(s.name)} — ${SR3EDrugs.ratingText(SR3EDrugs.record(actor, p.key))}.`, 'var(--sr-red)');
      case 'tolerant':
      case 'toleranceDone':
        if (!s) return false;
        await SR3EDrugs.write(actor, p.key, DrugRules.toleranceResult(s, p.act === 'tolerant' ? 0 : 1).state);
        return p.act === 'tolerant' ? say(`✔ ${esc(actor.name)} is tolerant of ${esc(s.name)}.`) : true;
      case 'withdrawal':
        if (!s) return false;
        await SR3EDrugs.write(actor, p.key, DrugRules.startWithdrawal(s, !!p.forced));
        return say(`${p.forced ? '⛓ Forced withdrawal' : '✔ Withdrawal'} from ${esc(s.name)} begins — +${p.forced ? 3 : 2} to every TN${p.forced ? ', and a persistent Moderate Stun wound' : ''} (M&M p.110).`);
      case 'loseBody': {
        const body = actor.system.attributes?.body?.base ?? 0;
        if (body <= 1) return false;
        await SR3EDrugs._set(actor, { 'system.attributes.body.base': body - 1 });
        return say(`✔ ${esc(actor.name)}: Body ${body} → <strong>${body - 1}</strong> (permanent).`, 'var(--sr-red)');
      }
      case 'resist': {
        const d = game.sr3e.SR3EItem.parseDamageCode(p.damage);
        if (!d?.power) return false;
        await actor._postSoakCard({ stagedPower: d.power, stagedLevel: d.level, isStun: d.isStun, rawDamage: p.damage,
          targetActorId: actor.id, noArmor: true, noArmorNote: `${p.what} — resisted with Body; armour does not apply (M&M p.106)` });
        return true;
      }
      default: return false;
    }
  }

  /** The drug wears off · its crash, if the book gives one, and the tolerance test it owes (p.109). */
  static async wearOff(actor, key) {
    const s = SR3EDrugs.record(actor, key);
    if (!s?.active) return;
    const fx = DrugRules.effectsFor(s.name);
    const next = { ...s, active: null, crash: fx?.crash ? { duration: s.active?.duration ?? '' } : null };
    if (fx?.crash?.duration && !fx.crash.duration.same) {
      const attr = actor.system.attributes ?? {};
      next.crash.duration = DrugRules.rollDuration(fx.crash.duration, { body: attr.body?.value, essence: attr.essence?.value })?.text ?? '';
    }
    await SR3EDrugs.write(actor, key, next);
    const lines = [];
    if (fx?.crash) {
      if (fx.crash.effect) lines.push(`Crash: <strong>${SR3EDrugs.effectText(fx.crash.effect)}</strong>${next.crash.duration ? ` for ${esc(next.crash.duration)}` : ''}.`);
      if (fx.crash.stunBoxes) lines.push(`Crash: a Moderate Stun wound's modifiers${next.crash.duration ? ` for ${esc(next.crash.duration)}` : ''} — it ends with the crash.`);
      if (fx.crash.chaTo !== undefined) lines.push(`Crash: Charisma 1 and Willpower halved${next.crash.duration ? ` for ${esc(next.crash.duration)}` : ''}.`);
      if (fx.crash.note) lines.push(`<span class="sr-roll-meta">${esc(fx.crash.note)}</span>`);
    } else lines.push('No crash is given for it.');
    const actions = fx?.crash?.resist ? [{ act: 'resist', ownerId: actor.id, damage: `${fx.crash.resist}${fx.crash.stun ? ' Stun' : ''}`, what: `${s.name} crash`,
      label: `🩸 Resist ${fx.crash.resist}${fx.crash.stun ? ' Stun' : ''} with Body` }] : [];
    await SR3EDrugs._postAction(actor, `⏳ ${actor.name} — ${s.name} wears off`, lines, actions);
    if (next.toleranceDue) await SR3EDrugs.postTest(actor, key, { kind: 'tolerance', tn: next.toleranceDue });
  }

  static async crashOver(actor, key) {
    const s = SR3EDrugs.record(actor, key);
    if (s?.crash) await SR3EDrugs.write(actor, key, { ...s, crash: null });
  }

  /** ⏭ A day passes in withdrawal or recovery (p.110). */
  static async passDay(actor, key) {
    const s = SR3EDrugs.record(actor, key);
    if (!s?.withdrawal) return;
    const next = DrugRules.passDay(s);
    await SR3EDrugs.write(actor, key, next);
    if (DrugRules.isAddicted(s) && !DrugRules.isAddicted(next)) {
      await SR3EDrugs._postAction(actor, `✔ ${actor.name} is free of ${s.name}`,
        [next.withdrawal === 'recovery' ? `Now ${next.recoveryDays} days of rest at +1 (+2 concentrating); Condition Monitor boxes lost to it return one Physical and one Stun every three days (M&M p.110).` : 'Recovery is over.'], [], { color: 'var(--sr-green)' });
    }
  }

  /* ── Text ─────────────────────────────────────────────────────────────────────────────────── */

  static ratingText(s) {
    const part = t => (s?.base?.[t] !== null && s?.base?.[t] !== undefined) ? `${s.current?.[t] ?? s.base[t]}${t}${s.addicted?.[t] ? '•' : ''}` : '';
    return ['M', 'P'].map(part).filter(Boolean).join('/') || '—';
  }

  static effectText(fx) {
    const names = { bod: 'Body', qui: 'Quickness', str: 'Strength', cha: 'Charisma', int: 'Intelligence', wil: 'Willpower',
                    rea: 'Reaction', initDice: 'Initiative D6', painResistance: 'pain resistance', tn: 'to all TNs' };
    return Object.entries(fx ?? {}).map(([k, v]) => k === 'painResistance' ? `pain resistance ${v}`
      : k === 'tn' ? `${v > 0 ? '+' : ''}${v} to all target numbers` : `${v > 0 ? '+' : '−'}${Math.abs(v)} ${names[k] ?? k}`).join(', ');
  }

  static async _postAction(actor, title, lines, actions, { color = '' } = {}) {
    const content = `<div class="sr-roll-card sr-drug-card">
      <div class="sr-roll-header"${color ? ` style="color:${color}"` : ''}>${esc(title)}</div>
      ${lines.filter(Boolean).map(l => `<div class="sr-heal-line">${l}</div>`).join('')}
      ${actions.filter(Boolean).map(a => `<button type="button" class="sr-drug-act-btn" data-payload='${pay(a)}'>${esc(a.label)}</button>`).join('')}
    </div>`;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, style: CONST.CHAT_MESSAGE_STYLES.OTHER });
  }
}
