import Phaser from 'phaser';
import type { Game } from '../core';
import { ARTWORK } from './artwork';
import type { ArtName } from './artwork';
import { buildDrawnArt, queueArt, requireLoadedArt } from './asset-loader';
import type { GameAudio } from './audio';
import { AudioLine } from './audio-line';
import { ChangeGuard } from './change-guard';
import { VIEW_WIDTH } from './config';
import { audioKeyLabel, closePageKeyLabel, confirmKeyLabel } from './controls';
import { DEPTH } from './depths';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import { PlayerInput } from './player-input';
import { stackHeight, stackRows } from './row-stack';
import type { RowRules } from './row-stack';
import type { SavedGame, SaveStore } from './save-store';
import { SCENE_KEYS, startOfNewGame } from './scene-keys';
import type { PlayStart } from './scene-keys';
import {
  GAME_TITLE,
  LOGO_EXTRUSION_OFFSETS,
  LOGO_OUTLINE_OFFSETS,
  TITLE_LINE_CORNER,
  logoLayout,
  windowTop,
} from './title-layout';
import { MENU_ENTRIES, openMenu, pressMenu, selectableEntries } from './title-menu';
import type { MenuEntry, TitleMenu } from './title-menu';
import { INK, UiLayer, WINDOW_PADDING } from './ui-layer';

// The title screen: what the game opens on, and the way into it. It offers New Game and Continue, tells the player why
// a saved game cannot be continued from, and starts the play screen. It decides nothing about the game: the rules of
// the menu are in title-menu.ts, the verdict on the saved game is the save store's (save-store.ts), and the Game core
// is only told which of the two begins. It never saves: the autosave belongs to the play screen (autosave.ts). Its music,
// and the sounds of its choices, are the audio service's (audio.ts). It is a picture of the coast (the backdrop), the name
// of the game across the top in big letters and the menu in a window under it; where the name and the window go is
// title-layout.ts's.

const BACKDROP = 'backdrop-title' satisfies ArtName;
const WINDOW_WIDTH = 200;
const ROW_GAP = 4;
/** A line of the menu is as high as the button behind the line the cursor is on, which is as wide as the line. */
const ENTRY_HEIGHT = 15;
const ENTRY_WIDTH = 112;

const ENTRY_LABELS: Readonly<Record<MenuEntry, string>> = { 'new-game': 'NEW GAME', continue: 'CONTINUE' };

type Row =
  /** Centred. */
  | { readonly kind: 'text'; readonly text: string; readonly colour: number }
  /** A line of the menu, centred. The button is behind it when the cursor is on it. */
  | { readonly kind: 'entry'; readonly text: string; readonly colour: number; readonly highlighted: boolean }
  /** A little more room. */
  | { readonly kind: 'space'; readonly height: number };

/** The title screen. */
export class TitleScene extends Phaser.Scene {
  private readonly core: Game;
  private readonly saves: SaveStore;
  private readonly audio: GameAudio;
  private layer!: UiLayer;
  private audioLine!: AudioLine;
  private playerInput!: PlayerInput<Phaser.Input.Keyboard.Key>;
  private saved: SavedGame = { status: 'none' };
  private menu: TitleMenu = openMenu(false);
  private readonly shown = new ChangeGuard();

  constructor(core: Game, saves: SaveStore, audio: GameAudio) {
    super(SCENE_KEYS.title);
    this.core = core;
    this.saves = saves;
    this.audio = audio;
  }

  preload(): void {
    queueArt(this.load, ARTWORK);
    this.audio.queue(this);
  }

  create(): void {
    buildDrawnArt(this.textures, ARTWORK);
    requireLoadedArt(this.textures, ARTWORK);
    this.audio.requireLoaded();
    this.add.image(0, 0, BACKDROP).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.backdrop);
    this.layer = new UiLayer(this, DEPTH.title);
    this.audioLine = new AudioLine(this, TITLE_LINE_CORNER);
    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error('The keyboard plugin is not available, so nothing could choose from the title.');
    }
    this.playerInput = new PlayerInput(keyboard, Phaser.Input.Keyboard.JustDown);
    // The saved game is looked at each time the title comes up, which is also when it is the freshest it can be.
    this.saved = this.saves.read();
    if (this.saved.status === 'unusable') {
      console.warn(`The saved game cannot be continued from (${this.saved.problem}): ${this.saved.detail}`);
    }
    this.menu = openMenu(this.saved.status === 'usable');
    this.shown.forget();
  }

  override update(_time: number, frameMs: number): void {
    // The keys of the audio work on every screen, whatever the menu is doing.
    this.audioLine.update(this.audio.press(this.playerInput.pollAudio()), frameMs);
    this.audio.playMusic({ at: 'title' });
    const { step, confirm } = this.playerInput.pollMenu();
    const saved = this.saved;
    const { menu, choice } = pressMenu(this.menu, saved.status === 'usable', {
      step,
      confirm,
      cancel: this.playerInput.pollCancel(),
    });
    // A choice is confirmed, and the question whether to replace the saved game opens and closes like a page.
    if (choice !== null) {
      this.audio.play('confirm');
    } else if (menu.confirming !== this.menu.confirming) {
      this.audio.play(menu.confirming ? 'page-open' : 'page-close');
    }
    this.menu = menu;
    if (choice === 'new-game') {
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
    const rows = rowsFor(this.menu, this.saved);
    if (!this.shown.changed(rows)) {
      return;
    }
    this.layer.clear();
    drawLogo(this.layer);
    drawWindow(this.layer, rows);
  }
}

/** A message: the first line says what is wrong, and the others what follows from it. */
function message(...texts: readonly string[]): Row[] {
  return texts.map((text, at): Row => ({ kind: 'text', text, colour: at === 0 ? INK.warning : INK.hint }));
}

/** What the player is told about the saved game, when it is not one they can simply continue from. */
function messageRows(saved: SavedGame): Row[] {
  switch (saved.status) {
    case 'none':
    case 'usable':
      return [];
    case 'unavailable':
      return message('SAVING IS NOT AVAILABLE', 'PROGRESS WILL NOT BE KEPT.');
    case 'unusable':
      return saved.problem === 'damaged'
        ? message('THE SAVED GAME IS DAMAGED.', 'A NEW GAME WILL REPLACE IT.')
        : message('SAVED GAME CANNOT BE USED.', 'IT IS FROM ANOTHER VERSION.', 'A NEW GAME WILL REPLACE IT.');
  }
}

function entryRow(entry: MenuEntry, menu: TitleMenu, canContinue: boolean): Row {
  const highlighted = entry === menu.cursor;
  const available = selectableEntries(canContinue).includes(entry);
  return {
    kind: 'entry',
    text: ENTRY_LABELS[entry],
    colour: highlighted ? INK.onButton : available ? INK.text : INK.dim,
    highlighted,
  };
}

/** What the window holds for the menu and the saved game as they stand. The name of the game is the logo's, over it. */
function rowsFor(menu: TitleMenu, saved: SavedGame): Row[] {
  const rows: Row[] = [];
  if (menu.confirming) {
    rows.push(
      { kind: 'text', text: 'REPLACE THE SAVED GAME?', colour: INK.warning },
      { kind: 'space', height: 0 },
      { kind: 'text', text: `${confirmKeyLabel()} TO REPLACE IT`, colour: INK.text },
      { kind: 'text', text: `${closePageKeyLabel()} TO KEEP IT`, colour: INK.text },
    );
    return rows;
  }
  rows.push(...MENU_ENTRIES.map((entry) => entryRow(entry, menu, saved.status === 'usable')));
  rows.push({ kind: 'space', height: 0 });
  const messages = messageRows(saved);
  if (messages.length > 0) {
    rows.push(...messages, { kind: 'space', height: 0 });
  }
  rows.push(
    { kind: 'text', text: 'W/S OR ARROWS TO CHOOSE', colour: INK.hint },
    { kind: 'text', text: `${confirmKeyLabel()} TO SELECT`, colour: INK.hint },
  );
  rows.push(
    { kind: 'text', text: `${audioKeyLabel('toggle-mute')} TO MUTE`, colour: INK.hint },
    { kind: 'text', text: `${audioKeyLabel('lower')} OR ${audioKeyLabel('raise')} FOR VOLUME`, colour: INK.hint },
  );
  return rows;
}

function heightOf(row: Row): number {
  switch (row.kind) {
    case 'text':
      return TEXT_HEIGHT;
    case 'entry':
      return ENTRY_HEIGHT;
    case 'space':
      return row.height;
  }
}

/** The space between two rows one under the other: none between lines of the menu, which have their own air. */
function gapBetween(above: Row, below: Row): number {
  return above.kind === 'entry' && below.kind === 'entry' ? 0 : ROW_GAP;
}

const ROW_RULES: RowRules<Row> = { heightOf, gapBetween };

/** Draws the name of the game across the top: the letters in the title colour, a brown extrusion under them and a dark outline round both. */
function drawLogo(layer: UiLayer): void {
  const logo = logoLayout();
  const paint = (offset: { readonly x: number; readonly y: number }, colour: number): void =>
    layer.scaledText(GAME_TITLE, logo.left + offset.x, logo.top + offset.y, colour, logo.scale);
  LOGO_OUTLINE_OFFSETS.forEach((offset) => paint(offset, INK.logoOutline));
  LOGO_EXTRUSION_OFFSETS.forEach((offset) => paint(offset, INK.logoShade));
  paint({ x: 0, y: 0 }, INK.title);
}

/** Draws the window with the rows one under the other, under the name of the game. */
function drawWindow(layer: UiLayer, rows: readonly Row[]): void {
  const height = stackHeight(rows, ROW_RULES) + 2 * WINDOW_PADDING;
  const left = Math.floor((VIEW_WIDTH - WINDOW_WIDTH) / 2);
  const top = windowTop(height);
  layer.window(left, top, WINDOW_WIDTH, height);
  const centred = (width: number): number => left + Math.floor((WINDOW_WIDTH - width) / 2);
  for (const { row, top: rowTop } of stackRows(rows, top + WINDOW_PADDING, ROW_RULES)) {
    if (row.kind === 'entry') {
      if (row.highlighted) {
        layer.frame('button', centred(ENTRY_WIDTH), rowTop, ENTRY_WIDTH, ENTRY_HEIGHT);
      }
      const textTop = rowTop + Math.floor((ENTRY_HEIGHT - TEXT_HEIGHT) / 2);
      layer.text(row.text, centred(textWidthOf(row.text)), textTop, row.colour);
    } else if (row.kind === 'text') {
      layer.text(row.text, centred(textWidthOf(row.text)), rowTop, row.colour);
    }
  }
}
