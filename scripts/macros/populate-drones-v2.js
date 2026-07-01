// SR3E — Populate sr3e-drones from GitHub source data (vehicle actors, type=drone)
const PACK_ID = 'The2ndChumming3e.sr3e-drones';
const IMG     = 'systems/The2ndChumming3e/styles/textures/drone-default.webp';
const URL     = 'https://raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/Drones.json';

function toStr(v)  { return String(v ?? ''); }
function toInt(v)  { return parseInt(String(v ?? 0).replace(/[^0-9]/g, '')) || 0; }
function slashPair(raw, def = 0) {
  if (!raw || raw === '-') return [def, def];
  const parts = toStr(raw).split('/');
  return [parseInt(parts[0]) || def, parseInt(parts[1]) || def];
}

let source;
try {
  source = await fetch(URL).then(r => r.json());
} catch (e) {
  return ui.notifications.error(`SR3E: Failed to fetch drones data — ${e.message}`);
}

const ACTORS = source.map(r => {
  const [handOn, handOff] = slashPair(r.Handling);
  const [speed, accel]    = slashPair(r['Speed/Accel']);
  const [body, armor]     = slashPair(r['Body/Armor']);
  const [sig, autonav]    = slashPair(r['Sig/Autonav']);
  const [pilot, sensor]   = slashPair(r['Pilot/Sensor']);
  const [cargo, load]     = slashPair(r['Cargo/Load']);
  const cost              = toInt(r['$Cost'] ?? r.Cost);
  const si                = parseFloat(r['Street Index'] ?? r.StreetIndex) || 0;

  return {
    name:   toStr(r.name ?? r.Name),
    type:   'vehicle',
    img:    IMG,
    flags:  { 'The2ndChumming3e': { isTemplate: true } },
    system: {
      vehicleType:  'drone',
      seating:      0,
      cost,
      streetIndex:  si,
      availability: toStr(r.Availability),
      bookPage:     toStr(r['Book.Page'] ?? r.BookPage ?? r.Source),
      notes:        r.Notes ? `<p>${r.Notes}</p>` : '',
      attributes: {
        handling:        { value: handOn,  base: handOn  },
        handlingOffRoad: { value: handOff, base: handOff },
        speed:           { value: speed,   base: speed   },
        accel:           { value: accel,   base: accel   },
        body:            { value: body,    base: body    },
        armor:           { value: armor,   base: armor   },
        sig:             { value: sig,     base: sig     },
        autonav:         { value: autonav, base: autonav },
        pilot:           { value: pilot,   base: pilot   },
        sensor:          { value: sensor,  base: sensor  },
        cargo:           { value: cargo,   base: cargo   },
        load:            { value: load,    base: load    },
      },
    },
  };
});

const pack = game.packs.get(PACK_ID);
if (!pack) return ui.notifications.error(`Pack not found: ${PACK_ID}`);

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let go = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate Drones?' },
    content: `<p>${existing.length} existing entries will be deleted and replaced with ${ACTORS.length} from GitHub.</p>`,
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
for (const data of ACTORS) {
  try {
    const tmp = await Actor.create(data, { renderSheet: false });
    await pack.importDocument(tmp);
    await tmp.delete();
    created++;
  } catch (err) {
    console.error(`SR3E | Failed "${data.name}":`, err);
  }
}

await pack.configure({ locked: true });
ui.notifications.info(`SR3E: ${created}/${ACTORS.length} drones imported.`);
