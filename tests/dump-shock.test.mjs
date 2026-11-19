/** Defragged dumpshock for a crashed decker · MDF p.26-27 · TODO 128. */
import { DumpShock } from '../scripts/data/dump-shock.mjs';

export const name = 'dump-shock';

export async function run(t) {
  t.eq('VR-Hot: Serious, Physical, Power = the host\'s System Rating', DumpShock.defragged('VR-Hot', 7),
    { immune: false, power: 7, level: 'S', track: 'Physical', isStun: false, note: '' });
  t.eq('VR-Cold: Serious, Stun', [DumpShock.defragged('VR-Cold', 5).track, DumpShock.defragged('VR-Cold', 5).isStun], ['Stun', true]);
  t.eq('Tortoise is immune, with no track', [DumpShock.defragged('TRM', 6).immune, DumpShock.defragged('TRM', 6).track], [true, null]);
  t.eq('AR is immune too', DumpShock.defragged('AR', 6).immune, true);
  t.ok('the immune note names the book page and the +2', /MDF p\.27/.test(DumpShock.defragged('AR', 6).note) && /\+2/.test(DumpShock.defragged('AR', 6).note));
  t.eq('no mode set is offered as Stun, not refused', [DumpShock.defragged('', 6).immune, DumpShock.defragged('', 6).track], [false, 'Stun']);
  t.eq('Power is at least 1 and falls back to 6 on nonsense', [DumpShock.defragged('VR-Hot', 0).power, DumpShock.defragged('VR-Hot', undefined).power], [6, 6]);
  t.eq('the penalty is +2 for 10 minutes', [DumpShock.TN_PENALTY, DumpShock.TN_MINUTES], [2, 10]);

  t.ok('a crash is the box that fills the track', DumpShock.crossedFull(9, 10, 10));
  t.ok('…including a jump past it', DumpShock.crossedFull(4, 12, 10));
  t.ok('a track already full is not a new crash', !DumpShock.crossedFull(10, 10, 10));
  t.ok('a track still short of full is not a crash', !DumpShock.crossedFull(3, 9, 10));
  t.ok('healing below full and refilling is a new crash', DumpShock.crossedFull(0, 10, 10));
  t.ok('a smaller monitor crashes at its own size', DumpShock.crossedFull(5, 6, 6) && !DumpShock.crossedFull(5, 5, 6));
  t.ok('missing numbers count as zero', DumpShock.crossedFull(undefined, 10, 10));
}
