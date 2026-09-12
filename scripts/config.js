/**
 * SR3E system configuration constants.
 *
 * SR3ESkills is sourced from ActiveSkills.json (rawdata/).
 * Structure: { "Category Name": [ { name, linkedAttribute, specializations[] } ] }
 *
 * Attribute codes from the source data:
 *   STR → strength, QCK → quickness, INT → intelligence,
 *   WIL → willpower, CHA → charisma, BOD → body, REA → reaction
 *
 * Specializations ending in "->" are open-ended (free-text entry in the sheet).
 * Knowledge skills (KNO attribute) use linkedAttribute: "intelligence" by convention.
 */

export const SR3ESkills = {

  "Combat skills": [
    { name: "Unarmed Combat",       linkedAttribute: "strength",      specializations: ["Subduing Combat", "Martial Arts Technique", "Fists", "Head", "Kicks"] },
    { name: "Cyber Implant Combat", linkedAttribute: "strength",      specializations: ["implant->"] },
    { name: "Clubs",                linkedAttribute: "strength",      specializations: ["weapon->"] },
    { name: "Whips",                linkedAttribute: "quickness",     specializations: ["weapon->"] },
    { name: "Edged Weapons",        linkedAttribute: "strength",      specializations: ["weapon->"] },
    { name: "Pole Arms",            linkedAttribute: "strength",      specializations: ["weapon->"] },
    { name: "Throwing Weapons",     linkedAttribute: "strength",      specializations: ["Darts", "Grenades", "Shuriken", "Knives"] },
    { name: "Projectile Weapons",   linkedAttribute: "strength",      specializations: ["Bows", "Crossbows"] },
    { name: "Pistols",              linkedAttribute: "quickness",     specializations: ["weapon->"] },
    { name: "Rifles",               linkedAttribute: "quickness",     specializations: ["weapon->"] },
    { name: "Shotguns",             linkedAttribute: "quickness",     specializations: ["weapon->"] },
    { name: "Spray Weapons",        linkedAttribute: "strength",      specializations: ["weapon->"] },
    { name: "Submachine Guns",      linkedAttribute: "quickness",     specializations: ["weapon->"] },
    { name: "Assault Rifles",       linkedAttribute: "quickness",     specializations: ["weapon->"] },
    { name: "Heavy Weapons",        linkedAttribute: "strength",      specializations: ["weapon->"] },
    { name: "Laser Weapons",        linkedAttribute: "quickness",     specializations: ["weapon->"] },
    { name: "Launch Weapons",       linkedAttribute: "intelligence",  specializations: ["weapon->"] },
    { name: "Gunnery",              linkedAttribute: "intelligence",  specializations: ["weapon->"] },
    { name: "Underwater Combat",    linkedAttribute: "strength",      specializations: ["Unarmed Attack", "Armed Attack"] },
  ],

  // ⚠ These carry `maneuvers`, NOT `specializations`, and the distinction is RAW.
  //
  // Cannon Companion p.86: "Because each martial arts skill represents a distinctive and
  // specialized style of fighting, characters may NOT specialize in these skills." What each
  // style grants instead is a fixed set of **maneuvers** — special melee actions (CC p.90),
  // not narrower applications of the skill.
  //
  // They were previously stored under `specializations`, which put them in the one slot that
  // does something today: `SR3EItem.defaultTiers` builds a Specialization default tier per
  // entry, so picking MN:Close Combat on Aikido 6 offered "MA:Aikido (MN:Close Combat) 7 → 7
  // dice" at +3 TN — a maneuver masquerading as a specialisation, with inflated dice and a
  // tier the rules do not permit.
  //
  // The lists themselves are correct per the book and are kept for when maneuvers are
  // implemented. Nothing consumes `maneuvers` yet, which is the point: an unread field is
  // honest, a wrong field is not. Also unimplemented and worth remembering when they land:
  // "If a character defaults to or from a martial arts skill, she cannot use any of its
  // associated maneuvers."
  //
  // MA skills are Active/Combat skills linked to Strength, use Combat Pool, and are boxed
  // with Cyber-Implant Weaponry (CC p.86) — which is why `_buildMeleePoolInfo` accepts an
  // MA: skill for a CYB-category weapon.
  // ✅ Maneuver lists audited against CC p.89-91 on 2026-08-20 — all twelve match the book,
  // including Karate and Muay Thai, whose lists wrap across a column break and needed
  // reassembling. The 17 distinct maneuver names all appear verbatim in the maneuvers chapter.
  //
  // ⚠ The book spells it "Kip-up", not "Kip Up". Fixed here AND in rawdata/ActiveSkills.json,
  // which this list is generated from — correcting only this file is undone by the next
  // regeneration, which is precisely how the misspelling survived. rawdata also carried
  // "MN:Viscious Blow" (9×) and "MN:Focus Strength1", neither of which existed here to be
  // noticed. `tests/martial-arts.test.mjs` now compares the two.
  "Martial Arts": [
    { name: "MA:Aikido",        linkedAttribute: "strength", aliases: ["MA:Jujitsu", "MA:Juijitsu", "MA:Sambo"], maneuvers: ["MN:Close Combat", "MN:Disorient", "MN:Evasion", "MN:Focus Will", "MN:Ground Fighting", "MN:Herding", "MN:Sweep", "MN:Throw", "MN:Whirling"] },
    { name: "MA:Arnis De Mano", linkedAttribute: "strength", aliases: ["MA:Escrima", "MA:Kali"], maneuvers: ["MN:Close Combat", "MN:Focus Strength", "MN:Ground Fighting", "MN:Kick Attack", "MN:Kip-up", "MN:Multi-Strike", "MN:Sweep", "MN:Throw", "MN:Zoning"] },
    { name: "MA:Brawling",      linkedAttribute: "strength", aliases: ["MA:Boxing", "MA:Pitfighting"], maneuvers: ["MN:Close Combat", "MN:Disorient", "MN:Evasion", "MN:Full Offense", "MN:Ground Fighting", "MN:Herding", "MN:Kick Attack", "MN:Vicious Blow", "MN:Zoning"] },
    { name: "MA:Capoeira",      linkedAttribute: "strength", aliases: ["MA:Carromeleg"], maneuvers: ["MN:Disorient", "MN:Evasion", "MN:Ground Fighting", "MN:Herding", "MN:Kick Attack", "MN:Kip-up", "MN:Multi-Strike", "MN:Sweep", "MN:Whirling"] },
    { name: "MA:Karate",        linkedAttribute: "strength", aliases: ["MA:Kenpo"], maneuvers: ["MN:Blind Fighting", "MN:Focus Strength", "MN:Focus Will", "MN:Full Offense", "MN:Kick Attack", "MN:Vicious Blow", "MN:Sweep", "MN:Throw", "MN:Whirling"] },
    { name: "MA:Kung Fu",       linkedAttribute: "strength", aliases: ["MA:Hwarang-do", "MA:Wushu"], maneuvers: ["MN:Blind Fighting", "MN:Focus Strength", "MN:Full Offense", "MN:Ground Fighting", "MN:Kick Attack", "MN:Kip-up", "MN:Multi-Strike", "MN:Vicious Blow", "MN:Whirling"] },
    { name: "MA:Muay Thai",     linkedAttribute: "strength", aliases: ["MA:Kickboxing", "MA:Kick Boxing", "MA:Savate"], maneuvers: ["MN:Close Combat", "MN:Focus Strength", "MN:Full Offense", "MN:Ground Fighting", "MN:Herding", "MN:Kick Attack", "MN:Kip-up", "MN:Sweep", "MN:Zoning"] },
    { name: "MA:Ninjutsu",      linkedAttribute: "strength", maneuvers: ["MN:Blind Fighting", "MN:Close Combat", "MN:Disorient", "MN:Evasion", "MN:Ground Fighting", "MN:Herding", "MN:Kick Attack", "MN:Sweep", "MN:Zoning"] },
    { name: "MA:Pentjak-Silat", linkedAttribute: "strength", maneuvers: ["MN:Blind Fighting", "MN:Close Combat", "MN:Evasion", "MN:Focus Will", "MN:Ground Fighting", "MN:Vicious Blow", "MN:Multi-Strike", "MN:Sweep", "MN:Whirling"] },
    { name: "MA:Tae Kwon Do",   linkedAttribute: "strength", aliases: ["MA:Hapkido"], maneuvers: ["MN:Focus Strength", "MN:Full Offense", "MN:Herding", "MN:Kick Attack", "MN:Kip-up", "MN:Multi-Strike", "MN:Sweep", "MN:Throw", "MN:Whirling"] },
    { name: "MA:Tai Chi Ch'uan",linkedAttribute: "strength", aliases: ["MA:Tai Chi Wu", "MA:Tai Chi Chen"], maneuvers: ["MN:Blind Fighting", "MN:Evasion", "MN:Focus Strength", "MN:Focus Will", "MN:Herding", "MN:Kip-up", "MN:Sweep", "MN:Throw", "MN:Whirling"] },
    { name: "MA:Wildcat",       linkedAttribute: "strength", maneuvers: ["MN:Blind Fighting", "MN:Close Combat", "MN:Full Offense", "MN:Ground Fighting", "MN:Kick Attack", "MN:Multi-Strike", "MN:Sweep", "MN:Vicious Blow", "MN:Zoning"] },
  ],

  "Magical skills": [
    { name: "Aura Reading", linkedAttribute: "intelligence", specializations: ["Auras", "Signatures", "Sorcery", "Conjuring"] },
    { name: "Sorcery",      linkedAttribute: "willpower",    specializations: ["Spellcasting", "Spell Defense", "Dispelling", "Astral Combat", "Ritual Sorcery", "Spell Category->"] },
    { name: "Centering",    linkedAttribute: "willpower",    specializations: [] },
    { name: "Conjuring",    linkedAttribute: "willpower",    specializations: ["Summoning", "Banishing", "Controlling"] },
    { name: "Divining",     linkedAttribute: "willpower",    specializations: [] },
    { name: "Enchanting",   linkedAttribute: "willpower",    specializations: ["Alchemy", "Artificing"] },
  ],

  "Physical skills": [
    { name: "Athletics",  linkedAttribute: "body",      specializations: ["Climbing", "Jumping", "Lifting", "Running", "Swimming", "Escape Artist", "specific sport->"] },
    { name: "Diving",     linkedAttribute: "body",      specializations: ["Deep-water Diving", "Mixed-gas Diving"] },
    { name: "Parachuting",linkedAttribute: "body",      specializations: ["Standard Jump", "HALO Jump", "Low-Altitude Jump"] },
    { name: "Stealth",    linkedAttribute: "quickness", specializations: ["Alertness", "Hiding", "Sneaking", "Theft"] },
  ],

  "Social skills": [
    { name: "Acting",        linkedAttribute: "charisma",      specializations: ["Improvisation", "Method Acting"] },
    { name: "Artisan",       linkedAttribute: "intelligence",  specializations: ["Cinematography", "Drawing", "Painting", "Photography", "Sculpture"] },
    { name: "Etiquette",     linkedAttribute: "charisma",      specializations: ["Corporate", "Magical", "Matrix", "Media", "Street", "Tribal", "Specialized Group->"] },
    { name: "Hypnotism",     linkedAttribute: "willpower",     specializations: ["Subject Control", "Memory Regression", "Personality Modification"] },
    { name: "Instruction",   linkedAttribute: "charisma",      specializations: ["specific subject->"] },
    { name: "Interrogation", linkedAttribute: "charisma",      specializations: ["Verbal", "Lie Detector", "Voice Stress Analysis", "Torture", "Drug Aided"] },
    { name: "Intimidation",  linkedAttribute: "charisma",      specializations: ["Physical", "Mental"] },
    { name: "Leadership",    linkedAttribute: "charisma",      specializations: ["Political", "Military", "Commercial", "Strategy", "Tactics", "Morale"] },
    { name: "Legerdemain",   linkedAttribute: "quickness",     specializations: ["Sleight of Hand", "Light Fingers", "Card Tricks"] },
    { name: "Negotiation",   linkedAttribute: "charisma",      specializations: ["Bargain", "Bribe", "Con", "Fast talk"] },
    { name: "Performance",   linkedAttribute: "charisma",      specializations: ["Acting", "Dancing", "Reporting", "Singing"] },
  ],

  "Survival skills": [
    { name: "Riding",              linkedAttribute: "reaction",  specializations: ["Animal->"] },
    // Target: Wastelands p.105 — "This Active skill governs…", default Willpower. The book adds
    // "or appropriate wilderness terrain type" after the five, so the list is not closed.
    { name: "Wilderness Survival", linkedAttribute: "willpower", specializations: ["Forest", "Mountains", "Desert", "Jungle", "Polar"] },
  ],

  "Technical skills": [
    { name: "Biotech",           linkedAttribute: "intelligence", specializations: ["Cybermancy", "Cybertechnology Implantation", "Extended Care", "First Aid", "Magical Health", "Organ Culture & Growth", "Surgery", "Transplant Surgery"] },
    { name: "Computer",          linkedAttribute: "intelligence", specializations: ["Hardware", "Decking", "Programming", "Cybernetics", "Search Operations"] },
    { name: "Demolitions",       linkedAttribute: "intelligence", specializations: ["Commercial Explosives", "Plastic Explosives", "Improvised Explosives"] },
    { name: "Disguise",          linkedAttribute: "intelligence", specializations: ["Cosmetic", "Theatrical", "Trideo"] },
    { name: "Electronics",       linkedAttribute: "intelligence", specializations: ["Control Systems", "Electronic Warfare", "Maglocks", "Linking between devices", "Diagnostics", "Cybertechnology", "Security Systems"] },
    { name: "Forgery",           linkedAttribute: "intelligence", specializations: ["File Editing", "Image Manipulation", "Audio Manipulation", "Physical Forgery"] },
    { name: "Lock Picking",      linkedAttribute: "quickness",   specializations: ["Cam", "Dimple-Cylinder", "Pin Tumbler", "Safecracking", "Wafer", "Water"] },
    { name: "Small Unit Tactics",linkedAttribute: "intelligence", specializations: ["BattleTac Systems", "Vehicle Tactics", "Matrix Tactics"] },
  ],

  "Vehicle skills": [
    { name: "Bike",                    linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Car",                     linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Fixed-Wing Aircraft",     linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Hovercraft",              linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "LTA Aircraft",            linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Mechanical Arm Operation",linkedAttribute: "reaction", specializations: ["specific->"] },
    { name: "Motorboat",               linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Rotor Aircraft",          linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Sailboat",                linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Semiballistic",           linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Ship",                    linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Submarine",               linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Suborbital",              linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Tracks",                  linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Vector Thrust Aircraft",  linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
    { name: "Walkers",                 linkedAttribute: "reaction", specializations: ["Remote Operations", "specific->"] },
  ],

  "Matrix skills": [
    { name: "Computer",     linkedAttribute: "intelligence", specializations: ["Cybernetics", "Decking", "Hardware", "Search Operations"] },
    { name: "Cybercombat",  linkedAttribute: "intelligence", specializations: ["Agent", "Persona", "Device"] },
    { name: "Hacking",      linkedAttribute: "intelligence", specializations: ["Data Store", "Slave Node", "CPU", "SPU", "SAN", "Device"] },
    { name: "Programming",  linkedAttribute: "intelligence", specializations: ["Bogart", "HoloLISP", "InterMod", "MATCom", "Oblong"] },
  ],

  "Build/Repair skills": [
    { name: "Armor B/R",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Assault Rifles B/R",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Clubs Weapons B/R",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Computer B/R",             linkedAttribute: "intelligence", specializations: ["Cybernetics B/R"] },
    { name: "Cyber Implant Weapons B/R",linkedAttribute: "intelligence", specializations: [] },
    { name: "Diving B/R",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Edged Weapons B/R",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Electronics B/R",          linkedAttribute: "intelligence", specializations: ["Cybertechnology B/R", "Security Systems B/R"] },
    { name: "Gunnery B/R",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Heavy Weapons B/R",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Laser Weapons B/R",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Launch Weapons B/R",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Pistols B/R",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Pole Arms/Staffs B/R",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Projectile Weapons B/R",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Rifles B/R",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Shotguns B/R",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Spray Weapons B/R",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Submachine Guns B/R",      linkedAttribute: "intelligence", specializations: [] },
    { name: "Throwing Weapons B/R",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Whips B/R",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Bike B/R",                 linkedAttribute: "intelligence", specializations: [] },
    { name: "Car B/R",                  linkedAttribute: "intelligence", specializations: [] },
    { name: "Fixed Wing Aircraft B/R",  linkedAttribute: "intelligence", specializations: [] },
    { name: "Hovercraft B/R",           linkedAttribute: "intelligence", specializations: [] },
    { name: "LTA Aircraft B/R",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Motorboat B/R",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Rotor Aircraft B/R",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Sailboat B/R",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Ship B/R",                 linkedAttribute: "intelligence", specializations: [] },
    { name: "Submarine B/R",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Vector Thrust Aircraft B/R",linkedAttribute: "intelligence", specializations: [] },
    { name: "Handyman",                 linkedAttribute: "reaction",     specializations: ["Carpentry", "Plumbing", "Mechanisms"] },
  ],

  "Street knowledge": [
    { name: "Arms Dealers",                  linkedAttribute: "intelligence", specializations: [] },
    { name: "BTL Production",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Criminal Organizations",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Current Affairs",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Fences",                        linkedAttribute: "intelligence", specializations: [] },
    { name: "Fringe Cults",                  linkedAttribute: "intelligence", specializations: [] },
    { name: "Gang Identification",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Gang Turf",                     linkedAttribute: "intelligence", specializations: [] },
    { name: "Local Neighborhood",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Lone Star Tactics",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Mafia Politics",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Mafia Controlled Establishments", linkedAttribute: "intelligence", specializations: [] },
    { name: "NAN Border Patrol Tactics",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Police Procedures",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Prison Operations",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Prostitution Rackets",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Safehouse Locations",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Scrounging",                    linkedAttribute: "intelligence", specializations: [] },
    { name: "Seattle Junkyards",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Seattle Ork Underground",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Security Companies",            linkedAttribute: "intelligence", specializations: ["company->"] },
    { name: "Security Procedures",           linkedAttribute: "intelligence", specializations: ["Government", "Military", "company->"] },
    { name: "Shadowrunner Haunts",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Smuggler Havens",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Smuggling Routes",              linkedAttribute: "intelligence", specializations: [] },
    { name: "SWAT Team Tactics",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Triad Society",                 linkedAttribute: "intelligence", specializations: [] },
    { name: "Underworld Politics",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Yakuza Politics",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Yakuza Territory",              linkedAttribute: "intelligence", specializations: [] },
  ],

  "Academic skills": [
    { name: "Accounting",            linkedAttribute: "intelligence", specializations: ["Embezzling", "Fraud Control", "Cost-Cutting"] },
    { name: "Anthropology",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Archeology",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Architecture",          linkedAttribute: "intelligence", specializations: ["Office", "Mall", "Residential", "Ork", "Human", "Dwarven", "Specified->"] },
    { name: "Art",                   linkedAttribute: "intelligence", specializations: [] },
    { name: "Biology",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Body Armor Fabrication",linkedAttribute: "intelligence", specializations: [] },
    { name: "Botany",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Chemistry",             linkedAttribute: "intelligence", specializations: ["Specialty->"] },
    { name: "Civil Engineering",     linkedAttribute: "intelligence", specializations: ["Tunneling", "Commercial Construction", "Home Construction", "Industrial Construction", "Excavation"] },
    { name: "Cybertechnology",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Economics",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Electronic Intelligence", linkedAttribute: "intelligence", specializations: ["Audio", "Image/Video", "Matrix Surveillance", "Tracking"] },
    { name: "Engineering",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Forensic Medicine",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Forensics",             linkedAttribute: "intelligence", specializations: ["Forensic Medicine", "Ballistics", "Scene of Crime", "Forensic Magic"] },
    { name: "Geology",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Gunsmithing",           linkedAttribute: "intelligence", specializations: [] },
    { name: "History",               linkedAttribute: "intelligence", specializations: ["American", "European", "Japanese", "Religious", "Roman", "Specified->"] },
    { name: "Journalism",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Judicial Procedures",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Law",                   linkedAttribute: "intelligence", specializations: ["Corporate Law", "Criminal Law", "Environmental Law", "Jurisdiction->", "Historical Period->"] },
    { name: "Linguistics",           linkedAttribute: "intelligence", specializations: ["Algonkian", "Armenian", "Athabascan", "Baltic", "Basque", "Celtic", "Creole", "Dravidian", "Egyptian", "Eskimo", "Esperanto", "Finnic", "Germanic", "Greek", "Hamitic", "Indic", "Indo-Iranian", "Iroquoian", "Italic", "Interlingua", "Japanese and Korean", "Khoisan", "Malayo-Polynesian", "Mayan", "Mon-Khmer", "Mongolian", "Muskogean", "Niger-Kordofanian", "Nilotic", "Oto-Manguan", "Papuan Family", "Romance", "Salish", "Semitic", "Sino-Tibetan", "Siouan", "Slavic", "South American Indian", "Sperethiel", "Tlinglit", "Tsimshian", "Tungus", "Turkic", "Ugrian", "Uto-Aztecan", "Zuni", "Specified->"] },
    { name: "Literature",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Mechanical Traps",      linkedAttribute: "intelligence", specializations: [] },
    { name: "Medicine",              linkedAttribute: "intelligence", specializations: ["Traumatology", "Pathology", "Toxicology", "Specialty->"] },
    { name: "Metallurgy",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Military Theory",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Music",                 linkedAttribute: "intelligence", specializations: [] },
    { name: "Mythos & Folklore",     linkedAttribute: "intelligence", specializations: ["Period/region/culture->"] },
    { name: "Parabotany",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Parazoology",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Pharmacology",          linkedAttribute: "intelligence", specializations: ["Medicinal Drugs", "Illegal Narcotics", "Improvised Manufacture"] },
    { name: "Philosophy",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Physics",               linkedAttribute: "intelligence", specializations: ["Specialty->"] },
    { name: "Politics",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Political Science",     linkedAttribute: "intelligence", specializations: ["Specified->"] },
    { name: "Psychology",            linkedAttribute: "intelligence", specializations: ["Applied Psychology", "Clinical Psychology", "Group Psychology"] },
    { name: "Security Devices",      linkedAttribute: "intelligence", specializations: ["Detection Measures", "Weapons Emplacements"] },
    { name: "Security Design",       linkedAttribute: "intelligence", specializations: ["Closed Circuit Simsense", "Matrix", "Magical", "Physical", "Corporate", "Military", "Private Home"] },
    { name: "Security Systems",      linkedAttribute: "intelligence", specializations: ["Sensor Nets", "Two-stage Defenses", "Passive Systems", "Active Systems", "Weapons Systems", "Vehicle Security"] },
    { name: "Spell Design",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Stockbroking",          linkedAttribute: "intelligence", specializations: ["Stock Type->", "Market->"] },
    { name: "Structural Engineering",linkedAttribute: "intelligence", specializations: ["Specified->"] },
    { name: "Vehicle Security",      linkedAttribute: "intelligence", specializations: [] },
    { name: "Zoology",               linkedAttribute: "intelligence", specializations: [] },
  ],

  "System familiarity": [
    { name: "Automated Factory Familiarity",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Cellular Network Familiarity",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Chat Room Familiarity",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Chokepoint Familiarity",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Communication Satellite Familiarity", linkedAttribute: "intelligence", specializations: [] },
    { name: "Data Archive Familiarity",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Game Host Familiarity",               linkedAttribute: "intelligence", specializations: [] },
    { name: "LTG Familiarity",                     linkedAttribute: "intelligence", specializations: [] },
    { name: "Matrix Bank Familiarity",             linkedAttribute: "intelligence", specializations: [] },
    { name: "RTG Familiarity",                     linkedAttribute: "intelligence", specializations: [] },
    { name: "Security Network Familiarity",        linkedAttribute: "intelligence", specializations: [] },
  ],

  "Program design": [
    { name: "Application Design",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Black IC Design",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Cyberterminal Code Design",  linkedAttribute: "intelligence", specializations: [] },
    { name: "Defensive Utility Design",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Frame Core Design",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Grey IC Design",             linkedAttribute: "intelligence", specializations: [] },
    { name: "IC Construct Design",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Offensive Utility Design",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Operational Utility Design", linkedAttribute: "intelligence", specializations: [] },
    { name: "Otaku: Info Sortilege",      linkedAttribute: "intelligence", specializations: [] },
    { name: "Programming Suite Design",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Special Utility Design",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Trace IC Design",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Trace Utility Design",       linkedAttribute: "intelligence", specializations: [] },
    { name: "White IC Design",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Worm Design",                linkedAttribute: "intelligence", specializations: [] },
  ],

  "6th World knowledge": [
    { name: "Artificial Intelligence",    linkedAttribute: "intelligence", specializations: [] },
    { name: "Atlantis Research",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Chat Rooms",                 linkedAttribute: "intelligence", specializations: [] },
    { name: "Corporate Finance",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Corporate Hosts",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Corporate Politics",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Corporate Procedures",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Corporate Security",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Cybertechnology",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Cyberterminal Design",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Data Brokerage",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Databases",                  linkedAttribute: "intelligence", specializations: [] },
    { name: "Data Havens",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Deckmeisters",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Dowsing",                    linkedAttribute: "intelligence", specializations: ["Compass", "Pendulum", "L-rod", "Y-rod", "Bobber"] },
    { name: "Dragons",                    linkedAttribute: "intelligence", specializations: [] },
    { name: "Elven Society",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Entertainment Politics",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Humanis Policlub",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Iconography",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Insect Spirits",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Jackpoint Locations",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Legendary Deckers",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Magic",                      linkedAttribute: "intelligence", specializations: [] },
    { name: "Matrix Gangs",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Matrix Security Procedures", linkedAttribute: "intelligence", specializations: [] },
    { name: "Matrix Topography",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Megacorporate Operations",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Megacorporate Policies",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Megacorporate Politics",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Megacorporate Research",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Megacorporate Security",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Metahuman Politics",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Metahumanity",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Miltech Manufacturers",      linkedAttribute: "intelligence", specializations: [] },
    { name: "Otaku",                      linkedAttribute: "intelligence", specializations: [] },
    { name: "Parabotany",                 linkedAttribute: "intelligence", specializations: [] },
    { name: "Paranormal Animals",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Satellite Networks",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Seattle LTG",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Tribal Politics",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Virtual Meeting Spots",      linkedAttribute: "intelligence", specializations: [] },
  ],

  "Survival knowledge": [
    // Target: Wastelands p.105 — a Survival KNOWLEDGE skill, specialisations as listed; confirmed
    // by the maintainer 2026-09-12. Mr. Johnson's Little Black Book prints it on the Mercenary's
    // ACTIVE line (p.40), which the book that defines it overrides.
    { name: "Navigation", linkedAttribute: "intelligence", specializations: ["Land", "Sea", "Flight"] },
  ],

  "Background knowledge": [
    { name: "Assault Rifles",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Blowgun",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Bracer",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Clubs (background)",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Cyber Implant Combat", linkedAttribute: "intelligence", specializations: [] },
    { name: "Edged Weapons",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Eye Gun",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Gunnery",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Gun Cane",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Gyrojet Pistol",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Heavy Weapons",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Laser Weapons",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Launch Weapons",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Oral Gun",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Oral Strike",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Pistols",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Pole Arms & Staffs",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Projectile Weapons",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Rifles",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Shotguns",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Spray Weapons",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Submachine Guns",      linkedAttribute: "intelligence", specializations: [] },
    { name: "Throwing Weapons",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Unarmed Combat",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Underwater Combat",    linkedAttribute: "intelligence", specializations: [] },
    { name: "Whips",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Aura Reading",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Centering",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Conjuring",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Divining",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Sorcery (background)", linkedAttribute: "intelligence", specializations: [] },
    { name: "Magic Background",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Talismongering",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Athletics",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Diving",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Parachuting",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Stealth",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Acting",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Artisan",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Etiquette",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Hypnotism",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Instruction",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Interrogation",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Intimidation",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Leadership",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Leadership-Tactics",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Legerdemain",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Negotiation",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Performance",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Riding",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Wilderness Survival",  linkedAttribute: "intelligence", specializations: [] },
    { name: "Biotech",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Computer",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Demolitions",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Disguise",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Electronics",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Forgery",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Handyman",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Lock Picking",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Small Unit Tactics",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Bike",                 linkedAttribute: "intelligence", specializations: [] },
    { name: "Car",                  linkedAttribute: "intelligence", specializations: [] },
    { name: "Fixed Wing",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Hovercraft",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Lighter Than Air",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Motorboat",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Rotor Aircraft",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Sailboat",             linkedAttribute: "intelligence", specializations: [] },
    { name: "Ship",                 linkedAttribute: "intelligence", specializations: [] },
    { name: "Submarines",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Vectored Thrust Aircraft", linkedAttribute: "intelligence", specializations: [] },
  ],

  "Interests": [
    { name: "20th Century Comic Books",      linkedAttribute: "intelligence", specializations: [] },
    { name: "Astrology",                     linkedAttribute: "intelligence", specializations: ["Chinese", "Mayan", "Native American", "Vedic", "Western"] },
    { name: "Bushido Philosophy",            linkedAttribute: "intelligence", specializations: [] },
    { name: "Champagne",                     linkedAttribute: "intelligence", specializations: [] },
    { name: "Classical Music",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Combat Biking",                 linkedAttribute: "intelligence", specializations: [] },
    { name: "Conspiracy Theories",           linkedAttribute: "intelligence", specializations: ["Corporate", "Government", "Policlub", "Magical", "Region->", "Group->"] },
    { name: "Cooking",                       linkedAttribute: "intelligence", specializations: [] },
    { name: "Cuisine",                       linkedAttribute: "intelligence", specializations: [] },
    { name: "Desert Wars",                   linkedAttribute: "intelligence", specializations: [] },
    { name: "Elven Wines",                   linkedAttribute: "intelligence", specializations: [] },
    { name: "Fashion",                       linkedAttribute: "intelligence", specializations: [] },
    { name: "Flatvid Movies",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Folklore and Mythology",        linkedAttribute: "intelligence", specializations: ["Historical Period->", "Region->"] },
    { name: "Gambling Card Games",           linkedAttribute: "intelligence", specializations: [] },
    { name: "Investing",                     linkedAttribute: "intelligence", specializations: [] },
    { name: "Japanese Culture",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Japanese Society",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Legendary Martial Artists",     linkedAttribute: "intelligence", specializations: [] },
    { name: "Meditation",                    linkedAttribute: "intelligence", specializations: [] },
    { name: "Occult Knowledge",              linkedAttribute: "intelligence", specializations: [] },
    { name: "Opera",                         linkedAttribute: "intelligence", specializations: [] },
    { name: "Pirate Trid Broadcasters",      linkedAttribute: "intelligence", specializations: [] },
    { name: "Poetry",                        linkedAttribute: "intelligence", specializations: [] },
    { name: "Popular Culture",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Pornography",                   linkedAttribute: "intelligence", specializations: [] },
    { name: "Roleplaying Games of 20th Cen.",linkedAttribute: "intelligence", specializations: [] },
    { name: "Sci-Fi Simchips",               linkedAttribute: "intelligence", specializations: [] },
    { name: "Seattle High Society",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Sim Starlets",                  linkedAttribute: "intelligence", specializations: [] },
    { name: "Tir Tairngire Politics",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Tourist Trivia",                linkedAttribute: "intelligence", specializations: [] },
    { name: "Troll Thrash Metal Bands",      linkedAttribute: "intelligence", specializations: [] },
    { name: "Urban Brawl",                   linkedAttribute: "intelligence", specializations: [] },
    { name: "Weightlifting",                 linkedAttribute: "intelligence", specializations: [] },
    { name: "Woodworking",                   linkedAttribute: "intelligence", specializations: [] },
  ],

  "Area knowledge": [
    { name: "Auburn",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Bellevue",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Council Island",  linkedAttribute: "intelligence", specializations: [] },
    { name: "Downtown Seattle",linkedAttribute: "intelligence", specializations: [] },
    { name: "Everett",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Ft. Lewis",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Greater Seattle", linkedAttribute: "intelligence", specializations: [] },
    { name: "Puyallup",        linkedAttribute: "intelligence", specializations: [] },
    { name: "Redmond",         linkedAttribute: "intelligence", specializations: [] },
    { name: "Renton",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Salish-Shidhe",   linkedAttribute: "intelligence", specializations: [] },
    { name: "Seattle Matrix",  linkedAttribute: "intelligence", specializations: [] },
    { name: "Seattle Sewers",  linkedAttribute: "intelligence", specializations: [] },
    { name: "Snohomish",       linkedAttribute: "intelligence", specializations: [] },
    { name: "Tacoma",          linkedAttribute: "intelligence", specializations: [] },
    { name: "Tir Tairngire",   linkedAttribute: "intelligence", specializations: [] },
  ],

  "Language": [
    { name: "English",    linkedAttribute: "lan", specializations: ["Cityspeak", "Deckerese", "Netspeak", "Trog", "Military Jargon", "Scientific Jargon"] },
    { name: "Arabic",     linkedAttribute: "lan", specializations: [] },
    { name: "Cantonese",  linkedAttribute: "lan", specializations: [] },
    { name: "Chinese",    linkedAttribute: "lan", specializations: [] },
    { name: "Danish",     linkedAttribute: "lan", specializations: [] },
    { name: "Dutch",      linkedAttribute: "lan", specializations: [] },
    { name: "Filipino",   linkedAttribute: "lan", specializations: [] },
    { name: "Finnish",    linkedAttribute: "lan", specializations: [] },
    { name: "French",     linkedAttribute: "lan", specializations: [] },
    { name: "German",     linkedAttribute: "lan", specializations: [] },
    { name: "Greek",      linkedAttribute: "lan", specializations: [] },
    { name: "Hebrew",     linkedAttribute: "lan", specializations: [] },
    { name: "Hindi",      linkedAttribute: "lan", specializations: [] },
    { name: "Italian",    linkedAttribute: "lan", specializations: [] },
    { name: "Japanese",   linkedAttribute: "lan", specializations: [] },
    { name: "Korean",     linkedAttribute: "lan", specializations: [] },
    { name: "Latin",      linkedAttribute: "lan", specializations: [] },
    { name: "Mandarin",   linkedAttribute: "lan", specializations: [] },
    { name: "Norwegian",  linkedAttribute: "lan", specializations: [] },
    { name: "Or'zet",     linkedAttribute: "lan", specializations: [] },
    { name: "Polish",     linkedAttribute: "lan", specializations: [] },
    { name: "Portuguese", linkedAttribute: "lan", specializations: [] },
    { name: "Russian",    linkedAttribute: "lan", specializations: [] },
    { name: "Salish",     linkedAttribute: "lan", specializations: [] },
    { name: "Sign Language", linkedAttribute: "lan", specializations: [] },
    { name: "Spanish",    linkedAttribute: "lan", specializations: [] },
    { name: "Sperethiel", linkedAttribute: "lan", specializations: [] },
    { name: "Swedish",    linkedAttribute: "lan", specializations: [] },
    { name: "Swahili",    linkedAttribute: "lan", specializations: [] },
    { name: "Thai",       linkedAttribute: "lan", specializations: [] },
    { name: "Turkish",    linkedAttribute: "lan", specializations: [] },
    { name: "Ukrainian",  linkedAttribute: "lan", specializations: [] },
    { name: "Urdu",       linkedAttribute: "lan", specializations: [] },
    { name: "Vietnamese", linkedAttribute: "lan", specializations: [] },
    { name: "Welsh",      linkedAttribute: "lan", specializations: [] },
    { name: "Yoruba",     linkedAttribute: "lan", specializations: [] },
    { name: "Zulu",       linkedAttribute: "lan", specializations: [] },
  ],

};

// ---------------------------------------------------------------------------
// Skill category classification
// ---------------------------------------------------------------------------

export const ACTIVE_SKILL_CATEGORIES = new Set([
  'Combat skills', 'Build/Repair skills', 'Magical skills', 'Physical skills',
  'Social skills', 'Technical skills', 'Vehicle skills',
  // ⚠ Survival skills was missing until 2026-09-12, so Wilderness Survival (and Riding) read as
  // KNOWLEDGE everywhere — the sheet's sections, karma pricing, the defaulting list. Reported in
  // play (TODO 95). Target: Wastelands p.105: "Wilderness Survival (Willpower) — This Active
  // skill…". Its Background twin lives in 'Background knowledge' and stays knowledge.
  'Survival skills',
  // ⚠ Martial Arts belongs HERE, not with the knowledge categories where it sat until
  // 2026-08-20. Cannon Companion p.87 is explicit: "Each of these new martial arts skills is
  // considered a Combat skill and uses the standard rules for Active skills (p. 81, SR3) and
  // skill advancement (p. 244, SR3), INCLUDING THE USE OF COMBAT POOL."
  //
  // Filed as knowledge, Aikido appeared in the knowledge section of the sheet and was excluded
  // from every category-wide bonus keyed on 'Combat skills' — so Enhanced Articulation, whose
  // whole point is physical skills, did nothing for a martial artist. Reported from play.
  'Martial Arts',
]);

export const KNOWLEDGE_SKILL_CATEGORIES = new Set([
  // 'Survival skills' moved to ACTIVE_SKILL_CATEGORIES 2026-09-12 — see there (TODO 95).
  'Matrix skills', 'Otaku skills',
  'Street knowledge', 'Academic skills', 'System familiarity', 'Program design',
  '6th World knowledge', 'Interests', 'Area knowledge', 'Background',
]);

// ---------------------------------------------------------------------------
// Source books
// ---------------------------------------------------------------------------

/**
 * Every source whose content ships in a compendium pack. Each pack declares which
 * one it belongs to via `flags.The2ndChumming3e.book`, and the GM chooses which are
 * in play through the "Source Books" setting.
 *
 * `enabled` is only the out-of-the-box default; the stored setting wins once saved.
 * Codes match the upstream Shadowrun Character Generator's Books.json so a future
 * re-import lines up. `matrix-defragged` is ours — a community ruleset, not a book.
 */
export const EDITIONS = {
  SR3: { label: 'Shadowrun 3rd Edition' },
  SR2: { label: 'Shadowrun 2nd Edition' },
};

export const SOURCE_BOOKS = {
  // ── 2nd Edition ────────────────────────────────────────────────────────────
  // Official SR2 books only. The Chromebooks (cb1-cb4) and Cyberpunk 2020 (cp) content
  // in the archive are fan CONVERSIONS rather than official 2nd-edition products, so
  // they stay archived alongside the other fan material — see archive/non-sr3-content.
  sr2:                { label: 'Shadowrun 2nd Edition',    edition: 'SR2', enabled: true, core: true },
  ct:                 { label: 'Cybertechnology',          edition: 'SR2', enabled: true  },
  ssc:                { label: 'Street Samurai Catalog',   edition: 'SR2', enabled: true  },
  st:                 { label: 'Shadowtech',               edition: 'SR2', enabled: true  },
  fof:                { label: 'Fields of Fire',           edition: 'SR2', enabled: true  },
  pna:                { label: 'Paranormal Animals',       edition: 'SR2', enabled: true  },

  // ── 3rd Edition ────────────────────────────────────────────────────────────
  //
  // What ships ON by default: the core rulebook and the four RULES supplements. Those
  // extend the system itself — cyberware, magic, vehicles, weapons — and a table that
  // owns them expects their content to exist.
  //
  // What ships OFF: everything whose content is tied to a PLACE or a YEAR, plus the
  // regional and fan books. The State of the Art volumes are the clearest case — they
  // are dated gear catalogues, so defaulting them on drops 2064 street gear into a
  // campaign set in 2060 without anyone choosing it. The Target: books are location
  // material, the same kind as the France and Germany sourcebooks already off below.
  //
  // A GM who wants any of these switches them on in Configure Source Books. Changing a
  // default here only affects NEW worlds — defaultAllowedBooks() is consulted solely
  // when the setting has never been saved, so existing worlds keep their own choices.
  sr3:                { label: 'Shadowrun 3rd Edition',    edition: 'SR3', enabled: true, core: true },
  cc:                 { label: 'Cannon Companion',         edition: 'SR3', enabled: true  },
  mm:                 { label: 'Man & Machine',            edition: 'SR3', enabled: true  },
  mits:               { label: 'Magic in the Shadows',     edition: 'SR3', enabled: true  },
  r3:                 { label: 'Rigger 3',                 edition: 'SR3', enabled: true  },
  sota:               { label: 'State of the Art 2063',    edition: 'SR3', enabled: false },
  sota2:              { label: 'State of the Art 2064',    edition: 'SR3', enabled: false },
  tal:                { label: 'Target: Awakened Lands',   edition: 'SR3', enabled: false },
  twl:                { label: 'Target: Wastelands',       edition: 'SR3', enabled: false },
  fra:                { label: 'France Sourcebook',        edition: 'SR3', enabled: false },
  ger:                { label: 'Germany Sourcebook',       edition: 'SR3', enabled: false },
  ssg:                { label: 'Sprawl Survival Guide',    edition: 'SR3', enabled: false },
  tss:                { label: 'The Shadowrun Supplemental', edition: 'SR3', enabled: false, fan: true },
  'matrix-defragged': { label: 'Matrix Defragged v2',      edition: 'SR3', enabled: true, note: 'Community Matrix ruleset — only useful when Matrix Ruleset is set to Defragged.' },
};

/** Default allowed-books map, used when the setting has never been saved. */
export function defaultAllowedBooks() {
  return Object.fromEntries(Object.entries(SOURCE_BOOKS).map(([c, b]) => [c, b.enabled]));
}

/** Book codes belonging to an edition. */
export function booksForEdition(edition) {
  return Object.entries(SOURCE_BOOKS).filter(([, b]) => b.edition === edition).map(([c]) => c);
}

/**
 * Skill categories that belong to a source book, and are only offered when it is in play.
 *
 * ⚠ **This is the first RULE-level use of the source-book filter.** Until now `SR3ESourceBooks`
 * gated compendium content only — packs in the sidebar and item pickers. The predicate it
 * needed already existed (`isAllowed(code)`); `packAllowed` is just a thin wrapper over it. So
 * this sets the precedent TODO 40 was worried about, at far lower cost than that item assumed.
 *
 * Consulted at USE time, never at module load: the answer comes from a game setting, and this
 * file is static data evaluated before settings exist.
 */
export const SKILL_CATEGORY_BOOK = {
  'Martial Arts': 'cc',
};

/**
 * Skills a source book REPLACES — hidden when that book is in play, offered when it is not.
 *
 * The inverse gate, and Cannon Companion p.87 states it outright:
 *
 *   > "To increase the realism and detail of the current melee combat system, the skill of
 *   >  **Unarmed Combat must be removed from the game and replaced** by a number of new skills
 *   >  that each represent a martial arts style… The new skill of **Brawling**, though not
 *   >  technically a martial art, represents generic unarmed fighting techniques previously
 *   >  represented by the Unarmed Combat skill."
 *
 * ⚠ **Presentation only.** A character who already has Unarmed Combat keeps it and keeps
 * rolling it, exactly as a character keeps gear from a book the GM later switches off. The
 * weapon-category map (UNA → Unarmed Combat), `SR3EItem._unarmedWeapon()` and
 * `_buildMeleePoolInfo` all continue to work; this only decides what the skill picker offers.
 */
export const SKILL_REPLACED_BY_BOOK = {
  'Unarmed Combat': 'cc',
};

/**
 * Categories that COUNT AS another category for the purposes of a category-wide bonus.
 *
 * ⚠ **Cannon Companion p.87 states it outright:** *"Each of these new martial arts skills is
 * considered a **Combat skill** and uses the standard rules for Active skills… including the
 * use of Combat Pool. Martial arts skills are linked to Strength and boxed with Cyber-Implant
 * Weaponry."*
 *
 * So a martial art IS a Combat skill by rule. It has its own category here only because the
 * skill list needs somewhere to put twelve styles with their own maneuver sets — a
 * presentation choice, not a mechanical one.
 *
 * ⚠ **Found the hard way.** Enhanced Articulation (M&M p.66) grants a die on Combat, Physical,
 * Technical and Build/Repair skills. Filing martial arts under their own category meant a
 * martial artist got that die on Unarmed Combat and Edged Weapons but NOT on `MA:Aikido` — the
 * one skill they actually roll. Reported from play on 2026-08-21.
 *
 * Expressed as an alias on the CATEGORY rather than by adding 'Martial Arts' to Enhanced
 * Articulation's list, because the claim is about the category: any future category-scoped
 * bonus covering Combat skills should reach martial arts too, without rediscovering this.
 */
export const SKILL_CATEGORY_COUNTS_AS = {
  'Martial Arts': ['Combat skills'],
};

/**
 * Every category a skill counts as, itself first.
 * Case-insensitive in, canonical-case out.
 */
export function skillCategoriesFor(category) {
  const name = String(category ?? '').trim();
  if (!name) return [];
  const key = Object.keys(SKILL_CATEGORY_COUNTS_AS)
    .find(k => k.toLowerCase() === name.toLowerCase());
  return [name, ...(key ? SKILL_CATEGORY_COUNTS_AS[key] : [])];
}

/** Derive 'active' | 'knowledge' | 'language' from a category name. */
export function skillTypeForCategory(category) {
  if (category === 'Language') return 'language';
  if (ACTIVE_SKILL_CATEGORIES.has(category)) return 'active';
  return 'knowledge';
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Resolve a martial arts skill name to its canonical entry, following aliases.
 *
 * CC p.87 lists twelve styles, several with parenthesised equivalents — Aikido (Jujitsu,
 * Sambo), Arnis De Mano (Escrima, Kali) and so on. Those are the SAME skill under another
 * name, not separate skills: "Martial arts styles that have the same game effect are included
 * in parentheses after the skill name."
 *
 * ⚠ They were 29 independent entries until 2026-08-20, so a character could take Aikido AND
 * Jujitsu AND Sambo separately, each at full rating — three skills where the book has one. The
 * alias entries also carried INVENTED maneuver lists: Jujitsu's shared barely half its
 * maneuvers with Aikido's, though by the book they are identical.
 *
 * Existing characters keep whatever skill item they already have; this resolves the name so an
 * old "MA:Sambo" still finds its style.
 *
 * @param {string} name  e.g. 'MA:Sambo'
 * @returns {object|null} the canonical entry, or null if it is not a martial art
 */
export function resolveMartialArt(name) {
  const want = String(name ?? '').trim().toLowerCase();
  if (!want) return null;
  for (const entry of (SR3ESkills['Martial Arts'] ?? [])) {
    if (entry.name.toLowerCase() === want) return entry;
    if ((entry.aliases ?? []).some(a => a.toLowerCase() === want)) return entry;
  }
  return null;
}

/**
 * Classify an adept power by its name — `'improvedAbility'`, `'attributeBoost'`,
 * `'improvedReflexes'`, `'improvedPhysical'`, or `'other'`.
 *
 * Drives which fields the item sheet offers and which channel the derived data uses. See
 * `SR3E.adeptPowerPatterns` for why name-matching is the only join available.
 *
 * ⚠ Order matters: `improvedPhysical` is tested before `improvedAbility` would ever see it,
 * but both begin `Imp`, so the patterns are checked in a fixed order rather than by
 * `Object.entries` iteration order, which is stable but not obviously so to a reader.
 */
export function adeptPowerKind(name) {
  const n = String(name ?? '').trim();
  if (!n) return 'other';
  const P = SR3E.adeptPowerPatterns;
  if (P.attributeBoost.test(n))   return 'attributeBoost';
  if (P.improvedReflexes.test(n)) return 'improvedReflexes';
  if (P.improvedPhysical.test(n)) return 'improvedPhysical';
  if (P.improvedAbility.test(n))  return 'improvedAbility';
  return 'other';
}

/**
 * Which Physical Attribute an `Attribute Boost(XXX)` power boosts, or `null`.
 *
 * ⚠ `QIC` is an upstream typo for Quickness and is shipped in the pack, so it is accepted
 * alongside `QCK`. Getting this wrong means the power silently boosts nothing.
 */
export function attributeBoostTarget(name) {
  const m = SR3E.adeptPowerPatterns.attributeBoost.exec(String(name ?? '').trim());
  if (!m) return null;
  return { bod: 'body', qic: 'quickness', qck: 'quickness', qui: 'quickness',
           str: 'strength' }[m[1].toLowerCase()] ?? null;
}

/**
 * The level to resolve a power's EFFECT at.
 *
 * ⚠ **19 shipped powers carry their level in the NAME with `hasLevels: false`** — `Combat
 * Sense +2`, `Kinesics Level 3`, `Penetrating Strike Level 2`, `Flexibility 2`, `Enhanced
 * Balance 2`, `Imp. Reflexes Level 3`, `Delay Damage 2`. Every one stores `level: 1`, so
 * reading `system.level` treats all three Kinesics as level 1 and all three Combat Senses as
 * one Combat Pool die. Upstream models fixed-level powers as separate items and puts the
 * level only in the name, so the name is the only place it exists.
 *
 * ⚠ **For EFFECTS only.** Power Point cost and the sheet's Level column keep reading
 * `system.level`, because a fixed-level item's cost is already the cost of that level —
 * `Imp. Reflexes Level 3` costs 5, not 5 × 3. Using this for cost would triple it.
 *
 * ⚠ A trailing number on a power with no effect entry (`Imp. Sense: Vision Mag 3`) is read
 * and then discarded, which is harmless: nothing consumes the level of a power that has no
 * mechanical effect.
 */
export function adeptPowerLevel(name, system = {}) {
  if (system?.hasLevels) return Math.max(1, Math.trunc(Number(system.level) || 1));
  const m = /(?:\s|\+)(\d+)\s*$/.exec(String(name ?? ''));
  return m ? Math.max(1, Number(m[1])) : 1;
}

/**
 * The mechanical effect of one adept power, or `null` if it has none.
 *
 * Returns `{ situation, dice, tn, pool, capBy, note }` with the level already multiplied in.
 * A power with only a `note` still returns an object — the note is the whole point for the
 * handful of powers the system can state but not resolve (Freefall's metres, Sprint's running
 * distance), and dropping it would leave the sheet silent about a power the adept paid for.
 */
export function adeptPowerEffect(name, level = 1) {
  const n = String(name ?? '').trim();
  if (!n) return null;
  const e = SR3E.adeptPowerEffects.find(x => x.match.test(n));
  if (!e) return null;
  const lvl = Math.max(1, Math.trunc(Number(level) || 1));

  return {
    situation: e.situation ?? null,
    dice: (e.dicePerLevel ?? 0) * lvl + (e.dice ?? 0),
    tn:   (e.tnPerLevel   ?? 0) * lvl + (e.tn   ?? 0),
    pool: (e.poolPerLevel ?? 0) * lvl,
    capBy: e.capBy ?? null,
    note:  e.note ?? null,
  };
}

/** All category names, in definition order. */
export function getSkillCategories() {
  return Object.keys(SR3ESkills);
}

/** Skill names within a category. */
export function getSkillsForCategory(category) {
  return (SR3ESkills[category] ?? []).map(s => s.name);
}

/** Linked attribute for a specific skill within a category. */
export function getLinkedAttributeForSkill(category, skillName) {
  return SR3ESkills[category]?.find(s => s.name === skillName)?.linkedAttribute ?? 'quickness';
}

/**
 * Linked attribute for a category (used when category is selected but no skill yet).
 * Returns the attribute of the first skill in the category as a sensible default.
 */
export function getLinkedAttributeForCategory(category) {
  if (category === 'Language') return 'lan';
  return SR3ESkills[category]?.[0]?.linkedAttribute ?? 'quickness';
}

/** Display name for a skill (just the skill name — categories are groupings only). */
export function getFullSkillName(_category, skillName) {
  return skillName || _category;
}

/** Specializations for a specific skill. */
export function getSpecializationsForSkill(category, skillName) {
  return SR3ESkills[category]?.find(s => s.name === skillName)?.specializations ?? [];
}

// ---------------------------------------------------------------------------
// Main SR3E config export
// ---------------------------------------------------------------------------

export const SR3E = {
  metatypes: [
    { value: 'human', label: 'Human' },
    { value: 'elf',   label: 'Elf'   },
    { value: 'dwarf', label: 'Dwarf' },
    { value: 'ork',   label: 'Ork'   },
    { value: 'troll', label: 'Troll' },
    { value: 'other', label: 'Other' },
  ],

  attributes: [
    'body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower', 'reaction',
  ],

  /**
   * Racial Attribute Limit Table · *SR3 p.245*
   *
   * `limit` is the **Racial Modified Limit**; the **Attribute Maximum** is that × 1.5
   * (`SR3EActor.racialMax`), which reproduces every printed cell — 6→9, 7→11, 9→14, 11→17,
   * 5→8, 4→6 — so the second number is derived rather than transcribed twice.
   *
   * ⚠ This is the FIRST place the system has ever tracked racial maxima. `SR3EMods` still
   * collapses the upstream racial encodings (`RBOD`, `ROD`, …) to the plain attribute,
   * deliberately: those flags mean "raises the LIMIT", which is a character-creation
   * concern. This table is consumed by the Attribute Boost Drain Table (p.169) and nothing
   * else. It does NOT cap attributes anywhere — the ethos is that every stat stays hand-editable.
   *
   * Reaction is absent because it is derived, not bought.
   */
  racialLimits: {
    human: { body: 6, quickness: 6, strength: 6, charisma: 6, intelligence: 6, willpower: 6 },
    elf:   { body: 6, quickness: 7, strength: 6, charisma: 8, intelligence: 6, willpower: 6 },
    dwarf: { body: 7, quickness: 6, strength: 8, charisma: 6, intelligence: 6, willpower: 7 },
    ork:   { body: 9, quickness: 6, strength: 8, charisma: 5, intelligence: 5, willpower: 6 },
    troll: { body: 11, quickness: 5, strength: 10, charisma: 4, intelligence: 4, willpower: 6 },
    // No table entry — treated as human. A GM playing a metavariant edits the sheet.
    other: { body: 6, quickness: 6, strength: 6, charisma: 6, intelligence: 6, willpower: 6 },
  },

  /**
   * Racial Modifications Table · *SR3 p.56*
   *
   * Applied ONCE, at character creation, to the points a player allocates — the book's troll
   * Combat Mage puts 1 point into Body and records **Body 6**. So the rating on a finished sheet
   * already includes these, and that is how every shipped metahuman stores it (Dock Worker, a
   * troll, is printed and stored at B10 S10). They are therefore NOT added in
   * `prepareDerivedData` — doing so would double-apply them to all 38 of those actors.
   *
   * ⚠ **The one place they must be added is the character IMPORT.** The Shadowrun Character
   * Generator exports the allocation in `attributes` and the racial part separately in
   * `raceBonuses`. The importer read only the first until 2026-09-11, so every imported
   * metahuman arrived at human ratings — a troll's Body 10 as 5. See `SR3EActor.racialAttributes`.
   *
   * Matches the generator's own table (`PriorityPanel.js`) row for row. Reaction is absent: it
   * is derived from Quickness and Intelligence, so it picks the modifiers up from those.
   * The non-attribute traits live elsewhere: a troll's Dermal Armor and +1 Reach below; vision
   * (TODO 99) and a dwarf's +2 Body against disease and toxins (TODO 98) are not modelled yet.
   */
  /**
   * Natural dermal armor · *SR3 p.56, p.281*
   *
   * > Troll — *"Dermal Armor (+1 Body)"* (p.56)
   * > *"Dermal armor works against any attack by increasing the character's Body Attribute. It
   * > does not aid in healing."* (p.281)
   *
   * ⚠ **An AUGMENTATION, never part of the rating — the opposite of `racialModifiers` below.**
   * The book prints it in parentheses: Mr. Johnson's Little Black Book's trolls read Dock Worker
   * `10 (11)`, Club Owner `8 (9)`, Troll Street Dealer `8 (9)`, and Mr. Fix-It `10 (12)` (his
   * second point is plastic bone lacing). So it is added at derive time, like Dermal Plating,
   * and every shipped troll lands on its printed augmented figure with nothing double-counted.
   *
   * ⚠ **Kept OUT of `cyberBonus`.** Attribute Boost reads that to find the *technological*
   * increases it cannot combine with (p.169); a troll's hide is not technology.
   *
   * ⚠ *"does not aid in healing"* — there is no healing flow yet; the one planned in TODO 76
   * reads `body.base`, which never carries this point.
   *
   * It also spares a troll flechette's Damage Level increase (p.116) — see
   * `SR3EActor.flechetteRaisesLevel`.
   */
  racialDermalArmor: { troll: 1 },
  /**
   * Natural Reach · *SR3 p.56, p.121*
   *
   * > Troll — *"+1 Reach for Armed/Unarmed Combat"* (p.56)
   * > *"Trolls have a natural Reach of 1 that is cumulative with weapon Reach."* (p.121)
   *
   * Added to the weapon's own Reach by `SR3EActor.meleeReach` before the p.121 differential is
   * taken, so a troll with a club (Reach 1) fights at 2 and a bare-handed troll at 1.
   * ⚠ Physical melee only — astral combat does not read it.
   */
  racialReach: { troll: 1 },
  /**
   * Racial bonuses scoped to a SITUATION · *SR3 p.56* · TODO 98
   *
   * > Dwarf — *"Resistance (+2 Body) to any disease or toxin"*
   *
   * Rides `derived.situationalBonuses` beside Nephritic Screen and Body Control, and is offered
   * as an **unticked** checkbox on a Body roll — the system cannot tell a Body Test against a
   * toxin from any other, so the roller decides (the Enhanced Articulation pattern).
   *
   * ⚠ **+2 dice on that test, never +2 to the attribute.** Raising `body.value` would add it to
   * every Damage Resistance Test, knockdown and overflow, none of which the book grants.
   */
  racialSituational: {
    dwarf: [{ situation: 'toxin', dice: 2, label: 'Dwarf resistance (SR3 p.56)' }],
  },

  racialModifiers: {
    human: { body: 0, quickness: 0,  strength: 0, charisma: 0,  intelligence: 0,  willpower: 0 },
    dwarf: { body: 1, quickness: 0,  strength: 2, charisma: 0,  intelligence: 0,  willpower: 1 },
    elf:   { body: 0, quickness: 1,  strength: 0, charisma: 2,  intelligence: 0,  willpower: 0 },
    ork:   { body: 3, quickness: 0,  strength: 2, charisma: -1, intelligence: -1, willpower: 0 },
    troll: { body: 5, quickness: -1, strength: 4, charisma: -2, intelligence: -2, willpower: 0 },
  },

  /**
   * Cyber/bioware that has to be SWITCHED ON · TODO 30
   *
   * The upstream `Mods` field is reserved for unconditional passives, so none of these carry
   * one — their rules live in prose, and are transcribed here.
   *
   * `kind: 'duration'` — activated, runs for a rolled number of Combat Turns, and may cost
   * something when it lapses. Same shape as Attribute Boost (SR3 p.168), and it reuses the
   * same round tick.
   * `kind: 'toggle'` — stays on until switched off. No duration, no cost.
   *
   * ⚠ **Adrenal Pump is a DURATION, not a toggle**, and that distinction is the whole reason
   * this is not a boolean flag: a GM who forgets to switch it off leaves a character
   * permanently boosted. Pain Editor genuinely is a toggle, so both shapes are needed.
   */
  triggeredAugmentations: [
    {
      match: /^adrenal pump/i,
      kind: 'duration',
      label: 'Adrenal Pump',
      /* M&M p.63: "Each level of the pump adds 1 to Quickness, 2 to Strength, 1 to Willpower
       * and 2 to Reaction for as long as the concentrates remain in the bloodstream."        */
      perLevel: { qui: 1, str: 2, wil: 1, rea: 2 },
      /* "Once active, roll 1D6 for each level; the die result indicates the number of Combat
       * Turns the hormones stay in the blood."                                               */
      durationDicePerLevel: 1,
      /* "When the duration of the pump's effects ends, the character crashes from system
       * shock and fatigue. He must roll Body to resist Deadly Stun damage with a Power equal
       * to the number of turns the hormones remained in the blood."                          */
      crash: { resistAttr: 'body', level: 'D', stun: true, powerIsDuration: true },
      note: 'Normally triggered involuntarily by taking damage. Regenerating takes 9 + 1D6 '
          + 'minutes; activating again before then halves the duration (M&M p.63).',
    },
    {
      match: /^pain editor/i,
      kind: 'toggle',
      label: 'Pain Editor',
      /* M&M p.71: "the subject gains +1 to Willpower when the editor is activated but suffers
       * a -1 Intelligence loss for the duration."                                            */
      bonuses: { wil: 1, int: -1 },
      /* "the character ignores all Initiative and target number penalties from Stun damage.
       * Penalties from Physical damage are applied, but without the player's knowledge."     */
      ignoresStunWoundMod: true,
      note: 'Also: +4 TN to tactile Perception, cannot be knocked unconscious by Stun, and '
          + 'the player should not be told how much damage the character has taken.',
    },
  ],

  /**
   * Cyber/bioware bonuses scoped to a SITUATION · TODO 30
   *
   * The same channel the adept powers use (`derived.situationalBonuses`), which is why this is
   * a table rather than a mechanism — nothing new was needed.
   */
  augmentationEffects: [
    {
      match: /^nephritic screen/i,
      /* M&M: "-1 Power of pathogen and blood toxins, +1BOD to resist them" */
      situation: 'toxin', dice: 1,
      note: 'Also reduces the Power of pathogen and blood toxins by 1 — applied by the GM, '
          + 'since the system does not model toxin Power.',
    },
  ],

  /**
   * Cyberware grades — the Essence multiplier · *M&M p.45, Cyberware Grades Table* · TODO 86
   *
   * | Grade | Essence Cost Reduction | Cost | Availability |
   * |---|---|---|---|
   * | Alpha | −20% (× .8) | 2 | Standard |
   * | Beta  | −40% (× .6) | 4 | +5 / × 1.5 |
   * | Delta | −50% (× .5) | 8 | +9 / × 3 |
   * | Used  | **by grade** | .5 | Standard |
   *
   * ⚠ **Only the ESSENCE multiplier lives here.** The cost multiplier and the availability
   * modifiers are real rules with nowhere to land yet — there is no purchasing flow (TODO 82).
   * Adding them to this map would imply they are applied somewhere.
   *
   * ⚠ **"Used" is not a grade, it is a modifier ON one** — *"Used cyberware … is available in
   * all grades except delta"*, and its Essence is *"by grade"*, i.e. unchanged. Only its price
   * halves. So it is deliberately absent: a `grade` of `'Used Alpha'` should read as alpha.
   *
   * ⚠ **BIOWARE GRADES ARE NOT THESE.** The shipped packs carry `Cultured` and `Exotic` on
   * bioware, which are bioware qualities and cost Bio Index rather than Essence. They are
   * absent here on purpose, and `installedEssenceCost` skips bioware entirely — but an unknown
   * grade must still fall back to ×1, never to `undefined`.
   *
   * ⚠ **Keyed loosely on purpose.** The shipped data says `Standard` and `Alpha`; the books say
   * `basic`, `alphaware`, `betaware`, `deltaware`. Both spellings map, matched
   * case-insensitively, because `grade` is a free StringField a GM can type into.
   *
   * ⚠ **NOT `cyberwareGrades`**, which already exists further down as the ARRAY of names the
   * item sheet's grade dropdown offers. That list includes `'Used'` as a pickable option, so a
   * GM can select it — and this map deliberately has no `used` key, leaving it at ×1. Used
   * BASIC ware is exactly that; a GM wanting used alphaware types "Used Alpha", which
   * `gradedEssenceCost` strips to "alpha".
   */
  cyberwareGradeEssence: {
    standard: 1, basic: 1,
    alpha: 0.8, alphaware: 0.8,
    beta: 0.6, betaware: 0.6,
    delta: 0.5, deltaware: 0.5,
  },

  /**
   * Cyber/bioware whose QUICKNESS bonus is excluded from the Reaction derivation · TODO 4
   *
   * Move-by-Wire · *M&M p.60*: *"The Quickness bonus does not count when calculating the
   * character's Reaction Attribute."*
   *
   * ⚠ **Reaction only.** The book excludes it from Reaction and says nothing about the Combat
   * Pool, which derives from ⌊(QUI + INT + WIL) / 2⌋ — so the Quickness bonus DOES move the
   * pool, and that is correct. This is the same shape as the Adrenal Pump's clause (p.63),
   * which spells out both halves; move-by-wire only states the exclusion.
   *
   * ⚠ Unlike the Adrenal Pump, move-by-wire is a PASSIVE always-on implant, so it cannot be
   * fixed by ordering — it is applied with every other cyber bonus, before Reaction exists.
   * The excluded portion is tracked and subtracted in the derivation instead.
   */
  quicknessNotForReaction: [
    /^move-?by-?wire/i,
    /* ⚠ **Muscle Replacement carries the identical carve-out, in identical words** · *SR3*:
     * "Add the rating of the muscle replacement to Strength and Quickness; **this change does
     * not affect Reaction**." Missing until 2026-09-01, and reachable by anyone dragging the
     * item onto a character — the shipped `Muscle Replac. [1..4]` genuinely grant +N Quickness.
     *
     * ⚠ **Matches the ABBREVIATION the packs actually use.** They ship as `Muscle Replac. [1]`,
     * not "Muscle Replacement 1"; a pattern written from the book's spelling would match
     * nothing at all. The stem covers both.
     *
     * ⚠ **`Muscle Augmentation` must NOT match** — that is M&M bioware granting Strength only,
     * a different implant, and it has no Quickness to exclude. */
    /^muscle\s*replac/i,
  ],

  /**
   * Cyber/bioware granting dice to specific NAMED skills · TODO 4
   *
   * Move-by-Wire · *M&M p.60*: *"+N dice for Athletics and Stealth Tests"*, N = the rating.
   *
   * ⚠ Two skills from one item, which is why this is a table rather than the
   * `improvedSkillName` field — that holds a single name. These feed `skillBonusDice`, the
   * always-applies channel, because the book scopes them to skills rather than to situations.
   */
  augmentationSkillDice: [
    { match: /^move-?by-?wire/i, skills: ['Athletics', 'Stealth'], perRating: 1 },
  ],

  /**
   * Cyber/bioware that cannot be combined with other Reaction or Initiative enhancement.
   *
   * Move-by-Wire · *M&M p.60*: *"This system is not compatible with any other Reaction- or
   * Initiative-enhancing cyber- or bioware."*
   *
   * ⚠ Reported, never enforced — the ethos is warn-and-stay-editable, and the book does not
   * say which side wins. Contrast `SR3EActor.reflexBonus`, which DOES pick one package: there
   * the conflict is between an adept power and technology, and leaving both applied would let
   * a character have a rules-forbidden total. Here both are cyberware the character paid
   * Essence for, and a GM who allowed the combination should not have it silently undone.
   */
  reactionExclusive: [/^move-?by-?wire/i],

  /**
   * Cyber/bioware whose Reaction bonus does NOT apply to rigging or decking · *M&M p.66*
   *
   * Enhanced Articulation grants +1 Reaction, and the book excludes it from rigging and from
   * the Matrix — the bonus is about how the body moves, and a rigger jumped into a drone or a
   * decker in VR is not using theirs.
   *
   * ⚠ **A LIST, not a flag on the item.** A flag would be a data-model change, needing a
   * migration and a Foundry restart, to express one rule about one shipped item. Matched by
   * name, the same join `adeptPowerKind` uses and with the same caveat: a rename upstream
   * silently stops the exclusion.
   *
   * ⚠ Only the RIGGING and DECKING initiative paths consult this. The bonus is perfectly real
   * for ordinary physical Reaction, dodging and Reaction Tests.
   */
  reactionNotForRigOrDeck: [/^enhanced articulation/i],

  /**
   * Situations a bonus can be scoped to · the answer to TODO 70.
   *
   * ⚠ **This exists because `skillBonusDice` could not express it.** That map promises "always
   * applies", and every consumer trusts it — so it cannot carry Counterstrike's *"these dice
   * can only be used for counterattacks"* or Sixth Sense's *"these dice do not apply to any
   * other type of Reaction Test"*. `skillCategoryBonuses` exists for the same reason one step
   * earlier; this is the third and last channel, and it is scoped by SITUATION rather than by
   * skill or category.
   *
   * A key is claimed by the flow that knows it is in that situation. `dodge` is passed by the
   * dodge roll, `knockdown` by the Knockdown Test — the code already knows, so nothing has to
   * ask. Keys with no flow yet are offered as a checkbox on the ordinary roll dialogs, which
   * is where a human is the only thing that can judge whether a Body Test is *"against the
   * symptoms of a painful disease"*.
   */
  adeptSituations: {
    toxin:          'Resisting toxins or disease',
    perception:     'Perception Tests',
    spellResist:    'Spell Resistance Tests',
    detectionSpell: 'Resisting detection spells',
    healing:        'Healing Tests and crippling-injury tests',
    counterattack:  'Counterattacks in melee',
    mindControl:    'Resisting control or alteration of the mind',
    surprise:       'Reaction Tests for Surprise',
    knockdown:      'Resisting knockdown, throws and levitation',
    temperature:    'Resisting extreme temperatures',
    illusion:       'Resisting illusions',
    jumping:        'Jumping Tests',
    escapeArtist:   'Athletics (Escape Artist) Tests',
    stabilization:  'Stabilization and permanent-damage tests',
    dodge:          'Dodge and Full Dodge',
    social:         'Social skill Tests',
    detectLying:    'Tests to detect the adept lying',
  },

  /**
   * What each adept power actually DOES · *SR3 p.168-170, MITS p.149-151, SOTA2 p.64-68*
   *
   * Keyed by a pattern matched against the shipped name, because the upstream data carries no
   * type of its own — the same join `adeptPowerKind` uses, and the same caveat applies.
   *
   * Fields, all optional:
   *   `situation`   a key from `adeptSituations`; makes this a scoped bonus
   *   `dicePerLevel`/`dice`   extra dice
   *   `tnPerLevel`/`tn`       target-number modifier (NEGATIVE is easier)
   *   `poolPerLevel`          extra COMBAT POOL dice, not skill dice
   *   `capBy`       `'intelligence'` etc — the attribute that, with Magic, caps the dice
   *   `note`        rendered on the sheet for powers the system cannot resolve alone
   *
   * ⚠ **Absence from this table is a decision, not an omission.** ~40 powers are narrative or
   * GM-adjudicated — the twelve Improved Senses, Traceless Walk, Suspended State, Distance
   * Strike, the nine TSS powers — and an item carrying only its description is the correct
   * implementation for them under the minimal-guardrails ethos. See
   * `audit/adept-powers-audit.md` for the full inventory and why each one is where it is.
   */
  adeptPowerEffects: [
    // ── SR3 core ────────────────────────────────────────────────────────────────
    { match: /^body control/i,          situation: 'toxin',       dicePerLevel: 1 },
    { match: /^enhanced perception/i,   situation: 'perception',  dicePerLevel: 1,
      // p.169: "You cannot have more Enhanced Perception dice than your Intelligence or
      // Magic Attribute, whichever is less." Same shape as Improved Ability's cap.
      capBy: 'intelligence' },
    { match: /^magic resistance/i,      situation: 'spellResist', dicePerLevel: 1 },
    { match: /^rapid healing/i,         situation: 'healing',     dicePerLevel: 1 },
    // Combat Sense ships as three fixed-level items (+1/+2/+3) rather than a levelled power,
    // so the number is read off the NAME. p.169's second effect — spending a fraction of
    // Combat Pool on the Reaction Test in surprise — has no flow to attach to; noted instead.
    { match: /^combat sense/i,          poolPerLevel: 1,
      note: 'Also allows ¼ / ½ / all of your Combat Pool on Reaction Tests for surprise (p.109).' },

    // ── Magic in the Shadows ────────────────────────────────────────────────────
    { match: /^counterstrike/i,         situation: 'counterattack', dicePerLevel: 1 },
    { match: /^iron will/i,             situation: 'mindControl',   dicePerLevel: 1 },
    { match: /^sixth sense/i,           situation: 'surprise',      dicePerLevel: 1 },
    { match: /^rooting/i,               situation: 'knockdown',     dicePerLevel: 1,
      note: 'While rooted you cannot move, and all your own target numbers are at +2.' },
    { match: /^deep rooting/i,          situation: 'knockdown',     dicePerLevel: 1 },
    { match: /^spell shroud/i,          situation: 'detectionSpell', dicePerLevel: 1 },
    { match: /^temperature tolerance/i, situation: 'temperature',   dicePerLevel: 1 },
    { match: /^true sight/i,            situation: 'illusion',      dicePerLevel: 1 },
    { match: /^great leap/i,            situation: 'jumping',       dicePerLevel: 1,
      note: 'Each level also adds 1 to Quickness for the maximum distance you can jump.' },
    // ⚠ Flexibility moves a TARGET NUMBER, not dice — "reduce the target numbers for
    // Athletics (Escape Artist) Tests by 1" per level. Negative is easier.
    { match: /^flexibility/i,           situation: 'escapeArtist',  tnPerLevel: -1 },
    { match: /^freefall/i,
      note: 'Ignore 2 metres of falling per level before damage is calculated (MITS p.150).' },

    // ── State of the Art 2064 ───────────────────────────────────────────────────
    { match: /^resilience/i,            situation: 'stabilization', dicePerLevel: 1 },
    // ⚠ COMBAT POOL dice, not skill dice, and only for dodging — "one additional Combat Pool
    // die only for the purposes of Dodge and Full Dodge attempts".
    { match: /^side step/i,             situation: 'dodge',         poolPerLevel: 1 },
    { match: /^kinesics/i,              situation: 'social',        tnPerLevel: -1,
      note: 'Also +1 die per level to social Charisma Success Tests, and +2 per level to any '
          + 'test to discover whether you are lying.' },
    { match: /^sprint/i,
      note: 'Each level adds 1 to Quickness for determining running distance (SOTA2 p.68).' },
    { match: /^enhanced balance/i,      situation: 'knockdown',     dicePerLevel: 1 },
  ],

  /**
   * What KIND of adept power this is, matched on the shipped name.
   *
   * ⚠ Exists because the powers are otherwise indistinguishable to the code, and that has
   * already cost us. The item sheet used to offer **"Improves Skill" on all 117 powers**, so
   * an `Attribute Boost(STR)` was configured to grant +4 dice to Unarmed Combat — a channel
   * the power has under no reading of the rules. Reported from play 2026-08-29.
   *
   * Matching on names is fragile in general; here it is the only join available, because the
   * upstream data carries no type of its own. The patterns are deliberately loose about
   * punctuation and abbreviation (`Imp Abl` / `Imp. Ability` / `Improved Ability`) since the
   * four packs spell them differently, and `QIC` is accepted beside `QCK` because the shipped
   * `Attribute Boost(QIC)*` carries an upstream typo.
   */
  adeptPowerPatterns: {
    // SR3 p.169 + the SOTA2 p.66 expanded list. The ONLY powers for which `improvedSkillName`
    // means anything. ⚠ The trailing `->` in the pack names is the upstream generator's
    // marker for "name the skill here", NOT a scope.
    improvedAbility:  /^imp(?:roved)?\.?\s*ab(?:l|ility)\b/i,
    // SR3 p.168-169. Activated, levelled, expiring, and it costs Drain. NEVER a passive bonus.
    attributeBoost:   /^attribute\s+boost\s*\(\s*(bod|qic|qck|qui|str)\s*\)/i,
    // SR3 p.169. Cannot be combined with technological or magical Reaction/Initiative gains.
    improvedReflexes: /^imp(?:roved)?\.?\s*reflexes\b/i,
    // SR3 p.169. Passive attribute gain, and the one power Attribute Boost DOES stack with.
    improvedPhysical: /^imp(?:roved)?\.?\s*phys(?:ical)?\.?\s*attr/i,
  },

  fireModes:      ['SS', 'SA', 'BF', 'FA'],

  // ── Electronic Warfare (Flux / Footprint / ECM / ECCM / MIJI) — R3 p.36-40,137-138,144-145 ──
  electronicWarfare: {
    // Signal-monitor channels (10 boxes each).
    channels: [
      { key: 'command',  label: 'Command',  appliesTo: 'Drone Comprehension & IVIS Tests',
        fullEffect: 'Drones execute last order / hold, act in self-defence only.' },
      { key: 'simsense', label: 'Simsense', appliesTo: 'Perception & manual Gunnery through the drone; if VCR-jacked, the rigger\'s Initiative + ALL target numbers (applied automatically)',
        fullEffect: 'Rigger jacked into a drone suffers Dumpshock.' },
      { key: 'system',   label: 'System',   appliesTo: 'Indirect-fire Gunnery through the network; cancels Smartlink bonus at Moderate+',
        fullEffect: 'Loser dumped; winner takes control of the entire network.' },
    ],
    // Degradation tiers by boxes filled → TN modifier.
    degradationTiers: [
      { min: 1,  max: 3,  mod: 1, label: 'Light'    },
      { min: 4,  max: 6,  mod: 2, label: 'Moderate' },
      { min: 7,  max: 9,  mod: 3, label: 'Serious'  },
      { min: 10, max: 10, mod: null, label: 'Channel Lost' },
    ],
    // MIJI operations: which channels each can target, and which intruder stat sets the
    // defender's TN ('ecm' for Jamming, 'protocolModule' otherwise).
    operations: {
      meaconing:    { label: 'Meaconing',    channels: ['command'],                       tnStat: 'protocolModule', desc: 'False signals fed to drones (acts like Confusion).' },
      intrusion:    { label: 'Intrusion',    channels: ['system'],                        tnStat: 'protocolModule', desc: 'Attempt to hijack the entire network.' },
      jamming:      { label: 'Jamming',      channels: ['command', 'simsense', 'system'], tnStat: 'ecm',            desc: 'Floods one channel with noise.' },
      interference: { label: 'Interference', channels: ['system'],                        tnStat: 'protocolModule', desc: 'Override battle — loser dumped, winner takes control.' },
    },
    infiltrationTurns: 10,   // base time for an infiltration attempt (combat turns)
    // Flux Rating → broadcast range in metres (R3 p.137). 10+ uses (2×Flux)+10 km.
    fluxRange: [250, 1000, 2000, 4000, 6000, 9000, 12000, 16000, 20000, 25000],
  },

  // Projectile-weapon categories. Bows/crossbows are reusable; thrown categories are
  // consumed on use (quantity tracking). Used by SR3EItem._isConsumable.
  bowCategories:    ['Bow', 'LCB', 'MCB', 'HCB', 'SL'],
  thrownCategories: ['TK', 'SH', 'Imp', 'Ctrp', 'GR', 'BOL', 'THR', 'other'],

  // Bows/crossbows that draw from an arrow/bolt ammo stockpile (capacity = 1 nocked round,
  // depletes when Track Ammunition is on). Maps the weapon category → required ammo loading
  // mechanism ('arrow' / 'bolt'). Slings (SL) are intentionally omitted (never deplete).
  // Used by SR3EItem._usesNockedAmmo / _weaponLoadMechanism.
  nockedAmmoByCategory: { Bow: 'arrow', LCB: 'bolt', MCB: 'bolt', HCB: 'bolt' },

  // Firearm range bands by weapon category, in METRES: [shortMax, mediumMax, longMax, extremeMax].
  // A distance ≤ shortMax is Short, ≤ mediumMax is Medium, etc.; beyond extremeMax is out of range.
  // Values are from the SR3 core Ranges table. A weapon can override its bands with a
  // "rangeOverride" string like "5/15/30/50". Categories not in the book (medium/very-heavy/
  // machine pistol, carbines, laser, minigun) are approximated from the nearest listed weapon.
  weaponRanges: {
    HOPist: [5, 15, 30, 50],       // Hold-out Pistol
    LPist:  [5, 15, 30, 50],       // Light Pistol
    MPist:  [5, 15, 30, 50],       // Medium Pistol (≈ light, not in book)
    MaPist: [5, 15, 30, 50],       // Machine Pistol (≈ light, not in book)
    HPist:  [5, 20, 40, 60],       // Heavy Pistol
    VHP:    [5, 20, 40, 60],       // Very Heavy Pistol (≈ heavy, not in book)
    Tasr:   [5, 10, 12, 15],       // Taser
    SMG:    [10, 40, 80, 150],     // SMG
    ShtG:   [10, 20, 50, 100],     // Shotgun
    LCarb:  [50, 150, 350, 550],   // Light Carbine (≈ assault rifle, not in book)
    Carb:   [50, 150, 350, 550],   // Carbine (≈ assault rifle, not in book)
    AsRf:   [50, 150, 350, 550],   // Assault Rifle
    SptR:   [100, 250, 500, 750],  // Sporting Rifle
    Snip:   [150, 300, 700, 1000], // Sniper Rifle
    LMG:    [75, 200, 400, 800],   // Light Machine Gun
    MMG:    [80, 250, 750, 1200],  // Medium Machine Gun
    HMG:    [80, 250, 800, 1500],  // Heavy Machine Gun
    MinG:   [100, 300, 900, 2400], // Minigun (≈ assault cannon, not in book)
    GrLn:   [50, 100, 150, 300],   // Grenade Launcher
    MisLn:  [150, 450, 1200, 3000],// Missile Launcher
    Las:    [50, 150, 350, 550],   // Laser (≈ assault rifle, not in book)
    other:  [10, 50, 150, 300],
  },
  // TN modifier per band relative to base TN 4 — book TNs are Short 4 / Medium 5 / Long 6 / Extreme 9.
  rangeTN: [0, 1, 2, 5], // Short, Medium, Long, Extreme

  /**
   * Grenades and grenade launchers use a DIFFERENT row of target numbers · *SR3 p.119*
   *
   * The GRENADE RANGE TABLE heads its columns **4 / 5 / 8 / 9**, not the 4 / 5 / 6 / 9 of the
   * WEAPON RANGE TABLE — so a long throw is TN 8, two harder than a rifle shot at long range.
   * The WEAPON RANGE TABLE says the same thing about the launcher from the other direction:
   * its Long band carries the footnote *"** Target number 8: see page 119"*.
   *
   * ⚠ **The grenade flow used `rangeTN` until 2026-08-30**, making every long-range throw two
   * points easier than the book allows. Nothing distinguished the two tables, and the shared
   * array looked authoritative because every other weapon does use it.
   */
  grenadeRangeTN: [0, 1, 4, 5], // Short 4, Medium 5, Long 8, Extreme 9

  // Grenade types (Grenade Range/Scatter tables). scatterDice = Nd6 scatter; scatterReduction =
  // metres removed per net hit; range bands [S,M,L,E] are STR multipliers, or fixed metres for the
  // launcher. Damage code/level come from the weapon item; falloff is −1 power per metre.
  grenadeTypes: {
    standard:    { label: 'Standard',          scatterDice: 1, scatterReduction: 2, rangeMult:  [3, 5, 10, 20] },
    aerodynamic: { label: 'Aerodynamic',       scatterDice: 2, scatterReduction: 4, rangeMult:  [3, 5, 20, 30] },
    launcher:    { label: 'Grenade Launcher',  scatterDice: 3, scatterReduction: 4, rangeFixed: [50, 100, 150, 300] },
  },

  // Strength-scaled ranges for bows, crossbows and thrown weapons (Impact Projectiles table).
  // Each band max = Strength × multiplier: [shortMult, mediumMult, longMult, extremeMult].
  // Same range-TN bands apply (Short +0 / Medium +1 / Long +2 / Extreme +5).
  // Bow/crossbows and thrown knife/shuriken are from the book; others are approximations.
  weaponRangeMultipliers: {
    Bow:  [1, 10, 30, 60],   // Bow
    LCB:  [2, 8, 20, 40],    // Light Crossbow
    MCB:  [3, 12, 30, 50],   // Medium Crossbow
    HCB:  [5, 15, 40, 60],   // Heavy Crossbow
    TK:   [1, 2, 3, 5],      // Thrown Knife
    SH:   [1, 2, 5, 7],      // Shuriken
    SL:   [1, 2, 3, 5],      // Sling (not in book — ≈ thrown knife)
    GR:   [1, 2, 3, 5],      // Thrown grenade (STR-based; AoE grenades use the AoE flow)
    BOL:  [1, 2, 3, 5],      // Bolas (not in book — ≈ thrown knife)
    Ctrp: [1, 1, 1, 1],      // Caltrop (dropped, not really thrown)
    Imp:  [1, 2, 3, 5],      // Improvised thrown (not in book)
    other:[1, 2, 3, 5],
  },

  // Ammo loading mechanisms — key matches the parenthetical code in a weapon's
  // ammunition-capacity string (e.g. "15(c)" → clip). Used to filter which ammo
  // a given gun can chamber. Order longest-code-first matters for parsing ("cy"/"sb"
  // before "c"/"s") — see SR3EItem._parseLoadMechanism.
  ammoLoadMechanisms: {
    c:        'Clip',
    m:        'Magazine',
    cy:       'Cylinder',
    b:        'Belt',
    d:        'Drum',
    sb:       'Single-Shot / Break',
    internal: 'Internal',
    arrow:    'Arrow',   // bows (nocked one at a time)
    bolt:     'Bolt',    // crossbows (nocked one at a time)
  },

  // Ammo types. Rules live here in code, not as per-item data fields. Each entry:
  //   powerMod    — flat power change applied at the attack roll (Explosive/EX/Gel)
  //   isStun      — damage goes to the Stun track (Gel)
  //   armorEffect — resolved on the soak card against the known target armour:
  //                   'apds'        halve target ballistic (round down)
  //                   'flechette'   unarmoured → level +1; armoured → effective armour ×2
  //                   'antiVehicle' bypass the vehicle Power/2 reduction
  //   faOnly      — only legal in Full Auto (Tracer)
  //   tracer      — FA damage: tracer rounds add to Damage Level but NOT to Power;
  //                 non-smartgun TN −1 per 3 rounds at ranges beyond Short
  ammoTypes: {
    regular:     { label: 'Regular' },
    explosive:   { label: 'Explosive',    powerMod: 1 },
    exExplosive: { label: 'EX Explosive', powerMod: 2 },
    gel:         { label: 'Gel',          powerMod: -2, isStun: true, armorEffect: 'gel' },
    apds:        { label: 'APDS',         armorEffect: 'apds' },
    flechette:   { label: 'Flechette',    armorEffect: 'flechette' },
    tracer:      { label: 'Tracer',       faOnly: true, tracer: true },
    antiVehicle: { label: 'Anti-Vehicle', armorEffect: 'antiVehicle' },
  },
  spellCategories: ['Combat', 'Detection', 'Health', 'Illusion', 'Manipulation'],
  spellTypes:      ['Physical', 'Mana'],
  spellRanges:     ['Touch', 'LOS', 'LOS (A)', 'Touch (A)'],  // "(A)" suffix = area effect
  spellDurations:  ['Instant', 'Sustained', 'Permanent'],
  cyberwareGrades: ['Standard', 'Alpha', 'Beta', 'Delta', 'Used'],

  programTypes:      ['Program', 'Protocol'],
  programCategories: ['Defensive', 'Combat', 'Operational', 'Offensive'],

  matrixUserModes: [
    {
      name: 'Terminal',
      abbreviation: 'TRM',
      initiative: 'default',
      responseBenefit: false,
      hackingPool: true,
      biofeedbackImmune: true,
      tnModifier: '+2 to all Matrix tests',
      description: 'Classic computer terminal or device interface.'
    },
    {
      name: 'Augmented Reality',
      abbreviation: 'AR',
      initiative: 'default',
      responseBenefit: false,
      hackingPool: true,
      biofeedbackImmune: true,
      tnModifier: null,
      description: 'Holographic overlay on real world. Icons appear as AROs.'
    },
    {
      name: 'Virtual Reality Cold Sim',
      abbreviation: 'VR-Cold',
      initiative: 'default',
      responseBenefit: false,
      hackingPool: true,
      biofeedbackImmune: false,
      biofeedbackType: 'Stun',
      tnModifier: null,
      description: 'Full immersion via standard datajack or trodes. Body falls unconscious.'
    },
    {
      name: 'Virtual Reality Hot Sim',
      abbreviation: 'VR-Hot',
      initiative: 'matrix',
      responseBenefit: true,
      hackingPool: true,
      biofeedbackImmune: false,
      biofeedbackType: 'Physical',
      tnModifier: null,
      description: 'Full immersion with heightened reflexes. Disables Matrix guardrails. Body falls unconscious.'
    },
  ],

  // ── Magic identity ──────────────────────────────────────────────────────────
  magicTraditions: ['Shamanic', 'Hermetic', 'Somatic'],

  // astral: 'projection' = project + perceive, 'perception' = perceive only, '' = none
  magicTypes: [
    { name: 'Full Magician', traditions: ['Shamanic', 'Hermetic'], astral: 'projection' },
    { name: 'Conjurer',      traditions: ['Shamanic', 'Hermetic'], astral: 'perception' },
    { name: 'Sorcerer',      traditions: ['Shamanic', 'Hermetic'], astral: 'perception' },
    { name: 'Elementalist',  traditions: ['Hermetic'],             astral: 'perception' },
    { name: 'Shamanist',     traditions: ['Shamanic'],             astral: 'perception' },
    { name: 'Adept',         traditions: ['Somatic'],              astral: 'perception' },
  ],

  // Full TOTEMS list (core + expanded/MITS), sorted alphabetically
  magicTotems: [
    'Adversary', 'Bacchus', 'Badger', 'Bat', 'Bear', 'Boar', 'Buffalo', 'Bull',
    'Cat', 'Cheetah', 'Cobra', 'Coyote', 'Crab', 'Creator', 'Crocodile',
    'Dark King', 'Dog', 'Dolphin', 'Dove', 'Dragonslayer',
    'Eagle', 'Elk',
    'Fenrir', 'Fire-Bringer', 'Fish', 'Fox',
    'Gargoyle', 'Gator', 'Gecko', 'Goose', 'Great Mother', 'Griffin',
    'Horse', 'Horned Man', 'Hyena',
    'Jackal', 'Jaguar',
    'Leopard', 'Leviathan', 'Lion', 'Lizard', 'Lover',
    'Monkey', 'Moon', 'Moon Maiden', 'Mountain', 'Mouse',
    'Oak', 'Otter', 'Owl',
    'Parrot', 'Pegasus', 'Phoenix', 'Plumed Serpent', 'Polecat', 'Prairie Dog', 'Puma', 'Python',
    'Raccoon', 'Rat', 'Raven',
    'Scorpion', 'Sea', 'Sea King', 'Seductress', 'Shark', 'Siren', 'Sky Father', 'Snake', 'Spider', 'Stag', 'Stream', 'Sun',
    'Thunderbird', 'Trickster', 'Turtle',
    'Unicorn',
    'Whale', 'Wild Huntsman', 'Wind', 'Wise Warrior', 'Wolf', 'Wyrm',
  ],

  // Voodoo loa (kept separate for flavour, combined under one dropdown with optgroup)
  magicLoa: [
    'Agwe', 'Azaca', 'Damballah', 'Erzulie', 'Ghede', 'Legba', 'Obatala', 'Ogoun', 'Shango',
  ],

  magicElements: ['Earth', 'Air', 'Fire', 'Water'],

  // Full reference data keyed by name for the magic-tab notes card
  magicTotemData: {
    'Adversary':     { environment: 'Everywhere', advantages: '+2 dice for combat and manipulation spells', disadvantages: 'If wounded, Adversary shamans go berserk in the same way as Bear shamans. Adversary shamans must succeed in a Willpower (8) Test to be friendly and civil to authority figures.' },
    'Bacchus':       { environment: 'Anywhere on land', advantages: '+2 dice for illusion spells, +2 dice for spirits of man', disadvantages: 'A Bacchus shaman must succeed in a Willpower (6) Test to continue on a course of action if something more interesting, prettier or more relaxing presents itself. Additionally, Bacchus shamans are easily distracted; apply a -1 Perception die modifier whenever a Bacchus shaman is in the presence of music, art, motion or great beauty.' },
    'Badger':        { environment: 'Forest', advantages: '+2 dice for combat spells, +2 dice for forest spirits', disadvantages: 'Badger shamans may go berserk in combat, the same as Bear shamans.' },
    'Bat':           { environment: 'Anywhere', advantages: '+2 dice for detection and manipulation spells, +1 die for spirits of the sky', disadvantages: '+2 to all magical target numbers when in direct sunlight.' },
    'Bear':          { environment: 'Forest', advantages: '+2 dice for health spells, +2 dice for forest spirits', disadvantages: 'Bear shamans can go berserk when wounded. Whenever a Bear shaman takes physical damage in combat, the player makes a Willpower (4) Test. The shaman goes berserk for 3 turns, minus 1 turn per success. Three or more successes avert the berserk rage entirely.' },
    'Boar':          { environment: 'Forest', advantages: '+2 dice for combat spells, +1 service from any spirit summoned for combat purposes', disadvantages: '-1 die for illusion spells. Boar shamans must make a Willpower (6) Test to withdraw from conflict.' },
    'Buffalo':       { environment: 'Plains', advantages: '+2 dice for health spells, +2 dice for prairie spirits', disadvantages: '-1 die for illusion spells.' },
    'Bull':          { environment: 'Forest, mountains or plains', advantages: '+2 dice for health spells, +1 die for combat and detection spells', disadvantages: 'A Bull shaman must have a minimum Charisma of 4.' },
    'Cat':           { environment: 'Urban', advantages: '+2 dice for illusion spells, +2 dice for city spirits', disadvantages: '+1 to all Mental target numbers if dirty or unkempt. An unwounded Cat shaman must make a Willpower (6) Test when casting a damaging spell.' },
    'Cheetah':       { environment: 'Savannah', advantages: '+2 dice for combat spells, +2 dice for savannah (prairie) spirits', disadvantages: '-1 die for health spells. Cheetah shamans must have a minimum Reaction of 4.' },
    'Cobra':         { environment: 'Jungle', advantages: '+2 dice to combat and illusion spells, +1 die for jungle (forest) spirits', disadvantages: 'If surprised, a Cobra shaman adds a +1 modifier to all target numbers for the remainder of that combat.' },
    'Coyote':        { environment: 'Anywhere on land', advantages: 'None', disadvantages: 'None' },
    'Crab':          { environment: 'On or by the sea', advantages: '+2 dice for sea spirits, +1 die for all Damage Resistance Tests (including Drain Tests)', disadvantages: '-1 die for illusion spells. A Crab shaman must make a Willpower (6) Test to change his mind.' },
    'Creator':       { environment: 'Urban or forest', advantages: '+2 dice for enchanting, +1 die for hearth and city spirits', disadvantages: '-1 die for combat spells. When confronted with something unusual or unique, a Creator shaman must make a Willpower (4) Test to avoid using astral perception to examine the new find for 3 turns.' },
    'Crocodile':     { environment: 'On or by the sea', advantages: '+2 dice for combat spells, +1 die for illusion spells, +2 dice for sea spirits', disadvantages: 'Crocodile shamans may go berserk in the same way as Shark shamans.' },
    'Dark King':     { environment: 'Natural caves', advantages: '+2 dice for health spells, +2 dice for spirits of man', disadvantages: 'Followers of the Dark King are physically weak. They must sacrifice 1 point from a starting physical Attribute.' },
    'Dog':           { environment: 'Urban', advantages: '+2 dice for detection spells, +2 dice for field and hearth spirits', disadvantages: 'A Dog shaman must make a Willpower (6) Test to change a declared course of action.' },
    'Dolphin':       { environment: 'On or by the sea', advantages: '+2 dice for detection spells, +2 dice for sea spirits', disadvantages: '-1 die for combat spells.' },
    'Dove':          { environment: 'Forests and Savannah', advantages: '+2 dice for health spells, +1 die for detection spells, +1 die for spirits of the sky', disadvantages: 'Dove shamans cannot cast combat spells. They must make a successful Willpower (6) Test to purposely inflict physical damage on a metahuman.' },
    'Dragonslayer':  { environment: 'Anywhere on land', advantages: '+3 dice for combat spells, +1 die for hearth spirits', disadvantages: '-1 die for illusion and detection spells.' },
    'Eagle':         { environment: 'Mountains', advantages: '+2 dice for detection spells, +2 dice for all spirits of the sky', disadvantages: 'Double the Essence loss caused by adding cyberware.' },
    'Elk':           { environment: 'Plains, forests and tundra', advantages: '+1 die for health spells, +1 die for spell defense, +2 dice for spirits of the land', disadvantages: '-2 dice for combat spells.' },
    'Fenrir':        { environment: 'Forests', advantages: '+3 dice for combat spells, +1 die for forest spirits', disadvantages: 'Fenrir shamans must make a Willpower (8) Test to back down or flee from any confrontation. If wounded, a Fenrir shaman goes berserk in the same manner as a Bear shaman.' },
    'Fire-Bringer':  { environment: 'Urban', advantages: '+2 dice for detection and manipulation spells, +2 dice for spirits of man', disadvantages: '-1 die for illusion spells.' },
    'Fish':          { environment: 'On or near water', advantages: '+2 dice for detection spells, +2 dice for one spirit of the waters (shaman\'s choice)', disadvantages: '-1 die for combat spells.' },
    'Fox':           { environment: 'Anywhere on land', advantages: '+2 dice for illusion spells, +2 dice for any one spirit of the land or spirit of man (shaman\'s choice)', disadvantages: '-1 die for combat spells. A Fox shaman must make a Willpower (6) Test to spare a fallen enemy.' },
    'Gargoyle':      { environment: 'Urban', advantages: '+1 die for detection and illusion spells, +2 dice for city spirits', disadvantages: '-1 die for spirits of the waters. Gargoyle shamans must live in a skyscraper or castlelike structure.' },
    'Gator':         { environment: 'Swamp, river or urban', advantages: '+2 dice for combat and detection spells. As a wilderness totem +2 dice for swamp, lake or river spirits. As an urban totem, +2 dice for city spirits.', disadvantages: '-1 die for illusion spells. It takes a Willpower (6) Test for a Gator shaman to break off a fight, chase or other direct action.' },
    'Gecko':         { environment: 'Anywhere', advantages: '+2 dice for illusion or manipulation spells (shaman\'s choice), +1 die for resisting any type of poison', disadvantages: '-1 die for combat spells.' },
    'Goose':         { environment: 'Anywhere near water', advantages: '+2 dice for detection spells, +1 die for combat spells, +2 dice for a single spirit of the land, sky or waters (shaman\'s choice)', disadvantages: 'Away from their home city or region, Goose shamans suffer +2 to all magical target numbers. Takes a full moon (28 days) to acclimate to a new home.' },
    'Great Mother':  { environment: 'Anywhere', advantages: '+2 dice for health spells, +2 dice for field and forest spirits and all spirits of the waters', disadvantages: '-2 dice when in the presence of corruption.' },
    'Griffin':       { environment: 'Mountains', advantages: '+2 dice for combat spells, +2 dice for spirits of the sky', disadvantages: 'Any time a Griffin shaman is insulted or offended, unless he succeeds in a Willpower (6) Test, the shaman will fly into a frenzy and attack the target.' },
    'Horse':         { environment: 'Prairie', advantages: '+2 dice for health spells, +2 dice for prairie spirits', disadvantages: '-1 die when resisting combat or illusion spells (shaman must choose at character creation).' },
    'Horned Man':    { environment: 'Anywhere on land', advantages: '+2 dice for combat spells, +2 dice for all spirits of the land', disadvantages: 'Shamans of the Horned Man must make a Willpower (6) Test to refuse a fight or physical contest.' },
    'Hyena':         { environment: 'Savannah', advantages: '+2 dice for combat spells, +2 dice for Banishing any spirits', disadvantages: '-1 die for health spells. Must make a Willpower (6) Test to perform an action with no benefit to herself.' },
    'Jackal':        { environment: 'Savannah', advantages: '+2 dice for detection and illusion spells, +2 dice for savannah (prairie) spirits', disadvantages: '-1 die for all combat spells.' },
    'Jaguar':        { environment: 'Jungle', advantages: '+2 dice for detection spells, +2 dice for forest spirits', disadvantages: '-1 die for health spells.' },
    'Leopard':       { environment: 'Forest and savannah', advantages: '+2 dice for combat and health spells, +2 dice for all nature spirits at night', disadvantages: '-1 die for resisting illusion spells.' },
    'Leviathan':     { environment: 'On or near the sea', advantages: '+1 die for health and manipulation spells, +2 dice for sea spirits', disadvantages: '-1 die for illusion spells.' },
    'Lion':          { environment: 'Prairie', advantages: '+2 dice for combat spells, +2 dice for prairie spirits', disadvantages: '-1 die for health spells.' },
    'Lizard':        { environment: 'Desert, forest or mountains', advantages: '+2 dice for health spells, +2 dice for desert, forest or mountain spirits (shaman\'s choice)', disadvantages: '+2 to all target numbers while in tight quarters. When trapped in a confined place, a Lizard shaman must make a Willpower (6) Test or fly into a berserk panic for 3 turns minus 1 per success.' },
    'Lover':         { environment: 'Urban', advantages: '+2 dice for illusion and control manipulation spells, +2 dice for spirits of the waters', disadvantages: 'Followers must have a minimum Charisma of 6.' },
    'Monkey':        { environment: 'Forest', advantages: '+2 dice for manipulation spells, +2 dice for spirits of man', disadvantages: '-1 die for combat spells.' },
    'Moon':          { environment: 'Wild places far from civilization, or the hidden corners of the city', advantages: '+2 dice for illusion and transformation manipulation spells, +1 die for detection spells, +1 die for spirits of the waters', disadvantages: '-1 die for combat spells. Moon shamans must make a Willpower (6) Test in order to engage in direct confrontation.' },
    'Moon Maiden':   { environment: 'Anywhere', advantages: 'None', disadvantages: 'None' },
    'Mountain':      { environment: 'Mountain', advantages: '+2 dice for manipulation spells, +2 dice for mountain spirits', disadvantages: '-1 die for illusion spells. A Mountain shaman must make a Willpower (6) Test to change a course of action once it is chosen.' },
    'Mouse':         { environment: 'Urban or fields', advantages: '+2 dice for detection and health spells, +2 dice for hearth and field spirits', disadvantages: '-2 dice for combat spells.' },
    'Oak':           { environment: 'Forest', advantages: '+2 dice for health spells, +2 dice for forest spirits, +2 dice for hearth spirits in any structure built mostly of oak', disadvantages: 'An Oak shaman must have a minimum Strength and Body of 4.' },
    'Otter':         { environment: 'On or near water', advantages: '+2 dice for illusion spells, +2 dice for river or sea spirits (shaman\'s choice)', disadvantages: '-1 die for combat spells.' },
    'Owl':           { environment: 'Anywhere', advantages: '+2 dice for any Sorcery or Conjuring at night', disadvantages: '+2 to all magical target numbers during the daytime.' },
    'Parrot':        { environment: 'Jungle', advantages: '+2 dice to illusion spells, +2 dice to jungle (forest) spirits', disadvantages: 'Apply a +1 modifier to all magical target numbers when a Parrot shaman\'s magical actions are not witnessed by someone who can be impressed by them.' },
    'Pegasus':       { environment: 'Rural area under the open sky', advantages: '+2 dice to detection and health spells, +2 dice for spirits of the sky', disadvantages: 'Pegasus shamans cannot bear captivity. If they voluntarily enter a building they must make a Willpower (6) Test to remain inside, with cumulative +1 penalties per failed test up to +8 (then death frenzy).' },
    'Phoenix':       { environment: 'Desert and fields', advantages: '+1 die for health and illusion spells, +2 dice for spirits of the flames. Can survive physical overflow damage of Body x 2 (reduced by 1 each time).', disadvantages: 'Cannot summon spirits of man. Must have minimum Charisma of 4. Must know a performance skill.' },
    'Plumed Serpent':{ environment: 'Anywhere in Aztlan', advantages: '+2 dice for detection spells, +2 dice for spirits of the sky', disadvantages: '+2 to all magical target numbers outside the territorial borders of Aztlan.' },
    'Polecat':       { environment: 'Anywhere on land', advantages: '+1 die for combat spells (+1 more at night), +2 dice for spirits of the land', disadvantages: '-1 die for health spells. In combat, a Polecat shaman must make a Willpower (6) Test to break off attack on an opponent.' },
    'Prairie Dog':   { environment: 'Anywhere on land', advantages: '+2 dice for detection spells, +1 die for illusion spells, +2 dice for spirits of the land', disadvantages: '-2 dice for combat spells. Prairie Dog shamans must have a minimum Charisma of 4.' },
    'Puma':          { environment: 'Any isolated wilderness location except the desert', advantages: '+2 dice for illusion spells, +2 dice for mountain spirits', disadvantages: '+2 to all magical target numbers when in direct sunlight or in crowds.' },
    'Python':        { environment: 'Jungle', advantages: '+2 dice for health and control manipulation spells, +2 dice for jungle (forest) spirits', disadvantages: 'A Python shaman must make a successful Willpower (6) Test to break off combat or any other sustained activity.' },
    'Raccoon':       { environment: 'Anywhere but the desert', advantages: '+2 dice for manipulation spells, +2 dice for city spirits', disadvantages: '-1 die for combat spells.' },
    'Rat':           { environment: 'Urban', advantages: '+2 dice for detection and illusion spells, +2 dice for city spirits', disadvantages: '-1 die for combat spells.' },
    'Raven':         { environment: 'Anywhere under the open sky', advantages: '+2 dice for manipulation spells, +2 dice for sky spirits', disadvantages: '+1 to all magical target numbers while not under the open sky.' },
    'Scorpion':      { environment: 'Desert', advantages: '+2 dice for combat and illusion spells. Scorpion venom never does more than Light damage to a Scorpion shaman.', disadvantages: '+2 to all magical target numbers during the day, -1 die for all Conjuring Tests. +1 to all magical target numbers for each day outside the desert, max +6.' },
    'Sea':           { environment: 'On or near the sea', advantages: '+2 dice for health and transformation manipulation spells, +2 dice for sea spirits and ship (hearth) spirits', disadvantages: 'A Sea shaman must receive suitable payment for all services. Very proud — must make a Willpower (6) Test to avoid answering any slight or insult in kind.' },
    'Sea King':      { environment: 'Anywhere near the sea', advantages: '+2 dice for manipulation spells, +2 dice for sea spirits', disadvantages: '-1 die for combat spells. Sea King shamans suffer from the Sea Legs Flaw without compensating Edges.' },
    'Seductress':    { environment: 'Urban', advantages: '+2 dice for illusion and control manipulation spells, +2 dice for spirits of man', disadvantages: 'Must have minimum Charisma of 6. Must make a Willpower (6) Test to avoid indulging when a vice or corruption is available.' },
    'Shark':         { environment: 'On or by the sea', advantages: '+2 dice for combat and detection spells, +2 dice for sea spirits', disadvantages: 'Shark shamans go berserk in combat when wounded or when they kill an opponent, similar to Bear shamans.' },
    'Siren':         { environment: 'Sea', advantages: '+2 dice for illusion and control manipulation spells, +2 dice for sea spirits', disadvantages: 'Must have minimum Charisma of 6. Receive a +1 spellcasting modifier when attacked by more than one foe.' },
    'Sky Father':    { environment: 'Anywhere under the open sky', advantages: '+2 dice for detection and manipulation spells, +2 dice for storm spirits', disadvantages: '+2 to all target numbers if the shaman is entrapped or bound in any way.' },
    'Snake':         { environment: 'Anywhere on land', advantages: '+2 dice for detection, health and illusion spells. As a wilderness totem, +2 dice for a spirit of the land. As an urban totem, +2 dice for a spirit of man (shaman\'s choice).', disadvantages: '-1 die for all spells cast during combat.' },
    'Spider':        { environment: 'The quiet, dark places into which others seldom look', advantages: '+2 dice for illusion spells, +1 die for all nature spirits', disadvantages: '+2 to all magical target numbers in the open. +1 to all target numbers if Spider shaman does not have sufficient time to plan.' },
    'Stag':          { environment: 'Forest', advantages: '+2 dice for health and illusion spells, +2 dice for forest spirits', disadvantages: '-1 die for manipulation spells.' },
    'Stream':        { environment: 'Near the shores of a river or stream', advantages: '+2 dice for health spells, +2 dice for river spirits', disadvantages: '-1 die for combat spells.' },
    'Sun':           { environment: 'Anywhere under the open sky', advantages: '+2 dice for combat, detection and health spells. +2 dice for any spirit while in direct sunlight.', disadvantages: '+2 to all Conjuring target numbers at night. A Sun shaman must have a minimum Charisma of 4.' },
    'Thunderbird':   { environment: 'Under the open sky', advantages: '+2 dice for combat and detection spells, +2 dice for storm spirits', disadvantages: '-1 die for all magical tests while not under open sky. Thunderbird shamans are very moody and subject to bouts of savage fury like Shark shamans.' },
    'Trickster':     { environment: 'Anywhere', advantages: 'None', disadvantages: 'None' },
    'Turtle':        { environment: 'On or near water', advantages: '+2 dice for illusion spells, +2 dice for one spirit of the waters (shaman\'s choice)', disadvantages: '-2 dice for combat spells.' },
    'Unicorn':       { environment: 'Forest', advantages: '+2 dice for health and illusion spells, +2 dice for spirits of the land. Gains Aura Reading Skill for free at ½ starting Intelligence.', disadvantages: 'Double all Essence losses from cyberware.' },
    'Whale':         { environment: 'On or near the sea', advantages: '+2 dice for combat spells, +2 dice for sea spirits', disadvantages: '-1 die for illusion spells.' },
    'Wild Huntsman': { environment: 'Forest, mountains or plains', advantages: '+2 dice for detection and illusion spells, +2 dice for storm spirits', disadvantages: 'Wild Huntsman shamans can go berserk in combat in the same way as Bear shamans.' },
    'Wind':          { environment: 'Anywhere under the open sky', advantages: '+2 dice for detection spells, +2 dice for spirits of the sky', disadvantages: '+2 to all magical target numbers while not under the open sky.' },
    'Wise Warrior':  { environment: 'Urban', advantages: '+2 dice for combat and detection spells, +2 dice for resisting all damaging spells', disadvantages: '-1 die for illusion spells.' },
    'Wolf':          { environment: 'Forest, prairie or mountains', advantages: '+2 dice for combat and detection spells, +2 dice for forest, prairie or mountain spirits (shaman\'s choice)', disadvantages: 'Wolf shamans can go berserk in combat, similar to Bear shamans.' },
    'Wyrm':          { environment: 'Mountains', advantages: '+2 dice for health and manipulation spells, +2 dice for mountain spirits', disadvantages: 'Wyrm shamans must make a Willpower (6) Test to quit a task. They must also sleep an average of seventy hours a week.' },
  },

  magicLoaData: {
    'Agwe':     { environment: 'Anywhere', advantages: '+2 dice for illusion spells', disadvantages: '-1 die for combat spells.' },
    'Azaca':    { environment: 'Anywhere', advantages: '+2 dice for health spells', disadvantages: 'A houngan of Azaca must make a Willpower (6) Test to avoid taking impulsive actions.' },
    'Damballah':{ environment: 'Anywhere', advantages: '+2 dice for detection and manipulation spells', disadvantages: 'A houngan of Damballah must make a successful Willpower (6) Test to reveal a particularly good piece of information.' },
    'Erzulie':  { environment: 'Anywhere', advantages: '+2 dice for illusion and control manipulation spells', disadvantages: 'A houngan of Erzulie must maintain at least a Middle Lifestyle. They suffer +1 to all magical target numbers while unkempt or less than stylish.' },
    'Ghede':    { environment: 'Anywhere', advantages: '+2 dice for health and manipulation spells', disadvantages: 'A houngan of Ghede must make a Willpower (6) Test to avoid playing a trick in an inappropriate situation.' },
    'Legba':    { environment: 'Anywhere', advantages: '+2 dice for detection and manipulation spells', disadvantages: '-1 die for combat spells. Houngans of Legba must have a minimum Charisma of 4.' },
    'Obatala':  { environment: 'Anywhere', advantages: '+2 dice for detection, health and control manipulation spells', disadvantages: 'Houngans of Obatala cannot cast combat spells. They suffer +2 to all magical target numbers when not wearing at least one article of white clothing.' },
    'Ogoun':    { environment: 'Anywhere', advantages: '+2 dice for combat spells', disadvantages: '-1 die for illusion spells. Houngans of Ogoun must make a Willpower (6) Test to back down from any insult to their honor or prowess.' },
    'Shango':   { environment: 'Anywhere', advantages: '+3 dice for Fire and Lightning elemental manipulation spells', disadvantages: 'Houngans of Shango may go berserk in combat, in the same way as Bear shamans.' },
  },

  magicElementData: {
    'Earth': { environment: 'Anywhere', advantages: '+2 dice for manipulation spells and earth elementals', disadvantages: '-1 die for detection spells and air elementals.' },
    'Air':   { environment: 'Anywhere', advantages: '+2 dice for detection spells and air elementals', disadvantages: '-1 die for manipulation spells and earth elementals.' },
    'Fire':  { environment: 'Anywhere', advantages: '+2 dice for combat spells and fire elementals', disadvantages: '-1 die for illusion spells and water elementals.' },
    'Water': { environment: 'Anywhere', advantages: '+2 dice for illusion spells and water elementals', disadvantages: '-1 die for combat spells and fire elementals.' },
  },

  skills:                    SR3ESkills,
  getSkillCategories,
  getSkillsForCategory,
  getLinkedAttributeForSkill,
  getLinkedAttributeForCategory,
  getFullSkillName,
  getSpecializationsForSkill,
  skillTypeForCategory,
  resolveMartialArt,
  skillCategoriesFor,
  adeptPowerKind,
  attributeBoostTarget,
  adeptPowerEffect,
  adeptPowerLevel,
  skillCategoryCountsAs: SKILL_CATEGORY_COUNTS_AS,
  sourceBooks: SOURCE_BOOKS,
  defaultAllowedBooks,

  // ── Programming Agents ──────────────────────────────────────────────────────
  agentSkillCategories: [
    'Biotech',
    'Build/Repair',
    'Electronics',
    'Etiquette',
    'Gunnery',
    'Hacking',
    'Instruction',
    'Knowledge',
    'Language',
    'Negotiation',
    'Pilot [Vehicle]',
  ],

  agentUtilities: [
    { name: 'Analyze',                                  multiplier: 3  },
    { name: 'Armor',                                    multiplier: 3  },
    { name: 'Attack: Light (Overload)',                 multiplier: 2  },
    { name: 'Attack: Moderate (Overload)',              multiplier: 3  },
    { name: 'Attack: Severe (Overload)',                multiplier: 4  },
    { name: 'Attack: Deadly (Overload)',                multiplier: 5  },
    { name: 'Attack: Nosebleed — Light (Biofeedback)',  multiplier: 5  },
    { name: 'Attack: Blackout — Moderate (Biofeedback)',multiplier: 10 },
    { name: 'Attack: Killjoy — Severe (Biofeedback)',   multiplier: 15 },
    { name: 'Attack: Black Hammer — Deadly (Biofeedback)', multiplier: 20 },
    { name: 'Decrypt',                                  multiplier: 4  },
    { name: 'Encrypt',                                  multiplier: 3  },
    { name: 'Exploit',                                  multiplier: 5  },
    { name: 'Jamboree',                                 multiplier: 1  },
    { name: 'Kill Switch',                              multiplier: 5  },
    { name: 'Lock-On',                                  multiplier: 6  },
    { name: 'Medic',                                    multiplier: 4  },
    { name: 'Saboteur',                                 multiplier: 4  },
    { name: 'Shield',                                   multiplier: 3  },
    { name: 'Signal Booster',                           multiplier: 1  },
    { name: 'Sleaze',                                   multiplier: 4  },
    { name: 'Slow',                                     multiplier: 4  },
    { name: 'Smoke Screen',                             multiplier: 4  },
    { name: 'Snoop',                                    multiplier: 3  },
  ],

  agentSpecialAbilities: [
    { name: 'Authenticate',             multiplier: 3 },
    { name: 'Corrupt and Burn',         multiplier: 5 },
    { name: 'Corruption',               multiplier: 3 },
    { name: 'Erosion: Flux Rating',     multiplier: 3 },
    { name: 'Erosion: MPCP',            multiplier: 5 },
    { name: 'Guardian',                 multiplier: 1 },
    { name: 'Infiltration: Memory Lock',multiplier: 5 },
    { name: 'Infiltration: Report',     multiplier: 3 },
    { name: 'Instance',                 multiplier: 2 },
    { name: 'Respawn',                  multiplier: 8 },
  ],
};
