import { gameContent } from '../src/content';
import type {
  AreaDefinition,
  ConsumableId,
  ExitDefinition,
  Game,
  GameEvent,
  MilestoneDefinition,
  MonsterPlacement,
  Tile,
} from '../src/core';
import { playingView } from './fixtures';
import {
  experienceOfAll,
  isInZone,
  keyOf,
  metOn,
  neighboursOf,
  openTilesOf,
  routeBetween,
  walkRoute,
} from './routes';

// The intended route of the adventure, read from the shipped content, for the tests of the balance pass and of the
// areas: the legs a first-time player walks, from the start of the coast to the Guardian's Checkpoint, with every door
// and gate shut.
// Nothing here is a number of its own: the route, what it meets and what it earns all come from the content.

/** The five Adventure Areas in the order of the adventure. */
export const AREA_IDS = ['shipwreck-coast', 'woods', 'mountain', 'cave', 'castle'] as const;
export type AreaId = (typeof AREA_IDS)[number];

/** The areas whose route is the path of sand: the trail, which the area tests of the woods, the mountain and the cave take from here. */
const TRAIL_OF_SAND: readonly AreaId[] = ['woods', 'mountain', 'cave'];

/** The Checkpoint where the route of the castle ends: the Guardian's, in the gateway to the arena. */
const GUARDIAN_CHECKPOINT = 'guardian-checkpoint';

/** The shipped Adventure Area with this id, for every test that needs one: a test of the content is wrong when there is none, so it throws. */
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

/** Walks a route, spending each Stat Point on Health as the game waits for it: the milestones give Experience too. */
export function walkAssigning(game: Game, route: readonly Tile[]): GameEvent[] {
  return walkRoute(game, route, () => {
    while (playingView(game).levelUp !== null) {
      game.send({ type: 'assign-stat-point', stat: 'health' });
    }
    return true;
  });
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

/** What a hero has earned on the way in to an area: the route of every area before it, monsters and milestones. */
export function experienceBefore(id: AreaId): number {
  return AREA_IDS.slice(0, AREA_IDS.indexOf(id)).reduce((total, before) => total + experienceOnRoute(before), 0);
}

/**
 * A chest or a pickup is near the route when the walk to it from the route is this many tiles at most: a step aside,
 * not a trip. The area tests hold what lies near the route to it, and the balance tools take what a hero who looks
 * around picks up with it.
 */
export const MOST_NEARBY = 4;

/** A side path is a walk, not a step aside: this many tiles at least from the route to the spot beside what lies at its end. */
export const LEAST_DETOUR = 6;

const detours = new Map<string, Map<string, number>>();

/**
 * How far every tile of open ground an area is from its route, in steps: with every door and gate shut, or with them
 * all open, for what a hero reaches once the puzzles are solved.
 */
function detoursOf(id: AreaId, doorsOpen: boolean): Map<string, number> {
  const cacheKey = `${id}/${doorsOpen ? 'open' : 'shut'}`;
  const known = detours.get(cacheKey);
  if (known !== undefined) {
    return known;
  }
  const isOpen = openTilesOf(gameContent, areaOf(id), doorsOpen);
  const distances = new Map<string, number>(routeOf(id).map((tile) => [keyOf(tile), 0]));
  const frontier = [...routeOf(id)];
  for (const tile of frontier) {
    const here = distances.get(keyOf(tile)) ?? 0;
    for (const next of neighboursOf(tile)) {
      if (!distances.has(keyOf(next)) && isOpen(next)) {
        distances.set(keyOf(next), here + 1);
        frontier.push(next);
      }
    }
  }
  detours.set(cacheKey, distances);
  return distances;
}

/**
 * How many steps off the route a hero goes to take or open what lies on a tile: to the tile itself for a pickup, and to
 * the nearest open tile beside it for a chest, which is solid. Undefined when a shut door or gate is in the way, unless
 * `doorsOpen` says that the hero has opened them all.
 */
export function detourTo(id: AreaId, tile: Tile, doorsOpen = false): number | undefined {
  const distances = detoursOf(id, doorsOpen);
  const reached = [tile, ...neighboursOf(tile)].flatMap((candidate) => distances.get(keyOf(candidate)) ?? []);
  return reached.length === 0 ? undefined : Math.min(...reached);
}

/** What a chest or a pickup of an area holds, and how far off the route it lies. */
export type Find =
  | { readonly kind: 'gear'; readonly gear: string; readonly detour: number | undefined }
  | { readonly kind: 'consumable'; readonly consumable: ConsumableId; readonly amount: number; readonly detour: number | undefined };

export function findsOf(id: AreaId): Find[] {
  return (areaOf(id).interactables ?? []).flatMap((interactable): Find[] => {
    const detour = detourTo(id, interactable.tile);
    if (interactable.kind === 'pickup') {
      return [{ kind: 'consumable', consumable: interactable.consumable, amount: interactable.amount, detour }];
    }
    if (interactable.kind === 'chest') {
      const { contents } = interactable;
      return contents.kind === 'gear'
        ? [{ kind: 'gear', gear: contents.gear, detour }]
        : [{ kind: 'consumable', consumable: contents.consumable, amount: contents.amount, detour }];
    }
    return [];
  });
}
