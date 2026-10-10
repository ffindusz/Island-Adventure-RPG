import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { requireArt, missingArt } from '../src/adapter/asset-manifest';
import { AUDIO, EFFECTS, neededAudio, soundLookup, soundPath } from '../src/adapter/audio-manifest';
import type { AudioManifest } from '../src/adapter/audio-manifest';
import { gameContent } from '../src/content';
import { recordOnDisk } from './licence-record';

// The sounds of the game are found by name, and the game refuses to start while a name has no entry in the audio
// manifest. This is the manifest check of ADR 0002, and the files on disk behind it, which ADR 0005 allows: that each sound
// the manifest points at is a file of the right format in public/audio, that nothing is shipped that the manifest does not
// name, that every shipped file is in the asset licence record, and that none comes from the voice acting of the pack,
// which the game does not have. It is an on-disk check, like the ones of final-art.test.ts. How the sounds sound, and
// whether they are the right ones, is for a play check: nothing here can listen.

const AUDIO_FOLDER = fileURLToPath(new URL('../public/audio/', import.meta.url));

/** Every file under public/audio, by its path from there, with forward slashes: `music/boat.ogg`. */
function shippedFiles(): string[] {
  return readdirSync(AUDIO_FOLDER, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `${entry.parentPath.slice(AUDIO_FOLDER.length).replaceAll('\\', '/')}/${entry.name}`.replace(/^\//, ''))
    .sort();
}

const withoutSound = (name: string): AudioManifest =>
  Object.fromEntries(Object.entries(AUDIO).filter(([key]) => key !== name));

const sounds = Object.entries(AUDIO);

describe('the audio that the shipped content needs', () => {
  it('is in the audio manifest, every sound of it', () => {
    expect(missingArt(neededAudio(gameContent), soundLookup(AUDIO))).toEqual([]);
  });

  it('is the title, the music of every area, the fight and the ending, and every effect, and no more', () => {
    const expected = [
      'music-title',
      ...gameContent.areas.map((area) => `music-area-${area.id}`),
      'music-fight',
      'music-ending',
      ...EFFECTS.map((effect) => `sfx-${effect}`),
    ];

    expect(gameContent.areas.length).toBeGreaterThan(1);
    expect(neededAudio(gameContent).sort()).toEqual(expected.sort());
  });

  it.each(neededAudio(gameContent))(
    'stops the game from starting, naming it, when the sound %s is missing',
    (name) => {
      const manifest = soundLookup(withoutSound(name));

      expect(missingArt(neededAudio(gameContent), manifest)).toEqual([name]);
      expect(() => requireArt(neededAudio(gameContent), manifest, 'The content needs sounds that the audio manifest lacks')).toThrow(
        `The content needs sounds that the audio manifest lacks: "${name}"`,
      );
    },
  );

  it('asks for the music of an area that is added, which the manifest has none of, instead of leaving it silent', () => {
    const [first] = gameContent.areas;
    if (!first) throw new Error('the shipped content has no area to copy');
    const content = { ...gameContent, areas: [...gameContent.areas, { ...first, id: 'an-area-nobody-scored' }] };

    expect(missingArt(neededAudio(content), soundLookup(AUDIO))).toEqual(['music-area-an-area-nobody-scored']);
  });
});

describe('the sounds of the manifest on disk', () => {
  it('are music and effects, in numbers that a game has', () => {
    expect(sounds.filter(([, entry]) => entry.kind === 'music').length).toBeGreaterThanOrEqual(7);
    expect(sounds.filter(([, entry]) => entry.kind === 'effect').length).toBeGreaterThanOrEqual(10);
  });

  it.each(sounds)('%s has its file in public/audio, in the format of its kind', (name, entry) => {
    const bytes = readFileSync(new URL(`../public/audio/${soundPath(entry)}`, import.meta.url));

    expect(bytes.length, `the size of ${soundPath(entry)}`).toBeGreaterThan(1000);
    if (entry.kind === 'music') {
      expect(entry.file.endsWith('.ogg'), `the file name of ${name}`).toBe(true);
      expect(bytes.subarray(0, 4).toString('latin1'), `the signature of ${entry.file}`).toBe('OggS');
    } else {
      expect(entry.file.endsWith('.wav'), `the file name of ${name}`).toBe(true);
      expect(bytes.subarray(0, 4).toString('latin1'), `the signature of ${entry.file}`).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString('latin1'), `the format of ${entry.file}`).toBe('WAVE');
    }
  });

  it('give every sound a base volume above 0 and at most 1', () => {
    for (const [name, entry] of sounds) {
      expect(entry.volume > 0 && entry.volume <= 1, `the volume of ${name}`).toBe(true);
    }
  });
});

describe('the files under public/audio', () => {
  it('are the files of the manifest, and nothing else is shipped', () => {
    expect(shippedFiles()).toEqual([...new Set(sounds.map(([, entry]) => soundPath(entry)))].sort());
  });

  it.each(shippedFiles())('include %s, which the asset licence record names', (path) => {
    expect(recordOnDisk()).toContain(`\`${path.replaceAll('/', '\\')}\``);
  });

  it('are none of them from the voice acting of the pack, which the game has none of', () => {
    expect(shippedFiles().filter((path) => /voice/i.test(path))).toEqual([]);
    expect(sounds.filter(([name, entry]) => /voice/i.test(`${name} ${entry.file}`))).toEqual([]);
  });
});
