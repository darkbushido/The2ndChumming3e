/**
 * Abbreviated cyberware/bioware names → the book's own wording · TODO 87
 *
 * The shipped packs inherit contracted names from the Shadowrun Character Generator's
 * fixed-width UI — `Muscle Replac. [1]`, `Eyes, Vis Mag Ele[1]`, `Str Enh [3] (Pair)`.
 * **107 distinct stems cover 221 of the 818 cyberware/bioware items.**
 *
 * ⚠ **This is not only cosmetic — it has already caused a false finding.** Searching for
 * `^muscle replacement` and `^reaction enhancer` returned nothing and both were reported as
 * *"in no pack at all"* and needing to be created. They ship, correctly, under the
 * abbreviations.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ⚠ **THE ABBREVIATION IS KEPT, in `system.srcgName`. Renaming alone would break bonuses.**
 *
 * `SRCG_BONUSES` (`srcg-bonuses.js`) is keyed by the **upstream** name, and it is
 * **generated** by `tools/build-mods-bonuses.mjs` from upstream data. Rename the pack items
 * and the next regeneration silently stops matching 151 entries — a bonus just stops applying,
 * with no error. `CLAUDE.md`'s Source-books section also records that the upstream codes were
 * kept deliberately *"so a future re-import lines up"*.
 *
 * So the rule is: **`name` is what a player reads; `srcgName` is what code joins on.**
 * `SR3EActor._srcgKey(item)` returns `srcgName ?? name`, and every name-keyed consumer uses it.
 * Upstream alignment survives, and an un-migrated character keeps working because their
 * embedded copy still carries the old name in BOTH fields.
 *
 * ⚠ **The regex registries were already safe and are untouched.**
 * `SR3E.quicknessNotForReaction` matches `/^muscle\s*replac/i`, which matches the abbreviation
 * *and* the expansion. That is why they were written as stems — see the "search a stem, never
 * a full name" note in CLAUDE.md.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ⚠ **MATCHED AS A PREFIX, longest key first**, so a rating or qualifier suffix rides along
 * untouched: `Muscle Replac. [1]` → `Muscle Replacement [1]`, and the awkward
 * `Str Enh [4]  w/Torso` → `Strength Enhancement [4]  w/Torso` without needing its own entry.
 *
 * ⚠ **Every entry below was read off the printed page**, located by each item's own `bookPage`.
 * Two were genuinely ambiguous and would have been guessed wrong:
 *   · `Eye, Laser Mic.` is a **Microphone**, not a microscope (M&M p.14).
 *   · `Nano-Bio sys.` is a **Nano-biomonitor**, not a "nano-bio system" (M&M p.91).
 *
 * ⚠ **Cybertechnology (`ct`, 9 stems) and State of the Art (`sota`, 1 stem) are ABSENT from
 * this map because their PDFs are not in the library** — `Obv.Cyb.Arm Semi.natCov.` and
 * `Eyes, L 1shot Flash P.rload` are certainly expandable by eye, but not *verifiably*, and a
 * plausible invention is worse than a visible abbreviation. They are listed in TODO 87.
 * The three `sota` attribute stems ARE included: `Bod`/`Qck`/`Str` are this system's own
 * attribute abbreviations, not that book's terminology.
 */

/** @type {Record<string, string>} upstream prefix → book wording */
export const CYBERWARE_NAMES = {
  /* ── SR3 core, pp.299-303 ─────────────────────────────────────────────────────────────── */
  'Cosmetic Mod':                 'Cosmetic Modification',
  'Ear Hearing Amp':              'Ear Hearing Amplification',
  'Ear High Freq':                'Ear High Frequency',
  'Ear Low Freq':                 'Ear Low Frequency',
  'Ears Cyber Repl':              'Ears Cyber Replacement',
  'Eyes, Flare Comp':             'Eyes, Flare Compensation',
  'Eyes, Prot. Covers':           'Eyes, Protective Covers',
  'Eyes, Ret Dup.':               'Eyes, Retinal Duplication',
  'Eyes, Vis Mag Ele':            'Eyes, Vision Magnification, Electronic',
  'Eyes, Vis Mag Opt':            'Eyes, Vision Magnification, Optical',
  'H.Razor, Retract':             'Hand Razor, Retractable',
  'Muscle Replac.':               'Muscle Replacement',
  'Obv. CyberArm':                'Obvious Cyberarm',
  'Obv. CyberLeg':                'Obvious Cyberleg',
  'Pair Obv. Cyb Arms':           'Pair Obvious Cyberarms',
  'Pair Obv. Cyb Legs':           'Pair Obvious Cyberlegs',
  'Pair Syn Cyb Arms':            'Pair Synthetic Cyberarms',
  'Pair Syn Cyb Legs':            'Pair Synthetic Cyberlegs',
  'Reaction Enhance':             'Reaction Enhancer',
  'Reflex Trig':                  'Reflex Trigger',
  'Smartlink (Int)':              'Smartlink (Internal)',
  'Spur, Retract':                'Spur, Retractable',
  'Str Enh':                      'Strength Enhancement',
  'Synth. CyberArm':              'Synthetic Cyberarm',
  'Synth. CyberLeg':              'Synthetic Cyberleg',
  'Tooth Comp.':                  'Tooth Compartment',
  'V Mod Inc. Volume':            'Voice Modulator, Increased Volume',
  'V Mod Playback':               'Voice Modulator, Playback',
  'V Mod Second Pattern':         'Voice Modulator, Second Pattern',
  'V Mod Tonal Shift':            'Voice Modulator, Tonal Shift',
  'Vehicle Ctrl Rig':             'Vehicle Control Rig',

  /* ── Man & Machine ────────────────────────────────────────────────────────────────────── */
  '+High Frequency Mod':          '+High Frequency Modification',
  '+Low Frequency Mod':           '+Low Frequency Modification',
  '+Replacement Mod.':            '+Replacement Modification',
  '+Synth. Fingerprint':          '+Synthetic Fingerprint',
  'ASIST (Datajack Mod)':         'ASIST (Datajack Modification)',
  'Articulate Arm (retr.)':       'Articulate Arm (retractable)',
  'Chem. Analyzer':               'Chemical Analyzer',
  'Comp w/ BattleTac Mod.':       'Computer w/ BattleTac Module',
  'Cult. Tailored Pherom.':       'Cultured Tailored Pheromones',
  'CyGun Mach.Gun':               'Cybergun Machine Gun',
  'Cyberskates, Retract.':        'Cyberskates, Retractable',
  'D. Sheath Ruthenium':          'Dermal Sheath Ruthenium',
  'Damage Comp.':                 'Damage Compensators',
  'Eye, Laser Mic.':              'Eye, Laser Microphone',
  'Eyes, Microscopic Vis.':       'Eyes, Microscopic Vision',
  'Fangs, Retract':               'Fangs, Retractable',
  'Horn Implants, Retract':       'Horn Implants, Retractable',
  'Lim. Simsense Rig':            'Limited Simsense Rig',
  'Mnemonic Enhanc.':             'Mnemonic Enhancer',
  'Mount, External (retr.)':      'Mount, External (retractable)',
  'Mount, Tracking (retr.)':      'Mount, Tracking (retractable)',
  'Nano-Bio sys. CrashCart':      'Nano-biomonitor, CrashCart',
  'Nano-Bio sys. Guardian':       'Nano-biomonitor, Guardian',
  'Obv. Cyber Foot':              'Obvious Cyber Foot',
  'Obv. Cyber ForeArm':           'Obvious Cyber Forearm',
  'Obv. Cyber ForeLeg':           'Obvious Cyber Foreleg',
  'Obv. Cyber Hand':              'Obvious Cyber Hand',
  'Obv. CyberSkull':              'Obvious Cyberskull',
  'Obv. CyberTorso':              'Obvious Cybertorso',
  'Pathogenic Def.':              'Pathogenic Defense',
  'Pers. Smartlink Safety':       'Personal Smartlink Safety',
  'Pers.Smartlink Safety':        'Personal Smartlink Safety',
  'Protocol Emulation Mod':       'Protocol Emulation Module',
  'Reflex Rec. (base skill)':     'Reflex Recorder (base skill)',
  'Reflex Rec. (spec skill)':     'Reflex Recorder (specialization skill)',
  'Retract. Climbing Claws':      'Retractable Climbing Claws',
  'Rigger Decrypt. Mod':          'Rigger Decryption Module',
  'Smartlink II (Int)':           'Smartlink II (Internal)',
  'Synaptic Accel.':              'Synaptic Accelerator',
  'Synth. Cyber Foot':            'Synthetic Cyber Foot',
  'Synth. Cyber ForeArm':         'Synthetic Cyber Forearm',
  'Synth. Cyber ForeLeg':         'Synthetic Cyber Foreleg',
  'Synth. Cyber Hand':            'Synthetic Cyber Hand',
  'Synth. CyberSkull':            'Synthetic Cyberskull',
  'Synth. CyberTorso':            'Synthetic Cybertorso',
  'Tactical Sense Prog.':         'Tactical Sense Program',
  'Tailored Pherom.':             'Tailored Pheromones',

  /* ── State of the Art: this system's own attribute abbreviations, not the book's terms ─── */
  'Bod Modified Limit Increase':  'Body Modified Limit Increase',
  'Qck Modified Limit Increase':  'Quickness Modified Limit Increase',
  'Str Modified Limit Increase':  'Strength Modified Limit Increase',
};

/** Keys longest-first, so `Pers.Smartlink Safety(SmrtLnk)` cannot be claimed by a shorter key. */
const KEYS = Object.keys(CYBERWARE_NAMES).sort((a, z) => z.length - a.length);

/**
 * Expand an upstream name to the book's wording, keeping any trailing rating or qualifier.
 * Returns the input unchanged when nothing matches.
 *
 * ⚠ **Prefix match, not equality** — `Muscle Replac. [1]`, `Str Enh [3] (Pair)` and
 * `Str Enh [4]  w/Torso` all resolve from three short keys rather than needing one entry each.
 */
export function expandCyberwareName(name) {
  const n = String(name ?? '');
  for (const k of KEYS) if (n.startsWith(k)) return CYBERWARE_NAMES[k] + n.slice(k.length);
  return n;
}
