<#
.SYNOPSIS
  OCR a scanned PDF to text, using only what ships with Windows.

.DESCRIPTION
  Most of the SR2 library is image-only: `pdftotext` returns nothing, and this machine has no
  tesseract, poppler, Ghostscript, ImageMagick or PyMuPDF. Windows 10/11 already carries both
  halves of the job:

    Windows.Data.Pdf   rasterises a page to a bitmap at any resolution
    Windows.Media.Ocr  reads it  (run `Get-WinUserLanguageList` to see installed languages)

  So this needs no install and adds no dependency to the repo.

  ⚠ **Layout is reconstructed from word boxes, not from reading order.** Windows OCR returns a
  bounding rectangle per word, so a stat table can be rebuilt with its columns intact. Reading
  order alone puts "Availability" and "3/72 hrs" many lines apart, which is useless for the
  thing this exists for — sourcing book/page and availability codes for TODO 117.

.PARAMETER Pdf     The file. ⚠ Always passed with -LiteralPath internally; see the warning below.
.PARAMETER From    First PDF page (1-based). Default 1.
.PARAMETER To      Last PDF page. Default: the last page.
.PARAMETER Out     Write here instead of stdout. Pages are separated by a form feed, like pdftotext.
.PARAMETER Scale   Render multiplier. ⚠ **4.0 is materially better than 2.0** and costs little —
                   it is the single biggest lever on accuracy. Default 4.0.
.PARAMETER Columns 2 splits the page down the middle and emits left then right. Use it for
                   two-column body text; leave it off for full-width tables.
.PARAMETER Raw     Skip layout reconstruction and emit OCR reading order.

.EXAMPLE
  # One page, to look at it
  .\tools\ocr-pdf.ps1 -Pdf "C:\...\Shadowrun 2e - Street Samurai Catalog {FASA7104}.pdf" -From 40 -To 40

.EXAMPLE
  # A whole book to a file, two-column mode
  .\tools\ocr-pdf.ps1 -Pdf "C:\...\{FASA7901}.pdf" -Columns 2 -Out rawdata\ocr\sr2-core.txt

.NOTES
  ⚠ **-LiteralPath is mandatory.** `Resolve-Path` treats `[` `]` as a wildcard character class and
  these filenames are full of them ("[no-text]"), so a plain Resolve-Path silently returns nothing
  and you get "Empty path name is not legal" from somewhere else entirely.

  ⚠ **What it is reliable for.** Measured against *Shadowtech* (a heavily stylised book):
  page numbers, availability codes ("3/72 hrs", "Always") and Street Index come through clean;
  body text carries a few errors per paragraph; **prices do not survive** — the ¥ glyph and
  stylised digits read as "FOOOY", "I.coo*", "8000*". Treat the output as a research aid, and for
  anything that changes a die roll follow the project's standing rule: verify against the page.

  ⚠ **Some books already have a text layer.** Try `pdftotext -layout` first; it is exact and
  instant. As of 2026-09-21 seven of the 35 SR2 files do.

  ~2 seconds per page at scale 4 (the PDF is loaded once for the whole run).
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Pdf,
  [int]$From = 1,
  [int]$To = 0,
  [string]$Out = '',
  [double]$Scale = 4.0,
  [int]$Columns = 0,
  [switch]$Raw
)
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime
foreach ($t in 'Windows.Data.Pdf.PdfDocument', 'Windows.Media.Ocr.OcrEngine',
               'Windows.Graphics.Imaging.BitmapDecoder', 'Windows.Storage.Streams.DataWriter',
               'Windows.Storage.Streams.InMemoryRandomAccessStream') {
  $null = [Type]::GetType("$t, Windows.Foundation, ContentType=WindowsRuntime")
}

# WinRT async -> .NET Task. PowerShell 5.1 has no await, so the extension methods are reflected out.
$ext = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asTaskOp = $ext | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$asTaskAct = $ext | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.FullName -eq 'Windows.Foundation.IAsyncAction' } | Select-Object -First 1

function AwaitOp($op, $type) {
  $task = $asTaskOp.MakeGenericMethod($type).Invoke($null, @($op))
  try { $task.Wait(-1) | Out-Null } catch { throw $_.Exception.InnerException }
  $task.Result
}
function AwaitAct($act) {
  $task = $asTaskAct.Invoke($null, @($act))
  try { $task.Wait(-1) | Out-Null } catch { throw $_.Exception.InnerException }
}

# ⚠ -LiteralPath: see the note in the header. This is the line that bites.
$full = (Resolve-Path -LiteralPath $Pdf).ProviderPath
Write-Verbose "reading $full"

# Hand PdfDocument a stream rather than a StorageFile: no broker, and no trouble with { } [ ]
# in the path. The whole file is read once and the document reused for every page.
$bytes  = [System.IO.File]::ReadAllBytes($full)
$stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
$writer = New-Object Windows.Storage.Streams.DataWriter($stream)
$writer.WriteBytes($bytes)
AwaitOp ($writer.StoreAsync()) ([uint32]) | Out-Null
AwaitOp ($writer.FlushAsync()) ([bool]) | Out-Null    # DataWriter.FlushAsync is IAsyncOperation<bool>
$writer.DetachStream() | Out-Null
$stream.Seek(0) | Out-Null

$doc = AwaitOp ([Windows.Data.Pdf.PdfDocument]::LoadFromStreamAsync($stream)) ([Windows.Data.Pdf.PdfDocument])
$pageCount = [int]$doc.PageCount
if ($To -le 0 -or $To -gt $pageCount) { $To = $pageCount }
if ($From -lt 1) { $From = 1 }
if ($From -gt $To) { throw "no pages to do: From $From, To $To (the file has $pageCount)" }

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $engine) {
  throw 'No OCR engine for your profile languages. Settings > Time & language > Language, and add the optional "Basic typing" / OCR feature.'
}

$sb = New-Object System.Text.StringBuilder
$clock = [System.Diagnostics.Stopwatch]::StartNew()
Write-Host "OCR: $([System.IO.Path]::GetFileName($full)) pages $From-$To of $pageCount, scale $Scale$(if ($Columns -eq 2) { ', two columns' })" -ForegroundColor Cyan

for ($p = $From; $p -le $To; $p++) {
  $pg  = $doc.GetPage([uint32]($p - 1))
  $img = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opts.DestinationWidth = [uint32]($pg.Size.Width * $Scale)
  AwaitAct ($pg.RenderToStreamAsync($img, $opts))
  $img.Seek(0) | Out-Null

  $decoder = AwaitOp ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($img)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap  = AwaitOp ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $res     = AwaitOp ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

  $null = $sb.AppendLine("=== PDF page $p ===")

  if ($Raw) {
    foreach ($line in $res.Lines) { $null = $sb.AppendLine($line.Text) }
  } else {
    # Flatten to words with boxes, then rebuild rows and columns from the geometry.
    $words = foreach ($line in $res.Lines) {
      foreach ($w in $line.Words) {
        [pscustomobject]@{ Text = $w.Text; X = $w.BoundingRect.X; Y = $w.BoundingRect.Y
                           W = $w.BoundingRect.Width; H = $w.BoundingRect.Height }
      }
    }
    if (-not $words) {
      $null = $sb.AppendLine('(no text recognised on this page)')
    } else {
      # A rough character advance, so columns land where they do on the page.
      $avgW = ($words | Measure-Object -Property W -Average).Average
      $avgL = ($words | ForEach-Object { [math]::Max(1, $_.Text.Length) } | Measure-Object -Average).Average
      $charW = [math]::Max(4, [int]($avgW / $avgL))
      $medH  = ($words | Sort-Object H | Select-Object -Index ([int]($words.Count / 2))).H
      if ($medH -le 0) { $medH = 10 }

      $bands = if ($Columns -eq 2) {
        $mid = $bitmap.PixelWidth / 2
        @(
          @{ Name = 'left';  Words = @($words | Where-Object { ($_.X + $_.W / 2) -lt $mid }); Origin = 0 },
          @{ Name = 'right'; Words = @($words | Where-Object { ($_.X + $_.W / 2) -ge $mid }); Origin = $mid }
        )
      } else {
        @(@{ Name = ''; Words = $words; Origin = 0 })
      }

      foreach ($band in $bands) {
        if ($band.Name) { $null = $sb.AppendLine("--- $($band.Name) column ---") }
        $rows = @{}
        foreach ($w in $band.Words) {
          # Group by vertical centre: words within ~0.8 of a line height share a row.
          $key = [int][math]::Round(($w.Y + $w.H / 2) / ($medH * 0.8))
          if (-not $rows.ContainsKey($key)) { $rows[$key] = New-Object System.Collections.ArrayList }
          $null = $rows[$key].Add($w)
        }
        foreach ($k in ($rows.Keys | Sort-Object)) {
          $line = ''
          foreach ($w in ($rows[$k] | Sort-Object X)) {
            $col = [int](($w.X - $band.Origin) / $charW)
            # Never overwrite what is already there — push right instead, so nothing is lost.
            if ($col -lt $line.Length) { $col = $line.Length + 1 }
            $line = $line.PadRight($col) + $w.Text
          }
          $null = $sb.AppendLine($line.TrimEnd())
        }
      }
    }
  }
  $null = $sb.Append("`f")

  if (($p - $From + 1) % 10 -eq 0 -or $p -eq $To) {
    $done = $p - $From + 1
    $total = $To - $From + 1
    $rate = $clock.Elapsed.TotalSeconds / $done
    $left = [TimeSpan]::FromSeconds($rate * ($total - $done))
    Write-Host ("  {0}/{1} pages  {2:N1}s each  ~{3:mm\:ss} left" -f $done, $total, $rate, $left)
  }
}

if ($Out) {
  $dir = Split-Path -Parent $Out
  if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  # ⚠ utf8 explicitly: Set-Content defaults to the ANSI codepage, and ¥ and — are all over this text.
  Set-Content -LiteralPath $Out -Value $sb.ToString() -Encoding utf8
  Write-Host "wrote $Out ($([math]::Round($sb.Length / 1KB)) KB, $($To - $From + 1) pages in $([math]::Round($clock.Elapsed.TotalSeconds))s)" -ForegroundColor Green
} else {
  $sb.ToString()
}
