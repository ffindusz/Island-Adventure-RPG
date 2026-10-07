# 07: Healing Potions

**What to build:** Healing Potions can be found (in chests, as loose pickups the hero walks over, and as occasional monster drops) and are carried as a count. The player uses them from the paused inventory page to restore Health up to the maximum, and the HUD shows the count. There is no passive regeneration, so potions and Checkpoints are the only ways to recover Health.

**Blocked by:** 05: Gear and the inventory

**Status:** ready-for-agent

**Spec stories:** 38, 47, 48

- [x] Potions can be collected from content-defined pickups (once each), from chests, and from seeded monster drops.
- [x] Using a potion from the inventory page restores a tunable amount of Health, capped at maximum Health, and consumes it. It cannot be used at full Health or with none left.
- [x] The HUD and the inventory page show the potion count.
- [x] Health never regenerates on its own (covered by a test).
- [x] Tests at the Game core's interface cover collection, use, the cap, refusal at full Health and with none, and seeded drops.
- [ ] Reviewer play check (manual, in a browser): take damage, open the inventory, use a potion, and confirm the Health and the count.

## Comments

### What was built

- Potions in the core: `healing-potion` is the second consumable (the hero starts with none). The pickup is a new kind of interactable (`pickups.ts`): some of a consumable lying on a tile, taken by walking onto it. The `use-healing-potion` command and the `healing-potion-used` event (`potions.ts`).
- Content: `healingPotion.restores` (validated to be more than 0), a chest of two potions and a loose potion on the shipwreck coast beside the start, and a crab that now and then drops one.
- Adapter: the potion count in the HUD beside the Ammunition; a Healing Potion line on the inventory page that the cursor reaches and Enter uses, with the Health under it; placeholder art for the loose flask and for the potion chest. The README has a new section, "Healing Potions and pickups".
- 37 new tests (399 in 24 files, up from 362 in 22), all at the Game core's interface: new `pickups` and `healing-potions` files, plus two shipped-content checks.

### Decisions and defaults

- **A pickup is a kind of interactable whose trigger is a step** (the choice the brief asked to record). `kind: 'pickup'` joins `InteractableDefinition`, so it gets the loader's checks (unique id across areas, a walkable tile, nothing else there) and its `collected` flag lives in the same per-area `interactables` memory as a chest's `opened`: that is where ticket 08's backtracking promise and ticket 09's rollback look. The registry says Interact does not reach it. `collectPickups` runs in `step()` right after the hero walks and the milestones are reached, takes each untaken pickup the hero's body overlaps and emits the usual `pickup` event through `grantConsumable`. It is not solid, is taken once, and the view lists it only while it lies there. A pickup can hold any consumable.
- Content says what gives consumables: a pickup has a `consumable`, a chest has `contents.kind === 'consumable'`, and the view tells the adapter (`holds`, `consumable`). Ticket 09 can roll those back and leave Gear chests.
- `use-healing-potion` works only while the inventory page is open and the game is being played, like `equip`. It gives back `healingPotion.restores`, never above `heroMaxHealth` (Stat Points count), and uses the potion up even when less than that fits. With none, or at full Health, nothing happens and there is no event. `healing-potion-used` carries the Health `restored` and the `health` now. There is no quick-use key: the spec's default is the inventory page, and a key is optional.
- Choosing the potion (the user's decision, recorded here): the keyboard on the page, like Gear. The cursor runs over the Gear and then one Healing Potion line, and Enter on it uses a potion. The page stays open, so Enter again uses the next one. The "INVENTORY n/N" pager moved into the title and shows only while the cursor is on Gear and there are more than five pieces.
- The inventory page shows the hero's Health: the HUD sits under the dimmed page, so the effect of a potion would not be seen otherwise. The adapter reads it from `view.hero`, and `InventoryPageView` is unchanged. When Enter does nothing (none left, or full Health) the adapter says nothing: the count and the Health line show why, and the rule stays in the core.
- The HUD reserves two digits for each count so the panel keeps its size, and a count of 0 is grey. The panel is about 88 of the 320 pixels. The flask in the HUD is a fixed bitmap, the pickups and crates are drawn from rectangles: placeholders for ticket 22.
- The potion drop is one more entry of the crab's `drops` table, rolled like the arrows (once per defeat, whatever the chance).
- A defeat leaves the potions and the pickups taken as they are, and no test pins that: ticket 09 rolls them back.
- `SNAPSHOT_VERSION` stays 1: nothing is saved before ticket 11. The snapshot carries the potion count and which pickups were taken.
- Placeholders for the tuning pass: 5 Health a potion (half the starting Health, about two crab hits), a chest of 2 (`potion-chest`, tile (2,3), two tiles left of the sword chest), a loose potion of 1 (`beach-potion`, tile (2,7)), a 15% crab drop of 1.
- The ticket and the spec agree, and nothing in the spec's "Details not decided" needed more than the default above.

### How to run it

- `npm.cmd run dev`. Hold Up until the hero stops under the sword chest, hold Left for about 0.4 s to stand under the purple crate with the flask, tap Up and press E (FOUND HEALING POTION +2). Hold Down along that column to the flask on the beach: walking onto it gives +1 (HUD: 3). Then go right through the gap in the rock wall and let a crab hit you. I, Down, Down puts the cursor on the Healing Potion line, Enter uses one (Health up by 5, never above the maximum, the count falls by 1), and Enter again at full Health does nothing. Esc closes the page.
- `?debug` exposes `window.gameCore`. `npm.cmd run check` is the gate.

### How it was verified

- `npm.cmd run check`: typecheck exit 0, 399 of 399 tests in 24 files, build OK. Each core slice was written test-first.
- Mutation checks, each reverted afterwards (tests that failed): a cap that ignores a Stat Point (1); no inventory-page gate (3); no consumption (3); no refusal at full Health (1); no refusal with none (1); regeneration in `step()` (6, among them the "never done by itself" test); the potion id left out of `CONSUMABLE_IDS` (34); a chest of consumables that always gives Ammunition (13); a pickup that is never marked taken (5); a solid pickup (8); a taken pickup still in the view (2).
- Headless Edge on `vite preview` (port 5107, now stopped), real key presses with the shared smoke tool, screenshots viewed, no console errors: the boot HUD (sword, arrow, grey 0, then a pink flask and a grey 0; the purple potion crate and the loose flask on the beach); the chest and the flask open and take with their notices (+2, then +1: HUD 3, the crate drawn dark); a crab hit (7/10), I, Down, Down, Enter: the line is highlighted with the hint UP/DOWN PICK ENTER USE, and Health 10/10 (only the 3 that fitted), potions 2 to 1; two more Enters at full Health change nothing.

### Merging with ticket 08

- Ticket 08 (areas and the camera) was not in integration when this was done (integration tip `2622de3`, 08's branch tip `79689bb`), so this branch does not contain it. The merge is rehearsed, resolved and green on the branch `merge-rehearsal/07-with-08` (this branch plus 08, 465 tests in 28 files, `npm.cmd run check` passing). Merging that branch into integration is clean whichever of the two went in first, so whoever merges second can take it instead of resolving by hand.
- Four files conflict, `README.md`, `src/adapter/art.ts`, `src/adapter/hud.ts` and `src/core/game.ts`. Both sides stay in each: 08's exits art, area text and `HUD_BOTTOM` with this ticket's pickup art, potion slot and `collectPickups`.
- Three things git does not flag, all handled in the rehearsal:
  - `game.ts`: `pickupEvents` must also be in the early return after `crossExits`. Without it a pickup taken on the very step that takes the hero through an exit loses its event.
  - `tests/area-connections.test.ts` reads the caches with `chestViews`. `InteractableView` is now `ChestView | PickupView`, so `cache.holds` stops compiling.
  - The trail's north-west rock (`overgrown-trail.ts`) was placed by hand for 08's HUD, 62 px wide. The potion slot makes it 88 px, so the hero could walk under the HUD at tiles (4,1) to (5,2) (seen in the browser). The rock grows to column 5 on rows 1 and 2, and the HUD then sits over rock; checked in the browser again. A wider or taller HUD needs this checked each time.
- Two tests added there, next to the chest and cache ones: a taken pickup stays taken in either area, and the pickup event is kept on the crossing step. Mutation checks: dropping `pickupEvents` from the early return fails the second, and resetting the taken pickups on entering an area fails the first.

### Left for manual review

- The reviewer play check (the last criterion) stays unticked. The runs above were driven by a script, not by a person: how the flask and the crate read, whether 5 Health a potion feels right, and how the cursor line reads are for the reviewer.
- A crab's potion drop was not seen in the browser (15% a defeat, and the game's random source cannot be set from the page). It rests on the core tests with a seeded source and on the pickup notice the browser showed for the chest and the flask. A defeat with potions in hand was not driven in the browser either.

### Suggestions

- Ticket 09: roll back the potion count together with the collected state of consumable pickups, caches and chests (`AreaState.interactables`, `collected` for pickups and `opened` for chests), and leave Gear chests opened.
- Ticket 08 promises that a collected pickup stays collected when the hero backtracks. The pickup state is per Adventure Area, so it does; the test for it needs 08's areas, so it is in the merge rehearsal (see "Merging with ticket 08") and has to travel with whichever merge comes second.
- The page pauses the game, so a heal flash would be invisible: feedback for a potion used is for the audio ticket (21) or a short message on the page.
- An on-screen E prompt when the hero faces a chest (still none).
- GLOSSARY.md lacks pickup (a consumable lying on a tile that the hero takes by walking onto it), and, as ticket 06 said, cache, drop and consumable.
