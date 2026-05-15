// ════════════════════════════════════════════════════════════════════════════
//  SR3E — Programming Agents Compendium Populator
//  Paste into a Foundry macro (Type: Script) and run once as GM.
//  Requires a full Foundry restart after updating system.json so that
//  the "Programming Agents" compendium pack is registered.
// ════════════════════════════════════════════════════════════════════════════

const PACK_ID = 'The2ndChumming3e.sr3e-agents';

// Utility and special-ability multipliers (must match SR3E.agentUtilities /
// SR3E.agentSpecialAbilities in config.js — kept local so the macro is
// self-contained and runnable without a live game.sr3e reference).
const UTIL_MULT = {
  'Analyze':                                    3,
  'Armor':                                      3,
  'Attack: Light (Overload)':                   2,
  'Attack: Moderate (Overload)':                3,
  'Attack: Severe (Overload)':                  4,
  'Attack: Deadly (Overload)':                  5,
  'Attack: Nosebleed — Light (Biofeedback)':    5,
  'Attack: Blackout — Moderate (Biofeedback)': 10,
  'Attack: Killjoy — Severe (Biofeedback)':    15,
  'Attack: Black Hammer — Deadly (Biofeedback)':20,
  'Decrypt':                                    4,
  'Encrypt':                                    3,
  'Exploit':                                    5,
  'Jamboree':                                   1,
  'Kill Switch':                                5,
  'Lock-On':                                    6,
  'Medic':                                      4,
  'Saboteur':                                   4,
  'Shield':                                     3,
  'Signal Booster':                             1,
  'Sleaze':                                     4,
  'Slow':                                       4,
  'Smoke Screen':                               4,
  'Snoop':                                      3,
};

const ABILITY_MULT = {
  'Authenticate':              3,
  'Corrupt and Burn':          5,
  'Corruption':                3,
  'Erosion: Flux Rating':      3,
  'Erosion: MPCP':             5,
  'Guardian':                  1,
  'Infiltration: Memory Lock': 5,
  'Infiltration: Report':      3,
  'Instance':                  2,
  'Respawn':                   8,
};

// ── Agent builder ─────────────────────────────────────────────────────────────

function makeAgent(name, rating, { skills = [], utilities = [], abilities = [], tier = 'Green', notes = '' } = {}) {
  return {
    name,
    type: 'agent',
    img: 'icons/svg/mystery-man.svg',
    system: {
      rating,
      graded:           abilities.length > 0,
      hostSecurityTier: tier,
      additionalSkills: skills.map(category => ({ category })),
      utilities:        utilities.map(n => ({ name: n, multiplier: UTIL_MULT[n] ?? 0 })),
      specialAbilities: abilities.map(n => ({ name: n, multiplier: ABILITY_MULT[n] ?? 0 })),
      woundValue: 0,
      notes,
    },
  };
}

// ── Agent roster ──────────────────────────────────────────────────────────────
// Multiplier = 1 (base) + sum of add-on multipliers.  Mp = Rating² × Mult.
//
// Tier is set to Green by default — change it per deployment to match the
// host's security tier and get the correct initiative dice.

const AGENTS = [

  // ── Ungraded agents ────────────────────────────────────────────────────────

  makeAgent('Basic Agent', 3, {
    notes: '<p>Minimal configuration — Computer + Cybercombat only. Multiplier 1, 9 Mp.</p><p>Use as a cheap decoy, a general-purpose assistant, or a first test of agent programming at low Rating.</p>',
  }),

  makeAgent('Bloodhound', 4, {
    utilities: ['Analyze'],
    notes: '<p>Search specialist. Analyze reduces the TN for Search and Render by its rating. Multiplier 4, 64 Mp.</p><p>Deploy to locate hidden users, mapped datafiles, or concealed IC in a node.</p>',
  }),

  makeAgent('Watchdog', 4, {
    utilities: ['Analyze', 'Smoke Screen'],
    notes: '<p>Patrol agent that hunts intruders while staying concealed. Multiplier 8, 128 Mp.</p><p>Analyze drives its Search and Render checks; Smoke Screen raises the TN for enemy Search and Render against it. Hard to spot, effective at finding others.</p>',
  }),

  makeAgent('Brawler', 4, {
    utilities: ['Attack: Moderate (Overload)'],
    notes: '<p>Standard combat agent. Moderate Overload attack. Multiplier 4, 64 Mp.</p><p>The go-to cheap combatant. Reliable Cybercombat pool + moderate Overload damage is enough for most White and Blue-tier targets.</p>',
  }),

  makeAgent('Warhound', 4, {
    utilities: ['Attack: Deadly (Overload)', 'Armor'],
    notes: '<p>Heavy combat agent. Deadly Overload attack; Armor soaks incoming Overload damage point-for-point before it hits the condition monitor. Multiplier 9, 144 Mp.</p><p>Expensive but durable. Best used against high-rating IC or to hold a node while the decker works elsewhere.</p>',
  }),

  makeAgent('Ghost', 4, {
    utilities: ['Sleaze', 'Smoke Screen'],
    notes: '<p>Pure stealth agent. Sleaze bypasses barriers up to its rating without triggering Overwatch; Smoke Screen makes it nearly invisible to Search and Render. Multiplier 9, 144 Mp.</p><p>Does not attack — deploy it ahead of the decker for a clean insertion.</p>',
  }),

  makeAgent('Keystroke', 4, {
    skills: ['Hacking'],
    utilities: ['Exploit'],
    notes: '<p>Access specialist. Exploit cuts the TN for Access Node; the Hacking skill pool supplements its Computer and Cybercombat when needed. Multiplier 7, 112 Mp.</p><p>Send it ahead to mark a path through a host before the decker arrives.</p>',
  }),

  makeAgent('Doc', 4, {
    utilities: ['Medic'],
    notes: '<p>Icon repair agent. Medic reduces the TN for Repair an Icon. Multiplier 5, 80 Mp.</p><p>Keep one running in the background during hot operations. A repaired Condition Monitor can mean the difference between a clean exit and dumpshock.</p>',
  }),

  makeAgent('Snooper', 4, {
    utilities: ['Snoop', 'Signal Booster'],
    notes: '<p>Signals intelligence agent. Snoop cuts TN for Tap/Spoof Datastream; Signal Booster assists Send Transmission. Multiplier 5, 80 Mp.</p><p>Use during legwork runs to intercept communications without the decker staying jacked in.</p>',
  }),

  makeAgent('Locksmith', 4, {
    skills: ['Hacking'],
    utilities: ['Exploit', 'Decrypt'],
    notes: '<p>Dual-purpose access and cracking agent. Exploit for forced entry via Access Node; Decrypt for peeling encrypted datafiles. Multiplier 10, 160 Mp.</p><p>A common decker companion for data-theft runs — it opens doors and reads what\'s inside.</p>',
  }),

  makeAgent('Phantom', 4, {
    utilities: ['Sleaze', 'Smoke Screen', 'Armor'],
    notes: '<p>Survivable stealth agent. Sleaze for barrier bypass, Smoke Screen to stay hidden, Armor to absorb hits if found. Multiplier 12, 192 Mp.</p><p>More robust than Ghost — built to stay on-station in a hostile host for extended operations.</p>',
  }),

  makeAgent('Blackout', 4, {
    utilities: ['Attack: Blackout — Moderate (Biofeedback)'],
    notes: '<p>Biofeedback attack agent. Moderate Biofeedback bypasses standard Overload soaking and deals damage directly to the pilot\'s stun (VR-Cold) or physical (VR-Hot) track. Multiplier 11, 176 Mp.</p><p>Illegal in most jurisdictions. Devastating against hot-sim runners. In TRM or AR, the pilot is immune — switch to Brawler instead.</p>',
  }),

  makeAgent('Slowburn', 4, {
    utilities: ['Slow', 'Lock-On'],
    notes: '<p>Disabling agent. Slow reduces a target\'s initiative by 3 per net success (crashes at 0 within one turn); Lock-On guarantees a Link-Lock even on a single success. Multiplier 11, 176 Mp.</p><p>Not a killer — used to pin and stall enemy icons while the decker acts freely.</p>',
  }),

  // ── Graded agents (require IC Graded status) ───────────────────────────────

  makeAgent('Rat', 4, {
    utilities: ['Sleaze'],
    abilities: ['Infiltration: Report'],
    notes: '<p>Infiltration snitch. Graded agent. Sleaze gets it into the target icon\'s Memory; it lies dormant until crashed, then uses Send Transmission to report its findings to GOD, increasing the target\'s Overwatch by the agent\'s rating on next logon. Multiplier 8, 128 Mp.</p><p>Plant one on a rival decker\'s persona and watch their Overwatch spiral.</p>',
  }),

  makeAgent('Phoenix', 4, {
    abilities: ['Respawn'],
    notes: '<p>Self-replicating agent. Graded agent. When crashed, it splits into two Rating-2 clones that re-enter initiative at the top of the next Combat Phase. The clones can also Respawn once more each before the ability is lost. Multiplier 9, 144 Mp.</p><p>Effectively impossible to permanently crash until Rating 1. A significant investment but a serious force multiplier in prolonged Matrix combat.</p>',
  }),

  makeAgent('Vault', 6, {
    abilities: ['Guardian'],
    notes: '<p>Datafile guardian. Graded agent. Encrypts all datafiles and datastreams currently active in the host up to its rating; while active, Crack Protections (Encryption) automatically fails. Multiplier 2, 72 Mp.</p><p>High Rating makes the encryption meaningful. Dismiss it before the decker needs to read the files themselves.</p>',
  }),

  makeAgent('Mirage', 4, {
    abilities: ['Instance'],
    notes: '<p>Node-instance trap. Graded agent. Locks the target in a superficially perfect copy of their current node: Jump Grid/Host fails, node prompts fail, exits loop back to entry. Persists until the target terminates session or crashes the agent. Multiplier 3, 48 Mp.</p><p>Cheap and infuriating. Use it to strand a pursuing IC or security decker while the team finishes the run.</p>',
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
    window: { title: 'Repopulate Agents?' },
    content: `<p>The Programming Agents compendium already contains ${existing.length} entries. Delete them and repopulate?</p>`,
    buttons: [
      { label: 'Repopulate', action: 'yes', default: true, callback: () => { proceed = true; } },
      { label: 'Cancel', action: 'cancel', default: false },
    ],
  });
  if (!proceed) return;
}

await pack.configure({ locked: false });

for (const doc of await pack.getDocuments()) await doc.delete();

let created = 0;
for (const data of AGENTS) {
  try {
    const tmpActor = await Actor.create(data, { renderSheet: false });
    await pack.importDocument(tmpActor);
    await tmpActor.delete();
    created++;
  } catch (err) {
    console.error(`SR3E | Failed to create agent "${data.name}":`, err);
    ui.notifications.warn(`SR3E: Failed to create "${data.name}" — see console (F12) for details.`);
  }
}

await pack.configure({ locked: true });

ui.notifications.info(
  created === AGENTS.length
    ? `SR3E: ${created} programming agents added to the compendium.`
    : `SR3E: ${created}/${AGENTS.length} created — ${AGENTS.length - created} failed (check console).`
);
