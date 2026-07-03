// SR3E — Populate sr3e-odm-cyberdecks from local rawdata/ODM-Cyberdeck.json
// Orthodox SR3 cyberdecks: MPCP (Persona), Hardening, Active/Storage Memory,
// I/O Speed, Response Increase, Cost, Availability.
// Run as a world macro (GM only).

const PACK_ID = 'The2ndChumming3e.sr3e-odm-cyberdecks';
const IMG     = 'systems/The2ndChumming3e/styles/textures/cyberdeck-default.webp';

// ── Raw data (from rawdata/ODM-Cyberdeck.json) ───────────────────────────────
const RAW = [
  { "Name": "Kirama LPD-12",         "Persona": "1",  "Hardening": "0", "Memory": "200",  "Storage": "200",  "I/O Speed": "50",   "Response Increase": "0", "Availability": "4/7days",  "Cost": "4815",    "Street Index": "1", "BookPage": "cp.18"    },
  { "Name": "Allegiance Sigma",       "Persona": "3",  "Hardening": "1", "Memory": "200",  "Storage": "500",  "I/O Speed": "100",  "Response Increase": "0", "Availability": "4/7days",  "Cost": "14000",   "Street Index": "1", "BookPage": "sr3.304"  },
  { "Name": "Zetatech Parraline 5750","Persona": "3",  "Hardening": "1", "Memory": "300",  "Storage": "450",  "I/O Speed": "100",  "Response Increase": "0", "Availability": "4/7days",  "Cost": "19230",   "Street Index": "1", "BookPage": "cp.18"    },
  { "Name": "SGI Technologies \"Elysia\"", "Persona": "4", "Hardening": "1", "Memory": "80", "Storage": "160", "I/O Speed": "150", "Response Increase": "0", "Availability": "4/7days",  "Cost": "38675",   "Street Index": "1", "BookPage": "cp.18"    },
  { "Name": "Sony CTY-360-D",         "Persona": "5",  "Hardening": "3", "Memory": "300",  "Storage": "600",  "I/O Speed": "200",  "Response Increase": "1", "Availability": "4/7days",  "Cost": "70000",   "Street Index": "1", "BookPage": "sr3.304"  },
  { "Name": "CATCo Babel",            "Persona": "5",  "Hardening": "2", "Memory": "1000", "Storage": "1000", "I/O Speed": "200",  "Response Increase": "1", "Availability": "4/7days",  "Cost": "70000",   "Street Index": "1", "BookPage": "cd.130"   },
  { "Name": "Novatech Hyperdeck-6",   "Persona": "6",  "Hardening": "4", "Memory": "500",  "Storage": "1000", "I/O Speed": "240",  "Response Increase": "1", "Availability": "4/7days",  "Cost": "125000",  "Street Index": "1", "BookPage": "sr3.304"  },
  { "Name": "CMT Avatar",             "Persona": "7",  "Hardening": "4", "Memory": "700",  "Storage": "1400", "I/O Speed": "300",  "Response Increase": "1", "Availability": "6/7days",  "Cost": "250000",  "Street Index": "1", "BookPage": "sr3.304"  },
  { "Name": "Renraku Kraftwerk-8",    "Persona": "8",  "Hardening": "4", "Memory": "1000", "Storage": "2000", "I/O Speed": "360",  "Response Increase": "2", "Availability": "10/7days", "Cost": "400000",  "Street Index": "1", "BookPage": "sr3.304"  },
  { "Name": "Transys Highlander",     "Persona": "9",  "Hardening": "4", "Memory": "1500", "Storage": "2500", "I/O Speed": "400",  "Response Increase": "2", "Availability": "14/7days", "Cost": "600000",  "Street Index": "1", "BookPage": "sr3.304"  },
  { "Name": "Novatech Slimcase-10",   "Persona": "10", "Hardening": "5", "Memory": "2000", "Storage": "2500", "I/O Speed": "480",  "Response Increase": "2", "Availability": "18/7days", "Cost": "960000",  "Street Index": "1", "BookPage": "sr3.304"  },
  { "Name": "Fairlight Excalibur",    "Persona": "12", "Hardening": "6", "Memory": "3000", "Storage": "5000", "I/O Speed": "600",  "Response Increase": "3", "Availability": "22/7days", "Cost": "1500000", "Street Index": "1", "BookPage": "sr3.304"  },
  { "Name": "Maxed-out deck (MPCP 4)",  "Persona": "4",  "Hardening": "2", "Memory": "500",  "Storage": "1100", "I/O Speed": "400",  "Response Increase": "1", "Availability": "6/7days",  "Cost": "61409",   "Street Index": "1", "BookPage": "mat.???"  },
  { "Name": "Maxed-out deck (MPCP 6)",  "Persona": "6",  "Hardening": "4", "Memory": "700",  "Storage": "1500", "I/O Speed": "600",  "Response Increase": "1", "Availability": "6/7days",  "Cost": "211649",  "Street Index": "1", "BookPage": "mat.???"  },
  { "Name": "Maxed-out deck (MPCP 7)",  "Persona": "7",  "Hardening": "4", "Memory": "800",  "Storage": "1500", "I/O Speed": "700",  "Response Increase": "1", "Availability": "6/7days",  "Cost": "345211",  "Street Index": "1", "BookPage": "mat.???"  },
  { "Name": "Maxed-out deck (MPCP 8)",  "Persona": "8",  "Hardening": "5", "Memory": "900",  "Storage": "1700", "I/O Speed": "800",  "Response Increase": "2", "Availability": "6/7days",  "Cost": "540409",  "Street Index": "1", "BookPage": "mat.???"  },
  { "Name": "Maxed-out deck (MPCP 10)", "Persona": "10", "Hardening": "6", "Memory": "1100", "Storage": "2100", "I/O Speed": "1000", "Response Increase": "2", "Availability": "6/7days",  "Cost": "1277985", "Street Index": "1", "BookPage": "mat.???"  },
  { "Name": "Maxed-out deck (MPCP 12)", "Persona": "12", "Hardening": "7", "Memory": "1300", "Storage": "2500", "I/O Speed": "1200", "Response Increase": "3", "Availability": "6/7days",  "Cost": "2169617", "Street Index": "1", "BookPage": "mat.???"  },
];

// ── Field mapping ─────────────────────────────────────────────────────────────
// CyberdeckData uses:
//   attributes.mpcp.base / .value  ← Persona (MPCP rating)
//   attributes.memory.total        ← Active Memory (Mp)
//   attributes.dataTransferRate.value ← I/O Speed
//   cost, availability, streetIndex
// Orthodox-specific fields not in schema → stored in notes HTML.

function toInt(v) { return parseInt(v) || 0; }

const ITEMS = RAW.map(r => {
  const mpcp   = toInt(r['Persona']);
  const hard   = toInt(r['Hardening']);
  const mem    = toInt(r['Memory']);
  const store  = toInt(r['Storage']);
  const io     = toInt(r['I/O Speed']);
  const resp   = toInt(r['Response Increase']);
  const cost   = toInt(r['Cost']);
  const avail  = String(r['Availability'] ?? '');
  const si     = toInt(r['Street Index']);
  const page   = String(r['BookPage'] ?? '');

  // Max persona program = MPCP; max total = MPCP×3; response cap = ⌊MPCP÷4⌋
  const respMax = Math.floor(mpcp / 4);

  const notes = `<table style="font-size:12px;border-collapse:collapse;width:100%">
  <tr><th style="text-align:left;padding:2px 6px">MPCP (Persona)</th><td style="padding:2px 6px">${mpcp}</td></tr>
  <tr><th style="text-align:left;padding:2px 6px">Hardening</th><td style="padding:2px 6px">${hard}</td></tr>
  <tr><th style="text-align:left;padding:2px 6px">Active Memory</th><td style="padding:2px 6px">${mem} Mp</td></tr>
  <tr><th style="text-align:left;padding:2px 6px">Storage Memory</th><td style="padding:2px 6px">${store} Mp</td></tr>
  <tr><th style="text-align:left;padding:2px 6px">I/O Speed</th><td style="padding:2px 6px">${io} Mp/CT</td></tr>
  <tr><th style="text-align:left;padding:2px 6px">Response Increase</th><td style="padding:2px 6px">${resp} (max ${respMax})</td></tr>
  <tr><th style="text-align:left;padding:2px 6px">Persona prog. max</th><td style="padding:2px 6px">${mpcp} each / ${mpcp * 3} total</td></tr>
  <tr><th style="text-align:left;padding:2px 6px">Hacking Pool (INT 5)</th><td style="padding:2px 6px">${Math.floor((5 + mpcp) / 3)} (example: INT 5)</td></tr>
  <tr><th style="text-align:left;padding:2px 6px">Source</th><td style="padding:2px 6px">${page}</td></tr>
</table>
<p style="font-size:11px;color:#888;margin-top:4px">
  Orthodox SR3. To use: enter MPCP, Memory, I/O Speed, and Response Increase into the Matrix tab of your character sheet.
  Persona program max = MPCP; total of Bod+Evasion+Masking+Sensor ≤ MPCP×3.
</p>`;

  return {
    name: String(r['Name']),
    type: 'cyberdeck',
    img:  IMG,
    system: {
      cost:         cost,
      availability: avail,
      streetIndex:  si,
      notes:        notes,
      // Orthodox SR3 stats that don't map to Defragged CyberdeckData schema fields
      // are stored in modules[0] so the picker can read them back.
      modules: [{ _odmType: 'orthodox', hardening: hard, storageMemory: store, responseIncrease: resp }],
      attributes: {
        mpcp: {
          base:  mpcp,
          value: mpcp,
        },
        memory: {
          total: mem,
          used:  0,
          unit:  'Mp',
        },
        dataTransferRate: {
          value: io,
          unit:  'Mp per Combat Turn',
        },
      },
    },
  };
});

// ── Populate ──────────────────────────────────────────────────────────────────
const pack = game.packs.get(PACK_ID);
if (!pack) return ui.notifications.error(`Pack not found: ${PACK_ID}. Did you restart Foundry after adding it to system.json?`);

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let go = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate ODM Cyberdecks?' },
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
    console.error(`SR3E | ODM Cyberdecks — failed to create "${data.name}":`, err);
  }
}
await pack.configure({ locked: true });
ui.notifications.info(`SR3E: ${created} Orthodox SR3 cyberdecks added to ${PACK_ID}.`);
