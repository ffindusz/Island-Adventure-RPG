import { describe, expect, it } from 'vitest';
import {
  image,
  manifestLookup,
  missingArt,
  requireArt,
  sheet,
  type ArtLookup,
  type ArtManifest,
} from '../src/adapter/asset-manifest';

// The asset manifest is the adapter's list of every picture the game can show, registered by name. Which of the
// pictures the game needs are missing is a pure question, so it is answered here with in-memory fakes: a plain object
// for the manifest, no Phaser, no files and no browser.

const MANIFEST: ArtManifest = {
  hero: sheet('hero.png', 16),
  'hud-panel': image('hud-panel.png'),
};

describe('the asset manifest', () => {
  it('reports the needed pictures that it does not list', () => {
    const missing = missingArt(['hero', 'arrow', 'hud-panel', 'potion'], manifestLookup(MANIFEST));

    expect(missing).toEqual(['arrow', 'potion']);
  });

  it('reports a missing picture once, however often it is needed, in the order it was first asked for', () => {
    const missing = missingArt(['potion', 'hero', 'arrow', 'potion', 'arrow'], manifestLookup(MANIFEST));

    expect(missing).toEqual(['potion', 'arrow']);
  });

  it('fails loudly, naming every missing picture, instead of carrying on without it', () => {
    const needed = ['hero', 'arrow', 'hud-panel', 'potion'];

    expect(() => requireArt(needed, manifestLookup(MANIFEST), 'The game needs art that is not registered')).toThrow(
      'The game needs art that is not registered: "arrow", "potion"',
    );
  });

  it('carries on quietly when nothing is missing', () => {
    expect(() => requireArt(['hero', 'hud-panel', 'hero'], manifestLookup(MANIFEST), 'Missing art')).not.toThrow();
    expect(() => requireArt([], manifestLookup(MANIFEST), 'Missing art')).not.toThrow();
  });

  it('asks the same question of the loaded textures, so that a file that failed to load is caught as well', () => {
    const loaded = new Set(['hero']);
    const textures: ArtLookup = { exists: (name) => loaded.has(name) };

    expect(missingArt(Object.keys(MANIFEST), textures)).toEqual(['hud-panel']);
    expect(() => requireArt(Object.keys(MANIFEST), textures, 'Art did not load')).toThrow('Art did not load: "hud-panel"');
  });

  it.each(['toString', 'constructor', '__proto__'])('does not take the inherited property "%s" for a registered picture', (name) => {
    expect(missingArt([name], manifestLookup(MANIFEST))).toEqual([name]);
  });
});
