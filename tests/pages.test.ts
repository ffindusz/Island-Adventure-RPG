import { describe, expect, it } from 'vitest';
import {
  advance,
  arena,
  biterAt,
  gameAtTitle,
  gameWithPrizes,
  newGame,
  playingView,
  throughStorage,
} from './fixtures';

const OPEN_STATS = { type: 'open-page', page: 'stats' } as const;
const CLOSE_STATS = { type: 'close-page', page: 'stats' } as const;

describe('the stat page', () => {
  it('is not open in a new game', () => {
    expect(playingView(newGame()).page).toBeNull();
  });

  it('shows Level, Experience progress, Health, Attack and Defense', () => {
    const game = newGame();

    game.send(OPEN_STATS);

    expect(playingView(game).page).toEqual({
      id: 'stats',
      level: 1,
      maxLevel: 6,
      experience: { earned: 0, needed: 10 },
      health: 10,
      maxHealth: 10,
      attack: 1,
      defense: 0,
    });
  });

  it('shows the Experience earned toward the next Level', () => {
    const game = gameWithPrizes(4);
    game.send({ type: 'attack' });

    game.send(OPEN_STATS);

    expect(playingView(game).page).toMatchObject({ level: 1, experience: { earned: 4, needed: 10 } });
  });

  it('shows the Health the hero has left, out of its maximum', () => {
    const game = newGame(arena({ monsters: [biterAt('biter', 4, 3)] }));
    advance(game, 31);

    game.send(OPEN_STATS);

    expect(playingView(game).page).toMatchObject({ health: 5, maxHealth: 10 });
  });

  it('closes when asked to', () => {
    const game = newGame();
    game.send(OPEN_STATS);

    game.send(CLOSE_STATS);

    expect(playingView(game).page).toBeNull();
  });

  it('cannot be asked for at the title, now or later', () => {
    const game = gameAtTitle();

    expect(game.send(OPEN_STATS)).toEqual([]);
    expect(game.view()).toEqual({ phase: 'title' });

    game.send({ type: 'new-game' });
    expect(playingView(game).page).toBeNull();
  });

  it('is saved with the game, and open again when the game is continued', () => {
    const game = newGame();
    game.send(OPEN_STATS);

    const continued = gameAtTitle();
    continued.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });

    expect(playingView(continued).page).toMatchObject({ id: 'stats' });
  });
});

describe('while a page is open the game is paused', () => {
  it('stepping advances nothing: the monsters, the hero and the events stay as they were', () => {
    const game = newGame(arena({ monsters: [biterAt('biter', 4, 3)] }));
    advance(game, 10);
    game.send(OPEN_STATS);
    const before = game.snapshot();

    const events = advance(game, 200);

    expect(events).toEqual([]);
    expect(game.snapshot()).toEqual(before);
  });

  it('play resumes exactly where it stopped, as if the pause had never been', () => {
    const content = arena({ monsters: [biterAt('biter', 4, 3)] });
    const uninterrupted = newGame(content);
    const expected = advance(uninterrupted, 40);

    const interrupted = newGame(content);
    const events = advance(interrupted, 20);
    interrupted.send(OPEN_STATS);
    advance(interrupted, 100);
    interrupted.send(CLOSE_STATS);
    events.push(...advance(interrupted, 20));

    expect(expected.map((event) => event.type)).toContain('hero-hit');
    expect(events).toEqual(expected);
    expect(interrupted.snapshot()).toEqual(uninterrupted.snapshot());
  });

  it('the attack cooldown does not run down', () => {
    const game = newGame();
    game.send({ type: 'attack' });
    game.send(OPEN_STATS);
    advance(game, 100);
    game.send(CLOSE_STATS);

    expect(game.send({ type: 'attack' })).toEqual([]);

    advance(game, 24);
    expect(game.send({ type: 'attack' }).map((event) => event.type)).toEqual(['hero-attacked']);
  });

  it('the hero cannot strike, and the refused attack does not start the cooldown', () => {
    const game = gameWithPrizes(5);
    game.send(OPEN_STATS);

    expect(game.send({ type: 'attack' })).toEqual([]);

    game.send(CLOSE_STATS);
    expect(playingView(game).monsters.map((monster) => monster.id)).toEqual(['prize-1']);
    expect(game.send({ type: 'attack' }).map((event) => event.type)).toContain('monster-defeated');
  });

  it('a key released while the page is open does not walk the hero afterwards', () => {
    const game = newGame();
    game.send({ type: 'move', direction: 'right' });
    game.send(OPEN_STATS);
    game.send({ type: 'stop', direction: 'right' });
    game.send(CLOSE_STATS);

    advance(game, 8);

    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 3.5 });
  });

  it('a key pressed while the page is open walks the hero once it is closed', () => {
    const game = newGame();
    game.send(OPEN_STATS);
    game.send({ type: 'move', direction: 'right' });

    advance(game, 8);
    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 3.5 });

    game.send(CLOSE_STATS);
    advance(game, 8);
    expect(playingView(game).hero.position).toEqual({ x: 4.5, y: 3.5 });
  });
});
