/**
 * No absolute path into a person's home directory ships in the repo.
 *
 * The maintainer's PDF library, OCR text and generator checkout were named by their full
 * `C:\Users\<name>\…` path in docs and one tool default, which published a Windows username
 * with every clone. They are written `%USERPROFILE%\Documents\…` now, and tools build the
 * path from `process.env.USERPROFILE` (with an env override: `SR3E_PDF_DIR`, `SRCG_DATA`).
 *
 * Scans every tracked text file; binary files (the LevelDB packs) are skipped.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const name = 'personal-paths';

const root = fileURLToPath(new URL('../', import.meta.url));

// `C:\Users\x\`, `C:\\Users\\x`, `C:/Users/x/`, `/Users/x/`, `/home/x/`.
const HOME_PATH = /(?:\b[A-Za-z]:(?:\\\\|\\|\/)+|(?:^|[\s`'"(])\/)(?:Users|home)(?:\\\\|\\|\/)+(?!%|\$|<|\{|\*)[\w.-]+/gi;

// Paths that are not a person's home: a container's own user, and placeholders.
const ALLOWED = [/\/home\/user\b/i, /\/home\/runner\b/i, /Users(?:\\\\|\\|\/)+(?:Public|Default|you|name|username)\b/i];

// Files with a reason to hold one. Keep this empty unless the reason is stated.
const EXEMPT = {
  // This file: its examples are the patterns it looks for.
  'tests/personal-paths.test.mjs': 'the check itself',
  // A contributor's local permission allow-list, committed before this check existed.
  // Theirs to move into settings.local.json — not scrubbed here without asking.
  '.claude/settings.json': 'a contributor\'s local allow-list',
};

export async function run(t) {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0').filter(Boolean);

  const hits = [];
  for (const f of files) {
    if (f in EXEMPT) continue;
    let text;
    try { text = readFileSync(root + f, 'utf8'); } catch { continue; }
    if (text.includes('\0')) continue;
    for (const m of text.matchAll(HOME_PATH)) {
      if (ALLOWED.some(a => a.test(m[0]))) continue;
      const line = text.slice(0, m.index).split('\n').length;
      hits.push(`${f}:${line}  ${m[0].trim()}`);
    }
  }
  t.eq('no tracked file names a home-directory path', hits, []);

  t.ok('the scan sees the Windows form', 'C:\\Users\\someone\\Documents'.match(HOME_PATH));
  t.ok('the scan sees the forward-slash form', "'C:/Users/someone/x'".match(HOME_PATH));
  t.ok('%USERPROFILE% is not a hit', !'%USERPROFILE%\\Documents\\Shadowrun'.match(HOME_PATH));
}
