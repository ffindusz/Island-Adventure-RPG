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
  adapter/   The Phaser adapter: keys to commands, the fixed-step loop, drawing, the HUD. It holds no rules.
  main.ts    The composition root: builds the Game core from the content and starts the adapter.
tests/       Vitest tests of the Game core's interface, and fixtures.ts, a tiny arena to test in.
docs/adr/    Decision records.
```

Dependencies point one way: `main.ts` uses the adapter, the content and the core; the adapter uses the core; the content imports only types from the core; the core imports nothing outside itself. Import the core through `core/index.ts`, never from the files behind it.

## Monsters, damage and defeat

- **Behaviors.** A monster type in `src/content/monsters.ts` names a `behavior` and gives the numbers that behavior needs; several types can share one. The behaviors are a small registry in `src/core/behaviors.ts`: `stationary` stands still, and `chaser` notices the hero, walks up, winds up a telegraphed attack, strikes, and rests before it can wind up again. To add a behavior, follow the three steps at the top of `behaviors.ts` (a definition plus a `loadMonsterType` case in `src/core/content.ts` that checks its numbers, a step function, a registry entry); the compiler refuses one that misses a place.
- **A chaser's numbers** are monster type fields. Distances are in tiles from the monster's body, times are in milliseconds: `damage`, `speedTilesPerSecond`, `noticingDistance`, `reach`, `windUpMs` (at least one fixed step), `recoveryMs`, with `health` and `size`. The attack zone is the square around the body that `reach` describes. It is fixed when the wind-up starts and is in the view (`action` is `winding-up`, with `zone` and `progress`); the damage lands when the wind-up ends, and only if the hero overlaps the zone then. There is no line of sight and no pathfinding: a chaser walks straight at the hero and stops at what is in the way.
- **Hero numbers.** `health` (the maximum) and `defense` in `src/content/hero.ts`; `minimumDamage` (default 1) on the content itself. A hit takes off its damage minus Defense, never less than `minimumDamage`. Health never comes back by itself.
- **Defeat.** At 0 Health the core emits `hero-defeated` in that same step, puts the hero back at the content's start with full Health, and resets the Adventure Area's monsters to full Health at their starting places, defeated ones included. Where the hero returns to is decided in one place, `returnHero` in `src/core/hero-damage.ts`. The adapter fades the screen in when it sees the event.
- **HUD.** `src/adapter/hud.ts` draws the hero's Health from the view and nothing else, fixed to the screen. Its digits are a tiny bitmap font drawn with rectangles, because Phaser's `Text` blurs at this size.

## How the tests work

The Game core's interface is the only automated test seam (see `docs/adr/0002-game-core-interface-is-the-test-seam.md`). Commands go in with `send`, time goes in with `step` (one fixed step is 1/60 s), and everything comes out as the return values of those calls, `view()` and `snapshot()`. Tests never look inside the core, never need Phaser, and are deterministic: time moves only when a test steps the game, and the random source is passed in.

- `tests/fixtures.ts` builds a small arena whose numbers can be worked out by hand. Expected values in tests are such hand-worked examples, never the rule run again, and test names use the glossary's words.
- A new rule starts as a failing test that creates a game with `createGame`, sends commands, steps, and asserts on the view, the events or the snapshot. Rules are tested against fixtures, so retuning the real content does not break them.
- `tests/shipped-content.test.ts` checks the real content with generic validity checks only (it loads, the hero can start and walk, and no monster can hurt a hero who stays at the start).
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
