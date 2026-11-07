/**
 * TODO 291: four blocks moved out of CLAUDE.md (approved by the maintainer) into path-scoped rules files.
 *
 *   · every moved heading still exists in its rules file, so nothing was lost in the move;
 *   · CLAUDE.md keeps the ⚠ summaries the maintainer approved, and a pointer to each file;
 *   · each new rules file is path-scoped (a `paths:` front matter), or it would never load;
 *   · CLAUDE.md stays slim — it loads in every session.
 */
import { readFileSync } from 'node:fs';

export const name = 'claude-md-slim';

const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const MOVED = {
  'release-and-process.md': ['## Verifying a build — `npm run preflight`', '### ⚠ The one gate that must never be faked — TODO 121',
    '## Releases — a tag builds the zip and the guides', '## Branch manifest URLs — `npm run manifest:branch`'],
  'packs-and-migrations.md': ['### Compendium packs — how they are ACTUALLY changed', '### Pack integrity — `npm run packs:check`',
    '### World migrations — `scripts/SR3EMigrations.js`'],
  'chat-cards.md': ['## Open combat steps — the ⏳ Waiting-on panel · TODO 147', '## Two-corner cards — each side edits only its own half'],
  'data-model.md': ['## Actor data model', '### Key system fields (character/npc)', '### Item types and key fields',
    '### Weapon category codes → skills', '## Key methods reference', '### SR3EActor', '### SR3EItem', '### SR3ECombat'],
};

const SUMMARIES = [
  'Only the release task bumps the version; never `git push`',
  'The TODO 121 record (`audit/rules-check-<version>.md`) is never faked',
  '`npm run preflight`',
  '`packs-src/` is the source of truth',
  'Foundry must be CLOSED, even to read a pack.',
  'A pack fix needs a world migration too',
];

export async function run(t) {
  const claude = read('CLAUDE.md');
  for (const [file, heads] of Object.entries(MOVED)) {
    const text = read(`.claude/rules/${file}`);
    t.ok(`${file} is path-scoped`, /^---\npaths:\n\s+- /.test(text));
    t.ok(`CLAUDE.md points at ${file}`, claude.includes(`.claude/rules/${file}`));
    for (const h of heads) {
      const lineStart = new RegExp(`^${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm');
      t.ok(`${file} keeps "${h}"`, lineStart.test(text));
      t.ok(`CLAUDE.md no longer carries "${h}"`, !lineStart.test(claude));
    }
  }
  for (const s of SUMMARIES) t.ok(`CLAUDE.md keeps the summary "${s}"`, claude.includes(s));
  t.ok('CLAUDE.md stays under 26 KB (it was 42 KB)', claude.length < 26000, `${claude.length}`);
}
