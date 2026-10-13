import type { Command, Direction, GameEvent, GameView } from '../core';
import { DIRECTIONS } from './controls';
import { isFreshPress } from './player-input';
import type { KeyPress } from './player-input';
import { gameIsWaiting } from './waiting';

/** What one frame of play tells the rule of the pause. */
export interface PauseFrame {
  /** The press of Esc that went down in the frame (`PlayerInput`), or null when none did. */
  readonly esc: KeyPress | null;
  /** The view of the game at the start of the frame, before the keys were turned into commands. */
  readonly before: GameView;
  /** The view of the game at the end of the frame, after its steps. */
  readonly after: GameView;
  /** Everything that happened in the frame. */
  readonly events: readonly GameEvent[];
}

/** Whether the game is in play and nothing waits for the player in this view: no page, no Stat Point, no question. */
function isRunning(view: GameView): boolean {
  return view.phase === 'playing' && !gameIsWaiting(view);
}

/**
 * Whether Esc puts the game away for the start screen in this frame. It does when a fresh Esc went down (not the repeat
 * of a key held down, and not with Ctrl or Cmd) and the game ran from the start of the frame to its end: where a page or
 * the question whether to sail home was open at the start, the Esc closed it or declined it; where one opened or a Stat
 * Point came in the frame, the player has something to attend to. A frame in which the hero was defeated never pauses:
 * the fall is about to be shown, and that Esc is lost. The text of an area on the screen does not stop it.
 */
export function pausesTheGame({ esc, before, after, events }: PauseFrame): boolean {
  return (
    esc !== null &&
    isFreshPress(esc) &&
    isRunning(before) &&
    isRunning(after) &&
    !events.some((event) => event.type === 'hero-defeated')
  );
}

/**
 * The commands that let go of every walk key before the game is put away. The Game core keeps a direction held until it
 * is told `stop`, and the play screen, which reads the keys, is gone while the start screen shows: a key let go there
 * would never be seen, and the hero would walk on by itself when the game came back. The core's `stop` turns the hero
 * toward the direction still held last, so the stop of the direction the hero faces comes last: it is the one that
 * leaves nothing held to turn it away.
 */
export function stopsBeforePausing(facing: Direction): Command[] {
  return [...DIRECTIONS.filter((direction) => direction !== facing), facing].map(
    (direction): Command => ({ type: 'stop', direction }),
  );
}
