/**
 * The three distribution fields at the bottom of system.json — `url`, `manifest`,
 * `download` — and the two ways they are stamped: to a BRANCH (playtest installs,
 * `npm run manifest:branch`) and to a RELEASE (a tagged version, `tools/release.mjs`).
 *
 * ⚠ Rewrites three LINES, not the parsed document. Round-tripping system.json through
 * JSON.parse/stringify would reformat ~1900 lines of pack declarations into one
 * unreviewable diff, so the edit is deliberately textual and surgical.
 */

/** Pull "owner/repo" out of the committed url so it survives a rename or a fork. */
export function repoSlug(text) {
  const m = text.match(/"url"\s*:\s*"https:\/\/github\.com\/([^/"]+\/[^/"]+?)(?:\/|")/);
  return m ? m[1] : null;
}

/** A branch install: Foundry reads the branch's own system.json and its archive zip. */
export function branchUrls(slug, branch) {
  return {
    url:      `https://github.com/${slug}/tree/${branch}`,
    manifest: `https://raw.githubusercontent.com/${slug}/refs/heads/${branch}/system.json`,
    download: `https://github.com/${slug}/archive/refs/heads/${branch}.zip`,
  };
}

/**
 * A release install. `download` is pinned to THIS tag; `manifest` points at the LATEST
 * release, because Foundry checks the installed copy's manifest for updates — pinning it
 * too would mean a player on 0.6.0 is never offered 0.6.1.
 *
 * A specific version is installed by pasting that release's own system.json URL
 * (releaseManifestUrl): Foundry fetches it, downloads its pinned zip, and from then on
 * checks `latest` for updates.
 */
export function releaseUrls(slug, tag) {
  return {
    url:      `https://github.com/${slug}/releases/tag/${tag}`,
    manifest: `https://github.com/${slug}/releases/latest/download/system.json`,
    download: `https://github.com/${slug}/releases/download/${tag}/system.zip`,
  };
}

/** The URL to paste into Foundry to install exactly this version. */
export function releaseManifestUrl(slug, tag) {
  return `https://github.com/${slug}/releases/download/${tag}/system.json`;
}

/**
 * Rewrite the three fields to `urls`. Returns `{ text, changes }`; throws if a field is
 * missing, since a manifest without one cannot be installed.
 */
export function stampUrls(text, urls) {
  let out = text;
  const changes = [];
  for (const key of ['url', 'manifest', 'download']) {
    // Match the whole value so a partially-edited file is corrected rather than skipped.
    const re = new RegExp(`("${key}"\\s*:\\s*")([^"]*)(")`);
    const m  = out.match(re);
    if (!m) throw new Error(`no "${key}" field found in system.json`);
    if (m[2] !== urls[key]) changes.push({ key, from: m[2], to: urls[key] });
    out = out.replace(re, `$1${urls[key]}$3`);
  }
  return { text: out, changes };
}
