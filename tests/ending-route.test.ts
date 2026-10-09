import { describe, expect, it } from 'vitest';
import type { Game, GameEvent } from '../src/core';
import { face, interactableViews, newGame, playingView, walk } from './fixtures';
import { GUARDIAN } from './guardian-fixtures';
import { harborContent, HARBOR_CREDITS, HARBOR_ENDING, VESSEL_ID } from './harbor-fixtures';

// The way to the ending runs through the Guardian: the vessel lies in the harbor behind the gate that only the Guardian's
// defeat opens, so the hero cannot sail home until it has won. These tests play that way from the front of the gate, in
// the harbor of harbor-fixtures.ts: the Guardian "guardian-1" on tile (4, 3), the gate "gate-1" on (8, 3) and the vessel
// "vessel-1" on (12, 3), all in the row of the hero, which begins on tile (5, 3) and attacks for 12, the Guardian's Health.
// A hero that walks right has its centre at x = 7.75 at the gate while it is shut, and at x = 11.75 at the vessel.

const INTERACT = { type: 'interact' } as const;
const CONFIRM = { type: 'confirm-departure' } as const;

/** A Guardian that never notices the hero, so that the hero can stand before its gate in peace. */
const CALM = { guardian: { ...GUARDIAN, noticingDistance: 0 } };

function gameBeforeTheGuardian(): Game {
  return newGame(harborContent({ start: { area: 'arena', tile: { col: 5, row: 3 } }, monsterTypes: CALM }));
}

/**
 * The hero strikes the Guardian on its left once, which defeats it. The Experience takes the hero to Level 2, and the game
 * waits for the Stat Point to be assigned before it steps on, so the point is assigned too. Returns the events of the strike.
 */
function slays(game: Game): readonly GameEvent[] {
  face(game, 'left');
  const events = game.send({ type: 'attack' });
  game.send({ type: 'assign-stat-point', stat: 'health' });
  return events;
}

const vesselOf = (game: Game) => interactableViews(game, 'vessel').find(({ id }) => id === VESSEL_ID);

describe('the way to the ending, while the Guardian lives', () => {
  it('stops at the gate: the hero walks as far as it, and cannot go on', () => {
    const game = gameBeforeTheGuardian();

    walk(game, 'right', 80);

    expect(playingView(game).hero.position).toEqual({ x: 7.75, y: 3.5 });
  });

  it('gives the hero nothing to prepare, to be asked or to confirm at the gate, and the vessel is as it was', () => {
    const game = gameBeforeTheGuardian();
    walk(game, 'right', 80);

    expect(game.send(INTERACT)).toEqual([]);
    expect(game.send(CONFIRM)).toEqual([]);

    expect(vesselOf(game)?.prepared).toBe(false);
    expect(playingView(game).departure).toBeNull();
    expect(game.view().phase).toBe('playing');
  });
});

describe('the way to the ending, once the Guardian is defeated', () => {
  it('does not prepare the vessel, or ask anything, by the defeat itself', () => {
    const game = gameBeforeTheGuardian();

    slays(game);

    expect(vesselOf(game)?.prepared).toBe(false);
    expect(playingView(game).departure).toBeNull();
    expect(game.send(INTERACT)).toEqual([]);
  });

  it('is walked by walking alone, from the front of the gate to the vessel', () => {
    const game = gameBeforeTheGuardian();
    slays(game);

    walk(game, 'right', 80);

    expect(playingView(game).hero.position).toEqual({ x: 11.75, y: 3.5 });
  });

  it('ends in the vessel: the hero prepares it, is asked, and sails home to the ending and the credits', () => {
    const game = gameBeforeTheGuardian();
    slays(game);
    walk(game, 'right', 80);

    expect(game.send(INTERACT)).toEqual([{ type: 'vessel-prepared', vesselId: VESSEL_ID }]);
    expect(game.send(INTERACT)).toEqual([]);
    expect(playingView(game).departure).toEqual({ vesselId: VESSEL_ID });
    expect(game.send(CONFIRM)).toEqual([{ type: 'ending-reached', ending: HARBOR_ENDING, credits: HARBOR_CREDITS }]);
    expect(game.view()).toEqual({ phase: 'title' });
  });
});
