import type { Command } from '../core';
import { isFreshPress } from './player-input';
import type { KeyPress } from './player-input';

// What the play screen does to put the text of an Adventure Area or of a sign away when the player presses a key. Which
// presses count is `isFreshPress` in player-input.ts. The rest is here, and none of it knows Phaser.

/** What the watch asks of a keyboard: to tell of the presses, as the event it is given, and to stop. Phaser's keyboard plugin does both. */
export interface PressSource {
  on(event: string, listener: (press: KeyPress) => void): unknown;
  off(event: string, listener: (press: KeyPress) => void): unknown;
}

/**
 * Whether a press that puts the text of an area away came since the last look. The play screen polls the keys that the
 * game uses, once per frame, but any key counts here and one that the game does not use is not polled: so this listens
 * for the keyboard's presses instead. `take` tells of a press and forgets it, so that a press puts the text away once.
 * Stop it with the screen: a watch that is stopped hears no press after.
 */
export class DismissalWatch {
  private readonly source: PressSource;
  private readonly event: string;
  private pressed = false;
  private readonly listener = (press: KeyPress): void => {
    if (isFreshPress(press)) {
      this.pressed = true;
    }
  };

  constructor(source: PressSource, event: string) {
    this.source = source;
    this.event = event;
    source.on(event, this.listener);
  }

  /** Whether a press that counts came since the last look. Asking forgets it. */
  take(): boolean {
    const pressed = this.pressed;
    this.pressed = false;
    return pressed;
  }

  /** Stops listening, and takes off only the listener it put on. */
  stop(): void {
    this.source.off(this.event, this.listener);
  }
}

const DISMISS: Command = { type: 'dismiss-area-text' };

/**
 * The commands of a frame with the dismissal of the area text ahead of them when a press counted, and as they were when
 * none did. The dismissal goes first so that the text is gone before the other commands of the frame run: the Interact
 * that reads a sign puts up the text of the sign after it, and that text stays. Does not change the list it is given.
 */
export function dismissalFirst(commands: readonly Command[], pressed: boolean): Command[] {
  return pressed ? [DISMISS, ...commands] : [...commands];
}
