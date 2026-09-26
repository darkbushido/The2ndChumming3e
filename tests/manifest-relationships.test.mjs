/**
 * system.json → relationships. Foundry reads these at install time: a recommended module is
 * offered, never forced (design ethos: warn, never refuse).
 *
 *   · Security Cameras is recommended — the map pipeline's cameras depend on it;
 *   · nothing is `requires` — the system must run with no modules installed;
 *   · every entry carries what Foundry needs (id, type) and a reason a GM can read;
 *   · the README's "Recommended modules" section names every recommended id.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'manifest-relationships';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

export async function run(t) {
  const rel        = JSON.parse(read('system.json')).relationships ?? {};
  const recommends = rel.recommends ?? [];

  t.ok('Security Cameras is recommended',
    recommends.some(r => r.id === 'security-cameras' && r.type === 'module'));
  t.eq('nothing is required', rel.requires ?? [], []);

  for (const r of recommends) {
    t.ok(`${r.id}: has an id and a type Foundry accepts`,
      typeof r.id === 'string' && r.id && ['module', 'system', 'world'].includes(r.type));
    t.ok(`${r.id}: says why`, typeof r.reason === 'string' && r.reason.trim().length > 0);
  }
  t.eq('no module is recommended twice',
    recommends.length, new Set(recommends.map(r => r.id)).size);

  /* ---- README ---- */
  const readme  = read('README.md');
  const section = readme.split(/^## Recommended modules$/m)[1]?.split(/^## /m)[0] ?? '';
  t.ok('README has a "Recommended modules" section', section.length > 0);
  for (const r of recommends) {
    t.ok(`README names ${r.id}`, section.includes(`\`${r.id}\``));
  }
}
