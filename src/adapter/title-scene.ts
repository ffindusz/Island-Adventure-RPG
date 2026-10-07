import Phaser from 'phaser';
import type { Game } from '../core';
import { ARTWORK } from './artwork';
import { buildDrawnArt, queueArt, requireLoadedArt } from './asset-loader';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { DEPTH } from './depths';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import { PlayerInput } from './player-input';
import type { SavedGame, SaveStore } from './save-store';
import { SCENE_KEYS } from './scene-keys';
import type { PlayStart } from './scene-keys';
import { MENU_ENTRIES, openMenu, pressMenu, selectableEntries } from './title-menu';
import type { MenuEntry, TitleMenu } from './title-menu';
import { INK, UiLayer, WINDOW_FRAME } from './ui-layer';

// The title screen: what the game opens on, and the way into it. It offers New Game and Continue, tells the player why
// a saved game cannot be continued from, and starts the play screen. It decides nothing about the game: the rules of
// the menu are in title-menu.ts, the verdict on the saved game is the save store's (save-store.ts), and the Game core
// is only told which of the two begins. It never saves: the autosave belongs to the play screen (autosave.ts).

const WINDOW_WIDTH = 200;
/** From a window's edge to what it holds, the window's frame being the first 4 pixels of it. */
const PADDING = 12;
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
  private layer!: UiLayer;
  private playerInput!: PlayerInput;
  private saved: SavedGame = { status: 'none' };
  private menu: TitleMenu = openMenu(false);
  private shown = '';

  constructor(core: Game, saves: SaveStore) {
    super(SCENE_KEYS.title);
    this.core = core;
    this.saves = saves;
  }

  preload(): void {
    queueArt(this.load, ARTWORK);
  }

  create(): void {
    buildDrawnArt(this.textures, ARTWORK);
    requireLoadedArt(this.textures, ARTWORK);
    this.layer = new UiLayer(this, DEPTH.title);
    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error('The keyboard plugin is not available, so nothing could choose from the title.');
    }
    this.playerInput = new PlayerInput(keyboard);
    // The saved game is looked at each time the title comes up, which is also when it is the freshest it can be.
    this.saved = this.saves.read();
    if (this.saved.status === 'unusable') {
      console.warn(`The saved game cannot be continued from (${this.saved.problem}): ${this.saved.detail}`);
    }
    this.menu = openMenu(this.saved.status === 'usable');
    this.shown = '';
  }

  override update(): void {
    const { step, confirm } = this.playerInput.pollMenu();
    const saved = this.saved;
    const { menu, choice } = pressMenu(this.menu, saved.status === 'usable', {
      step,
      confirm,
      cancel: this.playerInput.pollCancel(),
    });
    this.menu = menu;
    if (choice === 'new-game') {
      this.core.send({ type: 'new-game' });
      this.scene.start(SCENE_KEYS.play, { saveAtOnce: true } satisfies PlayStart);
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
    const key = JSON.stringify(rows);
    if (key === this.shown) {
      return;
    }
    this.shown = key;
    this.layer.clear();
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

/** What the window holds for the menu and the saved game as they stand. */
function rowsFor(menu: TitleMenu, saved: SavedGame): Row[] {
  const rows: Row[] = [
    { kind: 'text', text: 'ISLAND ADVENTURE', colour: INK.title },
    { kind: 'space', height: 0 },
  ];
  if (menu.confirming) {
    rows.push(
      { kind: 'text', text: 'REPLACE THE SAVED GAME?', colour: INK.warning },
      { kind: 'space', height: 0 },
      { kind: 'text', text: 'ENTER TO REPLACE IT', colour: INK.text },
      { kind: 'text', text: 'ESC TO KEEP IT', colour: INK.text },
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
    { kind: 'text', text: 'ENTER TO SELECT', colour: INK.hint },
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

function stackHeight(rows: readonly Row[]): number {
  let height = 0;
  let above: Row | null = null;
  for (const row of rows) {
    height += (above === null ? 0 : gapBetween(above, row)) + heightOf(row);
    above = row;
  }
  return height;
}

/** Draws the window with the rows one under the other, in the middle of the screen. */
function drawWindow(layer: UiLayer, rows: readonly Row[]): void {
  const height = stackHeight(rows) + 2 * PADDING;
  const left = Math.floor((VIEW_WIDTH - WINDOW_WIDTH) / 2);
  const top = Math.floor((VIEW_HEIGHT - height) / 2);
  const inside = { left: left + WINDOW_FRAME, top: top + WINDOW_FRAME };
  layer.frame('window', left, top, WINDOW_WIDTH, height);
  layer.frame('panel', inside.left, inside.top, WINDOW_WIDTH - 2 * WINDOW_FRAME, height - 2 * WINDOW_FRAME);
  const centred = (width: number): number => left + Math.floor((WINDOW_WIDTH - width) / 2);
  let rowTop = top + PADDING;
  let above: Row | null = null;
  for (const row of rows) {
    if (above !== null) {
      rowTop += gapBetween(above, row);
    }
    if (row.kind === 'entry') {
      if (row.highlighted) {
        layer.frame('button', centred(ENTRY_WIDTH), rowTop, ENTRY_WIDTH, ENTRY_HEIGHT);
      }
      const textTop = rowTop + Math.floor((ENTRY_HEIGHT - TEXT_HEIGHT) / 2);
      layer.text(row.text, centred(textWidthOf(row.text)), textTop, row.colour);
    } else if (row.kind === 'text') {
      layer.text(row.text, centred(textWidthOf(row.text)), rowTop, row.colour);
    }
    rowTop += heightOf(row);
    above = row;
  }
}
