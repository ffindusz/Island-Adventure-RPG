import { describe, expect, it } from 'vitest';
import { VIEW_TILES_HIGH, VIEW_TILES_WIDE } from '../src/adapter/config';
import { gameContent } from '../src/content';
import { GEAR_SLOTS, createGame } from '../src/core';
import type {
  AreaDefinition,
  ChestDefinition,
  Game,
  GameEvent,
  InteractableDefinition,
  MonsterTypeDefinition,
  Tile,
} from '../src/core';
import { face, fixedRandom, newGame, playingView } from './fixtures';
import { routeOf } from './main-route';
import {
  directionBetween,
  distanceBetween,
  experienceForLevel,
  experienceOfAll,
  isInZone,
  keyOf,
  metOn,
  milestonesOf,
  neighboursOf,
  noticingOf,
  openTilesOf,
  routeBetween,
  walkRoute,
  withoutOrdinaryMonsters,
} from './routes';

// The mountain, the third area on the route of the adventure, between the woods and the cave: what it has to be to be
// a climb of its own, with narrow passes and ledges, raiders to fight, an armor upgrade to find and a side path. Like
// the other tests of the shipped content, these read the map and the lists of the content and walk the hero over them
// with the core's own movement, so that moving a tile or a chest never breaks them unless the mountain stops being what
// it is for. The trail is the path of sand that the text of the mountain tells the hero to follow: it is the intended
// route, and what lies beside it is found by the hero who looks.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';
const CAVE = 'cave';

/** The notice is drawn over the bottom of the view, so a hero who has to stand in these rows of an area is hidden. */
const BOTTOM_ROWS = 3;

/** A pass is narrow when the way is this many tiles wide or fewer, and it is a pass for this many tiles in a row. */
const NARROW = 2;
const PASS_LENGTH = 3;

/** A chest is near the trail when the walk to it from the trail is this many tiles at most: a step aside, not a trip. */
const MOST_NEARBY = 4;

/** A side path is a walk, not a step aside: this many tiles from the trail to the spot beside what lies at its end. */
const LEAST_DETOUR = 6;

function definitionOf(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The shipped content has no Adventure Area "${id}"`);
  }
  return area;
}

/**
 * A new game of the shipped content in which the hero begins on a tile of an area, with every monster taken out but the
 * Guardian, which the content must keep.
 */
function quietGameAt(areaId: string, tile: Tile): Game {
  const areas = withoutOrdinaryMonsters(gameContent);
  return newGame({ ...gameContent, areas, start: { area: areaId, tile } });
}

const mountain = definitionOf(MOUNTAIN);
const wayIn = (mountain.entrances ?? [])[0];
const wayInTile: Tile = wayIn?.tile ?? { col: 0, row: 0 };
const wayForward = (mountain.exits ?? []).find(({ to }) => to.area === CAVE);
const isOpen = openTilesOf(gameContent, mountain);
const isWayForward = (tile: Tile): boolean => wayForward !== undefined && isInZone(wayForward.zone, tile);
const kindAt = ({ col, row }: Tile): string | undefined => gameContent.terrain[mountain.layout[row]?.[col] ?? '']?.kind;
/** The trail: the path of sand from the way in to the exit forward, over open ground, every door shut and no key held. */
const trail = routeOf(MOUNTAIN);
const onTrail = new Set(trail.map(keyOf));

const interactables = mountain.interactables ?? [];
const chests = interactables.flatMap((item) => (item.kind === 'chest' ? [item] : []));
const pickups = interactables.flatMap((item) => (item.kind === 'pickup' ? [item] : []));

/** The types of monster in the mountain, with their ids, and the tougher one among them: the one that takes most to defeat. */
const raiders = [...new Set(mountain.monsters.map(({ type }) => type))].flatMap((id) => {
  const type = gameContent.monsterTypes[id];
  return type === undefined ? [] : [{ id, type }];
});
const tougher = [...raiders].sort((one, other) => other.type.health - one.type.health)[0];
const toughRaiders = mountain.monsters.filter(({ type }) => type === tougher?.id);

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
    throw new Error(`The mountain has no ${what}`);
  }
  return found;
}

/** The shortest walk over open ground from a spot to the trail, or null when there is none. */
function walkToTrail(spot: Tile): Tile[] | null {
  return routeBetween(isOpen, spot, (tile) => onTrail.has(keyOf(tile)));
}

/** How far along the trail a spot lies: the place of the trail tile that is the shortest walk from it, or null when it cannot be walked to. */
function placeOnTrail(spot: Tile): number | null {
  const reached = walkToTrail(spot)?.at(-1);
  return reached === undefined ? null : trail.findIndex((tile) => keyOf(tile) === keyOf(reached));
}

/** How many tiles of walking lie between the trail and a spot, or null when the spot cannot be walked to. */
function detourFromTrail(spot: Tile): number | null {
  const walkBack = walkToTrail(spot);
  return walkBack === null ? null : walkBack.length - 2;
}

/** The hero walks from where it stands to a spot beside a chest over open ground, faces the chest and uses Interact. */
function openChest(game: Game, chest: ChestDefinition): readonly GameEvent[] {
  const { x, y } = playingView(game).hero.position;
  const from = { col: Math.floor(x), row: Math.floor(y) };
  const route = routeBetween(isOpen, from, (tile) => neighboursOf(tile).some((next) => keyOf(next) === keyOf(chest.tile)));
  if (route === null) {
    throw new Error(`The hero cannot walk to a spot beside the chest "${chest.id}"`);
  }
  walkRoute(game, route);
  face(game, directionBetween(route.at(-1) ?? from, chest.tile));
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

/** How wide the way is at a tile: the shorter of the runs of open tiles through it, across and up and down. */
function widthAt(tile: Tile): number {
  const runAlong = (stepCol: number, stepRow: number): number => {
    let length = 1;
    for (const sign of [1, -1]) {
      let next = { col: tile.col + sign * stepCol, row: tile.row + sign * stepRow };
      while (isOpen(next)) {
        length += 1;
        next = { col: next.col + sign * stepCol, row: next.row + sign * stepRow };
      }
    }
    return length;
  };
  return Math.min(runAlong(1, 0), runAlong(0, 1));
}

/** The type of a monster of the mountain, which the loader sees to exist; none here only for content it refuses. */
function typeOf(monster: { readonly type: string }): MonsterTypeDefinition | undefined {
  return gameContent.monsterTypes[monster.type];
}

/** The damage of one hit of a monster type, before the Defense of the hero: of the blow, or of the shot. */
function hitOf(type: MonsterTypeDefinition): number {
  if ('damage' in type) {
    return type.damage;
  }
  return 'projectile' in type ? type.projectile.damage : 0;
}

/** Whether a tile lies in a block of open ground two tiles wide and two high: a place to step aside in either way. */
function inOpenBlock({ col, row }: Tile): boolean {
  return [-1, 0].some((fromCol) =>
    [-1, 0].some((fromRow) =>
      [0, 1].every((across) => [0, 1].every((down) => isOpen({ col: col + fromCol + across, row: row + fromRow + down }))),
    ),
  );
}

describe('the way through the mountain', () => {
  it('comes third on the route of the adventure: after the coast and the woods, before the cave', () => {
    expect(gameContent.areas.slice(0, 4).map(({ id }) => id)).toEqual([COAST, WOODS, MOUNTAIN, CAVE]);
  });

  it('loads with the rest of the shipped content: the content check passes', () => {
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });

  it('is larger than the screen in both directions, so that the view must follow the hero', () => {
    const { area } = playingView(quietGameAt(MOUNTAIN, wayInTile));

    expect(area.width).toBeGreaterThan(VIEW_TILES_WIDE);
    expect(area.height).toBeGreaterThan(VIEW_TILES_HIGH);
  });

  it('leads along a path of sand from the way in to the exit forward, over open ground, with every door shut and no key held', () => {
    expect(wayIn?.id).toBe('from-woods');
    expect(wayForward, 'the mountain has an exit to the cave').toBeDefined();
    expect(wayForward?.to.entrance).toBe('from-mountain');
    expect(trail[0]).toEqual(wayInTile);
    expect(isWayForward(trail.at(-1) ?? wayInTile)).toBe(true);
    expect(trail.slice(1).filter((tile) => !isOpen(tile) || kindAt(tile) !== 'sand')).toEqual([]);
  });

  it('lets the hero walk it into the cave, where it touches the Checkpoint of the cave', () => {
    const game = quietGameAt(MOUNTAIN, wayInTile);

    const events = walkRoute(game, trail);

    expect(events).toContainEqual({ type: 'area-changed', areaId: CAVE });
    expect(playingView(game).area.id).toBe(CAVE);
    expect(playingView(game).checkpoints).toEqual([expect.objectContaining({ id: 'cave-checkpoint', active: true })]);
  });

  it('climbs through a narrow pass: three tiles in a row of the trail where the way is two tiles wide at most', () => {
    const narrow = trail.map((tile) => widthAt(tile) <= NARROW);

    const passes = narrow.filter((_, place) => narrow.slice(place, place + PASS_LENGTH).filter(Boolean).length === PASS_LENGTH);

    expect(passes.length).toBeGreaterThan(0);
  });

  it('keeps the exit forward, and the entrance beside it for the hero who comes back from the cave, out of the bottom rows', () => {
    const wayBack = (mountain.entrances ?? []).find(({ id }) => id === 'from-cave');
    const lowest = mountain.layout.length - 1 - BOTTOM_ROWS;

    expect(wayBack, 'the mountain has an entrance from the cave').toBeDefined();
    expect(wayBack?.tile.row ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(lowest);
    expect((wayForward?.zone.row ?? Number.POSITIVE_INFINITY) + (wayForward?.zone.height ?? 0) - 1).toBeLessThanOrEqual(lowest);
  });

  it('has one milestone', () => {
    expect(mountain.milestones).toHaveLength(1);
  });

  it('has a milestone that no way on goes round', () => {
    const [milestone] = mountain.milestones ?? [];

    const goingRound = routeBetween(
      (tile) => isOpen(tile) && !(milestone !== undefined && isInZone(milestone.zone, tile)),
      wayInTile,
      isWayForward,
    );

    expect(milestone, 'a milestone in the mountain').toBeDefined();
    expect(goingRound).toBeNull();
  });

  it('gives the milestone to a hero who walks the trail', () => {
    const [milestone] = mountain.milestones ?? [];

    const events = walkRoute(quietGameAt(MOUNTAIN, wayInTile), trail);

    expect(events).toContainEqual({ type: 'milestone-reached', milestoneId: milestone?.id });
  });

  it('is a mountain: rock, solid, makes up half of it at least', () => {
    const rockSymbols = new Set(
      Object.entries(gameContent.terrain)
        .filter(([, terrain]) => terrain.kind === 'rock' && terrain.solid)
        .map(([symbol]) => symbol),
    );

    const tiles = mountain.layout.join('');
    const rock = [...tiles].filter((symbol) => rockSymbols.has(symbol));

    expect(rock.length / tiles.length).toBeGreaterThanOrEqual(1 / 2);
  });
});

describe('the raiders of the mountain', () => {
  it('holds the mountain with raiders and nothing else: every monster in it is of a raider type', () => {
    expect(mountain.monsters.length).toBeGreaterThan(0);
    expect(mountain.monsters.filter(({ type }) => !type.startsWith('raider'))).toEqual([]);
  });

  it('meets a hero who walks the trail with raiders that chase, that charge and that shoot', () => {
    const behaviors = metOn(gameContent, mountain, trail).map((monster) => typeOf(monster)?.behavior);

    expect(behaviors).toContain('chaser');
    expect(behaviors).toContain('charger');
    expect(behaviors).toContain('ranged');
  });

  it('has a tougher raider than the rest: at least twice the health of any other raider, and a harder hit', () => {
    if (tougher === undefined) {
      throw new Error('The mountain has no monsters');
    }
    const others = raiders.filter(({ id }) => id !== tougher.id);

    expect(others.length).toBeGreaterThan(0);
    for (const other of others) {
      expect(tougher.type.health, `the health of ${tougher.id} against ${other.id}`).toBeGreaterThanOrEqual(
        2 * other.type.health,
      );
      expect(hitOf(tougher.type), `the hit of ${tougher.id} against ${other.id}`).toBeGreaterThan(hitOf(other.type));
    }
  });

  it('puts the tougher raider on every way through: none keeps out of the reach of its notice', () => {
    const keepingOut = routeBetween(
      (tile) =>
        isOpen(tile) && toughRaiders.every((raider) => distanceBetween(tile, raider.tile) > noticingOf(gameContent, raider)),
      wayInTile,
      isWayForward,
    );

    expect(toughRaiders.length).toBeGreaterThan(0);
    expect(keepingOut).toBeNull();
  });

  it('leaves room to step aside wherever a charger can notice the hero: no ground there is narrower than two tiles', () => {
    const chargers = mountain.monsters.filter((monster) => typeOf(monster)?.behavior === 'charger');

    const cramped = chargers.flatMap((charger) =>
      mountain.layout.flatMap((symbols, row) =>
        [...symbols].flatMap((_, col) => {
          const tile = { col, row };
          const near = distanceBetween(tile, charger.tile) <= noticingOf(gameContent, charger);
          return near && isOpen(tile) && !inOpenBlock(tile) ? [`${charger.id} at ${col},${row}`] : [];
        }),
      ),
    );

    expect(chargers.length).toBeGreaterThan(0);
    expect(cramped).toEqual([]);
  });
});

describe('the armor of the mountain', () => {
  /** The chest of armor that the hero can walk to with every door shut. */
  const armorChest = (): ChestDefinition =>
    chestThat('chest of armor that the hero can reach', (chest) => gearSlotOf(chest) === 'armor' && placeOnTrail(chest.tile) !== null);

  const gearOf = ({ contents }: ChestDefinition): string => (contents.kind === 'gear' ? contents.gear : '');

  it('keeps an armor upgrade in a chest near the trail: a step aside of a few tiles, not a trip', () => {
    const detour = detourFromTrail(armorChest().tile);

    expect(detour).not.toBeNull();
    expect(detour ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(MOST_NEARBY);
  });

  it('is an upgrade: it adds more than any armor the hero begins with or finds on the coast and in the woods', () => {
    const upgrade = gameContent.gear[gearOf(armorChest())];
    const others = [
      ...GEAR_SLOTS.flatMap((slot) => gameContent.hero.startingGear[slot] ?? []),
      ...gearInChestsOf(definitionOf(COAST)),
      ...gearInChestsOf(definitionOf(WOODS)),
    ].flatMap((id) => gameContent.gear[id] ?? []);

    const best = Math.max(0, ...others.filter((gear) => gear.slot === 'armor').map((gear) => gear.bonus));

    expect(upgrade, 'the Gear in the chest of armor').toBeDefined();
    expect(upgrade?.bonus ?? 0).toBeGreaterThan(best);
  });

  it('is found before the tougher raider is met: the chest lies on the way before the first place where that raider notices the hero', () => {
    const firstMet = trail.findIndex((tile) =>
      toughRaiders.some((raider) => distanceBetween(tile, raider.tile) <= noticingOf(gameContent, raider)),
    );

    expect(firstMet, 'a place on the trail where the tougher raider notices the hero').toBeGreaterThan(-1);
    expect(placeOnTrail(armorChest().tile) ?? Number.POSITIVE_INFINITY).toBeLessThan(firstMet);
  });

  it('lets the hero walk to the chest, open it and wear the armor, which raises Defense by what it adds', () => {
    const game = quietGameAt(MOUNTAIN, wayInTile);
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

describe('what the hero finds on the mountain', () => {
  const nearTheTrail = ({ tile }: { readonly tile: Tile }): boolean =>
    (detourFromTrail(tile) ?? Number.POSITIVE_INFINITY) <= MOST_NEARBY;
  /** A chest at the end of a side path: a good walk from the trail. */
  const sidePathChest = (): ChestDefinition =>
    chestThat('chest a good walk from the trail', ({ tile }) => (detourFromTrail(tile) ?? 0) >= LEAST_DETOUR);

  it('has Ammunition caches near the trail: two at least, each a few steps aside', () => {
    const caches = interactables.filter(holdsAmmunition).filter(nearTheTrail);

    expect(caches.length, 'Ammunition caches a few steps off the trail').toBeGreaterThanOrEqual(2);
  });

  it('lets the hero walk to a cache near the trail and open it', () => {
    const cache = chestThat('Ammunition cache near the trail', (chest) => holdsAmmunition(chest) && nearTheTrail(chest));

    const events = openChest(quietGameAt(MOUNTAIN, wayInTile), cache);

    expect(events).toContainEqual({ type: 'chest-opened', chestId: cache.id });
    expect(events).toContainEqual(pickupFrom(cache));
  });

  it('has Healing Potions on the ground near the trail: two at least, which the hero takes by walking over them', () => {
    const potions = pickups.filter(({ consumable }) => consumable === 'healing-potion').filter(nearTheTrail);

    expect(potions.length, 'Healing Potions a few steps off the trail').toBeGreaterThanOrEqual(2);
    for (const potion of potions) {
      const route = routeBetween(isOpen, wayInTile, (tile) => keyOf(tile) === keyOf(potion.tile));
      expect(route, `a walk to the potion ${potion.id}`).not.toBeNull();

      const events = walkRoute(quietGameAt(MOUNTAIN, wayInTile), route ?? []);

      expect(events).toContainEqual({
        type: 'pickup',
        item: { kind: 'consumable', id: 'healing-potion', amount: potion.amount },
      });
    }
  });

  it('has a side path: a chest a good walk from the trail, which the hero walks to and opens with every door shut', () => {
    const reward = sidePathChest();

    const events = openChest(quietGameAt(MOUNTAIN, wayInTile), reward);

    expect(events).toContainEqual({ type: 'chest-opened', chestId: reward.id });
    expect(events).toContainEqual(pickupFrom(reward));
  });

  it('guards the end of the side path with a raider that the hero who keeps to the trail does not meet', () => {
    const reward = sidePathChest();
    const metOnTrail = new Set(metOn(gameContent, mountain, trail).map(({ id }) => id));

    const guards = mountain.monsters.filter((monster) =>
      neighboursOf(reward.tile).some(
        (spot) => isOpen(spot) && distanceBetween(spot, monster.tile) <= noticingOf(gameContent, monster),
      ),
    );

    expect(guards.length, 'raiders that notice a hero beside the reward').toBeGreaterThan(0);
    expect(guards.filter(({ id }) => metOnTrail.has(id))).toEqual([]);
  });

  it('keeps every chest and pickup out of the bottom rows, where the notice is drawn over the hero', () => {
    const lowest = mountain.layout.length - 1 - BOTTOM_ROWS;

    expect(interactables.filter(({ tile }) => tile.row > lowest).map(({ id }) => id)).toEqual([]);
  });
});

describe('the Experience on the way through the mountain', () => {
  const coast = definitionOf(COAST);
  const woods = definitionOf(WOODS);

  it('gives a hero who fights what it meets from the start to the exit of the mountain, and passes the milestones, the Experience of Level 4', () => {
    const earned =
      experienceOfAll(gameContent, metOn(gameContent, coast, routeOf(COAST))) +
      milestonesOf(coast) +
      experienceOfAll(gameContent, metOn(gameContent, woods, routeOf(WOODS))) +
      milestonesOf(woods) +
      experienceOfAll(gameContent, metOn(gameContent, mountain, trail)) +
      milestonesOf(mountain);

    expect(earned).toBeGreaterThanOrEqual(experienceForLevel(gameContent, 4));
  });

  it('does not give a hero who clears the coast, the woods and the mountain the Experience of Level 5: nobody has to grind', () => {
    const everything =
      experienceOfAll(gameContent, coast.monsters) +
      milestonesOf(coast) +
      experienceOfAll(gameContent, woods.monsters) +
      milestonesOf(woods) +
      experienceOfAll(gameContent, mountain.monsters) +
      milestonesOf(mountain);

    expect(everything).toBeLessThan(experienceForLevel(gameContent, 5));
  });
});

describe('the text of the mountain', () => {
  it('is a short line, not a page', () => {
    expect(mountain.text).toBeTypeOf('string');
    expect(mountain.text?.length).toBeLessThanOrEqual(60);
  });
});
