import type { ContentDefinition, GameEvent, GameView } from '../core';
import type { ArtLookup } from './asset-manifest';

// The audio manifest: every sound the adapter can play is registered here by name, and the scenes ask for sounds by those
// names only, which are also the keys of Phaser's audio cache. Like the asset manifest, it is pure: the check for a sound
// that is needed but not registered, which sound a place or an event calls for, and the files and volumes of the sounds
// are all here, to be tested and edited without Phaser; the Phaser side is audio.ts. The sounds come from the Ninja
// Adventure pack (entry A1 of docs/assets/licences.md), and each file is named there.
//
// To swap a sound for another of the pack: copy its file under public/audio/music/ or public/audio/sfx/, change the file
// of the entry below, and say so in the licence record in the same commit; tests/shipped-audio.test.ts checks that the
// files and the record agree with the manifest.

export type SoundKind = 'music' | 'effect';

export interface SoundEntry {
  readonly kind: SoundKind;
  /** The file, in `music/` for music and in `sfx/` for effects, under `public/audio/`. */
  readonly file: string;
  /** How loud the sound is before the player's volume is applied: above 0, and at most 1. */
  readonly volume: number;
}

export type AudioManifest = Readonly<Record<string, SoundEntry>>;

/** A track of music, which plays over and over until another is wanted. */
function music(file: string, volume: number): SoundEntry {
  return { kind: 'music', file, volume };
}

/** A short sound that plays once, for something that happened. */
function effect(file: string, volume: number): SoundEntry {
  return { kind: 'effect', file, volume };
}

/** Where the file of a sound is, from `public/audio/`, with forward slashes: `music/boat.ogg`. */
export function soundPath(entry: SoundEntry): string {
  return `${entry.kind === 'music' ? 'music' : 'sfx'}/${entry.file}`;
}

/** What an effect is for. Each is a sound of the manifest, under the key `sfx-<effect>`. */
export const EFFECTS = [
  'sword',
  'bow',
  'monster-hit',
  'hero-hit',
  'monster-defeated',
  'pickup',
  'level-up',
  'chime',
  'hero-defeated',
  'page-open',
  'page-close',
  'confirm',
  'heal',
  'refusal',
  'switch',
  'victory',
] as const;

export type Effect = (typeof EFFECTS)[number];

export const TITLE_TRACK = 'music-title';
export const FIGHT_TRACK = 'music-fight';
export const ENDING_TRACK = 'music-ending';

/** The key of the music of an Adventure Area. */
export function areaTrack(areaId: string): string {
  return `music-area-${areaId}`;
}

/** The key of an effect. */
export function effectKey(effect: Effect): string {
  return `sfx-${effect}`;
}

// The music of the tracks of the pack differs in loudness by as much as 15 decibels, so each track has the volume that
// brings its average level (measured by decoding it) to about the same: -24 dBFS, and no more than 1 for the quiet ones.
// The effects of the pack are all normalised to the same peak, so theirs are only weights: the ones that sound all the
// time are softer than the rare ones. All of them are guesses to be checked by ear.
export const AUDIO: AudioManifest = {
  [TITLE_TRACK]: music('intro.ogg', 0.95),
  [areaTrack('shipwreck-coast')]: music('boat.ogg', 1),
  [areaTrack('woods')]: music('peaceful.ogg', 0.43),
  [areaTrack('mountain')]: music('ascension.ogg', 1),
  [areaTrack('cave')]: music('the-cave.ogg', 0.41),
  [areaTrack('castle')]: music('dark-castle.ogg', 0.53),
  [FIGHT_TRACK]: music('fight.ogg', 0.54),
  [ENDING_TRACK]: music('end-theme.ogg', 0.35),
  [effectKey('sword')]: effect('slash.wav', 0.7),
  [effectKey('bow')]: effect('whoosh2.wav', 0.7),
  [effectKey('monster-hit')]: effect('hit1.wav', 0.8),
  [effectKey('hero-hit')]: effect('hit2.wav', 1),
  [effectKey('monster-defeated')]: effect('impact5.wav', 0.9),
  [effectKey('pickup')]: effect('coin.wav', 0.7),
  [effectKey('level-up')]: effect('powerup1.wav', 1),
  [effectKey('chime')]: effect('magic1.wav', 0.9),
  [effectKey('hero-defeated')]: effect('alert.wav', 1),
  [effectKey('page-open')]: effect('menu5.wav', 0.6),
  [effectKey('page-close')]: effect('menu6.wav', 0.6),
  [effectKey('confirm')]: effect('accept3.wav', 0.8),
  [effectKey('heal')]: effect('heal.wav', 0.8),
  [effectKey('refusal')]: effect('cancel2.wav', 0.7),
  [effectKey('switch')]: effect('move3.wav', 0.6),
  [effectKey('victory')]: effect('bonus.wav', 1),
};

/** Says whether a sound is registered, through the same small question that the asset manifest and Phaser's audio cache answer. */
export function soundLookup(manifest: AudioManifest): ArtLookup {
  return { exists: (name) => Object.hasOwn(manifest, name) };
}

/**
 * Every sound that the content needs, by name: the title, the music of each of its Adventure Areas, the fight, the ending,
 * and every effect. An area that is added without music is found at start-up, by its name, and not by its silence.
 */
export function neededAudio(content: ContentDefinition): string[] {
  return [
    TITLE_TRACK,
    ...content.areas.map((area) => areaTrack(area.id)),
    FIGHT_TRACK,
    ENDING_TRACK,
    ...EFFECTS.map(effectKey),
  ];
}

/** Where the player is, as far as the music goes: the title, the play screen in an Adventure Area (with the fight on or not), or the ending. */
export type Place =
  | { readonly at: 'title' }
  | { readonly at: 'play'; readonly areaId: string; readonly fight: boolean }
  | { readonly at: 'ending' };

/** The track that should be playing in a place: the fight's while it is on, and otherwise the place's own. */
export function trackFor(place: Place): string {
  switch (place.at) {
    case 'title':
      return TITLE_TRACK;
    case 'play':
      return place.fight ? FIGHT_TRACK : areaTrack(place.areaId);
    case 'ending':
      return ENDING_TRACK;
  }
}

/**
 * The effect that an event of the Game core is heard as, or null for an event that is deliberately silent. This is the
 * one place where events become sound, and its switch names every event, so that an event added to the core without a
 * decision here does not compile.
 */
export function sfxFor(event: GameEvent): Effect | null {
  switch (event.type) {
    case 'hero-attacked':
      return 'sword';
    case 'hero-shot':
      return 'bow';
    case 'monster-hit':
      return 'monster-hit';
    case 'hero-hit':
      return 'hero-hit';
    case 'monster-defeated':
      return 'monster-defeated';
    case 'guardian-defeated':
      return 'victory';
    case 'pickup':
      return 'pickup';
    case 'level-up':
      return 'level-up';
    case 'checkpoint-activated':
    case 'vessel-prepared':
      return 'chime';
    case 'hero-defeated':
      return 'hero-defeated';
    case 'page-opened':
      return 'page-open';
    case 'page-closed':
      return 'page-close';
    case 'gear-equipped':
    case 'stat-point-assigned':
    case 'ending-reached':
      return 'confirm';
    case 'healing-potion-used':
      return 'heal';
    case 'out-of-ammunition':
    case 'door-locked':
      return 'refusal';
    case 'weapon-switched':
      return 'switch';
    // Silent on purpose. The music is the sound of a place and of the fight, so coming to a new area, the opening and the
    // Guardian noticing the hero need no effect of their own. A monster's strike or shot is seen, and heard when it lands as
    // hero-hit. Experience, milestones, the texts and a chest, which is followed by its pickup, are told on the screen. The
    // pack has no sound of a door, a lever or a sign.
    case 'opening':
    case 'guardian-engaged':
    case 'monster-attacked':
    case 'monster-fired':
    case 'experience-gained':
    case 'milestone-reached':
    case 'area-changed':
    case 'area-text':
    case 'chest-opened':
    case 'door-opened':
    case 'lever-toggled':
    case 'sign-read':
      return null;
    default:
      return refuseEvent(event);
  }
}

/** Only an event that got past the compiler gets here. Its parameter type makes an event without a case a compile error. */
function refuseEvent(event: never): never {
  const { type } = event as { type?: unknown };
  throw new Error(`No sound is decided for the event "${String(type)}"`);
}

/** The effects to play for the events of one frame: each effect once, however many events call for it, in the order of the events. */
export function effectsFor(events: readonly GameEvent[]): Effect[] {
  const effects: Effect[] = [];
  for (const event of events) {
    const heard = sfxFor(event);
    if (heard !== null && !effects.includes(heard)) {
      effects.push(heard);
    }
  }
  return effects;
}

/**
 * The effects of one frame of play: those of its events, and the one of the question whether to sail home opening or being
 * turned down. The core tells nothing of that question, so the views before and after the frame tell it.
 */
export function effectsOfFrame(events: readonly GameEvent[], before: GameView, after: GameView): Effect[] {
  const effects = effectsFor(events);
  const question = questionEffect(before, after);
  return question === null || effects.includes(question) ? effects : [...effects, question];
}

/**
 * Opening the question is heard as a page opening, and turning it down as one closing. Answering it is `ending-reached`,
 * after which the game is back at the title: that is not a closing.
 */
function questionEffect(before: GameView, after: GameView): Effect | null {
  if (after.phase !== 'playing') {
    return null;
  }
  const wasOpen = before.phase === 'playing' && before.departure !== null;
  const isOpen = after.departure !== null;
  if (isOpen === wasOpen) {
    return null;
  }
  return isOpen ? 'page-open' : 'page-close';
}

/**
 * Whether the fight is on after the events of a frame, given whether it was on before. The Guardian noticing the hero
 * begins it. It ends when the Guardian or the hero falls, when the hero comes into another area, and when the game ends.
 * The events are taken in the order they were told, so the last of them in a frame wins.
 */
export function fightAfter(fight: boolean, events: readonly GameEvent[]): boolean {
  let on = fight;
  for (const event of events) {
    switch (event.type) {
      case 'guardian-engaged':
        on = true;
        break;
      case 'guardian-defeated':
      case 'hero-defeated':
      case 'area-changed':
      case 'ending-reached':
        on = false;
        break;
      default:
        break;
    }
  }
  return on;
}
