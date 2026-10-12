import { describe, expect, it } from 'vitest';
import type { CheckpointDefinition, ContentDefinition, Game, MonsterPlacement } from '../src/core';
import { world } from './cellar-fixtures';
import {
  ARENA_LAYOUT,
  ATTACK,
  BITER,
  CLOSE_INVENTORY,
  INTERACT,
  OPEN_INVENTORY,
  WITH_BOW,
  advance,
  arena,
  biterAt,
  cacheAt,
  chestAt,
  continuedFrom,
  expectAccepted,
  expectRefused,
  face,
  frailMonster,
  inventoryOf,
  newGame,
  playingView,
  scriptedRandom,
  strike,
  untilDefeated,
  walk,
} from './fixtures';

// A monster of an Adventure Area can carry a piece of Gear: the hero takes it when it defeats that monster, with the
// same event that a chest's Gear gives, so that the notice tells the player to press I to equip it.
//
// The hero stands at (3.5, 3.5) facing down. The carrier of these tests has 1 Health, is worth 1 Experience and stands
// on the tile (3, 4), right below the hero, so that a strike defeats it. What it carries is the iron sword.

const CARRIER_BELOW: MonsterPlacement = { id: 'carrier', type: 'carrier', tile: { col: 3, row: 4 }, carries: 'iron-sword' };

const IRON_SWORD_PICKED_UP = {
  type: 'pickup',
  item: { kind: 'gear', id: 'iron-sword', name: 'Iron Sword', slot: 'melee-weapon', stat: 'attack', bonus: 2 },
} as const;

/** What a strike that defeats the carrier below says, before it gives what it carries. */
const DEFEAT_EVENTS = [
  { type: 'hero-attacked' },
  { type: 'monster-hit', monsterId: 'carrier', damage: 1, health: 0 },
  { type: 'monster-defeated', monsterId: 'carrier' },
  { type: 'experience-gained', amount: 1 },
] as const;

function arenaWithCarrierBelow() {
  return arena({ monsters: [CARRIER_BELOW], monsterTypes: { carrier: frailMonster(1) } });
}

function carriedIds(game: Game): string[] {
  return inventoryOf(game).gear.map(({ id }) => id);
}

/** The ids of what the hero carries when it took the iron sword from the carrier, once, in the order it found it. */
const WITH_IRON_SWORD = ['basic-sword', 'iron-sword', 'basic-armor'];

function ammunitionPickedUp(amount: number) {
  return { type: 'pickup', item: { kind: 'consumable', id: 'ammunition', amount } } as const;
}

describe('Gear carried by a monster', () => {
  it('is given when the monster is defeated by a strike: the hero takes it at once, after the Experience', () => {
    const game = newGame(arenaWithCarrierBelow());

    expect(strike(game)).toMatchObject([...DEFEAT_EVENTS, IRON_SWORD_PICKED_UP]);

    expect(carriedIds(game)).toEqual(WITH_IRON_SWORD);
  });

  it('is announced by the same event that a chest gives for the same Gear', () => {
    const chestGame = newGame(arena({ interactables: [chestAt('chest', 3, 4, 'iron-sword')] }));
    const chestEvents = chestGame.send(INTERACT);
    const game = newGame(arenaWithCarrierBelow());

    const events = strike(game);

    expect(chestEvents).toContainEqual(IRON_SWORD_PICKED_UP);
    expect(events.filter((event) => event.type === 'pickup')).toEqual(
      chestEvents.filter((event) => event.type === 'pickup'),
    );
  });

  it('is not given before the monster is defeated: a hit that leaves it standing gives nothing', () => {
    const sturdy = { ...frailMonster(1), health: 2 };
    const game = newGame(arena({ monsters: [CARRIER_BELOW], monsterTypes: { carrier: sturdy } }));

    expect(strike(game)).toMatchObject([
      { type: 'hero-attacked' },
      { type: 'monster-hit', monsterId: 'carrier', damage: 1, health: 1 },
    ]);
    expect(carriedIds(game)).toEqual(['basic-sword', 'basic-armor']);

    expect(strike(game)).toContainEqual(IRON_SWORD_PICKED_UP);
    expect(carriedIds(game)).toEqual(WITH_IRON_SWORD);
  });

  it('is not given by a monster that stands beside the carrier: only the carrier gives it', () => {
    const content = arena({
      monsters: [CARRIER_BELOW, { id: 'bystander', type: 'bystander', tile: { col: 4, row: 3 } }],
      monsterTypes: { carrier: { ...frailMonster(1), health: 5 }, bystander: frailMonster(1) },
    });
    const game = newGame(content);
    face(game, 'right');

    expect(strike(game)).toContainEqual({ type: 'monster-defeated', monsterId: 'bystander' });

    expect(carriedIds(game)).toEqual(['basic-sword', 'basic-armor']);
  });

  it('is given when an arrow defeats the monster as well as when a strike does', () => {
    const content = arena({
      hero: { startingGear: WITH_BOW },
      interactables: [cacheAt('cache-1', 3, 4, 3)],
      monsters: [{ ...CARRIER_BELOW, tile: { col: 5, row: 3 } }],
      monsterTypes: { carrier: frailMonster(1) },
    });
    const game = newGame(content);
    game.send(INTERACT);
    game.send({ type: 'switch-weapon' });
    face(game, 'right');
    game.send(ATTACK);

    expect(advance(game, 10)).toMatchObject([
      { type: 'monster-hit', monsterId: 'carrier', damage: 3, health: 0 },
      { type: 'monster-defeated', monsterId: 'carrier' },
      { type: 'experience-gained', amount: 1 },
      IRON_SWORD_PICKED_UP,
    ]);

    expect(carriedIds(game)).toEqual(['basic-sword', 'iron-sword', 'short-bow', 'basic-armor']);
  });
});

describe('The drops of a monster that carries Gear', () => {
  const DROPPING = { ...frailMonster(1), drops: [{ consumable: 'ammunition', chance: 0.5, amount: 2 }] } as const;

  it('roll as they did, once each, and the Gear asks for no random number: its event comes last', () => {
    const script = scriptedRandom(0.1);
    const content = arena({ monsters: [CARRIER_BELOW], monsterTypes: { carrier: DROPPING } });
    const game = newGame(content, script.random);

    // The notice tells the player about the latest thing the hero took, and the Gear is the one that asks for a key.
    expect(strike(game)).toMatchObject([...DEFEAT_EVENTS, ammunitionPickedUp(2), IRON_SWORD_PICKED_UP]);

    expect(script.asked()).toBe(1);
    expect(playingView(game).hero.consumables.ammunition).toBe(2);
  });

  it('are not rolled for a monster that has no drop table, and the Gear asks for no random number either', () => {
    const script = scriptedRandom();
    const game = newGame(arenaWithCarrierBelow(), script.random);

    expect(strike(game)).toMatchObject([...DEFEAT_EVENTS, IRON_SWORD_PICKED_UP]);

    expect(script.asked()).toBe(0);
  });
});

describe('Gear carried by a monster that comes back after the hero is defeated', () => {
  // The hero touches the camp, which is the Checkpoint of the arena, turns left and strikes the carrier on the tile
  // (2, 4) before the biter beside it hits for all of its 5 Health on the 31st step. The hero is back on the camp when
  // the cooldown of its strike is over, and the carrier is back with the arena, as every monster of the Checkpoint's
  // Adventure Area is.
  const CAMP: CheckpointDefinition = { id: 'camp', tile: { col: 3, row: 4 } };
  const CARRIER_LEFT_OF_CAMP: MonsterPlacement = { ...CARRIER_BELOW, tile: { col: 2, row: 4 } };

  function arenaWithCamp(): ContentDefinition {
    return arena({
      hero: { health: 5 },
      checkpoints: [CAMP],
      monsters: [biterAt('biter', 4, 3), CARRIER_LEFT_OF_CAMP],
      monsterTypes: { carrier: frailMonster(1) },
    });
  }

  /** The hero touches the camp and defeats the carrier, and the events of that strike are returned. */
  function defeatCarrierAtTheCamp(game: Game) {
    walk(game, 'down', 3);
    face(game, 'left');
    return game.send(ATTACK);
  }

  it('is given once only: the hero that holds it is given nothing when it defeats the carrier again', () => {
    const game = newGame(arenaWithCamp());
    expect(defeatCarrierAtTheCamp(game)).toContainEqual(IRON_SWORD_PICKED_UP);
    untilDefeated(game);

    face(game, 'left');
    const events = game.send(ATTACK);

    expect(events).toContainEqual({ type: 'monster-defeated', monsterId: 'carrier' });
    expect(events.filter((event) => event.type === 'pickup')).toEqual([]);
    expect(carriedIds(game)).toEqual(WITH_IRON_SWORD);
  });

  it('is given once only also by a game that was saved after the hero took it and continued from the save', () => {
    const original = newGame(arenaWithCamp());
    defeatCarrierAtTheCamp(original);
    const restored = continuedFrom(arenaWithCamp(), original.snapshot());
    expect(carriedIds(restored), 'the snapshot holds it once').toEqual(WITH_IRON_SWORD);
    untilDefeated(restored);

    face(restored, 'left');
    const events = restored.send(ATTACK);

    expect(events).toContainEqual({ type: 'monster-defeated', monsterId: 'carrier' });
    expect(events.filter((event) => event.type === 'pickup')).toEqual([]);
    expect(carriedIds(restored)).toEqual(WITH_IRON_SWORD);
  });

  it('is given to a game continued from a save made before the hero took it, once', () => {
    const original = newGame(arenaWithCamp());
    walk(original, 'down', 3);
    face(original, 'left');
    const restored = continuedFrom(arenaWithCamp(), original.snapshot());
    expect(carriedIds(restored)).toEqual(['basic-sword', 'basic-armor']);

    expect(restored.send(ATTACK)).toContainEqual(IRON_SWORD_PICKED_UP);

    expect(carriedIds(restored)).toEqual(WITH_IRON_SWORD);
  });

  it('is kept through the defeat like all Gear, and a carrier in another Adventure Area stays defeated and gives no more', () => {
    // The hero touches the camp and goes to the cellar, where it defeats the carrier on the tile (1, 4) and equips what it
    // carried. The biter of the cellar, which hits for far more than the hero's Health, defeats it. It is back at the
    // camp in the arena, and the cellar does not bring the carrier back.
    const cellar = {
      monsters: [{ ...CARRIER_BELOW, id: 'cellar-carrier', tile: { col: 1, row: 4 } }, biterAt('cellar-biter', 3, 3)],
      checkpoints: [{ id: 'cellar-checkpoint', tile: { col: 1, row: 1 } }],
    };
    const game = newGame(
      world(
        { hero: { health: 5 }, checkpoints: [CAMP], monsterTypes: { carrier: frailMonster(1), biter: { ...BITER, damage: 100 } } },
        cellar,
      ),
    );
    walk(game, 'down', 3);
    walk(game, 'right', 11);
    walk(game, 'down', 3);
    face(game, 'left');
    expect(game.send(ATTACK)).toContainEqual(IRON_SWORD_PICKED_UP);
    game.send(OPEN_INVENTORY);
    game.send({ type: 'equip', gearId: 'iron-sword' });
    game.send(CLOSE_INVENTORY);
    untilDefeated(game);
    expect(playingView(game).area.id).toBe('arena');
    expect(inventoryOf(game).gear).toContainEqual(expect.objectContaining({ id: 'iron-sword', equipped: true }));

    walk(game, 'up', 3);
    walk(game, 'right', 11);

    expect(playingView(game).area.id).toBe('cellar');
    expect(playingView(game).monsters.map((monster) => monster.id)).toEqual(['cellar-biter']);
    expect(carriedIds(game)).toEqual(WITH_IRON_SWORD);
  });
});

describe('Gear carried by a monster that does not make sense is refused when the game is created', () => {
  // Content read from a file could say these, and the compiler would not notice.
  const WITH_CARRIER = { monsters: [CARRIER_BELOW], monsterTypes: { carrier: frailMonster(1) } };
  const CELLAR_WITH_CARRIER = {
    id: 'cellar',
    name: 'Cellar',
    layout: ARENA_LAYOUT,
    monsters: [{ id: 'cellar-carrier', type: 'carrier', tile: { col: 3, row: 4 }, carries: 'iron-sword' }],
  };

  it('is refused when the Gear does not exist: the message names the monster and the Gear', () => {
    expectRefused(
      arena({ ...WITH_CARRIER, monsters: [{ ...CARRIER_BELOW, carries: 'golden-sword' }] }),
      'Area "arena": monster "carrier" carries unknown Gear "golden-sword"',
    );
  });

  it('is refused when a chest gives the same Gear, in the same Adventure Area or in another', () => {
    expectRefused(
      arena({ ...WITH_CARRIER, interactables: [chestAt('chest', 5, 3, 'iron-sword')] }),
      'Gear "iron-sword" is given more than once: by monster "carrier" and by chest "chest"',
    );
    expectRefused(
      arena({
        monsterTypes: WITH_CARRIER.monsterTypes,
        interactables: [chestAt('chest', 5, 3, 'iron-sword')],
        otherAreas: [CELLAR_WITH_CARRIER],
      }),
      'Gear "iron-sword" is given more than once: by chest "chest" and by monster "cellar-carrier"',
    );
  });

  it('is refused when another monster carries the same Gear', () => {
    expectRefused(
      arena({ ...WITH_CARRIER, otherAreas: [CELLAR_WITH_CARRIER] }),
      'Gear "iron-sword" is given more than once: by monster "carrier" and by monster "cellar-carrier"',
    );
  });

  it('is refused when the hero starts with the same Gear', () => {
    expectRefused(
      arena({ ...WITH_CARRIER, monsters: [{ ...CARRIER_BELOW, carries: 'basic-sword' }] }),
      'Gear "basic-sword" is given more than once: by the hero\'s starting Gear and by monster "carrier"',
    );
  });

  it('is accepted when nothing else gives the Gear, and a monster that carries nothing is as it was', () => {
    expectAccepted(arena(WITH_CARRIER));
    expectAccepted(arena({ ...WITH_CARRIER, monsters: [{ ...CARRIER_BELOW, carries: undefined }] }));
  });
});
