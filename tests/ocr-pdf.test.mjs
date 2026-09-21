/**
 * `tools/ocr-pdf.ps1` — OCR for the image-only books · TODO 117.
 *
 * ⚠ **A PowerShell script cannot be unit-tested by this runner**, so this is a source-level check,
 * like `tests/gm-writes.test.mjs` and `tests/explosion-carry.test.mjs`. What it pins is the handful
 * of things that were each found the hard way and would otherwise be silently "tidied" away:
 * the `-LiteralPath`, the UTF-8 write, the two WinRT return types, and the honest account of what
 * the output is and is not good for.
 */
import { readFileSync } from 'node:fs';

export const name = 'ocr-pdf';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const src = read('tools/ocr-pdf.ps1');

  /* ── The trap that cost an hour ───────────────────────────────────────────── */
  // ⚠ `Resolve-Path` treats [ ] as a WILDCARD CHARACTER CLASS, and these filenames are full of
  //   them ("[no-text]"). A plain Resolve-Path returns nothing and the failure surfaces far away,
  //   as "Empty path name is not legal" from ReadAllBytes.
  t.ok('the path is resolved with -LiteralPath', /Resolve-Path -LiteralPath \$Pdf/.test(src));
  t.ok('…and never without it', !/Resolve-Path\s+\$Pdf/.test(src));
  t.ok('…with the reason recorded at the line', /wildcard character class/.test(src));
  t.ok('the output path is written with -LiteralPath too', /Set-Content -LiteralPath/.test(src));

  /* ── Encoding ─────────────────────────────────────────────────────────────── */
  // ⚠ Set-Content defaults to the ANSI codepage; ¥ and — are all over this text.
  t.ok('the text file is written as UTF-8 explicitly', /Set-Content[^\n]*-Encoding utf8/.test(src));

  /* ── The two WinRT return types, both of which threw before they were right ── */
  // ⚠ DataWriter.FlushAsync is IAsyncOperation<bool>, NOT IAsyncAction — awaiting it as an action
  //   throws "Object of type 'System.__ComObject' cannot be converted to Windows.Foundation.IAsyncAction".
  t.ok('FlushAsync is awaited as IAsyncOperation<bool>', /AwaitOp \(\$writer\.FlushAsync\(\)\) \(\[bool\]\)/.test(src));
  // …while RenderToStreamAsync genuinely is an IAsyncAction.
  t.ok('RenderToStreamAsync is awaited as an action', /AwaitAct \(\$pg\.RenderToStreamAsync/.test(src));
  // ⚠ A stream, not a StorageFile: no broker, and no trouble with { } [ ] in the path.
  t.ok('the PDF is loaded from a stream, not a StorageFile', /LoadFromStreamAsync/.test(src)
    && !/GetFileFromPathAsync/.test(src));

  /* ── It must not pretend to be better than it is ──────────────────────────── */
  // The header is the only place anyone learns where to trust the output. Measured against
  // Shadowtech: page numbers and availability codes are clean, prices are not.
  t.ok('the header says prices do not survive', /prices do not survive/i.test(src));
  t.ok('…and names the substitutions seen', /FOOOY|I\.coo/.test(src));
  t.ok('…and says to verify anything that changes a die roll', /verify against the page/i.test(src));
  t.ok('…and points at pdftotext first, for the books that already have a text layer',
    /pdftotext/.test(src) && /already have a text layer/i.test(src));

  /* ── Defaults that matter ─────────────────────────────────────────────────── */
  // ⚠ Scale is the single biggest lever on accuracy, so the default must not be the cheap one.
  t.ok('the default scale is 4', /\[double\]\$Scale = 4\.0/.test(src));
  t.ok('…and the header says why', /biggest lever/i.test(src));
  // Layout is reconstructed from word boxes; reading order alone separates a label from its value.
  t.ok('layout is rebuilt from the word bounding boxes', /BoundingRect/.test(src));
  t.ok('…and nothing is overwritten when two words collide',
    /Never overwrite what is already there/.test(src));

  /* ── It reads, and writes only where it was told ──────────────────────────── */
  const writes = [...src.matchAll(/\b(Set-Content|Out-File|Add-Content|Remove-Item|New-Item)\b/g)]
    .map(m => m[1]);
  t.eq('the only writers are the output file and its directory',
    [...new Set(writes)].sort(), ['New-Item', 'Set-Content']);
  t.ok('it never deletes anything', !/Remove-Item/.test(src));
}
