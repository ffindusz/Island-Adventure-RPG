# 16: The mountain

**What to build:** Turn the stub into the real mountain, and add a minimal stub for the cave so the route stays connected. Mountain raiders hold narrow passes and ledges, one of the few demanding fights lies on the main route, and an armor upgrade waits near it. Art stays placeholder until the art tickets.

**Blocked by:** 15: The woods

**Status:** ready-for-agent

**Spec stories:** 9-11, 50, 52, 69

- [ ] The mountain has an entrance Checkpoint, an exit back to the woods, and an exit forward to a minimal stub area (entrance, Checkpoint, return exit) that ticket 17 turns into the cave.
- [ ] The layout uses solid terrain (cliffs, boulders) for narrow passes and ledges, with at least one optional side path with a reward.
- [ ] Mountain raiders use the basic, charger, and ranged behaviors, including at least one tougher variant guarding the main route as a demanding fight.
- [ ] An armor upgrade is in a chest on or near the main route, with Ammunition caches and Healing Potions placed so ranged play and recovery stay meaningful.
- [ ] The area has one milestone and short area text.
- [ ] Experience is tuned (data only) so the hero reaches about Level 4 by the exit on the intended route, without grinding.
- [ ] Content validation passes, including that the main route is reachable without puzzles.
- [ ] Tests at the Game core's interface load the shipped mountain content and confirm that validation passes, the main route is walkable from entrance to exit without a key or lever, an armor upgrade is reachable on or near that route, and the Experience reachable on the intended route to this exit meets the Level target.
- [ ] Reviewer play check (manual, in a browser): climb from the woods, beat the raiders and the tougher variant, collect the armor, and leave through the forward exit.
