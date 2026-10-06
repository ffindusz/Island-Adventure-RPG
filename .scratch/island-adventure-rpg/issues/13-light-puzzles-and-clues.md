# 13: Light puzzles and clues

**What to build:** Optional, light obstacles: keys found elsewhere that open locked doors, levers that open gates or side rooms, and readable clues (signs and inscriptions) read with E. The main route is never blocked by any of them, and content validation proves it. Puzzle state persists through defeat, area changes, and saves.

**Blocked by:** 11: Title screen, autosave, and Continue

**Status:** ready-for-agent

**Spec stories:** 12, 28, 29

- [ ] Keys are collectable and shown in the inventory page. A locked door opens with its matching key (default: the key is consumed). Keys and opened doors are one-time loot, not consumables, so they persist through defeat.
- [ ] Levers, used with E, toggle gates or doors. A lever's state persists through defeat, area changes, and Continue.
- [ ] Pressing E at a sign or inscription shows short clue text (content data) that does not pause play for long.
- [ ] Content validation rejects a device whose target does not exist, a key with no matching door, and any content in which an area's exit, the Checkpoints, or the route's required destinations cannot be reached without using a key, lever, or door.
- [ ] The placeholder areas include a key-and-door side room and a lever-and-gate side room that demonstrate this.
- [ ] Device state is included in the snapshot and the round-trip test from ticket 11.
- [ ] Tests at the Game core's interface cover key and door use, lever toggling, persistence through defeat and a snapshot round trip, and each validation failure.
- [ ] Reviewer play check (manual, in a browser): find a key and open its door, pull a lever, read a sign, then die, continue, and confirm the states remain.
