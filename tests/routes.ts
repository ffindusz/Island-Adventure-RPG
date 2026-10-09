import type {
  AreaDefinition,
  ContentDefinition,
  Direction,
  Game,
  GameEvent,
  MonsterPlacement,
  Tile,
  TileRect,
} from '../src/core';
import { newGame, playingView, walk } from './fixtures';

// Walking the hero from place to place with the core's own movement, for the tests of the content the game ships
// with. The route comes from the content's own map, so that changing what ships never breaks these tests.

/** Ends a leg that did not get anywhere: a tile takes 12 steps to cross, so this is far more than enough. */
const LEG_STEP_LIMIT = 40;

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function keyOf({ col, row }: Tile): string {
  return `${col},${row}`;
}

/** The four tiles the hero can step to from a tile, whatever is on them. */
export function neighboursOf({ col, row }: Tile): Tile[] {
  return NEIGHBOURS.map(([stepCol, stepRow]) => ({ col: col + stepCol, row: row + stepRow }));
}

/**
 * The areas of the content with every monster taken out but the Guardian: the content is refused without one when it
 * asks for it (`requireGuardian`, which the shipped content does), and the gate that waits for its defeat names it. The
 * Guardian notices the hero only inside its own arena, which none of the walks of these tests goes into.
 */
export function withoutOrdinaryMonsters(content: ContentDefinition): AreaDefinition[] {
  const guardianTypes = new Set(
    Object.entries(content.monsterTypes).flatMap(([id, type]) => (type.behavior === 'guardian' ? [id] : [])),
  );
  return content.areas.map((area) => ({
    ...area,
    monsters: area.monsters.filter((placement) => guardianTypes.has(placement.type)),
  }));
}

/** A new game of the content with every ordinary monster taken out, for the tests that are not about the monsters. */
export function quietGameOf(content: ContentDefinition): Game {
  return newGame({ ...content, areas: withoutOrdinaryMonsters(content) });
}

export function isInZone(zone: TileRect, { col, row }: Tile): boolean {
  return col >= zone.col && col < zone.col + zone.width && row >= zone.row && row < zone.row + zone.height;
}

/** What stops the hero whatever its state, and what stops it only while it is shut. */
const ALWAYS_SOLID_KINDS: readonly string[] = ['chest', 'lever', 'sign', 'vessel'];
const SOLID_WHILE_SHUT_KINDS: readonly string[] = ['door', 'gate'];

/**
 * The tiles of an area the hero can stand on: terrain that is not solid, with no chest, lever, sign or vessel on it,
 * which are solid too. A door or a gate is solid as well while it is shut, and the hero begins with every one shut. With
 * `doorsOpen` they all count as open ground, for what the hero can reach once the puzzles are solved.
 */
export function openTilesOf(
  content: ContentDefinition,
  area: AreaDefinition,
  doorsOpen = false,
): (tile: Tile) => boolean {
  const solidKinds = doorsOpen ? ALWAYS_SOLID_KINDS : [...ALWAYS_SOLID_KINDS, ...SOLID_WHILE_SHUT_KINDS];
  const blocked = new Set(
    (area.interactables ?? []).flatMap((interactable) =>
      solidKinds.includes(interactable.kind) ? [keyOf(interactable.tile)] : [],
    ),
  );
  return (tile) => {
    const symbol = area.layout[tile.row]?.[tile.col];
    return symbol !== undefined && content.terrain[symbol]?.solid === false && !blocked.has(keyOf(tile));
  };
}

/**
 * The tiles of the shortest route over open tiles from one tile to the nearest tile `isGoal` accepts, both ends
 * included, or null when there is no such route.
 */
export function routeBetween(isOpen: (tile: Tile) => boolean, from: Tile, isGoal: (tile: Tile) => boolean): Tile[] | null {
  const cameFrom = new Map<string, Tile | null>([[keyOf(from), null]]);
  const frontier: Tile[] = [from];
  for (const tile of frontier) {
    if (isGoal(tile)) {
      const route: Tile[] = [];
      for (let at: Tile | null | undefined = tile; at; at = cameFrom.get(keyOf(at))) {
        route.unshift(at);
      }
      return route;
    }
    for (const next of neighboursOf(tile)) {
      if (!cameFrom.has(keyOf(next)) && isOpen(next)) {
        cameFrom.set(keyOf(next), tile);
        frontier.push(next);
      }
    }
  }
  return null;
}

/** The way to hold to get from a tile to a neighbouring one. */
export function directionBetween(from: Tile, to: Tile): Direction {
  if (to.col !== from.col) {
    return to.col > from.col ? 'right' : 'left';
  }
  return to.row > from.row ? 'down' : 'up';
}

function hasReached(game: Game, target: Tile, direction: Direction): boolean {
  const { x, y } = playingView(game).hero.position;
  switch (direction) {
    case 'right':
      return x >= target.col + 0.5;
    case 'left':
      return x <= target.col + 0.5;
    case 'down':
      return y >= target.row + 0.5;
    case 'up':
      return y <= target.row + 0.5;
  }
}

/**
 * Walks the hero along a route of neighbouring tiles, from the middle of each tile to the middle of the next, one
 * step at a time. It stops when `keepGoing`, asked before every step, says so, when the hero comes into another
 * Adventure Area, or when the route ends. Returns the events on the way.
 */
export function walkRoute(game: Game, route: readonly Tile[], keepGoing: () => boolean = () => true): GameEvent[] {
  const events: GameEvent[] = [];
  const areaId = playingView(game).area.id;
  for (let leg = 1; leg < route.length; leg += 1) {
    const from = route[leg - 1];
    const to = route[leg];
    if (from === undefined || to === undefined) {
      break;
    }
    const direction = directionBetween(from, to);
    for (let step = 0; !hasReached(game, to, direction); step += 1) {
      if (step === LEG_STEP_LIMIT) {
        throw new Error(`The hero is stuck on its way from ${keyOf(from)} to ${keyOf(to)}`);
      }
      if (!keepGoing()) {
        return events;
      }
      events.push(...walk(game, direction, 1));
      if (playingView(game).area.id !== areaId) {
        return events;
      }
    }
  }
  return events;
}

// What a hero earns on a route, for the tests of the Experience that the shipped areas give: it fights the monsters it
// meets on the way and passes the milestones, and never grinds.

/** What a monster is worth when it is defeated, by its type. */
export function experienceOf(content: ContentDefinition, monster: { readonly type: string }): number {
  return content.monsterTypes[monster.type]?.experience ?? 0;
}

/** How far from its body a monster notices a hero, in tiles: none for a type that never notices one. */
export function noticingOf(content: ContentDefinition, monster: { readonly type: string }): number {
  const type = content.monsterTypes[monster.type];
  return type !== undefined && 'noticingDistance' in type ? type.noticingDistance : 0;
}

/** How far apart two tiles are: the farther of the columns and the rows between them, so a diagonal step is one. */
export function distanceBetween(one: Tile, other: Tile): number {
  return Math.max(Math.abs(one.col - other.col), Math.abs(one.row - other.row));
}

/**
 * The monsters of an area that a hero meets on a route. A monster notices a hero in the square round its body that its
 * noticing distance makes, so a hero on a route meets it when a tile of the route lies in that square. A route that
 * is not there meets nothing.
 */
export function metOn(
  content: ContentDefinition,
  area: AreaDefinition,
  route: readonly Tile[] | null,
): MonsterPlacement[] {
  return area.monsters.filter((monster) =>
    (route ?? []).some((tile) => distanceBetween(tile, monster.tile) <= noticingOf(content, monster)),
  );
}

export function experienceOfAll(content: ContentDefinition, monsters: readonly { readonly type: string }[]): number {
  return monsters.reduce((total, monster) => total + experienceOf(content, monster), 0);
}

/** What the milestones of an area give together, in Experience. */
export function milestonesOf(area: AreaDefinition): number {
  return (area.milestones ?? []).reduce((total, { reward }) => total + reward.experience, 0);
}
