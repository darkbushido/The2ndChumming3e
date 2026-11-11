# Web gear designer — proposal

Status: **weapons v1 built on `claude/web-gear-designer-37eb2b`** (design settled with the maintainer 2026-11-11). TODO 298.

## What it is

A stateless page on GitHub Pages where players design SR3 gear and bring the result into a Foundry game.

## Decisions

| Area | Decision |
|---|---|
| **Scope** | Eventually everything the system designs (weapons, vehicles, later maybe cyberware/decks). **v1 = weapons**: accessories and mods, mounts, integral items, ammo. Vehicles (R3R, TODO 287/297) come next. |
| **Relation to the in-Foundry designer** | **One shared core.** Both UIs call the same pure modules in `scripts/data/` (`item-mods.mjs`, `integral-mods.mjs`, `mod-effects.mjs`, `vehicle-design*.mjs`, `design-options.mjs`, `vehicle-mounts.mjs`). Only the shell differs (DOM page vs ApplicationV2). No Foundry globals may enter those modules — a source-level test should enforce it. |
| **Public data** | **Stats + book/page only**: names, numbers (cost, availability, ratings, mount points…) and a "SR3 p.NN" cite. No descriptions or rule text. ⚠ Never anything from `SR-OCR/`. |
| **Hosting** | Same repo, Pages subfolder: `/designer/vX.Y.Z/` (frozen) and `/designer/latest/`, published by `release.yml` beside the guides. |
| **Build** | No bundler. `tools/build-designer.mjs` writes a stats-only catalogue from `packs-src/` through a **field allow-list** (a test asserts no other field leaks) and copies the `scripts/data` modules as-is; the page is plain ES modules. |
| **State** | URL hash (deflate via `CompressionStream` + base64url) for sharing, plus a downloadable `.json` with the same payload. |
| **Payload** | **References + choices**: pack ids of the base item and each mod, plus mount slot, rating, ammo and the like. Foundry rebuilds from its own packs and re-runs the rules. Carries `schema` and `systemVersion`. |
| **Versioning** | Links point at the versioned page by default. Foundry imports any version, recomputes, and warns when versions differ. Schema changes get an upgrade function. |
| **Import into Foundry** | A **paste dialog** (link or JSON) and a **URL-hash macro** in a compendium. Both call one importer. File-drop on a sheet is not in v1. |
| **Validation** | Recompute, warn, import. Foundry's numbers win. A summary lists every mismatch and unknown id, and the user can still import ("warn, never refuse"). |
| **Target** | A chosen actor the user owns (`isLiveActor`, `actorRef`). The GM may also create a world Item. Vehicles will go through `sr3e.actor.create` and the designer's create path. |

## Pieces to build (when approved)

1. `scripts/data/design-codec.mjs`: encode/decode, schema upgrade (pure, unit-tested).
2. `scripts/data/design-import.mjs`: resolve refs, recompute, diff → warnings (pure).
3. Foundry side: paste dialog (`DialogV2.wait`), compendium macro, item creation on the chosen actor.
4. `tools/build-designer.mjs` + allow-list test; `designer/` page source; a `release.yml` step.
5. Tests: codec round-trip, mismatch warnings, allow-list, no-Foundry-globals in shared modules, a mutant for the recompute.

## Open / later

- Homebrew items (snapshot fallback) — deliberately out of v1.
- Vehicles, then cyberware/decks, each as its own TODO.
