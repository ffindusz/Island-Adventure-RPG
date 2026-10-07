import type { Checkpoint } from './content';
import type { AreaDefinition } from './definitions';
import type { Box, Tile } from './geometry';

// Loading the Checkpoints of an Adventure Area: the safe places the hero activates by touching them. content.ts calls
// this while it loads each area; the rules for activating a Checkpoint and for defeat are in checkpoints.ts.

/**
 * The Checkpoints of one Adventure Area. Every area needs at least one. Each stands on a walkable tile where no monster
 * starts, since the hero can stand there after defeat. `usedIds` holds the ids of the areas loaded so far: an id is
 * used once in all of them.
 */
export function loadCheckpoints(
  area: AreaDefinition,
  isWalkable: (tile: Tile) => boolean,
  usedIds: Set<string>,
): Checkpoint[] {
  const checkpoints = area.checkpoints ?? [];
  if (checkpoints.length === 0) {
    throw new Error(`Area "${area.id}" has no Checkpoint`);
  }
  return checkpoints.map((checkpoint) => {
    if (usedIds.has(checkpoint.id)) {
      throw new Error(`Checkpoint id "${checkpoint.id}" is used more than once`);
    }
    usedIds.add(checkpoint.id);
    const placed = `Area "${area.id}": Checkpoint "${checkpoint.id}" is placed at ${describeTile(checkpoint.tile)}`;
    if (!isWalkable(checkpoint.tile)) {
      throw new Error(`${placed}, which is solid terrain or outside the map`);
    }
    const monster = area.monsters.find(({ tile }) => tile.col === checkpoint.tile.col && tile.row === checkpoint.tile.row);
    if (monster !== undefined) {
      throw new Error(`${placed}, where monster "${monster.id}" starts`);
    }
    return { id: checkpoint.id, tile: checkpoint.tile, body: tileBox(checkpoint.tile) };
  });
}

function describeTile(tile: Tile): string {
  return `(col ${tile.col}, row ${tile.row})`;
}

/** The box of a tile, in tile units like the other bodies. */
function tileBox({ col, row }: Tile): Box {
  return { minX: col, minY: row, maxX: col + 1, maxY: row + 1 };
}
