# 14: The shipwreck coast and the opening

**What to build:** Turn the first placeholder Adventure Area into the real first area, and add the opening. New Game shows a brief opening (a storm wrecked the ship on a remote island), then the hero wakes on the wrecked coast with a basic sword and armor. A few weak monsters teach the controls, at least one optional side path holds a reward, one milestone grants Experience, and an exit leads on toward the woods. The area's entrance Checkpoint is the start of the adventure. Art stays placeholder until the art tickets.

**Blocked by:** 11: Title screen, autosave, and Continue

**Status:** ready-for-agent

**Spec stories:** 7, 8, 11-14, 52, 67

- [ ] New Game shows the opening text, then begins the hero at the coast's entrance Checkpoint with the basic sword and armor.
- [ ] The coast layout is authored as content data and shaped like a wrecked coast (water and wreckage as solid terrain, a sand path). It contains the main route from the wreck to the exit toward the woods; at least one optional side path with a reward (Gear or supplies); a few weak monsters using the basic behavior; at least one chest; at least one Healing Potion pickup; one milestone; and short area text.
- [ ] The exit leads to the second placeholder area, which ticket 15 turns into the woods. Content that earlier tickets put in the first placeholder area (test chests, devices, monsters) is moved to the second placeholder area or removed, so the coast holds only intended content. Tests use purpose-built fixtures rather than shipped content; convert any test that relied on placeholder content to a fixture first.
- [ ] Content validation passes, including that the exit is reachable from the entrance without puzzles.
- [ ] Experience is tuned (data only) so the hero reaches about Level 2 by the exit on the intended route, without grinding.
- [ ] Tests at the Game core's interface confirm that New Game emits the opening, places the hero at the entrance Checkpoint, and equips the starting Gear.
- [ ] Reviewer play check (manual, in a browser): New Game, read the opening, walk the whole coast, defeat the monsters, open the chest, and take the exit.
