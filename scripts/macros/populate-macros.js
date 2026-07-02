// SR3E — Populate sr3e-macros compendium from source files
//
// Run this whenever you add a new macro or change the JS content of an existing one.
// It fetches each source file from the system path and creates/updates the compendium entry.
//
// Icon (img) changes: edit the macro directly IN THE COMPENDIUM (unlock → edit → lock).
// Those changes write straight to the LevelDB pack files and can be committed to git.
// This script preserves the existing img when updating — only the command is overwritten.

const PACK_ID = 'The2ndChumming3e.sr3e-macros';
const BASE    = 'systems/The2ndChumming3e/scripts/macros/';
const DEFAULT_IMG = 'systems/The2ndChumming3e/styles/textures/Shadowrun-logo.svg';

// ── Macro manifest ────────────────────────────────────────────────────────────
// Add an entry here for each macro you want in the compendium.
// img is only used when creating a NEW entry; edits to img in Foundry are preserved.

const MACROS = [
  {
    name: 'Import Nullsheen 3e Character json',
    file: 'import-sr3-character.js',
    img:  DEFAULT_IMG,
  },
];

// ── Populate ──────────────────────────────────────────────────────────────────

const pack = game.packs.get(PACK_ID);
if (!pack) return void ui.notifications.error(`SR3E Macros: pack not found — ${PACK_ID}`);

await pack.configure({ locked: false });
const existing = await pack.getDocuments();

let created = 0, updated = 0, failed = 0;

for (const meta of MACROS) {
  // Fetch the JS source from the system's served files.
  let command;
  try {
    const res = await fetch(BASE + meta.file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    command = await res.text();
  } catch (e) {
    ui.notifications.error(`SR3E Macros: could not load "${meta.file}" — ${e.message}`);
    failed++;
    continue;
  }

  const doc = existing.find(m => m.name === meta.name);
  if (doc) {
    // Update command only — preserves any icon the user set in Foundry.
    await doc.update({ command });
    updated++;
  } else {
    // First time: create with the default img from the manifest above.
    const tmp = await Macro.create(
      { name: meta.name, type: 'script', img: meta.img, command, scope: 'global' },
      { renderSheet: false }
    );
    await pack.importDocument(tmp);
    await tmp.delete();
    created++;
  }
}

await pack.configure({ locked: true });
ui.notifications.info(
  `SR3E Macros: ${created} created · ${updated} updated` +
  (failed ? ` · ${failed} failed (check console)` : '')
);
