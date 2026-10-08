# 24: Art pass: the mountain and the cave

**What to build:** Give the mountain and the cave their real look. Terrain and props, the raiders and cave creatures (including the tougher variants and the ranged attackers' projectiles), and the cave's levers and gates get their final art, in the same style as the first two areas. Only presentation changes: no rule, number, or map changes.

**Blocked by:** 17: The cave; 23: Art pass: the coast and the woods

**Status:** ready-for-agent

**Spec stories:** 94, 95, 102

- [x] Mountain terrain and props (cliffs, boulders, passes, and ledges) and cave terrain and props (rock walls, winding passage floors, and a dim look) replace the placeholders. Collision data stays exactly as authored, and solid and walkable terrain stay easy to tell apart.
- [x] The mountain raiders (basic, charger, and ranged, including the tougher variant) and the cave creatures (including the tougher variant) use real sprites and animations. Every telegraph stays clearly readable, and the ranged attackers' projectiles have real sprites.
- [x] Levers (both states) and gates (closed and open) have final art, along with any area-specific props such as signs. Icons exist for the Gear found in these two areas.
- [x] Every new asset has an entry in the asset licence record, every art reference in these two areas resolves through the asset manifest, and content validation still passes.
- [x] No rules, numbers, or map layouts change, and every existing test passes untouched.
- [ ] Reviewer play check (manual, in a browser): play through the mountain and the cave and confirm they look like what they are called, match the first two areas in style, and keep telegraphs readable.

## Comments

Built on `ticket/24-art-pass-mountain-cave`, from the integration tip 7191520. The tip moved while I worked (ticket 18, the castle, merged: b4c75c3). I merged it as e1a9457 with no conflict and read the merge both ways (`git diff` of each parent against the result): `README.md`, `docs\assets\licences.md`, `art.ts` and `artwork.ts` hold each side's lines and nothing else, and the castle stays as 18 left it (flat colours, not in `FINAL_ART_AREAS`). The Status is untouched. Criteria 1 to 5 are ticked on what I verified (below); criterion 6, the manual play check, is left unticked.

### What was built

- **The ground** (`terrain-plan.ts`, `terrain-baker.ts`; the planner is still pure, no Phaser). A `TerrainLook` names the sheets that dress sand, grass and rock, each laid out like the standard one, so a look changes the picture of a frame and never which frame goes where. `lookOf(areaId)` gives the coast, the woods and every other area the standard look; the mountain slate cliffs (`mountain-cliff`) and boulders (`mountain-boulders`) on the standard sand and grass; the cave a dark stone cliff and a dimmed sand and grass (`cave-cliff`, `cave-sand`, `cave-grass`). In the mountain a rock with no rock above it and none below it is a boulder, on the ground that most of the eight tiles around it are (grass when tied), in one of four variants chosen by its position; every other rock is the face of a cliff (lip, middle, foot, outlined at the sides, and outlined beside a boulder too). The cave has no boulders, since a lone rock there would read as floor. The cave is dim in its ground and nowhere else: no layer over anything, no mask, no light radius, so a telegraph, a shot or a chest is as readable there as in the woods.
- **Eight monsters:** `monster-raider`, `-raider-charger`, `-raider-archer`, `-raider-veteran`, `-cave-bat`, `-cave-lizard`, `-cave-eye` and `-cave-bear`. Each is a sheet of the same make as 23's (four facings by four frames of a walk, a row of a white hit shape, a row of a red wind-up), so `monster-sprites.ts` did not change: the walk, the slow idle, the red shake of a wind-up, the white flash, the faded copies of a dash and the puff of a defeat work as on the coast and in the woods.
- **The gate and the lever** (`prop-gate.png` and `prop-lever.png`, drawn by `prop-sprites.ts`, no area name), two frames each: the gate shut (bars under an arch that stands over the way and on the rock beside it) and open (the arch alone); the lever at rest (a red ball tilted left) and pulled (a blue ball tilted right), set in a niche of stone. `device-art.ts`, the placeholders, is deleted. `drawInteractable` in `art.ts` now lists every kind and ends in `satisfies never`, so a new kind of interactable does not compile until it is listed there; it keeps all its `return`s as the hook for ticket 20's vessel.
- **Icons:** none to make. The only Gear found in these two areas, read from the content, is the Plate Armor (a chest on the mountain) and the Katana (the cave's vault chest). Both pictures exist (the Plate Armor drawn in code by 16, the Katana the pack's, by 17) and read in the chest's notice, the inventory page and the HUD; the Plate Armor is told apart from the other armors.
- **Records and the switch.** 15 pictures are new in `public\art\` (five of ground, eight of monsters, the gate and the lever), each in `docs\assets\licences.md` (the "Last updated" line, the A1 row and one entry each under "Used so far (ticket 24, composed pictures)", with what was changed). `docs\assets\compose-art.py` makes them again. `FINAL_ART_AREAS` is `shipwreck-coast`, `woods`, `mountain`, `cave`, last, when every picture existed. The README (the Art section, the paragraph on the devices, the notes on the tests) is updated.

### Decisions and defaults

- **Stand-ins (named, as the brief asks).** The raiders are the pack's ninjas: the dark one the raider, the yellow one the charger, the blue one the archer; the veteran is the pack's knight with its steel made navy. Side by side on the trail the four tell apart at a glance and the veteran is plainly the heavy one. The cave's bat, lizard and eye are the pack's own sprites; the bear is the pack's red bear made brown, so that the red of a wind-up shows on it. The bat's walk frames read as a droplet or a crab, depending on the wing frame. The lever is the pack's stone slab with a stick and a ball drawn on it (a few pixels in the pack's colours); the gate is the pack's iron arch with the pack's fence between its legs. The licence record says which part is cut, which recoloured and which drawn. Nothing was downloaded; the 0x72 supplement (S4) was not needed.
- **The shots.** `ArrowView` says only `shooter: 'hero'` or `'monster'`, so every monster's shot, the raider archer's and the cave eye's too, is 23's violet orb (`projectile-orb.png`). It cannot be taken for the hero's arrow on any ground, but a bolt of its own for the archer needs the view to name which monster fired (follow-up). The orb's picture is bigger than its hit box, as 23 noted; the box is as authored.
- **Telegraphs: nothing was changed.** `drawTelegraph`, `drawStrike` and `depths.ts` are as they were. I looked at each wind-up and shot on the lightest ground (the sand of the trail), the busiest (the trail among the rocks, and a corridor of rock) and the darkest (the cave floor next to rock): the raider, the charger's lane and dash, the archer's wind-up and orb, the veteran, the bat, the lizard's lane and dash, the eye's wind-up and orb, the bear. All read. The red of a wind-up is what I measured, not only looked at: its colours are at least 88 away on average from the colours the monster walks in (the eight measure 94 and over; the pack's own red bear measures 81 and a red eye 71, which is why the bear is brown). `tests\mountain-cave-monsters.test.ts` pins it.
- **Boulders are rock.** A boulder stands only on a tile that is rock for collision, and a one-tile-high wall of rock is a row of boulders: solid, as authored. A cliff never stands on a tile that can be walked on. The collision overlay (below) shows the tint matching the art on every window.
- **The gate's picture is wider and taller than its tile** (24 by 25 pixels: its legs stand on the rock on each side of the way, and the arch stands over it), so it reads as a barrier in a passage between rock walls and not as a wall or as 23's door. The way between the legs is what changes: barred when shut, clear when open. The lever fills its tile (a niche in the rock), so the floor never shows round it.
- **The mountain keeps the standard sand and grass,** so the trail and the ledges look as they do in the woods; only the rock has a look of its own there.
- **The HUD's weapon slots** still show one picture per slot (the known gap that 17, 22 and 23 flagged): `PlayingView.hero` says the slot (`activeWeapon`) and not the piece of Gear, so the Katana and the Steel Sword share one sword icon in the HUD (the inventory page shows each piece's own icon, and the Katana's reads there). Fixing it needs a small additive field of the view (see Suggestions), which is not the adapter's alone, so I left it, as the brief says.
- **The merge.** The brief expected conflicts in the README and `licences.md`; there were none (the two sides edited different lines), and I checked the sentences by hand.

### How to run it

- `npm.cmd run dev` and open the printed URL (add `?debug` for `window.gameCore`). Press Enter on the title and again on the card, walk east along the coast and through the woods into the mountain, then up its trail to its exit into the cave.
- The production output: `npm.cmd run build`, then `npx.cmd vite preview --port <port> --strictPort`.
- To make the pictures again: `python docs\assets\compose-art.py --pack "<the folder Ninja Adventure - Asset Pack>"` (Python 3 with Pillow), or add names after it to make only those. To give another area its art, see the README's Art section, "Final art, area by area".

### How it was verified

- `npm.cmd run check` on e1a9457, the merge (the commit of these Comments touches only this file): typecheck OK; 76 files and 1734 tests passed; build OK. On my last code commit, edf6dce, before the merge: 75 files and 1685 tests (1568 at the tip I branched from plus 117 new). Of the 117, 92 are in my four new files (26 in `tests\mountain-cave-ground.test.ts`, 50 in `tests\mountain-cave-monsters.test.ts`, 12 in `tests\gate-lever-art.test.ts`, 4 in `tests\mountain-cave-final-art.test.ts`) and 25 are in `tests\final-art.test.ts`, which I did not touch: its manifest cases are made per name, so they grew with the new pictures (57 to 82). The merge adds ticket 18's 49. My branch changes nothing under `src\core` or `src\content`, edits no existing test, and adds only those four test files and `tests\pictures.ts`, a helper that is not a test file (criterion 5: no rule, number or map moved).
- The shared smoke tool on the production build (`vite preview`, port 5124) and on the dev server: SMOKE PASS, no console, page or HTTP errors, and the pictures reach the build. After the merge I smoked the merged build again: the castle (flat colours, as 18 left it), the mountain's four raiders in a row and the cave's four creatures in a row, SMOKE PASS.
- Screenshots, which I looked at (`.worktrees\_notes\t24-*.png`; the scratch folder, `.worktrees\_notes\t24-work\`, is outside the repository): the mountain (way in, the high gap, the armor chest shut and open, the armor in the inventory page, a cache open and a Healing Potion, the exit to the cave, the four raiders on sand and on grass), the cave (the arrival with its Checkpoint, the hall, the sign read, the gate shut and open, the lever at rest and pulled, the grotto with its cache and potions, the vault chest and the Katana in the inventory page and the HUD, the milestone, the exit to the castle), each of the eight monsters winding up with its telegraph (the charger's and the lizard's dash, the archer's and the eye's shot), and the mountain raider and the cave lizard hurt and defeated in a burst of frames (the white shape, then the grey puff, then nothing; `t24-hit-mountain-contact.png`, `t24-hit-lizard-contact.png`; the hit and defeat rows of the other six are pinned by the pixel tests, and the code is the same).
- A real lever pull (criterion 3): the hero stands beside the lever, presses E, and the gate goes from shut to open on screen; he then walks through it to the chest and takes the Katana. In both the production build and the dev server.
- The collision overlay (criterion 1): a throw-away script in the scratch folder tints every solid tile, and I compared the plain and the tinted picture of both areas by eye: 12 windows of the mountain and 16 of the cave, covering every edge and corner (`out\overlay\`, with whole areas stitched). Every tinted tile is a cliff or a boulder in the mountain and a dark cliff in the cave, and no walkable tile looks like a wall; the passes are drawn as wide as they walk.
- The coast and the woods before and after (the brief's condition that they stay pixel for pixel): the production build of the tip I branched from and the one of my branch, served in turn, the same plan on each: 6 windows of the coast and 12 of the woods (every part of both areas, HUD corners included), two shots each. Differing pixels: 0 in all 18 windows, the hero's box and every animated part included.

### Mutation proof of the new tests

Each new test was proved by mutation while it was written (a deliberate break of the code under test or of a picture, made with the editor or a small script, run, and reverted). I did not keep the lists for the ground (M1 to M16 and M18) and the monsters (MM3 to MM13), so for these Comments I ran every row below again on the final code, each red and then reverted with `git checkout` (`git status` clean after each; the files green again). The numbers are the tests that went red in the file named above the table; a row that edits the manifest, the list of areas or the content was run on the whole suite and names the other files that went red too.

`tests\mountain-cave-ground.test.ts` (which frame each tile gets, on small maps worked out by hand, and the shipped maps):

| Mutation | Went red |
| --- | --- |
| the mountain given the standard look | 12 (eleven tests of the mountain's ground, and the one that gives it a look of its own) |
| a rock counts as alone when nothing is above it, whatever is below | 4 |
| the boulder's ground chosen the wrong way round (sand where grass has most tiles around it) | 5 |
| every boulder in the one variant | 1 |
| a cliff not outlined on the side of a boulder | 1 |
| the cave look given the boulders | 4 |
| the cave's sand the bright standard sand | 2 |
| the lip and the foot of a cliff swapped | 3 |
| the sheet of boulders cut to two frames | 1 |
| the sheet of the cave's cliff cut to two rows | 1 |
| an area with no look of its own given the mountain's | 5 |
| the mountain's look naming a sheet that the manifest lacks | 5 |

`tests\mountain-cave-monsters.test.ts` (the sheets of the eight monsters):

| Mutation | Went red |
| --- | --- |
| the bat's sheet cut to its four rows of a walk (no hit, no wind-up) | 4 |
| the first walk frame of the raider facing up a copy of the one facing down | 3 |
| one frame of the lizard's walk erased | 1 |
| a frame of the archer's hit row not white | 1 |
| a frame of the eye's wind-up row grey, not red | 1 |
| the charger's sheet a copy of the raider's | 1 |
| the bear's sheet the pack's red bear, unchanged | 1 (the wind-up must show against the walk) |
| the bat's frame size 32 in the manifest | 1 |
| the content placing a slime where the mountain's archer is (a content edit, reverted) | 4 (1 here, the types placed as the content says; 1 in `mountain-cave-final-art.test.ts`; 2 in `the-mountain.test.ts`, which was there before) |

`tests\gate-lever-art.test.ts` (the sheets of the gate and the lever):

| Mutation | Went red |
| --- | --- |
| the shut gate drawn as the open one (no bars) | 2 |
| the open gate drawn as the shut one (bars in its way) | 1 |
| the way of the shut gate filled solid | 1 |
| the shut gate keeping one bar only | 2 |
| both frames of the gate shifted up a row | 3 |
| a stray pixel on the open gate, outside its way | 1 (the arch is no longer the same shut or open) |
| the gate's sheet cut a row short | 3 |
| the corner pixel of the lever's tile made clear | 1 |
| the pulled lever the same picture as the lever at rest | 1 |
| the two frames of the lever swapped | 1 |
| the stone under the pulled lever flipped over | 1 |
| the lever's sheet cut a row short | 2 |
| a wrong frame size for `prop-gate`, or for `prop-lever`, in the manifest | 1 each (and 1 each in `final-art.test.ts`, which was there before) |

`tests\mountain-cave-final-art.test.ts` (the list of areas with final art, and the manifest, which is the one check ADR 0002 allows), with the other files that went red beside it:

| Mutation | Went red |
| --- | --- |
| `mountain` out of `FINAL_ART_AREAS` | 1 (the tests that go through the list just run 5 cases fewer: 1729 tests, not 1734) |
| `cave` out of `FINAL_ART_AREAS` | 1 (the same: 5 cases fewer) |
| `monster-cave-eye` misnamed in the manifest | 30 (1 here; 7 in `mountain-cave-monsters.test.ts`; 21 in `final-art.test.ts` and 1 in `shipped-art.test.ts`, which were there before) |
| `mountain-boulders` misnamed in the manifest | 3 (1 here; 2 in `mountain-cave-ground.test.ts`) |
| the cave placing a lizard instead of the bear (a content edit, reverted) | 2 (1 here; 1 in `mountain-cave-monsters.test.ts`) |

### Left for manual review

- Criterion 6, the play check in a browser: that the mountain and the cave look like what they are called, match the coast and the woods in style, and keep every telegraph readable at full speed, in play and with several monsters at once. I drove the page only with the smoke tool, never by hand.
- How the animations feel at full speed (the walk, the shake of a wind-up, the dash, the flash and the puff): I looked at frames, not at motion.
- The stand-ins: the pack's ninjas and knight as the raiders, the bat (a droplet or a crab by frame), and the violet orb in the raider archer's bow.

### Suggestions and proposals (nothing here was acted on)

- **Seam drift to flag (ADR 0002).** Besides the manifest check of `tests\mountain-cave-final-art.test.ts`, which is the allowed one, I added tests that go beyond the three exceptions: `tests\mountain-cave-ground.test.ts` tests the pure planner (which frame each tile gets, and that a boulder stands only on a rock tile) and reads the sizes of the sheets; `tests\mountain-cave-monsters.test.ts` and `tests\gate-lever-art.test.ts` read the pixels of the sheets (a white hit row, a red wind-up row that shows against the walk, bars in the way of a shut gate and none in an open one, a lever that fills its tile). I kept them because those are the rules that go wrong silently (a wall that reads as floor, a telegraph that does not show on its monster, a gate that reads as a wall). Also: `lookOf` names the ids of the mountain and the cave in the adapter's drawing (the gate and the lever stay area-free), and the sheets of a look are in the manifest but not in `neededArt`, which asks only by terrain kind and monster type; the loader checks them, and the final-art test pins them against the manifest. If the user would rather not: delete `tests\mountain-cave-monsters.test.ts`, `tests\gate-lever-art.test.ts` and `tests\pictures.ts` (only those two import it), and the pixel and size checks with their sentences in the README; nothing else depends on them.
- **ADR proposal (not created):** the look of an Adventure Area's terrain is chosen by the planner (`lookOf`) from sheets that keep the standard frames, so a new area changes no content, no kind of terrain and no frame; the cave's dimness is a darker set of the same pieces, never a layer. It could also record the seam-drift decision above.
- **Follow-ups for the owner.** (1) The HUD's per-piece weapon icon: add a field to `PlayingView.hero` naming the equipped piece of each slot (a pure projection of existing state, say `hero.equipped`) with a Game-core test, then `WEAPON_ICONS` in `hud.ts` can look the picture up by piece instead of by slot. (2) The monster's shot: add the monster's type to `ArrowView`, then the raider archer can have a bolt of its own and the eye its orb. (3) Ticket 20's vessel: `device-art.ts` is gone, so its picture goes in `prop-sprites.ts` (a case in `show()`, which has no exhaustiveness guard) and its case in `drawInteractable` in `art.ts` (which will not compile until it is listed). (4) The castle (25): its own `TerrainLook` and one more case in `lookOf`, sheets for the four undead, then one line in `FINAL_ART_AREAS`; its Knight Mail icon is already drawn by 18. (5) The Automap stays in flat colours.
- **Glossary proposals:** Monster (with Raider and Creature, the two families), Telegraph (the shape that shows where a monster's blow will land), Wind-up and Hit flash (the red and the white shape of a monster), Gate and Lever (the devices of the light puzzles), Terrain look (the sheets that dress an Adventure Area's sand, grass and rock), Cliff and Boulder (the two faces of rock), Final art (an Adventure Area drawn from pictures, not colours), Stand-in (a pack picture used for a monster the pack lacks).
