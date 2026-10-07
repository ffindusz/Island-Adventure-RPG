# 0004. Art base: Ninja Adventure Asset Pack, with named gaps filled

Status: **Proposed**. Waiting for the user's approval; nothing here is decided until the user approves it or picks a fallback.

Evidence: `docs\assets\art-base-inventory.md` (coverage, gap plan) and `docs\assets\licences.md` (licence record). Checked 2026-10-07 against the files of the archive downloaded 2026-10-06.

## Proposal

Use the CC0 Ninja Adventure Asset Pack by Pixel-Boy and AAA (https://pixel-boy.itch.io/ninja-adventure-asset-pack) as the art and audio base, and fill these gaps:

1. Shipwreck and old ship: compose from pack pieces first; take a small CC0 supplement only if that looks weak.
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

## For the user

Look at, outside the repository (`.worktrees\_assets\`):

- The pack's own example screens (`ninja\Ninja Adventure - Asset Pack\Example 1.gif` to `Example 4.gif`) for the overall look.
- Contact sheets in `views\` of the terrain (`floor.png`, `nature.png`, `water.png`, `relief.png`, `house.png`, `interior.png`), monsters (`monsters_1.png` to `monsters_3.png`), bosses (`boss_idle.png`, `boss_attack.png`), characters (`hunter_etc.png`, `undead_chars.png`), and the HUD (`ui_receptacle_top.png`, `ui_theme_wood.png`, `ui_dialog.png`).
- The music in `Audio\Musics` and a few sound effects, for fit.

Decide:

- Approve the pack as the art base, approve it with the gaps above, or pick a fallback.
- Whether the way the archive was downloaded is acceptable (see the provenance section of the inventory).
- Which character becomes the hero.
