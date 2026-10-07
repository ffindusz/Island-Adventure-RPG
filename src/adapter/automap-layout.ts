import type { AutomapAreaView, Box, Point } from '../core';

// Where the Automap page puts the areas of the route, and the shapes it draws in them, as plain numbers in canvas
// pixels, so that the arithmetic can be tested without Phaser. The page draws what this module works out.
//
// The route is laid out as cards: an area's name above its map. The cards go along a row in the order of the route and
// turn back along the next row when the row is full, like a path on a board, so that each area is next to the one that
// comes after it. Every map is drawn at the same scale: the largest of 8, 7 ... 1 pixels per tile that makes the
// whole route fit, or else a fraction of a pixel per tile.

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** What the layout needs to know of an area: the size of its map in tiles, and how wide its name is in pixels. */
export interface RouteArea {
  readonly tilesWide: number;
  readonly tilesHigh: number;
  readonly labelWidth: number;
}

export interface Metrics {
  /** The height of a name, and the space between a name and its map. */
  readonly labelHeight: number;
  readonly labelGap: number;
  /** The space between two cards in a row, and between two rows. */
  readonly cardGap: number;
  readonly rowGap: number;
  /** The widest a name is given room for: the page cuts a longer one. */
  readonly maxLabelWidth: number;
}

/** Where an area goes. */
export interface Place {
  /** The row it is in, counting from 0 at the top. */
  readonly row: number;
  /** The room the name and the map take: as wide as the wider of the two and as high as the row. */
  readonly card: Rect;
  readonly label: Rect;
  readonly map: Rect;
  /** The line through the middle of the maps of the row, the same for every card in it. */
  readonly midY: number;
}

export interface RouteLayout {
  /** Canvas pixels per tile: a whole number, or a fraction of one for areas too large for a pixel per tile. */
  readonly scale: number;
  /** One for each area, in the order of the route. */
  readonly places: readonly Place[];
}

/** No map is drawn larger than this many pixels per tile, so that a small area does not fill the page. */
const LARGEST_SCALE = 8;
/** The smallest scale is a pixel for this many tiles. A route too large for it is drawn at it all the same. */
const SMALLEST_FRACTION = 16;
/** The step of the smallest scale on the ladder of scales. */
const LAST_STEP = LARGEST_SCALE + SMALLEST_FRACTION - 2;

/** The ladder of scales: 8, 7 ... 1 pixel per tile at steps 0 to 7, then 1/2, 1/3 ... 1/16 of a pixel. */
function scaleAt(step: number): number {
  return step < LARGEST_SCALE ? LARGEST_SCALE - step : 1 / (step - LARGEST_SCALE + 2);
}

/** Where the edge between tiles falls, in pixels from the map's own edge: on the nearest whole pixel. */
export function edgeOf(scale: number, tiles: number): number {
  return Math.round(tiles * scale);
}

/** An area's sizes at one scale. */
interface Card {
  readonly index: number;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly labelWidth: number;
  readonly width: number;
}

interface Flow {
  /** The cards of each row, in the order of the route. */
  readonly rows: readonly (readonly Card[])[];
  readonly rowHeights: readonly number[];
  readonly blockHeight: number;
  /** Whether every row is no wider than the space and the rows together are no higher. */
  readonly fits: boolean;
}

function rowWidthOf(row: readonly Card[], metrics: Metrics): number {
  return row.reduce((total, card) => total + card.width, 0) + metrics.cardGap * (row.length - 1);
}

/** The areas, in the order of the route, cut into rows that are as full as the space across allows. */
function flowAt(areas: readonly RouteArea[], space: Rect, metrics: Metrics, scale: number): Flow {
  const rows: Card[][] = [];
  let rowWidth = 0;
  areas.forEach((area, index) => {
    const mapWidth = edgeOf(scale, area.tilesWide);
    const labelWidth = Math.min(area.labelWidth, metrics.maxLabelWidth);
    const card: Card = {
      index,
      mapWidth,
      mapHeight: edgeOf(scale, area.tilesHigh),
      labelWidth,
      width: Math.max(mapWidth, labelWidth),
    };
    const row = rows[rows.length - 1];
    if (row !== undefined && rowWidth + metrics.cardGap + card.width <= space.width) {
      row.push(card);
      rowWidth += metrics.cardGap + card.width;
    } else {
      rows.push([card]);
      rowWidth = card.width;
    }
  });
  const rowHeights = rows.map(
    (row) => metrics.labelHeight + metrics.labelGap + Math.max(...row.map((card) => card.mapHeight)),
  );
  const blockHeight = rowHeights.reduce((total, height) => total + height, 0) + metrics.rowGap * (rows.length - 1);
  const fits = rows.every((row) => rowWidthOf(row, metrics) <= space.width) && blockHeight <= space.height;
  return { rows, rowHeights, blockHeight, fits };
}

/**
 * Puts the route in the space, at the largest scale at which it fits. The rows are centred in the space, and so is
 * the block of them. A route that fits at no scale is laid out at the smallest one, so that every area has a place.
 */
export function layoutRoute(areas: readonly RouteArea[], space: Rect, metrics: Metrics): RouteLayout {
  let step = 0;
  let flow = flowAt(areas, space, metrics, scaleAt(step));
  while (!flow.fits && step < LAST_STEP) {
    step += 1;
    flow = flowAt(areas, space, metrics, scaleAt(step));
  }

  const places: Place[] = [];
  let rowTop = space.top + Math.max(0, Math.floor((space.height - flow.blockHeight) / 2));
  flow.rows.forEach((row, rowIndex) => {
    const rowHeight = flow.rowHeights[rowIndex] ?? 0;
    const mapSpace = rowHeight - metrics.labelHeight - metrics.labelGap;
    const mapTop = rowTop + metrics.labelHeight + metrics.labelGap;
    let left = space.left + Math.max(0, Math.floor((space.width - rowWidthOf(row, metrics)) / 2));
    // Every second row runs back, so the route turns at the end of a row and goes on from under it.
    for (const card of rowIndex % 2 === 0 ? row : [...row].reverse()) {
      places[card.index] = {
        row: rowIndex,
        card: { left, top: rowTop, width: card.width, height: rowHeight },
        label: {
          left: left + Math.floor((card.width - card.labelWidth) / 2),
          top: rowTop,
          width: card.labelWidth,
          height: metrics.labelHeight,
        },
        map: {
          left: left + Math.floor((card.width - card.mapWidth) / 2),
          top: mapTop + Math.floor((mapSpace - card.mapHeight) / 2),
          width: card.mapWidth,
          height: card.mapHeight,
        },
        midY: mapTop + Math.floor(mapSpace / 2),
      };
      left += card.width + metrics.cardGap;
    }
    rowTop += rowHeight + metrics.rowGap;
  });
  return { scale: scaleAt(step), places };
}

/** What a name that had to be cut short ends with. */
const CUT_MARK = '..';

/**
 * The name, cut from its end and finished with two dots until it is no wider than `width`. `measure` gives the width
 * of a text in the font that draws it.
 */
export function fitLabel(name: string, width: number, measure: (text: string) => number): string {
  if (measure(name) <= width) {
    return name;
  }
  for (let kept = name.length - 1; kept > 0; kept -= 1) {
    const cut = `${name.slice(0, kept)}${CUT_MARK}`;
    if (measure(cut) <= width) {
      return cut;
    }
  }
  return CUT_MARK;
}

/** Whether each area is linked to the next one in the route: an exit of either leads to the other. */
export function linkedWithNext(areas: readonly Pick<AutomapAreaView, 'id' | 'connections'>[]): boolean[] {
  return areas.slice(1).map((next, index) => {
    const previous = areas[index];
    return (
      previous !== undefined && (previous.connections.includes(next.id) || next.connections.includes(previous.id))
    );
  });
}

/**
 * The strips that draw the links, as rectangles to fill. Two maps in a row are linked across the space between them.
 * Two in different rows are linked round the end of the rows where the route turns, clear of the cards by `laneGap`.
 * `linked[i]` says whether area i is linked to area i + 1.
 */
export function routeLinks(
  layout: RouteLayout,
  linked: readonly boolean[],
  look: { readonly thickness: number; readonly laneGap: number },
): Rect[] {
  const { thickness, laneGap } = look;
  const half = Math.floor(thickness / 2);
  const strips: Rect[] = [];
  linked.forEach((isLinked, index) => {
    const from = layout.places[index];
    const to = layout.places[index + 1];
    if (!isLinked || from === undefined || to === undefined) {
      return;
    }
    if (from.row === to.row) {
      const [first, second] = from.map.left < to.map.left ? [from, to] : [to, from];
      const left = first.map.left + first.map.width;
      strips.push({ left, top: from.midY - half, width: second.map.left - left, height: thickness });
      return;
    }
    const atRight = from.row % 2 === 0;
    const lane = atRight
      ? Math.max(from.card.left + from.card.width, to.card.left + to.card.width) + laneGap
      : Math.min(from.card.left, to.card.left) - laneGap - thickness;
    // The arm from a map's side that faces the lane, across to the lane.
    const arm = (place: Place): Rect => {
      const side = atRight ? place.map.left + place.map.width : place.map.left;
      const start = Math.min(side, lane);
      const end = Math.max(side, lane + thickness);
      return { left: start, top: place.midY - half, width: end - start, height: thickness };
    };
    strips.push(arm(from), {
      left: lane,
      top: from.midY - half,
      width: thickness,
      height: to.midY - from.midY + thickness,
    });
    strips.push(arm(to));
  });
  return strips;
}

export interface TileRect {
  readonly kind: string;
  readonly rect: Rect;
}

/** The pixels of each discovered tile of an area's map, row by row. Hidden tiles, and tiles with no pixel, are left out. */
export function tileRects(terrain: readonly (readonly (string | null)[])[], map: Rect, scale: number): TileRect[] {
  const rects: TileRect[] = [];
  terrain.forEach((row, rowIndex) => {
    const top = edgeOf(scale, rowIndex);
    const height = edgeOf(scale, rowIndex + 1) - top;
    row.forEach((kind, columnIndex) => {
      const left = edgeOf(scale, columnIndex);
      const width = edgeOf(scale, columnIndex + 1) - left;
      if (kind !== null && width > 0 && height > 0) {
        rects.push({ kind, rect: { left: map.left + left, top: map.top + top, width, height } });
      }
    });
  });
  return rects;
}

/** A rectangle made at least `size` wide and high by growing it equally on both sides. */
function atLeast(rect: Rect, size: number): Rect {
  const moreWidth = Math.max(0, size - rect.width);
  const moreHeight = Math.max(0, size - rect.height);
  return {
    left: rect.left - Math.floor(moreWidth / 2),
    top: rect.top - Math.floor(moreHeight / 2),
    width: rect.width + moreWidth,
    height: rect.height + moreHeight,
  };
}

/** Where an exit's zone falls in the map, no smaller than `smallest` pixels, so that it can be seen at any scale. */
export function exitRect(zone: Box, map: Rect, scale: number, smallest: number): Rect {
  const left = edgeOf(scale, zone.minX);
  const top = edgeOf(scale, zone.minY);
  return atLeast(
    {
      left: map.left + left,
      top: map.top + top,
      width: edgeOf(scale, zone.maxX) - left,
      height: edgeOf(scale, zone.maxY) - top,
    },
    smallest,
  );
}

/** The square of `size` pixels that marks the hero, centred on the hero's position in the map. */
export function markerRect(hero: Point, map: Rect, scale: number, size: number): Rect {
  const reach = Math.floor(size / 2);
  return {
    left: map.left + edgeOf(scale, hero.x) - reach,
    top: map.top + edgeOf(scale, hero.y) - reach,
    width: size,
    height: size,
  };
}
