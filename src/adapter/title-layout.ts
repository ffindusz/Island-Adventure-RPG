import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';

// Where the title screen puts its big name and its menu window, in canvas pixels, and nothing else: the title scene
// draws them where this says, and the rules about room are here so that they can be tested without a screen. The name
// goes across the top, in the project's letters scaled by a whole number (a fraction would put the edge of a pixel
// inside a canvas pixel and blur it), and the window is in the middle of the room that is left under it, so that a
// window with more rows (a message about the saved game, the hints) grows upward and never over the name.

/** What the screen is called. */
export const GAME_TITLE = 'ISLAND ADVENTURE';

/** How many times the font's own size the name may be, the biggest that fits first. */
const SCALES = [4, 3, 2] as const;
/** The room between the name and the screen's edge at each side, and from the top. */
const SIDE_MARGIN = 12;
const TOP_MARGIN = 10;
/** The room between the name's paint and the window under it, and between the window and the foot of the screen. */
const GAP_UNDER_LOGO = 2;
const FOOT_MARGIN = 4;

/** How far down the brown extrusion reaches below the letters, and how far the dark outline reaches round both. */
export const LOGO_EXTRUSION = 2;
export const LOGO_OUTLINE = 1;

export interface Offset {
  readonly x: number;
  readonly y: number;
}

/** The letters repeated lower down, one pass for each pixel of the extrusion. */
export const LOGO_EXTRUSION_OFFSETS: readonly Offset[] = Array.from({ length: LOGO_EXTRUSION }, (_, at) => ({
  x: 0,
  y: at + 1,
}));

/** The letters repeated all round and down the length of the extrusion, so that the outline closes round both. */
export const LOGO_OUTLINE_OFFSETS: readonly Offset[] = Array.from(
  { length: 2 * LOGO_OUTLINE + 1 },
  (_, column) => column - LOGO_OUTLINE,
).flatMap((x) =>
  Array.from({ length: 2 * LOGO_OUTLINE + LOGO_EXTRUSION + 1 }, (_, row) => ({ x, y: row - LOGO_OUTLINE })),
);

/** The name as the title screen draws it: the letters' own box, with the whole-number scale they are drawn at. */
export interface Logo {
  readonly scale: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Where the name goes: the biggest whole scale that leaves room at both sides, in the middle of the screen's width. */
export function logoLayout(text: string = GAME_TITLE, viewWidth: number = VIEW_WIDTH): Logo {
  const scale = SCALES.find((candidate) => textWidthOf(text) * candidate + 2 * SIDE_MARGIN <= viewWidth);
  if (scale === undefined) {
    throw new RangeError(`The name ${text} does not fit across ${viewWidth} pixels at any scale it may be drawn at.`);
  }
  const width = textWidthOf(text) * scale;
  return { scale, left: Math.floor((viewWidth - width) / 2), top: TOP_MARGIN, width, height: TEXT_HEIGHT * scale };
}

/** The box that everything of the name's paint (letters, extrusion and outline) lies within; `right` and `bottom` are the first pixels outside. */
export function paintedBounds(logo: Logo): { left: number; top: number; right: number; bottom: number } {
  return {
    left: logo.left - LOGO_OUTLINE,
    top: logo.top - LOGO_OUTLINE,
    right: logo.left + logo.width + LOGO_OUTLINE,
    bottom: logo.top + logo.height + LOGO_EXTRUSION + LOGO_OUTLINE,
  };
}

/**
 * The top of a menu window of this height: in the middle of the room between the name and the foot of the screen, never
 * higher than the name's paint allows. A window too tall for the room starts right under the name and runs off the foot.
 */
export function windowTop(windowHeight: number): number {
  const roomTop = paintedBounds(logoLayout()).bottom + GAP_UNDER_LOGO;
  const roomBottom = VIEW_HEIGHT - FOOT_MARGIN;
  return Math.max(roomTop, roomTop + Math.floor((roomBottom - roomTop - windowHeight) / 2));
}
