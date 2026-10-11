import { describe, expect, it } from 'vitest';
import { experienceShare, healthText } from '../src/adapter/labels';

// How the player reads Health and the way to the next Level, for the HUD and the pages alike.

describe('healthText', () => {
  it('reads Health as what is left over the most', () => {
    expect(healthText(14, 14)).toBe('14/14');
    expect(healthText(3, 14)).toBe('3/14');
  });

  it('rounds each number up, so that a hero who is still standing never reads as 0', () => {
    expect(healthText(0.2, 14)).toBe('1/14');
    expect(healthText(4.2, 10.5)).toBe('5/11');
    expect(healthText(13.999, 14)).toBe('14/14');
  });

  it('reads 0 only for a hero with no Health left', () => {
    expect(healthText(0, 14)).toBe('0/14');
  });
});

describe('experienceShare', () => {
  it('is the share of the way to the next Level', () => {
    expect(experienceShare({ earned: 5, needed: 20 })).toBe(0.25);
    expect(experienceShare({ earned: 15, needed: 20 })).toBe(0.75);
    expect(experienceShare({ earned: 0, needed: 20 })).toBe(0);
  });

  it('stays full where there is no next Level', () => {
    expect(experienceShare(null)).toBe(1);
  });
});
