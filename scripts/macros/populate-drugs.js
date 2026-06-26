// ════════════════════════════════════════════════════════════════════════════
//  SR3E — Drugs & Toxins Compendium Populator
//  Paste into a Foundry macro (Type: Script) and run once.
//  Requires a full Foundry restart after updating system.json so that
//  the "Drugs & Toxins" compendium pack and 'drug' Item type are registered.
// ════════════════════════════════════════════════════════════════════════════

const PACK_ID = 'The2ndChumming3e.sr3e-drugs';

// ── Item builder helper ────────────────────────────────────────────────────────
// Some source-table rows are missing fields entirely (toxins have no addiction;
// recreational drugs have no speed/vector) — every field defaults to '' / 0 so
// the sheet always renders cleanly either way.

function drug(name, category, fields = {}) {
  return {
    name,
    type: 'drug',
    system: {
      category,
      addiction:    fields.addiction ?? '',
      tolerance:    fields.tolerance ?? '',
      effect:       fields.effect ?? '',
      speed:        fields.speed ?? '',
      vector:       fields.vector ?? '',
      availability: fields.availability ?? '',
      cost:         Number(fields.cost) || 0,
      streetIndex:  fields.streetIndex ?? '',
      bookPage:     fields.bookPage ?? '',
    },
  };
}

// ── Drugs ─────────────────────────────────────────────────────────────────────

const DRUGS = [

  // ───────────────────────────────────────────────────────────────────────────
  // Pharmaceutical Compounds (per dose) — toxins, gases, and biotech agents.
  // Speed = onset time, Vector = delivery method (note: several gas-weapon
  // entries have these two reversed in the original source table; preserved
  // as printed rather than "corrected").
  // ───────────────────────────────────────────────────────────────────────────
  drug('ACTH', 'Pharmaceutical Compounds', { speed: 'Instant', vector: 'Inhalation', availability: '14/21 days', cost: 100, streetIndex: '1', bookPage: 'mm.118' }),
  drug('Anabolic Steroids', 'Pharmaceutical Compounds', { speed: '-', vector: 'Ingestion, Injection', availability: '4/12 hrs', cost: 40, streetIndex: '1', bookPage: 'mm.118' }),
  drug('Arsenic', 'Pharmaceutical Compounds', { speed: '1D6 hrs', vector: 'Ingestion', availability: '4/12 hrs', cost: 40, streetIndex: '1', bookPage: 'mm.118' }),
  drug('Atropine', 'Pharmaceutical Compounds', { speed: 'Immediate/15 min', vector: 'Injection', availability: '5/12 hrs', cost: 600, streetIndex: '1', bookPage: 'mm.118' }),
  drug('CS/Tear Gas', 'Pharmaceutical Compounds', { speed: 'Contact or Inhalation', vector: '1 Combat Turn', availability: '4/36 hrs', cost: 10, streetIndex: '1', bookPage: 'mm.118' }),
  drug('Cyanide', 'Pharmaceutical Compounds', { speed: 'Immediate or 1 min', vector: 'Ingestion, Injection, Inhalation', availability: '3/48 hrs', cost: 360, streetIndex: '1', bookPage: 'mm.119' }),
  drug('Ebola Plus (1 dose)', 'Pharmaceutical Compounds', { availability: '20/30days', cost: 5000, streetIndex: '6', bookPage: 'sota.30' }),
  drug('Gamma-Anthrax (1 dose)', 'Pharmaceutical Compounds', { availability: '14/30days', cost: 180, streetIndex: '6', bookPage: 'st.81' }),
  drug('Gamma-Anthrax (1 dose)', 'Pharmaceutical Compounds', { availability: '16/30days', cost: 1250, streetIndex: '5', bookPage: 'sota.30' }),
  drug('Green Ring 3', 'Pharmaceutical Compounds', { speed: 'Immediate', vector: 'Contact or Inhalation', availability: '500', streetIndex: '5', bookPage: 'mm.119' }),
  drug('Green Ring 8', 'Pharmaceutical Compounds', { speed: 'Immediate', vector: 'Contact or Inhalation', availability: '800', streetIndex: '5', bookPage: 'mm.119' }),
  drug('Hyper', 'Pharmaceutical Compounds', { speed: 'Immediate', vector: 'Inhalation or Injection', availability: '180', streetIndex: '.9', bookPage: 'mm.119' }),
  drug('Jazz', 'Pharmaceutical Compounds', { speed: 'Immediate', vector: 'Inhalation', availability: '8/4 days', cost: 40, streetIndex: '3', bookPage: 'mm.119' }),
  drug('Kamikaze', 'Pharmaceutical Compounds', { speed: 'Immediate', vector: 'Inhalation', availability: '5/4 days', cost: 50, streetIndex: '5', bookPage: 'mm.120' }),
  drug('Laes', 'Pharmaceutical Compounds', { speed: 'Immediate', vector: 'Injection', availability: '21/21 days', cost: 1000, streetIndex: '2', bookPage: 'mm.120' }),
  drug('Long Haul', 'Pharmaceutical Compounds', { speed: '10 min', vector: 'Injection', availability: '6/6 days', cost: 500, streetIndex: '2', bookPage: 'mm.120' }),
  drug('MAO', 'Pharmaceutical Compounds', { speed: 'Immediate', vector: 'Injection', availability: '5/36 hrs', cost: 280, streetIndex: '2', bookPage: 'mm.120' }),
  drug('Nausea Gas', 'Pharmaceutical Compounds', { speed: '5 Combat Turns', vector: 'Inhalation', availability: '4/48 hrs', cost: 10, streetIndex: '2', bookPage: 'mm.121' }),
  drug('Neuro-stun IX', 'Pharmaceutical Compounds', { speed: '1 Combat Turn', vector: 'Contact or Inhalation', availability: '6/36 hrs', cost: 20, streetIndex: '2', bookPage: 'mm.121' }),
  drug('Neuro-stun X', 'Pharmaceutical Compounds', { speed: '1 Combat Turn', vector: 'Contact or Inhalation', availability: '6/36 hrs', cost: 30, streetIndex: '2', bookPage: 'mm.121' }),
  drug('Pepper Punch', 'Pharmaceutical Compounds', { speed: '1 Combat Turn', vector: 'Contact or Inhalation', availability: '8/48 hrs', cost: 5, streetIndex: '1', bookPage: 'mm.121' }),
  drug('Psyche', 'Pharmaceutical Compounds', { speed: '10 min', vector: 'Ingestion', availability: '8/72 hrs', cost: 500, streetIndex: '2', bookPage: 'mm.121' }),
  drug('Seven-7', 'Pharmaceutical Compounds', { speed: '1 Combat Turn', vector: 'Contact or Inhalation', availability: '20/2 wks', cost: 1000, streetIndex: '5', bookPage: 'mm.121' }),
  drug('Doom (1 dose)', 'Pharmaceutical Compounds', { availability: '14/30days', cost: 500, streetIndex: '5', bookPage: 'st.80' }),
  drug('Myco-Protein', 'Pharmaceutical Compounds', { availability: 'always', cost: 25, streetIndex: '1', bookPage: 'st.82' }),
  drug("Witch's Moss", 'Pharmaceutical Compounds', { bookPage: 'mm.123' }),

  // ───────────────────────────────────────────────────────────────────────────
  // Depressants
  // ───────────────────────────────────────────────────────────────────────────
  drug('Alcohol (bottle)', 'Depressants', { addiction: '2M', tolerance: '3', effect: '50', availability: 'always', cost: 10, streetIndex: '.8', bookPage: 'nagee.101' }),
  drug('Barbiturates', 'Depressants', { addiction: '4M+3P', tolerance: '3', effect: '5', availability: '4/3hrs', cost: 1, streetIndex: '.8', bookPage: 'nagee.101' }),
  drug('Benzodiazepines', 'Depressants', { addiction: '2M+2P', tolerance: '5', effect: '5', availability: '4/3hrs', cost: 1, streetIndex: '.9', bookPage: 'nagee.101' }),
  drug('Burn', 'Depressants', { addiction: '2M', tolerance: '2', effect: '20/100', availability: '2/30min', cost: 5, streetIndex: '1', bookPage: 'mm.121' }),
  drug('Butaqualide', 'Depressants', { addiction: '5M', tolerance: '3', effect: '10', availability: '5/1hr', cost: 20, streetIndex: '2.5', bookPage: 'nagee.102' }),
  drug('Chloral Hydrate', 'Depressants', { addiction: '4M+3P', tolerance: '3', effect: '5', availability: '5/4hrs', cost: 2, streetIndex: '1', bookPage: 'nagee.102' }),
  drug('Glutethimide', 'Depressants', { addiction: '3M+4P', tolerance: '4', effect: '3', availability: '5/4hrs', cost: 3, streetIndex: '1', bookPage: 'nagee.102' }),
  drug('Marijuana (ingested)', 'Depressants', { addiction: '3M', tolerance: '3', effect: '10', availability: '3/1hr', cost: 20, streetIndex: '.5', bookPage: 'nagee.102' }),
  drug('Marijuana (smoked)', 'Depressants', { addiction: '3M', tolerance: '3', effect: '10', availability: '3/1hr', cost: 4, streetIndex: '.5', bookPage: 'nagee.102' }),
  drug('Methaqualone', 'Depressants', { addiction: '4M+4P', tolerance: '4', effect: '2', availability: '4/3hrs', cost: 3, streetIndex: '1.2', bookPage: 'nagee.102' }),
  drug('Nicotine (pack of cigarettes)', 'Depressants', { addiction: '3M', tolerance: '1', effect: '20', availability: 'always', cost: 2, streetIndex: '.8', bookPage: 'nagee.102' }),
  drug('Paxium', 'Depressants', { addiction: '2M', tolerance: '4', effect: '20', availability: '3/1hr', cost: 5, streetIndex: '2.5', bookPage: 'nagee.102' }),
  drug('Sonniene', 'Depressants', { addiction: '4M', tolerance: '3', effect: '5', availability: '4/1hr', cost: 80, streetIndex: '3', bookPage: 'nagee.102' }),

  // ───────────────────────────────────────────────────────────────────────────
  // Designer Drugs
  // ───────────────────────────────────────────────────────────────────────────
  drug('Diamond-Four', 'Designer Drugs', { addiction: '2P', tolerance: '2', effect: '10', availability: '10/48hrs', cost: 1500, streetIndex: '3.5', bookPage: 'nagee.104' }),
  drug('FoolKiller', 'Designer Drugs', { addiction: '5P', tolerance: '2', effect: '10', availability: '8/3hrs', cost: 35, streetIndex: '2.5', bookPage: 'nagee.104' }),
  drug('Genesios Three', 'Designer Drugs', { addiction: '2M', tolerance: '5', effect: '20', availability: '14/14days', cost: 1000, streetIndex: '8.5', bookPage: 'nagee.104' }),
  drug('Musk', 'Designer Drugs', { addiction: '3M', tolerance: '3', effect: '20', availability: '3/1hr', cost: 250, streetIndex: '2', bookPage: 'nagee.102' }),
  drug('NuYou', 'Designer Drugs', { addiction: '6M', tolerance: '3', effect: '10', availability: '4/2hrs', cost: 350, streetIndex: '3', bookPage: 'nagee.102' }),
  drug('Schwarzeneine', 'Designer Drugs', { addiction: '6P', tolerance: '4', effect: '5', availability: '8/3hrs', cost: 45, streetIndex: '3.5', bookPage: 'nagee.102' }),
  drug('Shades', 'Designer Drugs', { addiction: '5M', tolerance: '2', effect: '5', availability: '4/1hr', cost: 30, streetIndex: '2', bookPage: 'nagee.102' }),

  // ───────────────────────────────────────────────────────────────────────────
  // Hallucinogens
  // ───────────────────────────────────────────────────────────────────────────
  drug('Ecstacy', 'Hallucinogens', { addiction: '4M', tolerance: '4', effect: '20', availability: '5/7hrs', cost: 150, streetIndex: '4', bookPage: 'nagee.104' }),
  drug('LSD (one tab)', 'Hallucinogens', { addiction: '1M', tolerance: '2', effect: '4', availability: '4/7hrs', cost: 5, streetIndex: '1.5', bookPage: 'nagee.104' }),
  drug('LSD (100 tabs)', 'Hallucinogens', { addiction: '1M', tolerance: '2', effect: '4', availability: '4/7hrs', cost: 200, streetIndex: '1.5', bookPage: 'nagee.104' }),
  drug('MDA, MDMA, other amphetamines', 'Hallucinogens', { addiction: '2M', tolerance: '2', effect: '6', availability: '4/7hrs', cost: 10, streetIndex: '1.7', bookPage: 'nagee.105' }),
  drug('Mescaline', 'Hallucinogens', { addiction: '2M', tolerance: '2', effect: '4', availability: '4/5hrs', cost: 80, streetIndex: '2', bookPage: 'nagee.105' }),
  drug('Phencyclidine', 'Hallucinogens', { addiction: '5M', tolerance: '4', effect: '2', availability: '8/14hrs', cost: 25, streetIndex: '2.5', bookPage: 'nagee.105' }),
  drug('Ribopropylmethionine', 'Hallucinogens', { addiction: '8P', tolerance: '2', effect: '2', availability: '10/7hrs', cost: 100, streetIndex: '3', bookPage: 'nagee.105' }),
  drug('Zen', 'Hallucinogens', { addiction: '5M', tolerance: '3', effect: '10', availability: '5/10hrs', cost: 120, streetIndex: '3', bookPage: 'nagee.105' }),
  drug('Zen', 'Hallucinogens', { addiction: '3M', tolerance: '2', effect: '5/50', availability: '3/36hrs', cost: 5, streetIndex: '1', bookPage: 'mm.121' }),

  // ───────────────────────────────────────────────────────────────────────────
  // Magical Compounds
  // ───────────────────────────────────────────────────────────────────────────
  drug('Altyerre', 'Magical Compounds', { bookPage: 'tal.109' }),
  drug('Animal Tongue', 'Magical Compounds', { bookPage: 'mm.123' }),
  drug('Deepweed', 'Magical Compounds', { addiction: '7P', tolerance: '2', effect: '5/20', cost: 0, bookPage: 'mm.123' }),
  drug('Kuman-Nhepa', 'Magical Compounds', { bookPage: 'tal.109' }),
  drug('Immortal Flower', 'Magical Compounds', { bookPage: 'mm.123' }),
  drug('Little Smoke', 'Magical Compounds', { bookPage: 'mm.123' }),
  drug('Rock Lizard Blood', 'Magical Compounds', { bookPage: 'mm.123' }),
  drug('Spirit Strength', 'Magical Compounds', { bookPage: 'mm.123' }),
  drug("Witch's Moss", 'Magical Compounds', { bookPage: 'mm.123' }),
  drug("Wudu'aku", 'Magical Compounds', { bookPage: 'tal.109' }),

  // ───────────────────────────────────────────────────────────────────────────
  // Narcotics
  // ───────────────────────────────────────────────────────────────────────────
  drug('Bliss', 'Narcotics', { addiction: '5M/5P', tolerance: '2', effect: '2/30', availability: '2/30min', cost: 15, streetIndex: '2', bookPage: 'mm.121' }),
  drug('Heroin', 'Narcotics', { addiction: '5M+5P', tolerance: '3', effect: '3', availability: '5/2hrs', cost: 20, streetIndex: '2.5', bookPage: 'nagee.106' }),
  drug('Hydromorphone', 'Narcotics', { addiction: '4M+4P', tolerance: '5', effect: '7', availability: '5/6hrs', cost: 250, streetIndex: '1.5', bookPage: 'nagee.106' }),
  drug('Meperidine', 'Narcotics', { addiction: '4M+4P', tolerance: '5', effect: '4', availability: '6/6hrs', cost: 500, streetIndex: '2.5', bookPage: 'nagee.106' }),
  drug('Methadone', 'Narcotics', { addiction: '2M+3P', tolerance: '3', effect: '5', availability: '5/6hrs', cost: 50, streetIndex: '2', bookPage: 'nagee.106' }),
  drug('Morphine', 'Narcotics', { addiction: '4M+4P', tolerance: '4', effect: '10', availability: '4/3hrs', cost: 150, streetIndex: '1.25', bookPage: 'nagee.106' }),
  drug('Opium', 'Narcotics', { addiction: '4M+4P', tolerance: '3', effect: '15', availability: '6/24hrs', cost: 50, streetIndex: '1.25', bookPage: 'nagee.106' }),
  drug('Somaware Biotech Sleep Inductor', 'Narcotics', { addiction: '4M', tolerance: '15', effect: '10', availability: '2/6hrs', cost: 400, streetIndex: '1', bookPage: 'cb3.101' }),

  // ───────────────────────────────────────────────────────────────────────────
  // Stimulants
  // ───────────────────────────────────────────────────────────────────────────
  drug('ACTH', 'Stimulants', { tolerance: '3', effect: '10/-', availability: '5/12hrs', cost: 100, streetIndex: '1', bookPage: 'mm.117' }),
  drug('Amphetamines (50 tablets)', 'Stimulants', { addiction: '5P', tolerance: '3', effect: '6', availability: '4/3hrs', cost: 75, streetIndex: '1.5', bookPage: 'nagee.107' }),
  drug('Anabolic Steroids', 'Stimulants', { addiction: '3P', effect: '10/10', availability: '4/12hrs', cost: 40, streetIndex: '1', bookPage: 'mm.117' }),
  drug('Brown Study', 'Stimulants', { addiction: '1M', tolerance: '4', effect: '10', availability: '6/6hrs', cost: 35, streetIndex: '3', bookPage: 'nagee.107' }),
  drug('Caffeine (100 tablets)', 'Stimulants', { addiction: '1M', tolerance: '3', effect: '50', availability: 'always', cost: 5, streetIndex: '1', bookPage: 'nagee.107' }),
  drug('Cram', 'Stimulants', { addiction: '4M', tolerance: '2', effect: '5/50', availability: '4/12hrs', cost: 20, streetIndex: '1', bookPage: 'mm.121' }),
  drug('Cocaine', 'Stimulants', { addiction: '6P', tolerance: '3', effect: '5', availability: '4/1hr', cost: 10, streetIndex: '2', bookPage: 'nagee.107' }),
  drug('Endorphins', 'Stimulants', { addiction: '4P', tolerance: '4', effect: '5', availability: '6/3hrs', cost: 30, streetIndex: '3', bookPage: 'nagee.107' }),
  drug('J', 'Stimulants', { addiction: '1M', tolerance: '1', effect: '50', availability: '10/3hrs', cost: 600, streetIndex: '4', bookPage: 'nagee.107' }),
  drug('Jazz', 'Stimulants', { addiction: '4M/5P', tolerance: '2', effect: '2/8', availability: '8/4days', cost: 40, streetIndex: '3', bookPage: 'mm.119' }),
  drug('Kamikaze', 'Stimulants', { addiction: '4P', tolerance: '2', effect: '2/10', availability: '5/4days', cost: 50, streetIndex: '5', bookPage: 'mm.???' }),
  drug('Long Haul', 'Stimulants', { addiction: '2M', tolerance: '2', effect: '10/10', availability: '6/600', cost: 500, streetIndex: '2', bookPage: 'mm.120' }),
  drug('Methylphenidate', 'Stimulants', { addiction: '3P', tolerance: '5', effect: '4', availability: '4/3hrs', cost: 25, streetIndex: '1.8', bookPage: 'nagee.108' }),
  drug('Nitro', 'Stimulants', { addiction: '5M/8P', tolerance: '3', effect: '2/5', availability: '6/48hrs', cost: 100, streetIndex: '1', bookPage: 'mm.121' }),
  drug('Novocoke', 'Stimulants', { addiction: '6M/5P', tolerance: '2', effect: '3/50', availability: '3/12hrs', cost: 20, streetIndex: '1', bookPage: 'mm.121' }),
  drug('Phenmetrazine (10 tablets)', 'Stimulants', { addiction: '5P', tolerance: '4', effect: '5', availability: '5/3hrs', cost: 75, streetIndex: '1.5', bookPage: 'nagee.108' }),
  drug('Psyche', 'Stimulants', { addiction: '4M', tolerance: '2', effect: '10/20', availability: '8/72hrs', cost: 500, streetIndex: '2', bookPage: 'mm.121' }),
  drug('Spaz', 'Stimulants', { addiction: '5P', tolerance: '1', effect: '5', availability: '8/24hrs', cost: 10, streetIndex: '1.5', bookPage: 'nagee.108' }),
  drug('Triphetamines (50 tablets)', 'Stimulants', { addiction: '2M', tolerance: '4', effect: '5', availability: '5/3hrs', cost: 25, streetIndex: '1.5', bookPage: 'nagee.108' }),

];

// ── Main ──────────────────────────────────────────────────────────────────────

const pack = game.packs.get(PACK_ID);
if (!pack) {
  ui.notifications.error(
    `SR3E: Drugs & Toxins pack not found (${PACK_ID}). ` +
    `Make sure Foundry was fully restarted after adding the pack to system.json.`
  );
  return;
}

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let proceed = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Drugs & Toxins — Already Populated' },
    content: `<p>The compendium already contains <strong>${existing.length}</strong> document(s).</p>
              <p>Re-running will create duplicates. Continue anyway?</p>`,
    buttons: [
      { label: 'Yes, create anyway', action: 'yes', default: false, callback: () => { proceed = true; } },
      { label: 'Cancel', action: 'cancel', default: true },
    ],
  });
  if (!proceed) return;
}

await pack.configure({ locked: false });

let created = 0;
for (const data of DRUGS) {
  try {
    const tmp = await Item.create(data, { renderSheet: false });
    await pack.importDocument(tmp);
    await tmp.delete();
    created++;
  } catch (err) {
    console.error(`SR3E | Failed to create "${data.name}":`, err);
    ui.notifications.warn(`SR3E: Failed to create "${data.name}" — see console (F12) for details.`);
  }
}

await pack.configure({ locked: true });

ui.notifications.info(
  created === DRUGS.length
    ? `SR3E: ${created} drugs/toxins added to the compendium.`
    : `SR3E: ${created}/${DRUGS.length} created — ${DRUGS.length - created} failed (check console).`
);
