import type { Game } from '../core';
import type { ArtName } from './artwork';
import type { GameAudio } from './audio';
import { ChangeGuard } from './change-guard';
import { drawControlsList } from './controls-list';
import { DEPTH } from './depths';
import { GameScene } from './game-scene';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { SavedGame, SaveStore } from './save-store';
import { SCENE_KEYS, keptByPause, startOfNewGame, startOfResume } from './scene-keys';
import type { KeptOfPlay, PlayStart, TitleStart } from './scene-keys';
import {
  GAME_TITLE,
  LOGO_EXTRUSION_OFFSETS,
  LOGO_OUTLINE_OFFSETS,
  TITLE_LINE_CORNER,
  logoLayout,
} from './title-layout';
import { openMenu, pressMenu, soundOfPress } from './title-menu';
import type { TitleMenu } from './title-menu';
import { layoutTitleWindow } from './title-window';
import type { TitleWindow } from './title-window';
import { INK, UiLayer } from './ui-layer';

// The title screen: what the game opens on, and the way into it. It offers New Game, Continue and Controls, tells the
// player why a saved game cannot be continued from, shows the list of the controls, and starts the play screen. It
// decides nothing about the game: the rules of the menu are in title-menu.ts, what its window says and where each row of
// it goes is title-window.ts's, the verdict on the saved game is the save store's (save-store.ts), and the Game core is
// only told which of the two begins. It never saves: the autosave belongs to the play screen (autosave.ts). Its music,
// and the sounds of its choices, are the audio service's (audio.ts). It is a picture of the coast (the backdrop), the name
// of the game across the top in big letters and the menu in a window under it; where the name goes is title-layout.ts's.
// It is also the paused screen: when the play screen puts a game away (pausing.ts) it starts this scene with a pause
// (scene-keys.ts), and the menu then has Resume on top, which starts the play screen again from the Game core's view,
// which the pause left as it was. Every start of this scene says whether it is paused, so that a pause is not carried
// into the title that the ending or the sailing home leads to.

const BACKDROP = 'backdrop-title' satisfies ArtName;

/** The title screen. */
export class TitleScene extends GameScene {
  private readonly core: Game;
  private readonly saves: SaveStore;
  private layer!: UiLayer;
  private saved: SavedGame = { status: 'none' };
  private menu: TitleMenu = openMenu(false);
  /** What the play screen kept of the game it put away, when this is the paused screen; null for the title itself. */
  private kept: KeptOfPlay | null = null;
  private readonly shown = new ChangeGuard();

  constructor(core: Game, saves: SaveStore, audio: GameAudio) {
    super(SCENE_KEYS.title, audio);
    this.core = core;
    this.saves = saves;
  }

  /** The first start of the game gives no data, and so does nothing else's: no data is the title, not the paused one. */
  init(start?: TitleStart): void {
    this.kept = keptByPause(start);
  }

  create(): void {
    this.requireFiles();
    this.add.image(0, 0, BACKDROP).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.backdrop);
    this.layer = new UiLayer(this, DEPTH.title);
    this.useKeyboard('choose from the title', TITLE_LINE_CORNER);
    // The saved game is looked at each time the title comes up, which is also when it is the freshest it can be.
    this.saved = this.saves.read();
    if (this.saved.status === 'unusable') {
      console.warn(`The saved game cannot be continued from (${this.saved.problem}): ${this.saved.detail}`);
    }
    this.menu = openMenu(this.saved.status === 'usable', this.kept !== null);
    this.shown.forget();
  }

  override update(_time: number, frameMs: number): void {
    this.pollAudioKeys(frameMs);
    this.audio.playMusic({ at: 'title' });
    const { step, confirm } = this.playerInput.pollMenu();
    const saved = this.saved;
    const { menu, choice } = pressMenu(this.menu, saved.status === 'usable', {
      step,
      confirm,
      cancel: this.playerInput.pollCancel(),
    });
    const sound = soundOfPress(this.menu, menu, choice);
    if (sound !== null) {
      this.audio.play(sound);
    }
    this.menu = menu;
    if (choice === 'resume' && this.kept !== null) {
      // The game in play goes on from where the Game core holds it: nothing is sent to the core, and nothing is saved.
      this.scene.start(SCENE_KEYS.play, startOfResume(this.kept));
    } else if (choice === 'new-game') {
      // The opening is among the events of a New Game; the play screen shows it and holds the game until Enter.
      this.scene.start(SCENE_KEYS.play, startOfNewGame(this.core.send({ type: 'new-game' })));
    } else if (choice === 'continue' && saved.status === 'usable') {
      this.core.send({ type: 'continue', snapshot: saved.snapshot });
      this.scene.start(SCENE_KEYS.play, { saveAtOnce: false } satisfies PlayStart);
    } else {
      this.draw();
    }
  }

  /** Draws the screen again only when what it shows has changed. */
  private draw(): void {
    const title = layoutTitleWindow(this.menu, this.saved);
    if (!this.shown.changed(title)) {
      return;
    }
    this.layer.clear();
    if (title.showsName) {
      drawLogo(this.layer);
    }
    drawWindow(this.layer, title);
  }
}

/** Draws the name of the game across the top: the letters in the title colour, a brown extrusion under them and a dark outline round both. */
function drawLogo(layer: UiLayer): void {
  const logo = logoLayout();
  const paint = (offset: { readonly x: number; readonly y: number }, colour: number): void =>
    layer.scaledText(GAME_TITLE, logo.left + offset.x, logo.top + offset.y, colour, logo.scale);
  LOGO_OUTLINE_OFFSETS.forEach((offset) => paint(offset, INK.logoOutline));
  LOGO_EXTRUSION_OFFSETS.forEach((offset) => paint(offset, INK.logoShade));
  paint({ x: 0, y: 0 }, INK.title);
}

/** Draws the window and its rows where `layoutTitleWindow` put them. */
function drawWindow(layer: UiLayer, title: TitleWindow): void {
  layer.window(title.left, title.top, title.width, title.height);
  for (const { row, box } of title.rows) {
    switch (row.kind) {
      case 'entry': {
        if (row.highlighted) {
          layer.frame('button', box.left, box.top, box.width, box.height);
        }
        const textLeft = box.left + Math.floor((box.width - textWidthOf(row.text)) / 2);
        layer.text(row.text, textLeft, box.top + Math.floor((box.height - TEXT_HEIGHT) / 2), row.colour);
        break;
      }
      case 'text':
        layer.text(row.text, box.left, box.top, row.colour);
        break;
      case 'controls':
        drawControlsList(layer, row.layout, box.left, box.top);
        break;
    }
  }
}
