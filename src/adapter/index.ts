import Phaser from 'phaser';
import type { ContentDefinition, Game } from '../core';
import { ARTWORK, neededArt } from './artwork';
import { manifestLookup, requireArt } from './asset-manifest';
import { GameAudio } from './audio';
import { AUDIO, neededAudio, soundLookup } from './audio-manifest';
import { createAudioSettingsStore } from './audio-settings';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { checkAudioKeys } from './controls';
import { requireDrawableEnding } from './ending-pages';
import { EndingScene } from './ending-scene';
import { PlayScene } from './play-scene';
import { createSaveStore } from './save-store';
import type { SaveStorage } from './save-store';
import { TitleScene } from './title-scene';

/**
 * Starts the Phaser game that shows and controls the given Game core, on the title screen. The saved game lives in the
 * storage, which is null when the browser gives none, and so do the sound settings, in a key of their own. This is the
 * only way into the adapter. It refuses to start, naming them, when the content needs pictures that the asset manifest
 * does not list or sounds that the audio manifest does not, when a key of the audio is also the key of something else,
 * or when the ending or credits have a character the pixel font cannot draw.
 */
export function startAdapter(core: Game, content: ContentDefinition, storage: SaveStorage | null): Phaser.Game {
  requireArt(neededArt(content), manifestLookup(ARTWORK), 'The content needs pictures that the asset manifest lacks');
  requireArt(neededAudio(content), soundLookup(AUDIO), 'The content needs sounds that the audio manifest lacks');
  requireDrawableEnding(content);
  checkAudioKeys((name) => (Phaser.Input.Keyboard.KeyCodes as Record<string, number | undefined>)[name.toUpperCase()]);
  const saves = createSaveStore(storage, content);
  // One for the whole game: sounds outlive a scene, so every scene is given the same service.
  const audio = new GameAudio(createAudioSettingsStore(storage));
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
    // The first scene is the one that starts: the title, which starts the play screen; the play screen starts the ending
    // when the hero sails home, and both go back to the title.
    scene: [new TitleScene(core, saves, audio), new PlayScene(core, saves, audio), new EndingScene(audio)],
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
