import { describe, expect, it } from 'vitest';
import { PAGE_IDS } from '../src/core';
import type { AreaDefinition, Direction, InteractableDefinition } from '../src/core';
import {
  ARENA_LAYOUT,
  INTERACT,
  OPEN_INVENTORY,
  advance,
  arena,
  biterAt,
  chestAt,
  chestViews,
  continuedFrom,
  face,
  gameAtTitle,
  milestone,
  monsterNamed,
  newGame,
  playingView,
  walk,
} from './fixtures';

// The hero stands at (3.5, 3.5) and faces down, its body 0.5 tiles wide, and it interacts with what is within 0.5 tile
// of its body in front of it. A chest fills the tile it stands on.

const STEEL_SWORD_PICKED_UP = {
  type: 'pickup',
  item: { kind: 'gear', id: 'steel-sword', name: 'Steel Sword', slot: 'melee-weapon', stat: 'attack', bonus: 5 },
} as const;

/** A game where the hero stands above a chest, on the tile (3, 4), that holds the steel sword. The hero faces it. */
function gameWithChestBelow() {
  return newGame(arena({ interactables: [chestAt('chest-1', 3, 4, 'steel-sword')] }));
}

/** A second Adventure Area, which the hero does not reach, with the given interactables. */
function cellarWith(...interactables: InteractableDefinition[]): AreaDefinition {
  return { id: 'cellar', name: 'Cellar', layout: ARENA_LAYOUT, monsters: [], interactables };
}

function carriedIds(game: ReturnType<typeof newGame>): string[] {
  game.send(OPEN_INVENTORY);
  const { page } = playingView(game);
  game.send({ type: 'close-page', page: 'inventory' });
  return page?.id === 'inventory' ? page.gear.map((gear) => gear.id) : [];
}

describe('opening a chest', () => {
  it('is done with Interact when the hero faces the chest within reach: it opens and its Gear is picked up', () => {
    const game = gameWithChestBelow();

    expect(game.send(INTERACT)).toEqual([{ type: 'chest-opened', chestId: 'chest-1' }, STEEL_SWORD_PICKED_UP]);
  });

  it('shows the chest closed until it is opened', () => {
    const game = gameWithChestBelow();
    const chest = { kind: 'chest', id: 'chest-1', position: { x: 3.5, y: 4.5 }, size: 1, holds: 'gear' };

    expect(playingView(game).interactables).toEqual([{ ...chest, opened: false }]);

    game.send(INTERACT);

    expect(playingView(game).interactables).toEqual([{ ...chest, opened: true }]);
  });

  it('puts its Gear in the inventory without equipping it: Attack stays as it was', () => {
    const game = gameWithChestBelow();

    game.send(INTERACT);
    game.send(OPEN_INVENTORY);

    expect(playingView(game).page).toMatchObject({
      gear: [
        { id: 'basic-sword', equipped: true },
        { id: 'steel-sword', name: 'Steel Sword', slot: 'melee-weapon', stat: 'attack', bonus: 5, equipped: false },
        { id: 'basic-armor', equipped: true },
      ],
      attack: 1,
    });
  });

  it('is done once: an opened chest stays opened and gives nothing more', () => {
    const game = gameWithChestBelow();
    game.send(INTERACT);

    expect(game.send(INTERACT)).toEqual([]);

    expect(carriedIds(game)).toEqual(['basic-sword', 'steel-sword', 'basic-armor']);
  });
});

describe('what the hero reaches', () => {
  it('is a chest in front of it, whichever way it faces', () => {
    const chests = { up: [3, 2], down: [3, 4], left: [2, 3], right: [4, 3] } as const;
    for (const [direction, [col, row]] of Object.entries(chests) as [Direction, readonly [number, number]][]) {
      const game = newGame(arena({ interactables: [chestAt('chest-1', col, row, 'steel-sword')] }));
      face(game, direction);

      expect(game.send(INTERACT), `a chest ${direction} of the hero`).toEqual([
        { type: 'chest-opened', chestId: 'chest-1' },
        STEEL_SWORD_PICKED_UP,
      ]);
    }
  });

  it.each<Direction>(['up', 'left', 'right'])(
    'is not a chest the hero does not face: it faces %s, the chest is below',
    (direction) => {
      const game = gameWithChestBelow();
      face(game, direction);

      expect(game.send(INTERACT)).toEqual([]);
      expect(playingView(game).interactables).toMatchObject([{ id: 'chest-1', opened: false }]);
    },
  );

  it('is not a chest beside its way: the reach is as wide as the hero, not wider', () => {
    const game = newGame(
      arena({ interactables: [chestAt('chest-1', 4, 4, 'steel-sword'), chestAt('chest-2', 2, 4, 'iron-sword')] }),
    );

    expect(game.send(INTERACT)).toEqual([]);
  });

  it('is not a chest too far away, and is one once the hero has walked up to it', () => {
    const game = newGame(arena({ interactables: [chestAt('chest-1', 5, 3, 'steel-sword')] }));
    walk(game, 'right', 5);

    expect(game.send(INTERACT), 'a body and a half away').toEqual([]);

    walk(game, 'right', 2);

    expect(game.send(INTERACT), 'within half a tile of its body').toEqual([
      { type: 'chest-opened', chestId: 'chest-1' },
      STEEL_SWORD_PICKED_UP,
    ]);
  });
});

describe('the chest Interact acts on when several are in reach', () => {
  // The hero is at x = 4.125 facing down, a body spanning 3.875 to 4.375: it overlaps both chests below it, the chest
  // on tile column 4 more than the one on column 3. At x = 4 it is as near to one as to the other.
  const LEFT = chestAt('left', 3, 4, 'iron-sword');
  const RIGHT = chestAt('right', 4, 4, 'steel-sword');

  function opens(game: ReturnType<typeof newGame>): string[] {
    return game.send(INTERACT).flatMap((event) => (event.type === 'chest-opened' ? [event.chestId] : []));
  }

  it.each([
    ['listed first', [RIGHT, LEFT]],
    ['listed last', [LEFT, RIGHT]],
  ])('is the one nearest the hero, even when it is %s', (_, interactables) => {
    const game = newGame(arena({ interactables }));
    walk(game, 'right', 5);
    face(game, 'down');

    expect(opens(game)).toEqual(['right']);
    expect(chestViews(game).map((chest) => [chest.id, chest.opened])).toEqual(
      interactables.map((chest) => [chest.id, chest.id === 'right']),
    );
  });

  it.each([
    ['left', [LEFT, RIGHT]],
    ['right', [RIGHT, LEFT]],
  ])('is the one listed first in the content when two are as near as each other: %s', (first, interactables) => {
    const game = newGame(arena({ interactables }));
    walk(game, 'right', 4);
    face(game, 'down');

    expect(opens(game)).toEqual([first]);
  });
});

describe('Interact while the game waits', () => {
  it.each(PAGE_IDS)(
    'does nothing while the %s page is open, and works once it is closed',
    (page) => {
      const game = gameWithChestBelow();
      game.send({ type: 'open-page', page });

      expect(game.send(INTERACT)).toEqual([]);
      expect(playingView(game).interactables).toMatchObject([{ opened: false }]);

      game.send({ type: 'close-page', page });

      expect(game.send(INTERACT)).toEqual([{ type: 'chest-opened', chestId: 'chest-1' }, STEEL_SWORD_PICKED_UP]);
    },
  );

  it('does nothing while a Stat Point waits to be assigned, and works once it is assigned', () => {
    const game = newGame(
      arena({
        interactables: [chestAt('chest-1', 3, 4, 'steel-sword')],
        milestones: [milestone('start', { col: 3, row: 3, width: 1, height: 1 }, 10)],
      }),
    );
    advance(game, 1);
    expect(playingView(game).levelUp).not.toBeNull();

    expect(game.send(INTERACT)).toEqual([]);

    game.send({ type: 'assign-stat-point', stat: 'attack' });

    expect(game.send(INTERACT)).toEqual([{ type: 'chest-opened', chestId: 'chest-1' }, STEEL_SWORD_PICKED_UP]);
  });

  it('does nothing at the title', () => {
    const game = gameAtTitle();

    expect(game.send(INTERACT)).toEqual([]);
  });
});

describe('a chest in the way', () => {
  it('stops the hero flush against it, whether or not it has been opened', () => {
    const game = newGame(arena({ interactables: [chestAt('chest-1', 5, 3, 'steel-sword')] }));

    walk(game, 'right', 20);
    expect(playingView(game).hero.position).toEqual({ x: 4.75, y: 3.5 });

    game.send(INTERACT);
    walk(game, 'right', 20);
    expect(playingView(game).hero.position).toEqual({ x: 4.75, y: 3.5 });
  });

  it('lets the hero go past it', () => {
    const game = newGame(arena({ interactables: [chestAt('chest-1', 3, 4, 'steel-sword')] }));

    walk(game, 'right', 8);
    walk(game, 'down', 20);

    expect(playingView(game).hero.position).toEqual({ x: 4.5, y: 4.75 });
  });

  it('stops a monster that chases the hero too, which cannot walk through it', () => {
    const game = newGame(
      arena({ monsters: [biterAt('biter', 1, 3)], interactables: [chestAt('chest-1', 2, 3, 'steel-sword')] }),
    );

    advance(game, 40);

    expect(monsterNamed(game, 'biter').position.x).toBe(1.75);
  });

  it('is not one of another Adventure Area: those are neither shown nor in the way of the hero', () => {
    const cellar = cellarWith(chestAt('cellar-chest', 5, 3, 'iron-sword'));
    const game = newGame(arena({ otherAreas: [cellar], interactables: [chestAt('chest-1', 3, 4, 'steel-sword')] }));

    walk(game, 'right', 20);

    expect(playingView(game).interactables.map((chest) => chest.id)).toEqual(['chest-1']);
    expect(playingView(game).hero.position.x).toBe(5.75);
  });
});

describe('chests and Gear in a saved game', () => {
  const content = arena({
    interactables: [chestAt('chest-1', 3, 4, 'steel-sword')],
    otherAreas: [cellarWith(chestAt('cellar-chest', 3, 4, 'iron-sword'))],
  });

  /** The hero has opened the chest below it and equipped the steel sword that was inside. */
  function gameWithSteelSwordEquipped(gameContent = content) {
    const game = newGame(gameContent);
    game.send(INTERACT);
    game.send(OPEN_INVENTORY);
    game.send({ type: 'equip', gearId: 'steel-sword' });
    game.send({ type: 'close-page', page: 'inventory' });
    return game;
  }

  it('keeps an opened chest opened: a game continued from a save finds nothing more in it', () => {
    const game = newGame(content);
    game.send(INTERACT);

    const restored = continuedFrom(content, game.snapshot());

    expect(playingView(restored).interactables).toMatchObject([{ id: 'chest-1', opened: true }]);
    expect(restored.send(INTERACT)).toEqual([]);
    expect(carriedIds(restored)).toEqual(['basic-sword', 'steel-sword', 'basic-armor']);
  });

  it('keeps a chest that was not opened closed', () => {
    const restored = continuedFrom(content, newGame(content).snapshot());

    expect(playingView(restored).interactables).toMatchObject([{ id: 'chest-1', opened: false }]);
    expect(restored.send(INTERACT)).toEqual([{ type: 'chest-opened', chestId: 'chest-1' }, STEEL_SWORD_PICKED_UP]);
  });

  it('keeps the Gear that the hero carries and has equipped', () => {
    const restored = continuedFrom(content, gameWithSteelSwordEquipped().snapshot());

    restored.send(OPEN_INVENTORY);

    expect(playingView(restored).page).toMatchObject({
      gear: [
        { id: 'basic-sword', equipped: false },
        { id: 'steel-sword', equipped: true },
        { id: 'basic-armor', equipped: true },
      ],
      attack: 6,
    });
  });

  it('keeps the chests of each Adventure Area apart: opening one leaves those of the other areas as they were', () => {
    const game = newGame(content);
    game.send(INTERACT);

    const { areas } = game.snapshot().state;

    expect(areas['arena']?.interactables).toEqual({ 'chest-1': { kind: 'chest', opened: true } });
    expect(areas['cellar']?.interactables).toEqual({ 'cellar-chest': { kind: 'chest', opened: false } });
  });

  it('keeps what the hero found, equipped and opened when the hero is defeated: defeat takes none of it back', () => {
    const doomed = arena({
      hero: { health: 5 },
      monsters: [biterAt('biter', 4, 3)],
      interactables: [chestAt('chest-1', 3, 4, 'steel-sword')],
    });
    const game = gameWithSteelSwordEquipped(doomed);

    expect(advance(game, 31).map((event) => event.type)).toContain('hero-defeated');

    expect(playingView(game).interactables).toMatchObject([{ id: 'chest-1', opened: true }]);
    game.send(OPEN_INVENTORY);
    expect(playingView(game).page).toMatchObject({
      gear: [
        { id: 'basic-sword', equipped: false },
        { id: 'steel-sword', equipped: true },
        { id: 'basic-armor', equipped: true },
      ],
      attack: 6,
    });
  });
});
