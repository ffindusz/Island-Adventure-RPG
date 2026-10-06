# 23: Art pass: the coast and the woods

**What to build:** Give the shipwreck coast and the woods their real look, and create the art that every area shares. Terrain and props, the monsters that live there, and the interactive pieces (chests, Ammunition caches, Healing Potion pickups, Checkpoints, exits, signs, keys, and locked doors) get their final art. The small shipwreck supplement is made to match the base's style. Only presentation changes: no rule, number, or map changes.

**Blocked by:** 15: The woods; 22: Hero and HUD art

**Status:** ready-for-agent

**Spec stories:** 94, 95, 101, 102

- [ ] Coast and woods terrain and props replace the placeholders, so the coast reads as a wrecked shoreline and the woods as woodland. Collision data stays exactly as authored, and solid things still look solid while walkable things look walkable.
- [ ] The coast's weak monsters, the forest beasts, and the slimes use real sprites and animations (moving, wind-up telegraph for the charger, hurt, and defeat). Every telegraph stays clearly readable in the new art.
- [ ] Shared interactive pieces get final art that later areas reuse: chests (closed and open), Ammunition caches, Healing Potion pickups, Checkpoints (inactive and active), exits, signs, keys, and locked doors (closed and open). Icons exist for the Gear and keys found in these two areas.
- [ ] The shipwreck supplement (wreckage and the wrecked ship) exists, matches the base's style, and has a verified licence recorded. If it is composed from existing pieces, the record says so.
- [ ] Every new asset has an entry in the asset licence record, every art reference in these two areas resolves through the asset manifest, and content validation still passes.
- [ ] No rules, numbers, or map layouts change, and every existing test passes untouched.
- [ ] Reviewer play check (manual, in a browser): play through the coast and the woods and confirm a consistent look, readable telegraphs, and nothing that looks like a wall but is not, or the reverse.
