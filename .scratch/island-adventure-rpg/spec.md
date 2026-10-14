# Island Adventure RPG: a complete short game

Status: ready-for-agent

## Problem Statement

I want a small, finished fantasy RPG that I can play in a desktop browser. A single hero is shipwrecked by a storm on a remote island and has to fight through the coast, the woods, over a mountain, and into a cave to find an old castle, a ship, and a way home. Along the way the hero finds better Gear (armor and weapons), earns Experience, and raises their stats. I need an inventory, an Automap, and a stat page to keep track of it all, and the game has to look beautiful.

Today there is nothing to play: the repository holds only the domain glossary and one decision record (use Phaser). There is no code, no project setup, and no art. The game must be a complete journey with a definite ending in about 45-60 minutes, without needing a large content pipeline.

## Solution

A complete, short, top-down 2D action RPG in polished pixel art, played with the keyboard in a desktop browser and built with Phaser.

The player starts a new game, reads a brief opening about the storm, and begins on the wrecked coast. The main route runs through five separate, connected Adventure Areas in order: the shipwreck coast, the woods, the mountain, the cave, and the old castle with its forgotten harbor. Each Adventure Area has optional side paths holding extra Gear, Ammunition, and Experience, and the player can go back to earlier Adventure Areas until the final departure.

Combat is real time. The hero attacks in the facing direction with a sword (Melee Weapon) or a bow (Ranged Weapon with limited Ammunition) and switches between them on the fly. Enemy attacks are telegraphed and are avoided by positioning alone. Defeating monsters and reaching milestones earns Experience; each Level, up to Level 6, grants one Stat Point to put into Health, Attack, or Defense. A few curated Gear upgrades from chests and milestones raise Attack and Defense, and Healing Potions restore Health.

Checkpoints at each Adventure Area entrance and just before the Guardian autosave the game in the browser; they do not restore Health, so the Health the hero has left goes with it from one Adventure Area to the next, and Healing Potions are the way to heal. Defeat returns the hero to the latest Checkpoint at full Health with all growth intact. The Automap, inventory, stat page, and a Controls page that lists every key open with a keypress, close with the same key (or Esc), and pause the game; Esc, when none of them is open, pauses the game too and brings up the paused screen, from which the game is resumed. A single undead Guardian defends the castle; beating it opens the way through the forgotten harbor to an old ship, and sailing home ends the game with a short ending and a return to the title screen.

## User Stories

**Starting, saving, and continuing**

1. As a player, I want to open the game in a desktop browser with no install, account, or sign-in, so that I can start playing right away.
2. As a player, I want a title screen with a New Game option, so that I can begin the adventure from the shipwreck.
3. As a returning player, I want a Continue option on the title screen when a save exists, so that I can pick up where I left off after closing the browser.
4. As a player, I want the game to autosave at every Checkpoint and whenever I move to another Adventure Area, so that I never have to manage saving myself.
5. As a player, I want my progress stored in my own browser, so that I don't need an account or an online service.
6. As a player, I want Continue to restore my Level, Experience, assigned Stat Points, Gear, Ammunition, Healing Potions, opened chests and other one-time rewards, defeated monsters, and Automap discoveries, so that nothing I earned is lost between sessions.

**Story and journey**

7. As a player, I want a brief opening that tells me a storm wrecked my ship on a remote island, so that I understand why I'm stranded and what I must do.
8. As a player, I want to begin on the wrecked coast, so that the shipwreck premise is the first thing I experience.
9. As a player, I want the main route to run in a clear order (coast, woods, mountain, cave, then the old castle), so that the journey feels like one purposeful adventure.
10. As a player, I want each Adventure Area to be its own map joined to its neighbors by visible exits, so that I always know how to move on.
11. As a player, I want optional side paths in the Adventure Areas that lead to extra Gear, Ammunition, and Experience, so that exploring is rewarded without being required.
12. As a player, I want the story told through a brief opening and ending plus short area text and environmental clues, so that the story stays light and I keep moving.
13. As a player, I want the island to have no other people to talk to, so that the adventure feels like a lone struggle to get home.
14. As a player, I want an earnest but light tone, with dangerous places and real stakes but no grim violence, so that the whole journey feels inviting.
15. As a player, I want the castle to sit beside a forgotten harbor, so that finding the ship is the natural payoff of the journey.
16. As a player, I want a single undead Guardian to defend the castle, so that the journey ends in a clear climax.
17. As a player, I want defeating the Guardian to open the way to the forgotten harbor, so that the victory has a concrete reward.
18. As a player, I want to prepare the old vessel and sail home, so that the shipwreck premise is resolved.
19. As a player, I want a concise ending and credits screen after I sail home, followed by the title screen, so that the game feels finished.
20. As a player, I want a complete first playthrough to take about 45-60 minutes, so that the adventure is whole but short.

**Moving and exploring**

21. As a player, I want to move the hero with WASD or the arrow keys, so that I can use whichever keys I prefer.
22. As a player, I want the hero to face the direction I last moved, so that my attacks go where I expect.
23. As a player, I want water, walls, and other solid terrain to block the hero, so that the maps feel physical.
24. As a player, I want one Interact key (E) for chests, levers, doors, and the old vessel, so that interacting is consistent everywhere.
25. As a player, I want to walk through a visible exit to reach the connected Adventure Area, so that transitions are clear and predictable.
26. As a player, I want to return to earlier Adventure Areas at any time until I sail away, so that I can collect anything I missed.
27. As a player, I want the final departure by ship to be the only point of no return, so that nothing is permanently missable before then.
28. As a player, I want light, mostly optional obstacles such as a key or lever that opens a side room, so that exploring has small puzzles without blocking my way.
29. As a player, I want the main route to be completable without solving any puzzle, so that I can always progress by exploring and fighting.

**Real-time combat**

30. As a player, I want combat to happen in real time as I move around, so that fights feel active.
31. As a player, I want to attack with Space in the direction the hero is facing, so that I never need precise mouse aiming.
32. As a player, I want a sword Melee Weapon that strikes enemies directly in front of the hero, so that close combat is satisfying.
33. As a player, I want a bow Ranged Weapon that fires in the facing direction, so that I can attack from a distance.
34. As a player, I want to switch between the Melee Weapon and the Ranged Weapon with Q during play, so that I can adapt mid-fight without opening a menu.
35. As a player, I want the same attack key to use whichever weapon is active, so that combat controls stay compact.
36. As a player, I want a short cooldown between attacks and no stamina or mana bar, so that combat stays simple and timing is my only limit.
37. As a player, I want the bow to use limited Ammunition of a single generic type, so that I must choose when to shoot.
38. As a player, I want to always see my Health, active weapon, Ammunition, and Healing Potion count during play, so that I can make decisions in a fight.
39. As a player, I want to find Ammunition in marked caches and as occasional monster drops, so that I can replenish my supply by exploring and fighting.
40. As a player, I want Checkpoints not to refill my Ammunition, so that Ammunition stays a meaningful resource.
41. As a player, I want to avoid damage only by moving and positioning, so that the controls stay compact; there is no block or dodge.
42. As a player, I want monsters to telegraph their attacks, so that I can read and avoid them fairly.
43. As a player, I want better weapons to raise my damage through Attack only, with every weapon of a type behaving the same, so that upgrades are easy to understand.
44. As a player, I want my Defense to reduce the damage I take, so that armor and Defense choices help me survive.
45. As a player, I want hit, defeat, and pickup feedback in sound and animation, so that combat feels responsive.

**Health and healing**

46. As a player, I want my Health to drop when I'm hit and defeat to occur when it reaches zero, so that the stakes of each fight are visible.
47. As a player, I want collectible Healing Potions that restore Health when used, so that I can recover from a hard fight.
48. As a player, I want no passive Health regeneration, so that Health stays a meaningful resource between Checkpoints.
49. (Superseded by story 115: after playtesting the player found that Health restored at every Checkpoint made the game too easy.) As a player, I want full Health recovery at a Checkpoint, so that I can reset after a hard stretch.

**Monsters and the Guardian**

50. As a player, I want forest beasts and slimes in the woods, mountain raiders on the mountain, cave creatures in the cave, and undead at the castle, so that every Adventure Area has a distinct threat.
51. As a player, I want a small set of enemy behaviors reused with different looks and stats across the Adventure Areas, so that I can learn how enemies act without facing a huge roster.
52. As a player, I want most fights to be approachable and a few to be demanding, so that the challenge is moderate and I don't get frustrated.
53. As a player, I want monsters I defeated to stay defeated when I return to an Adventure Area, so that backtracking is about missed items rather than repeat fights.
54. As a player, I want the Guardian to be one distinct, manageable fight, so that the climax is memorable without being overwhelming.
55. As a player, I want a Checkpoint just before the Guardian, so that a failed attempt costs me little time.
56. As a player, I want a defeated Guardian to stay defeated, so that I never fight it twice.

**Experience, Levels, and stats**

57. As a player, I want to earn Experience for defeating monsters, so that fighting makes me stronger.
58. As a player, I want to earn Experience for reaching major milestones in an Adventure Area, so that progress through the journey is rewarded even when I avoid a fight.
59. As a player, I want to start at Level 1 and reach about Level 6 over a normal playthrough (about five level-ups), so that growth is steady but never grindy.
60. As a player, I want a Level cap of 6, so that repeating fights can't make me over-level the game.
61. As a player, I want each Level to give me one Stat Point to put into Health, Attack, or Defense, so that every level-up is a meaningful choice.
62. As a player, I want a level-up to pause the game and let me assign my Stat Point, so that I can decide without danger.
63. As a player, I want Health to raise my maximum Health, Attack to raise the damage I deal, and Defense to reduce the damage I take, so that each stat has a clear meaning.
64. As a player, I want a stat page (opened with C) showing my Level, Experience progress, current and maximum Health, Attack, and Defense including Gear bonuses, so that I can see how strong I am.
65. As a player, I want monsters that come back after I'm defeated to give Experience again when I re-defeat them, so that retrying a hard Adventure Area still feels productive.
66. As a player, I want the intended route to give enough Experience and Gear to beat the Guardian without grinding, so that I never have to repeat fights to progress.

**Gear, inventory, and loot**

67. As a player, I want to start with a basic Melee Weapon and basic armor, so that I can fight from the moment I wake on the coast.
68. As a player, I want to find my first Ranged Weapon, a bow, in the woods, in a chest behind a locked door that a key from the north woods opens, and my first Ammunition in caches along the trail, so that the bow arrives as a rewarding discovery that I went looking for. (Changed after the second build: see story 113.)
69. As a player, I want a few curated Gear upgrades across the journey, roughly one weapon and one armor improvement every couple of Adventure Areas, so that each find feels significant.
70. As a player, I want better weapons to raise my Attack and better armor to raise my Defense, so that every upgrade is simple to understand.
71. As a player, I want Gear and upgrades to come mainly from chests and story milestones, with occasional monster drops, so that the important finds are placed by design and reward exploring.
72. As a player, I want no shops or currency, so that the game stays focused on exploring and fighting.
73. As a player, I want an inventory page (opened with I) listing my Gear, Healing Potions, and Ammunition, so that I can see everything I carry.
74. As a player, I want no carry limit, so that I never have to manage weight or slots.
75. As a player, I want to equip one Melee Weapon, one Ranged Weapon, and one set of armor from the inventory, so that I control my loadout while other Gear stays stored.
76. As a player, I want Gear and other permanent one-time rewards to stay collected once I have them, so that I never find the same Gear twice.

**Checkpoints, defeat, and recovery**

77. As a player, I want a Checkpoint at the entrance of every Adventure Area and just before the Guardian, so that defeat never costs much progress.
78. (Superseded in part by story 115: a Checkpoint still autosaves, but no longer restores Health.) As a player, I want reaching a Checkpoint to restore my Health fully and autosave, so that Checkpoints feel safe.
79. As a player, I want to return to the latest Checkpoint when my Health reaches zero, so that failing costs time rather than progress.
80. As a player, I want to keep my Level, Experience, assigned Stat Points, and Gear after defeat, so that I never lose growth.
81. As a player, I want my Ammunition and Healing Potion counts to return to what they were at the Checkpoint, so that a retry doesn't punish me twice.
82. As a player, I want a consumable I found after the Checkpoint to be obtainable again after defeat, so that defeat never permanently destroys a pickup.
83. As a player, I want ordinary monsters in the Checkpoint's Adventure Area to reset after defeat, so that I get a fair retry of the fights there.
84. As a player, I want monsters in other Adventure Areas to stay defeated after my defeat, so that distant progress is not undone.
85. As a player, I want my Automap discoveries and opened Gear chests to persist after defeat, so that my exploration is never lost.
86. As a player, I want an undefeated Guardian to start fresh on every retry, so that each attempt is a clean, fair fight.

**Automap**

87. As a player, I want an Automap (opened with M) that records terrain automatically as I explore, so that I don't have to remember the maps.
88. As a player, I want each Adventure Area to start hidden on the Automap, so that exploring feels like discovery.
89. As a player, I want the Automap to show the whole route, with all five Adventure Areas and their known connections, so that I understand the journey as a whole.
90. As a player, I want the Automap to mark my hero's position and the exits I have found, so that I can navigate and backtrack.
91. As a player, I want no quest markers and no map item to find, so that the Automap stays a simple record of exploration.

**Menus and pause**

92. As a player, I want the game to pause while the inventory, stat page, Automap, or a level-up choice is open, so that I can read them safely in the middle of a fight.
93. As a player, I want I, M, and C to open the inventory, Automap, and stat page and Esc to close the open page, so that menus are quick to open and dismiss.

**Presentation and audio**

94. As a player, I want polished, consistent top-down pixel art, so that the game is beautiful to look at.
95. As a player, I want each Adventure Area to look like what it's called (a wrecked coast, woods, a mountain, a cave, and an old castle by a harbor), so that the journey feels varied.
96. As a player, I want one fixed, silent, visually distinctive castaway as the hero, with sword and bow animations, so that the character reads clearly in every fight.
97. As a player, I want light adventure music and essential sound effects for attacks, hits, pickups, and menu feedback, so that the game feels alive.
98. As a player, I want mute and volume controls, so that I can set the audio the way I like.

**Assets, release, and development**

99. As the game's author, I want every graphics and audio asset to come with rights that allow public and commercial use, so that I can release the game later without relicensing.
100. As the game's author, I want the art base checked against its actual files for the five Adventure Areas and the hero's sword and bow animations before I commit to it, so that I don't discover gaps late.
101. As the game's author, I want a small, visually matching shipwreck supplement with a verified license, so that the opening looks as good as the rest of the game.
102. As the game's author, I want gameplay built so that swapping in different art changes no rules, so that the art decision stays reversible.
103. As a developer, I want all gameplay rules in one headless Game core with Phaser as a thin adapter, so that behavior can be verified quickly and deterministically without a browser.
104. As a developer, I want maps, monsters, items, and the Experience curve defined as data, so that content and tuning changes don't touch the rules.
105. As a developer, I want balance numbers (damage, Health, Experience thresholds, cooldowns, and drop rates) to be tunable data, so that the game can be tuned through playtesting.
106. As a developer, I want content validated when it is loaded, so that a broken exit, a missing Checkpoint, or an unreachable harbor is caught immediately.
107. As a developer, I want the game to need no server component, so that it is easy to run and share as plain web files.

**Menus and pause (added after the first build)**

108. As a player, I want the keys that open the inventory (I), the Automap (M), and the stat page (C or Tab) to close that page again when I press them a second time, and each page to name its own key when it tells me how to close it, so that I can peek at a page and dismiss it with the same key.
109. As a player, I want one Controls page that lists every key the game answers to, which I can open at any time during play (it pauses the game like the other pages) and from the title screen, so that I never have to guess a key or look it up outside the game.

**Gear (added after the first build)**

110. (Superseded by story 113: after playtesting the player chose the bow in the cabin's chest over the bow on the wolf.) As a player, I want the first bow to be carried by a monster that stands just inside the way into the woods, and to take it when I defeat that monster, so that my ranged weapon comes at the very start of the second Adventure Area, from the first fight there.

**Movement (added after the second build)**

111. As a player, I want to walk into a passage one tile wide, such as the crevice in the coast or the door of the cabin, without lining the hero up to the pixel, so that I am not stopped at an opening I am plainly walking into: when the hero walks against a corner with its middle over the gap, it slides the little that is needed and goes in.

**Menus and pause (added after the second build)**

112. As a player, I want to be told in play that H shows the controls, once on the opening card and in a short line when play begins or continues, so that I know of the Controls page when I need it, without looking for it on the title screen.

**Gear (added after the second build)**

113. As a player, I want the only bow of the game to be the Long Bow in the chest of the cabin behind the locked door, which I reach by finding the key in the north woods, and no monster to hand out Gear, so that the bow is the reward of a side path that I chose to explore.

**Menus and pause (added after the third build)**

114. As a player, I want the text that shows when I enter a new Adventure Area, and the text of a sign I read, to go away when I press any key, so that I can clear it from the screen as soon as I have read it instead of waiting for it to time out.

**Health and healing (added after the third build)**

115. (Supersedes stories 49 and 78 where they say that a Checkpoint restores Health.) As a player, I want a Checkpoint to save my progress but not to restore my Health, so that the Health I have left goes with me from one Adventure Area to the next, Healing Potions matter, and the adventure is harder; defeat still returns me to a Checkpoint at full Health.

**Menus and pause (added after the third build)**

116. As a player, I want Esc, when nothing is open, to pause the game and bring up the paused screen, the title screen with a PAUSED message and RESUME on top of its menu, and to take me back into the game exactly as it was when I choose RESUME or press Esc again, so that I can stop, read the controls, or leave for a new game or my saved game without losing the game I am in until I choose to.

## Implementation Decisions

**Product shape**

- A complete, short, single-hero, top-down 2D action RPG for current desktop browsers, keyboard only, built with Phaser as recorded in the existing decision record. Maps and collision still have to be assembled for the chosen art.
- There is no server-side component: saves are browser-local and there are no accounts or cloud services.
- Intended first playthrough is about 45-60 minutes. The tone is earnest and light. Difficulty is approachable and moderate, with telegraphed enemy attacks and a few demanding fights; there are no difficulty modes.

**Modules**

- **Game core**: a headless, engine-free deep module that holds every gameplay rule: movement and collision, combat, Experience, Levels and Stat Points, Gear, inventory and consumables, Checkpoints and defeat recovery, Automap discovery, Adventure Area transitions, world state, saves, and the ending. Its interface is deliberately small. It accepts player commands (move or stop in a direction, attack, switch weapon, interact, use a Healing Potion, open or close the inventory, Automap, stat page, or Controls page, equip Gear, assign a Stat Point, dismiss the text of the area) and session commands (new game, continue from a save, return to the title), plus elapsed time supplied in fixed steps. It exposes an observable state view, a stream of events (hit, monster defeated, Experience gained, level-up, pickup, Checkpoint activated, Adventure Area changed, hero defeated, ending reached), and a serializable save snapshot that restores the game exactly. Content definitions and a random source (for drops) are supplied to it. It never touches the clock, storage, rendering, audio, or Phaser. Its internals may be split however the implementer likes, but only the interface is a test seam.
- **Content definitions**: data for the five Adventure Area maps (terrain and collision, exits, Checkpoints, chests, ammunition caches, potion pickups, monster spawns, side paths, light obstacle devices, milestone triggers), monster types including the Guardian, items and Gear, the Experience curve, and the story texts. Content is validated when it is loaded.
- **Phaser adapter**: the only code that knows about Phaser. It owns the title, play, page, level-up, and ending screens and the HUD; maps keyboard input to player commands; advances the Game core by the elapsed time; draws the state view with tilemaps and sprites; plays sound and animation from events; and loads assets. It holds no gameplay rules.
- **Save store**: a thin adapter between browser-local storage and the Game core's save snapshot. It holds a single autosave and carries no rules.
- **Assets**: art and audio loaded by the Phaser adapter and referenced from content. They are replaceable without touching any rule.

**World and route**

- Five authored Adventure Areas, each a separate map, on a remote island: the shipwreck coast, the woods, the mountain, the cave, and the old castle, which includes its forgotten harbor.
- The main route is linear in that order. Adjacent Adventure Areas are joined by visible exits. The hero may backtrack between connected Adventure Areas until the final departure by ship. Each Adventure Area may include optional side paths with extra Gear, Ammunition, and Experience.
- Light, mostly optional obstacles (for example a key or lever that opens a side room) are allowed; the main route never requires solving one.
- There are no NPCs and no dialogue. The story is a brief opening (a storm wrecked the ship, with no deeper mystery), a brief ending, short Adventure Area text, and environmental clues.
- The ending: defeating the Guardian opens access to the forgotten harbor; the hero prepares the old vessel and sails home. That departure is the point of no return. It is followed by an ending and credits screen and then the title screen.

**Movement**

- The hero walks a fixed step at a time in the direction last held, and stops flush against what is solid: rock and water, a chest, a lever, a sign, a closed door or gate, and a monster. Its body is narrower than a tile, but the passages of the world are one tile wide, so that a player who is a little off the middle of one would be stopped by its corner at every try. The hero is therefore helped round corners: when its step is stopped by the corner of something solid that does not move, and its middle is already over the gap, it slides sideways the little that is needed to clear the corner, at walking speed, and then goes on in the direction it was walking. It never slides into anything solid, a monster that stands in the way included, and it is not helped when its middle is over the wall, the chest or the door (it would not fit the gap, or would be pushed through what it should be stopped by). Monsters are not helped, and nothing about combat or its numbers changes.

**Combat rules**

- Combat is real time. Space attacks in the facing direction with the active weapon, and Q switches the active weapon between the Melee Weapon (sword) and the Ranged Weapon (bow). Both use the same attack key and a shared short cooldown. There is no stamina or mana.
- The Ranged Weapon fires a projectile in the facing direction and consumes one Ammunition per shot. There is a single generic Ammunition type with one shared count.
- There is no block or dodge. Enemies telegraph their attacks and the hero avoids them by moving.
- Damage dealt depends on Attack (base, assigned Stat Points, and the active weapon's bonus). Damage received is reduced by Defense (base, assigned Stat Points, and the armor's bonus). Exact formulas and numbers are tunable data.
- The hero is defeated when Health reaches zero.
- Monsters follow a location-themed roster: forest beasts and slimes in the woods, mountain raiders, cave creatures, and castle undead, built from a few reusable enemy behaviors. There is exactly one Guardian, a distinct undead defender that is the final fight of the game.

**Progression rules**

- Experience comes from defeating monsters and from major Adventure Area milestones. Milestone Experience is awarded once. Monsters that reset after a defeat grant Experience again when re-defeated.
- Levels run from 1 to 6, with the cap at 6; thresholds are data, tuned so the intended route yields about five level-ups. Each Level grants one Stat Point. The player assigns it to Health, Attack, or Defense in a paused level-up choice, and assignments are final (no respec).
- Health is the maximum Health, tracked separately from the hero's current Health. Attack raises damage dealt. Defense reduces damage received.

**Gear, inventory, and consumables**

- One Melee Weapon, one Ranged Weapon, and one set of armor are equipped; other Gear and consumables are stored in the inventory. The inventory has no capacity or weight limit.
- Gear gives simple bonuses only: weapons raise Attack and armor raises Defense. There are no special abilities and no set bonuses. Upgrades to a weapon type change Attack only.
- The hero starts with a basic Melee Weapon (sword) and basic armor. The first Ranged Weapon (bow) is the Long Bow, the only bow of the game, in the chest of a locked cabin in the woods: a side path that the main route never needs (the sword is enough for the Guardian), whose key lies in the north woods, guarded, and which a sign by the cabin's door points to. The first Ammunition lies in caches along the trail. No monster carries Gear. A few curated upgrades (roughly one weapon and one armor improvement every couple of Adventure Areas) come from chests and story milestones, with occasional monster drops of consumables. There are no shops and no currency.
- Healing Potions are collectible, restore Health when used, and are the only way to heal short of defeat, which returns the hero to a Checkpoint at full Health. A Checkpoint does not heal. There is no passive regeneration.
- Ammunition is replenished only from marked caches and occasional monster drops. Checkpoints never refill it.

**Checkpoints, saves, and defeat**

- There is a Checkpoint at the entrance of each of the five Adventure Areas (the start of the adventure counts as the first) and one immediately before the Guardian: six in total.
- Activating a Checkpoint leaves the hero's Health as it is (the Health the hero has left goes on into the next Adventure Area), records a snapshot of the hero's Ammunition and Healing Potion counts and of which consumable pickups have been collected, and autosaves. The game also autosaves whenever the hero changes Adventure Area. There is one autosave, in browser-local storage; Continue restores it.
- On defeat the hero returns to the most recently activated Checkpoint with full Health, and:
  - These persist: Level, Experience, assigned Stat Points, all Gear, opened chests that hold Gear and other permanent one-time rewards, opened levers and doors, a defeated Guardian, and Automap discoveries.
  - These roll back to the Checkpoint's snapshot: Ammunition and Healing Potion counts, together with the collected state of every pickup or chest whose contents are consumables (ammunition caches, potion pickups, and so on), so a consumable obtained after the Checkpoint is never permanently lost.
  - These reset: ordinary monsters in the Adventure Area that contains that Checkpoint, and an undefeated Guardian. Monsters defeated in other Adventure Areas stay defeated.
- Outside of defeat, monsters defeated in an Adventure Area stay defeated when the hero backtracks into it.

**Automap**

- The Automap opens with M and pauses the game. It shows the whole island route (all five Adventure Areas and their known connections), reveals detailed terrain only as the hero explores it, marks the hero's position on the current Adventure Area, and marks exits the hero has found. There are no quest markers and no map item to find. Discoveries persist through defeat and saves.

**Menus and controls**

- Keyboard only: WASD or the arrow keys move; Space attacks; Q switches weapon; E interacts; I toggles the inventory; M toggles the Automap; C or Tab toggles the stat page; H toggles the Controls page; Esc closes the open page, declines the question whether to sail home and, when none of them is open, pauses the game (below). A page key toggles only its own page: it opens the page when nothing else is open and closes it when it is the page that is open, and it does nothing while another page is open, a level-up choice waits, or the question whether to sail home is asked. Each page's close hint names its own key or keys as well as Esc.
- The Controls page lists every key the game answers to with what each does, and is built from the table that binds the keys, so it cannot disagree with them. It opens with H during play and pauses the game like the other pages; the title screen offers the same list as a Controls entry in its menu.
- The player is told that H shows the Controls page: the card of the opening says so under its lines, and a short line, "H FOR CONTROLS", shows for a few seconds when play begins (after the opening card, for a New Game) and when a saved game continues. The label comes from the table that binds the keys. The feet of the pages do not say it, because a page key does nothing while another page is open. The line is the adapter's own, since the Game core knows no keys.
- The text of an Adventure Area (shown the first time the hero is in the area) and the text of a sign stay on the screen for a few seconds, or until the player presses a key. Any key counts, the walk keys and Esc included, but only a key that goes down after the text has appeared: the key that made it appear (Interact at a sign, the Enter that ended the card of the opening) and a key still held from before, such as the walk key that carried the hero through an exit, do not dismiss it. The Game core takes a command that clears the text and the time it has left; which key sends it is the adapter's, for the Game core knows no keys.
- Esc pauses the game when nothing is open: no page, no level-up choice, no question whether to sail home, and the game is not at the card of the opening or in a fall. The title screen comes up as the paused screen, with a PAUSED message, and its menu has RESUME on top, then NEW GAME, CONTINUE and CONTROLS as the title screen has them. RESUME, or Esc again, returns to the game exactly as it was: the pause sends the Game core nothing but the stops of the four walk keys (the frame in which Esc went down is an ordinary frame, which ran before the pause), nothing is saved by the pause, no key held at the pause keeps the hero walking, and the music of the place plays again. NEW GAME asks before it replaces the game in play and the saved game; CONTINUE goes back to the saved game; CONTROLS shows the list. The pause is the adapter's: the Game core knows no keys and no screens.
- Gameplay is paused whenever the inventory, stat page, Automap, Controls page, or a level-up choice is open, and while the paused screen shows.
- The HUD during play shows Health, the active weapon, Ammunition, and the Healing Potion count.

**Art and audio**

- Art is polished, consistent top-down pixel art. The provisional base is the CC0 Ninja Adventure asset pack, which must be verified against its actual files before the project commits to it: terrain for the five Adventure Areas, one hero with sword and bow attack animations, the monster roster, and an undead Guardian. A small, visually matching shipwreck supplement is needed, with its license and fit verified. All art and audio must permit public and commercial use. Gameplay is built against placeholder art until the real art is verified and approved.
- Audio is a small set of light adventure music plus essential sound effects (attacks, hits, pickups, menu feedback), with mute and volume controls. There is no voice acting.

## Testing Decisions

- **What makes a good test here**: a test sends player commands and fixed time steps into the Game core's interface and asserts only on what comes out: the observable state, the events, and the save snapshot. It never reaches into internals, and it never needs Phaser, a browser, real time, or real storage. Time is stepped in fixed increments and the random source is seeded, so every test is deterministic. Expected values come from independent sources (worked examples written down by hand), never from re-implementing the rule inside the test. Test names use the glossary vocabulary, for example "defeat restores Ammunition to the Checkpoint's count".
- **The single seam**: the Game core's interface is the only automated test seam. Content definitions are supplied through it, so tests use tiny purpose-built fixtures plus a validation pass over the real content. This seam is proposed by the spec author and is not yet confirmed by the user; confirm it before the first test is written.
- **Which module is tested**: the Game core only, covering at least:
  - Movement, facing, and collision; attack cooldown; melee hits only what is in front; the bow consumes one Ammunition per shot and cannot fire at zero.
  - Weapon switching; Attack and Defense totals including Gear; Defense reducing damage received.
  - Experience, Levels, the Level 6 cap, one Stat Point per Level, and the paused level-up choice; Experience granted again for reset monsters; milestone Experience awarded once.
  - Pausing while the inventory, Automap, stat page, Controls page, or a level-up choice is open.
  - Movement round corners: a hero whose middle is over a one-tile gap and that walks against its corner slides in at walking speed, from every offset across the gap, tested on the real passages of the content (the crevice of the coast and the door of the cabin); it stops flush when its middle is over the wall, a chest, a lever, a sign or a closed door, and when a monster stands in the way of the slide; monsters are not helped.
  - The Long Bow as the only bow: the starting hero has no bow, no monster hands out Gear, and the bow is in the cabin's chest, behind the door that only the key of the north woods opens; a hero that walks from the key to the door to the chest holds the Long Bow, equips it, switches to it with Q and shoots it with Space; a save that holds a bow of an earlier version is refused as from another version and never crashes the game.
  - Toggling a page (the Controls page included): the same key opens a page and then closes it; a key of another page does nothing while a page is open; no page opens while a level-up choice or the question whether to sail home waits; a page that is open (also one restored from a save) closes with its own key.
  - Dismissing the text of an area: the command clears the text of a first entry into an area and of a sign, with the time it had left, and changes nothing when there is no text.
  - Checkpoint activation (it leaves the hero's Health as it is) and autosave triggers, and the full defeat-recovery rules (full Health, what persists, what rolls back, what resets), including a Guardian that stays defeated and an undefeated one that starts fresh.
  - Backtracking: monsters stay defeated; the final departure is the only point of no return; the ending is reachable only after the Guardian is defeated and leads back to the title.
  - Automap: hidden at the start, terrain recorded as explored, hero position and found exits marked, discoveries persisting through defeat.
  - Save snapshot round trip: restoring a snapshot reproduces the same observable state.
  - Content validation: the real content connects the five Adventure Areas in order, every exit leads somewhere valid, every Adventure Area entrance and the point before the Guardian has a Checkpoint, there is exactly one Guardian, and the harbor is reachable only through it.
- **Not automatically tested**: Phaser rendering, keyboard mapping, audio, and how the art looks. Each ticket that touches the Phaser adapter carries a short manual play checklist, and the build and type checks must pass.
- **Prior art**: none. The repository has no code or tests yet, so the first Game core tests set the pattern. Follow the tdd skill: one vertical slice at a time, red before green.

## Out of Scope

- Shops, currency, and any trading.
- NPCs, dialogue trees, and companions or party members. There is exactly one playable hero.
- Character creation or cosmetic customization; the hero is fixed.
- Respec of Stat Points.
- Stamina, mana, charge attacks, block, dodge, special weapon abilities, set bonuses, and more than one Ammunition type.
- Inventory weight or slot limits.
- Difficulty modes.
- A second Guardian or any other final fight; the game ends with the single Guardian.
- Mouse aiming, gamepad, touch, mobile, and native desktop packaging; the game is desktop-browser and keyboard only.
- Multiple save slots, manual saving, accounts, and cloud saves.
- Free roam or any postgame content after the ending.
- Procedurally generated maps.
- Voice acting.
- Release work: hosting, store pages, and monetization. The only constraint carried over from release is that assets must permit public and commercial use.

## Further Notes

**Assumptions made while writing this spec (not confirmed with the user)**

These were not put to the user during the interview. Each is the recommended default and can be changed before the first ticket starts.

1. **Test seam.** The Game core's interface is the single test seam. Alternatives considered: adding a browser-level smoke seam (a second seam, slower, and flaky for real-time combat) or browser-only end-to-end tests (the highest seam, but non-deterministic for real-time combat and hard to assert on a canvas). The trade-off of the chosen seam is that nothing automatically checks visuals, input mapping, or audio.
2. **Consumables on defeat.** Three earlier answers collide: ammunition and potion counts return to the Checkpoint snapshot (including potions "collected since"), yet opened chests and collected caches persist. Taken literally, a cache opened after a Checkpoint would be lost for good on defeat. This spec reconciles them by rolling consumable pickups back together with the counts, while Gear chests and everything else persist. Alternatives: refund what was spent but keep what was gained (simpler, but monster drops become farmable by dying repeatedly), or keep both rules literally and accept the loss. One rare edge is left open: a consumable dropped by a monster in a different Adventure Area than the Checkpoint's, where the monster stays defeated after the rollback.
3. **Placeholder art first.** The user chose to verify the art through public previews only and has not approved downloading the pack. Gameplay is therefore built against placeholder art, and downloading and integrating the real art waits for the user's go-ahead.
4. **Tooling.** The language, bundler, and test runner were not decided. Recommendation: TypeScript with Vite (the usual Phaser setup) and Vitest for the headless tests. The first ticket should confirm this.

**Art status**

- Candidate base: Ninja Adventure by Pixel-Boy on itch.io, free or pay-what-you-want, listed as CC0 (no attribution required).
- Confirmed from the creator's public pages: general top-down terrain and building tiles, characters, monsters, bosses, items, UI, and visual effects, plus one fully animated character whose attack animation works with five weapons and tools.
- Not confirmed from primary sources: dedicated coast, mountain, cave, and castle terrain; and whether that one hero has both sword and bow attacks. A later, secondhand preview summary said coast, mountain, cave, castle, and sword and bow attacks are all visible; treat that as unverified until the files are inspected. No shipwreck art was seen, hence the small supplement.
- Phaser use is feasible with the PNG sheets, but tilemaps and collision must be assembled; the public sample project targets another engine.
- Fallbacks researched, none bought or downloaded (prices as observed during research): TinyRPG Collection (about $129.99; broad, but castle, mountain, and ship material are battle backgrounds, no real-time hero attack animations confirmed, and asset files may not be redistributed); Mithrillor's Pixel RPG Characters Pack (a sword Warrior and a crossbow Archer, but as separate characters; name-your-own-price; redistribution prohibited); and Another Perspective by VEXED (about $1.95; CC BY 4.0, so attribution is required; 8x8 scale).

**Details not decided (the implementer's call within the constraints above, with proposed defaults)**

- How a Checkpoint is activated. Default: the hero touches it.
- How Healing Potions are used. Default: from the paused inventory page; an extra quick-use key is optional.
- Whether a level-up's Stat Point can be deferred. Default: it is assigned immediately in the level-up choice.
- Firing the bow with no Ammunition. Default: nothing fires, with clear feedback.
- Four-direction versus eight-direction movement.
- Which monsters, if any, appear on the coast. Default: a few weak ones to teach the controls.
- What "preparing the vessel" involves. Default: interacting with it; extra fetch items are optional.
- New Game over an existing save. Default: ask for confirmation. After the ending, default: leave the last autosave untouched.
- Pixel-crisp scaling, window resizing, and pausing when the browser tab loses focus. Default: crisp scaling, and pause on focus loss.
- An unreadable or incompatible save. Default: treat it as no save and show a short message; never crash.
- A floor on damage. Default: Defense can never reduce damage received to zero.
- What the "few demanding fights" along the route are. Default: tougher variants of ordinary monsters, with no additional Guardians.
- Which key opens the Controls page. Default: H.
- Numeric balance. Targets: about five level-ups on the intended route, approachable moderate difficulty, and a Guardian that is beatable with the Levels and Gear earned on the intended route.

**Glossary gaps**

The glossary does not yet define hero, monster, inventory, stat page, chest, ammunition cache, exit, or armor. This spec uses them in their plain meaning; they are candidates for the next `/domain-modeling` or `/grill-with-docs` pass.

**For the ticket breakdown**

- Build vertically. The first tracer bullet should prove the Game core and the Phaser adapter end to end: the hero moves and strikes a monster in one Adventure Area, with placeholder art.
- Keeping the Game core headless and treating its interface as the only test seam meets the criteria for a decision record (hard to reverse, surprising without context, a real trade-off). Record it once the user confirms the seam.
