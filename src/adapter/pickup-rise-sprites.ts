import type Phaser from 'phaser';
import type { Point } from '../core';
import { px } from './config';
import { DEPTH } from './depths';
import type { PickupRise } from './feedback';
import { pickupIcon } from './notice';

// The picture of what the hero just picked up, rising over its head as it fades: the player sees what came into the
// pack at the moment it does, as well as being told of it by the notice (notice.ts). How long it takes, and which place
// beside the others a picture has, is feedback.ts's; this says where and how opaque it draws at each point of its time.

/** How far the picture rises in all, in pixels. */
const RISE_PX = 12;
/** The picture stays whole for this share of its time, so that it can be seen, and fades away over the rest. */
const WHOLE_UNTIL = 0.4;
/** From the middle of the hero up to the foot of the picture: the hero's picture is 16 pixels tall. */
const HEAD_PX = 8;
/** How far apart the pictures that rise together stand, a little more than the 16 pixels of the widest. */
const LANE_PX = 18;

/** Where the picture's bottom left corner is, in pixels of the world, and how opaque it is, from 0 to 1. */
interface Placement {
  readonly left: number;
  readonly bottom: number;
  readonly alpha: number;
}

/**
 * Where a rising picture of the given width draws, with the hero's middle at `hero` in tiles. It rises quickly at
 * first and slower after, and it is always on whole pixels, so that the pixel art is not blurred.
 */
export function placementOf(rise: PickupRise, hero: Point, width: number): Placement {
  const lift = Math.round(RISE_PX * (1 - (1 - rise.progress) ** 2));
  return {
    left: px(hero.x) + rise.lane * LANE_PX - Math.floor(width / 2),
    bottom: px(hero.y) - HEAD_PX - lift,
    alpha: rise.progress <= WHOLE_UNTIL ? 1 : (1 - rise.progress) / (1 - WHOLE_UNTIL),
  };
}

export class PickupRiseSprites {
  private readonly scene: Phaser.Scene;
  private readonly sprites: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Puts each rising picture over the hero, and hides the sprites there is nothing left for. */
  draw(rises: readonly PickupRise[], hero: Point): void {
    rises.forEach((rise, index) => {
      const icon = pickupIcon(rise.item);
      let sprite = this.sprites[index];
      if (sprite === undefined) {
        sprite = this.scene.add.image(0, 0, icon).setOrigin(0, 1).setDepth(DEPTH.pickupRise);
        this.sprites[index] = sprite;
      }
      sprite.setTexture(icon);
      const place = placementOf(rise, hero, sprite.width);
      sprite.setPosition(place.left, place.bottom).setAlpha(place.alpha).setVisible(true);
    });
    for (const sprite of this.sprites.slice(rises.length)) {
      sprite.setVisible(false);
    }
  }
}
