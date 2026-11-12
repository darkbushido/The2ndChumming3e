/** Serve dist/designer/ on http://localhost:5178 for a local look (TODO 298). `npm run designer:serve`. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'designer');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
createServer(async (req, res) => {
  const path = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  const file = path === ROOT ? join(ROOT, 'index.html') : path;
  if (!file.startsWith(ROOT + sep) && file !== ROOT) { res.writeHead(403).end(); return; }
  let body;
  try { body = await readFile(file); } catch { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'cache-control': 'no-store', 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
}).listen(5178, () => console.log('designer on http://localhost:5178'));
