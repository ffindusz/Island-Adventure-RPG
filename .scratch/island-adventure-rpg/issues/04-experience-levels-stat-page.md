# 04: Experience, Levels, and the stat page

**What to build:** Defeating monsters grants Experience, and crossing thresholds raises the hero's Level from 1 to a cap of 6. Each Level grants one Stat Point, and a level-up pauses the game so the player assigns that point to Health, Attack, or Defense (final; no respec). C opens a stat page showing Level, Experience progress, current and maximum Health, Attack, and Defense; Esc closes it. Gameplay is paused while any page or the level-up choice is open, and while the browser tab is unfocused. Content-defined milestones grant one-time Experience. This ticket introduces the reusable "one page open at a time, Esc closes it, game paused" mechanism that the inventory and Automap pages use later.

**Blocked by:** 03: Monsters fight back

**Status:** ready-for-agent

**Spec stories:** 57-65, 92, 93

- [x] Defeating a monster grants its Experience. A monster reset by a defeat grants Experience again when re-defeated.
- [x] A content-defined milestone trigger grants its Experience exactly once.
- [x] Level thresholds are tunable data. The cap is Level 6, and Experience beyond the cap changes nothing.
- [x] Each Level grants exactly one Stat Point. A level-up pauses the game and the point must be assigned before play resumes; several level-ups at once queue their choices.
- [x] Health raises maximum Health (default: current Health rises by the same amount), Attack raises damage dealt, and Defense reduces damage received. The value gained per point is tunable data.
- [x] The stat page (C) shows Level, Experience progress toward the next Level, current and maximum Health, Attack, and Defense; Esc closes it. Pages are one-at-a-time and reusable by later tickets.
- [x] While a page or the level-up choice is open, stepping the Game core with elapsed time advances nothing. The adapter also stops stepping the Game core while the tab is unfocused.
- [x] Tests at the Game core's interface cover threshold crossing, the cap, one Stat Point per Level, queued level-ups, each assignment's effect, Experience for reset monsters, milestone-once, and pausing.
- [ ] Reviewer play check (manual, in a browser): defeat monsters until a level-up, assign the point, open and close the stat page with C and Esc, and switch tabs to confirm the pause.

## Comments

### What was built

- Experience, Levels and Stat Points in the core. A monster type has `experience`; `gainExperience` (`src\core\progression.ts`) adds it up to the cap. The Level and the Stat Points still to assign are worked out from the Experience and the points already assigned, never stored. `assign-stat-point` spends one for good.
- `src\core\stats.ts` is still the one place for the hero's numbers: Health, Attack (`combat.ts` now reads it from here) and Defense all include the assigned Stat Points. It also holds the Level, the points to assign and the Experience progress.
- Pages: `page` in the state, one `open-page` and `close-page` pair that takes a `PageId` (`PAGE_IDS` in `src\core\state.ts`, only `stats` for now), and `isPaused` (`src\core\pause.ts`): a page is open or a Stat Point waits. The view carries `page` (the stat page's numbers) and `levelUp` (the choice that waits). A new page is one id, one view, one key and one drawing; the compiler points at each place and the README says where.
- Milestones: an Adventure Area lists `milestones`, each a `zone` of whole tiles and a separate `reward`. `reachMilestones` (`src\core\milestones.ts`) gives the reward the first time the hero's body overlaps the zone. The shipped rock wall gap is one.
- Adapter: `overlay.ts` draws the level-up choice, the stat page and a PAUSED notice from the view. `pixel-font.ts` is the HUD's bitmap font pulled out and given letters. `player-input.ts` maps C, Esc and 1/2/3 (keypad too). `FixedStepClock` runs no steps while the tab is unfocused or hidden.
- 72 new tests (189 in 16 files), all at the Game core's interface (ADR 0002): `experience`, `levels`, `pages`, `stat-points` and `milestones`, plus additions to the content and shipped-content checks.

### Decisions and defaults

- Level is 1 plus the number of thresholds the Experience has reached, and the points to assign are the Level less 1, less those assigned. So exactly one point per Level holds by construction, and queued level-ups are just several points waiting. The choice asks for the lowest Level first (`levelUp.level` is the Level the oldest waiting point belongs to).
- The cap: the highest Level is one more than the number of thresholds (6 for the shipped five). Experience that would pass the last threshold counts only up to it, so `experience-gained` carries the amount that counted, and a hero at the cap gains nothing and emits nothing. The stat page shows `EXP MAX` there.
- The pause is a derived predicate, not a flag. While it holds, `step` advances nothing and `attack` does nothing (and starts no cooldown). `move` and `stop` still record the keys that are down and the facing, so a key released during a pause does not walk the hero afterwards. `open-page` is ignored while paused, which makes pages one at a time. `close-page` closes only the page it names. The level-up choice cannot be dismissed.
- A step stays atomic: the step in which a milestone is reached or a monster is defeated finishes, monsters included, and the pause starts at the next step.
- The open page, and so a waiting point, is saved in the snapshot: a game continued with a page open is still paused. `SNAPSHOT_VERSION` stays 1, because nothing is saved before ticket 11 (the ticket 03 precedent).
- A Health point raises the current Health by as much as the maximum (the ticket's default), also for a hurt hero. A defeat returns the hero to the raised maximum.
- Milestone trigger (the spec does not say): a block of whole tiles in an Adventure Area that fires on the first strict overlap with the hero's body, also at the first step when the hero starts inside it. The ids reached are kept with the area in the state, so they survive a defeat and a snapshot and each fires once per game. The reward `{ experience }` is its own object, so Gear can sit beside it later. A reward of 0 is allowed; ids are unique across areas. Event order: `milestone-reached`, `experience-gained`, then each `level-up`.
- C opens the stat page and Esc closes it. C does not toggle, as the ticket words it. The new keys do not capture the browser's own shortcuts (Ctrl+C still copies).
- The adapter's pause reads `document.hasFocus() && !document.hidden` every frame, because Phaser keeps its loop running on blur and its own focus flag is unreliable. While nobody is watching, the clock runs no steps and drops the time owed, so there is no catch-up burst afterwards. Phaser clears the held keys on blur itself.
- Placeholder numbers, to tune in ticket 26: thresholds 10, 25, 45, 70 and 100 (Levels 2 to 6); a Stat Point adds +2 Health, +1 Attack or +1 Defense; a crab is worth 5; the rock wall gap (tile 10,5, 1 by 2) is worth 5. Passing the gap and defeating one crab gives Level 2.
- I found no conflict between the ticket and the spec. Not built, because it is not in the ticket: a Level or Experience indicator on the HUD.

### How to run it

- `npm.cmd run dev`. Walk right through the gap in the rock wall (+5 Experience), then defeat a crab (+5): the level-up panel opens and the game waits. Press 1, 2 or 3 (keypad too) for Health, Attack or Defense. C opens the stat page and Esc closes it. Click out of the window or switch tabs: the game waits, and shows PAUSED where the window is still visible.
- `?debug` exposes `window.gameCore`, for example `gameCore.send({ type: 'open-page', page: 'stats' })`. `npm.cmd run check` is the gate.

### How it was verified

- `npm.cmd run check`: type check exit 0, 189 of 189 tests in 16 files, build OK. Each core slice was written test-first.
- Mutation checks, each reverted afterwards: no cap on Experience (3 tests failed), a waiting Stat Point that does not pause (4), a Health point that leaves the current Health alone (4), a milestone that fires again and again (4), a threshold that needs more than its Experience (6 or more), `step` that ignores the pause (5), Attack that ignores Stat Points (the Attack, stat page and Stat Point value tests), a page that opens while a point waits (1), choices that do not queue (2), and one Stat Point too many (the game waits from the first step: 120).
- Headless Edge on `vite preview` (port 5104, now stopped), with real key presses and in-page checks (a throwaway driver kept outside the repository): C opens the page, the hero neither walks nor strikes, Esc closes it and the hero walks again; C again, or Esc with no page, changes nothing; passing the gap reaches the milestone (Experience 5); a real fight, striking a crab until it is defeated (Experience 10), opens the choice for Level 2 and nothing else moves, strikes or opens until it is answered; key 1 then raises Health to 12 and the game runs again; key 2 gives Attack and the stat page reads LEVEL 2/6, EXP 4/15, ATTACK 2. With Experience 30 injected through a `continue` snapshot two points queue ("POINTS LEFT: 2"), key 1 raises Health 10 to 12 (current too) and the next choice is for Level 3, and keypad 3 gives Defense. 0 console errors throughout.
- The pause on an unfocused tab, counting real `core.step` calls in the page: 61 steps in 1 s while focused; 0 in 1.5 s with `document.hasFocus` stubbed to false and a `blur` event; 0 in 1.5 s with `document.hidden` stubbed to true and a `visibilitychange` event; 60 a second again afterwards, with no catch-up burst; the hero stays put even with ArrowRight held.
- Screenshots viewed at the native 320 by 192 and at 3 times zoom: the level-up choice, the stat page (with its Experience bar), the PAUSED notice and the HUD read clearly. They are in the session files, not in the repository.

### Left for manual review

- The reviewer play check (the last criterion) stays unticked: how the panels and the pace feel to a person.
- The adapter half of the pause criterion is ticked on the strength of the stubbed check above. A real tab switch and a real window blur were not driven (headless Edge always reports focus and visible), so the reviewer should confirm that the game waits on a tab switch and carries on without a rush on return.
- The game also waits while the browser's devtools has focus and, if it is ever embedded in an iframe, until the player has clicked into it: `document.hasFocus()` is false there.
- Not checked: the Canvas renderer, and displays above 60 Hz.

### Suggestions

- A Level and Experience indicator on the HUD, once the look is restyled with art (ticket 22).
- GLOSSARY.md lacks milestone, page, stat page and level-up choice.
