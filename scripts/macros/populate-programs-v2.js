// SR3E — Populate sr3e-programs from GitHub source data
// Source only provides Name + Multiplier; all other fields left at defaults.
const PACK_ID = 'The2ndChumming3e.sr3e-programs';
const IMG     = 'systems/The2ndChumming3e/styles/textures/programs-default.webp';
const URL     = 'https://raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/Programs.json';

function toStr(v) { return String(v ?? ''); }

let source;
try {
  source = await fetch(URL).then(r => r.json());
} catch (e) {
  return ui.notifications.error(`SR3E: Failed to fetch programs data — ${e.message}`);
}

const ITEMS = source.map(r => ({
  name: toStr(r.Name),
  type: 'program',
  img:  IMG,
  system: {
    multiplier: parseInt(r.Multiplyer) || parseInt(r.Multiplier) || 0,
  },
}));

const pack = game.packs.get(PACK_ID);
if (!pack) return ui.notifications.error(`Pack not found: ${PACK_ID}`);

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let go = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate Programs?' },
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
ui.notifications.info(`SR3E: ${created}/${ITEMS.length} programs imported.`);
