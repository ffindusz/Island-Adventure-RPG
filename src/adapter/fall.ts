import type { MonsterView, PlayingView } from '../core';

// How the fall of a defeated hero plays out on the screen. The Game core puts the hero back at its Checkpoint, whole
// again, in the very step that defeats it, so what its view shows then is already the place the hero returned to. The
// adapter shows the place the hero fell in for a moment first, the last frame the player saw with the hero lying in it,
// then fades to black, and only then shows the place it returned to. It is cosmetic: the adapter runs no step of the Game
// core while the fall plays, and nothing the Game core decides depends on it.

/** How long the hero lies where it fell, in milliseconds. */
export const FALL_LIE_MS = 600;

/** How long the screen takes to fade to black after that, in milliseconds. */
export const FALL_FADE_OUT_MS = 250;

export type FallStage = 'lying' | 'fading-out' | 'over';

/** One fall, from the frame the hero was defeated. */
export class Fall {
  /** What the screen shows of the world while the hero lies. */
  readonly view: PlayingView;
  private elapsedMs = 0;

  /** `lastFrame` is the last view the player saw before the defeat. */
  constructor(lastFrame: PlayingView) {
    this.view = {
      ...lastFrame,
      // The text of the area, and the arrows that were in the air, belong to the life that ended.
      areaText: null,
      arrows: [],
      hero: { ...lastFrame.hero, health: 0 },
      monsters: lastFrame.monsters.map(strikeLanded),
    };
  }

  /** Lets one frame's time pass. */
  age(frameMs: number): void {
    this.elapsedMs += frameMs;
  }

  get stage(): FallStage {
    if (this.elapsedMs < FALL_LIE_MS) {
      return 'lying';
    }
    return this.elapsedMs < FALL_LIE_MS + FALL_FADE_OUT_MS ? 'fading-out' : 'over';
  }
}

/** A monster that was winding up has struck by now, and rests: its warning would only show a blow that already fell. */
function strikeLanded(monster: MonsterView): MonsterView {
  return monster.action.type === 'winding-up' ? { ...monster, action: { type: 'recovering' } } : monster;
}
