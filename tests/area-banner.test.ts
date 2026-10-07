import { describe, expect, it } from 'vitest';
import { wrapText } from '../src/adapter/area-banner';
import { textWidthOf } from '../src/adapter/pixel-font';

// The banner that shows the text of an Adventure Area breaks it into lines that fit the screen.

describe('wrapping the text of an Adventure Area', () => {
  it('keeps a text that fits on one line', () => {
    expect(wrapText('A TANGLED TRAIL', textWidthOf('A TANGLED TRAIL'))).toEqual(['A TANGLED TRAIL']);
  });

  it('breaks a longer text at spaces, into lines that are no wider than allowed', () => {
    const maxWidth = textWidthOf('A TANGLED TRAIL');

    const lines = wrapText('A TANGLED TRAIL LEADS INTO THE WOODS', maxWidth);

    expect(lines).toEqual(['A TANGLED TRAIL', 'LEADS INTO THE', 'WOODS']);
    for (const line of lines) {
      expect(textWidthOf(line)).toBeLessThanOrEqual(maxWidth);
    }
  });

  it('keeps a word that is wider than allowed whole, on a line of its own', () => {
    expect(wrapText('A ENORMOUSLY LONG WORD', textWidthOf('ENORMOUS'))).toEqual(['A', 'ENORMOUSLY', 'LONG', 'WORD']);
  });

  it('ignores extra spaces and shows nothing for a text of nothing but spaces', () => {
    expect(wrapText('  A   TRAIL ', 1000)).toEqual(['A TRAIL']);
    expect(wrapText('   ', 1000)).toEqual([]);
  });
});
