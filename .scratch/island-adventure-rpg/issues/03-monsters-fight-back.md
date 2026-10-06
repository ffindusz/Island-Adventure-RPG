# 03: Monsters fight back

**What to build:** Monsters now notice the hero, approach, and attack with a visible wind-up (a telegraph) before damage lands, so the hero avoids hits only by moving. The hero has Health (a maximum and a current value) shown in a HUD, and damage received is reduced by Defense but never below a minimum. When Health reaches zero the hero is defeated and returns to the Adventure Area's entrance at full Health, with the area's monsters reset. There is no passive regeneration.

**Blocked by:** 01: Tracer bullet: the hero walks and strikes a monster

**Status:** ready-for-agent

**Spec stories:** 30, 41, 42, 44, 46, 48, 51, 52

- [ ] A monster that notices the hero approaches and begins a telegraphed attack; damage lands only after the wind-up and only if the hero is still within the attack's reach, so moving away avoids it.
- [ ] The hero's current and maximum Health are shown in the HUD and update on every hit. Health never regenerates on its own.
- [ ] Defense reduces damage received; damage never drops below a tunable minimum (default 1).
- [ ] At zero Health the hero is defeated: an event is emitted, the hero returns to the Adventure Area's entrance at full Health, and the area's monsters return to full Health and their starting positions.
- [ ] Hero base stats and monster Health, damage, speed, reach, wind-up, and noticing distance are content data. A monster's behavior is chosen from a named, reusable behavior so later tickets can add more.
- [ ] Tests at the Game core's interface cover telegraph timing, avoiding an attack by moving away, damage at several Defense values including the floor, defeat and return, monster reset, and no regeneration.
- [ ] Reviewer play check (manual, in a browser): get hit (hit feedback and the HUD update), avoid a telegraphed attack by moving, die, and return to the entrance.
