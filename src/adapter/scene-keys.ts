import type { GameEvent } from '../core';

/** The keys the scenes are known by. A scene starts another by its key, and a key no scene has leaves a blank screen. */
export const SCENE_KEYS = { title: 'title', play: 'play', ending: 'ending' } as const;

/**
 * What the title tells the play screen as it starts it. Phaser keeps the data of the last start when a scene is started
 * with none, so the title always gives it.
 */
export interface PlayStart {
  /** Whether the play screen saves the game before anything else: a New Game does, and a Continue has its save. */
  readonly saveAtOnce?: boolean;
  /** The lines of the opening, which the play screen shows before the game goes on. Only a New Game has them. */
  readonly opening?: readonly string[];
}

/** What the title tells the play screen for a New Game, from the events the Game core gave for it: the opening, if any. */
export function startOfNewGame(events: readonly GameEvent[]): PlayStart {
  const opening = events.find((event) => event.type === 'opening');
  return opening === undefined ? { saveAtOnce: true } : { saveAtOnce: true, opening: opening.lines };
}

/** What the play screen tells the ending as it starts it: the lines of the ending and of the credits, which the game gave. */
export interface EndingStart {
  readonly ending: readonly string[];
  readonly credits: readonly string[];
}

/**
 * What the play screen tells the ending, from the events the Game core gave for the command that ended the game: the
 * ending and the credits, or none when the game did not end, so that the play screen goes to the title alone.
 */
export function startOfEnding(events: readonly GameEvent[]): EndingStart | null {
  const reached = events.find((event) => event.type === 'ending-reached');
  return reached === undefined ? null : { ending: reached.ending, credits: reached.credits };
}
