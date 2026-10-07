import { describe, expect, it } from 'vitest';
import type { Game, MonsterPlacement, StatId } from '../src/core';
import {
  advance,
  arena,
  BITER,
  biterAt,
  defeatPrize,
  dummyAt,
  face,
  gameAtTitle,
  gameWithPrizes,
  newGame,
  playingView,
  prizes,
  strike,
  throughStorage,
} from './fixtures';

const OPEN_STATS = { type: 'open-page', page: 'stats' } as const;

function assign(game: Game, stat: StatId): void {
  game.send({ type: 'assign-stat-point', stat });
}

/** Puts every Stat Point the hero has waiting on one stat. */
function assignAll(game: Game, stat: StatId): void {
  for (let guard = 0; guard < 10 && playingView(game).levelUp !== null; guard++) {
    assign(game, stat);
  }
}

/** A game where the hero has just defeated a monster worth 10 Experience, so Level 2 waits for its Stat Point. */
function gameAtLevel2(others: readonly MonsterPlacement[] = []): Game {
  const { monsters, monsterTypes } = prizes(10);
  const game = newGame(arena({ monsters: [...monsters, ...others], monsterTypes }));
  game.send({ type: 'attack' });
  return game;
}

const CHOICES_AT_LEVEL_1 = [
  { stat: 'health', value: 10, gain: 3 },
  { stat: 'attack', value: 1, gain: 2 },
  { stat: 'defense', value: 0, gain: 1 },
];

describe('a level-up asks where to put a Stat Point', () => {
  it('asks nothing before the first Level', () => {
    const game = gameWithPrizes(9);

    game.send({ type: 'attack' });

    expect(playingView(game).levelUp).toBeNull();
  });

  it('asks for the Stat Point of Level 2, showing each stat now and what a point adds to it', () => {
    const game = gameAtLevel2();

    expect(playingView(game).levelUp).toEqual({ level: 2, points: 1, options: CHOICES_AT_LEVEL_1 });
  });

  it('asks no more once the point is assigned', () => {
    const game = gameAtLevel2();

    assign(game, 'attack');

    expect(playingView(game).levelUp).toBeNull();
  });

  it('is still waiting when the game is saved and continued', () => {
    const game = gameAtLevel2();

    const continued = gameAtTitle(arena(prizes(10)));
    continued.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });

    expect(playingView(continued).levelUp).toEqual({ level: 2, points: 1, options: CHOICES_AT_LEVEL_1 });
  });

  it('is not asked at the title, where there is no hero', () => {
    const game = gameAtTitle();

    expect(game.send({ type: 'assign-stat-point', stat: 'health' })).toEqual([]);
    expect(game.view()).toEqual({ phase: 'title' });
  });
});

describe('the game waits until the Stat Point is assigned', () => {
  it('stepping advances nothing: a monster at the hero does not move or strike', () => {
    const game = gameAtLevel2([biterAt('biter', 4, 3)]);
    const before = game.snapshot();

    const events = advance(game, 200);

    expect(events).toEqual([]);
    expect(game.snapshot()).toEqual(before);
  });

  it('play resumes where it stopped once the point is assigned', () => {
    const game = gameAtLevel2([biterAt('biter', 4, 3)]);
    advance(game, 200);

    assign(game, 'attack');
    const events = advance(game, 31);

    expect(events.filter((event) => event.type === 'hero-hit')).toEqual([
      { type: 'hero-hit', monsterId: 'biter', damage: 5, health: 5 },
    ]);
  });

  it('the hero cannot strike', () => {
    const { monsters, monsterTypes } = prizes(10, 5);
    const game = newGame(arena({ monsters, monsterTypes, hero: { attackCooldownMs: 0 } }));
    game.send({ type: 'attack' });
    face(game, 'right');

    expect(game.send({ type: 'attack' })).toEqual([]);

    assign(game, 'attack');
    expect(game.send({ type: 'attack' }).map((event) => event.type)).toContain('monster-defeated');
  });

  it('no page can be opened', () => {
    const game = gameAtLevel2();

    game.send(OPEN_STATS);
    expect(playingView(game).page).toBeNull();

    assign(game, 'attack');
    game.send(OPEN_STATS);
    expect(playingView(game).page).toMatchObject({ id: 'stats' });
  });
});

describe('each Level grants exactly one Stat Point', () => {
  it('several level-ups at once queue their choices, the lowest Level first', () => {
    const game = gameWithPrizes(100);

    const events = game.send({ type: 'attack' });

    expect(events.filter((event) => event.type === 'level-up')).toEqual(
      [2, 3, 4, 5, 6].map((level) => ({ type: 'level-up', level })),
    );
    const stats: StatId[] = ['health', 'health', 'attack', 'attack', 'defense'];
    const asked = stats.map((stat) => {
      const choice = playingView(game).levelUp;
      assign(game, stat);
      return [choice?.level, choice?.points];
    });
    expect(asked).toEqual([
      [2, 5],
      [3, 4],
      [4, 3],
      [5, 2],
      [6, 1],
    ]);
    expect(playingView(game).levelUp).toBeNull();
  });

  it('a Level reached later asks for its own point, once the earlier ones are assigned', () => {
    const game = gameWithPrizes(10, 15);
    game.send({ type: 'attack' });
    assign(game, 'attack');

    const events = defeatPrize(game, 2);

    expect(events.map((event) => event.type)).toEqual([
      'hero-attacked',
      'monster-hit',
      'monster-defeated',
      'experience-gained',
      'level-up',
    ]);
    expect(playingView(game).levelUp).toMatchObject({ level: 3, points: 1 });
  });
});

describe('the cap', () => {
  it('Experience beyond the highest Level changes nothing', () => {
    const game = gameWithPrizes(100, 50);
    game.send({ type: 'attack' });
    assignAll(game, 'attack');

    const events = defeatPrize(game, 2);

    expect(events.map((event) => event.type)).toEqual(['hero-attacked', 'monster-hit', 'monster-defeated']);
    expect(playingView(game).levelUp).toBeNull();
    game.send(OPEN_STATS);
    expect(playingView(game).page).toMatchObject({ level: 6, maxLevel: 6, experience: null });
  });

  it('Experience that would pass the cap counts only up to it', () => {
    const game = gameWithPrizes(90, 50);
    game.send({ type: 'attack' });
    assignAll(game, 'attack');

    const events = defeatPrize(game, 2);

    expect(events.filter((event) => event.type !== 'hero-attacked' && event.type !== 'monster-hit')).toEqual([
      { type: 'monster-defeated', monsterId: 'prize-2' },
      { type: 'experience-gained', amount: 10 },
      { type: 'level-up', level: 6 },
    ]);
  });
});

describe('what a Stat Point does', () => {
  it('Health raises the maximum Health, and the current Health with it', () => {
    const game = gameAtLevel2();

    assign(game, 'health');

    expect(playingView(game).hero).toMatchObject({ health: 13, maxHealth: 13 });
  });

  it('Health raises the current Health of a hero that has been hurt by the same amount', () => {
    const { monsters, monsterTypes } = prizes(10);
    const game = newGame(arena({ monsters: [...monsters, biterAt('biter', 4, 3)], monsterTypes }));
    advance(game, 40);
    expect(playingView(game).hero.health).toBe(5);
    game.send({ type: 'attack' });

    assign(game, 'health');

    expect(playingView(game).hero).toMatchObject({ health: 8, maxHealth: 13 });
  });

  it('Attack raises the damage the hero deals', () => {
    const { monsters, monsterTypes } = prizes(10);
    const game = newGame(arena({ monsters: [...monsters, dummyAt('dummy', 4, 3)], monsterTypes }));
    const before = game.send({ type: 'attack' });
    assign(game, 'attack');
    face(game, 'right');

    const after = strike(game);

    expect(before).toContainEqual({ type: 'monster-hit', monsterId: 'prize-1', damage: 1, health: 0 });
    expect(after).toContainEqual({ type: 'monster-hit', monsterId: 'dummy', damage: 3, health: 0 });
  });

  it('Defense reduces the damage the hero receives', () => {
    const game = gameAtLevel2([biterAt('biter', 4, 3)]);

    assign(game, 'defense');

    expect(advance(game, 31)).toContainEqual({ type: 'hero-hit', monsterId: 'biter', damage: 4, health: 6 });
  });

  it('a defeated hero comes back at its full, raised Health', () => {
    const { monsters, monsterTypes } = prizes(10);
    const game = newGame(
      arena({
        monsters: [...monsters, biterAt('biter', 4, 3)],
        monsterTypes: { ...monsterTypes, biter: { ...BITER, damage: 100 } },
      }),
    );
    game.send({ type: 'attack' });
    assign(game, 'health');

    expect(advance(game, 31).map((event) => event.type)).toContain('hero-defeated');

    expect(playingView(game).hero).toMatchObject({ health: 13, maxHealth: 13 });
  });

  it('the stat page adds up the Stat Points of every Level', () => {
    const game = gameWithPrizes(100);
    game.send({ type: 'attack' });
    const stats: StatId[] = ['health', 'health', 'attack', 'attack', 'defense'];
    stats.forEach((stat) => assign(game, stat));

    game.send(OPEN_STATS);

    expect(playingView(game).page).toEqual({
      id: 'stats',
      level: 6,
      maxLevel: 6,
      experience: null,
      health: 16,
      maxHealth: 16,
      attack: 5,
      defense: 1,
    });
  });

  it('is worth whatever the content says it is worth', () => {
    const { monsters, monsterTypes } = prizes(100);
    const statPointValue = { health: 7, attack: 5, defense: 4 };
    const game = newGame(arena({ monsters, monsterTypes, progression: { statPointValue } }));
    game.send({ type: 'attack' });
    const stats: StatId[] = ['health', 'health', 'health', 'attack', 'defense'];
    stats.forEach((stat) => assign(game, stat));

    game.send(OPEN_STATS);

    expect(playingView(game).page).toMatchObject({ health: 31, maxHealth: 31, attack: 6, defense: 4 });
  });

  it('is final: with no point waiting, assigning does nothing', () => {
    const game = gameAtLevel2();
    assign(game, 'attack');

    assign(game, 'health');
    assign(game, 'defense');

    expect(playingView(game).hero).toMatchObject({ health: 10, maxHealth: 10 });
    game.send(OPEN_STATS);
    expect(playingView(game).page).toMatchObject({ health: 10, attack: 3, defense: 0 });
  });

  it('cannot be done before the first Level', () => {
    const game = newGame();

    assign(game, 'health');

    expect(playingView(game).hero).toMatchObject({ health: 10, maxHealth: 10 });
  });
});
