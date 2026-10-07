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
| Space                  | Attack with the weapon in hand, in the facing direction: the sword strikes, the bow shoots one arrow. One attack per press, then a short cooldown. |
| Q                      | Take the other weapon in hand, the sword or the bow. It takes no time. It does nothing until a bow is equipped. |
| C                      | Open the stat page: Level, Experience, Health, Attack and Defense.              |
| I                      | Open the inventory: the Gear the hero carries, and which pieces are equipped.   |
| E                      | Interact with what is right in front of the hero: open a chest or a cache.      |
| Up, Down (or W, S)     | In the inventory: move along the list. The hero does not turn.                  |
| Enter                  | In the inventory: equip the piece on the highlighted line.                      |
| Esc                    | Close the open page.                                                            |
| 1, 2, 3 (or keypad)    | At a level-up, put the Stat Point into Health, Attack or Defense. The choice is final. |

The game waits while a page is open, while a level-up choice waits, and while the browser tab or window is not focused.

## Project layout

```
src/
  core/      The Game core: every gameplay rule, headless. Its public face is core/index.ts.
  content/   The game's content as plain data: terrain, hero, monsters, Gear, areas.
  adapter/   The Phaser adapter: keys to commands, the fixed-step loop, drawing, the HUD, the overlay, the inventory cursor
             and the notice (what was found, or that there is no Ammunition). It holds no rules.
  main.ts    The composition root: builds the Game core from the content and starts the adapter.
tests/       Vitest tests of the Game core's interface, and fixtures.ts, a tiny arena to test in.
docs/adr/    Decision records.
```

Dependencies point one way: `main.ts` uses the adapter, the content and the core; the adapter uses the core; the content imports only types from the core; the core imports nothing outside itself. Import the core through `core/index.ts`, never from the files behind it.

## Monsters, damage and defeat

- **Behaviors.** A monster type in `src/content/monsters.ts` names a `behavior` and gives the numbers that behavior needs; several types can share one. The behaviors are a small registry in `src/core/behaviors.ts`: `stationary` stands still, and `chaser` notices the hero, walks up, winds up a telegraphed attack, strikes, and rests before it can wind up again. To add a behavior, follow the three steps at the top of `behaviors.ts` (a definition plus a `loadMonsterType` case in `src/core/content.ts` that checks its numbers, a step function, a registry entry); the compiler refuses one that misses a place.
- **A chaser's numbers** are monster type fields. Distances are in tiles from the monster's body, times are in milliseconds: `damage`, `speedTilesPerSecond`, `noticingDistance`, `reach`, `windUpMs` (at least one fixed step), `recoveryMs`, with `health` and `size`. The attack zone is the square around the body that `reach` describes. It is fixed when the wind-up starts and is in the view (`action` is `winding-up`, with `zone` and `progress`); the damage lands when the wind-up ends, and only if the hero overlaps the zone then. There is no line of sight and no pathfinding: a chaser walks straight at the hero and stops at what is in the way.
- **Hero numbers.** `health` (the maximum) and `defense` in `src/content/hero.ts`; `minimumDamage` (default 1) on the content itself. A hit takes off its damage minus Defense, never less than `minimumDamage`. Health never comes back by itself.
- **Defeat.** At 0 Health the core emits `hero-defeated` in that same step, puts the hero back at the content's start with full Health, and resets the Adventure Area's monsters to full Health at their starting places, defeated ones included. Where the hero returns to is decided in one place, `returnHero` in `src/core/hero-damage.ts`. Arrows in flight are removed too. The hero's Gear, weapon in hand and Ammunition are left as they are, and so are the opened chests and caches. The adapter fades the screen in when it sees the event.
- **HUD.** `src/adapter/hud.ts` draws the hero's Health, the weapon in hand and the Ammunition from the view and nothing else, fixed to the screen. Its digits come from a tiny bitmap font drawn with rectangles, because Phaser's `Text` blurs at this size; the font is `src/adapter/pixel-font.ts`.

## Experience, Levels and Stat Points

- **Experience.** Each monster type has an `experience` value (`src/content/monsters.ts`) that the hero earns every time it defeats one, a monster that a defeat reset included. A milestone is ground in an Adventure Area (`milestones`, in `src/content/areas/`) that gives its `reward` once: the first time the hero's body overlaps its `zone`, a block of whole tiles. That it was reached is kept with the area, so it survives a defeat and a snapshot. The reward is separate from the zone so that later rewards can sit beside Experience.
- **Levels.** `levelThresholds` in `src/content/progression.ts` is the total Experience for Level 2, Level 3 and so on. The highest Level is one more than the number of thresholds, so the five shipped give Level 6, and Experience past the last threshold is not counted. The Level is worked out from the Experience, never stored.
- **Stat Points.** The hero has one for each Level above 1, and `statPointValue` in the same file is what one adds to Health, Attack or Defense. The points not yet assigned are worked out too (the Level less 1, less those assigned), so there can be no more and no fewer than one per Level. A Health point raises the current Health by as much as the maximum. Every stat is worked out in `src/core/stats.ts`: no rule reads a base number from the content, and Gear adds its bonus there too (see below).
- **The numbers are placeholders**, picked so that the first stretch of the shipwreck coast (the gap in the rock wall and one crab) gives a level-up. Tuning them is for a later pass.
- **Events** `experience-gained`, `level-up` (one for each Level reached) and `milestone-reached` are for presentation. The view's `levelUp` is the truth about a choice that waits.

## Pages and the pause

- **A page** is shown over the game, one at a time: the stat page and the inventory now, the Automap later. Which page is open is core state (`page`: a page id, or none), changed by the `open-page` and `close-page` commands; the view's `page` holds what to draw. A snapshot taken with a page open restores it open.
- **To add a page,** add its id to `PAGE_IDS` in `src/core/state.ts`. The compiler then points at what is missing: the page's view in `src/core/interface.ts` and `src/core/view.ts`, its key in `src/adapter/player-input.ts` and its drawing in `src/adapter/overlay.ts`.
- **The pause.** The game waits while a page is open or a Stat Point waits to be assigned (`isPaused` in `src/core/pause.ts`): `step` advances nothing, `attack`, `interact` and `switch-weapon` do nothing, and `open-page` is ignored, so a page is closed before another opens. `move` and `stop` still keep track of the keys that are down, so the hero does not walk on by itself afterwards. They also turn the hero, so the adapter holds back the walking keys while the game waits, and sends the ones that are down when it stops waiting: the arrow keys of a menu do not turn the hero, and a key held through a page walks on when the page closes. The level-up choice cannot be closed. Several at once are asked one after another, the lowest Level first.
- **An unfocused tab** is the adapter's business, not the core's. `FixedStepClock` in `src/adapter/fixed-step.ts` is told every frame whether the player is watching (`document.hasFocus()` and the tab not hidden, read in `play-scene.ts`). While nobody is, it runs no steps and forgets the time that passed, so the game does not rush to catch up.
- **The overlay.** `src/adapter/overlay.ts` draws the level-up choice, the open page and a PAUSED notice from the view, over the dimmed game. Its text uses the bitmap font, which has the capital letters, the digits and a few signs: add a glyph to `pixel-font.ts` before using a new character.

## Gear, the inventory and chests

- **Gear** is content (`src/content/gear.ts`): each piece has an id, a `name`, a `slot` and a `bonus`. A slot raises one stat (`GEAR_SLOT_STAT` in `src/core/definitions.ts`): a melee weapon or a ranged weapon adds to Attack, armor to Defense, and Gear changes nothing else. The hero begins with a basic sword and basic armor (`startingGear` in `src/content/hero.ts`), both with a bonus of 0 so that the base numbers stand. The two shipped upgrades, +1 each, are placeholders for the tuning pass.
- **Carrying and equipping.** The hero carries every piece it finds, with no limit, and has one equipped in each slot. Each piece exists once: the content is refused if two chests, or a chest and the starting Gear, hold the same piece. There is no unequip, only a swap for another piece of the same slot. `src/core/stats.ts` adds the bonuses of the equipped pieces to Attack and Defense after the Stat Points, so the stat page, the damage of an attack and the damage the hero takes all follow. A weapon's bonus counts only for the attacks made with it, the sword's for strikes and the bow's for arrows, so the stat page and the inventory show the Attack of the weapon in hand.
- **To add a slot** (a helmet, say), add it to `GEAR_SLOTS` and to `GEAR_SLOT_STAT` in `src/core/definitions.ts`; the compiler refuses a slot that is missing from the map. A slot that holds a weapon is a `WEAPON_SLOTS` entry too, and `heroAttacks` and `switchWeapon` in `src/core/weapons.ts` then say how it attacks and how it is taken in hand.
- **The inventory** is a page, `inventory`. Its view lists the carried Gear, by slot and then in the order found, each with whether it is equipped, the Attack and Defense totals, and how many of each consumable the hero has (the Ammunition). The `equip` command takes a piece's id and works only while the inventory is open; it does nothing for a piece the hero does not carry or already has equipped. Choosing the piece is the adapter's job: `src/adapter/inventory-menu.ts` keeps the cursor (Up and Down, or W and S, without wrapping; five lines show at a time), Enter sends `equip` for the line it is on, and Esc closes the page.
- **Chests** are interactables: things in an Adventure Area that the hero acts on with E (the `interact` command), listed in the area's `interactables` (`src/content/areas/shipwreck-coast.ts`). A chest has an id, a tile and its contents, a tagged union: `{ kind: 'gear', gear: <id> }`, or `{ kind: 'consumable', consumable: <id>, amount: <n> }` for a cache (see below). Interact acts on the nearest interactable in the ground right in front of the hero, as far as `interactionReach` (`src/content/hero.ts`) and as wide as the hero's body; when two are as near, the one listed first. It does nothing while the game waits. A chest opens once: the hero picks up what is inside, and the core emits `chest-opened` and `pickup`. That a chest was opened is kept per Adventure Area in the state, so it survives a snapshot and a defeat. Chests are solid, opened or not.
- **To add a kind of interactable** (a lever or a sign, say), follow the steps at the top of `src/core/interactables.ts`: a definition, a state, a function that says what it does, and an entry in the `INTERACTIONS` registry. The compiler refuses a kind that is missing from the registry or from the views.
- **The notice.** The adapter shows one notice at a time for a few seconds (`src/adapter/notice.ts`), the latest of two: a `pickup` (what was found, what it adds, and a hint to press I) and `out-of-ammunition` (see below). A page or a Stat Point that opens covers it and ends it. A new kind of find needs its lines in `pickupLines` there. Chests and caches are drawn by `drawInteractable` in `src/adapter/art.ts`.

## The bow, Ammunition and drops

- **Two weapons, one in hand.** The sword is in the melee weapon slot and a bow, once found and equipped, in the ranged weapon slot. The weapon in hand (`activeWeapon`, one of those two slots, in the hero's view) starts as the sword. Q sends `switch-weapon`: the sword to the bow and back. The bow can be taken in hand only while one is equipped, and the sword is always there to go back to. Switching takes no time, leaves the cooldown alone and does nothing while the game waits; equipping a bow does not take it in hand. `attack` goes through `heroAttacks` in `src/core/weapons.ts`: a strike with the sword, a shot with the bow. Both wait for the same attack cooldown and start it, and nothing is spent but the Ammunition.
- **A shot** costs one Ammunition and sends an arrow from the hero's centre in the direction it faces (`hero-shot`). With none left nothing is shot and the cooldown does not start: the core emits `out-of-ammunition` (once the cooldown is over), and the adapter's notice says so and hints at Q. The numbers are `rangedWeapon` in `src/content/hero.ts`: `arrowSpeedTilesPerSecond`, `range` (the tiles an arrow flies before it is gone) and `arrowSize`, at most the hero's size.
- **Arrows** are state: each has its Adventure Area, position, direction and the range it has left, and the view's `arrows` gives the position, direction and size to draw. `flyArrows` in `src/core/arrows.ts` moves them each fixed step, after the hero walks and before the monsters act. An arrow hurts the first living monster it reaches (a monster that walks into one is hit too) and is gone; solid terrain and chests stop it, and so does a spent range. The damage is the Attack of the bow (base, Stat Points and the bow's bonus), worked out when the arrow arrives. Arrows wait while the game waits, fly only in the Adventure Area they were shot in, and a defeat removes them.
- **Ammunition is a consumable.** The hero's `consumables` count each kind (`CONSUMABLE_IDS` in `src/core/definitions.ts`: there is one, `ammunition`, and the hero starts with none), and `grantConsumable` in `src/core/consumables.ts` is the one way to give some. To add a kind, add its id there and follow the compiler to its starting count (`src/core/state.ts`) and its name (`src/adapter/labels.ts`).
- **Caches.** A cache is a chest whose contents are a consumable, `{ kind: 'consumable', consumable: 'ammunition', amount: 6 }`. It opens once like any chest, and the hero takes the amount (`pickup`). The chest in the view says what it holds (`holds`: `'gear'` or the consumable's id), which is how the adapter draws a crate of arrows. The shipwreck coast has a bow chest and an arrow cache of six, in the column two tiles right of the start, one up and one down.
- **Drops.** A monster type can have a `drops` table (`src/content/monsters.ts`), a list of `{ consumable, chance, amount }` with `chance` from 0 to 1. When the hero defeats a monster, with a strike or an arrow alike, `rollDrops` in `src/core/drops.ts` rolls each entry once, in order, with the game's `random` option, which the rules use for nothing else. An entry drops when its roll is below its `chance` (so 0 never drops and 1 always does), and the roll is made whatever the chance is, so retuning one does not shift the rolls after it. What drops goes straight into the hero's count, with a `pickup` event: nothing lies on the ground. A type without a table asks for no roll. The crab leaves 2 arrows one time in four, a placeholder for the tuning pass.

## How the tests work

The Game core's interface is the only automated test seam (see `docs/adr/0002-game-core-interface-is-the-test-seam.md`). Commands go in with `send`, time goes in with `step` (one fixed step is 1/60 s), and everything comes out as the return values of those calls, `view()` and `snapshot()`. Tests never look inside the core, never need Phaser, and are deterministic: time moves only when a test steps the game, and the random source is passed in.

- `tests/fixtures.ts` builds a small arena whose numbers can be worked out by hand. Expected values in tests are such hand-worked examples, never the rule run again, and test names use the glossary's words. For the bow it has `WITH_BOW` (starting Gear with a bow) and `cacheAt`; for drops `newGame` takes the random source, and `scriptedRandom` (fails if the game asks for a value nobody scripted) and `seededRandom` make one, while the default `fixedRandom` always says 0.5.
- A new rule starts as a failing test that creates a game with `createGame`, sends commands, steps, and asserts on the view, the events or the snapshot. Rules are tested against fixtures, so retuning the real content does not break them.
- `tests/shipped-content.test.ts` checks the real content with generic validity checks only (it loads, the hero can start and walk, there are six Levels, no monster can hurt a hero who stays at the start, the hero starts with Gear and finds better in two chests close by, and a bow chest and an arrow cache are within a short walk while some monster type can drop Ammunition).
- Not tested automatically: Phaser drawing, key mapping, the inventory cursor, the pause on an unfocused tab, audio and art. A ticket that touches the adapter has a manual play check instead.

## Keeping the core independent

`tsconfig.core.json` type-checks only `src/core` and `src/content`, with no DOM or Node typings and no way to resolve other modules. A file there that imports Phaser or the adapter, or touches `window`, `document`, `localStorage`, timers, `performance`, `console` or `AudioContext`, fails `npm run typecheck`. Two things the compiler cannot see stay review rules: `Date` and `Math.random` are part of the language, so the core must read no clock and take randomness only from the `random` option; and the content may import only types from the core.

## Conventions

- **Content is data.** Maps, hero numbers, monsters and Gear live in `src/content` and are handed to `createGame`, which checks them and refuses anything invalid. The core holds no numbers of its own.
- **Units.** Positions and sizes are in tiles; a body's position is its centre. The adapter's tile size is one constant, `TILE_SIZE` in `src/adapter/config.ts`.
- **State is plain data** that survives `JSON.stringify` and `JSON.parse`. World state is kept per Adventure Area. `snapshot()` and the `continue` command save and restore a game.
- **Events are for presentation** (a swing, a hit, a defeat). The view is the truth; no rule depends on an event being seen.
- **The adapter draws shapes** from the view in `src/adapter/art.ts`. Real art replaces that one module.
- **Looking at the running game.** Open the page with `?debug` in the URL to expose the Game core as `window.gameCore`, for example `gameCore.view()` in the browser console. Nothing in the game uses it.
