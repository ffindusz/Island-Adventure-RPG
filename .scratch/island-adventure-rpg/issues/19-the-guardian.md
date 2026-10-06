# 19: The Guardian

**What to build:** The single, distinct undead Guardian that defends the castle, in an arena at the end of the castle route, with a Checkpoint immediately before it. The fight is a manageable climax with telegraphed attacks that can be avoided by positioning alone. Defeating the Guardian opens the way to the forgotten harbor. A defeated Guardian stays defeated; an undefeated Guardian starts fresh on every retry. Art stays placeholder until the art tickets.

**Blocked by:** 18: The old castle

**Status:** ready-for-agent

**Spec stories:** 16, 17, 54-56, 77, 86

- [ ] A Checkpoint sits on the route immediately before the arena, with no ordinary monsters between it and the arena. The arena is part of the castle Adventure Area and replaces the plain wall that ended the route.
- [ ] The Guardian is one distinct fight with at least two different telegraphed attack patterns (built from existing behaviors plus at least one pattern unique to it). Its numbers and patterns are content data, tuned for moderate difficulty with the Levels and Gear of the intended route.
- [ ] Defeating the Guardian grants Experience and opens a gate to the harbor section, a minimal walkable stub that ticket 20 completes. The harbor is unreachable until the Guardian is defeated.
- [ ] A defeated Guardian stays defeated through defeat recovery, backtracking, and Continue. An undefeated Guardian is reset to full Health and its starting state on each retry, whether after a defeat or after the hero leaves and returns.
- [ ] The Guardian's state is part of the snapshot and the round-trip test from ticket 11.
- [ ] Default, not in the spec and flagged for the user: the game also autosaves when the Guardian is defeated, so quitting right after the victory does not force a rematch.
- [ ] Content validation requires exactly one Guardian, a Checkpoint immediately before its arena, and a harbor that is unreachable without defeating it.
- [ ] Note for tuning: per the defeat rules, a defeat at the Guardian returns the hero to the Checkpoint before it and resets the ordinary monsters across the whole castle area.
- [ ] Tests at the Game core's interface cover attack timing and avoidance, staying defeated, retry reset, the harbor gate, the autosave on victory, and each validation rule.
- [ ] Reviewer play check (manual, in a browser): lose to the Guardian and confirm the return and reset, then win and confirm the harbor gate opens.
