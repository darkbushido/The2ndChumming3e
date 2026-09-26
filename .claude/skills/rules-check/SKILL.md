---
name: rules-check
description: Produce the TODO 121 rules-check record for a release — every unit of every guides/ page resolved against the PDFs and the code, with evidence a script re-verifies. Use when asked to do, redo, continue or finish the rules check / guide validation for a version. Never used to "quickly" write the record.
---

# Rules check (TODO 121)

The output is `audit/rules-check-<version>.md`, and **only `tools/rules-ledger.mjs report` writes it**. You never
hand-write it, and you never edit it. What you produce is the **ledger**, `audit/rules-ledger-<version>.json`.

**Version** is bare (`0.6.0`), matching what `npm run preflight -- --version v0.6.0` looks for.

## The rule that makes this repeatable: nothing is assumed

- **The PDF is the authority.** Not `guides/`, not the code, not `CLAUDE.md`. Library: `C:\Users\lance\Documents\Shadowrun 3rd Edition PDFs`.
- **The book text the ledger reads is the OCR text** (`tools/lib/book-pages.mjs`): the untracked `SR-OCR/` in the checkout, else
  a `darkbushido/Shadowrun-OCR` clone beside the repo; the PDFs only for a book it lacks or with `SR3_BOOK_SOURCE=pdf`
  (`SR3_OCR_DIR` / `SR3_PDF_DIR` override the paths). One `pdftotext -layout` dump
  per book, pages split by form feeds, so `pdfPage` is the form-feed page. `check` says which source it read. Scanned books
  (`[no-text]`) are real OCR and can misread a digit: a number that matters and looks wrong is `unverifiable` until someone
  reads the page image — never "corrected" in the quote.
- **`CLAUDE.md` and `.claude/rules/` are never evidence.** It describes the code; it is not the code. Every `code[]` entry is a line you opened and read
  in this session.
- **A guide line is not evidence about the code.** The guides were checked against the books, not against this system.
- **Absence is proven by search, not by not having seen it.** "The code doesn't do this" is `not-implemented` with a `search`
  pattern the script re-runs; it is never inferred from a place you did not look.
- **If you cannot find it, that is `unverifiable` with the reason** — not `match`, and not `diverges`.
- **Do not fix anything during the check.** Not the code, not the guides. A fix changes the thing being checked. Divergences
  go to the maintainer; fixes are separate commits afterwards, and the ledger is re-run.
- **Do not decide.** A `diverges` is a finding, not a ruling. Whether it is a bug, a house rule or a deliberate simplification is the maintainer's.

## Procedure

1. **Enumerate.** `node tools/rules-ledger.mjs init <version>`. This splits every page under `guides/` into units (table rows, list
   items, paragraphs, code blocks) — so coverage is a count, not a judgement. Re-running merges: units whose text is unchanged keep
   their verdict. Run `status <version>` and report the totals.
2. **Work one page at a time, in the order `status` lists them.** For each unit on the page, in order, set exactly one verdict
   (below). Do not skip a unit because it looks like prose; `no-rule-claim` is a verdict you must justify, and the script rejects it
   if the unit cites a page or a modifier.
3. **For every unit that states a rule** (a number, a TN, a stage, a cost, a sequence, an "always/never/only"):
   1. Find the passage in the PDF. Extract with `pdftotext -f <pdfPage> -l <pdfPage> -marginr 308 "<pdf>" -` (left column) and
      `-marginl 308` (right); read the whole surrounding paragraph, not just the matching line. Get the **printed** page from the
      page footer, not from an offset you remember.
      From the OCR text: `node -e` over the book's `.txt`, `split('\f')[pdfPage - 1]`, then `splitColumns()` from
      `tools/lib/book-pages.mjs` to read one column at a time. A table row is one line of the layout text — quote it as a row.
   2. Copy a quote of the deciding sentence, exactly (25+ characters). The script confirms it appears on that PDF page.
   3. Open the code that implements it and read it. Record `file`, `line`, and a `snippet` you can see at that line. Search widely
      first (`Grep` for the concept under several spellings — the packs and code abbreviate).
   4. Compare **the PDF to the code**, and separately **the PDF to the guide**. Three-way agreement is `match`. Set the verdict from
      what you read, and say how in `note` for anything but `match`.
4. **Write entries with a script, not by hand-editing the JSON.** Load the ledger, set fields by `id`, save. One page's entries per
   write; run `check` after each page and fix every FAULT before moving on.
5. **Resumable.** The ledger is the progress. Commit it after each page. A new session starts with `status` and takes the first page
   with UNCHECKED units.
6. **Finish.** `node tools/rules-ledger.mjs check <version>` must print "all N units resolved and every piece of evidence
   re-verified." Then `node tools/rules-ledger.mjs report <version>`. If `check` fails, the report says **PARTIAL** — say so; do not
   argue with it.
7. **Hand it over.** Give the maintainer the counts, every `diverges`, `guide-differs`, `not-implemented` and `unverifiable`
   entry, and nothing else decided. Do not commit `rules-check-<version>.md` until they have read it.

## Verdicts (what `check` enforces)

| Verdict | Means | Must carry |
|---|---|---|
| `match` | guide, PDF and code agree | `pdf[]`, `code[]` |
| `diverges` | the code differs from the PDF | `pdf[]`, `code[]`, `note` |
| `guide-differs` | the guide differs from the PDF | `pdf[]`, `note` |
| `not-implemented` | a real rule the code does not model | `pdf[]`, `search[]` (re-run; must find nothing) |
| `unverifiable` | could not be checked | `reason` |
| `no-rule-claim` | states no rule (heading, flavour, navigation, a house rule marked as such) | `reason` |

Evidence shapes:

```json
"pdf":    [{ "file": "Shadowrun 3e - Core Rules {FAN25000}.pdf", "pdfPage": 121, "printedPage": 119, "quote": "…exact words, 25+ chars…" }],
"code":   [{ "file": "scripts/documents/SR3EActor.js", "line": 4771, "snippet": "Math.floor(Math.max(0, Number(impact) || 0) / 2)" }],
"search": [{ "pattern": "castGlitch", "path": "scripts" }]
```

## Traps

- **Two-column pages scramble**: quote from one column at a time. A quote spanning a column break will not verify; quote the part
  in one column.
- **A table row is one unit.** Verify each row against the book's table, not the table's general shape.
- **Hiring pages** mix book rules with `{: .house}` house rules. A house rule is `no-rule-claim` with that as the reason; a book
  rule (a payment rule, a skill) is checked like any other.
- **Rules that live in other books** (M&M, MitS, Matrix, R3, MDF): the `file` is that book's PDF; check the offset against the footer.
  Books marked `[no-text]` in `guides/CLAUDE.md` have no text layer — those units are `unverifiable` with that reason unless you
  can read them another way and say how.
- **Not modelled on purpose is still `not-implemented`.** Whether it was deliberate is the maintainer's; you only report that it is absent.
- **Budget.** The ledger is large (about 1,200 units for 0.6.0). Do one page per chunk of work and commit; do not fan out to
  parallel agents — the earlier attempts at that produced nothing.
