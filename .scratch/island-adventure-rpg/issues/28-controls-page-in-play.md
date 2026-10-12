# 28: A Controls page in play

**What to build:** The player can look up every key of the game without leaving it. Press H during play and a Controls page opens over the game and the game pauses, like the inventory, the Automap and the stat page; press H again, or Esc, and the page closes and the game goes on. The page lists every key the game answers to, each with what it does in a few plain words, and it says how to close itself. The list is made from the same tables that bind the keys, so it cannot disagree with them: a key that is changed or added there changes the page.

**Blocked by:** 27: Page keys toggle their page

**Status:** ready-for-agent

**Spec stories:** 92, 93, 108, 109

- [ ] H opens the Controls page and the game waits: nothing moves and no time passes until it closes. H pressed again closes it, with the same events as a close by Esc, and the game goes on. Esc closes it too.
- [ ] The Controls page is a page of the Game core like the other three, so that every page rule applies to it and is tested at the core's interface: it opens only when no other page is open, no level-up choice waits and the question whether to sail home is not asked; another page's key does nothing while it is open; a page restored from a snapshot with it open closes with H and with Esc. What the page lists is the adapter's business, because the core knows no keys.
- [ ] The page lists every key the game answers to, each with what it does, in the capital letters of the pixel font: walking (W A S D or the arrow keys), attacking (Space), switching weapon (Q), interacting (E: open, pull, read, sail), the inventory (I), the Automap (M), the stat page (C or Tab), this page (H), picking a line and equipping (Enter), closing a page (Esc), putting a Stat Point into Health, Attack or Defense (1, 2, 3), turning the sound off and on (N), and the volume (- and +). The wording is the implementer's; the keys are the keys of the controls tables. The page says how to close itself in the hint of ticket 27 ("H OR ESC TO CLOSE").
- [ ] Nothing on the page is cut short or off the screen: every line is whole within the 320 x 192 screen (a second column is allowed if the list is too tall for one).
- [ ] The list is made by a pure function of the controls tables. A test directly on that function (ADR 0005) pins that every key that is bound in the tables shows on the list under the label the player reads, so that a key added to a table without a line on the page fails the test, and that every line of the list fits the window it is drawn in.
- [ ] H is in the controls tables, so the start-up key-clash check reads it and no key of the audio may share it; the test of the check gets a case for it. H does not hold back the browser's own shortcuts, like the other page keys.
- [ ] Opening and closing the page are heard like the other pages (the same events, the same sounds).
- [ ] Saves: a snapshot with the Controls page open passes the saved-game checks, and a save made before this ticket still loads. `SNAPSHOT_VERSION` is raised only if the saved shape of the state changed (a page that is open is saved as its id, so a new id alone does not change the shape); the comments of the ticket say which was chosen.
- [ ] The README's controls table gets the H row and its text about the pages lists the Controls page; `docs/playtest-checklist.md` gets a line for it.
- [ ] The type check, the tests, and the build pass (`npm.cmd run check`).
- [ ] Reviewer play check (manual, in a browser): during play press H, the page opens, the monsters stop and every line of the list is whole; press H again, it closes and they move again; open it and press Esc, it closes. With it open press I, M, C, and Tab (nothing opens). At a level-up choice press H (nothing opens). Press each key on the list and see that it does what the page says.

## Comments

Added at the player's request during playtesting ("we should add all the keyboard shortcuts somewhere for the user"). Decided with the player: the shortcuts are shown in play and on the title screen (ticket 29 is the title). Spec story 109; the key list, the pause rule and the Testing Decisions of the spec were amended to match.

Assumed, not decided with the player: H is the key (it was free: the keys taken are W A S D, the arrows, Space, Q, E, I, M, C, Tab, Enter, Esc, the number keys, N, - and +). Not decided: whether the opening card or the HUD should say once that H shows the controls. It is left out: the Controls line on the title (ticket 29) is how a player finds the page, and the player can say if that is too little.

For the implementer: `src/adapter/controls.ts` holds the tables and the labels (`PAGE_KEYS`, `STAT_KEYS`, `AUDIO_KEYS` and the rest), and `keysOfEverythingElse` feeds the start-up check. The list wants a table of what each key does beside the keys, so that the check and the page both read it. The Controls page is a core page: `PAGE_IDS` (`src/core/state.ts`) and the view's page union get it, and the core has nothing to show for it but that it is open (`saved-game.ts` checks a saved page against `PAGE_IDS`). Ticket 29 draws the same list on the title screen, so make the list something the title can use too.
