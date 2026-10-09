import Phaser from 'phaser';
import { ARTWORK } from './artwork';
import { buildDrawnArt, queueArt, requireLoadedArt } from './asset-loader';
import type { GameAudio } from './audio';
import { AudioLine } from './audio-line';
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
// are in ending-pages.ts. The scene decides nothing about the game. The music of the ending is the audio service's.

/** The ending and the credits. */
export class EndingScene extends Phaser.Scene {
  private readonly audio: GameAudio;
  private layer!: UiLayer;
  private audioLine!: AudioLine;
  private playerInput!: PlayerInput;
  private pages: readonly EndingPage[] = [];
  private page = 0;
  /** The page on the screen, or -1 before the first is drawn. */
  private shown = -1;

  constructor(audio: GameAudio) {
    super(SCENE_KEYS.ending);
    this.audio = audio;
  }

  init(start: EndingStart): void {
    this.pages = layoutEnding(start.ending, start.credits);
    this.page = 0;
    this.shown = -1;
  }

  preload(): void {
    queueArt(this.load, ARTWORK);
    this.audio.queue(this);
  }

  create(): void {
    buildDrawnArt(this.textures, ARTWORK);
    requireLoadedArt(this.textures, ARTWORK);
    this.audio.requireLoaded();
    this.layer = new UiLayer(this, DEPTH.ending);
    this.audioLine = new AudioLine(this);
    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error('The keyboard plugin is not available, so nothing could turn the pages of the ending.');
    }
    this.playerInput = new PlayerInput(keyboard);
  }

  override update(_time: number, frameMs: number): void {
    // The keys of the audio work on every screen, whatever page the ending is on.
    this.audioLine.update(this.audio.press(this.playerInput.pollAudio()), frameMs);
    this.audio.playMusic({ at: 'ending' });
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
