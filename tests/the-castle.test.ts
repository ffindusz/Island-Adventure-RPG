import { describe, expect, it } from 'vitest';
import { monsterColour, terrainColour } from '../src/adapter/art';
import { VIEW_TILES_HIGH, VIEW_TILES_WIDE } from '../src/adapter/config';
import { gameContent } from '../src/content';
import { GEAR_SLOTS, createGame } from '../src/core';
import type {
  AreaDefinition,
  ChestDefinition,
  Game,
  GameEvent,
  InteractableDefinition,
  Tile,
} from '../src/core';
import { FIELD_LAYOUT, arena, face, fixedRandom, newGame, playingView } from './fixtures';
import { areaOf, BOTTOM_ROWS, LEAST_DETOUR, MOST_NEARBY, quietGameAt, routeOf, typeOf } from './main-route';
import { colourGap, LEAST_COLOUR_GAP } from './pictures';
import {
  damageOf,
  directionBetween,
  distanceBetween,
  experienceForLevel,
  experienceOfAll,
  isInOpenBlock,
  isInZone,
  keyOf,
  metOn,
  milestonesOf,
  neighboursOf,
  noticingOf,
  openTilesOf,
  routeBetween,
  tilesOf,
  walkRoute,
} from './routes';

// The old castle, the fifth and last Adventure Area on the route of the adventure, up to the end of its route: what it
// has to be to read as yards and buildings and not as a second cave, with undead that are not the cave's creatures,
// supplies and an armor upgrade for the final fight, and a route that ends against the east wall of the last hall, where
// the gateway to the Guardian begins. What lies beyond, the Guardian's own, is the part of the-guardian.test.ts. Like the
// other tests of the shipped content, these read the map and the lists of the content and walk the hero over them with
// the core's own movement, so that moving a tile or a chest never breaks them unless the castle stops being what it is
// for.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';
const CAVE = 'cave';
const CASTLE = 'castle';

/** The Adventure Areas in the order of the route of the adventure. */
const ROUTE_OF_AREAS = [COAST, WOODS, MOUNTAIN, CAVE, CASTLE];

/**
 * Where the route of the castle ends: the middle of the east wall of the last hall, against the tile where the gateway
 * to the Guardian's arena begins, which the route does not go into.
 */
const END_OF_ROUTE: Tile = { col: 62, row: 11 };

/** The route is a long walk: this many screens wide, at least and at most. */
const SCREENS_OF_ROUTE = { least: 4, most: 5 };

/** A stretch of the route is a courtyard or a hall when it runs over this many tiles of the same ground, at least. */
const LEAST_STRETCH = 6;

/** The last hall is the open ground of the castle within this many tiles of the end of the route, not beyond it. */
const LAST_HALL_REACH = 4;

const castle = areaOf(CASTLE);
const wayIn = (castle.entrances ?? [])[0];
const wayInTile: Tile = wayIn?.tile ?? { col: 0, row: 0 };
const wayBack = (castle.exits ?? []).find(({ to }) => to.area === CAVE);
const isOpen = openTilesOf(gameContent, castle);
const kindAt = ({ col, row }: Tile): string | undefined => gameContent.terrain[castle.layout[row]?.[col] ?? '']?.kind;
const isSolidAt = ({ col, row }: Tile): boolean => gameContent.terrain[castle.layout[row]?.[col] ?? '']?.solid ?? true;
/** The route: the shortest way over open ground from the way in to the end of the route, with every door and gate shut and no key held. */
const route = routeBetween(isOpen, wayInTile, (tile) => keyOf(tile) === keyOf(END_OF_ROUTE));

/** The tiles within a number of tiles of a tile, measured the way the notice is: the farther of the columns and the rows between them. */
function tilesAround(centre: Tile, reach: number): Tile[] {
  const side = 2 * reach + 1;
  return Array.from({ length: side * side }, (_, place) => ({
    col: centre.col - reach + (place % side),
    row: centre.row - reach + Math.floor(place / side),
  }));
}

/** The stretches of a route, in order: each is a run of tiles on the same kind of ground. */
function stretchesOf(tiles: readonly Tile[]): { kind: string; length: number }[] {
  const stretches: { kind: string; length: number }[] = [];
  for (const tile of tiles) {
    const kind = kindAt(tile) ?? '';
    const last = stretches.at(-1);
    if (last?.kind === kind) {
      last.length += 1;
    } else {
      stretches.push({ kind, length: 1 });
    }
  }
  return stretches;
}

/** Everything placed on the map of the castle, by id, with the tiles it takes: a zone takes all of its tiles. */
const placed = [
  ...(castle.entrances ?? []).map(({ id, tile }) => ({ id, tiles: [tile] })),
  ...(castle.checkpoints ?? []).map(({ id, tile }) => ({ id, tiles: [tile] })),
  ...(castle.exits ?? []).map(({ id, zone }) => ({ id, tiles: tilesOf(zone) })),
  ...(castle.milestones ?? []).map(({ id, zone }) => ({ id, tiles: tilesOf(zone) })),
  ...(castle.interactables ?? []).map(({ id, tile }) => ({ id, tiles: [tile] })),
  ...castle.monsters.map(({ id, tile }) => ({ id, tiles: [tile] })),
];

/**
 * The types of undead in the castle, with their ids, and the tougher one among them: the one that takes most to defeat.
 * The Guardian is no undead of the route and has the tests of its own.
 */
const undead = [...new Set(castle.monsters.map(({ type }) => type))].flatMap((id) => {
  const type = gameContent.monsterTypes[id];
  return type === undefined || type.behavior === 'guardian' ? [] : [{ id, type }];
});
const tougher = [...undead].sort((one, other) => other.type.health - one.type.health)[0];
const toughUndead = castle.monsters.filter(({ type }) => type === tougher?.id);

/** The most steps that a monster takes to land its first blow on a hero who stands still four tiles from it: over six seconds. */
const BLOW_STEP_LIMIT = 400;

/**
 * The first blow that a monster of a type lands on a rested hero of the shipped content, who stands still four tiles
 * from it in an empty field: the `hero-hit` of the core, with what the blow took after Defense and what it left.
 */
function firstBlowOf(typeId: string): Extract<GameEvent, { type: 'hero-hit' }> {
  const game = newGame(
    arena({
      layout: FIELD_LAYOUT,
      start: { area: 'arena', tile: { col: 3, row: 3 } },
      monsters: [{ id: 'undead', type: typeId, tile: { col: 7, row: 3 } }],
      hero: gameContent.hero,
      progression: gameContent.progression,
      gear: gameContent.gear,
      healingPotion: gameContent.healingPotion,
      minimumDamage: gameContent.minimumDamage,
      monsterTypes: gameContent.monsterTypes,
    }),
  );
  for (let step = 0; step < BLOW_STEP_LIMIT; step += 1) {
    for (const event of game.step()) {
      if (event.type === 'hero-hit') {
        return event;
      }
    }
  }
  throw new Error(`The ${typeId} did not land a blow within ${BLOW_STEP_LIMIT} steps`);
}

const chests = (castle.interactables ?? []).flatMap((item) => (item.kind === 'chest' ? [item] : []));
const pickups = (castle.interactables ?? []).flatMap((item) => (item.kind === 'pickup' ? [item] : []));
const onRoute = new Set((route ?? []).map(keyOf));

function gearSlotOf({ contents }: ChestDefinition): string | undefined {
  return contents.kind === 'gear' ? gameContent.gear[contents.gear]?.slot : undefined;
}

/** The ids of the Gear that the chests of an area hold. */
function gearInChestsOf(area: AreaDefinition): string[] {
  return (area.interactables ?? []).flatMap((item) =>
    item.kind === 'chest' && item.contents.kind === 'gear' ? [item.contents.gear] : [],
  );
}

function holdsAmmunition(item: InteractableDefinition): boolean {
  return item.kind === 'chest'
    ? item.contents.kind === 'consumable' && item.contents.consumable === 'ammunition'
    : item.kind === 'pickup' && item.consumable === 'ammunition';
}

function chestThat(what: string, matches: (chest: ChestDefinition) => boolean): ChestDefinition {
  const found = chests.find(matches);
  if (found === undefined) {
    throw new Error(`The castle has no ${what}`);
  }
  return found;
}

/** The shortest walk over open ground from a spot to the route, or null when there is none. */
function walkToRoute(spot: Tile): Tile[] | null {
  return routeBetween(isOpen, spot, (tile) => onRoute.has(keyOf(tile)));
}

/** How far along the route a spot lies: the place of the route tile that is the shortest walk from it, or null when it cannot be walked to. */
function placeOnRoute(spot: Tile): number | null {
  const reached = walkToRoute(spot)?.at(-1);
  return reached === undefined ? null : (route ?? []).findIndex((tile) => keyOf(tile) === keyOf(reached));
}

/** How many tiles of walking lie between the route and a spot, or null when the spot cannot be walked to. */
function detourFromRoute(spot: Tile): number | null {
  const walkBack = walkToRoute(spot);
  return walkBack === null ? null : walkBack.length - 2;
}

/** How far along the route the tougher undead first notices the hero, or -1 when it never does. */
const firstMetTougher = (route ?? []).findIndex((tile) =>
  toughUndead.some((one) => distanceBetween(tile, one.tile) <= noticingOf(gameContent, one)),
);

/** The hero walks from where it stands to a spot beside a chest over open ground, faces the chest and uses Interact. */
function openChest(game: Game, chest: ChestDefinition): readonly GameEvent[] {
  const { x, y } = playingView(game).hero.position;
  const from = { col: Math.floor(x), row: Math.floor(y) };
  const walk = routeBetween(isOpen, from, (tile) => neighboursOf(tile).some((next) => keyOf(next) === keyOf(chest.tile)));
  if (walk === null) {
    throw new Error(`The hero cannot walk to a spot beside the chest "${chest.id}"`);
  }
  walkRoute(game, walk);
  face(game, directionBetween(walk.at(-1) ?? from, chest.tile));
  return game.send({ type: 'interact' });
}

/** The event that says the hero took what a chest holds. */
function pickupFrom({ contents }: ChestDefinition): unknown {
  return expect.objectContaining({
    type: 'pickup',
    item:
      contents.kind === 'gear'
        ? expect.objectContaining({ kind: 'gear', id: contents.gear })
        : { kind: 'consumable', id: contents.consumable, amount: contents.amount },
  });
}

describe('the five Adventure Areas', () => {
  it('come in the order of the route of the adventure, and the castle is the last: coast, woods, mountain, cave, castle', () => {
    expect(gameContent.areas.map(({ id }) => id)).toEqual(ROUTE_OF_AREAS);
  });

  it('are joined in order: each area has an exit forward to an entrance of the next, and the next has an exit back to an entrance of it', () => {
    for (const [index, id] of ROUTE_OF_AREAS.slice(0, -1).entries()) {
      const next = ROUTE_OF_AREAS[index + 1] ?? '';
      const forward = (areaOf(id).exits ?? []).find(({ to }) => to.area === next);
      const back = (areaOf(next).exits ?? []).find(({ to }) => to.area === id);

      expect(forward, `${id} has an exit forward to ${next}`).toBeDefined();
      expect((areaOf(next).entrances ?? []).map((entrance) => entrance.id)).toContain(forward?.to.entrance);
      expect(back, `${next} has an exit back to ${id}`).toBeDefined();
      expect((areaOf(id).entrances ?? []).map((entrance) => entrance.id)).toContain(back?.to.entrance);
    }
  });

  it('load with the rest of the shipped content: the content check passes', () => {
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });
});

describe('the way through the castle', () => {
  it('is larger than the screen in both directions, so that the view must follow the hero', () => {
    const { area } = playingView(quietGameAt(CASTLE, wayInTile));

    expect(area.width).toBeGreaterThan(VIEW_TILES_WIDE);
    expect(area.height).toBeGreaterThan(VIEW_TILES_HIGH);
  });

  it('has two Checkpoints: the one where the hero comes in from the cave, and the Guardian\'s', () => {
    expect(wayIn?.id).toBe('from-cave');
    expect(castle.checkpoints).toHaveLength(2);
    expect(castle.checkpoints).toContainEqual(expect.objectContaining({ id: 'castle-checkpoint', tile: wayInTile }));
  });

  it('has one way back, to the entrance of the cave that the hero who comes from the castle uses, and keeps it and the way in out of the bottom rows', () => {
    const lowest = castle.layout.length - 1 - BOTTOM_ROWS;

    expect(wayBack?.to.entrance).toBe('from-castle');
    expect(wayIn?.tile.row ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(lowest);
    expect((wayBack?.zone.row ?? Number.POSITIVE_INFINITY) + (wayBack?.zone.height ?? 0) - 1).toBeLessThanOrEqual(lowest);
  });

  it('leads from the way in to the end of the route over open ground, with every door and gate shut and no key held: no puzzle stands in the way', () => {
    expect(route).not.toBeNull();
  });

  it('lets the hero walk it from the way in to the end of the route, and keeps the hero in the castle', () => {
    const game = quietGameAt(CASTLE, wayInTile);

    walkRoute(game, route ?? []);

    const { x, y } = playingView(game).hero.position;
    expect(playingView(game).area.id).toBe(CASTLE);
    expect({ col: Math.floor(x), row: Math.floor(y) }).toEqual(END_OF_ROUTE);
  });

  it('is a long walk: four screens wide at least, and five at most', () => {
    const steps = (route?.length ?? 0) - 1;

    expect(steps).toBeGreaterThanOrEqual(SCREENS_OF_ROUTE.least * VIEW_TILES_WIDE);
    expect(steps).toBeLessThanOrEqual(SCREENS_OF_ROUTE.most * VIEW_TILES_WIDE);
  });

  it('goes through courtyards and halls in turn: two stretches of grass and two of sand, each six tiles long at least', () => {
    const long = stretchesOf(route ?? []).filter(({ length }) => length >= LEAST_STRETCH);

    expect(long.filter(({ kind }) => kind === 'grass').length).toBeGreaterThanOrEqual(2);
    expect(long.filter(({ kind }) => kind === 'sand').length).toBeGreaterThanOrEqual(2);
  });
});

// The route ends against the east wall of the last hall, which is solid but for the mouth of the gateway to the Guardian:
// what lies beyond it is the Guardian's, and has the tests of the-guardian.test.ts.
describe('the end of the route', () => {
  /** The room: the open ground within reach of the end of the route, not the gateway beyond its wall. */
  const lastHall = tilesAround(END_OF_ROUTE, LAST_HALL_REACH).filter(
    (tile) => !isSolidAt(tile) && tile.col <= END_OF_ROUTE.col,
  );
  /** Whether a block of open ground four tiles square has its corner on a tile: room for the hero to stand and step aside. */
  const hasBlockAt = ({ col, row }: Tile): boolean =>
    [0, 1, 2, 3].every((across) => [0, 1, 2, 3].every((down) => isOpen({ col: col + across, row: row + down })));

  it('lies against the east wall of the last hall, which is solid along its whole length but for the mouth of the gateway to the Guardian, in the row of the end of the route', () => {
    const wall = END_OF_ROUTE.col + 1;

    expect(castle.layout.flatMap((_, row) => (isSolidAt({ col: wall, row }) ? [] : [row]))).toEqual([END_OF_ROUTE.row]);
  });

  it('lies in a last hall that has room to prepare in: a block of open ground four tiles square', () => {
    expect(lastHall.some(hasBlockAt)).toBe(true);
  });

  it('keeps the last hall empty: no monster, chest, pickup, milestone, Checkpoint, entrance or exit is placed in it', () => {
    const inLastHall = new Set(lastHall.map(keyOf));

    expect(lastHall.length).toBeGreaterThan(0);
    expect(placed.filter(({ tiles }) => tiles.some((tile) => inLastHall.has(keyOf(tile)))).map(({ id }) => id)).toEqual([]);
  });

  it('keeps the monsters out of earshot of the last hall: none notices a hero there, with a tile to spare', () => {
    const tooNear = castle.monsters.flatMap((monster) =>
      lastHall.some((tile) => distanceBetween(tile, monster.tile) <= noticingOf(gameContent, monster) + 1) ? [monster.id] : [],
    );

    expect(tooNear).toEqual([]);
  });
});

describe('the undead of the castle', () => {
  it('holds the castle with undead and nothing else: every monster in it is of a castle type', () => {
    expect(castle.monsters.length).toBeGreaterThan(0);
    expect(castle.monsters.filter(({ type }) => !type.startsWith('castle-'))).toEqual([]);
  });

  it('meets a hero who walks the route with undead that chase, that charge and that shoot', () => {
    const behaviors = metOn(gameContent, castle, route).map((monster) => typeOf(monster)?.behavior);

    expect(behaviors).toContain('chaser');
    expect(behaviors).toContain('charger');
    expect(behaviors).toContain('ranged');
  });

  it('has a tougher undead than the rest: at least twice the health of any other undead, and a harder hit', () => {
    if (tougher === undefined) {
      throw new Error('The castle has no monsters');
    }
    const others = undead.filter(({ id }) => id !== tougher.id);

    expect(others.length).toBeGreaterThan(0);
    for (const other of others) {
      expect(tougher.type.health, `the health of ${tougher.id} against ${other.id}`).toBeGreaterThanOrEqual(
        2 * other.type.health,
      );
      expect(damageOf(tougher.type), `the hit of ${tougher.id} against ${other.id}`).toBeGreaterThan(
        damageOf(other.type),
      );
    }
  });

  it('has a tougher undead than any creature of the earlier areas: more health and a harder hit than the veteran of the mountain and the bear of the cave', () => {
    const earlier = Object.entries(gameContent.monsterTypes)
      .filter(([id]) => !id.startsWith('castle-'))
      .map(([, type]) => type);

    expect(earlier.length).toBeGreaterThan(0);
    expect(tougher?.type.health ?? 0).toBeGreaterThan(Math.max(...earlier.map(({ health }) => health)));
    expect(tougher === undefined ? 0 : damageOf(tougher.type)).toBeGreaterThan(Math.max(...earlier.map(damageOf)));
  });

  it('puts the tougher undead on every way through: none keeps out of the reach of its notice', () => {
    const keepingOut = routeBetween(
      (tile) =>
        isOpen(tile) && toughUndead.every((one) => distanceBetween(tile, one.tile) > noticingOf(gameContent, one)),
      wayInTile,
      (tile) => keyOf(tile) === keyOf(END_OF_ROUTE),
    );

    expect(toughUndead.length).toBeGreaterThan(0);
    expect(keepingOut).toBeNull();
  });

  it('leaves room to step aside wherever a charger can notice the hero: no ground there is narrower than two tiles', () => {
    const chargers = castle.monsters.filter((monster) => typeOf(monster)?.behavior === 'charger');

    const cramped = chargers.flatMap((charger) =>
      castle.layout.flatMap((symbols, row) =>
        [...symbols].flatMap((_, col) => {
          const tile = { col, row };
          const near = distanceBetween(tile, charger.tile) <= noticingOf(gameContent, charger);
          return near && isOpen(tile) && !isInOpenBlock(isOpen, tile) ? [`${charger.id} at ${col},${row}`] : [];
        }),
      ),
    );

    expect(chargers.length).toBeGreaterThan(0);
    expect(cramped).toEqual([]);
  });

  it('draws each kind of undead in a colour of its own: set well apart from every other monster, from the ground of the castle and from the colour of what has none', () => {
    const ground = [...new Set(castle.layout.join(''))].flatMap((symbol) => {
      const kind = gameContent.terrain[symbol]?.kind;
      return kind === undefined ? [] : [{ name: kind, colour: terrainColour(kind) }];
    });
    const monsters = Object.keys(gameContent.monsterTypes).map((id) => ({ name: id, colour: monsterColour(id) }));
    const missing = { name: 'a missing colour', colour: monsterColour('no-such-monster') };

    const tooClose = undead.flatMap(({ id }) =>
      [...monsters, ...ground, missing]
        .filter(({ name, colour }) => name !== id && colourGap(monsterColour(id), colour) < LEAST_COLOUR_GAP)
        .map(({ name }) => `${id} and ${name}`),
    );

    expect(undead.length).toBeGreaterThan(0);
    expect(tooClose).toEqual([]);
  });

  it('cannot take the whole Health of a rested hero with one blow: the first blow of each undead, as the game works it out with the Defense that the hero begins with, leaves some', () => {
    const killing = undead.filter(({ id }) => firstBlowOf(id).health === 0).map(({ id }) => id);

    expect(undead.length).toBeGreaterThan(0);
    expect(killing).toEqual([]);
  });
});

describe('the armor of the castle', () => {
  /** The chest of armor that the hero can walk to with every door shut. */
  const armorChest = (): ChestDefinition =>
    chestThat('chest of armor that the hero can reach', (chest) => gearSlotOf(chest) === 'armor' && placeOnRoute(chest.tile) !== null);

  const gearOf = ({ contents }: ChestDefinition): string => (contents.kind === 'gear' ? contents.gear : '');

  it('keeps an armor upgrade in a chest near the route: a step aside of a few tiles, not a trip', () => {
    const detour = detourFromRoute(armorChest().tile);

    expect(detour).not.toBeNull();
    expect(detour ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(MOST_NEARBY);
  });

  it('is an upgrade: it adds more than any armor the hero begins with or finds on the coast, in the woods, on the mountain and in the cave', () => {
    const upgrade = gameContent.gear[gearOf(armorChest())];
    const others = [
      ...GEAR_SLOTS.flatMap((slot) => gameContent.hero.startingGear[slot] ?? []),
      ...[COAST, WOODS, MOUNTAIN, CAVE].flatMap((id) => gearInChestsOf(areaOf(id))),
    ].flatMap((id) => gameContent.gear[id] ?? []);

    const best = Math.max(0, ...others.filter((gear) => gear.slot === 'armor').map((gear) => gear.bonus));

    expect(upgrade, 'the Gear in the chest of armor').toBeDefined();
    expect(upgrade?.bonus ?? 0).toBeGreaterThan(best);
  });

  it('is found before the tougher undead is met: the chest lies on the way before the first place where that undead notices the hero', () => {
    expect(firstMetTougher, 'a place on the route where the tougher undead notices the hero').toBeGreaterThan(-1);
    expect(placeOnRoute(armorChest().tile) ?? Number.POSITIVE_INFINITY).toBeLessThan(firstMetTougher);
  });

  it('lets the hero walk to the chest, open it and wear the armor, which raises Defense by what it adds', () => {
    const game = quietGameAt(CASTLE, wayInTile);
    const chest = armorChest();
    const defense = (): number => {
      const { page } = playingView(game);
      if (page?.id !== 'inventory') {
        throw new Error('The inventory page is not open');
      }
      return page.defense;
    };

    const events = openChest(game, chest);
    game.send({ type: 'open-page', page: 'inventory' });
    const before = defense();
    game.send({ type: 'equip', gearId: gearOf(chest) });

    expect(events).toContainEqual({ type: 'chest-opened', chestId: chest.id });
    expect(events).toContainEqual(pickupFrom(chest));
    expect(defense() - before).toBe(gameContent.gear[gearOf(chest)]?.bonus);
  });
});

describe('what the hero finds in the castle', () => {
  const nearTheRoute = ({ tile }: { readonly tile: Tile }): boolean =>
    (detourFromRoute(tile) ?? Number.POSITIVE_INFINITY) <= MOST_NEARBY;
  const beyondTheTougher = ({ tile }: { readonly tile: Tile }): boolean => (placeOnRoute(tile) ?? -1) > firstMetTougher;
  const potions = pickups.filter(({ consumable }) => consumable === 'healing-potion');
  /** The chests at the ends of the side paths: a good walk from the route. */
  const sidePathChests = chests.filter(({ tile }) => (detourFromRoute(tile) ?? 0) >= LEAST_DETOUR);

  it('has Ammunition caches near the route: two at least, each a few steps aside', () => {
    const caches = chests.filter(holdsAmmunition).filter(nearTheRoute);

    expect(caches.length, 'Ammunition caches a few steps off the route').toBeGreaterThanOrEqual(2);
  });

  it('lets the hero walk to each cache near the route and open it', () => {
    const caches = chests.filter(holdsAmmunition).filter(nearTheRoute);

    expect(caches.length).toBeGreaterThan(0);
    for (const cache of caches) {
      const events = openChest(quietGameAt(CASTLE, wayInTile), cache);

      expect(events, `opening ${cache.id}`).toContainEqual({ type: 'chest-opened', chestId: cache.id });
      expect(events, `opening ${cache.id}`).toContainEqual(pickupFrom(cache));
    }
  });

  it('has Healing Potions on the ground near the route: two at least, which the hero takes by walking over them', () => {
    const near = potions.filter(nearTheRoute);

    expect(near.length, 'Healing Potions a few steps off the route').toBeGreaterThanOrEqual(2);
    for (const potion of near) {
      const walk = routeBetween(isOpen, wayInTile, (tile) => keyOf(tile) === keyOf(potion.tile));
      expect(walk, `a walk to the potion ${potion.id}`).not.toBeNull();

      const events = walkRoute(quietGameAt(CASTLE, wayInTile), walk ?? []);

      expect(events).toContainEqual({
        type: 'pickup',
        item: { kind: 'consumable', id: 'healing-potion', amount: potion.amount },
      });
    }
  });

  it('keeps supplies for the final fight beyond the tougher undead: a cache and a Healing Potion that the hero reaches after the first place where that undead notices the hero', () => {
    expect(firstMetTougher, 'a place on the route where the tougher undead notices the hero').toBeGreaterThan(-1);
    expect(chests.filter(holdsAmmunition).filter(nearTheRoute).filter(beyondTheTougher).length, 'caches beyond').toBeGreaterThan(0);
    expect(potions.filter(nearTheRoute).filter(beyondTheTougher).length, 'Healing Potions beyond').toBeGreaterThan(0);
  });

  it('has side paths: chests a good walk from the route, which the hero walks to and opens with every door shut', () => {
    expect(sidePathChests.length, 'chests a good walk from the route').toBeGreaterThan(0);
    for (const reward of sidePathChests) {
      const events = openChest(quietGameAt(CASTLE, wayInTile), reward);

      expect(events, `opening ${reward.id}`).toContainEqual({ type: 'chest-opened', chestId: reward.id });
      expect(events, `opening ${reward.id}`).toContainEqual(pickupFrom(reward));
    }
  });

  it('guards the end of each side path with an undead that the hero who keeps to the route does not meet', () => {
    const metOnRoute = new Set(metOn(gameContent, castle, route).map(({ id }) => id));

    expect(sidePathChests.length).toBeGreaterThan(0);
    for (const reward of sidePathChests) {
      const guards = castle.monsters.filter((monster) =>
        neighboursOf(reward.tile).some(
          (spot) => isOpen(spot) && distanceBetween(spot, monster.tile) <= noticingOf(gameContent, monster),
        ),
      );

      expect(guards.length, `undead that notice a hero beside ${reward.id}`).toBeGreaterThan(0);
      expect(guards.filter(({ id }) => metOnRoute.has(id)), `guards of ${reward.id} that the route meets`).toEqual([]);
    }
  });

  it('leaves nothing out of reach: a walk joins the route to every chest and every pickup', () => {
    const cutOff = [...chests, ...pickups].filter(({ tile }) => detourFromRoute(tile) === null);

    expect(cutOff.map(({ id }) => id)).toEqual([]);
  });

  it('keeps every interactable out of the bottom rows, where the notice is drawn over the hero', () => {
    const lowest = castle.layout.length - 1 - BOTTOM_ROWS;

    expect((castle.interactables ?? []).filter(({ tile }) => tile.row > lowest).map(({ id }) => id)).toEqual([]);
  });
});

describe('the milestone of the castle', () => {
  it('is one: the castle has a single milestone', () => {
    expect(castle.milestones).toHaveLength(1);
  });

  it('is one that no way on goes round', () => {
    const [milestone] = castle.milestones ?? [];

    const goingRound = routeBetween(
      (tile) => isOpen(tile) && !(milestone !== undefined && isInZone(milestone.zone, tile)),
      wayInTile,
      (tile) => keyOf(tile) === keyOf(END_OF_ROUTE),
    );

    expect(milestone, 'a milestone in the castle').toBeDefined();
    expect(goingRound).toBeNull();
  });

  it('is given to a hero who walks the route', () => {
    const [milestone] = castle.milestones ?? [];

    const events = walkRoute(quietGameAt(CASTLE, wayInTile), route ?? []);

    expect(events).toContainEqual({ type: 'milestone-reached', milestoneId: milestone?.id });
  });
});

describe('the Experience on the way through the castle', () => {
  const coast = areaOf(COAST);
  const woods = areaOf(WOODS);
  const mountain = areaOf(MOUNTAIN);
  const cave = areaOf(CAVE);

  it('gives a hero who fights what it meets from the start to the end of the route of the castle, and passes the milestones, the Experience of Level 6', () => {
    const earned =
      experienceOfAll(gameContent, metOn(gameContent, coast, routeOf(COAST))) +
      milestonesOf(coast) +
      experienceOfAll(gameContent, metOn(gameContent, woods, routeOf(WOODS))) +
      milestonesOf(woods) +
      experienceOfAll(gameContent, metOn(gameContent, mountain, routeOf(MOUNTAIN))) +
      milestonesOf(mountain) +
      experienceOfAll(gameContent, metOn(gameContent, cave, routeOf(CAVE))) +
      milestonesOf(cave) +
      experienceOfAll(gameContent, metOn(gameContent, castle, route)) +
      milestonesOf(castle);

    expect(earned).toBeGreaterThanOrEqual(experienceForLevel(gameContent, 6));
  });
});

describe('the text of the castle', () => {
  it('is a short line, not a page', () => {
    expect(castle.text).toBeTypeOf('string');
    expect(castle.text?.length).toBeLessThanOrEqual(60);
  });
});
