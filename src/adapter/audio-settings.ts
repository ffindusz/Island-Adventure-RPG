import type { SaveStorage } from './save-store';

// The sound settings: whether the sound is off, and how loud it is. They are the player's, not the game's, so the
// browser keeps them under a key of their own, apart from the saved game in both directions: a New Game, a damaged save
// and a refused save change nothing of them, and they change nothing of the save. A browser that lets nothing be kept
// still has settings, for as long as the page is open.
// No Phaser in here: the storage is handed in, as for the save store, so the tests give it one in memory.

/** What the player chose. `volume` is a whole number of steps, from 0 (silent) to MAX_VOLUME (the loudest). */
export interface AudioSettings {
  readonly muted: boolean;
  readonly volume: number;
}

/** The loudest step of the volume. */
export const MAX_VOLUME = 10;

/** The settings of a first visit, and the setting that cannot be read in the settings of any other. */
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { muted: false, volume: 6 };

/** The one key of the storage that holds the settings, in the namespace of the save's key. */
export const AUDIO_SETTINGS_KEY = 'island-adventure-rpg:audio-settings';

/**
 * The settings in the text that was stored. The game never fails for a setting, so what cannot be read is replaced: a
 * text that is not a JSON object gives both defaults, and an object gives each of its two fields that is fit and the
 * default for the other. A volume that is a number is rounded to a whole step and kept within the steps (25 is the
 * loudest, -3 is silent); infinity, which a text such as 1e999 reads as, is no number to trust. Other fields are ignored.
 */
export function parseAudioSettings(text: string | null): AudioSettings {
  const stored = parsedOrNull(text);
  if (typeof stored !== 'object' || stored === null) {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
  const { muted, volume } = stored as Record<string, unknown>;
  return {
    muted: typeof muted === 'boolean' ? muted : DEFAULT_AUDIO_SETTINGS.muted,
    volume: typeof volume === 'number' && Number.isFinite(volume) ? withinSteps(volume) : DEFAULT_AUDIO_SETTINGS.volume,
  };
}

/** One step louder. The sound comes on again if it was off, since the player would not hear the change. */
export function raiseVolume(settings: AudioSettings): AudioSettings {
  return { muted: false, volume: withinSteps(settings.volume + 1) };
}

/** One step quieter. The sound comes on again if it was off, since the player would not hear the change. */
export function lowerVolume(settings: AudioSettings): AudioSettings {
  return { muted: false, volume: withinSteps(settings.volume - 1) };
}

/** Turns the sound off, or on again with the volume it had. At volume 0 the sound would still be silent: it comes back at the default. */
export function toggleMute(settings: AudioSettings): AudioSettings {
  if (!settings.muted) {
    return { muted: true, volume: settings.volume };
  }
  return { muted: false, volume: settings.volume === 0 ? DEFAULT_AUDIO_SETTINGS.volume : settings.volume };
}

export interface AudioSettingsStore {
  /** The settings now: what the storage holds, mended field by field, or the defaults. */
  read(): AudioSettings;
  /** Keeps the settings. False when the browser refused: the game goes on with the settings it has in memory. */
  write(settings: AudioSettings): boolean;
}

/** The store over the storage the browser gave, or null when it gave none (storage blocked, or no window). */
export function createAudioSettingsStore(storage: SaveStorage | null): AudioSettingsStore {
  return {
    read() {
      if (storage === null) {
        return { ...DEFAULT_AUDIO_SETTINGS };
      }
      try {
        return parseAudioSettings(storage.getItem(AUDIO_SETTINGS_KEY));
      } catch {
        return { ...DEFAULT_AUDIO_SETTINGS };
      }
    },
    write(settings) {
      if (storage === null) {
        return false;
      }
      try {
        storage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({ muted: settings.muted, volume: settings.volume }));
        return true;
      } catch {
        return false;
      }
    },
  };
}

function withinSteps(volume: number): number {
  return Math.min(MAX_VOLUME, Math.max(0, Math.round(volume)));
}

function parsedOrNull(text: string | null): unknown {
  if (text === null) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
