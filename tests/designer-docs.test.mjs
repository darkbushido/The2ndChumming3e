/**
 * The web gear designer's documentation (TODOs 298/300): the guide page exists and is linked, and every link to the
 * designer uses the published path the release workflow writes (`designer/latest/` beside the guides on gh-pages).
 * ⚠ A RELATIVE `../designer/` link from a guide page resolves inside the versioned guides folder and fails the
 * workflow's linkcheck — so guides link the designer by its absolute Pages URL.
 */
import { readFileSync } from 'node:fs';

export const name = 'designer-docs';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const DESIGNER = 'https://darkbushido.github.io/The2ndChumming3e/designer/latest/';

export async function run(t) {
  const page = read('guides/gear-designer.md');
  const index = read('guides/index.md');
  const readme = read('README.md');
  const workflow = read('.github/workflows/release.yml');

  t.ok('the workflow publishes the designer at pages/designer/latest', workflow.includes('pages/designer/latest'));
  t.ok('the guide page has front matter with a title', /^---\ntitle: Gear Designer\n/.test(page.replace(/\r/g, '')));
  t.ok('the guide links the published designer', page.includes(DESIGNER));
  t.ok('the guide uses no relative designer link (fails linkcheck)', !/\]\(\.\.\/+designer\//.test(page));
  t.ok('the guides index links the page', index.includes('(gear-designer/)'));
  t.ok('the README links the designer', readme.includes(DESIGNER));
  for (const s of ['#d=', 'Import design', "Show the ones that don't fit", 'Modify a book vehicle', 'World item', 'Vehicle Designer']) {
    t.ok(`the guide covers "${s}"`, page.includes(s));
  }
}
