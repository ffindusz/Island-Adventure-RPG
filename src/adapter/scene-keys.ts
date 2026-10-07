/** The keys the scenes are known by. A scene starts another by its key, and a key no scene has leaves a blank screen. */
export const SCENE_KEYS = { title: 'title', play: 'play' } as const;

/**
 * What the title tells the play screen as it starts it. Phaser keeps the data of the last start when a scene is started
 * with none, so the title always gives it.
 */
export interface PlayStart {
  /** Whether the play screen saves the game before anything else: a New Game does, and a Continue has its save. */
  readonly saveAtOnce?: boolean;
}
