import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import type { Tile } from '../src/core';
import { playingView } from './fixtures';
import { areaOf } from './main-route';
import { FIRST_GEAR, gameWithHero, heroAt, QUIET } from './profile-heroes';
import { directionBetween, isInZone, keyOf, neighboursOf, openTilesOf, walkRoute } from './routes';

// What the Checkpoints the game ships with leave the hero: its Health as it is. A hero with 1 Health, the one that
// needs Health most, is put beside each of them the way the tests of the balance put a hero somewhere (a game continued
// from a save, in the shipped content without its ordinary monsters) and walks onto it with the core's own walking.

const HURT_HERO = heroAt(1, { health: 0, attack: 0, defense: 0 }, FIRST_GEAR, 0);

const CHECKPOINTS = gameContent.areas.flatMap((area) =>
  (area.checkpoints ?? []).map(({ id, tile }) => ({ areaId: area.id, id, tile })),
);

/** A tile beside a Checkpoint that the hero can stand on: open ground that is no exit and no Checkpoint. */
function besideCheckpoint(areaId: string, checkpoint: Tile): Tile {
  const area = areaOf(areaId);
  const isOpen = openTilesOf(gameContent, area);
  const isExit = (tile: Tile): boolean => (area.exits ?? []).some(({ zone }) => isInZone(zone, tile));
  const isCheckpoint = (tile: Tile): boolean => (area.checkpoints ?? []).some((other) => keyOf(other.tile) === keyOf(tile));
  const found = neighboursOf(checkpoint).find((tile) => isOpen(tile) && !isExit(tile) && !isCheckpoint(tile));
  if (found === undefined) {
    throw new Error(`The Checkpoint at ${keyOf(checkpoint)} of "${areaId}" has no tile beside it to stand on`);
  }
  return found;
}

describe('the Checkpoints of the shipped content', () => {
  it('are the six of the adventure: the coast, the woods, the mountain, the cave and the two of the castle', () => {
    expect(CHECKPOINTS.map(({ id }) => id)).toEqual([
      'coast-checkpoint',
      'woods-checkpoint',
      'mountain-checkpoint',
      'cave-checkpoint',
      'castle-checkpoint',
      'guardian-checkpoint',
    ]);
  });

  it.each(CHECKPOINTS)('leave a hero of 1 Health with 1 Health: $id', ({ areaId, id, tile }) => {
    const beside = besideCheckpoint(areaId, tile);
    const game = gameWithHero(
      QUIET,
      HURT_HERO,
      { areaId, position: { x: beside.col + 0.5, y: beside.row + 0.5 }, facing: directionBetween(beside, tile) },
      (save) => {
        save.state.hero.health = 1;
      },
    );
    expect(playingView(game).hero.health).toBe(1);
    expect(playingView(game).hero.maxHealth).toBeGreaterThan(1);

    const events = walkRoute(game, [beside, tile]);

    expect(events.filter((event) => event.type === 'checkpoint-activated')).toEqual([
      { type: 'checkpoint-activated', checkpointId: id },
    ]);
    expect(playingView(game).checkpoints).toContainEqual(expect.objectContaining({ id, active: true }));
    expect(playingView(game).hero.health).toBe(1);
  });
});
