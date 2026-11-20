/**
 * Spirit stats vs the core book — SR3 pp.266-268 (printed pages), checked at Force 4.
 * Table-driven: B Q S C I W E R as printed, the astral/physical Initiative bases, and each spirit's power list.
 * (Before 0.9.1 the code used ad-hoc modifiers, no Reaction, no Search, and Initiative F×2+20 for all.)
 */
import { SPIRIT_TYPES } from '../scripts/documents/SR3ESpiritSummoning.js';

export const name = 'nature-spirits';

const F = 4;
// key: [B, Q, S, R, astralInit, physInit, powers, category]
const LAND = ['Accident', 'Concealment', 'Guard', 'Materialization', 'Movement', 'Search'];
const BOOK = {
  // Spirits of Man · p.267
  city_spirit:     [F+1, F+2, F-2, F+1, F+20, F+11, ['Accident', 'Concealment', 'Confusion', 'Fear', 'Guard', 'Materialization', 'Search'], 'nature'],
  field_spirit:    [F+1, F+2, F-2, F+1, F+20, F+11, ['Accident', 'Concealment', 'Guard', 'Materialization', 'Search'], 'nature'],
  hearth_spirit:   [F+1, F+2, F-2, F+1, F+20, F+11, ['Accident', 'Concealment', 'Confusion', 'Guard', 'Materialization', 'Search'], 'nature'],
  // Spirits of the Land · p.267
  desert_spirit:   [F+4, F-2, F+4, F-2, F+20, F+8, ['Concealment', 'Guard', 'Materialization', 'Movement', 'Search'], 'nature'],
  forest_spirit:   [F+4, F-2, F+4, F-2, F+20, F+8, ['Accident', 'Concealment', 'Confusion', 'Fear', 'Guard', 'Materialization'], 'nature'],
  mountain_spirit: [F+4, F-2, F+4, F-2, F+20, F+8, LAND, 'nature'],
  prairie_spirit:  [F+4, F-2, F+4, F-2, F+20, F+8, LAND, 'nature'],
  // Spirits of the Sky · p.267
  mist_spirit:     [F-2, F+3, F-3, F+2, F+20, F+12, ['Accident', 'Concealment', 'Confusion', 'Guard', 'Materialization', 'Movement'], 'nature'],
  storm_spirit:    [F-2, F+3, F-3, F+2, F+20, F+12, ['Concealment', 'Confusion', 'Fear', 'Materialization', 'Innate Spell (Lightning Bolt)'], 'nature'],
  wind_spirit:     [F-2, F+3, F-3, F+2, F+20, F+12, ['Accident', 'Confusion', 'Guard', 'Materialization', 'Movement', 'Search'], 'nature'],
  // Spirits of the Waters · pp.267-268
  lake_spirit:     [F+2, F, F, F-1, F+20, F+9, ['Accident', 'Engulf', 'Fear', 'Guard', 'Materialization', 'Movement', 'Search'], 'nature'],
  river_spirit:    [F+2, F, F, F-1, F+20, F+9, ['Accident', 'Concealment', 'Engulf', 'Fear', 'Guard', 'Materialization', 'Movement', 'Search'], 'nature'],
  sea_spirit:      [F+2, F, F, F-1, F+20, F+9, ['Accident', 'Concealment', 'Confusion', 'Engulf', 'Fear', 'Guard', 'Materialization', 'Movement', 'Search'], 'nature'],
  swamp_spirit:    [F+2, F, F, F-1, F+20, F+9, ['Accident', 'Binding', 'Concealment', 'Confusion', 'Engulf', 'Fear', 'Guard', 'Materialization', 'Movement', 'Search'], 'nature'],
  // Elementals · p.266
  air_elemental:   [F-2, F+3, F-3, F+2, F+20, F+12, ['Engulf', 'Materialization', 'Movement', 'Noxious Breath', 'Psychokinesis'], 'elemental'],
  earth_elemental: [F+4, F-2, F+4, F-2, F+20, F+8, ['Engulf', 'Materialization', 'Movement'], 'elemental'],
  fire_elemental:  [F+1, F+2, F-2, F+1, F+20, F+11, ['Engulf', 'Flame Aura', 'Guard', 'Materialization', 'Innate Spell (Flamethrower)'], 'elemental'],
  water_elemental: [F+2, F, F, F+1, F+20, F+11, ['Engulf', 'Materialization', 'Movement'], 'elemental'],
};

export async function run(t) {
  t.eq('every spirit type is in the book table, and the table has no extras', Object.keys(SPIRIT_TYPES).sort(), Object.keys(BOOK).sort());
  for (const [key, [b, q, s, r, ia, ip, powers, cat]] of Object.entries(BOOK)) {
    const d = SPIRIT_TYPES[key], st = d.stats(F);
    t.eq(`${key}: category`, d.category, cat);
    t.eq(`${key}: B/Q/S/R at Force ${F}`, [st.body, st.quickness, st.strength, st.reaction], [b, q, s, r]);
    t.eq(`${key}: C, I, W and Magic equal Force, Essence (F)A`, [st.charisma, st.intelligence, st.willpower, st.magic, st.essence], [F, F, F, F, F]);
    t.eq(`${key}: Initiative base astral / physical`, [st.initiative, st.initiativePhysical], [ia, ip]);
    t.eq(`${key}: powers as printed`, [...d.powers].sort(), [...powers].sort());
  }
  t.eq('Sea Spirit is summonable', SPIRIT_TYPES.sea_spirit.label, 'Sea Spirit');
}
