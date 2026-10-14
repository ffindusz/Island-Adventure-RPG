# 15: The woods

**What to build:** Turn the second placeholder Adventure Area into the real woods, reached from the coast, and add a minimal third area as a stub so the route stays connected. The woods hold forest beasts and slimes. The hero finds the bow early, followed by Ammunition caches, and an optional key-and-door side path rewards a weapon upgrade. Art stays placeholder until the art tickets.

**Blocked by:** 12: Charger and ranged enemies; 13: Light puzzles and clues; 14: The shipwreck coast and the opening

**Status:** resolved

**Spec stories:** 9-11, 50, 68, 69, 71

- [x] The woods have an entrance Checkpoint, an exit back to the coast, and an exit forward to a minimal stub area (entrance, Checkpoint, return exit) that ticket 16 turns into the mountain.
- [x] The bow is in a chest early in the woods, with Ammunition caches soon after.
- [x] Forest beasts (basic and charger behaviors) and slimes (for example slow and sturdy) are data variants of existing behaviors.
- [x] An optional side path with a key and a locked door rewards a weapon upgrade; the main route needs no key.
- [x] The area also has Healing Potions, one milestone, and short area text.
- [x] Experience is tuned (data only) so the hero reaches about Level 3 by the exit on the intended route, without grinding.
- [x] Content validation passes, including that the main route is reachable without puzzles.
- [x] Tests at the Game core's interface load the shipped woods content and confirm that validation passes, the main route is walkable from entrance to exit without using a key, the bow chest comes before the first Ammunition cache along that route, and the Experience reachable on the intended route to this exit meets the Level target.
- [x] Reviewer play check (manual, in a browser): arrive from the coast, find the bow, use it on a beast, take the side path, and leave through the forward exit.

## Comments

Resolved on integration/island-adventure-rpg at 5fdf5f2

### What was built

- Content: the real woods, `src/content/areas/woods.ts` (48 by 28 tiles, so the view follows the hero; a little over half of it is solid trees). The hero comes in at (1, 14), where the Checkpoint `woods-checkpoint` is, and a trail of sand about 57 steps long leads east to the exit forward at (47, 18). The exit back to the coast is the west edge, rows 14 and 15. The area text is one line: "Tall trees close in. Follow the sand path."
- On the trail, in order: `bow-chest` (the Short Bow, about 8 steps in), the Ammunition caches `arrow-cache-1` and `arrow-cache-2` (6 each, about 13 and 16 steps in), `woods-wolf-1`, the Healing Potion on the ground `woods-potion`, `woods-slime-1`, `woods-spitter-1`, `woods-boar-1`, and the milestone `old-oak` (5 Experience) at the neck before the exit, which no way goes round. `woods-potion-chest` (2 Healing Potions) stands by the pond, a few steps off the trail.
- Two side paths, both optional and on no route: the cabin in the south-west behind `cabin-door` (the `brass-key` lies in the north glade, guarded by `woods-wolf-2`; the sign by the door says where), with the Long Bow in `cabin-chest`; and the Chain Mail in `armor-chest`, in a nook to the south.
- The creatures are data only: the new `wolf` (a basic chaser, quicker than a crab and frailer) and `slime` (a chaser that is slow, sturdy and hits lightly) in `monsters.ts`, and the boar (charger) and spitter (ranged) that were there already: 2 wolves, 2 slimes, 1 boar, 1 spitter. Other new data: the solid terrain `tree` and the Gear `long-bow` (+2 Attack; the Short Bow and the Steel Sword give +1).
- The stub, `src/content/areas/mountain.ts`: 20 by 12, the entrance `from-woods` at (1, 6) with the Checkpoint `mountain-checkpoint` on it, the exit `to-woods`, no monsters, one line of text. The coast's exit now names the woods.
- Adapter, placeholder art only: colours for the tree, the wolf and the slime in `art.ts`, and the Long Bow's picture `public/art/gear-long-bow.png`, cut from the licensed pack (`docs/assets/licences.md`).
- Tests: `tests/the-woods.test.ts` (24, new), `tests/shipped-art.test.ts` (new, 12 cases), and `shipped-areas`, `shipped-content` and `shipped-puzzles` converted to the woods. README: the woods, the stub and the art guards.

### Decisions and defaults

- **Old area id: `overgrown-trail` is now `woods`** ("The Woods"), as the brief suggested. What carried the old name went with it: the coast's entrance `from-trail` is `from-woods`, its exit `to-trail` is `to-woods`, the Checkpoint `trail-checkpoint` is `woods-checkpoint`, the monsters `trail-*` are `woods-*`. A save made on the old trail names an area that is gone and will not load; nothing has shipped, and no saved shape changed, so `SNAPSHOT_VERSION` stays 2.
- **The stub's contract for ticket 16:** keep the entrance `from-woods`, the exit `to-woods` and a Checkpoint on the entrance (the coast and the woods name them, and the content check refuses an exit to an area with no way back); the layout and the size are free. No test pins that the stub is empty.
- **The Chain Mail is kept, as an optional find in the woods** (`armor-chest`, about 17 steps off the trail), so that the shipped-content test "has better Gear for the armor slot in a chest" keeps its subject until the mountain has its own armor chest. The woods are not the armor's place: no route passes it.
- **The lever-and-gate shed is taken out** (`shed-lever`, `shed-gate`, `shed-potion`, with its three tests in `shipped-puzzles.test.ts` and the lever and gate steps of the shared ones). The woods are a new layout, and ticket 17 builds the real lever-and-gate side path. The core's lever and gate tests, on purpose-built content, are untouched. So ticket 13's manual "pull a lever" check has no shipped lever until the cave: it belongs in ticket 17's play check.
- **The weapon upgrade is the Long Bow in the cabin chest** (+2 Attack). A test pins that it adds more than any Gear of its slot that the hero starts with or can find on the coast and in the rest of the woods. The ids `brass-key`, `cabin-door`, `cabin-sign` and `cabin-chest` are as ticket 13 had them.
- **Experience, data only** (the thresholds 10, 25, 45, 70, 100 are as they were). "On the route" means a hero who fights what stands on or beside the sand trail and crosses the milestone: the coast gives 15 on its route (20 cleared: three crabs and the mast); the woods give 18 (wolf 3, slime 2, spitter 3, boar 5, `old-oak` 5). So the hero reaches the exit with 33: Level 3 (25). Clearing the coast and the whole woods, side paths and all, gives 43: not Level 4 (45), so nobody has to grind. The boar went from 8 to 5 and the spitter from 6 to 3 Experience; the wolf is worth 3 and the slime 2. All are placeholders for ticket 26.
- **One spitter, kept.** `shipped-enemies.test.ts` wants every behavior in the shipped content, and the woods are where the ranged one lives until the mountain.
- **A guard for monster colours (extra, small):** the placeholder art paints a monster type that it has no colour for in the "unknown" colour, so `monsterColour` is now exported from `art.ts` and `shipped-art.test.ts` checks every monster type, as it does every terrain kind.
- **The two south chests stand in row 24, not 25**; see "Left for manual review". No test guards the row: it would repeat adapter geometry.

### What moved where

- Gone: `overgrown-trail.ts`, `first-finds.ts` and `trail-puzzles.ts`; the woods are one file, `woods.ts`.
- From `first-finds.ts`: the `bow-chest` is in the woods, early on the trail (the Short Bow); the `arrow-cache` became `arrow-cache-1` and `arrow-cache-2`; the `armor-chest` with the Chain Mail is the optional find above.
- From `trail-puzzles.ts`: the cabin, the key, the door, the sign and the chest, with their ids, now in `woods.ts` (the chest holds the Long Bow, not 2 Healing Potions); the shed is gone.
- From the old trail: the three crabs are gone (the woods have their own creatures), the boar and the spitter are `woods-boar-1` and `woods-spitter-1` at new tiles, the milestone `far-clearing` is `old-oak`.
- Tests: in `shipped-areas.test.ts` `TRAIL` became `WOODS` and `MOUNTAIN`, with three tests added (the exits between the woods and the mountain, the Checkpoint of the mountain); in `shipped-content.test.ts` one assertion changed: the next area's Automap `connections` now contain the coast instead of equalling it, since the woods also lead on to the mountain.

### How to run it

- `npm.cmd run dev`, open the URL, Enter on the title, Enter on the opening card, walk east along the beach to the exit (the crabs and the mast are the coast's), and into the woods. Follow the sand trail east: the bow chest is in the glade just north of its first stretch (Space strikes, E opens, I shows the inventory page, where the bow is equipped, Q switches weapons, M shows the Automap). The cabin is in the south-west, the key in the north-east glade, the Chain Mail in the south, and the exit forward at the east end leads to the stub.
- `?debug` exposes `window.gameCore`.
- `npx.cmd vitest run tests/the-woods.test.ts tests/shipped-areas.test.ts tests/shipped-puzzles.test.ts tests/shipped-art.test.ts` runs the tests of this ticket; `npm.cmd run check` is the gate.

### How it was verified

- `npm.cmd run check`: typecheck exit 0, 1353 of 1353 tests in 67 files (the base, `a227406`, had 1306 in 65), build OK. Built test-first, one slice at a time, each committed when green.
- Mutation checks: each new test, and each of the tests I changed or added in the shipped-area, shipped-content and shipped-puzzles files, was proven (apart from the limits in the next point) by breaking the content, data or code it guards, seeing it go red for the intended reason and reverting; nothing mutated is committed. The mutants were of these kinds: a cache before the bow chest, the bow chest or the first cache too far along the trail, a door or a tree on the trail, a way round the milestone, the entrances swapped, the milestone, a potion or a chest behind a door, the cabin chest reachable with the door shut, the key beside the trail, a Long Bow no better than the Short Bow, a wolf as quick as the hero or as sturdy as a crab, a slime as quick as a crab, a missing charger, a monster worth more or less Experience so that the hero misses Level 3 at the exit or reaches Level 4 by clearing everything, a long area text, a tree kind that is not solid, a symbol that nothing defines, a monster type with no colour.
- Honest limits: a few assertions cannot be broken by changing the woods' content, because the content check refuses the broken content before the test runs (an area with no Checkpoint, an exit to an area with no way back, an open corner under the HUD, a chaser with no `reach`, rows of different lengths, a symbol with no terrain, an entrance on solid ground) or because the core guarantees the result itself. These are the `area-changed` event and the area id after a walk, the `chest-opened` and `pickup` events, and the mountain's one active Checkpoint: the check and the core cover them, and no mutation of their own proves them. The changed Automap `connections` assertion was proven by a mutation of the core (`src/core/automap.ts`). Swapping the order of the woods' entrances shortens the trail and so passes several tests that go by the trail's index; the test of the way-in's id catches it. The chests' row (24) is not guarded.
- Smoke (shared tool, the production build on `vite preview`, port 5115; every scene with 0 console errors, 0 page errors, 0 failed requests; every screenshot opened and judged; kept in `.worktrees/_notes/t15-smoke-*.png`, outside git, the number being the one in the name). The first entry is a real walk through the coast's exit; for scenes deep in the woods I put the hero there by sending `continue` with a patched snapshot through `window.gameCore`, and used real key events for what the adapter reacts to:
  - the coast (00); the way in through the exit: the woods text, the Checkpoint flag, "CHECKPOINT HEALTH FULL", the trail, the trees, the exit zone lit (01);
  - the bow chest, "FOUND SHORT BOW +1 ATTACK PRESS I TO EQUIP" (02); a cache, "FOUND AMMUNITION +6", the HUD showing 6 (03);
  - the four creatures, each in its own colour and none magenta, with the boar's red charge lane (04); fights with the real keys: the wolf and the slime (05), the spitter and the boar (06), the Experience going 3 then 5 and 3 then 8, as the content says;
  - the cabin: the key taken by walking onto it, the door opened with the key spent, "FOUND LONG BOW +2 ATTACK PRESS I TO EQUIP" with the hero in full view (07); the inventory page with both bows and both armors (08);
  - Healing Potions: the chest gives 2, the pickup 1, the HUD shows 3 (09); the milestone `old-oak` reached, 5 Experience (10);
  - the forward exit into the stub: the area text, the Checkpoint, the way back lit, no monsters (11); the Automap page with three areas, the hero in the woods, the mountain partly revealed and the links between them (12);
  - a save at the woods' Checkpoint, a reload and Continue: back in the woods at the Checkpoint (13a, 13); a defeat in the woods: back at the woods' Checkpoint with full Health (14b).

### Left for manual review

- The reviewer play check (the last criterion). I drove it with the smoke tool and looked at the screenshots, not by hand and not in a headed browser.
- How the woods look and play in a real window: the sand trail among trees that fill more than half the area, the number and placement of the creatures, the fights, and whether the numbers (placeholders) feel right.
- **The notice can cover the hero low in a scrolling area.** In the first smoke of the cabin chest (row 25 of 28) the banner "FOUND LONG BOW ..." covered the lower half of the hero: the notice is drawn at the bottom of the view (`notice.ts`), while the camera stops at the bottom edge of the area, so the hero stands under it in the last rows. I moved the two south chests up to row 24 (the hero is in full view in the next smoke) and left `notice.ts` alone, as it is shared. The cause is in the adapter: a later change of the notice's place would also fix it for every later area with a chest in its bottom rows.

### Suggestions for other tickets

- Ticket 16: keep `from-woods`, `to-woods` and `mountain-checkpoint`; the layout is yours. The woods leave a hero with 33 Experience on the route (43 with everything), so Level 4 (45) needs 12 more on the mountain's route. The Chain Mail is a woods find (+1 Defense); the mountain's armor upgrade should beat it, or move it, and its own test that an armor upgrade is reachable near the route stands on its own: the shipped-content test would pass on the woods' Chain Mail even with no armor in the mountain.
- Ticket 17: the lever-and-gate side path is now the only one in the game (the shipped shed is gone), so 13's manual "pull a lever" check moves to 17's play check.
- Ticket 26: the numbers of the wolf (3), slime (2), boar (5) and spitter (3) and the Experience on the route (33) are placeholders pinned by tests, so a change shows. Ticket 23: the wolf, the slime and the tree are flat colours (`art.ts`); `shipped-art.test.ts` guards that no monster type or terrain kind is left without one.
- Whoever owns `notice.ts`: see the notice and the hero above.
- Glossary candidates: forest beast, slime, side path, stub area (an area that only keeps the route connected, with an entrance, a Checkpoint and a way back), trail (the main route of an area).
- Proposed ADR (not created): none. That a stub keeps the entrance and exit ids its neighbours name is already enforced by the content check.

Made by the player on 2026-10-14 (recorded on integration/island-adventure-rpg at 4259c95): the player said that their playthroughs of the game covered this check, and that all their comments have already been fixed with other tickets. There is no step-by-step log. The box above was ticked on that word.
