// ════════════════════════════════════════════════════════════════════════════
//  SR3E — DataHosts Compendium Populator
//  Paste into a Foundry macro (Type: Script) and run once as GM.
//  Requires a full Foundry restart after updating system.json so that
//  the "DataHosts" compendium pack is registered.
//
//  Topology (nodes, pathways, trigger steps) is intentionally omitted here.
//  After importing, open each host and click "Initialize Standard Topology"
//  on the Network Map tab.
// ════════════════════════════════════════════════════════════════════════════

const PACK_ID = 'The2ndChumming3e.sr3e-hosts';

const TIER_DATA = {
  Ivory:       { color: '#e8e4d4', threshold: 0 },
  Blue:        { color: '#3377cc', threshold: 1 },
  Green:       { color: '#00aa44', threshold: 2 },
  Orange:      { color: '#dd6600', threshold: 3 },
  Red:         { color: '#cc2222', threshold: 4 },
  Black:       { color: '#222222', threshold: 5 },
  Ultraviolet: { color: '#8800dd', threshold: 6 },
};

function makeHost(name, systemRating, tierName, memTotal, { notes = '', mainframe = false } = {}) {
  const tier = TIER_DATA[tierName] ?? TIER_DATA.Green;
  return {
    name,
    type: 'host',
    img: 'icons/svg/portal.svg',
    system: {
      systemRating,
      securityTierName:      tierName,
      securityTierThreshold: tier.threshold,
      securityTierColor:     tier.color,
      mainframeSupport:      mainframe,
      memoryTotal:           memTotal,
      memoryUsed:            0,
      overwatchCurrent:      0,
      alertCount:            0,
      notes,
      nodes:        [],
      pathways:     [],
      triggerSteps: [],
      ioPorts:      [],
      stockedIC:    [],
      activeUsers:  [],
      activeAgents: [],
    },
  };
}

// ── Host roster ───────────────────────────────────────────────────────────────

const HOSTS = [

  // ── Public / commercial ────────────────────────────────────────────────────

  makeHost('Downtown Public MetroGrid', 3, 'Blue', 1500, {
    notes: '<p>Seattle Downtown district\'s public access Matrix node. AR advertising, transit schedules, permit kiosks, event listings, and basic government services. Thousands of users daily; Overwatch accumulates slowly here due to high traffic noise.</p><p><strong>Notable data:</strong> Almost nothing worth stealing on its own — but a useful unmonitored launch point to reach adjacent hosts without surfacing your physical location.</p>',
  }),

  makeHost('Ares Arms — Retail Storefront', 4, 'Blue', 2000, {
    notes: '<p>Public-facing Ares Arms sales host. Customers browse catalogs, review product specs, and submit legal purchase orders. Security is light — this host\'s purpose is commerce, not data protection. Illegal weapons are not listed here; those transactions happen elsewhere.</p><p><strong>Notable data:</strong> Registered customer list (useful for blackmail or tracking), sales records, product catalog. Licensed dealers have restricted access to wholesale pricing.</p>',
  }),

  makeHost('DocWagon Emergency Response Hub', 5, 'Green', 3000, {
    notes: '<p>DocWagon client medical records and contract management. Tier-3 contract holders have full medical history, trauma protocol, and extraction team assignments stored here. The DS is partition-locked on Platinum-tier client data.</p><p><strong>Notable data:</strong> Medical files, extraction contract tiers, billing records, pharmaceutical orders. Particularly valuable for tracking a high-profile target\'s extraction schedule. HIPAA-equivalent regulations apply — IC responds quickly to unauthorised access.</p>',
  }),

  // ── Law enforcement / municipal ────────────────────────────────────────────

  makeHost('Lone Star — LEMD Sector 4 Server', 6, 'Orange', 4000, {
    notes: '<p>Lone Star Law Enforcement Matrix Division operational host for Sector 4. Handles dispatch logs, warrant databases, and active patrol coordination. Sysops are human officers with backup from automated IC.</p><p><strong>Notable data:</strong> Outstanding warrants (including your clients\'), active patrol routes, CI reports, booking records. Most runners have personal reasons to visit this one.</p>',
  }),

  makeHost('Knight Errant — KCAS Dispatch Hub', 7, 'Orange', 5000, {
    notes: '<p>Knight Errant\'s King County Armed Security real-time dispatch host. Patrol positioning, armed response allocation, and active incident management. A decker who can read this has a live map of where KE is — and isn\'t.</p><p><strong>Notable data:</strong> Patrol routes, response time estimates by district, personnel assignments, ongoing incident reports. Invaluable for planning any run in KE-protected territory. KE treats intrusion as a direct attack.</p>',
  }),

  // ── Corporate ─────────────────────────────────────────────────────────────

  makeHost('Fuchi Industrial — Seaport Logistics Server', 7, 'Orange', 6000, {
    notes: '<p>Fuchi seaport logistics server: shipping manifests, import/export clearances, container routing, and customs bypass codes. The SN controls automated dock cranes and cargo scanners — compromise it and you can open (or close) any container in the port.</p><p><strong>Notable data:</strong> Smuggling routes hidden inside "legitimate" shipment records, customs officer access codes, crane automation overrides. Useful for both corporate espionage and moving product through the port undetected.</p>',
  }),

  makeHost('Renraku Arcology — Residential Subnet B', 8, 'Red', 7000, {
    notes: '<p>Internal Matrix host for Renraku Arcology Residential Block B — housing, environmental controls, and personal communications for 40,000 residents. The SN controls HVAC, door locks, and elevator systems for six towers.</p><p><strong>Notable data:</strong> Resident communications (monitored), physical access logs for all doors, environmental override codes. Renraku treats any intrusion as a threat against the Arcology itself — expect a fast, escalating response.</p>',
  }),

  makeHost('Aztechnology — Tenochtitlan Research Subnet', 9, 'Red', 8000, {
    notes: '<p>Classified Aztechnology research subnet for a black-site programme codenamed TENOCHTITLAN. IC patrols run continuously; the CPU uses triple-redundant encryption on all datafiles. Two Gemini IC instances operate in the DS.</p><p><strong>Notable data:</strong> Project specs for an unidentified bioweapon delivery mechanism, personnel files, encrypted payments to unregistered contractors. The highest-value paydata in this region of the Seattle Matrix. Extraction will require preparation.</p>',
    mainframe: true,
  }),

  // ── Critical infrastructure ────────────────────────────────────────────────

  makeHost('Shiawase Nuclear — Cascades Grid Control', 10, 'Black', 10000, {
    notes: '<p>SCADA control host for Shiawase\'s Cascades nuclear generating station. Controls reactor coolant systems, turbine load balancing, and emergency shutdown protocols. Physical hardline access only — remote wireless connections are rejected at the SAN. GOD watches this host directly.</p><p><strong>Notable data:</strong> Reactor state data, plant schematics, physical security patrol schedules, coolant override codes. Triggering a meltdown is possible from here — which is exactly why this host is Black tier and why no one sane runs it alone.</p>',
    mainframe: true,
  }),

  // ── Criminal / suspicious ──────────────────────────────────────────────────

  makeHost('Universal Brotherhood — Community Hub', 8, 'Red', 6000, {
    notes: '<p>Public face of the Universal Brotherhood\'s Seattle chapter. Ostensibly hosts charity coordination, volunteer scheduling, and community events. In practice, the DS contains encrypted membership files, financial laundering records, and communications with non-human entities that have no business corresponding with a human charity.</p><p><strong>Notable data:</strong> Coded contact lists, financial flows to unknown offshore accounts, encrypted comms referencing "the Feast". Johnson clients will pay handsomely for this paydata — if the runners survive long enough to extract it. The IC here is not standard corporate stock.</p>',
  }),

];

// ── Populate ──────────────────────────────────────────────────────────────────

const pack = game.packs.get(PACK_ID);
if (!pack) {
  ui.notifications.error(`Pack "${PACK_ID}" not found. Ensure system.json declares it and Foundry has been fully restarted.`);
  return;
}

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let proceed = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate DataHosts?' },
    content: `<p>The DataHosts compendium already contains ${existing.length} entries. Delete them and repopulate?</p>`,
    buttons: [
      { label: 'Repopulate', action: 'yes', default: true, callback: () => { proceed = true; } },
      { label: 'Cancel',     action: 'cancel', default: false },
    ],
  });
  if (!proceed) return;
}

await pack.configure({ locked: false });

for (const doc of await pack.getDocuments()) await doc.delete();

let created = 0;
for (const data of HOSTS) {
  try {
    await pack.documentClass.create(data, { pack: pack.collection, renderSheet: false });
    created++;
  } catch (err) {
    console.error(`SR3E | Failed to create host "${data.name}":`, err);
    ui.notifications.warn(`SR3E: Failed to create "${data.name}" — see console (F12) for details.`);
  }
}

await pack.configure({ locked: true });

ui.notifications.info(
  created === HOSTS.length
    ? `SR3E: ${created} DataHosts added to the compendium.`
    : `SR3E: ${created}/${HOSTS.length} created — ${HOSTS.length - created} failed (check console).`
);
