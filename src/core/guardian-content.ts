import type { Area, Checkpoint, Content, Interactable } from './content';
import type { MonsterPlacement } from './definitions';
import type { Gate } from './device-content';
import { blockedTiles, keyOf, reachableFrom, sourcesOf } from './device-routes';
import type { Place, Start } from './device-routes';
import type { Tile } from './geometry';

// Checking that the game's one Guardian has its place. Whatever the content, there is at most one Guardian, and a gate
// that waits for a Guardian names one of its own Adventure Area. Content that asks for a Guardian (`requireGuardian`,
// which the game's own content does) is refused besides when it has none, when no Checkpoint lies immediately before
// the Guardian's arena, and when the harbor that the Guardian's gate opens onto can be reached without defeating it.
// content.ts calls these once all the areas are loaded. The walking is device-routes.ts's: tiles joined up, down, left
// and right, past solid terrain and whatever stops walkers.

/** A Guardian as the content places it: a place the route must lead to, and the id that the gates waiting for it name. */
export interface GuardianSite extends Place {
  readonly monsterId: string;
  readonly area: Area;
}

/**
 * Throws an Error naming the second Guardian, or the gate that waits for something that is no Guardian of its own area.
 * Returns the Guardians the content places: none, or one.
 */
export function checkGuardians(areas: readonly Area[], monsterTypes: Content['monsterTypes']): GuardianSite[] {
  const sites: GuardianSite[] = [];
  for (const area of areas) {
    for (const monster of area.monsters) {
      if (behaviorOf(monsterTypes, monster.type) !== 'guardian') {
        continue;
      }
      const first = sites[0];
      if (first !== undefined) {
        throw new Error(
          `Area "${area.id}": monster "${monster.id}" is a second Guardian, after "${first.monsterId}" of area "${first.areaId}": there is only one`,
        );
      }
      sites.push({ areaId: area.id, area, what: `Guardian "${monster.id}"`, tile: monster.tile, monsterId: monster.id });
    }
  }
  checkGatesNameTheirGuardians(areas, monsterTypes);
  return sites;
}

function behaviorOf(monsterTypes: Content['monsterTypes'], name: string): string {
  const type = monsterTypes[name];
  if (type === undefined) {
    throw new Error(`There is no monster type "${name}"`);
  }
  return type.behavior;
}

function checkGatesNameTheirGuardians(areas: readonly Area[], monsterTypes: Content['monsterTypes']): void {
  for (const area of areas) {
    for (const interactable of area.interactables) {
      if (!isGuardianGate(interactable)) {
        continue;
      }
      const named = interactable.opensWhenDefeated;
      const refusal = `Area "${area.id}": gate "${interactable.id}" opens when "${named}" is defeated, but`;
      const owner = areas.find((candidate) => candidate.monsters.some((monster) => monster.id === named));
      const placement = owner?.monsters.find((monster) => monster.id === named);
      if (owner === undefined || placement === undefined) {
        throw new Error(`${refusal} no monster has that id`);
      }
      if (owner.id !== area.id) {
        throw new Error(`${refusal} that monster is in area "${owner.id}", not in this one`);
      }
      const behavior = behaviorOf(monsterTypes, placement.type);
      if (behavior !== 'guardian') {
        throw new Error(`${refusal} that monster is not a Guardian: its behavior is "${behavior}"`);
      }
    }
  }
}

/** A gate that opens when a Guardian is defeated, which no lever moves. */
function isGuardianGate(interactable: Interactable): interactable is Gate & { readonly opensWhenDefeated: string } {
  return interactable.kind === 'gate' && interactable.opensWhenDefeated !== null;
}

/**
 * What content that asks for a Guardian must have: exactly one, a Checkpoint immediately before its arena, and a harbor
 * that its gate opens onto. `guardians` is what `checkGuardians` found. Content that does not ask is never refused here.
 */
export function checkGuardianPlace(start: Start, guardians: readonly GuardianSite[], asked: boolean): void {
  if (!asked) {
    return;
  }
  const guardian = guardians[0];
  if (guardian === undefined) {
    throw new Error('The content places no Guardian, but exactly one is required');
  }
  checkCheckpointBefore(guardian, start);
  checkHarbor(guardian, start);
}

/**
 * A Checkpoint of the Guardian's Adventure Area is immediately before its arena when (i) every walkable way to the
 * Guardian's tile from where the hero comes into the area goes over the Checkpoint's tile, which a Checkpoint in a room
 * that can be walked round does not, and (ii) no ordinary monster starts on the Guardian's side of it: where the
 * Guardian can be walked to from without stepping on the Checkpoint. Every door and gate is open, the most ways there
 * are, but the gates that wait for a Guardian: they stay shut until it is defeated, so no way leads through them, and the
 * harbor is not counted.
 */
function checkCheckpointBefore(guardian: GuardianSite, start: Start): void {
  const { area } = guardian;
  const refusal = `Area "${area.id}": ${guardian.what} has no Checkpoint immediately before it`;
  const guardianKey = keyOf(guardian.tile);
  const blocked = blockedTiles(area, isGuardianGate);
  const reaching = sourcesOf(area, start).filter((source) => reachableFrom(area, source.tile, blocked).has(guardianKey));
  if (reaching.length === 0) {
    throw new Error(`${refusal}: no entrance and no start of the area leads to it`);
  }
  const onEveryWay = area.checkpoints.filter((checkpoint) => {
    const checkpointKey = keyOf(checkpoint.tile);
    const without = new Set([...blocked, checkpointKey]);
    return reaching.every(
      (source) => keyOf(source.tile) === checkpointKey || !reachableFrom(area, source.tile, without).has(guardianKey),
    );
  });
  if (onEveryWay.length === 0) {
    throw new Error(`${refusal}: no Checkpoint of the area lies on every way to it`);
  }
  const crowded: { checkpoint: Checkpoint; stray: MonsterPlacement; sideSize: number }[] = [];
  for (const checkpoint of onEveryWay) {
    const side = reachableFrom(area, guardian.tile, new Set([...blocked, keyOf(checkpoint.tile)]));
    const stray = area.monsters.find((monster) => monster.id !== guardian.monsterId && side.has(keyOf(monster.tile)));
    if (stray === undefined) {
      return;
    }
    crowded.push({ checkpoint, stray, sideSize: side.size });
  }
  // The Checkpoint nearest the arena is the one to say a monster stands in front of.
  const nearest = crowded.reduce((best, candidate) => (candidate.sideSize < best.sideSize ? candidate : best));
  throw new Error(`${refusal}: monster "${nearest.stray.id}" stands between Checkpoint "${nearest.checkpoint.id}" and it`);
}

function checkHarbor(guardian: GuardianSite, start: Start): void {
  const { area } = guardian;
  const opensWhenDefeated = (interactable: Interactable) =>
    isGuardianGate(interactable) && interactable.opensWhenDefeated === guardian.monsterId;
  if (!area.interactables.some(opensWhenDefeated)) {
    throw new Error(`Area "${area.id}": no gate opens when ${guardian.what} is defeated: the harbor must lie behind one`);
  }
  if (tilesBehindGuardianGates(area, start).length === 0) {
    throw new Error(
      `Area "${area.id}": nothing lies behind the gate that ${guardian.what} opens: the harbor must be out of reach until it is defeated`,
    );
  }
}

/**
 * The harbor: the walkable tiles that the hero cannot reach from where it comes into the Adventure Area while the gates
 * that wait for a Guardian are shut, and can reach with them open, every other door and gate being open in both cases.
 * The tiles of the gates themselves are not among them. Row by row, from the top.
 */
export function tilesBehindGuardianGates(area: Area, start: Start): Tile[] {
  const sources = sourcesOf(area, start);
  const reachedFrom = (blocked: ReadonlySet<string>) =>
    new Set(sources.flatMap((source) => [...reachableFrom(area, source.tile, blocked)]));
  const gatesShut = reachedFrom(blockedTiles(area, isGuardianGate));
  const everythingOpen = reachedFrom(blockedTiles(area, () => false));
  const gates = new Set(
    area.interactables.filter(isGuardianGate).map((gate) => keyOf({ col: gate.body.minX, row: gate.body.minY })),
  );
  const tiles: Tile[] = [];
  for (let row = 0; row < area.height; row += 1) {
    for (let col = 0; col < area.width; col += 1) {
      const key = keyOf({ col, row });
      if (everythingOpen.has(key) && !gatesShut.has(key) && !gates.has(key)) {
        tiles.push({ col, row });
      }
    }
  }
  return tiles;
}
