// SR3E — Populate sr3e-firearms from GitHub source data
// Fetches live JSON, clears the pack, re-imports with art.
// Run as a GM Script macro. Requires internet access.

const PACK_ID = 'The2ndChumming3e.sr3e-firearms';
const IMG     = 'systems/The2ndChumming3e/styles/textures/firearmsdefault.webp';
const URL     = 'https://raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/Firearms.json';

// Extract "(CategoryCode)" suffix from name, return { name, category }
function parseName(raw) {
  const m = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { name: m[1].trim(), category: m[2].trim() } : { name: raw.trim(), category: '' };
}

function toNum(v)   { return parseInt(String(v ?? 0).replace(/[^0-9]/g, '')) || 0; }
function toStr(v)   { return String(v ?? ''); }

// ── Fetch ─────────────────────────────────────────────────────────────────────

let source;
try {
  source = await fetch(URL).then(r => r.json());
} catch (e) {
  return ui.notifications.error(`SR3E: Failed to fetch firearms data — ${e.message}`);
}

// ── Map ───────────────────────────────────────────────────────────────────────

const ITEMS = source.map(r => {
  const { name, category } = parseName(r.Name ?? '');
  return {
    name,
    type: 'firearm',
    img: IMG,
    system: {
      category,
      concealability: toStr(r.Concealability),
      ammunition:     toStr(r.Ammunition),
      mode:           toStr(r.Mode),
      damage:         toStr(r.Damage),
      weight:         parseFloat(r.Weight) || 0,
      availability:   toStr(r.Availability),
      cost:           toNum(r.Cost),
      streetIndex:    toStr(r.StreetIndex),
      accessories:    toStr(r.Accessories),
      bookPage:       toStr(r.BookPage),
    },
  };
});

// ── Pack ─────────────────────────────────────────────────────────────────────

const pack = game.packs.get(PACK_ID);
if (!pack) return ui.notifications.error(`Pack not found: ${PACK_ID}`);

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let go = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate Firearms?' },
    content: `<p>${existing.length} existing entries will be deleted and replaced with ${ITEMS.length} entries from GitHub.</p>`,
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
ui.notifications.info(`SR3E: ${created}/${ITEMS.length} firearms imported.`);
