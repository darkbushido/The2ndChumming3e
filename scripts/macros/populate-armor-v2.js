// SR3E — Populate sr3e-armor from GitHub source data
const PACK_ID = 'The2ndChumming3e.sr3e-armor';
const IMG     = 'icons/svg/item-bag.svg';   // no armor-specific art yet
const URL     = 'https://raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/Armor.json';

function toInt(v)  { return parseInt(String(v ?? 0).replace(/[^0-9]/g, '')) || 0; }
function toStr(v)  { return String(v ?? ''); }
function parseNum(v) { const n = parseInt(v); return isNaN(n) ? 0 : n; }

let source;
try {
  source = await fetch(URL).then(r => r.json());
} catch (e) {
  return ui.notifications.error(`SR3E: Failed to fetch armor data — ${e.message}`);
}

const ITEMS = source.map(r => ({
  name: toStr(r.Name),
  type: 'armor',
  img:  IMG,
  system: {
    concealability: toStr(r.Concealability),
    ballistic:      parseNum(r.Ballistic),
    impact:         parseNum(r.Impact),
    weight:         parseFloat(r.Weight) || 0,
    availability:   toStr(r.Availability),
    cost:           toInt(r.Cost),
    streetIndex:    toStr(r.StreetIndex ?? r['Street Index']),
    bookPage:       toStr(r.BookPage ?? r['BookPage']),
  },
}));

const pack = game.packs.get(PACK_ID);
if (!pack) return ui.notifications.error(`Pack not found: ${PACK_ID}`);

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let go = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate Armor?' },
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
ui.notifications.info(`SR3E: ${created}/${ITEMS.length} armor items imported.`);
