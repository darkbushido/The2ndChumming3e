/**
 * The World guide pages describe October 2059; what happens after is GM-only, in a compendium.
 *
 * The maintainer, 2026-10-11: the table's campaign is in October 2059, but the system is for all of
 * SR3 — "I'm okay with the full 3rd edition but I need to keep that new data from my players". So:
 *   · guides/world/*.md (public, read by players) stop at October 2059;
 *   · the later events ship in `sr3e-gm-sixth-world`, a JournalEntry pack declared PLAYER: NONE.
 * Both halves can regress silently: a guide edit that reintroduces 2060 news, or a pack declaration
 * that loses its ownership and shows the GM's journal to every player. This suite pins both.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { readSourceDir } from '../tools/lib/pack-source.mjs';
import { PACK, PAGES, entries } from '../tools/build-gm-sixth-world.mjs';

export const name = 'gm-sixth-world';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const manifest = JSON.parse(read('system.json'));
  const decl = manifest.packs.find(p => p.name === PACK);

  /* ── The pack is declared, a journal, and hidden from players ─────────────── */
  t.ok('the GM pack is declared in system.json', !!decl);
  t.is('…as a JournalEntry pack', decl?.type, 'JournalEntry');
  t.is('players cannot see it', decl?.ownership?.PLAYER, 'NONE');
  t.is('…nor can trusted players', decl?.ownership?.TRUSTED, 'NONE');
  t.ok('…but an assistant GM can', decl?.ownership?.ASSISTANT === 'OWNER');
  const folders = JSON.stringify(manifest.packFolders ?? []);
  t.ok('it sits in a "GM Only" sidebar folder', /"name":"GM Only"[^\]]*sr3e-gm-sixth-world/.test(folders));

  /* ── The source is exactly what the builder writes (ids derived, no drift) ── */
  const src = readSourceDir(new URL(`../packs-src/${PACK}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  const built = entries();
  t.is('packs-src holds the journal and every page', src.size, built.size);
  t.ok('…key for key what tools/build-gm-sixth-world.mjs produces',
    [...built.keys()].every(k => JSON.stringify(src.get(k)) === JSON.stringify(built.get(k))));
  t.ok('every page after the introduction cites a book and printed page', PAGES.slice(1).every(p => /\((?:SR3|NS) p\.\d/.test(p.html)));

  /* ── The public World pages stop at October 2059 ──────────────────────────── */
  const world = readdirSync(new URL('../guides/world/', import.meta.url)).filter(f => f.endsWith('.md'))
    .map(f => ({ f, text: read(`guides/world/${f}`) }));
  t.ok('the four World pages are there', world.length >= 4);
  // Events the books place after October 2059 — each belongs in the GM journal, not on a player page.
  const LATER = [
    [/Joint Task Force/i, 'JTF Seattle (2060)'],
    [/Colloton/i, 'General Colloton (2060)'],
    [/Marushige/i, 'Renraku\'s acting director after the shutdown'],
    [/arcology (?:went|goes) (?:off-?line|dark)|shut ?down/i, 'the arcology shutdown (Dec 2059)'],
    [/Shotozumi-rengo/i, 'the yakuza secession'],
    [/Big-No-One|Fuchi (?:broke|was dissolved|collapse)/i, 'Fuchi\'s dissolution (2060)'],
    [/Cross[^.]{0,80}(?:Renraku's|Court) seat|seat[^.]{0,60}Cross/i, 'Cross\'s Court seat (2060)'],
    [/Samantha Villiers|Lindstrom/i, 'post-2059 Seattle figures'],
    [/as of 2060|\bin 2060 the|since 2060/i, 'a present tense set in 2060'],
  ];
  for (const [re, what] of LATER) {
    const hit = world.find(w => re.test(w.text));
    t.ok(`no World page mentions ${what}${hit ? ` — found in ${hit.f}` : ''}`, !hit);
  }
  t.ok('the index says when the pages describe, and where the rest is',
    /October\s*(?:>\s*)?2059/.test(world.find(w => w.f === 'index.md')?.text ?? '') && /GM Only/.test(world.find(w => w.f === 'index.md')?.text ?? ''));
}
