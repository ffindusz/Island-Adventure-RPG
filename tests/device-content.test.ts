import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { ContentDefinition } from '../src/core';
import { ARENA_LAYOUT, arena, chestAt, doorAt, fixedRandom, gateAt, keyAt, leverAt, signAt } from './fixtures';

// The devices are the keys, the doors, the gates, the levers and the signs. Content that makes no sense to them is
// refused when the game is created, with a message that names the area and the device, so that whoever writes the
// content knows where to look. The arena is 7 tiles wide and 6 high, and its walkable tiles are in columns 1 to 5 and
// rows 1 to 4 (see fixtures.ts).

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

function expectAccepted(content: ContentDefinition): void {
  expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
}

describe('keys and doors that do not make sense are refused when the game is created', () => {
  it.each([
    {
      what: 'a door that needs a key no Adventure Area places',
      content: arena({ interactables: [doorAt('cellar-door', 3, 4, 'lost-key')] }),
      message: 'Area "arena": door "cellar-door" needs the key "lost-key", but no Adventure Area places a key with that id',
    },
    {
      what: 'a door that names something that is no key, a chest',
      content: arena({ interactables: [chestAt('chest-1', 5, 1, 'iron-sword'), doorAt('cellar-door', 3, 4, 'chest-1')] }),
      message: 'Area "arena": door "cellar-door" needs the key "chest-1", but no Adventure Area places a key with that id',
    },
    {
      what: 'a key that no door needs',
      content: arena({ interactables: [keyAt('rusty-key', 5, 1)] }),
      message: 'Area "arena": key "rusty-key" opens no door: no door needs it',
    },
    {
      what: 'two doors that need the same key: a key opens one door',
      content: arena({
        interactables: [
          keyAt('rusty-key', 5, 1),
          doorAt('first-door', 3, 4, 'rusty-key'),
          doorAt('second-door', 5, 4, 'rusty-key'),
        ],
      }),
      message: 'Key "rusty-key" is needed by more than one door: "first-door" and "second-door"',
    },
    {
      what: 'a key that has no name for the player to read',
      content: arena({ interactables: [keyAt('rusty-key', 5, 1, ' '), doorAt('cellar-door', 3, 4, 'rusty-key')] }),
      message: 'Area "arena": key "rusty-key" has no name',
    },
    {
      what: 'a door on solid terrain',
      content: arena({ interactables: [keyAt('rusty-key', 5, 1), doorAt('cellar-door', 2, 2, 'rusty-key')] }), // the water
      message: 'Area "arena": door "cellar-door" is placed at (col 2, row 2), which is solid terrain or outside the map',
    },
    {
      what: 'a door where the hero starts',
      content: arena({ interactables: [keyAt('rusty-key', 5, 1), doorAt('cellar-door', 3, 3, 'rusty-key')] }),
      message: 'Area "arena": door "cellar-door" is placed at (col 3, row 3), where the hero starts',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
  });

  it('a key and its door that make sense are accepted, in one Adventure Area or in two', () => {
    expectAccepted(arena({ interactables: [keyAt('rusty-key', 5, 1), doorAt('cellar-door', 3, 4, 'rusty-key')] }));
    expectAccepted(
      arena({
        interactables: [doorAt('cellar-door', 3, 4, 'rusty-key')],
        otherAreas: [
          { id: 'cellar', name: 'Cellar', layout: ARENA_LAYOUT, monsters: [], interactables: [keyAt('rusty-key', 5, 1)] },
        ],
      }),
    );
  });
});

describe('levers and gates that do not make sense are refused when the game is created', () => {
  it.each([
    {
      what: 'a lever that moves a gate that does not exist',
      content: arena({ interactables: [leverAt('lever-1', 3, 2, ['lost-gate'])] }),
      message: 'Area "arena": lever "lever-1" moves "lost-gate", but this area has no door or gate with that id',
    },
    {
      what: 'a lever that moves something that is no door or gate, a chest',
      content: arena({ interactables: [chestAt('chest-1', 5, 1, 'iron-sword'), leverAt('lever-1', 3, 2, ['chest-1'])] }),
      message: 'Area "arena": lever "lever-1" moves "chest-1", but this area has no door or gate with that id',
    },
    {
      what: 'a lever that moves a gate of another Adventure Area: a lever reaches no further than its own',
      content: arena({
        interactables: [leverAt('lever-1', 3, 2, ['far-gate'])],
        otherAreas: [
          { id: 'yard', name: 'Yard', layout: ARENA_LAYOUT, monsters: [], interactables: [gateAt('far-gate', 3, 3)] },
        ],
      }),
      message: 'Area "arena": lever "lever-1" moves "far-gate", but this area has no door or gate with that id',
    },
    {
      what: 'a lever that moves nothing',
      content: arena({ interactables: [leverAt('lever-1', 3, 2, [])] }),
      message: 'Area "arena": lever "lever-1" moves no door or gate',
    },
    {
      what: 'a lever that names a gate twice: it would move it back at once',
      content: arena({ interactables: [leverAt('lever-1', 3, 2, ['gate-1', 'gate-1']), gateAt('gate-1', 4, 3)] }),
      message: 'Area "arena": lever "lever-1" names "gate-1" more than once',
    },
    {
      what: 'a gate on solid terrain',
      content: arena({ interactables: [gateAt('gate-1', 2, 2)] }), // the water
      message: 'Area "arena": gate "gate-1" is placed at (col 2, row 2), which is solid terrain or outside the map',
    },
    {
      what: 'a lever where the hero starts',
      content: arena({ interactables: [leverAt('lever-1', 3, 3, ['gate-1']), gateAt('gate-1', 4, 3)] }),
      message: 'Area "arena": lever "lever-1" is placed at (col 3, row 3), where the hero starts',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
  });

  it('a lever and the gates and doors it moves that make sense are accepted', () => {
    expectAccepted(arena({ interactables: [leverAt('lever-1', 3, 2, ['gate-1']), gateAt('gate-1', 4, 3)] }));
    expectAccepted(
      arena({
        interactables: [
          leverAt('lever-1', 3, 2, ['gate-1', 'cellar-door']),
          gateAt('gate-1', 4, 3),
          doorAt('cellar-door', 3, 4, 'rusty-key'),
          keyAt('rusty-key', 5, 1),
        ],
      }),
    );
  });
});

describe('signs that do not make sense are refused when the game is created', () => {
  it.each([
    {
      what: 'a sign with no text for the player to read',
      content: arena({ interactables: [signAt('sign-1', 3, 2, '  ')] }),
      message: 'Area "arena": sign "sign-1" has no text',
    },
    {
      what: 'a sign on solid terrain',
      content: arena({ interactables: [signAt('sign-1', 2, 2, 'Beware of the well.')] }), // the water
      message: 'Area "arena": sign "sign-1" is placed at (col 2, row 2), which is solid terrain or outside the map',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
  });

  it('a sign with text is accepted', () => {
    expectAccepted(arena({ interactables: [signAt('sign-1', 3, 2, 'Beware of the well.')] }));
  });
});
