# Test the adapter's pure functions and the shipped files beside the seam, and never stand in for Phaser

Status: proposed in the code-review fix pass; the user may veto it, in which case the tests it covers are dropped.

Beside the three boundaries of ADR 0002, tests may (a) call the adapter's pure functions directly, the ones in modules that import Phaser only as a type, with values worked out by hand; (b) read the files the game ships from disk, where the code depends on a property of them (the size and frames of a sheet that the manifest relies on, the licence record against the files that ship, the credits against the record, the audio files against their manifest), and read `docs/balance.md` to hold each table that the balance tests print to the document, line for line, so that a tuning that outdates one turns a test red; and never to judge taste, so the words of a document are not compared; and (c) never replace the Phaser module: code that needs a part of Phaser (its keys, the rectangles it draws with) reads it through a small interface that its own module declares, which a test fills with plain objects. What only a browser can show (Phaser drawing, the wiring of the scenes, the sound playing, how the art looks and how the sounds sound) is still not tested, so for that part ADR 0002's cost and ADR 0003's safety net (the compiler and Phaser's type definitions) stand, and each ticket that touches it carries a manual play check.

## The tests it covers

They are found by command and not named in a list, since a list kept by hand fell behind the tests.

(a) The adapter's pure functions: `git grep -l "src/adapter/" -- "tests/*.test.ts"` lists the tests that import a module of `src/adapter/`, and the same over `"tests/*.ts"` adds the helpers that tests share, through which a test may reach the adapter (`tests/drawn-text.ts` is one). The tests of the shipped content that read the adapter's screen size, colours, text drawing, card layout or room for a name are of this kind too.

(b) The files read from disk: `git grep -lE "from '(node:)?fs" -- tests` lists the tests and helpers that read them, and a test that imports one of those helpers reads through it. Among the helpers are `tests/pictures.ts` for the pictures of `public/art/`, `tests/licence-record.ts` for the licence record and `tests/balance-doc.ts` for `docs/balance.md`.

(c) Phaser's parts behind an interface: a test fills the `Keyboard` and `KeyState` interfaces of `src/adapter/player-input.ts` with plain objects; it fills the `PressSource` interface of `src/adapter/area-text-dismissal.ts` with a plain object that keeps the listeners and tells of each press by hand, in place of Phaser's keyboard plugin; it gives `checkAudioKeys` (`src/adapter/controls.ts`) a plain function in place of Phaser's table of key codes; and it records the rectangles of a text through the `Graphics` interface of `src/adapter/pixel-font.ts` (`tests/drawn-text.ts`). No test calls `vi.mock('phaser')`: `git grep "vi.mock" -- tests` shows every mock there is, and none is of Phaser.

The three boundaries of ADR 0002 are tested as before: the saved game and its store, the settings and the asset manifest's missing-picture check.
