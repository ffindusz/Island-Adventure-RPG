import { describe, expect, it } from 'vitest';
import { arena } from './fixtures';
import { levelOf, maxHealthOf } from './profile-heroes';

// The balance pass asks the core for a Level and for a most Health: a game continued from a save with that Experience
// and those Stat Points tells. The values here are worked by hand for the arena of the fixtures: thresholds of 10, 25,
// 45, 70 and 100 Experience, and 3 Health to a Stat Point spent on Health on top of the hero's 10.

describe('the Level the core reports for some Experience', () => {
  it.each([
    [0, 1],
    [9, 1],
    [10, 2],
    [24, 2],
    [25, 3],
    [44, 3],
    [45, 4],
    [69, 4],
    [70, 5],
    [99, 5],
    [100, 6],
    [5000, 6],
  ])('is, for %i Experience, Level %i', (experience, level) => {
    expect(levelOf(experience, arena())).toBe(level);
  });
});

describe('the most Health the core reports for some Stat Points', () => {
  it.each([
    [{ health: 0, attack: 0, defense: 0 }, 10],
    [{ health: 1, attack: 1, defense: 1 }, 13],
    [{ health: 2, attack: 0, defense: 0 }, 16],
    [{ health: 0, attack: 4, defense: 5 }, 10],
  ])('is, for the Stat Points %j, %i', (points, health) => {
    expect(maxHealthOf(points, arena())).toBe(health);
  });
});
