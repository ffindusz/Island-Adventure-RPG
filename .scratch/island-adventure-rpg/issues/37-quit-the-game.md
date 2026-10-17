# 37: Quit the game from the title and the paused screen (desktop app)

**What to build:** After the desktop build the player asked for a way to quit the game. In the desktop app the menu of the title and of the paused screen end with QUIT, under CONTROLS, and choosing it closes the app: at once from the title, where nothing is in play and the saved game is in the slot, and after a question from the paused screen, where the game in play is lost. A browser page cannot close a tab it did not open, so the browser build has no QUIT and looks as it did. All of it is the adapter's and the composition root's: nothing in `src/core` changes, and Quit saves nothing.

**Blocked by:** None (can start immediately)

**Status:** resolved

**Spec stories:** 118, 116

- [x] Nothing in `src/core` changes, and `SNAPSHOT_VERSION` stays 4.
- [x] The menu rules (`src/adapter/title-menu.ts`): `openMenu` takes whether the app can quit, and a menu that can has `canQuit: true`; `menuEntries` and `selectableEntries` put `quit` under the other lines only then. Enter on Quit chooses `quit` on the title, and on the paused screen opens the question, whose Enter chooses `quit` and whose Esc goes back to the paused menu with the cursor on Quit. The question is about the line the cursor is on, so the question of a New Game is as it was. The menu without Quit is as it was: `tests/title-menu.test.ts` and `tests/paused-title-menu.test.ts` pass without an edit.
- [x] The window (`src/adapter/title-window.ts`): QUIT under CONTROLS; the lines of a menu with Quit are 13 high instead of 15, so that the title with a message (139) and the paused menu (137) fit the 139 above the line of the audio. The question: QUIT THE GAME?, THE GAME IN PLAY IS LOST., THE SAVED GAME IS KEPT. when there is a saved game to continue from, ENTER TO QUIT, ESC TO KEEP THE GAME. The windows without Quit are as they were: `tests/title-window.test.ts` and `tests/paused-title-window.test.ts` pass without an edit.
- [x] `tests/quit-title.test.ts` pins the rules and the windows with Quit, with the numbers worked out by hand.
- [x] The wiring: `startAdapter` takes a `quit` function or null and hands it to `TitleScene`, which offers Quit only when it has one and calls it when Quit is chosen. `src/main.ts` gives one when `isTauri()`, which closes the window with `getCurrentWindow().close()` from `@tauri-apps/api` 2.12.1; `src-tauri/capabilities/default.json` allows `core:window:allow-close`.
- [x] ADR 0006 is amended, the README says it (Desktop build, Controls, Saving, Continue and the title), and spec story 118 is written.
- [x] Play check in the desktop app (`npm run desktop:dev`, or the built program): QUIT shows at the foot of the title and closes the app; Esc in play, QUIT asks, Esc keeps the game, Enter closes the app; the next start continues from the last autosave. In the browser (`npm run dev`) there is no QUIT.

## Comments

Added at the player's request after the Windows desktop build: "small thing: we should add a possibility to quit the game". Quit is the desktop app's alone because a page cannot close its browser tab.

### Play check

Made by the player on 2026-10-17 in the 1.1.0 desktop build: the player said "works!". There is no step-by-step log; the box above was ticked on the player's word.
