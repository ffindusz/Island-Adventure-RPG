import type { GameEvent } from '../core';

/** The keys the scenes are known by. A scene starts another by its key, and a key no scene has leaves a blank screen. */
export const SCENE_KEYS = { title: 'title', play: 'play', ending: 'ending' } as const;

/**
 * What the play screen holds of a game that the Game core's view does not tell, and that goes with the game while it is
 * put away on the paused screen, so that the play screen made afresh from the view brings back the game as it was.
 */
export interface KeptOfPlay {
  /** Whether the fight with the Guardian is on, which the music of the fight follows (audio-manifest.ts). */
  readonly fight: boolean;
  /** How long the line that says H FOR CONTROLS has left, in milliseconds (controls-line.ts); 0 once it is gone. */
  readonly controlsLineMs: number;
}

/**
 * What the title tells the play screen as it starts it. Phaser keeps the data of the last start when a scene is started
 * with none, so the title always gives it, and what a Resume gives is not left in the data of a later start.
 */
export interface PlayStart {
  /** Whether the play screen saves the game before anything else: a New Game does, and a Continue has its save. */
  readonly saveAtOnce?: boolean;
  /** The lines of the opening, which the play screen shows before the game goes on. Only a New Game has them. */
  readonly opening?: readonly string[];
  /** What the play screen brings back of a game that was put away. Only a Resume from the paused screen has it. */
  readonly resumed?: KeptOfPlay;
}

/** What the title tells the play screen for a New Game, from the events the Game core gave for it: the opening, if any. */
export function startOfNewGame(events: readonly GameEvent[]): PlayStart {
  const opening = events.find((event) => event.type === 'opening');
  return opening === undefined ? { saveAtOnce: true } : { saveAtOnce: true, opening: opening.lines };
}

/**
 * What the title tells the play screen for a Resume, which brings the game in play back as the Game core holds it: no
 * opening, whatever the game began with, and no save at once, for nothing of the game is new. The fight and the line are
 * what the play screen kept when it put the game away.
 */
export function startOfResume(kept: KeptOfPlay): PlayStart {
  return { saveAtOnce: false, resumed: kept };
}

/**
 * What a Resume brings back, from the data the play screen was started with, or null for any start that is not a Resume:
 * a New Game, a Continue, empty data, none.
 */
export function keptByResume(start: PlayStart | undefined): KeptOfPlay | null {
  return start?.resumed ?? null;
}

/**
 * What the play screen tells the title as it starts it: that it is paused, and what it kept of the game it put away,
 * or that it is not. Every start of the title gives it, for Phaser keeps the data of the last start when a scene is
 * started with none, and a pause that was left in it would make the title that the sailing home reaches a paused one.
 */
export interface TitleStart {
  readonly paused?: boolean;
  readonly kept?: KeptOfPlay;
}

/** What a paused title keeps when it is told nothing: no fight on, and no line that says H FOR CONTROLS. */
const NOTHING_KEPT: KeptOfPlay = { fight: false, controlsLineMs: 0 };

/** What the play screen or the ending tells the title: `startOfTitle(false)` for the title, and a pause for a game put away. */
export function startOfTitle(paused: boolean, kept: KeptOfPlay = NOTHING_KEPT): TitleStart {
  return paused ? { paused: true, kept } : { paused: false };
}

/**
 * What the paused screen keeps for a Resume, from the data the title was started with, or null when the title is not
 * paused: data that says so, empty data, none (the first start of the game) and data with no word of a pause.
 */
export function keptByPause(start: TitleStart | undefined): KeptOfPlay | null {
  return start?.paused === true ? (start.kept ?? NOTHING_KEPT) : null;
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
