import type { MonsterTypeDefinition } from '../core';

/** Every kind of monster, by type id. Speeds are in tiles per second, distances in tiles, times in milliseconds. */
export const monsterTypes: Readonly<Record<string, MonsterTypeDefinition>> = {
  // A placeholder chaser: slow enough to outrun, it takes three hits from the hero's basic sword. It notices the hero
  // from four tiles away, winds up for half a second, hits for 4 (3 after the hero's Defense) and rests before the next.
  // It is worth 5 Experience, a placeholder like the rest of the numbers until the tuning pass. Now and then it leaves
  // a Healing Potion behind when it is defeated. It leaves no arrows: the crabs of the shipwreck coast meet a hero who
  // has no bow yet, and a spitter, which shoots them, carries them instead.
  crab: {
    behavior: 'chaser',
    health: 3,
    size: 0.75,
    experience: 5,
    drops: [{ consumable: 'healing-potion', chance: 0.15, amount: 1 }],
    damage: 4,
    speedTilesPerSecond: 1.5,
    noticingDistance: 4,
    reach: 0.5,
    windUpMs: 500,
    recoveryMs: 900,
  },
  // A placeholder forest beast, the basic one: a chaser quicker than a crab, though still far slower than the hero, and
  // frailer: two hits from the hero's basic sword. It notices the hero from five tiles away, winds up for under half a
  // second, hits for 4 (3 after the hero's Defense) and rests before the next. It is worth 3 Experience, a placeholder
  // like the rest of the numbers until the tuning pass, and leaves nothing behind.
  wolf: {
    behavior: 'chaser',
    health: 2,
    size: 0.7,
    experience: 3,
    damage: 4,
    speedTilesPerSecond: 2.4,
    noticingDistance: 5,
    reach: 0.5,
    windUpMs: 450,
    recoveryMs: 800,
  },
  // A placeholder slime: a chaser that is slower and sturdier than a crab, and hits more lightly. It notices the hero
  // only from three tiles away, takes six hits from the hero's basic sword, and hits for 3 (2 after the hero's Defense)
  // after a wind-up of 0.6 s. It is worth 2 Experience: a long fight for little, there to be avoided or shot from afar.
  slime: {
    behavior: 'chaser',
    health: 6,
    size: 0.8,
    experience: 2,
    damage: 3,
    speedTilesPerSecond: 1,
    noticingDistance: 3,
    reach: 0.5,
    windUpMs: 600,
    recoveryMs: 1000,
  },
  // A placeholder charger: it notices the hero from four tiles away and walks, slower than the hero, to where its lane
  // takes in the hero. It then winds up for 0.7 s while the lane lights up, dashes down the lane at more than twice the
  // hero's walking speed, for six tiles at most, and rests for a second before it looks for the hero again. It hits for
  // 6 (5 after the hero's Defense) only a hero who is still in the lane: stepping out during the wind-up avoids it, and
  // the rest is the time to hit back. It takes four hits from the hero's basic sword and is worth 5 Experience.
  boar: {
    behavior: 'charger',
    health: 4,
    size: 0.85,
    experience: 5,
    damage: 6,
    speedTilesPerSecond: 2,
    noticingDistance: 4,
    windUpMs: 700,
    dashSpeedTilesPerSecond: 12,
    dashRange: 6,
    recoveryMs: 1000,
  },
  // A placeholder ranged attacker: it notices the hero from five tiles away and walks to three tiles from it, backing
  // away when the hero comes nearer, until a wall is at its back. It winds up for 0.8 s with a flash on its body, then
  // fires along the row or column that the hero stood in, a projectile slower than the hero's walk that hits for 4 (3
  // after Defense) and falls six tiles on. It rests for 1.5 s. It is frail: two hits from the sword, one arrow of the
  // short bow, and worth 3 Experience. Now and then it leaves two arrows behind when it is defeated: it carries what it
  // shoots. Leave out `keepsDistance` and it stands still where it is placed.
  spitter: {
    behavior: 'ranged',
    health: 2,
    size: 0.6,
    experience: 3,
    drops: [{ consumable: 'ammunition', chance: 0.25, amount: 2 }],
    noticingDistance: 5,
    windUpMs: 800,
    recoveryMs: 1500,
    projectile: { damage: 4, speedTilesPerSecond: 4, range: 6, size: 0.3 },
    keepsDistance: { preferredDistance: 3, speedTilesPerSecond: 2 },
  },
  // The raiders of the mountain are stronger than the beasts of the coast and the woods, and they are tuned together
  // with the Experience of the mountain (tests/the-mountain.test.ts). The basic raider is a chaser about as quick as a
  // wolf: it notices the hero from four tiles away, winds up for half a second, hits for 5 (4 after the hero's Defense)
  // and rests for 0.8 s before the next. It takes five hits from the hero's basic sword and three from the Steel Sword,
  // is worth 3 Experience and leaves nothing behind.
  raider: {
    behavior: 'chaser',
    health: 5,
    size: 0.75,
    experience: 3,
    damage: 5,
    speedTilesPerSecond: 2.5,
    noticingDistance: 4,
    reach: 0.5,
    windUpMs: 500,
    recoveryMs: 800,
  },
  // The raider that charges, like the boar: it notices the hero from four tiles away, walks to where its lane takes in
  // the hero, winds up for 0.7 s while the lane lights up, dashes six tiles at most at twelve tiles a second and rests
  // for a second. It hits for 6 (5 after the hero's Defense) only a hero who is still in the lane: the tuning pass took
  // one off, so that a hero who never leaves the lane loses under half of its Health (docs/balance.md). It takes five
  // hits from the hero's basic sword and three from the Steel Sword, and is worth 4 Experience.
  'raider-charger': {
    behavior: 'charger',
    health: 5,
    size: 0.85,
    experience: 4,
    damage: 6,
    speedTilesPerSecond: 2.2,
    noticingDistance: 4,
    windUpMs: 700,
    dashSpeedTilesPerSecond: 12,
    dashRange: 6,
    recoveryMs: 1000,
  },
  // The raider with a bow, like the spitter: it notices the hero from five tiles away and walks to four tiles from it,
  // backing away when the hero comes nearer, until a wall is at its back. It winds up for 0.8 s with a flash on its
  // body, then fires along the row or column that the hero stood in a projectile slower than the hero's walk that hits
  // for 5 (4 after Defense) and falls seven tiles on. It rests for 1.5 s. It is frail: three hits from the basic sword,
  // two from the Steel Sword or two arrows of the short bow, and worth 3 Experience. Now and then it leaves three arrows
  // behind when it is defeated: it carries what it shoots.
  'raider-archer': {
    behavior: 'ranged',
    health: 3,
    size: 0.7,
    experience: 3,
    drops: [{ consumable: 'ammunition', chance: 0.25, amount: 3 }],
    noticingDistance: 5,
    windUpMs: 800,
    recoveryMs: 1500,
    projectile: { damage: 5, speedTilesPerSecond: 4, range: 7, size: 0.3 },
    keepsDistance: { preferredDistance: 4, speedTilesPerSecond: 2 },
  },
  // The tougher raider that holds the pass, a chaser of the same pace as the others and a heavier hand: it notices the
  // hero from five tiles away, winds up for 0.6 s, hits for 8 (7 after the hero's Defense) and rests for 0.9 s. It takes
  // twelve hits from the hero's basic sword and six from the Steel Sword, more than twice as many as any other raider,
  // and is worth 6 Experience. Now and then it leaves a Healing Potion behind when it is defeated.
  'raider-veteran': {
    behavior: 'chaser',
    health: 12,
    size: 0.85,
    experience: 6,
    drops: [{ consumable: 'healing-potion', chance: 0.5, amount: 1 }],
    damage: 8,
    speedTilesPerSecond: 2.6,
    noticingDistance: 5,
    reach: 0.5,
    windUpMs: 600,
    recoveryMs: 900,
  },
  // The creatures of the cave are the cave's own, quicker and nastier than the beasts of the coast and the raiders of
  // the mountain, and they are tuned together with the Experience of the cave (tests/the-cave.test.ts). The bat is the
  // quickest chaser of the game, though still slower than the hero: it notices the hero from five tiles away, winds up
  // for a third of a second, hits for 3 (2 after the hero's Defense) and rests for 0.7 s before the next. It is frail:
  // two hits from the hero's basic sword, one from the Steel Sword, and worth 2 Experience, more a nuisance than a danger.
  // It leaves nothing behind.
  'cave-bat': {
    behavior: 'chaser',
    health: 2,
    size: 0.6,
    experience: 2,
    damage: 3,
    speedTilesPerSecond: 3.4,
    noticingDistance: 5,
    reach: 0.5,
    windUpMs: 350,
    recoveryMs: 700,
  },
  // The lizard of the cave charges, like the boar and the raider that charges: it notices the hero from five tiles away
  // and walks, slower than the hero, to where its lane takes in the hero. It then winds up for 0.65 s while the lane
  // lights up, dashes down the lane at thirteen tiles a second, for seven tiles at most, and rests for 1.1 s before it
  // looks for the hero again. It hits for 6 (5 after the hero's Defense) only a hero who is still in the lane: the
  // tuning pass took one off, so that a hero who never leaves the lane loses under half of its Health (docs/balance.md).
  // It takes six hits from the hero's basic sword and three from the Steel Sword, and is worth 4 Experience.
  'cave-lizard': {
    behavior: 'charger',
    health: 6,
    size: 0.8,
    experience: 4,
    damage: 6,
    speedTilesPerSecond: 2.4,
    noticingDistance: 5,
    windUpMs: 650,
    dashSpeedTilesPerSecond: 13,
    dashRange: 7,
    recoveryMs: 1100,
  },
  // The eye of the cave shoots, like the spitter and the archer, and does not move: it stands where it is placed
  // (`keepsDistance` is left out), notices the hero from six tiles away and winds up for 0.9 s with a flash on its body.
  // It then fires along the row or column that the hero stood in a projectile slower than the hero's walk that hits for 5
  // (4 after Defense) and falls eight tiles on, and rests for 1.6 s. It is frail: three hits from the basic sword, two
  // from the Steel Sword or two arrows of the short bow, and worth 3 Experience. Now and then it leaves three arrows
  // behind when it is defeated: it carries what it shoots.
  'cave-eye': {
    behavior: 'ranged',
    health: 3,
    size: 0.65,
    experience: 3,
    drops: [{ consumable: 'ammunition', chance: 0.25, amount: 3 }],
    noticingDistance: 6,
    windUpMs: 900,
    recoveryMs: 1600,
    projectile: { damage: 5, speedTilesPerSecond: 4, range: 8, size: 0.3 },
  },
  // The bear that holds the cave is the tougher creature of it: a chaser as slow as the crab and with a heavier hand than
  // the veteran of the mountain. It notices the hero from four tiles away, winds up for 0.8 s, hits for 9 (8 after the
  // hero's Defense) and rests for 1.2 s. It takes fourteen hits from the hero's basic sword and seven from the Steel
  // Sword, more than twice as many as any other creature of the cave, and is worth 6 Experience. Now and then it leaves
  // a Healing Potion behind when it is defeated.
  'cave-bear': {
    behavior: 'chaser',
    health: 14,
    size: 0.9,
    experience: 6,
    drops: [{ consumable: 'healing-potion', chance: 0.5, amount: 1 }],
    damage: 9,
    speedTilesPerSecond: 1.8,
    noticingDistance: 4,
    reach: 0.5,
    windUpMs: 800,
    recoveryMs: 1200,
  },
  // The undead of the old castle are the castle's own, the hardest creatures of the game short of its Guardian, and they
  // are tuned together with the Experience of the castle (tests/the-castle.test.ts). The skeleton is the basic one: a
  // chaser a little quicker than a raider, though still far slower than the hero. It notices the hero from four tiles
  // away, winds up for 0.45 s, hits for 6 (5 after the hero's Defense) and rests for 0.8 s before the next. It takes four
  // hits from the hero's basic sword and two from the Steel Sword, and is worth 2 Experience: there are many of them and
  // each is a short fight. It leaves nothing behind.
  'castle-skeleton': {
    behavior: 'chaser',
    health: 4,
    size: 0.75,
    experience: 2,
    damage: 6,
    speedTilesPerSecond: 2.8,
    noticingDistance: 4,
    reach: 0.5,
    windUpMs: 450,
    recoveryMs: 800,
  },
  // The ghoul charges, like the boar and the lizard of the cave: it notices the hero from five tiles away and walks,
  // slower than the hero, to where its lane takes in the hero. It then winds up for 0.7 s while the lane lights up,
  // dashes down the lane at fourteen tiles a second, for eight tiles at most, and rests for 1.3 s before it looks for the
  // hero again. It hits for 7 (6 after the hero's Defense) only a hero who is still in the lane: the tuning pass took two
  // off, so that a hero who never leaves the lane loses under half of its Health (docs/balance.md). It takes eight hits
  // from the hero's basic sword and four from the Steel Sword, and is worth 5 Experience.
  'castle-ghoul': {
    behavior: 'charger',
    health: 8,
    size: 0.85,
    experience: 5,
    damage: 7,
    speedTilesPerSecond: 2.1,
    noticingDistance: 5,
    windUpMs: 700,
    dashSpeedTilesPerSecond: 14,
    dashRange: 8,
    recoveryMs: 1300,
  },
  // The wraith shoots, like the spitter, the archer and the eye of the cave: it notices the hero from six tiles away and
  // walks to five tiles from it, backing away when the hero comes nearer, until a wall is at its back. It winds up for
  // 0.85 s with a flash on its body, then fires along the row or column that the hero stood in a projectile slower than
  // the hero's walk that hits for 6 (5 after Defense) and falls nine tiles on. It rests for 1.5 s. It is frail: four hits
  // from the basic sword, two from the Steel Sword or two arrows of the short bow, and worth 3 Experience. Now and then
  // it leaves three arrows behind when it is defeated: it carries what it shoots.
  'castle-wraith': {
    behavior: 'ranged',
    health: 4,
    size: 0.7,
    experience: 3,
    drops: [{ consumable: 'ammunition', chance: 0.25, amount: 3 }],
    noticingDistance: 6,
    windUpMs: 850,
    recoveryMs: 1500,
    projectile: { damage: 6, speedTilesPerSecond: 3.6, range: 9, size: 0.35 },
    keepsDistance: { preferredDistance: 5, speedTilesPerSecond: 2.4 },
  },
  // The knight that holds the castle is the tougher undead of it: a chaser slower even than the bear of the cave, with
  // the heaviest hand of the game. It notices the hero from four tiles away, winds up for 0.9 s, hits for 10 (9 after the
  // hero's Defense, which leaves a rested hero at the edge of its Health) and rests for 1.3 s. It takes twenty hits from
  // the hero's basic sword and ten from the Steel Sword, more than twice as many as any other undead and more than any
  // creature of the earlier areas, and is worth 7 Experience. Now and then it leaves a Healing Potion behind when it is
  // defeated.
  'castle-knight': {
    behavior: 'chaser',
    health: 20,
    size: 0.9,
    experience: 7,
    drops: [{ consumable: 'healing-potion', chance: 0.5, amount: 1 }],
    damage: 10,
    speedTilesPerSecond: 1.7,
    noticingDistance: 4,
    reach: 0.5,
    windUpMs: 900,
    recoveryMs: 1300,
  },
  // The Guardian of the castle, the last fight of the game and the only monster of its kind. It is the biggest creature
  // there is, 1.6 tiles wide where the knight is 0.9, and its width is the width of its charge. It has 100 Health, five
  // times the knight's: twenty-five hits from a hero of Level 6 who put two Stat Points in Attack and carries the Steel
  // Sword (twenty with the Katana, thirty-four from a hero of Level 4), or as many arrows of the short bow, which the
  // arrows that lie near the route cover twice over (docs/balance.md). It leaves nothing behind. It is worth 30
  // Experience, which takes a hero of Level 5 to Level 6; a hero who is at the top Level already gets none, so it is no
  // prize to wait for. It notices the hero from seven tiles away, as far as the hero's arrows fly, so that nobody shoots
  // it from where it does not see, and walks at 2.2 tiles a second, less than half the hero's pace. It attacks with
  // three patterns in turn: after each it takes the first of them that reaches the hero, starting from the one after
  // the last it made, and when none does it walks toward the hero. Each is telegraphed for as long as it winds up,
  // shows where it will land, and leaves the hero free to hit the Guardian while it rests; a hero's blow does not stop
  // a wind-up.
  //   The sweep lights up the ground within 1.4 tiles of its body, all around, when the hero is on it. It winds up for
  //   0.9 s, hits for 8 and rests for 1.1 s.
  //   The charge lights up the lane, as wide as the Guardian, that runs from it toward the hero, when the hero is in
  //   that lane within seven tiles. It winds up for 1 s, then dashes down the lane at fourteen tiles a second, for
  //   seven tiles at most or as far as the first wall, hits for 11 a hero who is still in the lane and rests for 2.2 s,
  //   long enough for the hero to walk up to it from the end of the lane.
  //   The smite lights up a square three tiles wide on the spot where the hero stands as the wind-up begins, when the
  //   hero is within five tiles of the Guardian, however it stands. It winds up for 1.1 s, hits for 7 whatever is in
  //   the square when the wind-up ends and rests for 1.4 s. That is the pattern that presses a hero who keeps away.
  // A hero of Level 6 with 14 Health, Defense 2 and the Steel Sword takes 6, 9 and 5 from them: it survives two sweeps,
  // one charge or two smites, and with the Knight Mail and the Katana, 3, 6 and 2. Stepping out of any of them takes
  // under half of its wind-up. The tuning pass kept the numbers (docs/balance.md): a hero that answers each telegraph
  // within 600 ms is not hit at all, and one that misses one in three still wins with the potions the route spares.
  'castle-guardian': {
    behavior: 'guardian',
    health: 100,
    size: 1.6,
    experience: 30,
    speedTilesPerSecond: 2.2,
    noticingDistance: 7,
    patterns: [
      { kind: 'sweep', damage: 8, windUpMs: 900, recoveryMs: 1100, reach: 1.4 },
      {
        kind: 'charge',
        damage: 11,
        windUpMs: 1000,
        recoveryMs: 2200,
        dashSpeedTilesPerSecond: 14,
        dashRange: 7,
      },
      { kind: 'smite', damage: 7, windUpMs: 1100, recoveryMs: 1400, size: 3, range: 5 },
    ],
  },
};
