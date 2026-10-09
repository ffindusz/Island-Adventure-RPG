import { gameContent } from '../src/content';
import type { AreaDefinition, ExitDefinition, MilestoneDefinition, MonsterPlacement, Tile } from '../src/core';
import { experienceOfAll, isInZone, keyOf, metOn, openTilesOf, routeBetween } from './routes';

// The intended route of the adventure, read from the shipped content, for the tests of the balance pass: the legs a
// first-time player walks, from the start of the coast to the Guardian's Checkpoint, with every door and gate shut.
// Nothing here is a number of its own: the route, what it meets and what it earns all come from the content.

/** The five Adventure Areas in the order of the adventure. */
export const AREA_IDS = ['shipwreck-coast', 'woods', 'mountain', 'cave', 'castle'] as const;
export type AreaId = (typeof AREA_IDS)[number];

/** The areas whose route is the path of sand: the trail, as the area tests of the woods, the mountain and the cave take it. */
const TRAIL_OF_SAND: readonly AreaId[] = ['woods', 'mountain', 'cave'];

/** The Checkpoint where the route of the castle ends: the Guardian's, in the gateway to the arena. */
const GUARDIAN_CHECKPOINT = 'guardian-checkpoint';

export function areaOf(id: string): AreaDefinition {
  const found = gameContent.areas.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`The content has no Adventure Area "${id}"`);
  }
  return found;
}

/** The exit of an area that leads on to the next area of the adventure, or undefined in the last. */
export function forwardExitOf(id: AreaId): ExitDefinition | undefined {
  const next = AREA_IDS[AREA_IDS.indexOf(id) + 1];
  return areaOf(id).exits?.find(({ to }) => to.area === next);
}

/** Where the hero stands when it begins an area: the start of the adventure, or where the exit of the area before leads. */
export function wayInOf(id: AreaId): Tile {
  const before = AREA_IDS[AREA_IDS.indexOf(id) - 1];
  if (before === undefined) {
    return gameContent.start.tile;
  }
  const entrance = forwardExitOf(before)?.to.entrance;
  const found = areaOf(id).entrances?.find((candidate) => candidate.id === entrance);
  if (found === undefined) {
    throw new Error(`The area before "${id}" has no exit that leads into it`);
  }
  return found.tile;
}

const routes = new Map<AreaId, readonly Tile[]>();

/**
 * The shortest walk from the way in of an area to its way on over open ground with every door and gate shut: along the
 * sand in the woods, the mountain and the cave, over any open ground on the coast and in the castle, where the route
 * ends at the Guardian's Checkpoint.
 */
export function routeOf(id: AreaId): readonly Tile[] {
  const known = routes.get(id);
  if (known !== undefined) {
    return known;
  }
  const area = areaOf(id);
  const isOpen = openTilesOf(gameContent, area);
  const isSand = (tile: Tile): boolean => gameContent.terrain[area.layout[tile.row]?.[tile.col] ?? '']?.kind === 'sand';
  const forward = forwardExitOf(id);
  const end = area.checkpoints?.find((checkpoint) => checkpoint.id === GUARDIAN_CHECKPOINT)?.tile;
  const found = routeBetween(
    TRAIL_OF_SAND.includes(id) ? (tile) => isOpen(tile) && isSand(tile) : isOpen,
    wayInOf(id),
    (tile) => (forward !== undefined ? isInZone(forward.zone, tile) : end !== undefined && keyOf(tile) === keyOf(end)),
  );
  if (found === null) {
    throw new Error(`There is no route through "${id}"`);
  }
  routes.set(id, found);
  return found;
}

/** The monsters a hero who walks the route of an area meets: each notices it from where it stands. */
export function monstersOnRoute(id: AreaId): MonsterPlacement[] {
  return metOn(gameContent, areaOf(id), routeOf(id));
}

/** The milestones the route of an area crosses. */
export function milestonesOnRoute(id: AreaId): MilestoneDefinition[] {
  const route = routeOf(id);
  return (areaOf(id).milestones ?? []).filter(({ zone }) => route.some((tile) => isInZone(zone, tile)));
}

/** What a hero who fights what it meets on the route of an area and crosses its milestones earns there. */
export function experienceOnRoute(id: AreaId): number {
  return (
    experienceOfAll(gameContent, monstersOnRoute(id)) +
    milestonesOnRoute(id).reduce((total, { reward }) => total + reward.experience, 0)
  );
}

/** The Level of a hero with some Experience, by the thresholds of the content: Level 1 below the first. */
export function levelOf(experience: number): number {
  return 1 + gameContent.progression.levelThresholds.filter((threshold) => experience >= threshold).length;
}
