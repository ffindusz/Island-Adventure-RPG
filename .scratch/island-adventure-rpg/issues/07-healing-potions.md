# 07: Healing Potions

**What to build:** Healing Potions can be found (in chests, as loose pickups the hero walks over, and as occasional monster drops) and are carried as a count. The player uses them from the paused inventory page to restore Health up to the maximum, and the HUD shows the count. There is no passive regeneration, so potions and Checkpoints are the only ways to recover Health.

**Blocked by:** 05: Gear and the inventory

**Status:** ready-for-agent

**Spec stories:** 38, 47, 48

- [ ] Potions can be collected from content-defined pickups (once each), from chests, and from seeded monster drops.
- [ ] Using a potion from the inventory page restores a tunable amount of Health, capped at maximum Health, and consumes it. It cannot be used at full Health or with none left.
- [ ] The HUD and the inventory page show the potion count.
- [ ] Health never regenerates on its own (covered by a test).
- [ ] Tests at the Game core's interface cover collection, use, the cap, refusal at full Health and with none, and seeded drops.
- [ ] Reviewer play check (manual, in a browser): take damage, open the inventory, use a potion, and confirm the Health and the count.
