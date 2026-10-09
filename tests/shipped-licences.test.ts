import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { layoutEnding } from '../src/adapter/ending-pages';
import { gameContent } from '../src/content';
import { bulletOf, creditsOwedBy, recordEntries, recordOnDisk } from './licence-record';

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

/** The licences that let a public game use an asset, and be sold: the entries in use must be under one of them. */
const PERMITTED = [/\bCC0\b/, /\bCC BY 4\.0\b/];
/** What a licence's wording says when it takes that back, even when it names a permitted one: "the pack's CC0 claim". */
const RESTRICTED = /non-?commercial|personal use|no resale|not for (?:sale|commercial)/i;

function permitsPublicCommercialUse(licence: string): boolean {
  return PERMITTED.some((permitted) => permitted.test(licence)) && !RESTRICTED.test(licence);
}

/** The days the record writes, as 2026-10-06, in a text. */
const datesIn = (text: string): string[] => text.match(/\d{4}-\d{2}-\d{2}/g) ?? [];

/** Whether a day written as 2026-10-06 is a day of the calendar: 2026-02-30 and 2026-13-01 are not. */
function isCalendarDate(day: string): boolean {
  const time = Date.parse(`${day}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(day);
}

describe('the licences that allow public and commercial use', () => {
  it.each([
    ['CC0 1.0 Universal'],
    ['Creative Commons Zero v1.0 Universal (CC0 1.0): Public and commercial use, modification, and redistribution are allowed.'],
    ['CC BY 4.0 (attribution required)'],
  ])('include %s', (licence) => {
    expect(permitsPublicCommercialUse(licence)).toBe(true);
  });

  it.each([
    ["FontStruct Non-Commercial License (embedded in the font file), conflicting with the pack's CC0 claim"],
    ['Custom itch.io text: personal and commercial use, no resale or redistribution'],
    ['Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)'],
    ['CC BY-NC 4.0'],
  ])('leave out %s', (licence) => {
    expect(permitsPublicCommercialUse(licence)).toBe(false);
  });

  it('leave out an entry that gives no licence at all', () => {
    expect(permitsPublicCommercialUse('')).toBe(false);
  });
});

describe('the days the record gives', () => {
  it.each(['2026-10-06', '2028-02-29', '2026-12-31'])('%s is a day of the calendar', (day) => {
    expect(isCalendarDate(day)).toBe(true);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '2026-10-32', '2027-02-29'])('%s is not', (day) => {
    expect(isCalendarDate(day)).toBe(false);
  });

  it('are found in a text however many it holds, and none in a text that has none', () => {
    expect(datesIn('2026-10-06, re-read 2026-10-07')).toEqual(['2026-10-06', '2026-10-07']);
    expect(datesIn('re-read last week')).toEqual([]);
  });
});

const RECORD_ON_DISK = recordOnDisk();
const IN_USE = recordEntries(RECORD_ON_DISK).filter((entry) => entry.inUse);

describe('the entries of the licence record that are in use', () => {
  it('are there to be read, the pack of the art and the audio among them, so that what follows tests something', () => {
    expect(IN_USE.map(({ id }) => id), 'the record says nothing is in use: has its table changed?').toContain('A1');
  });

  it('are read from a summary table whose columns are the ones the reader expects', () => {
    expect(RECORD_ON_DISK).toContain('| ID | Source | Licence | Checked | Status |');
  });

  describe.each(IN_USE.map((entry) => [entry.id, entry] as const))('%s', (id, entry) => {
    it('says where it is from: a source in the table, and a link in its own section', () => {
      expect(entry.source, `the Source cell of the table for ${id}`).not.toBe('');
      expect(entry.section, `${id} has no section of its own`).not.toBe('');
      expect(bulletOf(entry.section, 'Source'), `the Source of the section of ${id}`).toMatch(/https?:\/\/\S+/);
    });

    it('is under a licence that allows public and commercial use, as the table and its own section both say', () => {
      expect(permitsPublicCommercialUse(entry.licence), `the Licence cell of the table for ${id}: "${entry.licence}"`).toBe(true);
      const licence = bulletOf(entry.section, 'Licence') ?? '';
      expect(permitsPublicCommercialUse(licence), `the Licence of the section of ${id}: "${licence}"`).toBe(true);
    });

    it.each([
      ['the Checked cell of the table', entry.checked],
      ['the Date checked of its own section', bulletOf(entry.section, 'Date checked', 'Checked') ?? ''],
    ])('says when its licence was checked, in %s, by days of the calendar', (where, text) => {
      expect(datesIn(text), `${where} for ${id} gives no day: "${text}"`).not.toEqual([]);
      for (const day of datesIn(text)) {
        expect(isCalendarDate(day), `${where} for ${id} gives ${day}`).toBe(true);
      }
    });
  });
});

// What the build ships is what is in public/ (Vite copies it as it is), and what the code imports: the sources are
// only TypeScript, so that nothing is bundled that the record has not been asked about. Phaser loads each picture and
// each sound by the path of its manifest, and tests/final-art.test.ts and tests/shipped-audio.test.ts hold those to the
// files on disk.

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const SOURCES = fileURLToPath(new URL('../src/', import.meta.url));

/** Every file under a folder, by its path from there, with forward slashes. */
function filesUnder(folder: string): string[] {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(folder, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .sort();
}

/** What the record calls a shipped file: its path below art/ or audio/, with the backslashes it spells paths with. */
const recordedName = (path: string): string => path.replace(/^(?:art|audio)\//, '').replaceAll('/', '\\');

/** The kinds of file the game ships, and where: pictures, music and effects. A font, above all, is not one of them. */
const KINDS = [
  { folder: 'art/', extension: '.png' },
  { folder: 'audio/music/', extension: '.ogg' },
  { folder: 'audio/sfx/', extension: '.wav' },
];

describe('the files the build ships', () => {
  const shipped = filesUnder(PUBLIC);

  it('are pictures, music and effects, each in its folder, and nothing else: no font, no voice, no other kind', () => {
    const others = shipped.filter((path) => !KINDS.some(({ folder, extension }) => path.startsWith(folder) && path.endsWith(extension)));

    expect(others).toEqual([]);
  });

  it('are some of each of those kinds, so that the check of the record is not a check of nothing', () => {
    for (const { folder, extension } of KINDS) {
      expect(shipped.some((path) => path.startsWith(folder) && path.endsWith(extension)), `no ${extension} under ${folder}`).toBe(true);
    }
  });

  it('are each named by an entry of the record that is in use: a shipped file with no record fails here', () => {
    const unrecorded = shipped.filter((path) => !IN_USE.some(({ section }) => section.includes(`\`${recordedName(path)}\``)));

    expect(unrecorded, 'files in public/ that no entry in use names').toEqual([]);
  });
});

describe('the code and the page of the game', () => {
  it('bundle no picture, sound or font of their own: the sources are all TypeScript', () => {
    expect(filesUnder(SOURCES).filter((path) => !path.endsWith('.ts'))).toEqual([]);
  });

  it('load nothing from elsewhere: the page names no outside address, font or picture', () => {
    const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

    expect(page).not.toMatch(/https?:\/\/|@font-face|<img|<audio|<video|<embed/i);
  });
});

// The credits screen draws what the record's entries in use owe it. the-credits.test.ts holds the credits of the content
// to the record, and ending-pages.test.ts holds the pages to the credits they are given; this puts the two together,
// from the record to the rows the screen draws.

const squashed = (text: string): string => text.replaceAll(/\s+/g, '');

describe('the credits screen', () => {
  const rows = layoutEnding([], gameContent.credits ?? []).flatMap((page) => page.rows);

  it('has rows to read, so that what follows tests something', () => {
    expect(rows.length).toBeGreaterThan(1);
  });

  it.each(creditsOwedBy(RECORD_ON_DISK))('shows the credits text of $id, whole', ({ id, text }) => {
    expect(text, `${id} is in use, and its section of the record has no credits text`).toBeDefined();
    expect(squashed(rows.map((row) => row.text).join('')), `the rows of the credits screen lack the credits text of ${id}`).toContain(
      squashed(text ?? ''),
    );
  });
});
