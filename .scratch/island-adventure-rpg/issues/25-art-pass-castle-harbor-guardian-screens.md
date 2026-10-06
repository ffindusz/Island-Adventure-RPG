# 25: Art pass: the castle, the harbor, the Guardian, and the screens

**What to build:** Give the old castle, its forgotten harbor, and the Guardian their real look, then finish the screens: the title screen, the ending, the credits, the Automap page, and the text boxes get the final style, so the whole interface is consistent. Only presentation changes: no rule, number, or map changes.

**Blocked by:** 20: The forgotten harbor and the ending; 24: Art pass: the mountain and the cave

**Status:** ready-for-agent

**Spec stories:** 19, 94, 95, 102

- [ ] Castle terrain and props (courtyards and halls), the harbor, and the old vessel replace the placeholders. The harbor reads as forgotten and the vessel as old but able to sail. Collision data stays exactly as authored.
- [ ] The castle undead (including the tougher variant) use real sprites and animations. The Guardian looks distinctly different from ordinary undead and imposing, with a clearly readable telegraph for each of its attack patterns and for any projectile or effect it produces.
- [ ] The title screen, the ending text screen, and the credits screen have final art. The credits show every attribution from the asset licence record legibly.
- [ ] The Automap page, the opening and area text boxes, the clue text, and any HUD or page element not yet restyled use the same final style as the HUD and pages from ticket 22. Icons exist for the Gear found in these areas.
- [ ] Every new asset has an entry in the asset licence record, every art reference in the castle, harbor, and screens resolves through the asset manifest, and content validation still passes.
- [ ] No rules, numbers, or map layouts change, and every existing test passes untouched.
- [ ] Reviewer play check (manual, in a browser): go from the title screen through the castle, the Guardian fight, and the ending and credits, and confirm one consistent look, readable Guardian telegraphs, and legible credits.
