#!/usr/bin/env node
/**
 * SR3E — Set default images on all compendium entries via direct LevelDB edit.
 *
 * ⚠  CLOSE FOUNDRY before running this script — LevelDB only allows one writer.
 *
 * One-time setup (run from the system root):
 *   npm install classic-level
 *
 * Then run:
 *   node scripts/update-compendium-images.mjs
 */

import { ClassicLevel } from 'classic-level';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKS_DIR = path.resolve(__dirname, '../packs');
const BASE      = 'systems/The2ndChumming3e/styles/textures/';

const PACKS = [
  { name: 'sr3e-adept-powers',    img: `${BASE}adept-default.webp`               },
  { name: 'sr3e-agents',          img: `${BASE}agent-default.webp`               },
  { name: 'sr3e-armor',           img: `${BASE}armour-default.webp`              },
  { name: 'sr3e-bioware',         img: `${BASE}bioware-default.webp`             },
  { name: 'sr3e-cyberdecks',      img: `${BASE}cyberdeck-default.webp`           },
  { name: 'sr3e-cyberware',       img: `${BASE}cyberware-default.webp`           },
  { name: 'sr3e-drones',          img: `${BASE}drone-default.webp`               },
  { name: 'sr3e-drugs',           img: `${BASE}drugs-default.webp`               },
  { name: 'sr3e-firearms',        img: `${BASE}firearmsdefault.webp`             },
  { name: 'sr3e-hosts',           img: `${BASE}data-host-default.webp`           },
  { name: 'sr3e-ic',              img: `${BASE}agent-default.webp`               },
  { name: 'sr3e-medical',         img: `${BASE}medical-default.webp`             },
  { name: 'sr3e-melee',           img: `${BASE}melee-default.webp`               },
  { name: 'sr3e-programs',        img: `${BASE}programs-default.webp`            },
  { name: 'sr3e-projectiles',     img: `${BASE}projectile-weapons-default.webp`  },
  { name: 'sr3e-skills',          img: `${BASE}skills-default.webp`              },
  { name: 'sr3e-spells',          img: `${BASE}spells-default.webp`              },
  { name: 'sr3e-vehicle-mods',    img: `${BASE}vehicles-default.webp`            },
  { name: 'sr3e-vehicle-weapons', img: `${BASE}vehicle-weapons-default.webp`     },
  { name: 'sr3e-vehicles',        img: `${BASE}vehicles-default.webp`            },
];

// Matches top-level document keys: !items!<id> or !actors!<id>
// Excludes sub-documents (!actors.items!…) and metadata (!folders!…)
const TOP_LEVEL = /^!(?:items|actors)![^.]+$/;

let grandTotal = 0;

for (const { name, img } of PACKS) {
  const packPath = path.join(PACKS_DIR, name);

  if (!existsSync(packPath)) {
    console.log(`  ${name}: SKIPPED — directory not found`);
    continue;
  }

  const db = new ClassicLevel(packPath);
  await db.open();

  let updated = 0;
  let skipped = 0;

  try {
    const batch = db.batch();

    for await (const [key, rawValue] of db.iterator()) {
      if (!TOP_LEVEL.test(key)) continue;

      let doc;
      try { doc = JSON.parse(rawValue); } catch { continue; }

      if (doc.img === img) { skipped++; continue; }

      batch.put(key, JSON.stringify({ ...doc, img }));
      updated++;
    }

    await batch.write();
    grandTotal += updated;
    console.log(`  ${name}: ${updated} updated, ${skipped} already correct`);
  } catch (err) {
    console.error(`  ${name}: ERROR — ${err.message}`);
  } finally {
    await db.close();
  }
}

console.log(`\nDone. ${grandTotal} entries updated across ${PACKS.length} packs.`);
