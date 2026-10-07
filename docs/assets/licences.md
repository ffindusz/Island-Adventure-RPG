# Asset licence record

The single record of every graphics, audio, and font asset the game uses or has considered: its source, its licence, the date the licence was checked, and the attribution text the credits screen shows.

How it is used:

- Later art and audio tickets extend this file. A ticket that copies an asset file into the repository adds or updates that asset's entry in the same commit. Nothing is copied in without an entry whose status is "In use".
- The credits screen draws from the "Credits text" lines of entries that are "In use".
- Rule from the spec: every graphics and audio asset must permit public and commercial use.

Last updated: 2026-10-07. The user approved the Ninja Adventure pack as the art base that day (ADR 0004). Nothing is in use yet: ticket 02 only inspected the pack outside the repository, and no asset file has been copied into the repository.

## Summary

| ID | Source | Licence | Checked | Status |
| --- | --- | --- | --- | --- |
| A1 | Ninja Adventure Asset Pack: art, audio, and the other files | CC0 1.0 Universal | 2026-10-06, re-read 2026-10-07 | Approved base on 2026-10-07 (ADR 0004); nothing in use yet |
| A2 | Ninja Adventure `Ui\Font\NormalFont.ttf` | FontStruct Non-Commercial License (embedded in the font file), conflicting with the pack's CC0 claim | 2026-10-07 | Do not use; the user confirmed on 2026-10-07 that it is replaced |
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
- **Audio in the pack:** 41 music tracks (`.ogg`) and 147 sound effects and jingles (`.wav`) fall under the same CC0 claim. The files carry no author, title, or licence tags (encoder tags show FL Studio only), so per-file authorship cannot be verified beyond the pack's claim; the page says "Made with Aseprite, Godot, FL Studio". The `Audio\Sounds\Voice` folder is not used (the spec has no voice acting).
- **Used so far:** nothing. The art tickets list here, per file or folder, what they copy in.

### A2. Ninja Adventure font `Ui\Font\NormalFont.ttf`: do not use

- **Finding:** the font file's own name table says "Copyright pixel-boy 2021", family "NinjaAdventure", licence "FontStruct Non-Commercial License", built with FontStruct. That is not CC0. Taken by its name, it is a non-commercial licence. FontStruct's own announcement of the licences (https://fontstruct.com/news/2013/07/05/new-licensing-options/, July 5th 2013, saved 2026-10-06) says that "Downloaders are free to use these fonts either commercially or non-commercially depending on which of the two is used" and that both new FontStruct licences "prohibit redistribution of the downloads by anyone apart from the designing FontStructor". FontStruct's FAQ "Can I use FontStruction X in a project?" (saved 2026-10-06) adds that all licences in use on FontStruct require crediting the original designer. The designer is the pack's author, so he may have meant it as CC0, but the shipped file says otherwise, and the font's FontStruct page could not be read (the saved copy is a login page), so its exact terms are unconfirmed.
- **Decision for the project:** do not use or ship `NormalFont.ttf`; the user confirmed on 2026-10-07 that it is replaced (ADR 0004). The HUD and pages use a font with a confirmed licence instead (ticket 22 picks it and adds its own entry here; fetching a font needs the user's permission, because the download permission covered the pack only). The bitmap fonts `font8x8.png` and `font24x30.png` in the same folder have no stated provenance, so they are not relied on either.
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
