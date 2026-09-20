#!/usr/bin/env node
/**
 * Index the published guides on the gh-pages branch — one frozen folder per release
 * (`v0.6.0/`), a `latest/` copy of the newest, a root page that forwards to `latest/`,
 * and `versions/` listing every release. Run by .github/workflows/release.yml after it
 * copies a release's build in.
 *
 *   node tools/guides-versions.mjs <pagesDir>
 *
 * The folders on the branch ARE the record: nothing else lists which versions exist, so
 * a re-run rebuilds both pages from what is there.
 */
import { readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/** Release folders (`v1.2.3`), newest first — numerically, so v0.10.0 beats v0.9.0. */
export function sortVersions(names) {
  const parse = n => /^v(\d+)\.(\d+)\.(\d+)$/.exec(n)?.slice(1).map(Number);
  return names.filter(n => parse(n)).sort((a, b) => {
    const [x, y] = [parse(a), parse(b)];
    return (y[0] - x[0]) || (y[1] - x[1]) || (y[2] - x[2]);
  });
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The root page: forward to latest/. Relative, so it works under any baseurl. */
export function redirectPage(target = 'latest/') {
  return `<!doctype html>
<meta charset="utf-8">
<title>SR3 Table Reference</title>
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<link rel="canonical" href="${esc(target)}">
<p><a href="${esc(target)}">SR3 Table Reference — latest release</a></p>
`;
}

/** versions/index.html: every release's guides, newest first. */
export function versionsPage(versions) {
  const rows = versions.map((v, i) =>
    `  <li><a href="../${esc(v)}/">${esc(v)}</a>${i === 0 ? ' — latest' : ''}</li>`).join('\n');
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SR3 Table Reference — versions</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; background: #0b1110; color: #d7e4df; }
  a { color: #3ddc84; }
</style>
<h1>SR3 Table Reference — versions</h1>
<p>The guides as they stood at each release of The 2nd Chumming. Each one describes how that
version of the system handles the rules.</p>
<p><a href="../latest/">Latest</a></p>
<ul>
${rows}
</ul>
`;
}

function main() {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node tools/guides-versions.mjs <pagesDir>'); process.exit(2); }
  const versions = sortVersions(readdirSync(dir).filter(n => statSync(join(dir, n)).isDirectory()));
  writeFileSync(join(dir, 'index.html'), redirectPage());
  mkdirSync(join(dir, 'versions'), { recursive: true });
  writeFileSync(join(dir, 'versions', 'index.html'), versionsPage(versions));
  // An empty .nojekyll: the folders are already-built sites; Pages must not run Jekyll again.
  writeFileSync(join(dir, '.nojekyll'), '');
  console.log(`guides-versions: ${versions.length} release(s) — ${versions.join(', ') || 'none'}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
