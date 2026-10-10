import Phaser from 'phaser';
import type { ArrowView, Direction, GameEvent, HeroView, Point } from '../core';
import { FACING_STEP, px, TILE_SIZE } from './config';
import { DEPTH } from './depths';
import { byShooter } from './projectiles';

// The hero, the weapon in its hand, the slash of the sword and the hero's arrows in flight, as sprites. The Hunter's
// sheet has one attack pose for each direction and nothing for being hit, so the weapon, the slash and the flash of a
// hit are added here. It is all cosmetic: it runs on frame time from the Game core's view and events, and nothing the
// Game core decides depends on it.

/** The column of each direction, the same in every row of the hero's sheet. */
const COLUMN: Readonly<Record<Direction, number>> = { down: 0, up: 1, left: 2, right: 3 };
const COLUMNS = 4;
/** The rows of the sheet: four of walking, of which the first also stands still, then the attack pose. */
const WALK_ROWS = 4;
const ATTACK_ROW = 4;
/** The cell of the hero lying defeated: the first of the seventh row. */
const DEAD_FRAME = 6 * COLUMNS;
const SLASH_FRAMES = 4;

const WALK_FRAME_MS = 110;
/** The hero still counts as walking this long after its last step, so a frame without a step does not stop the stride. */
const MOVING_HOLD_MS = 100;
const SWORD_POSE_MS = 200;
const SLASH_FRAME_MS = 50;
const BOW_POSE_MS = 180;
const HURT_MS = 200;
const HURT_BLINK_MS = 60;
const HURT_COLOUR = 0xff3b3b;

/** Where the hand is in the attack pose of each direction, in pixels from the middle of the hero. */
const HAND: Readonly<Record<Direction, Point>> = {
  right: { x: 6, y: 4 },
  left: { x: -6, y: 4 },
  down: { x: 6, y: 4 },
  up: { x: 6, y: 7 },
};
/** The sword starts a swing off to one side of where the hero faces and ends it off to the other, in degrees. */
const SWORD_SWEEP_DEGREES: readonly number[] = [45, 0, -45];
/** How far in front of the hero's middle the middle of the slash and of the bow are, in pixels. */
const SLASH_REACH = 8;
const BOW_REACH = 10;

/** The way each direction points on the screen, clockwise from the right, in degrees. */
const FACING_DEGREES: Readonly<Record<Direction, number>> = { right: 0, down: 90, left: 180, up: 270 };

type Weapon = 'sword' | 'bow';

interface Pose {
  readonly weapon: Weapon;
  readonly direction: Direction;
  msIn: number;
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export class HeroSprite {
  private readonly scene: Phaser.Scene;
  private readonly figure: Phaser.GameObjects.Sprite;
  private readonly sword: Phaser.GameObjects.Image;
  private readonly bow: Phaser.GameObjects.Image;
  private readonly slash: Phaser.GameObjects.Sprite;
  private readonly arrows: Phaser.GameObjects.Image[] = [];
  private pose: Pose | null = null;
  private hurtMsIn: number | null = null;
  private lying = false;
  private walkMs = 0;
  private movingMsLeft = 0;
  private lastPosition: Point | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.figure = scene.add.sprite(0, 0, 'hero', 0).setDepth(DEPTH.hero).setVisible(false);
    // The sword is held by the top of its guard, so it turns about the hand.
    this.sword = scene.add.image(0, 0, 'sword-held').setOrigin(0.5, 1 / 11).setVisible(false);
    this.bow = scene.add.image(0, 0, 'bow-held').setVisible(false);
    this.slash = scene.add.sprite(0, 0, 'slash', 0).setDepth(DEPTH.slash).setVisible(false);
  }

  /** Starts what the events the Game core just reported look like on the hero. */
  show(events: readonly GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'hero-attacked':
          this.startPose('sword', event.direction);
          break;
        case 'hero-shot':
          this.startPose('bow', event.direction);
          break;
        case 'hero-hit':
          this.hurtMsIn = 0;
          break;
        case 'area-changed':
          this.pose = null;
          this.lastPosition = null;
          break;
        case 'hero-defeated':
          // The hero lies where the last frame drew it until the scene says the fall is over (see getUp). The blink of
          // the blow that did it goes on meanwhile.
          this.pose = null;
          this.lying = true;
          break;
      }
    }
  }

  /** The fall is over and the hero stands at its Checkpoint, whole again: nothing of the life that ended shows on it. */
  getUp(): void {
    this.lying = false;
    this.pose = null;
    this.hurtMsIn = null;
    this.lastPosition = null;
    this.movingMsLeft = 0;
    this.walkMs = 0;
  }

  private startPose(weapon: Weapon, direction: Direction): void {
    this.pose = { weapon, direction, msIn: 0 };
  }

  /** Lets one frame's time pass. */
  age(frameMs: number): void {
    if (this.pose !== null) {
      this.pose.msIn += frameMs;
      if (this.pose.msIn >= (this.pose.weapon === 'sword' ? SWORD_POSE_MS : BOW_POSE_MS)) {
        this.pose = null;
      }
    }
    if (this.hurtMsIn !== null) {
      this.hurtMsIn += frameMs;
      if (this.hurtMsIn >= HURT_MS) {
        this.hurtMsIn = null;
      }
    }
    this.movingMsLeft = Math.max(0, this.movingMsLeft - frameMs);
    this.walkMs = this.movingMsLeft > 0 ? this.walkMs + frameMs : 0;
  }

  /** Puts every sprite where and how the view says. Of the arrows in the air it draws the hero's own. */
  draw(hero: HeroView, arrows: readonly ArrowView[]): void {
    this.noteMoving(hero.position);
    const middle = { x: px(hero.position.x), y: px(hero.position.y) };
    this.figure.setPosition(middle.x, middle.y).setFrame(this.heroFrame(hero.facing)).setVisible(true);
    this.flash();
    this.sword.setVisible(false);
    this.bow.setVisible(false);
    this.slash.setVisible(false);
    if (this.pose !== null) {
      if (this.pose.weapon === 'sword') {
        this.drawSword(middle, this.pose);
      } else {
        this.drawBow(middle, this.pose);
      }
    }
    this.drawArrows(byShooter(arrows).hero);
  }

  private noteMoving(position: Point): void {
    const last = this.lastPosition;
    if (last !== null && (last.x !== position.x || last.y !== position.y)) {
      this.movingMsLeft = MOVING_HOLD_MS;
    }
    this.lastPosition = { x: position.x, y: position.y };
  }

  private heroFrame(facing: Direction): number {
    if (this.lying) {
      return DEAD_FRAME;
    }
    if (this.pose !== null) {
      return ATTACK_ROW * COLUMNS + COLUMN[this.pose.direction];
    }
    const row = this.movingMsLeft > 0 ? Math.floor(this.walkMs / WALK_FRAME_MS) % WALK_ROWS : 0;
    return row * COLUMNS + COLUMN[facing];
  }

  /** The hero blinks red from a hit: a flat colour over the whole picture, on and off. */
  private flash(): void {
    if (this.hurtMsIn !== null && Math.floor(this.hurtMsIn / HURT_BLINK_MS) % 2 === 0) {
      this.figure.setTint(HURT_COLOUR).setTintMode(Phaser.TintModes.FILL);
    } else {
      this.figure.clearTint();
    }
  }

  /** The sword swings in three steps from one side to the other, with the slash following it. */
  private drawSword(middle: Point, pose: Pose): void {
    const { direction, msIn } = pose;
    const step = Math.min(
      SWORD_SWEEP_DEGREES.length - 1,
      Math.floor((msIn / SWORD_POSE_MS) * SWORD_SWEEP_DEGREES.length),
    );
    const blade = FACING_DEGREES[direction] + (SWORD_SWEEP_DEGREES[step] ?? 0);
    const hand = HAND[direction];
    // The picture of the sword has its blade pointing down, so facing down is no turn at all.
    this.sword
      .setPosition(middle.x + hand.x, middle.y + hand.y)
      .setRotation(radians(blade - 90))
      .setDepth(DEPTH.heroWeapon)
      .setVisible(true);
    const front = FACING_STEP[direction];
    this.slash
      .setPosition(middle.x + front.x * SLASH_REACH, middle.y + front.y * SLASH_REACH)
      .setFrame(Math.min(SLASH_FRAMES - 1, Math.floor(msIn / SLASH_FRAME_MS)))
      .setRotation(radians(FACING_DEGREES[direction]))
      .setVisible(true);
  }

  /** The bow is held out in front, its belly towards where the arrow goes. */
  private drawBow(middle: Point, pose: Pose): void {
    const { direction } = pose;
    const front = FACING_STEP[direction];
    // The bow is 15 by 7 pixels, odd both ways, so its middle sits on the middle of a pixel to keep its edges whole.
    this.bow
      .setPosition(middle.x + front.x * BOW_REACH + 0.5, middle.y + front.y * BOW_REACH + 0.5)
      .setRotation(radians(FACING_DEGREES[direction] - 90))
      .setDepth(direction === 'up' ? DEPTH.heroWeaponBehind : DEPTH.heroWeapon)
      .setVisible(true);
  }

  /** Each arrow flies point first, its head at the front of the box the Game core flies, and its fletching trailing. */
  private drawArrows(arrows: readonly ArrowView[]): void {
    arrows.forEach((arrow, index) => {
      const sprite = this.arrowSprite(index);
      const front = FACING_STEP[arrow.direction];
      const back = sprite.width / 2 - (arrow.size * TILE_SIZE) / 2;
      // The picture is 13 by 5 pixels, odd both ways, so its middle sits on the middle of a pixel to keep its edges whole.
      sprite
        .setPosition(
          Math.floor(arrow.position.x * TILE_SIZE - front.x * back) + 0.5,
          Math.floor(arrow.position.y * TILE_SIZE - front.y * back) + 0.5,
        )
        .setRotation(radians(FACING_DEGREES[arrow.direction]))
        .setVisible(true);
    });
    for (let index = arrows.length; index < this.arrows.length; index += 1) {
      this.arrows[index]?.setVisible(false);
    }
  }

  private arrowSprite(index: number): Phaser.GameObjects.Image {
    let sprite = this.arrows[index];
    if (sprite === undefined) {
      sprite = this.scene.add.image(0, 0, 'arrow').setDepth(DEPTH.arrow);
      this.arrows[index] = sprite;
    }
    return sprite;
  }
}
