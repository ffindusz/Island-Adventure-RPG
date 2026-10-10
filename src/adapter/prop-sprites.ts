import type Phaser from 'phaser';
import type { AreaView, Box, ChestView, ConsumableId, Direction, InteractableView, PlayingView, Point } from '../core';
import { frameSize } from './artwork';
import type { ArtName } from './artwork';
import { px, TILE_SIZE } from './config';
import { DEPTH } from './depths';

// What every area shares, as sprites: chests and caches, what lies on the ground, Checkpoints, the marks of the way out,
// doors, gates, levers and signs, and the old vessel of the harbor. Each is a picture of one tile (the Checkpoint's is
// taller, a gate's is taller and wider, its arch standing over the way, and the vessel's lies in the water beside its tile)
// that stands with its foot on the bottom of the tile the Game core says it is on, so none of this knows which area it is
// in. The sheets are made by docs/assets/compose-art.py. All of it is cosmetic: it runs on frame time from the Game core's
// view, and nothing the Game core decides depends on it.

const CHEST = 'prop-chest' satisfies ArtName;
const PICKUP = 'prop-pickup' satisfies ArtName;
const CHECKPOINT = 'prop-checkpoint' satisfies ArtName;
const EXIT = 'prop-exit' satisfies ArtName;
const DOOR = 'prop-door' satisfies ArtName;
const GATE = 'prop-gate' satisfies ArtName;
const LEVER = 'prop-lever' satisfies ArtName;
const SIGN = 'prop-sign' satisfies ArtName;
const VESSEL = 'prop-vessel' satisfies ArtName;

/** The frame of each chest while it is shut, in the sheet of chests: the frame after it is the same chest open. */
const CHEST_FRAMES: Readonly<Record<ChestView['holds'], number>> = {
  gear: 0,
  ammunition: 2,
  'healing-potion': 4,
};

/** The frame of each consumable lying on the ground: the frame after it is the same with a glint. */
const PICKUP_FRAMES: Readonly<Record<ConsumableId, number>> = {
  ammunition: 2,
  'healing-potion': 0,
};
/** A key lying on the ground has its own frame in the same sheet, then the one with a glint. */
const KEY_FRAME = 4;

/**
 * The frames of a Checkpoint: first the grey flag half way down the pole, of one the hero has not touched, then the four
 * of the red flag waving at the top of it, of the active one.
 */
const CHECKPOINT_IDLE_FRAME = 0;
const CHECKPOINT_WAVE_FRAMES = 4;
const WAVE_FRAME_MS = 160;

/** Each thing on the ground shows its glint for a moment, every so often, and not all at the same time. */
const GLINT_PERIOD_MS = 1900;
const GLINT_MS = 170;

/** The frame of the mark of an exit, by the way out. */
const EXIT_FRAMES: Readonly<Record<Direction, number>> = { up: 0, down: 1, left: 2, right: 3 };
/** The marks are painted on the ground, so the ground shows through them. */
const EXIT_ALPHA = 0.85;

const DOOR_SHUT_FRAME = 0;
const DOOR_OPEN_FRAME = 1;

const GATE_SHUT_FRAME = 0;
const GATE_OPEN_FRAME = 1;
/** The arch of a gate stands on the rock on each side of the way: its picture is wider than its tile by this many pixels on the left, and by as many on the right. */
const GATE_REACH = (frameSize(GATE).width - TILE_SIZE) / 2;

const LEVER_REST_FRAME = 0;
const LEVER_PULLED_FRAME = 1;

/** The vessel with its sail furled, as it is found, and with its sail hoisted once it is prepared. */
const VESSEL_FURLED_FRAME = 0;
const VESSEL_HOISTED_FRAME = 1;
/** The picture of the vessel lies in the water beside the vessel's own tile, at the left of it: that tile is the fifth from the top. */
const VESSEL_ROWS_ABOVE = 4;
/** So the picture reaches this many pixels below the bottom of the vessel's tile: what is left of its height under the tile's row. */
const VESSEL_REACH_BELOW = frameSize(VESSEL).height - (VESSEL_ROWS_ABOVE + 1) * TILE_SIZE;

/** Where a prop stands: the left edge and the bottom edge of its tile, in canvas pixels. */
interface Foot {
  readonly left: number;
  readonly bottom: number;
}

/** The tile a body of this size is centred on. A tile's size is in tiles, and a prop's tile is as big as the grid's. */
function footOf(centre: Point, size: number): Foot {
  return {
    left: px(centre.x - size / 2),
    bottom: px(centre.y + size / 2),
  };
}

/** Where the picture of the vessel stands for the vessel on the tile with this foot: its fifth row is the tile's row. */
export function vesselFoot(foot: Foot): Foot {
  return { left: foot.left, bottom: foot.bottom + VESSEL_REACH_BELOW };
}

/** Where the picture of a gate stands for the gate on the tile with this foot: its way through is the tile. */
export function gateFoot(foot: Foot): Foot {
  return { left: foot.left - GATE_REACH, bottom: foot.bottom };
}

/** The way out of an exit, which is towards the nearest edge of the area: a tie goes to left, then right, then up. */
function wayOut(zone: Box, area: AreaView): Direction {
  const distances: readonly (readonly [Direction, number])[] = [
    ['left', zone.minX],
    ['right', area.width - zone.maxX],
    ['up', zone.minY],
    ['down', area.height - zone.maxY],
  ];
  return distances.reduce((nearest, next) => (next[1] < nearest[1] ? next : nearest))[0];
}

export class PropSprites {
  private readonly scene: Phaser.Scene;
  private readonly pools = new Map<string, Phaser.GameObjects.Image[]>();
  private readonly taken = new Map<string, number>();
  private ageMs = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Lets one frame's time pass. */
  age(frameMs: number): void {
    this.ageMs += frameMs;
  }

  /** Puts a picture on everything of the area that has one, and hides the sprites there is nothing left for. */
  draw(view: PlayingView): void {
    this.taken.clear();
    for (const exit of view.exits) {
      this.markExit(exit.zone, view.area);
    }
    for (const checkpoint of view.checkpoints) {
      const frame = checkpoint.active ? this.waving() : CHECKPOINT_IDLE_FRAME;
      this.place(CHECKPOINT, DEPTH.prop, footOf(checkpoint.position, checkpoint.size), frame);
    }
    for (const interactable of view.interactables) {
      this.show(interactable);
    }
    for (const [texture, sprites] of this.pools) {
      for (let index = this.taken.get(texture) ?? 0; index < sprites.length; index += 1) {
        sprites[index]?.setVisible(false);
      }
    }
  }

  /** One mark on each tile the exit covers, pointing the way out. */
  private markExit(zone: Box, area: AreaView): void {
    const frame = EXIT_FRAMES[wayOut(zone, area)];
    for (let row = Math.floor(zone.minY); row < Math.ceil(zone.maxY); row += 1) {
      for (let col = Math.floor(zone.minX); col < Math.ceil(zone.maxX); col += 1) {
        this.place(EXIT, DEPTH.exit, { left: col * TILE_SIZE, bottom: (row + 1) * TILE_SIZE }, frame, EXIT_ALPHA);
      }
    }
  }

  private show(interactable: InteractableView): void {
    const foot = footOf(interactable.position, interactable.size);
    switch (interactable.kind) {
      case 'chest':
        this.place(CHEST, DEPTH.prop, foot, CHEST_FRAMES[interactable.holds] + (interactable.opened ? 1 : 0));
        return;
      case 'pickup':
        this.place(PICKUP, DEPTH.prop, foot, PICKUP_FRAMES[interactable.consumable] + this.glint(interactable.position));
        return;
      case 'key':
        this.place(PICKUP, DEPTH.prop, foot, KEY_FRAME + this.glint(interactable.position));
        return;
      case 'door':
        this.place(DOOR, DEPTH.prop, foot, interactable.open ? DOOR_OPEN_FRAME : DOOR_SHUT_FRAME);
        return;
      case 'sign':
        this.place(SIGN, DEPTH.prop, foot, null);
        return;
      case 'gate':
        this.place(GATE, DEPTH.prop, gateFoot(foot), interactable.open ? GATE_OPEN_FRAME : GATE_SHUT_FRAME);
        return;
      case 'lever':
        this.place(LEVER, DEPTH.prop, foot, interactable.pulled ? LEVER_PULLED_FRAME : LEVER_REST_FRAME);
        return;
      case 'vessel':
        this.place(VESSEL, DEPTH.prop, vesselFoot(foot), interactable.prepared ? VESSEL_HOISTED_FRAME : VESSEL_FURLED_FRAME);
        return;
      default:
        // A new kind of interactable does not compile until it has its picture here.
        interactable satisfies never;
    }
  }

  /** The frame of the red flag now: the frames after the grey one, round and round. */
  private waving(): number {
    return CHECKPOINT_IDLE_FRAME + 1 + (Math.floor(this.ageMs / WAVE_FRAME_MS) % CHECKPOINT_WAVE_FRAMES);
  }

  /** 1 while the glint of the thing at this place shows, 0 for the rest of the time. */
  private glint(position: Point): number {
    const offset = Math.floor(position.x) * 373 + Math.floor(position.y) * 211;
    return (this.ageMs + offset) % GLINT_PERIOD_MS < GLINT_MS ? 1 : 0;
  }

  /** Shows the next unused sprite of this picture with its foot at the bottom left corner of its tile. */
  private place(texture: string, depth: number, foot: Foot, frame: number | null, alpha: number = 1): void {
    const pool = this.pools.get(texture) ?? [];
    this.pools.set(texture, pool);
    const index = this.taken.get(texture) ?? 0;
    this.taken.set(texture, index + 1);
    let sprite = pool[index];
    if (sprite === undefined) {
      sprite = this.scene.add.image(0, 0, texture).setOrigin(0, 1).setDepth(depth);
      pool[index] = sprite;
    }
    if (frame !== null) {
      sprite.setFrame(frame);
    }
    sprite.setPosition(foot.left, foot.bottom).setAlpha(alpha).setVisible(true);
  }
}
