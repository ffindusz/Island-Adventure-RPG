import { describe, expect, it } from 'vitest';
import type { Game, GameEvent, PlayState } from '../src/core';
import { advance, playingView } from './fixtures';
import { CHAPTERS, adventureAfter, recorded, restoredFrom } from './saved-adventure';
import type { Frame } from './saved-adventure';

// The round trip of a saved game, at the Game core's interface: a game restored from its snapshot, after the snapshot
// has been through JSON text as in storage, is the same game. The saved adventure of saved-adventure.ts visits every
// kind of state the game has, and is restored after each chapter of its script.
//
// Held keys are not part of what is saved. They are input, not state: whoever calls the game knows which keys are
// down, and after a reload none are, so a restored game stands still until a key goes down. See the last describe.

/** The state of the saved adventure at the end of the chapter with that id. */
function stateAfter(chapter: string): PlayState {
  return adventureAfter(chapter).snapshot().state;
}

describe('the saved adventure', () => {
  // These pin the fixture itself, so that a change to it cannot quietly leave a kind of state out of the round trip.

  it('has the hero standing, facing, holding a weapon and cooling down', () => {
    const { hero } = stateAfter('volley');

    expect(hero.position).toEqual({ x: 2.5, y: 3.5 });
    expect(hero.facing).toBe('up');
    expect(hero.activeWeapon).toBe('ranged-weapon');
    expect(hero.attackCooldown).toBe(19);
    expect(hero.health).toBe(8);
  });

  it('has Experience, a Level and a Stat Point waiting to be assigned, and later one assigned', () => {
    const waiting = adventureAfter('lookout');
    const assigned = adventureAfter('camp');

    expect(waiting.snapshot().state.hero.experience).toBe(10);
    expect(playingView(waiting).levelUp).toMatchObject({ level: 2, points: 1 });
    expect(assigned.snapshot().state.hero.statPoints).toEqual({ health: 0, attack: 1, defense: 0 });
    expect(playingView(assigned).levelUp).toBeNull();
  });

  it('has Gear carried and equipped in every slot, Ammunition and Healing Potions', () => {
    const { hero } = stateAfter('loot');

    expect(hero.gear).toEqual(['basic-sword', 'basic-armor', 'leather-armor', 'short-bow', 'iron-sword']);
    expect(hero.equipped).toEqual({
      'melee-weapon': 'iron-sword',
      'ranged-weapon': 'short-bow',
      armor: 'leather-armor',
    });
    expect(stateAfter('crossing').hero.consumables).toEqual({ ammunition: 6, 'healing-potion': 2 });
  });

  it('has wounded, defeated and untouched monsters, and what a ranged attacker and a charger are doing', () => {
    const arenaMonsters = stateAfter('loot').areas['arena']?.monsters.map(({ id, health }) => [id, health]);
    const ruins = stateAfter('volley').areas['ruins']?.monsters;

    expect(arenaMonsters).toEqual([
      ['dummy', 2],
      ['rat', 1],
    ]);
    expect(stateAfter('lookout').areas['arena']?.monsters.map(({ id, health }) => [id, health])).toEqual([
      ['dummy', 2],
      ['rat', 0],
    ]);
    expect(stateAfter('wind-up').areas['ruins']?.monsters.map(({ id, action }) => [id, action])).toEqual([
      ['charger', { type: 'winding-up', zone: expect.anything(), elapsed: 11, length: 30, direction: 'left' }],
      ['shooter', { type: 'winding-up', zone: expect.anything(), elapsed: 11, length: 30 }],
    ]);
    expect(ruins?.map(({ id, action }) => [id, action])).toEqual([
      ['charger', { type: 'dashing', direction: 'left', rangeLeft: 5.5 }],
      ['shooter', { type: 'recovering', stepsLeft: 46 }],
    ]);
    const afterHits = stateAfter('hits').areas['ruins']?.monsters;
    expect(afterHits?.map(({ id, health }) => [id, health])).toEqual([
      ['charger', 3],
      ['shooter', 0],
    ]);
    expect(afterHits?.find(({ id }) => id === 'charger')?.action.type).toBe('recovering');
  });

  it('has arrows in flight: the hero\u2019s, and a projectile with the monster that shot it, which outlives it', () => {
    const inFlight = stateAfter('volley').arrows;
    const outlived = stateAfter('shooter-down');

    expect(inFlight).toEqual([
      { areaId: 'ruins', position: { x: 2.5, y: 2.25 }, direction: 'up', rangeLeft: 2.75 },
      {
        areaId: 'ruins',
        position: { x: 2.5, y: 1.625 },
        direction: 'down',
        rangeLeft: 4.875,
        shotBy: { monsterId: 'shooter', monsterType: 'shooter' },
      },
    ]);
    expect(outlived.arrows).toHaveLength(1);
    expect(outlived.arrows[0]?.shotBy).toEqual({ monsterId: 'shooter', monsterType: 'shooter' });
    expect(outlived.areas['ruins']?.monsters.find(({ id }) => id === 'shooter')?.health).toBe(0);
  });

  it('has opened and unopened chests, taken and untaken pickups, caches and keys, shut and open doors, reached and unreached milestones', () => {
    const arena = stateAfter('crossing').areas['arena'];
    const ruins = stateAfter('crossing').areas['ruins'];

    expect(arena?.interactables).toEqual({
      'armor-chest': { kind: 'chest', opened: true },
      'bow-chest': { kind: 'chest', opened: true },
      'iron-chest': { kind: 'chest', opened: true },
      'steel-chest': { kind: 'chest', opened: false },
      'arrow-cache': { kind: 'chest', opened: true },
      'spare-cache': { kind: 'chest', opened: false },
      'potion-near': { kind: 'pickup', collected: true },
      'potion-far': { kind: 'pickup', collected: true },
      'potion-spare': { kind: 'pickup', collected: false },
      'brass-key': { kind: 'key', collected: true },
      'brass-door': { kind: 'door', open: true },
    });
    expect(ruins?.interactables).toEqual({
      'ruin-cache': { kind: 'chest', opened: false },
      'ruin-potion': { kind: 'pickup', collected: false },
    });
    expect(arena?.reachedMilestones).toEqual(['lookout']);
  });

  it('has a key in the hero\u2019s hand once it is taken, and none before it is taken or once a door has taken it', () => {
    expect(stateAfter('camp').hero.keys).toEqual([]);
    expect(stateAfter('key').hero.keys).toEqual(['brass-key']);
    expect(stateAfter('door').hero.keys).toEqual([]);
    expect(stateAfter('defeat').hero.keys).toEqual([]);
  });

  it('has a door shut until its key opens it, and open from then on', () => {
    const door = (chapter: string) => stateAfter(chapter).areas['arena']?.interactables['brass-door'];

    expect(door('key')).toEqual({ kind: 'door', open: false });
    expect(door('door')).toEqual({ kind: 'door', open: true });
    expect(door('defeat')).toEqual({ kind: 'door', open: true });
  });

  it('has visited the first area and, from the crossing on, the second, with its text showing', () => {
    expect(stateAfter('camp').areas['ruins']?.visited).toBe(false);

    const crossed = stateAfter('crossing');

    expect(crossed.areas['arena']?.visited).toBe(true);
    expect(crossed.areas['ruins']?.visited).toBe(true);
    expect(crossed.areaText).toEqual({ text: 'Broken walls rise from the sand.', stepsLeft: 240 });
  });

  it('has the most recent Checkpoint, with the consumables and the pickups taken when it was touched', () => {
    const { checkpoint } = stateAfter('camp');

    expect(checkpoint).toEqual({
      areaId: 'arena',
      tile: { col: 3, row: 3 },
      consumables: { ammunition: 6, 'healing-potion': 1 },
      collected: ['arrow-cache', 'potion-near'],
    });
    // The potion taken afterwards, and the Ammunition shot, are not in it.
    expect(stateAfter('hits').checkpoint).toEqual(checkpoint);
  });

  it('has Automap discoveries in both areas, some tiles revealed and some not', () => {
    const { areas } = stateAfter('volley');

    for (const id of ['arena', 'ruins']) {
      const revealed = areas[id]?.revealed.flat();
      expect(revealed).toContain(true);
      expect(revealed).toContain(false);
    }
  });

  it('has an open page and the pause of a Stat Point that waits', () => {
    expect(stateAfter('loot').page).toBe('inventory');
    expect(stateAfter('lookout').page).toBeNull();
    expect(playingView(adventureAfter('lookout')).levelUp).not.toBeNull();
  });
});

/** Fails at the first frame where the two recordings differ, with that frame's difference, instead of a huge diff. */
function expectSameFrames(restored: readonly Frame[], original: readonly Frame[]): void {
  expect(restored).toHaveLength(original.length);
  const first = original.findIndex((frame, index) => JSON.stringify(frame) !== JSON.stringify(restored[index]));
  if (first >= 0) {
    expect(restored[first], `frame ${first} after the restore`).toEqual(original[first]);
    expect.fail(`frame ${first} after the restore differs, though toEqual finds no difference`);
  }
}

describe.each(CHAPTERS.map((chapter, index) => ({ ...chapter, index })))(
  'a game restored after the chapter "$id", where the hero $does',
  ({ id, index }) => {
    it('looks as the game looked', () => {
      const original = adventureAfter(id);

      const restored = restoredFrom(original.snapshot());

      expect(restored.view()).toEqual(original.view());
    });

    it('holds what the game held: its snapshot is the same', () => {
      const original = adventureAfter(id);

      const restored = restoredFrom(original.snapshot());

      expect(restored.snapshot()).toEqual(original.snapshot());
    });

    it('lives the rest of the adventure exactly as the game that was never saved does', () => {
      const original = recorded(adventureAfter(id));
      const restored = recorded(restoredFrom(original.game.snapshot()));

      for (const chapter of CHAPTERS.slice(index + 1)) {
        chapter.play(original.game);
        chapter.play(restored.game);
      }
      advance(original.game, 60);
      advance(restored.game, 60);

      expectSameFrames(restored.frames, original.frames);
    });
  },
);

describe('a game restored while it was paused', () => {
  it('waits for the page to be closed, as the game did', () => {
    const restored = restoredFrom(adventureAfter('loot').snapshot());
    const waiting = restored.view();

    expect(advance(restored, 30)).toEqual([]);
    expect(restored.view()).toEqual(waiting);

    restored.send({ type: 'close-page', page: 'inventory' });
    restored.send({ type: 'move', direction: 'down' });
    advance(restored, 8);

    expect(playingView(restored).hero.position).toEqual({ x: 6.5, y: 4.5 });
  });

  it('waits for the Stat Point to be assigned, as the game did', () => {
    const restored = restoredFrom(adventureAfter('lookout').snapshot());
    const waiting = restored.view();

    expect(advance(restored, 30)).toEqual([]);
    expect(restored.view()).toEqual(waiting);

    restored.send({ type: 'assign-stat-point', stat: 'defense' });
    restored.send({ type: 'move', direction: 'left' });
    advance(restored, 2);

    expect(playingView(restored).levelUp).toBeNull();
    expect(playingView(restored).hero.position).toEqual({ x: 3.25, y: 4.5 });
  });
});

describe('a defeat after Continue', () => {
  // After the chapter "hits" the hero has 2 of its 8 Health left, in the ruins, and the most recent Checkpoint is the
  // camp in the arena. The charger rests after its first hit and the next one defeats the hero.

  function untilDefeated(game: Game): GameEvent[] {
    const events: GameEvent[] = [];
    for (let step = 0; step < 500; step++) {
      events.push(...game.step());
      if (events.some((event) => event.type === 'hero-defeated')) {
        return events;
      }
    }
    throw new Error('The hero was not defeated in 500 steps');
  }

  it('goes exactly as it goes in the game that was never saved', () => {
    const never = adventureAfter('hits');
    const restored = restoredFrom(never.snapshot());

    const events = untilDefeated(never);

    expect(untilDefeated(restored)).toEqual(events);
    expect(restored.view()).toEqual(never.view());
    expect(restored.snapshot()).toEqual(never.snapshot());
  });

  it('sends the hero back to the Checkpoint with what it had there, and keeps what it earned since', () => {
    const restored = restoredFrom(adventureAfter('hits').snapshot());

    const events = untilDefeated(restored);

    expect(events.map((event) => event.type).slice(-3)).toEqual(['hero-hit', 'hero-defeated', 'area-changed']);
    const view = playingView(restored);
    expect(view.area.id).toBe('arena');
    expect(view.hero).toMatchObject({
      position: { x: 3.5, y: 3.5 },
      health: 8,
      consumables: { ammunition: 6, 'healing-potion': 1 },
    });
    const { hero, areas } = restored.snapshot().state;
    expect(hero.experience).toBe(16); // the rat and the shooter, and the lookout: nothing is lost
    expect(hero.gear).toHaveLength(5);
    expect(hero.keys).toEqual([]); // the door took the brass key before the defeat, and defeat does not give it back
    expect(areas['arena']?.interactables['brass-key']).toEqual({ kind: 'key', collected: true });
    expect(areas['arena']?.interactables['brass-door']).toEqual({ kind: 'door', open: true }); // opened after the Checkpoint
    expect(areas['arena']?.interactables['potion-far']).toEqual({ kind: 'pickup', collected: false }); // taken after
    expect(areas['arena']?.interactables['potion-near']).toEqual({ kind: 'pickup', collected: true }); // taken before
    expect(areas['arena']?.monsters.map(({ health }) => health)).toEqual([3, 1]); // the dummy and the rat are back
    expect(areas['ruins']?.monsters.find(({ id }) => id === 'shooter')?.health).toBe(0); // the ruins stay as they were
  });
});

describe('held keys', () => {
  it('are not saved: a restored hero stands still until a key goes down, though it faces the way it did', () => {
    const original = adventureAfter('camp');
    original.send({ type: 'move', direction: 'down' });
    const restored = restoredFrom(original.snapshot());

    advance(original, 8);
    advance(restored, 8);

    expect(playingView(original).hero.position).toEqual({ x: 3.25, y: 4.5 });
    expect(playingView(restored).hero.position).toEqual({ x: 3.25, y: 3.5 });
    expect(playingView(restored).hero.facing).toBe('down');

    restored.send({ type: 'move', direction: 'down' });
    advance(restored, 8);

    expect(playingView(restored).hero.position).toEqual({ x: 3.25, y: 4.5 });
  });
});
