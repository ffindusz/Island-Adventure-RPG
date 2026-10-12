# Balance of the adventure

Every number of the game lives in `src/content`. The tests pin the *relations* that the adventure is meant to have
(a few demanding fights, noticeable steps of Gear, enough supplies, a Guardian that can be beaten and is no pushover);
the numbers that the measurements give are written here, with how they were measured and what they rest on. A tuning
that moves them a little breaks no test; one that breaks a relation does.

The tables below are a snapshot of what those tests printed when the balance pass was made. No test compares them with
the numbers of the content, so after a tuning they stay as they were until someone prints them again and writes them
in.

To print the tables again after a tuning:

- `npx vitest run tests/fights.test.ts --silent=false`: the fight table, the Gear steps and the supplies.
- `npx vitest run tests/guardian-balance.test.ts --silent=false`: the Guardian's table.
- `npx vitest run tests/play-time.test.ts --silent=false`: the basis, the guesses and the estimates of the play time.
- The Experience of the route is pinned in `tests/route-experience.test.ts`.

## Experience along the route

The intended route is the shortest walk over the designed trail of each area, every door and gate shut, killing every
monster that stands on it and crossing every milestone (`tests/main-route.ts`). The thresholds are 10, 25, 45, 70
and 100 Experience; the Level cap is 6.

| Area | Level on entering | Monsters on the route | Their Experience | Milestone | Route Experience | Cumulative | Threshold | Level on leaving |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shipwreck-coast | 1 | 2 | 10 | 5 | 15 | 15 | 10 | 2 |
| woods | 2 | 4 | 13 | 5 | 18 | 33 | 25 | 3 |
| mountain | 3 | 5 | 19 | 3 | 22 | 55 | 45 | 4 |
| cave | 4 | 5 | 17 | 3 | 20 | 75 | 70 | 5 |
| castle | 5 | 8 | 26 | 3 | 29 | 104 | 100 | 6 |

That is five Level-ups, each reached with room to spare, the last with four: a hero that leaves the 7-Experience knight
of the castle alone reaches the arena at Level 5. A hero that also visits the side paths only has more, so nothing has
to be ground for.

## The fights

A *duel* (`tests/duel.ts`) plays one fight through the Game core as a player plays who never dodges: a hero of a given
make walks up to a monster in an empty room and strikes whenever the blow would land, and drinks a Healing Potion when
it has one and is at half its Health or less. `tests/fight-table.ts` runs it for every ordinary monster type, in the
area where the route first meets it, for three builds of the route hero: all Stat Points in Health, all in Attack, and
a split (Attack, Health, Defense in turn). The hero has the Level it has on coming into the area and the Gear it has
found near the route in the areas before. A fight is **demanding** when the worst build loses half its Health or more
without a potion.

| Monster | Area | Level | Worst build | Health lost | Potions to win | Fight |
| --- | --- | ---: | --- | ---: | ---: | --- |
| crab | shipwreck-coast | 1 | all in Health | 3 of 10 | 0 | approachable |
| wolf | woods | 2 | all in Health | 0 of 12 | 0 | approachable |
| slime | woods | 2 | all in Attack | 2 of 10 | 0 | approachable |
| boar | woods | 2 | all in Health | 5 of 12 | 0 | approachable |
| spitter | woods | 2 | all in Health | 0 of 12 | 0 | approachable |
| raider | mountain | 3 | split | 4 of 12 | 0 | approachable |
| raider-charger | mountain | 3 | split | 5 of 12 | 0 | approachable |
| raider-archer | mountain | 3 | all in Health | 0 of 14 | 0 | approachable |
| raider-veteran | mountain | 3 | all in Health | defeated | 3 | **demanding** |
| cave-bat | cave | 4 | all in Health | 0 of 16 | 0 | approachable |
| cave-lizard | cave | 4 | all in Health | 6 of 16 | 0 | approachable |
| cave-eye | cave | 4 | all in Health | 2 of 16 | 0 | approachable |
| cave-bear | cave | 4 | all in Health | defeated | 3 | **demanding** |
| castle-skeleton | castle | 5 | all in Health | 3 of 18 | 0 | approachable |
| castle-ghoul | castle | 5 | all in Health | 8 of 18 | 0 | approachable |
| castle-wraith | castle | 5 | all in Health | 3 of 18 | 0 | approachable |
| castle-knight | castle | 5 | all in Health | defeated | 4 | **demanding** |

"Potions to win" is what the worst build drinks with twenty in hand. The demanding fights are the tougher variant of
each of the last three areas (the Guardian has its own fight, below). What they cost each build:

| Monster | all in Health | all in Attack | split |
| --- | --- | --- | --- |
| raider-veteran | defeated, 3 potions | 7 of 10, 1 potion | 7 of 12, 1 potion |
| cave-bear | defeated, 3 potions | 6 of 10, 1 potion | 5 of 12, no potion |
| castle-knight | defeated, 4 potions | 7 of 10, 1 potion | 6 of 12, 1 potion |

A hero that spends its points on Health is hurt by these three because it strikes for 1 a blow: twelve to twenty
blows against a monster that hits for 8 to 10 (7, 6 and 7 after its Defense). That is the demand that a Healing Potion,
an arrow from a distance or a few Stat Points on Attack are there to answer.

### What was tuned

Before this pass three more fights were demanding: the worst build lost half its Health or more to a charger that
dashes down a lane, which the duel's hero never leaves. Each was cut by one or two points of damage; nothing else was
touched, and no test had pinned them.

| Monster | Damage before | Damage after | Worst build before, after |
| --- | ---: | ---: | --- |
| raider-charger | 7 | 6 | 6 of 12 (half), then 5 of 12 |
| cave-lizard | 7 | 6 | 8 of 16 (half), then 6 of 16 |
| castle-ghoul | 9 | 7 | 12 of 18 (two thirds), then 8 of 18 |

Reverting any one of them turns the class test in `tests/fights.test.ts` red.

## The Gear

A piece of Gear is a **noticeable step** when it raises the Attack or Defense of its slot by at least a fifth, at the
Level the hero has where the piece lies (the numbers are the Game core's own, `statsOf` in `tests/profile-heroes.ts`).
Each piece is compared with the piece below it in its slot.

| Piece | Over | Found in | Level | all in Health | all in Attack | split |
| --- | --- | --- | ---: | --- | --- | --- |
| steel-sword | basic-sword | shipwreck-coast | 1 | 1 to 2 (+100%) | 1 to 2 (+100%) | 1 to 2 (+100%) |
| katana | steel-sword | cave | 4 | 2 to 3 (+50%) | 5 to 6 (+20%) | 3 to 4 (+33%) |
| chain-mail | basic-armor | woods | 2 | 1 to 2 (+100%) | 1 to 2 (+100%) | 1 to 2 (+100%) |
| plate-armor | chain-mail | mountain | 3 | 2 to 3 (+50%) | 2 to 3 (+50%) | 2 to 3 (+50%) |
| knight-mail | plate-armor | castle | 5 | 3 to 4 (+33%) | 3 to 4 (+33%) | 4 to 5 (+25%) |
| short-bow | nothing | woods | 2 | none to 2 (new) | none to 3 (new) | none to 3 (new) |
| long-bow | short-bow | woods | 2 | 2 to 3 (+50%) | 3 to 4 (+33%) | 3 to 4 (+33%) |

Every step is a fifth or more. The weakest are the Katana for an all-Attack hero (exactly a fifth) and the Knight Mail
(a quarter to a third). A step shrinks as the Level rises, because the base is larger: the same Katana at Level 6
would be +14% for an all-Attack hero.

*On or near the route* is, in these measurements, within four tiles of the trail with every door shut
(`MOST_NEARBY` in `tests/main-route.ts`). A piece of Gear that a monster carries counts as found on the route when the
route meets the monster, and as near when a detour of four tiles reaches it (`findsOf` in `tests/main-route.ts`). What a
hero that keeps to that carries to the Guardian is the Basic Sword it began with, the **Knight Mail** (two tiles off the
trail in the castle) and the **Short Bow** (carried by the first wolf of the woods, which stands on the trail itself).
The Plate Armor lies three tiles off the trail in the mountain, so the armor gets better in the mountain and
again in the castle. The Steel Sword (eleven tiles off the coast's trail), the Chain Mail (sixteen in the woods), the
Katana (behind the cave's lever gate) and the Long Bow (behind the cabin door) are side-path Gear: see "Proposals".

The wolf that carries the Short Bow is the weakest fight of the game, so that the hero wins the bow without it: in
"The fights" the worst build loses 0 of 12 Health to a wolf, with the Basic Sword and the Basic Armor, which are what
the fight table gives the hero on coming into the woods (the table has no bow for it). It stands eight tiles in from the
way in, farther than it notices a hero, and the bow comes to the hero when the wolf is defeated and no sooner. Moving
the bow from a chest to the wolf changed no Experience (the wolf was on the route already), no ledger of the supplies
and no step of Gear; the only number that moved is the play time's near errands (below).

## The supplies

A Healing Potion restores 5 Health. For each build the ledger adds up what the fights of the route of an area take with
no dodging (a duel with potions to spare), and counts the potions needed to come out of them from full Health
(`floor((damage - max Health) / 5) + 1`, none if the damage is below the Health). It then walks the route: potions
found within four tiles of the trail, plus those carried in, minus those needed. Monster drops are left out of the
count; they are a bonus.

| Build | Needed, by area (coast to castle) | Left on leaving, with the potions near the route | Left, with every potion that lies without a door |
| --- | --- | --- | --- |
| all in Health | 0, 0, 5, 3, 8 | 3, 4, 1, 0, **-5** | 3, 6, 6, 8, 8 |
| all in Attack | 0, 0, 0, 0, 1 | 3, 4, 6, 8, 10 | 3, 6, 11, 16, 23 |
| split | 0, 0, 2, 0, 0 | 3, 4, 4, 6, 9 | 3, 6, 9, 14, 22 |

Potions found by area: 3, 1, 2, 2, 3 near the route (eleven), and 3, 3, 5, 5, 8 in all behind no door (twenty-four).
Drops add, on average, 0.3, 0, 0.5, 0.5 and 0.5 potions per area.

- A hero that spends its points on Attack or on a split never runs short with the potions near the route, and arrives
  at the Guardian with 9 or 10 left: more than the six the Guardian's tests assume.
- A hero that puts every point in Health and never dodges takes 34, 26 and 54 Health of damage in the mountain, the
  cave and the castle, against 14, 16 and 18 Health: with the near potions alone it is five short in the castle. It is
  not short if it also opens the side-path chests. This is an extreme build and a hero that never dodges; the
  numbers say that such a hero has to leave the trail for its potions, not that it must grind.

Arrows: a ranged monster takes `ceil(Health / arrow Attack)` shots, and the ledger counts two arrows to a shot that
lands. The arrow's Attack is the hero's with the bow it has by then.

| Build | Arrow Attack, woods to castle | Arrows needed, coast to castle | Arrows near the route |
| --- | --- | --- | --- |
| all in Health | 2, 2, 2, 2 | 0, 2, 4, 4, 8 | 0, 12, 12, 18, 18 |
| all in Attack | 3, 4, 5, 6 | 0, 2, 2, 2, 4 | 0, 12, 12, 18, 18 |
| split | 3, 3, 3, 4 | 0, 2, 2, 2, 4 | 0, 12, 12, 18, 18 |

The arrows near the route are at least 2.25 times what the shots need, counted at two arrows to a shot that lands (the
all-in-Health hero in the castle, who has the weakest arrows; elsewhere, three times and more), so a hero that shoots
does not run short: 60 arrows lie near the route in all, and 32 more on the side paths (four caches of 8, one in each of
the mountain and the cave and two in the castle). The Guardian takes 25 shots
from a hero whose arrows have Attack 4 (a split hero with the Short Bow): 50 arrows at a hit in two, which the 60
near the route cover; an all-in-Health hero, with arrows of Attack 2, would need 100, more than lie near the route, so
the sword is its way.

## The Guardian

The Guardian has 100 Health and three patterns that telegraph before they hit: sweep (8), charge (11) and smite (7),
before the hero's Defense. `tests/dodging-bot.ts` plays the fight through the Game core's interface and nothing else.
It reads the view and sends the commands a player's keys send. Each step it drinks a Healing Potion at half Health,
steps out of any lit zone by the shortest way, walks up to the Guardian and strikes whenever the blow would land. Two
settings stand for the person: how long it takes to act on a telegraph, and how many telegraphs go unseen (the
lapse: one in so many; 1 is every one). The hero begins at full Health at the Guardian's Checkpoint, in the shipped
content without the ordinary monsters. It is melee-only: it never shoots.

| Hero | Plays | Potions | Outcome | Damage taken | Potions drunk | Blows | Seconds |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Level 6, all in Attack | answers in 600 ms | 0 | won | 0 | 0 | 17 | 10 |
| Level 6, all in Attack | answers in 700 ms | 0 | won | 0 | 0 | 17 | 9 |
| Level 6, all in Attack | answers in 750 ms | 0 | defeated | 10 | 0 | 8 | 5 |
| Level 6, all in Attack | misses 1 in 3, answers in 250 ms | 6 | won | 4 | 0 | 17 | 10 |
| Level 6, all in Attack | misses 1 in 3, answers in 450 ms | 6 | won | 4 | 0 | 17 | 10 |
| Level 6, all in Attack | never answers | 6 | won | 14 | 2 | 17 | 8 |
| Level 6, mostly Attack | answers in 600 ms | 0 | won | 0 | 0 | 25 | 14 |
| Level 6, mostly Attack | answers in 700 ms | 0 | won | 0 | 0 | 25 | 12 |
| Level 6, mostly Attack | answers in 750 ms | 0 | won | 8 | 0 | 25 | 12 |
| Level 6, mostly Attack | misses 1 in 3, answers in 250 ms | 6 | won | 3 | 0 | 25 | 15 |
| Level 6, mostly Attack | misses 1 in 3, answers in 450 ms | 6 | won | 3 | 0 | 25 | 14 |
| Level 6, mostly Attack | never answers | 6 | won | 17 | 3 | 25 | 11 |
| Level 6, balanced | answers in 600 ms | 0 | won | 0 | 0 | 34 | 19 |
| Level 6, balanced | answers in 700 ms | 0 | won | 0 | 0 | 34 | 16 |
| Level 6, balanced | answers in 750 ms | 0 | won | 10 | 0 | 34 | 16 |
| Level 6, balanced | misses 1 in 3, answers in 250 ms | 6 | won | 6 | 0 | 34 | 20 |
| Level 6, balanced | misses 1 in 3, answers in 450 ms | 6 | won | 6 | 0 | 34 | 19 |
| Level 6, balanced | never answers | 6 | won | 19 | 3 | 34 | 15 |
| Level 6, all in Health | answers in 600 ms | 0 | won | 0 | 0 | 100 | 55 |
| Level 6, all in Health | answers in 700 ms | 0 | won | 0 | 0 | 100 | 46 |
| Level 6, all in Health | answers in 750 ms | 0 | won | 34 | 0 | 100 | 46 |
| Level 6, all in Health | misses 1 in 3, answers in 250 ms | 6 | won | 28 | 4 | 100 | 58 |
| Level 6, all in Health | misses 1 in 3, answers in 450 ms | 6 | won | 28 | 4 | 100 | 57 |
| Level 6, all in Health | never answers | 6 | defeated | 52 | 6 | 67 | 28 |
| Level 6, all in Defense | answers in 600 ms | 0 | won | 0 | 0 | 100 | 55 |
| Level 6, all in Defense | answers in 700 ms | 0 | won | 0 | 0 | 100 | 46 |
| Level 6, all in Defense | answers in 750 ms | 0 | won | 11 | 0 | 100 | 46 |
| Level 6, all in Defense | misses 1 in 3, answers in 250 ms | 6 | won | 7 | 1 | 100 | 58 |
| Level 6, all in Defense | misses 1 in 3, answers in 450 ms | 6 | won | 7 | 1 | 100 | 57 |
| Level 6, all in Defense | never answers | 6 | won | 22 | 4 | 100 | 41 |
| Level 6, balanced, Katana and Long Bow | answers in 600 ms | 0 | won | 0 | 0 | 20 | 11 |
| Level 6, balanced, Katana and Long Bow | answers in 700 ms | 0 | won | 0 | 0 | 20 | 10 |
| Level 6, balanced, Katana and Long Bow | answers in 750 ms | 0 | won | 8 | 0 | 20 | 10 |
| Level 6, balanced, Katana and Long Bow | misses 1 in 3, answers in 250 ms | 6 | won | 3 | 0 | 20 | 11 |
| Level 6, balanced, Katana and Long Bow | misses 1 in 3, answers in 450 ms | 6 | won | 3 | 0 | 20 | 11 |
| Level 6, balanced, Katana and Long Bow | never answers | 6 | won | 11 | 1 | 20 | 9 |
| Level 3, 1/1/0 points | answers in 600 ms | 0 | won | 0 | 0 | 50 | 28 |
| Level 3, 1/1/0 points | answers in 700 ms | 0 | won | 0 | 0 | 50 | 24 |
| Level 3, 1/1/0 points | answers in 750 ms | 0 | won | 19 | 0 | 50 | 24 |
| Level 3, 1/1/0 points | misses 1 in 3, answers in 250 ms | 6 | won | 12 | 2 | 50 | 29 |
| Level 3, 1/1/0 points | misses 1 in 3, answers in 450 ms | 6 | won | 12 | 2 | 50 | 28 |
| Level 3, 1/1/0 points | never answers | 6 | won | 38 | 6 | 50 | 21 |

The Level 6 heroes have the Basic Sword, the Knight Mail and the Short Bow (the Gear of the main route) unless the row
says otherwise; the Level 3 hero has the Knight Mail and the Basic Sword. The seconds are the game's, not a player's.

- **It can be beaten with the Gear of the main route.** Every build of the Level 6 hero wins when it answers within
  700 ms, and when it misses one telegraph in three with the six potions the route spares. Even with no answer at all
  and six potions every build wins but the all-in-Health one. (With no potion at all, a hero of 10 Health that is hit
  at 750 ms is defeated: the all-in-Attack row.)
- **A hero that answers is not touched.** Within 700 ms of the telegraph's first moment the bot takes no damage at
  any build; the first hits come at 750 ms. 250 and 450 ms are the stand-ins for a person (see the assumptions).
- **The Katana makes it easier**: 20 blows against 34 for the same split, a fight of 11 seconds instead of 19, and
  never more damage.
- **It is not a pushover.** The Level 3 hero needs 50 blows and 24 to 29 seconds, takes 12 to 38 damage and, with the
  potions it has, drinks two to six of them; with none and half the telegraphs missed it is defeated where the
  Level 6 hero is not.
- **Build matters more than Level.** The Guardian's damage is fixed and only the hero's Defense lowers it; the length
  of the fight is set by Attack. All in Attack finishes in about ten seconds, all in Health or all in Defense take close
  to a minute. This is the loosest end of the design: see "Proposals".
- The Guardian's Health cannot be raised much past 117 without breaking the 40-strike ceiling that
  `tests/the-guardian.test.ts` keeps.

## Play time

The spec expects a first playthrough of about 45 to 60 minutes (`spec.md`, the aims and user story 20).
`tests/play-time.ts` estimates it from two kinds of input; `tests/play-time.test.ts` keeps its arithmetic and its
measurements true. **No number was chosen to reach the target**: the guesses below were written down before the
estimate was first computed, and they were not changed after.

**Measured or counted** from the shipped content and the core: the route of each area walked at the hero's speed (5
tiles a second; the model's walk agrees with the core's own to within a tile), the plain fights played through the core
(a build with its Stat Points split, as in "The fights"), the walk there and back to what lies off the route (with
every door open; *near* is within four tiles of the route with the doors shut, as in "The supplies"), the words on
show, the level-ups, the areas, the pieces of Gear, the keys and levers, the walk back to each demanding fight, and one
fight with the Guardian played by the dodging bot (reaction 450 ms, a lapse every third telegraph, a potion at half
Health, a main-route hero with the Stat Points split and six potions).

| Area | Walk (s) | Fights met | Plain fights (s) | Fights off the route | Plain fights off it (s) | Near errands (s) | Far errands (s) | Puzzles | Near Gear | Far Gear |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shipwreck-coast | 6.8 | 2 | 2.1 | 1 | 1.1 | 0.8 | 4.4 | 0 | 0 | 1 |
| woods | 11.2 | 4 | 2.8 | 2 | 1.3 | 1.2 | 19.2 | 1 | 1 | 2 |
| mountain | 22.0 | 5 | 6.8 | 1 | 1.0 | 4.4 | 8.0 | 0 | 1 | 0 |
| cave | 22.8 | 5 | 5.8 | 1 | 1.3 | 4.4 | 14.8 | 1 | 0 | 1 |
| castle | 17.8 | 8 | 9.5 | 2 | 2.9 | 5.2 | 19.6 | 0 | 1 | 0 |
| Total | 80.6 | 24 | 27.0 | 7 | 7.5 | 16.0 | 66.0 | 2 | 3 | 4 |

| Counted for the whole adventure | Value |
| --- | ---: |
| Words to read | 151 |
| Level-ups | 5 |
| Areas | 5 |
| Demanding fights: walk back from the Checkpoint (s) | 13.6, 20.6, 13.0 |
| Demanding fights: plain fight (s) | 2.4, 2.6, 2.6 |
| Guardian: walk to it, one won fight, walk on to the vessel (s) | 2.2, 19.4, 2.4 |

**Guessed**: what only a playtest can tell. Each guess has a low, a typical and a high value, and a scenario takes all of
its values at once: the low estimate is a quick player who knows where to go, the high one a slow player who looks for
everything.

| Guess | Unit | Low | Typical | High | Why |
| --- | --- | --- | --- | --- | --- |
| setupSeconds | seconds | 15 | 60 | 180 | The title, the controls and a first look around the coast before the first step of the way. |
| wordsPerMinute | words a minute | 250 | 200 | 120 | Silent reading runs at 200 to 250 words a minute; on a screen with a hero to steer it is slower. |
| wandering | times the route | 1.5 | 2.5 | 4 | The way is marked but not known, so a first visit doubles back, tries a branch and stops at the map. |
| fightCare | times a plain fight | 1 | 2 | 3 | A plain fight is the quickest win; a player also backs off, shoots, dodges and picks up what is dropped. |
| sideShare | share of the side material | 0 | 0.5 | 1 | A player goes to none of the far finds, puzzles and lone monsters, or half of them, or all of them. |
| puzzleSeconds | seconds a puzzle | 20 | 90 | 300 | A player who looks for the key or the lever from the sign finds it fast; one who does not searches the area. |
| pageSeconds | seconds a look | 8 | 15 | 30 | A level-up, a new area or a new piece of Gear brings a look at the inventory, the Stat Points or the Automap. |
| defeatsPerHardFight | defeats a demanding fight | 0 | 0.5 | 1.5 | A defeat costs the walk back from the Checkpoint and the fight again; the demanding fights defeat some players. |
| guardianAttempts | fights with the Guardian | 1 | 2 | 4 | The first try learns the three attacks that a player has not seen, and the next ones use what it learned. |

**The estimate**, part by part, in minutes (each part is a measured figure times its guesses: the route is walked
`wandering` times, a plain fight is taken `fightCare` times over, and the side material is taken `sideShare` of the
way):

| Part (minutes) | low | typical | high |
| --- | ---: | ---: | ---: |
| setup | 0.3 | 1.0 | 3.0 |
| reading | 0.6 | 0.8 | 1.3 |
| walking | 2.0 | 3.4 | 5.4 |
| fights | 0.5 | 1.0 | 1.7 |
| side finds | 0.3 | 0.8 | 1.4 |
| puzzles | 0.0 | 1.5 | 10.0 |
| pages | 1.7 | 3.8 | 8.5 |
| defeats | 0.0 | 0.5 | 1.8 |
| Guardian | 0.4 | 1.4 | 4.1 |
| Total | 5.7 | 14.1 | 37.0 |
| Against the 45 to 60 minutes of the spec | under | under | under |

**The adventure is well short of the target.** A hero that never stops walks all five routes in 81 seconds and wins the
24 fights of the way in 27; the typical estimate is 14 minutes, the low about 6 and the high 37. No scenario reaches 45,
and the high one takes every guess at its slow end at once. The parts that move most between the scenarios are the
puzzles (up to ten minutes if a player searches for both keys), the looks at the menus and walking.

**No number can close the gap**, and none was tried. The 24 plain fights of the way together last under half a minute,
so doubling the Health of every monster would add about a minute to the typical estimate; a hero half as fast would add
about five minutes of walking and cost the feel of the controls. At about three minutes an area for the typical
player, 45 minutes is an adventure of roughly fifteen areas of this size, or five areas about three times as long,
with more to meet and more to find (see "Proposals"). The estimate is the answer of a model, and the manual playtest is
its test: the playtest checklist asks for the clock time from the title to the credits.

## What these numbers rest on

- **The play-time estimate is arithmetic over guesses.** What is measured is exact for this content; the nine guesses
  are mine, with the reasons in the table, and only a playtest can replace them. The words to read are the placeholder
  story: a longer story adds about a minute for every 200 words.
- **The bot's reaction and lapse are stand-ins** for a person: a lapse is a fixed pattern (every third telegraph), not
  chance, so that a run is exactly repeatable. A person's mistakes come in bunches. The reaction counts from the first
  step of the wind-up. The playtest is what confirms or corrects them.
- **The duel is a plain fight, not a player.** The hero starts a few tiles from the monster, walks up and strikes,
  never steps aside and never shoots; a player who dodges a charger's dash or shoots a spitter pays less. That makes
  the classes stricter than the ticket needs. The class of a charger is sensitive to the start distance and to the hero
  standing in its lane.
- **Entrance Level.** A fight is measured at the Level the hero has on coming into the area, the least it has there; it
  will level up inside the area.
- **Six Healing Potions at the arena.** The area tests put eleven or twelve within four tiles of the trail, and a hero
  that fought every monster and drank sensibly has used about half. The Guardian simulation leans on this number.
- **One arrow in two lands** (`ARROWS_PER_HIT`), and the ledgers count the arrows near the trail, not drops.
- **Near the route** is four tiles of detour with every door shut. A different number would move the lists above.

## Proposals

These are not things a number can solve; each would be a new ticket.

- **The adventure is about a third of the length that the spec asks for** (see "Play time": a typical first playthrough
  of 14 minutes against 45 to 60, and 37 minutes for a slow player who does everything). A content ticket could add
  areas, lengthen the trails, put more encounters or optional content along them (and then this balance pass would
  need to run again), or the target could be revised to the length that the adventure has. That is a decision for the
  user, and the playtest's clock time is the evidence for it.
- **The weapon upgrades are not near the route.** The ticket asks for upgrades "on or near the route". The Steel Sword
  lies eleven tiles off a 35-step coast, and the Katana is behind a puzzle, so the main-route hero fights the whole game
  with the Basic Sword: the armor and the bow come to it, the sword does not. A placement ticket could put a Melee
  Weapon upgrade within a few tiles of the trail.
- **Plate Armor is optional in effect**, three tiles off the trail, and the Knight Mail is only a step of one point over
  it. Moving either would change the shape of the armor steps.
- **The Katana is the weakest step** for an all-Attack hero (a fifth), and shrinks as the hero's Level rises.
- **Builds that trivialise the Guardian** (all in Attack: 10 seconds, at most 14 damage with no answer) and builds that
  nearly cannot lose (all in Defense). A rule ticket (damage that scales, or a Defense floor) would be needed; a
  number cannot do it without breaking the 40-strike ceiling.
- **A hero that never dodges and puts every point in Health** has to open the side-path chests for its potions.
