/**
 * Open combat steps — what a chat card is still waiting on, and from whom (TODO 147).
 *
 * Reported in the 2026-09-23 trial session: in a busy fight a card still owed an answer (a soak, a
 * dodge declaration, a Drain, a Knockdown) scrolls away under newer cards and the step is lost. The
 * maintainer chose all three remedies: a "Waiting on…" panel by the combat tracker, a highlight and a
 * chat-tab count for the player a card waits on, and collapsing cards whose steps are all done.
 *
 * ⚠ **A step is a BUTTON someone owes a click on.** The registry below names them by class. Optional
 * actions (Mark prone, Sustain, healing and drug consequences, buying) are not steps — nobody is
 * waiting on them — so they are left out on purpose, and a card holding only those never collapses.
 * ⚠ **The record is the message's `acted` flag** (`sr3e.card.mark`, GM-serialised, first claim
 * stands), keyed `step:<class>:<index>`. `_usedButtons` in sr3e.js is per client and lost on reload,
 * so it cannot say what the table is still waiting on. Some buttons already recorded themselves under
 * an older key (`defender`, `soaker`); `doneBy` honours those too.
 * ⚠ **The index is the button's position among buttons of its class IN THE MESSAGE CONTENT**, the same
 * index `renderChatMessageHTML` hands to `_claimBtn`, so the panel (which reads content) and the card
 * (which reads the DOM) name the same button the same way.
 *
 * Pure: no Foundry globals. The Foundry side is scripts/SR3EOpenSteps.js.
 */

/** Button class → what the step is. `doneBy`: older acted keys that also mean "done". */
export const STEP_BUTTONS = {
  'sr-dodge-declare-btn':           { icon: '🎯', label: 'Dodge or take it', doneBy: ['defender'] },
  'sr-fd-dodge-btn':                { icon: '🛡', label: 'Full Defense dodge' },
  'sr-soak-btn':                    { icon: '🛡', label: 'Resist damage' },
  'sr-soak-roll-btn':               { icon: '🛡', label: 'Roll the Damage Resistance Test', doneBy: ['soaker'] },
  'sr-spell-soak-btn':              { icon: '🔮', label: 'Resist the spell' },
  'sr-spell-resist-roll-btn':       { icon: '🔮', label: 'Roll the Spell Resistance Test' },
  'sr-astral-soak-btn':             { icon: '✨', label: 'Resist astral damage' },
  'sr-astral-soak-roll-btn':        { icon: '✨', label: 'Roll astral Damage Resistance' },
  'sr-drain-btn':                   { icon: '⚡', label: 'Resist Drain' },
  'sr-drain-roll-btn':              { icon: '⚡', label: 'Roll the Drain Resistance Test' },
  'sr-knockdown-btn':               { icon: '💥', label: 'Knockdown test' },
  'sr-assign-damage-btn':           { icon: '🩸', label: 'Assign the wound' },
  'sr-ram-vehicle-soak-btn':        { icon: '🚗', label: 'Vehicle resists the ram' },
  'sr-ram-passenger-resist-btn':    { icon: '🚗', label: 'Occupant resists the crash' },
  'sr-matrix-ic-resist-btn':        { icon: '💻', label: 'Resist Matrix damage' },
  'sr-matrix-ic-resist-roll-btn':   { icon: '💻', label: 'Roll Matrix damage resistance' },
  'sr-matrix-decker-resist-btn':    { icon: '💻', label: 'Resist Matrix damage' },
  'sr-matrix-decker-resist-roll-btn': { icon: '💻', label: 'Roll Matrix damage resistance' },
};

/** The payload keys that name the actor who owes the step, in order. Mirrors `_payloadActorId`
 *  in sr3e.js, plus the few cards that name their actor something else. Never `attackerActorId`:
 *  an attacker does not owe their target's defence. */
export const OWNER_KEYS = ['actorId', 'icActorId', 'vehicleActorId', 'wardActorId', 'targetActorId',
  'deckerActorId', 'passengerActorId'];

export const OpenSteps = {
  /** The acted-ledger key for the `index`-th button of `cls` on a card. */
  key(cls, index) {
    return `step:${cls}:${index}`;
  },

  /** Is this button class a step? */
  isStep(cls) {
    return Object.prototype.hasOwnProperty.call(STEP_BUTTONS, cls);
  },

  /** Which actor owes a step, from its button payload. Null when none can be named. */
  ownerId(payload) {
    if (!payload || typeof payload !== 'object') return null;
    for (const k of OWNER_KEYS) if (payload[k]) return String(payload[k]);
    return null;
  },

  /** Has this step been done, by its own key or an older one? */
  isDone(cls, index, acted = {}) {
    const a = acted ?? {};
    if (a[OpenSteps.key(cls, index)]) return true;
    return (STEP_BUTTONS[cls]?.doneBy ?? []).some(k => a[k]);
  },

  /**
   * The steps on one card.
   * @param {{cls:string, payload?:object}[]} buttons  every step button on the card, in content order
   * @param {object} acted  the message's acted-ledger
   * @returns {{cls, index, key, icon, label, ownerId, done}[]}
   */
  stepsOf(buttons = [], acted = {}) {
    const seen = {};
    const out  = [];
    for (const b of buttons) {
      if (!OpenSteps.isStep(b?.cls)) continue;
      const index = seen[b.cls] = (seen[b.cls] ?? -1) + 1;
      const def   = STEP_BUTTONS[b.cls];
      out.push({ cls: b.cls, index, key: OpenSteps.key(b.cls, index), icon: def.icon, label: def.label,
        ownerId: OpenSteps.ownerId(b.payload), done: OpenSteps.isDone(b.cls, index, acted) });
    }
    return out;
  },

  /** The steps still open. */
  open(steps = []) {
    return steps.filter(s => !s.done);
  },

  /**
   * Should the card collapse? Only when it HAD steps and every one is done. A card with no steps —
   * a roll result, a note — is never collapsed: it is something to read, not something finished.
   */
  finished(steps = []) {
    return steps.length > 0 && steps.every(s => s.done);
  },

  /** How many open steps are owed by `userId`, given each owner's deciding user. */
  countFor(userId, openSteps = [], deciderOf = () => null) {
    return openSteps.filter(s => deciderOf(s.ownerId) === userId).length;
  },
};
