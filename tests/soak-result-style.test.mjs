/**
 * The soak result line must not look like a button — TODO 140.
 *
 * ⚠ SOURCE-LEVEL INVARIANT: the CSS can't be rendered here, so this checks the rule itself.
 *
 * Reported from play: the resist card's "N soak hits — staged down to …" section looked
 * clickable. It was a gold box with a full gold border — the same look as the gold resist
 * buttons directly under it (Assign Wound, Knockdown). A result is read, not clicked.
 */
import fs from 'node:fs';

export const name = 'soak-result-style';

const CSS = fs.readFileSync(new URL('../styles/sr3e.css', import.meta.url), 'utf8');

/** The body of the first rule whose selector is exactly `selector`. */
function rule(selector) {
  const m = CSS.match(new RegExp(`(^|\\n)${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`));
  return m ? m[2] : null;
}

export async function run(t) {
  const body = rule('.sr-soak-result');
  t.ok('.sr-soak-result has its own rule', body !== null);
  if (body === null) return;

  t.ok('it is not gold — gold is the resist buttons’ colour', !/--sr-gold/.test(body));
  t.ok('it has no full border, which is what made it a button shape',
    /border:\s*none/.test(body) && !/border:\s*1px/.test(body));
  t.ok('it is greyed: muted text', /color:\s*var\(--sr-muted\)/.test(body));
  t.ok('the cursor says there is nothing to click', /cursor:\s*default/.test(body));
}
