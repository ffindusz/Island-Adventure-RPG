import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { ContentDefinition, EntranceDefinition } from '../src/core';
import { doorAt, dummyAt, FIELD_LAYOUT, fixedRandom, gateAt, keyAt } from './fixtures';
import type { ArenaOptions } from './fixtures';
import { guardianAt, guardianContent, guardianGateAt } from './guardian-fixtures';

// The game has one Guardian, in the arena at the end of the route, and content is refused when it places more than one,
// when a gate waits for something that is no Guardian of its own area, or when the hero cannot get to the Guardian
// without a key, a lever or a door. Content that asks for a Guardian (`requireGuardian`, which the game's own content
// does) is refused besides when there is none, when no Checkpoint lies immediately before the arena, and when the
// harbor that the Guardian's gate opens onto can be reached without defeating it.
//
// The tests build a small castle, drawn here with its columns 0 to 12 across and its rows 0 to 4 down:
//
//   #############   A west room (columns 1 to 3), where the hero comes in, at (1, 2); the gateway at (4, 2), with the
//   #...#...#####   Checkpoint in it; the arena (columns 5 to 7), with the Guardian at its middle, at (6, 2); the gate
//   #...........#   at (8, 2) that the Guardian's defeat opens; and the harbor beyond it, in row 2 from column 9 to 11.
//   #...#...#####
//   #############
const CASTLE = ['#############', '#...#...#####', '#...........#', '#...#...#####', '#############'];

//   #############   The castle with a second way into the arena, at (4, 1), round the gateway.
//   #.......#####
//   #...........#
//   #...#...#####
//   #############
const CASTLE_WITH_A_WAY_ROUND = ['#############', '#.......#####', '#...........#', '#...#...#####', '#############'];

//   #############   The castle with a vault under the arena: (6, 4) lies below the arena's tile (6, 3), where a door is.
//   #...#...#####
//   #...........#
//   #...#...#####
//   ######.######
//   #############
const CASTLE_WITH_A_VAULT = [
  '#############',
  '#...#...#####',
  '#...........#',
  '#...#...#####',
  '######.######',
  '#############',
];

//   #############   The castle with a second way to the harbor, from the west room by (1, 4) along row 5 and up by
//   #...#...#####   (10, 4) and (10, 3), which does not go by the arena or its gate.
//   #...........#
//   #...#...##.##
//   #.########.##
//   #...........#
//   #############
const CASTLE_WITH_A_BACK_WAY = [
  '#############',
  '#...#...#####',
  '#...........#',
  '#...#...##.##',
  '#.########.##',
  '#...........#',
  '#############',
];

//   #############   The castle whose gate opens on a wall: there is no harbor.
//   #...#...#####
//   #........####
//   #...#...#####
//   #############
const CASTLE_WITH_NO_HARBOR = ['#############', '#...#...#####', '#........####', '#...#...#####', '#############'];

//   #########   A hall cut in two by a wall at (4, 1): the Guardian is on the side that nothing leads to.
//   #...#...#
//   #########
const WALLED_HALL = ['#########', '#...#...#', '#########'];

const WAY_IN: EntranceDefinition = { id: 'way-in', tile: { col: 1, row: 2 } };
const GATEWAY_STONE = { id: 'gateway-stone', tile: { col: 4, row: 2 } };
const WARDEN = guardianAt('warden', 6, 2);
const HARBOR_GATE = guardianGateAt('harbor-gate', 8, 2, 'warden');

/** The castle: a Guardian, the gate it opens, a Checkpoint in the gateway, and one way in. */
function castle(options: ArenaOptions = {}): ContentDefinition {
  const { monsters = [WARDEN], ...rest } = options;
  return {
    ...guardianContent(monsters, {
      layout: CASTLE,
      entrances: [WAY_IN],
      checkpoints: [GATEWAY_STONE],
      interactables: [HARBOR_GATE],
      start: { area: 'arena', tile: WAY_IN.tile },
      ...rest,
    }),
    requireGuardian: true,
  };
}

/** The same content, which does not ask for a Guardian. */
function notAskingForOne(content: ContentDefinition): ContentDefinition {
  return { ...content, requireGuardian: false };
}

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

function expectAccepted(content: ContentDefinition): void {
  expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
}

const NO_CHECKPOINT = 'Area "arena": Guardian "warden" has no Checkpoint immediately before it';
const NO_GATE = 'Area "arena": no gate opens when Guardian "warden" is defeated: the harbor must lie behind one';
const NO_HARBOR =
  'Area "arena": nothing lies behind the gate that Guardian "warden" opens: the harbor must be out of reach until it is defeated';

describe('a second Guardian is refused when the game is created, whether or not the content asks for one', () => {
  const FAR_AREA = (monsterId: string) => ({
    id: 'keep',
    name: 'Keep',
    layout: FIELD_LAYOUT,
    monsters: [guardianAt(monsterId, 6, 3)],
  });

  it.each([
    {
      what: 'in the same area',
      content: castle({ monsters: [WARDEN, guardianAt('second-warden', 6, 1)] }),
      message: 'Area "arena": monster "second-warden" is a second Guardian, after "warden" of area "arena": there is only one',
    },
    {
      what: 'in another area',
      content: castle({ otherAreas: [FAR_AREA('keep-warden')] }),
      message: 'Area "keep": monster "keep-warden" is a second Guardian, after "warden" of area "arena": there is only one',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
    expectRefused(notAskingForOne(content), message);
  });
});

describe('a gate that waits for a Guardian must name a Guardian of its own area', () => {
  const FAR_AREA = {
    id: 'yard',
    name: 'Yard',
    layout: FIELD_LAYOUT,
    monsters: [{ id: 'far-biter', type: 'biter', tile: { col: 5, row: 3 } }],
  };

  it.each([
    {
      what: 'a monster that is nowhere',
      content: castle({ interactables: [guardianGateAt('harbor-gate', 8, 2, 'ghost')] }),
      message: 'Area "arena": gate "harbor-gate" opens when "ghost" is defeated, but no monster has that id',
    },
    {
      what: 'a monster of another area, though it is the Guardian that is there',
      content: castle({
        interactables: [guardianGateAt('harbor-gate', 8, 2, 'far-biter')],
        otherAreas: [FAR_AREA],
      }),
      message:
        'Area "arena": gate "harbor-gate" opens when "far-biter" is defeated, but that monster is in area "yard", not in this one',
    },
    {
      what: 'a monster of this area that is no Guardian',
      content: castle({
        monsters: [WARDEN, dummyAt('dummy-1', 6, 1)],
        interactables: [guardianGateAt('harbor-gate', 8, 2, 'dummy-1')],
      }),
      message:
        'Area "arena": gate "harbor-gate" opens when "dummy-1" is defeated, but that monster is not a Guardian: its behavior is "stationary"',
    },
  ])('is refused when it names $what', ({ content, message }) => {
    expectRefused(content, message);
    expectRefused(notAskingForOne(content), message);
  });

  it('is accepted when it names the Guardian of its area', () => {
    expectAccepted(castle());
  });
});

describe('the way to a Guardian never needs a door or a gate to be opened', () => {
  const content = (flag: boolean) => {
    const locked = castle({
      interactables: [HARBOR_GATE, keyAt('rusty-key', 1, 1), doorAt('gateway-door', 4, 2, 'rusty-key')],
      checkpoints: [{ id: 'west-stone', tile: { col: 3, row: 2 } }],
    });
    return flag ? locked : notAskingForOne(locked);
  };

  it.each([true, false])('is refused behind a locked door, with the content asking for a Guardian: %s', (asking) => {
    expectRefused(
      content(asking),
      'Area "arena": Guardian "warden" cannot be reached from entrance "way-in" unless a door or gate is opened: the route must never need a key, a lever or a door',
    );
  });

  it('is refused for a Checkpoint in the harbor too: to the route the gate of a Guardian is a gate like any other', () => {
    expectRefused(
      castle({ checkpoints: [GATEWAY_STONE, { id: 'harbor-stone', tile: { col: 10, row: 2 } }] }),
      'Area "arena": Checkpoint "harbor-stone" cannot be reached from entrance "way-in" unless a door or gate is opened',
    );
  });

  it('is accepted when the door is one that the route does not need: a vault off the arena, with a key in the west room', () => {
    expectAccepted(
      castle({
        layout: CASTLE_WITH_A_VAULT,
        interactables: [HARBOR_GATE, keyAt('rusty-key', 1, 1), doorAt('vault-door', 6, 3, 'rusty-key')],
      }),
    );
  });
});

describe('content that asks for a Guardian', () => {
  it('is accepted when the Guardian has a Checkpoint immediately before its arena and a harbor behind its gate', () => {
    expectAccepted(castle());
  });

  it('is refused when it places none, and accepted when it does not ask for one', () => {
    const none = castle({ monsters: [], interactables: [] });

    expectRefused(none, 'The content places no Guardian, but exactly one is required');
    expectAccepted(notAskingForOne(none));
  });

  it('is not refused for a Checkpoint or a harbor that a Guardian lacks when it does not ask for one', () => {
    const content = castle({
      monsters: [WARDEN, dummyAt('stray', 5, 1)],
      checkpoints: [{ id: 'west-stone', tile: { col: 2, row: 1 } }],
      interactables: [],
    });

    expectRefused(content, NO_CHECKPOINT);
    expectAccepted(notAskingForOne(content));
  });
});

describe('content that asks for a Guardian needs a Checkpoint immediately before its arena', () => {
  it.each([
    {
      what: 'a Checkpoint in the west room that the way into the arena does not go by',
      content: castle({ checkpoints: [{ id: 'west-stone', tile: { col: 2, row: 2 } }] }),
      message: `${NO_CHECKPOINT}: no Checkpoint of the area lies on every way to it`,
    },
    {
      what: 'a Checkpoint in the gateway with a way round it',
      content: castle({ layout: CASTLE_WITH_A_WAY_ROUND }),
      message: `${NO_CHECKPOINT}: no Checkpoint of the area lies on every way to it`,
    },
    {
      what: 'a second entrance, in the arena, that the Checkpoint does not stand between and the Guardian',
      content: castle({ entrances: [WAY_IN, { id: 'side-door', tile: { col: 7, row: 3 } }] }),
      message: `${NO_CHECKPOINT}: no Checkpoint of the area lies on every way to it`,
    },
    {
      what: 'a hero that starts in the arena, past the Checkpoint',
      content: castle({ start: { area: 'arena', tile: { col: 5, row: 3 } } }),
      message: `${NO_CHECKPOINT}: no Checkpoint of the area lies on every way to it`,
    },
    {
      what: 'a Guardian that no entrance and no start leads to',
      content: castle({
        layout: WALLED_HALL,
        monsters: [guardianAt('warden', 6, 1)],
        interactables: [],
        entrances: [{ id: 'way-in', tile: { col: 1, row: 1 } }],
        checkpoints: [{ id: 'gateway-stone', tile: { col: 2, row: 1 } }],
        start: { area: 'arena', tile: { col: 1, row: 1 } },
      }),
      message: `${NO_CHECKPOINT}: no entrance and no start of the area leads to it`,
    },
    {
      what: 'an ordinary monster in the arena, between the Checkpoint and the Guardian',
      content: castle({ monsters: [WARDEN, dummyAt('stray', 5, 1)] }),
      message: `${NO_CHECKPOINT}: monster "stray" stands between Checkpoint "gateway-stone" and it`,
    },
    {
      what: 'an ordinary monster in a vault behind a door of the arena: a door is no wall to a monster that waits',
      content: castle({
        layout: CASTLE_WITH_A_VAULT,
        monsters: [WARDEN, dummyAt('vault-rat', 6, 4)],
        interactables: [HARBOR_GATE, keyAt('rusty-key', 1, 1), doorAt('vault-door', 6, 3, 'rusty-key')],
      }),
      message: `${NO_CHECKPOINT}: monster "vault-rat" stands between Checkpoint "gateway-stone" and it`,
    },
  ])('is refused for $what', ({ content, message }) => {
    expectRefused(content, message);
  });

  it.each([
    {
      what: 'a Checkpoint at the mouth of the arena, with the arena beyond it',
      content: castle({ checkpoints: [{ id: 'mouth-stone', tile: { col: 5, row: 2 } }] }),
    },
    {
      what: 'a second Checkpoint, in the west room, besides the one in the gateway',
      content: castle({
        checkpoints: [{ id: 'west-stone', tile: { col: 2, row: 1 } }, GATEWAY_STONE],
      }),
    },
    {
      what: 'ordinary monsters in the west room, before the Checkpoint',
      content: castle({ monsters: [WARDEN, dummyAt('guard-1', 2, 1), dummyAt('guard-2', 3, 3)] }),
    },
    {
      what: 'an ordinary monster in the harbor, which is not between the Checkpoint and the Guardian',
      content: castle({ monsters: [WARDEN, dummyAt('harbor-crab', 10, 2)] }),
    },
    {
      what: 'a vault off the arena with nothing in it',
      content: castle({
        layout: CASTLE_WITH_A_VAULT,
        interactables: [HARBOR_GATE, keyAt('rusty-key', 1, 1), doorAt('vault-door', 6, 3, 'rusty-key')],
      }),
    },
  ])('is accepted for $what', ({ content }) => {
    expectAccepted(content);
  });
});

describe('content that asks for a Guardian needs a harbor that only its defeat opens', () => {
  it('is refused for a Guardian whose defeat opens no gate', () => {
    expectRefused(castle({ interactables: [] }), NO_GATE);
  });

  it.each([
    {
      what: 'a gate that opens on a wall',
      content: castle({ layout: CASTLE_WITH_NO_HARBOR }),
    },
    {
      what: 'a harbor that a second way, shut by an ordinary door, also leads to',
      content: castle({
        layout: CASTLE_WITH_A_BACK_WAY,
        interactables: [HARBOR_GATE, keyAt('rusty-key', 1, 1), doorAt('back-door', 5, 5, 'rusty-key')],
      }),
    },
    {
      what: 'a harbor that a second way, shut by an ordinary gate, also leads to',
      content: castle({
        layout: CASTLE_WITH_A_BACK_WAY,
        interactables: [HARBOR_GATE, gateAt('back-gate', 5, 5)],
      }),
    },
  ])('is refused for $what', ({ content }) => {
    expectRefused(content, NO_HARBOR);
  });

  it('is accepted when the harbor lies behind an ordinary door as well as the Guardian\'s gate', () => {
    expectAccepted(
      castle({
        interactables: [HARBOR_GATE, keyAt('rusty-key', 1, 1), doorAt('harbor-door', 9, 2, 'rusty-key')],
      }),
    );
  });
});
