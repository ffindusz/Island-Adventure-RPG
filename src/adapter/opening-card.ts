import type Phaser from 'phaser';
import { wrapText } from './area-banner';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { confirmKeyLabel, openingControlsHint } from './controls';
import { DEPTH } from './depths';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Graphics, Rect } from './pixel-font';
import { INK, UiLayer, WINDOW_PADDING } from './ui-layer';

// The opening of a New Game, which the Game core gives as lines of text and the play screen shows as a card: a window in
// the middle of a black screen, with the lines in it, a hint under them and, under the hint, a second one that says what
// H does in play. The play screen holds the game while the card shows (play-scene.ts). Where the text goes is worked out
// apart from the drawing, so that it can be tested. The ending and the credits are cards too (ending-pages.ts), laid out
// and drawn by the same two functions, with the one hint of their own and no second.

/** The air between the screen's edge and the window at its widest, which a card keeps above and below it as well. */
export const SIDE_MARGIN = 12;
/** Between the rows of one line of the opening that was too wide for the window, and between the two hints. */
const ROW_GAP = 4;
/** Between one line of the opening and the next. */
const LINE_GAP = 10;
const HINT_GAP = 14;

/** What the card tells the player to do, under the lines. */
export const OPENING_HINT = `${confirmKeyLabel()} TO BEGIN`;

/** The widest a row of text can be and still sit in the card, which is as wide as the screen allows. */
export const CARD_TEXT_WIDTH = VIEW_WIDTH - 2 * (SIDE_MARGIN + WINDOW_PADDING);

/** The tallest a card can be and still keep as much air from the top and bottom of the screen as from its sides. */
export const CARD_MAX_HEIGHT = VIEW_HEIGHT - 2 * SIDE_MARGIN;

/** A piece of text and where its top left corner goes, in canvas pixels. */
export interface Placed {
  readonly text: string;
  readonly left: number;
  readonly top: number;
}

export interface CardLayout {
  readonly window: Rect;
  /** The lines of the opening, broken into the rows that fit the window, one under the other, each in the middle. */
  readonly rows: readonly Placed[];
  readonly hint: Placed;
  /** A second hint, under the first and in the same colour. A card that has none, as the ending's do, leaves it out. */
  readonly secondHint?: Placed;
}

/**
 * Where everything of the card of the opening goes: the window in the middle of the screen, the rows in it, then the hint
 * to begin and under it the line that says what H does in play.
 */
export function layoutCard(lines: readonly string[]): CardLayout {
  return layoutRows(
    lines.map((line) => wrapText(line, CARD_TEXT_WIDTH)),
    OPENING_HINT,
    openingControlsHint(),
  );
}

/**
 * Where everything of a card goes, for lines that are already broken into the rows that fit it, under the hint and, when
 * there is one, a second hint a row's gap under that. The rows of one line are closer together than one line is to the
 * next.
 */
export function layoutRows(lines: readonly (readonly string[])[], hint: string, secondHint?: string): CardLayout {
  const rows: { text: string; top: number }[] = [];
  let top = 0;
  for (const line of lines) {
    line.forEach((text, at) => {
      if (rows.length > 0) {
        top += TEXT_HEIGHT + (at === 0 ? LINE_GAP : ROW_GAP);
      }
      rows.push({ text, top });
    });
  }
  const hintTop = rows.length === 0 ? 0 : top + TEXT_HEIGHT + HINT_GAP;
  const secondHintTop = hintTop + TEXT_HEIGHT + ROW_GAP;
  const lastTop = secondHint === undefined ? hintTop : secondHintTop;
  const hints = secondHint === undefined ? [hint] : [hint, secondHint];
  const width = Math.max(...hints.map(textWidthOf), ...rows.map((row) => textWidthOf(row.text))) + 2 * WINDOW_PADDING;
  const height = lastTop + TEXT_HEIGHT + 2 * WINDOW_PADDING;
  const left = Math.floor((VIEW_WIDTH - width) / 2);
  const windowTop = Math.floor((VIEW_HEIGHT - height) / 2);
  const placed = (text: string, textTop: number): Placed => ({
    text,
    left: left + Math.floor((width - textWidthOf(text)) / 2),
    top: windowTop + WINDOW_PADDING + textTop,
  });
  return {
    window: { left, top: windowTop, width, height },
    rows: rows.map((row) => placed(row.text, row.top)),
    hint: placed(hint, hintTop),
    ...(secondHint === undefined ? {} : { secondHint: placed(secondHint, secondHintTop) }),
  };
}

/** Draws the card: its window, the rows in it, the hint and the second hint if it has one. The layer is cleared by whoever owns it. */
export function drawCard(layer: UiLayer, { window, rows, hint, secondHint }: CardLayout): void {
  layer.window(window.left, window.top, window.width, window.height);
  for (const row of rows) {
    layer.text(row.text, row.left, row.top, INK.text);
  }
  for (const line of secondHint === undefined ? [hint] : [hint, secondHint]) {
    layer.text(line.text, line.left, line.top, INK.hint);
  }
}

/** The card on the screen, from the moment it is made until it is hidden. It takes no input: the play screen does. */
export class OpeningCard {
  private readonly backdrop: Graphics;
  private readonly layer: UiLayer;

  constructor(scene: Phaser.Scene, lines: readonly string[]) {
    this.backdrop = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.openingCard - 1);
    this.backdrop.fillStyle(0x000000).fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.layer = new UiLayer(scene, DEPTH.openingCard);
    drawCard(this.layer, layoutCard(lines));
  }

  hide(): void {
    this.backdrop.clear();
    this.layer.clear();
  }
}
