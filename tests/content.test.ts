import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type {
  ChaserMonsterDefinition,
  ContentDefinition,
  GearDefinition,
  HeroDefinition,
  InteractableDefinition,
  MonsterTypeDefinition,
  TileRect,
} from '../src/core';
import { ARENA_LAYOUT, arena, BITER, chestAt, dummyAt, fixedRandom, frailMonster, milestone } from './fixtures';
import { CHARGER, SHOOTER } from './enemy-fixtures';
import { GUARDIAN } from './guardian-fixtures';

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

/** A milestone in the arena, whose map is 7 tiles wide and 6 high. */
function arenaWithMilestone(zone: TileRect, experience = 4): ContentDefinition {
  return arena({ milestones: [milestone('gate', zone, experience)] });
}

describe('content that does not make sense is refused when the game is created', () => {
  it('a layout uses a terrain symbol that the legend does not define', () => {
    const layout = ['#######', '#.....#', '#.?...#', '#.....#', '#...,.#', '#######'];

    expectRefused(arena({ layout }), 'Area "arena": row 2 uses terrain symbol "?", which the legend does not define');
  });

  it('a layout has rows of different lengths', () => {
    const layout = ['#######', '#.....#', '#....#', '#.....#', '#...,.#', '#######'];

    expectRefused(arena({ layout }), 'Area "arena": row 2 is 6 tiles wide, but the first row is 7 tiles wide');
  });

  it('a monster has a type that does not exist', () => {
    const monsters = [{ id: 'ogre-1', type: 'ogre', tile: { col: 5, row: 3 } }];

    expectRefused(arena({ monsters }), 'Area "arena": monster "ogre-1" has unknown type "ogre"');
  });

  it('two monsters have the same id, even in different Adventure Areas', () => {
    const cellar = { id: 'cellar', name: 'Cellar', layout: ARENA_LAYOUT, monsters: [dummyAt('dummy-1', 2, 2)] };

    expectRefused(
      arena({ monsters: [dummyAt('dummy-1', 5, 3)], otherAreas: [cellar] }),
      'Monster id "dummy-1" is used more than once',
    );
  });

  it('two Adventure Areas have the same id', () => {
    const second = { id: 'arena', name: 'Another arena', layout: ARENA_LAYOUT, monsters: [] };

    expectRefused(arena({ otherAreas: [second] }), 'Area id "arena" is used more than once');
  });

  it('two milestones have the same id, even in different Adventure Areas', () => {
    const zone = { col: 1, row: 1, width: 1, height: 1 };
    const cellar = {
      id: 'cellar',
      name: 'Cellar',
      layout: ARENA_LAYOUT,
      monsters: [],
      milestones: [milestone('gate', zone, 1)],
    };

    expectRefused(
      arena({ milestones: [milestone('gate', zone, 1)], otherAreas: [cellar] }),
      'Milestone id "gate" is used more than once',
    );
  });

  it('the game starts in an Adventure Area that does not exist', () => {
    const start = { area: 'nowhere', tile: { col: 3, row: 3 } };

    expectRefused(arena({ start, monsters: [dummyAt('dummy-1', 5, 3)] }), 'The start is in unknown area "nowhere"');
  });

  it('the hero starts on solid terrain', () => {
    const start = { area: 'arena', tile: { col: 2, row: 2 } }; // the water

    expectRefused(arena({ start }), 'The start tile (col 2, row 2) of area "arena" is solid terrain or outside the map');
  });

  it('the hero starts outside the map', () => {
    const start = { area: 'arena', tile: { col: 9, row: 3 } };

    expectRefused(arena({ start }), 'The start tile (col 9, row 3) of area "arena" is solid terrain or outside the map');
  });

  it('a monster stands on solid terrain', () => {
    expectRefused(
      arena({ monsters: [dummyAt('dummy-1', 2, 2)] }),
      'Area "arena": monster "dummy-1" is placed at (col 2, row 2), which is solid terrain or outside the map',
    );
  });

  it('a monster type has a behavior that does not exist', () => {
    // Content read from a file could say this, and the compiler would not notice.
    const ghost = { behavior: 'teleporter', health: 3, size: 0.5, experience: 1 } as unknown as MonsterTypeDefinition;

    expectRefused(arena({ monsterTypes: { ghost } }), 'Monster type "ghost" has unknown behavior "teleporter"');
  });
});

describe('numbers the rules cannot work with are refused when the game is created', () => {
  const biterWith = (changes: Partial<ChaserMonsterDefinition>) =>
    arena({ monsterTypes: { biter: { ...BITER, ...changes } } });

  it.each([
    {
      what: 'a hero with no Health',
      content: arena({ hero: { health: 0 } }),
      message: "The hero's health must be more than 0, but it is 0",
    },
    {
      what: 'a hero with negative Defense',
      content: arena({ hero: { defense: -1 } }),
      message: "The hero's defense must be 0 or more, but it is -1",
    },
    {
      what: 'a hero with no body',
      content: arena({ hero: { size: 0 } }),
      message: "The hero's size must be more than 0, but it is 0",
    },
    {
      what: 'a hero with a negative size',
      content: arena({ hero: { size: -0.5 } }),
      message: "The hero's size must be more than 0, but it is -0.5",
    },
    {
      what: 'a hero who cannot walk',
      content: arena({ hero: { speedTilesPerSecond: 0 } }),
      message: "The hero's speed must be more than 0, but it is 0",
    },
    {
      what: 'a hero who walks backwards',
      content: arena({ hero: { speedTilesPerSecond: -5 } }),
      message: "The hero's speed must be more than 0, but it is -5",
    },
    {
      what: 'a hero with negative Attack',
      content: arena({ hero: { attack: -1 } }),
      message: "The hero's attack must be 0 or more, but it is -1",
    },
    {
      what: 'a hero whose attack cooldown is not a number',
      content: arena({ hero: { attackCooldownMs: Number.NaN } }),
      message: "The hero's attack cooldown must be 0 or more, but it is NaN",
    },
    {
      what: 'a hero with a negative attack cooldown',
      content: arena({ hero: { attackCooldownMs: -400 } }),
      message: "The hero's attack cooldown must be 0 or more, but it is -400",
    },
    {
      what: 'a Melee Weapon that reaches nowhere',
      content: arena({ hero: { meleeWeapon: { reach: 0, width: 1 } } }),
      message: "The hero's Melee Weapon reach must be more than 0, but it is 0",
    },
    {
      what: 'a Melee Weapon with a negative reach',
      content: arena({ hero: { meleeWeapon: { reach: -1, width: 1 } } }),
      message: "The hero's Melee Weapon reach must be more than 0, but it is -1",
    },
    {
      what: 'a Melee Weapon that sweeps nothing',
      content: arena({ hero: { meleeWeapon: { reach: 1, width: 0 } } }),
      message: "The hero's Melee Weapon width must be more than 0, but it is 0",
    },
    {
      what: 'a Melee Weapon with a negative width',
      content: arena({ hero: { meleeWeapon: { reach: 1, width: -3 } } }),
      message: "The hero's Melee Weapon width must be more than 0, but it is -3",
    },
    {
      what: 'a negative minimum damage',
      content: arena({ minimumDamage: -1 }),
      message: 'The minimum damage must be 1 or more, but it is -1',
    },
    {
      what: 'a minimum damage of 0, which would let Defense take a whole hit away',
      content: arena({ minimumDamage: 0 }),
      message: 'The minimum damage must be 1 or more, but it is 0',
    },
    {
      what: 'a minimum damage between 0 and 1, which would let Defense take most of a hit away',
      content: arena({ minimumDamage: 0.5 }),
      message: 'The minimum damage must be 1 or more, but it is 0.5',
    },
    {
      what: 'a minimum damage that is not a number',
      content: arena({ minimumDamage: Number.NaN }),
      message: 'The minimum damage must be 1 or more, but it is NaN',
    },
    {
      what: 'a monster whose hits do no damage',
      content: biterWith({ damage: 0 }),
      message: 'Monster type "biter": damage must be more than 0, but it is 0',
    },
    {
      what: 'a monster with a negative speed',
      content: biterWith({ speedTilesPerSecond: -1 }),
      message: 'Monster type "biter": speedTilesPerSecond must be 0 or more, but it is -1',
    },
    {
      what: 'a monster with a negative noticing distance',
      content: biterWith({ noticingDistance: -2 }),
      message: 'Monster type "biter": noticingDistance must be 0 or more, but it is -2',
    },
    {
      what: 'a monster whose attack has no reach',
      content: biterWith({ reach: 0 }),
      message: 'Monster type "biter": reach must be more than 0, but it is 0',
    },
    {
      what: 'a monster that does not wind up before it attacks, so that there is nothing to see coming',
      content: biterWith({ windUpMs: 0 }),
      message: 'Monster type "biter": windUpMs must be at least one fixed step (16.7 ms), but it is 0',
    },
    {
      what: 'a monster with a negative recovery',
      content: biterWith({ recoveryMs: -1 }),
      message: 'Monster type "biter": recoveryMs must be 0 or more, but it is -1',
    },
    {
      what: 'a monster that earns the hero negative Experience',
      content: biterWith({ experience: -1 }),
      message: 'Monster type "biter": experience must be 0 or more, but it is -1',
    },
    {
      what: 'a stationary monster that earns the hero negative Experience',
      content: arena({ monsterTypes: { dummy: frailMonster(-5) } }),
      message: 'Monster type "dummy": experience must be 0 or more, but it is -5',
    },
    {
      what: 'a Level curve with no thresholds, which leaves the hero no Level to reach',
      content: arena({ progression: { levelThresholds: [] } }),
      message: 'The Level thresholds must give the Experience for at least Level 2',
    },
    {
      what: 'a Level that takes no Experience',
      content: arena({ progression: { levelThresholds: [0, 10] } }),
      message: 'The Experience for Level 2 must be more than 0, but it is 0',
    },
    {
      what: 'a Level that takes as much Experience as the one before',
      content: arena({ progression: { levelThresholds: [10, 10, 30] } }),
      message: 'The Experience for Level 3 must be more than the 10 of Level 2, but it is 10',
    },
    {
      what: 'a Level that takes less Experience than the one before',
      content: arena({ progression: { levelThresholds: [10, 25, 20] } }),
      message: 'The Experience for Level 4 must be more than the 25 of Level 3, but it is 20',
    },
    {
      what: 'a Stat Point that adds nothing to Health',
      content: arena({ progression: { statPointValue: { health: 0, attack: 2, defense: 1 } } }),
      message: 'The value of a Stat Point in health must be more than 0, but it is 0',
    },
    {
      what: 'a Stat Point that adds nothing to Attack',
      content: arena({ progression: { statPointValue: { health: 3, attack: 0, defense: 1 } } }),
      message: 'The value of a Stat Point in attack must be more than 0, but it is 0',
    },
    {
      what: 'a Stat Point that takes away from Defense',
      content: arena({ progression: { statPointValue: { health: 3, attack: 2, defense: -1 } } }),
      message: 'The value of a Stat Point in defense must be more than 0, but it is -1',
    },
    {
      what: 'a milestone zone with no width, which no hero can be in',
      content: arenaWithMilestone({ col: 5, row: 3, width: 0, height: 1 }),
      message:
        'Area "arena": the zone of milestone "gate" (col 5, row 3, 0 wide, 1 high) must be whole tiles, at least one wide and one high',
    },
    {
      what: 'a milestone zone that starts between two tiles',
      content: arenaWithMilestone({ col: 5.5, row: 3, width: 1, height: 1 }),
      message:
        'Area "arena": the zone of milestone "gate" (col 5.5, row 3, 1 wide, 1 high) must be whole tiles, at least one wide and one high',
    },
    {
      what: 'a milestone zone that reaches past the right edge of the map',
      content: arenaWithMilestone({ col: 5, row: 3, width: 3, height: 1 }),
      message: 'Area "arena": the zone of milestone "gate" (col 5, row 3, 3 wide, 1 high) reaches outside the map',
    },
    {
      what: 'a milestone zone that reaches past the bottom edge of the map',
      content: arenaWithMilestone({ col: 3, row: 4, width: 1, height: 3 }),
      message: 'Area "arena": the zone of milestone "gate" (col 3, row 4, 1 wide, 3 high) reaches outside the map',
    },
    {
      what: 'a milestone zone that starts before the map does',
      content: arenaWithMilestone({ col: -1, row: 3, width: 2, height: 1 }),
      message: 'Area "arena": the zone of milestone "gate" (col -1, row 3, 2 wide, 1 high) reaches outside the map',
    },
    {
      what: 'a milestone that takes Experience away',
      content: arenaWithMilestone({ col: 5, row: 3, width: 1, height: 1 }, -1),
      message: 'Milestone "gate": experience must be 0 or more, but it is -1',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
  });

  it('the lowest numbers that still make sense are accepted', () => {
    const content = arena({
      // A hero with no Attack of its own relies on Gear and Stat Points, and one with no cooldown strikes every step. A
      // hit takes 1 Health at the least, so that Defense can never take it away whole.
      hero: { defense: 0, attack: 0, attackCooldownMs: 0 },
      minimumDamage: 1,
      progression: { levelThresholds: [1], statPointValue: { health: 1, attack: 1, defense: 1 } },
      milestones: [
        milestone('whole-map', { col: 0, row: 0, width: 7, height: 6 }, 0),
        milestone('last-tile', { col: 6, row: 5, width: 1, height: 1 }, 0),
      ],
      monsterTypes: {
        biter: {
          ...BITER,
          speedTilesPerSecond: 0,
          noticingDistance: 0,
          recoveryMs: 0,
          windUpMs: 1000 / 60,
          experience: 0,
        },
        dummy: frailMonster(0),
      },
    });

    expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
  });
});

describe('a monster type of any behavior with no Health or no body is refused when the game is created', () => {
  const BEHAVIORS: readonly { readonly behavior: string; readonly definition: MonsterTypeDefinition }[] = [
    { behavior: 'stationary', definition: frailMonster(0) },
    { behavior: 'chaser', definition: BITER },
    { behavior: 'charger', definition: CHARGER },
    { behavior: 'ranged', definition: SHOOTER },
    { behavior: 'guardian', definition: GUARDIAN },
  ];
  const CASES: readonly {
    readonly what: string;
    readonly changes: { readonly health?: number; readonly size?: number };
    readonly message: string;
  }[] = [
    { what: 'no Health', changes: { health: 0 }, message: 'health must be more than 0, but it is 0' },
    { what: 'negative Health', changes: { health: -3 }, message: 'health must be more than 0, but it is -3' },
    { what: 'no body', changes: { size: 0 }, message: 'size must be more than 0, but it is 0' },
    { what: 'a negative size', changes: { size: -0.5 }, message: 'size must be more than 0, but it is -0.5' },
  ];

  describe.each(BEHAVIORS)('a $behavior', ({ definition }) => {
    it.each(CASES)('with $what', ({ changes, message }) => {
      const content = arena({ monsterTypes: { thing: { ...definition, ...changes } } });

      expectRefused(content, `Monster type "thing": ${message}`);
    });
  });
});

describe('Gear and interactables that do not make sense are refused when the game is created', () => {
  // Content read from a file could say these, and the compiler would not notice.
  const headGear = { name: 'Cap', slot: 'head', bonus: 1 } as unknown as GearDefinition;
  const headStart = { head: 'basic-armor' } as unknown as HeroDefinition['startingGear'];
  const portal = { kind: 'portal', id: 'portal-1', tile: { col: 1, row: 1 } } as unknown as InteractableDefinition;
  const potionChest = {
    kind: 'chest',
    id: 'chest-1',
    tile: { col: 1, row: 1 },
    contents: { kind: 'potion' },
  } as unknown as InteractableDefinition;

  it.each([
    {
      what: 'a piece of Gear for a slot that does not exist',
      content: arena({ gear: { cap: headGear } }),
      message: 'Gear "cap" has unknown slot "head"',
    },
    {
      what: 'a piece of Gear that has no name for the player to read',
      content: arena({ gear: { cap: { name: ' ', slot: 'armor', bonus: 1 } } }),
      message: 'Gear "cap" has no name',
    },
    {
      what: 'a piece of Gear with a negative bonus',
      content: arena({ gear: { rusty: { name: 'Rusty Sword', slot: 'melee-weapon', bonus: -1 } } }),
      message: 'Gear "rusty": bonus must be 0 or more, but it is -1',
    },
    {
      what: 'a hero that cannot reach anything to interact with',
      content: arena({ hero: { interactionReach: 0 } }),
      message: "The hero's interaction reach must be more than 0, but it is 0",
    },
    {
      what: 'starting Gear that does not exist',
      content: arena({ hero: { startingGear: { armor: 'nothing' } } }),
      message: 'The hero starts with unknown Gear "nothing"',
    },
    {
      what: 'starting Gear in a slot it does not belong in',
      content: arena({ hero: { startingGear: { armor: 'iron-sword' } } }),
      message: 'The hero\'s starting Gear for slot "armor" is "iron-sword", which belongs in slot "melee-weapon"',
    },
    {
      what: 'starting Gear for a slot that does not exist',
      content: arena({ hero: { startingGear: headStart } }),
      message: 'The hero starts with Gear for unknown slot "head"',
    },
    {
      what: 'a chest that holds Gear that does not exist',
      content: arena({ interactables: [chestAt('chest-1', 1, 1, 'nothing')] }),
      message: 'Area "arena": chest "chest-1" holds unknown Gear "nothing"',
    },
    {
      what: 'a chest with contents of a kind that does not exist',
      content: arena({ interactables: [potionChest] }),
      message: 'Area "arena": chest "chest-1" holds unknown contents "potion"',
    },
    {
      what: 'an interactable of a kind that does not exist',
      content: arena({ interactables: [portal] }),
      message: 'Area "arena": interactable "portal-1" has unknown kind "portal"',
    },
    {
      what: 'a chest on solid terrain',
      content: arena({ interactables: [chestAt('chest-1', 2, 2, 'iron-sword')] }), // the water
      message: 'Area "arena": chest "chest-1" is placed at (col 2, row 2), which is solid terrain or outside the map',
    },
    {
      what: 'a chest outside the map',
      content: arena({ interactables: [chestAt('chest-1', 9, 3, 'iron-sword')] }),
      message: 'Area "arena": chest "chest-1" is placed at (col 9, row 3), which is solid terrain or outside the map',
    },
    {
      what: 'a chest where the hero starts',
      content: arena({ interactables: [chestAt('chest-1', 3, 3, 'iron-sword')] }),
      message: 'Area "arena": chest "chest-1" is placed at (col 3, row 3), where the hero starts',
    },
    {
      what: 'a chest where a monster starts',
      content: arena({
        monsters: [dummyAt('dummy-1', 5, 3)],
        interactables: [chestAt('chest-1', 5, 3, 'iron-sword')],
      }),
      message: 'Area "arena": chest "chest-1" is placed at (col 5, row 3), where monster "dummy-1" starts',
    },
    {
      what: 'two chests on the same tile',
      content: arena({
        interactables: [chestAt('chest-1', 4, 3, 'iron-sword'), chestAt('chest-2', 4, 3, 'steel-sword')],
      }),
      message: 'Area "arena": chest "chest-2" is placed at (col 4, row 3), where chest "chest-1" already stands',
    },
    {
      what: 'two interactables with the same id, even in different Adventure Areas',
      content: arena({
        interactables: [chestAt('chest-1', 4, 3, 'iron-sword')],
        otherAreas: [
          {
            id: 'cellar',
            name: 'Cellar',
            layout: ARENA_LAYOUT,
            monsters: [],
            interactables: [chestAt('chest-1', 4, 3, 'steel-sword')],
          },
        ],
      }),
      message: 'Interactable id "chest-1" is used more than once',
    },
    {
      what: 'the same piece of Gear in two chests: the hero carries each piece at most once',
      content: arena({
        interactables: [chestAt('chest-1', 4, 3, 'iron-sword'), chestAt('chest-2', 5, 3, 'iron-sword')],
      }),
      message: 'Gear "iron-sword" is given more than once: by chest "chest-1" and by chest "chest-2"',
    },
    {
      what: 'Gear in a chest that the hero starts with',
      content: arena({ interactables: [chestAt('chest-1', 4, 3, 'basic-sword')] }),
      message: 'Gear "basic-sword" is given more than once: by the hero\'s starting Gear and by chest "chest-1"',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
  });

  it('the Gear and chests that still make sense are accepted', () => {
    const content = arena({
      hero: { startingGear: { 'melee-weapon': 'basic-sword' }, interactionReach: 0.01 },
      gear: { 'spare-ring': { name: 'Ring', slot: 'armor', bonus: 0 } },
      monsters: [dummyAt('dummy-1', 5, 3)],
      interactables: [chestAt('beside-hero', 3, 4, 'iron-sword'), chestAt('beside-monster', 5, 4, 'spare-ring')],
      otherAreas: [
        {
          id: 'cellar',
          name: 'Cellar',
          layout: ARENA_LAYOUT,
          monsters: [],
          interactables: [chestAt('on-hero-start-tile-of-another-area', 3, 3, 'steel-sword')],
        },
      ],
    });

    expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
  });
});
