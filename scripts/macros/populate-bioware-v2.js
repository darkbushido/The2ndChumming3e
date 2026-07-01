// SR3E — Populate sr3e-bioware from GitHub source data
const PACK_ID = 'The2ndChumming3e.sr3e-bioware';
const IMG     = 'systems/The2ndChumming3e/styles/textures/bioware-default.webp';
const URL     = 'https://raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/Bioware.json';

function toStr(v)   { return String(v ?? ''); }
function toInt(v)   { return parseInt(String(v ?? 0).replace(/[^0-9]/g, '')) || 0; }
function toFloat(v) { return parseFloat(v) || 0; }

let source;
try {
  source = await fetch(URL).then(r => r.json());
} catch (e) {
  return ui.notifications.error(`SR3E: Failed to fetch bioware data — ${e.message}`);
}

const ITEMS = source.map(r => {
  const bi   = toFloat(r.BioIndex);
  const cost = toInt(r.Cost);
  const si   = toFloat(r.StreetIndex);
  // Source Type: "s"=Standard, "c"=Cultured — stored in description since schema has no grade field
  const typeLabel = { s: 'Standard', c: 'Cultured' }[toStr(r.Type).toLowerCase()] ?? toStr(r.Type);
  const desc = [typeLabel ? `Type: ${typeLabel}` : '', r.Mods, r.Notes].filter(Boolean).join(' — ');
  return {
    name: toStr(r.Name),
    type: 'bioware',
    img:  IMG,
    system: {
      bioIndex:         bi,
      bioIndexBase:     bi,
      grade:            'Standard',
      rating:           0,
      cost,
      costBase:         cost,
      availability:     toStr(r.Availability),
      availabilityBase: toStr(r.Availability),
      streetIndex:      si,
      mods:             toStr(r.Mods),
      biowareCategory:  typeLabel,
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
    window: { title: 'Repopulate Bioware?' },
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
ui.notifications.info(`SR3E: ${created}/${ITEMS.length} bioware items imported.`);
