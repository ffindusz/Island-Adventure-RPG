# 05: Gear and the inventory

**What to build:** The hero starts with a basic Melee Weapon (sword) and basic armor. Chests, opened with the Interact key (E), hold Gear. The inventory page (I) lists everything the hero carries and lets the hero equip one Melee Weapon and one set of armor. Weapons raise Attack, armor raises Defense, and the stat page shows totals including Gear. There is no carry limit, and an opened chest stays opened.

**Blocked by:** 04: Experience, Levels, and the stat page

**Status:** ready-for-agent

**Spec stories:** 24, 43, 67, 70, 73-76

- [ ] A new game begins with a basic sword and basic armor equipped.
- [ ] Pressing E near a chest the hero is facing opens it once, adds its contents, and shows a brief pickup message; it cannot be opened again. Interact acts on the nearest interactable in front of the hero within reach, so later tickets can add other kinds (levers, signs, the vessel).
- [ ] The inventory page (I) lists carried Gear, lets the hero equip a Melee Weapon and armor, pauses the game, and closes with Esc.
- [ ] Attack is base plus assigned Stat Points plus the weapon's bonus; Defense is base plus assigned Stat Points plus the armor's bonus. The stat page shows these totals and combat uses them.
- [ ] Gear changes Attack or Defense only (no special abilities, no set bonuses), and upgrades to a weapon type change Attack only.
- [ ] There is no carry limit.
- [ ] Gear (name, slot, bonus) is content data. The placeholder area has a chest with a better sword and a chest with better armor.
- [ ] Tests at the Game core's interface cover opening a chest once, equipping and swapping, derived Attack and Defense, and damage with hand-worked numbers.
- [ ] Reviewer play check (manual, in a browser): open both chests, equip the upgrades from the inventory, and confirm the hero hits harder and takes less damage.
