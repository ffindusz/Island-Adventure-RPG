import type { ContentDefinition } from '../core';
import { castle } from './areas/castle';
import { cave } from './areas/cave';
import { mountain } from './areas/mountain';
import { shipwreckCoast } from './areas/shipwreck-coast';
import { woods } from './areas/woods';
import { gear } from './gear';
import { healingPotion } from './healing-potion';
import { hero } from './hero';
import { monsterTypes } from './monsters';
import { opening } from './opening';
import { progression } from './progression';
import { terrain } from './terrain';

/**
 * Everything the game is made from, as data. The Game core takes it when a game is created and holds no
 * numbers or maps of its own. This folder imports only types from the core, never the other way round.
 */
export const gameContent: ContentDefinition = {
  terrain,
  hero,
  progression,
  minimumDamage: 1,
  automapRevealDistance: 4,
  healingPotion,
  gear,
  monsterTypes,
  areas: [shipwreckCoast, woods, mountain, cave, castle],
  opening,
  checkCoveredCorner: true,
  requireGuardian: true,
  start: { area: shipwreckCoast.id, tile: { col: 5, row: 9 } },
};
