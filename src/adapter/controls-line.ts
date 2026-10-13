// The short line that says H FOR CONTROLS, on the play screen for a few seconds after play begins: when the player ends
// the card of a New Game, and when a saved game is continued. It is the adapter's alone, made from the table of the
// keys (controls.ts) and kept by the play screen for the game it was made for, so that nothing of it is saved. Its time
// is the frames' and not a timer's: a frame counts only while the game runs and the player watches, so that a player
// who opens a page at once does not lose the line and a tab that nobody looks at does not spend it.

/** How long the line stays, in milliseconds of the frames that count: as long as the text of an area stays. */
const LINE_MS = 4000;

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
  frame(frameMs: number, of: FrameOfPlay): boolean {
    if (of.watching && !of.waiting) {
      this.remaining -= frameMs;
    }
    return this.remaining > 0 && !of.waiting;
  }

  /** Ends the line for good: the player opened the Controls page, so has found it. */
  dismiss(): void {
    this.remaining = 0;
  }
}
