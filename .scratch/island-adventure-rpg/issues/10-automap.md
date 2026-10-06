# 10: Automap

**What to build:** M opens the Automap page, pausing the game. It shows the whole island route (all Adventure Areas in order with their known connections), reveals detailed terrain only as the hero explores, marks the hero's position on the current area, and marks exits the hero has found. There are no quest markers and no map item to find. Discoveries persist through defeat.

**Blocked by:** 09: Checkpoints and defeat recovery

**Status:** ready-for-agent

**Spec stories:** 85, 87-91

- [ ] Each Adventure Area starts undiscovered. Terrain is recorded automatically as the hero explores it (a tunable reveal distance around the hero), and only then.
- [ ] The page shows every area on the route in order with its connections, highlights the current area, marks the hero's position, and marks exits that have been found. There are no quest markers.
- [ ] M opens and Esc closes the page, and the game is paused while it is open.
- [ ] Discoveries persist through defeat and Checkpoint roll-back, and are part of the Game core's serializable state.
- [ ] The Automap is driven by area content, so areas added later appear without rule changes.
- [ ] Tests at the Game core's interface cover no reveal before exploring, reveal on exploring, hero position data, exits marked only once found, and persistence through defeat.
- [ ] Reviewer play check (manual, in a browser): explore part of an area, open the map, leave and re-enter, die and return, and confirm the discoveries remain.
