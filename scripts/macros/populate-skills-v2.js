// SR3E — Populate sr3e-skills from GitHub source data
const PACK_ID = 'The2ndChumming3e.sr3e-skills';
const IMG     = 'systems/The2ndChumming3e/styles/textures/skills-default.webp';
const URL     = 'https://raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/ActiveSkills.json';

const ATTR_MAP = {
  QCK: 'quickness', STR: 'strength', INT: 'intelligence', BOD: 'body',
  WIL: 'willpower', CHA: 'charisma', REA: 'reaction',    MAG: 'magic',
};

function toStr(v) { return String(v ?? ''); }

let source;
try {
  source = await fetch(URL).then(r => r.json());
} catch (e) {
  return ui.notifications.error(`SR3E: Failed to fetch skills data — ${e.message}`);
}

const ITEMS = source.map(r => {
  const specs = (r.specializations ?? [])
    .filter(s => s.name && !s.name.includes('->'))  // skip "weapon->" placeholders
    .map(s => ({ name: toStr(s.name), level: 1 }));
  return {
    name: toStr(r.name),
    type: 'skill',
    img:  IMG,
    system: {
      rating:          0,
      skillType:       'active',
      linkedAttribute: ATTR_MAP[toStr(r.attribute).trim().toUpperCase()] ?? 'quickness',
      specialisations: specs,
      bookPage:        toStr(r.source),
    },
  };
});

const pack = game.packs.get(PACK_ID);
if (!pack) return ui.notifications.error(`Pack not found: ${PACK_ID}`);

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let go = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate Skills?' },
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
ui.notifications.info(`SR3E: ${created}/${ITEMS.length} skills imported.`);
