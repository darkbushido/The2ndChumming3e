// SR3E — Populate sr3e-cyberware from GitHub source data (replaces hand-coded version)
const PACK_ID = 'The2ndChumming3e.sr3e-cyberware';
const IMG     = 'systems/The2ndChumming3e/styles/textures/cyberware-default.webp';
const URL     = 'https://raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/Cyberware.json';

function toStr(v)   { return String(v ?? ''); }
function toInt(v)   { return parseInt(String(v ?? 0).replace(/[^0-9]/g, '')) || 0; }
function toFloat(v) { return parseFloat(v) || 0; }

let source;
try {
  source = await fetch(URL).then(r => r.json());
} catch (e) {
  return ui.notifications.error(`SR3E: Failed to fetch cyberware data — ${e.message}`);
}

const ITEMS = source.map(r => {
  const ess  = toFloat(r.EssCost);
  const cost = toInt(r.Cost);
  const si   = toFloat(r.StreetIndex);
  const desc = [r.Notes, r.Mods].filter(Boolean).join(' — ');
  return {
    name: toStr(r.Name),
    type: 'cyberware',
    img:  IMG,
    system: {
      essenceCost:      ess,
      essenceCostBase:  ess,
      grade:            'Standard',
      rating:           0,
      cost,
      costBase:         cost,
      availability:     toStr(r.Availability),
      availabilityBase: toStr(r.Availability),
      streetIndex:      si,
      legalCode:        toStr(r.LegalCode),
      mods:             toStr(r.Mods),
      capacity:         toFloat(r.Capacity),
      cyberwareCategory: toStr(r.Category),
      isReplacement:    false,
      bookPage:         toStr(r.BookPage),
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
    window: { title: 'Repopulate Cyberware?' },
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
ui.notifications.info(`SR3E: ${created}/${ITEMS.length} cyberware items imported.`);
