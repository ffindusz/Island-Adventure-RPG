import type { Point } from '../core';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from './config';

// Where the screen looks at an Adventure Area. The view follows the hero, but never shows anything beyond the edge of
// the map, and an area smaller than the screen sits in the middle of it. This is the adapter's own business: the Game
// core's interface says nothing about the camera.

/** The point of the area, in canvas pixels, at the top left of the screen. Negative where a small area is centred. */
export interface Scroll {
  readonly x: number;
  readonly y: number;
}

/** Where to scroll to, to show an area of the given size in tiles with the hero (a point in tiles) in the middle. */
export function scrollFor(hero: Point, area: { readonly width: number; readonly height: number }): Scroll {
  return {
    x: scrollAlong(hero.x * TILE_SIZE, area.width * TILE_SIZE, VIEW_WIDTH),
    y: scrollAlong(hero.y * TILE_SIZE, area.height * TILE_SIZE, VIEW_HEIGHT),
  };
}

/** One axis, in whole canvas pixels so that every shape stays on pixels and crisp. */
function scrollAlong(focus: number, areaSize: number, viewSize: number): number {
  if (areaSize <= viewSize) {
    return Math.floor((areaSize - viewSize) / 2);
  }
  return Math.min(areaSize - viewSize, Math.max(0, Math.round(focus - viewSize / 2)));
}
