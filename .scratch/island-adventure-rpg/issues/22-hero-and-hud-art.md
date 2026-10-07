# 22: Hero and HUD art

**What to build:** Replace the placeholder hero and the in-play interface with real art from the art base verified in ticket 02. The hero becomes the single, visually distinctive castaway with idle, four-direction walking, sword, bow, hurt, and defeat animations, and arrows get real sprites. The in-play HUD and the inventory and stat pages get their final look. This ticket also builds the reusable asset-loading and animation pipeline that the later art tickets use. Only presentation changes: no rule, number, or map changes.

**Blocked by:** 02: Verify the art base first-hand; 06: The bow: Ammunition and quick-switching; 07: Healing Potions

**Status:** ready-for-agent

**Spec stories:** 94, 96, 102

- [x] The hero's idle, walking (up, down, left, right), sword attack, bow attack, hurt, and defeat animations play at the right moments, driven by the Game core's state and events. The sword animation plays with the Melee Weapon and the bow animation with the Ranged Weapon. Arrows have real sprites that point along their travel.
- [x] Any gap ticket 02 found for the hero (for example sword and bow on one character) is filled according to that ticket's gap plan, and every new asset is added to the asset licence record.
- [x] The in-play HUD (Health, Experience and Level, Ammunition, Healing Potion count, and the equipped weapon) and the inventory and stat pages use final art in one consistent style that stays readable at the crisp pixel scale. Icons exist for the items that exist so far (the starting Gear, the bow, Ammunition, and Healing Potions).
- [x] A reusable pipeline exists: art is registered by name in an asset manifest, content refers to art by those names, and loading fails loudly, naming the missing item, instead of drawing nothing. This is tested at the manifest's boundary, and the later art tickets reuse it.
- [x] Rendering stays a thin layer over the Game core. No rules, numbers, or collision data change, and every existing test at the Game core's interface passes untouched.
- [ ] Reviewer play check (manual, in a browser): walk in all four directions, attack with both weapons, take a hit, be defeated, and review the HUD and both pages for a finished, consistent look.

## Comments

### What was built

- The pipeline (criterion 4). `src/adapter/asset-manifest.ts` registers every picture by name, as `image(file)`, `sheet(file, frameWidth)` or `drawn(rows, palette)` (a small picture drawn in code), and holds the one tested piece: `missingArt` and `requireArt`, a pure check of the names that are needed against anything that can say whether a name is there (`ArtLookup`: the manifest, or Phaser's loaded textures). `src/adapter/artwork.ts` is the one list, a line per picture, and `src/adapter/asset-loader.ts` loads it (`queueArt`, `buildDrawnArt`, `requireLoadedArt`). Content asks for art by name only: `gear-<id>` and `consumable-<id>`. `startAdapter` throws, naming them, when the content needs a name the manifest lacks, and the scene throws, naming the picture, when a file did not load.
- The hero (criteria 1 and 2). `src/adapter/hero-sprite.ts` (`HeroSprite`) draws the Hunter from the view and the events: standing and a four-direction walk, the sword pose with the held sword turning about its grip and the pack's four-frame slash, the bow pose with the held bow, a red blink when hit and the Dead cell when defeated. The hero's arrows are real sprites that point along their flight. `src/adapter/depths.ts` orders what draws above what; `art.ts` lost the placeholder hero and arrow and `feedback.ts` the placeholder flash.
- The interface (criterion 3). `src/adapter/ui-layer.ts` (`UiLayer`: nine-patch frames, whole-pixel icons, text and bars) and `src/adapter/pixel-font.ts` (the project's own 5 by 7 bitmap font, no font file) are the one place the look lives. `hud.ts`, `overlay.ts` (stat page, inventory, level-up choice, pause), `notice.ts` and `area-banner.ts` are built on them: the pack's wooden theme with its orange frame, a heart, an icon on every Gear and consumable line, and the pack's orange button behind the line the cursor is on.
- In the Game core, additively: `PlayingView.progress` (`{ level, experience: { earned, needed } | null }`) and `COVERED_CORNER`, `SCREEN_TILES` and `checkCoveredCorners`, which `loadContent` calls.
- 13 pack files in `public/art/`, each listed under A1 "Used so far" in `docs/assets/licences.md` in the commit that copies it, and byte-identical to the pack's (checked by SHA-256). Two armor icons are drawn in code (`drawn-icons.ts`), because the pack has none. 21 new tests in three files; no existing test changed. Nothing was downloaded.

### Decisions and defaults

- The user's art decisions of 2026-10-07 were followed as given: the Hunter is the hero, fixed and silent, with no character choice; the sword, the bow and the cache are composed from the pack's sprites, with no hand-drawn frames ordered; `NormalFont.ttf` and the pack's bitmap fonts were not copied. The follow-up under A2 in the licence record (a font) is settled by the project's own bitmap font, which is no file.
- The font is monospaced, 5 by 7 with a 6 pixel advance, drawn with rectangles, so it stays sharp at every zoom. It has the capital letters, the digits and the signs the pages use; a new character needs its glyph in `pixel-font.ts` first.
- The HUD panel is opaque: a see-through one showed a two-tone tint over water and sand. The area banner keeps its see-through look (0.9). The HUD is 88 by 46 canvas px, the footprint it already had, and shows the weapon in hand (a sword with its point up, or the bow) and the Ammunition and Healing Potion counts, grey at 0.
- `progress` in the playing view is a pure projection of what the stat page already worked out (the Level, and the Experience earned toward the next Level, null at the highest), added so that the HUD can show them. It is tested at the Game core's interface.
- The covered corner. In an area larger than the 20 by 12 tiles of the screen the camera stops at the map's corner and the HUD covers its top-left 6 by 3 tiles (`COVERED_CORNER`, 96 by 48 canvas px). `checkCoveredCorners` makes `loadContent` throw, naming the area and the tile, when one of them is walkable in such an area. In the adapter, `checkHudFootprint` makes the scene refuse to start when the HUD (`HUD_RIGHT` by `HUD_BOTTOM`, 90 by 48 with its 2 px margin) is bigger than that corner. The banner's top still follows `HUD_BOTTOM`.
- **Rule for tickets 14 to 20 (the areas):** an Adventure Area larger than 20 by 12 tiles, in either direction, must keep its top-left 6 by 3 tiles solid, or the game does not start and says which tile. An area of exactly 20 by 12 tiles or smaller is exempt, because it never scrolls. The Overgrown Trail already complies. Ticket 14, if it makes the coast bigger than 20 by 12, must do the same.
- The Shipwreck Coast (20 by 12) is exempt, but it has walkable beach under the HUD (cols 1 to 5, rows 1 to 2): a hero standing there can be hidden behind the panel. I did not change the map, which is outside this ticket.
- Naming for the content: `gear-<id>` and `consumable-<id>` (`gearIcon`, `consumableIcon` and `neededArt` in `artwork.ts`). A new Gear or consumable needs its line in `ARTWORK` under that name, or the game does not start and says which is missing. A new kind of find shown by the notice also needs its picture in `iconFor` in `notice.ts`. Adding a picture is: the file in `public/art/`, one line in `ARTWORK`, one line in the licence record.
- `vite.config.ts` sets `appType: 'mpa'`. With Vite's default single-page fallback the dev server answers a request for a missing `.png` with `index.html` and a 200, so a missing file hid behind a "loaded" texture; with `mpa` it is a real 404 and `requireLoadedArt` names the picture.
- The held weapon and the HUD's weapon icon go by slot: the view says which slot is in hand, not which piece of Gear is equipped, so the hero holds the same sword for the basic and the steel one. The inventory shows each piece's own icon.
- The walk is inferred from the hero's position changing between frames (the view has no "moving" flag). After `hero-defeated` the hero lies in the Dead cell for 700 ms, or until it moves or attacks, at the place it came back to, because the Game core has already put it back there, whole.
- Crispness: nearest-neighbour textures, whole-pixel positions (sprites of odd size sit on a half pixel so that their edges stay whole), and ticket 08's whole-number zoom.

### How to run it

- `npm.cmd run dev` and open the URL. The hero starts on the coast as the Hunter, with the HUD at the top left and the area text under it. Walk with the arrows or WASD, attack with Space, open the chests and the cache around the start with E, then I (the Up and Down keys and Enter equip, Esc closes), Q takes the other weapon in hand and C opens the stat page. `npm.cmd run build` then `npx.cmd vite preview` serves the production build, which holds `public/art/`.
- `?debug` exposes `window.gameCore`.
- To see the loud failure: take a line out of `ARTWORK`, or point it at a file that is not there. The page throws, naming the picture.

### How it was verified

- `npm.cmd run check` on this branch at `fb1c17f`: typecheck exit 0, 486 of 486 tests in 31 files (465 in 28 before), build OK. Every existing test file is unchanged (`git diff --name-status` shows three new test files and nothing modified under `tests`). The integration tip `da2f6a8` was merged at the end ("Already up to date": tickets 09 and 12 had not merged yet) and the check gave the same result again.
- Test-first, at the seam agreed for this ticket: the manifest through its public functions with in-memory fakes (`tests/asset-manifest.test.ts`, 8 tests: the missing names, each once and in the order first asked, the loud error that names them all, nothing thrown when nothing is missing, the same question put to loaded textures, and `toString`, `constructor` and `__proto__` not taken for pictures); the view's `progress` (`tests/hero-progress-view.test.ts`, 4 tests); the covered corner (`tests/covered-corner.test.ts`, 9 tests). Two of the manifest tests (loaded textures, inherited names) pin what the code already did, so they were green at once; mutations B and C below show that they can fail.
- Mutations of the manifest, each confirmed red and then reverted (nothing is left in the tree): `manifestLookup` saying that every name exists (6 of the 8 tests fail); `name in manifest` instead of `Object.hasOwn(manifest, name)` (the 3 inherited-name tests fail); `requireArt` that never throws (2 fail). The test that a missing name is reported once was red first and went green with the `Set`.
- Loud failure on the dev server, each reverted: `gear-steel-sword` taken out of `ARTWORK` made the page throw, naming it, and the smoke tool fail; pointing `arrow` at a file that does not exist gave a 404 and an error naming `arrow`; `HUD_WIDTH` 96 gave the covered-corner error ("The HUD covers the top left 98 by 48 pixels, but the content keeps only 96 by 48 solid under it"), and 88 passes again.
- Headless Edge, with the shared smoke tool and my own page scripts (real key presses, and `window.gameCore` in `?debug` to set a scene up). I opened the screenshots and looked at them: 0 console errors, 0 page errors and 0 HTTP errors apart from `/favicon.ico`.
  - The hero idle and mid-walk in all four directions; the sword attack and the bow shot in all four directions, a frame at a time on a fake clock, with the slash and an arrow in flight; a hit (the red blink); a defeat (the Dead cell).
  - The HUD at the start, with the bow in hand, with no Ammunition and no potions (grey), and over solid rock in the trail's north-west corner.
  - The stat page; the inventory (new game, full of Gear, the cursor on a piece of Gear and on the potion line, scrolled, "INVENTORY 6/8"); the level-up choice; the pause page; the out-of-ammunition notice; the pickup notices (sword, bow, armor, arrows, potions from a chest and from the beach); the area banner on the trail.
- The production build: `npm.cmd run build` puts all 13 files in `dist/art/`. `vite preview` on port 5122 (stopped by PID afterwards) shows the same screens, a file that does not exist is a real 404, and the smoke tool passes. A build with `--base=/island/`, served under `/island/`, boots and loads all 13 pictures too (deleted afterwards).
- Other window sizes, on the production build: the canvas at 1366 by 768 and at 1920 by 1080 comes out at 1280 by 768 and 1600 by 960 pixels (4 and 5 times, whole numbers as ticket 08 has it). The HUD, the hero and the tiles are sharp, with 0 console, page or HTTP errors. Smaller windows were not tried.
### Left for manual review

- The reviewer play check (the last criterion) stays unticked. I drove the page with real key presses and with the core's commands, and looked at screenshots, but did not play by hand.
- How the motion feels: the walk (110 ms a frame), the sword pose (200 ms), the bow pose (180 ms), the hit blink (200 ms) and the lying pose (700 ms) were checked a frame at a time, not at full speed. The timings are constants at the top of `hero-sprite.ts`.
- Whether the look is finished and consistent to a person's eye. The world around the hero (tiles, monsters, chests, exits) is still the placeholder shapes of `art.ts` until the art passes, tickets 23 to 25.

### Suggestions

- The view could carry whether the hero is moving, and the ids of the equipped Gear: the walk is now inferred from the position, and the held weapon and the HUD icon go by slot, so the HUD cannot show the steel sword's own icon.
- A defeat shows the hero lying at the place it comes back to, because the core has no defeated phase or position. If the hero should lie where it fell, ticket 09's recovery would need to expose one.
- The coast's walkable beach under the HUD: make its top-left 6 by 3 tiles solid, or let the HUD fade while the hero is under it.
- The armor icons are drawn in code, because the pack has none. If hand-drawn ones are wanted later, they replace the two `drawn` lines in `ARTWORK` with `image` lines.
- The pack draws its bow lying on its side with the string on top, so in the inventory and the HUD the icon can read as a bowl. A turned copy could be used in the inventory (the HUD row is 11 px high, which a turned bow, 15 px tall, would not fit).
- Counts have room for two digits in the HUD. A Healing Potion or Ammunition count of 100 or more would overflow the panel; nothing caps them today.
- While several Levels wait for their choice, the level-up panel names the Level of the choice, the lowest first (the core's rule), and the HUD under it already shows the Level reached, so "LEVEL 2" can sit over "LV 6". It is right by the core's rules, and it may still read as a mistake; nothing was changed.
- GLOSSARY.md lacks: hero, monster, strike zone, telegraph, wind-up, chest, inventory, Interact, pickup, cache, drop, consumable, weapon in hand, arrow, milestone, page, stat page, level-up choice, asset manifest, covered corner and HUD.
