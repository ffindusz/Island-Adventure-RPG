import type { ArtName } from './artwork';
import type { GameAudio } from './audio';
import { ChangeGuard } from './change-guard';
import { DEPTH } from './depths';
import { layoutEnding, turnPage } from './ending-pages';
import type { EndingPage } from './ending-pages';
import { GameScene } from './game-scene';
import { drawCard } from './opening-card';
import { SCENE_KEYS } from './scene-keys';
import type { EndingStart } from './scene-keys';
import { UiLayer } from './ui-layer';

// The ending and the credits: cards over a picture of the evening the hero sails home (the backdrop), one after another,
// which Enter turns, and after the last the title screen. The play screen starts it with the lines the Game core gave when
// the hero sailed home. The core is at the title by then and has written nothing, so the saved game is as it was; what the
// cards say and what Enter does are in ending-pages.ts. The scene decides nothing about the game. The music of the ending
// is the audio service's.

const BACKDROP = 'backdrop-ending' satisfies ArtName;

/** The ending and the credits. */
export class EndingScene extends GameScene {
  private layer!: UiLayer;
  private pages: readonly EndingPage[] = [];
  private page = 0;
  /** The page on the screen, if any is drawn yet. */
  private readonly shown = new ChangeGuard();

  constructor(audio: GameAudio) {
    super(SCENE_KEYS.ending, audio);
  }

  init(start: EndingStart): void {
    this.pages = layoutEnding(start.ending, start.credits);
    this.page = 0;
    this.shown.forget();
  }

  create(): void {
    this.requireFiles();
    this.add.image(0, 0, BACKDROP).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.backdrop);
    this.layer = new UiLayer(this, DEPTH.ending);
    this.useKeyboard('turn the pages of the ending');
  }

  override update(_time: number, frameMs: number): void {
    this.pollAudioKeys(frameMs);
    this.audio.playMusic({ at: 'ending' });
    const { page, done } = turnPage(this.page, this.pages.length, this.playerInput.pollMenu().confirm);
    if (done) {
      this.scene.start(SCENE_KEYS.title);
      return;
    }
    this.page = page;
    if (!this.shown.changed(page)) {
      return;
    }
    this.layer.clear();
    const card = this.pages[page];
    if (card !== undefined) {
      drawCard(this.layer, card);
    }
  }
}
