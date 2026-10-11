import type Phaser from 'phaser';
import { ChangeGuard } from './change-guard';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { DEPTH } from './depths';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Rect } from './pixel-font';
import { INK, UiLayer } from './ui-layer';

// The line that says what a key of the audio did: VOLUME 6/10, SOUND OFF or SOUND ON. It sits against a corner of the
// screen for a moment after the key: the top right, where the play screen and the ending draw nothing, or the corner a
// screen asks for when it draws something there (the title's name runs across the top, so the title asks for the bottom
// right). A page that fills the screen, the Automap or the inventory, has something under every corner, and the line is
// then over the page's frame for the moment it stays. The keys work on every screen, so the line is above everything,
// the pages and the card of the opening included, and, like the area banner, it is see-through and takes no input. Each
// screen has a line of its own, which it gives the frame's time and what the keys said. The time is the frames' and not
// a timer's, so that the line stays for as long as the game is shown and no longer.

/** How long the line stays after the last press of a key, in milliseconds. */
const LINE_MS = 1500;

/** From the screen's edge to the panel, and from the panel's edge, whose frame is 3 pixels wide, to the text. */
const MARGIN = 4;
const PADDING = 6;

const PANEL_ALPHA = 0.9;

/** The corners of the screen the line may sit in, always against the right edge. */
export type LineCorner = 'top-right' | 'bottom-right';

/** Where the panel of a line that says this goes: against the corner, `MARGIN` from both of its edges of the screen. */
export function audioLineBox(text: string, corner: LineCorner = 'top-right'): Rect {
  const width = textWidthOf(text) + 2 * PADDING;
  const height = TEXT_HEIGHT + 2 * PADDING;
  return {
    left: VIEW_WIDTH - MARGIN - width,
    top: corner === 'top-right' ? MARGIN : VIEW_HEIGHT - MARGIN - height,
    width,
    height,
  };
}

/** Shows what the keys of the audio did, for a moment. */
export class AudioLine {
  private readonly layer: UiLayer;
  private readonly corner: LineCorner;
  private text: string | null = null;
  private remaining = 0;
  private readonly shown = new ChangeGuard();

  constructor(scene: Phaser.Scene, corner: LineCorner = 'top-right') {
    this.layer = new UiLayer(scene, DEPTH.audioLine);
    this.corner = corner;
  }

  /**
   * Call it every frame with what the keys said in it, or null when they said nothing, and the frame's time. What the keys
   * said takes the place of the line that is on the screen, and stays for a moment after the last press.
   */
  update(said: string | null, frameMs: number): void {
    if (said !== null) {
      this.text = said;
      this.remaining = LINE_MS;
    } else if (this.text !== null) {
      this.remaining -= frameMs;
      if (this.remaining <= 0) {
        this.text = null;
      }
    }
    this.draw();
  }

  /** Draws again only when what it shows has changed. */
  private draw(): void {
    if (!this.shown.changed(this.text)) {
      return;
    }
    this.layer.clear();
    if (this.text !== null) {
      drawPanel(this.layer, this.text, this.corner);
    }
  }
}

function drawPanel(layer: UiLayer, text: string, corner: LineCorner): void {
  const box = audioLineBox(text, corner);
  layer.frame('panel', box.left, box.top, box.width, box.height, PANEL_ALPHA);
  layer.text(text, box.left + PADDING, box.top + PADDING, INK.text);
}
