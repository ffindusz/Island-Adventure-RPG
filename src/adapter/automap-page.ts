import type Phaser from 'phaser';
import type { AutomapAreaView, AutomapPageView, PlayingView } from '../core';
import { exitRect, fitLabel, layoutRoute, linkedWithNext, markerRect, routeLinks, tileRects } from './automap-layout';
import type { Metrics, Place, Rect } from './automap-layout';
import { automapColour, EXIT_COLOUR, MAP_COLOUR } from './automap-palette';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { closePageKeyLabel } from './controls';
import { drawText, TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Graphics } from './pixel-font';
import { INK, UiLayer, WINDOW_FRAME } from './ui-layer';

// The Automap page: the route of Adventure Areas drawn as a map, from the Game core's view alone. It is a window like
// the panels of the overlay, which draws nothing while this page is open, with the same frames (ui-layer.ts). Where
// each area goes is worked out in automap-layout.ts; this file draws what that says and decides nothing about the game.

/**
 * Where the overlay is: it has nothing on the screen while the Automap is open. The map is drawn in shapes at this
 * depth, over the window, which is one below it, and the dimming of the game is one below that. The hero's mark is one
 * above the map.
 */
const PAGE_DEPTH = 200;

/** The window, in canvas pixels: in the middle of the screen, with the padding of the overlay's windows. */
const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 172;
/** From the window's edge to what it holds, the window's frame being the first 4 pixels of it. */
const PADDING = 12;
/** The space between the title, or the hint, and the route. */
const TITLE_GAP = 6;

const PANEL: Rect = {
  left: (VIEW_WIDTH - PANEL_WIDTH) / 2,
  top: (VIEW_HEIGHT - PANEL_HEIGHT) / 2,
  width: PANEL_WIDTH,
  height: PANEL_HEIGHT,
};
const CONTENT: Rect = {
  left: PANEL.left + PADDING,
  top: PANEL.top + PADDING,
  width: PANEL.width - 2 * PADDING,
  height: PANEL.height - 2 * PADDING,
};
/** What the title and the hint leave of the window for the route. */
const ROUTE_SPACE: Rect = {
  left: CONTENT.left,
  top: CONTENT.top + TEXT_HEIGHT + TITLE_GAP,
  width: CONTENT.width,
  height: CONTENT.height - 2 * (TEXT_HEIGHT + TITLE_GAP),
};

/** The widest a name is drawn, in pixels: a longer one is cut short and ends in dots. */
const MAX_LABEL_WIDTH = 136;
/** The space between a name and its map, between two cards in a row, and between two rows. */
const METRICS: Metrics = {
  labelHeight: TEXT_HEIGHT,
  labelGap: 4,
  cardGap: 20,
  rowGap: 12,
  maxLabelWidth: MAX_LABEL_WIDTH,
};
/** How thick a link between two areas is, and how far it keeps from the cards when it goes round the end of a row. */
const LINK = { thickness: 2, laneGap: 4 };
/** The ring round the map of the area the hero is in, in pixels. Every other map has a ring of one. */
const CURRENT_RING = 2;
/** The least an exit or the hero's mark is drawn, so that it can be seen when a tile is a pixel or less. */
const MIN_MARK = 3;
/** How long the hero's mark is one colour before it is the other, in milliseconds. */
const BLINK_MS = 400;
/** What an area the hero has not been in is called: the font has no question mark. */
const UNKNOWN_NAME = 'UNKNOWN';

const BACKDROP_COLOUR = 0x000000;
const BACKDROP_ALPHA = 0.55;
// The names, rings and links take the colours of the window they are in (ui-layer.ts); the terrain and the exits take
// those of automap-palette.ts, and the hero's mark keeps its own.
const TITLE_COLOUR = INK.title;
const TEXT_COLOUR = INK.text;
const LINK_COLOUR = 0x5f7160;
const CURRENT_COLOUR = INK.title;
const DISCOVERED_RING_COLOUR = INK.dim;
const UNDISCOVERED_RING_COLOUR = 0x4d4a43;
const UNDISCOVERED_TEXT_COLOUR = INK.dim;
/** What stands for an area the hero has not been in. */
const UNDISCOVERED_COLOUR = 0x2a2824;
const MARK_COLOURS: readonly [number, number] = [0xf2c14e, 0xffffff];
const MARK_OUTLINE_COLOUR = 0x141b1b;

/** The Automap, while its page is open. */
export class AutomapPage {
  private readonly backdrop: Graphics;
  private readonly window: UiLayer;
  private readonly pageLayer: Graphics;
  private readonly markLayer: Graphics;
  /** What is drawn now, as text, or null while the page is closed: it is drawn again only when this changes. */
  private shown: string | null = null;
  /** Where the hero's mark is on the open page, or null when the hero is on none of its maps. */
  private mark: Rect | null = null;
  /** Which of the mark's two colours is drawn now. */
  private markPhase: number | null = null;

  constructor(scene: Phaser.Scene) {
    this.backdrop = scene.add.graphics().setScrollFactor(0).setDepth(PAGE_DEPTH - 2);
    this.window = new UiLayer(scene, PAGE_DEPTH - 1);
    this.pageLayer = scene.add.graphics().setScrollFactor(0).setDepth(PAGE_DEPTH);
    // The mark has a layer of its own: it changes colour while the rest of the page stays as it is.
    this.markLayer = scene.add.graphics().setScrollFactor(0).setDepth(PAGE_DEPTH + 1);
  }

  /** Shows the page when the view says it is open, and nothing otherwise. `timeMs` makes the hero's mark blink. */
  draw(view: PlayingView, timeMs: number): void {
    const page = openAutomap(view);
    if (page === null) {
      this.hide();
      return;
    }
    const key = JSON.stringify(page);
    if (key !== this.shown) {
      this.shown = key;
      this.markPhase = null;
      drawWindow(this.backdrop, this.window);
      this.mark = drawPage(this.pageLayer, page);
    }
    this.blink(timeMs);
  }

  private blink(timeMs: number): void {
    const phase = Math.floor(timeMs / BLINK_MS) % MARK_COLOURS.length;
    if (phase === this.markPhase) {
      return;
    }
    this.markPhase = phase;
    this.markLayer.clear();
    if (this.mark !== null) {
      fill(this.markLayer, MARK_OUTLINE_COLOUR, grown(this.mark, 1));
      fill(this.markLayer, MARK_COLOURS[phase] ?? TEXT_COLOUR, this.mark);
    }
  }

  private hide(): void {
    if (this.shown === null) {
      return;
    }
    this.shown = null;
    this.mark = null;
    this.markPhase = null;
    this.backdrop.clear();
    this.window.clear();
    this.pageLayer.clear();
    this.markLayer.clear();
  }
}

/** The Automap's page when it is the one that is open. A choice that waits for the player comes before any page. */
function openAutomap(view: PlayingView): AutomapPageView | null {
  const { page } = view;
  return view.levelUp === null && page !== null && page.id === 'automap' ? page : null;
}

function fill(graphics: Graphics, colour: number, rect: Rect): void {
  graphics.fillStyle(colour);
  graphics.fillRect(rect.left, rect.top, rect.width, rect.height);
}

function grown(rect: Rect, by: number): Rect {
  return { left: rect.left - by, top: rect.top - by, width: rect.width + 2 * by, height: rect.height + 2 * by };
}

function drawCentred(layer: UiLayer, text: string, top: number, colour: number): void {
  layer.text(text, CONTENT.left + Math.floor((CONTENT.width - textWidthOf(text)) / 2), top, colour);
}

/** The window with its title and hint, over the dimmed game, drawn as the overlay draws its windows. */
function drawWindow(backdrop: Graphics, layer: UiLayer): void {
  backdrop.clear();
  backdrop.fillStyle(BACKDROP_COLOUR, BACKDROP_ALPHA);
  backdrop.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  layer.clear();
  layer.frame('window', PANEL.left, PANEL.top, PANEL.width, PANEL.height);
  layer.frame(
    'panel',
    PANEL.left + WINDOW_FRAME,
    PANEL.top + WINDOW_FRAME,
    PANEL.width - 2 * WINDOW_FRAME,
    PANEL.height - 2 * WINDOW_FRAME,
  );
  drawCentred(layer, 'AUTOMAP', CONTENT.top, INK.title);
  drawCentred(layer, `${closePageKeyLabel()} TO CLOSE`, CONTENT.top + CONTENT.height - TEXT_HEIGHT, INK.hint);
}

/** Draws the route. Returns where the hero's mark goes, if the hero is on the map of an area. */
function drawPage(graphics: Graphics, page: AutomapPageView): Rect | null {
  graphics.clear();
  const cards = page.areas.map((area) => ({
    area,
    label: fitLabel(area.name ?? UNKNOWN_NAME, MAX_LABEL_WIDTH, textWidthOf),
  }));
  const layout = layoutRoute(
    cards.map(({ area, label }) => ({
      tilesWide: area.width,
      tilesHigh: area.height,
      labelWidth: textWidthOf(label),
    })),
    ROUTE_SPACE,
    METRICS,
  );
  // The links go under the cards, so that a ring covers where a link meets a map.
  for (const strip of routeLinks(layout, linkedWithNext(page.areas), LINK)) {
    fill(graphics, LINK_COLOUR, strip);
  }
  let mark: Rect | null = null;
  for (const [index, { area, label }] of cards.entries()) {
    const place = layout.places[index];
    if (place !== undefined) {
      mark = drawCard(graphics, area, label, place, layout.scale) ?? mark;
    }
  }
  return mark;
}

function labelColour(area: AutomapAreaView): number {
  if (area.current) {
    return TITLE_COLOUR;
  }
  return area.discovered ? TEXT_COLOUR : UNDISCOVERED_TEXT_COLOUR;
}

function ringColour(area: AutomapAreaView): number {
  if (area.current) {
    return CURRENT_COLOUR;
  }
  return area.discovered ? DISCOVERED_RING_COLOUR : UNDISCOVERED_RING_COLOUR;
}

/**
 * Draws an area: its name, and its map in a ring. A map the hero has been to shows the tiles it has explored and the
 * exits it has found; one it has not been to is a blank box of the same size. Returns where the hero's mark goes, if
 * the hero is in this area.
 */
function drawCard(graphics: Graphics, area: AutomapAreaView, label: string, place: Place, scale: number): Rect | null {
  const { map } = place;
  drawText(graphics, label, place.label.left, place.label.top, labelColour(area));
  fill(graphics, ringColour(area), grown(map, area.current ? CURRENT_RING : 1));
  fill(graphics, area.discovered ? MAP_COLOUR : UNDISCOVERED_COLOUR, map);
  if (!area.discovered) {
    return null;
  }
  for (const { kind, rect } of tileRects(area.terrain, map, scale)) {
    fill(graphics, automapColour(area.id, kind), rect);
  }
  for (const exit of area.exits) {
    fill(graphics, EXIT_COLOUR, exitRect(exit.zone, map, scale, MIN_MARK));
  }
  return area.hero === null ? null : markerRect(area.hero, map, scale, Math.max(MIN_MARK, Math.ceil(scale)));
}
