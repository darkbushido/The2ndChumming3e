import { SOURCE_BOOKS, defaultAllowedBooks } from './config.js';

const SYS     = 'The2ndChumming3e';
const SETTING = 'allowedBooks';

/**
 * Which source books are in play, and the plumbing that hides the rest.
 *
 * Every compendium pack declares its origin with `flags.The2ndChumming3e.book`.
 * A pack whose book is switched off is hidden from the compendium sidebar and
 * skipped by the item pickers — but it is still loaded, so nothing that already
 * references its contents breaks. This is a presentation filter, not an unload.
 */
export class SR3ESourceBooks {

  /** The stored map, merged over the defaults so a new book is not silently off. */
  static get allowed() {
    let stored = {};
    try { stored = game.settings.get(SYS, SETTING) ?? {}; } catch { /* pre-init */ }
    return { ...defaultAllowedBooks(), ...stored };
  }

  /** Is this book's content currently in play? Unknown books default to visible. */
  static isAllowed(code) {
    if (!code) return true;                       // packs with no book flag are system content
    const a = this.allowed;
    return code in a ? !!a[code] : true;
  }

  /** The book a pack belongs to, or null for system-authored packs. */
  static bookOf(pack) {
    return pack?.metadata?.flags?.[SYS]?.book ?? null;
  }

  /** Should this pack's contents be offered anywhere? */
  static packAllowed(pack) {
    return this.isAllowed(this.bookOf(pack));
  }

  /* ---------------------------------------------------------------------- */

  static register() {
    game.settings.register(SYS, SETTING, {
      scope: 'world',
      config: false,                              // edited through the menu below
      type: Object,
      default: defaultAllowedBooks(),
      // Re-render the sidebar so the change shows without a reload. The item
      // pickers are transient dialogs that re-read the filter each time they open,
      // so the sidebar is the only persistent UI that needs nudging.
      onChange: () => ui.compendium?.render(),
    });

    game.settings.registerMenu(SYS, 'allowedBooksMenu', {
      name: 'Source Books',
      label: 'Configure Source Books',
      hint: 'Choose which sourcebooks are in play. Content from books you switch off is hidden from the compendium sidebar and from item pickers.',
      icon: 'fas fa-book',
      type: SR3ESourceBooksConfig,
      restricted: true,
    });
  }
}

/* -------------------------------------------------------------------------- */

/** Checkbox list for the Source Books setting. */
export class SR3ESourceBooksConfig extends foundry.applications.api.ApplicationV2 {

  // Deliberately NOT tag:'form'. The usual sheet rule (tag:'form' + submitOnChange) is
  // for document sheets that persist per-field; this writes one settings object on Save,
  // and a bare form element with no form.handler throws if it ever gets submitted.
  static DEFAULT_OPTIONS = {
    id: 'sr3e-source-books',
    classes: ['sr3e', 'sr3e-source-books'],
    window: { title: 'SR3E — Source Books', resizable: true },
    position: { width: 480, height: 560 },
  };

  async _renderHTML(_ctx, _opts) {
    const div = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto;padding:8px;';
    div.innerHTML = this._build();
    return div;
  }

  _replaceHTML(result, content, _opts) { content.replaceChildren(result); }

  _build() {
    const allowed = SR3ESourceBooks.allowed;
    const counts  = SR3ESourceBooks._packCounts();

    const row = ([code, b]) => {
      const on = allowed[code] !== false;
      const n  = counts[code] ?? 0;
      return `
        <label class="sr3e-book-row" style="display:flex;align-items:flex-start;gap:8px;padding:6px 4px;
               border-bottom:1px solid var(--sr-border);cursor:pointer">
          <input type="checkbox" data-book="${code}" ${on ? 'checked' : ''}
                 style="width:14px;height:14px;margin-top:3px;accent-color:var(--sr-accent);flex-shrink:0"/>
          <span style="flex:1">
            <span style="font-weight:500">${b.label}</span>
            ${b.fan ? '<span style="font-size:10px;color:var(--sr-amber);margin-left:6px">fan publication</span>' : ''}
            <span style="font-size:11px;color:var(--sr-muted);margin-left:6px">${n} pack${n === 1 ? '' : 's'}</span>
            ${b.note ? `<div style="font-size:10px;color:var(--sr-dim);margin-top:2px">${b.note}</div>` : ''}
          </span>
        </label>`;
    };

    return `
      <p style="font-size:12px;color:var(--sr-muted);margin:0 0 8px">
        Content from books you switch off is hidden from the compendium sidebar and skipped by
        item pickers. Nothing is deleted, and characters already using that content keep it.
      </p>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <button type="button" data-preset="all"     style="font-size:11px">Select all</button>
        <button type="button" data-preset="none"    style="font-size:11px">Select none</button>
        <button type="button" data-preset="default" style="font-size:11px">Defaults</button>
      </div>
      <div class="sr3e-book-list">${Object.entries(SOURCE_BOOKS).map(row).join('')}</div>
      <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:10px">
        <button type="button" data-action="save" style="font-weight:600">Save</button>
      </div>`;
  }

  _onRender(_ctx, _opts) {
    const el = this.element;

    el.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.preset;
        const defs = defaultAllowedBooks();
        el.querySelectorAll('input[data-book]').forEach(cb => {
          cb.checked = mode === 'all' ? true
            : mode === 'none' ? false
            : defs[cb.dataset.book] !== false;
        });
      });
    });

    el.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      const next = {};
      el.querySelectorAll('input[data-book]').forEach(cb => { next[cb.dataset.book] = cb.checked; });
      await game.settings.set(SYS, SETTING, next);
      const off = Object.values(next).filter(v => !v).length;
      ui.notifications.info(`SR3E: source books updated — ${off} book${off === 1 ? '' : 's'} hidden.`);
      this.close();
    });
  }
}

/** How many packs each book contributes — shown in the config list. */
SR3ESourceBooks._packCounts = function () {
  const out = {};
  for (const pack of game.packs ?? []) {
    const b = SR3ESourceBooks.bookOf(pack);
    if (b) out[b] = (out[b] ?? 0) + 1;
  }
  return out;
};
