import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type {
  AreaDefinition,
  CheckpointDefinition,
  ContentDefinition,
  EntranceDefinition,
  ExitDefinition,
  InteractableDefinition,
  Tile,
} from '../src/core';
import { ARENA_LAYOUT, arena, chestAt, doorAt, fixedRandom, gateAt, keyAt, leverAt } from './fixtures';

// The light puzzles are optional: the way along the route never needs a key, a lever or a door. The hero finds every
// door and gate shut, so content is refused when, with all of them shut, the hero cannot get from where it comes into
// an Adventure Area (by an entrance, or at the start of the game) to an exit or a Checkpoint of it that it could get
// to with all of them open. What no door or gate has a say in, such as a wall, is not this rule's concern.
//
// The tests build small halls. Each is drawn with its columns 0 to 8 across; the hero comes in at the west end, at
// (1, 1), where the game starts. A chest, a lever and a sign always stand in the way, so one is put in a nook, off
// the hall, or it would shut the hall itself.

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

function expectAccepted(content: ContentDefinition): void {
  expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
}

//   #########      A hall: walkable in row 1, columns 1 to 7, with a nook at (2, 2).
//   #.......#
//   ##.######
//   #########
const HALL = ['#########', '#.......#', '##.######', '#########'];

//   #########      A hall with a way round along row 3, and a wall between the two ways.
//   #.......#
//   #.#####.#
//   #.......#
//   #########
const LOOP = ['#########', '#.......#', '#.#####.#', '#.......#', '#########'];

//   #########      A hall with a side room: the nook at (2, 2) and the way down to the room at (4, 2).
//   #.......#
//   ##.#.####
//   ###...###
//   #########
const SIDE_ROOM = ['#########', '#.......#', '##.#.####', '###...###', '#########'];

//   #########      A hall that a wall at (7, 2) splits at its east end, into (7, 1) and (7, 3), the second of which
//   #.......#      only the way along row 3 comes to.
//   #.#####.#
//   #.......#
//   #########
const SPLIT_END = ['#########', '#.......#', '#.#######', '#.......#', '#########'];

//   ######         Two rooms that meet only at the gate's tile (3, 2) and, corner to corner, at (2, 2) and (3, 3): the
//   #..#.#         hero's body, half a tile wide, cannot pass between a shut gate and a wall that touch at a corner.
//   #....#
//   ###..#
//   ######
const PINCH = ['######', '#..#.#', '#....#', '###..#', '######'];

//   #########      A hall that a wall at (4, 1) cuts in two: no gate or door has a say in that.
//   #...#...#
//   #########
const WALLED = ['#########', '#...#...#', '#########'];

const WEST: EntranceDefinition = { id: 'west', tile: { col: 1, row: 1 } };

function camp(col: number, row = 1): CheckpointDefinition {
  return { id: 'camp', tile: { col, row } };
}

/** An exit to the yard, whose zone is `width` tiles wide and `height` tiles tall from (col, row). */
function exitAt(col: number, row = 1, height = 1, width = 1): ExitDefinition {
  return { id: 'to-yard', zone: { col, row, width, height }, to: { area: 'yard', entrance: 'gate' } };
}

/** The yard, which the exits lead to, with no device in it: the hero comes in at (1, 1) and goes back out at (5, 4). */
const YARD: AreaDefinition = {
  id: 'yard',
  name: 'Yard',
  layout: ARENA_LAYOUT,
  monsters: [],
  entrances: [{ id: 'gate', tile: { col: 1, row: 1 } }],
  exits: [{ id: 'back', zone: { col: 5, row: 4, width: 1, height: 1 }, to: { area: 'arena', entrance: 'west' } }],
};

/** A yard that is a hall, with a gate across it, between the entrance and the exit. */
const GATED_YARD: AreaDefinition = {
  id: 'yard',
  name: 'Yard',
  layout: HALL,
  monsters: [],
  entrances: [{ id: 'gate', tile: { col: 1, row: 1 } }],
  exits: [{ id: 'back', zone: { col: 7, row: 1, width: 1, height: 1 }, to: { area: 'arena', entrance: 'west' } }],
  checkpoints: [{ id: 'yard-camp', tile: { col: 2, row: 1 } }],
  interactables: [gateAt('gate-2', 4, 1)],
};

/** A yard that is a hall, in which the hero comes in at the east end, and a gate shuts off the empty west end. */
const YARD_WITH_A_SHUT_OFF_END: AreaDefinition = {
  ...GATED_YARD,
  entrances: [{ id: 'gate', tile: { col: 6, row: 1 } }],
  checkpoints: [{ id: 'yard-camp', tile: { col: 5, row: 1 } }],
  interactables: [gateAt('gate-2', 3, 1)],
};

interface HallOptions {
  readonly interactables: readonly InteractableDefinition[];
  readonly layout?: readonly string[];
  /** Where the hero can come in: the west end unless the test says otherwise. */
  readonly entrances?: readonly EntranceDefinition[];
  /** The exits of the first area: one at the east end unless the test says otherwise. */
  readonly exits?: readonly ExitDefinition[];
  /** The Checkpoints of the first area: one at (2, 1) unless the test says otherwise. */
  readonly checkpoints?: readonly CheckpointDefinition[];
  /** Where the game starts, in the first area: the west end unless the test says otherwise. */
  readonly start?: Tile;
  /** The second area, which the exits lead to. */
  readonly yard?: AreaDefinition;
}

/** Two Adventure Areas: a hall that the game starts in, and a yard behind its exit. */
function hall(options: HallOptions): ContentDefinition {
  const {
    interactables,
    layout = HALL,
    entrances = [WEST],
    exits = [exitAt(7)],
    checkpoints = [camp(2)],
    start = WEST.tile,
    yard = YARD,
  } = options;
  return arena({
    layout,
    interactables,
    entrances,
    exits,
    checkpoints,
    start: { area: 'arena', tile: start },
    otherAreas: [yard],
  });
}

describe('content that needs a door or a gate opened to follow the route is refused when the game is created', () => {
  it.each([
    {
      what: 'a gate across the only way to an exit',
      content: hall({ interactables: [gateAt('gate-1', 4, 1)] }),
      message: 'Area "arena": exit "to-yard" cannot be reached from entrance "west" unless a door or gate is opened',
    },
    {
      what: 'a gate across the only way to a Checkpoint',
      content: hall({ interactables: [gateAt('gate-1', 4, 1)], exits: [exitAt(3)], checkpoints: [camp(6)] }),
      message: 'Area "arena": Checkpoint "camp" cannot be reached from entrance "west" unless a door or gate is opened',
    },
    {
      what: 'a locked door across the only way to an exit, with its key on the near side: a key is not a way through',
      content: hall({
        interactables: [keyAt('rusty-key', 2, 1), doorAt('hall-door', 4, 1, 'rusty-key')],
        checkpoints: [camp(3)],
      }),
      message: 'Area "arena": exit "to-yard" cannot be reached from entrance "west" unless a door or gate is opened',
    },
    {
      what: 'a gate that a lever on the near side moves: a lever is not a way through',
      content: hall({ interactables: [leverAt('lever-1', 2, 2, ['gate-1']), gateAt('gate-1', 4, 1)] }),
      message: 'Area "arena": exit "to-yard" cannot be reached from entrance "west" unless a door or gate is opened',
    },
    {
      what: 'a gate across a way that only a second entrance has to go: every entrance counts',
      content: hall({
        interactables: [gateAt('gate-1', 4, 1)],
        entrances: [WEST, { id: 'east', tile: { col: 6, row: 1 } }],
        exits: [exitAt(3)],
      }),
      message: 'Area "arena": exit "to-yard" cannot be reached from entrance "east" unless a door or gate is opened',
    },
    {
      what: 'a start that a gate cuts off from the exit, though the entrance has none in its way',
      content: hall({ interactables: [gateAt('gate-1', 4, 1)], exits: [exitAt(3)], start: { col: 6, row: 1 } }),
      message: 'Area "arena": exit "to-yard" cannot be reached from where the hero starts unless a door or gate is opened',
    },
    {
      what: 'a gate across the only way to an exit in the second Adventure Area',
      content: hall({ interactables: [], yard: GATED_YARD }),
      message: 'Area "yard": exit "back" cannot be reached from entrance "gate" unless a door or gate is opened',
    },
    {
      what: 'a gate and a wall that touch at a corner: a diagonal gap is no way through',
      content: hall({
        layout: PINCH,
        interactables: [gateAt('gate-1', 3, 2)],
        exits: [exitAt(4)],
      }),
      message: 'Area "arena": exit "to-yard" cannot be reached from entrance "west" unless a door or gate is opened',
    },
    {
      what: 'a gate across one way to an exit and a chest across the other: a chest is never moved',
      content: hall({
        layout: LOOP,
        interactables: [gateAt('gate-1', 4, 1), chestAt('chest-1', 4, 3, 'iron-sword')],
      }),
      message: 'Area "arena": exit "to-yard" cannot be reached from entrance "west" unless a door or gate is opened',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
  });
});

describe('content in which a door or a gate shuts off nothing the route needs is accepted', () => {
  it.each([
    {
      what: 'a locked door to a side room with a chest in it, the key lying in the hall',
      content: hall({
        layout: SIDE_ROOM,
        interactables: [
          keyAt('rusty-key', 3, 1),
          doorAt('side-door', 4, 2, 'rusty-key'),
          chestAt('chest-1', 4, 3, 'iron-sword'),
        ],
        checkpoints: [camp(6)],
      }),
    },
    {
      what: 'a gate to a side room with a chest in it, a lever in a nook of the hall moving it',
      content: hall({
        layout: SIDE_ROOM,
        interactables: [
          leverAt('lever-1', 2, 2, ['gate-1']),
          gateAt('gate-1', 4, 2),
          chestAt('chest-1', 4, 3, 'iron-sword'),
        ],
        checkpoints: [camp(6)],
      }),
    },
    {
      what: 'a gate across one way to the exit, the way round being free',
      content: hall({ layout: LOOP, interactables: [gateAt('gate-1', 4, 1)] }),
    },
    {
      what: 'an exit that the way round reaches in part of its zone, the rest of which lies behind a gate',
      content: hall({ layout: SPLIT_END, interactables: [gateAt('gate-1', 4, 1)], exits: [exitAt(7, 1, 3)] }),
    },
    {
      what: 'an exit whose zone is two tiles wide, one of them the gate itself, which the way round does not need',
      content: hall({ layout: LOOP, interactables: [gateAt('gate-1', 6, 1)], exits: [exitAt(6, 1, 1, 2)] }),
    },
    {
      what: 'an exit that a chest shuts off behind a gate: a chest shuts the way, whether or not the gate is open',
      content: hall({ interactables: [gateAt('gate-1', 3, 1), chestAt('chest-1', 5, 1, 'iron-sword')] }),
    },
    {
      what: 'an exit that a wall shuts off, in a hall with a gate: no gate or door has a say in the wall',
      content: hall({ layout: WALLED, interactables: [gateAt('gate-1', 3, 1)] }),
    },
    {
      what: 'a second Adventure Area in which a gate shuts off an end that the hero never comes in at: the start is the first',
      content: hall({ interactables: [], yard: YARD_WITH_A_SHUT_OFF_END }),
    },
  ])('$what', ({ content }) => {
    expectAccepted(content);
  });
});
