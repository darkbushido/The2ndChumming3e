import { SR3ESourceBooks } from './SR3ESourceBooks.js';

/**
 * Compendium sidebar that hides packs belonging to disabled source books.
 *
 * Foundry already has the hiding mechanism: `_preparePackContext` returns a
 * `hidden` flag (used for the document-type filter chips) and the pack template
 * renders `{{#if hidden}}hidden{{/if}}` on each entry. Overriding that is far more
 * robust than deleting DOM nodes on a render hook — it survives re-renders, needs
 * no jQuery, and rides the same path core uses.
 *
 * Registered on CONFIG.ui.compendium at init.
 *
 * NOTE this hides, it does not unload. The packs stay in `game.packs`, so anything
 * holding a direct reference keeps working; the item pickers apply the same filter
 * separately (see SR3EItem._packsForType).
 */
export class SR3ECompendiumDirectory extends foundry.applications.sidebar.tabs.CompendiumDirectory {

  /** @inheritDoc */
  _preparePackContext(pack) {
    const ctx = super._preparePackContext(pack);
    // Preserve core's own reason for hiding (the type filter) — only ever add to it.
    if (!SR3ESourceBooks.packAllowed(pack)) ctx.hidden = true;
    return ctx;
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#hideEmptyFolders();
  }

  /**
   * Collapse folders left with nothing visible in them.
   *
   * Core doesn't do this for its own type filter, but switching a whole book off can
   * empty an entire branch (all of Matrix, say), and a tree of empty folders reads as
   * broken. Deepest-first so a parent sees its children's final state.
   *
   * `hidden` is the same attribute core's search loop skips over (`if (el.hidden) continue`),
   * so a hidden folder stays hidden while searching rather than flickering back.
   */
  #hideEmptyFolders() {
    const folders = [...this.element.querySelectorAll('.directory-item.folder')].reverse();
    for (const folder of folders) {
      folder.hidden = !folder.querySelector(
        '.directory-item.compendium:not([hidden]), .directory-item.folder:not([hidden])'
      );
    }
  }
}
