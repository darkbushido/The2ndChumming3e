# SRCG-* — vendored upstream data

Snapshots of the Shadowrun Character Generator's data
(`criticalfault/Shadowrun-Character-Generator`, `src/data/`; the maintainer's fork
`darkbushido/Shadowrun-Character-Generator`), committed so a pack build is reproducible and an
upstream change becomes a reviewable diff (TODO 12, step 1).

All at upstream commit `6487898e090bf0f3cf987a0cd2696eabd919853f` (2026-07-29), copied from a clean
checkout:

| File | Upstream path | Consumed by |
|---|---|---|
| `SRCG-SR3-Gear.json` | `src/data/SR3/Gear.json` | `tools/build-default-gear.mjs` |
| `SRCG-SR2-Gear.json` | `src/data/SR2/Gear.json` | `tools/build-default-gear.mjs` |
| `SRCG-SR3-Cyberware.json` | `src/data/SR3/Cyberware.json` | reference — see below |
| `SRCG-SR3-Bioware.json` | `src/data/SR3/Bioware.json` | reference |
| `SRCG-SR3-Firearms.json` | `src/data/SR3/Firearms.json` | reference |
| `SRCG-SR3-Spells.json` | `src/data/SR3/Spells.json` | reference |
| `SRCG-SR3-Vehicles.json` | `src/data/SR3/Vehicles.json` | reference |
| `SRCG-SR3-Drones.json` | `src/data/SR3/Drones.json` | reference |
| `SRCG-SR3-AdeptPowers.json` | `src/data/SR3/AdeptPowers.json` | reference (`tools/build-mods-bonuses.mjs` reads the upstream checkout) |
| `SRCG-SR3-Programs.json` | `src/data/SR3/Programs.json` | reference |
| `SRCG-SR3-VehicleMods.json` | `src/data/SR3/VehicleMods.json` | reference |
| `SRCG-SR3-VehicleWeapons.json` | `src/data/SR3/VehicleWeapons.json` | reference |

**"Reference"** — these are the files the retired `populate-*-v2.js` macros (deleted, TODO 1) fetched live. The shipped
packs are no longer rebuilt from them: since TODO 12 every pack's exact content lives in
`packs-src/` (see `tools/packs.mjs`), which carries every correction made since the import. They are
pinned so a future re-import is a reviewable diff against a known snapshot, not a live fetch.

Refresh by copying the upstream files over these and recording the new commit here; then rebuild
and review the pack diff.
