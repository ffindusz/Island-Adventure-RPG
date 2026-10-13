# 30: The first bow carried by a monster at the start of the woods

**What to build:** The hero gets the first bow in the very first fight of the woods. A weak monster stands on the trail just inside the way into the woods and carries the Short Bow; when the hero defeats it, the hero takes the bow at once, with the same notice that a chest gives ("press I to equip"). The bow chest is gone from the woods. To make that possible a monster of an Adventure Area can carry a piece of Gear, and it gives it once only, so that a monster that comes back after the hero's defeat never hands the bow out twice. The Ammunition stays in the caches further along the trail.

**Blocked by:** None (can start immediately)

**Status:** resolved

**Spec stories:** 39, 68, 71, 83, 84, 110

- [x] A monster that stands in an Adventure Area can carry a piece of Gear. When that monster is defeated, by the sword or by an arrow, the hero takes the Gear at once: it joins the hero's Gear and the same event that a chest's Gear gives is sent, so that the notice tells the player to press I to equip it. Before the monster is defeated the hero has nothing of it. This is tested at the Game core's interface.
- [x] The Gear is given once only: a hero that already holds it, carried or equipped, is given nothing when it defeats the monster again. That happens after the hero's own defeat, when the monsters of the Checkpoint's Adventure Area come back (story 83) and the carrier is defeated a second time. A monster in another Adventure Area stays defeated after the hero's defeat (story 84) and so gives nothing again either.
- [x] The Gear is kept through the hero's defeat like all Gear. A snapshot taken after the hero took it holds it once, and a game restored from that snapshot does not give it a second time. The ordinary drops of a monster that carries Gear roll as they did, and no random number is drawn for the carried Gear, so the scripted random numbers of the existing tests are used as before.
- [x] The loader of the content refuses, with a message that names the monster and the Gear, a monster that carries a Gear that does not exist, and it refuses a Gear that is given in more than one place (a chest, a milestone or a monster), so that the Short Bow cannot also be in a chest. This is tested with content built for the test.
- [x] In the woods the Short Bow is carried by a weak monster that stands on the trail just inside the way in: among the first tiles of the trail, and farther from the woods' Checkpoint than it notices the hero, so that a hero that starts again at the Checkpoint is not at once in a fight. The monster is one of the kinds the woods already has, and what is left of the trail is as it was.
- [x] The starting hero can defeat the carrier without the bow: a hero with the basic sword and the gear that the coast gave it wins that fight, under the same expectations that the fight tables hold the other monsters of the woods to.
- [x] The bow chest of the woods is gone and no chest holds the Short Bow. The Ammunition caches stay where they are (the monster leaves no arrows): there are two at least, the first one after the carrier along the trail and before its half, as the tests of the woods already say about the bow chest.
- [x] The Experience on offer in the whole of the woods does not change (the carrier is a monster that stood in the woods before, put at the start): the tests that a hero who fights what it meets reaches Level 3 and that one who clears the coast and the woods does not reach Level 4 pass as they are.
- [x] The tests of the woods that said that the bow is in a chest early on the trail now say that a monster carries it early on the trail (in the first third of the trail). A test at the Game core's interface walks from the way in to the carrier, defeats it, holds the Short Bow, equips it in the inventory, switches to it with Q and shoots it with Space; it replaces the test that walked to the bow chest.
- [x] The tests that follow the main route (the fight tables, the supply ledgers and the play time) give the route hero the Short Bow where the carrier gives it, so that the hero is as armed as before at every fight and no expectation of them is weakened or dropped.
- [x] Saves: a save made before this ticket knows a chest that the woods no longer have, so the title says that it is from another version and a new game replaces it; the README says so. `SNAPSHOT_VERSION` is raised only if the saved shape of the state changed (the carried Gear is content and holds no state, so it need not be); the comments of the ticket say which was chosen. The test that the starting hero has no bow and no Ammunition passes as it is.
- [x] The README, `docs/balance.md` and `docs/playtest-checklist.md` say that a monster carries the bow wherever they said it is in a chest, and the comment at the head of the woods' content no longer says that no monster stands near the way in.
- [x] The type check, the tests, and the build pass (`npm.cmd run check`).
- [ ] Reviewer play check (manual, in a browser): start a new game, play the coast to the woods and walk in. A monster stands on the trail a few tiles from the way in. Defeat it and see the notice that tells the player to press I to equip, also if that defeat is the one that raises the hero's Level. Press I, equip the bow with Enter, press Q to switch to it, and see that it has no arrows yet. Walk on to the first Ammunition cache (a few tiles further), open it, and shoot with Space. Let the hero be defeated and start again at the Checkpoint: the monster is back, is not at once at the hero, and gives nothing a second time when it is defeated.

## Comments

Added at the player's request ("can we move the bow to the beginning of the second level (like on a dead monster or something)"). Decided with the player: a weak monster just inside the way into the woods carries the bow and drops it when it is defeated. Spec story 110, the Gear bullet, the Testing Decisions and Further Notes of the spec were amended to match. Stories 68 (the bow as a rewarding discovery) and 71 (Gear mainly from chests and milestones, with occasional monster drops) still hold: a carried bow is a drop that is placed by design.

Assumed, not decided with the player: which monster it is. The spec's default is one of the weak ones that the woods already have, moved to the start, so that the Experience on offer does not change and no new art is needed. The wolf (two hits, notices the hero from 5 tiles) is the quicker fight; the slime (six hits, notices from 3 tiles, slow) the gentler. Also assumed: the monster leaves no arrows; the Ammunition stays in the caches, a few tiles further, so the hero meets the bow first and the arrows second. Also not decided: whether the player is given any sign that this monster carries something (a short line in the woods' text, which is limited to 60 letters, is one way). Without one, the bow is a surprise; the implementer may leave it out.

For the implementer:

- A placed monster has per-placement data (`MonsterPlacement` in `src/core/definitions.ts`). The drops of a monster kind (`DropDefinition`, the same file) are for consumables and are rolled for the kind, so the carried Gear belongs on the placement. A defeat goes through `src/core/monster-damage.ts` (it calls `rollDrops` in `src/core/drops.ts`), and a hero takes Gear through `grantGear` in `src/core/gear.ts`, which sends the event the notice reads (`notice.ts`, "press I to equip"). Giving it after the Experience events, where a drop's pick-up is sent, keeps the order of the events of a defeat that the tests know.
- The loader counts the places that give each Gear in `claimGear` in `src/core/content.ts`; a carrier has to be counted there. Monsters are checked a little further down in the same file.
- The woods are in `src/content/areas/woods.ts`: the way in is column 1, row 14, the bow chest `bow-chest` is the one that has to go, and the Ammunition caches `arrow-cache-1` and `arrow-cache-2` stay. The monsters now there are `woods-wolf-1`, `woods-slime-1`, `woods-spitter-1`, `woods-boar-1`, `woods-wolf-2` and `woods-slime-2`. The first sand of the trail runs along rows 14 and 15.
- `tests/the-woods.test.ts` has the three tests about the bow chest (the first third of the trail, the caches after it, the walk). `tests/main-route.ts` reads the finds of the route hero from `interactables` only (`findsOf`), so a bow carried by a monster has to be counted at the monster's tile there; otherwise the fight tables, `route-supplies.ts` and `play-time.ts` lose the route hero's bow. Other users of `bow-chest` (`weapons.test.ts`, `save-round-trip.test.ts`, `saved-adventure.ts`, `saved-game-walks.test.ts`) build their own content and need no change.
- Saves: `checkInteractables` in `src/adapter/saved-game.ts` refuses a saved interactable that the area does not have, which is how every save from before this ticket becomes "from another version". Players lose such a save (a new game replaces it), so tell the player in the report.
- A defeat that raises the hero's Level opens the level-up choice in the same moment as the bow's notice shows; look at that, so that the notice is not lost behind it.
- Ticket 27 changes how the page keys are held (the notice asks `pageKeyLabel` for the inventory's key). This ticket does not depend on it; whichever comes second takes the change of the other.
- The numbers in `docs/balance.md` (the supply ledgers, "the Short Bow one tile off") count where the bow is taken and may move by a few tiles.

Built on `ticket/30-bow-carried-by-a-woods-monster`, from the integration tip 4c16657, which is still the tip. The Status is untouched. Criteria 1 to 13 are ticked on what I verified (below); criterion 14, the reviewer play check, is left unticked. Three slices, each committed when green: the mechanism `66fbf8b`, the woods `6182085`, the notice behind a level-up `5d6d699`.

**A save made before this ticket stops loading.** It holds the bow chest that the woods no longer have, so the title says that it is from another version and a New Game replaces it. That includes the player's playtest save.

### What was built

- **The mechanism.** `MonsterPlacement.carries` (`src/core/definitions.ts`) names one piece of Gear. `takeCarriedGear` (`src/core/gear.ts`) gives it with `grantGear`, so the event is the `pickup` that a chest's Gear sends, and `monster-damage.ts` calls it as the last step of a defeat, after the Experience and the drops, for a strike and for an arrow alike. It gives nothing to a hero that already holds the piece, and that is all the once-only rule is: a carrier that comes back with its area after the hero's defeat hands out nothing again, and the state has no new field. No random number is drawn. The loader refuses a carried piece that does not exist (the message names the monster and the Gear), and `claimGear` in `content.ts` now counts carriers beside the starting Gear and the chests, so a piece given in two places is refused.
- **The woods.** `woods-wolf-1` moved from (24,12) to (9,14) and carries `short-bow`. `bow-chest` is gone; `arrow-cache-1` and `arrow-cache-2` stay. The head comment of `woods.ts` says so.
- **The route helpers.** `findsOf` (`tests/main-route.ts`) counts carried Gear where the route meets the carrier, and `errandsOf` (`tests/play-time.ts`) counts it as found on the route with no errand seconds. The fight tables, the supply ledgers and `fights.test.ts` needed no change: the route hero has the bow where it had it.
- **The notice behind a level-up** (see Decisions): `Feedback.setWaiting` in `src/adapter/feedback.ts`, called from `play-scene.ts`.
- **Docs**, in the commits of the code they describe: the README (a bullet "Gear carried by a monster", the notice bullet, the Checkpoints rollback, "Content that a save names", the list of tests), `docs/balance.md` and `docs/playtest-checklist.md`.

### Decisions and defaults

- **The carrier is the wolf, not the slime.** The ticket assumed the slime to be the gentler fight. The fight table says the opposite: with the Basic Sword and the Basic Armor, which is what the table gives the hero on coming into the woods, the worst build loses 0 of 12 Health to a wolf, where a slime costs 2 of 10 and the coast's crab 3 of 10. The wolf has 2 Health (the spitter and the cave bat have 2 too, the crab 3, the slime 6), so the fight is one or two blows. It is a kind the woods have, so no art is new; `woods-wolf-2` still guards the cabin's key; and the Experience on offer does not move, because the wolf was on the route already. The slime is the alternative: it notices from 3 tiles, so it would stand from column 5 on. The table plays a hero that walks up and strikes. A hero that stands still beside an awake wolf takes its one blow: 3 of 10 Health in the browser (below).
- **Where.** Column 9, row 14, on the sand, eight tiles in from the way in: place 8 of the trail's 57 tiles (the first third ends at 19). The wolf notices a hero from 5.7 tiles, so one that begins again at the Checkpoint is not at once in a fight. The first cache is at place 13 and the second at 16, so the hero meets the bow first and the arrows second, both before the trail's half.
- **The grant is the last event of a defeat.** The ticket said "after the Experience events"; it also comes after the drops, because the notice tells the latest `pickup` of a frame and Gear is the one that asks for a key. A drop keeps its roll, and the Gear asks for none.
- **`SNAPSHOT_VERSION` stays 4.** The carried Gear is content; the snapshot holds the hero's Gear and nothing more, so its shape did not change.
- **Old saves.** Every save holds the state of every interactable, so each save made before this ticket holds `bow-chest`, and `checkInteractables` in `saved-game.ts` refuses it as `incompatible` ("is not an interactable of the area"). The title says "SAVED GAME CANNOT BE USED. IT IS FROM ANOTHER VERSION. A NEW GAME WILL REPLACE IT." Nothing in the saves changed. The woods test pins the refusal and the README (Saving) says so.
- **Where Gear comes from.** The ticket says "a chest, a milestone or a monster", but a milestone gives Experience only here. Gear is given by the hero's start, by chests and by carriers, and `claimGear` pairs all three.
- **No sign** tells the player that the wolf carries something (the ticket left it to me). The bow is a surprise, and the woods' text is limited to 60 letters.
- **A defeat that raises the Level** (the ticket asked me to look). The adapter ended every notice of a frame in which the game waits, and a defeat that raises the Level opens the Stat Point in the same frame as the bow's pickup, so the notice was lost. It can happen: a route hero has at most 23 Experience when it reaches the wolf, the wolf is worth 3 and the next Level is at 25. Now `Feedback.setWaiting(waiting)` takes the place of `dismissNotice()` in the scene's frame: a notice told in the very frame the wait begins is held (off the screen, its time stopped) and shows its three seconds once the point is assigned; a notice that was already showing when a page or a Stat Point opens is still ended, as before. `notice.ts` is not touched (ticket 27 changes it) and `dismissNotice` stays. A page key pressed in the very frame of a notice event holds that notice too: negligible, and the README states the rule in general terms.
- **Seams.** The tests go through the Game core's interface, `Feedback` and `gameIsWaiting` (pure adapter modules with no Phaser import), the loader through `newGame` and the saves through `parseSave`: ADR 0002 as widened by ADR 0005. No `vi.mock('phaser')`. No ADR is proposed.

### How to run it

- `npm.cmd run dev`, open the printed URL with `?debug`, press Enter on the title and on the card, then walk east along the coast and through its exit: the wolf stands on the trail eight tiles in.
- To see the notice behind a level-up, in the console take `gameCore.snapshot()`, set `state.areaId` to `'woods'`, `state.hero.position` to `{ x: 8.6, y: 14.5 }`, `state.hero.facing` to `'right'` and `state.hero.experience` to 9, then `gameCore.send({ type: 'continue', snapshot })` and strike with Space twice, half a second apart. Strike with the key, not with `send`: the events of a console `send` do not reach the scene's notice. The point is asked first; press 1, 2 or 3 and the bow's notice shows. With the Experience left as it is, the notice shows at once.
- The production build: `npm.cmd run build`, then `npx.cmd vite preview --port <port> --strictPort`.

### How it was verified

- `npm.cmd run check` on `5d6d699`, the last commit that changes code (the commit of these Comments touches only this file): typecheck OK; 137 files and 3011 tests passed (the tip has 136 and 2982: `carried-gear.test.ts` is new with 16, `feedback.test.ts` has 7 more, and `the-woods.test.ts` 6 more, net: 7 carrier tests and 2 old-save tests for the 3 bow-chest tests); build OK.
- The same check on the final head, with only this file changed since. Two full runs of it failed with test timeouts and the next two passed. The failing runs took 92 s and 99 s where the passing ones take about 30 s, and every failure was "Test timed out" (the 5 s default, or the 30 s of the walk), never an assertion: 5 tests in the first run and 9 in the second, all in `fights.test.ts`, `saved-game-sweeps.test.ts` and `saved-game-walks.test.ts`, the slowest files of the suite, which this ticket does not touch. Run alone, those three files pass (88 tests, 52 s); the whole suite run alone passed (137 files, 3011 tests, 30.6 s); and `npm.cmd run check` passed on that head (the same counts, 29.6 s, build OK). I take the cause to be a loaded machine, but I did not measure the load during the two failing runs. A reviewer who meets such a timeout should run it alone before believing it.
- The shared smoke tool on the production build (preview, port 5130): SMOKE PASS, no console or page errors.
- A throw-away Playwright script (outside the repository) on the same build, with real keys: the hero set down beside `woods-wolf-1` with 9 Experience. The first Space wounds it (2 to 1 Health), the second defeats it, and the level-up of Level 2 opens with the notice held (nothing shown, its time still at the full 3000 ms) for the 2.5 s that I waited. The key 2 assigns the point and the notice shows "FOUND SHORT BOW, +1 ATTACK, PRESS I TO EQUIP" with 2.85 s left, and is gone 3.4 s after. I looked at the two screenshots (the level-up open with no notice, and the notice after it; the coast's line at the top of the second is left over from my set-up, which moved the hero and not the area's text). With the scene's line put back to the old `dismissNotice()` in a throw-away build, the same run tells nothing after the defeat: the notice is lost, so the scene's call is what keeps it. Reverted and rebuilt, and the run is as above again. The hero was already at 7 of 10 Health when I first struck, because I set it down inside the wolf's reach and waited: that is the wolf's one blow.
- The run is a script, not hand play, so criterion 14 stays open.

### Mutation proof of the new tests

Each mutation was made by hand, the tests named were run, and the break was reverted (the tree is clean and the suite is green). Every new test was seen red under at least one.

`tests/carried-gear.test.ts` (16):

| Mutation | Went red |
| --- | --- |
| the "already holds it" guard dropped | the 2 once-only tests (the same game, and the game continued from a save) |
| given on any hit, not at the defeat | "not given before the monster is defeated" |
| the Gear of another monster looked up | "only the carrier gives it" |
| the call to `takeCarriedGear` dropped | 10 of the 16, among them the arrow, the two drops tests and the game continued from a save made before the take |
| an extra random number drawn | the 2 drops tests |
| the Gear given before the drops | "its event comes last" |
| Gear lost with the defeat | 3 tests |
| the loader's unknown-Gear check inverted | all 16 (every one builds a carrier of a known piece), the acceptance test and the unknown-Gear test among them |
| carriers not counted by `claimGear` | exactly the 3 pairing tests (a chest, another monster, the starting Gear) |

The loader's refusal tests were also seen red before the loader had a line for carriers. The test of a game continued from a save made before the take goes red only together with others (the carried Gear holds no state, so a restored game behaves as a new one): I found no break that only it detects.

`tests/the-woods.test.ts`, and the tests that follow the route:

| Mutation | Went red |
| --- | --- |
| the wolf at (28,11), past the first third | the first-third test and "the first cache after the carrier" |
| the wolf at (5,14), within its notice of the way in | the awareness test, and 2 `shipped-enemies` tests |
| `carries` taken off the wolf | the 7 carrier tests, 2 in `fights.test.ts` and 1 in `play-time.test.ts` |
| the old content (the chest back, `carries` off) | 8 woods tests, the old-save test among them |
| `checkInteractables` flagging every interactable | both old-save tests |
| `findsOf` ignoring carriers, or `errandsOf` ignoring them | 2 in `fights.test.ts`, or 1 in `play-time.test.ts` |
| the Short Bow's bonus above the Long Bow's | the cabin's "is an upgrade" test |
| the wolf's Health 30 | 3 tests |

`tests/feedback.test.ts` (the 7 new):

| Mutation | Went red |
| --- | --- |
| a notice told in the frame of the wait is ended, as before | "shows once the wait is over" and the real-core test |
| `notice()` ignoring the hold | "is off the screen while the game waits" and the real-core test |
| the time of a held notice runs | "for its whole three seconds" |
| the end of the wait does not release | the same test and the real-core test |
| a page's wait holds every notice | both "already showing" tests |
| the "fresh" mark never cleared by a frame | both "already showing" tests |
| a fresh notice held with no wait | both "shown at once" tests and both "already showing" tests |

The scene's call `setWaiting(gameIsWaiting(view))` is Phaser-bound and cannot be unit-tested; the browser run above is the proof that it can fail.

### Expectations that changed (none weakened)

- The 3 tests of the woods about the bow chest (in the first third, the caches after it, the walk) are replaced by 7 about the carrier, as criterion 9 says: the same expectations, with the wolf where the chest was. The one that walks to the carrier, defeats it, equips the bow, switches with Q and shoots after the first cache is the old walk with those steps.
- The cabin's "is an upgrade" test: the Gear that the Long Bow has to beat now includes Gear that monsters carry (wider, not looser).
- `findsOf` and `errandsOf`: extended to carried Gear.
- `docs/balance.md`: the play time's near errands of the woods 1.6 s to 1.2 s and the total 16.4 s to 16.0 s (the bow no longer costs a one-tile detour). The words to read (143 to 151) and the reading row (0.7 and 1.2 to 0.8 and 1.3) were stale before this ticket, since a fix pass changed the opening text; I reprinted them with the table.
- I planned a woods test that the shipped wolf gives the bow once after the hero's defeat, and dropped it: `carried-gear.test.ts` pins once-only on content built for the test, and criterion 14 covers the shipped wolf by hand.

### Left for manual review

- Criterion 14, the play check in a browser, as the ticket words it. In particular the first fight of the woods at full speed (the wolf's one blow if the player stands still), the notice, and the monster's return after a defeat.
- Whether the bow, with no sign that the wolf carries it, reads as the "rewarding discovery" of story 68.

### Suggestions and proposals (nothing here was acted on)

- **Glossary proposal:** Carrier (a monster placed with a piece of Gear that it gives once, when it is defeated).
- **Follow-up:** if the play check finds the bow too much of a surprise, a sign: a line in the woods' text (60 letters) or a mark on the wolf.
- **Ticket 27** changes the notice's key label (`notice.ts`) and the README's controls rows. This ticket does not touch `notice.ts`; whichever merges second takes the other's lines.

Resolved on integration/island-adventure-rpg at 40dc0da

**Superseded by ticket 32** (after the player played the build, and chose the Long Bow in the cabin as the only bow): the wolf carries nothing, the Short Bow is taken out of the game, and the mechanism that this ticket added, a monster that carries a piece of Gear (`carries`, `takeCarriedGear` and the loader's check), goes with them unless the player asks for it to stay. Spec story 110 is superseded by story 113. What this ticket built is left in the history above as it was.
