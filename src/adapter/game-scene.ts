import Phaser from 'phaser';
import { DismissalWatch } from './area-text-dismissal';
import { ARTWORK } from './artwork';
import { buildDrawnArt, queueArt, requireLoadedArt } from './asset-loader';
import type { GameAudio } from './audio';
import { AudioLine } from './audio-line';
import type { LineCorner } from './audio-line';
import { PlayerInput } from './player-input';

// What the three scenes of the game, the title, the play screen and the ending, have alike: each waits for the same
// pictures and sounds, reads the same keys, and shows the line that says what the keys of the audio did. A scene gets its
// files asked for from here in `preload`, calls `requireFiles` first in its `create` and `useKeyboard` once its own layers
// are made, and calls `pollAudioKeys` first in every `update`. The play screen also calls `watchPresses` for the press of
// any key. Like the scenes, this decides nothing about the game.

export abstract class GameScene extends Phaser.Scene {
  protected readonly audio: GameAudio;
  /** The player's keys, from `useKeyboard`. */
  protected playerInput!: PlayerInput<Phaser.Input.Keyboard.Key>;
  private audioLine!: AudioLine;

  protected constructor(key: string, audio: GameAudio) {
    super(key);
    this.audio = audio;
  }

  /** Queues every picture of the manifest and every sound that this browser can play (asset-loader.ts, audio.ts). */
  preload(): void {
    queueArt(this.load, ARTWORK);
    this.audio.queue(this);
  }

  /** Makes the pictures that are drawn, then throws, naming each, for a picture or a sound that did not load. */
  protected requireFiles(): void {
    buildDrawnArt(this.textures, ARTWORK);
    requireLoadedArt(this.textures, ARTWORK);
    this.audio.requireLoaded();
  }

  /**
   * Takes the keyboard for `playerInput` and makes the line of the audio, in the corner that the scene leaves free
   * (audio-line.ts). `purpose` is what the keys are for, for the error of a game without a keyboard plugin.
   */
  protected useKeyboard(purpose: string, corner?: LineCorner): void {
    this.playerInput = new PlayerInput(this.keyboardFor(purpose), Phaser.Input.Keyboard.JustDown);
    this.audioLine = new AudioLine(this, corner);
  }

  /**
   * Starts hearing the presses of the keyboard (area-text-dismissal.ts): the scene asks the watch in each frame whether a
   * press counted. The scene is made again for every game of a session, so the watch stops when the scene shuts down, and
   * a listener left behind does not hear the keys of the next one. `purpose` is as for `useKeyboard`.
   */
  protected watchPresses(purpose: string): DismissalWatch {
    const watch = new DismissalWatch(this.keyboardFor(purpose), Phaser.Input.Keyboard.Events.ANY_KEY_DOWN);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      watch.stop();
    });
    return watch;
  }

  private keyboardFor(purpose: string): Phaser.Input.Keyboard.KeyboardPlugin {
    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error(`The keyboard plugin is not available, so nothing could ${purpose}.`);
    }
    return keyboard;
  }

  /** The keys of the audio work on every screen, whatever the scene is doing: this reads them and shows the line. */
  protected pollAudioKeys(frameMs: number): void {
    this.audioLine.update(this.audio.press(this.playerInput.pollAudio()), frameMs);
  }
}
