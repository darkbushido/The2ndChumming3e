# SR2 content — parked, not deleted

Moved out of the shipped system on 2026-09-24 (TODO 158, the maintainer: *"we will be adding sr2 stuff back in
the future but I need sr3 working now without confusion"*). Nothing here is loaded by Foundry.

## What is here

- `packs-src/<pack>/` — the **25 packs** of the six SR2-era books, exactly as they were in `packs-src/`
  (one JSON file per document): `sr2` (core), `ct` (Cybertechnology), `ssc` (Street Samurai Catalog),
  `st` (Shadowtech), `fof` (Fields of Fire), `pna` (Paranormal Animals).
- `system-json-packs.json` — the **exact `system.json` declaration** of each pack (`packs`) and the sidebar
  folder each sat in (`folders`, by path), so restoring is mechanical.

## What stayed, on purpose

- `SOURCE_BOOKS` still registers `sr2 ct ssc st fof pna` and `EDITIONS.SR2` still exists, so nothing about
  the source-book machinery has to be rebuilt.
- `rawdata/SRCG-SR2-Gear.json` (the vendored generator data) and the SR2 branch of
  `tools/build-default-gear.mjs` are untouched — the builder just skips an edition that is not playable.
- **Worlds keep their own copies** of any SR2 item a character already holds; only the compendium entries went.
- Nothing else in the repo links into these packs (checked: no `compendiumSource` outside them).

## Why the edition is hidden, not just the packs

With no SR2 pack shipping, offering "Shadowrun 2nd Edition" in the Edition setting would give a world an
empty compendium, and a world already saved as SR2 would see every SR3 book hidden. So
`PLAYABLE_EDITIONS` (`scripts/config.js`) lists only `SR3`; `SR3ESourceBooks.edition` falls back to SR3 for a
stored edition that is not in it, and the setting offers only playable editions.

## Bringing SR2 back

1. Move the packs home and rebuild them:
   ```bash
   git mv archive/sr2/packs-src/* packs-src/
   npm run packs:build
   ```
2. Re-add each entry of `system-json-packs.json` → `packs` to `system.json`, and each pack to the sidebar
   folder named in `folders` (create the folder path if a level is missing). Keep the file's 2-space
   formatting — a `JSON.stringify(…, null, 2)` round-trip is exact for this file.
3. Add `'SR2'` to `PLAYABLE_EDITIONS` in `scripts/config.js`.
4. `node tools/build-default-gear.mjs` regenerates the SR2 gear / ammunition / medical / drug packs.
5. **Verify the content against the books before shipping it** — the maintainer has the SR2 books. Known open
   points from when it was parked: eight grenades in `sr3e-sr2-projectiles` have `sr2.???` pages and damage
   values `gas`, `tear gas`, `-`, `(see rules)`; `Smoke (IR) Grenade` has skill `Projectile Weapons` and
   category `other`; **`Concussion Grenade` is `6M Stun` there, `12M Stun` in SR3** (SR3 p.283), which is an
   edition difference, not necessarily an error.
6. Update the tests that pin counts (`pack-sources`, `hands`, `gyro`, `fan-content`, `default-gear`) — each
   carries a comment naming the SR3-only figure and the SR2-inclusive one it replaced.
