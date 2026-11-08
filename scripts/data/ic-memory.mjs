/** The Defragged IC Memory table — MDF pp.25, 33, 40-44 · TODO 128. Pure, no Foundry. Pinned to the `sr3e-mdf-ic` pack by test. */

/**
 * Every Defragged agent/IC the book prints, with its grading and Final Multiplier — MDF pp.40-44 (each stat block;
 * read from the page images, the two-column text layer interleaves). An agent's Mp Size is **Rating² × Final
 * Multiplier** (MDF p.40 "can be used to determine the agent's Mp Size", PROGRAM SIZE TABLE p.33). The
 * `sr3e-mdf-ic` pack stocks each at Rating 6, so its `memoryRequired` is 36 × the multiplier.
 * ⚠ matrix.md used to list Crippler/Gemini/Tracker as Gray, Killer as Black and Sparky as Gray; the stat blocks say
 * White, White, White, Gray and Black.
 */
export const AGENT_IC = {
  'ARis':          { grading: 'White', multiplier: 3,  page: 40 },
  'Authenticator': { grading: 'White', multiplier: 7,  page: 40 },
  'Blaster':       { grading: 'Gray',  multiplier: 7,  page: 41 },
  'Crippler':      { grading: 'White', multiplier: 4,  page: 41 },
  'Dataworm':      { grading: 'Gray',  multiplier: 10, page: 41 },
  'Gemini':        { grading: 'White', multiplier: 6,  page: 42 },
  'Hydra':         { grading: 'Gray',  multiplier: 12, page: 42 },
  'Killer':        { grading: 'Gray',  multiplier: 8,  page: 42 },
  'Looper':        { grading: 'White', multiplier: 10, page: 43 },
  'Mr. Medkit':    { grading: 'White', multiplier: 6,  page: 43 },
  'Ripper':        { grading: 'Black', multiplier: 6,  page: 43 },
  'Scrambler':     { grading: 'White', multiplier: 5,  page: 44 },
  'Sparky':        { grading: 'Black', multiplier: 26, page: 44 },
  'Tar Baby':      { grading: 'Gray',  multiplier: 9,  page: 44 },
  'Tracker':       { grading: 'White', multiplier: 11, page: 44 },
};

/** Passive IC, MDF p.25: Alert and System Sweep are a flat 100 Mp (max 2 each); the rest use a multiplier. */
export const PASSIVE_IC = {
  'Alert':        { flat: 100 },
  'System Sweep': { flat: 100 },
  'Barrier':      { multiplier: 3 },
  'Encryption':   { multiplier: 3 },
  'Databomb':     { multiplier: 4 },
};

/** Mp Size of an IC at a Rating: Rating² × Final Multiplier (PROGRAM SIZE TABLE, MDF p.33), or the flat cost. */
export function icMemory(name, rating = 6) {
  const r = Math.max(1, Math.round(Number(rating) || 1));
  const agent = AGENT_IC[name];
  if (agent) return r * r * agent.multiplier;
  const passive = PASSIVE_IC[name];
  if (!passive) return 0;
  return passive.flat ?? r * r * passive.multiplier;
}

