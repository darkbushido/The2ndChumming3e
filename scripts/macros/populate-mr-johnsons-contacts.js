// ════════════════════════════════════════════════════════════════════════════
//  SR3E — Mr. Johnson's Little Black Book: Contacts Compendium Populator
//  Source: Shadowrun Mr Johnson's Little Black Book, pp.38-67 ("It's Who You
//  Know: Contacts"). Name, race, stats, skills and gear only — no flavor text,
//  descriptions or Hooks are reproduced (those are the book's IP; buy the PDF).
//
//  Paste into a Foundry macro (Type: Script) and run once.
//  Requires a full Foundry restart after updating system.json so that
//  the "Mr. Johnson's Contacts" compendium pack is registered.
//
//  Data-entry notes:
//  - Attribute bases are set to the character's EFFECTIVE (cyberware-boosted)
//    printed value where the book shows a parenthetical, e.g. "4(6)" -> base 6.
//    Cyberware/bioware essence/bio-index cost is consolidated onto a single
//    item per character (named after everything they carry) sized so the
//    derived Essence matches the book's printed E column exactly.
//  - Reaction/Initiative are left to the system's own derivation (Reaction =
//    floor((QUI+INT)/2), +1d6 base) EXCEPT where the book names an explicit,
//    well-defined SR3 reflex booster (Wired Reflexes N: +N Reaction/+N dice;
//    Boosted Reflexes N: +N dice only) — those are set via reactionBonus/
//    diceBonus to match RAW. Bespoke/unclear Reaction jumps are not hand-tuned.
//  - "Karma" from the book's Dice Pools line maps to karmaPool (SR3 Karma Pool
//    dice, not lifetime Karma — totalKarma/karma are unknown and left at 0).
//  - The book's "PR" (Professional/Connection Rating) column has no equivalent
//    system field; it's recorded verbatim in notes alongside the page cite.
//  - Spells are recorded by name with the printed Force rating in the item
//    name (e.g. "Powerbolt (F4)"); type/range/drain aren't in the source and
//    are left blank rather than guessed.
//  - Most Gear-line items (weapons, vehicles, electronics) are recorded as
//    generic gear() entries rather than statted firearm/melee/armor items,
//    since the book doesn't give damage codes for them and fabricating SR3
//    canon stats risked errors; only items with an explicit bracket rating in
//    the text ("[7/6]" armor, "[Rating N]" gear) are parsed into typed items.
// ════════════════════════════════════════════════════════════════════════════

const PACK_ID = 'The2ndChumming3e.sr3e-mr-johnsons-contacts';
const SOURCE  = "Mr. Johnson's Little Black Book";

function cite(page, pr, karma) {
  const bits = [`${SOURCE}, p.${page}.`];
  if (pr != null)    bits.push(`PR ${pr}.`);
  if (karma != null) bits.push(`Karma Pool ${karma}.`);
  return `<p>${bits.join(' ')}</p>`;
}

function skill(name, rating, linkedAttribute, category = 'active', specialisation = '') {
  return { name, type: 'skill', system: { skillName: name, rating, linkedAttribute, category, specialisation } };
}

function gear(name, quantity = 1, cost = 0) {
  return { name, type: 'gear', system: { quantity, cost } };
}

function armor(name, ballistic, impact, concealability = '', cost = 0) {
  return { name, type: 'armor', system: { ballistic, impact, concealability, cost } };
}

function ammo(name, cost = 0) {
  return { name, type: 'ammunition', system: { cost } };
}

function cyberware(name, essenceCost, grade = 'Standard', cyberwareCategory = '') {
  return { name, type: 'cyberware', system: { essenceCost, grade, cyberwareCategory } };
}

function bioware(name, bioIndex, grade = 'Standard', biowareCategory = '') {
  return { name, type: 'bioware', system: { bioIndex, grade, biowareCategory } };
}

function spell(name) {
  return { name, type: 'spell', system: {} };
}

function adeptpower(name, hasLevels = false, level = 1) {
  return { name, type: 'adeptpower', system: { powerCost: 0, hasLevels, level } };
}

/** attr(base) — matches the shared attribute schema { base, value } */
function attr(base) { return { base, value: base }; }

/** Wired/Boosted Reflexes shorthand — real SR3 formulas, applied only when explicitly named. */
function wired(n)   { return { reactionBonus: n, diceBonus: n }; }
function boosted(n) { return { reactionBonus: 0, diceBonus: n }; }
function noBonus()  { return { reactionBonus: 0, diceBonus: 0 }; }

function baseActor(name, page, {
  metatype = 'human', pr = null, karma = null,
  body = 3, quickness = 3, strength = 3, charisma = 3, intelligence = 3, willpower = 3,
  essence = 6, magic = 0, reflex = noBonus(), karmaPool = 0,
} = {}) {
  return {
    name,
    type: 'character',
    system: {
      metatype,
      nuyen: 0,
      karma: 0,
      totalKarma: 0,
      karmaPool: karmaPool ?? karma ?? 0,
      notes: cite(page, pr, karma),
      attributes: {
        body: attr(body),
        quickness: attr(quickness),
        strength: attr(strength),
        charisma: attr(charisma),
        intelligence: attr(intelligence),
        willpower: attr(willpower),
        essence: { base: 6, value: essence },
        magic: { base: magic, value: magic },
        reaction: {
          base: 3, value: 3,
          reactionBonus: reflex.reactionBonus, diceBonus: reflex.diceBonus,
          override: false, force: 0,
        },
      },
    },
  };
}

// ── Contacts ────────────────────────────────────────────────────────────────

const CONTACTS = [

  // ── p.38 — Who Watches the Watchmen? ────────────────────────────────────
  {
    ...baseActor('Corporate Security Guard', 38, {
      metatype: 'human', pr: 3, karma: 3,
      body: 5, quickness: 4, strength: 4, charisma: 3, intelligence: 3, willpower: 2,
      essence: 4.15, reflex: boosted(1),
    }),
    items: [
      skill('Athletics', 3, 'quickness'),
      skill('Clubs', 3, 'quickness'),
      skill('Computer', 2, 'intelligence'),
      skill('Etiquette', 2, 'charisma', 'active', 'Corporate 3'),
      skill('Interrogation', 2, 'charisma'),
      skill('Leadership', 3, 'charisma'),
      skill('Pistols', 4, 'quickness'),
      skill('Submachine Guns', 2, 'quickness'),
      skill('Unarmed Combat', 4, 'quickness'),
      skill('[Corporation] History', 3, 'intelligence', 'knowledge'),
      skill('Installation Layout', 3, 'intelligence', 'knowledge'),
      skill('Corporate Law', 2, 'intelligence', 'knowledge'),
      skill('Matrix Games', 3, 'intelligence', 'knowledge'),
      skill('Psychology', 2, 'intelligence', 'knowledge'),
      skill('Security Systems', 3, 'intelligence', 'knowledge'),
      skill('Tactics', 4, 'intelligence', 'knowledge'),
      cyberware('Headware Radio [Rating 3], Smartlink 2, Subvocal Microphone', 6 - 4.15),
      gear('Light Security Armor [helmeted 7/6, unhelmeted 6/4]'),
      armor('Light Security Armor', 7, 6),
      gear('Browning Max-Power'),
      gear('Goggles (low-light, thermographic)'),
      gear('Plastic Restraints'),
      gear('Mage Mask'),
      gear('Datajack'),
      gear('Datapad'),
      gear('Passkey (authorized areas of corp facility)'),
    ],
  },
  {
    ...baseActor('Rent-a-Cop', 38, {
      metatype: 'ork', pr: 2, karma: 2,
      body: 7, quickness: 3, strength: 6, charisma: 2, intelligence: 3, willpower: 2,
    }),
    items: [
      skill('Clubs', 3, 'quickness'),
      skill('Electronics', 2, 'intelligence'),
      skill('Stealth', 2, 'quickness'),
      skill('Unarmed Combat', 3, 'quickness'),
      skill('Police Procedure', 2, 'intelligence', 'knowledge'),
      skill('Security Procedures', 2, 'intelligence', 'knowledge'),
      skill('Security Systems', 2, 'intelligence', 'knowledge'),
      skill('Simporn Trivia', 4, 'intelligence', 'knowledge'),
      armor('Armored Vest', 2, 1),
      gear('Stun Baton'),
      gear('Radio'),
      gear('Large Flashlight'),
      gear('Simsense Player and Chips'),
      gear('Stim Drugs'),
    ],
  },

  // ── p.39 — Who Watches the Watchmen? (cont.) ─────────────────────────────
  {
    ...baseActor('Parasecurity Expert', 39, {
      metatype: 'elf', pr: 3, karma: 4,
      body: 3, quickness: 5, strength: 3, charisma: 6, intelligence: 5, willpower: 5,
      magic: 6,
    }),
    items: [
      skill('Athletics', 3, 'quickness'),
      skill('Biotech', 4, 'intelligence', 'active', 'Paracritters 5'),
      skill('Conjuring', 7, 'willpower'),
      skill('Etiquette', 3, 'charisma', 'active', 'Corporate 4'),
      skill('Instruction', 4, 'charisma', 'active', 'Animals 5'),
      skill('Rifles', 3, 'quickness'),
      skill('Animal Psychology', 6, 'intelligence', 'knowledge'),
      skill('Parazoology', 6, 'intelligence', 'knowledge'),
      skill('Security Procedures', 4, 'intelligence', 'knowledge'),
      skill('Spirits', 5, 'intelligence', 'knowledge'),
      skill('Veterinary Medicine', 5, 'intelligence', 'knowledge'),
      skill('Wards', 5, 'intelligence', 'knowledge'),
      armor('Lined Coat', 4, 2),
      gear('Spirit Focus (Rating 2)'),
      gear('Tranquilizer Rifle'),
    ],
  },
  {
    ...baseActor('Supply Sergeant', 39, {
      metatype: 'dwarf', pr: 3, karma: 3,
      body: 6, quickness: 3, strength: 6, charisma: 4, intelligence: 4, willpower: 4,
      essence: 5.2,
    }),
    items: [
      skill('Assault Rifle', 4, 'quickness'),
      skill('Etiquette', 3, 'charisma', 'active', 'Military 5'),
      skill('Leadership', 3, 'charisma', 'active', 'Military 4'),
      skill('Negotiation', 5, 'charisma', 'active', 'Fast Talk 6'),
      skill('Pistols', 3, 'quickness'),
      skill('Unarmed Combat', 4, 'quickness'),
      skill('Black Markets', 5, 'intelligence', 'knowledge'),
      skill('Duty Stations', 3, 'intelligence', 'knowledge', 'His Own 5'),
      skill('Horse Racing', 3, 'intelligence', 'knowledge'),
      skill('Military History', 4, 'intelligence', 'knowledge'),
      skill('Military SOP', 4, 'intelligence', 'knowledge'),
      skill('Military Theory', 3, 'intelligence', 'knowledge'),
      skill('Supply Chain', 5, 'intelligence', 'knowledge'),
      cyberware('Datajack, Display Link, Headware Memory [150 Mp]', 6 - 5.2),
      gear('Standard-issue Weapon (military branch)'),
    ],
  },

  // ── p.40 — Who Watches the Watchmen? (cont.) ─────────────────────────────
  {
    ...baseActor('Mercenary', 40, {
      metatype: 'human', pr: 4, karma: 4,
      body: 7, quickness: 6, strength: 7, charisma: 5, intelligence: 5, willpower: 4,
      essence: 0.42,
    }),
    items: [
      skill('Athletics', 5, 'quickness'),
      skill('Assault Rifles', 5, 'quickness'),
      skill('Assault Rifle B/R', 3, 'quickness'),
      skill('Etiquette', 3, 'charisma', 'active', 'Mercenary 5, Street 4'),
      skill('Heavy Weapons', 5, 'quickness'),
      skill('Intimidation', 3, 'charisma'),
      skill('Navigation', 3, 'intelligence'),
      skill('Stealth', 4, 'quickness'),
      skill('Unarmed Combat', 3, 'quickness'),
      skill('Wilderness Survival', 4, 'intelligence'),
      skill('[Relevant Language]', 3, 'intelligence', 'language'),
      skill('Desert Wars', 4, 'intelligence', 'knowledge'),
      skill('Mercenary Groups', 5, 'intelligence', 'knowledge'),
      skill('Military Hotspots', 4, 'intelligence', 'knowledge'),
      skill('Military Procedures', 4, 'intelligence', 'knowledge'),
      skill('Napoleonic Miniatures', 4, 'intelligence', 'knowledge'),
      skill('War History', 5, 'intelligence', 'knowledge'),
      cyberware('Bone Lacing (Plastic), Cybereyes (Thermographic, Flare Compensation, Muscle Replacement 2, Smartlink 2, Wired Reflexes 2)', 6 - 0.42),
      armor('Armor Jacket', 5, 3),
      gear('Colt M-23'),
      gear('Desert Wars'),
      gear('Survival Knife'),
      gear('Survival Kit'),
      gear('Low-light Goggles'),
    ],
  },
  {
    ...baseActor('Security Rigger', 40, {
      metatype: 'dwarf', pr: 3, karma: 3,
      body: 5, quickness: 4, strength: 3, charisma: 5, intelligence: 5, willpower: 3,
      essence: 0.3,
    }),
    items: [
      skill('Car', 5, 'reaction'),
      skill('Computer', 5, 'intelligence', 'active', 'Hardware 6, Decking 7'),
      skill('Electronics', 6, 'intelligence', 'active', 'Control Systems 8, Diagnostics 7, Security Systems 5'),
      skill('Gunnery', 5, 'reaction'),
      skill('Launch Weapons', 5, 'reaction'),
      skill('Pistols', 3, 'quickness'),
      skill('Architecture', 6, 'intelligence', 'knowledge'),
      skill('Chess', 5, 'intelligence', 'knowledge'),
      skill('Power Grids', 6, 'intelligence', 'knowledge'),
      skill('Security Systems', 8, 'intelligence', 'knowledge'),
      skill('Sports', 5, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Flare Compensation, Low Light, Thermographic), Datajack, Rigger Control Rig 3', 6 - 0.3),
      armor('Armor Jacket', 5, 3),
      gear('Remote Control Deck (Rating 6)'),
      gear('Remote-control Encryption Module (Rating 5)'),
      gear('Rigger Protocol-emulation Module (Rating 5)'),
      gear('Pocket Secretary / Database of Runners'),
      gear('Ford Americar'),
      gear('Various Drones'),
    ],
  },

  // ── p.41 — The Show Must Go On ───────────────────────────────────────────
  {
    ...baseActor('Sleazy Tabloid Reporter', 41, {
      metatype: 'human', pr: 2, karma: 2,
      body: 2, quickness: 4, strength: 2, charisma: 4, intelligence: 4, willpower: 4,
      essence: 4.2,
    }),
    items: [
      skill('Computer', 3, 'intelligence'),
      skill('Negotiation', 5, 'charisma', 'active', 'Bargain 6'),
      skill('Etiquette', 3, 'charisma', 'active', 'Entertainment 4'),
      skill('Interrogation', 3, 'charisma'),
      skill('Stealth', 3, 'quickness', 'active', 'Sneaking 4'),
      skill('Celebrities', 6, 'intelligence', 'knowledge'),
      skill('Current Events', 3, 'intelligence', 'knowledge'),
      skill('Entertainment Society', 4, 'intelligence', 'knowledge'),
      skill('News Industry', 5, 'intelligence', 'knowledge'),
      skill('Recreational Drugs', 3, 'intelligence', 'knowledge'),
      skill('Reporting', 4, 'intelligence', 'knowledge'),
      skill('Urban Legends', 4, 'intelligence', 'knowledge'),
      cyberware('Cyberears (Hearing Amplification, Recorder), Cybereyes (Low Light, Opticam), Datajack, Headware Memory [300 Mp]', 6 - 4.2),
      armor('Lined Coat', 4, 2),
      gear('Tiffani Needler'),
      gear('Wristphone'),
      gear('Shotgun Microphone', 4),
      gear('Dataline Tap', 5),
      gear('Tracking Signal and Locator', 4),
      gear('Pocket Secretary'),
      gear('Nissan Jackrabbit'),
    ],
  },
  {
    ...baseActor('Earnest Muckraker', 42, {
      metatype: 'human', pr: 3, karma: 3,
      body: 2, quickness: 4, strength: 2, charisma: 4, intelligence: 5, willpower: 4,
      essence: 3.85,
    }),
    items: [
      skill('Car', 3, 'reaction'),
      skill('Computer', 4, 'intelligence'),
      skill('Disguise', 4, 'intelligence'),
      skill('Etiquette', 3, 'charisma', 'active', 'Corporate 4, Street 4'),
      skill('Interrogation', 4, 'charisma', 'active', 'Verbal 5'),
      skill('Stealth', 3, 'quickness', 'active', 'Alertness 4'),
      skill('Unarmed Combat', 3, 'quickness'),
      skill('Corporate Politics', 3, 'intelligence', 'knowledge'),
      skill('Current Events', 4, 'intelligence', 'knowledge'),
      skill('Political Leaders', 3, 'intelligence', 'knowledge'),
      skill('Reporting', 4, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Electronic Vision Magnification 3, Opticam), Data Compactor 2, Datajack, Headware Memory [300 Mp], Voice Modulator', 6 - 3.85),
      gear('Sony Cybercam'),
      gear('Shotgun Microphone'),
      gear('Micro-recorder', 5),
      gear('Pocket Secretary'),
      gear('Several False IDs'),
      gear('Disguise Kit'),
      gear('Micro-transceiver', 3),
      gear('Binoculars'),
      gear('Renault-Fiat Eurovan'),
    ],
  },

  // ── p.42 — The Show Must Go On (cont.) ───────────────────────────────────
  {
    ...baseActor('Trid Pirate', 42, {
      metatype: 'dwarf', pr: 3, karma: 2,
      body: 3, quickness: 4, strength: 5, charisma: 5, intelligence: 5, willpower: 5,
    }),
    items: [
      skill('Car', 4, 'reaction'),
      skill('Computer', 4, 'intelligence', 'active', 'Hardware 5'),
      skill('Electronics', 5, 'intelligence'),
      skill('Electronics B/R', 5, 'intelligence'),
      skill('Etiquette', 3, 'charisma', 'active', 'Media 5, Street 4'),
      skill('Negotiation', 3, 'charisma'),
      skill('Stealth', 4, 'quickness', 'active', 'Theft 5'),
      skill('Communications Systems', 6, 'intelligence', 'knowledge'),
      skill('News Networks', 4, 'intelligence', 'knowledge'),
      skill('Reporting', 4, 'intelligence', 'knowledge'),
      skill('Rumor Mill', 4, 'intelligence', 'knowledge'),
      skill('Zombie Sims', 4, 'intelligence', 'knowledge'),
      cyberware('Commlink 4, Cyberear (Display Link, Image Link, Opticam), Datajack, Headware Memory [150 Mp], Headware Telephone', 0),
      gear('CMT Avatar (with vidlink display, electronics tools)'),
      gear('Trideo Camera'),
      gear('Duplication Equipment'),
      gear('Trideo Editing Setup'),
      gear('Land Rover Model 2046 (van configuration)'),
    ],
  },
  {
    ...baseActor('Club Owner', 42, {
      metatype: 'troll', pr: 2, karma: 3,
      body: 8, quickness: 2, strength: 7, charisma: 3, intelligence: 3, willpower: 4,
      essence: 6,
    }),
    items: [
      skill('Etiquette', 2, 'charisma', 'active', 'Entertainment 4'),
      skill('Negotiation', 4, 'charisma', 'active', 'Bargaining 6'),
      skill('Pistols', 2, 'quickness'),
      skill('Unarmed Combat', 3, 'quickness'),
      skill('Club Scene', 6, 'intelligence', 'knowledge'),
      skill('Entertainment Law', 3, 'intelligence', 'knowledge'),
      skill('Lingerie', 3, 'intelligence', 'knowledge'),
      skill('Local Entertainers', 4, 'intelligence', 'knowledge'),
      skill('Talent Evaluation', 6, 'intelligence', 'knowledge'),
      gear('Ares Viper'),
      gear('Tres Chic Clothing'),
      gear('Wristphone'),
      gear('Pocket Secretary (contact info for city entertainers)'),
      gear('Eurocar Westwind'),
    ],
  },

  // ── p.43 — The Show Must Go On (cont.) ───────────────────────────────────
  {
    ...baseActor('Club Hopper', 43, {
      metatype: 'human', pr: 1, karma: 1,
      body: 2, quickness: 4, strength: 2, charisma: 3, intelligence: 3, willpower: 3,
      essence: 5.8,
    }),
    items: [
      skill('Athletics', 3, 'quickness', 'active', 'Dancing 5'),
      skill('Etiquette', 2, 'charisma', 'active', 'Corporate 3, Club 5'),
      skill('Unarmed Combat', 1, 'quickness'),
      skill('Accounting (or other appropriate professional skill)', 3, 'intelligence', 'knowledge'),
      skill('Celebrity Gossip', 6, 'intelligence', 'knowledge'),
      skill('Club Drugs', 3, 'intelligence', 'knowledge'),
      skill('Local Club Circuit', 6, 'intelligence', 'knowledge'),
      skill('Local Music Scene', 5, 'intelligence', 'knowledge'),
      cyberware('Cosmetic Cybereyes', 6 - 5.8),
      gear('Tres Chic Knockoff Clothing'),
      gear('Simsense Player'),
      gear('Autograph Book'),
      gear('Club Drugs of Choice'),
    ],
  },
  {
    ...baseActor('Simsense Star', 43, {
      metatype: 'elf', pr: 1, karma: 2,
      body: 3, quickness: 5, strength: 3, charisma: 8, intelligence: 4, willpower: 3,
      essence: 3.4,
    }),
    items: [
      skill('Athletics', 3, 'quickness'),
      skill('Etiquette', 5, 'charisma', 'active', 'Entertainment 7'),
      skill('Negotiation', 2, 'charisma', 'active', 'Bargain 4'),
      skill('Acting', 5, 'intelligence', 'knowledge'),
      skill('Celebrities', 5, 'intelligence', 'knowledge'),
      skill('Dancing', 4, 'intelligence', 'knowledge'),
      skill('Entertainment Law', 2, 'intelligence', 'knowledge'),
      skill('Show Dog Breeding', 4, 'intelligence', 'knowledge'),
      skill('Simsense Production', 3, 'intelligence', 'knowledge'),
      cyberware('Cosmetic Cybereyes, Simlink, Simrig', 6 - 3.4),
      bioware('Clean Metabolism, Dietware', 0.4),
      gear('Tres Chic Clothing'),
      gear('Saab Dynamit'),
    ],
  },

  // ── p.44 — By Any Means Necessary ────────────────────────────────────────
  {
    ...baseActor('Ork Nation Organizer', 44, {
      metatype: 'ork', pr: 3, karma: 3,
      body: 7, quickness: 3, strength: 6, charisma: 3, intelligence: 3, willpower: 3,
      essence: 6,
    }),
    items: [
      skill('Athletics', 3, 'quickness'),
      skill('Car', 3, 'reaction'),
      skill('Clubs', 5, 'quickness'),
      skill('Demolitions', 3, 'intelligence'),
      skill('Leadership', 4, 'charisma'),
      skill('Negotiation', 3, 'charisma'),
      skill('Pistols', 2, 'quickness'),
      skill('Unarmed Combat', 5, 'quickness'),
      skill('Civil Disobedience', 5, 'intelligence', 'knowledge'),
      skill('Civil Rights Movements', 5, 'intelligence', 'knowledge'),
      skill('Classical Music', 4, 'intelligence', 'knowledge'),
      skill('Discrimination Law', 2, 'intelligence', 'knowledge'),
      skill('Ork History', 5, 'intelligence', 'knowledge'),
      armor('Lined Coat', 4, 2),
      gear('Ares Crusader'),
      gear('Stun Baton'),
      gear('Pocket Secretary'),
      gear('Micro-transceiver', 3),
    ],
  },
  {
    ...baseActor('Upright Humanis Member', 44, {
      metatype: 'human', pr: 2, karma: 2,
      body: 3, quickness: 3, strength: 3, charisma: 5, intelligence: 4, willpower: 4,
      essence: 5.3,
    }),
    items: [
      skill('Computer', 2, 'intelligence'),
      skill('Etiquette', 3, 'charisma', 'active', 'Corporate 4, Political 5'),
      skill('Leadership', 3, 'charisma', 'active', 'Political 5'),
      skill('Negotiation', 4, 'charisma'),
      skill('[Relevant Occupational Skill]', 4, 'intelligence', 'knowledge'),
      skill('Biology', 2, 'intelligence', 'knowledge'),
      skill('Conspiracies', 3, 'intelligence', 'knowledge'),
      skill('Fundraising', 4, 'intelligence', 'knowledge'),
      skill('History', 4, 'intelligence', 'knowledge'),
      skill('Political Groups', 4, 'intelligence', 'knowledge'),
      skill('Talk News Trids', 4, 'intelligence', 'knowledge'),
      cyberware('Datajack, Headware Memory [150 Mp]', 6 - 5.3),
      gear('Morrisey Élan'),
      gear('Wristphone'),
      gear('Pocket Secretary'),
      gear('Ford Americar'),
    ],
  },

  // ── p.45 — By Any Means Necessary (cont.) ────────────────────────────────
  {
    ...baseActor('Terra First! Activist', 45, {
      metatype: 'elf', pr: 3, karma: 2,
      body: 4, quickness: 5, strength: 4, charisma: 3, intelligence: 5, willpower: 6,
    }),
    items: [
      skill('Athletics', 3, 'quickness'),
      skill('Bike', 3, 'reaction'),
      skill('Demolitions', 3, 'intelligence'),
      skill('Stealth', 4, 'quickness', 'active', 'Sneaking 6'),
      skill('Unarmed Combat', 2, 'quickness'),
      skill('Chemistry', 4, 'intelligence', 'knowledge'),
      skill('Ecology', 6, 'intelligence', 'knowledge'),
      skill('Environmental Law', 5, 'intelligence', 'knowledge'),
      skill('Megacorporations', 3, 'intelligence', 'knowledge'),
      skill('Nature Trails', 4, 'intelligence', 'knowledge'),
      skill('Public Relations', 3, 'intelligence', 'knowledge'),
      gear('Propaganda Flyers and Ecological Literature Chips'),
      gear('Pocket Secretary'),
      gear('Simsense Player'),
      gear('Dodge Scoot'),
    ],
  },
  {
    ...baseActor('Terrorist', 46, {
      metatype: 'human', pr: 4, karma: 2,
      body: 5, quickness: 4, strength: 5, charisma: 3, intelligence: 2, willpower: 3,
      essence: 4.5,
    }),
    items: [
      skill('Assault Rifle', 6, 'quickness'),
      skill('Car', 4, 'reaction'),
      skill('Computer', 5, 'intelligence'),
      skill('Demolitions', 5, 'intelligence'),
      skill('Fixed-Wing Aircraft', 4, 'reaction'),
      skill('Launch Weapons', 5, 'reaction'),
      skill('Stealth', 4, 'quickness'),
      skill('Unarmed Combat', 6, 'quickness'),
      skill('[Relevant Cause]', 6, 'intelligence', 'knowledge'),
      skill('Chemistry', 3, 'intelligence', 'knowledge'),
      skill('History', 3, 'intelligence', 'knowledge'),
      skill('Local Area', 6, 'intelligence', 'knowledge'),
      skill('Terrorist Groups', 5, 'intelligence', 'knowledge'),
      cyberware('Boosted Reflexes 1, Cybereyes (Flare Compensation, Opticam, Thermographic), Smartlink 2', 6 - 4.5),
      gear('Secure Long Coat'),
      gear('HK G12A3z'),
      gear('Plastic Explosive'),
      gear('Micro-transceiver 5 (with encryption 5)'),
      gear('Mapsofts'),
      gear('GPS'),
      gear('Propaganda Chips'),
      gear('Video Camera'),
      gear('GMC Bulldog Step-Van (Security Model)'),
    ],
  },

  // ── p.46 — By Any Means Necessary (cont.) ────────────────────────────────
  {
    ...baseActor('Cult Member', 46, {
      metatype: 'human', pr: 3, karma: 1,
      body: 2, quickness: 3, strength: 2, charisma: 3, intelligence: 2, willpower: 3,
      essence: 6,
    }),
    items: [
      skill('Computer', 2, 'intelligence'),
      skill('Etiquette', 3, 'charisma', 'active', 'Cult 5'),
      skill('Intimidation', 3, 'charisma'),
      skill('Negotiation', 3, 'charisma', 'active', 'Bargaining 5'),
      skill('Stealth', 3, 'quickness', 'active', 'Sneaking 4'),
      skill('[Relevant Occupational Skill]', 5, 'intelligence', 'knowledge'),
      skill('Comparative Religion', 4, 'intelligence', 'knowledge'),
      skill('Cult Propaganda', 5, 'intelligence', 'knowledge'),
      skill('Organization Hierarchy', 4, 'intelligence', 'knowledge'),
      skill('Psychology', 3, 'intelligence', 'knowledge'),
      gear('Propaganda Chips'),
      gear('Wrist Phone'),
      gear('Audio Player'),
      gear('Cult Regalia (clothes, badges of membership, etc.)'),
      gear('Pocket Secretary'),
    ],
  },
  {
    ...baseActor('Freedom Fighter', 46, {
      metatype: 'dwarf', pr: 4, karma: 3,
      body: 5, quickness: 5, strength: 3, charisma: 4, intelligence: 3, willpower: 3,
    }),
    items: [
      skill('[Vehicle] B/R', 5, 'reaction'),
      skill('[Firearm] B/R', 5, 'quickness'),
      skill('Assault Rifles', 5, 'quickness'),
      skill('Intimidation', 4, 'charisma'),
      skill('Leadership', 4, 'charisma'),
      skill('Pistols', 3, 'quickness'),
      skill('Unarmed Combat', 5, 'quickness'),
      skill('[Relevant Cause]', 6, 'intelligence', 'knowledge'),
      skill('[Relevant Language]', 4, 'intelligence', 'language'),
      skill('Guerrilla Tactics', 6, 'intelligence', 'knowledge'),
      skill('Mechanics', 5, 'intelligence', 'knowledge'),
      skill('Politics', 4, 'intelligence', 'knowledge'),
      skill('Small Unit Tactics', 5, 'intelligence', 'knowledge'),
      skill('Survival', 5, 'intelligence', 'knowledge'),
      skill('Trid Pirates', 4, 'intelligence', 'knowledge'),
      cyberware('Boosted Reflexes 1, Muscle Replacement 2, Smartlink 2', 0),
      armor('Vest with Plates', 4, 3),
      gear('Helmet'),
      gear('Colt M-23'),
      gear('WW Infiltrator'),
      gear('Survival Knife'),
      gear('Slap Patches'),
      gear('MREs'),
      gear('Jeep'),
    ],
  },

  // ── p.47 — Here Come the Suits ───────────────────────────────────────────
  {
    ...baseActor('Corporate Headhunter', 47, {
      metatype: 'elf', pr: 3, karma: 4,
      body: 3, quickness: 5, strength: 3, charisma: 5, intelligence: 5, willpower: 6,
      essence: 4.6,
    }),
    items: [
      skill('Computer', 5, 'intelligence'),
      skill('Etiquette', 4, 'charisma', 'active', 'Corporate 8'),
      skill('Leadership', 5, 'charisma'),
      skill('Negotiation', 6, 'charisma', 'active', 'Bargain 8'),
      skill('Pistols', 3, 'quickness'),
      skill('Corporate Politics', 8, 'intelligence', 'knowledge'),
      skill('Corporate Rumor Mill', 7, 'intelligence', 'knowledge'),
      skill('Data Brokerage', 6, 'intelligence', 'knowledge'),
      skill('Data Havens', 5, 'intelligence', 'knowledge'),
      skill('Economics', 4, 'intelligence', 'knowledge'),
      skill('Local Runners', 7, 'intelligence', 'knowledge'),
      skill('Psychology', 8, 'intelligence', 'knowledge'),
      skill('State-of-the-Art Science', 6, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Display Link, Image Link, Low Light Vision), Datajack, Headware Memory [150 Mp], Headware Telephone', 6 - 4.6),
      armor('Actioneer Suit', 4, 2),
      gear('Fichetti Security 500'),
      gear('Pocket Secretary'),
      gear('Toyota Elite'),
    ],
  },
  {
    ...baseActor('Mr. Fix-It', 47, {
      metatype: 'troll', pr: 4, karma: 5,
      body: 10, quickness: 5, strength: 9, charisma: 3, intelligence: 4, willpower: 3,
      essence: 2,
    }),
    items: [
      skill('Car', 5, 'reaction'),
      skill('Computer', 4, 'intelligence'),
      skill('Cyber Implant Combat', 6, 'quickness'),
      skill('Etiquette', 4, 'charisma', 'active', 'Corp 5, Street 7'),
      skill('Intimidation', 5, 'charisma'),
      skill('Leadership', 5, 'charisma'),
      skill('Negotiation', 5, 'charisma'),
      skill('Pistols', 6, 'quickness'),
      skill('Shotguns', 6, 'quickness'),
      skill('Throwing', 6, 'quickness'),
      skill('Corporate Politics', 5, 'intelligence', 'knowledge'),
      skill('Criminal Organizations', 5, 'intelligence', 'knowledge'),
      skill('Game Emulators', 4, 'intelligence', 'knowledge'),
      skill('Psychology', 5, 'intelligence', 'knowledge'),
      skill('Rumor Mill', 6, 'intelligence', 'knowledge'),
      skill('Runner Hangouts', 6, 'intelligence', 'knowledge'),
      cyberware('Bone Lacing (Plastic), Boosted Reflexes 1, Datajack, Cyber Implant Weapon (Retractable Spur), Smartlink 2', 4),
      armor('Tres Chic Armored Clothing', 3, 0),
      gear('Defiance T-250'),
      gear('Ultimax MMG'),
      gear('Ares Predator 2'),
      gear('Mitsubishi Nightsky'),
      gear('Pocket Secretary / Database of Runners'),
    ],
  },

  // ── p.48 — Here Come the Suits (cont.) ───────────────────────────────────
  {
    ...baseActor('Mixed-up Middle Manager', 48, {
      metatype: 'dwarf', pr: 2, karma: 2,
      body: 5, quickness: 3, strength: 3, charisma: 4, intelligence: 4, willpower: 3,
      essence: 5.3,
    }),
    items: [
      skill('Car', 2, 'reaction'),
      skill('Computer', 4, 'intelligence'),
      skill('Electronics', 2, 'intelligence'),
      skill('Etiquette', 2, 'charisma', 'active', 'Corporate 4'),
      skill('Negotiation', 3, 'charisma'),
      skill('[Relevant Industry]', 3, 'intelligence', 'knowledge', 'Competitors 5'),
      skill('Business Administration', 5, 'intelligence', 'knowledge'),
      skill('Corporate Politics', 5, 'intelligence', 'knowledge'),
      skill('Economics', 4, 'intelligence', 'knowledge'),
      skill('Rumor Mill', 3, 'intelligence', 'knowledge'),
      cyberware('Datajack, Headware Memory [150 Mp]', 6 - 5.3),
      gear('Bad Tres Chic Suit'),
      gear('Sony CTY-360-D Cyberdeck'),
      gear('Mercury Comet'),
    ],
  },
  {
    ...baseActor('Corp Bodyguard', 49, {
      metatype: 'elf', pr: 4, karma: 3,
      body: 5, quickness: 7, strength: 6, charisma: 5, intelligence: 3, willpower: 5,
      essence: 1.76,
    }),
    items: [
      skill('Athletics', 6, 'quickness'),
      skill('Biotech', 3, 'intelligence', 'active', 'First Aid 5'),
      skill('Car', 5, 'reaction'),
      skill('Etiquette', 3, 'charisma', 'active', 'Corporate 5'),
      skill('Pistols', 7, 'quickness'),
      skill('Small Unit Tactics', 4, 'intelligence'),
      skill('SMG', 6, 'quickness'),
      skill('Stealth', 6, 'quickness'),
      skill('Throwing', 6, 'quickness'),
      skill('Unarmed Combat', 6, 'quickness'),
      skill("Charge's Habits", 8, 'intelligence', 'knowledge'),
      skill('City Knowledge', 6, 'intelligence', 'knowledge'),
      skill('Corporate Figureheads', 4, 'intelligence', 'knowledge'),
      skill('Fashion', 4, 'intelligence', 'knowledge'),
      skill('Fine Art', 5, 'intelligence', 'knowledge'),
      skill('Security Procedures', 6, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Display Link, Flare Compensation, Low Light), Muscle Replacement 1, Reaction Enhancers 2, Wired Reflexes 2 w/Reflex Trigger', 6 - 1.76),
      armor('Tres Chic Armored Clothing', 3, 0),
      gear('Narcoject Pistol'),
      gear('HK-227S'),
      gear('Flash-pak'),
      gear('Slap Patches'),
      gear('Pocket Secretary'),
      gear('Eurocar Westwind'),
    ],
  },

  // ── p.49 — Here Come the Suits (cont.) ───────────────────────────────────
  {
    ...baseActor('Corp Decker', 49, {
      metatype: 'human', pr: 2, karma: 2,
      body: 3, quickness: 4, strength: 2, charisma: 4, intelligence: 6, willpower: 4,
      essence: 2.55,
    }),
    items: [
      skill('Computer', 6, 'intelligence', 'active', 'Decking 8, Programming 7'),
      skill('Computer B/R', 6, 'intelligence'),
      skill('Electronics', 7, 'intelligence'),
      skill('Etiquette', 3, 'charisma', 'active', 'Corporate 4, Matrix 5'),
      skill('Anime', 5, 'intelligence', 'knowledge'),
      skill('Computer History', 5, 'intelligence', 'knowledge'),
      skill('Gray IC Design', 4, 'intelligence', 'knowledge'),
      skill('Local Decker Hangouts', 4, 'intelligence', 'knowledge'),
      skill('LTG Familiarity', 4, 'intelligence', 'knowledge'),
      skill('Security Network Familiarity', 5, 'intelligence', 'knowledge'),
      cyberware('Datajack, Encephalon 2, Headware Memory [300 Mp] w/Data Compactor 2, Math SPU 3', 6 - 2.55),
      gear('Renraku Kraftwerk-8 (or appropriate deck for corp)'),
      gear('Appropriate Utilities at Rating 4-8'),
      gear('Wristphone'),
      gear('Nissan Jackrabbit'),
    ],
  },
  {
    ...baseActor('Corp Scientist', 49, {
      metatype: 'human', pr: 1, karma: 1,
      body: 2, quickness: 3, strength: 2, charisma: 6, intelligence: 4, willpower: 3,
      essence: 4.6,
    }),
    items: [
      skill('Biotech or Electronics', 8, 'intelligence'),
      skill('Computer', 5, 'intelligence'),
      skill('Etiquette', 2, 'charisma', 'active', 'Corporate 4'),
      skill('Instruction', 5, 'charisma', 'active', 'Specialty 7'),
      skill('[Relevant Specialty]', 8, 'intelligence', 'knowledge'),
      skill('[Relevant Related Field]', 6, 'intelligence', 'knowledge'),
      skill('Research Methods', 6, 'intelligence', 'knowledge'),
      skill('Scientific Journals', 3, 'intelligence', 'knowledge'),
      skill('State-of-the-Art Science', 5, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Image Link, Microscopic Vision, Thermographic), Datajack, Headware Memory [300 Mp]', 6 - 4.6),
      gear('Desktop Cyberterminal'),
      gear('CMT Avatar'),
      gear('Gear as Needed for Specialty'),
      gear('Wristphone'),
      gear('Passkey (restricted areas of facility)'),
    ],
  },

  // ── p.50 — Down and Dirty ────────────────────────────────────────────────
  {
    ...baseActor('Pimp', 50, {
      metatype: 'ork', pr: 2, karma: 2,
      body: 8, quickness: 3, strength: 8, charisma: 3, intelligence: 3, willpower: 4,
      essence: 5.8,
    }),
    items: [
      skill('Etiquette', 3, 'charisma', 'active', 'Street 5'),
      skill('Intimidation', 4, 'charisma'),
      skill('Negotiation', 6, 'charisma', 'active', 'Fast Talk 8'),
      skill('Pistols', 3, 'quickness'),
      skill('Shotguns', 4, 'quickness'),
      skill('Business Economics', 3, 'intelligence', 'knowledge'),
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Gang Knowledge', 3, 'intelligence', 'knowledge'),
      skill('Organized Crime Territories', 5, 'intelligence', 'knowledge'),
      skill('Police Procedures', 3, 'intelligence', 'knowledge'),
      skill('Rumor Mill', 4, 'intelligence', 'knowledge'),
      skill('Vintage Cars', 4, 'intelligence', 'knowledge'),
      cyberware('Flamboyant Cybereyes (Low Light, Thermographic Vision)', 6 - 5.8),
      gear('Loud Trés Chic Suit'),
      gear('Predator 2'),
      gear('Wristphone'),
      gear('Trid Recording Setup'),
      gear('Illegal Chips/BTLs/Drugs'),
      gear('Tricked-out Honda GM-3220 Turbo'),
    ],
  },
  {
    ...baseActor('Tamanous Member', 50, {
      metatype: 'ork', pr: 2, karma: 2,
      body: 6, quickness: 3, strength: 7, charisma: 3, intelligence: 3, willpower: 2,
      essence: 6,
    }),
    items: [
      skill('Biotech', 3, 'intelligence', 'active', 'Organ Culture and Growth 5'),
      skill('Car', 3, 'reaction'),
      skill('Computer', 1, 'intelligence'),
      skill('Electronics', 2, 'intelligence', 'active', 'Cybertechnology 3'),
      skill('Etiquette', 3, 'charisma', 'active', 'Street 6'),
      skill('Intimidation', 7, 'charisma'),
      skill('Pistols', 4, 'quickness', 'active', 'Sneaking 5, Hiding 6'),
      skill('Unarmed Combat', 4, 'quickness'),
      skill('Anatomy', 5, 'intelligence', 'knowledge'),
      skill('Bloodsports', 4, 'intelligence', 'knowledge'),
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Hospital Protocol', 4, 'intelligence', 'knowledge'),
      skill('Medicine', 4, 'intelligence', 'knowledge'),
      skill('Physiology', 4, 'intelligence', 'knowledge'),
      skill('Tamanous', 4, 'intelligence', 'knowledge'),
      armor('Lined Coat', 4, 2),
      gear('Predator 2'),
      gear('Medkit [Rating 5]'),
      gear('Surgical Toolkit'),
      gear('Electronics Kit'),
      gear('Wristphone'),
      gear('Pocket Secretary / Database of Parts'),
      gear('Sterile Containers for Parts'),
      gear('Land Rover Model 2046 Van'),
    ],
  },

  // ── p.51 — Down and Dirty (cont.) ────────────────────────────────────────
  {
    ...baseActor('Reluctant Ganger', 51, {
      metatype: 'human', pr: 2, karma: 2,
      body: 4, quickness: 3, strength: 3, charisma: 3, intelligence: 3, willpower: 2,
      essence: 6,
    }),
    items: [
      skill('Bike', 3, 'reaction'),
      skill('Clubs', 3, 'quickness'),
      skill('Etiquette', 2, 'charisma', 'active', 'Street 4'),
      skill('Intimidation', 2, 'charisma'),
      skill('Pistols', 2, 'quickness'),
      skill('Stealth', 3, 'quickness', 'active', 'Hiding 4, Sneaking 4'),
      skill('Unarmed Combat', 3, 'quickness'),
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Gang ID', 5, 'intelligence', 'knowledge'),
      skill('Gang Hangouts', 5, 'intelligence', 'knowledge'),
      skill('Gang Territories', 3, 'intelligence', 'knowledge'),
      skill('Protection Rackets', 3, 'intelligence', 'knowledge'),
      skill('Urban Brawl', 3, 'intelligence', 'knowledge'),
      armor('Armor Jacket', 5, 3),
      gear('Colt America L36'),
      gear('Switchblade'),
      gear('Banged-up Suzuki Aurora'),
    ],
  },
  {
    ...baseActor('Joygirl', 51, {
      metatype: 'ork', pr: 1, karma: 1,
      body: 6, quickness: 4, strength: 5, charisma: 3, intelligence: 3, willpower: 4,
      essence: 5.8,
    }),
    items: [
      skill('Etiquette', 2, 'charisma', 'active', 'Street 4'),
      skill('Negotiation', 3, 'charisma'),
      skill('Stealth', 3, 'quickness'),
      skill('Unarmed Combat', 2, 'quickness'),
      skill('Bunraku Parlors', 5, 'intelligence', 'knowledge'),
      skill('Fetishes', 5, 'intelligence', 'knowledge'),
      skill('Local Cops', 4, 'intelligence', 'knowledge'),
      skill('Psychology', 3, 'intelligence', 'knowledge'),
      skill('Seduction', 3, 'intelligence', 'knowledge'),
      skill('Sexual Techniques', 5, 'intelligence', 'knowledge'),
      cyberware('Cosmetic Cybereyes', 6 - 5.8),
      gear('Slinky Clothing'),
      gear('Sex Toys'),
      gear('Various Drugs / Chips'),
      gear('BTL-modified Simdeck'),
      gear('Portable Phone'),
    ],
  },

  // ── p.52 — Down and Dirty (cont.) ────────────────────────────────────────
  {
    ...baseActor('Squatter', 52, {
      metatype: 'dwarf', pr: 1, karma: 1,
      body: 4, quickness: 3, strength: 3, charisma: 3, intelligence: 4, willpower: 2,
      essence: 6,
    }),
    items: [
      skill('Athletics', 2, 'quickness'),
      skill('Car', 2, 'reaction', 'active', 'B/R 2'),
      skill('Electronics', 2, 'intelligence', 'active', 'B/R 2'),
      skill('Stealth', 3, 'quickness', 'active', 'Hiding 5, Sneaking 4'),
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Homebrewing', 3, 'intelligence', 'knowledge'),
      skill('Local Cops', 4, 'intelligence', 'knowledge'),
      skill('Panhandling', 4, 'intelligence', 'knowledge'),
      skill('Scrounge Locations', 6, 'intelligence', 'knowledge'),
      gear('Clothing (Random)'),
      gear('Objects Scrounged from Trash'),
      gear('Shopping Cart'),
    ],
  },
  {
    ...baseActor('Street Vendor', 52, {
      metatype: 'human', pr: 1, karma: 1,
      body: 3, quickness: 3, strength: 3, charisma: 2, intelligence: 3, willpower: 2,
      essence: 6,
    }),
    items: [
      skill('Negotiation', 2, 'charisma', 'active', 'Bargaining 4'),
      skill('Pistol', 2, 'quickness'),
      skill('Stealth', 3, 'quickness'),
      skill('Current Events', 3, 'intelligence', 'knowledge'),
      skill('Fencing', 3, 'intelligence', 'knowledge'),
      skill('Gang Territories', 2, 'intelligence', 'knowledge'),
      skill('Local Gossip', 4, 'intelligence', 'knowledge'),
      skill('Neighborhood', 4, 'intelligence', 'knowledge'),
      gear('Ceska V2120'),
      gear('Pushcart with Wares'),
    ],
  },
  {
    ...baseActor('Ghoul (Human Ghoul)', 52, {
      metatype: 'human', pr: 2, karma: 1,
      body: 4, quickness: 3, strength: 4, charisma: 1, intelligence: 3, willpower: 2,
      essence: 1, // 5Z printed in Essence column — Z (Zero-lethal/irrelevant to cyberware) not modeled; recorded verbatim in notes
    }),
    items: [
      skill('Athletics', 3, 'quickness'),
      skill('Aura Reading', 4, 'intelligence'),
      skill('Intimidation', 4, 'charisma'),
      skill('Stealth', 4, 'quickness', 'active', 'Hiding 7'),
      skill('Unarmed Combat', 5, 'quickness'),
      skill('Gang Territories', 4, 'intelligence', 'knowledge'),
      skill('Ghoul Society', 4, 'intelligence', 'knowledge'),
      skill('Local Hideouts', 5, 'intelligence', 'knowledge'),
      skill('Scrounge', 5, 'intelligence', 'knowledge'),
      skill('Sewers', 3, 'intelligence', 'knowledge'),
      skill('Spices & Seasonings', 3, 'intelligence', 'knowledge'),
      skill('Tamanous', 2, 'intelligence', 'knowledge'),
      gear('Serrated Knife'),
      gear('Various Items Scrounged or Scavenged'),
    ],
  },

  // ── p.53 — Crime, Inc: The Underworld ────────────────────────────────────
  {
    ...baseActor('Yakuza Elder', 53, {
      metatype: 'human', pr: 3, karma: 10,
      body: 3, quickness: 2, strength: 3, charisma: 6, intelligence: 5, willpower: 5,
      essence: 6,
    }),
    items: [
      skill('Edged Weapons', 4, 'quickness', 'active', 'Katana 6'),
      skill('Etiquette', 5, 'charisma', 'active', 'Corporate 5, Japanese 8, Yakuza 9'),
      skill('Leadership', 6, 'charisma'),
      skill('Negotiation', 6, 'charisma', 'active', 'Bargaining 8'),
      skill('Unarmed Combat', 3, 'quickness'),
      skill('Acupuncture', 4, 'intelligence', 'knowledge'),
      skill('Anatomy', 5, 'intelligence', 'knowledge'),
      skill('Calligraphy', 3, 'intelligence', 'knowledge'),
      skill('English', 4, 'intelligence', 'language'),
      skill('Japanese', 6, 'intelligence', 'language'),
      skill('Japanese Cuisine', 5, 'intelligence', 'knowledge'),
      skill('Japanese History', 6, 'intelligence', 'knowledge'),
      skill('Organized Crime Rumor Mill', 8, 'intelligence', 'knowledge'),
      skill('Yakuza Clans', 8, 'intelligence', 'knowledge'),
      skill('Yakuza History', 7, 'intelligence', 'knowledge'),
      gear('Ceremonial Katana (traditional Japanese clothing style)'),
      gear('Mitsubishi Nightsky'),
    ],
  },
  {
    ...baseActor('Ambitious Mafia Lieutenant', 53, {
      metatype: 'human', pr: 3, karma: 6,
      body: 6, quickness: 4, strength: 5, charisma: 4, intelligence: 4, willpower: 5,
      essence: 1.5,
    }),
    items: [
      skill('Etiquette', 4, 'charisma', 'active', 'Mafia 6, Street 5'),
      skill('Interrogation', 4, 'charisma', 'active', 'Torture 6'),
      skill('Intimidation', 5, 'charisma'),
      skill('Pistol', 5, 'quickness'),
      skill('Shotgun', 3, 'quickness'),
      skill('Unarmed Combat', 5, 'quickness'),
      skill('Catholicism', 5, 'intelligence', 'knowledge'),
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Gambling', 4, 'intelligence', 'knowledge'),
      skill('Italian', 5, 'intelligence', 'language'),
      skill('Mafia', 6, 'intelligence', 'knowledge'),
      skill('Opera', 3, 'intelligence', 'knowledge'),
      skill('Organized Crime Rumor Mill', 5, 'intelligence', 'knowledge'),
      skill('Syndicate Operations', 6, 'intelligence', 'knowledge'),
      cyberware('Boosted Reflexes 3, Cybereyes (Low Light, Thermographic), Muscle Replacement 1, Smartlink 2', 6 - 1.5),
      armor('Armor Jacket', 5, 3),
      gear('HK-227S'),
      gear('Savalette Guardian'),
      gear('Enfield AS-7'),
      gear('Tailored Clothing'),
      gear('Pocket Secretary'),
      gear('Toyota Elite'),
    ],
  },

  // ── p.54 — Crime, Inc (cont.) ────────────────────────────────────────────
  {
    ...baseActor('Triad Member', 54, {
      metatype: 'ork', pr: 4, karma: 2,
      body: 5, quickness: 6, strength: 6, charisma: 3, intelligence: 3, willpower: 3,
      magic: 6,
    }),
    items: [
      skill('Athletics', 6, 'quickness'),
      skill('Bike', 4, 'reaction'),
      skill('Edged Weapons', 5, 'quickness'),
      skill('Etiquette', 3, 'charisma', 'active', 'Triad 5'),
      skill('Polearms/Staffs', 5, 'quickness'),
      skill('Stealth', 5, 'quickness'),
      skill('Throwing', 4, 'quickness'),
      skill('Unarmed Combat', 6, 'quickness'),
      skill('Chinese', 5, 'intelligence', 'language'),
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Gambling', 5, 'intelligence', 'knowledge'),
      skill('Painting', 4, 'intelligence', 'knowledge'),
      skill('Triad Politics', 4, 'intelligence', 'knowledge'),
      skill('Triad Signs', 4, 'intelligence', 'knowledge'),
      adeptpower('Great Leap', true, 2),
      adeptpower('Improved Physical Attribute (Quickness)'),
      adeptpower('Improved Reflexes', true, 1),
      adeptpower('Killing Hands'),
      adeptpower('Mystic Armor', true, 3),
      armor('Form-fit Armor (Full Suit)', 4, 1),
      gear('Staff'),
      gear('Sword (Weapon Focus 2)'),
      gear('Earplug Phone'),
      gear('Suzuki Aurora'),
    ],
  },
  {
    ...baseActor('Family Member', 54, {
      metatype: 'human', pr: 1, karma: 1,
      body: 2, quickness: 3, strength: 2, charisma: 4, intelligence: 3, willpower: 4,
      essence: 6,
    }),
    items: [
      skill('Etiquette', 2, 'charisma', 'active', 'Relevant Mob 3'),
      skill('Pistol', 2, 'quickness'),
      skill('Unarmed Combat', 2, 'quickness'),
      skill('[Relevant Mob]', 4, 'intelligence', 'knowledge'),
      skill('[Any Two Hobbies]', 3, 'intelligence', 'knowledge'),
      skill('Gambling', 3, 'intelligence', 'knowledge'),
      skill('Mob Territories', 3, 'intelligence', 'knowledge'),
      gear('Colt America L36'),
      gear('Wristphone'),
      gear('Palmtop Computer'),
    ],
  },

  // ── p.55 — Crime, Inc (cont.) ────────────────────────────────────────────
  {
    ...baseActor('Bookie', 55, {
      metatype: 'dwarf', pr: 2, karma: 2,
      body: 4, quickness: 3, strength: 4, charisma: 4, intelligence: 4, willpower: 3,
      essence: 4.8,
    }),
    items: [
      skill('Computer', 3, 'intelligence'),
      skill('Electronics', 2, 'intelligence'),
      skill('Etiquette', 2, 'charisma', 'active', 'Street 4'),
      skill('Negotiation', 4, 'charisma', 'active', 'Fast Talk 5'),
      skill('Current Events', 4, 'intelligence', 'knowledge'),
      skill('Entertainment Industry', 3, 'intelligence', 'knowledge'),
      skill('Gambling', 5, 'intelligence', 'knowledge'),
      skill('Local Crime Scene', 5, 'intelligence', 'knowledge'),
      skill('Mathematics', 3, 'intelligence', 'knowledge', 'Oddsmaking 5'),
      skill('Professional Sports', 5, 'intelligence', 'knowledge'),
      skill('Rumor Mill', 6, 'intelligence', 'knowledge'),
      cyberware('Datajack, Headware Memory [150 Mp], Headware Telephone', 6 - 4.8),
      armor('Armor Jacket', 5, 3),
      gear('Predator 2'),
      gear('Pocket Secretary (with betting information)'),
    ],
  },
  {
    ...baseActor('Shark Lawyer', 55, {
      metatype: 'human', pr: 2, karma: 3,
      body: 3, quickness: 4, strength: 2, charisma: 6, intelligence: 5, willpower: 5,
      essence: 3.8,
    }),
    items: [
      skill('Etiquette', 3, 'charisma', 'active', 'Legal 6, Political 5'),
      skill('Interrogation', 4, 'charisma', 'active', 'Verbal 6'),
      skill('Negotiation', 6, 'charisma', 'active', 'Bargaining 7'),
      skill('Law', 6, 'intelligence', 'knowledge'),
      skill('Legal Loopholes', 8, 'intelligence', 'knowledge'),
      skill('Local Judges', 5, 'intelligence', 'knowledge'),
      skill('Local Politics', 6, 'intelligence', 'knowledge'),
      skill('Oration', 5, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Opticam), Datajack, Headware Memory [300 Mp], Headware Telephone', 6 - 3.8),
      gear('Tailored Clothing'),
      gear('Briefcase'),
      gear('Pocket Secretary'),
      gear('Chrysler-Nissan Sentra XI'),
    ],
  },

  // ── p.56 — Sinless in Seattle ─────────────────────────────────────────────
  {
    ...baseActor('High Stakes Negotiator', 56, {
      metatype: 'human', pr: 3, karma: 5,
      body: 3, quickness: 4, strength: 3, charisma: 6, intelligence: 5, willpower: 5,
      essence: 4.1,
    }),
    items: [
      skill('Car', 3, 'reaction'),
      skill('Computer', 4, 'intelligence'),
      skill('Etiquette', 6, 'charisma', 'active', 'Corporate 8, Street 5'),
      skill('Intimidation', 4, 'charisma'),
      skill('Negotiation', 5, 'charisma', 'active', 'Bargaining 7, Fast Talk 7'),
      skill('Antacids', 3, 'intelligence', 'knowledge'),
      skill('Corporate Law', 6, 'intelligence', 'knowledge'),
      skill('Corporate Politics', 7, 'intelligence', 'knowledge'),
      skill('Local Movers and Shakers', 7, 'intelligence', 'knowledge'),
      skill('Local Runners', 6, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Display Link, Low Light), Datajack, Headware Memory [300 Mp], Headware Telephone', 6 - 4.1),
      armor('Trés Chic Armored Clothing', 3, 0),
      gear('Platinum DocWagon Contract'),
      gear('Pocket Secretary'),
      gear('Armored Toyota Elite'),
    ],
  },
  {
    ...baseActor('Troll Street Dealer', 57, {
      metatype: 'troll', pr: 3, karma: 3,
      body: 8, quickness: 4, strength: 9, charisma: 3, intelligence: 3, willpower: 3,
      essence: 0.5,
    }),
    items: [
      skill('Assault Rifle', 6, 'quickness'),
      skill('Athletics', 5, 'quickness'),
      skill('Edged Weapons', 6, 'quickness'),
      skill('Etiquette', 4, 'charisma', 'active', 'Street 7'),
      skill('Interrogation', 6, 'charisma'),
      skill('Negotiation', 7, 'charisma'),
      skill('Appraisal', 6, 'intelligence', 'knowledge'),
      skill('City Speak', 5, 'intelligence', 'knowledge'),
      skill('Data Brokerage', 3, 'intelligence', 'knowledge'),
      skill('Fencing', 5, 'intelligence', 'knowledge'),
      skill('Goblin Rock', 5, 'intelligence', 'knowledge'),
      skill('Local Gangs', 5, 'intelligence', 'knowledge'),
      skill('Local Mafia Clans', 5, 'intelligence', 'knowledge'),
      skill('Rumor Mill', 7, 'intelligence', 'knowledge'),
      cyberware('Muscle Replacement 2, Smartlink 2, Wired Reflexes 1', 6 - 0.5),
      gear('FN HAR'),
      gear('Combat Axe'),
      gear('Pocket Secretary'),
      gear('Gaz-Willys Nomad'),
    ],
  },

  // ── p.57 — Sinless in Seattle (cont.) ────────────────────────────────────
  {
    ...baseActor('Talent Scout', 57, {
      metatype: 'elf', pr: 3, karma: 3,
      body: 3, quickness: 5, strength: 3, charisma: 5, intelligence: 5, willpower: 7,
      essence: 4.2,
    }),
    items: [
      skill('Computer', 5, 'intelligence'),
      skill('Etiquette', 3, 'charisma', 'active', 'Corp 6, Street 4'),
      skill('Leadership', 5, 'charisma'),
      skill('Negotiation', 6, 'charisma', 'active', 'Fast Talk 7, Bargaining 8'),
      skill('Pistol', 5, 'quickness'),
      skill('[3 Relevant Languages]', 4, 'intelligence', 'language'),
      skill('Evaluate Shadowrunner', 6, 'intelligence', 'knowledge'),
      skill('Psychology', 7, 'intelligence', 'knowledge'),
      skill('Rumor Mill', 7, 'intelligence', 'knowledge'),
      skill('Runner Hangouts', 4, 'intelligence', 'knowledge'),
      cyberware('Headware Memory [300 Mp], Headware Telephone, Induction Datajack', 6 - 4.2),
      armor('Trés Chic Armored Clothing', 3, 0),
      gear('Ares Viper Silvergun'),
      gear('Palmtop Computer'),
      gear('Mitsubishi Nightsky'),
    ],
  },
  {
    ...baseActor('ID Manufacturer', 57, {
      metatype: 'dwarf', pr: 3, karma: 4,
      body: 4, quickness: 5, strength: 3, charisma: 4, intelligence: 4, willpower: 3,
      essence: 3.4,
    }),
    items: [
      skill('Computer', 5, 'intelligence', 'active', 'Decking 8, Hardware 9'),
      skill('Computer B/R', 8, 'intelligence'),
      skill('Electronics', 7, 'intelligence'),
      skill('Electronics B/R', 8, 'intelligence'),
      skill('Etiquette', 2, 'charisma', 'active', 'Matrix 6'),
      skill('Shotgun', 3, 'quickness'),
      skill('Stealth', 3, 'quickness', 'active', 'Sneaking 5, Theft 6'),
      skill('Data Archive Familiarity', 8, 'intelligence', 'knowledge'),
      skill('Data Brokerage', 4, 'intelligence', 'knowledge'),
      skill('Forgery', 8, 'intelligence', 'knowledge'),
      skill('Handwriting Analysis', 3, 'intelligence', 'knowledge'),
      skill('Holography', 5, 'intelligence', 'knowledge'),
      skill('Image Manipulation', 7, 'intelligence', 'knowledge'),
      skill('Photography', 4, 'intelligence', 'knowledge'),
      skill('Matrix Security Procedures', 4, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Opticam), Data Compactor 2, Datajack, Headware Memory [300 Mp], Headware Radio', 6 - 3.4),
      gear('Transys Highlander'),
      gear('Various Cameras (hold and photo)'),
      gear('Printing Apparatus (including magnetic encoder)'),
      gear('Credstick Reader/Writer'),
      gear('Chip Burner'),
      gear('Supply of Real and Fake IDs from Various Places'),
    ],
  },

  // ── p.58 — Sinless in Seattle (cont.) ─────────────────────────────────────
  {
    ...baseActor('Gunsmith', 58, {
      metatype: 'human', pr: 3, karma: 3,
      body: 4, quickness: 4, strength: 4, charisma: 3, intelligence: 3, willpower: 4,
      essence: 6,
      reflex: wired(1),
    }),
    items: [
      skill('Computer B/R', 3, 'intelligence'),
      skill('Electronics B/R', 4, 'intelligence'),
      skill('Heavy Weapons', 3, 'quickness'),
      skill('Gunnery', 4, 'reaction'),
      skill('Negotiation', 3, 'charisma'),
      skill('Pistols', 4, 'quickness'),
      skill('Pistols B/R', 8, 'quickness'),
      skill('Rifles B/R', 8, 'quickness'),
      skill('Submachine Guns', 4, 'quickness'),
      skill('Submachine Guns B/R', 5, 'quickness'),
      skill('Ammo Packing', 5, 'intelligence', 'knowledge'),
      skill('Firearms', 8, 'intelligence', 'knowledge'),
      skill('Gun Law', 5, 'intelligence', 'knowledge'),
      skill('Gunsmithing', 8, 'intelligence', 'knowledge'),
      skill('Old Westerns', 3, 'intelligence', 'knowledge'),
      skill('Physics', 3, 'intelligence', 'knowledge', 'Ballistics 6'),
      skill('Weapon History', 4, 'intelligence', 'knowledge', 'Firearms 6'),
      cyberware('Cyberears (Select Sound Filter 5, Sound Dampener), Cybereyes (Display Link, Electronic Magnification 3, Low Light), Smartlink 2, Wired Reflexes 1', 0),
      armor('Armor Jacket', 5, 3),
      gear('Gunsmith Shop'),
      gear('Various Working and Nonworking Firearms'),
      gear('Cleaning Supplies'),
      gear('Firearms Accessories (scopes, barrels, etc.)'),
      gear('NRA Hat'),
    ],
  },
  {
    ...baseActor('Fence', 58, {
      metatype: 'ork', pr: 2, karma: 3,
      body: 7, quickness: 3, strength: 6, charisma: 4, intelligence: 4, willpower: 3,
      essence: 5.7,
    }),
    items: [
      skill('Etiquette', 3, 'charisma', 'active', 'Street 5'),
      skill('Interrogation', 4, 'charisma'),
      skill('Negotiation', 5, 'charisma', 'active', 'Bargain 8, Fast Talk 6'),
      skill('Shotguns', 4, 'quickness'),
      skill('Appraisal', 6, 'intelligence', 'knowledge', 'Chosen Specialty 8'),
      skill('Art', 7, 'intelligence', 'knowledge'),
      skill('Black Market', 6, 'intelligence', 'knowledge'),
      skill('City Knowledge', 4, 'intelligence', 'knowledge'),
      skill('Law', 4, 'intelligence', 'knowledge'),
      skill('Mainstream Markets', 6, 'intelligence', 'knowledge'),
      skill('Smugglers', 5, 'intelligence', 'knowledge'),
      skill('State of the Art Technology', 3, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Opticam, Electronic Visual Magnification 3)', 6 - 5.7),
      armor('Armored Jacket', 5, 3),
      gear('Defiance T-250'),
      gear("Jeweler's Loupe"),
      gear('Pocket Secretary'),
      gear('Various Credsticks'),
    ],
  },

  // ── p.59 — Workin' the Mojo ──────────────────────────────────────────────
  {
    ...baseActor('Lorekeeper', 59, {
      metatype: 'elf', pr: 2, karma: 4,
      body: 2, quickness: 5, strength: 2, charisma: 6, intelligence: 5, willpower: 6,
      magic: 8,
    }),
    items: [
      skill('Aura Reading', 4, 'intelligence'),
      skill('Conjuring', 5, 'willpower'),
      skill('Etiquette', 4, 'charisma', 'active', 'Magical 5'),
      skill('Instruction', 5, 'charisma', 'active', 'Magic 6'),
      skill('Sorcery', 6, 'willpower'),
      skill('[2 Ancient Languages]', 4, 'intelligence', 'language'),
      skill('Archaeology', 4, 'intelligence', 'knowledge'),
      skill('Anthropology', 5, 'intelligence', 'knowledge'),
      skill('Magic Background', 5, 'intelligence', 'knowledge'),
      skill('Magic Theory', 6, 'intelligence', 'knowledge'),
      skill('Metaplanes', 5, 'intelligence', 'knowledge'),
      skill('Spell Design', 5, 'intelligence', 'knowledge'),
      skill('Talismongering', 3, 'intelligence', 'knowledge'),
      gear('Metamagic [Initiate Grade 2]: Centering (Ancient Languages), Masking'),
      spell('Analyze Magic (F4)'),
      spell('Catalog (F5)'),
      spell('Clairaudience (F5)'),
      spell('Clairvoyance (F4)'),
      spell('Detect Magic (F6)'),
      spell('Magic Fingers (F4)'),
      spell('Silence (F4)'),
      gear('Various Magical Scrolls, Tomes and Writings'),
      gear('Hermetic Library/Shamanic Lodge/Hounfour (Rating 8)'),
    ],
  },
  {
    ...baseActor('Antiquities and Oddities Dealer', 59, {
      metatype: 'dwarf', pr: 4, karma: 6,
      body: 3, quickness: 4, strength: 3, charisma: 6, intelligence: 6, willpower: 3,
      magic: 9,
    }),
    items: [
      skill('Athletics', 4, 'quickness'),
      skill('Aura Reading', 6, 'intelligence'),
      skill('Conjuring', 4, 'willpower'),
      skill('Etiquette', 4, 'charisma'),
      skill('Negotiation', 4, 'charisma', 'active', 'Bargain 6'),
      skill('Pistols', 3, 'quickness'),
      skill('Sorcery', 5, 'willpower', 'active', 'Spellcasting 7'),
      skill('Appraisal', 3, 'intelligence', 'knowledge', 'Magic Artifacts 6'),
      skill('Archaeology', 7, 'intelligence', 'knowledge'),
      skill('Anthropology', 5, 'intelligence', 'knowledge'),
      skill('Greek', 4, 'intelligence', 'language'),
      skill('Latin', 6, 'intelligence', 'language'),
      skill('Mythology', 5, 'intelligence', 'knowledge'),
      skill('Parazoology', 4, 'intelligence', 'knowledge'),
      skill('Talismongering', 4, 'intelligence', 'knowledge', 'Talismongering 6'),
      gear('Metamagic [Initiate Grade 3]: Divining, Masking, Shielding'),
      spell('Analyze Truth (F5)'),
      spell('Antidote (F4)'),
      spell('Calm Pack (F6)'),
      spell('Detect Magic (F6)'),
      spell('Improved Invisibility (F5)'),
      spell('Levitate (F5)'),
      spell('Powerbolt (F4)'),
      spell('Stunball (F4)'),
      spell('Translate (F6)'),
      spell('Treat (F3)'),
      gear('Various Weird Magical Artifacts of Varying Power Levels'),
      gear('Browning Max-Power'),
      gear('Specific Spell Focus (Invisibility)'),
    ],
  },

  // ── p.60 — Workin' the Mojo (cont.) ──────────────────────────────────────
  {
    ...baseActor('Artificer/Enchanter', 60, {
      metatype: 'human', pr: 2, karma: 6,
      body: 4, quickness: 3, strength: 3, charisma: 5, intelligence: 6, willpower: 4,
      magic: 7,
    }),
    items: [
      skill('Aura Reading', 4, 'intelligence'),
      skill('Conjuring', 5, 'willpower', 'active', 'Artificing 8'),
      skill('Enchanting', 6, 'intelligence', 'active', 'Enchanting 7'),
      skill('Instruction', 4, 'charisma', 'active', 'Enchanting 7'),
      skill('Negotiation', 4, 'charisma'),
      skill('Sorcery', 6, 'willpower'),
      skill('Appraisal', 4, 'intelligence', 'knowledge', 'Magic Item 7'),
      skill('Chemistry', 5, 'intelligence', 'knowledge'),
      skill('Fantasy Sims', 4, 'intelligence', 'knowledge'),
      skill('Magical Theory', 4, 'intelligence', 'knowledge'),
      skill('Metallurgy', 5, 'intelligence', 'knowledge'),
      skill('Talismongering', 4, 'intelligence', 'knowledge'),
      skill('Woodworking', 4, 'intelligence', 'knowledge'),
      gear('Metamagic [Initiate Grade 1]: Anchoring'),
      spell('Alter Temperature (F6)'),
      spell('Analyze Device (F3)'),
      spell('Animate (F3)'),
      spell('Clean Air (F4)'),
      spell('Control Fire (F5)'),
      spell('Fix (F5)'),
      spell('Foreboding (F4)'),
      spell('Laser (F4)'),
      spell('Limited Armor (Heat) (F4)'),
      spell('Physical Barrier (F5)'),
      spell('Use Smithing (F6)'),
      gear('Enchanting Shop'),
      gear('Portable Enchanting Kit'),
      gear('Various Ingredients'),
      gear('Hermetic Library/Shamanic Lodge (Rating 6)'),
    ],
  },
  {
    ...baseActor('Talislegger', 60, {
      metatype: 'elf', pr: 2, karma: 4,
      body: 3, quickness: 5, strength: 3, charisma: 4, intelligence: 4, willpower: 5,
      magic: 7,
    }),
    items: [
      skill('Aura Reading', 3, 'intelligence'),
      skill('Conjuring', 5, 'willpower', 'active', 'Summoning 8'),
      skill('Enchanting', 4, 'intelligence', 'active', 'Alchemy 6'),
      skill('Negotiation', 4, 'charisma', 'active', 'Bargaining 6'),
      skill('Pistols', 4, 'quickness'),
      skill('Sorcery', 4, 'willpower'),
      skill('Archaeology', 3, 'intelligence', 'knowledge'),
      skill('Botany', 5, 'intelligence', 'knowledge'),
      skill('Law', 3, 'intelligence', 'knowledge'),
      skill('Lore Shops', 5, 'intelligence', 'knowledge'),
      skill('Magic Groups', 4, 'intelligence', 'knowledge'),
      skill('Magical Locations', 6, 'intelligence', 'knowledge'),
      skill('Magical Talismans', 7, 'intelligence', 'knowledge'),
      skill('Parazoology', 5, 'intelligence', 'knowledge'),
      skill('Smugglers', 4, 'intelligence', 'knowledge'),
      skill('Smuggling Routes', 4, 'intelligence', 'knowledge'),
      skill('Talismongering', 7, 'intelligence', 'knowledge'),
      gear('Metamagic [Initiate Grade 1]: Invoking'),
      spell('Clean Water (F4)'),
      spell('Create Food (F3)'),
      spell('Gecko Crawl (F5)'),
      spell('Detect Magic (F5)'),
      spell('Oxygenate (F3)'),
      spell('Physical Mask (F5)'),
      spell('Preserve (F5)'),
      spell('Shapechange (F4)'),
      spell('Shape Earth (F5)'),
      spell('Stunbolt (F4)'),
      armor('Armor Jacket', 5, 3),
      gear('Taser'),
      gear('Spirit Focus (Rating 3)'),
      gear('Medkit (Rating 3)'),
      gear('Survival Kit'),
      gear('Various Telesma and Fetishes'),
    ],
  },

  // ── p.61 — Workin' the Mojo (cont.) ──────────────────────────────────────
  {
    ...baseActor('Wiz Kid Ganger', 61, {
      metatype: 'human', pr: 3, karma: 2,
      body: 4, quickness: 4, strength: 4, charisma: 3, intelligence: 4, willpower: 3,
      magic: 7,
    }),
    items: [
      skill('Conjuring', 5, 'willpower', 'active', 'Combat 5'),
      skill('Etiquette', 2, 'charisma', 'active', 'Gang 4, Magic 4'),
      skill('Intimidation', 4, 'charisma'),
      skill('Pistols', 3, 'quickness'),
      skill('Sorcery', 4, 'willpower'),
      skill('Black Market', 4, 'intelligence', 'knowledge'),
      skill('City Knowledge', 4, 'intelligence', 'knowledge'),
      skill('Gang ID', 5, 'intelligence', 'knowledge'),
      skill('Gang Territories', 3, 'intelligence', 'knowledge'),
      skill('Local Hangouts', 4, 'intelligence', 'knowledge'),
      skill('Magic Background', 2, 'intelligence', 'knowledge'),
      skill('Matrix Games', 3, 'intelligence', 'knowledge'),
      spell('Chaotic World (F4)'),
      spell('Clout (F5)'),
      spell('Detect Enemies (F3)'),
      spell('Hot Potato (F3)'),
      spell('Increase Reflexes (+2) (F3)'),
      spell('Powerbolt (F4)'),
      spell('Treat (F4)'),
      armor('Armor Jacket', 5, 3),
      gear('Beretta Model 101T'),
      gear('Expendable Fetishes'),
      gear('Power Focus (Rating 1)'),
      gear('Spraypaint'),
    ],
  },
  {
    ...baseActor('Hermetic Academic', 61, {
      metatype: 'human', pr: 1, karma: 2,
      body: 3, quickness: 4, strength: 2, charisma: 6, intelligence: 6, willpower: 4,
      magic: 8,
    }),
    items: [
      skill('Aura Reading', 4, 'intelligence'),
      skill('Conjuring', 8, 'willpower', 'active', 'Academic 6, Magical 8'),
      skill('Instruction', 5, 'charisma', 'active', 'Magic 7'),
      skill('Sorcery', 6, 'willpower'),
      skill('Academic Politics', 6, 'intelligence', 'knowledge'),
      skill('History', 5, 'intelligence', 'knowledge'),
      skill('Library Research', 5, 'intelligence', 'knowledge'),
      skill('Magic Esoterica', 5, 'intelligence', 'knowledge'),
      skill('Magic Theory', 6, 'intelligence', 'knowledge'),
      gear('Metamagic [Initiate Grade 2]: Centering (Incantations), Psychometry'),
      spell('Alter Memory (F4)'),
      spell('Awaken (F3)'),
      spell('Compel Truth (F5)'),
      spell('Double Image (F4)'),
      spell('Glue (F4)'),
      spell('Levitate (F4)'),
      spell('Magic Fingers (F4)'),
      spell('Makeover (F3)'),
      spell('Phantasm (F5)'),
      spell('Thunderclap (F4)'),
      spell('Treat (F4)'),
      gear('Hermetic Library'),
      gear('Various Magical Tomes'),
    ],
  },

  // ── p.62 — To Serve and Protect ───────────────────────────────────────────
  {
    ...baseActor('Highway Patrol', 62, {
      metatype: 'human', pr: 3, karma: 3,
      body: 5, quickness: 4, strength: 6, charisma: 4, intelligence: 4, willpower: 3,
      essence: 0.2, reflex: boosted(1),
    }),
    items: [
      skill('Bike or Car', 6, 'reaction', 'active', 'Bike or Car B/R 3'),
      skill('Etiquette', 3, 'charisma', 'active', 'Police 5, Street 4'),
      skill('Pistols', 5, 'quickness'),
      skill('SMG', 5, 'quickness'),
      skill('Stealth', 3, 'quickness', 'active', 'Vehicle 5'),
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Go-Gangs', 5, 'intelligence', 'knowledge'),
      skill('Highways', 7, 'intelligence', 'knowledge'),
      skill('Law', 5, 'intelligence', 'knowledge'),
      skill('Police Procedure', 5, 'intelligence', 'knowledge'),
      skill('S&M Clubs', 4, 'intelligence', 'knowledge'),
      skill('Smuggler Routes', 3, 'intelligence', 'knowledge'),
      skill('Smuggler Tricks', 4, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Flare Compensation, Thermographic, Electronic Vision Magnification 3), Cyberlegs (Cyberholster in right leg), Smartlink 2, Vehicle Control Rig 2', 6 - 0.2),
      armor('Armor Vest with Plates', 4, 3),
      gear('Helmet', 1, 1),
      gear('HK227-S'),
      gear('Colt Manhunter'),
      gear('Stun Baton'),
      gear('Radio [Rating 6]'),
      gear('Jackstopper'),
      gear('Plastic Restraints'),
      gear('Mage Mask'),
      gear('Lone Star Honda 3220 Turbo'),
    ],
  },
  {
    ...baseActor('SWAT Team Member', 62, {
      metatype: 'ork', pr: 4, karma: 4,
      body: 6, quickness: 5, strength: 7, charisma: 4, intelligence: 5, willpower: 3,
      essence: 4.96,
    }),
    items: [
      skill('Athletics', 6, 'quickness'),
      skill('Clubs', 4, 'quickness'),
      skill('Demolitions', 2, 'intelligence'),
      skill('Leadership', 4, 'charisma'),
      skill('Pistols', 6, 'quickness'),
      skill('Rifles', 7, 'quickness'),
      skill('Small Unit Tactics', 6, 'intelligence'),
      skill('Stealth', 4, 'quickness', 'active', 'Sneaking 6'),
      skill('Unarmed Combat', 5, 'quickness'),
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Police Procedures', 5, 'intelligence', 'knowledge'),
      skill('Psychology', 4, 'intelligence', 'knowledge'),
      skill('Strip Clubs', 3, 'intelligence', 'knowledge'),
      skill('Tactics', 7, 'intelligence', 'knowledge'),
      cyberware('Cybereyes [Alphaware] (Electronic Vision Magnification 3, Low Light, Thermographic), Smartlink 2, Reaction Enhancers 2', 6 - 4.96),
      bioware('Synaptic Accelerator', 1),
      armor('Armor Vest with Plates', 4, 3),
      gear('Helmet', 1, 1),
      gear('Colt Manhunter'),
      gear('Ranger Arms SM-3'),
    ],
  },

  // ── p.63 — To Serve and Protect (cont.) ──────────────────────────────────
  {
    ...baseActor('Police Chief', 63, {
      metatype: 'human', pr: 3, karma: 4,
      body: 3, quickness: 3, strength: 3, charisma: 5, intelligence: 4, willpower: 4,
      essence: 3.75,
    }),
    items: [
      skill('Etiquette', 4, 'charisma', 'active', 'Media 6, Police 6'),
      skill('Interrogation', 4, 'charisma'),
      skill('Leadership', 5, 'charisma'),
      skill('Negotiation', 4, 'charisma', 'active', 'Bargaining 5'),
      skill('Pistols', 4, 'quickness'),
      skill('Administration', 5, 'intelligence', 'knowledge'),
      skill('All Night Diners', 5, 'intelligence', 'knowledge'),
      skill('Law', 5, 'intelligence', 'knowledge'),
      skill('Law Enforcement Agencies', 5, 'intelligence', 'knowledge'),
      skill('Organized Crime', 3, 'intelligence', 'knowledge'),
      skill('Police Procedures', 6, 'intelligence', 'knowledge'),
      skill('Psychology', 5, 'intelligence', 'knowledge'),
      skill('Rumor Mill', 4, 'intelligence', 'knowledge'),
      cyberware('Datajack, Headware Memory [150 Mp], Headware Radio 5, Smartlink 2', 6 - 3.75),
      armor('Lined Coat', 4, 2),
      gear('Ruger Super Warhawk'),
      gear('Pocket Secretary'),
      gear('Buick Park Avenue'),
    ],
  },
  {
    // Attribute/INIT header line for this entry falls at a page break in the
    // source and was not legible in the extracted scan — only the tail of its
    // block (Knowledge Skills onward) survived. Metatype/attributes left at
    // schema defaults; skills/cyberware/gear below are verbatim from source.
    ...baseActor('Metroplex Guardsman', 63, { metatype: 'elf', karma: null }),
    items: [
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Matrix Games', 3, 'intelligence', 'knowledge'),
      skill('Military Theory', 2, 'intelligence', 'knowledge'),
      skill('Tactics', 5, 'intelligence', 'knowledge'),
      cyberware('Cybereyes (Flare Compensation, Low-Light, Thermographic), Smartlink 2', 0),
      armor('Armor Jacket', 5, 3),
      gear('Ingram Smartgun'),
    ],
  },

  // ── p.64 — To Serve and Protect (cont.) ──────────────────────────────────
  {
    ...baseActor('Forensics Expert', 64, {
      metatype: 'elf', pr: 3, karma: 2,
      body: 3, quickness: 5, strength: 3, charisma: 4, intelligence: 5, willpower: 5,
    }),
    items: [
      skill('Biotech', 5, 'intelligence'),
      skill('Computer', 3, 'intelligence'),
      skill('Etiquette', 3, 'charisma', 'active', 'Police 4'),
      skill('Pistols', 3, 'quickness'),
      skill('Stealth', 3, 'quickness'),
      skill('Chemistry', 5, 'intelligence', 'knowledge'),
      skill('Classical Music', 3, 'intelligence', 'knowledge'),
      skill('Criminology', 5, 'intelligence', 'knowledge'),
      skill('Evidence Analysis', 5, 'intelligence', 'knowledge'),
      skill('Forensics', 6, 'intelligence', 'knowledge'),
      skill('Physics', 3, 'intelligence', 'knowledge', 'Ballistics 5'),
      skill('Police Procedures', 5, 'intelligence', 'knowledge'),
      armor('Armor Jacket', 5, 3),
      gear('Predator 2'),
      gear('Forensics Kit'),
      gear('Palmtop Computer'),
    ],
  },
  {
    ...baseActor('Prison Guard', 64, {
      metatype: 'ork', pr: 3, karma: 2,
      body: 7, quickness: 4, strength: 6, charisma: 3, intelligence: 3, willpower: 2,
      essence: 6,
    }),
    items: [
      skill('Clubs', 4, 'quickness'),
      skill('Etiquette', 2, 'charisma', 'active', 'Police 4, Street 4'),
      skill('Intimidation', 4, 'charisma'),
      skill('Pistols', 4, 'quickness'),
      skill('Unarmed Combat', 5, 'quickness'),
      skill('Contraband', 4, 'intelligence', 'knowledge'),
      skill('Penology', 3, 'intelligence', 'knowledge'),
      skill('Police Procedure', 3, 'intelligence', 'knowledge'),
      skill('Prison Populations', 6, 'intelligence', 'knowledge'),
      skill('Psychology', 4, 'intelligence', 'knowledge', 'Prison 6'),
      skill('Tattoos', 4, 'intelligence', 'knowledge'),
      armor('Armor Jacket', 5, 3),
      gear('Browning Max-Power'),
      gear('Stun Baton'),
    ],
  },

  // ── p.65 — Essential Services: Workers ───────────────────────────────────
  {
    ...baseActor('DocWagon Paramedic', 65, {
      metatype: 'human', pr: 3, karma: 2,
      body: 5, quickness: 5, strength: 4, charisma: 4, intelligence: 4, willpower: 3,
      essence: 4.55,
    }),
    items: [
      skill('Athletics', 2, 'quickness'),
      skill('Biotech', 5, 'intelligence', 'active', 'First Aid 7'),
      skill('Car', 5, 'reaction'),
      skill('Etiquette', 3, 'charisma', 'active', 'Street 4'),
      skill('Pistol', 2, 'quickness'),
      skill('Anatomy', 4, 'intelligence', 'knowledge'),
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Medicine', 3, 'intelligence', 'knowledge'),
      skill('Physiology', 3, 'intelligence', 'knowledge'),
      skill('Roleplaying Games', 3, 'intelligence', 'knowledge'),
      cyberware('Boosted Reflexes 1, Cybereyes (Low Light, Thermographic), Headware Radio 5', 6 - 4.55),
      armor('Armor Jacket', 5, 3),
      gear('Medkit', 5),
      gear('Slap Patches'),
    ],
  },
  {
    ...baseActor('Elite Black Clinic Cybersurgeon', 65, {
      metatype: 'elf', pr: 2, karma: 4,
      body: 3, quickness: 7, strength: 3, charisma: 6, intelligence: 5, willpower: 5,
      essence: 5.16,
    }),
    items: [
      skill('Biotech', 5, 'intelligence', 'active', 'Cybertechnology Implantation 10, Surgery 9, Transimplant Surgery 9'),
      skill('Computer', 3, 'intelligence', 'active', 'Cybernetics 6'),
      skill('Etiquette', 4, 'charisma', 'active', 'Corporate 8, Medical 7'),
      skill('Instruction', 4, 'charisma', 'active', 'Medical Techniques 7'),
      skill('Anatomy', 5, 'intelligence', 'knowledge'),
      skill('Cybertechnology', 8, 'intelligence', 'knowledge'),
      skill('Fine Art', 5, 'intelligence', 'knowledge'),
      skill('Golf', 5, 'intelligence', 'knowledge'),
      skill('Medicine', 9, 'intelligence', 'knowledge'),
      skill('Nanotechnology', 6, 'intelligence', 'knowledge'),
      skill('Pharmacology', 7, 'intelligence', 'knowledge'),
      cyberware('Cybereyes [Betaware] (Image Link, Microscopic Vision), Datajack, Headware Memory [300 Mp]', 6 - 5.16),
      bioware('Cerebral Booster 1, Clean Metabolism, Mnemonic Enhancer 2', 1),
      gear('Tailored Clothing'),
      gear('Pocket Secretary'),
      gear('Truman Paradiso Simsense Deck'),
      gear('Eurocar Westwind'),
    ],
  },

  // ── p.66 — Essential Services: Workers (cont.) ───────────────────────────
  {
    ...baseActor('Paramed Shaman', 66, {
      metatype: 'dwarf', pr: 3, karma: 3,
      body: 4, quickness: 4, strength: 3, charisma: 7, intelligence: 4, willpower: 6,
      magic: 6,
    }),
    items: [
      skill('Aura Reading', 4, 'intelligence', 'active', 'Auras 6'),
      skill('Biotech', 5, 'intelligence', 'active', 'First Aid 7'),
      skill('Conjuring', 6, 'willpower'),
      skill('Etiquette', 3, 'charisma', 'active', 'Magical 5, Medical 5'),
      skill('Pistols', 2, 'quickness'),
      skill('Sorcery', 6, 'willpower', 'active', 'Magical Health 8'),
      skill('Anatomy', 4, 'intelligence', 'knowledge'),
      skill('Herbalism', 3, 'intelligence', 'knowledge', 'Healing Plants 5'),
      skill('Magic Background', 4, 'intelligence', 'knowledge'),
      skill('Medicine', 4, 'intelligence', 'knowledge'),
      skill('Pilates', 4, 'intelligence', 'knowledge'),
      spell('Control Emotion (F4)'),
      spell('Cure Disease (F4)'),
      spell('Detect Life (F4)'),
      spell('Detox (F2)'),
      spell('Diagnose (F5)'),
      spell('Hibernate (F3)'),
      spell('Mindlink (F3)'),
      spell('Oxygenate (F4)'),
      spell('Stabilize (F6)'),
      spell('Sterilize (F3)'),
      spell('Treat (F7)'),
      armor('Armor Jacket', 5, 3),
      gear('Taser'),
      gear('Medkit [Rating 5]'),
      gear('Expendable and Reusable Fetishes'),
      gear('Various Herbs'),
    ],
  },
  {
    ...baseActor('Firefighter', 66, {
      metatype: 'ork', pr: 4, karma: 2,
      body: 7, quickness: 4, strength: 6, charisma: 3, intelligence: 4, willpower: 3,
      essence: 4.5,
    }),
    items: [
      skill('Athletics', 6, 'quickness'),
      skill('Biotech', 3, 'intelligence', 'active', 'First Aid 5'),
      skill('Car', 3, 'reaction', 'active', 'Fire Truck 5'),
      skill('Clubs', 4, 'quickness'),
      skill('Demolitions', 3, 'intelligence'),
      skill('Gunnery', 2, 'reaction', 'active', 'Water Cannon 4'),
      skill('Polearms/Staffs', 4, 'quickness'),
      skill('Spray Weapons', 3, 'quickness', 'active', 'Firehose 5'),
      skill('Unarmed Combat', 3, 'quickness'),
      skill('Card Games', 4, 'intelligence', 'knowledge'),
      skill('Disco', 3, 'intelligence', 'knowledge'),
      skill('Firefighting', 5, 'intelligence', 'knowledge'),
      skill('Local Bars', 4, 'intelligence', 'knowledge'),
      cyberware('Boosted Reflexes 1, Tracheal (Air) Filter 10', 6 - 4.5),
      gear('Fire-resistant Coat (6 Points Fire Resistance)'),
      gear('Fireaxe'),
      gear('Chip Player and Chips'),
      gear('Biomonitor'),
      gear('DocWagon Contract (Gold)'),
    ],
  },

  // ── p.67 — Essential Services: Workers (cont.) ───────────────────────────
  {
    ...baseActor('Dock Worker', 67, {
      metatype: 'troll', pr: 2, karma: null,
      body: 10, quickness: 4, strength: 10, charisma: 3, intelligence: 3, willpower: 2,
      essence: 6,
    }),
    items: [
      skill('Athletics', 3, 'quickness', 'active', 'Climbing 4'),
      skill('Car', 2, 'reaction'),
      skill('Computer', 2, 'intelligence'),
      skill('Electronics', 3, 'intelligence', 'active', 'Electronics B/R 4'),
      skill('Etiquette', 3, 'charisma'),
      skill('Pistols', 2, 'quickness'),
      skill('Unarmed Combat', 2, 'quickness'),
      skill('Card Games', 4, 'intelligence', 'knowledge'),
      skill('Disco', 3, 'intelligence', 'knowledge'),
      skill('Firefighting', 5, 'intelligence', 'knowledge'),
      skill('Local Bars', 4, 'intelligence', 'knowledge'),
      skill('Hard Liquor', 3, 'intelligence', 'knowledge'),
      skill('Maritime Lore', 3, 'intelligence', 'knowledge'),
      skill('Shipping Routes', 3, 'intelligence', 'knowledge'),
      skill('Smuggling', 4, 'intelligence', 'knowledge'),
      skill('Union Organizing', 2, 'intelligence', 'knowledge'),
      skill('Urban Brawl Teams', 4, 'intelligence', 'knowledge'),
      skill('Warehouse Practices', 5, 'intelligence', 'knowledge'),
      gear('Hard Hat'),
      gear('Forklift'),
      gear('Ford Americar'),
    ],
  },
  {
    ...baseActor('Taxi Driver', 67, {
      metatype: 'ork', pr: 2, karma: 3,
      body: 5, quickness: 4, strength: 6, charisma: 3, intelligence: 3, willpower: 3,
      essence: 6,
    }),
    items: [
      skill('Biotech', 1, 'intelligence', 'active', 'First Aid 3'),
      skill('Car', 6, 'reaction', 'active', 'Car B/R 3'),
      skill('Etiquette', 3, 'charisma', 'active', 'Street 5'),
      skill('Pistols', 3, 'quickness'),
      skill('City Knowledge', 6, 'intelligence', 'knowledge'),
      skill('Gang Territories', 4, 'intelligence', 'knowledge'),
      skill('Immigration Law', 3, 'intelligence', 'knowledge'),
      skill('Rumor Mill', 5, 'intelligence', 'knowledge'),
      skill('Short Cuts', 4, 'intelligence', 'knowledge'),
      gear('Snacks'),
      gear('Radio'),
      gear('Trid Chip Player and Chips'),
      gear('Biomonitor'),
      gear('Taxi Cab'),
    ],
  },
  {
    ...baseActor('City Services Worker', 67, {
      metatype: 'dwarf', pr: 2, karma: 2,
      body: 5, quickness: 3, strength: 4, charisma: 3, intelligence: 4, willpower: 2,
      essence: 6,
    }),
    items: [
      skill('Athletics', 2, 'quickness'),
      skill('Car', 2, 'reaction'),
      skill('Computer', 2, 'intelligence'),
      skill('Electronics', 3, 'intelligence', 'active', 'Electronics B/R 4'),
      skill('Etiquette', 3, 'charisma'),
      skill('Pistols', 2, 'quickness'),
      skill('Unarmed Combat', 2, 'quickness'),
      skill('[Specialty Skill (Electrical Systems, Sewers, etc.)]', 5, 'intelligence', 'knowledge'),
      skill('City Knowledge', 5, 'intelligence', 'knowledge'),
      skill('Combat Biker', 3, 'intelligence', 'knowledge'),
      skill('Gang Territories', 3, 'intelligence', 'knowledge'),
      skill('Horror Trids', 4, 'intelligence', 'knowledge'),
      gear('Taser'),
      gear('Survival Knife'),
      gear('Flashlight'),
      gear('Cheap Chemsuit'),
      gear('Medkit [Rating 3]'),
      gear('Radio [Rating 3]'),
      gear('Wristphone'),
      gear('Tool Belt and Tools'),
    ],
  },
];

// ── Populate loop ─────────────────────────────────────────────────────────────

const pack = game.packs.get(PACK_ID);
if (!pack) {
  ui.notifications.error(`SR3E: Compendium pack "${PACK_ID}" not found. Update system.json and fully restart Foundry first.`);
} else {

  const existing = await pack.getDocuments();
  let proceed = true;
  if (existing.length > 0) {
    proceed = false;
    await foundry.applications.api.DialogV2.wait({
      window: { title: "Mr. Johnson's Contacts — Already Populated" },
      content: `<p>The compendium already contains <strong>${existing.length}</strong> document(s).</p>
                <p>Re-running will create duplicates. Continue anyway?</p>`,
      buttons: [
        { label: 'Yes, create anyway', action: 'yes', default: false, callback: () => { proceed = true; } },
        { label: 'Cancel', action: 'cancel', default: true },
      ],
    });
  }

  if (proceed) {
    await pack.configure({ locked: false });

    let created = 0;
    for (const charData of CONTACTS) {
      try {
        const { items = [], ...actorData } = charData;
        const tmpActor = await Actor.create(actorData, { renderSheet: false });
        if (items.length) await tmpActor.createEmbeddedDocuments('Item', items);
        await pack.importDocument(tmpActor);
        await tmpActor.delete();
        created++;
      } catch (err) {
        console.error(`SR3E | Failed to create "${charData.name}":`, err);
        ui.notifications.warn(`SR3E: Failed to create "${charData.name}" — see console (F12) for details.`);
      }
    }

    await pack.configure({ locked: true });

    ui.notifications.info(
      created === CONTACTS.length
        ? `SR3E: ${created} contacts added to the compendium.`
        : `SR3E: ${created}/${CONTACTS.length} created — ${CONTACTS.length - created} failed (check console).`
    );
  }
}
