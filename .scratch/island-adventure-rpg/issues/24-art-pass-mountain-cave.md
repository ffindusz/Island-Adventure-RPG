# 24: Art pass: the mountain and the cave

**What to build:** Give the mountain and the cave their real look. Terrain and props, the raiders and cave creatures (including the tougher variants and the ranged attackers' projectiles), and the cave's levers and gates get their final art, in the same style as the first two areas. Only presentation changes: no rule, number, or map changes.

**Blocked by:** 17: The cave; 23: Art pass: the coast and the woods

**Status:** ready-for-agent

**Spec stories:** 94, 95, 102

- [ ] Mountain terrain and props (cliffs, boulders, passes, and ledges) and cave terrain and props (rock walls, winding passage floors, and a dim look) replace the placeholders. Collision data stays exactly as authored, and solid and walkable terrain stay easy to tell apart.
- [ ] The mountain raiders (basic, charger, and ranged, including the tougher variant) and the cave creatures (including the tougher variant) use real sprites and animations. Every telegraph stays clearly readable, and the ranged attackers' projectiles have real sprites.
- [ ] Levers (both states) and gates (closed and open) have final art, along with any area-specific props such as signs. Icons exist for the Gear found in these two areas.
- [ ] Every new asset has an entry in the asset licence record, every art reference in these two areas resolves through the asset manifest, and content validation still passes.
- [ ] No rules, numbers, or map layouts change, and every existing test passes untouched.
- [ ] Reviewer play check (manual, in a browser): play through the mountain and the cave and confirm they look like what they are called, match the first two areas in style, and keep telegraphs readable.
