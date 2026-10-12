# 29: Controls on the title screen

**What to build:** The title screen's menu gets a third line, Controls, under New Game and Continue. Choosing it shows the same list of keys as the Controls page in play (ticket 28), and Esc brings the menu back with the cursor on Controls, so that a player can read every key before starting a game. The keys of the sound keep working while the list is shown, as they do on every screen.

**Blocked by:** 28: A Controls page in play

**Status:** ready-for-agent

**Spec stories:** 109

- [ ] The menu has the lines New Game, Continue and Controls, top to bottom. Controls can always be chosen, whether or not there is a saved game; Continue is still greyed when there is none. The cursor starts where it started before (on Continue when there is a saved game to continue from, otherwise on New Game), and the keys that move through the menu (W and S, the arrows) move it over the lines that can be chosen.
- [ ] Enter on Controls shows the list of keys of ticket 28: the same list from the same tables, so that the title and the page in play cannot disagree. Esc closes it, and so does Enter, and the menu is as it was with the cursor on Controls. Choosing Controls starts no game, writes no save and never asks about replacing one.
- [ ] While the list is shown nothing else of the menu answers: Enter does not start a game and the question whether to replace the saved game cannot open. The keys of the sound (N, - and +) work as they do everywhere.
- [ ] Showing and closing the list are heard as a page opening and closing, as the question whether to replace the saved game is.
- [ ] The rules are in the pure part of the title and are tested directly (ADR 0005): the cursor's start and its moves over three lines with and without a saved game; Enter on Controls shows the list; Esc and Enter close it; nothing else answers while it shows; New Game over a saved game still asks first and Esc still keeps the saved game.
- [ ] The list is whole on the 320 x 192 screen. It may take the whole screen while it shows, so long as the player can tell from it that it is the controls of the game.
- [ ] The title fits in each of its states (no saved game, a saved game, the question about replacing it, saving not available or a damaged save, and a save from another version): the window is clear of the name and above the foot of the screen, and no row of it is covered by the line of the audio. The new line makes the window 15 pixels taller, which the tallest states have no room for (see the comments), so something else gives: hints that share a row, or fewer rows of message. That is the implementer's call. The hand-worked heights in `tests/audio-line.test.ts` are updated to the rows the title draws, and no test of room is weakened.
- [ ] The README's controls table says that the title offers the list (Up and Down choose New Game, Continue or Controls; Esc and Enter close the list), and its text about the title mentions the Controls line.
- [ ] The type check, the tests, and the build pass (`npm.cmd run check`).
- [ ] Reviewer play check (manual, in a browser): open the game with no saved game and see three lines, the cursor on New Game, and Controls that can be chosen; choose it and see the list whole, press N and - while it shows (the sound answers), then Esc (the menu is back, the cursor on Controls). Do the same with a saved game (the cursor starts on Continue; New Game still asks before it replaces the save). Look at the title in each state that the README tells how to make (a damaged save, a save from another version) and see that the window, the name and the line of the audio do not overlap.

## Comments

Added at the player's request ("we should add all the keyboard shortcuts somewhere for the user"), with the answer "in play and on the title screen". Spec story 109; the spec's key list says that the title offers the list as a Controls entry in its menu.

Assumed, not decided with the player: the list is a line of the menu and not a key of its own (H opens the page in play only, and the title does not read it), and Enter closes the list as well as Esc, because Enter is how it was opened.

For the implementer: `src/adapter/title-menu.ts` is pure and holds the rules (`MENU_ENTRIES`, `openMenu`, `selectableEntries`, `pressMenu`). Its `choice` is what starts a game, so the list is better a state of the menu, like `confirming`, than a choice. `title-scene.ts` draws the rows (`rowsFor`) in a window 200 wide, which is narrower than the list will want.

The room, worked out from `tests/audio-line.test.ts` and `src/adapter/title-layout.ts`: the room under the name is 152 pixels (from row 36 to row 188), and the line of the audio in the bottom right corner begins at row 169, so the rows of the window may end there and no later, which makes 139 pixels the tallest the window can be. Today it is 102 (normal), 57 (the question), 128 (saving not available or a damaged save) and 139 (a save from another version). A third line of 15 pixels makes them 117, 57, 143 and 154: the last two are too tall, by 4 and 15 pixels. The four hint rows (7 pixels high with 4 between them) are the cheapest place to find that: two of them that share a row each give back 11.
