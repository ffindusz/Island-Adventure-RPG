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
- **Criterion 3 (the Guardian can be beaten, and is not a pushover).** `tests\dodging-bot.ts` plays the fight at the Game core's interface and nothing else: it reads the view, sends player commands, and keeps to what a player sees. Each step it drinks a Healing Potion at half Health (through the inventory page, which pauses the game), steps out of any lit zone along the shortest straight run, walks up to the Guardian and strikes whenever the blow would land. Two settings stand for the player: `reactionMs`, how long it takes to act on a telegraph, and `missEvery`, one telegraph in so many goes unseen and so unanswered (the lapse; 0 is none, 1 is every one). `tests\profile-heroes.ts` puts a hero at the arena's gateway the way a save would (Level, Stat Point split, Gear, potions), in the shipped content without the ordinary monsters, and `tests\guardian-balance.test.ts` pins the relations (17 tests, about 3 s). The current numbers already met the criterion, so **no Guardian number changed**; the old "guesses for the tuning pass" comment in `monsters.ts` now says they were kept (comment only).

### Decisions and defaults

- **The intended route** is the shortest walk over the designed trail, as the area tests already take it, with every door and gate shut and no key held. The castle's leg ends at the Guardian's Checkpoint (65, 11), three tiles past the end of the castle test's route (62, 11); nothing is placed between them.
- **The reference heroes of the Guardian fight** are at Level 6 with five Stat Points spent in one of five splits (all in Attack, mostly Attack 1/3/1, balanced 2/2/1 as in the Guardian's own tests, all in Health, all in Defense). The *main-route* hero carries the Basic Sword, the Knight Mail and the Short Bow (the best of what lies within four tiles of the trail); the *optional* hero has the Katana, the Knight Mail and the Long Bow (the Steel Sword, the Chain Mail, the Long Bow and the Katana are behind side paths and puzzles). The *under-levelled* hero is Level 3 with 1/1/0 points, the Knight Mail and the Basic Sword.
- **What the tests pin, and what they only document.** The pins are relations: a hero that answers each telegraph within 600 ms is never hurt; one that misses a third of them still wins with the potions the route spares; the optional hero strikes fewer times and is never worse off than the main-route one at the same lapse; the Level 3 hero loses where the Level 6 one wins and needs more potions where both win. The measured breaking point (about 700 ms) and the damage tallies are written in `docs\balance.md`, not pinned, so a tuning that moves them by a little does not break a test.

### Assumptions

- **Six Healing Potions at the arena** (`POTIONS_SPARED`). The area tests put about 11 to 13 potions within four tiles of the trail (coast 3, woods 1 and a borderline chest, mountain 2, cave 2, castle 3); a hero that fought every monster and drank sensibly has used about half. This is the number the whole Guardian simulation leans on, and the first thing to confirm in the playtest.
- **A lapse is a fixed pattern, not chance.** `missEvery: 3` leaves every third telegraph unanswered. A person's mistakes come in bunches and at the wrong times, so this is a stand-in, chosen for being exactly repeatable. The reaction is counted from the first step of the wind-up, and the bot sees the lit zone the moment it appears.
- **The bot is melee-only.** It never shoots, so a hero who kites with the bow is not simulated; the arrows are checked as a supply instead (criterion 2). Drinking costs no game time, as in the game, where the page pauses it.
- **The hero begins at full Health at the Guardian's Checkpoint**, as after a Continue (the simulation starts from `continue` on a patched snapshot), in content without the ordinary monsters (the castle's own are not part of this fight).

### Mutation proof of the new tests

Each mutation changes data in `src\content` only, was run against the new test file alone, and was reverted with `git checkout` straight after.

| Test | Mutation | Result |
| --- | --- | --- |
| Experience (criterion 1) | boar `experience` 5 to 25 | tests 1 and 3 red |
| | coast milestone `broken-mast` reward 5 to 0 | test 1 red |
| | a sixth threshold, `[10, 25, 45, 70, 100, 140]` | test 2 red |
| | `mountain-raider-3` type `raider` to `raider-veteran` | test 3 red |
| | castle milestone `great-gateway` moved to `{col 80, row 7, 1x1}` | test 4 red |
| Unhurt within 600 ms (criterion 3) | smite wind-up 1100 to 400 ms | 8 red, including all six "unhurt" tests |
| Every pattern hits | the sweep removed from the Guardian's patterns | that test red (and, through the changed turn of the patterns, the all-Health and all-Defense "falls to" tests) |
| | sweep reach 1.4 to 0.2 | **survives**: the Guardian walks up against a hero who never answers, so the sweep still lands; an equivalent mutant, not a gap |
| | charge `dashRange` 7 to 0 | not reachable: content validation rejects it before the test runs |
| Wins at one in three | the three patterns' damage times four | all five "falls to" tests red |
| Katana is easier | Katana bonus 2 to 0 | the three Katana tests red, and nothing else |
| Not a pushover | Guardian Health 100 to 30 | "no pushover" and "needs more potions" red (and, as side effects, "every pattern hits" and the mostly-Attack and all-Attack Katana tests, because the shortened fight has too few telegraphs to hurt anyone) |
