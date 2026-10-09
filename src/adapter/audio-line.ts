import type Phaser from 'phaser';
import { VIEW_WIDTH } from './config';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import { INK, UiLayer } from './ui-layer';

// The line that says what a key of the audio did: VOLUME 6, SOUND OFF or SOUND ON. It sits in the top right corner, where
// nothing else of any screen is drawn, for a moment after the key. The keys work on every screen, so the line is above
// everything, the pages and the card of the opening included, and, like the area banner, it is see-through and takes no
// input. Each screen has a line of its own, which it gives the frame's time and what the keys said. The time is the
// frames' and not a timer's, so that the line stays for as long as the game is shown and no longer.

/** Above the title and the ending (300) and above everything the play screen draws, its pages and the opening card (250) too. */
const LINE_DEPTH = 400;

/** How long the line stays after the last press of a key, in milliseconds. */
const LINE_MS = 1500;

/** From the screen's edge to the panel, and from the panel's edge, whose frame is 3 pixels wide, to the text. */
const MARGIN = 4;
const PADDING = 6;

const PANEL_ALPHA = 0.9;

/** Shows what the keys of the audio did, for a moment. */
export class AudioLine {
  private readonly layer: UiLayer;
  private text: string | null = null;
  private remaining = 0;
  private shown: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.layer = new UiLayer(scene, LINE_DEPTH);
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
    if (this.text === this.shown) {
      return;
    }
    this.shown = this.text;
    this.layer.clear();
    if (this.text !== null) {
      drawPanel(this.layer, this.text);
    }
  }
}

function drawPanel(layer: UiLayer, text: string): void {
  const width = textWidthOf(text) + 2 * PADDING;
  const left = VIEW_WIDTH - MARGIN - width;
  layer.frame('panel', left, MARGIN, width, TEXT_HEIGHT + 2 * PADDING, PANEL_ALPHA);
  layer.text(text, left + PADDING, MARGIN + PADDING, INK.text);
}
