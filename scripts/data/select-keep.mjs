/**
 * Keep a document's value in a <select> whose list does not hold it · TODO 123. **Pure — no Foundry.**
 *
 * The sheets submit on change, and a <select> with no option matching the stored value shows (and
 * submits) its FIRST option. So a value outside the list — a pack spell's "LOS(A)" range, a category the
 * list predates, a GM's own houserule — was silently replaced the next time ANY field on the sheet was
 * edited. Returning the value as its own selected option keeps it until someone picks another.
 */
const esc = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function keepValueOption(value, opts = []) {
  if (value === undefined || value === null || value === '') return '';
  const listed = opts.some(o => (typeof o === 'string' ? o : o?.value) === value);
  return listed ? '' : `<option value="${esc(value)}" selected>${esc(value)}</option>`;
}
