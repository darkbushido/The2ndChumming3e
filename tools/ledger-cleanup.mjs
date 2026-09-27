/**
 * Print the GM console script that cleans leaked 📒 Ledger entries · TODO 197.
 *
 *   node tools/ledger-cleanup.mjs > ledger-cleanup.js     then paste it into the GM's browser console
 *
 * The script embeds `classifyLedgers` from `tools/lib/ledger-cleanup.mjs` as its source text, so the
 * world does not need the fixed system installed. It is a DRY RUN until its `APPLY` line says
 * `const APPLY = true`: it prints what it would remove and changes nothing.
 */
import { pathToFileURL } from 'node:url';
import { classifyLedgers } from './lib/ledger-cleanup.mjs';

export function consoleScript() {
  return `// SR3E — clean leaked 📒 Ledger entries (TODO 197). GM only. Changes NOTHING unless APPLY is true.
(async () => {
const APPLY = false;   // ← change to true, and run again, to remove what the dry run listed
${classifyLedgers.toString()}
  if (!game.user.isGM) return ui.notifications.warn('Ledger cleanup: run this as the GM.');
  const kinds = { karma: 'karma', nuyen: 'nuyen', pool: 'karmaPool' };
  const actors = game.actors.filter(a => (a.system?.ledger ?? []).length).map(a => ({
    id: a.id, name: a.name, ledger: a.system.ledger,
    current: Object.fromEntries(Object.entries(kinds).map(([k, f]) => [k, Number(a.system[f]) || 0])),
    owners: game.users.filter(u => !u.isGM && a.testUserPermission(u, 'OWNER')).map(u => u.name),
  }));
  const result = classifyLedgers(actors);
  const show = [];
  for (const r of result) for (const row of r.rows) if (row.verdict !== 'keep' || !APPLY) show.push({
    character: r.name, verdict: row.verdict, when: new Date(row.entry.when).toLocaleString(),
    kind: row.entry.kind, change: row.entry.delta, from: row.entry.from, to: row.entry.to,
    why: row.entry.reason || '(none)', by: row.entry.by, because: row.why,
  });
  console.table(show);
  const total = result.reduce((s, r) => s + r.remove.length, 0);
  if (!APPLY) return console.log(\`Dry run: \${total} entr\${total === 1 ? 'y' : 'ies'} would be removed. Set APPLY = true and run again to remove them.\`);
  for (const r of result) {
    if (!r.remove.length) continue;
    const a = game.actors.get(r.id);
    await a.update({ 'system.ledger': a.system.ledger.filter((_e, i) => !r.remove.includes(i)) });
  }
  console.log(\`Removed \${total} entr\${total === 1 ? 'y' : 'ies'}.\`);
})();
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(consoleScript());
}
