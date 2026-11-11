/**
 * Token senses — low-light, thermographic, ultrasound, astral · TODO 299.
 *
 * The pure rules in `scripts/data/token-senses.mjs`, plus source-level checks on `scripts/SR3ESenses.js` (which
 * needs Foundry's canvas classes and cannot be imported here). Decisions settled with the maintainer 2026-11-11:
 *
 * - SR3 p.112: low-light needs SOME light (Full Darkness +8/+8) — dim→bright only.
 * - Glass blocks thermographic only when the GM flags the wall (house rule; the book is silent).
 * - M&M p.20: ultrasound ignores invisibility; walls stop it by their SOUND setting; 50 m is a house default.
 * - SR3 pp.172-173: perceiving keeps ordinary walls; a projecting form is stopped only by ward walls; astral-only
 *   forms are seen only by astral sight; an aura shows Awakened/mundane and nothing more without a roll.
 */
import { readFileSync } from 'node:fs';
import { TokenSenses as TS } from '../scripts/data/token-senses.mjs';
const { detectVision } = await import('../scripts/SR3ECombatModifiers.js');

export const name = 'token-senses';

const SYS = 'The2ndChumming3e';
const item = (type, name, flags = {}) => ({ type, name, system: {}, flags: { [SYS]: flags } });
const actor = (metatype, items = []) => ({ system: { metatype }, items });
const senses = a => TS.mundaneSenses(a, detectVision(a));

export async function run(t) {
  /* ── Sources ───────────────────────────────────────────────────────────────────────────── */
  t.eq('human, nothing fitted: normal only', senses(actor('human')).modes, ['normal']);
  t.eq('elf: low-light (SR3 p.56)', senses(actor('elf')).modes, ['lowLight', 'normal']);
  t.eq('troll: thermographic (SR3 p.56)', senses(actor('troll')).modes, ['thermo', 'normal']);
  t.eq('elf + thermographic eyes: thermo first, low-light kept (retinal mod, p.299)',
    senses(actor('elf', [item('cyberware', 'Eyes, Thermographic')])).modes, ['thermo', 'lowLight', 'normal']);
  t.eq('dwarf with replacement cybereyes loses racial thermo (p.299)',
    senses(actor('dwarf', [item('cyberware', 'Eyes, Cyber Replacement')])).modes, ['normal']);

  const goggles = item('gear', 'Goggles - Low Light + Thermographic', { worn: true });
  t.eq('worn goggles grant both', senses(actor('human', [goggles])).modes, ['thermo', 'lowLight', 'normal']);
  t.eq('goggles carried but not worn grant nothing',
    senses(actor('human', [item('gear', 'Goggles - Thermographic')])).modes, ['normal']);
  t.eq('worn goggles in storage grant nothing',
    senses(actor('human', [item('gear', 'Goggles - Thermographic', { worn: true, stored: true })])).modes, ['normal']);
  t.ok('Shades - Low Light is vision gear', TS.isVisionGear('Shades - Low Light'));
  t.ok('Thermo Vision (Armor) helmet mod is vision gear', TS.isVisionGear('Thermo Vision (Armor)'));
  t.ok('a weapon scope is not token vision', !TS.isVisionGear('Imaging Scope, Thermographic (Weapon)'));
  t.ok('an ultrasound sight on a gun is not token vision', !TS.isVisionGear('Ultrasound Sight (Weapon)'));
  t.ok('an ultrasound detector is not vision (core p.293)', !TS.isVisionGear('Ultrasound Detector'));
  t.ok('binoculars are held, not worn', !TS.isVisionGear('Binoculars - Thermographic'));
  t.ok('Personal Thermostat is not thermographic', !TS.isVisionGear('Personal Thermostat'));
  t.eq('adept Improved Sense: Thermo Vision',
    senses(actor('human', [item('adeptpower', 'Imp. Sense: Thermo Vision')])).modes, ['thermo', 'normal']);
  t.ok('cyber ultrasound eyes give ultrasound', senses(actor('human', [item('cyberware', 'Eyes, Ultrasound')])).ultrasound);
  t.ok('worn ultrasound goggles give ultrasound',
    senses(actor('human', [item('gear', 'Ultrasound Goggles', { worn: true })])).ultrasound);
  t.ok('an elf has no ultrasound', !senses(actor('elf')).ultrasound);
  t.eq('ultrasound is a vision mode too — sonar shows the room', senses(actor('human', [item('cyberware', 'Eyes, Ultrasound')])).modes, ['ultrasound', 'normal']);
  t.eq('thermo and low-light rank above ultrasound', senses(actor('elf', [item('cyberware', 'Eyes, Ultrasound')])).modes, ['lowLight', 'ultrasound', 'normal']);
  t.is('an ultrasound-only token defaults to sonar', TS.visionModeFor(['ultrasound', 'normal'], ''), TS.VISION.ultrasound);
  t.is('sonar walls follow SOUND', TS.polygonSense(TS.VISION.ultrasound, ''), 'ultrasound');
  t.ok('sonar sees the walls around it: a solid wall still bounds it', TS.wallBlocks('ultrasound', { sight: 20, sound: 20, flags: {} }));

  /* ── Astral state and the chosen mode ──────────────────────────────────────────────────── */
  t.is('astralMode astral = projecting', TS.astralState('astral'), 'project');
  t.is('astralMode dual = perceiving', TS.astralState('dual'), 'perceive');
  t.is('physical = none', TS.astralState('physical'), '');
  t.is('dual-natured critter always perceives (p.173)', TS.astralState('', true), 'perceive');
  t.is('projecting beats dual-natured', TS.astralState('astral', true), 'project');

  t.is('best mode by default', TS.visionModeFor(['thermo', 'lowLight', 'normal'], ''), TS.VISION.thermo);
  t.is('a chosen mode the token has is honoured', TS.visionModeFor(['thermo', 'lowLight', 'normal'], '', 'lowLight'), TS.VISION.lowLight);
  t.is('a chosen mode the token lost falls back to best', TS.visionModeFor(['lowLight', 'normal'], '', 'thermo'), TS.VISION.lowLight);
  t.is('astral replaces any mundane mode', TS.visionModeFor(['thermo', 'normal'], 'perceive', 'thermo'), TS.VISION.astral);
  t.is('normal maps to Foundry basic', TS.visionModeFor(['normal'], ''), 'basic');

  /* ── Detection modes ───────────────────────────────────────────────────────────────────── */
  const ids = o => o.map(m => m.id);
  t.eq('troll: thermographic detection', ids(TS.detectionModesFor({ modes: ['thermo', 'normal'] })), [TS.DETECTION.thermo]);
  t.eq('low-light adds NO detection mode — it needs light (p.112)', TS.detectionModesFor({ modes: ['lowLight', 'normal'] }), []);
  const us = TS.detectionModesFor({ modes: ['normal'], ultrasound: true });
  t.is('ultrasound range is the 50 m house default', us[0].range, 50);
  t.is('ULTRASOUND_RANGE is 50', TS.ULTRASOUND_RANGE, 50);
  t.eq('astral adds astral sight', ids(TS.detectionModesFor({ modes: ['normal'], astral: 'perceive' })), [TS.DETECTION.astral]);

  const upd = TS.detectionUpdate(
    { [TS.DETECTION.ultrasound]: { enabled: true, range: 20 }, [TS.DETECTION.astral]: { enabled: true, range: null }, basicSight: { enabled: true, range: 10 } },
    TS.detectionModesFor({ modes: ['normal'], ultrasound: true }));
  t.eq('the GM-edited ultrasound range survives', upd[TS.DETECTION.ultrasound], { enabled: true, range: 20 });
  t.eq('astral sight no longer applying is disabled, not deleted', upd[TS.DETECTION.astral], { enabled: false, range: null });
  t.ok('core basicSight is never touched', !('basicSight' in upd));

  /* ── Walls ─────────────────────────────────────────────────────────────────────────────── */
  const glass = { sight: 0, sound: 10, flags: { [SYS]: { glass: true } } };
  const plainGlass = { sight: 0, sound: 10, flags: {} };
  const wall = { sight: 20, sound: 20, flags: {} };
  const ward = { sight: 0, sound: 0, flags: { [SYS]: { ward: 5 } } };
  const curtain = { sight: 20, sound: 0, flags: {} };
  t.ok('flagged glass blocks thermographic', TS.wallBlocks('thermo', glass));
  t.ok('unflagged glass does not block thermographic', !TS.wallBlocks('thermo', plainGlass));
  t.ok('flagged glass does not block normal sight', !TS.wallBlocks('sight', glass));
  t.ok('a solid wall blocks thermographic', TS.wallBlocks('thermo', wall));
  t.ok('ultrasound follows SOUND: glass (sound set) blocks it', TS.wallBlocks('ultrasound', plainGlass));
  t.ok('ultrasound follows SOUND: a curtain (sound off) does not', !TS.wallBlocks('ultrasound', curtain));
  t.ok('a projecting form passes an ordinary wall (p.173)', !TS.wallBlocks('project', wall));
  t.ok('a ward stops a projecting form', TS.wallBlocks('project', ward));
  t.ok('a ward with sight off does not stop ordinary sight', !TS.wallBlocks('sight', ward));
  t.is('ward Force read from the flag', TS.wardForce(ward), 5);
  t.is('no ward flag = Force 0', TS.wardForce(wall), 0);
  t.is('a negative ward Force reads 0', TS.wardForce({ flags: { [SYS]: { ward: -3 } } }), 0);

  t.is('projecting in astral vision: the project polygon', TS.polygonSense(TS.VISION.astral, 'astral'), 'project');
  t.is('perceiving in astral vision keeps ordinary walls (p.172)', TS.polygonSense(TS.VISION.astral, 'dual'), 'sight');
  t.is('thermographic vision: the thermo polygon', TS.polygonSense(TS.VISION.thermo, ''), 'thermo');
  t.is('projecting but not in astral vision (GM override): ordinary walls', TS.polygonSense('basic', 'astral'), 'sight');

  /* ── Who is seen, and what an aura shows ──────────────────────────────────────────────── */
  t.ok('a projecting character is astral-only', TS.isAstralOnly({ astralMode: 'astral' }));
  t.ok('a spirit marked sr3e-astral is astral-only', TS.isAstralOnly({ statuses: ['sr3e-astral'] }));
  t.ok('a perceiving character is physical too', !TS.isAstralOnly({ astralMode: 'dual' }));
  t.is('mage: Awakened', TS.auraKind({ type: 'character', magic: 6 }), 'awakened');
  t.is('street sam: mundane', TS.auraKind({ type: 'npc', magic: 0 }), 'mundane');
  t.is('dual-natured critter: Awakened', TS.auraKind({ type: 'npc', dualNatured: true }), 'awakened');
  t.is('a vehicle has no aura', TS.auraKind({ type: 'vehicle' }), 'none');

  /* ── Foundry side (source-level) ──────────────────────────────────────────────────────── */
  const src = readFileSync(new URL('../scripts/SR3ESenses.js', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../scripts/sr3e.js', import.meta.url), 'utf8');
  const init = main.slice(main.indexOf("Hooks.once('init'"), main.indexOf("Hooks.once('ready'"));
  t.ok('registered inside the init hook', /SR3ESenses\.register\(\)/.test(init));
  for (const id of Object.values(TS.VISION).filter(v => v !== 'basic')) t.ok(`vision mode ${id} registered`, src.includes(`[VISION.${Object.keys(TS.VISION).find(k => TS.VISION[k] === id)}]`));
  t.ok('sonar vision limits sight to the ultrasound range', /visionMode === VISION\.ultrasound\) update\['sight\.range'\] = range/.test(src));
  t.ok('sonar vision ignores lighting', /\[VISION\.ultrasound\]: new VM\([\s\S]{0,400}background: \{ visibility: V\.DISABLED \}/.test(src));
  t.ok('sonar never shows colour and fades with distance (lidar)', /\[VISION\.ultrasound\]: new VM\([\s\S]{0,700}saturation: -1, brightness: 1[\s\S]{0,5}/.test(src) && /attenuation: 0\.8, contrast: 0\.3, saturation: -1/.test(src) && !/\[VISION\.ultrasound\][\s\S]{0,500}tint/.test(src));
  t.ok('detection modes registered on CONFIG.Canvas.detectionModes', /Object\.assign\(CONFIG\.Canvas\.detectionModes/.test(src));
  t.ok('ultrasound tests the SOUND polygon (type is only a label)', /_testCollision\(visionSource, test, \{ type: 'sound'/.test(src));
  t.ok('low-light remaps DIM to BRIGHT and requires light', /levels: \{ \[L\.DIM\]: L\.BRIGHT \}[\s\S]{0,80}V\.REQUIRED/.test(src));
  t.ok('the sight polygon backend is subclassed', /CONFIG\.Canvas\.polygonBackends\.sight = SR3ESightPolygon/.test(src));
  t.ok('core lightPerception and basicSight are guarded', /\['lightPerception', P\.DetectionModeLightPerception\], \['basicSight', P\.DetectionModeDarkvision\]/.test(src));
  t.ok('no global renderDialogV2 wiring', !/renderDialogV2/.test(src));
  t.ok('dialogs wait, never render(true)', !/\.render\(true\)/.test(src));
  const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));
  for (const k of new Set(src.match(/SR3E\.Senses\.\w+/g))) t.ok(`lang has ${k}`, k in lang);
}
