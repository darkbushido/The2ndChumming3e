// Extracts the page scans (DCTDecode JPEG streams) from an image-only PDF, in object order.
// For scanned books with no text layer; the output JPEGs can be viewed directly.
// usage: node tools/pdf-jpegs.mjs <pdf> <outdir> [firstIndex] [lastIndex]
import fs from 'fs';
const [pdf, out, from = 0, to = 1e9] = process.argv.slice(2);
const buf = fs.readFileSync(pdf);
fs.mkdirSync(out, { recursive: true });
const s = buf.toString('latin1');
const re = /(\d+) 0 obj\s*<<([\s\S]*?)>>\s*stream\r?\n/g;
let m, i = 0;
while ((m = re.exec(s))) {
  const dict = m[2];
  if (!/DCTDecode/.test(dict) || !/Subtype\s*\/Image/.test(dict)) continue;
  const start = m.index + m[0].length;
  const lenM = dict.match(/\/Length (\d+)(?! 0 R)/);
  let end = s.indexOf("endstream", start); while (buf[end-1] === 0x0a || buf[end-1] === 0x0d) end--;
  const w = (dict.match(/\/Width (\d+)/) || [])[1], h = (dict.match(/\/Height (\d+)/) || [])[1];
  if (i >= +from && i <= +to) fs.writeFileSync(`${out}/img${String(i).padStart(4,'0')}_obj${m[1]}_${w}x${h}.jpg`, buf.subarray(start, end));
  i++;
}
console.log('jpeg images:', i);
