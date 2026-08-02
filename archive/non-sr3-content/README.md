# Archived non-SR3 compendium content

1,698 documents removed from the system's compendium packs, held here until they
are turned into their own modules. Nothing is lost — every document is stored
whole, including its original LevelDB key, so it can be restored exactly.

## Why

The system now ships **no sourcebook content**. Official SR3 books live in
`modules/sr3e-book-<code>/`, one module per book. Everything here is the
remainder: second-edition material, conversions from other systems, and fan
publications — none of which had a module yet, and all of which would otherwise
sit in the system's packs where they cannot be turned off.

## What is here

One JSON file per source pack, each an array of
`{ _key, bucket, doc }` — the original LevelDB key, the bucket it was
classified into, and the untouched document.

| Bucket | Docs | Contents |
|---|---:|---|
| `fan` | 1,215 | ray 658 · cb1-4 368 · cp 114 · nagee · pw · bjf · adh |
| `sr2` | 440 | sr2 · ct · ssc · st · fof · cs · gm2 · r2 · pna |
| `sr2-fan` | 41 | NERPS: ShadowLore |
| `unknown` | 2 | two MP7 entries whose `bookPage` holds an accessory list rather than a source |

By pack:

| Pack | Archived | Left in system |
|---|---:|---:|
| firearms | 880 | 5 |
| cyberware | 415 | 0 |
| armor | 125 | 0 |
| melee | 101 | 0 |
| bioware | 77 | 0 |
| drugs | 47 | 0 |
| projectiles | 20 | 0 |
| vehicle-mods | 17 | 0 |
| vehicle-weapons | 10 | 0 |
| adept-powers | 4 | 0 |
| vehicles | 2 | 0 |

The 625 documents still in the system are system-authored and belong to no book:
skills (438), Mr. Johnson's contacts (62), the Matrix Defragged ruleset
(cyberdecks 39, programs 30, IC 20, agents 17, hosts 10), example characters (4),
and 5 firearms with no `bookPage` at all.

## Restoring

Each entry carries the key it was stored under, so restoring is a direct write
back into the matching pack:

```js
// pseudo — see scripts in the repo history for the full helper
for (const { _key, doc } of JSON.parse(readFileSync('sr3e-cyberware.json'))) {
  await db.put(_key, doc);
}
```

Turning these into modules instead is the same generator that produced the SR3
book modules, run with different bucket definitions — it takes the buckets as a
parameter rather than hard-coding them.

## Caveats

- The `unknown` pair are corrupt `bookPage` values (`"Underbarrel Grip, Rail Mount"`),
  not a real source. Worth fixing rather than modularising.
- `ray` (Raygun's Firearms, 658 docs) is by far the largest single source here and
  may deserve its own module rather than being lumped with other fan material.
