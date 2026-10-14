# 03: Monsters fight back

**What to build:** Monsters now notice the hero, approach, and attack with a visible wind-up (a telegraph) before damage lands, so the hero avoids hits only by moving. The hero has Health (a maximum and a current value) shown in a HUD, and damage received is reduced by Defense but never below a minimum. When Health reaches zero the hero is defeated and returns to the Adventure Area's entrance at full Health, with the area's monsters reset. There is no passive regeneration.

**Blocked by:** 01: Tracer bullet: the hero walks and strikes a monster

**Status:** resolved

**Spec stories:** 30, 41, 42, 44, 46, 48, 51, 52

- [x] A monster that notices the hero approaches and begins a telegraphed attack; damage lands only after the wind-up and only if the hero is still within the attack's reach, so moving away avoids it.
- [x] The hero's current and maximum Health are shown in the HUD and update on every hit. Health never regenerates on its own.
- [x] Defense reduces damage received; damage never drops below a tunable minimum (default 1).
- [x] At zero Health the hero is defeated: an event is emitted, the hero returns to the Adventure Area's entrance at full Health, and the area's monsters return to full Health and their starting positions.
- [x] Hero base stats and monster Health, damage, speed, reach, wind-up, and noticing distance are content data. A monster's behavior is chosen from a named, reusable behavior so later tickets can add more.
- [x] Tests at the Game core's interface cover telegraph timing, avoiding an attack by moving away, damage at several Defense values including the floor, defeat and return, monster reset, and no regeneration.
- [x] Reviewer play check (manual, in a browser): get hit (hit feedback and the HUD update), avoid a telegraphed attack by moving, die, and return to the entrance.

## Comments

Resolved on integration/island-adventure-rpg at b67c0e2

### What was built

- Hero Health and Defense: `health` and `defense` in the hero content, and `minimumDamage` (default 1) on the content. A hit takes off its damage minus Defense, never less than the minimum. Health never regenerates.
- Monster behaviors are a small registry in the core (`src\core\behaviors.ts`). The content names one: `stationary`, or the new `chaser` (notice, approach, telegraphed wind-up, strike, rest). Adding a behavior is three steps, written at the top of that file and in the README. Loading content refuses unknown behaviors and numbers the rules cannot use.
- The telegraph is in the state view: a monster's `action` is `winding-up` with its locked `zone` and `progress`. New events: `monster-attacked`, `hero-hit`, `hero-defeated`.
- Defeat returns the hero to the content's start at full Health and rebuilds the Adventure Area's monsters (full Health, starting tiles, idle). `returnHero` in `src\core\hero-damage.ts` is the one place that decides where.
- Adapter: `hud.ts` (heart, Health digits and a bar, fixed to the screen, drawn from the view only), a telegraph layer under the bodies, hit and strike feedback, and a 500 ms fade-in after a defeat. The shipped crab is now a chaser and a second crab was added (placeholder numbers, to tune in ticket 26).
- 63 new tests (117 in 11 files), all at the Game core's interface (ADR 0002).

### Decisions and defaults

- The ticket says the hero returns to "the Adventure Area's entrance"; the spec says "the most recently activated Checkpoint". Today there is one area and its entrance is the first Checkpoint, active from the start, so both mean the content's start, which is where the hero returns. Tickets 08 and 09 replace that with the area's entrance and the latest Checkpoint. I found no other conflict between the ticket and the spec.
- Damage received is `max(minimumDamage, damage - Defense)`. The default minimum is 1, the spec's "Defense can never reduce damage to zero". A content may set it to 0, which turns that off on purpose; a negative one is refused.
- The attack zone is the square around the monster's body that `reach` describes. It is locked when the wind-up starts, the telegraph shows exactly it, and the hit lands when the wind-up ends if the hero's body overlaps it (touching edges do not count). A hit on the monster does not interrupt its wind-up.
- Noticing distance is measured from the body's edge, as a square. A chaser walks along the longer axis toward the hero and stops flush against solids and other monsters. There is no line of sight, no pathfinding and no sliding round corners: a monster behind the rock wall presses against it.
- Recovery is not in the ticket. A chaser rests `recoveryMs` after a strike before it winds up again; without it a hero in reach would be struck every wind-up. `windUpMs` must be at least one fixed step (16.7 ms); `recoveryMs` may be 0.
- Defeat rebuilds the area's monsters, defeated ones included (spec story 83). Other areas are untouched (story 84); that cannot be tested until the hero can travel. Held direction keys, facing and the attack cooldown are not reset: the adapter polls the keys, so clearing them in the core would desync it. A defeat ends that step's monster actions, because the monster list is stale.
- The snapshot holds the wind-up and recovery state (plain data, tested through a JSON round trip). `SNAPSHOT_VERSION` stays 1: nothing is saved before ticket 11.
- Shipped numbers: hero Health 10, Defense 1; crab Health 3, damage 4 (3 after Defense), 1.5 tiles a second, noticing 4, reach 0.5, wind-up 500 ms, recovery 900 ms. Four hits defeat the hero. The crabs are far from the start, and a shipped-content test pins that a hero who stays at the start is never hurt. `crab-2` exists so a reviewer can defeat one crab, be defeated by the other and see both come back.
- Adapter looks: the hero flashes red when hit, the strike zone flashes orange, a resting monster is dimmed, a hit monster flashes white as before. The digits are a 3 by 5 bitmap font drawn with rectangles, because `Text` blurs at this size. The world keeps running while the screen fades in.

### How to run it

- `npm.cmd run dev`. Walk right through the gap in the wall; a crab notices you from about four tiles. The red outline is the telegraph: it fills as the wind-up runs out. Stay in it to be hit (the HUD drops by 3), step out to avoid it. Four hits defeat you; you return to the start at 10/10 with the crabs reset.
- `npm.cmd run check` is the gate. Add `?debug` to the address for `window.gameCore`.

### How it was verified

- `npm.cmd run check`: type check exit 0, 117 of 117 tests, build OK.
- Mutation checks, each reverted: removing the minimum-damage floor (5 defense tests failed), striking one step early (6 attack and chase tests failed), a strike that ignores where the hero stands (4 failed), a defeat that leaves the monsters as they were (2 failed), a hero that heals a little every step (the no-regeneration test failed), and a crab moved next to the start in the shipped content (the shipped-content test failed with `hero-hit` events).
- Headless Edge on `vite preview` (port 5103, now stopped): a 320 by 192 WebGL canvas, 0 console errors. Screenshots viewed: the HUD is legible at the native 320 by 192; the red telegraph outline and fill sit on the zone around the crab; at the moment of a hit the HUD reads 7/10, the hero is red and the zone is orange; after stepping out during a wind-up the strike landed on empty ground and Health stayed 10/10; standing in reach for four hits (4 `monster-attacked`, 4 `hero-hit`, 1 `hero-defeated`) put the hero back at the start with 10/10, both crabs at full Health on their tiles, and the fade finished.
- The walk to the crab used real key presses. The step away was a `move` command sent from `window.gameCore`, which is what the adapter sends for a held key. Screenshots are in the session files, not in the repository.

### Left for manual review

- The reviewer play check (the last criterion) stays unticked: how the timing feels (500 ms wind-up, crab speed), whether the telegraph reads well to a person, and the defeat fade.
- Not checked: the Canvas renderer, and displays above 60 Hz.

### Follow-ups

- Line of sight and pathfinding for chasers.
- Monster facing, a "noticed" cue and an event for starting a wind-up, for art and audio (tickets 21 to 25).
- Max Health and Defense from levels and gear (tickets 04 and 05): `heroMaxHealth` and `heroDefense` in `src\core\stats.ts` are the one place to change.
- The return point (tickets 08 and 09): `returnHero` in `src\core\hero-damage.ts`.
- Charger and ranged behaviors (ticket 12): `monster-attacked` carries a zone, which fits melee; a projectile will need its own view and events.
- A content check that no monster stands on or beside the start tile; the shipped-content test covers it by behavior only.
- The HUD is already fixed to the screen (scroll factor 0), which ticket 08's camera criterion needs, and it covers the top-left corner of the map; ticket 22 gives it its final look.
- Glossary terms missing: current Health, hit, telegraph, wind-up, recovery, noticing distance, reach, behavior, minimum damage, defeat (of the hero).

Made by the player on 2026-10-14 (recorded on integration/island-adventure-rpg at 4259c95): the player said that their playthroughs of the game covered this check, and that all their comments have already been fixed with other tickets. There is no step-by-step log. The box above was ticked on that word.
