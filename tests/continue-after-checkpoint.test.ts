import { describe, expect, it } from 'vitest';
import { createSaveStore } from '../src/adapter/save-store';
import { gameContent } from '../src/content';
import { createGame } from '../src/core';
import type { ContentDefinition, Game, GameEvent, GameView, Snapshot, Tile } from '../src/core';
import { fixedRandom, newGame, walk } from './fixtures';
import { AREA_IDS, routeOf, walkAssigning } from './main-route';
import { MemoryStorage } from './memory-storage';
import { withoutOrdinaryMonsters } from './routes';

// Continue after a Checkpoint, on the game as shipped: the hero walks the main route as in whole-route.test.ts, the game
// is saved where the autosave of the play screen saves it (at the start and at each Checkpoint the hero comes to),
// through the save store as JSON text, and a game that continues from that save must be the game that was saved, and go
// on as the game that was never saved goes on. The saved adventure of save-round-trip.test.ts does the same on a small
// content that has every kind of state in it; this is the product's own content and its own six Checkpoints. The
// ordinary monsters are left out, as in the walk of whole-route.test.ts, so that the hero is not stopped on the way.

const content: ContentDefinition = { ...gameContent, areas: withoutOrdinaryMonsters(gameContent) };

/** The Checkpoints in the order the main route comes to them: the start of the adventure is the first. */
const CHECKPOINTS = [
  'coast-checkpoint',
  'woods-checkpoint',
  'mountain-checkpoint',
  'cave-checkpoint',
  'castle-checkpoint',
  'guardian-checkpoint',
] as const;

/** How long the hero runs on into the arena from the Guardian's Checkpoint: the Guardian wakes and attacks in it. */
const ARENA_RUN_STEPS = 120;

/** The area and the tile of a Checkpoint of the content. */
function checkpointNamed(id: string): { readonly areaId: string; readonly tile: Tile } {
  for (const area of gameContent.areas) {
    const found = (area.checkpoints ?? []).find((checkpoint) => checkpoint.id === id);
    if (found !== undefined) {
      return { areaId: area.id, tile: found.tile };
    }
  }
  throw new Error(`The content has no Checkpoint "${id}"`);
}

/** The Checkpoint that a walk touched last, by its id in the content. */
function lastCheckpointOf(events: readonly GameEvent[]): string | null {
  const touched = events.flatMap((event) => (event.type === 'checkpoint-activated' ? [event.checkpointId] : []));
  return touched.at(-1) ?? null;
}

/** What the hero does after the Checkpoint that is number `from` on the route: walks the next area, or runs into the arena. */
function goOn(game: Game, from: number): GameEvent[] {
  const area = AREA_IDS[from];
  return area === undefined ? walk(game, 'right', ARENA_RUN_STEPS) : walkAssigning(game, routeOf(area));
}

/** The game at the time the hero came to a Checkpoint, and what the game that was never saved went on to do. */
interface Moment {
  /** The Checkpoint the hero has just touched, by its id: none at the start of the adventure. */
  readonly touched: string | null;
  readonly snapshot: Snapshot;
  readonly view: GameView;
  /** The events of what it did next: the walk to the next Checkpoint, or the run into the arena from the last. */
  readonly next: readonly GameEvent[];
  /** What the game held when it had done it. */
  readonly then: Snapshot;
}

let walked: readonly Moment[] | null = null;

/** The main route walked once, in one game, with a moment kept at the start and at each Checkpoint. */
function momentsOfTheRoute(): readonly Moment[] {
  if (walked !== null) {
    return walked;
  }
  const game = newGame(content);
  const moments: Moment[] = [];
  let touched: string | null = null;
  for (let from = 0; from <= AREA_IDS.length; from += 1) {
    const { snapshot, view } = { snapshot: game.snapshot(), view: game.view() };
    const next = goOn(game, from);
    moments.push({ touched, snapshot, view, next, then: game.snapshot() });
    touched = lastCheckpointOf(next);
  }
  walked = moments;
  return moments;
}

function momentAt(index: number): Moment {
  const found = momentsOfTheRoute()[index];
  if (found === undefined) {
    throw new Error(`The route has no moment number ${index}`);
  }
  return found;
}

/** A game that continues from a save, which has been through the save store as text. */
function continuedFrom(snapshot: Snapshot): Game {
  const storage = new MemoryStorage();
  createSaveStore(storage, content).write(snapshot);
  const saved = createSaveStore(storage, content).read();
  if (saved.status !== 'usable') {
    throw new Error(`The save cannot be continued from: ${JSON.stringify(saved)}`);
  }
  const game = createGame({ content, random: fixedRandom });
  game.send({ type: 'continue', snapshot: saved.snapshot });
  return game;
}

describe('the game as shipped, saved at each Checkpoint of the main route', () => {
  it('has the hero touch the Checkpoints in order, the first being the start', () => {
    expect(momentsOfTheRoute().map(({ touched }) => touched)).toEqual([null, ...CHECKPOINTS.slice(1)]);
  });

  describe.each(CHECKPOINTS.map((id, index) => ({ id, index })))('at "$id"', ({ id, index }) => {
    it('saves the place of that Checkpoint, and the save store gives the game back whole to a later visit', () => {
      const { snapshot } = momentAt(index);
      const storage = new MemoryStorage();

      expect(createSaveStore(storage, content).write(snapshot)).toBe(true);

      expect(snapshot.state.checkpoint).toMatchObject(checkpointNamed(id));
      expect(createSaveStore(storage, content).read()).toEqual({ status: 'usable', snapshot });
    });

    it('continues into a game that looks as the game looked and holds what it held', () => {
      const moment = momentAt(index);

      const restored = continuedFrom(moment.snapshot);

      expect(restored.view()).toEqual(moment.view);
      expect(restored.snapshot()).toEqual(moment.snapshot);
    });

    it('goes on as the game that was never saved went on', () => {
      const moment = momentAt(index);
      const restored = continuedFrom(moment.snapshot);

      const events = goOn(restored, index);

      expect(events).toEqual(moment.next);
      expect(restored.snapshot()).toEqual(moment.then);
    });
  });
});
