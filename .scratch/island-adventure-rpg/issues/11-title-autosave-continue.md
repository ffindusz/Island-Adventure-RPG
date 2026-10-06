# 11: Title screen, autosave, and Continue

**What to build:** A title screen with New Game and Continue (available only when a save exists). The game autosaves into a single browser-local save, with no account, at every Checkpoint activation and whenever the hero changes Adventure Area, and Continue restores the exact state. Starting a New Game over an existing save asks for confirmation. An unreadable or incompatible save is treated as no save, with a short message, and never crashes the game.

**Blocked by:** 10: Automap

**Status:** ready-for-agent

**Spec stories:** 1-6

- [ ] The title screen offers New Game and Continue; Continue is unavailable when no save exists.
- [ ] Autosave runs on Checkpoint activation and on Adventure Area change. There is one slot and no manual saving.
- [ ] The Game core's snapshot covers all state so far: the hero, Level, Experience and Stat Points, Gear and equipment, Ammunition and Healing Potions, per-area world state, the most recent Checkpoint and its snapshot, and Automap discoveries. A round-trip test using a fixture that exercises every kind of state shows that restoring a snapshot reproduces the same observable state, and that a defeat after Continue behaves exactly as it would have before.
- [ ] The save store is a thin adapter over browser-local storage and holds no rules; the snapshot carries a version marker.
- [ ] New Game over an existing save asks for confirmation; declining leaves the save untouched.
- [ ] An unreadable, corrupt, or version-mismatched save is treated as no save, the player sees a short message, and nothing crashes (tested at the save store's boundary with bad data).
- [ ] Reviewer play check (manual, in a browser): play, activate a Checkpoint, reload the page, choose Continue, and confirm the same state.
