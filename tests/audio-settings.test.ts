import { describe, expect, it } from 'vitest';
import {
  AUDIO_SETTINGS_KEY,
  DEFAULT_AUDIO_SETTINGS,
  MAX_VOLUME,
  changeSettings,
  createAudioSettingsStore,
  lowerVolume,
  parseAudioSettings,
  raiseVolume,
  toggleMute,
} from '../src/adapter/audio-settings';
import type { AudioChange, AudioSettings } from '../src/adapter/audio-settings';
import { SAVE_KEY, createSaveStore } from '../src/adapter/save-store';
import type { SaveStorage } from '../src/adapter/save-store';
import { adventureAfter, adventureContent } from './saved-adventure';

// The sound settings of the player, which the game keeps in the browser apart from the saved game. This is the settings
// boundary of ADR 0002 (the parsing of what the storage holds, which may be anything), and with it, as ADR 0005 allows
// for the adapter's pure functions, the three changes and the store over a storage in memory.

/** The part of localStorage the game uses, in memory. The tests look at what it holds and what was asked of it, and make it fail. */
class MemoryStorage implements SaveStorage {
  readonly items = new Map<string, string>();
  readonly keysAskedFor: string[] = [];
  refuseReads: Error | null = null;
  refuseWrites: Error | null = null;

  getItem(key: string): string | null {
    this.keysAskedFor.push(key);
    if (this.refuseReads !== null) {
      throw this.refuseReads;
    }
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.keysAskedFor.push(key);
    if (this.refuseWrites !== null) {
      throw this.refuseWrites;
    }
    this.items.set(key, value);
  }
}

const DEFAULT = DEFAULT_AUDIO_SETTINGS;
const json = (value: unknown): string => JSON.stringify(value);

describe('the default audio settings', () => {
  it('let the game be heard: the sound is on, and the volume is a whole step that is neither silent nor the loudest', () => {
    expect(DEFAULT.muted).toBe(false);
    expect(Number.isInteger(DEFAULT.volume)).toBe(true);
    expect(DEFAULT.volume).toBeGreaterThan(0);
    expect(DEFAULT.volume).toBeLessThan(MAX_VOLUME);
  });
});

describe('reading the audio settings from the text that was stored', () => {
  it('gives back the settings that were stored', () => {
    expect(parseAudioSettings('{"muted":true,"volume":3}')).toEqual({ muted: true, volume: 3 });
    expect(parseAudioSettings('{"muted":false,"volume":0}')).toEqual({ muted: false, volume: 0 });
  });

  it.each([
    ['nothing stored', null],
    ['an empty text', ''],
    ['text that is no JSON', '{"muted": tr'],
    ['JSON that is null', 'null'],
    ['a number', '7'],
    ['a string', '"loud"'],
    ['a boolean', 'true'],
    ['a list', '[true, 3]'],
  ])('gives the defaults, both of them, for %s', (_what, stored) => {
    expect(parseAudioSettings(stored)).toEqual(DEFAULT);
  });

  it('gives the defaults for an object with none of the fields', () => {
    expect(parseAudioSettings('{}')).toEqual(DEFAULT);
  });

  it.each([
    ['a string', '7'],
    ['null', null],
    ['a boolean', true],
    ['a list', [7]],
    ['an object', { level: 7 }],
  ])('gives the default volume for a volume that is %s, and keeps the muting that was stored', (_what, volume) => {
    expect(parseAudioSettings(json({ muted: true, volume }))).toEqual({ muted: true, volume: DEFAULT.volume });
  });

  it.each([
    ['a string', 'yes'],
    ['a number', 1],
    ['null', null],
    ['a list', [true]],
  ])('gives the default muting for a muting that is %s, and keeps the volume that was stored', (_what, muted) => {
    expect(parseAudioSettings(json({ muted, volume: 2 }))).toEqual({ muted: DEFAULT.muted, volume: 2 });
  });

  it('gives the default of a field that was not stored, and keeps the other', () => {
    expect(parseAudioSettings('{"muted":true}')).toEqual({ muted: true, volume: DEFAULT.volume });
    expect(parseAudioSettings('{"volume":2}')).toEqual({ muted: DEFAULT.muted, volume: 2 });
  });

  it.each([
    [MAX_VOLUME + 1, MAX_VOLUME],
    [25, MAX_VOLUME],
    [-1, 0],
    [-40, 0],
  ])('keeps a volume of %s within the steps, at %s', (stored, expected) => {
    expect(parseAudioSettings(json({ muted: false, volume: stored })).volume).toBe(expected);
  });

  it.each([
    [0, 0],
    [MAX_VOLUME, MAX_VOLUME],
    [4, 4],
  ])('leaves a volume of %s, which is a step, as it is', (stored, expected) => {
    expect(parseAudioSettings(json({ muted: false, volume: stored })).volume).toBe(expected);
  });

  it.each([
    [7.4, 7],
    [7.5, 8],
    [0.4, 0],
    [9.6, 10],
  ])('rounds a volume of %s, which is no whole step, to the nearest step, %s', (stored, expected) => {
    expect(parseAudioSettings(json({ muted: false, volume: stored })).volume).toBe(expected);
  });

  it('does not trust infinity, which a text such as 1e999 reads as: the volume is the default', () => {
    expect(parseAudioSettings('{"muted":false,"volume":1e999}').volume).toBe(DEFAULT.volume);
    expect(parseAudioSettings('{"muted":false,"volume":-1e999}').volume).toBe(DEFAULT.volume);
  });

  it('ignores the fields it does not know, and gives back no more than the two settings', () => {
    expect(parseAudioSettings('{"muted":true,"volume":4,"music":9,"theme":"dark"}')).toStrictEqual({
      muted: true,
      volume: 4,
    });
  });
});

describe('the audio settings store', () => {
  it('finds the defaults when nothing was ever written, and writes nothing of its own', () => {
    const storage = new MemoryStorage();

    expect(createAudioSettingsStore(storage).read()).toEqual(DEFAULT);

    expect(storage.items.size).toBe(0);
  });

  it('gives back the settings that were written', () => {
    const store = createAudioSettingsStore(new MemoryStorage());

    expect(store.write({ muted: true, volume: 2 })).toBe(true);

    expect(store.read()).toEqual({ muted: true, volume: 2 });
  });

  it('keeps the settings under one key of the storage, as the JSON of the two settings', () => {
    const storage = new MemoryStorage();

    createAudioSettingsStore(storage).write({ muted: true, volume: 9 });

    expect([...storage.items.keys()]).toEqual([AUDIO_SETTINGS_KEY]);
    expect(JSON.parse(storage.items.get(AUDIO_SETTINGS_KEY) ?? '')).toStrictEqual({ muted: true, volume: 9 });
  });

  it('finds the settings that a store of an earlier visit wrote', () => {
    const storage = new MemoryStorage();
    createAudioSettingsStore(storage).write({ muted: false, volume: 1 });

    expect(createAudioSettingsStore(storage).read()).toEqual({ muted: false, volume: 1 });
  });

  it('replaces the settings when others are written, and keeps only those', () => {
    const storage = new MemoryStorage();
    const store = createAudioSettingsStore(storage);
    store.write({ muted: true, volume: 2 });

    store.write({ muted: false, volume: 8 });

    expect(store.read()).toEqual({ muted: false, volume: 8 });
    expect(storage.items.size).toBe(1);
  });

  it('gives the defaults for a text under its key that is garbage, and leaves the text as it is until the next write', () => {
    const storage = new MemoryStorage();
    storage.items.set(AUDIO_SETTINGS_KEY, '}{ garbage');
    const store = createAudioSettingsStore(storage);

    expect(store.read()).toEqual(DEFAULT);
    expect(storage.items.get(AUDIO_SETTINGS_KEY)).toBe('}{ garbage');

    store.write({ muted: true, volume: 4 });

    expect(store.read()).toEqual({ muted: true, volume: 4 });
  });

  it('mends what it reads field by field, so that one field gone bad does not take the other with it', () => {
    const storage = new MemoryStorage();
    storage.items.set(AUDIO_SETTINGS_KEY, '{"muted":true,"volume":"very loud"}');

    expect(createAudioSettingsStore(storage).read()).toEqual({ muted: true, volume: DEFAULT.volume });
  });

  it('has the defaults, and writes nothing, when the browser gave no storage: the write says it was not kept', () => {
    const store = createAudioSettingsStore(null);

    expect(store.read()).toEqual(DEFAULT);
    expect(store.write({ muted: true, volume: 3 })).toBe(false);
    expect(store.read()).toEqual(DEFAULT);
  });

  it('has the defaults when the browser refuses to read, which a blocked storage does by throwing', () => {
    const storage = new MemoryStorage();
    storage.items.set(AUDIO_SETTINGS_KEY, '{"muted":true,"volume":3}');
    storage.refuseReads = new Error('The operation is insecure.');

    expect(createAudioSettingsStore(storage).read()).toEqual(DEFAULT);
  });

  it('says that the write was not kept when the browser refuses it, and the settings of before stay', () => {
    const storage = new MemoryStorage();
    const store = createAudioSettingsStore(storage);
    store.write({ muted: false, volume: 3 });
    storage.refuseWrites = new Error('The quota has been exceeded.');

    expect(store.write({ muted: true, volume: 9 })).toBe(false);

    storage.refuseWrites = null;
    expect(store.read()).toEqual({ muted: false, volume: 3 });
  });
});

describe('the audio settings and the saved game', () => {
  const content = adventureContent();
  const SETTINGS_TEXT = '{"muted":true,"volume":3}';
  const GARBAGE_SAVE = '{"version": "this is no saved game"';

  function storageWithBoth(): MemoryStorage {
    const storage = new MemoryStorage();
    storage.items.set(AUDIO_SETTINGS_KEY, SETTINGS_TEXT);
    storage.items.set(SAVE_KEY, GARBAGE_SAVE);
    return storage;
  }

  it('are not touched by reading a saved game, whatever the save is: they are what they were', () => {
    const storage = storageWithBoth();

    expect(createSaveStore(storage, content).read().status).toBe('unusable');

    expect(createAudioSettingsStore(storage).read()).toEqual({ muted: true, volume: 3 });
    expect(storage.items.get(AUDIO_SETTINGS_KEY)).toBe(SETTINGS_TEXT);
  });

  it('are not touched by writing a saved game, and a saved game is not touched by writing them', () => {
    const storage = storageWithBoth();

    createSaveStore(storage, content).write(adventureAfter('camp').snapshot());
    expect(storage.items.get(AUDIO_SETTINGS_KEY)).toBe(SETTINGS_TEXT);

    storage.items.set(SAVE_KEY, GARBAGE_SAVE);
    createAudioSettingsStore(storage).write({ muted: false, volume: 9 });
    expect(storage.items.get(SAVE_KEY)).toBe(GARBAGE_SAVE);
  });

  it('are read and written under their own key alone, never under the key of the save', () => {
    const storage = storageWithBoth();
    const store = createAudioSettingsStore(storage);

    store.read();
    store.write({ muted: true, volume: 1 });
    store.read();

    expect(new Set(storage.keysAskedFor)).toEqual(new Set([AUDIO_SETTINGS_KEY]));
  });
});

describe('changing the audio settings', () => {
  const heard: AudioSettings = { muted: false, volume: 6 };
  const muted: AudioSettings = { muted: true, volume: 6 };

  it('raises the volume by one step', () => {
    expect(raiseVolume(heard)).toEqual({ muted: false, volume: 7 });
  });

  it('lowers the volume by one step', () => {
    expect(lowerVolume(heard)).toEqual({ muted: false, volume: 5 });
  });

  it('raises the volume no higher than the loudest step, and lowers it no lower than silence', () => {
    expect(raiseVolume({ muted: false, volume: MAX_VOLUME })).toEqual({ muted: false, volume: MAX_VOLUME });
    expect(lowerVolume({ muted: false, volume: 0 })).toEqual({ muted: false, volume: 0 });
  });

  it('keeps the volume a whole step from silence to the loudest, however often a key is pressed', () => {
    let louder: AudioSettings = heard;
    let quieter: AudioSettings = heard;
    for (let press = 0; press < 3 * MAX_VOLUME; press += 1) {
      louder = raiseVolume(louder);
      quieter = lowerVolume(quieter);
    }

    expect(louder.volume).toBe(MAX_VOLUME);
    expect(quieter.volume).toBe(0);
  });

  it('turns the sound on again when the volume is changed while it is off, which would otherwise be silent', () => {
    expect(raiseVolume(muted)).toEqual({ muted: false, volume: 7 });
    expect(lowerVolume(muted)).toEqual({ muted: false, volume: 5 });
  });

  it('turns the sound off and on again, and keeps the volume it had', () => {
    expect(toggleMute(heard)).toEqual({ muted: true, volume: 6 });
    expect(toggleMute(muted)).toEqual({ muted: false, volume: 6 });
    expect(toggleMute(toggleMute({ muted: false, volume: 2 }))).toEqual({ muted: false, volume: 2 });
  });

  it('brings the sound back at the default volume when it is turned on at volume 0, which would be silence', () => {
    expect(toggleMute({ muted: true, volume: 0 })).toEqual({ muted: false, volume: DEFAULT.volume });
  });

  it('turns the sound off at volume 0 as at any other, and keeps that volume', () => {
    expect(toggleMute({ muted: false, volume: 0 })).toEqual({ muted: true, volume: 0 });
  });

  it('leaves the settings it was given as they were', () => {
    const given = Object.freeze({ muted: true, volume: 0 });

    expect(raiseVolume(given)).not.toBe(given);
    expect(lowerVolume(given)).not.toBe(given);
    expect(toggleMute(given)).not.toBe(given);
    expect(given).toEqual({ muted: true, volume: 0 });
  });
});

describe('what each key of the audio does to the settings', () => {
  const heard: AudioSettings = { muted: false, volume: 6 };
  const muted: AudioSettings = { muted: true, volume: 6 };

  it('turns the sound off, or on again, for the key that mutes', () => {
    expect(changeSettings(heard, 'toggle-mute')).toEqual({ muted: true, volume: 6 });
    expect(changeSettings(muted, 'toggle-mute')).toEqual({ muted: false, volume: 6 });
  });

  it('lowers the volume for the key that lowers it, and raises it for the key that raises it', () => {
    expect(changeSettings(heard, 'lower')).toEqual({ muted: false, volume: 5 });
    expect(changeSettings(heard, 'raise')).toEqual({ muted: false, volume: 7 });
  });

  it('does what a press of each kind in a row does, one after the other', () => {
    const presses: AudioChange[] = ['lower', 'lower', 'toggle-mute', 'raise'];

    expect(presses.reduce(changeSettings, heard)).toEqual({ muted: false, volume: 5 });
  });
});
