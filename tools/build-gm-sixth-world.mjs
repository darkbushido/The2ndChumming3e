#!/usr/bin/env node
/**
 * Build the GM-only journal "The Sixth World after October 2059" into packs-src/sr3e-gm-sixth-world.
 *
 * Why it exists (the maintainer, 2026-10-11): the public guide's World pages (guides/world/) describe
 * the Sixth World as of **October 2059**, the table's campaign date, so the players can read them. The
 * SR3 core book and *New Seattle* go on to 2060–61. Those later events are the GM's: they ship here,
 * in a compendium declared `PLAYER: NONE` in system.json, so every SR3 table has them and no player
 * can open them.
 *
 * ⚠ The text is a summary in our own words with the printed page for each claim — never the books'
 *   prose. Dates are the books' own; where a book gives only a year, the page says so.
 * ⚠ Ids are DERIVED from names (the repo rule: re-runs reuse keys). Run, then `npm run packs:build`.
 *
 *   node tools/build-gm-sixth-world.mjs
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rmSync } from 'node:fs';
import { writeSourceDir } from './lib/pack-source.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PACK = 'sr3e-gm-sixth-world';

/** The same derivation as tools/patch-johnson-stats.mjs: stable 16-hex ids from a string. */
export function idFor(text) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 16);
}

const cite = s => `<em>(${s})</em>`;

/** The journal's pages, in reading order. HTML; every claim carries its page. */
export const PAGES = [
  {
    name: 'Read me first',
    html: `
<p><strong>GM only.</strong> This compendium is hidden from players. The public guide's World pages
describe the Sixth World as of <strong>October 2059</strong>. Everything here happens after that,
as the SR3 core book (set in 2060) and <em>New Seattle</em> (posts dated 2060) describe it.</p>
<p>Reveal it when your campaign reaches it, or change it: it's your world.</p>
<p><em>Hidden, not secret:</em> players don't see this compendium in Foundry, but the system is public, so
a determined player could find it in the system's files or from the browser console.</p>
<p>Where a book gives only a year, this journal says so. The core book's history and
<em>New Seattle</em>'s Shadowland posts are in-character sources: treat "runners claim" as rumour.</p>`,
  },
  {
    name: 'The Renraku Arcology shutdown',
    html: `
<h2>December 2059: the arcology goes dark</h2>
<p>On an evening just before Christmas 2059, the Renraku Arcology's systems went off-line, and
Renraku sealed it from the public with no comment ${cite('SR3 p.35; NS p.30')}. The UCAS military had
stepped in by January 2060 ${cite('SR3 p.35')}. More than 100,000 people were sealed inside, among
them <strong>Governor Schultz</strong>, who had gone there for a meeting. <strong>Charles
Lindstrom</strong> took charge of the metroplex and promised to protect those trapped; runners doubt he
wants her back ${cite('NS p.30, p.76')}.</p>
<h2>Joint Task Force Seattle</h2>
<ul>
<li>The UCAS sent <strong>Joint Task Force Seattle</strong>: five thousand soldiers and airmen under
<strong>Brigadier General Angela Colloton</strong> ${cite('NS p.78')}.</li>
<li>Humanis recruits from the <strong>Metroplex Guard</strong>, and some Guard officers hold Humanis
posts. After Guardsmen were arrested for racially motivated attacks on metahuman soldiers, Colloton
purged officers from the Guard. Both the Guard and Humanis now look for ways to get her removed
${cite('NS p.78')}.</li>
<li>The extra UCAS troops revived old hostilities with the NAN and the Salish-Shidhe ${cite('NS p.81')}.</li>
</ul>
<h2>Renraku afterwards</h2>
<ul>
<li>Renraku's president, <strong>Inazo Aneki</strong>, is on indefinite leave. <strong>Tadashi
Marushige</strong>, a troubleshooter with a reputation for making heads roll, is acting director of
Renraku North America ${cite('NS p.94')}.</li>
<li>Renraku Seattle works from a <strong>new compound in Bellevue</strong>. Its once laid-back
security is now aggressive, and its Matrix security "double-ultra-paranoid", with cascading black ice
${cite('NS p.94')}.</li>
<li>In 2060 Renraku's Corporate Court representative was killed in a terrorist bombing in New Delhi
${cite('SR3 p.35')}; see <em>Fuchi, Novatech and the Court</em>.</li>
</ul>`,
  },
  {
    name: 'Fuchi, Novatech and the Court',
    html: `
<h2>2060: Fuchi is dissolved</h2>
<p>By October 2059, Richard Villiers has already formed <strong>Novatech</strong> and is quietly
buying his Fuchi North America holdings into it ${cite('SR3 p.35')}. In 2060 the corp war claimed Fuchi:
Villiers took his part to Novatech, and the other two factions bought and married into
<strong>Renraku</strong> and <strong>Shiawase</strong>, which absorbed the rest until Fuchi was
officially dissolved ${cite('SR3 p.35')}. The core book's narrator says the Big Eight have become
"the Big-No-One-Knows-How-Many" ${cite('SR3 p.35')}.</p>
<ul>
<li><strong>The Court hasn't ruled</strong> on Fuchi's subsidiaries: Novatech, Renraku and Shiawase all
claim them, and each works to make its claim the strongest ${cite('NS p.95')}.</li>
<li><strong>Renraku</strong> survives on its alliance with the Nakatomi family's part of Fuchi
${cite('NS p.94')}.</li>
<li><strong>Shiawase</strong> moves into cyberware with former Fuchi assets ${cite('NS p.95–96')}.</li>
<li><strong>Pacific Rim Communications</strong> buys up the telecomm contracts Fuchi lost
${cite('NS p.87')}.</li>
</ul>
<h2>Novatech in Seattle</h2>
<ul>
<li>Villiers's ex-wife <strong>Samantha Villiers</strong> runs Novatech Seattle from the former Fuchi
compound downtown, stripped of every Fuchi logo ${cite('NS p.93–94')}.</li>
<li><strong>William Ager</strong>, Fuchi's old "resources adjuster", now runs Novatech's black ops in
Seattle and hires runners as needed ${cite('NS p.94')}.</li>
<li>The shadow war between Novatech downtown and Renraku in Bellevue has already begun
${cite('NS p.94')}.</li>
</ul>
<h2>2060: Cross takes Renraku's seat</h2>
<p>After Renraku's representative died in the New Delhi bombing, <strong>Cross Applied
Technologies</strong> was given Renraku's seat on the Corporate Court, which the core book says must
have made Damien Knight furious ${cite('SR3 p.35')}. (Wuxing had already taken Fuchi's seat in 2059.)</p>`,
  },
  {
    name: 'The Seattle underworld',
    html: `
<p><em>New Seattle</em> gives no year for these two changes. It reports them in posts dated 2060. They
follow O'Malley's death on New Year's Day 2058 ${cite('NS p.97')}, so place them where your campaign
needs them.</p>
<h2>The Mafia: Bigio becomes capo</h2>
<p>After O'Malley's death, his daughter Rowena took the Finnigan Family and the families fought for
control. The Commissione put Don Leo McCaskill of Milwaukee in charge of the situation. When the dust
settled, on McCaskill's advice it appointed <strong>Maurice "Butcher" Bigio</strong> capo of Seattle
${cite('NS p.97')}. Vince Ciarniello sided with Bigio ${cite('NS p.100')}; Rowena O'Malley, with "Uncle
Al" Cavalieri behind her, may yet challenge him ${cite('NS p.100')}.</p>
<h2>The yakuza break with Japan</h2>
<p>Hanzo Shotozumi declared the Seattle yakuza independent of the Watada-rengo in Japan, as the
<strong>Shotozumi-rengo</strong>. Akira Watada and the loyalist clans in California are angered, and a
new shadow war is expected, though there have been no reprisals yet ${cite('NS p.101')}. His
wakagashira-hosa, Miko Ishikawa, spies for the Watada-rengo ${cite('NS p.101')}.</p>
<ul>
<li><strong>Mitsuhama</strong> loses the yakuza help it relied on and hires more shadowrunners instead
${cite('NS p.92–93')}.</li>
<li><strong>Japan</strong> loses shadow assets in Seattle, and a yakuza civil war is possible
${cite('NS p.81')}.</li>
<li>Runners predict a temporary <strong>Triad–Shotozumi alliance</strong> against Mitsuhama and the
Japan-loyal yakuza ${cite('NS p.96')}.</li>
</ul>`,
  },
];

/** The journal and its pages as pack entries (key → value), ids derived from names. */
export function entries() {
  const jid = idFor(`${PACK}:journal`);
  const now = 1791800000000;   // fixed, so a re-run writes identical files
  const stats = { coreVersion: '14.365', systemId: 'The2ndChumming3e', systemVersion: '0.6.3',
    createdTime: now, modifiedTime: now, lastModifiedBy: null, compendiumSource: null, duplicateSource: null, exportSource: null };
  const out = new Map();
  const pageIds = PAGES.map(p => idFor(`${PACK}:page:${p.name}`));
  out.set(`!journal!${jid}`, {
    _id: jid, name: 'The Sixth World after October 2059 (GM only)', pages: pageIds, folder: null, sort: 0,
    ownership: { default: 0 }, flags: { The2ndChumming3e: { gmOnly: true } }, categories: [], _stats: stats,
  });
  PAGES.forEach((p, i) => {
    out.set(`!journal.pages!${jid}.${pageIds[i]}`, {
      _id: pageIds[i], name: p.name, type: 'text', title: { show: true, level: 1 },
      text: { content: p.html.trim(), format: 1 }, sort: (i + 1) * 100000,
      ownership: { default: -1 }, flags: {}, system: {}, _stats: stats,
    });
  });
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(ROOT, 'packs-src', PACK);
  rmSync(dir, { recursive: true, force: true });
  writeSourceDir(dir, entries());
  console.log(`wrote ${dir} (${PAGES.length} pages)`);
}
