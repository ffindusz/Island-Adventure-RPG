# Playtest checklist

For the one whole play of the game that only you can do (criterion 12 of ticket 26), and for the questions that are
waiting for you. Tick a box when it holds; where it does not, write beside it what you saw. The walk-through comes
first, about a page; the audio tables and the assumptions at the end are for reference. The numbers behind the game
are in `docs/balance.md`, the keys in the README.

## Before you start

- [ ] Run it: `npm.cmd run dev` and open the URL it prints, or `npm.cmd run build` and serve `dist/` with any static
      file server (the paths are relative, so a sub-folder works too; see the README, "Run it").
- [ ] The title takes about a second to come up, and keys pressed before it is there are lost. The sound starts at
      your first key press: a browser keeps a page silent until then.
- [ ] Have a stopwatch ready (see "How long it took").

## The opening

- [ ] The title: the name of the game, New Game chosen, Continue greyed out (in a browser with no save), Controls under
      them, three hint rows (the keys of the sound share the last one).
- [ ] **Controls on the title:** Controls is always there and never greyed. With no save, Down from New Game goes
      past the greyed Continue to Controls; with a save the cursor starts on Continue and Down goes on to Controls. Enter
      on it shows the list of the controls over the whole screen, headed CONTROLS, the name of the game gone, every line
      whole, with ESC OR ENTER TO CLOSE at its foot, and you hear a page open. Esc closes it, and so does Enter (try both;
      you hear a page close) and the menu is back with the cursor on Controls. While the list shows, W, S and the arrows
      do nothing and no game starts (Enter only closes it); N, - and + still change the sound.
      Is it the same list as H gives in play? It is made from the same table, so it should be, line by line. Reload after
      looking at it: no save was written, so the title is as it was (Continue still there, or still not).
- [ ] **Every title state is whole with its third line:** no save; a save; New Game over a save (REPLACE THE SAVED GAME?);
      saving not available (a browser that refuses storage); a damaged save (put `{` in the key
      `island-adventure-rpg:saved-game` and reload); and a save from another version. In each, the window stands clear of
      the name of the game, and no row of it is covered by the line of the audio at the bottom right (press N to see
      the line), and the hint `N TO MUTE   - OR + FOR VOLUME` does not look cramped. A save from another version is the
      tallest, and it is the first title you will see: the save from your earlier playtests is one, since ticket 30.
- [ ] New Game shows the card of the opening (four lines, the last one the goal, a way home to find; ENTER TO BEGIN and,
      under it in the same colour, IN PLAY, H SHOWS THE CONTROLS; the card whole, with air all round it), and H pressed at
      the card does nothing. Then you wake on the coast with the banner
      "Wreckage lines the shore. Follow the beach east." Is it clear what to do in the first minute?
- [ ] **The line H FOR CONTROLS** (after the card, and after Continue): a small panel in the middle of the top row, clear
      of the HUD at the left, of the audio line at the right (press N to see it) and of the area banner under it, from
      the first frame of play for about four seconds; then it is gone and does not come back in that game (not after a
      fall, in another area or when a page closes). Press I, M or C while it shows: it is off the screen while the page is
      open and is back, with the time it had left, when you close the page. Press H while it shows: the Controls page
      opens and the line is gone for good, also after you close the page. A pickup's notice, low on the screen, never
      meets it. Reload and choose Continue: it shows again, and so it does for the New Game that follows the credits.

## The five areas, in the order of the route

In every area: is the way on clear without help? Did you get lost? Were the fights fair, and the potions and arrows
enough without grinding? Did the Level-ups come about where listed (a Stat Point each time: 1 Health, 2 Attack or
3 Defense, and the choice is final)?

- [ ] **Shipwreck Coast** (Level 2 on leaving): two crabs, the broken mast (a milestone), a chest under the hull, a
      potion on the beach. Optional: a crevice in the south wall of the bay leads to a cove with a Steel Sword and a
      potion chest.
- [ ] **The Woods** (Level 3): wolf, slime, boar (charges), spitter (shoots). The first wolf stands on the trail, eight
      tiles in from the way in, and gives nothing; two caches of arrows lie along the trail, and the route gives no bow.
      Optional: the cabin's key (walk onto it), its locked door and the Long Bow behind it, which is the only bow of the
      game; a Chain Mail chest far from the trail.
- [ ] **The Mountain** (Level 4): raiders; the veteran is the tougher fight. The Plate Armor chest is three tiles off
      the trail; a side pocket holds two chests and a guard. The only Checkpoint is at the way in, about 70 steps back.
- [ ] **The Cave** (Level 5): bat, lizard (charges), eye (shoots); the bear is the tougher fight. Optional: a lever, a
      sign and a one-tile gate lead to the Katana. The only Checkpoint is at the way in: the bear is 107 steps from
      it, the longest way back 115.
- [ ] **The Old Castle** (Level 6 by the arena): skeleton, ghoul (charges), wraith (shoots); the knight is the tougher
      fight, 65 steps from the Checkpoint (the longest way back 89). The Knight Mail lies in the armory, two tiles off
      the trail; the tower and the crypt are side paths. A Checkpoint stands in the gateway, just before the arena.

## The pages, the bow and the potions

These keys are in the README's Controls table, and nothing above makes you press them. The hint at the foot of each
page names the keys that close it (C/TAB, I, M or H, then Esc) and is all on the screen.

- [ ] **C** (or **Tab**) opens the stat page (Level, Experience, Health, Attack, Defense) and the same key, or Esc, closes
      it. After a level-up, the stat you chose has gone up on it.
- [ ] **M** opens the Automap: every area of the route, what you have found of each, where you are and the exits you
      have found; M again, or Esc, closes it. Does it help you find the way?
- [ ] **H** opens the Controls page: every key of the game, each with what it does in a few words, and every line whole
      on the screen. The game waits behind it (the monsters stop); H again, or Esc, closes it and they move again. With
      it open, I, M, C and Tab open nothing, and at a level-up choice H opens nothing. Press each key on the list and
      see that it does what the page says. Is every word plain to you?
- [ ] **The bow:** the Long Bow in the cabin's chest is the only bow of the game. Defeat the first wolf of the woods, the
      one on the trail just inside the way in (a hero with the sword and the armor of the start beats it in a blow or
      two): nothing is given for it and no notice tells of Gear. Open a cache of arrows along the trail: the notice
      tells of the arrows, the inventory (I) holds no bow and Q does nothing. Take the key in the north woods (a wolf
      guards it), walk back to the cabin in the south-west (the sign by its door says where the key is), open the door
      and then the chest: the Long Bow goes straight to the inventory, and the notice says that you found it and to
      press I. Equip it in the inventory (I, then Enter on its line; that does not take it in hand).
      Q takes it in hand and Q again takes the sword back; Q does nothing before a bow is equipped. With the bow in
      hand, Space shoots one arrow the way you face and the Ammunition on the HUD goes down by one; with none left the
      notice says OUT OF AMMUNITION. The HUD shows the Long Bow's icon where the sword's was, and nothing in it jumps
      when you switch. Save and Continue with the bow equipped: it is still equipped.
- [ ] **A Healing Potion:** I opens the inventory (I again closes it), Down goes past the Gear to the Healing Potion
      line and Enter drinks one: Health rises by 5 at most (never above the maximum) and the count falls by one. At
      full Health nothing happens and no potion is used up.

## Pausing with Esc

Esc in play with nothing open puts the game away and shows the start screen as the paused screen (the README, "Pages and
the pause" and "Saving, Continue and the title").

- [ ] Start a New Game, let the card go and press Esc: the start screen shows PAUSED over RESUME, NEW GAME, CONTINUE and
      CONTROLS, with the cursor on RESUME (with a saved game too), the hint ENTER TO SELECT   ESC TO RESUME, the music
      of the title and nothing moving behind it. Continue is greyed with no save.
- [ ] Enter on RESUME, and also Esc (try both), brings the game back as it was: no card, the music of the place, the
      same Health, place and monsters, and the line H FOR CONTROLS only if its four seconds were not spent, with the
      time it had left.
- [ ] Pause and resume ten times in a row: every Esc works, and nothing is different after the tenth.
- [ ] Hold Esc for a few seconds on the play screen: one pause and no flicker. Hold it again on the paused screen: one
      resume and no second pause.
- [ ] Hold a walk key, press Esc, let the key go on the paused screen and resume: the hero stands still, and walks
      again when the key is pressed. Hold a key through the pause and the resume: the hero walks on, from the first
      repeat of the key. Hold up and then right so that the hero faces right, pause and resume with the keys let go: the
      hero still faces right.
- [ ] Esc with the inventory, the stat page, the Automap or the Controls page open closes it and does not pause; a
      second Esc pauses. At SAIL HOME? Esc declines it, and a second Esc pauses. With a Stat Point to assign, in the card
      of the opening and in a fall, Esc does nothing.
- [ ] On the paused screen: CONTROLS shows the list (its Esc line says PAUSE OR CLOSE A PAGE), and Esc or Enter closes it
      with the cursor on Controls and the game still paused. NEW GAME asks START A NEW GAME?, says that the game in play
      is lost (and that the saved game is replaced, when there is one); Esc goes back with RESUME still working, and
      Enter starts a new game with its card, which a later Esc pauses again. CONTINUE, after a Checkpoint, brings back
      the last autosave and asks nothing. N, - and + work.
- [ ] Sail home after a pause and a resume: the title is the normal one, with no RESUME and no PAUSED. Reload while
      paused: the normal title, and Continue gives the last autosave.
- [ ] In the Guardian's fight, if you can reach it: pause and resume, and the music of the fight is back.
- [ ] Tab away and back: the notice PAUSED of the lost focus is as it was (see "Saving and Continue"); it is not the
      paused screen.
- [ ] Does the paused screen feel like a pause, and is anything on it in the way?

## A defeat and its recovery

- [ ] Let a tougher fight (the veteran, the bear, the knight) beat you once. You wake at the last Checkpoint with full
      Health, the monsters of that area are back at full Health, and the potions and arrows are what you had there.
      Level, Gear, opened chests and solved puzzles stay. Was the way back fair, and not too long?

## Saving and Continue

- [ ] Touch a Checkpoint, reload the page and choose Continue: the same place, Health, Level, Gear and supplies. (The
      game saves at a Checkpoint, at an exit between areas and when the Guardian falls.)
- [ ] With a save, New Game asks REPLACE THE SAVED GAME? Enter replaces it, Esc keeps it.
- [ ] After the Guardian has fallen, reload and Continue: the gate is open. A Stat Point you had not spent is asked
      for again.
- [ ] Switch to another tab and back: the game paused (the notice PAUSED, not the paused screen of Esc), and goes on
      without a rush.

## The optional puzzles

- [ ] The woods' key and door; the cave's lever, sign and gate. Do the signs and the lever tell you enough?
- [ ] Walk a little off the middle into the crevice in the coast's bay, the cabin's door once it is open and the cave's
      gate once it is open, each one tile wide: the hero slides round the corner and goes in. Does it feel right, or
      does it ever take you where you did not mean to go?
- [ ] Did you find the optional Gear (Steel Sword, Chain Mail, Plate Armor, Long Bow, Katana), and was each a step up on
      the inventory page?

## The Guardian

- [ ] Each of its three patterns (sweep, charge, smite) lights a zone before it hits. Could you read each and answer?
- [ ] Demanding, and not a wall? (A bot wins at the intended Level and Gear when it answers within about 0.7 s, and a
      Level 3 hero has a much harder time. A bot is not a person.)
- [ ] A defeat puts you back at the Checkpoint before the arena, the Guardian at full Health. When it falls: GUARDIAN
      DEFEATED, THE GATE OPENED, and the way to the harbor is open.

## The ending and the credits

- [ ] At the vessel: E prepares it (THE VESSEL IS READY), E again asks SAIL HOME?, Enter sails, Esc stays.
- [ ] The ending card (four lines), the credits (one page), then the title, where Continue offers the last autosave.
- [ ] Is the tone of the four lines right? Do you want a line with your name in the credits?

## Audio

- [ ] The defaults: not muted, volume 6 of 10. N mutes and unmutes (SOUND OFF, SOUND ON); - and + (the keypad's too)
      change the volume by one step of ten (VOLUME n/10) and turn a muted sound back on. The line shows for a moment,
      at the bottom right on the title and at the top right elsewhere. The settings survive a reload.
- [ ] Listen to every track and every effect in the tables below: the right choice, the right loudness, no seam in a
      loop? To swap one, copy the new file unchanged into `public/audio/music/` or `public/audio/sfx/`, change its
      entry in `AUDIO` in `src/adapter/audio-manifest.ts`, and update `docs/assets/licences.md` in the same commit
      (`tests/shipped-audio.test.ts` stays red until the three agree). The music is OGG only: an older Safari may stay
      silent, with one console warning. The effects are WAV.

| Music (`public/audio/music/`) | File | Volume |
| --- | --- | ---: |
| Title | `intro.ogg` | 0.95 |
| Shipwreck Coast | `boat.ogg` | 1 |
| The Woods | `peaceful.ogg` | 0.43 |
| The Mountain | `ascension.ogg` | 1 |
| The Cave | `the-cave.ogg` | 0.41 |
| The Old Castle | `dark-castle.ogg` | 0.53 |
| The Guardian's fight | `fight.ogg` | 0.54 |
| Ending and credits | `end-theme.ogg` | 0.35 |

| Effect (`public/audio/sfx/`) | When | File | Volume |
| --- | --- | --- | ---: |
| `sword` | the sword strikes | `slash.wav` | 0.7 |
| `bow` | an arrow is shot | `whoosh2.wav` | 0.7 |
| `monster-hit` | a monster is hit | `hit1.wav` | 0.8 |
| `hero-hit` | the hero is hit | `hit2.wav` | 1 |
| `monster-defeated` | a monster falls | `impact5.wav` | 0.9 |
| `pickup` | something is picked up | `coin.wav` | 0.7 |
| `level-up` | a level-up | `powerup1.wav` | 1 |
| `chime` | a Checkpoint is touched; the vessel is prepared | `magic1.wav` | 0.9 |
| `hero-defeated` | the hero falls | `alert.wav` | 1 |
| `page-open` | a page opens; the question about sailing opens | `menu5.wav` | 0.6 |
| `page-close` | a page closes; the question is turned down | `menu6.wav` | 0.6 |
| `confirm` | Gear equipped; a Stat Point spent; the ending; a choice on the title | `accept3.wav` | 0.8 |
| `heal` | a Healing Potion is used | `heal.wav` | 0.8 |
| `refusal` | a locked door; no Ammunition | `cancel2.wav` | 0.7 |
| `switch` | the weapon is switched | `move3.wav` | 0.6 |
| `victory` | the Guardian falls | `bonus.wav` | 1 |

## How long it took (a question for your stopwatch)

The estimate (`docs/balance.md`, "Play time") is about **14 minutes** for a first playthrough that follows the trail
and does a little of everything: 5.6 at best, 36.5 for a slow player who does every side find and puzzle. The spec
asks for **45 to 60**. The estimate is a model with nine guesses, so criterion 4 of ticket 26 stays open until your
clock says.

- [ ] Time from the Enter of New Game to the end of the credits (leave out the time the tab was away): ______ minutes.
- [ ] Too short, about right or too long? If it is far under 45 minutes, the choice is yours: a content ticket (more
      areas, longer trails, more encounters or optional content, then the balance pass again) or a shorter target.

## What to report afterwards

- [ ] The time above, and the pacing: Level-ups too early or late, an area too long or too short.
- [ ] Any fight that felt unfair (which monster, where), and whether potions or arrows ran short.
- [ ] Any place where you got lost, and anything you missed until you were told (a chest, a clue, a path).
- [ ] How the Guardian felt, how the numbers felt overall, and how the sound felt.
- [ ] Anything that looked wrong or broke. The browser's console should stay empty.

## Assumptions still waiting for you

Tick one when you accept it as it is; otherwise write what to change.

- [ ] **Numbers made without a playtest:** the thresholds (Levels at 10, 25, 45, 70 and 100 Experience); the Guardian's
      numbers; six Healing Potions left for the Guardian, which its simulation counts on; the sound's base volumes,
      the default volume and cutting a track off instead of fading it. A bot cannot judge how a fight feels.
- [ ] **Autosave when the Guardian falls** is taken before the Stat Point is spent, so Continue asks for it again.
- [ ] **One Checkpoint** each in the mountain, the cave and the castle, plus the Guardian's (the ways back are above).
      Do you want a second one in the castle? That is a map change, and nothing was done about it.
- [ ] **The corner slide** helps the hero only, and only when its middle is already over the gap beside the corner: a
      hero whose middle is over a wall, a chest, a lever, a sign or a shut door stays flush against it, and the monsters
      get no such help. The slide goes round chests, levers, signs and shut doors and gates as it goes round rock, and
      nothing in the picture or the sound says that it happened (see "The optional puzzles"). Is that how you want it?
- [ ] **The two-press departure** at the vessel (the first press prepares it, the second asks).
- [ ] **H shows the controls:** H was free, so it is the key of the Controls page, but you have not chosen it. The game
      now says it twice and in no other place: on the card of the opening (IN PLAY, H SHOWS THE CONTROLS, under ENTER TO
      BEGIN) and in the line H FOR CONTROLS, for four seconds once play begins or continues; the title screen's Controls
      line is how the page is found before then (Enter on it shows the same list; the title does not read H itself). Is
      the line long enough, or too long, and is the middle of the top row the right place for it? Is it enough, or should
      the HUD carry the key all the time? H pressed at the card does nothing, because the card takes only Enter: should
      it open the page?
- [ ] **The Controls line on the title** is the third line of the menu, always choosable, and its list takes the whole
      screen and hides the name of the game while it shows. Esc and Enter both close it. To make room for the third
      line, the sound's hints share one row (N TO MUTE and - OR + FOR VOLUME) and a save from another version is told
      in two rows, SAVE IS FROM ANOTHER VERSION. and A NEW GAME WILL REPLACE IT.; the greyed Continue says the rest. Is
      the wording enough?
- [ ] **The paused screen** is the title's window with PAUSED and RESUME on top, and it does not tell of the saved game.
      CONTINUE on it loads the last autosave with no question, so it gives up what you did since the save; NEW GAME
      always asks. Esc at the top of it, with the cursor on any line, resumes. The line H FOR CONTROLS comes back after
      a resume with the time it had left. Should CONTINUE ask first, as NEW GAME does?
- [ ] **The Automap** joins the areas by schematic links, and draws the quay as sand. A link meets each map at the side
      where its exit is (the mountain's east edge to the cave's west edge, the cave's east edge to the castle's west
      edge, which makes two links that go round the cards): look that no link runs over a map or a name.
- [ ] **The HUD and the hero's hand** show one weapon icon for each slot, not for each piece (a piece's own icon needs a
      field of the Game core, `hero.equipped`).
- [ ] **A notice at the bottom of the view** can cover the hero in the last rows of a scrolling area. The area banner
      comes back after Continue.
- [ ] **A find rises over the hero:** the picture of what you found (a chest, a cache, a key, a potion, a drop) lifts 12
      pixels in half a second and fades, beside the notice. The size, the time and the place are a first draft made
      without a playtest; for that half second it can hide what is just above the hero, and in the top row of an area
      it leaves the screen as it fades.
- [ ] **Stand-in art:** the crab is a red mollusc, the wolf a black dog, the spitter a mushroom, the raiders pack
      ninjas and a knight, the bat reads as a droplet or a crab, and one violet orb is every monster's shot. The
      castle's skeleton, ghoul, wraith and knight, and the Guardian, are recoloured figures of the pack (no strike
      pose and no glow; the Guardian's back view is its front mirrored).
- [ ] **Composed pictures:** the wreck, the vessel and the quay are made from the pack's pieces, with what the pack lacks
      drawn by the recipe. The two backdrops are put together from pack pieces too (the title's has the pack's sea, sand,
      wreck, crab and Hunter, the ending's the pack's quay planks) under skies, a sun, gulls and a sea that the recipe
      draws. The pillars and the fountain are drawn entirely by the recipe; the logo is the project's own pixel font,
      drawn by code; the ship of the ending is a recipe drawing, and the Knight Mail's icon is drawn in code. A real
      side-view ship (candidate S4 in `docs/assets/licences.md`) needs your permission: take it?
- [ ] **Words:** the credits name no person; the four lines of the ending are a first draft; the Knight Mail was
      renamed from "Knight's Armor" so that its name fits the inventory.
- [ ] **Sound:** the music and effects were chosen by name, size and loudness, not by ear; the loop seams were not
      heard; the fight's music can outlast the fight in two cases (the hero backs out of the arena with the Guardian
      gone idle, or Continues into a fight); the first Enter on a title whose sound is still locked may lose its
      confirm sound; - and + are the keys MINUS and PLUS and the keypad's, which a non-US layout may not have. All 24
      files (13.2 MB) load before the title, with no loading bar.
- [ ] **Old saves:** a save from an older build is refused after a change of the saved state (the version is 4 now),
      after a change to the interactables of the content (ticket 30 took the bow chest out of the woods, so every save
      made before it is refused) and after a piece of Gear is taken out of the content (ticket 32 took the bow that the
      first wolf gave in the last build out of the game, so a save whose hero holds it is refused: yours is, if you took
      it). The title says SAVE IS FROM ANOTHER VERSION., greys Continue out and offers New Game (and Controls), and a New
      Game replaces it.
- [ ] **`?debug`** in the address bar gives the page the Game core, in a build for the public too. Keep it, or switch it
      off in a shipped build?
- [ ] **No LICENSE file** is in the repository, so the project's own code, drawings and bitmap font state no licence.
- [ ] **The tests** that read files from disk, and those that call the adapter's pure functions directly, step outside
      the test seam of ADR 0002. ADR 0005 records them and lists them for your veto; no test stands in for Phaser.
