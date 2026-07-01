// SR3E — Populate sr3e-spells from GitHub source data
const PACK_ID = 'The2ndChumming3e.sr3e-spells';
const IMG     = 'systems/The2ndChumming3e/styles/textures/spells-default.webp';
const URL     = 'https://raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/Spells.json';

// C/E = Combat (damage roll). All others = descriptive category string.
const CLASS_MAP = {
  C: 'Combat', E: 'Combat',
  D: 'Detection', H: 'Health', I: 'Illusion', N: 'Illusion',
  M: 'Manipulation', T: 'Manipulation', Z: 'Other',
};
const TYPE_MAP     = { P: 'Physical', M: 'Mana' };
const DURATION_MAP = { I: 'Instant', S: 'Sustained', P: 'Permanent', L: 'Limited', T: 'Task' };

function toStr(v) { return String(v ?? ''); }

let source;
try {
  source = await fetch(URL).then(r => r.json());
} catch (e) {
  return ui.notifications.error(`SR3E: Failed to fetch spells data — ${e.message}`);
}

const ITEMS = source.map(r => ({
  name: toStr(r.Name),
  type: 'spell',
  img:  IMG,
  system: {
    category:    CLASS_MAP[toStr(r.Class).trim()] ?? toStr(r.Class),
    type:        TYPE_MAP[toStr(r.Type).trim()]   ?? 'Physical',
    range:       toStr(r.Range),
    target:      toStr(r.Target),
    duration:    DURATION_MAP[toStr(r.Duration).trim()] ?? toStr(r.Duration),
    drain:       toStr(r.Drain),
    bookPage:    toStr(r.BookPage),
    description: r.Notes ? `<p>${r.Notes}</p>` : '',
  },
}));

const pack = game.packs.get(PACK_ID);
if (!pack) return ui.notifications.error(`Pack not found: ${PACK_ID}`);

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let go = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate Spells?' },
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
ui.notifications.info(`SR3E: ${created}/${ITEMS.length} spells imported.`);
