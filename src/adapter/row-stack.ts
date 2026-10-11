// Rows one under the other, as the overlay and the title screen hold them in a window. What a row is, how high it is and
// how much air goes between two of them is each window's own, and it gives that as the rules; this works out where each
// row goes and how high the whole stack is. No Phaser, so that it can be tested.

/** What a window says of its rows: how high a row is, and the space between a row and the one above it. */
export interface RowRules<Row> {
  readonly heightOf: (row: Row) => number;
  readonly gapBetween: (above: Row, below: Row) => number;
}

/** A row and the top it is drawn at. */
export interface PlacedRow<Row> {
  readonly row: Row;
  readonly top: number;
}

/** The rows one under the other from `top` down, each with its top. The first has no space above it. */
export function stackRows<Row>(rows: readonly Row[], top: number, rules: RowRules<Row>): PlacedRow<Row>[] {
  const placed: PlacedRow<Row>[] = [];
  let next = top;
  let above: Row | null = null;
  for (const row of rows) {
    if (above !== null) {
      next += rules.gapBetween(above, row);
    }
    placed.push({ row, top: next });
    next += rules.heightOf(row);
    above = row;
  }
  return placed;
}

/** How high the rows are one under the other, the space between them included. */
export function stackHeight<Row>(rows: readonly Row[], rules: RowRules<Row>): number {
  const placed = stackRows(rows, 0, rules);
  const last = placed[placed.length - 1];
  return last === undefined ? 0 : last.top + rules.heightOf(last.row);
}
