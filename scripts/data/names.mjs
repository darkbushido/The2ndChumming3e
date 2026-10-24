/**
 * NPC names · TODO 262 ("Meet the contact").
 *
 * Real-world names that fit the face, plus a chance of a street name (the maintainer, 2026-10-24:
 * "real-world names plus a chance for a street name"). `ethnicity` uses the portrait index's vocabulary
 * (East Asian, Black, white, Latino, South Asian, Native American, Middle Eastern, Pacific Islander,
 * mixed heritage), so a name matches the portrait it is offered with. With no portrait module the
 * caller passes none and a heritage is drawn at random.
 *
 * A heritage is a family of sub-pools (Japanese / Chinese / Korean / Vietnamese …); the first and last
 * name always come from the SAME sub-pool so they belong together. Elves sometimes take an elven given
 * name, built from syllables — invented, not taken from any book or other setting.
 *
 * ⚠ **Offer, never apply**: this only proposes; the dialog lets the GM reroll or type over it.
 *
 * Pure — no Foundry. Pass `rng` (a `() => [0,1)`) for repeatable results.
 */

const P = (female, male, last) => ({ female, male, last });

export const POOLS = {
  'East Asian': {
    japanese: P(['Aiko', 'Haruka', 'Yui', 'Mei', 'Sakura', 'Rin', 'Emi', 'Naomi', 'Keiko', 'Yoko'],
                ['Hiro', 'Kenji', 'Takeshi', 'Daisuke', 'Ren', 'Kaito', 'Shin', 'Akira', 'Yusuke', 'Taro'],
                ['Tanaka', 'Sato', 'Suzuki', 'Watanabe', 'Ito', 'Nakamura', 'Kobayashi', 'Yamamoto', 'Kato', 'Mori']),
    chinese:  P(['Mei Ling', 'Xiu', 'Lan', 'Hui', 'Jing', 'Yan', 'Li Na', 'Fang'],
                ['Wei', 'Jun', 'Hao', 'Ming', 'Feng', 'Lei', 'Bo', 'Chen'],
                ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Huang', 'Zhao', 'Wu', 'Lin', 'Chan']),
    korean:   P(['Ji-woo', 'Min-ji', 'Seo-yeon', 'Hye-jin', 'Eun-ji', 'Soo-ah'],
                ['Min-jun', 'Ji-hoon', 'Hyun-woo', 'Dong-hyun', 'Sung-min', 'Tae-yang'],
                ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Yoon', 'Han']),
    vietnamese: P(['Linh', 'Mai', 'Thao', 'Lan', 'Hoa', 'Trang'],
                  ['Minh', 'Duc', 'Tuan', 'Huy', 'Long', 'Bao'],
                  ['Nguyen', 'Tran', 'Le', 'Pham', 'Vo', 'Dang']),
  },
  'Black': {
    american: P(['Keisha', 'Aaliyah', 'Imani', 'Jasmine', 'Tanya', 'Monique', 'Danielle', 'Simone', 'Kendra', 'Nia'],
                ['Marcus', 'Darnell', 'Andre', 'Jamal', 'Terrence', 'Malik', 'Curtis', 'Devon', 'Reggie', 'Isaiah'],
                ['Washington', 'Jackson', 'Johnson', 'Brooks', 'Coleman', 'Freeman', 'Harris', 'Robinson', 'Booker', 'Banks']),
    african:  P(['Amara', 'Chioma', 'Ngozi', 'Abena', 'Zainab', 'Ifeoma'],
                ['Kwame', 'Chidi', 'Emeka', 'Kofi', 'Tunde', 'Obi'],
                ['Okafor', 'Mensah', 'Adeyemi', 'Okonkwo', 'Asante', 'Balogun']),
    caribbean: P(['Shanice', 'Marcia', 'Andrea', 'Claudette'],
                 ['Desmond', 'Winston', 'Delroy', 'Clive'],
                 ['Campbell', 'Thompson', 'Clarke', 'Grant', 'Francis']),
  },
  'white': {
    anglo:    P(['Sarah', 'Emily', 'Jessica', 'Megan', 'Rachel', 'Karen', 'Laura', 'Amanda', 'Holly', 'Beth'],
                ['Michael', 'David', 'James', 'Chris', 'Matt', 'Brian', 'Kevin', 'Scott', 'Jason', 'Tom'],
                ['Smith', 'Miller', 'Taylor', 'Anderson', 'Walker', 'Collins', 'Parker', 'Reed', 'Hughes', 'Ward']),
    irish:    P(['Siobhan', 'Maeve', 'Erin', 'Nora', 'Bridget'],
                ['Liam', 'Sean', 'Declan', 'Connor', 'Patrick'],
                ["O'Brien", 'Murphy', 'Kelly', 'Doyle', 'Brennan', 'Quinn']),
    german:   P(['Greta', 'Heidi', 'Ingrid', 'Katrin'],
                ['Klaus', 'Dieter', 'Lukas', 'Jurgen'],
                ['Schmidt', 'Muller', 'Becker', 'Hoffmann', 'Krause', 'Vogel']),
    slavic:   P(['Natasha', 'Irina', 'Katya', 'Olga', 'Anya'],
                ['Dmitri', 'Ivan', 'Pavel', 'Sergei', 'Nikolai'],
                ['Ivanov', 'Petrov', 'Kowalski', 'Novak', 'Volkov', 'Sokolov']),
    italian:  P(['Gina', 'Maria', 'Francesca', 'Lucia'],
                ['Tony', 'Sal', 'Marco', 'Vincent'],
                ['Russo', 'Romano', 'Esposito', 'Ricci', 'Moretti', 'Lombardi']),
  },
  'Latino': {
    latino:   P(['Maria', 'Sofia', 'Carmen', 'Lucia', 'Isabel', 'Rosa', 'Valeria', 'Gabriela', 'Ana', 'Elena'],
                ['Carlos', 'Miguel', 'Luis', 'Javier', 'Diego', 'Jose', 'Mateo', 'Rafael', 'Hector', 'Alejandro'],
                ['Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Delgado', 'Ramirez', 'Torres', 'Morales']),
  },
  'South Asian': {
    indian:   P(['Priya', 'Anjali', 'Divya', 'Neha', 'Kavya', 'Pooja', 'Sunita', 'Meera'],
                ['Raj', 'Arjun', 'Vikram', 'Sanjay', 'Rohan', 'Amit', 'Ravi', 'Dev'],
                ['Patel', 'Sharma', 'Singh', 'Gupta', 'Iyer', 'Reddy', 'Kapoor', 'Nair']),
    pakistani: P(['Ayesha', 'Fatima', 'Sana', 'Hira'],
                 ['Imran', 'Bilal', 'Faisal', 'Usman'],
                 ['Khan', 'Qureshi', 'Malik', 'Chaudhry']),
  },
  'Native American': {
    salish:   P(['Sky', 'Winona', 'Sarah', 'Leah', 'Dana', 'Marie', 'Cheyenne', 'Rosalie'],
                ['Joseph', 'Daniel', 'Kele', 'Tyee', 'Robert', 'Elan', 'Raymond', 'Peter'],
                ['George', 'Jack', 'Charlie', 'Sampson', 'Joe', 'Paul', 'Thomas', 'Swan']),
    dine:     P(['Shandiin', 'Doli', 'Nizhoni', 'Kai'],
                ['Ahiga', 'Leonard', 'Kee', 'Nathan'],
                ['Begay', 'Yazzie', 'Tsosie', 'Benally', 'Nez', 'Tso']),
  },
  'Middle Eastern': {
    arab:     P(['Layla', 'Amira', 'Noor', 'Yasmin', 'Rania', 'Salma'],
                ['Omar', 'Karim', 'Tariq', 'Samir', 'Hassan', 'Yusuf'],
                ['Haddad', 'Nasser', 'Mansour', 'Khoury', 'Saleh', 'Aziz']),
    persian:  P(['Shirin', 'Leila', 'Parisa', 'Mina'],
                ['Dariush', 'Reza', 'Kian', 'Arash'],
                ['Tehrani', 'Karimi', 'Rahimi', 'Hosseini']),
  },
  'Pacific Islander': {
    hawaiian: P(['Leilani', 'Malia', 'Kalena', 'Noelani'],
                ['Kai', 'Keoni', 'Makoa', 'Kekoa'],
                ['Kahananui', 'Akana', 'Kealoha', 'Palakiko']),
    samoan:   P(['Sina', 'Lagi', 'Mele', 'Talia'],
                ['Tavita', 'Sione', 'Losa', 'Manu'],
                ['Faleolo', 'Tuilagi', 'Leiataua', 'Sapolu']),
    filipino: P(['Maricel', 'Jasmin', 'Rowena', 'Grace'],
                ['Jun', 'Rodel', 'Paolo', 'Ramon'],
                ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Dela Cruz']),
  },
};

export const ETHNICITIES = Object.keys(POOLS);   // plus 'mixed heritage', which draws from all of them

// Street names: general, then flavoured by metatype. Kept to the Sixth World's street register.
export const STREET = {
  any: ['Slick', 'Chrome', 'Ghost', 'Jinx', 'Rook', 'Patch', 'Lucky', 'Static', 'Ratchet', 'Doc', 'Hex', 'Switch',
        'Nails', 'Sparky', 'Mouse', 'Deuce', 'Tank', 'Cinder', 'Glitch', 'Razor', 'Smiley', 'Wheels', 'Bones', 'Lefty',
        'Spook', 'Juice', 'Shiv', 'Neon', 'Kicks', 'Two-Bit', 'Scratch', 'Dutch', 'Fuse', 'Blue', 'Preacher', 'Haul',
        'Tick', 'Socket', 'Ash', 'Coins', 'Pockets', 'Stitch', 'Mojo', 'Vapor', 'Cuffs', 'Moxie'],
  ork:   ['Tusk', 'Hambone', 'Gristle', 'Crusher', 'Grunt', 'Snag', 'Chomp', 'Mudhole'],
  troll: ['Rocks', 'Moose', 'Brick', 'Tiny', 'Boulder', 'Horns', 'Wall', 'Slab'],
  elf:   ['Silk', 'Whisper', 'Sliver', 'Willow', 'Pointy', 'Glass', 'Velvet'],
  dwarf: ['Stubs', 'Anvil', 'Pint', 'Shorty', 'Bolt', 'Tinker', 'Keg'],
};

// How often a street name is offered, by the portrait job's group.
export const STREET_CHANCE = { underworld: 0.6, kids: 0.3, civilian: 0.25, law_security: 0.15, default: 0.3 };
export const ELVEN_CHANCE = 0.35;

const ELVEN = {
  start:  ['Ae', 'Cae', 'Ei', 'Fae', 'Il', 'Lia', 'Mae', 'Nae', 'Rho', 'Sae', 'Thae', 'Vae', 'Yrr', 'Ael'],
  female: ['lith', 'wen', 'riel', 'nna', 'siel', 'dra', 'vie', 'shal', 'ria'],
  male:   ['lan', 'ric', 'dor', 'vas', 'thel', 'ran', 'mir', 'sar', 'dain'],
};

const pick = (list, rng) => list[Math.floor(rng() * list.length) % list.length];

export class Names {
  /** The sub-pool a heritage draws from (`mixed heritage` / unknown: any). */
  static subPool(ethnicity, rng = Math.random) {
    const family = POOLS[ethnicity] ?? POOLS[pick(ETHNICITIES, rng)];
    return family[pick(Object.keys(family), rng)];
  }

  static elvenGiven(gender, rng = Math.random) {
    return pick(ELVEN.start, rng) + pick(ELVEN[gender === 'female' ? 'female' : 'male'], rng);
  }

  static streetName(metatype, rng = Math.random) {
    const flavour = STREET[metatype] ?? [];
    return flavour.length && rng() < 0.4 ? pick(flavour, rng) : pick(STREET.any, rng);
  }

  /**
   * Propose a name.
   * @param {{ethnicity?, gender?, metatype?, group?, streetChance?, rng?}} o
   * @returns {{first, last, street: string|null, full}}
   */
  static generate({ ethnicity = null, gender = null, metatype = 'human', group = null, streetChance = null, rng = Math.random } = {}) {
    const g = gender === 'female' || gender === 'male' ? gender : (rng() < 0.5 ? 'female' : 'male');
    const pool = Names.subPool(ethnicity, rng);
    const base = ['elf', 'night-one'].includes(metatype) ? 'elf' : metatype;
    const first = base === 'elf' && rng() < ELVEN_CHANCE ? Names.elvenGiven(g, rng) : pick(pool[g], rng);
    const last = pick(pool.last, rng);
    const chance = streetChance ?? STREET_CHANCE[group] ?? STREET_CHANCE.default;
    const street = rng() < chance ? Names.streetName(base, rng) : null;
    return { first, last, street, full: Names.format(first, last, street) };
  }

  static format(first, last, street) {
    return street ? `${first} "${street}" ${last}` : `${first} ${last}`;
  }
}
