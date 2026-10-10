import { describe, expect, it } from 'vitest';
import { numberText } from '../src/adapter/labels';
import { LONGEST_GEAR_NAME } from '../src/adapter/overlay';
import { gameContent } from '../src/content';

// What the inventory page has room for in the name of a piece of Gear, and that the Gear the game ships keeps to it.
// A name that is too long is cut off at the end without a word (overlay.ts), so nothing else would notice.

const PIECES = Object.entries(gameContent.gear);

describe('the name of a piece of Gear on the inventory page', () => {
  it('has room for 11 characters beside a bonus of one digit and the tick, and not for 12', () => {
    // The Gear column is 144 pixels. The picture takes 22 from the left, the tick 7 at the right edge, a bonus such as
    // "+9 ATK" 35, and there are 4 pixels of air before the name ends, before the bonus and before the tick:
    // 144 - 22 - 7 - 35 - 3 * 4 = 68. A name of n characters takes 6n - 1 pixels: 65 for 11, and 71 for 12.
    expect(LONGEST_GEAR_NAME).toBe(11);
  });

  it('is short enough in every piece of Gear in the content', () => {
    const tooLong = PIECES.filter(([, gear]) => gear.name.length > LONGEST_GEAR_NAME).map(([id, gear]) => `${id}: ${gear.name}`);

    expect(PIECES.length).toBeGreaterThan(0);
    expect(tooLong).toEqual([]);
  });

  it('has a bonus of one digit in every piece of Gear in the content, which the room for a name counts on', () => {
    const wider = PIECES.filter(([, gear]) => !/^\d$/.test(numberText(gear.bonus))).map(
      ([id, gear]) => `${id}: +${numberText(gear.bonus)}`,
    );

    expect(PIECES.length).toBeGreaterThan(0);
    expect(wider).toEqual([]);
  });
});
