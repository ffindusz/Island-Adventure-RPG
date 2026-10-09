# 26: Balance and release check

**What to build:** A final pass that turns the finished pieces into a coherent 45-60 minute adventure that is ready to share. Balance is tuned through content data only, the whole route is validated end to end, the production build is checked on plain static hosting, the asset licence record and credits are completed, and the user gets a short checklist for a full playtest. Any rule change this pass reveals becomes its own new ticket rather than being slipped in here.

**Blocked by:** 21: Audio; 25: Art pass: the castle, the harbor, the Guardian, and the screens

**Status:** ready-for-agent

**Spec stories:** 20, 52, 59, 60, 66, 99, 105, 107

- [ ] Experience along the intended route gives about five level-ups: around Level 2 at the coast's exit, 3 at the woods', 4 at the mountain's, 5 at the cave's, and Level 6 by the Guardian's arena, never more than the cap of 6. A content test sums the route's Experience (monsters and milestones) against the Level thresholds, and a play-through confirms it feels right with no grinding.
- [ ] Most fights are approachable and only a few are demanding (the tougher variants and the Guardian). Weapon and armor upgrades are noticeable steps up, found on or near the route, and the Ammunition and Healing Potions along the route are enough for a player who uses them sensibly, so no one has to grind for supplies.
- [ ] A simulation or analytic check at the Game core's interface shows the Guardian can be beaten with the Levels and Gear of the intended route, both by a hero who takes only the main route's Gear and by one who also took the optional upgrades (who finds it easier), and that it is not a pushover for a hero well below the intended Level.
- [ ] A full route's length and encounter count are summed into an estimate of about 45-60 minutes for a first playthrough, with the basis recorded. The user's playtest confirms or corrects it.
- [ ] All balance numbers (damage, Health, Experience thresholds, cooldowns, drop rates) live in content data, and this pass changes data only.
- [ ] A production build, served from a plain static file server with no server component, plays from the title screen to the ending.
- [ ] The asset licence record is complete: every graphic, audio, and font asset in the build has its source, licence, date checked, and required attribution text, and every licence allows public and commercial use. A test fails if a shipped asset has no record. The credits screen shows every required attribution.
- [ ] Whole-route content validation passes: five Adventure Areas in order, valid exits in both directions, an entrance Checkpoint in every area and one immediately before the Guardian, exactly one Guardian, the harbor reachable only through it, and no key, lever, or door required on the main route.
- [ ] Regression checks hold: a corrupt or incompatible save is treated as no save without crashing, the game pauses while the browser tab is unfocused, the canvas scales with crisp pixels, and Continue after a Checkpoint reproduces the saved state.
- [ ] Every screen and control, including the audio controls from ticket 21, matches the final interface style. Any leftover is brought in line (presentation only).
- [ ] A short playtest checklist for the user is kept with the project documents. It covers the opening, each area, a defeat and its recovery, saving and Continue, optional puzzles, the Guardian, the ending and credits, and audio, and it lists the assumptions still waiting for the user's confirmation.
- [ ] Reviewer play check (manual, in a browser): the user plays the whole game once using the checklist and reports pacing, difficulty, and anything that felt unfair or confusing.

## Comments

Work in progress on `ticket/26-balance-and-release-check`, from the integration tip 744154f ("Resolve ticket 25"). The Status line is untouched; the manual play check (criterion 12) is left unticked. This section is written early and refined as the slices land; each slice is one commit.

### What was built

- **Criterion 1 (Experience along the route).** `tests\main-route.ts` reads the intended route from the shipped content (the sand trail of the woods, the mountain and the cave, any open ground on the coast and in the castle, every door shut, the castle's route ending at the Guardian's Checkpoint) and what it meets and crosses; `tests\route-experience.test.ts` sums it against the thresholds: Level 2, 3, 4, 5, 6 at the exits of the coast, woods, mountain, cave and at the arena (the route's Experience, cumulative: 15, 33, 55, 75, 104; thresholds 10, 25, 45, 70, 100). The current data already met the targets, so **no number changed for this criterion**. The play-through that "feels right" is left to the manual check.

### Decisions and defaults

- **The intended route** is the shortest walk over the designed trail, as the area tests already take it, with every door and gate shut and no key held. The castle's leg ends at the Guardian's Checkpoint (65, 11), three tiles past the end of the castle test's route (62, 11); nothing is placed between them.
