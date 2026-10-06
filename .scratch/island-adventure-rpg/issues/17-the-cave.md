# 17: The cave

**What to build:** Turn the stub into the real cave, and add a minimal stub for the castle so the route stays connected. Cave creatures lurk in winding but readable passages, so the Automap earns its place. An optional lever-and-gate side path rewards another weapon upgrade. Art stays placeholder until the art tickets.

**Blocked by:** 16: The mountain

**Status:** ready-for-agent

**Spec stories:** 9-11, 50, 69

- [ ] The cave has an entrance Checkpoint, an exit back to the mountain, and an exit forward to a minimal stub area (entrance, Checkpoint, return exit) that ticket 18 turns into the castle.
- [ ] The layout is a network of winding but readable passages with at least one optional side path.
- [ ] Cave creatures are data variants of existing behaviors with their own looks and stats, including a tougher variant.
- [ ] An optional lever-and-gate side path rewards a weapon upgrade (a better bow or sword); the main route needs no lever.
- [ ] The area has Ammunition caches, Healing Potions, one milestone, and short area text.
- [ ] Experience is tuned (data only) so the hero reaches about Level 5 by the exit on the intended route, without grinding.
- [ ] Content validation passes, including that the main route is reachable without puzzles.
- [ ] Tests at the Game core's interface load the shipped cave content and confirm that validation passes, the main route is walkable from entrance to exit without pulling the lever, the side path's gate opens only by its lever, and the Experience reachable on the intended route to this exit meets the Level target.
- [ ] Reviewer play check (manual, in a browser): cross the cave using the Automap, pull the lever, claim the upgrade, and leave through the forward exit.
