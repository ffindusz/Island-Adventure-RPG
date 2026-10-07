import Phaser from 'phaser';
import { requireArt } from './asset-manifest';
import type { ArtManifest } from './asset-manifest';

/** Where the manifest's files are served from: the `art` folder of the site, wherever the site is hosted. */
const ART_URL = `${import.meta.env.BASE_URL}art/`;

/** Queues every picture of the manifest that comes from a file to load, under its name. Call it from `preload`. */
export function queueArt(load: Phaser.Loader.LoaderPlugin, manifest: ArtManifest): void {
  for (const [name, entry] of Object.entries(manifest)) {
    switch (entry.kind) {
      case 'image':
        load.image(name, ART_URL + entry.file);
        break;
      case 'sheet':
        load.spritesheet(name, ART_URL + entry.file, {
          frameWidth: entry.frameWidth,
          frameHeight: entry.frameHeight,
        });
        break;
      case 'drawn':
        break;
    }
  }
}

/** Makes the texture of every picture of the manifest that is drawn in code. Call it in `create`, before the check. */
export function buildDrawnArt(textures: Phaser.Textures.TextureManager, manifest: ArtManifest): void {
  for (const [name, entry] of Object.entries(manifest)) {
    if (entry.kind !== 'drawn' || textures.exists(name)) {
      continue;
    }
    const first = entry.rows[0] ?? '';
    const texture = textures.createCanvas(name, first.length, entry.rows.length);
    if (texture === null) {
      continue;
    }
    const context = texture.getContext();
    entry.rows.forEach((row, y) => {
      if (row.length !== first.length) {
        throw new Error(`The drawn picture "${name}" has a row ${y} of ${row.length} pixels, not ${first.length}`);
      }
      [...row].forEach((letter, x) => {
        if (letter === '.') {
          return;
        }
        const colour = entry.palette[letter];
        if (colour === undefined) {
          throw new Error(`The drawn picture "${name}" uses "${letter}", which its palette does not have`);
        }
        context.fillStyle = `#${colour.toString(16).padStart(6, '0')}`;
        context.fillRect(x, y, 1, 1);
      });
    });
    texture.refresh();
  }
}

/**
 * Throws, naming every picture of the manifest that is not a loaded texture. Phaser carries on after a file fails to
 * load, so without this the picture would simply not be drawn. Call it first thing in a scene's `create`, once the
 * drawn pictures are made.
 */
export function requireLoadedArt(textures: Phaser.Textures.TextureManager, manifest: ArtManifest): void {
  requireArt(Object.keys(manifest), textures, 'These pictures of the asset manifest did not load');
}
