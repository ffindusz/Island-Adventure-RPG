import type Phaser from 'phaser';
import type { PickedUpItem } from '../core';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { CONSUMABLE_NAMES, shown, STAT_NAMES } from './labels';
import { drawText, TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Graphics } from './pixel-font';
import { pageKeyLabel } from './player-input';

// The notice of what the hero just found, low on the screen where it covers neither the hero nor the HUD. It is drawn
// from the pickup the Game core reported and nothing else.

/** Above the HUD, below the overlay: a page that opens covers the notice. */
const NOTICE_DEPTH = 150;

const PADDING = 6;
const BORDER = 2;
const LINE_GAP = 4;
const BOTTOM_MARGIN = 10;

const PANEL_COLOUR = 0x1b1b24;
const BORDER_COLOUR = 0x6a6a7a;
const TITLE_COLOUR = 0xf2c94c;
const GAIN_COLOUR = 0x7bd35f;
const HINT_COLOUR = 0xa0a0b0;

interface Line {
  readonly text: string;
  readonly colour: number;
}

/** Tells the player what the hero picked up. */
export class Notice {
  private readonly graphics: Graphics;
  private shown = 'null';

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(NOTICE_DEPTH);
  }

  /** Shows the item, or nothing. It draws again only when what it shows has changed. */
  draw(item: PickedUpItem | null): void {
    const key = JSON.stringify(item);
    if (key === this.shown) {
      return;
    }
    this.shown = key;
    this.graphics.clear();
    if (item !== null) {
      drawLines(this.graphics, linesFor(item));
    }
  }
}

function linesFor(item: PickedUpItem): Line[] {
  switch (item.kind) {
    case 'gear':
      return [
        { text: `FOUND ${item.name}`, colour: TITLE_COLOUR },
        { text: `+${shown(item.bonus)} ${STAT_NAMES[item.stat]}`, colour: GAIN_COLOUR },
        { text: `PRESS ${pageKeyLabel('inventory')} TO EQUIP`, colour: HINT_COLOUR },
      ];
    case 'consumable':
      return [
        { text: `FOUND ${CONSUMABLE_NAMES[item.id]}`, colour: TITLE_COLOUR },
        { text: `+${item.amount}`, colour: GAIN_COLOUR },
      ];
  }
}

function drawLines(graphics: Graphics, lines: readonly Line[]): void {
  const width = Math.max(...lines.map((line) => textWidthOf(line.text))) + 2 * PADDING;
  const height = lines.length * TEXT_HEIGHT + (lines.length - 1) * LINE_GAP + 2 * PADDING;
  const left = Math.floor((VIEW_WIDTH - width) / 2);
  const top = VIEW_HEIGHT - height - BOTTOM_MARGIN;
  graphics.fillStyle(BORDER_COLOUR);
  graphics.fillRect(left - BORDER, top - BORDER, width + 2 * BORDER, height + 2 * BORDER);
  graphics.fillStyle(PANEL_COLOUR);
  graphics.fillRect(left, top, width, height);
  lines.forEach((line, index) => {
    const lineLeft = left + Math.floor((width - textWidthOf(line.text)) / 2);
    drawText(graphics, line.text, lineLeft, top + PADDING + index * (TEXT_HEIGHT + LINE_GAP), line.colour);
  });
}
