import type Phaser from 'phaser';
import type { AreaView, Box, Direction, InteractableView, MonsterView, Point } from '../core';
import { TILE_SIZE } from './config';
import { drawGate, drawLever } from './device-art';

// The flat shapes of what has no picture yet, and the colours of every kind of terrain and type of monster. Drawn here
// from the state view: the ground and the monsters of an area whose art is not final, the gates and the levers of the
// light puzzles, and the telegraphs and the strikes of the monster attacks, which stay flat shapes. The pictures are
// elsewhere: the baked ground (terrain-baker.ts), the monsters of final art and what they shoot (monster-sprites.ts,
// projectile-sprites.ts), the props every area shares (prop-sprites.ts), and the hero and its arrows (hero-sprite.ts).
// The rest of the adapter only calls the draw functions below.

type Graphics = Phaser.GameObjects.Graphics;

/** Terrain colours, by the `kind` the content gives each terrain. */
const TERRAIN_COLOURS: Readonly<Record<string, number>> = {
  water: 0x2f6db5,
  rock: 0x6e6e78,
  sand: 0xdcc58a,
  grass: 0x5a9e45,
  wreckage: 0x7b5a3a,
  tree: 0x2f5d2a,
};

/** Monster colours, by monster type. */
const MONSTER_COLOURS: Readonly<Record<string, number>> = {
  crab: 0xd9534f,
  wolf: 0x9aa3b8,
  slime: 0x40e0d0,
  boar: 0x7d4e2d,
  spitter: 0xa86fd6,
};

/** Anything the art has no colour for is drawn in this colour, so a missing one cannot be overlooked. */
const UNKNOWN_COLOUR = 0xff00ff;

const OUTLINE_COLOUR = 0x1b1b24;
const HIT_FLASH_COLOUR = 0xffffff;
const HEALTH_COLOUR = 0x7bd35f;
const TELEGRAPH_COLOUR = 0xe0392e;
const STRIKE_COLOUR = 0xff8a3d;
const WIND_UP_COLOUR = 0xff6b5b;

/** A monster that warns by flashing alternates on and off over this many equal parts of its wind-up, ending on. */
const WIND_UP_FLASH_PARTS = 7;

/** How far, in tiles, a zone's edge may lie beyond a body's and still be the body's edge: it absorbs rounding. */
const EDGE_TOLERANCE = 1e-6;

/** The faded copies of a dashing monster's body left behind it, nearest first, by how much of its colour shows. */
const DASH_TRAIL_ALPHAS: readonly number[] = [0.5, 0.3, 0.15];

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

/** The colour of a type of monster. */
export function monsterColour(type: string): number {
  return MONSTER_COLOURS[type] ?? UNKNOWN_COLOUR;
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
 * Draws what the hero can interact with that has no picture yet: the gates and the levers of the light puzzles, as flat
 * shapes. The rest has its picture (prop-sprites.ts), so a kind drawn there is listed here to say that it is not forgotten:
 * a new kind of interactable does not compile until it is listed in both.
 */
export function drawInteractable(graphics: Graphics, interactable: InteractableView): void {
  switch (interactable.kind) {
    case 'chest':
    case 'pickup':
    case 'key':
    case 'door':
    case 'sign':
      return;
    case 'gate':
      drawGate(graphics, interactable);
      return;
    case 'lever':
      drawLever(graphics, interactable);
      return;
  }
}

/**
 * Draws a monster as a square: white while it flashes from a hit, dimmed while it rests after an attack, with a Health
 * bar once it is hurt. While it winds up an attack that has no area to show, it flashes red; while it dashes, faded
 * copies of it trail behind.
 */
export function drawMonster(graphics: Graphics, monster: MonsterView, flashing: boolean): void {
  const body = bodyRect(monster.position, monster.size);
  const colour = monsterColour(monster.type);
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
