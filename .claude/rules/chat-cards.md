---
paths:
  - "scripts/sr3e.js"
  - "scripts/SR3EOpenSteps.js"
  - "scripts/data/open-steps.mjs"
  - "scripts/data/npc-corner.mjs"
---

# Chat-card machinery — open steps and two-corner cards

Moved out of `CLAUDE.md` (TODO 291, approved by the maintainer 2026-11-07). `CLAUDE.md` keeps a short ⚠ summary.

## Open combat steps — the ⏳ Waiting-on panel · TODO 147

Reported in the trial session (2026-09-23): in a busy fight a card still owed an answer scrolls away.
Rules: `scripts/data/open-steps.mjs` (pure). Foundry side: `scripts/SR3EOpenSteps.js`.

- **A step is a button someone owes a click on** — `STEP_BUTTONS` names them (dodge declaration, soak and
  its roll, spell/astral/Matrix resistance, Drain and its roll, Knockdown, Assign the wound, ram and crash
  resistance). Optional actions (Mark prone, Sustain, healing, drugs, buying) are deliberately not steps.
  A new card that waits on someone must add its button class there, or the panel will not see it.
- **The record is the message's `acted` flag** under `step:<class>:<index>`, written through
  `sr3e.card.mark` by a click listener `decorate` adds — registered as the **last**
  `renderChatMessageHTML` hook, so it runs after the button's own handler. `doneBy` honours the older
  keys (`defender`, `soaker`). ⚠ `card.mark` is now **queued per message** (`SR3EQueue`), because it
  reads, clones and writes the whole ledger and two marks at once could drop one.
- **Owed by** = `SR3EQuery.deciderFor(actor)`; no actor → the GM.
- **Three views:** the ⏳ panel in the combat tracker (steps since the current combat was created, else the
  last 50 messages; a row click shows the card; the GM's ✕ marks a step nobody will take); a gold edge,
  a "Waiting on you" line and a chat-tab count for the user a card waits on; and a card whose steps are
  all done folds to its header (client setting `collapseFinishedCards`, on by default). ⚠ A card with
  **no** steps never folds — a roll result is something to read. ⚠ **It folds only once play has moved
  past it** (`OpenSteps.shouldFold`, `FOLD_AFTER` = 2 newer messages; `_refreshFolds` re-checks on every
  new message). A dodge declaration clicks itself, so folding on finish hid a ranged attack card before
  anyone read "6 hits incoming" — the e2e ranged spec caught it.
- A step already done is greyed on every client and after a reload, which the in-memory `_usedButtons`
  could not do.

## Two-corner cards — each side edits only its own half

Eight opposed cards (melee · astral · contested · cybercombat · MIJI · three Orthodox Matrix) share **one**
handler in `sr3e.js`, found by `[data-twocorner="<kind>"]` and dispatched via the `_RESOLVERS` table. Each
corner declares `data-corner-role` / `-owner` / `-label`; `SR3EActor.cornerActions()` renders the per-corner
`.sr-corner-submit-btn` and one `.sr-corner-resolve-btn`.

- **Both corners visible everywhere; only your own editable.** The lock sets `readOnly` on inputs **and**
  `disabled` on `<select>`s — keep both branches (`readOnly` does nothing to a dropdown).
- **The submission that completes the set resolves.** `sr3e.card.mark` is append-only and GM-serialised, so
  exactly one client sees the ledger fill.
- **`.sr-corner-resolve-btn` (GM-only) is the AFK escape**: unanswered corners fall to the card's defaults.
- **The NPC's Submit button is violet** (`sr-corner-npc`, `--sr-npc`, tooltip "NPC — name") · TODO 246: the GM
  owns every actor, so both buttons are live for them. `cornerActions` asks `NpcCorner.decorate`
  (`scripts/data/npc-corner.mjs`): not `SR3EQuery.isPlayerCharacter` (never `hasPlayerOwner`), or no actor → NPC.
  Applied by actor, not viewer — players see the NPC corner violet too. Baked in when the card is posted.
- ⚠ **`_cornerDrafts` keeps unsubmitted edits** (keyed `messageId|role`, restored into your own unacted corner):
  the other side's submission re-renders the card from its payload. Don't remove it as redundant.
- **A setup dialog configures ONE side.** The initiator names the opponent only; the opponent's pool source,
  dice and TN live in **their** corner (`SR3EActor.contestedSourceOptions`). `tests/e2e/contested.spec.mjs`
  asserts `#opp-source`/`#opp-pool`/`#opp-tn`/`#opp-damage` are absent from the dialog.
- ⚠ **Charge BOTH corners, not just roll them** — use the pool helpers (they route via `sr3e.pool.spend`, work on
  a non-owning client, and return what was deducted — roll that, not what was typed).
