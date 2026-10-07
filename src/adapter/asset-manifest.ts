// The asset manifest: every picture the adapter can show is registered here by name, and everything else (content,
// scenes) asks for pictures by those names only. The check for a picture that is needed but not registered is a pure
// function, so that it can be tested without Phaser, files or a browser; the Phaser side lives in asset-loader.ts.

export type ArtEntry =
  | { readonly kind: 'image'; readonly file: string }
  | { readonly kind: 'sheet'; readonly file: string; readonly frameWidth: number; readonly frameHeight: number };

export type ArtManifest = Readonly<Record<string, ArtEntry>>;

/** A single picture, loaded from a file under `public/art/`. */
export function image(file: string): ArtEntry {
  return { kind: 'image', file };
}

/** A grid of equal frames in one file; the frames are numbered row by row, starting at 0. */
export function sheet(file: string, frameWidth: number, frameHeight: number = frameWidth): ArtEntry {
  return { kind: 'sheet', file, frameWidth, frameHeight };
}

/**
 * Anything that can say whether a picture is there. The manifest answers "is it registered?" and Phaser's texture
 * manager answers "is it loaded?", through the same small question.
 */
export interface ArtLookup {
  exists(name: string): boolean;
}

export function manifestLookup(manifest: ArtManifest): ArtLookup {
  return { exists: (name) => Object.hasOwn(manifest, name) };
}

/** The needed names that the lookup does not have, each once, in the order they were asked for. */
export function missingArt(needed: Iterable<string>, lookup: ArtLookup): string[] {
  return [...new Set(needed)].filter((name) => !lookup.exists(name));
}

/** Throws an Error that names every picture that is missing, so that a missing picture never shows up as a blank. */
export function requireArt(needed: Iterable<string>, lookup: ArtLookup, what: string): void {
  const missing = missingArt(needed, lookup);
  if (missing.length === 0) return;
  throw new Error(`${what}: ${missing.map((name) => `"${name}"`).join(', ')}`);
}
