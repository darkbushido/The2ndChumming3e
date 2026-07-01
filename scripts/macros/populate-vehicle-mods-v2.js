// SR3E — Populate sr3e-vehicle-mods from GitHub source data
const PACK_ID = 'The2ndChumming3e.sr3e-vehicle-mods';
const IMG     = 'systems/The2ndChumming3e/styles/textures/vehicles-default.webp';
const URL     = 'https://raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/VehicleMods.json';

function toStr(v) { return String(v ?? ''); }
function toInt(v) { const n = parseInt(String(v ?? 0).replace(/[^0-9]/g, '')); return isNaN(n) ? 0 : n; }

let source;
try {
  source = await fetch(URL).then(r => r.json());
} catch (e) {
  return ui.notifications.error(`SR3E: Failed to fetch vehicle mods data — ${e.message}`);
}

const ITEMS = source.map(r => {
  // costNuyen can be a number (600) or string ("5% of vehicle cost")
  const costRaw  = r.costNuyen;
  const cost     = typeof costRaw === 'number' ? costRaw : toInt(costRaw);
  const desc     = [
    r.description,
    r.restrictions ? `Restrictions: ${r.restrictions}` : '',
    r.notes ?? '',
  ].filter(Boolean).join('<br>');

  return {
    name: toStr(r.name),
    type: 'vehicleMod',
    img:  IMG,
    system: {
      cost,
      availability:     toStr(r.availability),
      streetIndex:      toStr(r.streetIndex),
      installEquipment: toStr(r.equipment),
      installTime:      toStr(r.baseTimeHours),
      cfCost:           String(r.cfCustom ?? r.cfDesign ?? '0'),
      bookPage:         toStr(r.bookPage),
      description:      desc ? `<p>${desc}</p>` : '',
    },
  };
});

const pack = game.packs.get(PACK_ID);
if (!pack) return ui.notifications.error(`Pack not found: ${PACK_ID}`);

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let go = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate Vehicle Mods?' },
    content: `<p>${existing.length} existing entries will be deleted and replaced with ${ITEMS.length} from GitHub.</p>`,
    buttons: [
      { label: 'Repopulate', action: 'yes', default: true, callback: () => { go = true; } },
      { label: 'Cancel', action: 'cancel' },
    ],
  });
  if (!go) return;
}

await pack.configure({ locked: false });
for (const doc of await pack.getDocuments()) await doc.delete();

let created = 0;
for (const data of ITEMS) {
  try {
    const tmp = await Item.create(data, { renderSheet: false });
    await pack.importDocument(tmp);
    await tmp.delete();
    created++;
  } catch (err) {
    console.error(`SR3E | Failed "${data.name}":`, err);
  }
}

await pack.configure({ locked: true });
ui.notifications.info(`SR3E: ${created}/${ITEMS.length} vehicle mods imported.`);
