# CLAUDE.md — SR3 Table Reference

Read this before editing pages. It explains what the site is for, the rules every page
follows, where the sources are, and the traps already hit while building it.

## What this folder is

A public, **unofficial Shadowrun 3rd Edition rules reference**, published with GitHub Pages
at **https://darkbushido.github.io/The2ndChumming3e/** — one frozen copy per release of the
system (`/v0.6.0/`), the newest at `/latest/`, all listed at `/versions/`.

⚠ **It lives in `guides/` of The2ndChumming3e since 2026-09-15** (TODO 127 there), imported
from the old `darkbushido/sr3-guides` repo with its history. That repo takes no more commits.
**The site is published only by a release tag** (the root CLAUDE.md, *Releases*): a guide page
changes what players read at the next release, together with the code it describes.

It began as fifteen Gemini-generated gists
(combat, grenades, healing, magic, SINs, gear and fencing, cyberware grades, and eight
"hiring" guides). Every one of them was checked against the rulebooks and rewritten, and
most were substantially wrong.

It is the **player-facing companion** to **The 2nd Chumming** (the rest of this repo), the same
maintainer's unofficial SR3 system for Foundry VTT v14. That system rolls the dice (Rule of
Six and Rule of One, pools, staging), tracks wounds and modifiers, and prompts each player
for their own decisions. By design it **never applies outcomes**: the GM clicks the wound
boxes, judges the situation, and edits any number. So the table still needs a readable
statement of the rules, with page numbers, and that is this site.

The two projects share:

- **A citation convention.** Rules cite the **printed** page, e.g. *(SR3 p.113)*, never the
  PDF page. The Foundry repo's CLAUDE.md uses the same convention and audits many of the
  same rules (dodge resolution, staging past Deadly, grenade range TNs, cyberware grades,
  and Essence permanence). When a page here and the Foundry code disagree, **check the
  book**; don't copy either one.
- **The PDF library**: `C:\Users\lance\Documents\Shadowrun 3rd Edition PDFs`.

This folder has no game code, and none of it ships in the system's zip. It's Markdown, a Jekyll theme, and two small Node tools.

## Rules for every page

1. **Every rule carries a book and printed page.** Use `*(SR3 p.113)*` style, with the
   abbreviations on `sources.md`. Tables are **transcribed from the book**, not paraphrased.
2. **Verify against the PDF, never against memory, the old gists, or the Foundry code.**
   Read the page around every match; two-column pages scramble when extracted (see below).
3. **Corrections** to the original gists go in a `{: .fixed }` blockquote at the top of the
   page, starting `> Original gist: "…".` They are **hidden by default**. Readers turn them
   on with the *Show corrections* checkbox (`_includes/header_custom.html`,
   `_includes/head_custom.html`), which remembers the choice in `localStorage`.
4. **Anything not in a book** goes in a `{: .house }` blockquote (house rule), such as the
   specialist day rates on the hiring pages. Don't present an invented number as a rule.
5. **Use SR3 terms, not SR4/SR5 terms.** Gemini mixed editions freely. Known substitutions
   are listed on `sources.md` ("Rules from other editions"): Spell Pool not Magic Pool,
   material link not sympathetic link, Legality Codes like `6P-E` not R/F, Blue, Green,
   Orange and Red hosts (no Yellow), Drain written `+1(M)`, and Improved Reflexes (the adept
   power) versus Increase Reflexes (the spell).
6. **Show worked examples with the arithmetic**, and check it. Five of the eight original
   hiring examples didn't add up.

## Source books

`C:\Users\lance\Documents\Shadowrun 3rd Edition PDFs`. Books marked `[no-text]` are scans.

| Code | Book | Text layer | PDF page = printed page + |
| :--- | :--- | :--- | :---: |
| SR3 | Core Rules (FAN25000) | yes | **2** |
| M&M | Man & Machine: Cyberware | yes | **2** |
| MitS | Magic in the Shadows | yes | **1** |
| Matrix | Matrix | yes | **1** |
| MJLBB | Mr. Johnson's Little Black Book | yes | **1** |
| SOTA64 | State of the Art 2064 (in `Supplements\`) | yes | **1** |
| R3 | Rigger 3 Revised | poor OCR | check each page |
| SRComp | Shadowrun Companion (in `Supplements\`) | **no** | image index = page |

Always confirm an offset against the page footer before citing; they vary by book.

### Extracting text

`pdftotext` ships with Git for Windows. It's the **xpdf** build, not poppler, so there's
**no `-x/-y/-W/-H`**.

```bash
pdftotext -layout -f 282 -l 282 "<pdf>" -      # one page, layout preserved
pdftotext -layout -f 282 -l 282 -marginr 308 "<pdf>" -   # left column only
pdftotext -layout -f 282 -l 282 -marginl 308 "<pdf>" -   # right column only
pdftotext -table  -f 282 -l 282 "<pdf>" -      # best for tables
```

Pages are about 616 × 795 pt. Two-column pages merge columns line by line, so crop with
the margins or use `-table` before trusting a table.

### Scanned books

The Read tool **can't render PDF pages here** (no `pdftoppm`). For image-only PDFs, pull the
page scans out and view the JPEGs:

```bash
node tools/pdf-jpegs.mjs "<pdf>" <outdir> 95 106   # images 95–106; index = page in SRComp
```

## Site structure

Jekyll 4 with the **Just the Docs** theme gem (0.12), built by GitHub Actions.

| Path | What |
| :--- | :--- |
| `index.md`, `sources.md` | Home, and abbreviations / method / what couldn't be verified |
| `rules/` | combat, reloading, grenades, healing |
| `magic/` | the Awakened primer |
| `street/` | SINs, buying gear and fencing, cyberware grades |
| `hiring/` | book payment rules (`index.md`) plus eight specialist pages |
| `_config.yml` | site settings, callout types, `permalink: pretty`, default layout |
| `_includes/head_custom.html` | fonts, digital-rain script, corrections-toggle CSS |
| `_includes/header_custom.html` | the *Show corrections* checkbox |
| `_includes/title.html` | pyramid-and-sun emblem beside the site title |
| `_sass/custom/setup.scss` | fonts and the **`$sw-*` palette** |
| `_sass/color_schemes/sixthworld.scss` | theme colour variables (`color_scheme: sixthworld`) |
| `_sass/custom/custom.scss` | the "Sixth World" look: fret bands, notched callouts, tables |
| `tools/linkcheck.mjs` | internal link and anchor checker for `_site` |
| `../.github/workflows/release.yml` | builds and publishes the site on a release tag |

Sidebar placement comes from front matter: `parent:` and `nav_order:`. A section's
`index.md` has `has_children: true`.

## Build, check, publish

```bash
bundle install                      # gems go to vendor/bundle (local config)
bundle exec jekyll serve            # http://localhost:4000/The2ndChumming3e/ (run from guides/)
bundle exec jekyll build
node tools/linkcheck.mjs            # must report 0 problems before committing
```

- **Before every commit:** build, then run the link checker. There are no other tests.
- **`_config.yml` changes need the server restarted.** Page edits hot-reload.
- **Publishing:** a release tag (`v0.6.0`) — not a push. The workflow builds the site with a
  per-version `baseurl` (`/The2ndChumming3e/v0.6.0`, `/latest`) and `sr3e_version`, which the
  header shows, and commits both to the `gh-pages` branch. Pages **Source** is *Deploy from a
  branch*, `gh-pages`.
- **`baseurl` in `_config.yml` is for local preview only**; the release overrides it. Renaming
  the repo needs no change here — the workflow reads the repo name.

## Traps already hit

- **Headings with citations get ugly auto-IDs**, e.g. `fencing-the-loot--sr3-p237238`, which
  change whenever the citation does. Any heading that another page links to needs an
  explicit ID on the next line: `{: #fencing-the-loot }`.
- **Links are relative and end in `/`** (`../combat/`), because of `permalink: pretty`. From
  a page at `/street/sins/`, a sibling is `../gear-and-fencing/` and a top-level page is
  `../../sources/`.
- **Plain Jekyll applies no layout** unless `_config.yml` sets a default (it does). Without
  it, pages render unstyled.
- **The `$sw-*` palette must stay in `setup.scss`.** The theme also compiles its stock light
  and dark stylesheets, which don't load `sixthworld.scss`; custom CSS that uses `$sw-*` then
  fails with "Undefined variable".
- **Don't give `.side-bar` `position: relative`.** The theme fixes it in place at desktop
  widths; overriding that drops the sidebar into the page flow and leaves a huge gap.
- **Git Bash rewrites `/The2ndChumming3e`** into a Windows path when passed as an argument. The
  link checker defaults to the right value; pass it explicitly only with
  `MSYS_NO_PATHCONV=1`.
- **The digital rain is off under `prefers-reduced-motion`**, and the Browser preview pane
  reports reduced motion, so it never shows there. The pane also stops painting once a
  page is scrolled; screenshots only work at the top of a freshly loaded page.
- **Liquid**: `{{` or `{%` in page text is processed by Jekyll. Wrap literal ones in
  `{% raw %}`.
- The theme prints many **Sass deprecation warnings**. They're upstream and harmless.

## Open work

See `TODO.md`.
