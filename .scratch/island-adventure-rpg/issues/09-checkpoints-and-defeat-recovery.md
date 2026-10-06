# 09: Checkpoints and defeat recovery

**What to build:** A Checkpoint is activated by the hero touching it (the first Adventure Area's entrance is active from the start of the game). Activating one restores full Health, records a snapshot of the hero's Ammunition and Healing Potion counts and of which consumable pickups have been collected, and makes it the most recently activated Checkpoint. When the hero is defeated they return to the most recently activated Checkpoint at full Health, and the spec's defeat rules apply: growth and one-time loot persist, consumables roll back to the snapshot, and ordinary monsters reset in the Checkpoint's Adventure Area only. Every Adventure Area gets a Checkpoint at its entrance.

**Blocked by:** 06: The bow: Ammunition and quick-switching; 07: Healing Potions; 08: Connected Adventure Areas and backtracking

**Status:** ready-for-agent

**Spec stories:** 40, 49, 77-84

- [ ] Touching a Checkpoint activates it with visible feedback and restores full Health. It does not refill Ammunition.
- [ ] On defeat the hero returns to the most recently activated Checkpoint at full Health, even when the hero was in a different Adventure Area when defeated.
- [ ] These persist through defeat: Level, Experience, assigned Stat Points, all Gear, and opened chests that hold Gear and other permanent one-time rewards.
- [ ] These roll back to the Checkpoint's snapshot: Ammunition and Healing Potion counts, together with the collected state of every pickup, cache, or chest whose contents are consumables, so a consumable obtained after the Checkpoint is never lost for good.
- [ ] Ordinary monsters in the Checkpoint's Adventure Area reset; monsters defeated in other areas stay defeated. Outside a defeat, monsters defeated stay defeated when the hero backtracks.
- [ ] Each of the two placeholder areas has an entrance Checkpoint, and content validation rejects an area without one.
- [ ] Known open edge from the spec, left as is: a consumable dropped by a monster in a different area than the Checkpoint's is not restored, because that monster stays defeated.
- [ ] Tests at the Game core's interface are scenario tests in a two-area fixture with hand-worked expectations for each category (persist, roll back, reset), including a defeat in a different area than the Checkpoint's and a consumable collected after the Checkpoint becoming collectable again.
- [ ] Reviewer play check (manual, in a browser): activate a Checkpoint, spend Ammunition and a potion, collect a cache, die, and confirm what returns and what persists.
