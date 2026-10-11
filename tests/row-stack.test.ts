import { describe, expect, it } from 'vitest';
import { stackHeight, stackRows } from '../src/adapter/row-stack';
import type { RowRules } from '../src/adapter/row-stack';

// Rows one under the other in a window, as a pure rule of the adapter's (what a window draws with them is looked at in
// the real game): where each row goes and how high the stack is, worked out by hand for rows of a made-up kind with the
// rules that a window would give. A direct test of a pure function of the adapter, as ADR 0005 allows.

/** A row of a made-up kind: as high as it says. Two tight rows, one under the other, have no space between them. */
interface Row {
  readonly name: string;
  readonly height: number;
  readonly tight?: true;
}

const GAP = 4;

const RULES: RowRules<Row> = {
  heightOf: (row) => row.height,
  gapBetween: (above, below) => (above.tight === true && below.tight === true ? 0 : GAP),
};

const TITLE: Row = { name: 'title', height: 7 };
const FIRST_LINE: Row = { name: 'first line', height: 15, tight: true };
const SECOND_LINE: Row = { name: 'second line', height: 15, tight: true };
/** A row with no height: it still takes its place, and the space above and under it. */
const SPACE: Row = { name: 'space', height: 0 };
const HINT: Row = { name: 'hint', height: 7 };
const ROWS: readonly Row[] = [TITLE, FIRST_LINE, SECOND_LINE, SPACE, HINT];

function topsOf(rows: readonly Row[], top: number, rules: RowRules<Row> = RULES): [string, number][] {
  return stackRows(rows, top, rules).map((placed) => [placed.row.name, placed.top]);
}

describe('rows one under the other', () => {
  it('start at the top they are given, with no space above the first row', () => {
    expect(topsOf([HINT], 5)).toEqual([['hint', 5]]);
    expect(topsOf(ROWS, 10)[0]).toEqual(['title', 10]);
  });

  it('go each under the one above it, with the space that the rules give for the two, which is none for tight rows', () => {
    // From 10: the title 7 high ends at 17, a space of 4 and the first line at 21; it is 15 high and ends at 36, and the
    // second line is tight against it at 36 and ends at 51; a space of 4 and the row with no height at 55, which ends
    // there, and a space of 4 and the hint at 59.
    expect(topsOf(ROWS, 10)).toEqual([
      ['title', 10],
      ['first line', 21],
      ['second line', 36],
      ['space', 55],
      ['hint', 59],
    ]);
  });

  it('ask the rules for the space between a row and the one above it, with the one above first', () => {
    const tallAbove: RowRules<Row> = {
      heightOf: (row) => row.height,
      gapBetween: (above, below) => (above.height > below.height ? 3 : 1),
    };
    const tall: Row = { name: 'tall', height: 10 };
    const short: Row = { name: 'short', height: 2 };
    // The short row is under the tall one, so 3 apart (10 + 3); the tall one under the short one is 1 apart (13 + 2 + 1).
    expect(topsOf([tall, short, tall], 0, tallAbove)).toEqual([
      ['tall', 0],
      ['short', 13],
      ['tall', 16],
    ]);
  });

  it('are as high as the rows and the spaces between them, from the top of the first to the bottom of the last', () => {
    // The hint's top is 49 under the first row's, and it is 7 high.
    expect(stackHeight(ROWS, RULES)).toBe(56);
    expect(stackHeight([HINT], RULES)).toBe(7);
  });

  it('end where their height says, wherever they start', () => {
    for (const top of [0, 10, 33]) {
      const last = stackRows(ROWS, top, RULES).at(-1);
      expect(last?.top, `from ${top}`).toBe(top + stackHeight(ROWS, RULES) - HINT.height);
    }
  });

  it('are nothing when there are none: no row to place and no height', () => {
    expect(stackRows([], 10, RULES)).toEqual([]);
    expect(stackHeight([], RULES)).toBe(0);
  });
});
