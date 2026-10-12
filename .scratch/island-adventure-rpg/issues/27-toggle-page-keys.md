# 27: Page keys toggle their page

**What to build:** The key that opens a page also closes it when it is pressed again: press M and the Automap opens and the game pauses; press M again and the Automap closes and the game goes on. The same holds for I (the inventory) and for the stat page, which gets Tab as a second key beside C (Tab and C both toggle it). A page key toggles only its own page. Esc keeps closing the open page and keeps declining the question whether to sail home. Each page also tells the player so: the close hint at the foot of a page names the page's own key or keys as well as Esc ("M OR ESC TO CLOSE" on the Automap, "I OR ESC TO CLOSE" on the inventory, and both C and Tab on the stat page), where it now says only "ESC TO CLOSE".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Spec stories:** 64, 73, 87, 92, 93, 108

- [ ] Pressing I, M, C, or Tab opens its page, as now. Pressing the same key again while that page is open closes it and the game goes on, with the same events as a close by Esc, so the pause, the sounds, and anything else that listens do not change.
- [ ] Tab is a second key for the stat page: Tab and C each open it and each close it, whichever of the two opened it.
- [ ] A page key does nothing while another page is open (pressing I with the Automap open leaves the Automap open), and no page opens while a Stat Point waits to be assigned or the question whether to sail home is asked, as now.
- [ ] A page that is open closes with its own key in every state in which Esc closes it, including a page restored from a save.
- [ ] Esc still closes the open page and still declines the question whether to sail home. The number keys, Enter, and the inventory's cursor keys are unchanged.
- [ ] The close hint of each page names that page's own key or keys, then Esc: "M OR ESC TO CLOSE" on the Automap, "I OR ESC TO CLOSE" on the inventory, and on the stat page both of its keys (for example "C/TAB OR ESC TO CLOSE"; the wording is the implementer's, the words OR and TO CLOSE stay). The hint is made from the same controls table that binds the keys, so a key that is changed changes the hint, and it is shown whole: it fits the width of its window (the stat page's text room is 136 pixels, which is 22 letters of the pixel font) and is not cut short. The hints that only Esc answers are not page hints and stay as they are: "ESC TO KEEP IT" on the title and "ESC TO STAY" at the question whether to sail home.
- [ ] A test, directly on the pure part of the adapter (ADR 0005), pins that the hint of every page names every key that is bound to that page and Esc, and that each hint fits the width of its window.
- [ ] The toggle rule is a rule of the Game core, not of the adapter, so that it is tested at the core's interface: the adapter only maps the keys to commands and does not read the view to decide between opening and closing.
- [ ] Tests at the Game core's interface cover: the same key opens and then closes each of the three pages; a key of another page does nothing while a page is open; no page opens while a Stat Point waits or the question whether to sail home is asked; an open page restored from a snapshot closes with its own key; after a toggle closes a page, `step()` advances the game again. The existing page tests still pass.
- [ ] Tab is registered with the keyboard and held back from the browser, so pressing it during play does not move the browser's focus away from the game. It is part of the controls table that the start-up key-clash check reads, so that no key of the audio can share it, and the test of that check gets a case for it.
- [ ] The README's controls table and its text about the pages say that I, M, and C or Tab toggle their page, and that each page's hint names its key.
- [ ] The type check, the tests, and the build pass (`npm.cmd run check`).
- [ ] Reviewer play check (manual, in a browser): press M, the map opens and the monsters stop; press M again, it closes and they move again. Do the same with I, C, and Tab. Hold M down: the map opens once and stays open. With a page open press another page's key (nothing happens) and Esc (it closes). At a level-up choice press I, M, C, and Tab (nothing opens). Press Tab during play and confirm that the browser's focus does not leave the game. Read the hint at the foot of each page: it names the key that opens the page, and the whole of it is on the screen.

## Comments

Added at the player's request during playtesting ("m and i and tab should be toggle buttons"). Decided with the player: Tab is a second key for the stat page (C keeps working), a key of another page stays ignored while a page is open (it does not switch pages), and the pages' close hints name the page's own key as well ("yes add the toggle keys as well"). Spec story 108; the key list and the Testing Decisions of the spec were amended to match.

For the implementer: the hints are drawn in three places of the adapter (the Automap page draws its own centred line, the inventory and the stat page have a text row each in the overlay); `overlay.ts` cuts text that is too long for its window, so the length of the hint on the stat page is worth a test. The page keys are one key each today (`PAGE_KEYS`), and the stat page needs two: tickets 28 and 29 build on the same table, so keep it a table of keys for each page. This ticket does not add the Controls page (ticket 28).
