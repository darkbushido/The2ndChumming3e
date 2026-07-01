// ════════════════════════════════════════════════════════════════════════════
//  SR3E — Set default image for all hosts in the sr3e-hosts compendium
//  Paste into a Foundry macro (Type: Script) and run once.
// ════════════════════════════════════════════════════════════════════════════

const PACK_ID = 'The2ndChumming3e.sr3e-hosts';
const IMG     = 'systems/The2ndChumming3e/styles/textures/data-host-default.webp';

const pack = game.packs.get(PACK_ID);
if (!pack) {
  ui.notifications.error(`Pack not found: ${PACK_ID}`);
  return;
}

await pack.configure({ locked: false });

const docs = await pack.getDocuments();
const updates = docs.filter(d => d.img !== IMG).map(d => ({ _id: d.id, img: IMG }));

if (updates.length) {
  await pack.documentClass.updateDocuments(updates, { pack: pack.collection });
}

await pack.configure({ locked: true });
ui.notifications.info(`SR3E: ${updates.length} host image${updates.length !== 1 ? 's' : ''} updated.`);
