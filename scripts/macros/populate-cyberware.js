// Populate the sr3e-cyberware compendium with all standard cyberware.
// Paste into a Script macro and run as GM. Safe to re-run — prompts before overwriting.

const PACK_ID = 'The2ndChumming3e.sr3e-cyberware';

// ── Helpers ───────────────────────────────────────────────────────────────────

function cw(name, grade, essenceCost, rating, cost, category, opts = {}) {
  return {
    name,
    type: 'cyberware',
    system: {
      grade,
      essenceCost,
      rating,
      cost,
      cyberwareCategory: category,
      availability:      opts.availability ?? '',
      streetIndex:       opts.streetIndex  ?? 1,
      legalCode:         opts.legalCode    ?? '',
      mods:              opts.mods         ?? '',
      capacity:          opts.capacity     ?? 0,
      isReplacement:     opts.isReplacement ?? false,
      bookPage:          opts.bookPage     ?? '',
      description:       opts.description  ?? '',
      bonusBod:          opts.bonusBod     ?? 0,
      bonusQui:          opts.bonusQui     ?? 0,
      bonusStr:          opts.bonusStr     ?? 0,
      bonusCha:          opts.bonusCha     ?? 0,
      bonusInt:          opts.bonusInt     ?? 0,
      bonusWil:          opts.bonusWil     ?? 0,
      bonusRea:          opts.bonusRea     ?? 0,
      bonusInitDice:     opts.bonusInitDice ?? 0,
    },
  };
}

// ── Cyberware data ────────────────────────────────────────────────────────────
// Essence costs are for Standard grade. Alpha = ×0.8, Beta = ×0.6, Delta = ×0.5 (handled by GM grade selection)
// Stat bonuses reflect the item at the listed rating.

const CYBERWARE = [

  // ── Neural ────────────────────────────────────────────────────────────────
  cw('Wired Reflexes 1', 'Standard', 2, 1, 55000, 'Neural', {
    availability: '8/36 hrs', streetIndex: 2, legalCode: 'R',
    bonusRea: 1, bonusInitDice: 1,
    description: '<p>+1 Reaction, +1d6 Initiative. Illegal in many jurisdictions.</p>',
  }),
  cw('Wired Reflexes 2', 'Standard', 3, 2, 145000, 'Neural', {
    availability: '12/7 days', streetIndex: 3, legalCode: 'R',
    bonusRea: 2, bonusInitDice: 2,
    description: '<p>+2 Reaction, +2d6 Initiative. Illegal in many jurisdictions.</p>',
  }),
  cw('Wired Reflexes 3', 'Standard', 5, 3, 225000, 'Neural', {
    availability: '20/21 days', streetIndex: 3, legalCode: 'R',
    bonusRea: 3, bonusInitDice: 3,
    description: '<p>+3 Reaction, +3d6 Initiative. Illegal in many jurisdictions.</p>',
  }),

  cw('Boosted Reflexes', 'Standard', 0.5, 0, 2500, 'Neural', {
    availability: '4/48 hrs', streetIndex: 1, legalCode: 'R',
    bonusRea: 1, bonusInitDice: 1,
    description: '<p>+1 Reaction, +1d6 Initiative. One-shot adrenaline booster; only one use per day. Cannot be combined with wired reflexes.</p>',
  }),

  cw('Move-by-Wire 1', 'Standard', 3, 1, 130000, 'Neural', {
    availability: '14/14 days', streetIndex: 4, legalCode: 'R',
    bonusQui: 2, bonusRea: 2, bonusInitDice: 2,
    description: '<p>+2 Quickness, +2 Reaction, +2d6 Initiative. Incompatible with wired reflexes or boosted reflexes.</p>',
  }),
  cw('Move-by-Wire 2', 'Standard', 4, 2, 285000, 'Neural', {
    availability: '20/21 days', streetIndex: 5, legalCode: 'R',
    bonusQui: 4, bonusRea: 4, bonusInitDice: 3,
    description: '<p>+4 Quickness, +4 Reaction, +3d6 Initiative. Incompatible with wired reflexes or boosted reflexes.</p>',
  }),
  cw('Move-by-Wire 3', 'Standard', 5, 3, 575000, 'Neural', {
    availability: '28/28 days', streetIndex: 6, legalCode: 'R',
    bonusQui: 6, bonusRea: 6, bonusInitDice: 4,
    description: '<p>+6 Quickness, +6 Reaction, +4d6 Initiative. Incompatible with wired reflexes or boosted reflexes.</p>',
  }),

  cw('Reaction Enhancers 1', 'Standard', 0.3, 1, 5500, 'Neural', {
    availability: '6/48 hrs', streetIndex: 1, legalCode: 'R',
    bonusRea: 1,
    description: '<p>+1 Reaction. Can be combined with wired reflexes.</p>',
  }),
  cw('Reaction Enhancers 2', 'Standard', 0.6, 2, 11000, 'Neural', {
    availability: '8/72 hrs', streetIndex: 1, legalCode: 'R',
    bonusRea: 2,
    description: '<p>+2 Reaction. Can be combined with wired reflexes.</p>',
  }),
  cw('Reaction Enhancers 3', 'Standard', 0.9, 3, 16500, 'Neural', {
    availability: '10/7 days', streetIndex: 1, legalCode: 'R',
    bonusRea: 3,
    description: '<p>+3 Reaction. Can be combined with wired reflexes.</p>',
  }),

  cw('Synaptic Accelerator 1', 'Standard', 0.4, 1, 7500, 'Neural', {
    availability: '6/48 hrs', streetIndex: 2, legalCode: 'R',
    bonusRea: 1, bonusInitDice: 1,
    description: '<p>+1 Reaction, +1d6 Initiative. Cannot be combined with wired reflexes.</p>',
  }),
  cw('Synaptic Accelerator 2', 'Standard', 0.8, 2, 16500, 'Neural', {
    availability: '10/7 days', streetIndex: 3, legalCode: 'R',
    bonusRea: 2, bonusInitDice: 2,
    description: '<p>+2 Reaction, +2d6 Initiative. Cannot be combined with wired reflexes.</p>',
  }),

  cw('Math SPU', 'Standard', 0.2, 0, 1200, 'Neural', {
    availability: '4/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Math Special Processing Unit. Provides dice pool bonuses for tasks involving mathematics and calculation. No attribute bonus.</p>',
  }),

  cw('Encephalon 1', 'Standard', 1, 1, 22000, 'Neural', {
    availability: '8/7 days', streetIndex: 2, legalCode: 'Legal',
    bonusInt: 1,
    description: '<p>+1 Intelligence. Distributed processing unit; provides one additional die on technical and knowledge skill tests. Incompatible with Math SPU.</p>',
  }),
  cw('Encephalon 2', 'Standard', 2, 2, 45000, 'Neural', {
    availability: '12/14 days', streetIndex: 2, legalCode: 'Legal',
    bonusInt: 2,
    description: '<p>+2 Intelligence. Incompatible with Math SPU.</p>',
  }),

  // ── Headware ─────────────────────────────────────────────────────────────
  cw('Datajack', 'Standard', 0.2, 0, 1000, 'Headware', {
    availability: '4/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Standard simsense input/output port. Required for direct neural interface with cyberdecks, vehicles, and other systems. No attribute bonus.</p>',
  }),
  cw('Chipjack', 'Standard', 0.1, 0, 500, 'Headware', {
    availability: '2/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Memory chip socket for skillsofts and other data chips. Each additional slot requires another 0.1 Essence. No attribute bonus.</p>',
  }),
  cw('Headware Memory', 'Standard', 0.1, 0, 1000, 'Headware', {
    availability: '4/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Internal data storage (100 Mp per 0.1 Essence). Used for programs, data, and knowsofts. No attribute bonus.</p>',
  }),
  cw('Phone', 'Standard', 0.2, 0, 3000, 'Headware', {
    availability: '4/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Internal cellular communicator with 50 km range. No attribute bonus.</p>',
  }),
  cw('Radio', 'Standard', 0.2, 0, 1500, 'Headware', {
    availability: '3/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Short-range radio transceiver (5 km). No attribute bonus.</p>',
  }),

  // ── Sensory ───────────────────────────────────────────────────────────────
  cw('Cybereyes Rating 1', 'Standard', 0.2, 1, 3000, 'Sensory', {
    availability: '6/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Basic cybernetic eye replacement. Supports visual enhancements (low-light, thermographic, flare compensation, smartlink) up to Rating 1 capacity. No attribute bonus.</p>',
  }),
  cw('Cybereyes Rating 2', 'Standard', 0.3, 2, 6000, 'Sensory', {
    availability: '8/48 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Enhanced cybernetic eyes. Rating 2 enhancement capacity. No attribute bonus.</p>',
  }),
  cw('Cybereyes Rating 3', 'Standard', 0.4, 3, 10000, 'Sensory', {
    availability: '10/7 days', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Military-grade cybernetic eyes. Rating 3 enhancement capacity. No attribute bonus.</p>',
  }),
  cw('Cyberears Rating 1', 'Standard', 0.2, 1, 2500, 'Sensory', {
    availability: '6/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Basic cybernetic ear replacement. Supports audio enhancements (amplification, damper, high/low frequency) up to Rating 1 capacity. No attribute bonus.</p>',
  }),
  cw('Cyberears Rating 2', 'Standard', 0.3, 2, 5000, 'Sensory', {
    availability: '8/48 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Enhanced cybernetic ears. Rating 2 enhancement capacity. No attribute bonus.</p>',
  }),
  cw('Cyberears Rating 3', 'Standard', 0.4, 3, 8000, 'Sensory', {
    availability: '10/7 days', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Military-grade cybernetic ears. Rating 3 enhancement capacity. No attribute bonus.</p>',
  }),
  cw('Smartgun Link', 'Standard', 0.5, 0, 5000, 'Sensory', {
    availability: '5/48 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Neural interface for smartlinked weapons. Eliminates the +2 TN penalty for aimed fire and provides range-finder data. Requires cybereyes for full function. No attribute bonus.</p>',
  }),
  cw('Thermographic Vision', 'Standard', 0.2, 0, 2500, 'Sensory', {
    availability: '4/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Heat-sensing vision implant or cybereye modification. Allows vision in complete darkness using heat signatures. No attribute bonus.</p>',
  }),
  cw('Low-Light Vision', 'Standard', 0.1, 0, 1000, 'Sensory', {
    availability: '3/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Amplifies available light. Works in near-darkness but not total darkness. No attribute bonus.</p>',
  }),
  cw('Flare Compensation', 'Standard', 0.1, 0, 750, 'Sensory', {
    availability: '3/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Automatically compensates for sudden bright flashes. Negates flash penalties. No attribute bonus.</p>',
  }),

  // ── Muscular ─────────────────────────────────────────────────────────────
  cw('Muscle Replacement 1', 'Standard', 1, 1, 20000, 'Muscular', {
    availability: '8/7 days', streetIndex: 2, legalCode: 'Legal',
    bonusBod: 1, bonusStr: 1,
    description: '<p>+1 Body, +1 Strength. Replacement of muscle tissue with enhanced synthetic fibres.</p>',
  }),
  cw('Muscle Replacement 2', 'Standard', 2, 2, 40000, 'Muscular', {
    availability: '10/14 days', streetIndex: 2, legalCode: 'Legal',
    bonusBod: 2, bonusStr: 2,
    description: '<p>+2 Body, +2 Strength.</p>',
  }),
  cw('Muscle Replacement 3', 'Standard', 3, 3, 60000, 'Muscular', {
    availability: '14/28 days', streetIndex: 2, legalCode: 'Legal',
    bonusBod: 3, bonusStr: 3,
    description: '<p>+3 Body, +3 Strength.</p>',
  }),
  cw('Muscle Replacement 4', 'Standard', 4, 4, 80000, 'Muscular', {
    availability: '18/42 days', streetIndex: 2, legalCode: 'Legal',
    bonusBod: 4, bonusStr: 4,
    description: '<p>+4 Body, +4 Strength. Maximum rating.</p>',
  }),

  // ── Skeletal ─────────────────────────────────────────────────────────────
  cw('Bone Lacing (Plastic)', 'Standard', 0.5, 0, 8000, 'Skeletal', {
    availability: '6/7 days', streetIndex: 1, legalCode: 'Legal',
    bonusBod: 1,
    description: '<p>+1 Body. Reinforces bone structure with plastic polymer. Provides 1 point of non-stacking natural armor (plastic).</p>',
  }),
  cw('Bone Lacing (Aluminum)', 'Standard', 1, 0, 18000, 'Skeletal', {
    availability: '8/14 days', streetIndex: 1, legalCode: 'Legal',
    bonusBod: 2,
    description: '<p>+2 Body. Aluminum lattice reinforcement. Provides 2 points of natural armor.</p>',
  }),
  cw('Bone Lacing (Titanium)', 'Standard', 1.5, 0, 32000, 'Skeletal', {
    availability: '12/28 days', streetIndex: 1, legalCode: 'R',
    bonusBod: 3,
    description: '<p>+3 Body. Titanium reinforcement. Provides 3 points of natural armor. Detectable by metal detectors.</p>',
  }),

  cw('Dermal Plating 1', 'Standard', 1, 1, 10000, 'Skeletal', {
    availability: '6/7 days', streetIndex: 1, legalCode: 'Legal',
    description: '<p>1 point of natural armor (impact and ballistic). No attribute bonus.</p>',
  }),
  cw('Dermal Plating 2', 'Standard', 1.5, 2, 18000, 'Skeletal', {
    availability: '8/14 days', streetIndex: 1, legalCode: 'Legal',
    description: '<p>2 points of natural armor. No attribute bonus.</p>',
  }),
  cw('Dermal Plating 3', 'Standard', 2, 3, 28000, 'Skeletal', {
    availability: '10/21 days', streetIndex: 1, legalCode: 'R',
    description: '<p>3 points of natural armor. No attribute bonus.</p>',
  }),

  // ── Cyberweapons ──────────────────────────────────────────────────────────
  cw('Hand Razors', 'Standard', 0.35, 0, 8000, 'Cyberweapon', {
    availability: '5/24 hrs', streetIndex: 1, legalCode: 'R',
    description: '<p>Retractable monofilament-edged blades in the fingertips. (STR+1)L damage, Reach 0. No attribute bonus.</p>',
  }),
  cw('Retractable Hand Blades', 'Standard', 0.45, 0, 15000, 'Cyberweapon', {
    availability: '6/48 hrs', streetIndex: 1, legalCode: 'R',
    description: '<p>Longer retractable blades mounted in the forearm. (STR+2)M damage, Reach 1. No attribute bonus.</p>',
  }),
  cw('Cyberspur', 'Standard', 0.5, 0, 15000, 'Cyberweapon', {
    availability: '6/48 hrs', streetIndex: 1, legalCode: 'R',
    description: '<p>Rigid bone-like spur extending from the knuckle. (STR+2)M damage, Reach 0. No attribute bonus.</p>',
  }),
  cw('Shock Hand', 'Standard', 0.3, 0, 5000, 'Cyberweapon', {
    availability: '6/48 hrs', streetIndex: 2, legalCode: 'R',
    description: '<p>Built-in electroshock weapon in the palm. 6S (Stun) damage vs. unarmored targets; resisted by impact armor. No attribute bonus.</p>',
  }),

  // ── Matrix ────────────────────────────────────────────────────────────────
  cw('Vehicle Control Rig 1', 'Standard', 3, 1, 65000, 'Matrix', {
    availability: '12/14 days', streetIndex: 3, legalCode: 'R',
    description: '<p>Allows direct neural jackpoint control of vehicles. +1 Reaction and +1d6 initiative when jumped in; −2 TN to vehicle skill tests. Incompatible with other VCRs. No stat bonus to character — vehicle bonuses applied separately.</p>',
  }),
  cw('Vehicle Control Rig 2', 'Standard', 4, 2, 130000, 'Matrix', {
    availability: '16/21 days', streetIndex: 3, legalCode: 'R',
    description: '<p>Rating 2 VCR. +2 Reaction and +2d6 initiative when jumped in; −4 TN to vehicle skill tests.</p>',
  }),
  cw('Vehicle Control Rig 3', 'Standard', 5, 3, 260000, 'Matrix', {
    availability: '20/28 days', streetIndex: 3, legalCode: 'R',
    description: '<p>Rating 3 VCR. +3 Reaction and +3d6 initiative when jumped in; −6 TN to vehicle skill tests.</p>',
  }),
  cw('Simsense Recorder', 'Standard', 0.25, 0, 4000, 'Matrix', {
    availability: '4/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Records simsense experiences for playback or sale. No attribute bonus.</p>',
  }),

  // ── Other ─────────────────────────────────────────────────────────────────
  cw('Adrenal Pump 1', 'Standard', 1.5, 1, 40000, 'Other', {
    availability: '10/14 days', streetIndex: 3, legalCode: 'R',
    bonusBod: 1, bonusStr: 1, bonusQui: 1,
    description: '<p>Activates in combat to grant +1 Body, +1 Strength, +1 Quickness until the end of the encounter. Once used, recharge takes 1 hour. Values shown are the bonus while active.</p>',
  }),
  cw('Adrenal Pump 2', 'Standard', 2, 2, 90000, 'Other', {
    availability: '14/21 days', streetIndex: 3, legalCode: 'R',
    bonusBod: 2, bonusStr: 2, bonusQui: 2,
    description: '<p>Activates in combat to grant +2 Body, +2 Strength, +2 Quickness until the end of the encounter.</p>',
  }),
  cw('Trauma Damper', 'Standard', 0.3, 0, 5000, 'Other', {
    availability: '6/48 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Suppresses pain from wounds. Wound modifiers reduced by 1. No attribute bonus.</p>',
  }),
  cw('Pain Editor', 'Standard', 0.5, 0, 15000, 'Other', {
    availability: '8/7 days', streetIndex: 2, legalCode: 'Legal',
    description: '<p>Completely suppresses pain signals. Wound modifiers eliminated but character cannot feel tissue damage. No attribute bonus.</p>',
  }),
  cw('Sleep Regulator', 'Standard', 0.2, 0, 5000, 'Other', {
    availability: '4/24 hrs', streetIndex: 1, legalCode: 'Legal',
    description: '<p>Allows character to function on as little as 3 hours sleep per day. No attribute bonus.</p>',
  }),
];

// ── Populate ──────────────────────────────────────────────────────────────────

const pack = game.packs.get(PACK_ID);
if (!pack) {
  ui.notifications.error(`Pack "${PACK_ID}" not found. Restart Foundry after system.json changes.`);
  return;
}

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let proceed = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Repopulate Cyberware?' },
    content: `<p>The Cyberware compendium contains ${existing.length} entries. Delete and repopulate?</p>`,
    buttons: [
      { label: 'Repopulate', action: 'yes', default: true, callback: () => { proceed = true; } },
      { label: 'Cancel', action: 'cancel' },
    ],
  });
  if (!proceed) return;
}

await pack.configure({ locked: false });
for (const doc of await pack.getDocuments()) await doc.delete();

let created = 0;
for (const data of CYBERWARE) {
  try {
    const tmp = await Item.create(data, { renderSheet: false });
    await pack.importDocument(tmp);
    await tmp.delete();
    created++;
  } catch (err) {
    console.error(`SR3E | Failed to create cyberware "${data.name}":`, err);
    ui.notifications.warn(`SR3E: Failed "${data.name}" — see console.`);
  }
}

await pack.configure({ locked: true });
ui.notifications.info(
  created === CYBERWARE.length
    ? `SR3E: ${created} cyberware items added to the compendium.`
    : `SR3E: ${created}/${CYBERWARE.length} created — ${CYBERWARE.length - created} failed (check console).`
);
