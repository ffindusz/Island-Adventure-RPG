import { describe, expect, it } from 'vitest';
import { advance, arena, biterAt, frailMonster, monsterNamed, newGame, playingView, strike, walk } from './fixtures';

// A biter's hit does 5 damage, and the arena's hero has no Defense. A biter beside the hero, at tile (4, 3), hits it on
// step 31. The hero starts at (3.5, 3.5), and with no Checkpoint touched the start of the adventure is where defeat
// sends it back to (Checkpoints are in checkpoints.test.ts).

describe('the hero running out of Health', () => {
  it.each([
    { health: 5, case: 'exactly the Health it has' },
    { health: 3, case: 'more than the Health it has' },
  ])('is defeated by a hit of 5 for $case, and the events come in order', ({ health }) => {
    const game = newGame(arena({ hero: { health }, monsters: [biterAt('biter-1', 4, 3)] }));
    advance(game, 30);

    const events = game.step(); // step 31

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated']);
    expect(events[1]).toMatchObject({ type: 'hero-hit', damage: 5, health: 0 });
  });

  it('survives a hit that leaves it with a single Health', () => {
    const game = newGame(arena({ hero: { health: 6 }, monsters: [biterAt('biter-1', 4, 3)] }));

    const events = advance(game, 31);

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit']);
    expect(playingView(game).hero).toMatchObject({ health: 1, maxHealth: 6 });
  });
});

describe('the hero being defeated', () => {
  it('returns to the start of the adventure at full Health when it has touched no Checkpoint', () => {
    const game = newGame(arena({ hero: { health: 5 }, monsters: [biterAt('biter-1', 4, 3)] }));
    walk(game, 'down', 4); // the hero is at (3.5, 4), still within the biter's reach
    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 4 });

    advance(game, 27); // step 31: the hit lands

    const { hero, area } = playingView(game);
    expect(hero).toMatchObject({ position: { x: 3.5, y: 3.5 }, health: 5, maxHealth: 5 });
    expect(area.id).toBe('arena');
  });

  it('sends the monsters of the Adventure Area back: at full Health, on their starting tiles, and not attacking', () => {
    // The weakling has 1 Health and the hero strikes it down at once, facing down. The biter walks up to the hero and
    // winds up from step 14, at (4.6875, 3.5), 0.8125 tile from where it began; the hero turns to it and strikes it once
    // on step 24. The biter's hit on step 44 takes all of the hero's 5 Health.
    const game = newGame(
      arena({
        hero: { health: 5 },
        monsterTypes: { weakling: frailMonster(0) },
        monsters: [{ id: 'weakling-1', type: 'weakling', tile: { col: 3, row: 4 } }, biterAt('biter-1', 5, 3)],
      }),
    );
    game.send({ type: 'attack' });
    expect(playingView(game).monsters.map((monster) => monster.id)).toEqual(['biter-1']);
    game.send({ type: 'move', direction: 'right' });
    game.send({ type: 'stop', direction: 'right' });
    strike(game); // step 24
    expect(monsterNamed(game, 'biter-1')).toMatchObject({
      health: 2,
      position: { x: 4.6875, y: 3.5 },
      action: { type: 'winding-up' },
    });

    const events = advance(game, 20); // step 44

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated']);
    const { monsters } = playingView(game);
    expect(monsters).toHaveLength(2);
    expect(monsterNamed(game, 'weakling-1')).toMatchObject({
      health: 1,
      maxHealth: 1,
      position: { x: 3.5, y: 4.5 },
      action: { type: 'idle' },
    });
    expect(monsterNamed(game, 'biter-1')).toMatchObject({
      health: 3,
      maxHealth: 3,
      position: { x: 5.5, y: 3.5 },
      action: { type: 'idle' },
    });
  });

  it('starts the fight over: the monsters that came back notice the hero and hit it again', () => {
    const game = newGame(arena({ hero: { health: 5 }, monsters: [biterAt('biter-1', 5, 3)] }));
    advance(game, 44); // the first defeat

    const events = advance(game, 44); // the biter sets off again, winds up from step 58 and hits on step 88

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated']);
  });

  it('ends the step: a second monster about to hit in the same step does not hit the hero again', () => {
    // Both biters hit on step 31, and the hero is back at the start, within reach of both, in time for the second hit.
    const game = newGame(arena({ hero: { health: 5 }, monsters: [biterAt('biter-1', 4, 3), biterAt('biter-2', 3, 2)] }));
    advance(game, 30);

    const events = game.step();

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated']);
    expect(playingView(game).hero.health).toBe(5);
  });

  it('leaves the player in control: a direction key that is still held keeps the hero walking', () => {
    const game = newGame(arena({ hero: { health: 5 }, monsters: [biterAt('biter-1', 4, 3)] }));
    game.send({ type: 'move', direction: 'right' }); // the hero walks into the biter and stands flush against it
    advance(game, 31);
    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 3.5 });

    game.step();

    expect(playingView(game).hero).toMatchObject({ position: { x: 3.625, y: 3.5 }, facing: 'right' });
  });
});
