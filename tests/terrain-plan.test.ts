import { describe, expect, it } from 'vitest';
import { describeStamp, planTerrain } from '../src/adapter/terrain-plan';
import type { Stamp } from '../src/adapter/terrain-plan';
import { gameContent } from '../src/content';
import { areaOf } from './main-route';

const KINDS: Readonly<Record<string, string>> = {
  '~': 'water',
  '.': 'sand',
  ',': 'grass',
  '#': 'rock',
  T: 'tree',
  W: 'wreckage',
  '?': 'lava',
};

/** The plan for a map drawn with the letters above, one string a row. */
function plan(...rows: string[]): Stamp[] {
  return planTerrain(rows.map((row) => [...row].map((letter) => KINDS[letter] ?? letter)));
}

/** What is stamped on one tile, in the order it is painted, described the way describeStamp says. */
function onTile(stamps: readonly Stamp[], x: number, y: number): string[] {
  return stamps.filter((stamp) => stamp.x === x && stamp.y === y).map(describeStamp);
}

const LAKE_IN_SAND = ['.....', '.~~~.', '.~~~.', '.~~~.', '.....'];

describe('the ground of a lake in sand', () => {
  const stamps = plan(...LAKE_IN_SAND);

  it('has the shore of sand on the water tiles at the edge, corner by corner', () => {
    expect(onTile(stamps, 1, 1)).toEqual([
      'water.sand.TL@nw',
      'water.sand.T@ne',
      'water.sand.L@sw',
      'water.plain@se',
    ]);
    expect(onTile(stamps, 3, 3)).toEqual([
      'water.plain@nw',
      'water.sand.R@ne',
      'water.sand.B@sw',
      'water.sand.BR@se',
    ]);
  });

  it('is one plain water picture on a tile that touches no land', () => {
    expect(onTile(stamps, 2, 2)).toHaveLength(1);
    expect(onTile(stamps, 2, 2)[0]).toMatch(/^water\.(plain|glint)$/);
  });

  it('has the sand around it, plain, since a sand tile has no grass beside it', () => {
    expect(onTile(stamps, 0, 0)[0]).toMatch(/^sand\.(plain|twig|pebble)$/);
    expect(onTile(stamps, 0, 2)).toHaveLength(1);
  });

  it('puts the corner of the land inside the shore where only the diagonal tile is land', () => {
    const inlet = plan('.....', '.~~~.', '.~~~.', '..~..', '.....');
    expect(onTile(inlet, 2, 2)).toEqual([
      'water.plain@nw',
      'water.plain@ne',
      'water.sand.ISW@sw',
      'water.sand.ISE@se',
    ]);
    const bay = plan('~~~~~', '~~~~~', '~~.~~', '~~~~~', '~~~~~');
    expect(onTile(bay, 1, 1)).toEqual([
      'water.plain@nw',
      'water.plain@ne',
      'water.plain@sw',
      'water.sand.ISE@se',
    ]);
    expect(onTile(bay, 3, 3)).toEqual([
      'water.sand.INW@nw',
      'water.plain@ne',
      'water.plain@sw',
      'water.plain@se',
    ]);
  });

  it('turns where the inlet meets the shore: the corner piece goes on the side where both neighbours are land', () => {
    const pond = plan('.....', '.~~~.', '.~~~.', '.~~~.', '..~..');
    expect(onTile(pond, 1, 3)).toContain('water.sand.BL@sw');
  });

  it('has no shore at the edge of the map, as there is nothing there', () => {
    const stamps = plan('~~', '~~');
    expect(onTile(stamps, 0, 0)).toHaveLength(1);
  });
});

describe('the ground of a pond in grass', () => {
  it('has the shore of grass where only grass is beside the water', () => {
    const stamps = plan(',,,', ',~,', ',,,');
    expect(onTile(stamps, 1, 1)).toEqual([
      'water.grass.TL@nw',
      'water.grass.TR@ne',
      'water.grass.BL@sw',
      'water.grass.BR@se',
    ]);
  });

  it('has the shore of sand where sand is beside the water, and of grass where only grass is', () => {
    const stamps = plan(',,,', '.~,', ',,,');
    expect(onTile(stamps, 1, 1)).toEqual([
      'water.sand.TL@nw',
      'water.grass.TR@ne',
      'water.sand.BL@sw',
      'water.grass.BR@se',
    ]);
  });
});

describe('the ground of sand beside grass', () => {
  it('has the fringe of grass on the sand tiles beside it, and plain sand a tile further in', () => {
    const stamps = plan('....,', '....,', '....,');
    expect(onTile(stamps, 3, 1)).toEqual(['sand.plain@nw', 'sand.edge.R@ne', 'sand.plain@sw', 'sand.edge.R@se']);
    expect(onTile(stamps, 2, 1)).toHaveLength(1);
    expect(onTile(stamps, 4, 1)[0]).toMatch(/^grass\./);
  });

  it('has the same fringe beside the forest, which is the edge of the woods', () => {
    const stamps = plan('..T', '..T', '..T');
    expect(onTile(stamps, 1, 1).some((name) => name.startsWith('sand.edge.R'))).toBe(true);
  });
});

describe('the ground of grass', () => {
  it('is mostly plain, and a few tiles have flecks or a tuft, the same each time', () => {
    const row = ','.repeat(40);
    const names = new Set<string>();
    for (let x = 0; x < 40; x += 1) {
      names.add(onTile(plan(row), x, 0)[0] ?? '');
    }
    expect(names.has('grass.plain')).toBe(true);
    expect(names.size).toBeGreaterThan(1);
    expect(plan(row)).toEqual(plan(row));
  });
});

describe('the ground of rock', () => {
  const block = plan('.....', '.###.', '.###.', '.###.', '.....');

  it('is a cliff: its lip on the top row, its foot on the bottom row, its middle between', () => {
    expect(onTile(block, 2, 1)).toEqual(['rock.lip.mid']);
    expect(onTile(block, 2, 2)).toEqual(['rock.middle.mid']);
    expect(onTile(block, 2, 3)).toEqual(['rock.foot.mid']);
  });

  it('has its left side and its right side outlined', () => {
    expect(onTile(block, 1, 2)).toEqual(['rock.middle.left']);
    expect(onTile(block, 3, 2)).toEqual(['rock.middle.right']);
    expect(onTile(block, 1, 1)).toEqual(['rock.lip.left']);
    expect(onTile(block, 3, 3)).toEqual(['rock.foot.right']);
  });

  it('is the middle of the face where the wall is one tile thick, so a wall of one tile shows no lip or foot', () => {
    const wall = plan('.###.');
    expect(onTile(wall, 2, 0)).toEqual(['rock.middle.mid']);
    expect(onTile(wall, 1, 0)).toEqual(['rock.middle.left']);
    const pillar = plan('.', '#', '.');
    expect(onTile(pillar, 0, 1)).toEqual(['rock.middle.mid']);
  });
});

describe('the ground of woodland', () => {
  const forest = plan('TTTT', 'TTTT', 'TTTT', 'TTTT');

  it('has the four quarters of one tree on each block of four trees, on the floor of the forest', () => {
    const quarters = [onTile(forest, 0, 0), onTile(forest, 1, 0), onTile(forest, 0, 1), onTile(forest, 1, 1)].map((names) => {
      expect(names).toHaveLength(2);
      expect(names[0]).toBe('tree.floor');
      return names[1] ?? '';
    });
    const tree = quarters[0]?.split('.')[1];
    expect(quarters).toEqual([`tree.${tree}.nw`, `tree.${tree}.ne`, `tree.${tree}.sw`, `tree.${tree}.se`]);
  });

  it('puts a small tree on every tree tile that is not in a block, so that none can be taken for ground', () => {
    const odd = plan('TTT', 'TTT', 'TTT');
    const small = odd.filter((stamp) => describeStamp(stamp).startsWith('tree.small'));
    const floor = odd.filter((stamp) => describeStamp(stamp) === 'tree.floor');
    expect(floor).toHaveLength(9);
    expect(small).toHaveLength(5);
    for (const tile of ['0,2', '1,2', '2,0', '2,1', '2,2']) {
      const [x, y] = tile.split(',').map(Number);
      expect(onTile(odd, x ?? 0, y ?? 0)).toEqual(['tree.floor', expect.stringMatching(/^tree\.small/)]);
    }
  });

  it('stands a single tree in a meadow on grass, not on the dark floor of a forest', () => {
    const meadow = plan(',,,,,', ',,,,,', ',,T,,', ',,,,,', ',,,,,');
    expect(onTile(meadow, 2, 2)).toEqual([expect.stringMatching(/^grass\./), expect.stringMatching(/^tree\.small/)]);
  });

  it('gives the same trees to the same map every time, and not the same tree to every block of a forest', () => {
    expect(plan('TTTT', 'TTTT')).toEqual(plan('TTTT', 'TTTT'));

    const wood = plan(...Array.from({ length: 8 }, () => 'TTTTTTTT'));
    const bigTrees = wood.map(describeStamp).filter((name) => /^tree\.\d\.nw$/.test(name));

    expect(bigTrees).toHaveLength(16);
    expect(new Set(bigTrees).size).toBeGreaterThan(1);
  });
});

/** What is stamped from the sheet of the wreck on one tile, in the order it is painted. */
function wreckOn(stamps: readonly Stamp[], x: number, y: number): string[] {
  return onTile(stamps, x, y).filter((name) => name.startsWith('wreck.'));
}

/** The same without the mast, which stands over several tiles of the deck. */
function deckOn(stamps: readonly Stamp[], x: number, y: number): string[] {
  return wreckOn(stamps, x, y).filter((name) => !name.startsWith('wreck.mast.'));
}

describe('the ground of a wreck', () => {
  // A hull in the sea, 8 or 9 tiles wide and 4 high. Its tiles with all eight neighbours in the wreck are 4 to 7 on the
  // row 3 and 3 to 8 on the row 4; the sand starts under it.
  const SEA = [
    '~~~~~~~~~~~~',
    '~~~~~~~~~~~~',
    '~~~WWWWWW~~~',
    '~~WWWWWWWW~~',
    '~~WWWWWWWWW~',
    '~~WWWWWWWW~~',
    '............',
  ];
  const stamps = plan(...SEA);

  it('is water under it, with the shore of the sand where the hull meets it', () => {
    expect(onTile(stamps, 3, 2)[0]).toMatch(/^water\.(plain|glint)$/);
    expect(onTile(stamps, 3, 5)[0]).toMatch(/^water\./);
    expect(onTile(stamps, 3, 5).some((name) => name.startsWith('water.sand.B'))).toBe(true);
  });

  it('has a piece of the deck on every tile of it, and none anywhere else on the ground', () => {
    for (const [y, row] of SEA.entries()) {
      for (const [x, letter] of [...row].entries()) {
        const deck = wreckOn(stamps, x, y).filter((name) => name.startsWith('wreck.deck.') || name.startsWith('wreck.hole') || name.startsWith('wreck.cargo.'));
        if (letter === 'W') expect(deck.length, `the tile ${x},${y}`).toBeGreaterThan(0);
        else expect(deck, `the tile ${x},${y}`).toEqual([]);
      }
    }
  });

  it('is drawn with the thirteen pieces of an edge, quarter by quarter, outside being anything that is not the wreck', () => {
    expect(deckOn(stamps, 3, 2)).toEqual(['wreck.deck.TL@nw', 'wreck.deck.T@ne', 'wreck.deck.L@sw', 'wreck.deck.C@se']);
    expect(deckOn(stamps, 8, 2)).toEqual(['wreck.deck.T@nw', 'wreck.deck.TR@ne', 'wreck.deck.C@sw', 'wreck.deck.R@se']);
    expect(deckOn(stamps, 2, 5)).toEqual(['wreck.deck.L@nw', 'wreck.deck.C@ne', 'wreck.deck.BL@sw', 'wreck.deck.B@se']);
    expect(deckOn(stamps, 3, 3)).toEqual(['wreck.deck.INW@nw', 'wreck.deck.C@ne', 'wreck.deck.C@sw', 'wreck.deck.C@se']);
    expect(deckOn(stamps, 8, 3)).toEqual(['wreck.deck.C@nw', 'wreck.deck.INE@ne', 'wreck.deck.C@sw', 'wreck.deck.C@se']);
    expect(deckOn(stamps, 9, 4)).toEqual(['wreck.deck.C@nw', 'wreck.deck.INE@ne', 'wreck.deck.C@sw', 'wreck.deck.ISE@se']);
    expect(deckOn(stamps, 10, 4)).toEqual(['wreck.deck.T@nw', 'wreck.deck.TR@ne', 'wreck.deck.B@sw', 'wreck.deck.BR@se']);

    // The thirteenth piece, the inner corner at the south west, is where the south side of the hull is notched.
    const notched = plan('~~~~~~~~', '~~~~~~~~', '~~WWWWW~', '~~~WWWWW', '~~~~~~~~');
    expect(deckOn(notched, 3, 2)).toEqual(['wreck.deck.T@nw', 'wreck.deck.T@ne', 'wreck.deck.ISW@sw', 'wreck.deck.C@se']);
  });

  it('is plain planks, a hole or a piece of cargo on a tile with no edge, one picture for the tile', () => {
    for (const [x, y] of [[5, 4], [6, 4], [4, 3]] as const) {
      expect(wreckOn(stamps, x, y), `the tile ${x},${y}`).toEqual([expect.stringMatching(/^wreck\.(deck\.plain|hole|cargo\.[a-z]+)$/)]);
    }
  });

  it('has a different tile for the cargo here and there, the same each time', () => {
    const names = new Set<string>();
    const field = ['WWWWWWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWWWWWW'];
    const big = plan('~'.repeat(20), ...field, '~'.repeat(20));
    for (let x = 1; x < 19; x += 1) names.add(wreckOn(big, x, 3)[0] ?? '');
    expect(names.has('wreck.deck.plain')).toBe(true);
    expect([...names].some((name) => name.startsWith('wreck.cargo.'))).toBe(true);
    expect(plan(...SEA)).toEqual(plan(...SEA));
  });

  it('has one mast, three tiles by three, standing on the last tile of the top row that has no edge', () => {
    const mast = stamps.filter((stamp) => describeStamp(stamp).startsWith('wreck.mast.'));
    expect(mast).toHaveLength(9);
    // The base is the tile 7,3: the pieces stand from the tile 6,1 to the tile 8,3.
    expect(onTile(stamps, 7, 3)).toContain('wreck.mast.1.2');
    expect(onTile(stamps, 6, 1)).toEqual([expect.stringMatching(/^water\./), 'wreck.mast.0.0']);
    expect(onTile(stamps, 8, 3)).toContain('wreck.mast.2.2');
    expect(wreckOn(stamps, 7, 3)).toEqual([expect.stringMatching(/^wreck\.(deck\.plain|hole|cargo\.[a-z]+)$/), 'wreck.mast.1.2']);
  });

  it('never has the top of the mast over ground to walk on, only over the water', () => {
    const land = plan('.........', '.........', '..WWWWW..', '.WWWWWWW.', '.WWWWWWW.', '.WWWWWWW.', '.........');
    const mast = land.filter((stamp) => describeStamp(stamp).startsWith('wreck.mast.'));
    expect(mast).toHaveLength(6);
    for (const stamp of mast) expect(stamp.y).toBeGreaterThanOrEqual(2);
  });

  it('has no piece of the mast above the top of the map', () => {
    const top = plan('~WWWWW~', '~WWWWW~', '~WWWWW~', '~WWWWW~', '~~~~~~~');
    const mast = top.filter((stamp) => describeStamp(stamp).startsWith('wreck.mast.'));
    expect(mast).toHaveLength(3);
    for (const stamp of mast) expect(stamp.y).toBe(0);
  });

  it('has plain planks under the foot of the mast, wherever the wreck lies, so that no cargo stands under the pole', () => {
    for (let shift = 0; shift < 14; shift += 1) {
      const moved = plan(...SEA.map((row) => '~'.repeat(shift) + row));
      expect(deckOn(moved, 6 + shift, 3), `moved by ${shift}`).toEqual(['wreck.deck.plain']);
      expect(deckOn(moved, 7 + shift, 3), `moved by ${shift}`).toEqual(['wreck.deck.plain']);
    }
  });

  it('has no mast on a wreck with no tile without an edge, as a hull a tile or two thick has no deck to stand it on', () => {
    expect(plan('~~~~~', '~WWW~', '~~~~~').some((stamp) => describeStamp(stamp).startsWith('wreck.mast.'))).toBe(false);
    expect(plan('~~~~~~~', '~WWWWW~', '~WWWWW~', '~~~~~~~').some((stamp) => describeStamp(stamp).startsWith('wreck.mast.'))).toBe(false);
  });
});

describe('the ground of a little wreckage', () => {
  it('is in two halves, a tile each, on the water where it is beside water', () => {
    const stamps = plan('~~~~', '~WW~', '~~~~');
    expect(onTile(stamps, 1, 1)).toEqual([expect.stringMatching(/^water\./), 'wreck.debris.left']);
    expect(onTile(stamps, 2, 1)).toEqual([expect.stringMatching(/^water\./), 'wreck.debris.right']);
  });

  it('lies on the sand where there is no water beside it', () => {
    const stamps = plan('#####', '.WW##', '.....');
    expect(onTile(stamps, 1, 1)).toEqual([expect.stringMatching(/^sand\./), 'wreck.debris.left']);
    expect(onTile(stamps, 2, 1)).toEqual([expect.stringMatching(/^sand\./), 'wreck.debris.right']);
    expect(stamps.some((stamp) => describeStamp(stamp).startsWith('water.'))).toBe(false);
  });

  it('has no deck and no mast, however it is laid out', () => {
    const stamps = plan('.....', '.WWW.', '.WW..', '.....');
    expect(stamps.some((stamp) => /^wreck\.(deck|mast|cargo|hole)/.test(describeStamp(stamp)))).toBe(false);
  });
});

describe('the ground of the shipwreck coast, which has a wreck and a little wreckage', () => {
  const coast = areaOf('shipwreck-coast');
  const kinds = coast.layout.map((row) => [...row].map((symbol) => gameContent.terrain[symbol]?.kind ?? '?'));
  const stamps = planTerrain(kinds);

  it('has the deck on every tile of the wreck in the north-west and the debris on the pair by the mast in the east', () => {
    for (const [y, row] of kinds.entries()) {
      for (const [x, kind] of row.entries()) {
        const names = wreckOn(stamps, x, y).filter((name) => !name.startsWith('wreck.mast.'));
        if (kind !== 'wreckage') expect(names, `the tile ${x},${y}`).toEqual([]);
        else if (x >= 29) expect(names, `the tile ${x},${y}`).toEqual([x === 29 ? 'wreck.debris.left' : 'wreck.debris.right']);
        else expect(names.length, `the tile ${x},${y}`).toBeGreaterThan(0);
      }
    }
  });

  it('has the mast only over the water and the wreck, never over the sand', () => {
    const mast = stamps.filter((stamp) => describeStamp(stamp).startsWith('wreck.mast.'));
    expect(mast).toHaveLength(9);
    for (const stamp of mast) expect(['water', 'wreckage']).toContain(kinds[stamp.y]?.[stamp.x]);
  });

  it('puts nothing from the sheet of the wreck on a tile that can be walked on', () => {
    for (const stamp of stamps.filter((candidate) => describeStamp(candidate).startsWith('wreck.'))) {
      const walkable = gameContent.terrain[coast.layout[stamp.y]?.[stamp.x] ?? '']?.solid === false;
      expect(walkable, `the tile ${stamp.x},${stamp.y}`).toBe(false);
    }
  });
});

describe('the ground of what has no picture yet', () => {
  it('has no stamp, so that its colour shows', () => {
    const stamps = plan('.?.', '.?.');
    expect(onTile(stamps, 1, 0)).toEqual([]);
    expect(onTile(stamps, 1, 1)).toEqual([]);
  });

  it('does not make a neighbour treat it as land', () => {
    const stamps = plan('~~~', '~?~', '~~~');
    expect(onTile(stamps, 1, 0)).toEqual([expect.stringMatching(/^water\.(plain|glint)$/)]);
  });
});

describe('the plan of a whole map', () => {
  it('has a stamp for every tile that has a picture, and only inside the map', () => {
    const rows = ['..~~', '.#T,', 'WW..'];
    const stamps = plan(...rows);
    for (const stamp of stamps) {
      expect(stamp.x).toBeGreaterThanOrEqual(0);
      expect(stamp.x).toBeLessThan(4);
      expect(stamp.y).toBeGreaterThanOrEqual(0);
      expect(stamp.y).toBeLessThan(3);
    }
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        expect(onTile(stamps, x, y).length).toBeGreaterThan(0);
      }
    }
  });
});
