import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { layoutEnding } from '../src/adapter/ending-pages';
import { gameContent } from '../src/content';
import { datesIn, isCalendarDate, permitsPublicCommercialUse } from './licence-policy';
import { bulletOf, creditsOwedBy, recordEntries, recordOnDisk } from './licence-record';

// The asset licence record against the build: that every file the build ships has its entry, that every entry in use
// says where it is from, what licence it is under, when that was checked and what the credits say of it, that the
// licence lets a public game be sold, and that the credits screen shows the text the record owes. The record is working
// notes in Markdown, read here as the-credits.test.ts reads it; the files are read from the disk, as the tests of the
// pictures and of the audio read them, which ADR 0005 allows. licence-record.ts reads the record and licence-policy.ts
// says what its entries in use must be (a licence that lets a public game be sold, days of the calendar), each with
// tests of its own; this holds the build to them.

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

  it('give their own icon inline, so that no browser asks the host for /favicon.ico, which a plain static host answers with a 404', () => {
    const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

    expect(page).toMatch(/<link\b(?=[^>]*\brel="icon")(?=[^>]*\bhref="data:)[^>]*>/i);
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
