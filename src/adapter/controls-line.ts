// The short line that says H FOR CONTROLS, on the play screen for a few seconds after play begins: when the player ends
// the card of a New Game, and when a saved game is continued. It is the adapter's alone, made from the table of the
// keys (controls.ts) and kept by the play screen for the game it was made for, so that nothing of it is saved. Its time
// is the frames' and not a timer's: a frame counts only while the game runs and the player watches, so that a player
// who opens a page at once does not lose the line and a tab that nobody looks at does not spend it. It sits in the top
// row of the screen, in the middle: the HUD ends at x = 90, the text of an area starts at y = 52 and the audio line, at
// its widest, starts at x = 233 in either of its corners, so the 95 by 19 panel has room on every side, and the notice,
// which is low on the screen, never meets it. It is drawn over the HUD and the text of an area and under the notice and
// the pages, see-through and taking no input, as the audio line is.

import type Phaser from 'phaser';
import { audioLineBox } from './audio-line';
import { ChangeGuard } from './change-guard';
import { VIEW_WIDTH } from './config';
import { controlsLineText } from './controls';
import { DEPTH } from './depths';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Rect } from './pixel-font';
import { INK, PANEL_ALPHA, UiLayer } from './ui-layer';

/** How long the line stays, in milliseconds of the frames that count: as long as the text of an area stays. */
const LINE_MS = 4000;

/** Where the panel of the line that says this goes: the size and the row of the audio line's panel, in the middle of the screen. */
export function controlsLineBox(text: string): Rect {
  const { width, height, top } = audioLineBox(text);
  return { left: Math.floor((VIEW_WIDTH - width) / 2), top, width, height };
}

/** What one frame of the play screen is to the line. */
export interface FrameOfPlay {
  /** Whether the player can be looking at the game: its tab is showing and its window has the keyboard focus. */
  readonly watching: boolean;
  /** Whether the game waits for the player: a page is open, a Stat Point is to be assigned or the question whether to sail home is asked. */
  readonly waiting: boolean;
}

/**
 * How long the line has left, as a rule of its own with no Phaser. The play screen makes a new one for every game and
 * gives it every frame of the game that runs after the card: the frames of the card and of a fall are not given, and
 * so take nothing. Once it is gone it does not come back in the same game.
 */
export class ControlsLineTime {
  private remaining = LINE_MS;

  /**
   * Lets the frame's time pass and says whether the line is on the screen in this frame. The time of a frame counts only
   * while the player watches and the game does not wait. While the game waits the line is off the screen and keeps what
   * it had left, and it is back, with that, when the game runs on. A frame that nobody watches leaves the line on and
   * takes nothing.
   */
  frame(frameMs: number, play: FrameOfPlay): boolean {
    if (play.watching && !play.waiting) {
      this.remaining -= frameMs;
    }
    return this.remaining > 0 && !play.waiting;
  }

  /** Ends the line for good: the player opened the Controls page, so has found it. */
  dismiss(): void {
    this.remaining = 0;
  }
}

/** Shows the line that says what H is for, while the play screen says it is on. */
export class ControlsLine {
  private readonly layer: UiLayer;
  private readonly shown = new ChangeGuard();

  constructor(scene: Phaser.Scene) {
    this.layer = new UiLayer(scene, DEPTH.controlsLine);
  }

  /** Shows the line, or nothing. It draws again only when what it shows has changed. */
  draw(on: boolean): void {
    if (!this.shown.changed(on)) {
      return;
    }
    this.layer.clear();
    if (on) {
      drawPanel(this.layer, controlsLineText());
    }
  }
}

function drawPanel(layer: UiLayer, text: string): void {
  const box = controlsLineBox(text);
  layer.frame('panel', box.left, box.top, box.width, box.height, PANEL_ALPHA);
  layer.text(
    text,
    box.left + Math.floor((box.width - textWidthOf(text)) / 2),
    box.top + Math.floor((box.height - TEXT_HEIGHT) / 2),
    INK.text,
  );
}
