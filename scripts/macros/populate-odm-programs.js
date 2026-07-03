// SR3E — Populate sr3e-odm-programs from local rawdata/ODM-Programs.json
// Orthodox SR3 programs: Name, size multiplier, category, brief description.
// Size (Mp) = Rating² × Multiplier. Run as a world macro (GM only).

const PACK_ID = 'The2ndChumming3e.sr3e-odm-programs';
const IMG     = 'systems/The2ndChumming3e/styles/textures/programs-default.webp';

// ── Program data with categories and descriptions ─────────────────────────────
// category: 'utility' | 'comms' | 'attack' | 'defense'
// multiplier: from ODM-Programs.json (note: source spells it "Multiplyer")

const PROGRAMS = [
  // ── General Utilities ────────────────────────────────────────────────────────
  { name: 'Analyze',        mult: 3, cat: 'utility',  desc: 'Analyzes a program or IC to determine its rating, type, and options.' },
  { name: 'Browse',         mult: 1, cat: 'utility',  desc: 'Searches host files for specific data. Open Test; TN set by host.' },
  { name: 'Camo',           mult: 3, cat: 'utility',  desc: 'Camouflages the decker\'s icon; makes it harder to detect in SAN or SPU.' },
  { name: 'Crash',          mult: 3, cat: 'utility',  desc: 'Forces a program out of active memory. Opposed vs. target program rating.' },
  { name: 'Deception',      mult: 2, cat: 'utility',  desc: 'Spoofs the decker\'s Detection Factor, making them appear to be a different type of icon.' },
  { name: 'Decrypt',        mult: 1, cat: 'utility',  desc: 'Decrypts encrypted data or scrambled communications.' },
  { name: 'Defuse',         mult: 2, cat: 'utility',  desc: 'Disarms a Data Bomb without triggering it. Opposed vs. Data Bomb rating.' },
  { name: 'Doorstop',       mult: 2, cat: 'utility',  desc: 'Holds a logical door or access port open so the decker can pass freely.' },
  { name: 'Encrypt',        mult: 1, cat: 'utility',  desc: 'Encrypts data files or communications to a chosen rating.' },
  { name: 'Evaluate',       mult: 2, cat: 'utility',  desc: 'Assesses the value or content of a file without opening it.' },
  { name: 'Mirrors',        mult: 3, cat: 'utility',  desc: 'Deflects Trace IC back toward its own host, temporarily confusing pursuit.' },
  { name: 'Purge',          mult: 2, cat: 'utility',  desc: 'Removes a program from active memory (own programs only; use Crash for others).' },
  { name: 'Read/Write',     mult: 2, cat: 'utility',  desc: 'Reads or writes data files within the host.' },
  { name: 'Redecorate',     mult: 2, cat: 'utility',  desc: 'Alters the visual appearance of the decker\'s icon within the host.' },
  { name: 'Relocate',       mult: 2, cat: 'utility',  desc: 'Moves a program from one memory location to another within the cyberdeck.' },
  { name: 'Scanner',        mult: 3, cat: 'utility',  desc: 'Detects IC and other icons within the current subsystem.' },
  { name: 'Sniffer',        mult: 3, cat: 'utility',  desc: 'Intercepts data packets passing through the host\'s communication channels.' },
  { name: 'Snooper',        mult: 2, cat: 'utility',  desc: 'Eavesdrops on communications within the current subsystem.' },
  { name: 'Spoof',          mult: 3, cat: 'utility',  desc: 'Spoofs system commands, making the host believe orders came from a legitimate source.' },
  { name: 'Swerve',         mult: 3, cat: 'utility',  desc: 'Evasion utility used during trace or pursuit; helps the decker evade IC or system alerts.' },
  { name: 'Triangulation',  mult: 2, cat: 'utility',  desc: 'Traces the origin of a communication or icon to a physical location.' },
  { name: 'Validate',       mult: 4, cat: 'utility',  desc: 'Validates data or passkeys; confirms authenticity of files or access codes.' },
  { name: 'Sleaze',         mult: 3, cat: 'utility',  desc: 'Raises the decker\'s Detection Factor: ⌈(Masking + Sleaze) ÷ 2⌉. Harder for the host to detect.' },
  { name: 'Track',          mult: 8, cat: 'utility',  desc: 'Traces an icon or communication back to its physical origin. Very large; rarely used in active memory.' },

  // ── Communications ───────────────────────────────────────────────────────────
  { name: 'BattleTac Matrixlink', mult: 5, cat: 'comms', desc: 'Links the decker\'s cyberdeck into a BattleTac tactical network for IVIS integration.' },
  { name: 'Cellular Link',        mult: 1, cat: 'comms', desc: 'Connects the cyberdeck to a cellular telephone network.' },
  { name: 'Compressor',           mult: 2, cat: 'comms', desc: 'Compresses outgoing data to reduce I/O Speed requirements.' },
  { name: 'Guardian',             mult: 2, cat: 'comms', desc: 'Monitors a communications channel and alerts the decker to intrusions.' },
  { name: 'Laser Link',           mult: 1, cat: 'comms', desc: 'Establishes a laser-based hardline communication channel.' },
  { name: 'Maser Link',           mult: 1, cat: 'comms', desc: 'Establishes a microwave-frequency communication channel.' },
  { name: 'Microwave Link',       mult: 1, cat: 'comms', desc: 'Establishes a standard microwave radio link.' },
  { name: 'Radio Link',           mult: 1, cat: 'comms', desc: 'Basic radio communication link; lowest bandwidth of all link types.' },
  { name: 'Remote Control',       mult: 3, cat: 'comms', desc: 'Allows the decker to remotely control a drone or vehicle through a datajack/RCD connection.' },
  { name: 'Satellite Link',       mult: 2, cat: 'comms', desc: 'Connects the cyberdeck to an orbital satellite communication network.' },

  // ── Attack Utilities ─────────────────────────────────────────────────────────
  { name: 'Attack-L',             mult: 2, cat: 'attack', desc: 'Cybercombat attack utility; delivers Light damage on a successful hit.' },
  { name: 'Attack-M',             mult: 3, cat: 'attack', desc: 'Cybercombat attack utility; delivers Moderate damage on a successful hit.' },
  { name: 'Attack-S',             mult: 4, cat: 'attack', desc: 'Cybercombat attack utility; delivers Serious damage on a successful hit.' },
  { name: 'Attack-D',             mult: 5, cat: 'attack', desc: 'Cybercombat attack utility; delivers Deadly damage on a successful hit.' },
  { name: 'Black Hammer',         mult: 20, cat: 'attack', desc: 'Illegal Black IC weapon. Delivers lethal biofeedback directly to the decker\'s neural system. Treat as Physical damage bypassing normal soak.' },
  { name: 'Erosion: Blinder',     mult: 3, cat: 'attack', desc: 'Degrades the target\'s Sensor persona attribute by 1 per 2 net successes.' },
  { name: 'Erosion: Poison',      mult: 3, cat: 'attack', desc: 'Degrades the target\'s Bod persona attribute by 1 per 2 net successes.' },
  { name: 'Erosion: Restrict',    mult: 3, cat: 'attack', desc: 'Degrades the target\'s Masking persona attribute by 1 per 2 net successes.' },
  { name: 'Erosion: Reveal',      mult: 3, cat: 'attack', desc: 'Degrades the target\'s Evasion persona attribute by 1 per 2 net successes.' },
  { name: 'Hog',                  mult: 3, cat: 'attack', desc: 'Floods the target\'s active memory, reducing available memory by the utility rating.' },
  { name: 'Killjoy',              mult: 10, cat: 'attack', desc: 'Attacks all active programs in target\'s memory simultaneously. Very large.' },
  { name: 'Slow',                 mult: 4, cat: 'attack', desc: 'Reduces target\'s Matrix initiative by the utility rating.' },
  { name: 'Steamroller',          mult: 3, cat: 'attack', desc: 'Overwhelming brute-force attack; ignores target\'s Armor option.' },

  // ── Defense Utilities ────────────────────────────────────────────────────────
  { name: 'Armor',    mult: 3, cat: 'defense', desc: 'Reduces the Power of incoming attacks against the decker by the Armor rating.' },
  { name: 'Cloak',    mult: 3, cat: 'defense', desc: 'Hides the decker\'s icon from scanning attempts; adds to effective Masking.' },
  { name: 'Lock-On',  mult: 3, cat: 'defense', desc: 'Prevents the decker from being dumped by IC; must be crashed first.' },
  { name: 'Medic',    mult: 4, cat: 'defense', desc: 'Repairs Matrix Condition Monitor damage to the decker\'s cyberdeck.' },
  { name: 'Restore',  mult: 3, cat: 'defense', desc: 'Restores a crashed utility to active memory at its last known rating.' },
  { name: 'Shield',   mult: 4, cat: 'defense', desc: 'Reduces the chance of a successful attack against the decker. Adds +2 TN to attacks against the decker.' },
];

// ── Build Foundry Item data ───────────────────────────────────────────────────
const CATEGORY_LABELS = {
  utility:  'Utility',
  comms:    'Communications',
  attack:   'Attack',
  defense:  'Defense',
};

const ITEMS = PROGRAMS.map(p => ({
  name: p.name,
  type: 'program',
  img:  IMG,
  system: {
    category:    p.cat,
    multiplier:  p.mult,
    description: `<p><strong>Category:</strong> ${CATEGORY_LABELS[p.cat]}</p>
<p><strong>Size multiplier:</strong> ${p.mult} — Active Memory = Rating² × ${p.mult} Mp</p>
<p>${p.desc}</p>`,
  },
}));

// ── Populate ──────────────────────────────────────────────────────────────────
const pack = game.packs.get(PACK_ID);
if (!pack) return ui.notifications.error(`Pack not found: ${PACK_ID}. Did you restart Foundry after adding it to system.json?`);

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let go = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate ODM Programs?' },
    content: `<p>${existing.length} existing entries will be deleted and replaced with ${ITEMS.length} from local data.</p>`,
    buttons: [
      { label: 'Repopulate', action: 'yes', default: true, callback: () => { go = true; } },
      { label: 'Cancel', action: 'cancel' },
    ],
  });
  if (!go) return;
  await pack.configure({ locked: false });
  for (const doc of existing) await doc.delete();
}

await pack.configure({ locked: false });
let created = 0;
for (const data of ITEMS) {
  try {
    const tmp = await Item.create(data, { renderSheet: false });
    await pack.importDocument(tmp);
    await tmp.delete();
    created++;
  } catch (err) {
    console.error(`SR3E | ODM Programs — failed to create "${data.name}":`, err);
  }
}
await pack.configure({ locked: true });
ui.notifications.info(`SR3E: ${created} Orthodox SR3 programs added to ${PACK_ID}.`);
