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
 * A tagged RELEASE stamps its own URLs into the copy it ships (tools/release.mjs); the
 * committed file keeps naming a branch. Both share tools/lib/manifest-urls.mjs, which
 * rewrites three lines rather than the parsed document.
 *
 * The repo slug is read back out of the existing `url`, never hardcoded, so renaming
 * or forking the repo does not silently keep publishing the old owner's manifest.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { repoSlug, branchUrls, stampUrls } from './lib/manifest-urls.mjs';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'system.json');

function currentBranch() {
  const b = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT })
    .toString().trim();
  if (b === 'HEAD') {
    console.error('manifest-branch: HEAD is detached — pass a branch name explicitly.');
    process.exit(2);
  }
  return b;
}

const args   = process.argv.slice(2);
const check  = args.includes('--check');
const branch = args.find(a => !a.startsWith('-')) ?? currentBranch();

const original = readFileSync(MANIFEST, 'utf8');
const slug     = repoSlug(original);
if (!slug) {
  console.error('manifest-branch: could not read the repo slug from system.json "url".');
  process.exit(2);
}

let result;
try { result = stampUrls(original, branchUrls(slug, branch)); }
catch (err) { console.error(`manifest-branch: ${err.message}.`); process.exit(2); }
const { text: updated, changes } = result;

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
