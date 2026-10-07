import type Phaser from 'phaser';
import type {
  AreaView,
  ArrowView,
  Box,
  CheckpointView,
  ChestView,
  ConsumableId,
  Direction,
  ExitView,
  HeroView,
  InteractableView,
  MonsterView,
  PickupView,
  Point,
} from '../core';
import { TILE_SIZE } from './config';

// The placeholder look of the game: flat shapes drawn from the state view. Real art replaces this module; the
// rest of the adapter only calls the draw functions below.

type Graphics = Phaser.GameObjects.Graphics;

/** Terrain colours, by the `kind` the content gives each terrain. */
const TERRAIN_COLOURS: Readonly<Record<string, number>> = {
  water: 0x2f6db5,
  rock: 0x6e6e78,
  sand: 0xdcc58a,
  grass: 0x5a9e45,
};

/** Monster colours, by monster type. */
const MONSTER_COLOURS: Readonly<Record<string, number>> = {
  crab: 0xd9534f,
  boar: 0x7d4e2d,
  spitter: 0xa86fd6,
};

/** Anything the art has no colour for is drawn in this colour, so a missing one cannot be overlooked. */
const UNKNOWN_COLOUR = 0xff00ff;

const HERO_COLOUR = 0xf2c14e;
const HERO_HURT_COLOUR = 0xff3b3b;
const OUTLINE_COLOUR = 0x1b1b24;
const HIT_FLASH_COLOUR = 0xffffff;
const SWING_COLOUR = 0xffffff;
const HEALTH_COLOUR = 0x7bd35f;
const TELEGRAPH_COLOUR = 0xe0392e;
const STRIKE_COLOUR = 0xff8a3d;
const CHEST_COLOUR = 0xa0692b;
const CHEST_OPENED_COLOUR = 0x5a3a1a;
const CHEST_INSIDE_COLOUR = 0x1a0f06;
const CHEST_LATCH_COLOUR = 0xf2c94c;
const CACHE_COLOUR = 0x6b7a3a;
const CACHE_ARROW_COLOUR = 0xe8d8a8;
const CACHE_ARROW_HEAD_COLOUR = 0xffffff;
const POTION_CRATE_COLOUR = 0x7b5b8c;
const FLASK_GLASS_COLOUR = 0xcfe8f0;
const FLASK_LIQUID_COLOUR = 0xe0455f;
const FLASK_SHINE_COLOUR = 0xffffff;
const ARROW_SHAFT_COLOUR = 0xf0e6c8;
const ARROW_HEAD_COLOUR = 0xffffff;
const PROJECTILE_COLOUR = 0xd28bff;
const PROJECTILE_CORE_COLOUR = 0xffffff;
const WIND_UP_COLOUR = 0xff6b5b;
const EXIT_COLOUR = 0xbfeaff;

/** The shape of an arrow in flight, in pixels: how far the shaft and the head reach back from the tip, and how wide. */
const ARROW_SHAFT_LENGTH = 12;
const ARROW_SHAFT_WIDTH = 2;
const ARROW_HEAD_LENGTH = 3;
const ARROW_HEAD_WIDTH = 4;

/** Side of the square on the hero that shows which way it faces, in pixels. */
const FACING_MARKER_SIZE = 4;

/** A monster that warns by flashing alternates on and off over this many equal parts of its wind-up, ending on. */
const WIND_UP_FLASH_PARTS = 7;

/** How far, in tiles, a zone's edge may lie beyond a body's and still be the body's edge: it absorbs rounding. */
const EDGE_TOLERANCE = 1e-6;

/** The faded copies of a dashing monster's body left behind it, nearest first, by how much of its colour shows. */
const DASH_TRAIL_ALPHAS: readonly number[] = [0.5, 0.3, 0.15];

/** The faded copies of a projectile left behind it, nearest first, by how much of its colour shows. */
const PROJECTILE_TRAIL_ALPHAS: readonly number[] = [0.5, 0.25];

const FACING_STEP: Readonly<Record<Direction, Point>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Tiles to whole canvas pixels, so every shape lands exactly on pixels and stays crisp. */
function px(tiles: number): number {
  return Math.round(tiles * TILE_SIZE);
}

/** A body's rectangle in pixels. Its size is fixed, so it never flickers between sizes as it moves. */
function bodyRect(position: Point, size: number): Rect {
  return { x: px(position.x - size / 2), y: px(position.y - size / 2), width: px(size), height: px(size) };
}

function fillWithOutline(graphics: Graphics, rect: Rect, fill: number, outline: number = OUTLINE_COLOUR): void {
  graphics.fillStyle(outline);
  graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
  graphics.fillStyle(fill);
  graphics.fillRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2);
}

/** The colour of a kind of terrain. The maps of the Automap are coloured the same way as the ground. */
export function terrainColour(kind: string): number {
  return TERRAIN_COLOURS[kind] ?? UNKNOWN_COLOUR;
}

/** Draws the ground of the whole area. Call it once per area: terrain never changes. */
export function drawTerrain(graphics: Graphics, area: AreaView): void {
  graphics.clear();
  area.terrain.forEach((row, rowIndex) => {
    row.forEach((kind, colIndex) => {
      const x = colIndex * TILE_SIZE;
      const y = rowIndex * TILE_SIZE;
      graphics.fillStyle(terrainColour(kind));
      graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      // A faint edge on two sides, so single tiles can be told apart and blurry scaling would show.
      graphics.fillStyle(0x000000, 0.12);
      graphics.fillRect(x, y + TILE_SIZE - 1, TILE_SIZE, 1);
      graphics.fillRect(x + TILE_SIZE - 1, y, 1, TILE_SIZE - 1);
    });
  });
}

/**
 * Marks where the hero can leave the area: a pale, see-through patch with a bright edge, over the ground. Draw it
 * once per area, after the terrain, because exits do not change.
 */
export function drawExits(graphics: Graphics, exits: readonly ExitView[]): void {
  for (const exit of exits) {
    const rect = zoneRect(exit.zone);
    graphics.fillStyle(EXIT_COLOUR, 0.3);
    graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
    graphics.fillStyle(EXIT_COLOUR, 0.9);
    graphics.fillRect(rect.x, rect.y, rect.width, 1);
    graphics.fillRect(rect.x, rect.y + rect.height - 1, rect.width, 1);
    graphics.fillRect(rect.x, rect.y + 1, 1, rect.height - 2);
    graphics.fillRect(rect.x + rect.width - 1, rect.y + 1, 1, rect.height - 2);
  }
}

/** The post and flag of a Checkpoint, the pale glow under the one that is active, and the grey flag of the others. */
const CHECKPOINT_POST_COLOUR = 0x5a3a1a;
const CHECKPOINT_ACTIVE_COLOUR = 0xffd34d;
const CHECKPOINT_IDLE_COLOUR = 0x8a8a9a;
const CHECKPOINT_GLOW_COLOUR = 0xfff3a0;

/**
 * Draws the Checkpoints of the area: a post with a flag. The one defeat sends the hero back to has its flag up in gold
 * on a pale glow; the others hang a grey flag half way down, so that they can be told apart without the colours. Draw
 * them every frame, before the hero and the monsters that walk over them, because which one is active changes.
 */
export function drawCheckpoints(graphics: Graphics, checkpoints: readonly CheckpointView[]): void {
  for (const checkpoint of checkpoints) {
    const tile = bodyRect(checkpoint.position, checkpoint.size);
    if (checkpoint.active) {
      graphics.fillStyle(CHECKPOINT_GLOW_COLOUR, 0.3);
      graphics.fillRect(tile.x, tile.y, tile.width, tile.height);
      graphics.fillStyle(CHECKPOINT_GLOW_COLOUR, 0.9);
      graphics.fillRect(tile.x, tile.y, tile.width, 1);
      graphics.fillRect(tile.x, tile.y + tile.height - 1, tile.width, 1);
      graphics.fillRect(tile.x, tile.y + 1, 1, tile.height - 2);
      graphics.fillRect(tile.x + tile.width - 1, tile.y + 1, 1, tile.height - 2);
    }
    const post = { x: tile.x + 3, y: tile.y + 1, width: 4, height: tile.height - 2 };
    fillWithOutline(graphics, post, CHECKPOINT_POST_COLOUR);
    const flag = { x: tile.x + 6, y: tile.y + (checkpoint.active ? 2 : 7), width: 8, height: 6 };
    fillWithOutline(graphics, flag, checkpoint.active ? CHECKPOINT_ACTIVE_COLOUR : CHECKPOINT_IDLE_COLOUR);
  }
}

/** Draws what the hero can interact with or walk onto. Real art replaces this, one kind at a time. */
export function drawInteractable(graphics: Graphics, interactable: InteractableView): void {
  switch (interactable.kind) {
    case 'chest':
      drawChest(graphics, interactable);
      return;
    case 'pickup':
      drawPickup(graphics, interactable);
      return;
  }
}

/** The colour of a closed crate, by the consumable it holds. */
const CRATE_COLOURS: Readonly<Record<ConsumableId, number>> = {
  ammunition: CACHE_COLOUR,
  'healing-potion': POTION_CRATE_COLOUR,
};

/** What a closed crate shows of the consumable in it, drawn on its body. A new consumable needs a look here. */
const CRATE_MARKS: Readonly<Record<ConsumableId, (graphics: Graphics, body: Rect) => void>> = {
  ammunition: drawArrowsInCrate,
  'healing-potion': (graphics, body) =>
    drawFlask(graphics, shrunk(body, Math.round(body.width / 4), Math.round(body.height / 6)), false),
};

/**
 * A closed chest is a brown box with a gold latch on its lid. A cache is a crate with what it holds on it: arrows
 * standing in a green one, a flask in a purple one. Once opened any of them is dark, with an empty inside.
 */
function drawChest(graphics: Graphics, chest: ChestView): void {
  const body = bodyRect(chest.position, chest.size);
  const lidY = body.y + Math.floor(body.height * 0.4);
  const closedColour = chest.holds === 'gear' ? CHEST_COLOUR : CRATE_COLOURS[chest.holds];
  fillWithOutline(graphics, body, chest.opened ? CHEST_OPENED_COLOUR : closedColour);
  if (chest.opened) {
    graphics.fillStyle(CHEST_INSIDE_COLOUR);
    graphics.fillRect(body.x + 2, body.y + 2, body.width - 4, lidY - body.y - 2);
    return;
  }
  if (chest.holds !== 'gear') {
    CRATE_MARKS[chest.holds](graphics, body);
    return;
  }
  graphics.fillStyle(OUTLINE_COLOUR);
  graphics.fillRect(body.x + 1, lidY, body.width - 2, 1);
  graphics.fillStyle(CHEST_LATCH_COLOUR);
  graphics.fillRect(body.x + Math.floor(body.width / 2) - 2, lidY - 1, 4, 4);
}

/** What a loose pickup looks like on its tile, by the consumable it is. A new consumable needs a look here. */
const PICKUP_LOOKS: Readonly<Record<ConsumableId, (graphics: Graphics, tile: Rect) => void>> = {
  ammunition: (graphics, tile) => {
    const crate = shrunk(tile, 3, 3);
    fillWithOutline(graphics, crate, CACHE_COLOUR);
    drawArrowsInCrate(graphics, crate);
  },
  'healing-potion': (graphics, tile) => drawFlask(graphics, shrunk(tile, 3, 2), true),
};

/** A loose pickup is the consumable itself, lying on its tile: a flask, or a small crate of arrows. */
function drawPickup(graphics: Graphics, pickup: PickupView): void {
  PICKUP_LOOKS[pickup.consumable](graphics, bodyRect(pickup.position, pickup.size));
}

/** The rectangle with `across` pixels taken off each side and `down` off the top and the bottom. A negative amount adds. */
function shrunk(rect: Rect, across: number, down: number): Rect {
  return { x: rect.x + across, y: rect.y + down, width: rect.width - 2 * across, height: rect.height - 2 * down };
}

/** A flask of red liquid with a cork, a narrow neck over a wide belly, filling the rectangle; outlined on request. */
function drawFlask(graphics: Graphics, area: Rect, outlined: boolean): void {
  const neckWidth = Math.max(2, Math.round(area.width * 0.4));
  const bellyTop = area.y + Math.round(area.height * 0.4);
  const neck = {
    x: area.x + Math.floor((area.width - neckWidth) / 2),
    y: area.y,
    width: neckWidth,
    height: bellyTop - area.y,
  };
  const belly = { x: area.x, y: bellyTop, width: area.width, height: area.y + area.height - bellyTop };
  if (outlined) {
    graphics.fillStyle(OUTLINE_COLOUR);
    graphics.fillRect(neck.x - 1, neck.y - 1, neck.width + 2, neck.height + 2);
    graphics.fillRect(belly.x - 1, belly.y - 1, belly.width + 2, belly.height + 2);
  }
  graphics.fillStyle(FLASK_GLASS_COLOUR);
  graphics.fillRect(neck.x, neck.y, neck.width, neck.height);
  graphics.fillStyle(CHEST_COLOUR);
  graphics.fillRect(neck.x, neck.y, neck.width, Math.min(2, neck.height));
  graphics.fillStyle(FLASK_LIQUID_COLOUR);
  graphics.fillRect(belly.x, belly.y, belly.width, belly.height);
  graphics.fillStyle(FLASK_SHINE_COLOUR);
  graphics.fillRect(belly.x + 1, belly.y + 1, 1, Math.max(1, belly.height - 3));
}

/** Three arrows standing in a crate, their heads up. */
function drawArrowsInCrate(graphics: Graphics, body: Rect): void {
  for (const share of [1, 2, 3]) {
    const x = body.x + Math.round((body.width * share) / 4) - 1;
    graphics.fillStyle(CACHE_ARROW_COLOUR);
    graphics.fillRect(x, body.y + 3, 2, body.height - 6);
    graphics.fillStyle(CACHE_ARROW_HEAD_COLOUR);
    graphics.fillRect(x, body.y + 3, 2, 2);
  }
}

/**
 * Draws an arrow in flight as a thin shaft with a head, outlined so that it shows on any ground. Its tip is at the
 * front of the arrow's body, so it touches what it hits; the shaft trails behind.
 */
export function drawArrow(graphics: Graphics, arrow: ArrowView): void {
  const step = FACING_STEP[arrow.direction];
  const tip = {
    x: px(arrow.position.x + (step.x * arrow.size) / 2),
    y: px(arrow.position.y + (step.y * arrow.size) / 2),
  };
  const part = (behind: number, length: number, width: number, colour: number): void => {
    const rect = arrowPart(tip, step, behind, length, width);
    graphics.fillStyle(colour);
    graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
  };
  part(-1, ARROW_SHAFT_LENGTH + 2, ARROW_SHAFT_WIDTH + 2, OUTLINE_COLOUR);
  part(-1, ARROW_HEAD_LENGTH + 2, ARROW_HEAD_WIDTH + 2, OUTLINE_COLOUR);
  part(0, ARROW_SHAFT_LENGTH, ARROW_SHAFT_WIDTH, ARROW_SHAFT_COLOUR);
  part(0, ARROW_HEAD_LENGTH, ARROW_HEAD_WIDTH, ARROW_HEAD_COLOUR);
}

/**
 * The part of an arrow that starts `behind` pixels back from the tip and runs `length` pixels further back, `width`
 * pixels wide across the line the arrow flies along. A negative `behind` starts ahead of the tip.
 */
function arrowPart(tip: Point, step: Point, behind: number, length: number, width: number): Rect {
  const axis = step.x !== 0 ? step.x : step.y;
  const start = Math.min(-axis * behind, -axis * (behind + length));
  if (step.x !== 0) {
    return { x: tip.x + start, y: tip.y - width / 2, width: length, height: width };
  }
  return { x: tip.x - width / 2, y: tip.y + start, width, height: length };
}

/**
 * Draws a monster's projectile in flight as a glowing orb with a faded trail behind it, so that it cannot be taken for
 * one of the hero's arrows, which `drawArrow` draws. The orb is exactly the projectile's body, with the outline around
 * it, so what touches the orb is what it hits.
 */
export function drawProjectile(graphics: Graphics, projectile: ArrowView): void {
  const body = bodyRect(projectile.position, projectile.size);
  const step = FACING_STEP[projectile.direction];
  const gap = body.width + 1;
  PROJECTILE_TRAIL_ALPHAS.forEach((alpha, index) => {
    const behind = gap * (index + 1);
    graphics.fillStyle(PROJECTILE_COLOUR, alpha);
    graphics.fillRect(body.x - step.x * behind, body.y - step.y * behind, body.width, body.height);
  });
  const outline = shrunk(body, -1, -1);
  graphics.fillStyle(OUTLINE_COLOUR);
  graphics.fillRect(outline.x, outline.y, outline.width, outline.height);
  graphics.fillStyle(PROJECTILE_COLOUR);
  graphics.fillRect(body.x, body.y, body.width, body.height);
  if (body.width > 2 && body.height > 2) {
    const core = shrunk(body, 1, 1);
    graphics.fillStyle(PROJECTILE_CORE_COLOUR);
    graphics.fillRect(core.x, core.y, core.width, core.height);
  }
}

/** Draws the hero as a square with a dark marker on the side it faces, red while it flashes from a hit. */
export function drawHero(graphics: Graphics, hero: HeroView, flashing: boolean): void {
  const body = bodyRect(hero.position, hero.size);
  fillWithOutline(graphics, body, flashing ? HERO_HURT_COLOUR : HERO_COLOUR);
  const step = FACING_STEP[hero.facing];
  const inset = body.width / 2 - FACING_MARKER_SIZE / 2 - 2;
  graphics.fillStyle(OUTLINE_COLOUR);
  graphics.fillRect(
    Math.round(body.x + body.width / 2 + step.x * inset - FACING_MARKER_SIZE / 2),
    Math.round(body.y + body.height / 2 + step.y * inset - FACING_MARKER_SIZE / 2),
    FACING_MARKER_SIZE,
    FACING_MARKER_SIZE,
  );
}

/**
 * Draws a monster as a square: white while it flashes from a hit, dimmed while it rests after an attack, with a Health
 * bar once it is hurt. While it winds up an attack that has no area to show, it flashes red; while it dashes, faded
 * copies of it trail behind.
 */
export function drawMonster(graphics: Graphics, monster: MonsterView, flashing: boolean): void {
  const body = bodyRect(monster.position, monster.size);
  const colour = MONSTER_COLOURS[monster.type] ?? UNKNOWN_COLOUR;
  const resting = monster.action.type === 'recovering';
  const warning = flashesToWarn(monster) && !flashing;
  if (monster.action.type === 'dashing') {
    drawDashTrail(graphics, body, monster.action.direction, colour);
  }
  const fill = flashing ? HIT_FLASH_COLOUR : warning ? WIND_UP_COLOUR : resting ? dimmed(colour) : colour;
  fillWithOutline(graphics, body, fill, warning ? TELEGRAPH_COLOUR : OUTLINE_COLOUR);
  if (monster.health < monster.maxHealth) {
    const innerWidth = body.width - 2;
    graphics.fillStyle(OUTLINE_COLOUR);
    graphics.fillRect(body.x, body.y - 5, body.width, 4);
    graphics.fillStyle(HEALTH_COLOUR);
    graphics.fillRect(body.x + 1, body.y - 4, Math.max(1, Math.round((innerWidth * monster.health) / monster.maxHealth)), 2);
  }
}

/**
 * Whether a monster that is winding up is showing it by being red at this moment. One whose attack lands somewhere
 * else, such as a charger's lane, has that telegraph to show. One whose zone lies within its own body, such as a ranged
 * attacker (it aims only when it fires), has nothing to show but itself, so it flashes: on for the first part of its
 * wind-up, off for the second, and so on to the end, so that it is on just before the shot.
 */
function flashesToWarn(monster: MonsterView): boolean {
  const { action, position, size } = monster;
  if (action.type !== 'winding-up') {
    return false;
  }
  const half = size / 2;
  const { zone } = action;
  const withinBody =
    zone.minX >= position.x - half - EDGE_TOLERANCE &&
    zone.maxX <= position.x + half + EDGE_TOLERANCE &&
    zone.minY >= position.y - half - EDGE_TOLERANCE &&
    zone.maxY <= position.y + half + EDGE_TOLERANCE;
  return withinBody && Math.floor(action.progress * WIND_UP_FLASH_PARTS) % 2 === 0;
}

/** Behind a dashing monster: faded copies of its body, so that its speed shows. */
function drawDashTrail(graphics: Graphics, body: Rect, direction: Direction, colour: number): void {
  const step = FACING_STEP[direction];
  const gap = Math.max(2, Math.round(body.width / 2));
  DASH_TRAIL_ALPHAS.forEach((alpha, index) => {
    const behind = gap * (index + 1);
    graphics.fillStyle(colour, alpha);
    graphics.fillRect(body.x - step.x * behind, body.y - step.y * behind, body.width, body.height);
  });
}

/** Shows where a strike landed: the area the Game core says the swing covered. */
export function drawSwing(graphics: Graphics, zone: Box): void {
  const rect = zoneRect(zone);
  graphics.fillStyle(SWING_COLOUR, 0.5);
  graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
}

/**
 * The telegraph: where a monster's attack is about to land, which the Game core fixed when the wind-up began. The
 * zone is outlined from the start and fills from its middle outward as the wind-up runs out, so the player can see how
 * long is left to move away. `progress` is the share of the wind-up that has passed, from 0 up to but not including 1.
 */
export function drawTelegraph(graphics: Graphics, zone: Box, progress: number): void {
  const rect = zoneRect(zone);
  const done = Math.min(1, Math.max(0, progress));
  graphics.fillStyle(TELEGRAPH_COLOUR, 0.18);
  graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
  const inset = Math.round(((1 - done) * Math.min(rect.width, rect.height)) / 2);
  graphics.fillStyle(TELEGRAPH_COLOUR, 0.55);
  graphics.fillRect(rect.x + inset, rect.y + inset, rect.width - 2 * inset, rect.height - 2 * inset);
  graphics.fillStyle(TELEGRAPH_COLOUR, 1);
  graphics.fillRect(rect.x, rect.y, rect.width, 1);
  graphics.fillRect(rect.x, rect.y + rect.height - 1, rect.width, 1);
  graphics.fillRect(rect.x, rect.y + 1, 1, rect.height - 2);
  graphics.fillRect(rect.x + rect.width - 1, rect.y + 1, 1, rect.height - 2);
}

/** Shows where a monster's attack landed, for the moment of impact: the zone the Game core says it covered. */
export function drawStrike(graphics: Graphics, zone: Box): void {
  const rect = zoneRect(zone);
  graphics.fillStyle(STRIKE_COLOUR, 0.7);
  graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function zoneRect(zone: Box): Rect {
  const x = px(zone.minX);
  const y = px(zone.minY);
  return { x, y, width: px(zone.maxX) - x, height: px(zone.maxY) - y };
}

/** The colour at half the brightness. */
function dimmed(colour: number): number {
  return (colour >> 1) & 0x7f7f7f;
}
