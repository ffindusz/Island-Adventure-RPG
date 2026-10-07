# Island Adventure

A short top-down action RPG for desktop browsers, built with Phaser: a castaway crosses an island to sail home. The plan is in `.scratch/island-adventure-rpg/spec.md`, the vocabulary in `GLOSSARY.md`, and the decisions in `docs/adr/`.

## Run it

You need Node.js and npm. Install once with `npm install`; the dependency versions are pinned exactly.

| Command             | What it does                                                                     |
| ------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`       | Starts the Vite dev server with hot reload. Open the URL it prints.              |
| `npm run build`     | Builds plain static files into `dist/`. Any static host will do; there is no server. |
| `npm run preview`   | Serves the `dist/` build locally.                                                |
| `npm run typecheck` | Type-checks twice: the core-only config first, then the whole project.           |
| `npm test`          | Runs the Game core tests with Vitest. No browser is needed.                      |
| `npm run check`     | Typecheck, then test, then build. It must pass before any change is merged.      |

On Windows PowerShell, `npm` and `npx` can be blocked by the execution policy: use `npm.cmd` and `npx.cmd`.

## Controls

| Key                    | Action                                                                          |
| ---------------------- | ------------------------------------------------------------------------------- |
| W A S D or arrow keys  | Walk. The hero faces the direction pressed last.                                |
| Space                  | Strike with the sword in the facing direction. One swing per press, then a short cooldown. |

## Project layout

```
src/
  core/      The Game core: every gameplay rule, headless. Its public face is core/index.ts.
  content/   The game's content as plain data: terrain, hero, monsters, areas.
  adapter/   The Phaser adapter: keys to commands, the fixed-step loop, drawing. It holds no rules.
  main.ts    The composition root: builds the Game core from the content and starts the adapter.
tests/       Vitest tests of the Game core's interface, and fixtures.ts, a tiny arena to test in.
docs/adr/    Decision records.
```

Dependencies point one way: `main.ts` uses the adapter, the content and the core; the adapter uses the core; the content imports only types from the core; the core imports nothing outside itself. Import the core through `core/index.ts`, never from the files behind it.

## How the tests work

The Game core's interface is the only automated test seam (see `docs/adr/0002-game-core-interface-is-the-test-seam.md`). Commands go in with `send`, time goes in with `step` (one fixed step is 1/60 s), and everything comes out as the return values of those calls, `view()` and `snapshot()`. Tests never look inside the core, never need Phaser, and are deterministic: time moves only when a test steps the game, and the random source is passed in.

- `tests/fixtures.ts` builds a small arena whose numbers can be worked out by hand. Expected values in tests are such hand-worked examples, never the rule run again, and test names use the glossary's words.
- A new rule starts as a failing test that creates a game with `createGame`, sends commands, steps, and asserts on the view, the events or the snapshot. Rules are tested against fixtures, so retuning the real content does not break them.
- `tests/shipped-content.test.ts` checks the real content with generic validity checks only (it loads, the hero can start and walk).
- Not tested automatically: Phaser drawing, key mapping, audio and art. A ticket that touches the adapter has a manual play check instead.

## Keeping the core independent

`tsconfig.core.json` type-checks only `src/core` and `src/content`, with no DOM or Node typings and no way to resolve other modules. A file there that imports Phaser or the adapter, or touches `window`, `document`, `localStorage`, timers, `performance`, `console` or `AudioContext`, fails `npm run typecheck`. Two things the compiler cannot see stay review rules: `Date` and `Math.random` are part of the language, so the core must read no clock and take randomness only from the `random` option; and the content may import only types from the core.

## Conventions

- **Content is data.** Maps, hero numbers and monsters live in `src/content` and are handed to `createGame`, which checks them and refuses anything invalid. The core holds no numbers of its own.
- **Units.** Positions and sizes are in tiles; a body's position is its centre. The adapter's tile size is one constant, `TILE_SIZE` in `src/adapter/config.ts`.
- **State is plain data** that survives `JSON.stringify` and `JSON.parse`. World state is kept per Adventure Area. `snapshot()` and the `continue` command save and restore a game.
- **Events are for presentation** (a swing, a hit, a defeat). The view is the truth; no rule depends on an event being seen.
- **The adapter draws shapes** from the view in `src/adapter/art.ts`. Real art replaces that one module.
- **Looking at the running game.** Open the page with `?debug` in the URL to expose the Game core as `window.gameCore`, for example `gameCore.view()` in the browser console. Nothing in the game uses it.
