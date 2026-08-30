/**
 * Every chat-card button class must be styled.
 *
 * ⚠ SOURCE-LEVEL INVARIANT, like `explosion-carry` and `pool-spend`. There is no unit test that
 * can see "this button is unreadable"; you find out when someone tries to read it.
 *
 * ## Why this exists
 *
 * Foundry's core styling gives chat buttons a **fixed height** and does not wrap their text. The
 * shared base rule in `styles/sr3e.css` overrides both — `height: auto`, `white-space: normal` —
 * and its comment says exactly why: *"core gives buttons a fixed height — grow with wrapped
 * text"*. A button class that is not in that rule therefore renders with its label **clipped**,
 * in default colours that do not match the card.
 *
 * Four buttons were added across three commits on 2026-08-20/21 — `sr-knockdown-btn`,
 * `sr-prone-btn`, `sr-fd-dodge-btn`, `sr-charge-quickness-btn` — and **none of them got CSS**.
 * Reported from play as "the knockdown resist button on a melee resist isn't readable". Each
 * was written by copying the markup of a styled button, which is precisely why the omission is
 * invisible: the HTML looks right.
 *
 * Adding a button is two edits, in two files, and only one of them fails loudly. This is the
 * other one.
 */
import fs from 'node:fs';

export const name = 'chat-button-styles';

const ROOT = new URL('../', import.meta.url);
const CSS  = fs.readFileSync(new URL('styles/sr3e.css', ROOT), 'utf8');

/** Every `.js` under scripts/, recursively. */
function sources(dir = new URL('scripts/', ROOT)) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) out.push(...sources(child));
    else if (entry.name.endsWith('.js')) out.push(child);
  }
  return out;
}

/**
 * Button classes that are deliberately unstyled. Each needs a reason.
 * (empty — every button currently carries styling)
 */
const EXEMPT = new Map([
  // Deliberately `white-space: nowrap` with `text-overflow: ellipsis` — it renders a vehicle
  // NAME in a tight row, where wrapping would be worse than truncating. It carries its own
  // complete rule and is not part of the chat-action family.
  ['sr-veh-name-btn', 'a name chip, deliberately ellipsised rather than wrapped'],
]);

export async function run(t) {
  // Buttons are written as `class="sr-something-btn"`, sometimes with extra classes.
  const used = new Set();
  for (const file of sources()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/class="([^"]*\bsr-[\w-]+-btn\b[^"]*)"/g)) {
      for (const cls of m[1].split(/\s+/)) {
        if (/^sr-[\w-]+-btn$/.test(cls)) used.add(cls);
      }
    }
  }

  t.ok('the scan found chat buttons at all', used.size > 10);

  /* ==== Every button must GET the two properties, from wherever ====
   *
   * ⚠ The invariant is the PROPERTIES, not membership of one rule. `sr-assign-damage-btn` has
   * its own complete rule carrying both, and is perfectly correct — an earlier version of this
   * test asserted "must be in the shared base" and reported it as broken. Check what matters.
   */
  const baseStart = CSS.indexOf('/* ── Chat action buttons — shared base ──');
  t.ok('the shared base rule is still present and findable', baseStart > 0);
  const baseRule = CSS.slice(baseStart, CSS.indexOf('}', baseStart));
  t.ok('…and still sets height:auto, which is the actual fix', /height:\s*auto/.test(baseRule));
  t.ok('…and white-space:normal, so long labels wrap', /white-space:\s*normal/.test(baseRule));

  /** Every rule block whose selector list mentions this class. */
  const rulesFor = cls => {
    const out = [];
    let i = 0;
    while ((i = CSS.indexOf('.' + cls, i)) !== -1) {
      const open = CSS.indexOf('{', i);
      const close = CSS.indexOf('}', open);
      if (open === -1 || close === -1) break;
      // Guard against a longer class that merely starts with this one.
      const after = CSS[i + cls.length + 1];
      if (!/[\w-]/.test(after ?? '')) out.push(CSS.slice(open, close));
      i += cls.length + 1;
    }
    return out.join('\n');
  };

  const unstyled = [...used].filter(c => {
    if (EXEMPT.has(c)) return false;
    const css = rulesFor(c);
    return !/height:\s*auto/.test(css) || !/white-space:\s*(normal|nowrap)/.test(css);
  }).sort();

  t.is(unstyled.length
      ? `chat buttons that never get height:auto — their labels render CLIPPED at core's fixed `
        + `height: ${unstyled.join(', ')} — add them to the shared base in styles/sr3e.css`
      : 'every chat button gets height:auto and a white-space rule',
    unstyled.length, 0);

  /* ==== The four from the report, named so a regression says which ==== */
  for (const cls of ['sr-knockdown-btn', 'sr-prone-btn',
                     'sr-fd-dodge-btn', 'sr-charge-quickness-btn']) {
    t.ok(`${cls} is in the shared base`, baseRule.includes('.' + cls));
    t.ok(`${cls} is actually used in the source`, used.has(cls));
  }

  /* ==== Colour: a button should also belong to some colour group ====
   *
   * Not fatal on its own — the base makes it readable — but an uncoloured button looks like a
   * bug next to its neighbours, so it is worth reporting.
   */
  const colourless = [...used].filter(c => {
    if (EXEMPT.has(c)) return false;
    // A button is coloured if any rule mentioning it sets `color`. Counting occurrences of the
    // selector instead wrongly flagged buttons that carry ONE complete rule of their own.
    return !/(^|[^-\w])color\s*:/.test(rulesFor(c));
  }).sort();

  t.is(colourless.length
      ? `styled for size but given no colour, so they render plain next to their neighbours: `
        + colourless.join(', ')
      : 'every chat button also belongs to a colour group',
    colourless.length, 0);
}
