# SR3E — Feature Reference

A quick "what's in the system and how do I use it" guide. Grouped by area; each entry notes where
to click. **Design ethos:** the system presents the dice and the results — it never applies damage
automatically. The GM/player makes the final call (clicking wound boxes, interpreting successes).

> **Shift-click = physical dice.** Almost every roll button and dice icon supports **shift-click**:
> instead of rolling digitally it asks you to type in the number of successes (for rolling real
> dice). Entries that support it are tagged **(shift-click available)**. When in doubt, try it.

---

## 1. Core rolling

- **Rule of Six (exploding dice).** Every test counts successes (die ≥ TN). Any 6 explodes — each
  wave shows a single **💥 Roll explosions (N dice)** button that re-rolls *all* pending 6s at once;
  repeat until none remain. 
  **Rule of One.** Flagged on the card only when **every** die rolled comes up 1 (SR3 p.38) — an
  automatic zero-success failure whose consequence is the GM's call. There is no second
  "critical" tier and no half-the-pool threshold; that is SR4's glitch rule.
- **Physical dice mode.** Shift-click any roll → enter successes manually. **(shift-click available)**
- **Karma Pool.** Roll-option dialogs show a *Use Karma Pool* checkbox when you have karma.
- **Defaulting.** If you lack the skill for a test, an interactive **Default** dialog offers
  Specialization (+3 TN), Skill (+2), or Attribute (+4); cancelling aborts the action.

## 2. Skills & attributes

- **Skill roll** — Skills tab → click the **dice icon** on the skill row. **(shift-click available)**
- **Attribute roll** — Attributes tab → click the attribute's **dice icon**. **(shift-click available)**
- **Pools** (shown as *available / total*): Combat, Spell/Magic, Astral, Hacking. Spent automatically
  when allocated in a roll dialog; **refreshed at end of combat** (GM is prompted).

## 3. Health & damage

- **Wound tracks** (Physical / Stun) — header of the sheet. Click a box to fill to it (click again
  to clear); **L/M/S/D** buttons apply a wound of that level; **−** heals one box.
- **Wound modifier** is derived and **auto-applied** to every roll's TN and to initiative.
- **Damage staging** — each 2 net successes raises the level (L→M→S→D); past D, +1 Power per 2. Stun
  vs Physical track set by the attack. GM assigns via the **Assign \<Level\> Wound** button.
- **Overflow / auto-defeat** — filling a track marks the combatant defeated (unconscious overlay);
  physical full + overflow ≥ Body adds the dead overlay. Reverses on healing.

## 4. Ranged combat (firearms / bows / crossbows / thrown)

- **Fire a weapon** — Weapons tab → **dice icon** on the weapon row. **(shift-click available)**
  Also from the canvas (see *Canvas & tokens*).
- Flow: target → (firearms) **fire mode** SS/SA/BF/FA with editable recoil comp → **roll-options**
  (TN, damage, editable **range** band, called shot) → defender declares **dodge** → attack rolls →
  dodge → **soak** card → GM assigns damage.
- **Called shots** (all single-target weapons except AoE; not in Full Auto): in the roll-options
  dialog choose **Stage up damage (+4 TN)** or **Specific sub-target (+4 TN)**; **Take Aim** subtracts
  1 TN per point. (Melee gets its own called-shot prompt.)
- **Range** is auto-measured from tokens when present; editable band dropdown in the dialog.
- **Ammunition** (world setting *Track Ammunition*): firearms have a magazine + a **↻ Reload** button
  (pulls from a matching ammo stockpile); bows/crossbows **nock** one arrow/bolt; thrown weapons use
  quantity. Empty weapons are faded and won't fire until reloaded. Ammo types (APDS, Flechette,
  EX, Gel, Tracer, Anti-Vehicle…) apply their effects automatically.

## 5. Melee & unarmed

- **Melee attack** — Weapons tab → melee weapon **dice icon**. **(shift-click available)** Opens a
  two-sided "boxing card"; both sides roll on one click; winner's damage stages by net successes.
  Called-shot prompt (stage up / sub-target / take aim) runs first.
- **Unarmed** — Cyber & Unarmed row → **Unarmed** action (STR)M Stun; uses the best of Unarmed Combat
  or any Martial Arts skill.
- **Resist Damage / soak** buttons on the result card. **(shift-click available)**

## 6. AoE / grenades

- Throw an AoE weapon (needs a scene): **nominate** the blast point on the canvas (left-click to
  detonate, right-click/Esc cancel) → roll-options (grenade type, confined-space) → throw. Scatter
  relocates the blast, re-detects everyone caught (including the thrower), draws a shared marker, and
  posts a soak card per target. **🧹 Clear** removes the marker.

## 7. Initiative & the combat tracker

- **Roll initiative** — the ⚡ bolt on the sheet, or the tracker's roll icon. **(shift-click available
  — physical dice)**
- **Modes** (game setting): **SR3** pass-based or **SR2** flat queue.
- **Begin Encounter** dialog rolls initiative before combat starts; per-combatant icons are locked
  until then.
- **Action Tracker** (GM, active combatant's card): a full-width **Complex** button ends the turn;
  two **Simple** buttons track simple-action use.

## 8. Magic (Awakened characters)

- **Cast a spell** — Magic tab → **Cast** on a spell row. **(shift-click available)** Choose Force
  (+ Damage Level for combat spells, + area for AoE) → target(s) → allocate Magic Pool → opposed
  cast. Targets get a **Resist Spell** button; the caster gets **Resist Drain**.
- **Drain** — resisted with Willpower; Physical if Force > Magic, else Stun.
- **Dispelling**, **Counterspelling / Spell Defense** — supported via their cards.
- **Conjuring / Summoning** — Magic tab → **Summon**: pick spirit + Force + hold-back dice; Conjuring
  test (each success = a service) + Drain; **Confirm Summoning** creates the spirit.
- **Astral** — Magic tab toggles **Physical / Dual / Astral** state. **Assensing** and **Astral
  Combat** roll from the sheet. **(shift-click available)** Astral Projection uses INT+20+1d6 init.
- **Initiate Grade** — a plain editable number on the Magic-Identity block (Awakened only, default
  0). Not a skill or attribute; currently only used for **Fooling a Ward** (see below).

## 9. Wards (astral barriers)

- **Cast a ward** — Magic tab → **🛡 Cast Ward**: set Force, ward type (Standard / Alarm / Polarized
  / Masking), area radius, and an optional **Permanent** checkbox → roll Magic vs TN=Force.
  Successes = weeks the ward lasts (0 = it fails to form). **Drain is always `(Force)L` Stun**,
  win or lose. On success, click **🛡 Place Ward on Canvas** to aim and drop it — this creates a
  real token (the ward's "icon") plus a persistent silvery-grey boundary marker showing its volume
  (same AoE-aim/Region tooling the grenade and spell-AoE flows use).
- **Ward sheet** (its own Actor type) — Force / condition-monitor box track (each box = −1 Force,
  same L=1/M=3/S=6/D=10 conversion every other condition monitor in this system uses), ward type,
  permanent flag, weeks remaining, area radius, and the creator's name. **🔁 Redraw Boundary**
  re-draws the marker at the token's current position; **🧹 Dispel Ward** deletes it (and its
  marker) after a confirm.
- **Attack a ward** — ward sheet → **⚔ Attack This Ward**: pick an attacker + mode (unarmed astral /
  weapon focus / offensive sorcery / spirit). Declaring the attack immediately whispers the GM
  **and the ward's creator** — wards alert their creator the instant they're attacked, before any
  dice are even rolled. The attacker's roll stages damage up; a **🛡 Ward Resists** button then
  rolls the ward's own Force dice to stage it back down, ending in the usual **Assign Damage**
  button. Force hitting 0 posts a destroyed notice (no auto-deletion — dispel it manually).
- **Fool a ward** — ward sheet → **🌫 Fool This Ward** (requires the Masking metamagic): a one-click
  simultaneous contest — 2×Initiate Grade vs the ward's Force, and the ward's Force vs the
  Initiate's Grade. More successes wins (a tie favors the ward). **No alert is posted** — fooling
  is the quiet alternative to fighting.

## 10. The Matrix — two rulesets

Switch between rulesets in **Configure Settings → System → Matrix Ruleset**. Requires a full
Foundry restart. A red warning is shown in the settings UI.

### 10a. Matrix Defragged (default ruleset)

- **User mode** — Matrix tab buttons: Tortoise / AR / VR-Cold / VR-Hot (sets initiative & biofeedback
  rules).
- **Cybercombat**, **Hacking Action** (3-step Security-Threshold check, bumps Overwatch on failure),
  **Matrix Initiative**, **Dumpshock** — buttons on the Matrix tab when in the appropriate mode.
  **(shift-click available)**
- **Cyberdecks & programs** — equip a deck, drag programs into utility slots; program **degradation**
  tracked; Matrix Condition Monitor shown.
- **Node tracking** — current node, marks, link-lock on the Matrix tab; **node prompts** are click
  buttons per host node.
- **Host sheet** (GM) — System Rating, Security Tier (auto-fills threshold/colour), **Overwatch**
  10-box track (box 10 = Convergence), node map, **Security Sheaf** with stocked IC + trigger steps.

### 10b. Orthodox SR3 Matrix (SR3 core book Chapter 8)

- **Cyberdeck setup** — Matrix tab → **📦 Browse Cyberdecks** opens a live-filter picker from the
  `Cyberdecks — Orthodox SR3` compendium. Selecting a deck writes MPCP, Active/Storage Memory, I/O
  Speed, Hardening, and Response Increase directly to the actor. Run the `populate-odm-cyberdecks`
  macro once after a full Foundry restart to fill the compendium.
- **Programs** — Matrix tab → **+ Browse Programs** adds a program from the `Programs — Orthodox SR3`
  compendium as an item on the actor. The program list shows Category, editable Rating, and calculated
  Active Memory (`Rating² × multiplier`). A memory bar turns red if you exceed Active Memory. Run
  `populate-odm-programs` to fill the compendium.
- **Hacking Pool** — derived: `⌊(Intelligence + MPCP) / 3⌋`. Shown on the Matrix tab when MPCP > 0.
- **Matrix Condition Monitor** — 10-box track on the Matrix tab. TN penalties at 3 / 6 / 8 boxes
  (+1 / +2 / +3). Filling all 10 crashes the deck → dumpshock (Stun in VR-Cold, Physical in VR-Hot)
  at the host's Security Value.
- **Host sheet (Orthodox)** — Security Code (Green / Orange / Red / Black), Security Value, active
  IC roster, **Trigger Steps** editor (sorted by tally threshold, inline editable).
- **IC sheet (Orthodox)** — Derived stats panel (Rating, Damage, TN), Roll Initiative, Roll Attack.
  IC initiative is tier-based (Ivory 0d6 → Blue 1d6 → Green 2d6 → Orange 3d6 → Red/Black/UV 4d6).
- **IC attacks decker** — IC sheet → Roll Attack: target decker dialog, boxing card posts for both
  sides, result assigns Matrix CM boxes to the decker. CM box 10 = dumpshock auto-posted.

## 11. Vehicles & rigging

- **Vehicle sheet tabs:** Stats, Weapons, Mods, **Electronic Warfare**, Notes.
- **Vehicle initiative** — VCR (jumped-in) / RCD (remote/captain's chair) / Auto, set by the control-mode buttons.
- **Driving Test** — Stats-tab **🚗 Driving Test** button, the Rollable-Tables tool, **or** the vehicle
  token's **Vehicle Tools** HUD menu. Base TN = Handling; pool = Vehicle skill + Autonav (out of
  combat) or Control Pool (jacked-in rigger).
- **Drone Comprehension Test** (SR3 p.157) — Stats-tab **📡 Drone Comprehension** button, or the
  **Vehicle Tools** HUD menu. Pilot dice vs editable TN (4 simple / 8+ complex), secondary-drone +2,
  Command-degradation auto-filled. 0 = no comprehension · 1 = literal · 2+ = leeway.
- **Vehicle weapons / Gunnery** — Weapons tab dice icon; pilot's Gunnery vs target Sig − sensor/VCR.
  A **Shot type** select applies network degradation (Direct / Manual = Simsense / Indirect = System).
- **Contested Roll** — Stats-tab button. **(shift-click available)**
- **Vehicle Chase tool** (Rollable Tables → **🚗 Chase Scene**): add participants (vehicle + driver +
  speed); per-turn **Driver Points** Open Test, initiative, and the driving **actions** — Accelerate/
  Brake, Positioning, Ramming, Hiding, Relocating, Crash Test (each a TN-modifier dialog).
  - **Quarry & auto-distance:** tick **Quarry** on one vehicle (others' distance is relative:
    **+ = behind, − = ahead**). On **Next Turn** each pursuer's distance updates by the speed
    difference and is reported in chat.

## 12. Electronic Warfare (riggers) — R3

- **Stats placement:** the rigger's deck stats (**Deck / Flux / Protocol module**, and the **IVIS
  Pool**) live on the **character Matrix tab → Rigger — Electronic Warfare**; the vehicle/network's
  **ECM / ECCM / Flux / Footprint**, **Signal Monitor**, and infiltration state live on the vehicle's
  **Electronic Warfare** tab.
- **Footprint** — auto-derived `⌊(deck Flux + veh Flux + ECM)/10⌉`; **↻ Recalc** writes it; reduces
  TN to target the vehicle's Sig.
- **Signal Monitor** (3 channels × 10 boxes) — each channel has an **Infiltrated** toggle (unlocks it)
  and **+1 / −1** degradation buttons; tier shows +1 Light / +2 Moderate / +3 Serious / Channel Lost.
- **MIJI attack** — vehicle EW tab **⚡ MIJI Attack**: pick intruder + operation (Meaconing / Intrusion
  / Jamming / Interference) + channel → opposed EW contest card → **Roll MIJI Test** → apply
  degradation. Flux adds complementary dice (min Flux, skill).
- **Infiltration** — **📡 Attempt Infiltration**: EW vs TN 6 ± deck/protocol; freely split successes
  across **channels / time-reduction / Intrusion Factor**. **🔍 Detect Infiltration** for the defender.
- **ECCM repair** / **Reduce Footprint** — EW-tab buttons.
- **Degradation effects:** Simsense on a VCR-jacked rigger auto-applies to **all their rolls +
  initiative** (like wounds); System/Simsense feed the gunnery Shot-type TN; an **Active Degradation
  Modifiers** panel lists the rest for the GM.
- **IVIS Test** (BattleTac) — Matrix-tab EW block **📶 IVIS Test**, or the rigger token's HUD button
  (shown only with a Small Unit/Vehicle Tactics skill). Small Unit Tactics vs TN 5; split successes
  into Comprehension bonus + a shared **IVIS Pool** (auto-refreshes each combat round; **−1** spend /
  **Clear** expire).

## 13. GM tools (Rollable Tables sidebar)

All on the **Rollable Tables** directory tab. Chase Scene, Driving Test & Threat Clocks are open to
all; the rest are GM-only: **Chase Scene**, **Driving Test**, **🕐 Threat Clocks**, **Session
Rewards**, **Chunky Salsa** (blast calculator), **Barrier Damage**, **Falling Damage**, **Escape
Artist**.

- **Threat Clocks** — Blades-in-the-Dark-style countdown dials for tracking threats. GM view is a
  full editor (name, segment count, color, a **visible to players** toggle, click-a-wedge or
  +/− stepper to fill it, delete); the same button gives players a read-only view of only the
  clocks marked visible. Changes sync live to every connected client.

## 14. Canvas & tokens

- **Attack from a token** — owned character/NPC tokens get a **crosshairs** HUD button → pick a ready
  weapon (or spell) and fire. **(shift-click the sheet dice icon for physical dice)**
- **Vehicle Tools** — owned vehicle tokens get a **satellite-dish** HUD button → Driving Test / Drone
  Comprehension.
- **IVIS** — rigger tokens (with Small Unit/Vehicle Tactics) get a **broadcast** HUD button.
- **Hotbar drag** — drag a weapon from a sheet to the hotbar to make a one-click "Fire" macro.
- **Token wound bars** auto-track Physical/Stun; **status effects** (sustaining, full defense,
  dumpshock, astral, dual, VR) auto-toggle; **Bio/Notes** render as enriched read-only text with an
  ✎ edit toggle.

## 15. Look & feel

- **Blade Runner-inspired theme.** Fonts: **Teko** (display — headers, tab labels, big numeric
  displays, dice) paired with **Quantico** (body text), loaded via Google Fonts. Palette swapped to
  Blade Runner's own near-black/cream base with its blue accent and gold/green/red/amber status
  colors — both `:root` blocks in `styles/sr3e.css` carry the values.
- **Sidebar icons** — the Chat tab shows a walkie-talkie, Combat shows a gun (pure CSS glyph swap,
  same trick the Blade Runner Foundry system uses).
- **Chat-card textures** — roll/soak cards reference `styles/textures/sr-card-bg.webp` for a faded
  background image; drop a `.webp` there and it lights up automatically, no code changes needed.
- **Dice colors** — success = neon blue, fail = grey, rolled 1s = red, a pending "6" awaiting
  explosion = solid neon blue with a black number.

---

*See `TESTING.md` for step-by-step checks and expected numbers, and `CLAUDE.md` for implementation
detail.*
