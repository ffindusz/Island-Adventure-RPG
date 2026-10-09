import { describe, expect, it } from 'vitest';
import { bulletOf, recordEntries } from './licence-record';

// The asset licence record against the build: that every file the build ships has its entry, that every entry in use
// says where it is from, what licence it is under, when that was checked and what the credits say of it, that the
// licence lets a public game be sold, and that the credits screen shows the text the record owes. The record is working
// notes in Markdown, read here as the-credits.test.ts reads it; the files are read from the disk, as the tests of the
// pictures and of the audio read them, and that is seam drift, flagged in the ticket.

const RECORD = [
  '# Asset licence record',
  '',
  'Nothing else is in use yet.',
  '',
  '| ID | Source | Licence | Checked | Status |',
  '| --- | --- | --- | --- | --- |',
  '| A1 | The art pack | CC0 1.0 Universal | 2026-01-01, re-read 2026-02-02 | Approved base; in use: the hero |',
  '| B2 | A font | Non-Commercial License | 2026-03-03 | Do not use |',
  '| C3 | A tileset | CC0 | 2026-04-04 | Candidate |',
  '',
  '## Entries',
  '',
  '### A1. The art pack',
  '',
  '- **Source:** https://example.com/art',
  '- **Licence:** CC0 1.0. Public and commercial use are allowed.',
  '- **Date checked:** 2026-01-01 and re-read on 2026-02-02.',
  '- **Credits text (a courtesy, not required):** "The art pack by Someone (CC0), https://example.com/art"',
  '',
  '### B2. A font',
  '',
  '- **Source:** https://example.com/font',
  '- **Checked:** 2026-03-03 from the saved page.',
].join('\n');

describe('the reading of the entries of the licence record', () => {
  it('finds each row of the summary table, with its source, licence, date and status', () => {
    expect(recordEntries(RECORD).map(({ section, ...row }) => row)).toEqual([
      {
        id: 'A1',
        source: 'The art pack',
        licence: 'CC0 1.0 Universal',
        checked: '2026-01-01, re-read 2026-02-02',
        status: 'Approved base; in use: the hero',
        inUse: true,
      },
      {
        id: 'B2',
        source: 'A font',
        licence: 'Non-Commercial License',
        checked: '2026-03-03',
        status: 'Do not use',
        inUse: false,
      },
      { id: 'C3', source: 'A tileset', licence: 'CC0', checked: '2026-04-04', status: 'Candidate', inUse: false },
    ]);
  });

  it('gives each entry the text of its own section, and an empty one to an entry that has none', () => {
    const [first, second, third] = recordEntries(RECORD);

    expect(first?.section).toContain('- **Source:** https://example.com/art');
    expect(first?.section).not.toContain('https://example.com/font');
    expect(second?.section).toContain('- **Source:** https://example.com/font');
    expect(third?.section).toBe('');
  });

  it('is not led astray by the heading of the table, its rule, or the sentences around it', () => {
    expect(recordEntries(RECORD).map(({ id }) => id)).toEqual(['A1', 'B2', 'C3']);
  });

  it('reads a record whose lines end the way Windows ends them as the same record', () => {
    expect(recordEntries(RECORD.replaceAll('\n', '\r\n'))).toEqual(recordEntries(RECORD));
  });

  it('finds nothing in a record that has no table', () => {
    expect(recordEntries('# Asset licence record\n\nNothing is in use.\n')).toEqual([]);
  });
});

describe('the reading of a bullet of an entry', () => {
  const [first, second] = recordEntries(RECORD);

  it('gives the text after its label, to the end of its line', () => {
    expect(bulletOf(first?.section ?? '', 'Source')).toBe('https://example.com/art');
    expect(bulletOf(first?.section ?? '', 'Licence')).toBe('CC0 1.0. Public and commercial use are allowed.');
  });

  it('reads past a note in the label, as in "Credits text (a courtesy, not required)"', () => {
    expect(bulletOf(first?.section ?? '', 'Credits text')).toBe('"The art pack by Someone (CC0), https://example.com/art"');
  });

  it('finds the date under whichever of the labels it has', () => {
    expect(bulletOf(first?.section ?? '', 'Date checked', 'Checked')).toBe('2026-01-01 and re-read on 2026-02-02.');
    expect(bulletOf(second?.section ?? '', 'Date checked', 'Checked')).toBe('2026-03-03 from the saved page.');
  });

  it('says that an entry has no such bullet by giving nothing', () => {
    expect(bulletOf(second?.section ?? '', 'Licence')).toBeUndefined();
    expect(bulletOf('', 'Source')).toBeUndefined();
  });
});
