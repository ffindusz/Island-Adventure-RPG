# 01: Tracer bullet: the hero walks and strikes a monster

**What to build:** The thinnest possible end-to-end version of the game, running in a desktop browser. In one small placeholder Adventure Area (it later grows into the shipwreck coast), the hero moves with WASD or the arrow keys, faces the direction last moved, is blocked by solid terrain, and strikes a stationary monster in front of them with Space, subject to an attack cooldown, until the monster is defeated. All rules live in a headless Game core; the Phaser adapter only maps keys to commands, steps the Game core in fixed time steps, and draws its state with placeholder art (simple shapes). This ticket also establishes the project, the Game core's interface, the data-driven content definitions, and the testing pattern every later ticket follows. Keep it thin: one area, one monster, one weapon.

**Blocked by:** None (can start immediately)

**Status:** resolved

**Spec stories:** 1, 21-23, 30-32, 36, 102-104, 107

- [x] The project installs, type-checks, builds, and runs in a desktop browser with no server component; a production build produces static files that run from any static host. (Recommended tooling: TypeScript, Vite, and Vitest. Confirm or substitute, and record the choice.)
- [x] The hero moves in four directions with WASD or the arrow keys, faces the last direction moved, and cannot move through solid terrain.
- [x] Space strikes the monster directly in front of the hero and nothing behind or beside; a cooldown prevents an immediate second strike; the monster is defeated after enough hits and disappears.
- [x] The Game core has no dependency on Phaser, the clock, storage, rendering, or audio. Time arrives in fixed steps, randomness arrives through an injectable source, and the map, monster, and hero are supplied as content data.
- [x] The Game core's interface accepts player commands and fixed time steps, and exposes an observable state view, an event stream, and a serializable snapshot. Its state is plain data so later tickets can save and restore it, and world state is kept per Adventure Area from the start.
- [x] Tile size is a single configurable value (working assumption: 16 pixels, pending ticket 02) and the canvas scales with crisp pixels.
- [x] Tests at the Game core's interface use fixed steps and hand-worked expected values, and cover movement, facing, collision, hit direction and range, cooldown, and defeat. They run headlessly and pass.
- [x] A decision record states that the Game core's interface is the single automated test seam, and why. (The spec proposed this seam; the user has not yet confirmed it.)
- [ ] Reviewer play check (manual, in a browser): start the dev server, walk to the monster, strike it until it is defeated, and confirm that walls block the hero.

## Comments

Resolved on integration/island-adventure-rpg at 1a83fb0

### What was built

- A TypeScript, Vite and Vitest project on Phaser 4.2.1. Every version is pinned exactly and the lockfile is committed. `npm.cmd run check` runs the type check, the tests and the production build, which is static files with relative paths (ADR 0003).
- The Game core in `src\core`: `createGame({ content, random })` returns `{ send, step, view, snapshot }`. Time is fixed steps of 1/60 s. State is plain data, kept per Adventure Area. Commands: `new-game`, `continue`, `move`, `stop`, `attack`. Events: `hero-attacked`, `monster-hit`, `monster-defeated`.
- The content as data in `src\content`: the hero with a basic sword, a crab, the terrain legend, and one placeholder Adventure Area (`shipwreck-coast`, 20 by 12 tiles, a rock wall with a two-tile gap, one crab). The Game core refuses bad content when it loads it.
- A thin Phaser adapter in `src\adapter`: keys to commands, a fixed-step clock, and placeholder shapes. `art.ts` is the only file that decides how things look.
- 54 tests in 6 files at the Game core's interface (ADR 0002), and a core-only type check (`tsconfig.core.json`, no DOM lib) that keeps Phaser, the DOM, storage, clocks and audio out of `src\core` and `src\content`.

### Decisions and defaults

- No conflict between the ticket and the spec. The one stale note is that the seam is "not yet confirmed": the user confirmed it on 2026-10-06. ADR 0002 records the seam and its three thin-boundary exceptions (tickets 11, 21, 22). ADR 0003 records the stack.
- Stack: Phaser 4.2.1, TypeScript 7.0.2 (the native compiler), Vite 8.3.3, Vitest 5.0.3, with `save-exact` in `.npmrc`.
- Positions are in tile units, and an entity's position is the centre of its body. The hero's body is 0.75 tile and it walks at 5 tiles a second. The crab's body is also 0.75 tile.
- Movement is in four directions only, and the latest key pressed wins. Water, rock and monsters stop the hero flush against them.
- A strike covers a box in front of the hero's body, 0.75 tile deep (the sword's reach) and 1 tile wide. It hits every living monster overlapping the box, and nothing behind or beside. A swing at nothing still starts the attack cooldown (400 ms, 24 steps). An attack refused by the cooldown returns no events. The hero's Attack is 1 and the crab's Health is 3.
- Space strikes once per press; holding it does not repeat. WASD and the arrow keys both work.
- The adapter starts straight into play by sending `new-game`. The title screen is ticket 11's.
- There is no pause on losing focus: ticket 04 owns it. The adapter polls the keys every frame, so they release on blur and nothing sticks.
- One tile size constant, `TILE_SIZE = 16` in `src\adapter\config.ts` (pending ticket 02). The canvas is a fixed 20 by 12 tiles (320 by 192), scaled by the largest whole-number zoom that fits the window, with `image-rendering: pixelated`.
- The placeholder art is plain shapes, as the ticket says. Real art arrives with tickets 22 to 25.
- Content loading also refuses ragged layouts, duplicate ids, and a start or a monster placed on solid terrain or off the map.
- `snapshot()` returns `{ version: 1, state }` and throws at the title. `continue` takes a snapshot without validating it; parsing saved data is ticket 11's thin-boundary exception.
- The `random` source is injectable, but no rule uses it yet; monster drops will be the first.
- `?debug` in the address exposes `window.gameCore` so the smoke tool can read the state. It is in the README, and ticket 26 can remove it.
- The tests assert nothing about other areas' saved state yet, because the hero cannot travel between areas yet.

### How to run it

- `npm.cmd install`, then `npm.cmd run dev`, and open the address it prints. Walk with WASD or the arrow keys and strike with Space. From the start, walking right goes through the gap in the rock wall to the crab.
- `npm.cmd run check` is the gate (type check, tests, build). `npm.cmd test` runs only the tests. `npm.cmd run build` then `npm.cmd run preview` serves the production build.
- Add `?debug` to the address to get `window.gameCore` in the browser console.

### How it was verified

- `npm.cmd run check`: type check exit 0, 54 of 54 tests, build OK. `npm.cmd ci --dry-run`: exit 0.
- Boot smoke with the shared headless-Edge tool, on the dev server, on `vite preview`, and on `dist` served from a sub-path by a plain static server: a 320 by 192 WebGL canvas, 0 console errors, and no failed request other than the browser's `/favicon.ico` 404.
- Real key presses in headless Edge, read back through `window.gameCore`: the arrow keys and WASD walk and turn the hero; water and the rock wall stop it flush; one Space press takes the crab from Health 3 to 2; three strikes remove it. The screenshots matched the state.
- The core boundary: a throwaway probe file showed that `tsc -p tsconfig.core.json` rejects imports of Phaser or the adapter, and uses of `window`, `document`, `localStorage`, timers, `performance`, `AudioContext` and `console`. The probe was deleted.

### Left for manual review

- The reviewer play check (the last criterion) stays unticked: it needs a person in a real desktop browser. The runs above were scripted.
- Not checked at all: what happens when the tab is hidden (ticket 04), judder on displays above 60 Hz (the adapter does not interpolate), and crispness at fractional display scaling such as Windows at 125% (tested at a device pixel ratio of 1 only).

### Follow-ups

- The core type check cannot catch `Date` or `Math.random`, because they are language built-ins; a search shows the core uses neither. That the core must not import `src\content` is a convention in the README, not enforced.
- The canvas is a fixed 20 by 12 tiles, so an area larger than that needs a camera.
- There is no favicon, so browsers log a harmless 404.
- Glossary terms missing: hero, monster, strike and strike zone, attack cooldown, Game core, content definition. Health is defined for the hero only.
