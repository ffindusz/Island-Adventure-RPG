# 08: Connected Adventure Areas and backtracking

**What to build:** The island is made of separate Adventure Areas, each its own map, joined by visible exits. Walking through an exit moves the hero to the connected area, arriving at the matching entrance, and the hero can go back and forth freely. Each area remembers its state: defeated monsters stay defeated, and opened chests and collected pickups stay collected when the hero backtracks. Entering an area for the first time shows its short area text without interrupting play. Content is validated when it loads.

**Blocked by:** 05: Gear and the inventory

**Status:** ready-for-agent

**Spec stories:** 10, 12, 25, 26, 53, 106

- [ ] Two connected placeholder Adventure Areas (they later grow into the coast and the woods) demonstrate exits in both directions, with the hero arriving at the matching entrance.
- [ ] Monsters defeated, and chests, Ammunition caches, and potion pickups collected, in an area stay that way after leaving and returning.
- [ ] A short area text (content data) appears on first entry only and does not pause or block play.
- [ ] The set of areas and their connections is data-driven: adding an area to the route needs only content.
- [ ] Content validation runs when content loads and rejects, with a clear message, an exit that leads nowhere or lacks a matching return exit, and an area without an entrance. Later tickets add more rules.
- [ ] Tests at the Game core's interface cover transitions and arrival positions, state memory in both areas, area text appearing once, and each validation failure.
- [ ] Reviewer play check (manual, in a browser): defeat a monster, open a chest, leave through the exit, come back, and confirm both are still done.
