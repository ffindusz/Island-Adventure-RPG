import { readFileSync } from 'node:fs';
import { expect } from 'vitest';

// docs/balance.md holds the tables that the renderers of these tests print (tests/fight-table.ts, route-supplies.ts,
// guardian-table.ts, play-time.ts), written in by hand after a tuning. This is how a test holds the doc to them, one of
// the readings of the disk that ADR 0005 (b) allows: it compares tables, never words.

/** The lines of the doc as it is on disk, whatever line ends the checkout gave it. */
function docLines(): string[] {
  return readFileSync(new URL('../docs/balance.md', import.meta.url), 'utf8').replaceAll('\r\n', '\n').split('\n');
}

/**
 * Expects a rendered Markdown table to be in docs/balance.md, line for line. A table that is not is set against the table
 * of the doc that shares the most lines with it, so that the failure shows what a tuning moved. The check is soft: a test
 * that holds several tables reports every one that is behind, not the first.
 */
export function expectInBalanceDoc(rendered: string): void {
  const doc = docLines();
  const table = rendered.split('\n');
  const shared = (from: number): number => table.filter((line, offset) => doc[from + offset] === line).length;
  const heads = doc.flatMap((line, at) => (line === table[0] ? [at] : []));
  const start = heads.sort((a, b) => shared(b) - shared(a))[0] ?? doc.length;
  const found: string[] = [];
  for (let at = start; doc[at]?.startsWith('|'); at += 1) {
    found.push(doc[at] ?? '');
  }
  expect.soft(
    found,
    `docs/balance.md is behind the tests: its table headed "${table[0]}" is not the one they render now. Print the tables with --silent=false, as the doc says, and write the new one in`,
  ).toEqual(table);
}
