# Cyberlimb Mods audit — 2026-10-23

**Question (the maintainer):** the compendiums carry a second copy of many implants for installing **inside a
cyberlimb**, at a reduced Essence cost, and nothing tells a player which copy is which. Raised by a Smartlink-2
that came out at .25 Essence instead of the book's .5 (M&M p.32).

**Scope:** every `cyberware` entry in `packs-src/` whose `cyberwareCategory` is **`Cyberlimb Mods`** (145, in
`sr3e-mm-cyberware` and `sr3e-sr3-cyberware`), plus the limb accessories filed under **`Cyberlimbs`**.
**Authority:** the PDFs: SR3 p.303 (*Cyberlimbs*, and the Limbs table) and M&M pp.35–41 (equipment capacity, the
Equipment Capacity Cost Table on p.36, and the cyberlimb cost tables on pp.37, 39, 40 and 41). The tables were
read from rendered page images, because `pdftotext` scrambles their columns.

## The rule

- **SR3 p.303, *Built-in Device*:** devices "may be built into cyberlimbs at a reduced Essence Cost …
  Cyberware such as hand spurs, fingertip compartments and handblades may be added at no Essence Cost. Other
  devices, such as radios, jammers and so forth, are left to the gamemaster's discretion." The Limbs table prices a
  **Built-In Device at 4 × Normal Cost**.
- **SR3 p.303, *Smartlink*:** "Smartgun links installed in cyberarms have a reduced Essence Cost of .25."
  The table lists the Built-In Smartgun Link at .25 Essence, 2,500¥, 6/4 days, street index 1.5, 5P-N.
- **M&M p.35:** "Most additional equipment can be installed in cyberlimbs without Essence cost. Equipment that
  must interface with other, non-cyber parts of the body, however, does cost additional Essence, as shown on
  the Equipment Capacity Cost Table." (p.36). Items marked `*` there need a direct neural interface (p.38) to be
  controlled cybernetically.

So the `Cyberlimb Mods` entries are **legitimate**: they are the in-limb versions. The defect is that **61 of
them have the same name as the ordinary implant**, and nothing on the item, in the compendium or on the sheet says
"in a cyberlimb". The packs have no folders, and the actor sheet does not show `cyberwareCategory`.

## What the 145 are

| Group | Count | Essence vs M&M p.36 / SR3 p.303 |
| :--- | ---: | :--- |
| **In-limb versions of ordinary implants**, same name as the normal one | 82 | ✓ all (`—`, or .25 smartlink, .25 hydraulic jacks, .1 retractable horns, .5 tactical computer, .1 per sense port) |
| Limb-only accessories, no twin: body plating (Ballistic/Impact/Ablative), gyromount, weapon mounts, articulated arm (the retractable one is 1 Essence, as printed), cyberskates, telescoping, magnetic system, signal booster, cyber holster, Shock Hand, DNI | 49 | ✓ except the rows in *Data errors* |
| Gear built into a limb (Personal Comm Unit 1–10, Optical Memory Chips, Pocket Secretary) | 14 | 0 Essence is the GM's call (SR3 p.303); **price is the normal price, not SR3's 4×** (see *Questions*) |

The 82 same-name pairs: Smartlink (SR3) · Smartlink II · the eight cyberguns, CyberSquirt, External Clip Port ·
Hand Blade (both) · Hand Razors (both) · Improved Razors · Spur (both) · Horn Implants (both) · Retractable
Climbing Claws · Venom Sack · Foot, Anchor · Hydraulic Jack [1]–[5] · Orientation System · Tactical Computer,
its ports, BattleTac and the Tactical Sense Program · Fingertip Compartment · Remote Control Deck [1]–[8] and its
modules (RC Encryption [1]–[8], ECCM [1]–[10], Protocol Emulation [1]–[10], Rigger Decryption [1]–[10]).

## Data errors (book wins) — ✅ fixed in the packs, TODO 255

All 17 fields below are corrected in `packs-src/` by `tools/fix-cyberlimb-mods.mjs` from `PACK_CORRECTIONS`
(`scripts/data/cyberlimb-mods.mjs`), pinned by `tests/cyberlimb-mods.test.mjs`. Copies already on characters
change with the 0.7.1 migration (TODO 256).

| Entry | Pack has | Book | Source |
| :--- | :--- | :--- | :--- |
| Rigger Decryption Module **[1]** (`sr3e-cyberware-0833`, the second one) | 175,000¥, 12/10 days | it is **[10]** (10 × 17,500); there is no [10] in the limb series | pattern of the series; the Rigger twin [10] |
| Direct Neural Interface (`…0743`) | 2,500¥, 3-N | 4,500¥, 5P-Q | SR3 p.303; M&M p.39 |
| Smartlink (in limb, `…0846`) | 3/36 hours, SI 1 | 6/4 days, SI 1.5 | SR3 p.303 Built-In Smartgun Link |
| Mount, Tracking (`…0768`) | 24,000¥ | 25,000¥ | M&M p.41 |
| Cyberarm Gyromount (`…0728`) | 3-N | 4P-R | M&M p.37 |
| Cyber Holster (`…0727`) | 3-N | 5P-N | M&M p.39 |
| Cyberskates, and Retractable (`…0741`, `…0742`) | 3-N | Legal | M&M p.39 |
| Telescoping Cyberlimb (`…0855`) | 3-N | Legal | M&M p.40 |
| Fingertip Compartment (`Cyberlimbs`, `…0622`) | 0.1 Essence | **0** in a cyberlimb | SR3 p.303 "at no Essence Cost"; it duplicates the `Hands` entry |
| Smartlink II (Internal) (`Cyberlimbs`, `…0612`) | 3,200¥ | no book price; it duplicates the limb Smartlink II (`…0847`, 3,500¥) | M&M p.32 lists only 3,500¥ |
| Smartlink (Internal) (`Cyberlimbs`, `…0611`) | 3/36 hours, SI 1 | 6/4 days, SI 1.5 — the SRCG `(Int)` rows are the Built-In Smartgun Link | SR3 p.303 |

## A code defect found on the way — ✅ fixed, TODO 255

**In-limb cyberweapons never get a weapon entry.** `CyberWeapons.isCyberweapon` (`scripts/data/cyber-weapons.mjs`)
accepts only `cyberwareCategory === 'Cyberweapons'`, so the `Cyberlimb Mods` cyberguns, blades, razors, spurs,
horns, claws, squirt and Shock Hand (about 20 entries) install with no attack (TODO 151's symptom, for limb installs).

`isCyberweapon` now also accepts the weapons among `Cyberlimb Mods`, read by name (`LIMB_WEAPON`).

## Decided by the maintainer, 2026-10-23 — TODO 256

1. **Marking:** all four: rename to `<name> (Cyberlimb) [N]`, a "Built into a cyberlimb" pack folder, a first
   description line, and a 🦾 chip on the sheet's cyberware row.
2. **Built-in gear price:** SR3 p.303 prices a built-in device at 4 × normal cost; M&M pp.35–36 gives capacity
   units and no multiplier. "If you don't have M&M turned on it should use the 4x cost. If you have M&M enabled
   we should use that."
3. **Owned copies:** the pack fixes land on main now; the 0.7.1 migration rides with TODO 256.
