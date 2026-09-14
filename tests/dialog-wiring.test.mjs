/**
 * Dialogs are wired per dialog, never through the global `renderDialogV2` hook · TODO 20.
 *
 * `Hooks.on('renderDialogV2', …)` is global. With two dialogs of the same kind open — normal since
 * socket combat, where the GM can have two attack windows up — both hooks register before either
 * renders, so the first dialog is wired twice (the second time with the OTHER dialog's closure
 * variables) and the second not at all: a checkbox or dropdown that silently stops recomputing.
 * A hook that was never switched off (a dismissed Fire Mode dialog left its hook behind) also
 * wired the NEXT dialog of that kind.
 *
 * `DialogV2.wait({ render })` is per dialog (Foundry 14.365.0, `dialog.mjs:420-422`). All 18
 * remaining hook sites moved to it on 2026-09-13.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'dialog-wiring';

const ROOT = fileURLToPath(new URL('../scripts/', import.meta.url));
function* files(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.m?js$/.test(n)) yield p;
  }
}

export async function run(t) {
  let wired = 0;
  for (const p of files(ROOT)) {
    const rel = `scripts/${p.slice(ROOT.length).replace(/\\/g, '/')}`;
    // Comments stripped: several explain why a site is NOT a hook, naming it.
    const src = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    t.ok(`${rel}: no global renderDialogV2 hook`, !/Hooks\.(on|once)\(\s*['"]renderDialogV2['"]/.test(src));

    // Every `const wireX = (…) =>` is handed to a dialog's `render` option — a wiring function
    // that nothing calls would leave its dialog dead, which no other suite would notice.
    for (const [, fn] of src.matchAll(/const (wire[A-Z]\w*) = \(/g)) {
      t.ok(`${rel}: ${fn} is passed to a DialogV2 render option`,
        new RegExp(`render: (\\(_event, dialog\\) => ${fn}\\(dialog, dialog\\.element\\)|${fn}\\b)`).test(src));
      wired++;
    }
  }
  t.ok(`the migrated dialogs are all found (${wired})`, wired >= 18);
}
