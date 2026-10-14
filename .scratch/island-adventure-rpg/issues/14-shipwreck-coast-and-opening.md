# 14: The shipwreck coast and the opening

**What to build:** Turn the first placeholder Adventure Area into the real first area, and add the opening. New Game shows a brief opening (a storm wrecked the ship on a remote island), then the hero wakes on the wrecked coast with a basic sword and armor. A few weak monsters teach the controls, at least one optional side path holds a reward, one milestone grants Experience, and an exit leads on toward the woods. The area's entrance Checkpoint is the start of the adventure. Art stays placeholder until the art tickets.

**Blocked by:** 11: Title screen, autosave, and Continue

**Status:** resolved

**Spec stories:** 7, 8, 11-14, 52, 67

- [x] New Game shows the opening text, then begins the hero at the coast's entrance Checkpoint with the basic sword and armor.
- [x] The coast layout is authored as content data and shaped like a wrecked coast (water and wreckage as solid terrain, a sand path). It contains the main route from the wreck to the exit toward the woods; at least one optional side path with a reward (Gear or supplies); a few weak monsters using the basic behavior; at least one chest; at least one Healing Potion pickup; one milestone; and short area text.
- [x] The exit leads to the second placeholder area, which ticket 15 turns into the woods. Content that earlier tickets put in the first placeholder area (test chests, devices, monsters) is moved to the second placeholder area or removed, so the coast holds only intended content. Tests use purpose-built fixtures rather than shipped content; convert any test that relied on placeholder content to a fixture first.
- [x] Content validation passes, including that the exit is reachable from the entrance without puzzles.
- [x] Experience is tuned (data only) so the hero reaches about Level 2 by the exit on the intended route, without grinding.
- [x] Tests at the Game core's interface confirm that New Game emits the opening, places the hero at the entrance Checkpoint, and equips the starting Gear.
- [x] Reviewer play check (manual, in a browser): New Game, read the opening, walk the whole coast, defeat the monsters, open the chest, and take the exit.

## Comments

Resolved on integration/island-adventure-rpg at 5e1c568

### What was built

- Core: the optional `ContentDefinition.opening` (1 to 4 lines, none blank, checked when the content loads) and the event `{ type: 'opening', lines }`, the first event of every `new-game` and never of `continue`. The core pauses nothing and keeps nothing for it, so the snapshot and `SNAPSHOT_VERSION` are untouched. Also the optional `ContentDefinition.checkCoveredCorner` (see the decisions).
- Content: the new coast, `src/content/areas/shipwreck-coast.ts` (40 by 18 tiles, so the view follows the hero), three placeholder lines in `src/content/opening.ts`, the solid terrain kind `wreckage` (its colour is in `art.ts`), and `src/content/areas/first-finds.ts` (the chests that moved to the trail, below).
- The coast: the hero wakes at (5, 9) under the hull of the wreck, which is the start and the Checkpoint `coast-checkpoint`. A sand route runs east through a gap in the rocks into a bay, out by a mouth in the east wall (the milestone `broken-mast`, 5 Experience; no way to the exit goes round it) and along a corridor that turns to grass at the exit `to-trail` (to the trail's `from-coast`; the way back arrives at `from-trail`, (38, 8)). `potion-chest` (8, 7) holds 2 Healing Potions, `beach-potion` (9, 11) is one on the sand, and the side path is an unmarked one-tile crevice at (25, 13) that leads to a cove with `sword-chest` (31, 15), a Steel Sword. Three crabs, the weak basic chaser: `crab-1` (22, 10) in the bay, `crab-2` (32, 9) in the corridor, `crab-3` (26, 16) in the cove. Area text: "Wreckage litters the shore. Follow the beach east."
- Adapter: `opening-card.ts` (`layoutCard`, pure, and `OpeningCard`, drawn with `UiLayer` over a black screen: the lines centred in a window, ENTER TO BEGIN under them), `startOfNewGame` in `scene-keys.ts`, and small edits to `title-scene.ts` (it hands the opening on) and `play-scene.ts` (it holds the game while the card shows).
- Tests: 39 new in 4 new files (`opening.test.ts` 9, `shipwreck-coast.test.ts` 15, `opening-card.test.ts` 13, `play-start.test.ts` 2), the helper `tests/routes.ts`, a reworked `covered-corner.test.ts`, and the shipped-content tests converted (below). README: the new section "The opening", the coast and the test list. `.worktrees/_tools/README.md` (outside git): the extra Enter.

### Decisions and defaults

- **The opening is an event, and the adapter holds the game.** `new-game` returns `opening` first, before the text of the area; the core does not pause and has no state for it. `PlayScene` shows the card and, until Enter, runs no step and lets no key but Enter through (the walk and action keys are read and dropped); Enter ends it and the screen fades in on the hero over 600 ms. So nothing is saved for the card and `SNAPSHOT_VERSION` stays.
- **A New Game still saves at once**, with the card up as well: a tab closed at the card brings back the new game, not the old save. Continue sends `continue`, which gives no opening, so it never shows the card. A held Enter that outlasts the key-repeat delay may press Enter on the card too and skip it: accepted.
- **The covered corner (ticket 22).** The size exemption is gone from `checkCoveredCorners`, so the rule holds for an area of any size. The loader applies it to content that sets `checkCoveredCorner: true`: the game's content does, the small arenas of the tests do not (the rule is about the content that ships). Tests pin that the shipped content asks and loads, that content which does not ask is left alone, and that the ones which ask are checked in every area. Rows 0 to 2 of the coast are water.
- **The tests that relied on the placeholder coast** were the three `shipped-*` files, which walked it by fixed tiles; every other test already runs on fixture content. They are the checks of the shipped content as a whole, which the brief says stay, so they became content-driven: they find their route in the content (`tests/routes.ts`) and cover any coast. That went in first (`d5978af`, tests only, 1085 green on the old coast), then the content changed.
- **One Gear reward on the coast.** The old `sword-chest` is the side path's reward (the Steel Sword, in the cove); the old `armor-chest`, `bow-chest` and `arrow-cache` moved to the trail. The first bow belongs in the woods (spec).
- **The boar and the spitter are removed, not moved.** The brief said to move them to the trail, but the trail already has `trail-boar-1` and `trail-spitter-1`; moving them would have doubled them. The coast has crabs only and teaches the controls.
- **The crab no longer drops arrows** (its 15% Healing Potion stays): a hero on the coast has no bow, and the coast has neither a bow nor Ammunition, in a chest, on the ground or dropped (a test pins it). The spitter carries them now (25% for 2, since it shoots them), so some monster in the game still leaves Ammunition.
- **Experience needed no change.** A crab is worth 5 and the milestone 5; Level 2 needs 10 and Level 3 needs 25. On the way out the hero meets `crab-1` and crosses the mast: 10, Level 2 at the mast; `crab-2` makes 15 at the exit. Clearing the whole coast, the cove too, makes 20: no Level 3, so nobody has to grind. Two tests pin this against the shipped thresholds, so a later change cannot break it unseen.
- **The opening** reads "A storm broke the ship in the night." / "The sea carried you to a remote island." / "You wake on the sand, with sword and armor." Placeholder words; ticket 25 gives the card its art. A test checks that the pixel font draws every character of it (a character it lacks comes out blank).
- **The side path has no sign.** It is optional and found by looking; the potions lie a step off the route.

### What moved where (tickets 13 and 15 read the trail)

- Into the trail: three chests, as `firstFinds` in the new `src/content/areas/first-finds.ts`. `overgrown-trail.ts` imports it and lists it with one line at the end of the area, `interactables: [...firstFinds]`, under a comment that says where they came from; nothing else of the trail was touched. They are `bow-chest` at (2, 17) (the Short Bow), `arrow-cache` at (4, 17) (6 Ammunition) and `armor-chest` at (6, 17) (the Chain Mail): a row in the trail's south-west corner, on open grass. Ticket 15 places them in the woods; ticket 13's rooms keep clear of them.
- Gone: the old coast's `boar-1` and `spitter-1` (the trail has its own) and its milestone `rock-wall-gap` (replaced by `broken-mast`); the crab's arrow drop went to the spitter.
- Kept on the coast, at new tiles: `potion-chest`, `beach-potion` and `sword-chest` (now in the cove).

### Merge with ticket 13

- When this was written the integration tip was still `b2cc5bc` (tickets 01 to 12, 22 and 11), so there was nothing to reconcile. What the ticket that lands second should check, beyond textual conflicts:
  - the trail's `interactables`: mine is `[...firstFinds]`; ticket 13's devices go into the same list and both must survive (a textual conflict on that line is likely);
  - ticket 13's rooms keep clear of the chests at (2, 17), (4, 17) and (6, 17) and the tiles beside them (`shipped-areas.test.ts` runs over every area: room beside every chest, nothing on an entrance, chests solid in the reach check) and of the covered corner;
  - this ticket changes no saved shape: `SNAPSHOT_VERSION`, `saved-game.ts` and `saved-adventure.ts` are untouched, so a bump by ticket 13 stands as it is;
  - `tests/fixtures.ts` gained one option, `opening`, on `arena()`;
  - `opening` is a new `GameEvent`: an exhaustive switch over events written in ticket 13 needs a case for it.

### How to run it

- `npm.cmd run dev`, open the URL and press Enter on the title (New Game): the card of the opening shows on a black screen and nothing moves; Enter again and the hero wakes at the Checkpoint. Walk east along the beach (W A S D or the arrows, Space to strike, E to open a chest). The crevice in the bay's south wall, at (25, 13), is the side path; the exit is at the east end; M shows the Automap.
- Continue on the title (once a save exists) goes straight to play, with no card.
- `?debug` exposes `window.gameCore`.
- `npx.cmd vitest run tests/opening.test.ts tests/opening-card.test.ts tests/play-start.test.ts tests/shipwreck-coast.test.ts` runs the new tests alone; `npm.cmd run check` is the gate.

### How it was verified

- `npm.cmd run check`: typecheck exit 0, 1138 of 1138 tests in 55 files (the base, `b2cc5bc`, had 1084 in 51), build OK. Every slice was written test-first and committed when green: the conversion of the shipped-content tests, the covered-corner option, the coast, the Experience pins, the opening in the core, the card, the README, and a strengthening of the card's tests.
- Validation (criterion 4): the loader accepts the content; `shipwreck-coast.test.ts` finds the route from the start to the exit over open ground with the chests solid and walks it into the trail; `shipped-areas.test.ts` checks every area's entrances, exits, milestones and Checkpoints, and `shipped-enemies.test.ts` that no monster notices a hero standing on an entrance, a Checkpoint or the start.
- Mutation checks (each new test proven by breaking the source, seeing it red and reverting; none committed): about 35 mutants, each caught by the test written for it. Core: `continue` emitting the opening, the opening last or missing, an opening for content without one, the line limit at 3 and at 5, a blank line or no line accepted, the covered-corner flag ignored, a new game that turns the hero. Adapter: `startOfNewGame` losing `saveAtOnce` or the lines, the card's width, hint, gaps and centring. Content: a way round the milestone, walkable wreckage, a chest by the route, the potion deleted, a boar for a crab, Experience too high or too low, a crab that drops arrows, a long area text or opening line, a character the font lacks, no starting armor, a crab near the start, the Checkpoint off the start tile. The pass found one real gap: the card's window height could leave out the hint's row and every test stayed green. `6488160` pins the air under the hint, between hint and lines, between rows and at the sides, and each of those mutants now dies by its own test.
- Smoke (shared tool, the production build on `vite preview`, port 5114, every run 0 console errors and 0 page errors; each screenshot opened and judged; kept in `.worktrees/_notes/t14-smoke-*.png`, the number being the one in the name):
  - the card, three lines centred in a window on black with ENTER TO BEGIN under them (1); the wake on the coast, the hero on the Checkpoint under the wreck, the HUD in the corner, the area text, a potion on the sand (2);
  - the walk along the route: the bay with a crab (3), a fight with its strike zone and health bar (4, 4b), the corridor at Level 2 (5), the approach to the exit (6), and the arrival on the trail at full Health at its Checkpoint (7). With keys pressed through the tool, `crab-1` (5) and the mast (5) give 10 Experience, Level 2 at the mast, and `crab-2` makes 15;
  - the side path: the sword chest opened in the cove, FOUND STEEL SWORD, +1 ATTACK (11); the potion chest, FOUND HEALING POTION +2, the HUD showing 2 (12);
  - the Automap on the coast near the start, explored only around the hero (13), and on the trail, the coast explored along the route and the link between the two (8);
  - a reload, then Enter on Continue: straight to play at the Checkpoint, no card, one Enter (14).
- The shared tool's self-test, `node selftest.mjs`: 26 ok, 0 failed (88 s). Its README now says that a new game goes on to the card: title Enter, opening Enter, then play.

### Left for manual review

- The reviewer play check (the last criterion): New Game, read the opening, walk the whole coast, defeat the monsters, open the chest, take the exit. I drove it with the smoke tool and looked at the screenshots, not by hand, nor in a headed browser.
- How the card and the coast read in a real window, how the side path feels (see below), and whether a held Enter skips the card on a real keyboard.
- Not covered by automated tests, by the agreement (ADR 0002): the drawing of the card, that it holds the game, and the fade. The smoke runs covered them.

### Suggestions for other tickets

- Tickets 15 and 26: the cove. A crab at the crevice's mouth can bite a hero in the crevice from the diagonal, where a strike straight ahead does not reach it, and the smoke bots (which do not dodge) reached the chest with 1 Health of 10. The side path is optional and potions lie on the way, so I left it as it is. The numbers of the coast (a crab's 5 Experience, the mast's 5, 10 for Level 2) are pinned by tests, so a change shows.
- A follow-up for the loader: it does not refuse a chest or a pickup that stands on an entrance (a shipped-content test covers the game's own content). `loadInteractables` is left alone because ticket 13 edits it.
- Ticket 15: the three chests of `first-finds.ts` are yours to place, and the first bow belongs in the woods. The trail's entrance `from-coast`, its Checkpoint and its exit back to the coast are as they were.
- Tickets 23 and 25 (art): the opening card is a plain window on black with placeholder text, and `wreckage` is a flat brown (`art.ts`, `TERRAIN_COLOURS`).
- Glossary: save, autosave, title screen, Continue, Page and Area Text (as ticket 11 said), and now the opening (the card a new game begins with) and wreckage (a solid terrain kind).
- Proposed ADR (not created): "The opening is an event, and the adapter holds the game": the core reports the opening and keeps no state for it, because a pause in the core would be saved state and would change the saved shape. Also, `layoutCard` and `startOfNewGame` are two more pure adapter functions tested directly, while ADR 0002 lists three exceptions only: the proposal of tickets 10 and 11 ("Pure, Phaser-free adapter functions may be tested directly") would cover them.

Made by the player on 2026-10-14 (recorded on integration/island-adventure-rpg at 4259c95): the player said that their playthroughs of the game covered this check, and that all their comments have already been fixed with other tickets. There is no step-by-step log. The box above was ticked on that word.
