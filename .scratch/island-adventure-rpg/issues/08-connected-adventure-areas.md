# 08: Connected Adventure Areas and backtracking

**What to build:** The island is made of separate Adventure Areas, each its own map, joined by visible exits. Walking through an exit moves the hero to the connected area, arriving at the matching entrance, and the hero can go back and forth freely. Each area remembers its state: defeated monsters stay defeated, and opened chests and collected pickups stay collected when the hero backtracks. Entering an area for the first time shows its short area text without interrupting play. Content is validated when it loads.

**Blocked by:** 05: Gear and the inventory

**Status:** ready-for-agent

**Spec stories:** 10, 12, 25, 26, 53, 106

**Added during implementation (2026-10-07):** Neither the spec nor the tickets say that an Adventure Area can be larger than one screen, yet the Automap (ticket 10) reveals terrain as the hero explores and the real coast (ticket 14) needs room. This is the first ticket with more than one area, so it carries the camera. Ticket 01 fixed the canvas at 20 by 12 tiles; keep that unless the camera work shows a reason to change it, and record the reason in your Comments.

- [x] Two connected placeholder Adventure Areas (they later grow into the coast and the woods) demonstrate exits in both directions, with the hero arriving at the matching entrance.
- [x] An Adventure Area can be larger than the canvas: the view follows the hero and stops at the area's edges, so no empty space shows beyond the map, and the HUD stays fixed on the screen. An area smaller than the canvas is shown centered. The Game core's interface does not change for this (the area's size is already in the state view). One of the two placeholder areas is larger than the canvas to show it.
- [ ] Monsters defeated, and chests, Ammunition caches, and potion pickups collected, in an area stay that way after leaving and returning.
- [x] A short area text (content data) appears on first entry only and does not pause or block play.
- [x] The set of areas and their connections is data-driven: adding an area to the route needs only content.
- [x] Content validation runs when content loads and rejects, with a clear message, an exit that leads nowhere or lacks a matching return exit, and an area without an entrance. Later tickets add more rules.
- [x] Tests at the Game core's interface cover transitions and arrival positions, state memory in both areas, area text appearing once, and each validation failure.
- [ ] Reviewer play check (manual, in a browser): defeat a monster, open a chest, leave through the exit, come back, and confirm both are still done. Walk to the edges of the larger area and confirm the view stops at them while the HUD stays put.

## Comments

### What was built

- Exits and entrances in the core (`src\core\areas.ts`, `connections.ts`). An Adventure Area lists its `entrances` (an id and a tile) and its `exits` (an id, a zone of whole tiles and `to: { area, entrance }`). When the hero's body overlaps an exit it arrives, centred, at the entrance that exit leads to; the way back works the same. The state view gained `exits` and `areaText`, and there are two events, `area-changed` and `area-text`.
- Memory, defeat and text. What the hero left stays as it was (monsters defeated or hurt, chests opened): ticket 05's per-area state, now tested across two areas. A defeat sends the hero to the entrance it last came in by and restarts only the monsters of the area where it fell. An area has an optional `text`, shown on the first entry only, timed by the core, and it does not stop the game.
- Validation when content loads (`connections.ts` and `content.ts`): the list is in the decisions below. Snapshots now carry which areas were visited and each area's state.
- Content: the Overgrown Trail (30 by 20, larger than the 20 by 12 canvas) joined to the Shipwreck Coast by one exit each way (the east edge of the coast, the west edge of the trail), with three crabs and a milestone on the trail.
- Adapter: the camera (`src\adapter\camera.ts`, a pure `scrollFor`) follows the hero and stops at the map's edges, and centres an area smaller than the canvas; the exits are drawn as pale patches; the area text is a banner under the HUD (`area-banner.ts`); the screen fades in for 250 ms when the area changes.
- 59 new tests (316 in 22 files, up from 257 in 18): `area-connections` (37, all at the Game core's interface), `shipped-areas` (10, on the real content), `camera` (8) and `area-banner` (4, the wrapping of the text).

### Decisions and defaults

- The canvas stays 20 by 12 tiles, as the ticket asks me to record. The coast is exactly that size and needs no scroll, the camera handles any larger area, and a smaller one is centred with black around it. Nothing in the camera work argued for another size.
- Camera: it follows the hero in whole canvas pixels and is clamped to the map. The HUD, the pages and the banner are fixed to the screen. The Game core's interface has nothing for the camera: `scrollFor` takes the hero's position and the area's size from the view.
- An exit is a zone of whole tiles inside the map, and the hero crosses as soon as its body overlaps it; when it overlaps two at once the first listed takes it. An entrance is a tile, and the hero arrives centred on it with its facing and any held keys unchanged.
- Validation, all at load, with a message that names the area and the id: an area without an entrance; an exit to an unknown area or entrance; an exit whose destination has no exit back to the origin area; an entrance on solid ground or outside the map; an exit zone outside the map or not in whole tiles; an entrance inside an exit of its own area (the hero would be sent straight back); a repeated entrance or exit id; a blank area text; an area text duration under one fixed step. Ids of monsters, milestones and interactables are unique across all areas.
- Defeat: `arrivedAt` in the state is the entrance the hero last came in by, or the start tile at the start of a new game. `returnHero` sends the hero there at full Health and resets only the monsters of the current area (spec story 84). Ticket 09's Checkpoints replace it.
- Leaving calms the monsters of the area: they go idle, and nothing in an area moves while the hero is away. They keep their positions and Health. So a monster that was chasing stands where it was, and if that is near the entrance the hero returns by, it notices the hero at once. I moved the coast's crabs to (12,3) and (12,8) so that none can notice the entrance at (18,5).
- Area text: the core times it. The default is 4 seconds (240 steps); an optional `areaTextMs` in the content sets it for all areas. It waits while a page is open or a Stat Point waits, like the rest of the game. The text of the area the hero starts in comes with the return value of `new-game` and in the first view; the others come as `area-text` events. The adapter shows it in capitals (the pixel font has no lowercase), wrapped to the screen, and hides it while a page or a waiting Stat Point covers the game.
- The first entry is remembered per Adventure Area in the state (`visited`), so a snapshot carries it: a game restored from one does not show the text again, and a text on show runs on.
- The fade is 250 ms when the area changes; a defeat keeps its 500 ms. Exit patches are pale blue-white placeholders.
- The trail's north-west corner (cols 0 to 3 of row 1) is rock. The HUD covers cols 0 to 3 of rows 0 and 1 of the screen, and in a scrolling area the hero could otherwise stand under it. This is a fix in the content, not a rule.
- `SNAPSHOT_VERSION` stays 1: nothing saves a snapshot before ticket 11.

### How to run it

- `npm.cmd run dev`. The hero starts on the coast with its text on show. Hold Right through the gap in the rock wall (two crabs will notice you: defeat them with Space, or run past) to the pale patch on the east edge, which takes you into the Overgrown Trail. Its text shows and you can keep walking; the view follows you and stops at the edges. The pale patch on the trail's west edge, next to where you arrive, takes you back to the coast.
- `?debug` exposes `window.gameCore`. `npm.cmd run check` is the gate.

### How it was verified

- `npm.cmd run check` on the branch before merging the integration tip: typecheck exit 0, 316 of 316 tests in 22 files, build OK. Each core slice was written test-first, with expected values worked by hand.
- Mutation checks, each reverted afterwards: monsters not calmed when the hero leaves (2 tests failed), area text shown on every entry (5), the defeat return place not set on crossing (3), no check for an exit back (1), no clamp at the far edge of the camera (1). When the shipped content was built, an exit on solid tiles made 3 tests fail and a sealed pocket in the trail made the reachability test fail.
- Headless Edge on `vite preview` (port 5108, now stopped), real key presses and in-page checks with the shared smoke tool, screenshots viewed, 0 console errors in every run. The coast fits the canvas with no scroll, with the exit patch on its east edge and the banner YOU WASHED UP ON A STRANGE SHORE at the start. Holding Right through the patch brings the hero into the trail, where the banner reads A TANGLED TRAIL LEADS INTO THE WOODS on two lines while the hero keeps walking.
- At the trail's four corners (by teleport in `?debug`) the view stops at the map's edge with rock at the edge of the screen and no empty space, and the HUD stays put; a live walk with the keys to the north-east corner gave the same view. The stat page over the scrolled trail is fixed and centred, the banner is hidden while it is open and back after Esc.
- A round trip with the keys (open the sword chest, walk out through the east exit, then back): the chest is still open and the text did not show again. A temporary 12 by 8 trail (reverted) showed the small area centred with black around it.

### Left for manual review

- The reviewer play check (the last criterion) stays unticked. In the browser I opened a chest and went there and back, but I did not defeat a monster and return, and I did not play by hand: that defeated monsters stay defeated rests on the core tests.
- The memory criterion (the third) stays unticked because it names Ammunition caches and potion pickups, which do not exist on this branch. Monsters and chests are covered. Caches (ticket 06) and potion pickups (ticket 07) will be interactables, so the per-area state built for chests should hold them; their tickets should each test a trip to another area and back.
- A defeat on the trail was not driven in the browser; the core tests cover where the hero returns and what is reset.
- How the banner, the fade, the exit patches and the camera feel to a person. The art is placeholder until ticket 22.

### Suggestions

- Validate that no chest or monster stands on an entrance, and that the start tile is not inside an exit zone (the hero would be sent away at once).
- Check in the core, for every area, that each exit and entrance can be reached on foot; for now one test does it for the shipped content only.
- Ticket 09: Checkpoints replace `arrivedAt` as the place a defeat returns to.
- A hero larger than one tile (it is 0.75 now) would need an arrival that looks for free ground around the entrance.
- A rule or a check against the HUD covering the hero at a corner of a scrolling area; the trail is fixed by hand.
- Real art for the exits (ticket 22). The adapter only fades in: a finished fade-out stays black in Phaser 4.2.1, so a fade out before the change would need care.
- GLOSSARY.md lacks Exit, Entrance, Area text and camera.
