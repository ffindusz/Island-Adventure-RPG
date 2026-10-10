import type Phaser from 'phaser';
import type { ArrowView, Direction } from '../core';
import { px } from './config';
import { DEPTH } from './depths';

// What the monsters shoot, as sprites: the energy orb of the pack, in purple, four frames that pulse. It is a round
// ball with a tail, nothing like the hero's arrow (hero-sprite.ts), and shared by every ranged monster. The picture is
// bigger than the 0.3 tile body the Game core flies, so a shot that grazes the picture can still miss. All of it is
// cosmetic: it runs on frame time from the Game core's view.

const FRAMES = 4;
const FRAME_MS = 80;
/** The orb is drawn with its tail down, so a shot that flies up needs no turn. How far each direction turns it, in degrees. */
const TURN_DEGREES: Readonly<Record<Direction, number>> = { up: 0, right: 90, down: 180, left: 270 };

export class ProjectileSprites {
  private readonly scene: Phaser.Scene;
  private readonly sprites: Phaser.GameObjects.Sprite[] = [];
  private ageMs = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Lets one frame's time pass. */
  age(frameMs: number): void {
    this.ageMs += frameMs;
  }

  /** Puts an orb on each of these shots, and hides the orbs there are no shots for. */
  draw(shots: readonly ArrowView[]): void {
    const frame = Math.floor(this.ageMs / FRAME_MS) % FRAMES;
    shots.forEach((shot, index) => {
      this.spriteAt(index)
        .setPosition(px(shot.position.x), px(shot.position.y))
        .setFrame(frame)
        .setRotation((TURN_DEGREES[shot.direction] * Math.PI) / 180)
        .setVisible(true);
    });
    for (let index = shots.length; index < this.sprites.length; index += 1) {
      this.sprites[index]?.setVisible(false);
    }
  }

  private spriteAt(index: number): Phaser.GameObjects.Sprite {
    let sprite = this.sprites[index];
    if (sprite === undefined) {
      sprite = this.scene.add.sprite(0, 0, 'projectile-orb', 0).setDepth(DEPTH.monsterShot);
      this.sprites[index] = sprite;
    }
    return sprite;
  }
}
