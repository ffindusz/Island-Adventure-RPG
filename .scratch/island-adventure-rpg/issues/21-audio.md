# 21: Audio

**What to build:** The game gets light adventure music and essential sound effects. Music plays on the title screen, in each of the five Adventure Areas, during the Guardian fight, and at the ending. Sound effects confirm the hero's actions and the important moments. Mute and volume controls are available on the title screen and during play, and the player's choice persists in the browser. There is no voice acting.

**Blocked by:** 20: The forgotten harbor and the ending

**Status:** ready-for-agent

**Spec stories:** 45, 97, 98

- [ ] Music exists for the title screen, each Adventure Area (coast, woods, mountain, cave, old castle), the Guardian fight, and the ending. It changes when the hero changes area, when the Guardian fight begins, and when the ending starts.
- [ ] Essential sound effects exist for sword and bow attacks, a hit landing (on a monster and on the hero), a monster being defeated, any pickup, opening and closing a page and confirming a menu choice, a level-up, a Checkpoint activating, and the hero being defeated.
- [ ] Audio is driven by the Game core's events, and the core knows nothing about sound. Any event audio needs that the core does not yet emit (for example area change, Guardian engaged, ending reached) is added. Tests at the Game core's interface confirm each such event is emitted once, in the right situation.
- [ ] Mute and volume are available on the title screen and during play, using a control that does not collide with the existing keys. The choice persists in the browser separately from the saved game, so New Game and a bad save never reset it. An unreadable stored setting falls back to the defaults (tested at the settings store's boundary).
- [ ] Music starts only after the player's first input, so the browser's autoplay policy never blocks it or raises errors, and sound works normally afterward.
- [ ] Every audio asset has an entry in the asset licence record (created by whichever of tickets 02 and 21 lands first) with a licence that allows public and commercial use, and each required attribution appears in the credits screen content.
- [ ] There is no voice acting.
- [ ] Reviewer play check (manual, in a browser): play from the title screen to the ending with sound on and confirm the music changes per area and for the Guardian, each sound effect fires, mute and volume work, and the settings survive a page reload.
