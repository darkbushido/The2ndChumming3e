/**
 * Cyberware built into a cyberlimb — book corrections to the packs · TODO 255
 *
 * Audit: `audit/cyberlimb-mods-audit.md`. The corrections live in one list,
 * `PACK_CORRECTIONS` (scripts/data/cyberlimb-mods.mjs), applied by `tools/fix-cyberlimb-mods.mjs`.
 * This pins that every one of them is in `packs-src/`, and that the list itself still says what the
 * books say — so a regenerated pack or an edited list fails here.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { PACK_CORRECTIONS, getPath, setPath } from '../scripts/data/cyberlimb-mods.mjs';

export const name = 'cyberlimb-mods';

const docById = (pack, id) => {
  const dir = new URL(`../packs-src/${pack}/`, import.meta.url);
  const f = readdirSync(dir).find(n => n.endsWith(`.${id}.json`));
  return f ? JSON.parse(readFileSync(new URL(f, dir), 'utf8')).doc : null;
};

export async function run(t) {
  /* ── The list says what the books say ─────────────────────────────────────────── */
  const byId = Object.fromEntries(PACK_CORRECTIONS.map(c => [c.id, c]));
  t.is('DNI 4,500¥ (SR3 p.303 Limbs table; M&M p.39)', byId['sr3e-cyberware-0743']?.set['system.cost'], 4500);
  t.is('DNI 5P-Q', byId['sr3e-cyberware-0743']?.set['system.legalCode'], '5P-Q');
  t.is('Built-In Smartgun Link 6/4 days (SR3 p.303)', byId['sr3e-cyberware-0846']?.set['system.availability'], '6/4 days');
  t.is('Built-In Smartgun Link Street Index 1.5 (SR3 p.303)', byId['sr3e-cyberware-0846']?.set['system.streetIndex'], 1.5);
  t.is('Tracking Mount 25,000¥ (M&M p.41)', byId['sr3e-cyberware-0768']?.set['system.cost'], 25000);
  t.is('Cyberarm Gyromount 4P-R (M&M p.37)', byId['sr3e-cyberware-0728']?.set['system.legalCode'], '4P-R');
  t.is('Cyber Holster 5P-N (M&M p.39)', byId['sr3e-cyberware-0727']?.set['system.legalCode'], '5P-N');
  t.is('a fingertip compartment in a cyberlimb costs no Essence (SR3 p.303)', byId['sr3e-cyberware-0622']?.set['system.essenceCost'], 0);
  t.is('the second Rigger Decryption Module [1] is the [10]', byId['sr3e-cyberware-0833']?.set['system.rating'], 10);
  t.is('…named plainly, the level in its rating (TODO 260)', byId['sr3e-cyberware-0833']?.set.name, 'Rigger Decryption Module');
  t.ok('every correction names its book and page', PACK_CORRECTIONS.every(c => /\b(SR3|M&M) p\.\d+/.test(c.source)));
  t.ok('every changed field records its old value (the migration needs it)',
    PACK_CORRECTIONS.every(c => Object.keys(c.set).every(k => Object.prototype.hasOwnProperty.call(c.was, k))));

  /* ── …and the packs carry it ───────────────────────────────────────────────────── */
  for (const c of PACK_CORRECTIONS) {
    const doc = docById(c.pack, c.id);
    t.ok(`${c.pack}/${c.id} exists`, !!doc);
    for (const [path, value] of Object.entries(c.set)) t.is(`${doc?.name} ${path} (${c.source})`, getPath(doc, path), value);
  }

  /* ── The Smartlink-2 report itself: the ordinary implant is .5, the in-limb one .25 ── */
  t.is('Smartlink II (Bodyware) is .5 Essence — M&M p.32', docById('sr3e-mm-cyberware', 'sr3e-cyberware-0225')?.system.essenceCost, 0.5);
  t.is('Smartlink II in a cyberlimb is .25 — M&M p.36', docById('sr3e-mm-cyberware', 'sr3e-cyberware-0847')?.system.essenceCost, 0.25);

  /* ── Path helpers ──────────────────────────────────────────────────────────────── */
  const d = { system: { cost: 1 } };
  setPath(d, 'system.cost', 2); setPath(d, 'flags.x.y', 3);
  t.eq('setPath writes nested paths in place', d, { system: { cost: 2 }, flags: { x: { y: 3 } } });
  t.is('getPath of a missing path is undefined', getPath(d, 'system.nope.deeper'), undefined);
}
