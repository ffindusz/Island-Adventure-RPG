# 06: The bow: Ammunition and quick-switching

**What to build:** The hero can find a bow (the Ranged Weapon), switch between sword and bow on the fly with Q, and shoot in the facing direction with Space. Each shot consumes one Ammunition (one generic type with one shared count). Ammunition is found in marked caches, opened with E like a chest, and is occasionally dropped by monsters. The HUD shows the active weapon, Ammunition, and Health. Both weapons share one short attack cooldown.

**Blocked by:** 05: Gear and the inventory

**Status:** resolved

**Spec stories:** 33-35, 37-39, 45

- [x] A bow is collectable (a chest in the placeholder area) and equippable in a Ranged Weapon slot alongside the Melee Weapon and armor slots. The inventory page lists the bow and the Ammunition count.
- [x] Q switches the active weapon between Melee and Ranged, and Space attacks with the active weapon. Both share one cooldown; there is no stamina or mana.
- [x] Shooting launches a projectile in the facing direction that damages the first monster it hits using Attack (including the bow's bonus), is stopped by solid terrain, and consumes exactly one Ammunition. With zero Ammunition nothing fires and the player gets clear feedback.
- [x] Marked Ammunition caches grant Ammunition once. Monsters can occasionally drop Ammunition through the injectable random source; drop tables are content data.
- [x] The HUD shows the active weapon, Ammunition, and Health.
- [x] Tests at the Game core's interface cover switching, the shared cooldown, one Ammunition per shot, firing at zero, projectile hits and terrain blocking, one-time caches, and deterministic drops from a seeded random source.
- [ ] Reviewer play check (manual, in a browser): pick up the bow and a cache, switch with Q, shoot a monster from range, run out of Ammunition, and see the feedback.

## Comments

Resolved on integration/island-adventure-rpg at e06b7cd

### What was built

- Weapons in the core: a Ranged Weapon slot beside the Melee Weapon and armor, the weapon in hand (`activeWeapon`, in the state, the view and the snapshot), the `switch-weapon` command, and `attack` routed to a strike or a shot (`weapons.ts`). Both weapons share the one cooldown, and nothing but Ammunition is spent. `stats.ts` counts a weapon's bonus for its own attacks only.
- Ammunition is a consumable (`consumables.ts`; one kind, and the hero starts with none). A shot (`arrows.ts`) costs one and launches an arrow, which is state: it flies each fixed step, hurts the first monster it reaches with the bow's Attack, and is stopped by solid terrain, a chest or its range. With none, the core emits `out-of-ammunition` and nothing else happens.
- Caches are chests whose contents are a consumable. A monster type can have a `drops` table, rolled with the injected random source when a monster is defeated by a strike or an arrow (`drops.ts`, `monster-damage.ts`).
- Content: the hero's `rangedWeapon` numbers, a Short Bow, a bow chest and a cache of six arrows beside the start of the shipwreck coast, and a crab that now and then drops two arrows. The loader validates all of it.
- Adapter: Q; the HUD's weapon in hand and Ammunition count; arrows; a cache drawn as a crate of arrows; a red OUT OF AMMUNITION notice with a hint for Q; the Ammunition on the inventory page. The README has a new section, "The bow, Ammunition and drops".
- 105 new tests (362 in 22 files, up from 257 in 18), all at the Game core's interface: new `weapons`, `ammunition`, `arrows` and `drops` files, plus additions to the fixtures and the shipped-content checks.

### Decisions and defaults

- Gear slots are melee, ranged, armor, in that order, so the inventory lists the bow after the sword. The weapon in hand starts as the sword and a defeat keeps it.
- A weapon's bonus counts for its own attacks only (ticket 05's suggestion): the sword's for strikes, the bow's for arrows. The stat page, the inventory page and the level-up view show the Attack of the weapon in hand. Armor and Defense are unchanged.
- Q takes the bow in hand only while one is equipped; going back to the sword always works. It takes no time and leaves the cooldown alone. It does nothing at the title, while a page is open or while a Stat Point waits. Equipping a bow does not take it in hand, the player presses Q. The adapter does not capture Q, so browser shortcuts still work.
- The shot: the arrow starts at the hero's centre and flies `arrowSpeedTilesPerSecond` (12) for `range` tiles (7), `arrowSize` 0.3 wide (the loader refuses one wider than the hero). It hurts the first living monster it reaches, a monster that walks into it as well, with the Attack of the bow at that moment, and is gone. Solid terrain and chests stop it; it does not open a chest. Arrows belong to the Adventure Area they were shot in, wait while the game waits, and a defeat removes them. That removal is in `game.ts`, so `hero-damage.ts`, which ticket 08 rewrites, stays untouched.
- With no Ammunition `attack` emits `out-of-ammunition`, but only when the cooldown is over, and starts no cooldown, so the hero can switch to the sword at once. The adapter shows a red notice for 3 s with a hint for Q. There is one notice slot: the latest of this and a pickup.
- Drops go straight into the hero's count with the usual `pickup` event, so nothing lies on the ground. Each entry of a drop table is rolled once for each defeat, whatever its chance, so tuning one never shifts the next roll. A roll below the chance drops, so 0 never drops and 1 always does. Drop events come after the Experience ones. A type without a table asks for no roll, and `random` serves nothing else.
- A cache is a chest with `{ kind: 'consumable', consumable, amount }`: it opens once, is solid, and is remembered per Adventure Area like any chest. `ChestView.holds` (`'gear'` or the consumable's id) tells the adapter what to draw.
- A defeat leaves the Ammunition count alone for now and no test pins it, because rolling consumables back to a Checkpoint is ticket 09's. Checkpoints, potions and other consumables are not part of this ticket.
- The bow and the cache stand on the placeholder coast, as the ticket says. The spec has the first bow in the woods, which the content tickets will do.
- Placeholders for the tuning pass: the Short Bow's +1, six arrows in the cache, the crab's drop (2 arrows, 25%), arrows at 12 tiles a second for 7 tiles. The HUD's weapon icons are fixed bitmaps, placeholders for ticket 22.
- `SNAPSHOT_VERSION` stays 1, because nothing is saved before ticket 11. The snapshot carries the weapon in hand, the Ammunition and the arrows in the air.

### How to run it

- `npm.cmd run dev`. Hold Right for half a second, then Up until the hero stops against the chest two tiles right and two up of the start; E (FOUND SHORT BOW). Hold Down to the cache two tiles right and two down; E (FOUND AMMUNITION +6). I, Down, Enter equips the bow, Esc closes the page. Q takes the bow in hand (the HUD shows it) and Space shoots. From the beach side of the gap in the rock wall, facing right, two arrows bring down a crab on the meadow while it is more than four tiles away. Q goes back to the sword. At 0 Ammunition Space shows OUT OF AMMUNITION.
- `?debug` exposes `window.gameCore`. `npm.cmd run check` is the gate.

### How it was verified

- `npm.cmd run check`: typecheck exit 0, 362 of 362 tests in 22 files, build OK. Each core slice was written test-first.
- Mutation checks, each reverted afterwards (tests that failed): a shot that costs no Ammunition (8), starts no cooldown (2) or ignores the cooldown (3); chests that do not stop arrows (1); terrain that does not end an arrow (4); every weapon's bonus counting for every attack (7); a roll equal to the chance dropping (2); no roll for a chance of 0 (1); drops before Experience (5); switching to a bow nobody has (1); a defeat that leaves the arrows flying (1); arrows that ignore their Adventure Area (1); a chest or cache that opens twice (4). One survived all 361 tests: hitting the farthest monster when one step carries an arrow past two. A test for it was added and now fails that mutation.
- Headless Edge on `vite preview` (port 5106, now stopped), real key presses with the shared smoke tool, screenshots viewed, no console errors: the boot HUD (sword, arrow icon, a grey 0; two chests and a green cache); the bow chest and the cache open with their notices and draw dark; the inventory lists the Short Bow (+1 ATK) and AMMUNITION 6, and Down and Enter equip it; Q puts the bow in the HUD; Space shoots (6 to 5) and an arrow draws in flight; two arrows shot from the beach side of the gap defeated crab-1 (Ammunition 4, only crab-2 left); at 0 Ammunition the red notice reads OUT OF AMMUNITION and PRESS Q TO SWITCH.

### Left for manual review

- The reviewer play check (the last criterion) stays unticked. The runs above were driven by a script, not by a person: how the bow feels (arrow speed, range, the 400 ms shared cooldown), and how the HUD icons and the notice read, are for the reviewer.
- A crab's Ammunition drop was not seen in the browser (25% a defeat, and the game's random source cannot be set from the page). It rests on the core tests with a seeded source and on the notice a cache already shows. A defeat with arrows in the air was not driven in the browser either.

### Suggestions

- Ticket 09: roll back the Ammunition count together with the opened caches, which are chests whose contents are `consumable`. Arrows are already cleared at a defeat.
- Ticket 07 can reuse `grantConsumable`, the consumable chest contents, the `pickup` item union and the `drops` tables for potions.
- An on-screen E prompt when the hero faces something it can interact with (still none).
- A proposed ADR: the weapon in hand is state, and a weapon's bonus counts only for the attacks made with it.
- GLOSSARY.md lacks weapon in hand, arrow (projectile), shot, cache, drop and consumable.
