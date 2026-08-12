#!/usr/bin/env node
/**
 * Stamp system.json's distribution URLs to a git branch.
 *
 * Foundry installs a system from the three fields at the bottom of system.json —
 * `url`, `manifest` and `download`. They name a branch, so a playtest branch is only
 * installable if its own copy points at itself rather than at main.
 *
 *   node tools/manifest-branch.mjs            stamp to the current branch
 *   node tools/manifest-branch.mjs main       stamp to a named branch
 *   node tools/manifest-branch.mjs --check    exit 1 if stale, change nothing
 *
 * ⚠ Rewrites three LINES, not the parsed document. Round-tripping this file through
 * JSON.parse/stringify would reformat ~1900 lines of pack declarations into one
 * unreviewable diff, so the edit is deliberately textual and surgical.
 *
 * The repo slug is read back out of the existing `url`, never hardcoded, so renaming
 * or forking the repo does not silently keep publishing the old owner's manifest.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'system.json');

/** The three fields, and how each embeds the branch name. */
const FIELDS = [
  { key: 'url',      build: (slug, b) => `https://github.com/${slug}/tree/${b}` },
  { key: 'manifest', build: (slug, b) => `https://raw.githubusercontent.com/${slug}/refs/heads/${b}/system.json` },
  { key: 'download', build: (slug, b) => `https://github.com/${slug}/archive/refs/heads/${b}.zip` },
];

function currentBranch() {
  const b = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT })
    .toString().trim();
  if (b === 'HEAD') {
    console.error('manifest-branch: HEAD is detached — pass a branch name explicitly.');
    process.exit(2);
  }
  return b;
}

/** Pull "owner/repo" out of the committed url so it survives a rename or a fork. */
function repoSlug(text) {
  const m = text.match(/"url"\s*:\s*"https:\/\/github\.com\/([^/"]+\/[^/"]+)\//);
  if (!m) {
    console.error('manifest-branch: could not read the repo slug from system.json "url".');
    process.exit(2);
  }
  return m[1];
}

const args   = process.argv.slice(2);
const check  = args.includes('--check');
const branch = args.find(a => !a.startsWith('-')) ?? currentBranch();

const original = readFileSync(MANIFEST, 'utf8');
const slug     = repoSlug(original);

let updated = original;
const changes = [];

for (const { key, build } of FIELDS) {
  const want = build(slug, branch);
  // Match the whole value so a partially-edited file is corrected rather than skipped.
  const re   = new RegExp(`("${key}"\\s*:\\s*")([^"]*)(")`);
  const m    = updated.match(re);
  if (!m) {
    console.error(`manifest-branch: no "${key}" field found in system.json.`);
    process.exit(2);
  }
  if (m[2] !== want) changes.push({ key, from: m[2], to: want });
  updated = updated.replace(re, `$1${want}$3`);
}

if (changes.length === 0) {
  console.log(`manifest-branch: system.json already points at "${branch}".`);
  process.exit(0);
}

if (check) {
  console.error(`manifest-branch: system.json is STALE — expected "${branch}".`);
  for (const c of changes) console.error(`  ${c.key}\n    is:   ${c.from}\n    want: ${c.to}`);
  process.exit(1);
}

writeFileSync(MANIFEST, updated);
console.log(`manifest-branch: system.json now points at "${branch}".`);
for (const c of changes) console.log(`  ${c.key}: ${c.from}  ->  ${c.to}`);
