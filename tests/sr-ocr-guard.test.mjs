/**
 * SR-OCR/ must NEVER be committed.
 *
 * It holds OCR text and page transcriptions of the copyrighted rulebooks, kept in the checkout for the
 * rules check (TODO 121) — the maintainer, 2026-09-24: "we can put the SR-OCR in the repo but it
 * CANNOT EVER BE CHECKED IN." Four guards, each checked here so none can be removed quietly:
 * .gitignore, the pre-commit hook (which also stops `git add -f`), ESLint's ignore list, and — the one
 * that matters most — nothing under SR-OCR/ is tracked. It never ships either: the release is an
 * include list (tools/release.mjs RELEASE_FILES).
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const name = 'sr-ocr-guard';

const root = new URL('../', import.meta.url);
const read = rel => readFileSync(new URL(rel, root), 'utf8');

export async function run(t) {
  const tracked = execFileSync('git', ['ls-files', '--', 'SR-OCR'], { cwd: root, encoding: 'utf8' }).trim();
  t.is('NOTHING under SR-OCR/ is tracked by git', tracked, '');

  t.ok('.gitignore ignores /SR-OCR/', /^\/SR-OCR\/\s*$/m.test(read('.gitignore')));

  const hookPath = new URL('.githooks/pre-commit', root);
  t.ok('the pre-commit hook exists', existsSync(hookPath));
  const hook = existsSync(hookPath) ? readFileSync(hookPath, 'utf8') : '';
  t.ok('…refuses staged SR-OCR/ paths and exits non-zero', /\^SR-OCR\//.test(hook) && /exit 1/.test(hook));
  t.ok('…with LF line endings, or sh ignores it silently', !hook.includes('\r'));

  t.ok('ESLint does not lint it', /'SR-OCR\/\*\*'/.test(read('eslint.config.mjs')));
  t.ok('the release include list does not name it', !/SR-OCR/.test(read('tools/release.mjs')));
}
