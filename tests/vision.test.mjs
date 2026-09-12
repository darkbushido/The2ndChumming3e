/**
 * Which vision a character has — SR3ECombatModifiers.detectVision / visionReminder · TODO 99.
 *
 * A REMINDER for the GM's TN windows, not a selection: the GM still picks the Visibility row.
 * The rules it must get right are the ones that make naive detection wrong:
 *
 *   · replaced eyes LOSE racial vision (SR3 p.299), and so do Cat's Eyes (M&M p.64);
 *   · a low-light/thermo implant alone does NOT mean replaced eyes — p.299 offers retinal
 *     modification instead — so racial vision is kept unless the replacement is on the sheet;
 *   · Cat's Eyes are NATURAL on the table (M&M p.64), cybereyes are cybernetic;
 *   · Thermosense Organs are a heat sense, not vision (M&M p.75), despite the name.
 *
 * No Foundry stubs: this module is pure data and pure functions.
 */
const { detectVision, visionReminder, escapeHTML, SR3E_RACIAL_VISION } =
  await import('../scripts/SR3ECombatModifiers.js');

export const name = 'vision';

export async function run(t) {
  const actor = (metatype, ...items) => ({
    name: 'Kestrel', system: { metatype },
    items: items.map(([type, name]) => ({ type, name })),
  });
  const cols = list => list.map(v => v.column).join(',');

  /* ── Racial vision · SR3 p.56 ─────────────────────────────────────────────────────── */
  t.is('elf: natural low-light',          cols(detectVision(actor('elf')).natural),   'lowLight');
  t.is('ork: natural low-light',          cols(detectVision(actor('ork')).natural),   'lowLight');
  t.is('dwarf: natural thermographic',    cols(detectVision(actor('dwarf')).natural), 'thermo');
  t.is('troll: natural thermographic',    cols(detectVision(actor('troll')).natural), 'thermo');
  t.is('human: nothing',                  cols(detectVision(actor('human')).natural), '');
  t.is('free-text metatype is matched',   cols(detectVision(actor(' Troll ')).natural), 'thermo');
  t.is('table has exactly the four metahumans',
    Object.keys(SR3E_RACIAL_VISION).sort().join(), 'dwarf,elf,ork,troll');

  /* ── Cyber vision, as the packs spell it ──────────────────────────────────────────── */
  for (const n of ['Eyes, Low-Light', 'Low Light', 'Low Light Vision', 'Low-light']) {
    t.is(`"${n}" reads as cyber low-light`, cols(detectVision(actor('human', ['cyberware', n])).cyber), 'lowLight');
  }
  for (const n of ['Eyes, Thermographic', 'Thermographic', 'Thermographic Vision']) {
    t.is(`"${n}" reads as cyber thermographic`, cols(detectVision(actor('human', ['cyberware', n])).cyber), 'thermo');
  }
  /* Names that look close and are not vision. */
  for (const n of ['Eyes, Light Systems', 'Eyes, L BrightLight', 'Ear Low Freq', 'Eye Laser (Low Power)',
                   'Eyes, Flare Compensation']) {
    t.is(`"${n}" is not vision`, cols(detectVision(actor('human', ['cyberware', n])).cyber), '');
  }
  t.is('Thermosense Organ (bioware, M&M p.75) is not vision',
    cols([...detectVision(actor('human', ['bioware', 'Thermosense Organ'])).natural,
          ...detectVision(actor('human', ['bioware', 'Thermosense Organ'])).cyber]), '');
  t.is('a gear item named low-light is out of scope',
    cols(detectVision(actor('human', ['gear', 'Goggles (low-light)'])).cyber), '');

  /* ── ⚠ Replaced eyes lose racial vision · SR3 p.299 ───────────────────────────────── */
  const replaced = detectVision(actor('elf', ['cyberware', 'Eyes, Cyber Replacement'], ['cyberware', 'Eyes, Low-Light']));
  t.is('elf with cybereyes: racial low-light is gone', cols(replaced.natural), '');
  t.is('…the cyber low-light remains',                 cols(replaced.cyber),   'lowLight');
  t.is('…and says what replaced them',                 replaced.replacedBy,    'Eyes, Cyber Replacement');
  t.is('a "Cybereyes …" item counts as replacement',
    detectVision(actor('dwarf', ['cyberware', 'Cybereyes Zeiss [2]'])).natural.length, 0);

  /* ⚠ An implant alone is not a replacement — retinal modification exists (p.299). */
  const retinal = detectVision(actor('elf', ['cyberware', 'Eyes, Low-Light']));
  t.is('elf with only a low-light implant keeps natural low-light', cols(retinal.natural), 'lowLight');
  t.is('…and has the cyber one too',                                cols(retinal.cyber),   'lowLight');

  /* ── ⚠ Cat's Eyes · M&M p.64 — natural, and they cost the racial vision ───────────── */
  const cat = detectVision(actor('dwarf', ['bioware', "Cat's Eyes"]));
  t.is("dwarf with Cat's Eyes: thermographic lost, low-light (NATURAL) gained", cols(cat.natural), 'lowLight');
  t.is("…the natural entry names Cat's Eyes", cat.natural[0].source, "Cat's Eyes");
  t.is("…and no cyber vision",                cols(cat.cyber), '');

  /* ── The line the GM reads ────────────────────────────────────────────────────────── */
  t.is('troll',
    visionReminder('Tor', detectVision(actor('troll'))), 'Tor (troll): Thermographic (natural)');
  t.is('human with nothing',
    visionReminder('Joe', detectVision(actor('human'))), 'Joe: normal vision only');
  t.ok('elf with cybereyes names the loss and the page',
    /Low-Light \(cybernetic\) — Eyes, Low-Light · racial low-light lost to Eyes, Cyber Replacement \(SR3 p\.299\)/
      .test(visionReminder('Kestrel', replaced)));
  t.ok('elf with an implant only explains why natural is kept',
    /Low-Light \(natural\); Low-Light \(cybernetic\).*retinal modification/.test(visionReminder('Kestrel', retinal)));
  t.ok("Cat's Eyes are reported as natural, with the loss",
    /Low-Light \(natural\) — Cat's Eyes · racial thermographic lost to Cat's Eyes/
      .test(visionReminder('Brokk', cat)));

  /* An actor with no system/items at all (a vehicle, a stub) must not throw. */
  t.is('no actor data: normal vision', visionReminder('Drone', detectVision({})), 'Drone: normal vision only');

  /* Names are free text and go into window markup. */
  t.is('escapeHTML escapes markup', escapeHTML(`<b>"O'Neil" & co</b>`),
    '&lt;b&gt;&quot;O&#39;Neil&quot; &amp; co&lt;/b&gt;');
}
