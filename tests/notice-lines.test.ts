import { describe, expect, it } from 'vitest';
import { VIEW_WIDTH } from '../src/adapter/config';
import { linesFor } from '../src/adapter/notice';
import { SIDE_MARGIN } from '../src/adapter/opening-card';
import { textWidthOf } from '../src/adapter/pixel-font';
import { INK } from '../src/adapter/ui-layer';
import { charactersTheFontLacks } from './drawn-text';

// The lines of the notices that the vessel is prepared and that a Checkpoint was touched, as they are written: where
// the notice is drawn is looked at in the smoke test.

describe('the notice that the vessel is prepared', () => {
  const lines = linesFor({ kind: 'vessel-prepared' });

  it('says that the vessel is ready and which key sails', () => {
    expect(lines.map((line) => line.text)).toEqual(['THE VESSEL IS READY', 'PRESS E AGAIN TO SAIL']);
  });

  it('is written as the notices are: the news in the title colour, the key to press in the hint colour', () => {
    expect(lines.map((line) => line.colour)).toEqual([INK.title, INK.hint]);
  });

  it('is made of text the pixel font can draw', () => {
    expect(lines.length).toBeGreaterThan(0);
    for (const { text } of lines) {
      expect(charactersTheFontLacks(text), text).toEqual([]);
    }
  });

  it('keeps clear of the sides of the screen', () => {
    for (const { text } of lines) {
      expect(textWidthOf(text), text).toBeLessThanOrEqual(VIEW_WIDTH - 2 * SIDE_MARGIN);
    }
  });
});

describe('the notice that a Checkpoint was touched', () => {
  const lines = linesFor({ kind: 'checkpoint' });

  it('says CHECKPOINT and what it is for: defeat sends the hero back to it', () => {
    expect(lines.map((line) => line.text)).toEqual(['CHECKPOINT', 'DEFEAT SENDS YOU BACK HERE']);
  });

  it('promises no Health, since a Checkpoint gives none back', () => {
    expect(lines.length).toBeGreaterThan(0);
    for (const { text } of lines) {
      expect(text, text).not.toMatch(/HEAL|RESTOR|RECOVER|REFILL|FULL/);
    }
  });

  it('is written as the notices are: the news in the title colour, what it is for in the hint colour', () => {
    expect(lines.map((line) => line.colour)).toEqual([INK.title, INK.hint]);
  });

  it('is made of text the pixel font can draw', () => {
    expect(lines.length).toBeGreaterThan(0);
    for (const { text } of lines) {
      expect(charactersTheFontLacks(text), text).toEqual([]);
    }
  });

  it('keeps clear of the sides of the screen', () => {
    expect(lines.length).toBeGreaterThan(0);
    for (const { text } of lines) {
      expect(textWidthOf(text), text).toBeLessThanOrEqual(VIEW_WIDTH - 2 * SIDE_MARGIN);
    }
  });
});
