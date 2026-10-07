import type { ContentDefinition } from '../core';
import { overgrownTrail } from './areas/overgrown-trail';
import { shipwreckCoast } from './areas/shipwreck-coast';
import { gear } from './gear';
import { healingPotion } from './healing-potion';
import { hero } from './hero';
import { monsterTypes } from './monsters';
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
  healingPotion,
  gear,
  monsterTypes,
  areas: [shipwreckCoast, overgrownTrail],
  start: { area: shipwreckCoast.id, tile: { col: 4, row: 5 } },
};
