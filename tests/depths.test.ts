import { describe, expect, it } from 'vitest';
import { DEPTH } from '../src/adapter/depths';

// What draws above what is a rule of the screens that the comments of the adapter and the README lean on: a wind-up is
// never hidden by a chest, a page that opens covers the notice, and nothing is over the audio line. The numbers are
// free to change; the order is not.

type Part = keyof typeof DEPTH;

/** The parts of the play screen, from the ground up, each over the one before. */
const PLAY_SCREEN: readonly Part[] = [
  'exit',
  'prop',
  'telegraph',
  'flatShapes',
  'monster',
  'monsterBar',
  'monsterShot',
  'puff',
  'arrow',
  'heroWeaponBehind',
  'hero',
  'heroWeapon',
  'slash',
  'effects',
  'pickupRise',
  'hud',
  'areaBanner',
  'controlsLine',
  'notice',
  'overlay',
  'openingCard',
  'audioLine',
];

describe('what draws above what', () => {
  it('stacks the play screen from the ground up, each part strictly over the one before', () => {
    PLAY_SCREEN.reduce((under, over) => {
      expect(DEPTH[over], `${over} over ${under}`).toBeGreaterThan(DEPTH[under]);
      return over;
    });
  });

  it('puts the backdrop of the title and the ending under their windows, and the audio line over them', () => {
    expect(DEPTH.backdrop).toBeLessThan(DEPTH.title);
    expect(DEPTH.backdrop).toBeLessThan(DEPTH.ending);
    expect(DEPTH.title).toBeLessThan(DEPTH.audioLine);
    expect(DEPTH.ending).toBeLessThan(DEPTH.audioLine);
  });

  it('leaves nothing over the audio line, whichever screen it is on', () => {
    const overIt = Object.entries(DEPTH).filter(([part, depth]) => part !== 'audioLine' && depth >= DEPTH.audioLine);
    expect(overIt).toEqual([]);
  });
});
