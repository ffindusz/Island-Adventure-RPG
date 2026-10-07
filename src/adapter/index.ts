import Phaser from 'phaser';
import type { ContentDefinition, Game } from '../core';
import { ARTWORK, neededArt } from './artwork';
import { manifestLookup, requireArt } from './asset-manifest';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { PlayScene } from './play-scene';

/**
 * Starts the Phaser game that shows and controls the given Game core. This is the only way into the adapter. It refuses
 * to start, naming them, when the content needs pictures that the asset manifest does not list.
 */
export function startAdapter(core: Game, content: ContentDefinition): Phaser.Game {
  requireArt(neededArt(content), manifestLookup(ARTWORK), 'The content needs pictures that the asset manifest lacks');
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    backgroundColor: '#000000',
    pixelArt: true,
    banner: false,
    // A whole-number zoom keeps every pixel square; any other scale smears pixel art.
    scale: { mode: Phaser.Scale.NONE, zoom: Phaser.Scale.MAX_ZOOM, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new PlayScene(core),
  });
  // The zoom above is only chosen at start-up, so choose it again whenever the window changes size.
  game.scale.on(Phaser.Scale.Events.RESIZE, () => {
    const zoom = game.scale.getMaxZoom();
    if (zoom !== game.scale.zoom) {
      game.scale.setZoom(zoom);
    }
  });
  return game;
}
