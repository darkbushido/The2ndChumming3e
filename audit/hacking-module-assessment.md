# Assessment — can the HoloSuite Hacking module be made turn-based and rules-compliant?

Date 2026-11-07. Assessment only: no code changed, Foundry not used, installed module not edited.
Rules measured against: **both** rulesets (Orthodox SR3 core Ch. 8 and Matrix Defragged v2) — the maintainer's answer.
"Matrix Reloaded" is not a book in the PDF library (only `Shadowrun 3e - Matrix.pdf` and `The Matrix Defragged v2.pdf`).

## Verdict

1. **Feasible?** Technically yes, but it would mean replacing the module's core, not tweaking it.
2. **Route:** build natively. Do not fork or patch the module.
3. **Optional extra:** wrap it as flavour only (see below), at low cost, if the maintainer wants the minigames.
4. **Effort:** native Matrix turn flow is on the order of 2-4 weeks of sessions (mostly TODO 128 and the host-run loop). A fork that makes the minigames turn-based is a rewrite of its four games plus an SR3 adapter, and has no rules value.
5. **Maintainer rulings needed:** see the end.

## What the module is (read from the installed files)

- `holosuite-hacking` 1.2.0 by Mage Tower Studios, requires `holosuite-core` 1.0.12. Foundry v12-v14.
- Licence: hacking is **GPL-3.0-or-later**, core is LGPL-3.0-or-later. Patching and forking are permitted; a fork carries its own updates. This repo's licence was not checked against GPL here.
- Ships as one minified bundle (`dist/main.js`, ~195 KB, 4270 lines) plus templates and CSS. The unminified source is on GitHub (`Thuurvdv/MageTowerFoundryModules`), which I did not read. Patching the installed bundle is impractical; any fork starts from that repo.
- Four minigames: Node Intrusion, Signal Alignment, Packet Switchboard, Prism Lock. A skill roll sets the difficulty profile (critical success to critical failure). The player then plays a **timed puzzle**; the README says "the trace timer is always running" and the game outcome is decided by play.
- Hooks: one `init`, one `ready`. It registers settings and a module socket. It exposes `game.modules.get('holosuite-hacking').api` (also `game.holosuiteHacking`) with `startHack`, `sendHackToPlayer`, `runConfiguredHack`, `rollSkillCheck`, `configureHack`, `getDifficultyProfile` and others.
- **No Shadowrun adapter.** Its system skill roll supports D&D 5e, PF2e, SF2e, CoC7 and Cyberpunk RED. For other systems it falls back to a custom die or "use this chat roll". It has no concept of dice pools, target numbers, Rule of Six or Hacking Pool.

## Fit against the two goals

### Turn-based (inside Foundry combat, one action per phase)
- The module is real-time by design: timers, trace pressure, continuous play on one client. A turn would need to be a move or a puzzle step, and the minigames have no such step boundary.
- The `api` takes a finished roll total and launches a puzzle. It does not let a caller pause, step or resolve it one action at a time.
- Hosts in this system act on the initiative track (IC are `ic` actors; VR-Hot uses Matrix Initiative). Nothing in the module reads combat.

### Rules compliance
| Rule (either ruleset) | Module behaviour |
|---|---|
| Hacking Pool dice vs a Target Number (System Rating / Security) | Single d20-style check against a DC. No pool, no TN. |
| Need successes >= Security Threshold (Defragged) | Successes are not counted. Roll margin picks a difficulty band. |
| Failed Hacking test -> Overwatch +1 (Defragged p.22-23); Security Tally (Orthodox) | Failure is "trace complete". No Overwatch or Tally link. |
| Cybercombat, IC attack, Condition Monitor, dump shock | Not present. |
| Design ethos: no automated outcomes, GM decides | The puzzle result is the outcome. The GM can narrate over it but the module reports success/failure itself. |

## Mapping to existing system code
This system already has the rules the module lacks: `scripts/data/hacking-pool.mjs`, `scripts/data/mdf-rules.mjs`, host and IC sheets for both rulesets, Overwatch (first trigger only), the Matrix Condition Monitor, VR-Hot initiative, dump shock for both rulesets. The missing parts are in `matrix.md` and TODO 128 (Overwatch crash trigger, Suppression, ten Trigger Steps), plus the host-run loop. None of those is something the module could supply.

## Options
| Route | Verdict |
|---|---|
| Patch / fork the module | Licence allows it. Needs: an SR3 pool and TN adapter, successes vs Threshold, a step-based engine for four games, Overwatch/Tally hooks, a combat link. That is most of the module rewritten, and the maintainer then carries the fork. **Not recommended.** |
| Wrap from this system, no file changes | Cheap (about 1-2 days): a button on the host sheet that, after the *system's* hacking roll resolves, calls `runConfiguredHack` or Quick Hack with a GM-chosen outcome and lets the players play the minigame as **colour only**. Outcome would not feed Overwatch unless the GM clicks it in. Needs holosuite-core, adds a module dependency, and the real-time play sits outside initiative. Only worth it if the table wants the minigames. |
| **Build natively (recommended)** | Finish TODO 128, then add a per-phase "host run" action list (one Matrix action per Initiative pass, in the tracker for VR-Hot, with the existing ⏳ open-steps panel) on top of the existing two-corner cards. No new dependency and it stays consistent with the ethos. |

## Risks
- Wrap: holosuite-core/hacking API changes between versions; GPL/LGPL obligations if code is copied; real-time puzzles can contradict turn order at the table.
- Native: scope creep around the host-run loop; both rulesets must stay supported (`matrixRuleset`), so each new rule needs an Orthodox and a Defragged branch or an explicit "Defragged only".
- Unverified here: the module's behaviour in a live world (not run, by instruction), and its GitHub source.

## Rulings the maintainer must make
1. Native build (recommended) or a flavour wrapper for the minigames, or both?
2. If a wrapper: may a minigame result ever be treated as an outcome, or is it strictly cosmetic with the GM clicking the real result?
3. Should the native host-run loop support both rulesets from the start or Defragged first?
4. Is an optional dependency on `holosuite-core` acceptable at all?
