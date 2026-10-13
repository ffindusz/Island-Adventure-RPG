import { describe, expect, it } from 'vitest';
import { parseSave } from '../src/adapter/saved-game';
import { gameContent } from '../src/content';
import { GEAR_SLOTS, WEAPON_SLOTS, createGame } from '../src/core';
import type {
  AreaDefinition,
  ChaserMonsterDefinition,
  ChestDefinition,
  Direction,
  Game,
  GameEvent,
  InteractableDefinition,
  MonsterPlacement,
  MonsterTypeDefinition,
  Tile,
} from '../src/core';
import { buildAt, DEMANDING_SHARE, gearBefore, SPENDS } from './fight-table';
import {
  advance,
  ATTACK,
  CLOSE_INVENTORY,
  continuedFrom,
  COOLDOWN_STEPS,
  face,
  fixedRandom,
  inventoryOf,
  newGame,
  OPEN_INVENTORY,
  playingView,
  strike,
} from './fixtures';
import { AREA_IDS, areaOf, LEAST_DETOUR, quietGameAt, routeOf } from './main-route';
import {
  directionBetween,
  experienceForLevel,
  experienceOfAll,
  isInZone,
  isWithinAwareness,
  keyOf,
  metOn,
  milestonesOf,
  neighboursOf,
  openTilesOf,
  routeBetween,
  walkRoute,
} from './routes';

// The woods, the second area on the route of the adventure, between the coast and the mountain: what they have to be
// to give the hero its first beasts, a first choice of side path and the one bow of the game. Like the other tests of
// the shipped content, these read the map and the lists of the content and walk the hero over them with the core's own
// movement, so that moving a tile or a chest never breaks them unless the woods stop being what they are for. The trail
// is the path of sand that the text of the woods tells the hero to follow: it is the intended route, and what lies
// beside it is found by the hero who looks. The bow is not on the trail: it is in the chest of the cabin, behind a locked
// door whose key lies in the north woods, and the only thing the trail gives towards it is the caches of arrows.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';

function chaserNamed(name: string): ChaserMonsterDefinition {
  const type = gameContent.monsterTypes[name];
  if (type === undefined || type.behavior !== 'chaser') {
    throw new Error(`The shipped content has no chasing monster type "${name}"`);
  }
  return type;
}

const woods = areaOf(WOODS);
const wayIn = (woods.entrances ?? [])[0];
const wayInTile: Tile = wayIn?.tile ?? { col: 0, row: 0 };
const wayForward = (woods.exits ?? []).find(({ to }) => to.area === MOUNTAIN);
const isOpen = openTilesOf(gameContent, woods);
const isWayForward = (tile: Tile): boolean => wayForward !== undefined && isInZone(wayForward.zone, tile);
const kindAt = ({ col, row }: Tile): string | undefined => gameContent.terrain[woods.layout[row]?.[col] ?? '']?.kind;
/** The trail: the path of sand from the way in to the exit forward, over open ground, every door shut and no key held. */
const trail = routeOf(WOODS);
const onTrail = new Set(trail.map(keyOf));

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

/** The first wolf of the woods: the weakest monster of the game, on the sand just inside the way in. It carries nothing. */
function firstWolf(): MonsterPlacement {
  const found = woods.monsters.find(({ id }) => id === 'woods-wolf-1');
  if (found === undefined) {
    throw new Error('The woods have no monster "woods-wolf-1"');
  }
  return found;
}

/** The chest, door or key of the woods with this id: the tests of the cabin name what they walk to. */
function placedInWoods<K extends InteractableDefinition['kind']>(
  kind: K,
  id: string,
): Extract<InteractableDefinition, { kind: K }> {
  const found = interactables.find((item): item is Extract<InteractableDefinition, { kind: K }> => {
    return item.kind === kind && item.id === id;
  });
  if (found === undefined) {
    throw new Error(`The woods place no ${kind} "${id}"`);
  }
  return found;
}

/** The monster type of a placement, from the shipped content. */
function monsterTypeOf({ type }: MonsterPlacement): MonsterTypeDefinition {
  const found = gameContent.monsterTypes[type];
  if (found === undefined) {
    throw new Error(`The shipped content has no monster type "${type}"`);
  }
  return found;
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
  return reached === undefined ? null : trail.findIndex((tile) => keyOf(tile) === keyOf(reached));
}

/** How many tiles of walking lie between the trail and a spot, or null when the spot cannot be walked to. */
function detourFromTrail(spot: Tile): number | null {
  const walkBack = walkToTrail(spot);
  return walkBack === null ? null : walkBack.length - 2;
}

/** The tiles the hero can stand on once every door of the woods is open: the cabin's, which is the only one. */
const doorsOpen = openTilesOf(gameContent, woods, true);

/** Whether the hero can walk from the way in to a spot beside the chest, over the ground that `isWalkable` calls open. */
const standsBeside = (isWalkable: (tile: Tile) => boolean, chest: ChestDefinition): boolean =>
  routeBetween(isWalkable, wayInTile, (spot) => neighboursOf(spot).some((next) => keyOf(next) === keyOf(chest.tile))) !== null;

/** The hero walks from where it stands to a spot beside a chest or a door over open ground, faces it and uses Interact. */
function interactWith(
  game: Game,
  target: { readonly id: string; readonly tile: Tile },
  isWalkable: (tile: Tile) => boolean = isOpen,
): readonly GameEvent[] {
  const { x, y } = playingView(game).hero.position;
  const from = { col: Math.floor(x), row: Math.floor(y) };
  const route = routeBetween(isWalkable, from, (tile) => neighboursOf(tile).some((next) => keyOf(next) === keyOf(target.tile)));
  if (route === null) {
    throw new Error(`The hero cannot walk to a spot beside "${target.id}"`);
  }
  walkRoute(game, route);
  face(game, directionBetween(route.at(-1) ?? from, target.tile));
  return game.send({ type: 'interact' });
}

/** The hero walks over open ground onto the tile of a pickup or a key, which takes it. Returns the events on the way. */
function walkOnto(game: Game, tile: Tile): GameEvent[] {
  const { x, y } = playingView(game).hero.position;
  const from = { col: Math.floor(x), row: Math.floor(y) };
  const route = routeBetween(isOpen, from, (spot) => keyOf(spot) === keyOf(tile));
  if (route === null) {
    throw new Error(`The hero cannot walk onto the tile ${keyOf(tile)}`);
  }
  return walkRoute(game, route);
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

/** How far the hero is from a monster, centre to centre, or null once the monster is gone from the view. */
function apartFrom(game: Game, id: string): number | null {
  const { hero, monsters } = playingView(game);
  const monster = monsters.find((candidate) => candidate.id === id);
  return monster === undefined ? null : Math.hypot(monster.position.x - hero.position.x, monster.position.y - hero.position.y);
}

/** The way to face a monster from where the hero stands: along the axis on which they are farther apart. */
function directionToward(game: Game, id: string): Direction {
  const { hero, monsters } = playingView(game);
  const monster = monsters.find((candidate) => candidate.id === id);
  const across = (monster?.position.x ?? hero.position.x) - hero.position.x;
  const down = (monster?.position.y ?? hero.position.y) - hero.position.y;
  if (Math.abs(across) >= Math.abs(down)) {
    return across >= 0 ? 'right' : 'left';
  }
  return down >= 0 ? 'down' : 'up';
}

const MOST_BLOWS = 20;

/**
 * The hero walks the trail until the monster is two tiles from it or nearer, and then faces it and strikes, as a player
 * who never dodges would, until it is defeated. Returns every event on the way.
 */
function walkToAndDefeat(game: Game, monster: MonsterPlacement): GameEvent[] {
  const events = walkRoute(game, trail, () => (apartFrom(game, monster.id) ?? 0) > 2);
  for (let blow = 0; apartFrom(game, monster.id) !== null; blow += 1) {
    if (blow === MOST_BLOWS) {
      throw new Error(`The hero has not defeated "${monster.id}" in ${MOST_BLOWS} blows`);
    }
    face(game, directionToward(game, monster.id));
    events.push(...advance(game, COOLDOWN_STEPS), ...game.send(ATTACK));
  }
  return events;
}

describe('the way through the woods', () => {
  it('loads with the rest of the shipped content: the content check passes', () => {
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });

  it('leads along a path of sand from the way in to the exit forward, over open ground, with every door shut and no key held', () => {
    expect(wayIn?.id).toBe('from-coast');
    expect(wayForward, 'the woods have an exit to the mountain').toBeDefined();
    expect(trail[0]).toEqual(wayInTile);
    expect(isWayForward(trail.at(-1) ?? wayInTile)).toBe(true);
    expect(trail.slice(1).filter((tile) => !isOpen(tile) || kindAt(tile) !== 'sand')).toEqual([]);
  });

  it('lets the hero walk it into the mountain, where it touches the Checkpoint of the mountain', () => {
    const game = quietGameAt(WOODS, wayInTile);

    const events = walkRoute(game, trail);

    expect(events).toContainEqual({ type: 'area-changed', areaId: MOUNTAIN });
    expect(playingView(game).area.id).toBe(MOUNTAIN);
    expect(playingView(game).checkpoints.filter(({ active }) => active)).toHaveLength(1);
  });

  it('has one milestone', () => {
    expect(woods.milestones).toHaveLength(1);
  });

  it('has a milestone that no way on goes round', () => {
    const [milestone] = woods.milestones ?? [];

    const goingRound = routeBetween(
      (tile) => isOpen(tile) && !(milestone !== undefined && isInZone(milestone.zone, tile)),
      wayInTile,
      isWayForward,
    );

    expect(milestone, 'a milestone in the woods').toBeDefined();
    expect(goingRound).toBeNull();
  });

  it('gives the milestone to a hero who walks the trail', () => {
    const [milestone] = woods.milestones ?? [];

    const events = walkRoute(quietGameAt(WOODS, wayInTile), trail);

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
  it('has the first wolf on the sand early on the trail: in the first third of it', () => {
    const place = placeOnTrail(firstWolf().tile);

    expect(kindAt(firstWolf().tile)).toBe('sand');
    expect(place).not.toBeNull();
    expect(place ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(trail.length / 3);
  });

  // Nearness is the tiles walked over open ground from the way in, (1,14), to the monster's tile: the length of the walk
  // that routeBetween finds, less the tile the hero starts on. Worked out by hand on the map, the first wolf at (9,14) is
  // 8 tiles in, along the sand of row 14. No walk is shorter than the columns and the rows apart, and for the others
  // that is 38 (34,9), 33 (31,17), 41 (34,22), 48 (37,2) and 26 (17,24): the least is 26. It is just that to the slime at
  // (17,24), by row 14 to column 14, down the neck at columns 14 and 15 to row 22, then east and south to its tile.
  it('has the first wolf nearer the way in than every other monster of the woods: it is the first fight there', () => {
    const wolf = firstWolf();
    const walkedTo = ({ tile }: MonsterPlacement): number =>
      (routeBetween(isOpen, wayInTile, (spot) => keyOf(spot) === keyOf(tile))?.length ?? Number.POSITIVE_INFINITY) - 1;

    const others = woods.monsters.filter((monster) => monster !== wolf);

    expect(others, 'the monsters of the woods besides the first wolf').not.toEqual([]);
    for (const monster of others) {
      expect(walkedTo(monster), `the tiles walked from the way in to ${monster.id}, against ${wolf.id}`).toBeGreaterThan(
        walkedTo(wolf),
      );
    }
  });

  it('has a first wolf of a kind that the rest of the woods has too: no new monster', () => {
    const wolf = firstWolf();

    const others = woods.monsters.filter((monster) => monster !== wolf);

    expect(others.map(({ type }) => type)).toContain(wolf.type);
  });

  it('has a first wolf that stands farther from the way in and the Checkpoint than it notices the hero: a hero who begins again there is not at once in a fight', () => {
    const wolf = firstWolf();
    const spots = [...(woods.entrances ?? []), ...(woods.checkpoints ?? [])];

    expect(spots.map(({ id }) => id)).toEqual(expect.arrayContaining(['from-coast', 'woods-checkpoint']));
    for (const spot of spots) {
      expect(
        isWithinAwareness(monsterTypeOf(wolf), wolf.tile, gameContent.hero.size, spot.tile),
        `a hero on ${spot.id} is noticed by the first wolf ${wolf.id}`,
      ).toBe(false);
    }
  });

  it('has a first wolf that a hero with the sword it began with and the Gear of the coast beats, as it beats the other beasts of the woods', () => {
    const wolf = firstWolf();

    expect(gearBefore(WOODS)['ranged-weapon'], 'the hero holds no bow before the first wolf').toBeUndefined();
    for (const spend of SPENDS) {
      const fight = buildAt(wolf.type, WOODS, spend);
      expect(fight.result.outcome, `a hero ${spend} against the ${wolf.type}`).toBe('won');
      expect(fight.lostShare, `a hero ${spend} against the ${wolf.type}`).toBeLessThan(DEMANDING_SHARE);
    }
  });

  it('has Ammunition caches along the trail for the bow of the cabin: two at least that the hero can walk to with every door shut, the first before the half of the trail', () => {
    const places = interactables.filter(holdsAmmunition).flatMap(({ tile }) => placeOnTrail(tile) ?? []);

    expect(places.length, 'Ammunition caches the hero can walk to').toBeGreaterThanOrEqual(2);
    expect(Math.min(...places)).toBeLessThanOrEqual(trail.length / 2);
  });

  it('lets the hero walk from the way in to the first wolf and defeat it, and gives it nothing: the Gear it began with is all it has, and no Gear is picked up', () => {
    const wolf = firstWolf();
    const game = newGame({ ...gameContent, start: { area: WOODS, tile: wayInTile } });
    const gearAtTheStart = inventoryOf(game).gear;

    const defeat = walkToAndDefeat(game, wolf);

    expect(defeat).toContainEqual({ type: 'monster-defeated', monsterId: wolf.id });
    expect(defeat.filter((event) => event.type === 'pickup' && event.item.kind === 'gear')).toEqual([]);
    expect(inventoryOf(game).gear).toEqual(gearAtTheStart);
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

    const events = interactWith(quietGameAt(WOODS, wayInTile), chest);

    expect(events).toContainEqual({ type: 'chest-opened', chestId: chest.id });
    expect(events).toContainEqual(pickupFrom(chest));
  });

  it('keeps an armor upgrade, the Chain Mail that came here from the coast, in a chest a good walk off the trail', () => {
    const armor = chestThat('chest of armor', (chest) => gearSlotOf(chest) === 'armor');

    expect(detourFromTrail(armor.tile) ?? 0).toBeGreaterThanOrEqual(LEAST_DETOUR);
  });
});

describe('the cabin in the woods', () => {
  const weaponChests = chests.filter((chest) => (WEAPON_SLOTS as readonly string[]).includes(gearSlotOf(chest) ?? ''));
  const behindDoors = weaponChests.filter((chest) => !standsBeside(isOpen, chest));

  it('keeps a weapon in a chest that the hero cannot stand beside with every door shut, but can once a door is open', () => {
    expect(behindDoors, 'a chest of a weapon behind a door').not.toEqual([]);
    expect(behindDoors.every((chest) => standsBeside(doorsOpen, chest))).toBe(true);
  });

  it('keeps the Long Bow in the chest cabin-chest, which the hero cannot stand beside with every door shut, and can once cabin-door is open', () => {
    const chest = placedInWoods('chest', 'cabin-chest');

    expect(doors.map(({ id }) => id), 'the doors of the woods: the open ground of doorsOpen is that of cabin-door').toEqual(['cabin-door']);
    expect(chest.contents).toEqual({ kind: 'gear', gear: 'long-bow' });
    expect(standsBeside(isOpen, chest)).toBe(false);
    expect(standsBeside(doorsOpen, chest)).toBe(true);
  });

  it('is an upgrade: that weapon adds more than any Gear of its slot that the hero begins with or finds before it, on the coast and in the rest of the woods', () => {
    expect(behindDoors, 'a chest of a weapon behind a door').not.toEqual([]);
    for (const reward of behindDoors) {
      const upgrade = reward.contents.kind === 'gear' ? gameContent.gear[reward.contents.gear] : undefined;
      const others = [
        ...GEAR_SLOTS.flatMap((slot) => gameContent.hero.startingGear[slot] ?? []),
        ...gearInChestsOf(areaOf(COAST)),
        ...chests.filter((chest) => chest !== reward).flatMap((chest) => (chest.contents.kind === 'gear' ? [chest.contents.gear] : [])),
      ].flatMap((id) => gameContent.gear[id] ?? []);

      const best = Math.max(0, ...others.filter((gear) => gear.slot === upgrade?.slot).map((gear) => gear.bonus));

      expect(upgrade, `the Gear in the chest ${reward.id}`).toBeDefined();
      expect(upgrade?.bonus ?? 0).toBeGreaterThan(best);
    }
  });

  it('keeps its key a good walk from the trail, in the north woods, as the sign by the door says', () => {
    expect(doors, 'a locked door in the woods').not.toEqual([]);
    for (const door of doors) {
      const key = keys.find(({ id }) => id === door.key);
      expect(key, `the key of the door ${door.id}`).toBeDefined();
      expect(detourFromTrail(key?.tile ?? door.tile) ?? 0, `the way to the key ${key?.id}`).toBeGreaterThanOrEqual(LEAST_DETOUR);
      expect(key?.tile.row ?? Number.POSITIVE_INFINITY).toBeLessThan(woods.layout.length / 2);
    }
  });
});

/** Every place of the five areas that gives the hero a piece of Gear: the Gear it begins with and the chests (no monster gives Gear). */
function placesGivingGear(): { readonly where: string; readonly gear: string }[] {
  return [
    ...GEAR_SLOTS.flatMap((slot) => gameContent.hero.startingGear[slot] ?? []).map((gear) => ({ where: 'the start', gear })),
    ...AREA_IDS.flatMap((id) =>
      (areaOf(id).interactables ?? []).flatMap((item) =>
        item.kind === 'chest' && item.contents.kind === 'gear' ? [{ where: item.id, gear: item.contents.gear }] : [],
      ),
    ),
  ];
}

describe('the only bow of the game', () => {
  it('is the Long Bow, with a bonus of 2: the only piece of Gear of the ranged slot', () => {
    const ranged = Object.entries(gameContent.gear).filter(([, gear]) => gear.slot === 'ranged-weapon');

    expect(ranged.map(([id, gear]) => ({ id, bonus: gear.bonus }))).toEqual([{ id: 'long-bow', bonus: 2 }]);
  });

  it('is given by one place in the five areas, the chest cabin-chest of the woods: the hero begins without one, and no monster and no other chest gives one', () => {
    const givingARangedWeapon = placesGivingGear().filter(({ gear }) => gameContent.gear[gear]?.slot === 'ranged-weapon');

    expect(givingARangedWeapon).toEqual([{ where: 'cabin-chest', gear: 'long-bow' }]);
  });

  it('is in no definition of the shipped content as a Short Bow: not as Gear, in a chest, on a monster or in the Gear the hero begins with', () => {
    expect(JSON.stringify(gameContent)).not.toMatch(/short[- ]?bow/i);
  });

  it('is found on the side path of the cabin: the hero has none until it takes the key, opens the door and the chest, and then it equips the bow, switches to it, has no arrows and shoots at a cache of the trail', () => {
    const door = placedInWoods('door', 'cabin-door');
    const key = placedInWoods('key', door.key);
    const chest = placedInWoods('chest', 'cabin-chest');
    const cache = chestThat('Ammunition cache that the hero can reach', (candidate) => holdsAmmunition(candidate) && placeOnTrail(candidate.tile) !== null);
    const game = quietGameAt(WOODS, wayInTile);
    const bowsOf = (): unknown[] => inventoryOf(game).gear.filter(({ slot }) => slot === 'ranged-weapon');
    expect(bowsOf(), 'the hero begins without a bow in its inventory').toEqual([]);
    expect(game.send({ type: 'switch-weapon' }), 'nothing to take in hand yet').toEqual([]);

    expect(walkOnto(game, key.tile)).toContainEqual({ type: 'pickup', item: { kind: 'key', id: key.id, name: key.name } });
    expect(interactWith(game, door)).toEqual([{ type: 'door-opened', doorId: door.id, keyName: key.name }]);
    const chestEvents = interactWith(game, chest, doorsOpen);
    expect(chestEvents).toContainEqual({ type: 'chest-opened', chestId: chest.id });
    expect(chestEvents).toContainEqual({
      type: 'pickup',
      item: expect.objectContaining({ kind: 'gear', id: 'long-bow', slot: 'ranged-weapon' }),
    });
    expect(bowsOf()).toEqual([expect.objectContaining({ id: 'long-bow', equipped: false })]);
    game.send(OPEN_INVENTORY);
    expect(game.send({ type: 'equip', gearId: 'long-bow' })).toEqual([
      { type: 'gear-equipped', gearId: 'long-bow', slot: 'ranged-weapon' },
    ]);
    game.send(CLOSE_INVENTORY);
    expect(game.send({ type: 'switch-weapon' })).toEqual([{ type: 'weapon-switched', weapon: 'ranged-weapon' }]);
    expect(playingView(game).hero.activeWeapon).toBe('ranged-weapon');
    expect(strike(game), 'the bow has no arrows yet').toEqual([{ type: 'out-of-ammunition' }]);

    const cacheEvents = interactWith(game, cache, doorsOpen);
    const shot = strike(game);

    expect(cacheEvents).toContainEqual({ type: 'chest-opened', chestId: cache.id });
    expect(cacheEvents).toContainEqual(pickupFrom(cache));
    expect(shot).toContainEqual(expect.objectContaining({ type: 'hero-shot' }));
    expect(bowsOf(), 'the inventory holds one bow, the Long Bow').toEqual([expect.objectContaining({ id: 'long-bow', equipped: true })]);
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
  const coast = areaOf(COAST);

  it('gives a hero who fights what it meets from the start to the exit of the woods, and passes the milestones, the Experience of Level 3', () => {
    const earned =
      experienceOfAll(gameContent, metOn(gameContent, coast, routeOf(COAST))) +
      milestonesOf(coast) +
      experienceOfAll(gameContent, metOn(gameContent, woods, trail)) +
      milestonesOf(woods);

    expect(earned).toBeGreaterThanOrEqual(experienceForLevel(gameContent, 3));
  });

  it('does not give a hero who clears the coast and the woods the Experience of Level 4: nobody has to grind', () => {
    const everything =
      experienceOfAll(gameContent, coast.monsters) +
      milestonesOf(coast) +
      experienceOfAll(gameContent, woods.monsters) +
      milestonesOf(woods);

    expect(everything).toBeLessThan(experienceForLevel(gameContent, 4));
  });
});

describe('the text of the woods', () => {
  it('is a short line, not a page', () => {
    expect(woods.text).toBeTypeOf('string');
    expect(woods.text?.length).toBeLessThanOrEqual(60);
  });
});

/** A save as the storage holds it, so far as the tests below read and damage it. */
interface SavedGame {
  state: {
    areas: Record<string, { interactables: Record<string, unknown> }>;
    hero: { gear: string[]; equipped: Record<string, string>; activeWeapon: string; consumables: Record<string, number> };
  };
}

function savedGameOfNow(): SavedGame {
  return JSON.parse(JSON.stringify(newGame(gameContent).snapshot()));
}

describe('a save made while the bow was in a chest', () => {
  // A save holds the state of every interactable of every area, so every save made before a monster carried the bow
  // holds the chest "bow-chest", which the woods no longer have. The title calls such a save "from another version" and
  // a new game replaces it (SNAPSHOT_VERSION stays: the Gear a monster carried was content and holds no state).

  it('is a save the game can continue from when it knows no such chest', () => {
    expect(parseSave(JSON.stringify(savedGameOfNow()), gameContent)).toMatchObject({ status: 'usable' });
  });

  it('is from another version: the game cannot continue from it', () => {
    const saved = savedGameOfNow();
    const ofWoods = saved.state.areas[WOODS]?.interactables;
    if (ofWoods === undefined) {
      throw new Error('The save holds no state of the woods');
    }
    ofWoods['bow-chest'] = { kind: 'chest', opened: false };

    expect(parseSave(JSON.stringify(saved), gameContent)).toMatchObject({
      status: 'unusable',
      problem: 'incompatible',
      detail: expect.stringContaining(`${WOODS}.interactables.bow-chest is not an interactable of the area`),
    });
  });
});

describe('a save made while the first wolf carried the Short Bow', () => {
  // The Short Bow is not Gear of the game any more, so a hero that took it from the first wolf holds Gear that this game
  // could not have given it. The check of the Gear ids that every save goes through refuses it as incompatible, and the
  // title calls it a save "from another version", which a new game replaces. SNAPSHOT_VERSION stays, as the Gear a
  // monster carried was content: it holds no state of its own, so a save with no Short Bow in it is read as before.
  const gearNotOfThisGame = /state\.hero\.gear\[\d+\] is "short-bow", which is not Gear of this game/;

  it('is from another version when the hero carries the Short Bow: the game cannot continue from it', () => {
    const saved = savedGameOfNow();
    saved.state.hero.gear.push('short-bow');

    expect(parseSave(JSON.stringify(saved), gameContent)).toMatchObject({
      status: 'unusable',
      problem: 'incompatible',
      detail: expect.stringMatching(gearNotOfThisGame),
    });
  });

  it('is from another version when the hero has the Short Bow in hand, equipped and with arrows too', () => {
    const saved = savedGameOfNow();
    saved.state.hero.gear.push('short-bow');
    saved.state.hero.equipped['ranged-weapon'] = 'short-bow';
    saved.state.hero.activeWeapon = 'ranged-weapon';
    saved.state.hero.consumables['ammunition'] = 6;

    expect(parseSave(JSON.stringify(saved), gameContent)).toMatchObject({
      status: 'unusable',
      problem: 'incompatible',
      detail: expect.stringMatching(gearNotOfThisGame),
    });
  });

  it('is a save the game can continue from when the hero has the Long Bow in hand instead, and the bow shoots', () => {
    const saved = savedGameOfNow();
    saved.state.hero.gear.push('long-bow');
    saved.state.hero.equipped['ranged-weapon'] = 'long-bow';
    saved.state.hero.activeWeapon = 'ranged-weapon';
    saved.state.hero.consumables['ammunition'] = 6;

    const parsed = parseSave(JSON.stringify(saved), gameContent);

    if (parsed.status !== 'usable') {
      throw new Error(`The save with the Long Bow is not usable: ${JSON.stringify(parsed)}`);
    }
    expect(strike(continuedFrom(gameContent, parsed.snapshot))).toContainEqual(expect.objectContaining({ type: 'hero-shot' }));
  });
});
