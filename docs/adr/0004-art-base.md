# 0004. Art base: Ninja Adventure Asset Pack, with named gaps filled

Status: **Proposed**. Waiting for the user's approval; nothing here is decided until the user approves it or picks a fallback.

Evidence: `docs\assets\art-base-inventory.md` (coverage, gap plan) and `docs\assets\licences.md` (licence record). Checked 2026-10-07 against the files of the archive downloaded 2026-10-06.

## Proposal

Use the CC0 Ninja Adventure Asset Pack by Pixel-Boy and AAA (https://pixel-boy.itch.io/ninja-adventure-asset-pack) as the art and audio base, and fill these gaps:

1. Shipwreck and old ship: compose from pack pieces first (a washed-up lifeboat, mast, planks, cargo); take a small CC0 supplement only if that looks weak (candidates: 0x72's "16x16 Pirates Tileset", OpenGameArt's "Ship / Destroyed Ship"), recolored to the pack's palette.
2. One hero with sword and bow: compose from a standard character's pose, a held weapon sprite, slash effects, and an arrow projectile; the pack has no hand-drawn animation for either weapon on one standard character.
3. Undead Guardian: recolor a samurai boss and add spectral effects.
4. Cave and castle terrain, and the ammunition cache: assemble from existing tiles and props.
5. Font: do not use the pack's `NormalFont.ttf` (its file says "FontStruct Non-Commercial License"); pick a font with a confirmed licence.

The 16 px tile size assumed in ticket 01 is confirmed; no change.

## Why

- The licence is CC0 1.0, read from the archive's `LICENSE.txt` and `README.md` and from the page, so public and commercial use is allowed and no attribution is required. Assets can also live in a public repository.
- The pack is one consistent style and covers every need except those above; each gap has a plan that stays inside the pack's style.
- Gameplay tickets are built on placeholders, so this decision only gates art tickets 22-25 and can still be reversed (spec story 102).

## Consequences

- Some art is assembled or recolored by hand in later art tickets (22-25), which is work the pack does not do for us.
- The chibi, warm-palette look is fixed by this choice. Whether it reads as "beautiful" is a judgment only the user can make.
- The credits screen draws from `licences.md`. Only a courtesy credit for the pack is needed.

## Alternatives considered

The saved public pages and previews only; nothing bought or downloaded.

- **TinyRPG Collection** (ansimuz): $129.99, "Use in personal and commercial games. You may not resell or redistribute the assets, even if modified." Broad, but castle, mountain, and ship material are battle backgrounds; assets could not live in a public repository.
- **Pixel RPG Characters Pack** (Mithrillor): name your own price (the full pack lists $2 or more); commercial use allowed; no resale, redistribution, or re-upload. A sword Warrior and a crossbow Archer as separate characters at 32 px, so it is a hero supplement at best, not a terrain base, and its scale differs from a 16 px tile.
- **Another Perspective** (VEXED): $1.95 minimum, CC BY 4.0 (attribution required). It is on an 8x8 scale, which would change ticket 01's tile size.

If the pack is rejected, the first choice is TinyRPG Collection for breadth, with the redistribution limits noted. Neither of the others covers the game alone.

## How the archive was obtained

The first implementer agent for ticket 02 scripted the download with curl on 2026-10-06. It used the pack's own free path (the page's "No thanks, just take me to the downloads" link; the minimum price is $0), bought nothing, used no login, and repeated the two requests the page's script makes. The ticket says to stop and give manual steps if scripting would work around an access control. This record cannot settle that. The Terms of Service say nothing about scripted access, but the site's robots.txt disallows the `/*/download/` page that the script fetched, and the agent had not read robots.txt beforehand. The full facts, and exact manual steps to download by hand and compare the SHA-256, are in the inventory under "Download provenance".

## For the user

Everything below is outside the repository, under `C:\Users\A1432734\Workspace\learning\Home\Fantasy-Lite\.worktrees\_assets\`.

Look at:

- The pack's own example screens, `ninja\Ninja Adventure - Asset Pack\Example 1.gif` to `Example 4.gif`, for the overall look.
- `views\mockup_hero_Hunter.png`, a rough mock-up of one hero swinging a sword and shooting a bow, composed from pack pieces.
- Contact sheets in `views\`: terrain (`floor.png`, `nature.png`, `water.png`, `relief.png`, `house.png`, `interior.png`), the boat and sail (`vehicles.png`), monsters (`monsters_1.png` to `monsters_3.png`), bosses (`boss_idle.png`, `boss_attack.png`), characters (`hunter_etc.png`, `undead_chars.png`), and the HUD (`ui_receptacle_top.png`, `ui_theme_wood.png`, `ui_dialog.png`). The shipwreck supplement candidate is in `research\0x72-pirates-shot1.png` and `0x72-pirates-shot2.png`.
- The music in `ninja\Ninja Adventure - Asset Pack\Audio\Musics` and a few sound effects, for fit. An agent cannot listen.

Decide:

1. Approve the pack as the art base, approve it with the named gaps, or pick a fallback (TinyRPG Collection first).
2. Whether the way the archive was downloaded is acceptable. If not, delete it and download by hand; the steps are in the inventory.
3. Which character is the hero, a fixed and silent castaway (Hunter is the one mocked up).
4. Whether to replace the pack's font as proposed (and, optionally, ask the author what licence it really has).
5. Whether the composed wreck, sword, bow, and ammunition cache and the recolored undead Guardian are acceptable, or whether hand-drawn replacements should be ordered.

## Decision

Not made yet. The user records it here: approved, approved with changes, or rejected with the chosen fallback, and the date.