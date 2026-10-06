# 15: The woods

**What to build:** Turn the second placeholder Adventure Area into the real woods, reached from the coast, and add a minimal third area as a stub so the route stays connected. The woods hold forest beasts and slimes. The hero finds the bow early, followed by Ammunition caches, and an optional key-and-door side path rewards a weapon upgrade. Art stays placeholder until the art tickets.

**Blocked by:** 12: Charger and ranged enemies; 13: Light puzzles and clues; 14: The shipwreck coast and the opening

**Status:** ready-for-agent

**Spec stories:** 9-11, 50, 68, 69, 71

- [ ] The woods have an entrance Checkpoint, an exit back to the coast, and an exit forward to a minimal stub area (entrance, Checkpoint, return exit) that ticket 16 turns into the mountain.
- [ ] The bow is in a chest early in the woods, with Ammunition caches soon after.
- [ ] Forest beasts (basic and charger behaviors) and slimes (for example slow and sturdy) are data variants of existing behaviors.
- [ ] An optional side path with a key and a locked door rewards a weapon upgrade; the main route needs no key.
- [ ] The area also has Healing Potions, one milestone, and short area text.
- [ ] Experience is tuned (data only) so the hero reaches about Level 3 by the exit on the intended route, without grinding.
- [ ] Content validation passes, including that the main route is reachable without puzzles.
- [ ] Tests at the Game core's interface load the shipped woods content and confirm that validation passes, the main route is walkable from entrance to exit without using a key, the bow chest comes before the first Ammunition cache along that route, and the Experience reachable on the intended route to this exit meets the Level target.
- [ ] Reviewer play check (manual, in a browser): arrive from the coast, find the bow, use it on a beast, take the side path, and leave through the forward exit.
