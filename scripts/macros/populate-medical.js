// ════════════════════════════════════════════════════════════════════════════
//  SR3E — Medical Equipment & Services Compendium Populator
//  Paste into a Foundry macro (Type: Script) and run once.
//  Requires a full Foundry restart after updating system.json so that
//  the "Medical Equipment & Services" compendium pack and 'medical' Item
//  type are registered.
// ════════════════════════════════════════════════════════════════════════════

const PACK_ID = 'The2ndChumming3e.sr3e-medical';

// ── Item builder helper ────────────────────────────────────────────────────────

function med(name, category, fields = {}) {
  return {
    name,
    type: 'medical',
    system: {
      category,
      rating:       fields.rating ?? '',
      availability: fields.availability ?? '',
      weight:       fields.weight ?? '',
      cost:         Number(fields.cost) || 0,
      streetIndex:  fields.streetIndex ?? '',
      bookPage:     fields.bookPage ?? '',
    },
  };
}

// ── Rating-ladder helper ─────────────────────────────────────────────────────
// Builds 10 separate items (Rating 1-10) from a per-tier cost table, matching
// the existing convention for graded items (e.g. Wired Reflexes 1/2/3).

function ladder(namePrefix, category, availPrefix, availSuffix, costs, streetIndex, bookPage, step = 1) {
  return costs.map((cost, i) => med(`${namePrefix} ${i + 1}`, category, {
    rating: String(i + 1),
    availability: `${availPrefix + i * step}${availSuffix}`,
    weight: '-',
    cost,
    streetIndex,
    bookPage,
  }));
}

// ── Medical Equipment & Services ────────────────────────────────────────────

const MEDICAL = [

  // ───────────────────────────────────────────────────────────────────────────
  // Medical Equipment — General
  // ───────────────────────────────────────────────────────────────────────────
  med('Archaesthetic', 'Medical Equipment — General', { rating: '-1', availability: '6/7days', weight: '1', cost: 10000, streetIndex: '4', bookPage: 'sr2.???' }),
  med('Bio-Monitor', 'Medical Equipment — General', { rating: '2', availability: '6/72hrs', weight: '1', cost: 1000, streetIndex: '2', bookPage: 'sr3.304' }),
  med('Cybercast', 'Medical Equipment — General', { rating: '+2', availability: '3/12hrs', weight: '1.5', cost: 3000, streetIndex: '2', bookPage: 'sr2.???' }),
  med('Portable Intern Unit', 'Medical Equipment — General', { rating: '1', availability: '3/24hrs', weight: '2', cost: 120, streetIndex: '1.5', bookPage: 'sr2.???' }),
  med('RapiDetox', 'Medical Equipment — General', { rating: '5', availability: '5/4days', weight: '-', cost: 1500, streetIndex: '3', bookPage: 'sr2.???' }),
  med('Stabilization Unit', 'Medical Equipment — General', { rating: '2', availability: '12/1mth', weight: '30', cost: 10000, streetIndex: '3', bookPage: 'sr3.304' }),
  med('Stabilization Unit Deluxe', 'Medical Equipment — General', { rating: '6', availability: '16/1mth', weight: '35', cost: 20000, streetIndex: '3', bookPage: 'sr3.304' }),

  // ───────────────────────────────────────────────────────────────────────────
  // Medical Equipment — Medkits
  // ───────────────────────────────────────────────────────────────────────────
  med('Medkit Rating 1', 'Medical Equipment — Medkits', { rating: '1', availability: 'Always/24hrs', weight: '1', cost: 120, streetIndex: '1.5', bookPage: 'mm.138' }),
  med('Medkit Rating 2', 'Medical Equipment — Medkits', { rating: '2', availability: '1/24hrs', weight: '2', cost: 160, streetIndex: '1.5', bookPage: 'mm.138' }),
  med('Medkit Rating 3', 'Medical Equipment — Medkits', { rating: '3', availability: '2/24hrs', weight: '3', cost: 200, streetIndex: '1.5', bookPage: 'mm.138' }),
  med('Medkit Rating 4', 'Medical Equipment — Medkits', { rating: '4', availability: '3/24hrs', weight: '4', cost: 240, streetIndex: '1.5', bookPage: 'mm.138' }),
  med('Medkit Rating 5', 'Medical Equipment — Medkits', { rating: '5', availability: '4/24hrs', weight: '5', cost: 280, streetIndex: '1.5', bookPage: 'mm.138' }),
  med('Medkit Rating 6', 'Medical Equipment — Medkits', { rating: '6', availability: '5/24hrs', weight: '6', cost: 320, streetIndex: '1.5', bookPage: 'mm.138' }),
  med('Medkit Rating 7', 'Medical Equipment — Medkits', { rating: '7', availability: '6/24hrs', weight: '7', cost: 360, streetIndex: '1.5', bookPage: 'mm.138' }),
  med('Medkit Rating 8', 'Medical Equipment — Medkits', { rating: '8', availability: '7/24hrs', weight: '8', cost: 400, streetIndex: '1.5', bookPage: 'mm.138' }),
  med('Medkit Rating 9', 'Medical Equipment — Medkits', { rating: '9', availability: '8/24hrs', weight: '9', cost: 440, streetIndex: '1.5', bookPage: 'mm.138' }),
  med('Medkit Rating 10', 'Medical Equipment — Medkits', { rating: '10', availability: '9/24hrs', weight: '10', cost: 480, streetIndex: '1.5', bookPage: 'mm.138' }),
  med('Basic Medkit', 'Medical Equipment — Medkits', { rating: '3', availability: '2/24hrs', weight: '3', cost: 200, streetIndex: '1.5', bookPage: 'sr3.304' }),
  med('Medkit Supplies', 'Medical Equipment — Medkits', { availability: '2/24hrs', weight: '-', cost: 50, streetIndex: '1.5', bookPage: 'sr3.304' }),

  // ───────────────────────────────────────────────────────────────────────────
  // Medical Clinics (Shops) — Standard Grade
  // ───────────────────────────────────────────────────────────────────────────
  ...ladder('Medical Clinic Rating', 'Medical Clinics — Standard Grade', 3, '/1wk', [25000, 43200, 68600, 102400, 145800, 200000, 266200, 345600, 439400, 548800], '2', 'mm.138'),

  // Medical Clinics (Shops) — Alpha Grade
  ...ladder('Alpha Medical Clinic Rating', 'Medical Clinics — Alpha Grade', 3, '/1wk', [50000, 86400, 137200, 204800, 291600, 400000, 532400, 691200, 878800, 1097600], '2', 'mm.138'),

  // Medical Clinics (Shops) — Beta Grade
  ...ladder('Beta Medical Clinic Rating', 'Medical Clinics — Beta Grade', 8, '/1wk', [100000, 172800, 274400, 409600, 583200, 800000, 1064800, 1382400, 1757600, 2195200], '2', 'mm.138'),

  // Medical Clinics (Shops) — Delta Grade
  ...ladder('Delta Medical Clinic Rating', 'Medical Clinics — Delta Grade', 12, '/1wk', [200000, 345600, 548800, 819200, 1166400, 1600000, 2129600, 2764800, 3515200, 4390400], '2', 'mm.138'),

  // ───────────────────────────────────────────────────────────────────────────
  // Hospitals (facilities) — Standard Grade  (availability climbs by 2 per tier: 2/4/6.../20)
  // ───────────────────────────────────────────────────────────────────────────
  ...ladder('Hospital Rating', 'Hospitals — Standard Grade', 2, '/1mo', [9604000, 16384000, 26244000, 40000000, 58564000, 82944000, 114244000, 153664000, 202500000, 262144000], '3', 'mm.138', 2),

  // Hospitals (facilities) — Alpha Grade
  ...ladder('Alpha Hospital Rating', 'Hospitals — Alpha Grade', 2, '/1mo', [19208000, 32768000, 52488000, 80000000, 117128000, 165888000, 228488000, 307328000, 405000000, 524288000], '3', 'mm.138', 2),

  // Hospitals (facilities) — Beta Grade
  ...ladder('Beta Hospital Rating', 'Hospitals — Beta Grade', 7, '/1mo', [38416000, 65536000, 104976000, 160000000, 234256000, 331776000, 456976000, 614656000, 810000000, 1048576000], '3', 'mm.138', 2),

  // Hospitals (facilities) — Delta Grade
  ...ladder('Delta Hospital Rating', 'Hospitals — Delta Grade', 11, '/1mo', [76832000, 131072000, 209952000, 320000000, 468512000, 663552000, 913952000, 1229312000, 1620000000, 2097152000], '3', 'mm.138', 2),

];

// ── Main ──────────────────────────────────────────────────────────────────────

const pack = game.packs.get(PACK_ID);
if (!pack) {
  ui.notifications.error(
    `SR3E: Medical Equipment & Services pack not found (${PACK_ID}). ` +
    `Make sure Foundry was fully restarted after adding the pack to system.json.`
  );
  return;
}

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let proceed = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Medical Equipment — Already Populated' },
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
for (const data of MEDICAL) {
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
  created === MEDICAL.length
    ? `SR3E: ${created} medical equipment/service entries added to the compendium.`
    : `SR3E: ${created}/${MEDICAL.length} created — ${MEDICAL.length - created} failed (check console).`
);
