import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import type { AreaDefinition, ExitDefinition, InteractableDefinition, Tile } from '../src/core';
import { playingView } from './fixtures';
import { AREA_IDS, type AreaId, areaOf, routeOf, walkAssigning, wayInOf } from './main-route';
import { keyOf, neighboursOf, openTilesOf, quietGameOf, routeBetween } from './routes';

// The criterion of whole-route validation, read in one place over the content the game ships with: five Adventure Areas
// in order, exits both ways, an entrance Checkpoint in every area and one immediately before the Guardian, exactly one
// Guardian, the harbor out of reach but through it, and no key, lever or door on the main route. The rules behind each
// are the core's, tested on purpose-built content (area-connections, checkpoints, guardian-validation, vessel-validation,
// device-routes); that the hero arrives at the entrance an exit names is shipped-areas.test.ts, and the walk to the
// vessel once the Guardian has fallen is the-harbor.test.ts. What these add is the shipped content taken whole: they read
// its data and its maps, and walk the main route once, in one game, from the start to the Guardian's Checkpoint.

/** What a puzzle is made of: the main route may have none of them, but for the Guardian's gate on the way to the harbor. */
const PUZZLE_KINDS: readonly string[] = ['key', 'door', 'gate', 'lever'];

const LAST_AREA = AREA_IDS[4];

const GUARDIAN_TYPES = Object.entries(gameContent.monsterTypes).flatMap(([name, type]) =>
  type.behavior === 'guardian' ? [name] : [],
);

/** Every Guardian the content places, with the area it stands in. */
const GUARDIANS = gameContent.areas.flatMap((area) =>
  area.monsters.filter(({ type }) => GUARDIAN_TYPES.includes(type)).map((guardian) => ({ area, guardian })),
);

/** The Guardian of the content, its area, the gate that its defeat opens and the vessel behind that gate. */
function harborOf(): {
  area: AreaDefinition;
  guardian: { id: string; tile: Tile };
  gate: InteractableDefinition;
  vessel: InteractableDefinition;
} {
  const first = GUARDIANS[0];
  if (first === undefined) {
    throw new Error('The content places no Guardian');
  }
  const { area, guardian } = first;
  const items = area.interactables ?? [];
  const gate = items.find((item) => item.kind === 'gate' && item.opensWhenDefeated === guardian.id);
  const vessel = items.find((item) => item.kind === 'vessel');
  if (gate === undefined || vessel === undefined) {
    throw new Error(
      `The area "${area.id}" has no ${gate === undefined ? `gate that opens when ${guardian.id} falls` : 'vessel'}`,
    );
  }
  return { area, guardian, gate, vessel };
}

/** Where the hero can stand with every door and gate open but the Guardian's, which only its defeat opens. */
function openButTheGate(area: AreaDefinition, gate: InteractableDefinition): (tile: Tile) => boolean {
  const everyDoorOpen = openTilesOf(gameContent, area, true);
  return (tile) => everyDoorOpen(tile) && keyOf(tile) !== keyOf(gate.tile);
}

/** Every tile the hero can walk to from a tile over open ground, as "col,row". */
function reachableFrom(isOpen: (tile: Tile) => boolean, from: Tile): Set<string> {
  const reached = new Set([keyOf(from)]);
  const frontier = [from];
  for (const tile of frontier) {
    for (const next of neighboursOf(tile)) {
      if (!reached.has(keyOf(next)) && isOpen(next)) {
        reached.add(keyOf(next));
        frontier.push(next);
      }
    }
  }
  return reached;
}

/** Where the hero comes into an area on the main route, for an area of the adventure. */
function wayInTo(area: AreaDefinition): Tile {
  const id = AREA_IDS.find((candidate) => candidate === area.id);
  if (id === undefined) {
    throw new Error(`"${area.id}" is none of the five Adventure Areas`);
  }
  return wayInOf(id);
}

/** The areas that the exits lead through from where the adventure starts, each exit taken to an area not yet seen. */
function chainFromStart(): { areas: string[]; forks: string[] } {
  const areas = [gameContent.start.area];
  const forks: string[] = [];
  let here: string | undefined = gameContent.start.area;
  while (here !== undefined) {
    const onward: ExitDefinition[] = (areaOf(here).exits ?? []).filter(({ to }) => !areas.includes(to.area));
    if (onward.length > 1) {
      forks.push(here);
    }
    here = onward[0]?.to.area;
    if (here !== undefined) {
      areas.push(here);
    }
  }
  return { areas, forks };
}

const PAIRS = AREA_IDS.flatMap((from, index) => {
  const to = AREA_IDS[index + 1];
  return to === undefined ? [] : [[from, to] as const];
});

const exitsBetween = (from: AreaId, to: AreaId) => (areaOf(from).exits ?? []).filter((exit) => exit.to.area === to);
const hasEntrance = (areaId: AreaId, entrance: string) =>
  (areaOf(areaId).entrances ?? []).some(({ id }) => id === entrance);

/** The puzzle pieces of an area that stand on a route. */
function puzzlesOn(area: AreaDefinition, route: readonly Tile[]): string[] {
  const onRoute = new Set(route.map(keyOf));
  return (area.interactables ?? [])
    .filter(({ kind, tile }) => PUZZLE_KINDS.includes(kind) && onRoute.has(keyOf(tile)))
    .map(({ id }) => id);
}

describe('the whole route of the adventure', () => {
  it('has five Adventure Areas, and the exits lead on from the start through them in order', () => {
    const { areas, forks } = chainFromStart();

    expect(areas).toEqual([...AREA_IDS]);
    expect(forks).toEqual([]);
    expect(gameContent.areas.map(({ id }) => id).sort()).toEqual([...AREA_IDS].sort());
  });

  it.each(PAIRS)(
    'leads from %s on to %s by an exit that names an entrance there, and back by an exit that names an entrance here',
    (from, to) => {
      expect(exitsBetween(from, to).map(({ to: place }) => hasEntrance(to, place.entrance))).toEqual([true]);
      expect(exitsBetween(to, from).map(({ to: place }) => hasEntrance(from, place.entrance))).toEqual([true]);
    },
  );

  it.each(AREA_IDS)('puts a Checkpoint at the way in of %s', (id) => {
    expect((areaOf(id).checkpoints ?? []).map(({ tile }) => keyOf(tile))).toContain(keyOf(wayInOf(id)));
  });

  it('puts a Checkpoint immediately before the Guardian: on every way to it, with no ordinary monster in front of it', () => {
    const { area, guardian, gate } = harborOf();
    const wayIn = wayInTo(area);
    const isOpen = openButTheGate(area, gate);

    const before = (area.checkpoints ?? [])
      .filter((checkpoint) => {
        const without = (tile: Tile) => isOpen(tile) && keyOf(tile) !== keyOf(checkpoint.tile);
        const onEveryWay =
          keyOf(wayIn) === keyOf(checkpoint.tile) ||
          routeBetween(without, wayIn, (tile) => keyOf(tile) === keyOf(guardian.tile)) === null;
        const inFront = area.monsters.some(
          (monster) =>
            monster.id !== guardian.id &&
            routeBetween(without, guardian.tile, (tile) => keyOf(tile) === keyOf(monster.tile)) !== null,
        );
        return onEveryWay && !inFront;
      })
      .map(({ id }) => id);

    expect(before).toEqual(['guardian-checkpoint']);
  });

  it('has exactly one Guardian in the whole content, in the last area, and the content asks for it', () => {
    expect(gameContent.requireGuardian).toBe(true);
    expect(GUARDIANS.map(({ area }) => area.id)).toEqual([LAST_AREA]);
  });

  it('has one gate that waits for a Guardian, and it waits for that one', () => {
    const waiting = gameContent.areas.flatMap((area) =>
      (area.interactables ?? []).flatMap((item) =>
        item.kind === 'gate' && item.opensWhenDefeated !== undefined ? [item.opensWhenDefeated] : [],
      ),
    );

    expect(waiting).toEqual(GUARDIANS.map(({ guardian }) => guardian.id));
  });

  it('keeps the harbor behind the Guardian\'s gate: out of reach while the gate is shut, whatever other door is open, and within reach once it is open', () => {
    const { area, gate, vessel } = harborOf();
    const wayIn = wayInTo(area);
    const everyDoorOpen = openTilesOf(gameContent, area, true);
    const quay = neighboursOf(vessel.tile).filter(everyDoorOpen).map(keyOf);

    const reachedWhileShut = reachableFrom(openButTheGate(area, gate), wayIn);
    const reachedOnceOpen = reachableFrom(everyDoorOpen, wayIn);

    expect(quay.length).toBeGreaterThan(0);
    expect(quay.filter((tile) => reachedWhileShut.has(tile))).toEqual([]);
    expect(quay.filter((tile) => !reachedOnceOpen.has(tile))).toEqual([]);
  });

  it('needs no key, lever or door on the main route: every area is crossed with all of them shut, and but for the Guardian\'s gate none lies on the way to the vessel', () => {
    for (const id of AREA_IDS) {
      expect(puzzlesOn(areaOf(id), routeOf(id)), `on the route of ${id}`).toEqual([]);
    }
    const { area, gate, vessel } = harborOf();
    const shut = openTilesOf(gameContent, area);
    const checkpoint = routeOf(LAST_AREA).at(-1);
    const quay = new Set(neighboursOf(vessel.tile).map(keyOf));

    const lastLeg = routeBetween(
      (tile) => shut(tile) || keyOf(tile) === keyOf(gate.tile),
      checkpoint ?? wayInTo(area),
      (tile) => quay.has(keyOf(tile)),
    );

    expect(lastLeg).not.toBeNull();
    expect(puzzlesOn(area, lastLeg ?? [])).toEqual([gate.id]);
  });

  it('can be walked from the start to the Guardian\'s Checkpoint through the five areas in order, with every door shut', () => {
    const game = quietGameOf(gameContent);
    const activated: string[] = [];

    for (const id of AREA_IDS) {
      expect(playingView(game).area.id).toBe(id);
      for (const event of walkAssigning(game, routeOf(id))) {
        if (event.type === 'checkpoint-activated') {
          activated.push(event.checkpointId);
        }
      }
    }

    expect(activated).toEqual([
      'woods-checkpoint',
      'mountain-checkpoint',
      'cave-checkpoint',
      'castle-checkpoint',
      'guardian-checkpoint',
    ]);
  });
});
