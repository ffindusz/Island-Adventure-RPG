import type { ContentDefinition } from '../core';
import { shipwreckCoast } from './areas/shipwreck-coast';
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
  monsterTypes,
  areas: [shipwreckCoast],
  start: { area: shipwreckCoast.id, tile: { col: 4, row: 5 } },
};
