# 01: Tracer bullet: the hero walks and strikes a monster

**What to build:** The thinnest possible end-to-end version of the game, running in a desktop browser. In one small placeholder Adventure Area (it later grows into the shipwreck coast), the hero moves with WASD or the arrow keys, faces the direction last moved, is blocked by solid terrain, and strikes a stationary monster in front of them with Space, subject to an attack cooldown, until the monster is defeated. All rules live in a headless Game core; the Phaser adapter only maps keys to commands, steps the Game core in fixed time steps, and draws its state with placeholder art (simple shapes). This ticket also establishes the project, the Game core's interface, the data-driven content definitions, and the testing pattern every later ticket follows. Keep it thin: one area, one monster, one weapon.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Spec stories:** 1, 21-23, 30-32, 36, 102-104, 107

- [ ] The project installs, type-checks, builds, and runs in a desktop browser with no server component; a production build produces static files that run from any static host. (Recommended tooling: TypeScript, Vite, and Vitest. Confirm or substitute, and record the choice.)
- [ ] The hero moves in four directions with WASD or the arrow keys, faces the last direction moved, and cannot move through solid terrain.
- [ ] Space strikes the monster directly in front of the hero and nothing behind or beside; a cooldown prevents an immediate second strike; the monster is defeated after enough hits and disappears.
- [ ] The Game core has no dependency on Phaser, the clock, storage, rendering, or audio. Time arrives in fixed steps, randomness arrives through an injectable source, and the map, monster, and hero are supplied as content data.
- [ ] The Game core's interface accepts player commands and fixed time steps, and exposes an observable state view, an event stream, and a serializable snapshot. Its state is plain data so later tickets can save and restore it, and world state is kept per Adventure Area from the start.
- [ ] Tile size is a single configurable value (working assumption: 16 pixels, pending ticket 02) and the canvas scales with crisp pixels.
- [ ] Tests at the Game core's interface use fixed steps and hand-worked expected values, and cover movement, facing, collision, hit direction and range, cooldown, and defeat. They run headlessly and pass.
- [ ] A decision record states that the Game core's interface is the single automated test seam, and why. (The spec proposed this seam; the user has not yet confirmed it.)
- [ ] Reviewer play check (manual, in a browser): start the dev server, walk to the monster, strike it until it is defeated, and confirm that walls block the hero.
