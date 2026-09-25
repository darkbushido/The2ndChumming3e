/**
 * Open combat steps on the table — TODO 147. The rules are scripts/data/open-steps.mjs; this is the
 * Foundry side: reading steps off chat messages, recording them as done, and showing what is open.
 *
 *  1. **"Waiting on…" panel**, docked to the combat tracker: every open step in the current fight,
 *     who owes it, and a click that brings its card into view. A GM can ✕ a step nobody will take
 *     (an Assign-the-wound button when the GM ticked the boxes by hand).
 *  2. **Per-player highlight**: a card waiting on YOU gets a coloured edge and a line saying so, and
 *     the chat tab shows how many are waiting on you.
 *  3. **Collapsing finished cards**: a card whose steps are all done folds to its header (a client
 *     setting, on by default); clicking the header opens it again.
 *
 * ⚠ **A step is done when its button is clicked**, recorded on the message through `sr3e.card.mark`
 * (GM-serialised, first claim stands) under `OpenSteps.key(cls, i)`. The flow a click starts may post
 * a new card with its own step (Resist damage → Roll the Damage Resistance Test → Assign the wound),
 * and that is the next row — the panel follows the chain rather than modelling it.
 * ⚠ **Bookkeeping never blocks the action.** No active GM, or a failed write, logs and moves on.
 * ⚠ **Owed by** = `SR3EQuery.deciderFor(actor)` — the same user the flows already ask, so the panel
 * and the prompts agree. No actor → the GM.
 */
import { OpenSteps, STEP_BUTTONS } from './data/open-steps.mjs';

const MODULE = 'The2ndChumming3e';
/** Messages scanned when no combat is running. */
const RECENT = 50;
/** Hard cap on messages scanned, whatever the combat's age. */
const MAX_SCAN = 300;

/** Parsed steps per message, keyed by id and invalidated when the content changes. */
const _cache = new Map();
/** Finished cards the user has opened again this session — survives re-renders. */
const _expanded = new Set();

const _selector = Object.keys(STEP_BUTTONS).map(c => `button.${c}`).join(',');

export class SR3EOpenSteps {
  static registerSettings() {
    game.settings.register(MODULE, 'collapseFinishedCards', {
      name: 'Collapse finished combat cards',
      hint: 'A chat card whose steps (soak, dodge, Drain, Knockdown…) have all been taken folds to its header. Click the header to open it again.',
      scope: 'client', config: true, type: Boolean, default: true,
      onChange: () => ui.chat?.render?.(),
    });
  }

  /** The step buttons in a message's content, with their payloads, in content order. */
  static _buttonsOf(message) {
    const content = message?.content ?? '';
    const hit = _cache.get(message.id);
    if (hit && hit.content === content) return hit.buttons;
    let buttons = [];
    if (content.includes('-btn')) {
      const doc = new DOMParser().parseFromString(content, 'text/html');
      buttons = [...doc.querySelectorAll(_selector)].map(b => {
        const cls = [...b.classList].find(c => OpenSteps.isStep(c));
        let payload = null;
        try { payload = JSON.parse(b.dataset.payload ?? 'null'); } catch { payload = null; }
        return { cls, payload };
      });
    }
    _cache.set(message.id, { content, buttons });
    return buttons;
  }

  /** The steps on one message, done or not. */
  static stepsOf(message) {
    return OpenSteps.stepsOf(SR3EOpenSteps._buttonsOf(message), message?.getFlag?.(MODULE, 'acted') ?? {});
  }

  /** The user who owes a step for `actorId` — the flows' own decider; the GM when there is no actor. */
  static deciderOf(actorId) {
    const actor = actorId ? game.actors.get(actorId) : null;
    if (!actor) return game.users.activeGM?.id ?? null;
    return game.sr3e.SR3EQuery.deciderFor(actor) ?? game.users.activeGM?.id ?? null;
  }

  /** The messages worth scanning: since the current combat began, else the last few. */
  static _window() {
    const all = game.messages.contents;
    const since = game.combat?._stats?.createdTime ?? null;
    const recent = since
      ? all.filter(m => (m.timestamp ?? m._stats?.createdTime ?? 0) >= since)
      : all.slice(-RECENT);
    return recent.slice(-MAX_SCAN);
  }

  /** Every open step in the window: `[{ message, step, actor, userId }]`, oldest first. */
  static openSteps() {
    const out = [];
    for (const message of SR3EOpenSteps._window()) {
      for (const step of OpenSteps.open(SR3EOpenSteps.stepsOf(message))) {
        out.push({ message, step, actor: step.ownerId ? game.actors.get(step.ownerId) : null,
          userId: SR3EOpenSteps.deciderOf(step.ownerId) });
      }
    }
    return out;
  }

  /** Record a step as done. Never throws — bookkeeping must not block the action. */
  static async mark(messageId, key, label) {
    try {
      return await game.sr3e.SR3EQuery.asGM('sr3e.card.mark', { messageId, role: key, label });
    } catch (err) {
      console.warn('SR3E | could not record an open step:', err);
      return null;
    }
  }

  /* ── The card ──────────────────────────────────────────────────────────────── */

  /**
   * Decorate one rendered card: record clicks, grey steps already done, highlight a card waiting on
   * this user, and fold a finished one. Called from `renderChatMessageHTML`, AFTER the card's own
   * handlers are attached, so this click listener runs after theirs.
   */
  static decorate(message, html) {
    const el = html instanceof HTMLElement ? html : html?.[0];
    if (!el) return;
    const steps = SR3EOpenSteps.stepsOf(message);
    if (!steps.length) return;

    // Buttons in the DOM, indexed the same way as the content (see open-steps.mjs).
    const seen = {};
    el.querySelectorAll(_selector).forEach(btn => {
      const cls   = [...btn.classList].find(c => OpenSteps.isStep(c));
      const index = seen[cls] = (seen[cls] ?? -1) + 1;
      const step  = steps.find(s => s.cls === cls && s.index === index);
      if (!step) return;
      if (step.done) {
        // Done — on every client, and after a reload, when the in-memory guard has forgotten.
        btn.disabled = true;
        btn.title    = 'Already done.';
        return;
      }
      btn.addEventListener('click', () => {
        if (btn.dataset.sr3eStepMarked) return;
        btn.dataset.sr3eStepMarked = '1';
        const who = step.ownerId ? game.actors.get(step.ownerId)?.name : null;
        SR3EOpenSteps.mark(message.id, step.key, who ? `${step.label} — ${who}` : step.label);
      });
    });

    const mine = OpenSteps.open(steps).filter(s => SR3EOpenSteps.deciderOf(s.ownerId) === game.user.id);
    el.classList.toggle('sr3e-waiting-on-me', mine.length > 0);
    el.querySelector('.sr3e-waiting-line')?.remove();
    if (mine.length) {
      const line = document.createElement('div');
      line.className = 'sr3e-waiting-line';
      line.textContent = `⏳ Waiting on you: ${[...new Set(mine.map(s => s.label))].join(', ')}`;
      (el.querySelector('.sr-roll-card') ?? el.querySelector('.message-content') ?? el).prepend(line);
    }

    SR3EOpenSteps._applyFold(message, el, steps);
  }

  /** How many messages were posted after this one. */
  static _newerThan(message) {
    const all = game.messages.contents;
    const i = all.findIndex(m => m.id === message.id);
    return i < 0 ? 0 : all.length - 1 - i;
  }

  /**
   * Fold or unfold one rendered card (`OpenSteps.shouldFold`: finished, and play has moved past it).
   * Re-run on every new message by `refresh`, because a card's own render does not fire again when
   * newer cards arrive below it.
   */
  static _applyFold(message, el, steps = SR3EOpenSteps.stepsOf(message)) {
    const fold = game.settings.get(MODULE, 'collapseFinishedCards')
      && OpenSteps.shouldFold(steps, SR3EOpenSteps._newerThan(message));
    el.classList.toggle('sr3e-card-done', fold && !_expanded.has(message.id));
    if (!fold) return;
    const header = el.querySelector('.sr-roll-header');
    if (header && !header.dataset.sr3eFold) {
      header.dataset.sr3eFold = '1';
      header.title = 'Finished — click to show or hide the card';
      header.addEventListener('click', ev => {
        ev.preventDefault();
        if (_expanded.has(message.id)) _expanded.delete(message.id); else _expanded.add(message.id);
        el.classList.toggle('sr3e-card-done', !_expanded.has(message.id));
      });
    }
  }

  /** Re-check the folds of the recent cards in the chat log (and the pop-out notifications). */
  static _refreshFolds() {
    for (const message of game.messages.contents.slice(-(OpenSteps.FOLD_AFTER + 20))) {
      const steps = SR3EOpenSteps.stepsOf(message);
      if (!steps.length) continue;
      document.querySelectorAll(`[data-message-id="${message.id}"]`).forEach(el => {
        if (el.classList.contains('chat-message') || el.classList.contains('message')) SR3EOpenSteps._applyFold(message, el, steps);
      });
    }
  }

  /* ── The panel and the badge ───────────────────────────────────────────────── */

  static _panelHtml(rows) {
    if (!rows.length) return '';
    const gm = game.user.isGM;
    const items = rows.map(r => {
      const who   = r.actor?.name ?? '—';
      const user  = r.userId ? game.users.get(r.userId)?.name ?? '?' : 'GM';
      const me    = r.userId === game.user.id;
      return `<li class="sr3e-step${me ? ' sr3e-step-mine' : ''}" data-message-id="${r.message.id}" data-step-key="${r.step.key}"
                  title="Show the card">
        <span class="sr3e-step-what">${r.step.icon} ${r.step.label}</span>
        <span class="sr3e-step-who">${who} · <em>${me ? 'you' : user}</em></span>
        ${gm ? `<button type="button" class="sr3e-step-dismiss" title="Nobody will take this step — mark it done">✕</button>` : ''}
      </li>`;
    }).join('');
    return `<div class="sr3e-open-steps-head">⏳ Waiting on… <span class="sr3e-open-steps-count">${rows.length}</span></div>
      <ol class="sr3e-open-steps-list">${items}</ol>`;
  }

  /** Draw the panel into a combat tracker element (the tracker's render hook, or a refresh). */
  static renderPanel(el) {
    if (!el) return;
    let panel = el.querySelector('.sr3e-open-steps');
    const rows = SR3EOpenSteps.openSteps();
    if (!rows.length) { panel?.remove(); return; }
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'sr3e-open-steps';
      const anchor = el.querySelector('.combat-tracker, ol, .directory-list');
      if (anchor?.parentElement) anchor.parentElement.insertBefore(panel, anchor); else el.prepend(panel);
    }
    panel.innerHTML = SR3EOpenSteps._panelHtml(rows);
    panel.querySelectorAll('.sr3e-step').forEach(li => {
      li.addEventListener('click', ev => {
        if (ev.target.closest('.sr3e-step-dismiss')) return;
        SR3EOpenSteps.show(li.dataset.messageId);
      });
      li.querySelector('.sr3e-step-dismiss')?.addEventListener('click', async ev => {
        ev.stopPropagation();
        await SR3EOpenSteps.mark(li.dataset.messageId, li.dataset.stepKey, 'dismissed by the GM');
      });
    });
  }

  /** Bring a card into view: the chat log if it is rendered there, else a pop-out of the message. */
  static show(messageId) {
    const message = game.messages.get(messageId);
    if (!message) return;
    try { ui.sidebar?.changeTab?.('chat', 'primary'); } catch { /* older sidebar API */ }
    const li = document.querySelector(`#chat [data-message-id="${messageId}"], #chat-log [data-message-id="${messageId}"]`);
    if (li) {
      li.scrollIntoView({ block: 'center', behavior: 'smooth' });
      li.classList.add('sr3e-step-flash');
      setTimeout(() => li.classList.remove('sr3e-step-flash'), 1600);
      return;
    }
    const Popout = foundry.applications?.sidebar?.apps?.ChatPopout;
    if (Popout) new Popout({ message }).render({ force: true });
  }

  /** The chat tab's count of steps waiting on this user. */
  static renderBadge() {
    const n = OpenSteps.countFor(game.user.id, SR3EOpenSteps.openSteps().map(r => r.step), SR3EOpenSteps.deciderOf);
    // The tab BUTTON only — the chat section itself also carries data-tab="chat".
    document.querySelectorAll('#sidebar-tabs [data-tab="chat"], #sidebar nav [data-tab="chat"]').forEach(tab => {
      let badge = tab.querySelector('.sr3e-waiting-badge');
      if (!n) { badge?.remove(); return; }
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'sr3e-waiting-badge';
        tab.appendChild(badge);
      }
      badge.textContent = String(n);
      badge.title = `${n} step${n === 1 ? '' : 's'} waiting on you`;
    });
  }

  static _timer = null;
  /** Redraw the panel and the badge — debounced, since one exchange fires several message hooks. */
  static refresh() {
    clearTimeout(SR3EOpenSteps._timer);
    SR3EOpenSteps._timer = setTimeout(() => {
      const el = ui.combat?.element;
      SR3EOpenSteps.renderPanel(el instanceof HTMLElement ? el : el?.[0]);
      SR3EOpenSteps.renderBadge();
      SR3EOpenSteps._refreshFolds();
    }, 150);
  }

  static registerHooks() {
    for (const hook of ['createChatMessage', 'updateChatMessage', 'deleteChatMessage',
      'createCombat', 'updateCombat', 'deleteCombat']) {
      Hooks.on(hook, () => SR3EOpenSteps.refresh());
    }
    Hooks.on('deleteChatMessage', message => _cache.delete(message.id));
    Hooks.once('ready', () => SR3EOpenSteps.refresh());
  }
}
