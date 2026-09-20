/**
 * Tagged releases — tools/release.mjs, tools/lib/manifest-urls.mjs, tools/guides-versions.mjs
 * and .github/workflows/release.yml.
 *
 *   · the zip's include list covers every path system.json asks Foundry to load;
 *   · a release's manifest points at the LATEST release (so updates are offered) and its
 *     download at THIS tag (so a pasted version URL installs that version);
 *   · the committed system.json still names a branch — a release stamps only its copy;
 *   · the guides' version index sorts numerically and the workflow wires the pieces.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELEASE_FILES, versionFromTag, manifestPaths, uncoveredPaths } from '../tools/release.mjs';
import { repoSlug, branchUrls, releaseUrls, releaseManifestUrl, stampUrls } from '../tools/lib/manifest-urls.mjs';
import { sortVersions, versionsPage, redirectPage } from '../tools/guides-versions.mjs';

export const name = 'release';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

export async function run(t) {
  const text     = read('system.json');
  const manifest = JSON.parse(text);
  const slug     = repoSlug(text);

  /* ---- what ships ---- */
  t.ok('system.json names the paths it loads', manifestPaths(manifest).length > 50);
  t.eq('every one of them is in the release include list', uncoveredPaths(manifestPaths(manifest)), []);
  t.eq('…and a path outside it is caught', uncoveredPaths(['assets/x.svg', 'scripts/sr3e.js']), ['assets/x.svg']);
  t.eq('…a prefix is not a folder ("scriptsX" is not under "scripts")', uncoveredPaths(['scriptsX/a.js']), ['scriptsX/a.js']);
  for (const never of ['guides', 'packs-src', 'rawdata', 'tests', 'tools', 'archive', 'audit', 'node_modules']) {
    t.ok(`${never}/ does not ship`, !RELEASE_FILES.includes(never));
  }

  /* ---- tags ---- */
  t.eq('v0.6.0 → 0.6.0', versionFromTag('v0.6.0'), '0.6.0');
  t.eq('a tag without the v is refused', versionFromTag('0.6.0'), null);
  t.eq('a tag with a suffix is refused', versionFromTag('v0.6.0-rc1'), null);

  /* ---- URLs ---- */
  t.eq('the slug is read from system.json', slug, 'darkbushido/The2ndChumming3e');
  t.eq('…and from a release-stamped url too', repoSlug('"url": "https://github.com/a/b/releases/tag/v1.0.0"'), 'a/b');
  t.eq('…and from a bare repo url', repoSlug('"url": "https://github.com/a/b"'), 'a/b');
  const r = releaseUrls('o/r', 'v0.6.0');
  t.eq('a release manifest checks the LATEST release for updates', r.manifest, 'https://github.com/o/r/releases/latest/download/system.json');
  t.eq('a release download is pinned to its tag', r.download, 'https://github.com/o/r/releases/download/v0.6.0/system.zip');
  t.eq('the install-this-version URL is the tag\'s own system.json', releaseManifestUrl('o/r', 'v0.6.0'), 'https://github.com/o/r/releases/download/v0.6.0/system.json');

  const stamped = stampUrls(text, r);
  t.eq('stamping changes three lines and nothing else',
    stamped.text.split('\n').filter((l, i) => l !== text.split('\n')[i]).length, 3);
  t.eq('…and the result still parses, with the release URLs', JSON.parse(stamped.text).download, r.download);
  t.ok('a missing field throws', (() => { try { stampUrls('{}', r); return false; } catch { return true; } })());

  const committed = ['url', 'manifest', 'download'].map(k => manifest[k]);
  t.ok('the committed system.json names a branch, not a release',
    committed.every(u => !u.includes('/releases/')), committed.join(' '));
  t.eq('…in the shape manifest:branch writes', stampUrls(text, branchUrls(slug, committed[0].split('/tree/')[1])).changes, []);

  /* ---- guides versions ---- */
  t.eq('versions sort numerically, newest first', sortVersions(['v0.9.0', 'latest', 'v0.10.0', 'versions', 'v0.10.1']),
    ['v0.10.1', 'v0.10.0', 'v0.9.0']);
  t.ok('the versions page marks the newest as latest', /v0\.10\.1<\/a> — latest/.test(versionsPage(['v0.10.1', 'v0.9.0'])));
  t.ok('the root page forwards to latest/', redirectPage().includes('url=latest/'));

  /* ---- the workflow ---- */
  const wf = read('.github/workflows/release.yml');
  t.ok('the workflow runs on version tags', /tags:\s*\['v\*\.\*\.\*'\]/.test(wf));
  t.ok('…stages through tools/release.mjs', wf.includes('node tools/release.mjs "$TAG"'));
  t.ok('…attaches system.json and system.zip', wf.includes('dist/system.json dist/system.zip'));
  t.ok('…builds the guides for the tag and for latest/', wf.includes('for dest in "$TAG" latest'));
  t.ok('…link-checks the build', wf.includes('node tools/linkcheck.mjs'));
  t.ok('…and indexes gh-pages', wf.includes('node tools/guides-versions.mjs pages'));
  t.ok('the old guides Pages workflow is gone (it cannot run from a subfolder)',
    !(() => { try { read('guides/.github/workflows/pages.yml'); return true; } catch { return false; } })());
}
