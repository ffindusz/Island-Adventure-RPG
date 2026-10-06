# 12: Charger and ranged enemies

**What to build:** Two more reusable enemy behaviors alongside the basic chaser: a charger that telegraphs and then dashes in a straight line, and a ranged attacker that telegraphs and then fires a projectile along a straight line. Both are avoidable by positioning alone. Behaviors are chosen and tuned through content data, so differently looking monsters with different stats reuse them across Adventure Areas, including tougher variants for the few demanding fights.

**Blocked by:** 06: The bow: Ammunition and quick-switching

**Status:** ready-for-agent

**Spec stories:** 42, 51, 52

- [ ] Charger: a visible wind-up, then a straight-line dash that stops at solid terrain, then a short recovery during which it can be hit freely. Damage lands only if the hero is in the dash's path.
- [ ] Ranged attacker: a visible wind-up, then a projectile fired in a straight line toward where the hero stood when it fired. The projectile damages the hero on contact and is stopped by solid terrain. Whether it keeps a preferred distance or stands still is a data setting.
- [ ] Monster projectiles reuse the projectile mechanism from the bow.
- [ ] No attack is unavoidable: tests show each can be avoided by moving during the wind-up.
- [ ] Adding a monster that reuses a behavior needs only content data (for example speed, wind-up, range, damage, Health, Experience). A tougher variant is a data change.
- [ ] The placeholder areas contain a monster of each behavior.
- [ ] Tests at the Game core's interface cover timing, the dash path and terrain stop, projectile travel, hit and block, avoidance, and recovery.
- [ ] Reviewer play check (manual, in a browser): fight a charger and a ranged attacker, avoiding both by moving.
