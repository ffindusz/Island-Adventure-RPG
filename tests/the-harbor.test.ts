import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { createGame } from '../src/core';
import type { AreaDefinition, Game, Tile } from '../src/core';
import { face, fixedRandom, gameAtTitle, interactableViews, newGame, playingView, walk } from './fixtures';
import {
  directionBetween,
  isInZone,
  keyOf,
  neighboursOf,
  openTilesOf,
  routeBetween,
  walkRoute,
  withoutOrdinaryMonsters,
} from './routes';

// The old vessel in the forgotten harbor, at the east end of the castle, behind the Guardian's gate: the hero prepares it
// there, and sails home. Like the other tests of the shipped content, these read the map and the lists of the content and
// play the hero over them with the core's own rules, so that moving a tile never breaks them unless the harbor stops being
// what it is for. The rules of the vessel and of the question are tested on purpose-built content (vessel-validation.test.ts,
// departure.test.ts, ending.test.ts); what these test is that the content uses them as it should, and that the hero who
// has defeated the Guardian walks from the way in of the castle to the vessel and sails home. The words of the ending
// are tested in the-credits.test.ts.

const CASTLE = 'castle';
const GUARDIAN_ID = 'arena-guardian';
const GATE_ID = 'harbor-gate';
const VESSEL_ID = 'old-vessel';
const CHECKPOINT_ID = 'guardian-checkpoint';

/** The tiles of the arena, where the way to the vessel crosses to the gate in its far wall. */
const ARENA = { col: 68, row: 7, width: 16, height: 9 };

/** The rows at the bottom of an area where the view stops, so that the notice would be drawn over a hero standing there. */
const BOTTOM_ROWS = 3;

/** The kinds of interactable that a hero must not need to get to the vessel, but for the Guardian's gate. */
const PUZZLE_KINDS: readonly string[] = ['key', 'door', 'gate', 'lever'];

function definitionOf(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The shipped content has no Adventure Area "${id}"`);
  }
  return area;
}

const castle = definitionOf(CASTLE);
const wayIn = (castle.entrances ?? [])[0];
const wayInTile: Tile = wayIn?.tile ?? { col: 0, row: 0 };
const guardian = castle.monsters.find(({ id }) => id === GUARDIAN_ID);
const guardianTile: Tile = guardian?.tile ?? { col: 0, row: 0 };
const gateTile: Tile = (castle.interactables ?? []).find(({ id }) => id === GATE_ID)?.tile ?? { col: 0, row: 0 };
const vesselTile: Tile = (castle.interactables ?? []).find(({ id }) => id === VESSEL_ID)?.tile ?? { col: 0, row: 0 };

/** Where the hero can stand with every door and gate shut, as it begins, and with them all open, as it is once the puzzles are solved. */
const isOpen = openTilesOf(gameContent, castle);
const isOpenOnceOpened = openTilesOf(gameContent, castle, true);
/** Where the hero can stand once the Guardian has fallen, which opens its gate and nothing else. */
const isOpenOnceGuardianFell = (tile: Tile) => isOpen(tile) || keyOf(tile) === keyOf(gateTile);

/** The tiles from which the hero uses the vessel: those that touch it, and are ground. */
const quay = neighboursOf(vesselTile).filter(isOpenOnceOpened);
const isByVessel = (tile: Tile) => quay.some((spot) => keyOf(spot) === keyOf(tile));

const kindAt = ({ col, row }: Tile): string | undefined => gameContent.terrain[castle.layout[row]?.[col] ?? '']?.kind;

function tileOf({ x, y }: { readonly x: number; readonly y: number }): Tile {
  return { col: Math.floor(x), row: Math.floor(y) };
}

describe('the vessel of the island', () => {
  it('is the only vessel of the game, and it lies in the castle', () => {
    const vessels = gameContent.areas.flatMap((area) =>
      (area.interactables ?? []).flatMap((item) => (item.kind === 'vessel' ? [{ area: area.id, id: item.id }] : [])),
    );

    expect(vessels).toEqual([{ area: CASTLE, id: VESSEL_ID }]);
  });

  it('loads with the rest of the shipped content, which asks for it: the content check, with its rules for a vessel, passes', () => {
    expect(gameContent.requireGuardian).toBe(true);
    expect(() => createGame({ content: gameContent, random: fixedRandom })).not.toThrow();
  });

  it('stands at the water\'s edge, with ground beside it for the hero: water lies against it on one side and the quay on another', () => {
    expect(neighboursOf(vesselTile).some((tile) => kindAt(tile) === 'water')).toBe(true);
    expect(quay.length).toBeGreaterThan(0);
  });

  it('keeps itself and the ground in front of it out of the bottom rows, where the notice is drawn over the hero', () => {
    for (const { row } of [vesselTile, ...quay]) {
      expect(row).toBeLessThan(castle.layout.length - BOTTOM_ROWS);
    }
  });

  it('begins unprepared, with no question asked: a new game in the castle shows the vessel as it was found', () => {
    const game = newGame({ ...QUIET, start: { area: CASTLE, tile: wayInTile } });

    expect(interactableViews(game, 'vessel')).toMatchObject([{ id: VESSEL_ID, prepared: false }]);
    expect(playingView(game).departure).toBeNull();
  });
});

describe('the way to the vessel', () => {
  it('is shut to the hero while the Guardian lives: with every door and gate shut no way leads from the way in to the ground beside the vessel', () => {
    expect(routeBetween(isOpen, wayInTile, isByVessel)).toBeNull();
  });

  it('is open once the Guardian has fallen: its gate opens the way from the way in, through the gateway and the arena, to the vessel', () => {
    const route = routeBetween(isOpenOnceGuardianFell, wayInTile, isByVessel);

    expect(route).not.toBeNull();
    const at = (isPlace: (tile: Tile) => boolean) => (route ?? []).findIndex(isPlace);
    const checkpoint = at((tile) =>
      (castle.checkpoints ?? []).some(({ id, tile: place }) => id === CHECKPOINT_ID && keyOf(place) === keyOf(tile)),
    );
    const arena = at((tile) => isInZone(ARENA, tile));
    const gate = at((tile) => keyOf(tile) === keyOf(gateTile));
    expect(checkpoint).toBeGreaterThan(0);
    expect(arena).toBeGreaterThan(checkpoint);
    expect(gate).toBeGreaterThan(arena);
    expect((route ?? []).length).toBeGreaterThan(gate + 1);
  });

  it('needs no key, lever or door: the only thing of the kinds a puzzle is made of that lies on the way is the Guardian\'s gate', () => {
    const route = new Set((routeBetween(isOpenOnceGuardianFell, wayInTile, isByVessel) ?? []).map(keyOf));

    const onTheWay = (castle.interactables ?? []).filter(
      ({ kind, tile }) => PUZZLE_KINDS.includes(kind) && route.has(keyOf(tile)),
    );

    expect(onTheWay.map(({ id }) => id)).toEqual([GATE_ID]);
  });
});

// The hero who has defeated the Guardian. The scene is the game's own doing: it puts the hero beside the Guardian with one
// Health left, which one strike takes, and plays the strike, so that the Guardian falls and its gate opens as they do in
// play. The saved game of that moment is then taken up again with the hero back at the way in of the castle, as a hero
// who has walked back would be. Every ordinary monster is taken out, for the walk is not about them. The hero is of
// Level 6, the cap, with its five Stat Points spent, as one who has come this far is: the Experience of the Guardian then
// raises no Level, so that no Stat Point waits to be assigned, which would hold the game.

const QUIET = { ...gameContent, areas: withoutOrdinaryMonsters(gameContent) };

/** Next to the Guardian, to its west, in reach of a strike to the right. */
const BESIDE_GUARDIAN = { x: guardianTile.col - 1, y: guardianTile.row + 0.5 };

function afterTheFall(): Game {
  const scene = newGame(QUIET).snapshot();
  scene.state.areaId = CASTLE;
  scene.state.hero.position = BESIDE_GUARDIAN;
  scene.state.hero.facing = 'right';
  scene.state.hero.experience = 100;
  scene.state.hero.statPoints = { health: 2, attack: 2, defense: 1 };
  const monster = scene.state.areas[CASTLE]?.monsters.find(({ id }) => id === GUARDIAN_ID);
  if (monster === undefined) {
    throw new Error('The saved game has no Guardian in the castle');
  }
  monster.health = 1;
  const fighting = gameAtTitle(QUIET);
  fighting.send({ type: 'continue', snapshot: scene });
  expect(fighting.send({ type: 'attack' })).toContainEqual({ type: 'guardian-defeated', monsterId: GUARDIAN_ID });

  const fallen = fighting.snapshot();
  fallen.state.hero.position = { x: wayInTile.col + 0.5, y: wayInTile.row + 0.5 };
  fallen.state.hero.facing = 'right';
  const game = gameAtTitle(QUIET);
  game.send({ type: 'continue', snapshot: fallen });
  return game;
}

/** The hero who has defeated the Guardian walks from the way in to the ground beside the vessel and faces it. Returns the game and what happened on the way. */
function atTheVessel() {
  const game = afterTheFall();
  const route = routeBetween(isOpenOnceOpened, wayInTile, isByVessel);
  const events = walkRoute(game, route ?? []);
  face(game, directionBetween(tileOf(playingView(game).hero.position), vesselTile));
  return { game, events };
}

describe('the walk to the vessel', () => {
  it('is made by walking alone once the Guardian has fallen: over the Checkpoint, across the arena and through its open gate, to the ground beside the vessel', () => {
    const { game, events } = atTheVessel();

    expect(events).toContainEqual({ type: 'checkpoint-activated', checkpointId: CHECKPOINT_ID });
    expect(events.filter(({ type }) => type === 'hero-hit')).toEqual([]);
    expect(playingView(game).area.id).toBe(CASTLE);
    expect(isByVessel(tileOf(playingView(game).hero.position))).toBe(true);
  });

  it('prepares the vessel with Interact: one event, a vessel that shows prepared, and no question yet', () => {
    const { game } = atTheVessel();

    expect(game.send({ type: 'interact' })).toEqual([{ type: 'vessel-prepared', vesselId: VESSEL_ID }]);

    expect(interactableViews(game, 'vessel')).toMatchObject([{ id: VESSEL_ID, prepared: true }]);
    expect(playingView(game).departure).toBeNull();
  });

  it('asks whether to sail home when Interact is used again, and lets the hero stay: the vessel stays prepared and the hero walks off', () => {
    const { game } = atTheVessel();
    game.send({ type: 'interact' });

    expect(game.send({ type: 'interact' })).toEqual([]);
    expect(playingView(game).departure).toEqual({ vesselId: VESSEL_ID });
    game.send({ type: 'cancel-departure' });

    expect(playingView(game).departure).toBeNull();
    expect(interactableViews(game, 'vessel')).toMatchObject([{ id: VESSEL_ID, prepared: true }]);
    const before = playingView(game).hero.position.x;
    walk(game, 'left', 8);
    expect(playingView(game).hero.position.x).toBeLessThan(before);
  });

  it('sails home when the hero confirms: the ending and the credits of the game are told, and the game is at the title', () => {
    const { game } = atTheVessel();
    game.send({ type: 'interact' });
    game.send({ type: 'interact' });

    expect(game.send({ type: 'confirm-departure' })).toEqual([
      { type: 'ending-reached', ending: gameContent.ending, credits: gameContent.credits },
    ]);

    expect(game.view()).toEqual({ phase: 'title' });
  });
});
