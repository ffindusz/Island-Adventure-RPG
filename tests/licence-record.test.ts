import { describe, expect, it } from 'vitest';
import { bulletOf, creditsOwedBy, recordEntries } from './licence-record';

// The reading of the asset licence record, which is working notes in Markdown: the rows of its summary table, the
// bullets of an entry's own section, and the credits text of the entries that are in use. These are tests on records
// made for them; shipped-licences.test.ts and the-credits.test.ts read the record that is on disk with the same reader.

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

const RECORD_WITH_CREDITS = [
  '# Asset licence record',
  '',
  'Nothing is copied in without an entry whose status is "In use".',
  '',
  '## Summary',
  '',
  '| ID | Source | Licence | Checked | Status |',
  '| --- | --- | --- | --- | --- |',
  '| A1 | The art pack | CC0 | 2026-01-01 | Approved base; in use: the hero and the interface |',
  '| B2 | A song | CC0 | 2026-01-01 | In use |',
  '| C3 | A font | Not free | 2026-01-01 | Do not use |',
  '| D4 | A tileset | CC0 | 2026-01-01 | Candidate |',
  '',
  '## Entries',
  '',
  '### A1. The art pack',
  '',
  '- **Source:** https://example.com/art',
  '- **Credits text (a courtesy, not required; the page asks for a link):** "The art pack by Someone (CC0), https://example.com/art"',
  '- **Limits of CC0:** none.',
  '',
  '### B2. A song',
  '',
  '- **Source:** https://example.com/song',
  '',
  '### C3. A font',
  '',
  '- **Credits text if used:** "The font by Nobody"',
  '',
  '### D4. A tileset',
  '',
  '- **Credits text if used:** "The tileset by Somebody (CC0), https://example.com/tiles".',
].join('\n');

describe('the reading of the credits that the licence record owes', () => {
  it('finds each entry whose status says it is in use, with the credits text of its section', () => {
    expect(creditsOwedBy(RECORD_WITH_CREDITS).find(({ id }) => id === 'A1')).toEqual({
      id: 'A1',
      text: 'The art pack by Someone (CC0), https://example.com/art',
    });
  });

  it('finds an entry that is in use and has no credits text, and says so by leaving the text out', () => {
    expect(creditsOwedBy(RECORD_WITH_CREDITS).find(({ id }) => id === 'B2')).toEqual({ id: 'B2', text: undefined });
  });

  it('leaves out the entries that are not in use, whatever else they say, and the sentence above the table', () => {
    expect(creditsOwedBy(RECORD_WITH_CREDITS).map(({ id }) => id)).toEqual(['A1', 'B2']);
  });

  it('takes the text of an entry that was a candidate and is in use now, whatever its label said', () => {
    const candidate = '| D4 | A tileset | CC0 | 2026-01-01 | Candidate |';
    const switched = RECORD_WITH_CREDITS.replace(candidate, candidate.replace('Candidate', 'IN USE: the ground'));

    expect(creditsOwedBy(switched).find(({ id }) => id === 'D4')).toEqual({
      id: 'D4',
      text: 'The tileset by Somebody (CC0), https://example.com/tiles',
    });
  });

  it('reads a record whose lines end the way Windows ends them', () => {
    expect(creditsOwedBy(RECORD_WITH_CREDITS.replaceAll('\n', '\r\n'))).toEqual(creditsOwedBy(RECORD_WITH_CREDITS));
  });

  it('finds nothing in a record that has no table', () => {
    expect(creditsOwedBy('# Asset licence record\n\nNothing is in use.\n')).toEqual([]);
  });
});
