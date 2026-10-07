import { describe, expect, it } from 'vitest';
import { advance, dummyAt, newGame, newGameWithMonsters, playingView, walk } from './fixtures';

// The hero walks 0.125 tile a step, so 8 steps is exactly one tile. It starts at (3.5, 3.5).

describe('walking', () => {
  it.each([
    { direction: 'right', expected: { x: 4.5, y: 3.5 } },
    { direction: 'left', expected: { x: 2.5, y: 3.5 } },
    { direction: 'up', expected: { x: 3.5, y: 2.5 } },
    { direction: 'down', expected: { x: 3.5, y: 4.5 } },
  ] as const)('walks one tile in 8 steps while the $direction key is held', ({ direction, expected }) => {
    const game = newGame();

    game.send({ type: 'move', direction });
    advance(game, 8);

    expect(playingView(game).hero.position).toEqual(expected);
  });

  it('stops walking when the key is released', () => {
    const game = newGame();

    game.send({ type: 'move', direction: 'right' });
    advance(game, 4);
    game.send({ type: 'stop', direction: 'right' });
    advance(game, 10);

    expect(playingView(game).hero.position).toEqual({ x: 4, y: 3.5 });
  });
});

describe('facing', () => {
  it('faces the direction of a key as soon as it is pressed, before the hero has moved', () => {
    const game = newGame();

    game.send({ type: 'move', direction: 'right' });

    expect(playingView(game).hero).toMatchObject({ facing: 'right', position: { x: 3.5, y: 3.5 } });
  });

  it('keeps facing the direction last walked after the key is released', () => {
    const game = newGame();

    game.send({ type: 'move', direction: 'left' });
    advance(game, 8);
    game.send({ type: 'stop', direction: 'left' });
    advance(game, 8);

    expect(playingView(game).hero.facing).toBe('left');
  });

  it('walks and faces the key pressed last while two are held, and goes back to the other when it is released', () => {
    const game = newGame();

    game.send({ type: 'move', direction: 'right' });
    game.send({ type: 'move', direction: 'up' });
    advance(game, 8);
    expect(playingView(game).hero).toMatchObject({ facing: 'up', position: { x: 3.5, y: 2.5 } });

    game.send({ type: 'stop', direction: 'up' });
    advance(game, 8);
    expect(playingView(game).hero).toMatchObject({ facing: 'right', position: { x: 4.5, y: 2.5 } });
  });
});

describe('solid terrain and monsters', () => {
  // The hero's body is 0.5 wide, so its centre stops 0.25 short of what blocks it. Walkable ground runs from
  // x = 1 to 6 and y = 1 to 5, so the centre can reach x = 1.25 to 5.75 and y = 1.25 to 4.75.
  it.each([
    { direction: 'right', stopsAt: { x: 5.75, y: 3.5 } },
    { direction: 'left', stopsAt: { x: 1.25, y: 3.5 } },
    { direction: 'up', stopsAt: { x: 3.5, y: 1.25 } },
    { direction: 'down', stopsAt: { x: 3.5, y: 4.75 } },
  ] as const)('a wall stops the hero walking $direction, and the hero still faces it', ({ direction, stopsAt }) => {
    const game = newGame();

    game.send({ type: 'move', direction });
    advance(game, 100);

    expect(playingView(game).hero).toMatchObject({ position: stopsAt, facing: direction });
  });

  it('water is solid too: it stops the hero short of its edge', () => {
    const game = newGame();
    walk(game, 'left', 8); // x = 2.5, directly below the water tile at column 2, row 2 (it spans y = 2 to 3)

    game.send({ type: 'move', direction: 'up' });
    advance(game, 100);

    expect(playingView(game).hero.position).toEqual({ x: 2.5, y: 3.25 });
  });

  it('terrain that is not solid does not stop the hero', () => {
    const game = newGame();
    walk(game, 'right', 8); // x = 4.5, directly above the sand tile at column 4, row 4

    game.send({ type: 'move', direction: 'down' });
    advance(game, 100);

    expect(playingView(game).hero.position).toEqual({ x: 4.5, y: 4.75 });
  });

  it('the hero can slide along a wall it is touching', () => {
    const game = newGame();
    walk(game, 'up', 100); // y = 1.25: the top edge of the body touches the wall

    walk(game, 'left', 8);

    expect(playingView(game).hero.position).toEqual({ x: 2.5, y: 1.25 });
  });

  it('a monster stops the hero short of its body', () => {
    const game = newGameWithMonsters(dummyAt('dummy-1', 5, 3)); // its body spans x = 5.25 to 5.75

    game.send({ type: 'move', direction: 'right' });
    advance(game, 100);

    expect(playingView(game).hero.position).toEqual({ x: 5, y: 3.5 });
  });
});
