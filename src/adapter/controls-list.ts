import type { ControlLine } from './controls';
import type { Placed } from './opening-card';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import { INK } from './ui-layer';
import type { UiLayer } from './ui-layer';

// The list of the controls (`controlsList` in controls.ts) in two columns: the keys, and what they do. It is laid out by
// a function of the list alone, in pixels from its own top left corner, so that whatever draws it can put it in a window
// of its own: the Controls page in play does, and the title screen can.

/** From the top of a line to the top of the next: a line of text and 3 pixels of air. */
const LINE_PITCH = TEXT_HEIGHT + 3;
/** Between the widest of the keys and the words. */
const KEYS_GAP = 8;

export interface ControlsListLayout {
  readonly width: number;
  readonly height: number;
  /** Each line's keys and its words, placed from the top left corner of the list. */
  readonly lines: readonly { readonly keys: Placed; readonly words: Placed }[];
}

/**
 * Where everything of the list goes. The keys are in a column as wide as the widest of them, each at the right of it so
 * that it sits next to its words; the words begin a gap after the column and keep to the left.
 */
export function layoutControlsList(lines: readonly ControlLine[]): ControlsListLayout {
  const keysWidth = Math.max(0, ...lines.map((line) => textWidthOf(line.keys)));
  const wordsWidth = Math.max(0, ...lines.map((line) => textWidthOf(line.words)));
  const wordsLeft = keysWidth + KEYS_GAP;
  return {
    width: wordsLeft + wordsWidth,
    height: lines.length * LINE_PITCH - (LINE_PITCH - TEXT_HEIGHT),
    lines: lines.map((line, index) => ({
      keys: { text: line.keys, left: keysWidth - textWidthOf(line.keys), top: index * LINE_PITCH },
      words: { text: line.words, left: wordsLeft, top: index * LINE_PITCH },
    })),
  };
}

/** Draws the list with its top left corner at the place, the keys in the colour of a title and the words in that of text. */
export function drawControlsList(layer: UiLayer, layout: ControlsListLayout, left: number, top: number): void {
  for (const { keys, words } of layout.lines) {
    layer.text(keys.text, left + keys.left, top + keys.top, INK.title);
    layer.text(words.text, left + words.left, top + words.top, INK.text);
  }
}
