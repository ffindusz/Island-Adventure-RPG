import type Phaser from 'phaser';
import type { AreaView } from '../core';
import { terrainColour } from './art';
import { TILE_SIZE } from './config';
import { lookOf, planTerrain } from './terrain-plan';
import type { Quarter, Stamp } from './terrain-plan';

// The ground of an Adventure Area as one picture, painted once from the plan of terrain-plan.ts and kept: terrain never
// changes, so the scene only shows it and scrolls with the camera. The painting is nearest-neighbour, whole pixels only.

const HALF = TILE_SIZE / 2;

const QUARTER_AT: Readonly<Record<Quarter, readonly [number, number]>> = {
  nw: [0, 0],
  ne: [HALF, 0],
  sw: [0, HALF],
  se: [HALF, HALF],
};

/** The name of the texture that holds the ground of the area with this id. */
export function groundTexture(areaId: string): string {
  return `ground-${areaId}`;
}

function paint(context: CanvasRenderingContext2D, textures: Phaser.Textures.TextureManager, stamp: Stamp): void {
  const frame = textures.getFrame(stamp.art, stamp.frame);
  if (!frame) {
    throw new Error(`The ground needs frame ${stamp.frame} of "${stamp.art}", which is not loaded`);
  }
  const [dx, dy] = stamp.quarter ? QUARTER_AT[stamp.quarter] : [0, 0];
  const size = stamp.quarter ? HALF : TILE_SIZE;
  context.drawImage(
    frame.source.image as CanvasImageSource,
    frame.cutX + dx,
    frame.cutY + dy,
    size,
    size,
    stamp.x * TILE_SIZE + dx,
    stamp.y * TILE_SIZE + dy,
    size,
    size,
  );
}

/**
 * Paints the ground of the area into a texture, if that has not been done, and returns the texture's name. Every tile
 * starts as the colour of its kind of terrain, so a kind that has no picture shows as its colour and not as a hole.
 */
export function bakeGround(textures: Phaser.Textures.TextureManager, area: AreaView): string {
  const name = groundTexture(area.id);
  if (textures.exists(name)) {
    return name;
  }
  const texture = textures.createCanvas(name, area.width * TILE_SIZE, area.height * TILE_SIZE);
  if (texture === null) {
    throw new Error(`The ground of the area "${area.id}" could not be made: its texture could not be created`);
  }
  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  area.terrain.forEach((row, y) => {
    row.forEach((kind, x) => {
      context.fillStyle = `#${terrainColour(kind).toString(16).padStart(6, '0')}`;
      context.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
  });
  for (const stamp of planTerrain(area.terrain, lookOf(area.id))) {
    paint(context, textures, stamp);
  }
  texture.refresh();
  return name;
}
