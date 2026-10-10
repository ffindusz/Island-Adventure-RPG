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

- [ ] The title: the name of the game, New Game chosen, Continue greyed out (in a browser with no save), four hint rows.
- [ ] New Game shows the card of the opening (four lines, the last one the goal, a way home to find; ENTER TO BEGIN),
      then you wake on the coast with the banner
      "Wreckage lines the shore. Follow the beach east." Is it clear what to do in the first minute?

## The five areas, in the order of the route

In every area: is the way on clear without help? Did you get lost? Were the fights fair, and the potions and arrows
enough without grinding? Did the Level-ups come about where listed (a Stat Point each time: 1 Health, 2 Attack or
3 Defense, and the choice is final)?

- [ ] **Shipwreck Coast** (Level 2 on leaving): two crabs, the broken mast (a milestone), a chest under the hull, a
      potion on the beach. Optional: a crevice in the south wall of the bay leads to a cove with a Steel Sword and a
      potion chest.
- [ ] **The Woods** (Level 3): wolf, slime, boar (charges), spitter (shoots). The Short Bow chest is one tile off the
      trail. Optional: the cabin's key (walk onto it), its locked door and the Long Bow behind it; a Chain Mail chest
      far from the trail.
- [ ] **The Mountain** (Level 4): raiders; the veteran is the tougher fight. The Plate Armor chest is three tiles off
      the trail; a side pocket holds two chests and a guard. The only Checkpoint is at the way in, about 70 steps back.
- [ ] **The Cave** (Level 5): bat, lizard (charges), eye (shoots); the bear is the tougher fight. Optional: a lever, a
      sign and a one-tile gate lead to the Katana. The only Checkpoint is at the way in: the bear is 107 steps from
      it, the longest way back 115.
- [ ] **The Old Castle** (Level 6 by the arena): skeleton, ghoul (charges), wraith (shoots); the knight is the tougher
      fight, 65 steps from the Checkpoint (the longest way back 89). The Knight Mail lies in the armory, two tiles off
      the trail; the tower and the crypt are side paths. A Checkpoint stands in the gateway, just before the arena.

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
- [ ] Switch to another tab and back: the game paused (PAUSED), and goes on without a rush.

## The optional puzzles

- [ ] The woods' key and door; the cave's lever, sign and gate. Do the signs and the lever tell you enough?
- [ ] The cave's gate is one tile wide and has no corner assist (line up within an eighth of a tile). Fair, or fiddly?
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
and does a little of everything: 5.7 at best, 37.0 for a slow player who does every side find and puzzle. The spec
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
- [ ] **The cave's one-tile gate** has no corner assist (see "The optional puzzles").
- [ ] **The two-press departure** at the vessel (the first press prepares it, the second asks).
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
- [ ] **Old saves:** a save from an older build is refused after a change of the saved state (the version is 4 now); the
      title says so and offers New Game.
- [ ] **`?debug`** in the address bar gives the page the Game core, in a build for the public too. Keep it, or switch it
      off in a shipped build?
- [ ] **No LICENSE file** is in the repository, so the project's own code, drawings and bitmap font state no licence.
- [ ] **The tests** that read files from disk, and those that call the adapter's pure functions directly, step outside
      the test seam of ADR 0002. ADR 0005 records them and lists them for your veto; no test stands in for Phaser.
