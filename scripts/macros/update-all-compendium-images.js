// SR3E — Update images on all compendium entries. Leaves all stats untouched.
// Run as a GM Script macro.

const BASE = 'systems/The2ndChumming3e/styles/textures/';

const PACKS = [
  { id: 'The2ndChumming3e.sr3e-adept-powers',    img: `${BASE}adept-default.webp`               },
  { id: 'The2ndChumming3e.sr3e-agents',           img: `${BASE}agent-default.webp`               },
  { id: 'The2ndChumming3e.sr3e-armor',            img: `${BASE}armour-default.webp`              },
  { id: 'The2ndChumming3e.sr3e-bioware',          img: `${BASE}bioware-default.webp`             },
  { id: 'The2ndChumming3e.sr3e-cyberdecks',       img: `${BASE}cyberdeck-default.webp`           },
  { id: 'The2ndChumming3e.sr3e-cyberware',        img: `${BASE}cyberware-default.webp`           },
  { id: 'The2ndChumming3e.sr3e-drones',           img: `${BASE}drone-default.webp`               },
  { id: 'The2ndChumming3e.sr3e-drugs',            img: `${BASE}drugs-default.webp`               },
  { id: 'The2ndChumming3e.sr3e-firearms',         img: `${BASE}firearmsdefault.webp`             },
  { id: 'The2ndChumming3e.sr3e-hosts',            img: `${BASE}data-host-default.webp`           },
  { id: 'The2ndChumming3e.sr3e-ic',               img: `${BASE}agent-default.webp`               },
  { id: 'The2ndChumming3e.sr3e-medical',          img: `${BASE}medical-default.webp`             },
  { id: 'The2ndChumming3e.sr3e-programs',         img: `${BASE}programs-default.webp`            },
  { id: 'The2ndChumming3e.sr3e-projectiles',      img: `${BASE}projectile-weapons-default.webp`  },
  { id: 'The2ndChumming3e.sr3e-skills',           img: `${BASE}skills-default.webp`              },
  { id: 'The2ndChumming3e.sr3e-spells',           img: `${BASE}spells-default.webp`              },
  { id: 'The2ndChumming3e.sr3e-vehicle-mods',     img: `${BASE}vehicles-default.webp`            },
  { id: 'The2ndChumming3e.sr3e-vehicle-weapons',  img: `${BASE}vehicle-weapons-default.webp`     },
  { id: 'The2ndChumming3e.sr3e-vehicles',         img: `${BASE}vehicles-default.webp`            },
  { id: 'The2ndChumming3e.sr3e-melee',            img: `${BASE}melee-default.webp`               },
];

let totalUpdated = 0;

for (const { id, img } of PACKS) {
  const pack = game.packs.get(id);
  if (!pack) { console.warn(`SR3E: Pack not found — ${id}`); continue; }

  await pack.configure({ locked: false });
  const index   = await pack.getIndex();
  const updates = [...index].filter(d => d._id).map(d => ({ _id: d._id, img }));

  if (updates.length) {
    await pack.documentClass.updateDocuments(updates, { pack: pack.collection });
    totalUpdated += updates.length;
  }

  await pack.configure({ locked: true });
  console.log(`SR3E | ${id}: ${updates.length} force-updated.`);
}

ui.notifications.info(`SR3E: ${totalUpdated} images force-updated across ${PACKS.length} packs.`);
