# 04: Experience, Levels, and the stat page

**What to build:** Defeating monsters grants Experience, and crossing thresholds raises the hero's Level from 1 to a cap of 6. Each Level grants one Stat Point, and a level-up pauses the game so the player assigns that point to Health, Attack, or Defense (final; no respec). C opens a stat page showing Level, Experience progress, current and maximum Health, Attack, and Defense; Esc closes it. Gameplay is paused while any page or the level-up choice is open, and while the browser tab is unfocused. Content-defined milestones grant one-time Experience. This ticket introduces the reusable "one page open at a time, Esc closes it, game paused" mechanism that the inventory and Automap pages use later.

**Blocked by:** 03: Monsters fight back

**Status:** ready-for-agent

**Spec stories:** 57-65, 92, 93

- [ ] Defeating a monster grants its Experience. A monster reset by a defeat grants Experience again when re-defeated.
- [ ] A content-defined milestone trigger grants its Experience exactly once.
- [ ] Level thresholds are tunable data. The cap is Level 6, and Experience beyond the cap changes nothing.
- [ ] Each Level grants exactly one Stat Point. A level-up pauses the game and the point must be assigned before play resumes; several level-ups at once queue their choices.
- [ ] Health raises maximum Health (default: current Health rises by the same amount), Attack raises damage dealt, and Defense reduces damage received. The value gained per point is tunable data.
- [ ] The stat page (C) shows Level, Experience progress toward the next Level, current and maximum Health, Attack, and Defense; Esc closes it. Pages are one-at-a-time and reusable by later tickets.
- [ ] While a page or the level-up choice is open, stepping the Game core with elapsed time advances nothing. The adapter also stops stepping the Game core while the tab is unfocused.
- [ ] Tests at the Game core's interface cover threshold crossing, the cap, one Stat Point per Level, queued level-ups, each assignment's effect, Experience for reset monsters, milestone-once, and pausing.
- [ ] Reviewer play check (manual, in a browser): defeat monsters until a level-up, assign the point, open and close the stat page with C and Esc, and switch tabs to confirm the pause.
