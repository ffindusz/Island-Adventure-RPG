# 06: The bow: Ammunition and quick-switching

**What to build:** The hero can find a bow (the Ranged Weapon), switch between sword and bow on the fly with Q, and shoot in the facing direction with Space. Each shot consumes one Ammunition (one generic type with one shared count). Ammunition is found in marked caches, opened with E like a chest, and is occasionally dropped by monsters. The HUD shows the active weapon, Ammunition, and Health. Both weapons share one short attack cooldown.

**Blocked by:** 05: Gear and the inventory

**Status:** ready-for-agent

**Spec stories:** 33-35, 37-39, 45

- [ ] A bow is collectable (a chest in the placeholder area) and equippable in a Ranged Weapon slot alongside the Melee Weapon and armor slots. The inventory page lists the bow and the Ammunition count.
- [ ] Q switches the active weapon between Melee and Ranged, and Space attacks with the active weapon. Both share one cooldown; there is no stamina or mana.
- [ ] Shooting launches a projectile in the facing direction that damages the first monster it hits using Attack (including the bow's bonus), is stopped by solid terrain, and consumes exactly one Ammunition. With zero Ammunition nothing fires and the player gets clear feedback.
- [ ] Marked Ammunition caches grant Ammunition once. Monsters can occasionally drop Ammunition through the injectable random source; drop tables are content data.
- [ ] The HUD shows the active weapon, Ammunition, and Health.
- [ ] Tests at the Game core's interface cover switching, the shared cooldown, one Ammunition per shot, firing at zero, projectile hits and terrain blocking, one-time caches, and deterministic drops from a seeded random source.
- [ ] Reviewer play check (manual, in a browser): pick up the bow and a cache, switch with Q, shoot a monster from range, run out of Ammunition, and see the feedback.
