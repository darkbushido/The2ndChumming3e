---
paths:
  - "scripts/sheets/SR3EHostSheet*.js"
  - "scripts/sheets/SR3EICSheet*.js"
  - "scripts/sheets/SR3EAgentSheet.js"
  - "tools/build-odm-packs.mjs"
  - "rawdata/ODM-*"
  - "rawdata/MDF-*"
  - "tests/matrix-defragged.test.mjs"
  - "tests/odm-packs.test.mjs"
  - "tests/e2e/cybercombat.spec.mjs"
  - "tests/e2e/orthodox-matrix.spec.mjs"
  - "audit/matrix-defragged-audit.md"
---
# The Matrix — two rulesets

## Two-track Matrix system
World setting **`matrixRuleset`** (**full restart**, `requiresReload: true`; `renderSettingsConfig` injects a
red warning).

| Setting value | Ruleset | Sheet classes registered |
|---------------|---------|--------------------------|
| `'defragged'` (default) | **Matrix Defragged v2** | `SR3EHostSheet`, `SR3EICSheet` |
| `'orthodox'`  | **Orthodox SR3** (core book Ch. 8) | `SR3EHostSheetOrthodox`, `SR3EICSheetOrthodox` |

Character sheet Matrix tab:
- **Defragged** — Hacking Pool from the equipped cyberdeck item, node tracking, Overwatch.
- **Orthodox** — `system.orthodoxDeck.*`, Loaded Programs (memory tracking), 10-box Matrix Condition Monitor,
  Cyberdeck and Program pickers (every pack declaring those types, via `SR3EItem._documentsOfType`).

**Orthodox fields** (`CharacterData`/`NpcData`):
- `system.orthodoxDeck.{ mccp, activeMemory, storageMemory, hardening, responseIncrease, ioPeed }` —
  ⚠ the MPCP field is named **`mccp`**. Hacking Pool = `⌊(INT + MPCP) / 3⌋`.
- `system.orthodoxRunState.{ hostId, hostName, securityCode, securityValue, securityTally, personaBod, personaEvasion, personaMasking, personaSensor }`
- `system.orthodoxMatrixCM.value` (0–10; crash at 10 → dumpshock)

⚠ **The Hacking Pool has TWO derivations.** `availableHackingPool` (equipped deck item, Defragged) is `null`
for an Orthodox decker, and `?? 0` makes that a silent zero. `availableOrthodoxHackingPool` reads
`system.orthodoxDeck.mccp`. Always: `d.availableHackingPool ?? d.availableOrthodoxHackingPool ?? 0`.

⚠ **The Orthodox IC-attack dialog configures ONE side** — `rollOrthodoxICAttack` names the decker and sets the
IC's dice/TN. The decker's dice and `sr-icia-def-hp` live in **their** corner; the spend happens in
`handleOrthodoxICAttackRoll` from what they submitted (`tests/e2e/orthodox-matrix.spec.mjs`).

**Orthodox packs — `sr3e-sr3-odm-cyberdecks` · `sr3e-sr3-odm-programs`**, built by
`node tools/build-odm-packs.mjs` (`--install` with Foundry closed, then `npm run sync:install -- --force`)
from ODM-\* rawdata, **core book only**: 8 stock decks (p.207, p.304) and 22 core utilities (pp.220-222).
Other rawdata rows (`cp`, `cd.130`, `mat`, Erosion variants) stay in rawdata. The tool **refuses to write** if
a row disagrees with the book; `tests/odm-packs.test.mjs` diffs the packs.
- ⚠ Tagged `flags.The2ndChumming3e.matrixRuleset: 'orthodox'` (read by `SR3ESourceBooks.rulesetAllows` in
  `packAllowed`); `sr3e-mdf-cyberdecks`/`-programs` are tagged `'defragged'`. IC, agents, hosts untagged.
  Presentation only, fails visible.
- Program items keep extra fields in `modules[0]` with `_odmType: 'orthodox'`.

## Matrix rules (Matrix Defragged v2)
Audited page by page — TODO 119, `audit/matrix-defragged-audit.md`; `tests/matrix-defragged.test.mjs` pins it.

### System Rating
Every Matrix device has one (1–12+): hosts set by the GM, cyberdecks = MPCP, others = Device Rating. It is
the TN for actions against a host or its assets.

### Security Tiers
Colour (flavour) + **Security Threshold**. A hack needs successes **≥ Threshold**, or it fails and
**Overwatch +1**. Cyberdecks take their tier from Firewall.

| Tier | Threshold | Colour | Description |
|------|-----------|--------|-------------|
| Ivory | 0 | Cream | No security. Toys and minor Matrix devices. |
| Blue | 1 | Blue | Low security. Public access: bus tickets, libraries. |
| Green | 2 | Green | Standard. Shops, petty outfits, public Matrix. |
| Orange | 3 | Orange | Challenging. Mid-size corps, corp offices. |
| Red | 4 | Red | Threatening. Classified info; agencies will kill to protect. |
| Black | 5 | Black | Dangerous. Top military/corporate/government SOTA. |
| Ultraviolet | 6 | Purple | Deadly. The Sixth World's greatest secrets. |

### Hacking Pool
`Intelligence + ⌊MPCP / 3⌋`, always paired with the appropriate skill.

### User modes  · *MDF p.10, p.27*
| Mode | Initiative | Biofeedback | Dumpshock |
|------|-----------|-------------|-----------|
| Tortoise (TRM) | **meat world** | Immune | — |
| AR | **meat world** | Immune | — |
| VR-Cold | **meat world** | Stun overflow | Stun |
| VR-Hot | Matrix (Response) | Physical | Physical |

- ⚠ **Only VR-Hot uses Matrix Initiative.** TRM/AR/VR-Cold use their own meat-world dice (wired reflexes
  included), no Response.
- Tortoise: +2 TN to all Matrix actions. VR-Cold: overflow past the stun track → physical.
- **Dumpshock is SERIOUS**, Power = the System Rating of the grid/host that dumped the user (p.27).

### Hacking procedure
1. Declare a node prompt (e.g. Duplicate/Download on DS).
2. Hacking vs System Rating; need ≥ Security Threshold successes, else fail + Overwatch +1.
3. Resolve (some prompts need a second roll).

### Overwatch / Convergence  · *MDF p.22-23*
- 10 boxes, on the host's **Security Sheaf**.
- Triggers: *"Failing a test using the Hacking skill"* and *"Crashing an icon without Suppressing it"*.
  ⚠ **Only the first is implemented** — the crash trigger, Suppression and the sheaf's ten Trigger Steps are TODO 128.
- Box 10 = **Convergence**: Dumpshock (Power = System Rating) + GOD/corporate response + possible physical security.

### Cybercombat  · *MDF p.26*
1. **Attack**: Cybercombat + Hacking Pool *"against a base target number 4, modified as appropriate"* —
   not the target's System Rating.
2. **Defend**: Cybercombat + Hacking Pool, base TN 4.
3. **Compare** net successes. ⚠ *"Ties are resolved in favor of the defender"* — the card posts 🤝 Tie, no
   damage (whether the defender should deal base damage is the maintainer's to settle).
4. +1 Damage Level per 2 net; past Deadly, +1 Power per 2 (as melee).
5. **Resist**: the target's **System Rating (or MPCP)** vs TN = Power − Security Threshold/Firewall (armour). Not Body.
- ⚠ **Charge both corners**, through the pool helpers (`spendHackingPool` → `sr3e.pool.spend`), and roll what
  they return.

### IC / Agents
- **Firewall** = the host's Security Threshold (no separate IC stat).
- IC initiative by tier (`_prepareIC`): Ivory Rating + 0d6 · Blue +1d6 · Green +2d6 · Orange +3d6 ·
  Red/Black/Ultraviolet +4d6.
- Grading: **White** (ARis, Authenticator, Looper, Mr. Medkit, Scrambler), **Gray** (Blaster, Crippler,
  Dataworm, Gemini, Hydra, Sparky, Tar Baby, Tracker), **Black** (Killer, Ripper — physical damage).
- IC act on their own initiative (`ic` actors in the tracker).

### Matrix Condition Monitor
- 10 boxes, click-to-toggle; *"When an icon achieves 10 boxes of Overload Damage, it crashes"* (p.26).
- 🔴 **THE THRESHOLDS ARE UNVERIFIED.** We use 3/6/8/10 → +1/+2/+3/crash. MDF p.12's table is a graphic whose
  labels read `Icon | +1 TN | +2 TN | +3 TN | +4 TN` — four steps — but the box counts don't extract. One
  look at p.12 settles it (TODO 119).
- Not yet a separate track on the host sheet.

### Sys/Sec modifiers  · *MDF p.14*
| Condition | Modifier |
|-----------|---------|
| Hardlined via a datajack or trodes | −2 |
| Operating in a Tortoise Terminal | +2 |
| Maintaining real-time communication with meat world associates | +1 |
| Circumstantial — Matrix noise, jamming, wound modifiers | ±1-4 |

### Host sheet (`SR3EHostSheet.js`)
- Changing `securityTierName` fills `securityTierColor` and `securityTierThreshold`.
- Overwatch track: 10 boxes (green→amber→red→gold), box 10 = Convergence (gold border).
- Default topology: SAN (top) → SPU (centre) → SN (left) / DS (right) / CPU (bottom); I/O (upper right) off SAN.
- Shapes: SAN rectangle, SPU hexagon, DS square, **SN circle**, CPU doubleHexagon, I/O triangle.
