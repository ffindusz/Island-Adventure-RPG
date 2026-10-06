# 20: The forgotten harbor and the ending

**What to build:** The forgotten harbor beyond the Guardian, with the old vessel. Interacting with the vessel prepares it, and the hero sails home. Departing is the game's only point of no return, so it asks for confirmation. A brief ending and a credits screen follow, then the title screen. There is no postgame. Art stays placeholder until the art tickets.

**Blocked by:** 19: The Guardian

**Status:** ready-for-agent

**Spec stories:** 15, 17-19, 27

- [ ] The harbor section of the castle area (completing ticket 19's stub) contains the old vessel. Interacting with it prepares it (default: one interaction; extra fetch items are optional), and then the hero can depart.
- [ ] Departing asks for confirmation that the adventure ends. Until the player confirms, the hero can backtrack anywhere in the island; after confirming, nothing can be revisited.
- [ ] A brief ending text (earnest but light) and a credits screen follow. The credits list the game's credits and every attribution required by the licences of the assets used, taken from the asset licence record, and the screen then returns to the title.
- [ ] After the ending the session is at the title screen with no postgame. The last autosave is left untouched.
- [ ] Content validation requires exactly one vessel, and that the harbor is reachable only through the defeated Guardian.
- [ ] Tests at the Game core's interface cover that the ending is reachable only after the Guardian is defeated, that departure needs confirmation, that departure ends the session and returns to the title state, and that the save is left untouched.
- [ ] Reviewer play check (manual, in a browser): defeat the Guardian, prepare the vessel, decline the departure and backtrack, then depart, read the ending and credits, and land on the title screen.
