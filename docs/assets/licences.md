# Asset licence record

The single record of every graphics, audio, and font asset the game uses or has considered: its source, its licence, the date the licence was checked, and the attribution text the credits screen shows.

How it is used:

- Later art and audio tickets extend this file. A ticket that copies an asset file into the repository adds or updates that asset's entry in the same commit. Nothing is copied in without an entry whose status is "In use".
- The credits screen draws from the "Credits text" lines of entries that are "In use".
- Rule from the spec: every graphics and audio asset must permit public and commercial use.

Last updated: 2026-10-09. The user approved the Ninja Adventure pack as the art base on 2026-10-07 (ADR 0004). Ticket 22 copied the first asset files into the repository (the hero, its weapons, the item icons and the pieces of the HUD and the windows; see A1 "Used so far"). Ticket 13 added the icon of the key, ticket 15 the icon of the Long Bow, and ticket 17 the icon of the Katana. Ticket 23 added the final art of the shipwreck coast and the woods, the pictures every area shares (chests and caches, pickups, Checkpoints, exits, signs and doors), and the icons of the two bows, turned upright; all are composed from pieces of the pack by `docs\assets\compose-art.py`. Ticket 24 added the cliffs and the boulders of the mountain, the dim floor of the cave, the raiders and creatures of the two, and the gate and the lever that every area shares, composed the same way. Ticket 21 added the music and the sound effects, copied unchanged from the pack into `public\audio\` (see A1 "Used so far (ticket 21, audio)"). Nothing else is in use yet.

## Summary

| ID | Source | Licence | Checked | Status |
| --- | --- | --- | --- | --- |
| A1 | Ninja Adventure Asset Pack: art, audio, and the other files | CC0 1.0 Universal | 2026-10-06, re-read 2026-10-07 | Approved base on 2026-10-07 (ADR 0004); in use: the hero, its weapons, the item icons and the interface pieces (ticket 22), the key icon (ticket 13), the Long Bow icon (ticket 15), the Katana icon (ticket 17), and the terrain and the monsters of the shipwreck coast and the woods, the upright icons of the two bows, and the chests, pickups, Checkpoints, exits, signs and doors of every area, composed from pack pieces (ticket 23), and the cliffs, boulders and dim floor of the mountain and the cave, and the raiders and creatures that live there, and the gate and the lever of every area, composed from pack pieces (ticket 24), and the music and the sound effects, copied from the pack (ticket 21) |
| A2 | Ninja Adventure `Ui\Font\NormalFont.ttf` | FontStruct Non-Commercial License (embedded in the font file), conflicting with the pack's CC0 claim | 2026-10-07 | Do not use; replaced by the project's own bitmap font, which is no file (ticket 22) |
| A3 | Ninja Adventure `Ui\Input` and `Ui\Skill Icon` | Covered only by the pack's blanket CC0 claim; no separate provenance | 2026-10-07 | Not needed; avoid |
| S1 | Kenney Pirate Pack (shipwreck supplement candidate) | CC0 | 2026-10-06 | Candidate, poor style match |
| S2 | OpenGameArt "Ship / Destroyed Ship" by Kutejnikov (shipwreck supplement candidate) | CC0 | 2026-10-06 | Candidate, side view |
| S3 | OpenGameArt "Shipwreck" by nicubunu (shipwreck supplement candidate) | CC0 | 2026-10-06 | Candidate, vector, poor style match |
| S4 | 16x16 Pirates Tileset by 0x72 (shipwreck supplement candidate) | CC0, as stated in the author's page text (the page has no formal licence field) | 2026-10-07 | Candidate, 16 px pixel art, side view, different palette. Fallback only if the composed wreck is weak (ADR 0004); downloading it needs the user's permission |
| F1 | TinyRPG Collection by ansimuz (fallback) | Custom itch.io text: personal and commercial use, no resale or redistribution | 2026-10-06 | Fallback, not bought |
| F2 | Pixel RPG Characters Pack by Mithrillor (fallback) | Custom itch.io text: commercial use, no resale, redistribution, or re-upload | 2026-10-06 | Fallback, not bought |
| F3 | Another Perspective by VEXED (fallback) | CC BY 4.0 (attribution required) | 2026-10-06 | Fallback, not bought |

## Entries

### A1. Ninja Adventure Asset Pack (Pixel-Boy and AAA)

- **Source:** https://pixel-boy.itch.io/ninja-adventure-asset-pack, file "Ninja Adventure - Asset Pack.zip" (94,022,790 bytes, SHA-256 `95a06f4fdcfd1882f061a45ff313b7c905dbe2de1e8512b281d7937df62a7b15`, file dated 2026-03-29). The page names it "Update #8 - Animation V2 / Animals / Camping & More", Mar 29, 2026. Made by Pixel-Boy and AAA.
- **Licence:** Creative Commons Zero v1.0 Universal (CC0 1.0): https://creativecommons.org/publicdomain/zero/1.0/. Public and commercial use, modification, and redistribution are allowed. No attribution is required.
- **Evidence (read from the primary sources, not from summaries):**
  1. `LICENSE.txt` inside the archive: the full "CC0 1.0 Universal" legal code (waiver plus fallback licence).
  2. `README.md` inside the archive: "released under the Creative Commons Zero (CC0) license ... even commercial ones. Attribution is not required but appreciated", crediting Pixel-boy and AAA.
  3. The itch.io page: "Asset license: Creative Commons Zero v1.0 Universal" and the page text saying the pack is released under CC0 and may be used in any way, "even commercial ones", with attribution "not required but appreciated". The page was saved on 2026-10-06 (`ninja-page.html` in the download folder).
- **Date checked:** 2026-10-06 (page saved, archive downloaded) and re-read from the saved copies on 2026-10-07.
- **Where the evidence is (outside the repository, in the download folder `.worktrees\_assets\`):** `ninja\Ninja Adventure - Asset Pack\LICENSE.txt` and `README.md` (inside the archive), and `ninja-page.html` (the saved page).
- **Credits text (a courtesy, not required; the page asks for a link to its itch.io page):** "Ninja Adventure Asset Pack by Pixel-Boy and AAA (CC0), https://pixel-boy.itch.io/ninja-adventure-asset-pack"
- **Limits of CC0:** the waiver covers the rights the authors hold. Section 4(c) of the legal text says the authors do not take responsibility for clearing other people's rights, and trademark and patent rights are not waived. The files show no sign of third-party material except the font (A2). The pack's own claim is the only evidence for per-file authorship; see "Audio" below.
- **Audio in the pack:** 41 music tracks (`.ogg`) and 147 sound effects and jingles (`.wav`) fall under the same CC0 claim. The files carry no author, title, or licence tags (encoder tags show FL Studio only), so per-file authorship cannot be verified beyond the pack's claim; the page says "Made with Aseprite, Godot, FL Studio". The `Audio\Sounds\Voice` folder is not used (the spec has no voice acting), and nor are the jingles. Ticket 21 uses 8 of the music tracks and 16 of the sound effects: 24 files, 13,194,373 bytes in all (see "Used so far (ticket 21, audio)").
- **Used so far (ticket 22):** the files below, copied unchanged from the pack into `public\art\` under the name shown. A file listed for two uses is one file.
  - `Actor\Character\Hunter\SpriteSheet.png` as `hero.png`: the hero.
  - `Items\Weapons\Sword2\SpriteInHand.png` as `sword-held.png`: the sword in the hero's hand.
  - `Items\Weapons\Bow\Sprite.png` as `bow-held.png`: the bow in the hero's hand (ticket 22 named it `gear-short-bow.png` and used it for the icon of the Short Bow too; ticket 23 gave the icons their own upright pictures, below).
  - `Items\Weapons\Bow\Arrow.png` as `arrow.png`: the hero's arrow in flight.
  - `FX\Attack\SlashCurved\SpriteSheet.png` as `slash.png`: the slash of the sword.
  - `Items\Weapons\Sword2\Sprite.png` as `gear-basic-sword.png`: the icon of the Basic Sword.
  - `Items\Weapons\BigSword\Sprite.png` as `gear-steel-sword.png`: the icon of the Steel Sword.
  - `Items\Weapons\Katana\Sprite.png` as `gear-katana.png`: the icon of the Katana (ticket 17).
  - `Items\Projectile\Arrow.png` as `consumable-ammunition.png`: the icon of Ammunition.
  - `Items\Potion\LifePot.png` as `consumable-healing-potion.png`: the icon of the Healing Potion.
  - `Items\Treasure\GoldKey.png` as `key.png`: the icon of a key, in the notice of finding one and in the inventory page (ticket 13).
  - `Ui\Theme\Theme Wood\nine_path_bg_2.png` as `ui-panel.png`: the dark panel of the HUD, the notices and the banner, and the inside of the windows.
  - `Ui\Theme\Theme Wood\nine_path_panel.png` as `ui-window.png`: the orange frame of the windows.
  - `Ui\Theme\Theme Wood\button_normal.png` as `ui-button.png`: the button behind the line the cursor is on.
  - `Ui\Receptacle\IconHeart.png` as `ui-heart.png`: the heart of Health.
  - Not from the pack: the colours of the bars are the pack's palette, drawn with rectangles; no file was copied for them.
  - Not from the pack: the icons of the Basic Armor, the Chain Mail and the Plate Armor (ticket 16) and of the Knight Mail (ticket 18) are drawn in code (`src\adapter\drawn-icons.ts`), in the pack's own colours, because the pack has no armor icon. They are this project's own work, not a copy or a recolour of a pack file.
- **Used so far (ticket 23, composed pictures):** the pictures below are not copies. `docs\assets\compose-art.py` cuts the named pieces out of the pack, puts them together, and writes the files in `public\art\`; run it again with the pack's path to remake them. Pack paths are under `Backgrounds\Tilesets\` unless they say otherwise. Every piece is cut from the pack and kept in the pack's own colours except where a line says it was changed.
  - `terrain-water.png`: the shore of water against sand and against grass (the thirteen pieces of each autotile set of `TilesetWater.png`, which holds the water with its shore and foam) and two plain water tiles.
  - `terrain-sand.png`: plain sand, a twig and a pebble from `TilesetFloor.png`, and the thirteen pieces of the sand's edge against grass. Those pieces are the pack's dirt-over-grass pieces of `TilesetFloor.png` with the two dirt colours `#d3865f` and `#bd7959` changed to the pack's own sand colour `#ffcb8d`.
  - `terrain-grass.png`: seven grass tiles of `TilesetFloor.png`.
  - `terrain-rock.png`: the face of a cliff (lip, middle, foot; left, middle, right) from `TilesetRelief.png`.
  - `terrain-tree.png`: four two-by-two trees of `TilesetNature.png`, a one-tile tree made from the canopy and the trunk of its thin tree, and the same tree with its greens shifted one step darker, all in the pack's colours. Not from the pack: the two forest floor tiles are a flat fill in the pack's dark green `#345a52` with a few flecks of the pack's `#2a4a44` and `#4a7f4b`, drawn by the recipe.
  - `terrain-wreckage.png`: the wreck. The deck is the dock planks of `TilesetWater.png` turned on their side, with their two colours changed to the pack's `#f38c4c` and `#965746`. The cargo laid on the deck is the barrel (tile 9,7), the sack (5,5), the rope coil (11,8) and the broken planks (12,8) of `tileset_camp.png`, and the skull (13,0) and the bone (14,0) of `TilesetFloorDetail.png`. Not from the pack: the edges of the deck (the outline, the bulwark on the north side, the hull with its portholes on the south side, the broken ends of the planks on the west and the east side), the hole in the deck, the mast with its yard and torn sails, and the broken mast lying on the sand are drawn by the recipe, in the pack's own colours (`#141b1b`, `#ffad5d`, `#f38c4c`, `#e66a3a`, `#965746`, `#7d3e24`, `#eecf9b` and white). They are this project's own work, not a copy of a pack file. Nothing of `Backgrounds\Vehicles\Boat.png` is in it.
  - `monster-crab.png`, `monster-slime.png`, `monster-spitter.png`: the frames of `Actor\Monster\Mollusc\Mollusc.png`, `Actor\Monster\Slime\Slime.png` and `Actor\Monster\Mushroom\mushroom.png`, rearranged. The crab is the pack's red mollusc used as a stand-in, since the pack has no crab. Changed: the cap of the mushroom has its two reds `#e0394c` and `#8f3e56` made purple, `#a15fd8` and `#5e3a8c`, so that the red flash of a wind-up shows on it.
  - `monster-wolf.png`, `monster-boar.png`: the two frames of `Actor\Animal\DogBlack\SpriteSheet.png` and `Actor\Animal\WildBoar\SpriteSheet.png`, with the left-facing frames mirrored from the right-facing ones. The wolf is the pack's black dog used as a stand-in, since the pack has no wolf (the pack's hyena was tried and left out: too small to read at the game's scale).
  - `projectile-orb.png`: the four frames of `FX\Projectile\EnergyBall.png`, the orb a spitter shoots, with its two colours `#8feff1` and `#79b8ce` changed to the purple `#e3a6ff` and `#a15fd8` of the spitter's cap, and the pack's dark outline `#141b1b` drawn round them by the recipe.
  - `fx-puff.png`: `FX\Smoke\Smoke\SpriteSheet.png` unchanged, the puff of smoke a monster leaves when it is defeated.
  - Not from the pack: in each monster sheet the white frame shown when the monster is hit is the shape of its first frame filled with white, and the red frame shown while it winds up is the same shape with its colours shifted to red (the dark outline kept). The recipe makes both.
  - `gear-short-bow.png`, `gear-long-bow.png`: the icons of the Short Bow and the Long Bow (ticket 15 added the Long Bow's), from `Items\Weapons\Bow\Sprite.png` and `Items\Weapons\Bow2\Sprite.png` (these two are not under `Backgrounds\Tilesets\`), each turned a quarter turn so that the bow stands upright with its string on the left, like the icons of the swords: lying down, as the hero holds it, it read as a bowl in the HUD and the inventory. The Short Bow's has the two rows of its middle cut out, so it is 13 pixels tall against the Long Bow's 15 and fits the HUD. The colours are the pack's.
  - The pieces every area shares (`src\adapter\prop-sprites.ts`); these are in use in every area, not only the coast and the woods:
  - `prop-chest.png`: six frames, the chest of Gear, the cache of ammunition and the cache of Healing Potions, each shut and then open. The chest is the two frames of `Items\Treasure\BigTreasureChest.png`. A cache is the pack's `Items\Object\CrateEmpty.png` with what it holds standing in it, and the open cache is the same crate empty: three arrows cut short from `Items\Weapons\Bow\Arrow.png` and stood upright, or two bottles of `Items\Potion\LifePot.png`.
  - `prop-pickup.png`: six frames of what lies on the ground, each plain and then with a glint: the bottle of `Items\Potion\LifePot.png`, the two arrows of `Items\Projectile\Arrow.png` crossed (one of them mirrored), and `Items\Treasure\GoldKey.png`. Not from the pack: the glint, a plus of five white pixels set by the recipe.
  - `prop-checkpoint.png`: five frames of a Checkpoint. The flag of the Checkpoint the hero has not touched is the first frame of `Backgrounds\Animated\Flag\FlagGray16x16.png`, hung half way down the pole; the four frames of the active Checkpoint are those of `Backgrounds\Animated\Flag\FlagRed16x16.png`, waving at the top. Not from the pack: the pole, four columns of the pack's own `#8f3e56` and `#141b1b`, drawn by the recipe.
  - `prop-exit.png`: four frames of the mark of an exit, two arrowheads pointing up, down, left or right. Not from the pack: drawn entirely by the recipe, in the pack's white `#f2eaf1` with the pack's dark outline `#141b1b`; this project's own work, not a copy of a pack file.
  - `prop-door.png`: two tiles of `TilesetHouse.png`, the arched door shut (column 8, row 3) and open (column 9, row 3). Not from the pack: the padlock on the shut door, a small picture of seven rows in the pack's `#141b1b`, `#ffad5d` and `#e66a3a`, stamped on by the recipe so that a shut door cannot be taken for a chest.
  - `prop-sign.png`: the tile of `TilesetElement.png` in column 0, row 2, unchanged.
- **Used so far (ticket 24, composed pictures):** made the way ticket 23's are, by `docs\assets\compose-art.py`, and kept in the pack's own colours except where a line says it was changed.
  - `mountain-cliff.png`: the face of a cliff (lip, middle, foot; left, middle, right) from the grey-green set of `TilesetRelief.png` (columns 4 to 6, rows 0 to 2; `terrain-rock.png` is the orange set of the same tileset, rows 5 to 7). Changed: its six colours `#5f7160`, `#56634d`, `#46402e`, `#8d977f`, `#f2eaf1` and `#b6beb0` are made the slate `#6c7a8e`, `#586579`, `#3c4256`, `#a3afc0`, `#e4e9f1` and `#c4ccd8`, so that the rock of the mountain is not the grey-green of a meadow.
  - `mountain-boulders.png`: four boulders, each on a tile of its own: the three small grey rocks of `TilesetNature.png` (columns 17, 18 and 19 of row 17) and the round boulder of `TilesetReliefDetail.png` (column 4, row 0), with the same slate colours.
  - `cave-cliff.png`: the same nine pieces as `mountain-cliff.png`, with the six greens made a dark blue stone: `#454a63`, `#383c53`, `#262a3f`, `#6b7191`, `#8a90b0` and `#7f86a6`.
  - `cave-sand.png`, `cave-grass.png`: `terrain-sand.png` and `terrain-grass.png` with every colour darkened, so that the cave is dim in its ground itself and nothing is laid over what stands on it: the sand's `#ffcb8d`, `#fce2ca` and `#ffbc75` are made `#a58459`, `#c4a688` and `#8f6f47`, and the grass's `#adbc3a` and `#a8a129` are made `#5e7a38` and `#566e32`.
  - `monster-raider.png`, `monster-raider-charger.png`, `monster-raider-archer.png`, `monster-raider-veteran.png`: the first four rows (the four frames of the walk, down, up, left and right) of `Actor\Character\NinjaDark\SpriteSheet.png`, `NinjaYellow`, `NinjaBlue` and `Knight`, with the hit and wind-up rows added by the recipe as for ticket 23's monsters. The pack has no raiders, so its ninjas and its knight are stand-ins: the dark ninja for the raider, the yellow for the charger, the blue for the archer, and the knight, in heavy steel, for the veteran. Changed: the knight's four greys `#8d977f`, `#5f7160`, `#4e484a` and `#3b3643` are made the navy steels `#8aa0d0`, `#4c62a4`, `#3c4478` and `#2a2e5a`, so that the veteran is not the grey-green of the dark raider.
  - `monster-cave-bat.png`, `monster-cave-lizard.png`, `monster-cave-eye.png`, `monster-cave-bear.png`: the frames of `Actor\Monster\BlueBat\SpriteSheet.png`, `Actor\Monster\Lizard\Lizard.png`, `Actor\Monster\Eye\Eye.png` and `Actor\Monster\Bear\SpriteSheet.png`, rearranged the same way. Changed: the bear's two reds `#d14b34` and `#8f3e56` are made the browns `#8a6246` and `#523a2c`, since the red of the pack's bear is the red of a wind-up and the flash would not show on it.
  - `prop-gate.png`, `prop-lever.png`: the gate and the lever, two pieces that every area shares (`src\adapter\prop-sprites.ts`), two frames each. The gate (24 by 25 pixels, shut and then open) is the iron arch of `TilesetHouse.png` (pixels 172 to 195 across and 183 to 207 down: legs of four pixels, nine rows of arch and an opening of exactly one tile). The open gate is the arch alone. The shut gate has three pickets of the iron fence of the same tileset (pixels 155 to 158 across for a picket and 159 and 160 for the gap between two, rows 194 to 207) between its legs, each strip stretched by two rows, a row of its stem repeated, to fill the opening. The lever (16 by 16 pixels, at rest and then pulled) is the lower seven rows of the stone block in column 2, row 3 of `TilesetDungeon.png`, the socket of the pack's switches, on a niche of the pack's dark `#141b1b`. The pack has no lever, so the stick and its ball are not from the pack: the white stick (`#f2eaf1` with `#abc2bc` down its right side), the ball (red `#d14b34` with `#ffcba9`, leaning left at rest; blue `#79b8ce` with `#f2eaf1`, leaning right when pulled) and their dark outline are drawn by the recipe in the pack's own colours, this project's own work and a stand-in for a lever, not a copy of a pack file.
- **Used so far (ticket 21, audio):** the files below, copied unchanged from the pack into `public\audio\music\` (the music) and `public\audio\sfx\` (the effects) under the name shown; each copy was compared with its source by SHA-256 and is byte for byte the same. The pack's paths are spelled as they are in the pack, with its spaces and its `&`. They were chosen by their names, their lengths and their measured loudness, not by ear. `src\adapter\audio-manifest.ts` is the list of which sound is played for what.
  - The music, one track for each place, which plays over and over while the player is there:
  - `Audio\Musics\38 - Intro.ogg` as `music\intro.ogg`: the title screen.
  - `Audio\Musics\39 - Boat.ogg` as `music\boat.ogg`: the shipwreck coast.
  - `Audio\Musics\5 - Peaceful.ogg` as `music\peaceful.ogg`: the woods.
  - `Audio\Musics\19 - Ascension.ogg` as `music\ascension.ogg`: the mountain.
  - `Audio\Musics\2 - The Cave.ogg` as `music\the-cave.ogg`: the cave.
  - `Audio\Musics\10 - Dark Castle.ogg` as `music\dark-castle.ogg`: the castle.
  - `Audio\Musics\34  - Fight.ogg` as `music\fight.ogg`: the fight with the Guardian (the pack's name has two spaces after the 34).
  - `Audio\Musics\8 - End Theme.ogg` as `music\end-theme.ogg`: the ending.
  - The effects, one short sound for each of the things that happen:
  - `Audio\Sounds\Whoosh & Slash\Slash.wav` as `sfx\slash.wav`: the swing of the sword.
  - `Audio\Sounds\Whoosh & Slash\Whoosh2.wav` as `sfx\whoosh2.wav`: the shot of the bow.
  - `Audio\Sounds\Hit & Impact\Hit1.wav` as `sfx\hit1.wav`: a monster hit.
  - `Audio\Sounds\Hit & Impact\Hit2.wav` as `sfx\hit2.wav`: the hero hit.
  - `Audio\Sounds\Hit & Impact\Impact5.wav` as `sfx\impact5.wav`: a monster defeated.
  - `Audio\Sounds\Bonus\Coin.wav` as `sfx\coin.wav`: something picked up.
  - `Audio\Sounds\Bonus\PowerUp1.wav` as `sfx\powerup1.wav`: a new level.
  - `Audio\Sounds\Magic & Skill\Magic1.wav` as `sfx\magic1.wav`: a Checkpoint lit, and the vessel prepared.
  - `Audio\Sounds\Alert\Alert.wav` as `sfx\alert.wav`: the hero defeated.
  - `Audio\Sounds\Menu\Menu5.wav` as `sfx\menu5.wav`: a page opened, and a question asked (whether to sail home, and whether to replace the saved game).
  - `Audio\Sounds\Menu\Menu6.wav` as `sfx\menu6.wav`: a page closed, and a question put away.
  - `Audio\Sounds\Menu\Accept3.wav` as `sfx\accept3.wav`: a choice made: gear equipped, a Stat Point spent, the choices of the title screen, and the ending reached.
  - `Audio\Sounds\Magic & Skill\Heal.wav` as `sfx\heal.wav`: a Healing Potion used.
  - `Audio\Sounds\Menu\Cancel2.wav` as `sfx\cancel2.wav`: a refusal: a locked door, and a shot with no ammunition.
  - `Audio\Sounds\Menu\Move3.wav` as `sfx\move3.wav`: the weapon switched.
  - `Audio\Sounds\Bonus\Bonus.wav` as `sfx\bonus.wav`: the Guardian defeated.
- Later art tickets add what they copy in or compose to these lists, in the same commit as the files.

### A2. Ninja Adventure font `Ui\Font\NormalFont.ttf`: do not use

- **Finding:** the font file's own name table says "Copyright pixel-boy 2021", family "NinjaAdventure", licence "FontStruct Non-Commercial License", built with FontStruct. That is not CC0. Taken by its name, it is a non-commercial licence. FontStruct's own announcement of the licences (https://fontstruct.com/news/2013/07/05/new-licensing-options/, July 5th 2013, saved 2026-10-06) says that "Downloaders are free to use these fonts either commercially or non-commercially depending on which of the two is used" and that both new FontStruct licences "prohibit redistribution of the downloads by anyone apart from the designing FontStructor". FontStruct's FAQ "Can I use FontStruction X in a project?" (saved 2026-10-06) adds that all licences in use on FontStruct require crediting the original designer. The designer is the pack's author, so he may have meant it as CC0, but the shipped file says otherwise, and the font's FontStruct page could not be read (the saved copy is a login page), so its exact terms are unconfirmed.
- **Decision for the project:** do not use or ship `NormalFont.ttf`; the user confirmed on 2026-10-07 that it is replaced (ADR 0004). Ticket 22 resolved it without a font file: the HUD and the pages draw their text with the project's own 5 by 7 bitmap font, whose letters are rectangles drawn by code (`src\adapter\pixel-font.ts`), so no font was fetched, and none needs an entry here. The bitmap fonts `font8x8.png` and `font24x30.png` in the same folder have no stated provenance, so they are not relied on either.
- **Optional follow-up for the user:** ask the pack's author which licence the font really has.

### A3. Ninja Adventure `Ui\Input` and `Ui\Skill Icon`

- 109 input-prompt icons (gamepad, keyboard, mouse) and 121 skill icons whose provenance the pack does not state. They sit under the pack's blanket CC0 claim. The game is keyboard only and has no skill system, so avoid them, or add a specific entry first if one is ever used.

### S1. Kenney Pirate Pack (shipwreck supplement candidate)

- **Source:** https://kenney.nl/assets/pirate-pack (190 files, version 1.0, released 2017).
- **Licence:** Creative Commons CC0 (page: "License: Creative Commons CC0"; the pack's preview image says "CC0 1.0 ... free to use in personal, educational and commercial projects. No need to ask permission. Support us by crediting, this is not mandatory").
- **Checked:** 2026-10-06 from the saved public page and preview only. Not downloaded.
- **Credits text if used:** "Pirate Pack by Kenney (CC0), https://kenney.nl".
- **Fit:** flat vector-style art with thin outlines, not matching the pixel art. Includes top-down ships with a grey "wrecked" row.

### S2. OpenGameArt "Ship / Destroyed Ship" by Kutejnikov (shipwreck supplement candidate)

- **Source:** https://opengameart.org/content/ship-destroyed-ship, posted 2020-07-13, file `ship.png` (26.7 KB).
- **Licence:** CC0 (page: "License(s): CC0").
- **Checked:** 2026-10-06 from the saved public page and preview only. Not downloaded.
- **Credits text if used:** "Ship / Destroyed Ship by Kutejnikov (CC0), https://opengameart.org/content/ship-destroyed-ship".
- **Fit:** a "very simplified pixel ship", side view with a broken hull; a different perspective and palette from the pack.

### S3. OpenGameArt "Shipwreck" by nicubunu (shipwreck supplement candidate)

- **Source:** https://opengameart.org/content/shipwreck, posted 2010-01-15, file `shipwreck.svg` (66.9 KB).
- **Licence:** CC0 (page: "License(s): CC0").
- **Checked:** 2026-10-06 from the saved public page only. Not downloaded.
- **Credits text if used:** "Shipwreck by nicubunu (CC0), https://opengameart.org/content/shipwreck".
- **Fit:** vector clip art, not pixel art.

### S4. 16x16 Pirates Tileset by 0x72 (shipwreck supplement candidate)

- **Source:** https://0x72.itch.io/16x16-pirates-tileset, one file `pirates.v1.png` (8.9 kB), a free download ("Game assets > Free"), rated 4.9 (16 ratings), tagged "No generative AI was used".
- **Licence:** the page text says "You can use this tileset for whatever you like (CC-0). Credit is not necessary". That is the author's own statement; the page has no formal "Asset license" field and no licence file was read, so this is a weaker record than A1. Before anything from it is copied in, re-read the page and, if the download includes a licence file, that too.
- **Checked:** 2026-10-07 from the saved public page and its two preview screenshots only. Not downloaded.
- **Credits text if used (a courtesy):** "16x16 Pirates Tileset by 0x72 (CC0), https://0x72.itch.io/16x16-pirates-tileset".
- **Fit:** 16 px pixel art in a limited palette: a side-view ship with sails, masts, a skull flag, and cannons, plus a palm island, chest, and coin. The scale matches the pack, but the palette is different and there is no dark outline, so it would be recolored to the pack's palette.

### F1. TinyRPG Collection by ansimuz (fallback)

- **Source:** https://ansimuz.itch.io/tinyrpg-collection. Price on 2026-10-06: $129.99 minimum (bundle of four packs $349.99).
- **Licence:** custom text on the page: "Use in personal and commercial games. You may not resell or redistribute the assets, even if modified."
- **Checked:** 2026-10-06 from the saved public page. Not bought or downloaded.
- **Consequence:** the asset files could not live in a public repository.

### F2. Pixel RPG Characters Pack by Mithrillor (fallback, characters only)

- **Source:** https://mithrillor.itch.io/pixel-rpg-character-pack. "Name your own price" with a free demo; the page lists the full "all character pack.zip" at $2 or more. Updated 2026-09-17.
- **Licence:** custom text on the page: usable in commercial and non-commercial projects and modifiable; "You may not: resell or redistribute the asset pack; re-upload the assets (modified or unmodified); use the assets for AI training datasets; include the assets in NFT projects without explicit permission". Credit appreciated, not required.
- **Checked:** 2026-10-06 from the saved public page. Not bought or downloaded.
- **Consequence:** the asset files could not live in a public repository.

### F3. Another Perspective by VEXED (fallback)

- **Source:** https://v3x3d.itch.io/another-perspective. Price on 2026-10-06: $1.95 minimum (35% off $3.00).
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/. The page text says "These assets can be used in commercial projects, and edited. Credit is appreciated", but CC BY 4.0 requires attribution.
- **Credits text if used:** "Another Perspective by VEXED, CC BY 4.0, https://v3x3d.itch.io/another-perspective" plus a note of any changes made.
- **Checked:** 2026-10-06 from the saved public page. Not bought or downloaded.
