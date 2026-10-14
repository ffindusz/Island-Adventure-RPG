# 16: The mountain

**What to build:** Turn the stub into the real mountain, and add a minimal stub for the cave so the route stays connected. Mountain raiders hold narrow passes and ledges, one of the few demanding fights lies on the main route, and an armor upgrade waits near it. Art stays placeholder until the art tickets.

**Blocked by:** 15: The woods

**Status:** resolved

**Spec stories:** 9-11, 50, 52, 69

- [x] The mountain has an entrance Checkpoint, an exit back to the woods, and an exit forward to a minimal stub area (entrance, Checkpoint, return exit) that ticket 17 turns into the cave.
- [x] The layout uses solid terrain (cliffs, boulders) for narrow passes and ledges, with at least one optional side path with a reward.
- [x] Mountain raiders use the basic, charger, and ranged behaviors, including at least one tougher variant guarding the main route as a demanding fight.
- [x] An armor upgrade is in a chest on or near the main route, with Ammunition caches and Healing Potions placed so ranged play and recovery stay meaningful.
- [x] The area has one milestone and short area text.
- [x] Experience is tuned (data only) so the hero reaches about Level 4 by the exit on the intended route, without grinding.
- [x] Content validation passes, including that the main route is reachable without puzzles.
- [x] Tests at the Game core's interface load the shipped mountain content and confirm that validation passes, the main route is walkable from entrance to exit without a key or lever, an armor upgrade is reachable on or near that route, and the Experience reachable on the intended route to this exit meets the Level target.
- [x] Reviewer play check (manual, in a browser): climb from the woods, beat the raiders and the tougher variant, collect the armor, and leave through the forward exit.

## Comments

Resolved on integration/island-adventure-rpg at 7386a20

### What was built

- Content: the real mountain, `src/content/areas/mountain.ts` (44 by 30 tiles, so the view follows the hero; 61% of it is rock, solid). The hero comes in at (1, 24), where the Checkpoint `mountain-checkpoint` is, and a trail of sand about 110 steps long climbs east along the lower ledge, north up the cliff, west along a long ledge, north up a shaft one tile wide and east along the summit to the exit forward at (43, 6). The exit back to the woods is the west edge, rows 24 and 25. The area text is one line: "Follow the sand path up. Raiders watch the pass." Two narrow passes lie on the trail: a squeeze two tiles wide just past the way in (columns 11 to 13) and the shaft (rows 9 to 12).
- Raiders, data only in `monsters.ts`: `raider` (chases), `raider-charger`, `raider-archer` (shoots) and `raider-veteran`, the tougher raider (chases; 12 Health against 5 for the others, 3 for the archer, and the hardest hit). On the trail, in order: two raiders, the archer, the charger, and the veteran at the top of the shaft, on every way to the summit. A third raider guards the side path.
- Finds: `mountain-armor-chest` (the new Plate Armor, +2 Defense) in an alcove 3 steps off the trail on the long ledge, before the veteran; the Ammunition caches `mountain-arrow-cache-1` and `mountain-arrow-cache-2` (6 each, 3 and 2 steps off); the Healing Potions on the ground `mountain-potion-1` and `mountain-potion-2`; the milestone `high-gap` (3 Experience) at the neck before the exit, which no way round avoids. The side path is the overlook, a pocket at the east end of the lower ledge, 9 steps off the trail, with a chest of 3 Healing Potions, a chest of 8 Ammunition and its guard.
- The cave stub, `src/content/areas/cave.ts`: 20 by 12, entrance `from-mountain` at (1, 6) with the Checkpoint `cave-checkpoint`, exit `to-mountain` back to the mountain's new entrance `from-cave` at (42, 6), one line of text ("Cold air breathes out of the dark."), no monsters.
- Adapter, placeholder art only: colours for the four raiders in `art.ts`, and the Plate Armor's icon, drawn in code in `drawn-icons.ts` like the other armors' (the pack has no armor icons; `docs/assets/licences.md` says so).
- Tests: `tests/the-mountain.test.ts` (29, new); the Experience helpers of the woods test moved into `tests/routes.ts` and tested there (7 new in `routes.test.ts`); the cave covered in `shipped-areas.test.ts`. README: the mountain, the cave stub, the Gear, the raiders and the new tests.

### Decisions and defaults

- **The raiders are four monster types of their own**, not reuses of the woods' creatures: `raider` 5 Health, 3 Experience; `raider-charger` 5 Health, 4; `raider-archer` 3 Health, 3, and may drop Ammunition; `raider-veteran` 12 Health, 6, hits for 8 (the charger 7, the others 5) and drops a Healing Potion half the time. The tougher variant is a chaser, so the demanding fight asks for Health, Defense and good use of the bow, not a new mechanic.
- **Plate Armor adds +2 Defense** (the Chain Mail of the woods adds 1, the Basic Armor 0), so a hero in it has Defense 3 against 2. A test pins that it adds more than any armor the hero starts with or finds on the coast and in the woods, and that the chest stands before the veteran, so the hero can be in it for the demanding fight. The shipped-content test about better Gear in a chest would pass on the woods' Chain Mail alone, so the mountain's own tests say that its armor chest is near the trail (with no chest at all, all four of them go red).
- **Experience, data only** (the thresholds 10, 25, 45, 70, 100 are as they were): raider 3, charger 4, archer 3, veteran 6, `high-gap` 3. "On the route" means a hero who fights what notices the trail (as in the woods). The mountain gives 22 on its trail (two raiders, charger, archer, veteran, milestone) and 25 with everything (the guard of the side path is 3 more). With the coast (15 on its route, 20 cleared) and the woods (18, 23), the hero leaves the mountain with 55: Level 4 (45) with 10 to spare. A hero who clears all three areas has 68: Level 5 (70) stays out of reach, so nobody has to grind. Two tests pin both ends; every number is a placeholder for ticket 26.
- **The trail is the intended route**, as in the woods: the path of sand that the area text tells the hero to follow. What lies beside it, the side path included, is for the hero who looks.
- **Nothing to pick up in the bottom rows**: the notice of what the hero found is drawn low, over the hero's tile in the last rows (see ticket 15's Comments). The rewards stand above row 27 and a test keeps them there.
- **One Checkpoint, at the way in.** The Checkpoint tests of `shipped-areas.test.ts` expect the view of an area to hold exactly the one it names, and the ticket asks only for the entrance one. A defeat late on the trail sends the hero back to the way in, about 70 steps behind the veteran: see the suggestions.
- **An existing test file changed beyond the cave: `tests/saved-game-walks.test.ts`.** The two seeded walks of "the game as shipped" save and check the whole state 500 times, with what the hero has explored of every area, so they take longer with every area. With the real mountain they went from about 1.1 s to 1.5 s alone, and past the default 5 s beside the other test files. Their timeout is now 30 s (`WALK_TIMEOUT_MS`); nothing else in them changed.
- **The first entrance of the mountain is the way in from the woods** (`from-woods`, then `from-cave`): the saved-game walks start a hero in each area at its first entrance, and a test pins that the trail starts there.

### What moved where

- The mountain stub's 20 by 12 map is gone. Its ids stay: the entrance `from-woods` (now at (1, 24), not (1, 6)), the exit `to-woods` and `mountain-checkpoint`. New: the entrance `from-cave`, the exit `to-cave`, and the area `cave` (registered after the mountain in `src/content/index.ts`).
- `tests/the-woods.test.ts`: `experienceOf`, `noticingOf`, `distanceBetween`, `metOn`, `experienceOfAll` and `milestonesOf` left it for `tests/routes.ts` and take the content as their first argument; its Experience tests call them as before and say the same.
- `tests/shipped-areas.test.ts`: `CAVE`, three tests (the exit to the cave and back, the cave's Checkpoint on arrival) and the Checkpoint test names the cave. Nothing else changed.

### How to run it

- `npm.cmd run dev`, open the URL, Enter on the title, Enter on the opening card. Walk east along the beach and into the woods, follow the sand trail to its exit at the east end, and you are in the mountain. Follow the sand: a squeeze near the way in, a long ledge west with a charger and an archer, the shaft north to the veteran, and the high gap east to the exit into the cave stub. The Plate Armor chest is below the long ledge, a few steps off the trail (Space strikes, E opens, I shows the inventory page, where the Plate Armor is a new row: Down to it and Enter to wear it, Q switches weapons, M shows the Automap, which has four areas now). The side path leaves the trail where it turns north, at the east end of the lower ledge, and ends at two chests and a raider.
- `?debug` exposes `window.gameCore`. To see a place without walking to it, take `gameCore.snapshot()`, patch `state.areaId`, `state.hero.position` (a tile's centre: column + 0.5, row + 0.5) and, past 10 Experience, `statPoints` to match the Level, then `gameCore.send({ type: 'continue', snapshot })`.
- `npx.cmd vitest run tests/the-mountain.test.ts tests/shipped-areas.test.ts tests/routes.test.ts tests/the-woods.test.ts tests/saved-game-walks.test.ts` runs the tests of this ticket; `npm.cmd run check` is the gate.

### How it was verified

- `npm.cmd run check`: typecheck exit 0, 1412 of 1412 tests in 68 files (the base, `82c0d7f`, had 1353 in 67), build OK. Built test-first, one slice at a time (0 to 6), each committed when green. Of the 59 new tests, 39 are written (29 in `the-mountain.test.ts`, 7 in `routes.test.ts`, 3 in `shipped-areas.test.ts`); the other 20 are cases that the `it.each` loops of `saved-game-walks`, `shipped-areas`, `shipped-art`, `shipped-enemies` and `shipped-puzzles` generate for the new area, monster types and Gear.
- Mutation checks: each written test, and the changed assertion of the Checkpoint test, was proven by breaking the content, data or code it guards, seeing it go red for the intended reason and reverting; nothing mutated is committed. The mutants, by slice:
  - 0, the helpers of `routes.ts`: Manhattan instead of Chebyshev distance; Experience read as Health; a monster with no noticing distance given one; `<` for `<=` in `metOn`; the first monster, or the first milestone, skipped; no route given.
  - 1, the cave: its exit naming `from-woods`; the mountain's `from-cave` entrance off the line to the forward exit; the cave's Checkpoint two tiles off its entrance.
  - 2, the map: the woods and the mountain swapped in the route; a sand tile cut from the trail; `from-cave` on an open tile of the bottom rows; the exit zone in the bottom rows; a second milestone; a way round the high gap opened (row 4, columns 28 to 32); the milestone's zone off the trail; only the shaft widened, or only the squeeze (both stay green: the other still gives three narrow tiles in a row), then both (red); the rock turned to grass (48%, under half); an 89-letter area text; `from-cave` listed first; the cave's Checkpoint moved to (4, 6); the 20 by 12 stub put back in place of the mountain (eight tests red, the size test among them: "expected 20 to be greater than 20").
  - 3, the raiders: a wolf added; the archer, the charger, or the three chasers of the trail taken out; the veteran with 9 Health, then with 7 damage; the veteran moved to (41, 24), off every way through; the charger moved to (16, 22), into a narrow stretch.
  - 4, the armor: the Plate Armor's bonus 1 instead of 2; the chest at (42, 22), far from the trail; the chest at (35, 7), after the veteran; the core's `heroDefense` (`stats.ts`) ignoring Gear; no chest at all (all four red).
  - 5, the finds and the side path: the second cache holding a potion; the second potion moved to (41, 24); the core's `takeContents` for a consumable (`interactables.ts`) returning nothing; the core's pickups (`pickups.ts`) dropping their events; both overlook chests moved beside the trail; the guard replaced by an archer, then moved to (30, 24), onto the trail; a potion moved into the bottom rows, (28, 27).
  - 6, the Experience: every raider worth 1 (41, under Level 4's 45: the Level 4 test red); the veteran worth 12 (74, over Level 5's 70: the Level 5 test red).
  - The content-check test: the exit `to-cave` naming an entrance that does not exist ("exit "to-cave" leads to unknown entrance"). The timeout of the walks: `WALK_TIMEOUT_MS = 1` fails them with "Test timed out in 1ms".
- Honest limits: a few shapes cannot be broken without the content check refusing the whole content first, so only the content-check test and the loader prove them: the mountain with no `from-cave` entrance, the cave with no Checkpoint or no way back. The timeout is a number, and a test of it would repeat it.
- Smoke (the production build on `vite preview`, port 5116, headless Edge through the shared tool's engine, with my own scene script kept outside git; no page errors, and the only console message is the browser's request for a favicon, which returns 404; every screenshot opened and judged; kept in `.worktrees/_notes/t16-smoke-*.png`, outside git, the number being the one in the name). The hero was put in place by sending `continue` with a patched snapshot through `window.gameCore`, and real key events were used for what the adapter reacts to:
  - the way in from the woods: the area text, the Checkpoint flag with "CHECKPOINT HEALTH FULL", the exit patch (01); the squeeze (02) and the shaft (03);
  - the fights: a raider's wind-up (04), the charger's lane (05, 05b), the archer's aim and its projectile (06, 06b), the veteran's wind-up zone (07);
  - the Plate Armor: the closed chest (08), "FOUND PLATE ARMOR +2 DEFENSE PRESS I TO EQUIP" (09), the inventory page with the Plate Armor scrolled into view and its drawn icon (10, 10b), worn: Defense 2 to 3 (10c);
  - a cache, "FOUND AMMUNITION +6", the HUD 8 to 14 (11); a Healing Potion taken by walking onto it, "+1", the HUD 2 to 3 (12, 13); the milestone `high-gap`, Experience 33 to 36 (14, 15);
  - the side path: the pocket with the two chests and the guard winding up (16, 17);
  - the forward exit into the cave stub: its text, the Checkpoint, the way back lit (18, 19, 20), and the way back into the mountain (21); the Automap with four areas, the cave highlighted, fitting the page (22).

### Left for manual review

- The reviewer play check (the last criterion). I drove the scenes above with a headless browser and looked at the screenshots; I did not play it by hand, nor in a headed browser.
- How the mountain looks and plays in a real window: the width of the passes, how hard the veteran (12 Health, hits for 8) is for a hero of Level 3 in Chain Mail, whether the number and the places of the caches and potions keep ranged play and recovery meaningful, whether the raiders can be told apart by their flat colours (ticket 23 gives them art), and whether the numbers (placeholders) feel right.

### Suggestions for other tickets

- Ticket 17 (the cave): keep the stub's contract: the area `cave`, the entrance `from-mountain`, the exit `to-mountain` (to the mountain's `from-cave`) and a Checkpoint on the entrance (`cave-checkpoint`); the layout and size are free, and the Checkpoint tests of `shipped-areas.test.ts` name it. The hero arrives with 55 Experience on the route (68 with everything): Level 4; Level 5 is 70.
- A mid-route Checkpoint on the mountain would soften a defeat at the veteran (about 70 steps back to the way in). It needs the mountain's `checkpoints` assertion in `shipped-areas.test.ts` (which expects exactly the one) to become "contains", and a test of its own in `the-mountain.test.ts`.
- Whoever owns `notice.ts`: the notice is still drawn over the hero in the last rows of a scrolling area (ticket 15's note). The mountain keeps its rewards above those rows and a test pins that; moving the notice would free the layout.
- Ticket 23: the four raiders are flat colours (`MONSTER_COLOURS` in `art.ts`) and the Plate Armor's icon is drawn in code; `shipped-art.test.ts` guards that no monster type is left without a colour. The mountain uses only the rock, grass and sand that existed.
- Ticket 26: the numbers of the raiders (3, 4, 3, 6 Experience; the veteran's 12 Health) and the Experience on the route (22 here, 55 at the exit) are placeholders pinned by tests, so a change shows.
- A shared helper: the woods test and the mountain test each derive "the trail" from the layout (the route over sand tiles). I left them apart, as they differ in their ends; a `trailThrough(area)` in `routes.ts` is a small follow-up.
- Glossary candidates: Entrance, Exit, Milestone, area text, raider, tougher variant (the veteran), side path, stub area, trail, narrow pass.
- Proposed ADR (not created): none.

Made by the player on 2026-10-14 (recorded on integration/island-adventure-rpg at 4259c95): the player said that their playthroughs of the game covered this check, and that all their comments have already been fixed with other tickets. There is no step-by-step log. The box above was ticked on that word.
