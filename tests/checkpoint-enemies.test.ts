import { describe, expect, it } from 'vitest';
import type { CheckpointDefinition } from '../src/core';
import { advance, playingView, walk } from './fixtures';
import { chargerAt, enemyField, shooterAt } from './enemy-fixtures';

// Chargers and ranged attackers with the Checkpoints and the defeat of Checkpoints (checkpoints.test.ts). The timelines
// are those of charger.test.ts and projectile.test.ts: a charger or a shooter in the tile (2, 3) launches its dash or
// fires in step 31, the dash, 0.25 tile a step, would meet a hero who stays at (6.5, 3.5) in step 45 and the shot, 0.0625
// tile a step, in step 89.

const CAMP: CheckpointDefinition = { id: 'camp', tile: { col: 5, row: 3 } };
const CAMP_ACTIVATED = { type: 'checkpoint-activated', checkpointId: 'camp' } as const;

describe('a hero who comes onto a Checkpoint as a monster defeats it', () => {
  // The hero has 4 Health, which a shot and a dash take. It walks left, toward the monster, and its body overlaps the
  // camp, on the tile (5, 3), from its 3rd step: its left edge goes from 6.25 to 5.875, past the edge of the camp at 6.
  it('counts a projectile as it does any hit: the Checkpoint is activated first, and the hero is back on it', () => {
    // The front of the shot is at 5.875 in step 83, and in step 82 it is at 5.8125, short of the hero's edge at 6.
    const game = enemyField([shooterAt('shooter-1', 2, 3)], { hero: { health: 4 }, checkpoints: [CAMP] });
    advance(game, 80);

    const events = walk(game, 'left', 3); // steps 81 to 83

    expect(events).toEqual([
      CAMP_ACTIVATED,
      { type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 0 },
      { type: 'hero-defeated' },
    ]);
    const view = playingView(game);
    expect(view.hero).toMatchObject({ position: { x: 5.5, y: 3.5 }, health: 4 });
    expect(view.checkpoints).toEqual([{ id: 'camp', position: { x: 5.5, y: 3.5 }, size: 1, active: true }]);
  });

  it('counts a dash the same way', () => {
    // The back of the charger is at 5.75 in step 43, a gap of 0.25 short of the hero's edge at 6, and its dash of 0.25
    // reaches the hero, at 5.875, in step 44.
    const game = enemyField([chargerAt('charger-1', 2, 3)], { hero: { health: 4 }, checkpoints: [CAMP] });
    advance(game, 41);

    const events = walk(game, 'left', 3); // steps 42 to 44

    expect(events).toEqual([
      CAMP_ACTIVATED,
      { type: 'hero-hit', monsterId: 'charger-1', damage: 6, health: 0 },
      { type: 'hero-defeated' },
    ]);
    const view = playingView(game);
    expect(view.hero).toMatchObject({ position: { x: 5.5, y: 3.5 }, health: 4 });
    expect(view.checkpoints).toEqual([{ id: 'camp', position: { x: 5.5, y: 3.5 }, size: 1, active: true }]);
  });
});
