// SR3E — Populate sr3e-adept-powers from GitHub source data
const PACK_ID = 'The2ndChumming3e.sr3e-adept-powers';
const IMG     = 'systems/The2ndChumming3e/styles/textures/adept-default.webp';
const URL     = 'https://raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/AdeptPowers.json';

function toStr(v)   { return String(v ?? ''); }
function toFloat(v) { return parseFloat(v) || 0; }

let source;
try {
  source = await fetch(URL).then(r => r.json());
} catch (e) {
  return ui.notifications.error(`SR3E: Failed to fetch adept powers data — ${e.message}`);
}

const ITEMS = source.map(r => {
  const desc = [r.Mods, r.Notes].filter(Boolean).join(' — ');
  return {
    name: toStr(r.Name),
    type: 'adeptPower',
    img:  IMG,
    system: {
      powerCost: toFloat(r.Cost),
      hasLevels: Boolean(r.HasLevels),
      level:     1,
      bookPage:  toStr(r.BookPage),
      description: desc ? `<p>${desc}</p>` : '',
    },
  };
});

const pack = game.packs.get(PACK_ID);
if (!pack) return ui.notifications.error(`Pack not found: ${PACK_ID}`);

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let go = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate Adept Powers?' },
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
ui.notifications.info(`SR3E: ${created}/${ITEMS.length} adept powers imported.`);
