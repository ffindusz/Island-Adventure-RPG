import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import type { AreaDefinition, ChaserMonsterDefinition, Game, Tile } from '../src/core';
import { newGame, playingView } from './fixtures';
import { isInZone, openTilesOf, routeBetween, walkRoute } from './routes';

// The woods, the second area on the route of the adventure, between the coast and the mountain. Like the other tests
// of the shipped content, these read the map and the lists of the content and walk the hero over them with the core's
// own movement, so that moving a tile or a chest never breaks them unless the woods stop being what they are for.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';

function definitionOf(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The shipped content has no Adventure Area "${id}"`);
  }
  return area;
}

function chaserNamed(name: string): ChaserMonsterDefinition {
  const type = gameContent.monsterTypes[name];
  if (type === undefined || type.behavior !== 'chaser') {
    throw new Error(`The shipped content has no chasing monster type "${name}"`);
  }
  return type;
}

/** A new game of the shipped content in which the hero begins on a tile of an area, with every monster taken out. */
function quietGameAt(areaId: string, tile: Tile): Game {
  const areas = gameContent.areas.map((area) => ({ ...area, monsters: [] }));
  return newGame({ ...gameContent, areas, start: { area: areaId, tile } });
}

const woods = definitionOf(WOODS);
const wayIn = (woods.entrances ?? [])[0];
const wayForward = (woods.exits ?? []).find(({ to }) => to.area === MOUNTAIN);
const isOpen = openTilesOf(gameContent, woods);
const isWayForward = (tile: Tile): boolean => wayForward !== undefined && isInZone(wayForward.zone, tile);
/** The way from where the hero comes in to the exit forward over open ground, every door shut and no key held. */
const mainRoute = wayIn === undefined ? null : routeBetween(isOpen, wayIn.tile, isWayForward);

describe('the way through the woods', () => {
  it('comes second on the route of the adventure: after the coast, before the mountain', () => {
    expect(gameContent.areas.slice(0, 3).map(({ id }) => id)).toEqual([COAST, WOODS, MOUNTAIN]);
  });

  it('leads from the way in to the exit forward over open ground, with every door shut and no key held', () => {
    expect(wayIn?.id).toBe('from-coast');
    expect(wayForward, 'the woods have an exit to the mountain').toBeDefined();
    expect(mainRoute).not.toBeNull();
  });

  it('lets the hero walk it into the mountain, where it comes in by the entrance of the woods and touches its Checkpoint', () => {
    const game = quietGameAt(WOODS, wayIn?.tile ?? { col: 0, row: 0 });

    const events = walkRoute(game, mainRoute ?? []);

    const entrance = (definitionOf(MOUNTAIN).entrances ?? []).find(({ id }) => id === wayForward?.to.entrance);
    expect(events).toContainEqual({ type: 'area-changed', areaId: MOUNTAIN });
    expect(playingView(game).area.id).toBe(MOUNTAIN);
    expect(playingView(game).hero.position).toEqual({ x: (entrance?.tile.col ?? 0) + 0.5, y: (entrance?.tile.row ?? 0) + 0.5 });
    expect(playingView(game).checkpoints.filter(({ active }) => active)).toHaveLength(1);
  });
});

describe('the creatures of the woods', () => {
  const crab = chaserNamed('crab');

  it('has the wolf, a forest beast that chases the hero quicker than a crab does, yet slower than the hero walks, and is frailer', () => {
    const wolf = chaserNamed('wolf');

    expect(wolf.speedTilesPerSecond).toBeGreaterThan(crab.speedTilesPerSecond);
    expect(wolf.speedTilesPerSecond).toBeLessThan(gameContent.hero.speedTilesPerSecond);
    expect(wolf.health).toBeLessThan(crab.health);
  });

  it('has the slime, which chases the hero slower than a crab does, takes more hits and hits more lightly', () => {
    const slime = chaserNamed('slime');

    expect(slime.speedTilesPerSecond).toBeLessThan(crab.speedTilesPerSecond);
    expect(slime.health).toBeGreaterThan(crab.health);
    expect(slime.damage).toBeLessThan(crab.damage);
  });

  it('has trees, a kind of terrain the hero cannot walk through', () => {
    const trees = Object.values(gameContent.terrain).filter(({ kind }) => kind === 'tree');

    expect(trees).not.toEqual([]);
    expect(trees.every(({ solid }) => solid)).toBe(true);
  });
});
