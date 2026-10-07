# 02: Verify the art base first-hand

**What to build:** A written, first-hand check of the art base before the project commits to it. The provisional base is the CC0 Ninja Adventure pack (pixel-boy, itch.io), but public text could not confirm that it covers every Adventure Area or a hero with both sword and bow. Inspect the actual files and report what the game needs, what the pack covers, what is missing, and how to fill each gap; if the pack fails, recommend a fallback. Gameplay tickets proceed on placeholder art in the meantime, so this ticket gates only the art tickets (22-25).

**Blocked by:** None (can start immediately)

**Status:** resolved

**Download permission:** On 2026-10-06 the user allowed downloading the provisional base pack (Ninja Adventure, free) for this inventory, replacing the earlier "previews only; do not download". Not covered: any purchase or paid asset, and downloading any other pack. Fallbacks and the shipwreck supplement are researched through their public pages and previews only; ask before downloading them. The agent does the inventory, but whether the art is acceptable is the user's judgment, so the last criterion is completed by the user, not the agent. Downloaded files stay outside the repository; later art tickets copy in only what they use, each with a licence record entry.

**Spec stories:** 94-96, 99-102

- [x] The pack is downloaded only as permitted above, to a location outside the repository, and nothing is purchased. If the download cannot be scripted without working around an access control, the agent stops and gives the user exact manual steps instead.
- [x] A coverage matrix marks each need as found, partial, or missing: terrain for the shipwreck coast, woods, mountain, cave, and old castle with harbor; one hero with walk, sword, and bow animations; monsters for every Adventure Area including undead; a distinct Guardian; chests, Ammunition caches, Healing Potions, keys, doors, and levers; HUD and page art; arrow and effect sprites; the tile size; and any bundled music and sound effects.
- [x] The licence is confirmed from the pack's own licence text or page (not from a summary), with source and date. Every other asset source (the shipwreck supplement, any audio) has a confirmed licence that allows public and commercial use. All of this goes into a single asset licence record (each asset's source, licence, date checked, and required attribution text) that later tickets extend and that the credits screen draws from.
- [x] Each gap has a concrete plan: the small, visually matching shipwreck supplement (a verified-licence source, or composition from existing pieces), and sword plus bow on one hero (for example, borrowed animations). If the pack is rejected, a fallback is recommended from the candidates already researched (TinyRPG Collection, Mithrillor Pixel RPG Characters Pack, VEXED "Another Perspective") with price, licence, and redistribution terms.
- [x] The result is recorded as a short decision record, and the working tile size assumed in ticket 01 is confirmed or the needed change is noted.
- [x] The user reviews the result and approves the art base or picks a fallback; the decision is recorded.

## Comments

Resolved on integration/island-adventure-rpg at 7d346c5 (the merge), after the user approved the art base with the named gaps filled on 2026-10-07; see "Decision" at the end of these comments. ADR 0004 is Accepted.

- Built three documents, no art copied in: `docs\assets\art-base-inventory.md` (24-row coverage matrix, evidence, gap plan G1-G7, what was not verified, full download provenance), `docs\assets\licences.md` (pack A1 CC0 1.0 from the archive's `LICENSE.txt`, `README.md`, and the itch page, checked 2026-10-06 and re-read 2026-10-07; font conflict; supplement candidates S1-S4; fallbacks F1-F3), and `docs\adr\0004-art-base.md` (Proposed). Tile size: 16 px confirmed, no change to ticket 01.
- Recommendation: accept with named gaps filled; TinyRPG Collection if the pack is rejected. Defaults chosen: hero not picked (Hunter appears only in a mock-up); pack font `NormalFont.ttf` not used (the file says FontStruct Non-Commercial); wreck composed from pack pieces first, with 0x72 "16x16 Pirates Tileset" (S4) as the supplement.
- Criterion 1 is left unticked on purpose. The first implementer scripted the download with curl through the page's own "No thanks, just take me to the downloads" path (minimum price $0, nothing bought, no login), but the site's robots.txt disallows `/*/download/`, which the script fetched. Whether that counts as working around an access control is the user's call; the facts and manual re-download steps are in the inventory.
- Criterion 3 is left unticked: the pack licence is confirmed, but the audio, `Ui\Input`, and `Ui\Skill Icon` provenance rests on the pack's CC0 claim alone, and S4's CC0 is by the author's page text only.
- Manual checks remaining (criterion 6 is the user's): look at the example GIFs, `views\mockup_hero_Hunter.png`, `views\mockup_gaps.png`, the contact sheets, and the 0x72 screenshots; listen to the music; choose the hero and the replacement font; approve or reject. Paths are in ADR 0004, "For the user".

### Decision (2026-10-07)

The user answered the five questions of ADR 0004, "For the user", and approved the art base with the named gaps filled. ADR 0004 is Accepted, and tickets 22-25 are no longer gated by this one.

- Pack: approved with the named gaps filled; the fallback is not needed. This includes accepting the pack's own CC0 claim for its audio and for `Ui\Input` and `Ui\Skill Icon`.
- Download: the scripted download of 2026-10-06 is acceptable (criterion 1). The archive stays in `.worktrees\_assets\`; nothing is deleted or fetched again.
- Hero: the Hunter. Font: the pack's `NormalFont.ttf` is replaced. Composed art: the wreck, sword, bow, ammunition cache and recolored Guardian are accepted, and no hand-drawn replacements are to be ordered.
- Criterion 3 is ticked on this basis. The pack licence is confirmed from its own `LICENSE.txt`, `README.md` and page, and the audio residual is accepted by the user. The shipwreck supplement (0x72, by the author's page text only) is not in use; a fallback only if the composed wreck is weak in ticket 23, and then its licence is re-read and the user's permission to download it is asked first. The replacement font is not chosen yet: ticket 22 picks it and gives it an entry in `docs\assets\licences.md`, asking before it downloads anything.
- Still the user's, not blocking: asking the pack's author what licence `NormalFont.ttf` really has (optional).
