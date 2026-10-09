import Phaser from 'phaser';
import { ARTWORK } from './artwork';
import { buildDrawnArt, queueArt, requireLoadedArt } from './asset-loader';
import { DEPTH } from './depths';
import { layoutEnding, turnPage } from './ending-pages';
import type { EndingPage } from './ending-pages';
import { drawCard } from './opening-card';
import { PlayerInput } from './player-input';
import { SCENE_KEYS } from './scene-keys';
import type { EndingStart } from './scene-keys';
import { UiLayer } from './ui-layer';

// The ending and the credits: cards on a black screen, one after another, which Enter turns, and after the last the
// title screen. The play screen starts it with the lines the Game core gave when the hero sailed home. The core is at
// the title by then and has written nothing, so the saved game is as it was; what the cards say and what Enter does
// are in ending-pages.ts. The scene decides nothing about the game.

/** The ending and the credits. */
export class EndingScene extends Phaser.Scene {
  private layer!: UiLayer;
  private playerInput!: PlayerInput;
  private pages: readonly EndingPage[] = [];
  private page = 0;
  /** The page on the screen, or -1 before the first is drawn. */
  private shown = -1;

  constructor() {
    super(SCENE_KEYS.ending);
  }

  init(start: EndingStart): void {
    this.pages = layoutEnding(start.ending, start.credits);
    this.page = 0;
    this.shown = -1;
  }

  preload(): void {
    queueArt(this.load, ARTWORK);
  }

  create(): void {
    buildDrawnArt(this.textures, ARTWORK);
    requireLoadedArt(this.textures, ARTWORK);
    this.layer = new UiLayer(this, DEPTH.ending);
    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error('The keyboard plugin is not available, so nothing could turn the pages of the ending.');
    }
    this.playerInput = new PlayerInput(keyboard);
  }

  override update(): void {
    const { page, done } = turnPage(this.page, this.pages.length, this.playerInput.pollMenu().confirm);
    if (done) {
      this.scene.start(SCENE_KEYS.title);
      return;
    }
    this.page = page;
    if (page === this.shown) {
      return;
    }
    this.shown = page;
    this.layer.clear();
    const card = this.pages[page];
    if (card !== undefined) {
      drawCard(this.layer, card);
    }
  }
}
