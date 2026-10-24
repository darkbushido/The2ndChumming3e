# Weapon mods (Firearms Accessories) audit — 2026-10-23

**Asked by the maintainer** after the Cyberlimb Mods audit (`audit/cyberlimb-mods-audit.md`): "we should also
do something similar for weapon mods" — check them against the books, and make it visible where each one goes.

**Scope:** the 87 `gear` entries with category `Firearms Accessories` — `sr3e-sr3-gear` (27), `sr3e-cc-gear`
(54), `sr3e-mm-gear` (6). **Authority:** the PDFs, read from rendered page images: SR3 pp.280-282 (text and the
*Firearm and Weapon Accessories* table), *Cannon Companion* pp.33-35 (accessory tables) and pp.80-83 (*Firearm
Design and Customization*), M&M pp.32-33.

## Where an accessory goes — what the books say

- **SR3 p.282** gives each accessory a **Mount**: Top, Under, Barrel, Top/under, or none. Imaging scopes "may only
  be top-mounted" (p.281); gas vents are barrel-mounted and "cannot be removed" (p.281); laser sights come "in
  underbarrel or top-mounting versions" (p.281).
- **Internal vs external smartgun** (SR3 p.281-282): "The internal smartgun system is built into the gun and
  doubles the weapon's cost if installed after manufacturing. The external system mounts on the weapon (top- or
  underbarrel positions)." M&M p.32 has the same pair for the Smartlink-2: External 800¥, Internal ×150%.
- **CC p.80:** each gun frame "can mount only one item in each possible mounting location" (top, underbarrel,
  barrel), and internal modifications take Frame Capacity Units (FCU) — the gun's equivalent of a cyberlimb's
  Equipment Capacity Units. Custom modifications are priced in Design Points × 8 = nuyen.

**In the packs today** the mount is only in the description text ("Mount: Top/Under"); there is no field, no
folder, nothing on a sheet. Several variants of one accessory share a bare name.

## Findings

### Names that drop the book's variant (lookalikes)

| Pack has | Book | Source |
| :--- | :--- | :--- |
| Gyro Mount 2,500¥ / Gyro Mount 6,000¥ | **Gyro Mount, Standard** / **Gyro Mount, Deluxe** | SR3 p.282 |
| Gyro Mount 7,800¥ (CC) | **Max-Gyro** | CC p.35 |
| Imaging Scope 500¥ / 800¥ / 1,200¥ | Imaging Scope, **Magnification 1 / 2 / 3** | SR3 p.282 |
| Smartlink level I (600¥) | **Smartgun, external** | SR3 p.282 |
| Smartlink level II (800¥) | Smartlink-2 Modification, **External** | M&M p.32 |
| Smart Goggles I (4,000¥) next to Smart Goggles level I (3,000¥) | Smart Goggles 3,000¥; **+1,000¥ for low-light or infrared** | SR3 p.281-282 |
| Smart Goggles II (Cost 3500¥) / (Cost 4500¥) | Smart Goggles 3,500¥; the 4,500¥ is the same +1,000¥ option | M&M p.32 |
| Extended Clip ( · Shock Pads (RC · Stock (Rigid | truncated upstream names: Extended Clip · Shock Pads · Stock (Rigid) | CC p.81, SR3 p.282, CC p.35 |

### ✅ Fixed in the gear builder — TODO 258

The accessories are generated (`tools/build-default-gear.mjs`), so these corrections are a table there,
`ACCESSORY_FIXES`, applied to the upstream rows, and the three gear packs were rebuilt from it
(`tests/weapon-mods.test.mjs`): the Sawed-Off price, the Rangefinder mount, the real sources of Smart Shades
I/II, Ultrasound Shades and Gas Vent I (in each description), and the low-power laser sight as the Cannon
Companion's (below). Renames, the mount field and the missing internal smartguns are TODO 259.

### Prices and mounts that disagree with the book

| Entry | Pack has | Book | Source |
| :--- | :--- | :--- | :--- |
| Sawed-Off Shotgun Barrel | 68¥ | DP +8 × 8 = **64¥** | CC p.83, p.80 |
| Rangefinder | Mount Top/Under | **Top** | CC p.33 |

Every other price checked matches (DP × 8 for the CC customisations: Custom Finish, Embossing, Extended Clip
2/round, Full-Auto, Personalized Grip, Remove Safety, Remove Trigger, Secondary Weapon, Voice Activation).

### Missing

- **Smartgun, internal** — "+100%" of the weapon's cost (SR3 p.282).
- **Smartlink-2 Modification, Internal** — "×150%" (M&M p.32).
- **Bayonet** — Underbarrel, 50¥, 6-A (CC p.33) — not in the accessories; to check against the melee packs.

### Cited to SR3 p.282 or M&M p.32, but not printed there — real sources

Upstream (`rawdata/SRCG-SR3-Gear.json`) cites `sr3.282` for all of them. Every text-layer book in both libraries
(SR3 and SR2) was searched.

| Entry | Real source |
| :--- | :--- |
| Smart Shades I 6,000¥ / 8,000¥ | **SR3 p.281**: smart goggles "may be built into a helmet or, for double the nuyen, rigged as mirrored sunglasses"; +1,000¥ for low-light or infrared. 2 × 3,000 and 2 × 4,000. |
| Smart Shades II 7,000¥ / 9,000¥ | the same SR3 p.281 rule applied to M&M p.32's Smart Goggles (3,500¥; 4,500¥ with the option). Derived, not printed. |
| Ultrasound Shades 2,200¥ | SR3 p.282 text: the goggles "may also be built into a helmet or sunglasses", with no price. 2 × 1,100¥ by analogy with p.281. Derived, not printed. |
| Laser Sight (Low Power) · Low Power Laser Sight 500¥ | **SR2 *Fields of Fire* p.93** (Target Designators): Low-power laser sight, −1, 500 m, .25, 6/36 hrs, 500¥, .9 — matches. `fof.60` was the wrong page. |
| Gas Vent I 250¥ | **not found.** SR3 prints II and III only (p.281-282); *Fields of Fire* p.92 prints II and III; the SR2 core book has no text layer. To check by eye. |

## Decided by the maintainer, 2026-10-23

1. **Mount:** a `mount` field on gear, filled from the book's Mount column, **and** the same four markings as
   the cyberlimb work: the book's variant names, pack folders by mount, a description line, a mount chip on
   the sheet. (Data-model change: full Foundry restart; the 0.7.1 migration fills owned copies.)
2. **The strays:** keep them, with the real citation above. For the low-power laser sight, whose real source
   (SR2 *Fields of Fire*) would park it with SR2: use the **Cannon Companion's** low-power laser customisation
   instead — DP +100 × 8 = 800¥, top or underbarrel (CC p.80, p.82) — one entry, in the CC gear pack.
3. **Internal smartguns:** add *Smartgun, internal* (SR3 p.282, +100% of the weapon) and *Smartlink-2
   Modification, Internal* (M&M p.32, ×150%) as accessory entries at 0¥ with the rule in the description;
   the GM sets the price.
