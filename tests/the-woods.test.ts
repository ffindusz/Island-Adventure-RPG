import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { GEAR_SLOTS, WEAPON_SLOTS, createGame } from '../src/core';
import type {
  AreaDefinition,
  ChaserMonsterDefinition,
  ChestDefinition,
  Game,
  GameEvent,
  InteractableDefinition,
  Tile,
} from '../src/core';
import { face, fixedRandom, newGame, playingView } from './fixtures';
import { directionBetween, isInZone, keyOf, neighboursOf, openTilesOf, routeBetween, walkRoute } from './routes';

// The woods, the second area on the route of the adventure, between the coast and the mountain: what they have to be
// to give the hero its bow, its first beasts and a first choice of side path. Like the other tests of the shipped
// content, these read the map and the lists of the content and walk the hero over them with the core's own movement,
// so that moving a tile or a chest never breaks them unless the woods stop being what they are for. The trail is the
// path of sand that the text of the woods tells the hero to follow: it is the intended route, and what lies beside it
// is found by the hero who looks.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';

/** A side path is a walk, not a step aside: this many tiles from the trail to the spot beside what lies at its end. */
const LEAST_DETOUR = 6;

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
const wayInTile: Tile = wayIn?.tile ?? { col: 0, row: 0 };
const wayForward = (woods.exits ?? []).find(({ to }) => to.area === MOUNTAIN);
const isOpen = openTilesOf(gameContent, woods);
const isWayForward = (tile: Tile): boolean => wayForward !== undefined && isInZone(wayForward.zone, tile);
const kindAt = ({ col, row }: Tile): string | undefined => gameContent.terrain[woods.layout[row]?.[col] ?? '']?.kind;
/** The trail: the path of sand from the way in to the exit forward, over open ground, every door shut and no key held. */
const trail = routeBetween((tile) => isOpen(tile) && kindAt(tile) === 'sand', wayInTile, isWayForward);
const onTrail = new Set((trail ?? []).map(keyOf));

const interactables = woods.interactables ?? [];
const chests = interactables.flatMap((item) => (item.kind === 'chest' ? [item] : []));
const pickups = interactables.flatMap((item) => (item.kind === 'pickup' ? [item] : []));
const doors = interactables.flatMap((item) => (item.kind === 'door' ? [item] : []));
const keys = interactables.flatMap((item) => (item.kind === 'key' ? [item] : []));

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
    throw new Error(`The woods have no ${what}`);
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
  return reached === undefined ? null : (trail ?? []).findIndex((tile) => keyOf(tile) === keyOf(reached));
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

describe('the way through the woods', () => {
  it('comes second on the route of the adventure: after the coast, before the mountain', () => {
    expect(gameContent.areas.slice(0, 3).map(({ id }) => id)).toEqual([COAST, WOODS, MOUNTAIN]);
  });

  it('loads with the rest of the shipped content: the content check passes', () => {
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });

  it('leads along a path of sand from the way in to the exit forward, over open ground, with every door shut and no key held', () => {
    expect(wayIn?.id).toBe('from-coast');
    expect(wayForward, 'the woods have an exit to the mountain').toBeDefined();
    expect(trail).not.toBeNull();
  });

  it('lets the hero walk it into the mountain, where it comes in by the entrance of the woods and touches its Checkpoint', () => {
    const game = quietGameAt(WOODS, wayInTile);

    const events = walkRoute(game, trail ?? []);

    const entrance = (definitionOf(MOUNTAIN).entrances ?? []).find(({ id }) => id === wayForward?.to.entrance);
    expect(events).toContainEqual({ type: 'area-changed', areaId: MOUNTAIN });
    expect(playingView(game).area.id).toBe(MOUNTAIN);
    expect(playingView(game).hero.position).toEqual({ x: (entrance?.tile.col ?? 0) + 0.5, y: (entrance?.tile.row ?? 0) + 0.5 });
    expect(playingView(game).checkpoints.filter(({ active }) => active)).toHaveLength(1);
  });

  it('has one milestone, which no way on goes round', () => {
    expect(woods.milestones).toHaveLength(1);
    const [milestone] = woods.milestones ?? [];

    const goingRound = routeBetween(
      (tile) => isOpen(tile) && !(milestone !== undefined && isInZone(milestone.zone, tile)),
      wayInTile,
      isWayForward,
    );

    expect(goingRound).toBeNull();
  });

  it('gives the milestone to a hero who walks the trail', () => {
    const [milestone] = woods.milestones ?? [];

    const events = walkRoute(quietGameAt(WOODS, wayInTile), trail ?? []);

    expect(events).toContainEqual({ type: 'milestone-reached', milestoneId: milestone?.id });
  });

  it('is a wood: trees, solid like rock, make up a third of it at least', () => {
    const treeSymbols = new Set(
      Object.entries(gameContent.terrain)
        .filter(([, terrain]) => terrain.kind === 'tree' && terrain.solid)
        .map(([symbol]) => symbol),
    );

    const tiles = woods.layout.join('');
    const trees = [...tiles].filter((symbol) => treeSymbols.has(symbol));

    expect(trees.length / tiles.length).toBeGreaterThanOrEqual(1 / 3);
  });
});

describe('what the hero finds in the woods', () => {
  /** The chest of the first bow, the one the hero can walk to with every door shut. */
  const bowChest = (): ChestDefinition =>
    chestThat('chest of a bow that the hero can reach', (chest) => gearSlotOf(chest) === 'ranged-weapon' && placeOnTrail(chest.tile) !== null);

  it('has the bow in a chest early on the trail: in its first third', () => {
    const place = placeOnTrail(bowChest().tile);

    expect(place).not.toBeNull();
    expect(place ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual((trail?.length ?? 0) / 3);
  });

  it('has Ammunition caches soon after the bow: two at least, the first after the bow chest on the trail and before its half', () => {
    const places = interactables
      .filter(holdsAmmunition)
      .flatMap(({ tile }) => placeOnTrail(tile) ?? []);

    expect(places.length, 'Ammunition caches the hero can walk to').toBeGreaterThanOrEqual(2);
    const first = Math.min(...places);
    expect(first).toBeGreaterThan(placeOnTrail(bowChest().tile) ?? Number.POSITIVE_INFINITY);
    expect(first).toBeLessThanOrEqual((trail?.length ?? 0) / 2);
  });

  it('lets the hero walk to the bow chest and open it, and then do the same at an Ammunition cache', () => {
    const game = quietGameAt(WOODS, wayInTile);
    const bow = bowChest();
    const cache = chestThat('Ammunition cache that the hero can reach', (chest) => holdsAmmunition(chest) && placeOnTrail(chest.tile) !== null);

    const bowEvents = openChest(game, bow);
    const cacheEvents = openChest(game, cache);

    expect(bowEvents).toContainEqual({ type: 'chest-opened', chestId: bow.id });
    expect(bowEvents).toContainEqual(pickupFrom(bow));
    expect(cacheEvents).toContainEqual({ type: 'chest-opened', chestId: cache.id });
    expect(cacheEvents).toContainEqual(pickupFrom(cache));
  });

  it('has a Healing Potion on the ground, which the hero takes by walking over it', () => {
    const potion = pickups.find(({ consumable }) => consumable === 'healing-potion');
    expect(potion, 'the woods have a Healing Potion pickup').toBeDefined();
    const route = routeBetween(isOpen, wayInTile, (tile) => keyOf(tile) === keyOf(potion?.tile ?? wayInTile));
    expect(route, 'the hero can walk to it').not.toBeNull();

    const events = walkRoute(quietGameAt(WOODS, wayInTile), route ?? []);

    expect(events).toContainEqual({
      type: 'pickup',
      item: { kind: 'consumable', id: 'healing-potion', amount: potion?.amount },
    });
  });

  it('has Healing Potions in a chest too, which the hero opens with every door shut', () => {
    const chest = chestThat(
      'chest of Healing Potions that the hero can reach',
      ({ contents, tile }) =>
        contents.kind === 'consumable' && contents.consumable === 'healing-potion' && placeOnTrail(tile) !== null,
    );

    const events = openChest(quietGameAt(WOODS, wayInTile), chest);

    expect(events).toContainEqual({ type: 'chest-opened', chestId: chest.id });
    expect(events).toContainEqual(pickupFrom(chest));
  });

  it('keeps an armor upgrade, the Chain Mail that came here from the coast, in a chest a good walk off the trail', () => {
    const armor = chestThat('chest of armor', (chest) => gearSlotOf(chest) === 'armor');

    expect(detourFromTrail(armor.tile) ?? 0).toBeGreaterThanOrEqual(LEAST_DETOUR);
  });
});

describe('the cabin in the woods', () => {
  const doorsOpen = openTilesOf(gameContent, woods, true);
  const standsBeside = (isWalkable: (tile: Tile) => boolean, chest: ChestDefinition): boolean =>
    routeBetween(isWalkable, wayInTile, (spot) => neighboursOf(spot).some((next) => keyOf(next) === keyOf(chest.tile))) !== null;
  const weaponChests = chests.filter((chest) => (WEAPON_SLOTS as readonly string[]).includes(gearSlotOf(chest) ?? ''));
  const behindDoors = weaponChests.filter((chest) => !standsBeside(isOpen, chest));

  it('keeps a weapon in a chest that the hero cannot stand beside with every door shut, but can once a door is open', () => {
    expect(behindDoors, 'a chest of a weapon behind a door').not.toEqual([]);
    expect(behindDoors.every((chest) => standsBeside(doorsOpen, chest))).toBe(true);
  });

  it('is an upgrade: that weapon adds more than any Gear of its slot that the hero begins with or finds before it, on the coast and in the rest of the woods', () => {
    expect(behindDoors, 'a chest of a weapon behind a door').not.toEqual([]);
    for (const reward of behindDoors) {
      const upgrade = reward.contents.kind === 'gear' ? gameContent.gear[reward.contents.gear] : undefined;
      const others = [
        ...GEAR_SLOTS.flatMap((slot) => gameContent.hero.startingGear[slot] ?? []),
        ...gearInChestsOf(definitionOf(COAST)),
        ...chests.filter((chest) => chest !== reward).flatMap((chest) => (chest.contents.kind === 'gear' ? [chest.contents.gear] : [])),
      ].flatMap((id) => gameContent.gear[id] ?? []);

      const best = Math.max(0, ...others.filter((gear) => gear.slot === upgrade?.slot).map((gear) => gear.bonus));

      expect(upgrade, `the Gear in the chest ${reward.id}`).toBeDefined();
      expect(upgrade?.bonus ?? 0).toBeGreaterThan(best);
    }
  });

  it('keeps its door and its key a good walk from the trail, and its key in the north woods, as the sign by the door says', () => {
    expect(doors, 'a locked door in the woods').not.toEqual([]);
    for (const door of doors) {
      const key = keys.find(({ id }) => id === door.key);
      expect(key, `the key of the door ${door.id}`).toBeDefined();
      expect(detourFromTrail(door.tile) ?? 0, `the way to the door ${door.id}`).toBeGreaterThanOrEqual(LEAST_DETOUR);
      expect(detourFromTrail(key?.tile ?? door.tile) ?? 0, `the way to the key ${key?.id}`).toBeGreaterThanOrEqual(LEAST_DETOUR);
      expect(key?.tile.row ?? Number.POSITIVE_INFINITY).toBeLessThan(woods.layout.length / 2);
    }
  });
});

describe('the creatures of the woods', () => {
  const crab = chaserNamed('crab');

  it('are the forest beasts, the wolf that chases and the boar that charges, and slimes', () => {
    expect(woods.monsters.map(({ type }) => type)).toEqual(expect.arrayContaining(['wolf', 'boar', 'slime']));
    expect(gameContent.monsterTypes['boar']?.behavior).toBe('charger');
  });

  it('have the wolf, a forest beast that chases the hero quicker than a crab does, yet slower than the hero walks, and is frailer', () => {
    const wolf = chaserNamed('wolf');

    expect(wolf.speedTilesPerSecond).toBeGreaterThan(crab.speedTilesPerSecond);
    expect(wolf.speedTilesPerSecond).toBeLessThan(gameContent.hero.speedTilesPerSecond);
    expect(wolf.health).toBeLessThan(crab.health);
  });

  it('have the slime, which chases the hero slower than a crab does, takes more hits and hits more lightly', () => {
    const slime = chaserNamed('slime');

    expect(slime.speedTilesPerSecond).toBeLessThan(crab.speedTilesPerSecond);
    expect(slime.health).toBeGreaterThan(crab.health);
    expect(slime.damage).toBeLessThan(crab.damage);
  });

  it('have trees, a kind of terrain the hero cannot walk through', () => {
    const trees = Object.values(gameContent.terrain).filter(({ kind }) => kind === 'tree');

    expect(trees).not.toEqual([]);
    expect(trees.every(({ solid }) => solid)).toBe(true);
  });
});

describe('the Experience on the way through the woods', () => {
  const [, levelThree = 0, levelFour = 0] = gameContent.progression.levelThresholds;
  const coast = definitionOf(COAST);
  /** The way from where the adventure begins to the exit of the coast, over open ground. */
  const coastRoute = routeBetween(openTilesOf(gameContent, coast), gameContent.start.tile, (tile) =>
    (coast.exits ?? []).some(({ zone }) => isInZone(zone, tile)),
  );
  const experienceOf = (monster: { readonly type: string }): number =>
    gameContent.monsterTypes[monster.type]?.experience ?? 0;
  const noticingOf = (monster: { readonly type: string }): number => {
    const type = gameContent.monsterTypes[monster.type];
    return type !== undefined && 'noticingDistance' in type ? type.noticingDistance : 0;
  };
  const distanceBetween = (one: Tile, other: Tile): number =>
    Math.max(Math.abs(one.col - other.col), Math.abs(one.row - other.row));
  /** A monster notices a hero in the square round its body that its noticing distance makes, so a hero on a route meets it when a tile of the route lies in that square. */
  const metOn = (area: AreaDefinition, route: readonly Tile[] | null) =>
    area.monsters.filter((monster) => (route ?? []).some((tile) => distanceBetween(tile, monster.tile) <= noticingOf(monster)));
  const experienceOfAll = (monsters: readonly { readonly type: string }[]): number =>
    monsters.reduce((total, monster) => total + experienceOf(monster), 0);
  const milestonesOf = (area: AreaDefinition): number =>
    (area.milestones ?? []).reduce((total, { reward }) => total + reward.experience, 0);

  it('gives a hero who fights what it meets from the start to the exit of the woods, and passes the milestones, the Experience of Level 3', () => {
    const earned =
      experienceOfAll(metOn(coast, coastRoute)) +
      milestonesOf(coast) +
      experienceOfAll(metOn(woods, trail)) +
      milestonesOf(woods);

    expect(earned).toBeGreaterThanOrEqual(levelThree);
  });

  it('does not give a hero who clears the coast and the woods the Experience of Level 4: nobody has to grind', () => {
    const everything =
      experienceOfAll(coast.monsters) + milestonesOf(coast) + experienceOfAll(woods.monsters) + milestonesOf(woods);

    expect(everything).toBeLessThan(levelFour);
  });
});

describe('the text of the woods', () => {
  it('is a short line, not a page', () => {
    expect(woods.text).toBeTypeOf('string');
    expect(woods.text?.length).toBeLessThanOrEqual(60);
  });
});
