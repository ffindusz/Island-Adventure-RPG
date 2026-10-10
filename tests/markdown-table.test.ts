import { describe, expect, it } from 'vitest';
import { markdownTable } from './markdown-table';

describe('the Markdown table of the balance document', () => {
  it('has a head, a rule under it and a line for each row', () => {
    expect(
      markdownTable(
        ['Area', 'Time'],
        [
          ['coast', 7],
          ['woods', 11.2],
        ],
      ),
    ).toBe(['| Area | Time |', '| --- | --- |', '| coast | 7 |', '| woods | 11.2 |'].join('\n'));
  });

  it('right-aligns the columns from the one that is named on, for the numbers', () => {
    expect(markdownTable(['Area', 'Time', 'Fights'], [], 1)).toBe(
      ['| Area | Time | Fights |', '| --- | ---: | ---: |'].join('\n'),
    );
  });
});
