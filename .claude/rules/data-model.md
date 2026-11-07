---
paths:
  - "scripts/documents/**"
  - "scripts/data/*DataModels.js"
  - "scripts/sheets/**"
---

# Data model and key methods

Moved out of `CLAUDE.md` (TODO 291, approved by the maintainer 2026-11-07). `CLAUDE.md` keeps a short ⚠ summary.

## Actor data model

### Key system fields (character/npc)
```
system.attributes.<attr>.base / .value     ← body quickness strength intelligence willpower charisma magic
system.attributes.reaction.value / .reactionBonus / .diceBonus / .override
system.attributes.essence.value     ← DERIVED (see essence-and-cyberware.md)
system.attributes.essence.base      ← persisted starting Essence (6)
system.attributes.essence.lost      ← persisted PERMANENT loss, nullable; accumulates on install
system.wounds.stun / .physical      ← { value, max }
system.woundMod                     ← derived (negative)
system.derived.combatPool / .availableCombatPool
system.derived.spellPool / .availableSpellPool   ← null if not Awakened
system.derived.initiative / .initiativeDice
system.combatPoolSpent / .spellPoolSpent          ← persisted pool usage
system.equippedArmor / .equippedMelee             ← item ID strings (armour now uses the item `worn` flag)
system.karma / .totalKarma / .karmaPool / .ledger
system.astralMode                  ← '' | 'physical' | 'dual' | 'astral'
system.matrixUserMode              ← '' | 'TRM' | 'AR' | 'VR-Cold' | 'VR-Hot'
system.recoilCompensation / .roundsFiredThisPhase / .targetsThisPhase
```

### Item types and key fields
- `firearm`: `damage` ("9M"), `category` (weapon code), `mode` ("SA/BF/FA"), `ammunition` (capacity "15(c)"),
  `recoilMod`, `smartgun`/`laserSight` (nullable), `rangeOverride` ("5/15/30/50"), `loadedAmmoType`/`loadedRounds`,
  `ready`, `hands`, `choke`
- `melee`: `damage`, `reach`, `category`
- `projectile` / `thrown`: `damage`, `category`, `quantity` (thrown consume it; bows/crossbows nock via `loadedAmmoType`/`loadedRounds`)
- `ammunition`: `ammoType` (key into `SR3E.ammoTypes`), `loadMechanism`, `rounds`/`reloads`/`roundsPerReload`/`countedIn` — rules live in config
- `armor`: `ballistic`, `impact`, `worn`
- `skill`: `rating`, `linkedAttribute`, `specialisations` (`level` = bonus over base)
- `spell`: `force` (learned Force, nullable — caps the cast; SR3 p.178), `type` (Mana/Physical — **what it can
  affect**, never the damage track), `damageTrack` (`''`/`Physical`/`Stun` — ⚠ **combat spells do PHYSICAL
  damage unless they are stun spells**, SR3 p.191; blank reads the name, `SR3EItem.spellDealsStun`), `target` (**resist attribute AND cast TN**, via `SR3EItem._parseSpellTarget`), `category` (Combat or
  Elemental = damaging; Elemental resolves as a ranged attack), `drain` ("(DL+1)"), `range` (`(A)` = area),
  `duration`. **No damage code** — Power = Force, level chosen at cast.
- `drug`: `addiction` ("4M+3P"), `tolerance`, `edge` ("5/50"; legacy `effect`), `fixFactor`, `damage`, `speed`,
  `vector`, `legality`, `availability`, `cost`, `streetIndex`, `bookPage`
- gear/cyberware/bioware/medical: `rating` — read only through `itemRating()` (see essence-and-cyberware.md)
- **Mods inside items** (TODO 276): a host (firearm, melee, armour, cyberware) keeps its mods as item DATA in
  `system.installed` — not documents, so they travel with it; ⚠ never `system.mods` (cyberware's upstream bonus string).
  What any item changes is `system.modifiers` `[{ target, value }]` from `ItemMods.TARGETS`. Effects climb mod → host →
  actor: read a host with `ItemMods.effective` / `value`, the actor with `ItemMods.actorTotals` (worn armour, carried gear,
  installed cyber — never a weapon), all in `scripts/data/item-mods.mjs`; install/⏏/✎ in `scripts/SR3EItemMods.js`.
  ⚠ A gun's printed `accessories` are installed mods flagged `integral` (`scripts/data/integral-mods.mjs`): shown and holding
  their mount, **never counted** — the printed RC and flags already include them; `effective` / `pods` skip them.

### Weapon category codes → skills
```
HOPist/LPist/MPist/HPist/VHP → Pistols
MaPist/SMG → SMG
Carb/AsRf/SptR/Snip/LCarb → Rifles
LMG/MMG/HMG/MinG → LMG
ShtG → Shotguns
GrLn → Grenade Launchers
EDG → Edged Weapons
CLB → Clubs
POL → Pole Arms/Staff
WHP → Whips/Flails
CYB/UNA → Unarmed Combat
```

---

## Key methods reference

### SR3EActor
- `rollPool(pool, tn, label, options)` — entry point for skill/attribute rolls (adds wound, sustaining/drugs, signal mods unless skipped)
- `_rollWave(count, tn, isFirstWave, prevDice, explodeIdx)` — one wave; **only the 💥 handler may call it with `false`**
- `_postWaveCard(state)` — posts a wave card; final-wave branches for every flow
- `handleExplosionClick(payloadJson)` — static, 💥 buttons
- `rollOpposedPair(kind, ctx, atk, def)` / `rollThen(actor, pool, tn, {label, followUp})` — static, explosion-safe sequencing
- `spendCombatPool(amount)` etc. — route through `sr3e.pool.spend`; **return what was actually deducted**
- `_postSoakCard(payload)` / `postSoakCard(actorId, payload)` / `handleSoakRollClick(btn)`
- `postMeleeCard(ctx)` / `handleMeleeRoll(btn)` — melee boxing card
- `_rollDodge(targetActor, dodgeDice, dodgeContext)` — static
- `rollInitiative(options)` — `options.physicalDice` prompts for manual entry

### SR3EItem
- `rollWeapon(tn, options)` — ranged attack flow
- `rollMelee()` → `rollMeleeAttack(actor, atkWeapon)` — static, shared for real items and the synthetic `_unarmedWeapon()`
- `_buildMeleePoolInfo(actor, weapon)` — unarmed uses the **highest** of Unarmed Combat and every `MA:` skill
- `promptDefaultChoice(actor, opts)` / `defaultTiers(actor, opts)` — the Default Table
- `reload()`, `_promptFireMode`, `_parseLoadMechanism`, `_parseMagazineSize`, `_promptReloadChoice`
- `_getRangeBands`, `_rangeBandForDistance`, `_measureDistance`, `_acquireCanvasTarget`, `_tokensAdjacent`
- `parseDamageCode(code)` → `{ power, level, isStun }`; `stageDamage(base, net, { meleeRules })`
- `_getEquippedMelee(actor)`, `_promptTarget(attacker)`

### SR3ECombat
- `_nextTurnSR3()` / `_nextTurnSR2()` — pass-based / flat-queue advancement
- `_endOfTurnReset()` — pool/recoil/Full Defense refresh each Combat Turn
- `endCombat()` — silently refreshes pools, clears Spell Defense / `tempMagicLoss`

---
