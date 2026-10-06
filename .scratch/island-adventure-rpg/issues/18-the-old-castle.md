# 18: The old castle

**What to build:** Turn the stub into the real old castle, up to the end of its route. The undead hold its courtyards and halls, supplies and an armor upgrade prepare the hero for the final fight, and the route ends at a plain wall where the next ticket adds the Guardian's arena. The castle is the fifth and last Adventure Area; its forgotten harbor is part of the same area and arrives in the next two tickets. Art stays placeholder until the art tickets.

**Blocked by:** 17: The cave

**Status:** ready-for-agent

**Spec stories:** 9-11, 15, 50, 69

- [ ] The castle has an entrance Checkpoint and an exit back to the cave. The layout covers courtyards and halls with at least one optional side path.
- [ ] Castle undead are data variants of existing behaviors, including a tougher variant.
- [ ] An armor upgrade, plus Ammunition caches and Healing Potions, are placed so the hero can prepare for the final fight.
- [ ] The area has one milestone and short area text.
- [ ] The route ends at a plain wall that ticket 19 replaces with the way to the Guardian's arena.
- [ ] Experience is tuned (data only) so the hero reaches about Level 6 by the end of the route on the intended route, without grinding.
- [ ] Content validation passes, including that the main route is reachable without puzzles, and that the five Adventure Areas connect in order: coast, woods, mountain, cave, castle.
- [ ] Tests at the Game core's interface load the shipped castle content and confirm that validation passes, the five Adventure Areas connect in order, the main route is walkable from the entrance to the end of the route without any puzzle, and the Experience reachable on the intended route meets the Level 6 target.
- [ ] Reviewer play check (manual, in a browser): arrive from the cave, clear the castle, collect the upgrade, and reach the end of the route.
