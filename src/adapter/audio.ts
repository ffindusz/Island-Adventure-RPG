import type Phaser from 'phaser';
import { requireArt } from './asset-manifest';
import { AUDIO, effectKey, soundPath, trackFor } from './audio-manifest';
import type { Effect, Place, SoundEntry, SoundKind } from './audio-manifest';
import { MAX_VOLUME, changeSettings } from './audio-settings';
import type { AudioChange, AudioSettings, AudioSettingsStore } from './audio-settings';

// The audio service: the one place that touches Phaser's sound manager. The scenes tell it what is happening (the place
// the music is for, the effects of a frame, the keys of the audio) and it plays the sounds of the manifest.
//
// Sounds are global in Phaser. They outlive a scene and `scene.restart()`, and the one sound manager is the game's, so the
// service is made once and handed to every scene, and it owns exactly one music instance. Music is level-triggered: a
// scene says every frame which place it is in, and the track changes only when the place's track is not the one that
// plays, with a cut, so the music is right after Continue, after a fall into another area and under the debug placement
// without handling the events that move the hero. Effects are edge-triggered: they play once, for what happened.
//
// Nothing plays until the player's first key press or click, and until the browser has unlocked its sound: a locked Web
// Audio context would start every sound that was asked for at the moment it opens, all at once. The unlock is polled
// through `sound.locked`, which Phaser clears in the frame after the browser has opened the sound, so there is no listener
// of its Unlocked event to take off again. A key that is not in the audio cache throws when it is added, so no sound is
// added or played before its file has loaded, and `requireLoaded` makes a file that did not load a loud failure.

/** Where the files of the manifest are served from: the `audio` folder of the site, wherever the site is hosted. */
const AUDIO_URL = `${import.meta.env.BASE_URL}audio/`;

/** What the player's first input is: a key press, or a click or a touch. */
const FIRST_INPUT_EVENTS = ['keydown', 'pointerdown'] as const;

/** The format that each kind of sound is shipped in, which a browser may be unable to play. */
const FORMAT_OF = { music: 'ogg', effect: 'wav' } as const satisfies Readonly<Record<SoundKind, keyof Phaser.Device.Audio>>;

/** Whether this browser can load and play the file of the entry: it needs Web Audio or audio elements, and the file's format. */
function canPlay(device: Phaser.Device.Audio, entry: SoundEntry): boolean {
  return (device.webAudio || device.audioData) && device[FORMAT_OF[entry.kind]];
}

/** Calls `heard` once, at the first key press or click or touch anywhere in the page. */
function onFirstInput(heard: () => void): void {
  const listener = (): void => {
    for (const type of FIRST_INPUT_EVENTS) {
      window.removeEventListener(type, listener, true);
    }
    heard();
  };
  for (const type of FIRST_INPUT_EVENTS) {
    window.addEventListener(type, listener, true);
  }
}

/** What the line on the screen says after a change of the settings. */
function readout(change: AudioChange, settings: AudioSettings): string {
  if (change === 'toggle-mute') {
    return settings.muted ? 'SOUND OFF' : 'SOUND ON';
  }
  return `VOLUME ${settings.volume}/${MAX_VOLUME}`;
}

export class GameAudio {
  private readonly store: AudioSettingsStore;
  private settings: AudioSettings;
  private manager: Phaser.Sound.BaseSoundManager | null = null;
  private music: { readonly key: string; readonly sound: Phaser.Sound.BaseSound } | null = null;
  private heardFirstInput = false;
  private warned = false;

  constructor(store: AudioSettingsStore) {
    this.store = store;
    this.settings = store.read();
    onFirstInput(() => {
      this.heardFirstInput = true;
    });
  }

  /**
   * Call it from `preload` in every scene. The sound manager exists only once the game has booted, so it is taken from the
   * first scene that comes. It gets the player's settings, and every sound of the manifest that this browser can play is
   * queued to load: one that is already in the audio cache, which all of them are after the first scene, is skipped.
   */
  queue(scene: Phaser.Scene): void {
    const manager = scene.sound;
    this.manager = manager;
    this.apply();
    const device = manager.game.device.audio;
    const left = new Set<SoundKind>();
    for (const [key, entry] of Object.entries(AUDIO)) {
      if (canPlay(device, entry)) {
        scene.load.audio(key, AUDIO_URL + soundPath(entry));
      } else {
        left.add(entry.kind);
      }
    }
    if (left.size > 0 && !this.warned) {
      this.warned = true;
      const what = [...left].map((kind) => `${kind === 'music' ? 'music' : 'effects'} (${FORMAT_OF[kind]})`);
      console.warn(`This browser cannot play the game's ${what.join(' and ')}, so the game runs without them.`);
    }
  }

  /**
   * Throws, naming every sound of the manifest that this browser can play and that is not in the audio cache. Phaser
   * carries on after a file fails to load, so without this the sound would be silence. Call it in a scene's `create`.
   */
  requireLoaded(): void {
    const manager = this.manager;
    if (manager === null) {
      throw new Error('The sounds were not queued before they were required');
    }
    const device = manager.game.device.audio;
    const playable = Object.entries(AUDIO)
      .filter(([, entry]) => canPlay(device, entry))
      .map(([key]) => key);
    requireArt(playable, manager.game.cache.audio, 'These sounds of the audio manifest did not load');
  }

  /**
   * Call it every frame with the place that the scene is in. The track of the place plays, and a track that plays already
   * is left alone, so this is cheap. Another track takes the place of the one that plays, by a cut. Until the player's
   * first input, and until the browser has unlocked its sound, nothing starts, and the next frame asks again.
   */
  playMusic(place: Place): void {
    const manager = this.manager;
    if (manager === null || !this.heardFirstInput || manager.locked) {
      return;
    }
    const key = trackFor(place);
    const entry = AUDIO[key];
    if (this.music?.key === key || entry === undefined || !manager.game.cache.audio.exists(key)) {
      return;
    }
    if (this.music !== null) {
      manager.remove(this.music.sound);
    }
    const sound = manager.add(key, { loop: true, volume: entry.volume });
    sound.play();
    this.music = { key, sound };
  }

  /** Plays each of the effects, once, over whatever else plays. */
  hear(effects: readonly Effect[]): void {
    effects.forEach((effect) => this.play(effect));
  }

  /** Plays the effect once, over whatever else plays: nothing while the sound is locked, as it would burst out at the unlock. */
  play(effect: Effect): void {
    const manager = this.manager;
    const key = effectKey(effect);
    const entry = AUDIO[key];
    if (manager === null || manager.locked || entry === undefined || !manager.game.cache.audio.exists(key)) {
      return;
    }
    manager.play(key, { volume: entry.volume });
  }

  /**
   * What the keys of the audio asked of the settings: each is applied in order, the result is kept for the next visit, and
   * the line to show comes back, saying what the last of them did. It is null when no key was pressed.
   */
  press(changes: readonly AudioChange[]): string | null {
    let said: string | null = null;
    for (const change of changes) {
      this.settings = changeSettings(this.settings, change);
      said = readout(change, this.settings);
    }
    if (said !== null) {
      this.apply();
      this.store.write(this.settings);
    }
    return said;
  }

  /** Gives the sound manager the settings: one master mute and one master volume for the music and the effects alike. */
  private apply(): void {
    if (this.manager !== null) {
      this.manager.mute = this.settings.muted;
      this.manager.volume = this.settings.volume / MAX_VOLUME;
    }
  }
}
