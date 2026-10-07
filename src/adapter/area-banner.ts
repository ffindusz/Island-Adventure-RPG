import type Phaser from 'phaser';
import { VIEW_WIDTH } from './config';
import { drawText, TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Graphics } from './pixel-font';

// The text of an Adventure Area, across the top of the screen for a few seconds after the hero first comes in. It is
// drawn from the text the Game core's view carries, and the core also decides how long it stays: the banner is
// see-through and takes no input, so it never gets in the way of play.

/** Above the HUD, below the notice of what the hero found, and below the overlay. */
const BANNER_DEPTH = 120;

/** Below the HUD, which sits at the top left. */
const TOP = 36;
const SIDE_MARGIN = 6;
const PADDING = 6;
const BORDER = 2;
const LINE_GAP = 4;

const PANEL_COLOUR = 0x1b1b24;
const PANEL_ALPHA = 0.85;
const BORDER_COLOUR = 0x6a6a7a;
const TEXT_COLOUR = 0xf2f2f2;

/** Shows the text of the Adventure Area the hero has just come into. */
export class AreaBanner {
  private readonly graphics: Graphics;
  private shown: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(BANNER_DEPTH);
  }

  /** Shows the text, or nothing. It draws again only when what it shows has changed. */
  draw(text: string | null): void {
    if (text === this.shown) {
      return;
    }
    this.shown = text;
    this.graphics.clear();
    if (text !== null) {
      drawPanel(this.graphics, wrapText(text, VIEW_WIDTH - 2 * (SIDE_MARGIN + BORDER + PADDING)));
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

function drawPanel(graphics: Graphics, lines: readonly string[]): void {
  if (lines.length === 0) {
    return;
  }
  const width = Math.max(...lines.map(textWidthOf)) + 2 * PADDING;
  const height = lines.length * TEXT_HEIGHT + (lines.length - 1) * LINE_GAP + 2 * PADDING;
  const left = Math.floor((VIEW_WIDTH - width) / 2);
  graphics.fillStyle(PANEL_COLOUR, PANEL_ALPHA);
  graphics.fillRect(left, TOP, width, height);
  // The border is four strips, not a bigger rectangle behind the panel, so that nothing is blended twice.
  graphics.fillStyle(BORDER_COLOUR);
  graphics.fillRect(left - BORDER, TOP - BORDER, width + 2 * BORDER, BORDER);
  graphics.fillRect(left - BORDER, TOP + height, width + 2 * BORDER, BORDER);
  graphics.fillRect(left - BORDER, TOP, BORDER, height);
  graphics.fillRect(left + width, TOP, BORDER, height);
  lines.forEach((line, index) => {
    const lineLeft = left + Math.floor((width - textWidthOf(line)) / 2);
    drawText(graphics, line, lineLeft, TOP + PADDING + index * (TEXT_HEIGHT + LINE_GAP), TEXT_COLOUR);
  });
}
