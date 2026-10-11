import { describe, it } from 'vitest';
import type { AreaDefinition, ContentDefinition, EntranceDefinition } from '../src/core';
import { doorAt, expectAccepted, expectRefused, FIELD_LAYOUT, gateAt, keyAt, signAt } from './fixtures';
import type { ArenaOptions } from './fixtures';
import { guardianAt, guardianContent, guardianGateAt } from './guardian-fixtures';
import { HARBOR_CREDITS, HARBOR_ENDING, vesselAt } from './harbor-fixtures';

// The game has one vessel, in the harbor behind the gate of the Guardian. Content is refused when it places more than
// one, whether or not it asks for a Guardian, and when the way to the vessel needs a key, a lever or a door. Content
// that asks for a Guardian (`requireGuardian`, which the game's own content does) is refused besides when it places no
// vessel, when the vessel is not in the area of the Guardian, when the hero can walk up to it before the Guardian is
// defeated, and when the hero cannot walk up to it even after.
//
// The tests build the castle of guardian-validation.test.ts, with a harbor of 3 x 3 tiles, drawn here with its columns 0
// to 12 across and its rows 0 to 4 down:
//
//   #############   A west room (columns 1 to 3), where the hero comes in, at (1, 2); the gateway at (4, 2), with the
//   #...#...#...#   Checkpoint in it; the arena (columns 5 to 7), with the Guardian at its middle, at (6, 2); the gate
//   #...........#   at (8, 2) that the Guardian's defeat opens; and the harbor beyond it (columns 9 to 11, rows 1 to 3),
//   #...#...#...#   with the vessel at (11, 2) on its far side, which the hero reaches from (10, 2), (11, 1) or (11, 3).
//   #############
const CASTLE = ['#############', '#...#...#...#', '#...........#', '#...#...#...#', '#############'];

//   #############   The castle whose harbor is a corridor, so that the vessel at (11, 2) at its end has one tile to be
//   #...#...#####   reached from: (10, 2).
//   #...........#
//   #...#...#####
//   #############
const CASTLE_WITH_A_CORRIDOR = ['#############', '#...#...#####', '#...........#', '#...#...#####', '#############'];

//   #############   The castle with a gap in the wall of the harbor at (8, 1), above the gate: a vessel there is beside
//   #...#.......#   the arena, at (7, 1), and beside the harbor, at (9, 1).
//   #...........#
//   #...#...#...#
//   #############
const CASTLE_WITH_A_GAP = ['#############', '#...#.......#', '#...........#', '#...#...#...#', '#############'];

//   #############   The castle with a back way from the west room, by (1, 4), along row 5, and up by (10, 4) to the
//   #...#...#...#   harbor at (10, 3), which does not go by the arena or its gate: a vessel at (10, 3) is beside the
//   #...........#   harbor, at (10, 2), and beside the back way, at (10, 4).
//   #...#...##.##
//   #.########.##
//   #...........#
//   #############
const CASTLE_WITH_A_BACK_WAY = [
  '#############',
  '#...#...#...#',
  '#...........#',
  '#...#...##.##',
  '#.########.##',
  '#...........#',
  '#############',
];

const WAY_IN: EntranceDefinition = { id: 'way-in', tile: { col: 1, row: 2 } };
const GATEWAY_STONE = { id: 'gateway-stone', tile: { col: 4, row: 2 } };
const WARDEN = guardianAt('warden', 6, 2);
const HARBOR_GATE = guardianGateAt('harbor-gate', 8, 2, 'warden');
const VESSEL = vesselAt('old-vessel', 11, 2);
const YARD_WITH_A_VESSEL: AreaDefinition = {
  id: 'yard',
  name: 'Yard',
  layout: FIELD_LAYOUT,
  monsters: [],
  interactables: [vesselAt('far-vessel', 6, 3)],
};

/** The castle: a Guardian, the gate it opens, a Checkpoint in the gateway, one way in, and the vessel in the harbor. */
function castle(options: ArenaOptions = {}): ContentDefinition {
  return {
    ...guardianContent([WARDEN], {
      layout: CASTLE,
      entrances: [WAY_IN],
      checkpoints: [GATEWAY_STONE],
      interactables: [HARBOR_GATE, VESSEL],
      start: { area: 'arena', tile: WAY_IN.tile },
      ending: HARBOR_ENDING,
      credits: HARBOR_CREDITS,
      ...options,
    }),
    requireGuardian: true,
  };
}

/** The same content, which does not ask for a Guardian. */
function notAskingForOne(content: ContentDefinition): ContentDefinition {
  return { ...content, requireGuardian: false };
}

const NO_VESSEL = 'The content places no vessel, but exactly one is required';
const BEFORE =
  'Area "arena": vessel "old-vessel" can be reached before Guardian "warden" is defeated: the harbor must be out of reach until then';
const NEVER =
  'Area "arena": vessel "old-vessel" cannot be reached even when Guardian "warden" is defeated: the hero must be able to walk up to it';
const NEEDS_A_DOOR =
  'Area "arena": vessel "old-vessel" cannot be reached from entrance "way-in" unless a door or gate is opened: the route must never need a key, a lever or a door';

describe('a second vessel is refused when the game is created, whether or not the content asks for a Guardian', () => {
  it.each([
    {
      what: 'in the same area',
      content: castle({ interactables: [HARBOR_GATE, VESSEL, vesselAt('second-vessel', 10, 1)] }),
      message: 'Area "arena": vessel "second-vessel" is a second vessel, after "old-vessel" of area "arena": there is only one',
    },
    {
      what: 'in another area',
      content: castle({ otherAreas: [YARD_WITH_A_VESSEL] }),
      message: 'Area "yard": vessel "far-vessel" is a second vessel, after "old-vessel" of area "arena": there is only one',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
    expectRefused(notAskingForOne(content), message);
  });
});

describe('the way to the vessel never needs a door or a gate to be opened', () => {
  const locked = (device: ArenaOptions['interactables'], layout = CASTLE_WITH_A_CORRIDOR): ContentDefinition =>
    castle({ layout, interactables: [HARBOR_GATE, VESSEL, ...(device ?? [])] });

  it.each([true, false])('is refused behind a locked door, with the content asking for a Guardian: %s', (asking) => {
    const content = locked([keyAt('rusty-key', 1, 1), doorAt('harbor-door', 9, 2, 'rusty-key')]);

    expectRefused(asking ? content : notAskingForOne(content), NEEDS_A_DOOR);
  });

  it('is refused behind an ordinary gate: only the gate of a Guardian may be passed', () => {
    expectRefused(locked([gateAt('side-gate', 9, 2)]), NEEDS_A_DOOR);
  });

  it('is accepted behind the gate of the Guardian, which is the way and no key, lever or door', () => {
    expectAccepted(locked([]));
  });

  it('is accepted when a door shuts off only one side of the vessel: the hero uses it from any side', () => {
    expectAccepted(
      castle({
        interactables: [
          HARBOR_GATE,
          vesselAt('old-vessel', 10, 2),
          keyAt('rusty-key', 1, 1),
          doorAt('harbor-door', 11, 2, 'rusty-key'),
        ],
      }),
    );
  });
});

describe('content that asks for a Guardian needs exactly one vessel', () => {
  it('is accepted with the vessel in the harbor behind the gate, at the end of it or anywhere else in it', () => {
    for (const tile of [
      { col: 11, row: 2 },
      { col: 9, row: 1 },
      { col: 11, row: 3 },
      { col: 10, row: 1 },
    ]) {
      expectAccepted(castle({ interactables: [HARBOR_GATE, vesselAt('old-vessel', tile.col, tile.row)] }));
    }
  });

  it('is refused when it places none, and accepted when it does not ask for a Guardian: the ending is the content\'s to have alone', () => {
    const none = castle({ interactables: [HARBOR_GATE] });

    expectRefused(none, NO_VESSEL);
    expectAccepted(notAskingForOne(none));
  });

  it('is refused when the vessel is in another area than the Guardian, and accepted when it does not ask for a Guardian', () => {
    const content = castle({ interactables: [HARBOR_GATE], otherAreas: [YARD_WITH_A_VESSEL] });

    expectRefused(
      content,
      'Area "yard": vessel "far-vessel" is not in area "arena" with Guardian "warden": the vessel must lie in the harbor behind the gate that it opens',
    );
    expectAccepted(notAskingForOne(content));
  });
});

describe('content that asks for a Guardian needs the vessel out of reach until the Guardian is defeated', () => {
  it.each([
    {
      what: 'a vessel in the west room, where the hero comes in',
      content: castle({ interactables: [HARBOR_GATE, vesselAt('old-vessel', 2, 1)] }),
    },
    {
      what: 'a vessel in the arena, with the Guardian',
      content: castle({ interactables: [HARBOR_GATE, vesselAt('old-vessel', 7, 1)] }),
    },
    {
      what: 'a vessel in a gap of the wall, beside the arena as well as the harbor: one side is enough to use it from',
      content: castle({ layout: CASTLE_WITH_A_GAP, interactables: [HARBOR_GATE, vesselAt('old-vessel', 8, 1)] }),
    },
    {
      what: 'a vessel in the harbor that a back way leads up to, which does not go by the gate',
      content: castle({ layout: CASTLE_WITH_A_BACK_WAY, interactables: [HARBOR_GATE, vesselAt('old-vessel', 10, 3)] }),
    },
  ])('is refused for $what', ({ content }) => {
    expectRefused(content, BEFORE);
  });

  it('is accepted for the same placements when the content does not ask for a Guardian, as the small maps of a test have none', () => {
    for (const interactables of [
      [HARBOR_GATE, vesselAt('old-vessel', 2, 1)],
      [HARBOR_GATE, vesselAt('old-vessel', 7, 1)],
    ]) {
      expectAccepted(notAskingForOne(castle({ interactables })));
    }
  });
});

describe('content that asks for a Guardian needs the vessel to be reached once the Guardian is defeated', () => {
  it('is refused for a vessel in the harbor that signs shut in on every side', () => {
    const content = castle({
      interactables: [
        HARBOR_GATE,
        vesselAt('old-vessel', 11, 1),
        signAt('west-sign', 10, 1, 'Nothing here.'),
        signAt('south-sign', 11, 2, 'Nothing here.'),
      ],
    });

    expectRefused(content, NEVER);
    expectAccepted(notAskingForOne(content));
  });

  it('is accepted when the way to the vessel is narrow but open: one tile beside it is enough', () => {
    expectAccepted(
      castle({
        interactables: [HARBOR_GATE, vesselAt('old-vessel', 11, 1), signAt('west-sign', 10, 1, 'Nothing here.')],
      }),
    );
  });
});
