#!/usr/bin/env node
/**
 * Stage a tagged release: the files Foundry installs, with system.json stamped to the
 * release's own URLs. Run by .github/workflows/release.yml on a `v*` tag; runnable
 * locally to inspect what would ship.
 *
 *   node tools/release.mjs v0.6.0            stage into dist/ (dist/system/ + dist/system.json)
 *   node tools/release.mjs v0.6.0 --check    verify only — tag matches version, paths exist
 *
 * The workflow zips dist/system/ into system.zip and attaches it and dist/system.json to
 * the GitHub Release. The committed system.json is never touched — it keeps naming a
 * branch (tools/manifest-branch.mjs).
 *
 * ⚠ The zip is an INCLUDE list, not "the repo minus some things". The repo carries the
 * guides site, packs-src, rawdata, tests, tools and audits, none of which a Foundry
 * install needs; a new top-level folder must be added here on purpose to ship.
 * tests/release.test.mjs fails if system.json names a path the list does not cover.
 */
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { repoSlug, releaseUrls, releaseManifestUrl, stampUrls } from './lib/manifest-urls.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** What ships. Top-level files and folders, relative to the repo root. */
export const RELEASE_FILES = ['system.json', 'scripts', 'styles', 'lang', 'packs', 'LICENSE', 'README.md'];

/** `v0.6.0` → `0.6.0`; null for anything that is not v + major.minor.patch. */
export function versionFromTag(tag) {
  const m = /^v(\d+\.\d+\.\d+)$/.exec(tag ?? '');
  return m ? m[1] : null;
}

/** Every path system.json asks Foundry to load. */
export function manifestPaths(manifest) {
  return [
    ...(manifest.esmodules ?? []),
    ...(manifest.scripts ?? []),
    ...(manifest.styles ?? []),
    ...(manifest.languages ?? []).map(l => l.path),
    ...(manifest.packs ?? []).map(p => p.path),
  ].filter(Boolean);
}

/** Paths in `paths` that no entry of RELEASE_FILES covers. */
export function uncoveredPaths(paths, files = RELEASE_FILES) {
  return paths.filter(p => !files.some(f => p === f || p.startsWith(`${f}/`)));
}

function fail(msg) { console.error(`release: ${msg}`); process.exit(1); }

async function main() {
  const args  = process.argv.slice(2);
  const check = args.includes('--check');
  const tag   = args.find(a => !a.startsWith('-'));

  const version = versionFromTag(tag);
  if (!version) fail(`give a tag like v0.6.0 (got ${tag ?? 'nothing'}).`);

  const text     = readFileSync(join(ROOT, 'system.json'), 'utf8');
  const manifest = JSON.parse(text);
  if (manifest.version !== version) {
    fail(`tag ${tag} does not match system.json version ${manifest.version} — bump system.json first.`);
  }

  const missing = uncoveredPaths(manifestPaths(manifest));
  if (missing.length) fail(`system.json names paths the release would not ship:\n  ${missing.join('\n  ')}`);
  const absent = RELEASE_FILES.filter(f => !existsSync(join(ROOT, f)));
  if (absent.length) fail(`missing from the checkout: ${absent.join(', ')}`);

  const slug = repoSlug(text);
  if (!slug) fail('could not read the repo slug from system.json "url".');
  const { text: stamped } = stampUrls(text, releaseUrls(slug, tag));

  if (check) {
    console.log(`release: ${tag} is ready — ${RELEASE_FILES.join(', ')}.`);
    return;
  }

  const dist  = join(ROOT, 'dist');
  const stage = join(dist, 'system');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  for (const f of RELEASE_FILES) {
    if (f === 'system.json') continue;
    // LevelDB runtime files (untracked — .gitignore) exist only in a local checkout.
    cpSync(join(ROOT, f), join(stage, f), { recursive: true, filter: src => !/[\\/](LOCK|LOG|LOG\.old)$/.test(src) });
  }
  writeFileSync(join(stage, 'system.json'), stamped);
  writeFileSync(join(dist, 'system.json'), stamped);

  console.log(`release: staged ${tag} in dist/system/`);
  console.log(`  install this version: ${releaseManifestUrl(slug, tag)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
