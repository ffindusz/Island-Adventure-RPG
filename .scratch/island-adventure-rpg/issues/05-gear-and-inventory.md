# 05: Gear and the inventory

**What to build:** The hero starts with a basic Melee Weapon (sword) and basic armor. Chests, opened with the Interact key (E), hold Gear. The inventory page (I) lists everything the hero carries and lets the hero equip one Melee Weapon and one set of armor. Weapons raise Attack, armor raises Defense, and the stat page shows totals including Gear. There is no carry limit, and an opened chest stays opened.

**Blocked by:** 04: Experience, Levels, and the stat page

**Status:** resolved

**Spec stories:** 24, 43, 67, 70, 73-76

- [x] A new game begins with a basic sword and basic armor equipped.
- [x] Pressing E near a chest the hero is facing opens it once, adds its contents, and shows a brief pickup message; it cannot be opened again. Interact acts on the nearest interactable in front of the hero within reach, so later tickets can add other kinds (levers, signs, the vessel).
- [x] The inventory page (I) lists carried Gear, lets the hero equip a Melee Weapon and armor, pauses the game, and closes with Esc.
- [x] Attack is base plus assigned Stat Points plus the weapon's bonus; Defense is base plus assigned Stat Points plus the armor's bonus. The stat page shows these totals and combat uses them.
- [x] Gear changes Attack or Defense only (no special abilities, no set bonuses), and upgrades to a weapon type change Attack only.
- [x] There is no carry limit.
- [x] Gear (name, slot, bonus) is content data. The placeholder area has a chest with a better sword and a chest with better armor.
- [x] Tests at the Game core's interface cover opening a chest once, equipping and swapping, derived Attack and Defense, and damage with hand-worked numbers.
- [ ] Reviewer play check (manual, in a browser): open both chests, equip the upgrades from the inventory, and confirm the hero hits harder and takes less damage.

## Comments

Resolved on integration/island-adventure-rpg at c6eb656

### What was built

- Gear in the core (`src\core\gear.ts`): content pieces with a name, a slot and a bonus; the hero carries any number and has one equipped per slot. `stats.ts` is still the one place for Attack, Defense and Health: it now adds the equipped bonuses after the Stat Points, so the stat page and combat follow.
- The inventory is a second page id with its view (the Gear in slot order, which pieces are equipped, and the Attack and Defense totals) and an `equip` command that works only while that page is open. `open-page`, `close-page` and the pause needed nothing new.
- Interactables: a small registry of kinds in `src\core\interactables.ts`, with the chest as the first. The `interact` command acts on the nearest one in front of the hero; a chest opens once, gives its Gear, and is remembered per Adventure Area in the state. Events: `chest-opened`, `pickup`, `gear-equipped`. The README says how to add a kind and a Gear slot.
- Content: `src\content\gear.ts`, the hero's `startingGear` and `interactionReach`, and two chests on the shipwreck coast (a steel sword up, chain mail down, both two tiles from the start), with validation of all of it.
- Adapter: E, I, the arrows (or W, S) and Enter; the inventory panel and its cursor (`inventory-menu.ts`); the pickup notice (`notice.ts`); placeholder chests (`art.ts`).
- 68 new tests (257 in 18 files, up from 189 in 16), all at the Game core's interface: `gear` and `chests`, plus additions to the content and shipped-content checks.

### Decisions and defaults

- Basic Gear is +0, so the base numbers are unchanged. The shipped upgrades (steel sword, chain mail) are +1 placeholders for the tuning pass.
- A piece of Gear can be found or given only once: content that puts the same piece in two places is refused. There is no unequip, only a swap for another piece of the slot; a slot may start empty. `equip` ignores a piece the hero does not carry or has equipped already.
- Picking the piece: Up and Down (or W and S) move a cursor, Enter equips, Esc closes. The cursor lives in the adapter; the core knows only `equip`. The list shows five lines and scrolls, without wrapping.
- The arrows of the menu do not turn the hero. The core's `move` and `stop` set the facing even while the game waits (ticket 04's tests rely on it), so the adapter holds back the walking keys while a page is open or a Stat Point waits, and sends the keys that are down when the wait ends. A key held through a page walks on when it closes. I tried the other way, ignoring the facing in the core while paused: it broke an existing test, so I took it out.
- Interact reaches `interactionReach` (0.5 tile) beyond the hero's body, in a zone as wide as the body. Of the interactables it overlaps, the one whose centre is nearest wins; a tie goes to the first listed. It does nothing at the title, while a page is open or while a Stat Point waits.
- Chests are solid for the hero and for monsters, opened or not, and an opened chest stays where it is, drawn open.
- Chest contents are a tagged union (`{ kind: 'gear', gear }`), so ammunition or potions can be added beside Gear. A defeat keeps the Gear and the opened chests.
- The inventory page also shows the Attack and Defense totals. The pickup notice shows for 3 s, or until a page or a Stat Point covers it. There is no on-screen E prompt.
- `SNAPSHOT_VERSION` stays 1, because nothing is saved before ticket 11.

### How to run it

- `npm.cmd run dev`. The hero starts between the chests. Hold Up until it stops against the sword chest, press E (a notice reads FOUND STEEL SWORD), press I, Down to the steel sword, Enter, Esc; C shows Attack 2. Hold Down past the start for the armor chest and Defense 2.
- `?debug` exposes `window.gameCore`. `npm.cmd run check` is the gate.

### How it was verified

- `npm.cmd run check`: typecheck exit 0, 257 of 257 tests in 18 files, build OK. Each core slice was written test-first.
- Mutation checks, each reverted afterwards: the Gear bonus ignored (13 tests failed), a chest that opens twice (2), the first overlapping target instead of the nearest (1), `equip` outside the inventory page (1), chests that are not solid (3), a carry limit (1).
- Headless Edge on `vite preview` (port 5105, now stopped), real key presses and in-page checks with the shared smoke tool, screenshots viewed: Up and E stop the hero flush against the sword chest, which then draws open, with the notice (FOUND STEEL SWORD, +1 ATTACK, PRESS I TO EQUIP); I opens the panel with marks for equipped and carried pieces; Down moves the cursor and Enter equips (Attack 1 to 2 on the stat page); Esc closes it with the hero's position and facing unchanged. The armor chest opened twice gives the chain mail once. A key held through a page: no walking while it is open, walking on after Esc, stopped when released. With seven extra chests in a temporary build (reverted), the nine-piece list scrolled, showed 1/9, 5/9 and 8/9, trimmed a long name and fitted the 192-pixel height. 0 console errors throughout.

### Left for manual review

- The reviewer play check (the last criterion) stays unticked. No fight was driven in the browser with the upgrades on: that the hero hits harder and takes less damage rests on the core tests with hand-worked numbers.
- How the panel, the notice time and the keys feel to a person. The chest and the panel are placeholders until ticket 22.

### Suggestions

- An on-screen E prompt when the hero faces something it can interact with.
- A milestone reward of Gear: the reward is already a separate object from its trigger.
- Ticket 06: `gearBonus` adds every equipped piece to the stat of its slot. The bow must count for arrows only and the sword for strikes only, so `stats.ts` will need the active weapon.
- Hold to scroll in long menu lists: the cursor moves once for each press, not for each auto-repeat.
- GLOSSARY.md lacks chest, inventory, equip, Interact and interactable, pickup, and carried Gear.
