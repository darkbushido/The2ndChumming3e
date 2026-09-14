# SRCG-* — vendored upstream data

Snapshots of the Shadowrun Character Generator's data
(`criticalfault/Shadowrun-Character-Generator`, `src/data/`), committed so a pack build is
reproducible and an upstream change becomes a reviewable diff (TODO 12, step 1).

| File | Upstream path | Commit |
|---|---|---|
| `SRCG-SR3-Gear.json` | `src/data/SR3/Gear.json` | `6487898e090bf0f3cf987a0cd2696eabd919853f` (2026-07-29) |
| `SRCG-SR2-Gear.json` | `src/data/SR2/Gear.json` | `6487898e090bf0f3cf987a0cd2696eabd919853f` (2026-07-29) |

Consumed by `tools/build-default-gear.mjs`. Refresh by copying the upstream files over these and
recording the new commit here; then rebuild and review the pack diff.
