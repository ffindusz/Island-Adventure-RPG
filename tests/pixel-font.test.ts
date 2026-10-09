import { describe, expect, it } from 'vitest';
import { undrawableIn } from '../src/adapter/pixel-font';
import { charactersTheFontLacks } from './drawn-text';

// The pixel font silently leaves a character blank when it has no letter for it. `undrawableIn` asks the font that
// question without drawing, so that text the game cannot show is found before the player sees a gap in it.

const LETTERS_AND_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const MARKS = ".,!?'-+/:()%=";

describe('the characters the pixel font cannot draw', () => {
  it('finds none in letters, digits and the marks the font has', () => {
    expect(undrawableIn(LETTERS_AND_DIGITS)).toEqual([]);
    expect(undrawableIn(MARKS)).toEqual([]);
  });

  it('draws lower case as capitals, so a sentence in the usual case is whole', () => {
    expect(undrawableIn('Made with Phaser, TypeScript and Vite.')).toEqual([]);
    expect(undrawableIn(LETTERS_AND_DIGITS.toLowerCase())).toEqual([]);
  });

  it('lists the characters it lacks in the order they come, one for each time they come', () => {
    expect(undrawableIn('a;b&c;')).toEqual([';', '&', ';']);
  });

  it('does not count a space: it is a gap, not a letter the font lacks', () => {
    expect(undrawableIn('A B  C')).toEqual([]);
    expect(undrawableIn('')).toEqual([]);
  });

  it.each([
    ['an accented letter', 'é'],
    ['a double quote', '"'],
    ['a curly apostrophe', '’'],
    ['a long dash', '—'],
    ['a tab', '\t'],
    ['a line break', '\n'],
  ])('lacks %s', (_name, character) => {
    expect(undrawableIn(`ok${character}ok`)).toEqual([character]);
  });

  it('counts a character outside the basic plane once, not as the two halves it is stored in', () => {
    expect(undrawableIn('a😀b')).toEqual(['😀']);
  });

  it('agrees with what drawing the text really leaves blank, for every character up to the end of Latin Extended-B', () => {
    for (let code = 0x20; code <= 0x24f; code += 1) {
      const character = String.fromCodePoint(code);
      expect(undrawableIn(character), `U+${code.toString(16).toUpperCase().padStart(4, '0')}`).toEqual(
        charactersTheFontLacks(character),
      );
    }
  });
});
