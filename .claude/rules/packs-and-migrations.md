---
paths:
  - "packs-src/**"
  - "packs/**"
  - "tools/**"
  - "scripts/SR3EMigrations.js"
  - "scripts/SR3EPackRepair.js"
---

# Compendium packs and world migrations

Moved out of `CLAUDE.md` (TODO 291, approved by the maintainer 2026-11-07). `CLAUDE.md` keeps a short ⚠ summary.

### Compendium packs — how they are ACTUALLY changed

| | |
|---|---|
| **`packs-src/<pack>/`** | **The source of truth.** One JSON file per document, `{ _key, doc, embedded }` (exact LevelDB key and value; an actor's items in its file). `tools/lib/pack-source.mjs`. |
| **`packs/<pack>/`** (LevelDB) | **Build output**, committed because Foundry installs from the branch zip. `npm run packs:build` compiles changed packs. |
| The install | `npm run packs:install` — one-way copy from `packs-src` (Foundry CLOSED). Never link the install to the checkout. |
| Upstream data | Vendored `rawdata/SRCG-*` (`rawdata/SRCG-README.md`); `tools/build-default-gear.mjs` and `tools/build-odm-packs.mjs` generate from it. |

- ⚠ **Pack merge conflict**: merge the JSON in `packs-src/`, then `npm run packs:build` — never hand-pick LevelDB files.
- ⚠ Tools that write LevelDB refresh `packs-src` themselves (`extractPack`); any other writer must be followed by
  `npm run packs:extract`. `tests/pack-sources.test.mjs` fails on drift and proves the build reproduces every
  pack. `npm run packs:src:check` is the read-only comparison.
- `tests/macros.test.mjs` fails if anything names a deleted `populate-*.js` macro.

**Editing a pack with a tool** — read `tools/check-packs.mjs`, `tools/patch-johnson-stats.mjs`,
`tools/import-johnson-gear.mjs` first.

```js
import { ClassicLevel } from 'classic-level';
const db = new ClassicLevel(packPath, { valueEncoding: 'json' });
await db.open();                       // throws if Foundry holds the lock
for await (const [key, doc] of db.iterator()) { /* … */ }
await db.put(key, doc);
await db.close();
```

- ⚠ **Foundry must be CLOSED even to READ** (one process per LevelDB). Report a lock as "close Foundry".
- ⚠ **Reading the checkout's packs must go through a copy** (`tools/lib/pack-copy.mjs`) — opening a LevelDB
  rewrites its log/MANIFEST even for a read. `tests/pack-churn.test.mjs` enforces it.
- ⚠ **Two copies of every pack; Foundry reads the install's.** `scripts/`, `styles/`, `lang/` are junctions into
  the checkout; `packs/` and `system.json` are NOT (`npm run sync:install` never copies packs). **Run every pack
  tool twice** — plain and `--install`.
- ⚠ **Index against the REPO's packs, never the install's** (it carries 22 undeclared pre-split packs; UUIDs into
  them are dead for everyone else). **Diff the two copies afterwards.**
- ⚠ **Keys are structural**: `!items!<id>` · `!actors!<id>` · `!actors.items!<actorId>.<itemId>` · `!folders!<id>`.
  An embedded item needs its own key **and** its id in the actor's `items` array. Sweeps must cover Actor packs too.
- ⚠ **Derive ids, never randomise** (`idFor()` in `patch-johnson-stats.mjs`) — re-runs must reuse keys.
- ⚠ Verify with `npm run packs:check:repo`.

**In-Foundry creation (reference only — not how packs are maintained):** `Item.createDocuments(items, { pack })`
imports 0 items; the working call is a temporary world document + `pack.importDocument(tmp)` + `tmp.delete()`
inside `pack.configure({ locked: false/true })` (`Actor.create` for actor packs). Such documents carry full
scaffolding (`_stats`, `ownership`, `sort`, `folder`) — the signature `check-packs.mjs` uses to spot install drift.

### Pack integrity — `npm run packs:check`

```bash
npm run packs:check                     # the local install
npm run packs:check:repo                # this checkout's packs/
node tools/check-packs.mjs <path>       # any other install
npm run packs:fix                       # remove SAFE duplicates only
```

Read-only by default; exits 1 on a fault. Checks null/missing `_id`s, key/`_id` disagreement, duplicate `_id`s,
manifest packs missing on disk. Undeclared packs on disk are information. Also reports (information) blank/`???`
`system.bookPage` and pages naming another book — one reader, `scripts/data/book-page.mjs` (`BookPage.*`,
`CODE_ALIASES` maps upstream `sta2` → `sota2`); pages filled from `tools/data/book-pages.json` by
`tools/fill-book-pages.mjs`; `tests/book-page.test.mjs` ratchets the missing count.
- Malformed `!items!null` records are **install drift** (from running macros against a live install), not repo faults.
- ⚠ **`--fix` deletes only what it can PROVE redundant**: a malformed record with a byte-identical properly-keyed
  twin in the same pack, comparing without `prototypeToken`/scaffolding, against **any** identical twin (names repeat).

### World migrations — `scripts/SR3EMigrations.js`

⚠ **Foundry EMBEDS items, it doesn't link them** — a pack fix changes nothing for owned copies. So a pack
correction needs **both** the pack change and a migration.
- **Adding one:** append to `MIGRATIONS` numbered by the release it ships in — a migration above the stamped
  version re-runs every load (`tests/migrations.test.mjs` fails until the release bumps `system.json`).
- **Fill blanks, never overwrite** (`_fillBlank`; `0` and `''` count as unset, so target specific items).
  Overwriting hooks (`fixItem`, `fixActor`) must argue their case at the call site.
- **Idempotent.** A failed run leaves the stamp so the next load retries.
- ⚠ **Three populations**: world actors, world items, and **unlinked token actors on every scene**.
- Compendium packs are **not** migrated (fix the pack file) — with one exception: **`SR3EPackRepair`**
  (TODO 162, `scripts/SR3EPackRepair.js`, `data/pack-repair.mjs`). At `ready` the active GM's client removes an
  older build's `!items!null` entry over the socket (`modifyDocument` delete, id `'null'`), **only when an
  identical properly keyed twin exists** (the `--fix` rule), re-locking the pack in a `finally`. Runs every load,
  never blocks the world (`tests/pack-repair.test.mjs`).
- Changed **setting defaults** go in `SR3EMigrations.DEFAULT_CHANGES` (Foundry stores only set values).
- Gated to `game.users.activeGM`. `game.sr3e.SR3EMigrations.force()` re-runs everything (safe by rule 1 — and an overwriting
  `fixActor` that recognises an old default must skip a value the 📒 Ledger shows was written, `Ledger.touched`:
  a burned Karma Pool can land back on the old default).
