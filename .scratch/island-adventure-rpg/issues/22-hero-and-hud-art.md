# 22: Hero and HUD art

**What to build:** Replace the placeholder hero and the in-play interface with real art from the art base verified in ticket 02. The hero becomes the single, visually distinctive castaway with idle, four-direction walking, sword, bow, hurt, and defeat animations, and arrows get real sprites. The in-play HUD and the inventory and stat pages get their final look. This ticket also builds the reusable asset-loading and animation pipeline that the later art tickets use. Only presentation changes: no rule, number, or map changes.

**Blocked by:** 02: Verify the art base first-hand; 06: The bow: Ammunition and quick-switching; 07: Healing Potions

**Status:** ready-for-agent

**Spec stories:** 94, 96, 102

- [ ] The hero's idle, walking (up, down, left, right), sword attack, bow attack, hurt, and defeat animations play at the right moments, driven by the Game core's state and events. The sword animation plays with the Melee Weapon and the bow animation with the Ranged Weapon. Arrows have real sprites that point along their travel.
- [ ] Any gap ticket 02 found for the hero (for example sword and bow on one character) is filled according to that ticket's gap plan, and every new asset is added to the asset licence record.
- [ ] The in-play HUD (Health, Experience and Level, Ammunition, Healing Potion count, and the equipped weapon) and the inventory and stat pages use final art in one consistent style that stays readable at the crisp pixel scale. Icons exist for the items that exist so far (the starting Gear, the bow, Ammunition, and Healing Potions).
- [ ] A reusable pipeline exists: art is registered by name in an asset manifest, content refers to art by those names, and loading fails loudly, naming the missing item, instead of drawing nothing. This is tested at the manifest's boundary, and the later art tickets reuse it.
- [ ] Rendering stays a thin layer over the Game core. No rules, numbers, or collision data change, and every existing test at the Game core's interface passes untouched.
- [ ] Reviewer play check (manual, in a browser): walk in all four directions, attack with both weapons, take a hit, be defeated, and review the HUD and both pages for a finished, consistent look.
