# SR3 Table Reference

Unofficial Shadowrun 3rd Edition reference pages, published with GitHub Pages.
Every rule cites a book and printed page. See `sources.md` for abbreviations and
how the pages were checked.

This folder is part of The 2nd Chumming (the Foundry system in the rest of this
repo). Each release of the system publishes the guides as they stood at that
version: `/v0.6.0/`, the newest at `/latest/`, all of them at `/versions/`.

## Editing

Pages are Markdown. Front matter `parent` and `nav_order` place a page in the
sidebar.

- `{: .fixed }` above a blockquote marks a correction to the original gist. These
  are hidden unless the reader ticks **Show corrections** in the header.
- `{: .house }` marks a house rule, meaning material that isn't in any book.

## Preview locally

From this folder:

```bash
bundle install
bundle exec jekyll serve
```

Then open <http://localhost:4000/The2ndChumming3e/>.

## Publishing

A release tag publishes the site — `.github/workflows/release.yml` at the repo
root. One-time setup: repository **Settings → Pages → Source: Deploy from a
branch**, `gh-pages`.
