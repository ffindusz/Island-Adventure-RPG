import { describe, expect, it } from 'vitest';
import { layoutCard } from '../src/adapter/opening-card';
import { GAME_TITLE } from '../src/adapter/title-layout';
import { gameContent } from '../src/content';
import { charactersTheFontLacks } from './drawn-text';
import { creditsOwedBy, recordOnDisk } from './licence-record';

// The ending and the credits that the game ships with: the card the hero sails home to, and the pages that follow it.
// What the core does with them is tested on purpose-built content (ending.test.ts); what these test is the words
// themselves, that the pixel font can draw every one of them, and that the credits keep the promise of the licence record.

const ENDING = gameContent.ending ?? [];
const CREDITS = gameContent.credits ?? [];

/** The tools the game is made with, which one line of the credits names. */
const TOOLS = ['Phaser', 'TypeScript', 'Vite'];

describe('the ending of the game', () => {
  it('is there, with its credits: the game can be sailed home from', () => {
    expect(gameContent.ending).toBeDefined();
    expect(gameContent.credits).toBeDefined();
  });

  it('is a few lines, from one to four, none of them blank', () => {
    expect(ENDING.length).toBeGreaterThanOrEqual(1);
    expect(ENDING.length).toBeLessThanOrEqual(4);
    for (const line of ENDING) {
      expect(line.trim(), 'a blank line of the ending').not.toBe('');
    }
  });

  it('is told in short lines: each fits a row of the card, and none has to be broken in two', () => {
    for (const line of ENDING) {
      expect(layoutCard([line]).rows, `the card breaks "${line}"`).toHaveLength(1);
    }
  });

  it('is written in characters the pixel font draws, every one of them', () => {
    for (const line of ENDING) {
      expect(charactersTheFontLacks(line), `the font lacks characters of "${line}"`).toEqual([]);
    }
  });
});

describe('the credits of the game', () => {
  it('have no blank line', () => {
    expect(CREDITS.length).toBeGreaterThanOrEqual(1);
    for (const line of CREDITS) {
      expect(line.trim(), 'a blank line of the credits').not.toBe('');
    }
  });

  it('begin with the title of the game, as the title screen shows it', () => {
    expect(CREDITS[0]).toBe(GAME_TITLE);
  });

  it('name the tools the game is made with, Phaser, TypeScript and Vite, in one line', () => {
    expect(CREDITS.some((line) => TOOLS.every((tool) => line.includes(tool)))).toBe(true);
  });

  it('are written in characters the pixel font draws, every one of them, the link too', () => {
    for (const line of CREDITS) {
      expect(charactersTheFontLacks(line), `the font lacks characters of "${line}"`).toEqual([]);
    }
  });

  it('end with a line of thanks, after the credits text of the art', () => {
    expect(CREDITS.at(-1)).toMatch(/thank you/i);
  });
});

// The licence record says that the credits draw from the "Credits text" lines of the entries that are in use. This
// reads the record from disk, as final-art.test.ts reads the pictures, so that an entry put in use without its text in
// the credits turns this red: a ticket that copies an asset in adds its text to src/content/ending.ts in the same commit.
// licence-record.test.ts tests the reading of the record, on records made for it.

describe('the credits and the licence record', () => {
  const owed = creditsOwedBy(recordOnDisk());

  it('has an entry that is in use to read, so that what follows is not a test of nothing', () => {
    expect(owed.map(({ id }) => id), 'the record says nothing is in use: has its table changed?').toContain('A1');
  });

  it('gives the credits text of each entry in use, and each has one', () => {
    for (const { id, text } of owed) {
      expect(text, `${id} is in use, and its entry in the record has no "Credits text"`).toBeDefined();
      expect(CREDITS, `the credits do not give the credits text of ${id}`).toContain(text);
    }
  });
});
