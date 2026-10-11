import { describe, expect, it } from 'vitest';
import {
  advance,
  arena,
  biterAt,
  continuedFrom,
  dummyAt,
  face,
  gameAtTitle,
  monsterAction,
  newGame,
  playingView,
  strike,
  throughStorage,
  walk,
} from './fixtures';

// The hero stands at (3.5, 3.5). A dummy has Health 3, the hero's Attack is 1, and the attack cooldown is 24 steps.

const content = arena({ monsters: [dummyAt('gone', 4, 3), dummyAt('hurt', 3, 2), dummyAt('fresh', 1, 1)] });

/** A game with some history: three kinds of monster state, a hero that has moved, and a cooldown part way through. */
function gameWithHistory() {
  const game = newGame(content);
  face(game, 'right');
  strike(game);
  strike(game);
  strike(game); // 'gone' is defeated
  face(game, 'up');
  strike(game); // 'hurt' is at Health 2, and the cooldown is running
  walk(game, 'left', 4); // the hero is at x = 3 and facing left; 4 of the 24 cooldown steps are over
  advance(game, 6); // 10 of the 24 cooldown steps are over
  return game;
}

describe('the snapshot', () => {
  it('survives storage as it is: plain data that JSON keeps unchanged', () => {
    const snapshot = gameWithHistory().snapshot();

    expect(throughStorage(snapshot)).toEqual(snapshot);
  });

  it('restores the game exactly: continuing from a stored snapshot shows the same state', () => {
    const original = gameWithHistory();

    const restored = continuedFrom(content, original.snapshot());

    expect(restored.view()).toEqual(original.view());
    expect(playingView(restored).monsters.map((monster) => [monster.id, monster.health])).toEqual([
      ['hurt', 2],
      ['fresh', 3],
    ]);
  });

  it('restores the attack cooldown: a strike stays refused until the 14 steps that were left are over', () => {
    const restored = continuedFrom(content, gameWithHistory().snapshot());
    face(restored, 'up');

    advance(restored, 13);
    const tooSoon = restored.send({ type: 'attack' });
    advance(restored, 1);
    const inTime = restored.send({ type: 'attack' });

    expect(tooSoon).toEqual([]);
    expect(inTime.map((event) => event.type)).toEqual(['hero-attacked', 'monster-hit']);
  });

  it('is a copy: playing on does not change a snapshot taken earlier', () => {
    const game = newGame(content);
    const earlier = game.snapshot();

    walk(game, 'right', 8);

    expect(playingView(continuedFrom(content, earlier)).hero.position).toEqual({ x: 3.5, y: 3.5 });
  });

  it('is not adopted by the game restored from it: playing on leaves the snapshot as it was', () => {
    const snapshot = newGame(content).snapshot();
    const asStored = throughStorage(snapshot);
    const game = gameAtTitle(content);
    game.send({ type: 'continue', snapshot });

    face(game, 'right');
    strike(game);
    walk(game, 'down', 8);

    expect(snapshot).toEqual(asStored);
  });

  it('cannot be taken at the title, where there is nothing to save', () => {
    expect(() => gameAtTitle(content).snapshot()).toThrow('There is nothing to save at the title');
  });
});

describe('the snapshot of a fight', () => {
  // A biter beside the hero starts its wind-up on step 1 and hits on step 31, and then rests for 24 steps. The hero has
  // 20 Health, so that it survives the hits.
  const fightContent = arena({ hero: { health: 20 }, monsters: [biterAt('biter-1', 4, 3)] });

  it('restores a wind-up in progress: the telegraph looks the same and the damage lands when it would have', () => {
    const original = newGame(fightContent);
    advance(original, 10); // 9 of the 30 wind-up steps are over

    const restored = continuedFrom(fightContent, original.snapshot());

    expect(restored.view()).toEqual(original.view());
    expect(monsterAction(restored, 'biter-1')).toMatchObject({
      type: 'winding-up',
      zone: { minX: 3.5, minY: 2.5, maxX: 5.5, maxY: 4.5 },
    });
    expect(advance(restored, 20)).toEqual([]); // steps 11 to 30
    expect(restored.step().map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit']); // step 31
    expect(playingView(restored).hero.health).toBe(15);
  });

  it('restores a monster resting after its attack: it winds up again when the rest would have ended', () => {
    const original = newGame(fightContent);
    advance(original, 40); // 9 of the 24 recovery steps are over

    const restored = continuedFrom(fightContent, original.snapshot());

    expect(monsterAction(restored, 'biter-1')).toEqual({ type: 'recovering' });
    advance(restored, 14); // step 54
    expect(monsterAction(restored, 'biter-1')).toEqual({ type: 'recovering' });
    restored.step(); // step 55
    expect(monsterAction(restored, 'biter-1')).toMatchObject({ type: 'winding-up', progress: 0 });
  });

  it('plays on exactly as the game it was taken from does', () => {
    const original = newGame(fightContent);
    advance(original, 17);
    const restored = continuedFrom(fightContent, original.snapshot());

    expect(advance(restored, 100)).toEqual(advance(original, 100));
    expect(restored.view()).toEqual(original.view());
  });
});
