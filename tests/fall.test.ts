import { describe, expect, it } from 'vitest';
import { Fall, FALL_FADE_OUT_MS, FALL_LIE_MS } from '../src/adapter/fall';
import type { ArrowView, MonsterView, PlayingView } from '../src/core';
import { arena, newGame, playingView } from './fixtures';

const WIND_UP_ZONE = { minX: 3.5, minY: 3, maxX: 4.5, maxY: 4 };

function monster(id: string, action: MonsterView['action']): MonsterView {
  return { id, type: 'biter', position: { x: 4.5, y: 3.5 }, size: 0.5, health: 3, maxHealth: 3, action };
}

/** The last frame the player saw before a defeat: area text on the screen, a biter about to strike, arrows in the air. */
function lastFrame(): PlayingView {
  const arrows: ArrowView[] = [
    { position: { x: 2.5, y: 3.5 }, direction: 'left', size: 0.25, shooter: 'hero' },
    { position: { x: 5.5, y: 2.5 }, direction: 'down', size: 0.25, shooter: 'monster' },
  ];
  return {
    ...playingView(newGame(arena())),
    areaText: 'A quiet arena.',
    monsters: [
      monster('biter-1', { type: 'winding-up', progress: 0.9, zone: WIND_UP_ZONE }),
      monster('biter-2', { type: 'dashing', direction: 'left' }),
      monster('biter-3', { type: 'chasing' }),
    ],
    arrows,
  };
}

describe('the fall of a defeated hero on the screen', () => {
  it('begins with the hero lying where it fell', () => {
    expect(new Fall(lastFrame()).stage).toBe('lying');
  });

  it('lies for its time, then the screen fades out for its time, then it is over', () => {
    const fall = new Fall(lastFrame());
    fall.age(FALL_LIE_MS - 1);
    expect(fall.stage).toBe('lying');
    fall.age(1);
    expect(fall.stage).toBe('fading-out');
    fall.age(FALL_FADE_OUT_MS - 1);
    expect(fall.stage).toBe('fading-out');
    fall.age(1);
    expect(fall.stage).toBe('over');
  });

  it('is over after one long frame, and stays over, so that the game cannot be left waiting for it', () => {
    const fall = new Fall(lastFrame());
    fall.age(60_000);
    expect(fall.stage).toBe('over');
    fall.age(16);
    expect(fall.stage).toBe('over');
  });

  it('ends after frames of any length, a few long ones as well as many short', () => {
    for (const length of [16, 16.7, 33, 100, 8]) {
      const fall = new Fall(lastFrame());
      let frames = 0;
      while (fall.stage !== 'over' && frames < 10_000) {
        fall.age(length);
        frames += 1;
      }
      expect(fall.stage).toBe('over');
    }
  });
});

describe('what the screen shows during the fall', () => {
  it('has the hero where it was in the last frame, with no Health left', () => {
    const { hero } = new Fall(lastFrame()).view;
    expect(hero.position).toEqual({ x: 3.5, y: 3.5 });
    expect(hero.health).toBe(0);
    expect(hero.maxHealth).toBe(10);
  });

  it('has nothing in the air, since the arrows of that life do not fly on', () => {
    expect(new Fall(lastFrame()).view.arrows).toEqual([]);
  });

  it('has no text of the area', () => {
    expect(new Fall(lastFrame()).view.areaText).toBeNull();
  });

  it('has a monster that was winding up resting, and the others as they were', () => {
    const { monsters } = new Fall(lastFrame()).view;
    expect(monsters.map((each) => each.action)).toEqual([
      { type: 'recovering' },
      { type: 'dashing', direction: 'left' },
      { type: 'chasing' },
    ]);
    expect(monsters.map((each) => each.position)).toEqual([
      { x: 4.5, y: 3.5 },
      { x: 4.5, y: 3.5 },
      { x: 4.5, y: 3.5 },
    ]);
  });

  it('is the last frame in everything else, and leaves that frame as it was', () => {
    const frame = lastFrame();
    const { view } = new Fall(frame);
    expect(view.area).toBe(frame.area);
    expect(view.exits).toBe(frame.exits);
    expect(view.checkpoints).toBe(frame.checkpoints);
    expect(view.interactables).toBe(frame.interactables);
    expect(view.progress).toBe(frame.progress);
    expect(frame.hero.health).toBe(10);
    expect(frame.arrows).toHaveLength(2);
    expect(frame.areaText).toBe('A quiet arena.');
    expect(frame.monsters[0]?.action.type).toBe('winding-up');
  });
});
