# SR3 Table Reference

Unofficial Shadowrun 3rd Edition reference pages, published with GitHub Pages.
Every rule cites a book and printed page. See `sources.md` for abbreviations and
how the pages were checked.

## Editing

Pages are Markdown. Front matter `parent` and `nav_order` place a page in the
sidebar.

- `{: .fixed }` above a blockquote marks a correction to the original gist. These
  are hidden unless the reader ticks **Show corrections** in the header.
- `{: .house }` marks a house rule, meaning material that isn't in any book.

## Preview locally

```bash
bundle install
bundle exec jekyll serve
```

Then open <http://localhost:4000/sr3-guides/>.

## Publishing

`.github/workflows/pages.yml` builds and deploys on every push to `main`. One-time
setup: repository **Settings → Pages → Source: GitHub Actions**. If the repository
is renamed, change `baseurl` in `_config.yml` to match.
