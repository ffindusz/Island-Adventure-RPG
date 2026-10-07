import type Phaser from 'phaser';
import type { PlayingView } from '../core';
import { bitmapHeight, bitmapWidth, drawBitmap, drawText, TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Bitmap, Graphics } from './pixel-font';

// The heads-up display: what the player must always see, drawn from the Game core's view and nothing else. It sits at
// the top left, fixed to the screen. Text objects blur at this size, so the digits are a tiny bitmap font drawn with
// rectangles, which stays sharp at every zoom.

/** Above everything the play screen draws. */
const HUD_DEPTH = 100;

/** Distance from the screen's edge to the panel, and from the panel's edge to what it holds, in canvas pixels. */
const MARGIN = 2;
const PADDING = 3;
/** Gap between the heart and the numbers, and between the numbers and the bar, in canvas pixels. */
const GAP = 4;
const BAR_HEIGHT = 4;

const PANEL_COLOUR = 0x1b1b24;
const PANEL_ALPHA = 0.85;
const TEXT_COLOUR = 0xffffff;
const HEART_COLOUR = 0xe8505b;
const BAR_COLOUR = 0x7bd35f;
const BAR_TRACK_COLOUR = 0x4a4a5a;

const HEART: Bitmap = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];

/** The hero's Health, as a heart, "current/maximum" and a bar. */
export class Hud {
  private readonly graphics: Graphics;
  private shownHealth: number | null = null;
  private shownMaxHealth: number | null = null;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH);
  }

  /** Shows what the view says. It draws again only when the Health it shows has changed. */
  draw(view: PlayingView): void {
    const { health, maxHealth } = view.hero;
    if (health === this.shownHealth && maxHealth === this.shownMaxHealth) {
      return;
    }
    this.shownHealth = health;
    this.shownMaxHealth = maxHealth;
    this.drawHealth(health, maxHealth);
  }

  private drawHealth(health: number, maxHealth: number): void {
    // Rounded up, so a hero that is still standing never reads as 0.
    const current = Math.ceil(health);
    const maximum = Math.ceil(maxHealth);
    // The panel is as wide as the numbers are when Health is full, so it does not change size as Health drops.
    const textWidth = textWidthOf(`${maximum}/${maximum}`);
    const heartWidth = bitmapWidth(HEART);
    const contentWidth = heartWidth + GAP + textWidth;
    const rowHeight = bitmapHeight(HEART);
    const left = MARGIN + PADDING;
    const top = MARGIN + PADDING;
    const barTop = top + rowHeight + GAP;

    const graphics = this.graphics;
    graphics.clear();
    graphics.fillStyle(PANEL_COLOUR, PANEL_ALPHA);
    graphics.fillRect(MARGIN, MARGIN, contentWidth + 2 * PADDING, rowHeight + GAP + BAR_HEIGHT + 2 * PADDING);
    drawBitmap(graphics, HEART, left, top, HEART_COLOUR);
    const textTop = top + (rowHeight - TEXT_HEIGHT) / 2;
    drawText(graphics, `${current}/${maximum}`, left + heartWidth + GAP, textTop, TEXT_COLOUR);
    graphics.fillStyle(BAR_TRACK_COLOUR);
    graphics.fillRect(left, barTop, contentWidth, BAR_HEIGHT);
    graphics.fillStyle(BAR_COLOUR);
    graphics.fillRect(left, barTop, filledWidth(contentWidth, health, maxHealth), BAR_HEIGHT);
  }
}

/** How much of a bar is filled: all of it at full Health, a sliver while any Health is left, none at 0. */
function filledWidth(width: number, health: number, maxHealth: number): number {
  if (health <= 0) {
    return 0;
  }
  return Math.min(width, Math.max(1, Math.round((width * health) / maxHealth)));
}
