import type Phaser from 'phaser';
import type { Direction, GameEvent, MonsterView, PlayingView, Point } from '../core';
import { frameSize, monsterArt } from './artwork';
import type { ArtName } from './artwork';
import { scrollFor } from './camera';
import { FACING_STEP, px } from './config';
import { DEPTH } from './depths';
import type { Rect } from './pixel-font';

// The monsters of the areas whose art is final, as sprites. Each sheet has four columns, the way the monster faces
// (down, up, left, right), and the rows are the frames of its walk, then one of a white shape for a hit and one of a red
// one for a wind-up (docs/assets/compose-art.py). `MonsterView` has no facing, so it is worked out here: from the last
// step, from the direction of a dash, and, while the monster winds up, towards the hero. All of it is cosmetic: it runs
// on frame time from the Game core's view and events, and nothing the Game core decides depends on it.

const COLUMN: Readonly<Record<Direction, number>> = { down: 0, up: 1, left: 2, right: 3 };
const COLUMNS = 4;
/** The rows after the frames of the walk: the white one of a hit, then the red one of a wind-up. */
const EXTRA_ROWS = 2;

const WALK_FRAME_MS = 140;
/** A monster standing still goes through the same frames, slowly, so that it does not look frozen. */
const IDLE_FRAME_MS = 420;
/** A monster still counts as moving this long after its last step, so a frame without a step does not stop the stride. */
const MOVING_HOLD_MS = 100;
/** A wind-up shows its red frame in the first of this many equal parts of it, hides it in the next, and so on, so that it ends on. */
const WARN_PARTS = 7;
/** A wind-up shakes the monster one pixel to either side, this many times in each part of it. */
const SHAKES_PER_PART = 2;
const RESTING_TINT = 0xa8a8a8;
/** The faded copies of a dashing monster left behind it, nearest first, by how much of the picture shows. */
const DASH_TRAIL_ALPHAS: readonly number[] = [0.5, 0.3, 0.15];

const PUFF_ART = 'fx-puff' satisfies ArtName;
const PUFF_FRAMES = 6;
const PUFF_FRAME_MS = 55;
const PUFF_CELL = frameSize(PUFF_ART).width;
/** The puff's smoke starts low in its cell and rises as it spreads, so its cell sits this far above the body's middle. */
const PUFF_LIFT = 18;
/** The monster that fell stays as a white shape over its puff for this long, fading out. */
const SHAPE_FADE_MS = 120;

const BAR_OUTLINE = 0x1b1b24;
const BAR_HEALTH = 0x7bd35f;
const BAR_HEIGHT = 4;

/** Which way a step of (dx, dy) goes: along the longer of the two. */
function directionOf(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? 'left' : 'right';
  }
  return dy < 0 ? 'up' : 'down';
}

/** Whether a wind-up that is `progress` of the way through is showing its red at this moment: on at the very end. */
function warnsNow(progress: number): boolean {
  return Math.floor(progress * WARN_PARTS) % 2 === 0;
}

/**
 * Where the Health bar of a monster goes: just above its picture, as wide as its body and in the middle of the picture.
 * The box is the bar's outline, in canvas pixels; the green lies inside it. A picture that reaches above the top of the
 * screen (the Guardian against the arena's north wall, the hero far south) has its bar at the top of the screen, so that
 * it stays in view as long as the picture does; a picture wholly above the screen has none.
 */
export function healthBarBox(
  corner: Point,
  picture: { readonly width: number; readonly height: number },
  bodyWidth: number,
  screenTop: number,
): Rect | null {
  if (corner.y + picture.height <= screenTop) {
    return null;
  }
  return {
    left: corner.x + Math.round((picture.width - bodyWidth) / 2),
    top: Math.max(corner.y - BAR_HEIGHT - 1, screenTop),
    width: bodyWidth,
    height: BAR_HEIGHT,
  };
}

interface Puff {
  readonly puff: Phaser.GameObjects.Sprite;
  readonly shape: Phaser.GameObjects.Sprite;
  msIn: number;
}

class Figure {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly art: string;
  private readonly scene: Phaser.Scene;
  private readonly trail: Phaser.GameObjects.Sprite[] = [];
  private readonly walkRows: number;
  private readonly width: number;
  private readonly height: number;
  private facing: Direction = 'down';
  private lastPosition: Point | null = null;
  private animMs = 0;
  private movingMsLeft = 0;

  constructor(scene: Phaser.Scene, art: string) {
    this.scene = scene;
    this.art = art;
    const cell = scene.textures.getFrame(art, 0);
    this.width = cell.width;
    this.height = cell.height;
    this.walkRows = scene.textures.get(art).getFrameNames().length / COLUMNS - EXTRA_ROWS;
    this.sprite = scene.add.sprite(0, 0, art, 0).setOrigin(0, 0).setDepth(DEPTH.monster);
  }

  get hurtRow(): number {
    return this.walkRows;
  }

  /** The cell of the white shape the monster is drawn as when it is hit, in the way it faces. */
  hurtFrame(): number {
    return this.hurtRow * COLUMNS + COLUMN[this.facing];
  }

  /** The top-left of the monster's picture, in whole pixels, centred on the monster. */
  cornerOf(position: Point): Point {
    return { x: Math.round(px(position.x) - this.width / 2), y: Math.round(px(position.y) - this.height / 2) };
  }

  age(frameMs: number): void {
    this.animMs += frameMs;
    this.movingMsLeft = Math.max(0, this.movingMsLeft - frameMs);
  }

  /** Puts the sprite where and how the view says. Returns the top of the picture, where its Health bar goes. */
  show(monster: MonsterView, hero: Point, flashing: boolean): Point {
    this.noteMoving(monster.position);
    const { action } = monster;
    if (action.type === 'dashing') {
      this.facing = action.direction;
    } else if (action.type === 'winding-up') {
      this.facing = directionOf(hero.x - monster.position.x, hero.y - monster.position.y);
    }
    const shake =
      action.type === 'winding-up' ? (Math.floor(action.progress * WARN_PARTS * SHAKES_PER_PART) % 2 === 0 ? -1 : 1) : 0;
    const corner = this.cornerOf(monster.position);
    const frame = this.frameFor(monster, flashing);
    this.sprite.setPosition(corner.x + shake, corner.y).setFrame(frame).setVisible(true);
    if (action.type === 'recovering' && !flashing) {
      this.sprite.setTint(RESTING_TINT);
    } else {
      this.sprite.clearTint();
    }
    this.showTrail(action.type === 'dashing' ? action.direction : null, corner, frame);
    return corner;
  }

  private noteMoving(position: Point): void {
    const last = this.lastPosition;
    if (last !== null && (last.x !== position.x || last.y !== position.y)) {
      this.movingMsLeft = MOVING_HOLD_MS;
      this.facing = directionOf(position.x - last.x, position.y - last.y);
    }
    this.lastPosition = { x: position.x, y: position.y };
  }

  private frameFor(monster: MonsterView, flashing: boolean): number {
    const column = COLUMN[this.facing];
    if (flashing) {
      return this.hurtRow * COLUMNS + column;
    }
    const { action } = monster;
    if (action.type === 'winding-up' && warnsNow(action.progress)) {
      return (this.hurtRow + 1) * COLUMNS + column;
    }
    const moving = this.movingMsLeft > 0 || action.type === 'dashing';
    const row = Math.floor(this.animMs / (moving ? WALK_FRAME_MS : IDLE_FRAME_MS)) % this.walkRows;
    return row * COLUMNS + column;
  }

  /** Behind a dashing monster: faded copies of it, so that its speed shows. */
  private showTrail(direction: Direction | null, corner: Point, frame: number): void {
    if (direction === null) {
      this.trail.forEach((copy) => copy.setVisible(false));
      return;
    }
    const step = FACING_STEP[direction];
    const gap = Math.max(2, Math.round(Math.min(this.width, this.height) / 2));
    DASH_TRAIL_ALPHAS.forEach((alpha, index) => {
      let copy = this.trail[index];
      if (copy === undefined) {
        copy = this.scene.add.sprite(0, 0, this.art, 0).setOrigin(0, 0).setDepth(DEPTH.monster - 1);
        this.trail[index] = copy;
      }
      const behind = gap * (index + 1);
      copy
        .setPosition(corner.x - step.x * behind, corner.y - step.y * behind)
        .setFrame(frame)
        .setAlpha(alpha)
        .setVisible(true);
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.trail.forEach((copy) => copy.destroy());
  }
}

export class MonsterSprites {
  private readonly scene: Phaser.Scene;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly figures = new Map<string, Figure>();
  private puffs: Puff[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bars = scene.add.graphics().setDepth(DEPTH.monsterBar);
  }

  /** Starts what the events the Game core just reported look like: a monster that fell leaves a puff where it stood. */
  show(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type !== 'monster-defeated') {
        continue;
      }
      const figure = this.figures.get(event.monsterId);
      if (figure !== undefined) {
        this.startPuff(figure);
        figure.destroy();
        this.figures.delete(event.monsterId);
      }
    }
  }

  private startPuff(figure: Figure): void {
    const { x, y } = figure.sprite;
    const middleX = x + figure.sprite.width / 2;
    const middleY = y + figure.sprite.height / 2;
    const puff = this.scene.add
      .sprite(Math.round(middleX - PUFF_CELL / 2), Math.round(middleY - PUFF_LIFT), PUFF_ART, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH.puff);
    const shape = this.scene.add
      .sprite(x, y, figure.art, figure.hurtFrame())
      .setOrigin(0, 0)
      .setDepth(DEPTH.puff + 0.5);
    this.puffs.push({ puff, shape, msIn: 0 });
  }

  /** Lets one frame's time pass. */
  age(frameMs: number): void {
    for (const figure of this.figures.values()) {
      figure.age(frameMs);
    }
    for (const puff of this.puffs) {
      puff.msIn += frameMs;
      if (puff.msIn < PUFF_FRAMES * PUFF_FRAME_MS) {
        puff.puff.setFrame(Math.floor(puff.msIn / PUFF_FRAME_MS));
      }
      puff.shape.setAlpha(Math.max(0, 1 - puff.msIn / SHAPE_FADE_MS)).setVisible(puff.msIn < SHAPE_FADE_MS);
    }
    const over = this.puffs.filter((puff) => puff.msIn >= PUFF_FRAMES * PUFF_FRAME_MS);
    for (const puff of over) {
      puff.puff.destroy();
      puff.shape.destroy();
    }
    this.puffs = this.puffs.filter((puff) => !over.includes(puff));
  }

  /** Puts a sprite on every monster of the view, and takes away the sprites of those that are no longer in it. */
  draw(view: PlayingView, isFlashing: (monsterId: string) => boolean): void {
    this.bars.clear();
    // Where the camera has the top of the screen (the play scene scrolls to the same place), so that no bar leaves it.
    const screenTop = scrollFor(view.hero.position, view.area).y;
    const present = new Set<string>();
    for (const monster of view.monsters) {
      present.add(monster.id);
      let figure = this.figures.get(monster.id);
      if (figure === undefined) {
        figure = new Figure(this.scene, monsterArt(monster.type));
        this.figures.set(monster.id, figure);
      }
      const corner = figure.show(monster, view.hero.position, isFlashing(monster.id));
      this.drawBar(monster, figure, corner, screenTop);
    }
    for (const [id, figure] of this.figures) {
      if (!present.has(id)) {
        figure.destroy();
        this.figures.delete(id);
      }
    }
  }

  /** A monster that has lost some Health has a bar over its head, as wide as its body. */
  private drawBar(monster: MonsterView, figure: Figure, corner: Point, screenTop: number): void {
    if (monster.health >= monster.maxHealth) {
      return;
    }
    const { width: pictureWidth, height: pictureHeight } = figure.sprite;
    const box = healthBarBox(corner, { width: pictureWidth, height: pictureHeight }, px(monster.size), screenTop);
    if (box === null) {
      return;
    }
    this.bars.fillStyle(BAR_OUTLINE);
    this.bars.fillRect(box.left, box.top, box.width, box.height);
    this.bars.fillStyle(BAR_HEALTH);
    this.bars.fillRect(
      box.left + 1,
      box.top + 1,
      Math.max(1, Math.round(((box.width - 2) * monster.health) / monster.maxHealth)),
      box.height - 2,
    );
  }

  /** Forgets every monster and puff, such as when the hero is in another area. */
  clear(): void {
    this.bars.clear();
    for (const figure of this.figures.values()) {
      figure.destroy();
    }
    this.figures.clear();
    for (const puff of this.puffs) {
      puff.puff.destroy();
      puff.shape.destroy();
    }
    this.puffs = [];
  }
}
