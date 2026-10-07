import { describe, expect, it } from 'vitest';
import { byShooter } from '../src/adapter/projectiles';
import type { ArrowView } from '../src/core';

function flying(shooter: ArrowView['shooter'], x: number): ArrowView {
  return { position: { x, y: 1.5 }, direction: 'right', size: 0.3, shooter };
}

describe('telling the hero\'s arrows from the projectiles of monsters', () => {
  it('gives each shooter only its own, in the order they fly', () => {
    const { hero, monster } = byShooter([flying('hero', 1.5), flying('monster', 2.5), flying('hero', 3.5), flying('monster', 4.5)]);
    expect(hero.map((arrow) => arrow.position.x)).toEqual([1.5, 3.5]);
    expect(monster.map((arrow) => arrow.position.x)).toEqual([2.5, 4.5]);
  });

  it('keeps a projectile of a monster out of the hero\'s arrows when it is the only one in the air', () => {
    const { hero, monster } = byShooter([flying('monster', 6.5)]);
    expect(hero).toEqual([]);
    expect(monster).toHaveLength(1);
  });

  it('has nothing for either shooter when nothing is in the air', () => {
    expect(byShooter([])).toEqual({ hero: [], monster: [] });
  });
});
