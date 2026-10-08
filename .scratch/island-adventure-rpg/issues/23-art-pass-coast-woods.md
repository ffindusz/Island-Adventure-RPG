# 23: Art pass: the coast and the woods

**What to build:** Give the shipwreck coast and the woods their real look, and create the art that every area shares. Terrain and props, the monsters that live there, and the interactive pieces (chests, Ammunition caches, Healing Potion pickups, Checkpoints, exits, signs, keys, and locked doors) get their final art. The small shipwreck supplement is made to match the base's style. Only presentation changes: no rule, number, or map changes.

**Blocked by:** 15: The woods; 22: Hero and HUD art

**Status:** resolved

**Spec stories:** 94, 95, 101, 102

- [x] Coast and woods terrain and props replace the placeholders, so the coast reads as a wrecked shoreline and the woods as woodland. Collision data stays exactly as authored, and solid things still look solid while walkable things look walkable.
- [x] The coast's weak monsters, the forest beasts, and the slimes use real sprites and animations (moving, wind-up telegraph for the charger, hurt, and defeat). Every telegraph stays clearly readable in the new art.
- [x] Shared interactive pieces get final art that later areas reuse: chests (closed and open), Ammunition caches, Healing Potion pickups, Checkpoints (inactive and active), exits, signs, keys, and locked doors (closed and open). Icons exist for the Gear and keys found in these two areas.
- [x] The shipwreck supplement (wreckage and the wrecked ship) exists, matches the base's style, and has a verified licence recorded. If it is composed from existing pieces, the record says so.
- [x] Every new asset has an entry in the asset licence record, every art reference in these two areas resolves through the asset manifest, and content validation still passes.
- [x] No rules, numbers, or map layouts change, and every existing test passes untouched.
- [ ] Reviewer play check (manual, in a browser): play through the coast and the woods and confirm a consistent look, readable telegraphs, and nothing that looks like a wall but is not, or the reverse.

## Comments

Resolved on integration/island-adventure-rpg at 3023710

Built on `ticket/23-art-pass-coast-woods`, from the integration tip 82c0d7f. That is still the tip: the merge of step 9 said "Already up to date", and ticket 16 had not merged. The Status is untouched. Criteria 1 to 6 are ticked on what I verified (below); criterion 7, the manual play check, is left unticked.

### What was built

- **The rule for unfinished art, settled first.** `TERRAIN_COLOURS` and `MONSTER_COLOURS` stay as they were (they are the Automap's palette and the fallback body), and `tests\shipped-art.test.ts` is untouched. `artwork.ts` has `FINAL_ART_AREAS` (`shipwreck-coast`, `woods`), `hasFinalArt(areaId)` and `neededArt(content, finalAreas?)`, which, besides the Gear and consumable icons, names `terrain-<kind>` for every kind laid out in the listed areas and `monster-<type>` for every type placed in them, read from the area definitions. A missing picture stops the game and is named; a listed area that the content lacks throws. Every other area, the `mountain` stub that the tip already has included, is drawn in its colours as before and the game starts. Ticket 24 adds its area with one line.
- **The ground.** `terrain-plan.ts` (pure, no Phaser) turns a map into stamps. The variant of a tile comes from a hash of its position (no randomness, so every visit looks the same). The shore, the fringe of the sand, the edge of the forest and the cliffs are drawn quarter by quarter from thirteen pieces per edge. The forest is 2 by 2 blocks of big trees on a forest floor, and a single tree in a glade is a bush on grass. Nothing that reads as an obstacle stands on walkable ground. `terrain-baker.ts` paints the stamps once per area into one texture at the lowest depth. The sheets are `terrain-water`, `-sand`, `-grass`, `-rock`, `-tree` and `-wreckage`.
- **The wreck** (`terrain-wreckage.png`, composed; see Decisions). Its footprint is the `wreckage` tiles: the mast stands on them, and its top goes over water, never over ground to walk on. The pair of wreckage tiles near the east end is the broken mast.
- **Monsters.** `monster-sprites.ts` draws the crab, wolf, slime, boar and spitter with four facings, a walk, a slow idle, a red wind-up with a shake, a white flash when hit, faded copies of a dash, and a puff where one fell (`fx-puff.png`). The facing is worked out, since `MonsterView` has none: the last step, the dash, or towards the hero while winding up. `projectile-sprites.ts` draws the spitter's shot as a purple orb (`projectile-orb.png`), nothing like the hero's arrow; ticket 24 can reuse it.
- **Shared pieces** (`prop-sprites.ts`, no area names): chests and caches shut and open (Gear, Ammunition and Healing Potion differ by picture), pickups with a glint (Healing Potion, Ammunition, key), Checkpoints (a grey flag hung low, and a red one waving once it is the hero's return point), exits (chevrons towards the way out), signs, and doors shut (a padlocked leaf in a frame, so not a chest) and open (a dark doorway). The key, door and sign left `device-art.ts`; the gate and the lever stay there for ticket 24.
- **Icons.** Every Gear icon and the key were checked in the HUD and the inventory at the real size. The icons of both bows are now the pack's bows turned upright (7 by 13 and 7 by 15 px; the old ones read like a bowl). The bow in the hero's hand is `bow-held.png`. The armor icons drawn in code are untouched.
- **Records.** 22 pictures in `public\art\` are new or changed (20 added, 2 changed). Each is in `docs\assets\licences.md` (A1, "Used so far (ticket 23, composed pictures)", the "Last updated" line and the A1 row). `docs\assets\compose-art.py` makes them again. The README's Art section and its notes on the tests are updated.

### Decisions and defaults

- **The wreck is composed, and more of it is drawn than the brief planned.** The pack's `Boat.png` is an 80 by 32 px rowboat and `Sail.png` a clean 30 by 43 px triangular sail, and the wreck is a ruined ship 9 tiles wide and 4 high. So the deck is the pack's dock planks turned on their side and recoloured to two of its oranges, with cargo from `tileset_camp.png` (barrel, sack, rope, broken planks) and a skull and a bone from `TilesetFloorDetail.png`. The edges of the deck, the bulwark, the hull with its portholes, the broken plank ends, the hole, the mast with its yard and torn sails and the broken mast on the sand are drawn by the recipe in the pack's own colours. That is more than "small touches", and the licence record says so plainly (own work in the pack's palette; nothing of `Boat.png`). The look: a planked wreck with a mast and torn sails. The planks are a little like brickwork, the portholes a dotted line, and the HUD and the area text cover part of it at the start. I judged it acceptable and did not ask for the 0x72 supplement (S4); nothing was downloaded. The user can judge from `out\overlay\shipwreck-coast_0_0_plain.png` and `out\final-smoke\dev-start.png` in the scratch folder (see How it was verified).
- **Stand-ins (named, as the brief asks).** The pack has no crab and no wolf. The crab is the pack's red mollusc, and the wolf is its black dog (the hyena was tried and is too small to read at this scale). The spitter is the pack's mushroom with its two reds made purple, so that the red flash of a wind-up shows on it. The boar and the slime are the pack's own. Each is in the licence record as rearranged or recoloured. A real crab or wolf would be new art, which ADR 0004 says not to order.
- **Telegraphs.** `drawTelegraph` and `drawStrike` keep their shapes and colours: nothing was weakened, and I found nothing to strengthen on the lightest ground (sand), the busiest (the grass, the trail and the forest edge of the woods) and the darkest (the shade, the shore and the cliff). What did change is the layering, in the new `depths.ts`. Before, the marks of the ground, the telegraphs, the chests and the monsters shared one depth and stacked in the order they were created. Now the telegraphs are above the props and below every monster and the hero, the flat shapes (colour monsters, the gate, the lever) are above the telegraphs, and the monsters with art are above those, so that a chest or a flag can never hide a wind-up.
- **The orb** is about 11 by 13 px, bigger than the 0.3 tile (4.8 px) body the core flies, so a shot that grazes the picture can miss. The hit box is as authored.
- **Exits** point towards the nearest edge of the area (a tie goes left, then right, then up). Every shipped exit is at an edge; one away from an edge would need its direction from the content (follow-up).
- **The HUD's ranged slot** shows the icon of the Short Bow for whatever bow is equipped, because the view says the slot and not the piece of Gear (the sword's slot works the same way). The inventory shows each bow's own icon. The HUD's panel is the size it was.
- **The pond of the woods.** The pack's pieces between water and grass put half a tile of grass bank onto the solid water tile, so the hero stops 5 to 8 px short of the visible waterline. The bank is on solid ground, which the brief allows. If the play check finds it misleading, thin it in `compose-art.py`.
- **Props.** The red flag reads a little like a pennant or an axe head; the grey one hung low is plainly different from it. The sign is a plain board that looks a little afloat. The open door is a dark doorway and reads as walkable. The hero starts on the coast's Checkpoint, so that flag is hidden under the hero and the area text at the start (the start is as authored).

### How to run it

- `npm.cmd run dev` and open the printed URL (add `?debug` for `window.gameCore`). Press Enter on the title and again on the card, then walk east along the coast and through its exit into the woods.
- The production output: `npm.cmd run build`, then `npx.cmd vite preview --port <port> --strictPort`.
- To make the pictures again: `python docs\assets\compose-art.py --pack "<the folder Ninja Adventure - Asset Pack>"` (Python 3 with Pillow), or add names after it to make only those; `--out <folder>` writes elsewhere. To give another area its art, see the README's Art section, "Final art, area by area".

### How it was verified

- `npm.cmd run check` on d726888, the last commit that changes code (the commit of these Comments touches only this file): typecheck OK; 69 files and 1446 tests passed (1353 at the tip plus 93 new, 56 in `tests\final-art.test.ts` and 37 in `tests\terrain-plan.test.ts`); build OK. `src\core` and `src\content` have no change against the tip, and the only change under `tests\` is those two added files, so every existing test passes untouched (criterion 6; no rule, number or map moved).
- The shared smoke tool on the dev server (port 5123) and on the production build served by `vite preview`: SMOKE PASS both times, no console, page or HTTP errors, and the pictures reach the build. Every file of `public\art\` is named in `docs\assets\licences.md`.
- Screenshots, which I looked at (scratch folder `.worktrees\_notes\t23-work\out\`, outside the repository): the coast (start, wreck, shore, cliffs, east end with the broken mast, both exits), the woods (way in, trail against the forest, the pond, the glade, the cabin from outside and inside, both south chests, the bow chest, a cache, the key, both exits), each monster in a burst of frames (walking, wind-up and its telegraph, dash, hurt, defeat, the spitter's orb; on sand, on grass and on the busiest ground), the props (chests and caches shut and open, pickups, Checkpoints, exits, signs, the door shut and open with the locked message), the HUD and the inventory with every icon, the notice for the bow, and the production build (`out\prod\`).
- The collision overlay (criterion 1): a throw-away script in the scratch folder (not in the repository) tints every solid tile, and I compared the plain and the tinted picture of every edge and corner of both areas (`out\overlay\`, whole areas stitched; the black patch at the top of the stitched coast is a gap of my stitching, and the shots of the windows show water there). No walkable tile looks like a wall and no wall like floor, apart from the pond's bank (above). A headless walk with the core's own movement against the shore, the cliff, the wreck, the forest edge, a bush and the four sides of the pond (`out\walk1\`) stopped the hero where the picture says, the pond's bank excepted.

### Mutation proof of the new tests (all 93)

Each new test was proved by mutation: a deliberate break of the code under test, made with the editor, the two files run (`npx.cmd vitest run tests/final-art.test.ts tests/terrain-plan.test.ts`, 93 green before each) and reverted (the tree is clean and the 93 are green again). About 45 runs; each of these went red in the tests named, and every test body of the two files was seen red under at least one of them.

`tests\final-art.test.ts` (the rule for unfinished art, and the manifest):

| Mutation | Went red |
| --- | --- |
| `neededArt` without the terrain and monster names, and `hasFinalArt` false | the 3 aggregate tests (the per-name cases go missing instead of failing: 56 tests become 50, which is why the aggregates exist) |
| monster names dropped, and no throw for a listed area the content lacks | 3 |
| `neededArt` over every area, and `hasFinalArt` true | 2 |
| no removal of duplicates | exactly "and for no more" |
| `terrain-water` deleted from the manifest | 15 |
| five wrong manifest entries (frame width 16 to 15, height 26 to 16, `prop-door.png` to `prop-doors.png`, `prop-sign.png` to `prop-signs.png`, `bow-held.png` to `bow-held-1.png`) | 5, one each, in "pictures of the manifest on disk" |
| a frame of the water's glint beyond the end of the sheet | "hold a frame for every stamp planned for" the coast and the woods |
| the filter of the on-disk check inverted | "are most of the manifest, sheets among them" |
| `FINAL_ART_AREAS` plus a `nowhere` area, and `neededArt` skipping an area the content lacks | 3 (adding `mountain` there stays green, rightly: the content has that stub) |

`tests\terrain-plan.test.ts` (which frame each tile gets, on small maps worked out by hand):

| Mutation | Went red |
| --- | --- |
| the two sides of an edge swapped | the lake's shore corner by corner, the sand's fringe of grass, the same fringe beside the forest, the wreck's water and its "thirteen pieces" |
| inner corners dropped | the lake's inner corner, the wreck's "thirteen pieces" |
| one corner's piece swapped | the lake's inlet, both pond tests, the wreck's "thirteen pieces" |
| the choice of a variant random, not a hash of the position | the grass, the woodland and the wreck's cargo "the same each time" |
| the shortcut for a whole tile of water off | 6 (plain water, no shore at the map's edge, the wreck, the little wreckage, "no picture yet") |
| a tile outside the map counted as land | "no shore at the edge of the map" and "does not make a neighbour treat it as land" |
| the sand's fringe drawn beside water too, or sand always taken for the pond's bank | "has the sand around it, plain" only, or both pond tests |
| the rows of the cliff swapped, or its columns | the lip and foot and the outlined sides, or the outlined sides and "one tile thick" |
| the floor of the big trees dropped, or their quarters swapped, or the small trees dropped | the quarters and the small tree on every tree tile, or the quarters only, or the small tree and the single tree in a meadow |
| the smallest wreck lowered from 6 tiles to 1 | the 3 little-wreckage tests and the coast's deck and debris on the pair |
| the foot of the mast ignored, or the wreck's ground always sand | "plain planks under the foot of the mast" only, or the water under the wreck and the little wreckage on the water |
| the edge tiles of the wreck lose their deck, or a wreck piece is stamped on water, or a deck tile with no edge gets two pictures | the deck on every tile and "thirteen pieces" and the coast's deck, or 10 tests including "none anywhere else on the ground", or "one picture for the tile", one mast and plain planks |
| the mast on the bottom row, or on the last tile of the hull's bottom row | 4, or 5 (7 with the guard for walkable ground dropped too) |
| a mast stamp over walkable ground, or above the top of the map, or on a hull too thin for one | one test each, exactly the one that names it |
| the outside of a wreck's edge counted as water only | "thirteen pieces" only |
| rock tiles with no stamp, a default stamp for a kind with no picture, lava counted as land | the 3 rock tests and "a stamp for every tile", "has no stamp, so that its colour shows" only, "does not make a neighbour treat it as land" only |

Two limits. The "only inside the map" half of the whole-map test (a stamp for every tile) can be broken only by the mast, which its small map lacks; the mast's own tests catch it. And a parametrised case built from `neededArt` vanishes under a mutation of `neededArt` instead of failing; the aggregate tests catch it.

### Left for manual review

- Criterion 7, the play check in a browser: a consistent look across both areas, the telegraphs at full speed, nothing that looks like a wall and is not (or the reverse), and in particular the pond's bank, the wreck, and the stand-in crab, wolf and purple spitter. I drove the page only with the smoke tool, never by hand.
- How the animations feel at full speed (the walk, the shake of a wind-up, the puff, the flag's wave): I looked at frames, not at motion.

### Suggestions and proposals (nothing here was acted on)

- **Seam drift to flag (ADR 0002).** `tests\terrain-plan.test.ts` tests a pure helper of the drawing (which frame each tile gets), and the on-disk checks of `tests\final-art.test.ts` read the PNGs; the brief allows only the manifest check, so both go beyond the three exceptions. I kept them because the planner is the one piece of the art with rules that go wrong silently (a shore on the wrong side, a mast over walkable ground). If the user would rather not, delete `terrain-plan.test.ts`, the on-disk checks and their sentences in the README; nothing else depends on them. The monsters, the props and the baker have no test at all.
- **ADR proposal (not created):** art is opted into per area. The colours stay for good, `FINAL_ART_AREAS` lists the areas drawn from pictures, `neededArt` asks for pictures only for those, and the props are shared pieces with no area names, so that ticket 26 can check that every shipped area is listed. It could also record the seam-drift decision above.
- **Glossary proposals:** Telegraph (the shape that shows where a monster's blow will land), Stand-in (a pack creature used for a monster type the pack lacks), Final art (an Adventure Area drawn from pictures, not colours).
- **Follow-ups:** a direction for an exit that is not at an edge; thin the pond's bank if the play check asks; the 0x72 supplement (S4) only if the user finds the wreck weak and permits it; the gate and the lever (ticket 24); the Automap stays in flat colours.
- **Merging ticket 16 (the mountain):** it adds a colour to `TERRAIN_COLOURS` and `MONSTER_COLOURS` in `art.ts`, a drawn armor icon (`drawn-icons.ts`, one `ARTWORK` line, one line in `licences.md`). Those are the places where the two branches can conflict; keep both sides. Its new kinds and types have only colours, which keeps working: its area is not in `FINAL_ART_AREAS`, and the on-disk check skips `drawn` entries. Its art comes with ticket 24's one line.
