/** Orthodox decker user mode: the 0.9.0 migration, Log On and Log Off · MDF p.10 · TODO 128. */
import { readFileSync } from 'node:fs';
import { OrthodoxMode as M } from '../scripts/data/orthodox-mode.mjs';

export const name = 'orthodox-mode';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const decker = (over = {}) => ({
  type: 'character',
  system: { matrixUserMode: '', orthodoxDeck: { mccp: 6 }, orthodoxRunState: { currentHostId: 'h1' }, ...over },
});

export async function run(t) {
  // Migration
  t.eq('a logged-on decker with a deck and no mode becomes VR-Hot', M.migrationDelta(decker()), { 'system.matrixUserMode': 'VR-Hot' });
  t.eq('an NPC decker too', M.migrationDelta({ ...decker(), type: 'npc' }), { 'system.matrixUserMode': 'VR-Hot' });
  t.eq('a mode already saved is never touched, even Tortoise', M.migrationDelta(decker({ matrixUserMode: 'TRM' })), null);
  t.eq('VR-Cold is kept too', M.migrationDelta(decker({ matrixUserMode: 'VR-Cold' })), null);
  t.eq('a decker between runs (no host) gets nothing', M.migrationDelta(decker({ orthodoxRunState: { currentHostId: '' } })), null);
  t.eq('no run state at all gets nothing', M.migrationDelta(decker({ orthodoxRunState: undefined })), null);
  t.eq('a character with no deck stats gets nothing', M.migrationDelta(decker({ orthodoxDeck: { mccp: 0 } })), null);
  t.eq('no deck data at all gets nothing', M.migrationDelta(decker({ orthodoxDeck: undefined })), null);
  t.eq('an IC is not a decker', M.migrationDelta({ ...decker(), type: 'ic' }), null);
  t.eq('a host is not a decker', M.migrationDelta({ ...decker(), type: 'host' }), null);
  t.eq('a vehicle is not a decker', M.migrationDelta({ ...decker(), type: 'vehicle' }), null);
  const done = decker();
  done.system.matrixUserMode = M.migrationDelta(done)['system.matrixUserMode'];
  t.eq('a second run yields null (idempotent)', M.migrationDelta(done), null);

  // Log On
  t.eq('Log On uses the mode chosen', M.modeFor('AR', 'VR-Cold'), 'AR');
  t.eq('…else the decker\'s current mode', M.modeFor('', 'VR-Cold'), 'VR-Cold');
  t.eq('…else VR-Hot', M.modeFor('', ''), 'VR-Hot');
  t.eq('a nonsense mode is not accepted', M.modeFor('Plaid', undefined), 'VR-Hot');
  t.eq('Log On writes host, a fresh tally and alert, and the mode', M.logOnUpdate('h9', 'TRM', ''), {
    'system.orthodoxRunState.currentHostId': 'h9', 'system.orthodoxRunState.securityTally': 0,
    'system.orthodoxRunState.alertLevel': 'none', 'system.matrixUserMode': 'TRM',
  });

  // Log Off
  t.eq('Log Off clears the host, the tally, the alert AND the mode', M.logOffUpdate(), {
    'system.orthodoxRunState.currentHostId': '', 'system.orthodoxRunState.securityTally': 0,
    'system.orthodoxRunState.alertLevel': 'none', 'system.matrixUserMode': '',
  });

  // Wiring
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  const mig = read('scripts/SR3EMigrations.js');
  t.ok('Log On asks for the mode and applies logOnUpdate', sheet.includes('id="ortho-mode-sel"') && sheet.includes('OrthodoxMode.logOnUpdate('));
  t.ok('Log Off applies logOffUpdate', sheet.includes('OrthodoxMode.logOffUpdate()'));
  t.ok('the migration is registered, 0.9.0, actors and unlinked tokens through fixActor', mig.includes('OrthodoxMode.migrationDelta(actor)') && mig.includes("version: '0.9.0'"));
}
