import { describe, expect, it } from 'vitest';
import { monsterColour, terrainColour } from '../src/adapter/art';
import { VIEW_TILES_HIGH, VIEW_TILES_WIDE } from '../src/adapter/config';
import { gameContent } from '../src/content';
import { GEAR_SLOTS, STEPS_PER_SECOND, createGame } from '../src/core';
import type {
  AreaDefinition,
  ChestDefinition,
  Game,
  GameEvent,
  InteractableDefinition,
  MonsterTypeDefinition,
  Tile,
  TileRect,
} from '../src/core';
import { STEPS_PER_TILE, face, fixedRandom, interactableViews, newGame, playingView, walk } from './fixtures';
import {
  directionBetween,
  distanceBetween,
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

// The cave, the fourth area on the route of the adventure, between the mountain and the old castle: what it has to be to
// be a dark network of winding passages of its own, with creatures that are not the mountain's, a side path closed by
// a gate that a lever opens, and a weapon behind it. Like the other tests of the shipped content, these read the map
// and the lists of the content and walk the hero over them with the core's own movement, so that moving a tile or a
// chest never breaks them unless the cave stops being what it is for. The trail is the path of sand that the text of
// the cave tells the hero to follow: it is the intended route, and what lies beside it is found by the hero who looks.

const COAST = 'shipwreck-coast';
const WOODS = 'woods';
const MOUNTAIN = 'mountain';
const CAVE = 'cave';
const CASTLE = 'castle';

/** The notice is drawn over the bottom of the view, so a hero who has to stand in these rows of an area is hidden. */
const BOTTOM_ROWS = 3;

/** A way winds when it is this many times as long as the straight line from its start to its end, at least. */
const LEAST_WINDING = 1.5;

/** Two colours are set apart when they lie this far from each other, at least, in the cube of red, green and blue (0 to 255 each). */
const LEAST_COLOUR_GAP = 50;

/** A gate is in sight of the hero who follows the trail when it lies this many tiles from it, at most: the view is twelve tiles high. */
const IN_SIGHT = 5;

/** A sign is by the gate it speaks of when it stands this many tiles from it, at most. */
const BY_THE_GATE = 2;

/** A chest or a pickup is near the trail when the walk to it from the trail is this many tiles at most: a step aside, not a trip. */
const MOST_NEARBY = 4;

/** A side path is a walk, not a step aside: this many tiles from the trail to the spot beside what lies at its end, at least. */
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

const cave = definitionOf(CAVE);
const wayIn = (cave.entrances ?? [])[0];
const wayInTile: Tile = wayIn?.tile ?? { col: 0, row: 0 };
const wayForward = (cave.exits ?? []).find(({ to }) => to.area === CASTLE);
const isOpen = openTilesOf(gameContent, cave);
const isWayForward = (tile: Tile): boolean => wayForward !== undefined && isInZone(wayForward.zone, tile);
const kindAt = ({ col, row }: Tile): string | undefined => gameContent.terrain[cave.layout[row]?.[col] ?? '']?.kind;
/** The trail: the path of sand from the way in to the exit forward, over open ground, every door and gate shut and no key held. */
const trail = routeBetween((tile) => isOpen(tile) && kindAt(tile) === 'sand', wayInTile, isWayForward);
/** The shortest way over any open ground, sand or not. */
const shortestWay = routeBetween(isOpen, wayInTile, isWayForward);

/** How far apart two tiles are along the lines of the grid, which is the way the hero walks. */
function straightLine(from: Tile, to: Tile): number {
  return Math.abs(from.col - to.col) + Math.abs(from.row - to.row);
}

/** The tiles of a rectangle of the map. */
function tilesOf({ col, row, width, height }: TileRect): Tile[] {
  return Array.from({ length: width * height }, (_, place) => ({
    col: col + (place % width),
    row: row + Math.floor(place / width),
  }));
}

/** The tiles of the exit forward. */
const forwardTiles = wayForward === undefined ? [] : tilesOf(wayForward.zone);

/** The types of monster in the cave, with their ids, and the tougher one among them: the one that takes most to defeat. */
const creatures = [...new Set(cave.monsters.map(({ type }) => type))].flatMap((id) => {
  const type = gameContent.monsterTypes[id];
  return type === undefined ? [] : [{ id, type }];
});
const tougher = [...creatures].sort((one, other) => other.type.health - one.type.health)[0];
const toughCreatures = cave.monsters.filter(({ type }) => type === tougher?.id);

const interactables = cave.interactables ?? [];
const chests = interactables.flatMap((item) => (item.kind === 'chest' ? [item] : []));
const gates = interactables.flatMap((item) => (item.kind === 'gate' ? [item] : []));
const levers = interactables.flatMap((item) => (item.kind === 'lever' ? [item] : []));
const signs = interactables.flatMap((item) => (item.kind === 'sign' ? [item] : []));
const pickups = interactables.flatMap((item) => (item.kind === 'pickup' ? [item] : []));
const onTrail = new Set((trail ?? []).map(keyOf));

function holdsAmmunition(item: InteractableDefinition): boolean {
  return item.kind === 'chest'
    ? item.contents.kind === 'consumable' && item.contents.consumable === 'ammunition'
    : item.kind === 'pickup' && item.consumable === 'ammunition';
}

/** How many tiles of walking lie between the trail and a spot, with every gate shut, or null when the spot cannot be walked to. */
function detourFromTrail(spot: Tile): number | null {
  const walkBack = routeBetween(isOpen, spot, (tile) => onTrail.has(keyOf(tile)));
  return walkBack === null ? null : walkBack.length - 2;
}

const isNearTheTrail = ({ tile }: { readonly tile: Tile }): boolean =>
  (detourFromTrail(tile) ?? Number.POSITIVE_INFINITY) <= MOST_NEARBY;
/** The chests that the hero can reach with every gate shut and that lie a good walk from the trail: not the ones in the pocket behind the gate. */
const isOnASidePath = ({ tile }: { readonly tile: Tile }): boolean => (detourFromTrail(tile) ?? 0) >= LEAST_DETOUR;

/** The one thing of its kind that the cave has, found when a test needs it, so that a cave without it fails that test and no other. */
function theOnly<T>(what: string, things: readonly T[]): T {
  const [thing] = things;
  if (things.length !== 1 || thing === undefined) {
    throw new Error(`The cave has ${things.length} ${what}, where the tests expect one`);
  }
  return thing;
}

const theGate = () => theOnly('gates', gates);
const theLever = () => theOnly('levers', levers);
const theSign = () => theOnly('signs', signs);
/** The chest in the pocket behind the gate: the only one that holds a piece of Gear. */
const weaponChest = (): ChestDefinition => theOnly('chests of Gear', chests.filter(({ contents }) => contents.kind === 'gear'));
const gearIn = ({ contents }: ChestDefinition): string => (contents.kind === 'gear' ? contents.gear : '');

/** The type of a monster of the cave, which the loader sees to exist; none here only for content it refuses. */
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

/** How far apart two colours, given as 0xRRGGBB, lie in the cube of red, green and blue. */
function colourGap(one: number, other: number): number {
  return Math.hypot(...[16, 8, 0].map((shift) => ((one >> shift) & 0xff) - ((other >> shift) & 0xff)));
}

/** The ids of the Gear that the chests of an area hold. */
function gearInChestsOf(area: AreaDefinition): string[] {
  return (area.interactables ?? []).flatMap((item) =>
    item.kind === 'chest' && item.contents.kind === 'gear' ? [item.contents.gear] : [],
  );
}

/** Every tile that the hero can walk to from a tile over open ground, as their keys. */
function reachableFrom(isWalkable: (tile: Tile) => boolean, from: Tile): Set<string> {
  const reached = new Set([keyOf(from)]);
  const frontier = [from];
  for (const tile of frontier) {
    for (const next of neighboursOf(tile)) {
      if (!reached.has(keyOf(next)) && isWalkable(next)) {
        reached.add(keyOf(next));
        frontier.push(next);
      }
    }
  }
  return reached;
}

/**
 * The hero walks from where it stands to a spot beside a tile over open ground, turns to the tile and uses Interact. It
 * walks over the ground that `isWalkable` says is open: with the gate shut unless a test says it stands open. Returns
 * what Interact did.
 */
function interactWith(game: Game, target: Tile, isWalkable: (tile: Tile) => boolean = isOpen): readonly GameEvent[] {
  const { x, y } = playingView(game).hero.position;
  const from = { col: Math.floor(x), row: Math.floor(y) };
  const route = routeBetween(isWalkable, from, (tile) => neighboursOf(tile).some((next) => keyOf(next) === keyOf(target)));
  if (route === null) {
    throw new Error(`The hero cannot walk to a spot beside the tile ${keyOf(target)}`);
  }
  walkRoute(game, route);
  face(game, directionBetween(route.at(-1) ?? from, target));
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

describe('the way through the cave', () => {
  it('comes fourth on the route of the adventure: after the coast, the woods and the mountain, before the castle', () => {
    expect(gameContent.areas.slice(0, 5).map(({ id }) => id)).toEqual([COAST, WOODS, MOUNTAIN, CAVE, CASTLE]);
  });

  it('loads with the rest of the shipped content: the content check passes', () => {
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });

  it('is larger than the screen in both directions, so that the view must follow the hero', () => {
    const { area } = playingView(quietGameAt(CAVE, wayInTile));

    expect(area.width).toBeGreaterThan(VIEW_TILES_WIDE);
    expect(area.height).toBeGreaterThan(VIEW_TILES_HIGH);
  });

  it('leads along a path of sand from the way in to the exit forward, over open ground, with every door and gate shut and no key held', () => {
    expect(wayIn?.id).toBe('from-mountain');
    expect(wayForward, 'the cave has an exit to the castle').toBeDefined();
    expect(wayForward?.to.entrance).toBe('from-cave');
    expect(trail).not.toBeNull();
  });

  it('lets the hero walk it into the castle, where it touches the Checkpoint of the castle', () => {
    const game = quietGameAt(CAVE, wayInTile);

    const events = walkRoute(game, trail ?? []);

    expect(events).toContainEqual({ type: 'area-changed', areaId: CASTLE });
    expect(playingView(game).area.id).toBe(CASTLE);
    expect(playingView(game).checkpoints).toEqual([
      expect.objectContaining({ id: 'castle-checkpoint', active: true }),
      expect.objectContaining({ id: 'guardian-checkpoint', active: false }),
    ]);
  });

  it('winds: the trail is half as long again as the straight line from the way in to the exit forward, and no shorter way over open ground cuts it', () => {
    const straight = Math.min(...forwardTiles.map((tile) => straightLine(wayInTile, tile)));

    expect(forwardTiles.length).toBeGreaterThan(0);
    expect((trail?.length ?? 0) - 1).toBeGreaterThanOrEqual(LEAST_WINDING * straight);
    expect((shortestWay?.length ?? 0) - 1).toBeGreaterThanOrEqual(LEAST_WINDING * straight);
  });

  it('keeps the exit forward, and the entrance beside it for the hero who comes back from the castle, out of the bottom rows', () => {
    const wayBack = (cave.entrances ?? []).find(({ id }) => id === 'from-castle');
    const lowest = cave.layout.length - 1 - BOTTOM_ROWS;

    expect(wayBack, 'the cave has an entrance from the castle').toBeDefined();
    expect(wayBack?.tile.row ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(lowest);
    expect((wayForward?.zone.row ?? Number.POSITIVE_INFINITY) + (wayForward?.zone.height ?? 0) - 1).toBeLessThanOrEqual(lowest);
  });

  it('has one Checkpoint, where the hero comes in from the mountain', () => {
    expect(cave.checkpoints).toEqual([expect.objectContaining({ id: 'cave-checkpoint', tile: wayInTile })]);
  });

  it('is a cave: rock, solid, makes up half of it at least', () => {
    const rockSymbols = new Set(
      Object.entries(gameContent.terrain)
        .filter(([, terrain]) => terrain.kind === 'rock' && terrain.solid)
        .map(([symbol]) => symbol),
    );

    const tiles = cave.layout.join('');
    const rock = [...tiles].filter((symbol) => rockSymbols.has(symbol));

    expect(rock.length / tiles.length).toBeGreaterThanOrEqual(1 / 2);
  });
});

describe('the creatures of the cave', () => {
  it('holds the cave with creatures of its own and nothing else: every monster in it is of a cave type', () => {
    expect(cave.monsters.length).toBeGreaterThan(0);
    expect(cave.monsters.filter(({ type }) => !type.startsWith('cave-'))).toEqual([]);
  });

  it('meets a hero who walks the trail with creatures that chase, that charge and that shoot', () => {
    const behaviors = metOn(gameContent, cave, trail).map((monster) => typeOf(monster)?.behavior);

    expect(behaviors).toContain('chaser');
    expect(behaviors).toContain('charger');
    expect(behaviors).toContain('ranged');
  });

  it('has a tougher creature than the rest: at least twice the health of any other cave creature, and a harder hit', () => {
    if (tougher === undefined) {
      throw new Error('The cave has no monsters');
    }
    const others = creatures.filter(({ id }) => id !== tougher.id);

    expect(others.length).toBeGreaterThan(0);
    for (const other of others) {
      expect(tougher.type.health, `the health of ${tougher.id} against ${other.id}`).toBeGreaterThanOrEqual(
        2 * other.type.health,
      );
      expect(hitOf(tougher.type), `the hit of ${tougher.id} against ${other.id}`).toBeGreaterThan(hitOf(other.type));
    }
  });

  it('puts the tougher creature on every way through: none keeps out of the reach of its notice', () => {
    const keepingOut = routeBetween(
      (tile) =>
        isOpen(tile) && toughCreatures.every((creature) => distanceBetween(tile, creature.tile) > noticingOf(gameContent, creature)),
      wayInTile,
      isWayForward,
    );

    expect(toughCreatures.length).toBeGreaterThan(0);
    expect(keepingOut).toBeNull();
  });

  it('leaves room to step aside wherever a charger can notice the hero: no ground there is narrower than two tiles', () => {
    const chargers = cave.monsters.filter((monster) => typeOf(monster)?.behavior === 'charger');

    const cramped = chargers.flatMap((charger) =>
      cave.layout.flatMap((symbols, row) =>
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

  it('draws each kind of creature in a colour of its own: set well apart from every other monster and from the ground of the cave', () => {
    const ground = [...new Set(cave.layout.join(''))].flatMap((symbol) => {
      const kind = gameContent.terrain[symbol]?.kind;
      return kind === undefined ? [] : [{ name: kind, colour: terrainColour(kind) }];
    });
    const monsters = Object.keys(gameContent.monsterTypes).map((id) => ({ name: id, colour: monsterColour(id) }));

    const tooClose = creatures.flatMap(({ id }) =>
      [...monsters, ...ground]
        .filter(({ name, colour }) => name !== id && colourGap(monsterColour(id), colour) < LEAST_COLOUR_GAP)
        .map(({ name }) => `${id} and ${name}`),
    );

    expect(creatures.length).toBeGreaterThan(0);
    expect(tooClose).toEqual([]);
  });
});

describe('the side path behind the gate', () => {
  const besideTheChest = (tile: Tile): boolean => neighboursOf(tile).some((next) => keyOf(next) === keyOf(weaponChest().tile));
  const besideTheLever = (tile: Tile): boolean => neighboursOf(tile).some((next) => keyOf(next) === keyOf(theLever().tile));
  const tileOfHero = (game: Game): Tile => {
    const { x, y } = playingView(game).hero.position;
    return { col: Math.floor(x), row: Math.floor(y) };
  };
  /** The keys of the tiles that only a hero who stands the gate open can walk to: the pocket behind it. */
  const behindTheGate = (): string[] => {
    const shut = reachableFrom(isOpen, wayInTile);
    return [...reachableFrom(openTilesOf(gameContent, cave, true), wayInTile)].filter((place) => !shut.has(place));
  };

  it('keeps the chest of the weapon in a pocket behind the gate: the hero cannot walk to it while the gate is shut, and can when it stands open', () => {
    expect(routeBetween(isOpen, wayInTile, besideTheChest)).toBeNull();
    expect(routeBetween(openTilesOf(gameContent, cave, true), wayInTile, besideTheChest)).not.toBeNull();
  });

  it('shuts away a dead end and nothing more: what the gate keeps from the hero holds no way in, no way out and no Checkpoint', () => {
    const kept = behindTheGate();
    const ways = new Set(
      [
        ...(cave.entrances ?? []).map(({ tile }) => tile),
        ...(cave.checkpoints ?? []).map(({ tile }) => tile),
        ...(cave.exits ?? []).flatMap(({ zone }) => tilesOf(zone)),
      ].map(keyOf),
    );

    expect(kept.length).toBeGreaterThan(0);
    expect(kept.filter((place) => ways.has(place))).toEqual([]);
  });

  it('keeps the gate in sight of the trail: within a few tiles of the sand that the hero follows', () => {
    const nearest = Math.min(...(trail ?? []).map((tile) => distanceBetween(tile, theGate().tile)));

    expect(trail).not.toBeNull();
    expect(nearest).toBeLessThanOrEqual(IN_SIGHT);
  });

  it('has a lever that names the gate and that the hero can walk up to with the gate shut and no key held', () => {
    expect(theLever().targets).toEqual([theGate().id]);
    expect(routeBetween(isOpen, wayInTile, besideTheLever)).not.toBeNull();
  });

  it('has a sign by the gate that the hero can read with the gate shut', () => {
    const sign = theSign();

    const events = interactWith(quietGameAt(CAVE, wayInTile), sign.tile);

    expect(distanceBetween(sign.tile, theGate().tile)).toBeLessThanOrEqual(BY_THE_GATE);
    expect(events).toEqual([{ type: 'sign-read', signId: sign.id, text: sign.text }]);
  });

  it('stops the hero at the gate while it is shut: a hero who walks into it stays where it stood', () => {
    const game = quietGameAt(CAVE, wayInTile);
    const gate = theGate();
    interactWith(game, gate.tile);
    const stood = tileOfHero(game);

    walk(game, directionBetween(stood, gate.tile), 4 * STEPS_PER_TILE);

    expect(tileOfHero(game)).toEqual(stood);
    expect(interactableViews(game, 'gate')).toEqual([expect.objectContaining({ id: gate.id, open: false })]);
  });

  it('does not open for Interact: a hero who uses it on the gate does nothing to it', () => {
    const game = quietGameAt(CAVE, wayInTile);
    const gate = theGate();

    const events = interactWith(game, gate.tile);

    expect(events).toEqual([]);
    expect(interactableViews(game, 'gate')).toEqual([expect.objectContaining({ id: gate.id, open: false })]);
  });

  it('opens by a pull of the lever, made by walking up to it and using Interact: the lever is pulled and the gate stands open', () => {
    const game = quietGameAt(CAVE, wayInTile);
    const lever = theLever();

    const events = interactWith(game, lever.tile);

    expect(events).toEqual([{ type: 'lever-toggled', leverId: lever.id, pulled: true }]);
    expect(interactableViews(game, 'lever')).toEqual([expect.objectContaining({ id: lever.id, pulled: true })]);
    expect(interactableViews(game, 'gate')).toEqual([expect.objectContaining({ id: theGate().id, open: true })]);
  });

  it('lets in a hero who walks as a player does, not from tile to tile: the sign stops a hero who slides along the wall in line with the gate, which is one tile wide', () => {
    const game = quietGameAt(CAVE, wayInTile);
    const { col } = theGate().tile;
    const hero = () => playingView(game).hero;
    const stepsFor = (tiles: number): number =>
      Math.ceil((tiles * STEPS_PER_SECOND) / gameContent.hero.speedTilesPerSecond);
    interactWith(game, theLever().tile);

    // The hero keeps to the walls of the chamber: up to the one above, along it to the left of the gate, up into the row
    // of the sign and along that row, with the key held down, until the sign stops it.
    walk(game, 'up', stepsFor(4));
    walk(game, 'left', stepsFor(hero().position.x - (col - 0.5)));
    walk(game, 'up', stepsFor(2));
    walk(game, 'right', stepsFor(2));

    const room = (1 - hero().size) / 2;
    expect(hero().position.x).toBeGreaterThanOrEqual(col + 0.5 - room - 1e-9);
    expect(hero().position.x).toBeLessThanOrEqual(col + 0.5 + room + 1e-9);

    walk(game, 'up', stepsFor(5));

    expect(behindTheGate()).toContain(keyOf(tileOfHero(game)));
  });
});

describe('the weapon behind the gate', () => {
  const upgrade = () => gameContent.gear[gearIn(weaponChest())];

  it('is a melee weapon that adds more than any Gear of that slot that the hero begins with or finds on the coast, in the woods and on the mountain', () => {
    const earlier = [
      ...GEAR_SLOTS.flatMap((slot) => gameContent.hero.startingGear[slot] ?? []),
      ...[COAST, WOODS, MOUNTAIN].flatMap((id) => gearInChestsOf(definitionOf(id))),
    ].flatMap((id) => gameContent.gear[id] ?? []);

    const best = Math.max(0, ...earlier.filter((gear) => gear.slot === 'melee-weapon').map((gear) => gear.bonus));

    expect(upgrade(), 'the Gear in the chest behind the gate').toBeDefined();
    expect(upgrade()?.slot).toBe('melee-weapon');
    expect(upgrade()?.bonus ?? 0).toBeGreaterThan(best);
  });

  it('is taken by a hero who pulls the lever, walks into the pocket and opens the chest, and wielded: Attack rises by what it adds', () => {
    const game = quietGameAt(CAVE, wayInTile);
    const chest = weaponChest();
    const wielded = gameContent.gear[gameContent.hero.startingGear['melee-weapon'] ?? ''];
    const attack = (): number => {
      const { page } = playingView(game);
      if (page?.id !== 'inventory') {
        throw new Error('The inventory page is not open');
      }
      return page.attack;
    };

    interactWith(game, theLever().tile);
    const events = interactWith(game, chest.tile, openTilesOf(gameContent, cave, true));
    game.send({ type: 'open-page', page: 'inventory' });
    const before = attack();
    game.send({ type: 'equip', gearId: gearIn(chest) });

    expect(events).toContainEqual({ type: 'chest-opened', chestId: chest.id });
    expect(events).toContainEqual(pickupFrom(chest));
    expect(attack() - before).toBe((upgrade()?.bonus ?? 0) - (wielded?.bonus ?? 0));
  });
});

describe('what the hero finds in the cave', () => {
  it('has Ammunition caches near the trail: two at least, each a few steps aside', () => {
    const caches = interactables.filter(holdsAmmunition).filter(isNearTheTrail);

    expect(caches.length, 'Ammunition caches a few steps off the trail').toBeGreaterThanOrEqual(2);
  });

  it('lets the hero walk to each cache near the trail and open it', () => {
    const caches = chests.filter(holdsAmmunition).filter(isNearTheTrail);

    expect(caches.length, 'chests of Ammunition near the trail').toBeGreaterThan(0);
    for (const cache of caches) {
      const events = interactWith(quietGameAt(CAVE, wayInTile), cache.tile);

      expect(events).toContainEqual({ type: 'chest-opened', chestId: cache.id });
      expect(events).toContainEqual(pickupFrom(cache));
    }
  });

  it('has Healing Potions on the ground near the trail: two at least, which the hero takes by walking over them', () => {
    const potions = pickups.filter(({ consumable }) => consumable === 'healing-potion').filter(isNearTheTrail);

    expect(potions.length, 'Healing Potions a few steps off the trail').toBeGreaterThanOrEqual(2);
    for (const potion of potions) {
      const route = routeBetween(isOpen, wayInTile, (tile) => keyOf(tile) === keyOf(potion.tile));
      expect(route, `a walk to the potion ${potion.id}`).not.toBeNull();

      const events = walkRoute(quietGameAt(CAVE, wayInTile), route ?? []);

      expect(events).toContainEqual({
        type: 'pickup',
        item: { kind: 'consumable', id: 'healing-potion', amount: potion.amount },
      });
    }
  });

  it('has a side path of its own, apart from the gate: chests a good walk from the trail, which the hero walks to and opens with every gate shut', () => {
    const rewards = chests.filter(isOnASidePath);

    expect(rewards.length, 'chests a good walk from the trail').toBeGreaterThan(0);
    for (const reward of rewards) {
      const events = interactWith(quietGameAt(CAVE, wayInTile), reward.tile);

      expect(events).toContainEqual({ type: 'chest-opened', chestId: reward.id });
      expect(events).toContainEqual(pickupFrom(reward));
    }
  });

  it('guards the end of the side path with a creature that the hero who keeps to the trail does not meet', () => {
    const metOnTrail = new Set(metOn(gameContent, cave, trail).map(({ id }) => id));
    const rewards = chests.filter(isOnASidePath);

    expect(rewards.length, 'chests a good walk from the trail').toBeGreaterThan(0);
    for (const reward of rewards) {
      const guards = cave.monsters.filter((monster) =>
        neighboursOf(reward.tile).some(
          (spot) => isOpen(spot) && distanceBetween(spot, monster.tile) <= noticingOf(gameContent, monster),
        ),
      );

      expect(guards.length, `creatures that notice a hero beside the chest ${reward.id}`).toBeGreaterThan(0);
      expect(guards.filter(({ id }) => metOnTrail.has(id))).toEqual([]);
    }
  });

  it('keeps every chest, pickup, sign, lever and gate out of the bottom rows, where the notice is drawn over the hero', () => {
    const lowest = cave.layout.length - 1 - BOTTOM_ROWS;

    expect(interactables.filter(({ tile }) => tile.row > lowest).map(({ id }) => id)).toEqual([]);
  });
});

describe('the milestone of the cave', () => {
  it('is one: the cave has a single milestone', () => {
    expect(cave.milestones).toHaveLength(1);
  });

  it('is one that no way on goes round', () => {
    const [milestone] = cave.milestones ?? [];

    const goingRound = routeBetween(
      (tile) => isOpen(tile) && !(milestone !== undefined && isInZone(milestone.zone, tile)),
      wayInTile,
      isWayForward,
    );

    expect(milestone, 'a milestone in the cave').toBeDefined();
    expect(goingRound).toBeNull();
  });

  it('is given to a hero who walks the trail', () => {
    const [milestone] = cave.milestones ?? [];

    const events = walkRoute(quietGameAt(CAVE, wayInTile), trail ?? []);

    expect(events).toContainEqual({ type: 'milestone-reached', milestoneId: milestone?.id });
  });
});

describe('the Experience on the way through the cave', () => {
  const [, , , levelFive = 0, levelSix = 0] = gameContent.progression.levelThresholds;
  const coast = definitionOf(COAST);
  const woods = definitionOf(WOODS);
  const mountain = definitionOf(MOUNTAIN);

  /** The trail of an area: the path of sand from its way in to its exit to the next area, over open ground, every door and gate shut. */
  function trailOf(area: AreaDefinition, next: string): Tile[] | null {
    const isOpenIn = openTilesOf(gameContent, area);
    const forward = (area.exits ?? []).find(({ to }) => to.area === next);
    return routeBetween(
      (tile) => isOpenIn(tile) && gameContent.terrain[area.layout[tile.row]?.[tile.col] ?? '']?.kind === 'sand',
      (area.entrances ?? [])[0]?.tile ?? { col: 0, row: 0 },
      (tile) => forward !== undefined && isInZone(forward.zone, tile),
    );
  }

  /** The way from where the adventure begins to the exit of the coast, over open ground. */
  const coastRoute = routeBetween(openTilesOf(gameContent, coast), gameContent.start.tile, (tile) =>
    (coast.exits ?? []).some(({ zone }) => isInZone(zone, tile)),
  );

  it('gives a hero who fights what it meets from the start to the exit of the cave, and passes the milestones, the Experience of Level 5', () => {
    const earned =
      experienceOfAll(gameContent, metOn(gameContent, coast, coastRoute)) +
      milestonesOf(coast) +
      experienceOfAll(gameContent, metOn(gameContent, woods, trailOf(woods, MOUNTAIN))) +
      milestonesOf(woods) +
      experienceOfAll(gameContent, metOn(gameContent, mountain, trailOf(mountain, CAVE))) +
      milestonesOf(mountain) +
      experienceOfAll(gameContent, metOn(gameContent, cave, trail)) +
      milestonesOf(cave);

    expect(earned).toBeGreaterThanOrEqual(levelFive);
  });

  it('does not give a hero who clears the coast, the woods, the mountain and the cave the Experience of Level 6: nobody has to grind', () => {
    const everything = [coast, woods, mountain, cave].reduce(
      (sum, area) => sum + experienceOfAll(gameContent, area.monsters) + milestonesOf(area),
      0,
    );

    expect(everything).toBeLessThan(levelSix);
  });
});

describe('the text of the cave', () => {
  it('is a short line, not a page', () => {
    expect(cave.text).toBeTypeOf('string');
    expect(cave.text?.length).toBeLessThanOrEqual(60);
  });
});
