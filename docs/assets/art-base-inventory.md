# Art base inventory: Ninja Adventure Asset Pack

Ticket 02. First-hand check of the provisional art base against the actual files, done 2026-10-07 on the archive downloaded 2026-10-06. This is a research result and a recommendation, not an approval: whether the art is acceptable is the user's call (see ADR 0004).

Paths below are relative to the archive root `Ninja Adventure - Asset Pack\` (extracted outside the repository, in `.worktrees\_assets\ninja\`). No art has been copied into the repository.

## Verdict at a glance

The pack is a consistent 16 px, warm-palette, chibi top-down pixel-art set with far more than the game needs: 66 monster kinds, about 90 characters, 20 bosses, 17 tilesets, items, effects, a UI kit, and music. It covers most of the spec directly. It has no shipwreck art, no hand-drawn sword and bow animations for one hero, no undead boss, and no ammunition cache, and the cave and castle terrain must be assembled from several tilesets. Every gap can be filled from within the pack or with a small supplement. Recommendation: **accept with named gaps filled** (details in ADR 0004).

Verdict words follow the ticket: Found, Partial (usable but assembled, adapted, or needing a small addition), Missing.

## Coverage matrix

| # | Need | Verdict | Found in the pack | Gap plan |
| --- | --- | --- | --- | --- |
| 1 | Terrain: shipwreck coast | Partial | Sand, grass, and water autotiles; plank docks; rocks and palms; a camp set; a boat | No wreck or hull art. Supplement (see Gap plan, G1) |
| 2 | Terrain: woods | Found | Grass, dirt, trees, bushes, logs, mushrooms, flowers | None |
| 3 | Terrain: mountain | Found | Cliffs (grey, snow, orange), stairs, rocks, snow floor | None |
| 4 | Terrain: cave | Partial | Cave mouths, ladders, rock details, dark stone interior floors and walls, crystals | No cave-wall autotile; assemble from the Relief and Interior sets (G4) |
| 5 | Terrain: old castle with harbor | Partial | Stone battlement walls, towers, arches, statues, banners, ruins, docks, doors, stairs | No castle set and no full old ship; assemble, supplement the ship (G1, G4) |
| 6 | Hero: walk | Found | Four-direction walk cycles for every standard character | Pick the hero (user) |
| 7 | Hero: sword attack | Partial | Four-direction attack pose, sword sprites held in hand, slash effects | Compose attack from pose, held sword, and slash effect (G2) |
| 8 | Hero: bow attack | Partial | Bow sprites, arrow sprites, drawing pose candidates | No hand-drawn bow animation; compose (G2) |
| 9 | Monsters: woods (forest beasts, slimes) | Found | Four slimes, bear, beasts, boars, snakes, mushrooms, and more | None |
| 10 | Monsters: mountain raiders | Found | Armed humanoids: samurai, gladiators, fighters, ninjas, shaman, sorcerers | None |
| 11 | Monsters: cave creatures | Found | Bats, spiders, moles, eyes, larvae, lizards, mollusc | None |
| 12 | Monsters: castle undead | Found | Skeleton, skeleton demon, vampire, spirits, skulls, statues | None |
| 13 | A distinct Guardian | Partial | 20 bosses with hand-drawn idle, walk, hit, attack frames; none is undead | Recolor a samurai boss to read as undead, or use the spirit boss with scripted attacks (G3) |
| 14 | Chests | Found | Big and little treasure chests | None |
| 15 | Ammunition caches | Partial | Crates, barrels, bags, arrow sprites | Compose a cache from a crate plus arrows (G5) |
| 16 | Healing Potions | Found | Life potion, medipack, heart, empty, milk, and water pots | None |
| 17 | Keys | Found | Gold key, silver key | None |
| 18 | Doors | Found | Doors in four colours, locked-door tiles with keyholes | None |
| 19 | Levers | Found | Toggle switches, pressure plates, switch pedestals | None |
| 20 | HUD | Found, with a font gap | Hearts, life bars, item slots, ammunition and potion icons | Font: do not use the pack's `NormalFont.ttf` (G6) |
| 21 | Page art (inventory, stat page, Automap, level-up, title, ending) | Partial | Panels, tabs, buttons, dialog boxes, face frames, icons | Title and ending art assembled from tiles; the Automap is drawn from map data (G7) |
| 22 | Arrow and effect sprites | Found | Arrow, slashes, hit sparks, smoke, projectiles, elemental and magic effects | None |
| 23 | Tile size | Confirmed: 16 px | Every tileset is a multiple of 16; standard characters and monsters use 16 px frames | Ticket 01's working assumption stands |
| 24 | Bundled music and sound effects | Found, licence claim only | 41 music tracks, 147 sound effects and jingles | The user must listen; no per-file provenance (see `licences.md`) |

## Evidence by category

### Tile size

All 19 tilesets under `Backgrounds\Tilesets` are multiples of 16 px in both directions (for example `TilesetFloor.png` 352x417 has one stray extra pixel row, so slice with explicit tile counts), and the itch.io page tags the pack "16x16". Standard characters and monsters are 16x16 frames: `Actor\Character\<Name>\SpriteSheet.png` is 64x112 (4 columns of directions: down, up, left, right; 7 rows of poses), and monster sheets are 64x64. Bosses, vehicles, and effects use larger frames sized per file, so the Phaser adapter must take frame size per sheet. **Ticket 01's working assumption of a 16 px tile is confirmed; no change.**

### Terrain by Adventure Area

Tileset files (all in `Backgrounds\Tilesets`, sizes in pixels):

- `TilesetFloor` 352x417 (grass, dirt, sand, and snow ground autotiles), `TilesetField` 80x240 (grass in five colours), `TilesetFloorB`, `TilesetFloorDetail`, `TilesetHole`.
- `TilesetWater` 448x272 (water autotiles bordering grass, sand, snow, and dirt; wooden plank dock and pier pieces).
- `TilesetNature` 384x336 (trees, bushes, rocks, stumps, flowers).
- `TilesetRelief` 320x192 and `TilesetReliefDetail` 192x192 (cliffs in grey-green, snow, and orange; cave mouths, ladders, rock details).
- `TilesetDesert` 320x192 (sandstone walls and towers, palms, bones), `TilesetHouse` 528x368 (stone battlement walls, fences with a gate, statues, banners, arches, crates), `TilesetTowers` 384x96, `TilesetVillageAbandoned` 320x192 (mossy ruins).
- `TilesetElement` 256x240 (doors, stairs, furniture, signs), `TilesetDungeon` 192x64 (locks, pressure plates, toggle switches, crystal pedestals, spike traps, crates), `Interior\*` (stone-brick walls and floors in four palettes), `tileset_camp` 368x144, `tileset_bed`, `Pipes`.
- `TilesetLogic` is a set of editor marker icons (keys, eyes, letters), not game art.
- `Vehicles\Boat.png` (80x32 lifeboat-style hull), `Sail.png`, `Crane.png`, `FishNet*.png`.

By area:

- **Coast (Partial):** sand, grass, and water autotiles, plank docks, rocks, palms, the camp set (tent, logs, barrels, fire pit), and a small boat all exist. There is no shipwreck and no ship hull.
- **Woods (Found):** the Nature and Floor sets give dense forests, clearings, and paths.
- **Mountain (Found):** the Relief cliffs, stairs, and snow ground.
- **Cave (Partial):** cave mouths and rock cliffs exist, as do dark stone floors and walls, but there is no dedicated cave-wall autotile.
- **Old castle with harbor (Partial):** wall, tower, arch, statue, banner, ruin, door, and stair pieces exist and are the right style; they must be assembled. Docks and a boat exist; a full-size old ship does not.

### Hero: walk, sword, and bow

- **Standard characters** (`Actor\Character\<Name>\`, 92 characters) have `SpriteSheet.png` (64x112: down, up, left, right by idle, three walk frames, attack pose, item, jump or special poses, dead) and a 38x38 `Faceset.png`. `SeparateAnim\` repeats the poses as strips (Attack, Dead, Idle, Item, Jump, Special1, Special2, Walk). Walk is complete in four directions for all of them. The attack is a single pose per direction (`SeparateAnim\Attack.png`, 4 frames), not a swing.
- **Weapons** (`Items\Weapons\<Name>\`): 23 weapon folders; each holds `Sprite.png` (icon) and `SpriteInHand.png` (the weapon as held), except `Bow` and `Bow2`, which hold `Sprite.png` and `Arrow.png` and have no held sprite. There are swords (`Sword`, `Sword2`, `BigSword`, `Rapier`, `Katana`) and bows, but no sprite sheet in which a standard character swings a sword or draws a bow.
- **One fully animated character:** `Actor\CharacterAnimated\NinjaGreen` (`SpriteSheet.png` 256x544, `Separate\*` strips, preview GIFs) with overlay sheets in `Weapon\` for Axe, Hammer, Katana, Net, and Pickaxe (256x256). A hand-drawn katana attack exists there; there is no bow and no plain sword.
- **Effects for composing attacks:** `FX\Slash` and `FX\Attack` (arcs, cuts, claws), `Items\Projectile\Arrow.png` (16x16), `Items\Weapons\Bow*\Arrow.png` (13x5).

Verdict: walk Found; sword Partial; bow Partial. Neither the sword nor the bow exists as a hand-drawn animation for a standard character, so both are composed in the Phaser adapter (G2).

### Monsters and the Guardian

- **Monsters** (`Actor\Monster\`, 66 kinds, each `SpriteSheet.png` 64x64 plus `Faceset.png`: four directions by four animation frames, no separate attack frames, so attacks are code-driven lunges or projectiles):
  - Woods: Slime, Slime2, Slime3, Slime4, Bear, Beast, Beast2, Racoon, GoldRacoon, Panda, Mouse, MouseBlack, Mushroom, Mushroom2, Snake to Snake4, Owl, Owl2, plus `Actor\Animal\` (WildBoar, Hyena, and others).
  - Mountain raiders: humanoids in `Actor\Character\` with idle, walk, attack, and dead poses: FighterRed, FighterWhite, GladiatorBlue, RedGladiator, CamouflageGreen, CamouflageRed, Samurai, SamuraiBlue, NinjaDark, NinjaMageBlack, Shaman, SorcererBlack.
  - Cave: BlueBat, YellowsBat, SpiderRed, SpiderYellow, Mole, Mole2, Eye, Eye2, Larva, Larva2, Lizard, Lizard2, Mollusc, Mollusc2.
  - Castle undead: `Actor\Character\Skeleton`, `SkeletonDemon`, `Vampire`, `Spirit`, `Statue`, `GoldStatue`, `KnightGold`, and `Actor\Monster\SkullBlue`, `Skull`, `Spirit`, `Spirit2`.
- **Guardian candidates** (`Actor\Boss\`, 20 bosses with `Idle`, `Hit`, and for most `Walk` and `Attack`): `GiantBlueSamurai` and `GiantRedSamurai` have the fullest sets (Idle, Walk, Hit, AttackLeft, AttackRight, ChargeLeft, ChargeRight at 48 px, attack frames 96x96); `TenguRed` and `TenguBlue` have Idle, Walk, Hit, Attack, and a transformation (Trans); `GiantSpirit` (a white-blue spectral flame, 50x50) has only Idle and Hit. None is a skeleton or other classic undead. Verdict: Partial (G3).

### Items and props

`Items\Treasure` (BigTreasureChest 32x14, LittleTreasureChest 32x16, GoldKey and SilverKey 12x8, coins, cups), `Items\Potion` (LifePot with a heart, Medipack, Heart, EmptyPot, MilkPot, WaterPot, each about 9x11), `Items\Object` (bag, book, empty crate, money bag, dice, and others), `Items\Projectile\Arrow.png`. Doors: `TilesetElement` (four colour variants) and the Dungeon locks. Levers: `TilesetDungeon` toggle switches, pressure plates, and switch pedestals. There is no quiver, arrow bundle, or ammunition crate; a cache must be composed (G5).

### HUD and page art

`Ui\Receptacle` (hearts with five fill stages `Heart.png` 80x16, `IconHeart`, life bars, rectangular and spherical receptacles with backgrounds), `Ui\Theme` (inventory cell, nine-patch panels, tabs, buttons, checkboxes, sliders, arrows), `Ui\Dialog` (dialog boxes, face frames, yes and no buttons, choice box), `Ui\Emote` (30 emotes), `Items\Projectile\Arrow.png` and `Items\Potion\LifePot.png` for the Ammunition and Healing Potion counters. The pack's own example screens (`Example 1.gif` to `Example 4.gif`) show this kit in a Zelda-like HUD with hearts. Fonts: see licence note below. No title logo, background, or ending art is provided; those are assembled from tiles and characters. The Automap is generated from map data, so it needs no art.

### Arrow and effect sprites

`FX\Slash` and `FX\Attack` (slash arcs, cuts, claws), `FX\Projectile` (arrow-like kunai, shuriken, fireball, ice spike, energy ball, rock), `FX\Elemental` (explosion, flame, ice, plant, rock, thunder, water), `FX\Magic` (aura, boost, circle, shield, spark, spirit), `FX\Particle` (leaves, rain, snow, sparks, rock chips, fire), `FX\Smoke`, `FX\Environment` (fog, ray light). Found.

### Audio

`Audio\Musics` (41 `.ogg` tracks), `Audio\Sounds` (132 `.wav` effects in folders Alert, Ambient, Bonus, Creature, Elemental, Hit and Impact, Jump and Bounce, Magic and Skill, Menu, Voice, Whoosh and Slash), `Audio\Jingles` (15). The page says "37 Music" and "100+ Sound effect". Menu, hit, pickup, and slash effects exist for the essential effects the spec lists, and the music set is large enough for light adventure music. Whether the music suits the game is for the user to judge by listening. The files carry no author or licence tags, so their licence rests on the pack's CC0 claim alone. The Voice folder is not used.

## Gap plan

- **G1. Shipwreck and old ship (the supplement).** Preferred: compose a wreck from pack pieces: `Vehicles\Boat.png` broken up and half-sunk in `TilesetWater` shallows, `Sail.png` torn and leaning, plank and log tiles from `TilesetWater`, `tileset_camp`, and `TilesetVillageAbandoned`, plus rocks and `FX\Particle` debris. This needs only recoloring and cropping of CC0 pieces and no new licence. If the composed wreck looks too weak for the opening, take a small CC0 supplement (candidates in `licences.md`: S2 is pixel art in a side view with a different palette, S1 and S3 are not pixel art); anything taken is redrawn or recolored to the pack's palette (`Palette.png`, 10x9). For the old ship at the harbor, use `Boat.png` plus `Sail.png` scaled by the staging, or a redrawn larger hull in the pack's style.
- **G2. Sword and bow on one hero.** Compose in the Phaser adapter: the standard character's attack and item poses, the held `Sword` sprite rotated by code through the swing, and a `FX\Slash` arc; for the bow, the `Bow` sprite held in front, an arrow spawned in the facing direction from `Items\Projectile\Arrow.png`, and a recoil frame. If the user prefers hand-drawn frames, redraw the four-direction poses in the pack's style. Before the art ticket commits, a mock-up of the composed result is the thing to look at (see the review list).
- **G3. Undead Guardian.** Recolor a samurai boss (bone white and ghostly teal), add spectral effects (`FX\Magic\Spirit`, `FX\Smoke`), and keep its hand-drawn walk, charge, and attack animations. Alternative: `GiantSpirit` with scripted attacks, because it has only Idle and Hit.
- **G4. Cave and castle terrain.** Assemble from the Relief, Interior, House, Desert, Towers, and VillageAbandoned sets; cave darkness by lighting tint in the adapter. The Phaser tilemaps and collision are authored by hand anyway.
- **G5. Ammunition cache.** A crate (`Items\Object\CrateEmpty` or `TilesetElement` crates) with arrow sprites on top; an open and a closed frame from a recolor.
- **G6. Font.** Replace `Ui\Font\NormalFont.ttf` with a font whose licence is confirmed (the HUD ticket records it in `licences.md`).
- **G7. Title, ending, and Automap art.** Assemble the title and ending scenes from tiles, characters, and the example screens' look; draw the Automap from map data.

## What was not verified

- Visual fit between the supplement and the pack, and the composed sword and bow, are unseen until mocked up.
- Audio quality and mood were not listened to; only file metadata was read.
- Per-file authorship of art and audio beyond the pack's own CC0 claim, and the font's real licence.
- The 128 preview GIFs were not played; the frames in the sheets were inspected instead.

## Download provenance (for the user to judge)

See the section "Download provenance" at the end of this file.

## Download provenance

(Written in the next commit.)
