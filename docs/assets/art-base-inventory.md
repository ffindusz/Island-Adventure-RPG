# Art base inventory: Ninja Adventure Asset Pack

Ticket 02. First-hand check of the provisional art base against the actual files, done 2026-10-07 on the archive downloaded 2026-10-06. This is a research result and a recommendation, not an approval: whether the art is acceptable is the user's call (see ADR 0004).

Paths below are relative to the archive root `Ninja Adventure - Asset Pack\` (extracted outside the repository, in `.worktrees\_assets\ninja\`). No art has been copied into the repository.

## Verdict at a glance

The pack is a consistent 16 px, warm-palette, chibi top-down pixel-art set with far more than the game needs: 92 characters, 66 monster kinds, 26 animals, 20 bosses, 23 tileset sheets, items, effects, a UI kit, and music. It covers most of the spec directly. It has no shipwreck art, no hand-drawn sword or bow animation for one hero, no undead boss, and no ammunition cache, and the cave and castle terrain must be assembled from several tilesets. Every gap can be filled from within the pack or with a small supplement. Recommendation: **accept with named gaps filled** (details in ADR 0004).

How the archive was obtained is set out factually at the end of this file, for the user to judge. It includes one point the user should weigh: the site's `robots.txt` disallows the page path the download script fetched.

Verdict words follow the ticket: Found, Partial (usable but assembled, adapted, or needing a small addition), Missing.

## Coverage matrix

| # | Need | Verdict | Found in the pack | Gap plan |
| --- | --- | --- | --- | --- |
| 1 | Terrain: shipwreck coast | Partial | Sand, grass, and water autotiles; plank docks; rocks and palms; a camp set; a boat | No wreck or hull art. Supplement (see Gap plan, G1) |
| 2 | Terrain: woods | Found | Grass, dirt, trees, bushes, logs, mushrooms, flowers | None |
| 3 | Terrain: mountain | Found | Cliffs (grey, snow, orange), stairs, rocks, snow floor | None |
| 4 | Terrain: cave | Partial | Cave mouths, ladders, rock details, dark stone interior floors and walls, crystals | No cave-wall autotile; assemble from the Relief and Interior sets (G4) |
| 5 | Terrain: old castle with harbor | Partial | Stone battlement walls, towers, arches, statues, banners, ruins, docks, doors, stairs | No castle set and no full old ship; assemble, supplement the ship (G1, G4) |
| 6 | Hero: walk | Found | Four-direction, four-frame walk cycles for 90 of the 92 standard characters (Child and OldWoman have a short sheet) | Pick the hero (user) |
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

All 19 tileset sheets under `Backgrounds\Tilesets` and the 4 under `Tilesets\Interior` are multiples of 16 px in both directions, except `TilesetFloor.png` (352x417), which has one stray extra pixel row, so slice it with explicit tile counts. The itch.io page tags the pack "16x16". Standard characters are 16x16 cells (a 64x112 sheet: 4 direction columns by 7 rows), and all 66 monster sheets are 64x64 (4 directions by 4 frames of 16x16). Animals are tiny 2-frame sprites (about 32x16). Bosses, vehicles, and effects use larger frames sized per file (for example 96x48, 96x96, 82x82, and 50x50 for the bosses), so the Phaser adapter must take the frame size per sheet. **Ticket 01's working assumption of a 16 px tile is confirmed; no change.**

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

- **Standard characters** (`Actor\Character\<Name>\`, 92 folders) have `SpriteSheet.png` and a 38x38 `Faceset.png`. The sheet is 64x112: 4 direction columns (down, up, left, right) by 7 rows of 16x16 cells. Compared pixel for pixel on Hunter: rows 0 to 3 are the walk cycle (four frames, and row 0 doubles as the idle pose), row 4 is the attack pose, row 5 the jump, and row 6 holds one cell each for Dead, Item, Special1, and Special2 (columns 0 to 3, not directions). `SeparateAnim\` repeats the same cells as strips (Idle, Walk 64x64, Attack, Jump, Dead, Item, Special1, Special2). 90 of the 92 have the full sheet (SamuraiRed names it `redsamurai.png`); Child and OldWoman have only a 64x32 sheet. The attack is a single pose per direction, not a swing, and there is no hit frame, so a hit reaction is a code-driven flash.
- **Weapons** (`Items\Weapons\<Name>\`): 23 weapon folders; each holds `Sprite.png` (icon) and `SpriteInHand.png` (the weapon as held), except `Bow` and `Bow2`, which hold `Sprite.png` and `Arrow.png` and have no held sprite. There are swords (`Sword`, `Sword2`, `BigSword`, `Rapier`, `Katana`) and bows, but no sprite sheet in which a standard character swings a sword or draws a bow.
- **One fully animated character:** `Actor\CharacterAnimated\NinjaGreen` (`SpriteSheet.png` 256x544, `Separate\*` strips, preview GIFs) with overlay sheets in `Weapon\` for Axe, Hammer, Katana, Net, and Pickaxe (256x256). A hand-drawn katana attack exists there; there is no bow and no plain sword.
- **Effects for composing attacks:** `FX\Slash` and `FX\Attack` (arcs, cuts, claws), `Items\Projectile\Arrow.png` (16x16), `Items\Weapons\Bow*\Arrow.png` (13x5).

Verdict: walk Found; sword Partial; bow Partial. Neither the sword nor the bow exists as a hand-drawn animation for a standard character, so both are composed in the Phaser adapter (G2).

### Monsters and the Guardian

- **Monsters** (`Actor\Monster\`, 66 kinds; all 66 main sheets are 64x64, most named `SpriteSheet.png`, plus a `Faceset.png`: four directions by four animation frames, no separate attack frames, so attacks are code-driven lunges or projectiles):
  - Woods: Slime, Slime2, Slime3, Slime4, Bear, Beast, Beast2, Racoon, GoldRacoon, Panda, Mouse, MouseBlack, Mushroom, Mushroom2, Snake to Snake4, Owl, Owl2, plus the 26 small `Actor\Animal\` kinds (for example WildBoar 34x16, Hyena, Lion, Monkey; two frames each, some with side views) as extra woods life.
  - Mountain raiders: humanoids in `Actor\Character\` with idle, walk, attack, and dead poses: FighterRed, FighterWhite, GladiatorBlue, RedGladiator, CamouflageGreen, CamouflageRed, Samurai, SamuraiBlue, NinjaDark, NinjaMageBlack, Shaman, SorcererBlack.
  - Cave: BlueBat, YellowsBat, SpiderRed, SpiderYellow, Mole, Mole2, Eye, Eye2, Larva, Larva2, Lizard, Lizard2, Mollusc, Mollusc2.
  - Castle undead: `Actor\Character\Skeleton`, `SkeletonDemon`, `Vampire`, `Spirit`, `Statue`, `GoldStatue`, `KnightGold`, and `Actor\Monster\SkullBlue`, `Skull`, `Spirit`, `Spirit2`.
- **Guardian candidates** (`Actor\Boss\`, 20 bosses, each with preview GIFs): `GiantBlueSamurai` and `GiantRedSamurai` have the fullest sets, with Idle and Walk (576x48, six frames of 96x48), Hit (384x48, four frames), `AttackLeft` and `AttackRight` (384x96, four frames of 96x96), and `ChargeLeft` and `ChargeRight` (288x96, three frames). They face the viewer for idle and walk, with left and right variants for the attacks, not four directions. `TenguRed` and `TenguBlue` (82 px frames, some 68 px) have Idle, Walk, Hit, a 15-frame Attack, and a transformation (Trans). `GiantSpirit` (a white-blue spectral flame, 50x50 frames) has only Idle (five frames) and Hit (three frames), and so does `GiantFlam`. None is a skeleton or other classic undead. Verdict: Partial (G3).

### Items and props

`Items\Treasure` (BigTreasureChest 32x14, LittleTreasureChest 32x16, GoldKey and SilverKey 12x8, coins, cups), `Items\Potion` (LifePot with a heart, Medipack, Heart, EmptyPot, MilkPot, WaterPot, each about 9x11), `Items\Object` (bag, book, empty crate, money bag, dice, and others), `Items\Projectile\Arrow.png`. Doors: `TilesetElement` (four colour variants) and the Dungeon locks. Levers: `TilesetDungeon` toggle switches, pressure plates, and switch pedestals. There is no quiver, arrow bundle, or ammunition crate; a cache must be composed (G5).

### HUD and page art

`Ui\Receptacle` (hearts with five fill stages `Heart.png` 80x16, `IconHeart`, life bars, rectangular and spherical receptacles with backgrounds), `Ui\Theme` (inventory cell, nine-patch panels, tabs, buttons, checkboxes, sliders, arrows), `Ui\Dialog` (dialog boxes, face frames, yes and no buttons, choice box), `Ui\Emote` (30 emotes), `Items\Projectile\Arrow.png` and `Items\Potion\LifePot.png` for the Ammunition and Healing Potion counters. The pack's own example screens (`Example 1.gif` to `Example 4.gif`) show this kit in a Zelda-like HUD with hearts. Fonts: see licence note below. No title logo, background, or ending art is provided; those are assembled from tiles and characters. The Automap is generated from map data, so it needs no art.

### Arrow and effect sprites

`FX\Slash` and `FX\Attack` (slash arcs, cuts, claws), `FX\Projectile` (arrow-like kunai, shuriken, fireball, ice spike, energy ball, rock), `FX\Elemental` (explosion, flame, ice, plant, rock, thunder, water), `FX\Magic` (aura, boost, circle, shield, spark, spirit), `FX\Particle` (leaves, rain, snow, sparks, rock chips, fire), `FX\Smoke`, `FX\Environment` (fog, ray light). Found.

### Audio

`Audio\Musics` (41 `.ogg` tracks), `Audio\Sounds` (132 `.wav` effects in folders Alert, Ambient, Bonus, Creature, Elemental, Hit and Impact, Jump and Bounce, Magic and Skill, Menu, Voice, Whoosh and Slash), `Audio\Jingles` (15). The page says "37 Music" and "100+ Sound effect". Menu, hit, pickup, and slash effects exist for the essential effects the spec lists, and the music set is large enough for light adventure music. Whether the music suits the game is for the user to judge by listening. The files carry no author or licence tags, so their licence rests on the pack's CC0 claim alone. The Voice folder is not used.

## Gap plan

- **G1. Shipwreck and old ship (the supplement).** Preferred: compose the wreck from pack pieces, which needs no new licence. A washed-up lifeboat suits a castaway opening: `Vehicles\Boat.png` (80x32) tilted and half buried in sand and `TilesetWater` shallows, `Vehicles\Sail.png` (30x43) as a broken mast with a torn sail, plank and log pieces from `TilesetWater`, `tileset_camp`, and `TilesetVillageAbandoned`, crates, barrels, and bags as washed-up cargo, rocks, palms, and `FX\Particle` debris. That is cropping, rotating, and recoloring of CC0 pieces. If the composed wreck looks too weak for the opening, take a small CC0 supplement (candidates in `licences.md`). S4 (0x72 "16x16 Pirates Tileset", CC0 by the author's page text) fits the scale best: 16 px pixel art with a side-view ship, sails, a skull flag, and cannons, but with a different palette and no dark outline. S2 (OpenGameArt "Ship / Destroyed Ship", CC0) is a simplified pixel ship in side view with a different palette. S1 and S3 are vector art and do not match. Anything taken is redrawn or recolored to the pack's palette (`Palette.png`, 10x9) and gets its own licence entry first. For the old ship at the harbor, which the player boards for the ending, build a larger hull in the pack's style from `Boat.png` and `Sail.png` pieces, or redraw one.
- **G2. Sword and bow on one hero.** Compose in the Phaser adapter: the standard character's attack pose (one per direction), the held `Sword` sprite rotated about its grip through the swing, and a `FX\Attack\SlashCurved` arc; for the bow, the attack pose with the `Bow` sprite held in front, an arrow spawned in the facing direction from `Items\Weapons\Bow\Arrow.png` or `Items\Projectile\Arrow.png`, and a recoil step. The pack's weapons are drawn for this: the in-hand sprites are tiny (Sword 6x11) and meant to be rotated and attached to a pose, not shipped as full animations. A rough mock-up for Hunter in four directions (an idle cell, three sword steps, three bow steps) is `views\mockup_hero_Hunter.png` in the download folder: it reads as a sword swing and a bow shot, but the placement is crude (slash arcs about twice the hero's size, arrows starting at the bow's centre, swing steps in 90 degree increments), so it shows feasibility, not the final look. If the user prefers hand-drawn frames, redraw the four-direction poses in the pack's style.
- **G3. Undead Guardian.** Recolor a samurai boss (bone white and ghostly teal), add spectral effects (`FX\Magic\Spirit`, `FX\Smoke`), and keep its hand-drawn walk, charge, and attack animations. Alternative: `GiantSpirit` with scripted attacks, because it has only Idle and Hit.
- **G4. Cave and castle terrain.** Assemble from the Relief, Interior, House, Desert, Towers, and VillageAbandoned sets; cave darkness by lighting tint in the adapter. The Phaser tilemaps and collision are authored by hand anyway.
- **G5. Ammunition cache.** A crate (`Items\Object\CrateEmpty` or `TilesetElement` crates) with arrow sprites on top; an open and a closed frame from a recolor.
- **G6. Font.** Replace `Ui\Font\NormalFont.ttf` with a font whose licence is confirmed (the HUD ticket records it in `licences.md`).
- **G7. Title, ending, and Automap art.** Assemble the title and ending scenes from tiles, characters, and the example screens' look; draw the Automap from map data.

## What was not verified

- Audio quality and mood were not listened to (an agent cannot); only file metadata was read. Whether the music suits the game is the user's call.
- Per-file authorship of the art and audio beyond the pack's own CC0 claim, and the real licence of the font (the FontStruct page for it could not be read: the saved copy is a login page).
- How the composed sword and bow, the composed wreck, and the recolored Guardian look in motion. Only a crude still mock-up of the sword and bow exists; the supplement candidates were seen only in their public preview images.
- The 128 preview GIFs were not played and the pack's Godot sample project was not opened; the frames in the sheets were inspected instead.
- Which character becomes the hero. Hunter, Knight, and the NinjaGreen animated character were looked at closely; the other 89 appear in contact sheets only.
- Whether the way the archive was obtained is acceptable (below). That is the user's judgment.

## Download provenance (for the user to judge)

This is a factual record, written without softening. The ticket allows downloading the Ninja Adventure pack only, says nothing may be purchased, and says that if the download cannot be scripted without working around an access control the agent must stop and give manual steps instead. The download was scripted. Whether it worked around an access control is for the user to decide; the facts follow.

### What was downloaded, when, by whom

- **One file:** "Ninja Adventure - Asset Pack.zip" from https://pixel-boy.itch.io/ninja-adventure-asset-pack: 94,022,790 bytes, SHA-256 `95a06f4fdcfd1882f061a45ff313b7c905dbe2de1e8512b281d7937df62a7b15` (recomputed on 2026-10-07; it matches), `Last-Modified` Sun, 29 Mar 2026 22:16:07 GMT. It is saved as `.worktrees\_assets\ninja-adventure-asset-pack.zip` and extracted to `.worktrees\_assets\ninja\`, both outside the repository and git-ignored. The archive passes a zip integrity test (2,674 entries) and the extracted files match its sizes.
- **Not downloaded:** the page's two other files ("Godot Project V4.zip", "Godot project V3 (old).zip"), any other pack, and any fallback or supplement asset. Those candidates were read through public pages and their preview images only.
- **By whom:** the first implementer agent for this ticket, on 2026-10-06 between 20:28 and 20:31 UTC (22:28 to 22:31 local), relying on the ticket's "Download permission" paragraph. That agent was killed by a machine sleep afterwards and left no notes. I did not download anything again. I rebuilt the sequence below from the saved pages, the saved response headers, and the exact commands recorded in the session event log.

### The path taken

All requests were made with `curl.exe` (default curl User-Agent) through the corporate proxy that this machine's environment configures (`HTTP_PROXY` and `HTTPS_PROXY`, the same one the npm registry is reached through). The agent's own `web_fetch` tool could not resolve the host, which is why curl was used. No login, no account, no credentials, no browser cookies.

| Time (UTC, 2026-10-06) | Request | What it is |
| --- | --- | --- |
| 20:28:28 | GET the pack page | The public page. Served normally, no challenge page. |
| 20:29:18 | GET `.../ninja-adventure-asset-pack/purchase`, keeping cookies | The page "Download Now" opens. The site set one anonymous session cookie (`itchio_token`, saved in `cookies.txt`; its value is not recorded here). |
| 20:29:36 | GET https://itch.io/docs/legal/terms | The Terms of Service, searched for "automat", "scrap", "crawl", "spider", "robot", and "bot" before the first POST. No match. |
| 20:30:15 | POST `.../download_url` | What the page's "No thanks, just take me to the downloads" link does. Returned JSON holding a `/download/<token>` page URL. |
| 20:30:18 | GET that `/download/<token>` page | Lists the three files with Download buttons. **This path matches the site's robots.txt rule (below).** |
| 20:30:44 to 20:30:52 | GET three of itch.io's public script bundles | Read to check that the POSTs imitate what the page's own script does. |
| 20:31:02 | POST `.../file/16981275?source=game_download&after_download_lightbox=1&as_props=1` | What a Download button does for the pack's zip. Returned a signed storage URL valid for 60 seconds. Only inspected; that URL was not fetched. |
| 20:31:13 | The same POST again, then GET of the new signed URL | The download: HTTP 200, 94,022,790 bytes, about 15 seconds. |

### Facts to weigh

1. **Price and purchase.** The saved purchase page says "This asset pack is free but the developer accepts your support by letting you pay what you think is fair for the asset pack", offers a link "No thanks, just take me to the downloads", and its page data says `"min_price":0` and `"actual_price":0` with `"logged_in":false`. The price box suggests $2.00; the "No thanks" link is the site's own way past it. The saved page also shows a 50% sale banner (until 2028-01-01), which does not matter at a $0 minimum. No payment form was submitted. The log holds no request to PayPal, Stripe, or the `/purchase` form action, and no email address, card, or account was used. **Nothing was purchased.**
2. **What the script sent beyond a plain GET.** On the two POSTs it sent the CSRF token taken from the page's own `<meta name="csrf_token">` as a form field, a `Referer` header, and `X-Requested-With: XMLHttpRequest`. The saved script bundle (`itch-extern.min.js`) shows the page's own code making the same `$.ajax` POST to `"/" + slug + "/download_url"` with the CSRF token. This is how the site's own page behaves, but a person had to click and a script was imitating the click.
3. **Tokens.** Every URL came from the previous response. Nothing was guessed, forged, taken from another user, or replayed after expiry, and the signed storage URL was used straight away. The first signed URL was never fetched.
4. **Blocks and challenges.** None: no CAPTCHA, no Cloudflare challenge page, no HTTP 403 or 429, no rate-limit response. Ten requests went to itch.io hosts in under three minutes (the table's rows, with the script bundles counted separately), followed by the download itself from the storage host.
5. **What the Terms of Service say** (`itch-terms.txt`, saved from https://itch.io/docs/legal/terms on 2026-10-06; its change list ends "Updated April 15 2023"). It does not mention scraping, crawling, bots, or automated or scripted access. Clauses that touch the question: section 3 forbids "Hacking, maliciously manipulating, or misrepresenting itch.io's interface in any way" and "Soliciting, harvesting or collecting information about others"; section 4 grants users a licence to access content "as permitted through the functionality of the Service"; section 8 says that "Use of IP proxies or other methods to disguise your place of residence, whether to circumvent geographic restrictions on content, to purchase at a price not applicable to your geography, or for any other purpose, is a violation of this Agreement"; section 18 lets the terms change without notice. The corporate proxy is the one this machine's environment configures for outgoing traffic, not something chosen to hide a location, and the price is $0 everywhere, so I do not read section 8 as applying, but its closing words are broad, so I am flagging it.
6. **robots.txt, which the first agent did not check before downloading.** I fetched https://pixel-boy.itch.io/robots.txt on 2026-10-07 (a public text file; saved as `itch-robots-pixelboy.txt`). For all user agents it says `Disallow: /*/download/`, `Disallow: /*/rh/`, `Disallow: /*/rp/`, `Disallow: /-/`. The page `/ninja-adventure-asset-pack/download/<token>` fetched at 20:30:18 falls under the first rule. The two POSTs (`/download_url`, `/file/...`) and the signed storage URL do not. robots.txt asks automated clients to keep out; it is not an access control (the page was served openly, with no authentication), and this was one targeted fetch for a task the user allowed, not crawling. But the script was an automated client and that fetch is in the disallowed pattern.
7. **What looks like working around an access control, in short.** (a) Browser-style headers and a CSRF token on two POSTs; (b) skipping the payment suggestion through the site's "No thanks" link; (c) the robots.txt-disallowed fetch above; (d) a proxy and section 8 of the Terms. In my reading none of these was a login, payment, challenge, or block that was defeated, which is why the download went ahead instead of stopping. The ticket's rule is the user's to apply, so I make no claim beyond that.

### If you do not accept a scripted download: exact manual steps

1. Delete `.worktrees\_assets\ninja-adventure-asset-pack.zip` and `.worktrees\_assets\ninja\`. Nothing in the repository depends on them; the three documents were written from them, so the evidence below would need a second look afterwards.
2. In a browser open https://pixel-boy.itch.io/ninja-adventure-asset-pack, click "Download Now", and in the popup either choose "No thanks, just take me to the downloads" or pay what you like.
3. On the download page click "Download" next to "Ninja Adventure - Asset Pack.zip" (89 MB). Skip the two Godot zips.
4. Save it as `.worktrees\_assets\ninja-adventure-asset-pack.zip` and run `Get-FileHash -Algorithm SHA256` on it. If it equals `95a06f4f...2a7b15` (full value above), it is the same file; if the author has published a newer version, the numbers in this inventory need rechecking. Extract it to `.worktrees\_assets\ninja\`.

### Other network access during this ticket

Public pages only: the pages of the fallback and supplement candidates (TinyRPG Collection, Mithrillor, VEXED, Kenney Pirate Pack, three OpenGameArt pages, 0x72), itch.io's Terms of Service and robots.txt, and FontStruct's licensing pages. Saved copies and, for 0x72, two preview screenshots are in `.worktrees\_assets\research\`. No asset from any of them was downloaded.
