import type Phaser from 'phaser';
import { VIEW_WIDTH } from './config';
import { HUD_BOTTOM } from './hud';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import { INK, UiLayer } from './ui-layer';

// The text of an Adventure Area, across the top of the screen for a few seconds after the hero first comes in. It is
// drawn from the text the Game core's view carries, and the core also decides how long it stays: the banner is
// see-through and takes no input, so it never gets in the way of play.

/** Above the HUD, below the notice of what the hero found, and below the overlay. */
const BANNER_DEPTH = 120;

const SIDE_MARGIN = 6;
/** From the panel's edge, whose frame is 3 pixels wide, to the text. */
const PADDING = 8;
const LINE_GAP = 4;
/** The air between the HUD and the banner's panel, in canvas pixels. */
const BELOW_HUD = 4;
/** Where the banner's panel starts: below the HUD, so that the two never overlap. */
const TOP = HUD_BOTTOM + BELOW_HUD;

const PANEL_ALPHA = 0.9;

/** The widest a line of the text may be, in canvas pixels: the screen less the margin and the padding at both sides. */
export const BANNER_TEXT_WIDTH = VIEW_WIDTH - 2 * (SIDE_MARGIN + PADDING);

/** Shows the text of the Adventure Area the hero has just come into. */
export class AreaBanner {
  private readonly layer: UiLayer;
  private shown: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.layer = new UiLayer(scene, BANNER_DEPTH);
  }

  /** Shows the text, or nothing. It draws again only when what it shows has changed. */
  draw(text: string | null): void {
    if (text === this.shown) {
      return;
    }
    this.shown = text;
    this.layer.clear();
    if (text !== null) {
      drawPanel(this.layer, wrapText(text, BANNER_TEXT_WIDTH));
    }
  }
}

/** Breaks the text into lines at spaces, none wider than `maxWidth` canvas pixels. A word wider than that stays whole. */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter((candidate) => candidate !== '')) {
    const joined = line === '' ? word : `${line} ${word}`;
    if (line !== '' && textWidthOf(joined) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = joined;
    }
  }
  if (line !== '') {
    lines.push(line);
  }
  return lines;
}

function drawPanel(layer: UiLayer, lines: readonly string[]): void {
  if (lines.length === 0) {
    return;
  }
  const width = Math.max(...lines.map(textWidthOf)) + 2 * PADDING;
  const height = lines.length * TEXT_HEIGHT + (lines.length - 1) * LINE_GAP + 2 * PADDING;
  const left = Math.floor((VIEW_WIDTH - width) / 2);
  layer.frame('panel', left, TOP, width, height, PANEL_ALPHA);
  lines.forEach((line, index) => {
    const lineLeft = left + Math.floor((width - textWidthOf(line)) / 2);
    layer.text(line, lineLeft, TOP + PADDING + index * (TEXT_HEIGHT + LINE_GAP), INK.text);
  });
}
