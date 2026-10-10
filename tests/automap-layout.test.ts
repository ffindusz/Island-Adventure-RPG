import { describe, expect, it } from 'vitest';
import {
  edgeOf,
  exitRect,
  exitSide,
  fitLabel,
  layoutRoute,
  linkEnds,
  linkedWithNext,
  markerRect,
  routeLinks,
  tileRects,
} from '../src/adapter/automap-layout';
import type { LinkEnds, Metrics, Place, Rect, RouteArea, RouteLayout } from '../src/adapter/automap-layout';
import { gameContent } from '../src/content';
import type { AreaDefinition } from '../src/core';

// Where the Automap page puts the areas of the route, and the shapes it draws in them, as numbers: no drawing, so no
// Phaser. Every number below is worked out by hand from the rules in the comments, not read back from the code.

/** The room the page leaves for the route in the 320 x 192 canvas, and the gaps and the name's height it works with. */
const PAGE_SPACE: Rect = { left: 18, top: 34, width: 284, height: 124 };
const PAGE_METRICS: Metrics = { labelHeight: 10, labelGap: 4, cardGap: 20, rowGap: 12, maxLabelWidth: 136 };

/** Numbers that are easy to work out by hand: no names, and 4 pixels between cards and between rows. */
const TIGHT: Metrics = { labelHeight: 0, labelGap: 0, cardGap: 4, rowGap: 4, maxLabelWidth: 0 };

/** The strips of a link: 2 pixels thick, and 4 pixels clear of the cards where it goes round the end of a row. */
const LINK = { thickness: 2, laneGap: 4 };

function area(tilesWide: number, tilesHigh: number, labelWidth = 0): RouteArea {
  return { tilesWide, tilesHigh, labelWidth };
}

function space(width: number, height: number): Rect {
  return { left: 0, top: 0, width, height };
}

/** `count` areas of 10 x 10 tiles. */
function squares(count: number): RouteArea[] {
  return Array.from({ length: count }, () => area(10, 10));
}

/** A card of 30 x 30 pixels with no name, whose map fills it. */
function square(row: number, left: number, top: number): Place {
  const rect = { left, top, width: 30, height: 30 };
  return { row, card: rect, label: { left, top, width: 0, height: 0 }, map: rect, midY: top + 15 };
}

/** Five squares in rows of three and two, the second row running back: as the layout makes them in 100 x 100. */
const THREE_THEN_TWO: RouteLayout = {
  scale: 3,
  places: [square(0, 1, 18), square(0, 35, 18), square(0, 69, 18), square(1, 52, 52), square(1, 18, 52)],
};

/** Five squares in rows of two, two and one, the second row running back: as the layout makes them in 70 x 100. */
const TWO_TWO_ONE: RouteLayout = {
  scale: 3,
  places: [square(0, 3, 1), square(0, 37, 1), square(1, 37, 35), square(1, 3, 35), square(2, 20, 69)],
};

/** A card 60 wide with a map 40 wide in it, 10 pixels in from each side, as a name wider than the map makes it. */
function wide(row: number, left: number, midY: number): Place {
  return {
    row,
    card: { left, top: midY - 20, width: 60, height: 40 },
    label: { left, top: midY - 20, width: 60, height: 10 },
    map: { left: left + 10, top: midY - 10, width: 40, height: 20 },
    midY,
  };
}

describe('laying out the route of the Automap', () => {
  it('draws the maps as large as whole pixels per tile allow, side by side, with the names above them', () => {
    // A map of 20 by 12 tiles and one of 30 by 20, with a name 118 pixels wide for the first and 91 for the second. At 5
    // pixels per tile the cards are 118 and 150 wide and need 288 with the gap, and under each other they are 200
    // high: neither fits, so the scale is 4.
    const layout = layoutRoute([area(20, 12, 118), area(30, 20, 91)], PAGE_SPACE, PAGE_METRICS);

    expect(layout.scale).toBe(4);
    expect(layout.places).toEqual([
      {
        row: 0,
        card: { left: 31, top: 49, width: 118, height: 94 },
        label: { left: 31, top: 49, width: 118, height: 10 },
        map: { left: 50, top: 79, width: 80, height: 48 },
        midY: 103,
      },
      {
        row: 0,
        card: { left: 169, top: 49, width: 120, height: 94 },
        label: { left: 183, top: 49, width: 91, height: 10 },
        map: { left: 169, top: 63, width: 120, height: 80 },
        midY: 103,
      },
    ]);
  });

  it('goes up to the exact fit: a card may touch the edge of the space', () => {
    // Two maps of 10 x 10 tiles with 4 pixels between them are 64 x 30 at 3 pixels per tile: exactly the space.
    const layout = layoutRoute(squares(2), space(64, 30), TIGHT);

    expect(layout.scale).toBe(3);
    expect(layout.places.map((place) => place.map.left)).toEqual([0, 34]);
  });

  it('is no larger than the width and the height allow: one pixel less of either and the scale drops', () => {
    expect(layoutRoute(squares(2), space(64, 29), TIGHT).scale).toBe(2);
    expect(layoutRoute(squares(2), space(63, 30), TIGHT).scale).toBe(2);
  });

  it('is no wider than the space even when there is only one map, however low it is', () => {
    // A single map of 30 pixels cannot go on a second row, so only its width can make the scale drop.
    expect(layoutRoute(squares(1), space(30, 100), TIGHT).scale).toBe(3);
    expect(layoutRoute(squares(1), space(29, 100), TIGHT).scale).toBe(2);
  });

  it.each([8, 7, 6, 5, 4, 3, 2, 1])('draws at %i pixels per tile a map that just fits at that scale', (pixels) => {
    // The most tiles that fit in 100 pixels at this scale: one more pixel per tile and they would not.
    const layout = layoutRoute([area(Math.floor(100 / pixels), 1)], space(100, 100), TIGHT);

    expect(layout.scale).toBe(pixels);
  });

  it.each([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])(
    'draws at 1/%i of a pixel per tile a map that just fits at that scale',
    (tiles) => {
      // 100 pixels wide at 1/tiles of a pixel per tile, and wider at the scale before it.
      const layout = layoutRoute([area(100 * tiles, 100)], space(100, 100), TIGHT);

      expect(layout.scale).toBe(1 / tiles);
    },
  );

  it('draws a small area no larger than 8 pixels per tile, so that it does not fill the page', () => {
    const layout = layoutRoute([area(3, 3)], PAGE_SPACE, PAGE_METRICS);

    expect(layout.scale).toBe(8);
    expect(layout.places.map((place) => [place.map.width, place.map.height])).toEqual([[24, 24]]);
  });

  it('puts the areas in the order of the route, and goes back along the next row when a row is full', () => {
    // At 3 pixels per tile a row holds 3 maps (30 + 4 + 30 + 4 + 30 = 98 of 100) and two rows fit. The second row
    // runs the other way, so that the route goes on from under the end of the first.
    const layout = layoutRoute(squares(5), space(100, 100), TIGHT);

    expect(layout.scale).toBe(3);
    expect(layout.places.map((place) => [place.row, place.card.left, place.card.top])).toEqual([
      [0, 1, 18],
      [0, 35, 18],
      [0, 69, 18],
      [1, 52, 52],
      [1, 18, 52],
    ]);
  });

  it('runs a third row the same way as the first', () => {
    // 2 maps fit in a row of 70, and 3 rows fit in a height of 100. The last row has one card, in the middle.
    const layout = layoutRoute(squares(5), space(70, 100), TIGHT);

    expect(layout.scale).toBe(3);
    expect(layout.places.map((place) => [place.row, place.card.left, place.card.top])).toEqual([
      [0, 3, 1],
      [0, 37, 1],
      [1, 37, 35],
      [1, 3, 35],
      [2, 20, 69],
    ]);
  });

  it('counts the space between cards when it decides whether the next card fits in the row', () => {
    // Three maps of 30 are 90 wide but 98 with the gaps, so in 97 the row holds two.
    const layout = layoutRoute(squares(5), space(97, 100), TIGHT);

    expect(layout.scale).toBe(3);
    expect(layout.places.map((place) => [place.row, place.card.left])).toEqual([
      [0, 16],
      [0, 50],
      [1, 50],
      [1, 16],
      [2, 33],
    ]);
  });

  it('rounds down what is left over when it centres a row and the rows in the space', () => {
    // 35 pixels are left across and 5 down: 17 and 2 to the first map, not 18 and 3.
    const layout = layoutRoute(squares(1), space(65, 35), TIGHT);

    expect(layout.places.map((place) => place.map)).toEqual([{ left: 17, top: 2, width: 30, height: 30 }]);
  });

  it('puts the middle line of a row at half the height of its highest map, rounded down', () => {
    const layout = layoutRoute([area(10, 9)], space(30, 27), TIGHT);

    expect(layout.scale).toBe(3);
    expect(layout.places.map((place) => place.midY)).toEqual([13]);
  });

  it('centres the maps of a row on one line, rounding down what is left over above a shorter one', () => {
    // 10 x 10 and 10 x 9 tiles at 3 pixels per tile: 30 and 27 high in a row that is 30 high.
    const layout = layoutRoute([area(10, 10), area(10, 9)], space(64, 30), TIGHT);

    expect(layout.scale).toBe(3);
    expect(layout.places.map((place) => place.map)).toEqual([
      { left: 0, top: 0, width: 30, height: 30 },
      { left: 34, top: 1, width: 30, height: 27 },
    ]);
    expect(layout.places.map((place) => place.midY)).toEqual([15, 15]);
  });

  it('gives a name a card of its own width, cut to the widest a name may be', () => {
    // A name 250 wide is cut to 101, which is wider than the map of 80, so the card is 101 wide and the map is
    // centred in it, 10 pixels in (20 and a half, rounded down).
    const layout = layoutRoute([area(10, 10, 250)], PAGE_SPACE, { ...PAGE_METRICS, maxLabelWidth: 101 });

    expect(layout.places).toEqual([
      {
        row: 0,
        card: { left: 109, top: 49, width: 101, height: 94 },
        label: { left: 109, top: 49, width: 101, height: 10 },
        map: { left: 119, top: 63, width: 80, height: 80 },
        midY: 103,
      },
    ]);
  });

  it('shows an area too large for one pixel per tile at a fraction of it', () => {
    // 300 x 200 tiles. At 1/2 a pixel per tile three of them are 150 wide each and do not fit in a row, and at 1/3
    // two to a row are 2 rows of 81: 174 high. At 1/4 the three are 75 x 50 and fit in one row, 265 wide.
    const layout = layoutRoute([area(300, 200), area(300, 200), area(300, 200)], PAGE_SPACE, PAGE_METRICS);

    expect(layout.scale).toBe(0.25);
    expect(layout.places.map((place) => [place.row, place.map.width, place.map.height])).toEqual([
      [0, 75, 50],
      [0, 75, 50],
      [0, 75, 50],
    ]);
  });

  it('still gives every area a place when the route is too large for the space at any scale', () => {
    // The first map is wider than the space even at 1/16 of a pixel per tile, and the others are far too high. The
    // route then starts at the top left of the space and runs past its end, rather than past both ends.
    const route = [area(5000, 100), ...Array.from({ length: 59 }, () => area(300, 200, 100))];

    const layout = layoutRoute(route, PAGE_SPACE, PAGE_METRICS);

    expect(layout.scale).toBe(1 / 16);
    expect(layout.places).toHaveLength(60);
    expect(layout.places[0]?.card).toMatchObject({ left: 18, top: 34 });
  });
});

describe('the pixels of a map', () => {
  it('puts the edge between tiles at the nearest whole pixel', () => {
    expect(edgeOf(4, 20)).toBe(80);
    expect(edgeOf(0.5, 3)).toBe(2);
    expect(edgeOf(1 / 3, 20)).toBe(7);
    expect(edgeOf(1 / 3, 10)).toBe(3);
  });

  it('gives each discovered tile its pixels, in the map, and leaves the hidden ones out', () => {
    const rects = tileRects(
      [
        [null, 'sand'],
        ['water', null],
      ],
      { left: 10, top: 20, width: 6, height: 6 },
      3,
    );

    expect(rects).toEqual([
      { kind: 'sand', rect: { left: 13, top: 20, width: 3, height: 3 } },
      { kind: 'water', rect: { left: 10, top: 23, width: 3, height: 3 } },
    ]);
  });

  it('leaves out the tiles that have no pixel of their own at a fraction of a pixel per tile', () => {
    // At 1/2 the edges between tiles fall on pixels 0, 1, 1, 2, 2: of four columns or three rows, the second row and
    // the second and the fourth column have no pixel.
    const rects = tileRects(
      [
        ['grass', 'grass', 'water', null],
        ['sand', 'sand', 'sand', 'sand'],
        ['water', null, 'grass', 'grass'],
      ],
      { left: 5, top: 5, width: 2, height: 2 },
      0.5,
    );

    expect(rects).toEqual([
      { kind: 'grass', rect: { left: 5, top: 5, width: 1, height: 1 } },
      { kind: 'water', rect: { left: 6, top: 5, width: 1, height: 1 } },
      { kind: 'water', rect: { left: 5, top: 6, width: 1, height: 1 } },
      { kind: 'grass', rect: { left: 6, top: 6, width: 1, height: 1 } },
    ]);
  });

  it('puts an exit where its zone is in the map, as large as the zone', () => {
    // An exit on the east edge of a 20 by 12 map: the 1 x 2 tiles at column 19 and row 5.
    const zone = { minX: 19, minY: 5, maxX: 20, maxY: 7 };

    expect(exitRect(zone, { left: 50, top: 79, width: 80, height: 48 }, 4, 3)).toEqual({
      left: 126,
      top: 99,
      width: 4,
      height: 8,
    });
  });

  it('makes an exit at least as large as the smallest mark, around the middle of its zone', () => {
    // At 1/2 the zone is 0 pixels wide at 60 and 1 high at 82: 3 x 3 around them.
    const zone = { minX: 19, minY: 5, maxX: 20, maxY: 7 };

    expect(exitRect(zone, { left: 50, top: 79, width: 10, height: 6 }, 0.5, 3)).toEqual({
      left: 59,
      top: 81,
      width: 3,
      height: 3,
    });
  });

  it("centres the hero's mark on the hero's position in the map", () => {
    // 4.6 tiles across and 5.4 down at 4 pixels per tile are 18.4 and 21.6: the pixel at 68 across and 101 down.
    const map = { left: 50, top: 79, width: 80, height: 48 };

    expect(markerRect({ x: 4.6, y: 5.4 }, map, 4, 4)).toEqual({ left: 66, top: 99, width: 4, height: 4 });
    expect(markerRect({ x: 4.6, y: 5.4 }, map, 4, 3)).toEqual({ left: 67, top: 100, width: 3, height: 3 });
  });
});

describe('the links between the areas of the route', () => {
  it('links the areas whose exits lead to one another, from one to the next', () => {
    const areas = [
      { id: 'a', connections: ['b'] },
      { id: 'b', connections: ['a', 'c'] },
      { id: 'c', connections: ['b'] },
      { id: 'd', connections: [] },
    ];

    expect(linkedWithNext(areas)).toEqual([true, true, false]);
  });

  it('links two areas when only one of them has an exit to the other', () => {
    expect(
      linkedWithNext([
        { id: 'a', connections: ['b'] },
        { id: 'b', connections: [] },
        { id: 'c', connections: ['b'] },
      ]),
    ).toEqual([true, true]);
  });

  it('draws a link between two maps of a row as the gap between them, on the middle line', () => {
    expect(routeLinks(THREE_THEN_TWO, [true, true, false, true], LINK)).toEqual([
      { left: 31, top: 32, width: 4, height: 2 },
      { left: 65, top: 32, width: 4, height: 2 },
      { left: 48, top: 66, width: 4, height: 2 },
    ]);
  });

  it('draws a link from the end of a row to the start of the next round the right end of both', () => {
    expect(routeLinks(THREE_THEN_TWO, [false, false, true, false], LINK)).toEqual([
      { left: 99, top: 32, width: 6, height: 2 },
      { left: 103, top: 32, width: 2, height: 36 },
      { left: 82, top: 66, width: 23, height: 2 },
    ]);
  });

  it('draws a link from the end of a row to the start of the next round the left end when the row ran back', () => {
    expect(routeLinks(TWO_TWO_ONE, [false, false, false, true], LINK)).toEqual([
      { left: -3, top: 49, width: 6, height: 2 },
      { left: -3, top: 49, width: 2, height: 36 },
      { left: -3, top: 83, width: 23, height: 2 },
    ]);
  });

  it('draws a link between two maps of a row from map to map, even when a name makes the cards wider', () => {
    const layout = { scale: 1, places: [wide(0, 0, 30), wide(0, 80, 30)] };

    expect(routeLinks(layout, [true], LINK)).toEqual([{ left: 50, top: 29, width: 40, height: 2 }]);
  });

  it('draws a link round the right end of the cards, and out of the side of each map, when the cards are wider', () => {
    const layout = { scale: 1, places: [wide(0, 80, 30), wide(1, 80, 100)] };

    expect(routeLinks(layout, [true], LINK)).toEqual([
      { left: 130, top: 29, width: 16, height: 2 },
      { left: 144, top: 29, width: 2, height: 72 },
      { left: 130, top: 99, width: 16, height: 2 },
    ]);
  });

  it('draws a link round the left end of the cards, and out of the side of each map, when the cards are wider', () => {
    const layout = { scale: 1, places: [wide(1, 0, 30), wide(2, 0, 100)] };

    expect(routeLinks(layout, [true], LINK)).toEqual([
      { left: -6, top: 29, width: 16, height: 2 },
      { left: -6, top: 29, width: 2, height: 72 },
      { left: -6, top: 99, width: 16, height: 2 },
    ]);
  });

  it('draws nothing for areas that are not linked', () => {
    expect(routeLinks(THREE_THEN_TWO, [false, false, false, false], LINK)).toEqual([]);
  });
});

describe('the side of its map that an exit is at', () => {
  it('puts an exit in the first column at the left of its map, and one at the last column at the right', () => {
    expect(exitSide({ col: 0, width: 1 }, 40)).toBe('left');
    expect(exitSide({ col: 0, width: 3 }, 40)).toBe('left');
    expect(exitSide({ col: 39, width: 1 }, 40)).toBe('right');
    expect(exitSide({ col: 38, width: 2 }, 40)).toBe('right');
  });

  it('puts an exit that is not at the left or right edge, or is at both, on neither side', () => {
    expect(exitSide({ col: 5, width: 2 }, 40)).toBeNull();
    expect(exitSide({ col: 1, width: 1 }, 40)).toBeNull();
    expect(exitSide({ col: 38, width: 1 }, 40)).toBeNull();
    expect(exitSide({ col: 0, width: 40 }, 40)).toBeNull();
  });
});

/** An area `width` tiles across and 3 down, with an exit for each of `exits`: where it leads, its column and width. */
function areaWithExits(
  id: string,
  width: number,
  exits: readonly (readonly [string, number, number])[] = [],
): Pick<AreaDefinition, 'id' | 'layout' | 'exits'> {
  return {
    id,
    layout: Array.from({ length: 3 }, () => '.'.repeat(width)),
    exits: exits.map(([to, col, columns], index) => ({
      id: `${id}-exit-${index}`,
      zone: { col, row: 1, width: columns, height: 1 },
      to: { area: to, entrance: `${to}-in` },
    })),
  };
}

describe('the sides of the maps that the links of the route are at', () => {
  it('takes them from the exit of each area that leads to the other, on the width of its own map', () => {
    const areas = [
      areaWithExits('a', 10, [['b', 9, 1]]),
      areaWithExits('b', 12, [
        ['a', 0, 1],
        ['c', 11, 1],
      ]),
      areaWithExits('c', 8, [['b', 0, 1]]),
    ];

    expect(linkEnds(['a', 'b', 'c'], areas)).toEqual([
      { leave: 'right', arrive: 'left' },
      { leave: 'right', arrive: 'left' },
    ]);
  });

  it('tells the left side from the right: the way on at the left, and the way back at the right', () => {
    const areas = [areaWithExits('a', 10, [['b', 0, 1]]), areaWithExits('b', 10, [['a', 9, 1]])];

    expect(linkEnds(['a', 'b'], areas)).toEqual([{ leave: 'left', arrive: 'right' }]);
  });

  it('has no side for an area with no exit to the other, or whose exit is not at the left or right edge', () => {
    const areas = [
      { id: 'a', layout: ['..........'] },
      areaWithExits('b', 10, [['c', 4, 1]]),
      areaWithExits('c', 10, [['d', 5, 1]]),
      areaWithExits('d', 10),
    ];

    expect(linkEnds(['a', 'b'], areas)).toEqual([{ leave: null, arrive: null }]);
    expect(linkEnds(['b', 'c'], areas)).toEqual([{ leave: null, arrive: null }]);
    expect(linkEnds(['c', 'd'], areas)).toEqual([{ leave: null, arrive: null }]);
  });

  it('goes by the first exit of an area that leads to the other when it has more than one', () => {
    const areas = [
      areaWithExits('a', 10, [
        ['b', 9, 1],
        ['b', 0, 1],
      ]),
      areaWithExits('b', 10, [
        ['a', 0, 1],
        ['a', 9, 1],
      ]),
    ];

    expect(linkEnds(['a', 'b'], areas)).toEqual([{ leave: 'right', arrive: 'left' }]);
  });

  it('finds the areas by their ids, in whatever order the content lists them, and has no side for one it lacks', () => {
    const areas = [areaWithExits('b', 10, [['a', 0, 1]]), areaWithExits('a', 10, [['b', 9, 1]])];

    expect(linkEnds(['a', 'b'], areas)).toEqual([{ leave: 'right', arrive: 'left' }]);
    expect(linkEnds(['a', 'x'], areas)).toEqual([{ leave: null, arrive: null }]);
  });

  it('has one pair for each link of the route, and none for a route of one area', () => {
    const areas = [areaWithExits('a', 10), areaWithExits('b', 10), areaWithExits('c', 10)];

    expect(linkEnds(['a', 'b', 'c'], areas)).toHaveLength(2);
    expect(linkEnds(['a'], areas)).toEqual([]);
  });

  it('has each link of the shipped route leave by the east edge and come into the west edge of the next area', () => {
    const route = gameContent.areas.map((area) => area.id);

    expect(linkEnds(route, gameContent.areas)).toEqual(route.slice(1).map(() => ({ leave: 'right', arrive: 'left' })));
  });
});

describe('the links of the route drawn at the sides where their exits are', () => {
  const UNKNOWN: LinkEnds = { leave: null, arrive: null };
  const EAST_TO_WEST: LinkEnds = { leave: 'right', arrive: 'left' };
  const WEST_TO_EAST: LinkEnds = { leave: 'left', arrive: 'right' };

  /** The strips of the one link out of area `index` of a layout, given where its exits are. */
  function linkAt(index: number, ends: LinkEnds, layout: RouteLayout = THREE_THEN_TWO): Rect[] {
    const links = layout.places.slice(1);
    return routeLinks(
      layout,
      links.map((_, at) => at === index),
      LINK,
      links.map((_, at) => (at === index ? ends : UNKNOWN)),
    );
  }

  it('draws a link between two maps of a row as the gap between them when its exits face one another', () => {
    expect(linkAt(0, EAST_TO_WEST)).toEqual([{ left: 31, top: 32, width: 4, height: 2 }]);
    // The second row runs back, so the maps face one another the other way round.
    expect(linkAt(3, WEST_TO_EAST)).toEqual([{ left: 48, top: 66, width: 4, height: 2 }]);
  });

  it('draws a link round the end of the rows as before when its exits are on the side of the lane or not known', () => {
    const round = [
      { left: 99, top: 32, width: 6, height: 2 },
      { left: 103, top: 32, width: 2, height: 36 },
      { left: 82, top: 66, width: 23, height: 2 },
    ];

    expect(linkAt(2, UNKNOWN)).toEqual(round);
    expect(linkAt(2, { leave: 'right', arrive: 'right' })).toEqual(round);
    expect(linkAt(2, { leave: 'right', arrive: null })).toEqual(round);
    expect(linkAt(2, { leave: null, arrive: 'right' })).toEqual(round);
  });

  it('draws a link round the left end of the rows as before when its exits are at the left', () => {
    expect(linkAt(3, { leave: 'left', arrive: 'left' }, TWO_TWO_ONE)).toEqual([
      { left: -3, top: 49, width: 6, height: 2 },
      { left: -3, top: 49, width: 2, height: 36 },
      { left: -3, top: 83, width: 23, height: 2 },
    ]);
  });

  it('takes a link between rows out of the east side of one map and into the west side of the next', () => {
    // The first row ends at 48 and the next starts at 52, so the way across runs on 49. The posts, where it goes up and
    // down, are 4 pixels clear of the cards: at 103 to the right of the first, and at 46 to the left of the next.
    expect(linkAt(2, EAST_TO_WEST)).toEqual([
      { left: 99, top: 32, width: 6, height: 2 },
      { left: 103, top: 32, width: 2, height: 19 },
      { left: 46, top: 49, width: 59, height: 2 },
      { left: 46, top: 49, width: 2, height: 19 },
      { left: 46, top: 66, width: 6, height: 2 },
    ]);
  });

  it('keeps the posts clear of the cards and the arms on the maps when the cards are wider than the maps', () => {
    // The first row ends at 50 and the next starts at 80, so the way across runs on 50 + 14 = 64.
    const layout = { scale: 1, places: [wide(0, 80, 30), wide(1, 80, 100)] };

    expect(linkAt(0, EAST_TO_WEST, layout)).toEqual([
      { left: 130, top: 29, width: 16, height: 2 },
      { left: 144, top: 29, width: 2, height: 37 },
      { left: 74, top: 64, width: 72, height: 2 },
      { left: 74, top: 64, width: 2, height: 37 },
      { left: 74, top: 99, width: 16, height: 2 },
    ]);
  });

  it('takes a link between rows out of the west side and into the west side when both exits are there', () => {
    expect(linkAt(2, { leave: 'left', arrive: 'left' })).toEqual([
      { left: 63, top: 32, width: 6, height: 2 },
      { left: 63, top: 32, width: 2, height: 19 },
      { left: 46, top: 49, width: 19, height: 2 },
      { left: 46, top: 49, width: 2, height: 19 },
      { left: 46, top: 66, width: 6, height: 2 },
    ]);
  });

  it('goes round the cards when only the side it leaves by is not the one the layout would give it', () => {
    // It leaves the first map by the west side, the post to the left of its card is at 63, and it comes in from the
    // post to the right of the next card, at 86, as a link that runs round the right end would.
    expect(linkAt(2, WEST_TO_EAST)).toEqual([
      { left: 63, top: 32, width: 6, height: 2 },
      { left: 63, top: 32, width: 2, height: 19 },
      { left: 63, top: 49, width: 25, height: 2 },
      { left: 86, top: 49, width: 2, height: 19 },
      { left: 82, top: 66, width: 6, height: 2 },
    ]);
  });

  it('goes round below the row for a link in a row whose exits face away from one another', () => {
    // The row ends at 82, so the way along runs 4 pixels below it, on 86; the posts are at 86 and 12.
    expect(linkAt(3, EAST_TO_WEST)).toEqual([
      { left: 82, top: 66, width: 6, height: 2 },
      { left: 86, top: 66, width: 2, height: 22 },
      { left: 12, top: 86, width: 76, height: 2 },
      { left: 12, top: 66, width: 2, height: 22 },
      { left: 12, top: 66, width: 6, height: 2 },
    ]);
  });

  it('takes the ends of each link from its own place in the list', () => {
    const ends = [UNKNOWN, UNKNOWN, EAST_TO_WEST, WEST_TO_EAST];

    expect(routeLinks(THREE_THEN_TWO, [false, false, true, true], LINK, ends)).toEqual([
      { left: 99, top: 32, width: 6, height: 2 },
      { left: 103, top: 32, width: 2, height: 19 },
      { left: 46, top: 49, width: 59, height: 2 },
      { left: 46, top: 49, width: 2, height: 19 },
      { left: 46, top: 66, width: 6, height: 2 },
      { left: 48, top: 66, width: 4, height: 2 },
    ]);
  });
});

describe('the names of the areas on the Automap', () => {
  /** A letter is 10 pixels wide and a dot is 2, as in a font whose letters differ in width from its dots. */
  const measure = (text: string): number => [...text].reduce((total, mark) => total + (mark === '.' ? 2 : 10), 0);

  it('leaves a name as it is when it fits, even when it fits exactly', () => {
    expect(fitLabel('COAST', 50, measure)).toBe('COAST');
  });

  it('cuts a name that is too wide from its end, and finishes it with two dots, as long as the width allows', () => {
    // 8 letters and the two dots are 84 pixels: 9 letters would be 94.
    expect(fitLabel('SHIPWRECK COAST', 84, measure)).toBe('SHIPWREC..');
  });

  it('cuts no more than it has to: one letter less than the name when that is already narrow enough', () => {
    // COAS and the dots are 44 pixels, and COAST is 50.
    expect(fitLabel('COAST', 45, measure)).toBe('COAS..');
  });

  it('is left with the dots alone when not even one letter fits with them', () => {
    expect(fitLabel('SHIPWRECK', 14, measure)).toBe('S..');
    expect(fitLabel('SHIPWRECK', 13, measure)).toBe('..');
  });
});
