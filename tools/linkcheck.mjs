// Checks every internal href (and #anchor) in a built Jekyll _site.
// usage: node tools/linkcheck.mjs [siteDir=_site] [baseurl=/sr3-guides]
// Run after `bundle exec jekyll build`. From Git Bash, pass an explicit baseurl only with
// MSYS_NO_PATHCONV=1, or Git Bash rewrites "/sr3-guides" into a Windows path.
import fs from 'fs';
import path from 'path';
const [root = "_site", base = "/sr3-guides"] = process.argv.slice(2);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
let bad = 0, n = 0;
const pages = walk(root);
for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(root, path.dirname(f)).split(path.sep).join('/');
  const dir = base + (rel ? '/' + rel : '');
  for (const m of html.matchAll(/href="([^"#?]*)(#[^"]*)?"/g)) {
    const h = m[1];
    if (/^(https?:|mailto:|data:)/.test(h)) continue;
    if (!h && !m[2]) continue;
    n++;
    const p = !h ? dir + '/' : h.startsWith('/') ? h : path.posix.normalize(path.posix.join(dir, h));
    if (!p.startsWith(base)) { console.log('OUTSIDE', f, h); bad++; continue; }
    let fp = path.join(root, p.slice(base.length));
    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html');
    if (!fs.existsSync(fp)) { console.log('BROKEN', path.relative(root, f), '->', h); bad++; continue; }
    if (m[2] && m[2].length > 1) {
      const id = decodeURIComponent(m[2].slice(1));
      if (!fs.readFileSync(fp, 'utf8').includes(`id="${id}"`)) { console.log('ANCHOR', path.relative(root, f), '->', h + m[2]); bad++; }
    }
  }
}
console.log(`${pages.length} pages, ${n} links, ${bad} problems`);
process.exitCode = bad ? 1 : 0;
