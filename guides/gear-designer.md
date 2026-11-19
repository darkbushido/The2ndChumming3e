---
title: Gear Designer
nav_order: 7
---

# Gear Designer
{: .no_toc }

**[Open the Gear Designer](https://darkbushido.github.io/The2ndChumming3e/designer/latest/)** — a web page
for building a customised weapon or vehicle away from the table, then bringing it into
The 2nd Chumming in Foundry with one paste. Each release publishes its own frozen copy
at `designer/<version>/` (for example `designer/v0.9.0/`); `designer/latest/` is the newest.

1. TOC
{:toc}

## What it is

The designer runs the **same rules modules as the Foundry system** — the code that prices
weapon accessories and vehicle modifications in Foundry is copied into the page as it is.
So a price you see on the page is the price Foundry will work out, for the version of the
system that page came from. It shows names, numbers and page references only; read the
book for how a piece of gear works.

The page has two tabs: **🔫 Weapon** and **🚗 Vehicle (R3R)**. Every design ends on a price
step with two buttons: **🔗 Copy link** and **💾 Download JSON**.

## The Weapon tab

Four steps, shown across the top: **Weapon**, **Accessories**, **Ammunition**, **Price**.
A bar pinned above them shows the weapon's picture, a name you can type, and what the
build comes to so far — damage, mode, ammo, Concealability, recoil compensation from
accessories, smartgun and laser, cost, and what sits on each mount (Top, Barrel, Under).
A ⚠ chip counts warnings; hover it to read them.

### Step 1 — pick a weapon

**Category chips** across the top sort the weapons by type — Pistols, SMGs, Rifles,
Shotguns, Heavy weapons, Launchers, Melee and Other — each with a silhouette and a
count. Pick one and its weapons appear as **picture cards**: the picture (a drawn
silhouette where there's no artwork yet), a one-line summary such as "Heavy pistol · one
hand · smartgun", anything built in, the key stats (melee cards show Damage, Reach and
Concealability instead of mode and ammo), the price and the book page. Click a card to
choose it.

### Step 2 — accessories: the shop

Accessories sit on **shelves** by where they mount: **Top mount**, **Barrel**,
**Underbarrel**, and **No mount** for everything that takes no mount slot. A search box
narrows the shelf. Each card shows the accessory, its levels if it has them, and
**+ Add**.

Accessories that don't fit the weapon as you've built it so far are hidden. The switch
**Show the ones that don't fit** says how many are hidden; turn it on and they appear
with a dashed edge and the reason (for example, a weapon that already has its own stock, or an underbarrel grenade
launcher on anything smaller than an assault rifle — a house rule).
You can still add one: the designer warns, it never refuses. The Price step then lists
it as left out.

Everything you add goes into the **🛒 cart** beside the shelves, where you pick a level
for rated accessories, see which mount each one takes, and remove it again.

### Step 3 — ammunition

Ammunition cards, with a search box. Pick a type and how many to buy.

### Step 4 — price

One line per purchase — the weapon, each accessory, each lot of ammunition — with its
price and book page, then the total and any warnings. Copy the link or download the JSON
here.

## The Vehicle (R3R) tab

Two buttons choose how to start:

- **🛠 Design from a chassis (R3R)** — the same wizard as the 🛠 Vehicle Designer window
  in Foundry: **Chassis**, **Power plant**, **Design options**, **Mods**, then **Price &
  share**. It counts Design Points as well as nuyen. The Mods step is a shop like the
  weapon one: shelves, cards and a cart.
- **📖 Modify a book vehicle** — take a vehicle exactly as printed and add aftermarket
  modifications: **Vehicle** (type chips, then picture cards), **Modifications**, **Price**.
  Mods cost their printed price and take their Cargo Factor and Load; there are no Design
  Points, because the vehicle itself isn't being redesigned.

## The Armour tab

Three steps. **Armour** — chips for clothing, body armour, helmets and shields, then picture cards. **Modifications** — two
shelves: the Cannon Companion modifications (CC pp.52-53, gel packs among them) and the helmet options (SR3 p.284). Each mod
goes in the cart once; change its level there. Past the mod-point caps (CC p.52), a mod on a helmet or shield, two sets of
gel packs — all warned, never refused. **Price** — the bill (gel packs: the armour's price ×5 in all), and the armour as
built: Concealability, weight, Availability, Street Index and what it protects against. In Foundry it imports with its
mods inside it, not worn.

## Your design lives in the link

Nothing is stored — not on a server, not in your browser. As you work, the page writes
the whole design into its own address, after `#d=`. That link **is** the design:

- **🔗 Copy link** copies it. Bookmark it, paste it to your GM, or open it later and the
  page picks up where you left off.
- **💾 Download JSON** saves the same design as a `.sr3e-design.json` file.
- A link carries the price the page showed, but only so Foundry can tell you if its own
  sum differs. Editing the link can't make anything cheaper (below).
- A link made with an older version of the designer still opens; the page says which
  version made it and shows the figures with its own rules.

## Importing into Foundry

In Foundry, open the **Items** sidebar and click **📥 Import design** in its header (the
**SR3E Import Gear Design** macro opens the same dialog, as does
`game.sr3e.SR3EDesignImport.open()` from the console).

1. **Paste** the link — or the JSON file's text — into the box. The dialog looks every
   piece up in **this world's** compendiums and works the design out again with the
   system's rules, then shows what you'll get: the weapon and its accessories and
   ammunition, or the vehicle and its mods, with the recomputed price.
2. **Read the warnings** (amber). They include:
   - **the link's price disagrees with the rules** — the dialog shows both; the
     **recomputed** price is the one imported, so a hand-edited link that claims a
     lower price than the rules give is caught here, in front of the GM;
   - the same for Design Points and recoil compensation;
   - a piece this world doesn't have (a book turned off, or a newer pack);
   - a mount already taken, and a design made with a different system version.
3. **Choose where it goes** (weapons only): **Import onto** lists the characters you
   own, your own character first. The GM also gets **World item (Items directory)**.
4. Click **Import**. The design is imported despite any warnings — the warnings are for
   you and your GM to judge.

**Vehicles** work differently:

- A **chassis design** opens the **🛠 Vehicle Designer** window, filled in and on its
  summary. Check it there, then click its Create button; you own the new vehicle.
- A **book vehicle with mods** is copied from its compendium as your own vehicle, with the
  mods added at the price the page showed. This needs a GM connected.

{: .note }
> Imported items are ordinary items: every number on them can still be edited on the
> sheet, like anything else in the system.
