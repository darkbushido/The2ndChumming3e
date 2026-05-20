// Populate the sr3e-bioware compendium with all standard bioware.
// Paste into a Script macro and run as GM. Safe to re-run — prompts before overwriting.

const PACK_ID = 'The2ndChumming3e.sr3e-bioware';

// ── Helpers ───────────────────────────────────────────────────────────────────

function bw(name, grade, bioIndex, rating, cost, category, opts = {}) {
  const availability = opts.availability ?? '';
  return {
    name,
    type: 'bioware',
    system: {
      grade,
      bioIndex,
      bioIndexBase:    bioIndex,      // Standard-grade base for grade recalc
      rating,
      cost,
      costBase:        cost,          // Standard-grade base for grade recalc
      availability,
      availabilityBase: availability, // Standard-grade base for grade recalc
      biowareCategory: category,
      streetIndex:     opts.streetIndex  ?? 1,
      mods:            opts.mods         ?? '',
      bookPage:        opts.bookPage     ?? '',
      description:     opts.description  ?? '',
      bonusBod:        opts.bonusBod     ?? 0,
      bonusQui:        opts.bonusQui     ?? 0,
      bonusStr:        opts.bonusStr     ?? 0,
      bonusCha:        opts.bonusCha     ?? 0,
      bonusInt:        opts.bonusInt     ?? 0,
      bonusWil:        opts.bonusWil     ?? 0,
      bonusRea:        opts.bonusRea     ?? 0,
      bonusInitDice:   opts.bonusInitDice ?? 0,
    },
  };
}

// ── Bioware data ──────────────────────────────────────────────────────────────
// Bio Index is for Standard grade. Alphaware = ×0.75, Betaware = ×0.6 (handled by GM grade selection)

const BIOWARE = [

  // ── Neurological ──────────────────────────────────────────────────────────
  bw('Cerebral Booster 1', 'Standard', 0.6, 1, 45000, 'Neurological', {
    availability: '8/7 days', streetIndex: 2,
    bonusInt: 1,
    description: '<p>+1 Intelligence. Enhances cognitive processing through selective neural tissue augmentation.</p>',
  }),
  bw('Cerebral Booster 2', 'Standard', 1.2, 2, 95000, 'Neurological', {
    availability: '12/14 days', streetIndex: 2,
    bonusInt: 2,
    description: '<p>+2 Intelligence.</p>',
  }),
  bw('Cerebral Booster 3', 'Standard', 1.8, 3, 145000, 'Neurological', {
    availability: '16/28 days', streetIndex: 2,
    bonusInt: 3,
    description: '<p>+3 Intelligence. Maximum rating.</p>',
  }),

  bw('Mnemonic Enhancer 1', 'Standard', 0.3, 1, 8000, 'Neurological', {
    availability: '6/48 hrs', streetIndex: 1,
    description: '<p>Provides one extra die for knowledge skills and memory-related tasks. No attribute bonus.</p>',
  }),
  bw('Mnemonic Enhancer 2', 'Standard', 0.6, 2, 16000, 'Neurological', {
    availability: '8/7 days', streetIndex: 1,
    description: '<p>Provides two extra dice for knowledge skills and memory-related tasks. No attribute bonus.</p>',
  }),
  bw('Mnemonic Enhancer 3', 'Standard', 0.9, 3, 24000, 'Neurological', {
    availability: '10/14 days', streetIndex: 1,
    description: '<p>Provides three extra dice for knowledge skills and memory-related tasks. No attribute bonus.</p>',
  }),

  bw('Synaptic Booster 1', 'Standard', 0.5, 1, 35000, 'Neurological', {
    availability: '8/7 days', streetIndex: 2,
    bonusRea: 1, bonusInitDice: 1,
    description: '<p>+1 Reaction, +1d6 Initiative. Bioware equivalent of wired reflexes; compatible with alphaware/betaware only.</p>',
  }),
  bw('Synaptic Booster 2', 'Standard', 1.0, 2, 75000, 'Neurological', {
    availability: '12/14 days', streetIndex: 2,
    bonusRea: 2, bonusInitDice: 2,
    description: '<p>+2 Reaction, +2d6 Initiative.</p>',
  }),
  bw('Synaptic Booster 3', 'Standard', 1.5, 3, 120000, 'Neurological', {
    availability: '16/28 days', streetIndex: 2,
    bonusRea: 3, bonusInitDice: 3,
    description: '<p>+3 Reaction, +3d6 Initiative. Maximum rating.</p>',
  }),

  // ── Muscular ─────────────────────────────────────────────────────────────
  bw('Muscle Augmentation 1', 'Standard', 0.3, 1, 8000, 'Muscular', {
    availability: '6/48 hrs', streetIndex: 1,
    bonusStr: 1,
    description: '<p>+1 Strength. Enhanced muscle fibre density through selective tissue culture.</p>',
  }),
  bw('Muscle Augmentation 2', 'Standard', 0.6, 2, 16000, 'Muscular', {
    availability: '8/7 days', streetIndex: 1,
    bonusStr: 2,
    description: '<p>+2 Strength.</p>',
  }),
  bw('Muscle Augmentation 3', 'Standard', 0.9, 3, 24000, 'Muscular', {
    availability: '10/14 days', streetIndex: 1,
    bonusStr: 3,
    description: '<p>+3 Strength.</p>',
  }),
  bw('Muscle Augmentation 4', 'Standard', 1.2, 4, 32000, 'Muscular', {
    availability: '12/21 days', streetIndex: 1,
    bonusStr: 4,
    description: '<p>+4 Strength. Maximum rating.</p>',
  }),

  bw('Muscle Toner 1', 'Standard', 0.3, 1, 12000, 'Muscular', {
    availability: '6/48 hrs', streetIndex: 1,
    bonusQui: 1,
    description: '<p>+1 Quickness. Improved fast-twitch muscle fibre response.</p>',
  }),
  bw('Muscle Toner 2', 'Standard', 0.6, 2, 24000, 'Muscular', {
    availability: '8/7 days', streetIndex: 1,
    bonusQui: 2,
    description: '<p>+2 Quickness.</p>',
  }),
  bw('Muscle Toner 3', 'Standard', 0.9, 3, 36000, 'Muscular', {
    availability: '10/14 days', streetIndex: 1,
    bonusQui: 3,
    description: '<p>+3 Quickness.</p>',
  }),
  bw('Muscle Toner 4', 'Standard', 1.2, 4, 48000, 'Muscular', {
    availability: '12/21 days', streetIndex: 1,
    bonusQui: 4,
    description: '<p>+4 Quickness. Maximum rating.</p>',
  }),

  // ── Glandular ─────────────────────────────────────────────────────────────
  bw('Tailored Pheromones 1', 'Standard', 0.6, 1, 22000, 'Glandular', {
    availability: '8/7 days', streetIndex: 1,
    bonusCha: 1,
    description: '<p>+1 Charisma. Customised pheromone output increases social effectiveness.</p>',
  }),
  bw('Tailored Pheromones 2', 'Standard', 1.2, 2, 45000, 'Glandular', {
    availability: '10/14 days', streetIndex: 1,
    bonusCha: 2,
    description: '<p>+2 Charisma.</p>',
  }),
  bw('Tailored Pheromones 3', 'Standard', 1.8, 3, 70000, 'Glandular', {
    availability: '14/21 days', streetIndex: 1,
    bonusCha: 3,
    description: '<p>+3 Charisma. Maximum rating.</p>',
  }),

  bw('Suprathyroid Gland', 'Standard', 1.5, 0, 55000, 'Glandular', {
    availability: '10/14 days', streetIndex: 2,
    bonusBod: 1, bonusStr: 1, bonusQui: 1, bonusRea: 2,
    description: '<p>+1 Body, +1 Strength, +1 Quickness, +2 Reaction. Enhanced hormonal regulation boosts overall physical performance. Cannot be combined with adrenal pump.</p>',
  }),

  bw('Adrenal Surge', 'Standard', 0.8, 0, 28000, 'Glandular', {
    availability: '8/7 days', streetIndex: 2,
    bonusStr: 1, bonusQui: 1,
    description: '<p>+1 Strength, +1 Quickness. Controlled adrenaline release for combat situations. Bonuses shown are the active state; the item can be toggled.</p>',
  }),

  // ── Cardiovascular ────────────────────────────────────────────────────────
  bw('Platelet Factories', 'Standard', 0.3, 0, 7500, 'Cardiovascular', {
    availability: '6/48 hrs', streetIndex: 1,
    description: '<p>Accelerates blood clotting. Bleeding-out damage reduced. No attribute bonus.</p>',
  }),
  bw('Toxin Extractor 1', 'Standard', 0.4, 1, 9000, 'Cardiovascular', {
    availability: '6/48 hrs', streetIndex: 1,
    description: '<p>Provides 1 extra die when resisting toxins, drugs, and disease. No attribute bonus.</p>',
  }),
  bw('Toxin Extractor 2', 'Standard', 0.8, 2, 18000, 'Cardiovascular', {
    availability: '8/7 days', streetIndex: 1,
    description: '<p>Provides 2 extra dice when resisting toxins, drugs, and disease. No attribute bonus.</p>',
  }),
  bw('Toxin Extractor 3', 'Standard', 1.2, 3, 27000, 'Cardiovascular', {
    availability: '10/14 days', streetIndex: 1,
    description: '<p>Provides 3 extra dice when resisting toxins, drugs, and disease. No attribute bonus.</p>',
  }),

  bw('Enhanced Articulation', 'Standard', 0.6, 0, 24000, 'Cardiovascular', {
    availability: '8/7 days', streetIndex: 1,
    description: '<p>Improved joint and tendon performance. Provides +1 die to all physical skills (not Unarmed Combat or Quickness tests). No attribute bonus.</p>',
  }),

  // ── Skeletal ─────────────────────────────────────────────────────────────
  bw('Damage Compensators 1', 'Standard', 0.5, 1, 8000, 'Skeletal', {
    availability: '6/48 hrs', streetIndex: 1,
    description: '<p>Reduces wound modifiers by 1 box. No attribute bonus.</p>',
  }),
  bw('Damage Compensators 2', 'Standard', 1.0, 2, 16000, 'Skeletal', {
    availability: '8/7 days', streetIndex: 1,
    description: '<p>Reduces wound modifiers by 2 boxes. No attribute bonus.</p>',
  }),
  bw('Damage Compensators 3', 'Standard', 1.5, 3, 24000, 'Skeletal', {
    availability: '10/14 days', streetIndex: 1,
    description: '<p>Reduces wound modifiers by 3 boxes. No attribute bonus.</p>',
  }),

  bw('Sleep Regulator', 'Standard', 0.2, 0, 5000, 'Skeletal', {
    availability: '4/24 hrs', streetIndex: 1,
    description: '<p>Functions on 3 hours sleep per day instead of 8. No attribute bonus.</p>',
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
    window: { title: 'Repopulate Bioware?' },
    content: `<p>The Bioware compendium contains ${existing.length} entries. Delete and repopulate?</p>`,
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
for (const data of BIOWARE) {
  try {
    const tmp = await Item.create(data, { renderSheet: false });
    await pack.importDocument(tmp);
    await tmp.delete();
    created++;
  } catch (err) {
    console.error(`SR3E | Failed to create bioware "${data.name}":`, err);
    ui.notifications.warn(`SR3E: Failed "${data.name}" — see console.`);
  }
}

await pack.configure({ locked: true });
ui.notifications.info(
  created === BIOWARE.length
    ? `SR3E: ${created} bioware items added to the compendium.`
    : `SR3E: ${created}/${BIOWARE.length} created — ${BIOWARE.length - created} failed (check console).`
);
