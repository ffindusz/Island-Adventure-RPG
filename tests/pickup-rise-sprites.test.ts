import { describe, expect, it } from 'vitest';
import type { PickupRise } from '../src/adapter/feedback';
import { placementOf } from '../src/adapter/pickup-rise-sprites';

// Where the picture of what the hero picked up is drawn as it rises over the hero, and how opaque it is then. The hero
// stands at tile (5, 9), so its middle is at pixel (80, 144) and the top of its 16 pixel picture at y = 136. The
// picture's width is that of the item's own icon: a Healing Potion's is 9 pixels.

const HERO = { x: 5, y: 9 };
const POTION_WIDTH = 9;

function riseAt(progress: number, lane = 0): PickupRise {
  return { item: { kind: 'consumable', id: 'healing-potion', amount: 1 }, progress, lane };
}

describe('where the picture of a pickup is when it rises over the hero', () => {
  it('starts with its foot on the top of the hero and its middle over the hero, whole', () => {
    expect(placementOf(riseAt(0), HERO, POTION_WIDTH)).toEqual({ left: 76, bottom: 136, alpha: 1 });
  });

  it('rises twelve pixels in all, quickly at first and slower after', () => {
    const bottoms = [0, 0.25, 0.5, 0.75, 1].map((progress) => placementOf(riseAt(progress), HERO, POTION_WIDTH).bottom);

    expect(bottoms).toEqual([136, 131, 127, 125, 124]);
  });

  it('stays whole for the first two fifths of its time, and fades to nothing over the rest', () => {
    const alphaAt = (progress: number): number => placementOf(riseAt(progress), HERO, POTION_WIDTH).alpha;

    expect(alphaAt(0.4)).toBe(1);
    expect(alphaAt(0.7)).toBeCloseTo(0.5, 10);
    expect(alphaAt(1)).toBe(0);
  });

  it('never goes back down and never gets more opaque, from the start to the end', () => {
    let before = placementOf(riseAt(0), HERO, POTION_WIDTH);
    for (let hundredths = 1; hundredths <= 100; hundredths += 1) {
      const now = placementOf(riseAt(hundredths / 100), HERO, POTION_WIDTH);
      expect(now.bottom).toBeLessThanOrEqual(before.bottom);
      expect(now.alpha).toBeLessThanOrEqual(before.alpha);
      expect(now.alpha).toBeGreaterThanOrEqual(0);
      before = now;
    }
  });

  it('puts the picture of a second pickup eighteen pixels to the right of the first, at the same height', () => {
    expect(placementOf(riseAt(0.5, 1), HERO, POTION_WIDTH)).toMatchObject({ left: 94, bottom: 127 });
    expect(placementOf(riseAt(0.5, 2), HERO, POTION_WIDTH)).toMatchObject({ left: 112, bottom: 127 });
  });

  it('is on whole pixels wherever the hero stands, and centred on the picture whatever its width', () => {
    const between = { x: 5.3, y: 9.77 };

    expect(placementOf(riseAt(0), between, 12)).toEqual({ left: 79, bottom: 148, alpha: 1 });
    expect(placementOf(riseAt(0), between, 7).left).toBe(82);
  });
});
