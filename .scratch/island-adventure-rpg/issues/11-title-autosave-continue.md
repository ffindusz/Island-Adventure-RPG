# 11: Title screen, autosave, and Continue

**What to build:** A title screen with New Game and Continue (available only when a save exists). The game autosaves into a single browser-local save, with no account, at every Checkpoint activation and whenever the hero changes Adventure Area, and Continue restores the exact state. Starting a New Game over an existing save asks for confirmation. An unreadable or incompatible save is treated as no save, with a short message, and never crashes the game.

**Blocked by:** 10: Automap

**Status:** resolved

**Spec stories:** 1-6

- [x] The title screen offers New Game and Continue; Continue is unavailable when no save exists.
- [x] Autosave runs on Checkpoint activation and on Adventure Area change. There is one slot and no manual saving.
- [x] The Game core's snapshot covers all state so far: the hero, Level, Experience and Stat Points, Gear and equipment, Ammunition and Healing Potions, per-area world state, the most recent Checkpoint and its snapshot, and Automap discoveries. A round-trip test using a fixture that exercises every kind of state shows that restoring a snapshot reproduces the same observable state, and that a defeat after Continue behaves exactly as it would have before.
- [x] The save store is a thin adapter over browser-local storage and holds no rules; the snapshot carries a version marker.
- [x] New Game over an existing save asks for confirmation; declining leaves the save untouched.
- [x] An unreadable, corrupt, or version-mismatched save is treated as no save, the player sees a short message, and nothing crashes (tested at the save store's boundary with bad data).
- [ ] Reviewer play check (manual, in a browser): play, activate a Checkpoint, reload the page, choose Continue, and confirm the same state.

## Comments

Resolved on integration/island-adventure-rpg at b0a50b7

### What was built

- Core: unchanged. The snapshot and the `continue` command already carried all state (the Automap discoveries included). This ticket proves that with a round-trip test and keeps the saving in the adapter.
- The saved game, no Phaser: `src/adapter/saved-game.ts` (`parseSave(text, content)`, the one gate between the text in the slot and the Game core: `none`, `usable`, or `unusable` as `damaged` or `incompatible`, after a trial of the snapshot on a game of its own) and `src/adapter/save-store.ts` (`createSaveStore(storage, content)` with `read()` and `write()`, `SAVE_KEY`, and the one extra verdict `unavailable`).
- Title and autosave: `title-menu.ts` (the menu rules, no Phaser), `title-scene.ts` (`TitleScene`, drawn with ticket 22's `UiLayer` at a depth of its own, `DEPTH.title`), `autosave.ts` (`callsForSave`) and `scene-keys.ts`. Small edits in `play-scene.ts` (the saves, and the way back to the title), `index.ts` and `main.ts` (the game opens on the title, and the adapter gets the browser's storage), `player-input.ts` (`pollCancel`), `feedback.ts` and `notice.ts` (the COULD NOT SAVE THE GAME notice) and `depths.ts`.
- Tests, the first of the three exceptions of ADR 0002 (the parser and the store, tested through their own public functions with in-memory fakes): 268 new tests in 5 files, with the fixture `tests/saved-adventure.ts` (a script of chapters that exercises every kind of state). `save-round-trip.test.ts` (42) is at the Game core's interface, `saved-game.test.ts` (179) judges hand-made saves, `saved-game-sweeps.test.ts` (27) damages a full saved adventure at every place of it, `saved-game-walks.test.ts` (5) plays a hero that does anything at all, `save-store.test.ts` (15) tests the store over a storage that can fail. The title menu, the autosave rule and the scenes have no automated tests, as the agreement says.
- README: the new section "Saving, Continue and the title", the title rows of the controls, the layout, and the notes on how to look at the game (press Enter on the title first).
- Smoke tool (`.worktrees/_tools`, outside git): a `reload[:ms]` token in `--keys` and a `--init "<js>"` flag, with a fixture and 3 new self-test cases (26 ok, 78 s), and the README of the tool says that the game now starts on the title.

### Decisions and defaults

- **Every New Game saves at once.** The start counts as the first Checkpoint but reports no event, so `PlayScene` is started with `saveAtOnce`. Without it, a tab closed right after a confirmed New Game would bring the old save back.
- **The autosave rule** (`callsForSave`): a frame whose events hold `checkpoint-activated` or `area-changed` saves, once, as the game stands at the end of the frame and before the defeat early-return, so a defeat that returns the hero to a Checkpoint in another area is saved too. Continue and the title never save. The slot holds the game as at the last Checkpoint or area change, not as it is now.
- **One slot, one key.** The saved game is the JSON text of one Snapshot (`{ version: 1, state }`) under the localStorage key `island-adventure-rpg:saved-game`. The store never removes a save.
- **Held keys are input, not state.** They are not in a Snapshot, `continue` clears them, and a restored game stands still until a key goes down.
- **New Game over a save asks first** (REPLACE THE SAVED GAME?, Enter replaces it, Esc keeps it, nothing is written before Enter), and a confirmed one overwrites the save at once. Over a save the game cannot use it asks nothing: there is nothing to keep.
- **Continue is greyed and cannot be selected without a usable save.** The cursor starts on Continue when there is one and on New Game otherwise. Keys: Up and Down or W and S, Enter, Esc.
- **A bad save** is treated as no save. Text that is not a snapshot (a field missing, extra or of the wrong kind, a position outside its area, and so on) is `damaged`; another `version`, or ids that this build's content lacks (an area, a piece of gear, a monster, a placed chest), is `incompatible`; a snapshot that passes the checks but cannot be played in the trial is `damaged`. The title greys Continue, shows a short message (THE SAVED GAME IS DAMAGED. A NEW GAME WILL REPLACE IT. or SAVED GAME CANNOT BE USED. IT IS FROM ANOTHER VERSION. A NEW GAME WILL REPLACE IT.) and the console gets a warning with the detail. The bad save stays in the slot until the next autosave overwrites it.
- **No storage** (blocked, or reading it throws): the title says SAVING IS NOT AVAILABLE and PROGRESS WILL NOT BE KEPT., and the game can be played.
- **A failed write** (full, blocked): the game goes on and the earlier save stays. The notice COULD NOT SAVE THE GAME shows in the warning colour and replaces the Checkpoint notice of that frame. With no storage at all it shows at each autosave attempt, although the title already said so.
- **No try/catch around `continue` in the title scene**: the trial in `parseSave` guards it. `read()` has a safety net as well: if the checks themselves throw in a way nobody foresaw, the answer is `damaged`, so the title always comes up.
- **After the ending** (ticket 20) the last autosave stays untouched. `PlayScene` hands over to the title when the core's view says `title`.
- **The title is black on purpose**: the pack has no title art. It is a `UiLayer` window (heading in `INK.title`, hints in `INK.hint`) and every character it shows is in the 5 by 7 font, so no glyph was added.

### How to run it

- `npm.cmd run dev`, press Enter on the title: the game starts and saves at once (look at `localStorage` in the developer tools). Walk east through the exit: another save. Reload: Continue is highlighted and Enter goes on from the last save. Down and Enter on New Game asks REPLACE THE SAVED GAME?; Esc keeps the save.
- A bad save: `localStorage.setItem('island-adventure-rpg:saved-game', '{')` in the console, then reload.
- `?debug` exposes `window.gameCore`. On the title `gameCore.view()` is `{ phase: 'title' }` and `snapshot()` throws: press Enter first.
- `npx.cmd vitest run tests/saved-game.test.ts tests/saved-game-sweeps.test.ts tests/saved-game-walks.test.ts tests/save-store.test.ts tests/save-round-trip.test.ts` runs the new tests alone; `npm.cmd run check` is the gate.

### How it was verified

- `npm.cmd run check`: typecheck exit 0, 1084 of 1084 tests in 51 files (the base, `736091c`, had 816 in 46), build OK. Every slice was written test-first and committed when green: the round-trip fixture, the parser, the store, the sweeps, the merge of ticket 22, the adapter, and a rewording of one message.
- Mutation checks of the new tests (every test was proven by breaking the source, seeing it go red and reverting; none committed). A scratch harness ran 288 mutants of `saved-game.ts` and `save-store.ts`: 285 killed, 3 survivors that are equivalent. #244 gives the trial `{ version: 1, state }` built from the snapshot's own two fields instead of the snapshot, the same value, because the checks refuse any other field. #265 and #266 remove the `storage === null` guards of `read()` and `write()`: `null.getItem` throws a TypeError that the next `catch` turns into the same answer. The campaign led to the hardening commit `6f8af99`: more rows in `saved-game.test.ts`, the sweeps, and the store's safety net. The harness was deleted.
- Smoke (shared tool, production build served by `vite preview` on 5111, every run with 0 console errors, 0 page errors and 0 failed requests (no art file is missing); every screenshot looked at, kept in `.worktrees/_notes/t11-smoke-*.png`):
  - The title with no save (Continue greyed); Down, Down, S and Enter then start a New Game, not Continue; the play scene after Enter, with a save written at once that equals the live state.
  - After a reload, the title with a save (cursor on Continue); the confirmation; Esc keeps the save (seeded with health 7 and the hero at (6.5, 6.5), intact afterwards); Enter replaces it with a fresh game; Continue restores health 7 at (6.5, 6.5) and writes nothing.
  - A damaged save, an incompatible save and unavailable storage, each with its message and Continue greyed; a New Game over a damaged save replaces it with a valid one. Play with unavailable storage and with failing writes shows the notice and goes on.
  - Autosave on an area change (the saved area is `overgrown-trail` at its entrance while the live hero had walked on; reload and Continue returned to it); autosave on a Checkpoint alone (back on the coast, the saved Checkpoint stayed on the trail until the hero touched the coast's, then the saved Checkpoint was the coast's and the saved hero stood at x 5.3 while the live hero had gone on to x 1.4). With `checkpoint-activated` removed from `callsForSave` (rebuilt, run, reverted, rebuilt) the saved Checkpoint stayed on the trail and the hero at x 18.5, so that run tells the two branches apart.
  - A hop to the title (the core's view overridden to say `title`) shows the title, and Continue restores the last autosave, not the live state; the production URL without `?debug` plays; keys right after the title's Enter work, and the page has focus after a reload.

### Left for manual review

- The reviewer play check (the last criterion): play, activate a Checkpoint, reload, choose Continue, and confirm the same state. I drove it with the smoke tool (`reload`, `--init`) and looked at the screenshots, but not by hand, nor in a headed browser.
- How the title reads in a real window at other sizes, and storage that is really blocked (private mode, a policy): I simulated it with `--init`.

### Suggestions for other tickets

- Tickets 13 and 14, and any ticket that changes the saved state: bump `SNAPSHOT_VERSION` and the literal `1` of `Snapshot.version` in `src/core/interface.ts`, and extend the checks in `saved-game.ts` and the fixture `tests/saved-adventure.ts` in the same commit (the sweeps and the round trip go red until then). A new kind of interactable (ticket 13's devices) also needs `FLAG_OF` and `checkInteractables`. The README section says so.
- Ticket 20 (the ending): `PlayScene.create()` resets `drawnAreaId`, `lastPlaying` and `fall`, but not `fadingOut`, `clock`, `feedback` or `inventoryMenu`. The way back to the title was verified only by overriding `gameCore.view` in the console, because nothing in the game returns to the title yet: check that a play scene started a second time begins clean. Decide there whether the ending keeps the last autosave (it does now; the store has no way to remove a save on purpose).
- Ticket 21 (audio): the first key press of a session is Enter on the title, which is the user gesture a browser needs before audio can start; `TitleScene` is the place to start it.
- The art pass: `gear-short-bow.png` is requested twice, under the keys `'bow-held'` and `'gear-short-bow'` in `src/adapter/artwork.ts`. This was there before this ticket (a run makes 16 requests, 15 distinct, and none after Enter).
- Polish: with no storage at all the COULD NOT SAVE THE GAME notice shows at each autosave attempt, after the title already said so. It could show once.
- Glossary: save (the saved game), autosave, title screen and Continue are used in the code and the README and have no entry, nor do Page and Area Text (both are state fields).
- Proposed ADR (not created): "Pure, Phaser-free adapter functions may be tested directly", as ticket 10 proposed (the camera, the banner and the Automap layout already are). `pressMenu` and `callsForSave` are two more such functions; today only the smoke tool covers them.
