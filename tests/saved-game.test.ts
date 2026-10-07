import { describe, expect, it } from 'vitest';
import { parseSave } from '../src/adapter/saved-game';
import type { MakeGame, SaveProblem } from '../src/adapter/saved-game';
import { PAGE_IDS, SNAPSHOT_VERSION } from '../src/core';
import type { Command, ContentDefinition, Game, GameOptions } from '../src/core';
import { SHOOTER } from './enemy-fixtures';
import { BITER } from './fixtures';
import { adventureAfter, adventureContent, CHAPTERS } from './saved-adventure';

const content = adventureContent();

// The saved adventure places no chaser, so the rows about a monster that chases are judged against its content with
// the rat made one (the rat is monsters[1] of the arena; as a stationary monster it only ever stands idle in the save).
const contentWithChaser: ContentDefinition = { ...content, monsterTypes: { ...content.monsterTypes, rat: BITER } };

// A second type that shoots is needed for the rows about an arrow that names the wrong one of the two: the rat of the
// arena is made one, though it is never seen to shoot.
const contentWithTwoShooters: ContentDefinition = { ...content, monsterTypes: { ...content.monsterTypes, rat: SHOOTER } };

/** What the save slot holds for a game that has played the saved adventure up to the end of the chapter with that id. */
function textAfter(chapter: string): string {
  return JSON.stringify(adventureAfter(chapter).snapshot());
}

// What the save slot holds is untrusted: it may have any shape, and the tests below damage it freely.
type Saved = any;

interface BadSave {
  /** What is wrong with the save, as the name of the test finishes "is <problem> when ...". */
  readonly fault: string;
  /** The chapter of the saved adventure the save is taken after. It is the volley unless said. */
  readonly after?: string;
  readonly damage: (saved: Saved) => void;
  readonly problem: SaveProblem;
  /** What the detail names: the place in the save where the fault is. */
  readonly names: string;
  /** The content the save is judged against. It is the content of the saved adventure unless said. */
  readonly judgedBy?: ContentDefinition;
}

function expectUnusable(bad: BadSave): void {
  const saved: Saved = JSON.parse(textAfter(bad.after ?? 'volley'));
  bad.damage(saved);

  const parsed = parseSave(JSON.stringify(saved), bad.judgedBy ?? content);

  expect(parsed).toMatchObject({
    status: 'unusable',
    problem: bad.problem,
    detail: expect.stringContaining(bad.names),
  });
}

/** A change to the saved adventure that leaves a save the game can continue from, with what it holds as it is. */
function expectUsable(change: (saved: Saved) => void, judgedBy: ContentDefinition = content): void {
  const saved: Saved = JSON.parse(textAfter('volley'));
  change(saved);

  expect(parseSave(JSON.stringify(saved), judgedBy)).toEqual({ status: 'usable', snapshot: saved });
}

describe('the text in the save slot', () => {
  it('is no save when nothing was ever stored', () => {
    expect(parseSave(null, content)).toEqual({ status: 'none' });
  });

  describe.each(CHAPTERS)('after the chapter "$id"', ({ id }) => {
    it('is a save the game can continue from, exactly as it was saved', () => {
      const saved = adventureAfter(id).snapshot();

      expect(parseSave(JSON.stringify(saved), content)).toEqual({ status: 'usable', snapshot: saved });
    });
  });
});

describe('a text that is not a save', () => {
  it.each([
    ['is not JSON', 'the island at dusk'],
    ['is empty', ''],
    ['was cut short', textAfter('camp').slice(0, 200)],
    ['is JSON of null', 'null'],
    ['is JSON of a number', '42'],
    ['is JSON of a list', '[]'],
    ['is an empty object', '{}'],
    ['has no state', JSON.stringify({ version: SNAPSHOT_VERSION })],
    ['has a version that is not a number', JSON.stringify({ version: '1', state: {} })],
  ])('is damaged when it %s', (_, text) => {
    expect(parseSave(text, content)).toMatchObject({ status: 'unusable', problem: 'damaged' });
  });

  it('is damaged when a number in it is too big to be one, as 1e999 is', () => {
    const saved: Saved = JSON.parse(textAfter('volley'));
    saved.state.hero.position.x = 'a number too big';
    const text = JSON.stringify(saved).replace('"a number too big"', '1e999');

    expect(JSON.parse(text).state.hero.position.x).toBe(Infinity);
    expect(parseSave(text, content)).toMatchObject({
      status: 'unusable',
      problem: 'damaged',
      detail: expect.stringContaining('state.hero.position.x should be a number'),
    });
  });

  it.each([
    ['the island at dusk', 'is not JSON'],
    ['{}', 'version should be a number'],
    ['[]', 'The save should be an object'],
  ])('says what was wrong with %j, for whoever reads the console', (text, said) => {
    expect(parseSave(text, content)).toMatchObject({ status: 'unusable', detail: expect.stringContaining(said) });
  });
});

describe('a save of another version of the game', () => {
  it.each([0, 2, 99, -1])('is incompatible when it is version %i, whatever else it holds', (version) => {
    const text = JSON.stringify({ ...JSON.parse(textAfter('camp')), version });

    expect(parseSave(text, content)).toMatchObject({
      status: 'unusable',
      problem: 'incompatible',
      detail: expect.stringContaining('version'),
    });
  });

  it('is incompatible, not damaged, though its state has a shape this game does not know', () => {
    const text = JSON.stringify({ version: SNAPSHOT_VERSION + 1, state: { phase: 'exploring', doors: [] } });

    expect(parseSave(text, content)).toMatchObject({ status: 'unusable', problem: 'incompatible' });
  });
});

describe('a save that does not fit the Adventure Areas of this game', () => {
  it.each<BadSave>([
    {
      fault: 'the hero is in an area the game does not have',
      damage: (saved) => (saved.state.areaId = 'nowhere'),
      problem: 'incompatible',
      names: 'state.areaId',
    },
    {
      fault: 'the hero is in an area that is not a name',
      damage: (saved) => (saved.state.areaId = 5),
      problem: 'damaged',
      names: 'state.areaId',
    },
    {
      fault: 'an area of the game has no world in it',
      damage: (saved) => delete saved.state.areas['ruins'],
      problem: 'incompatible',
      names: 'state.areas.ruins',
    },
    {
      fault: 'it holds the world of an area the game does not have',
      damage: (saved) => (saved.state.areas['ghost'] = structuredClone(saved.state.areas['ruins'])),
      problem: 'incompatible',
      names: 'state.areas.ghost',
    },
    {
      fault: 'the worlds are not an object',
      damage: (saved) => (saved.state.areas = []),
      problem: 'damaged',
      names: 'state.areas',
    },
    {
      fault: 'a world has something the game does not keep in one',
      damage: (saved) => (saved.state.areas['ruins'].treasure = 1),
      problem: 'damaged',
      names: 'state.areas.ruins.treasure',
    },
    {
      fault: 'a world lacks whether the hero has been in the area',
      damage: (saved) => delete saved.state.areas['ruins'].visited,
      problem: 'damaged',
      names: 'state.areas.ruins.visited',
    },
    {
      fault: 'whether the hero has been in the area is not yes or no',
      damage: (saved) => (saved.state.areas['arena'].visited = 'yes'),
      problem: 'damaged',
      names: 'state.areas.arena.visited',
    },
  ])('is $problem when $fault', expectUnusable);
});

describe('a save that does not fit the monsters of this game', () => {
  it.each<BadSave>([
    {
      fault: 'a monster is of a type the game does not have',
      damage: (saved) => (saved.state.areas['ruins'].monsters[0].type = 'ogre'),
      problem: 'incompatible',
      names: 'state.areas.ruins.monsters[0].type is "ogre", which is not a monster type of this game',
    },
    {
      fault: 'a monster is of another type than the area places there',
      damage: (saved) => (saved.state.areas['ruins'].monsters[0].type = 'shooter'),
      problem: 'incompatible',
      names: 'state.areas.ruins.monsters[0].type',
    },
    {
      fault: 'a monster is not one the area places',
      damage: (saved) => (saved.state.areas['ruins'].monsters[1].id = 'dragon'),
      problem: 'incompatible',
      names: 'state.areas.ruins.monsters[1].id',
    },
    {
      fault: 'a monster of the area is missing',
      damage: (saved) => saved.state.areas['ruins'].monsters.pop(),
      problem: 'incompatible',
      names: 'state.areas.ruins.monsters',
    },
    {
      fault: 'a monster is in a place outside its area',
      damage: (saved) => (saved.state.areas['ruins'].monsters[0].position = { x: 99.5, y: 3.5 }),
      problem: 'incompatible',
      names: 'state.areas.ruins.monsters[0].position',
    },
    {
      fault: 'a monster has a place that has no height',
      damage: (saved) => delete saved.state.areas['ruins'].monsters[0].position.y,
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[0].position',
    },
    {
      fault: 'a monster has Health that is not a number',
      damage: (saved) => (saved.state.areas['arena'].monsters[0].health = '3'),
      problem: 'damaged',
      names: 'state.areas.arena.monsters[0].health',
    },
    {
      fault: 'a monster has Health below 0',
      damage: (saved) => (saved.state.areas['arena'].monsters[0].health = -1),
      problem: 'damaged',
      names: 'state.areas.arena.monsters[0].health',
    },
  ])('is $problem when $fault', expectUnusable);
});

describe('a save that does not fit the interactables, milestones and Automap of this game', () => {
  it.each<BadSave>([
    {
      fault: 'a pickup is kept as if it were a chest',
      damage: (saved) => (saved.state.areas['arena'].interactables['potion-near'] = { kind: 'chest', opened: false }),
      problem: 'incompatible',
      names: 'state.areas.arena.interactables.potion-near',
    },
    {
      fault: 'a chest is kept as if it were a pickup',
      damage: (saved) =>
        (saved.state.areas['arena'].interactables['armor-chest'] = { kind: 'pickup', collected: false }),
      problem: 'incompatible',
      names: 'state.areas.arena.interactables.armor-chest',
    },
    {
      fault: 'it keeps an interactable the area does not place',
      damage: (saved) => (saved.state.areas['arena'].interactables['ghost'] = { kind: 'chest', opened: false }),
      problem: 'incompatible',
      names: 'state.areas.arena.interactables.ghost',
    },
    {
      fault: 'it keeps nothing of an interactable the area places',
      damage: (saved) => delete saved.state.areas['arena'].interactables['armor-chest'],
      problem: 'incompatible',
      names: 'state.areas.arena.interactables.armor-chest',
    },
    {
      fault: 'a chest is neither opened nor not opened',
      damage: (saved) => (saved.state.areas['arena'].interactables['armor-chest'].opened = 'yes'),
      problem: 'damaged',
      names: 'state.areas.arena.interactables.armor-chest.opened',
    },
    {
      fault: 'a pickup is neither collected nor not collected',
      damage: (saved) => delete saved.state.areas['arena'].interactables['potion-near'].collected,
      problem: 'damaged',
      names: 'state.areas.arena.interactables.potion-near.collected',
    },
    {
      fault: 'an interactable is of a kind the game does not know',
      damage: (saved) => (saved.state.areas['arena'].interactables['armor-chest'] = { kind: 'door', open: false }),
      problem: 'damaged',
      names: 'state.areas.arena.interactables.armor-chest.kind',
    },
    {
      fault: 'a milestone is reached that the area does not place',
      damage: (saved) => saved.state.areas['arena'].reachedMilestones.push('treasure'),
      problem: 'incompatible',
      names: 'state.areas.arena.reachedMilestones[1]',
    },
    {
      fault: 'a milestone is reached twice',
      damage: (saved) => saved.state.areas['arena'].reachedMilestones.push('lookout'),
      problem: 'damaged',
      names: 'state.areas.arena.reachedMilestones[1]',
    },
    {
      fault: 'the milestones reached are not a list',
      damage: (saved) => (saved.state.areas['arena'].reachedMilestones = 'lookout'),
      problem: 'damaged',
      names: 'state.areas.arena.reachedMilestones',
    },
    {
      fault: 'the Automap has fewer rows than the area has',
      damage: (saved) => saved.state.areas['arena'].revealed.pop(),
      problem: 'incompatible',
      names: 'state.areas.arena.revealed',
    },
    {
      fault: 'the Automap has a row shorter than the area is wide',
      damage: (saved) => saved.state.areas['ruins'].revealed[0].pop(),
      problem: 'incompatible',
      names: 'state.areas.ruins.revealed[0]',
    },
    {
      fault: 'the Automap has a tile that is neither revealed nor hidden',
      damage: (saved) => (saved.state.areas['arena'].revealed[1][1] = 1),
      problem: 'damaged',
      names: 'state.areas.arena.revealed[1][1]',
    },
    {
      fault: 'the Automap is not a grid',
      damage: (saved) => (saved.state.areas['arena'].revealed = 'everything'),
      problem: 'damaged',
      names: 'state.areas.arena.revealed',
    },
  ])('is $problem when $fault', expectUnusable);
});

const STATE_FIELDS = ['phase', 'areaId', 'checkpoint', 'areaText', 'hero', 'arrows', 'page', 'areas'];

describe('a save whose state is not the one this game keeps', () => {
  it.each<BadSave>([
    {
      fault: 'the game is not being played',
      damage: (saved) => (saved.state.phase = 'title'),
      problem: 'damaged',
      names: 'state.phase',
    },
    {
      fault: 'the state keeps something this game does not',
      damage: (saved) => (saved.state.weather = 'rain'),
      problem: 'damaged',
      names: 'state.weather',
    },
    ...STATE_FIELDS.map(
      (field): BadSave => ({
        fault: `the state keeps no ${field}`,
        damage: (saved) => delete saved.state[field],
        problem: 'damaged',
        names: `state.${field}`,
      }),
    ),
  ])('is $problem when $fault', expectUnusable);
});

describe('a save whose hero this game could not have made', () => {
  it.each<BadSave>([
    {
      fault: 'the hero is in a place outside its area',
      damage: (saved) => (saved.state.hero.position = { x: -1, y: 2 }),
      problem: 'incompatible',
      names: 'state.hero.position',
    },
    {
      fault: 'the hero is in a place above its area',
      damage: (saved) => (saved.state.hero.position = { x: 2, y: -0.5 }),
      problem: 'incompatible',
      names: 'state.hero.position',
    },
    {
      fault: 'the hero is in a place right of its area',
      damage: (saved) => (saved.state.hero.position = { x: 14.5, y: 2 }),
      problem: 'incompatible',
      names: 'state.hero.position',
    },
    {
      fault: 'the hero is in a place below its area',
      damage: (saved) => (saved.state.hero.position = { x: 2, y: 7.5 }),
      problem: 'incompatible',
      names: 'state.hero.position',
    },
    {
      fault: 'the hero is in a place that is not a number',
      damage: (saved) => (saved.state.hero.position.x = '2.5'),
      problem: 'damaged',
      names: 'state.hero.position.x',
    },
    {
      fault: 'the hero faces a way the game does not have',
      damage: (saved) => (saved.state.hero.facing = 'sideways'),
      problem: 'damaged',
      names: 'state.hero.facing',
    },
    {
      fault: 'the hero has Health that is not a number',
      damage: (saved) => (saved.state.hero.health = '8'),
      problem: 'damaged',
      names: 'state.hero.health',
    },
    {
      fault: 'the hero has no Health left',
      damage: (saved) => (saved.state.hero.health = 0),
      problem: 'damaged',
      names: 'state.hero.health',
    },
    {
      fault: 'the hero has to wait a fraction of a step before it can attack again',
      damage: (saved) => (saved.state.hero.attackCooldown = 1.5),
      problem: 'damaged',
      names: 'state.hero.attackCooldown',
    },
    {
      fault: 'the hero has to wait a text of steps before it can attack again',
      damage: (saved) => (saved.state.hero.attackCooldown = '3'),
      problem: 'damaged',
      names: 'state.hero.attackCooldown should be a number',
    },
    {
      fault: 'the hero has to wait less than no step before it can attack again',
      damage: (saved) => (saved.state.hero.attackCooldown = -1),
      problem: 'damaged',
      names: 'state.hero.attackCooldown',
    },
    {
      fault: 'the hero has Experience below 0',
      damage: (saved) => (saved.state.hero.experience = -5),
      problem: 'damaged',
      names: 'state.hero.experience',
    },
    {
      fault: 'the hero has Experience that is not a number',
      damage: (saved) => (saved.state.hero.experience = '10'),
      problem: 'damaged',
      names: 'state.hero.experience',
    },
    {
      fault: 'the hero has no Stat Points for Defense listed',
      damage: (saved) => delete saved.state.hero.statPoints.defense,
      problem: 'damaged',
      names: 'state.hero.statPoints.defense',
    },
    {
      fault: 'the hero has Stat Points for a stat the game does not have',
      damage: (saved) => (saved.state.hero.statPoints.luck = 1),
      problem: 'damaged',
      names: 'state.hero.statPoints.luck',
    },
    {
      fault: 'the hero has less than 0 Stat Points in Attack',
      damage: (saved) => (saved.state.hero.statPoints.attack = -1),
      problem: 'damaged',
      names: 'state.hero.statPoints.attack',
    },
    {
      fault: 'the hero has a fraction of a Stat Point in Attack',
      damage: (saved) => (saved.state.hero.statPoints.attack = 0.5),
      problem: 'damaged',
      names: 'state.hero.statPoints.attack',
    },
    {
      fault: 'the hero has no count of Healing Potions',
      damage: (saved) => delete saved.state.hero.consumables['healing-potion'],
      problem: 'damaged',
      names: 'state.hero.consumables.healing-potion',
    },
    {
      fault: 'the hero has a count of something that is not a consumable',
      damage: (saved) => (saved.state.hero.consumables['arrows'] = 1),
      problem: 'damaged',
      names: 'state.hero.consumables.arrows',
    },
    {
      fault: 'the hero has less than 0 Ammunition',
      damage: (saved) => (saved.state.hero.consumables.ammunition = -1),
      problem: 'damaged',
      names: 'state.hero.consumables.ammunition',
    },
    {
      fault: 'the hero has a fraction of Ammunition',
      damage: (saved) => (saved.state.hero.consumables.ammunition = 2.5),
      problem: 'damaged',
      names: 'state.hero.consumables.ammunition',
    },
  ])('is $problem when $fault', expectUnusable);
});

describe('a save whose hero carries and equips Gear that this game could not have given it', () => {
  it.each<BadSave>([
    {
      fault: 'the hero carries Gear the game does not have',
      damage: (saved) => saved.state.hero.gear.push('excalibur'),
      problem: 'incompatible',
      names: 'state.hero.gear[5]',
    },
    {
      fault: 'the hero carries Gear that is not a name',
      damage: (saved) => saved.state.hero.gear.push(5),
      problem: 'damaged',
      names: 'state.hero.gear[5]',
    },
    {
      fault: 'the hero carries the same Gear twice',
      damage: (saved) => saved.state.hero.gear.push('basic-sword'),
      problem: 'damaged',
      names: 'state.hero.gear[5]',
    },
    {
      fault: 'the Gear the hero carries is not a list',
      damage: (saved) => (saved.state.hero.gear = 'basic-sword'),
      problem: 'damaged',
      names: 'state.hero.gear',
    },
    {
      fault: 'the hero has Gear equipped in a slot the game does not have',
      damage: (saved) => (saved.state.hero.equipped['helmet'] = 'basic-armor'),
      problem: 'damaged',
      names: 'state.hero.equipped.helmet',
    },
    {
      fault: 'the hero has Gear equipped that it does not carry',
      damage: (saved) => (saved.state.hero.gear = saved.state.hero.gear.filter((id: string) => id !== 'iron-sword')),
      problem: 'damaged',
      names: 'state.hero.equipped.melee-weapon',
    },
    {
      fault: 'the hero has Gear equipped in a slot it does not fit',
      damage: (saved) => (saved.state.hero.equipped['melee-weapon'] = 'leather-armor'),
      problem: 'incompatible',
      names: 'state.hero.equipped.melee-weapon',
    },
    {
      fault: 'the hero has an Active Weapon that is not a weapon slot',
      damage: (saved) => (saved.state.hero.activeWeapon = 'armor'),
      problem: 'damaged',
      names: 'state.hero.activeWeapon',
    },
    {
      fault: 'the hero has the Ranged Weapon active but has none equipped',
      damage: (saved) => delete saved.state.hero.equipped['ranged-weapon'],
      problem: 'damaged',
      names: 'state.hero.activeWeapon',
    },
  ])('is $problem when $fault', expectUnusable);
});

describe('a save whose Checkpoint this game could not have made', () => {
  it.each<BadSave>([
    {
      fault: 'the Checkpoint is in an area the game does not have',
      damage: (saved) => (saved.state.checkpoint.areaId = 'nowhere'),
      problem: 'incompatible',
      names: 'state.checkpoint.areaId',
    },
    {
      fault: 'the Checkpoint is on a tile outside its area',
      damage: (saved) => (saved.state.checkpoint.tile = { col: 99, row: 3 }),
      problem: 'incompatible',
      names: 'state.checkpoint.tile',
    },
    {
      fault: 'the Checkpoint is on the column right of its area',
      damage: (saved) => (saved.state.checkpoint.tile = { col: 14, row: 3 }),
      problem: 'incompatible',
      names: 'state.checkpoint.tile',
    },
    {
      fault: 'the Checkpoint is on the row below its area',
      damage: (saved) => (saved.state.checkpoint.tile = { col: 3, row: 7 }),
      problem: 'incompatible',
      names: 'state.checkpoint.tile',
    },
    {
      fault: 'the Checkpoint is on a fraction of a tile',
      damage: (saved) => (saved.state.checkpoint.tile.col = 3.5),
      problem: 'damaged',
      names: 'state.checkpoint.tile.col',
    },
    {
      fault: 'the Checkpoint is on a tile that has no row',
      damage: (saved) => delete saved.state.checkpoint.tile.row,
      problem: 'damaged',
      names: 'state.checkpoint.tile.row',
    },
    {
      fault: 'the Checkpoint remembers no count of Healing Potions',
      damage: (saved) => delete saved.state.checkpoint.consumables['healing-potion'],
      problem: 'damaged',
      names: 'state.checkpoint.consumables.healing-potion',
    },
    {
      fault: 'the Checkpoint remembers less than 0 Ammunition',
      damage: (saved) => (saved.state.checkpoint.consumables.ammunition = -1),
      problem: 'damaged',
      names: 'state.checkpoint.consumables.ammunition',
    },
    {
      fault: 'the Checkpoint remembers something taken that no area places',
      damage: (saved) => saved.state.checkpoint.collected.push('ghost'),
      problem: 'incompatible',
      names: 'state.checkpoint.collected[2]',
    },
    {
      fault: 'the Checkpoint remembers the same thing taken twice',
      damage: (saved) => saved.state.checkpoint.collected.push('arrow-cache'),
      problem: 'damaged',
      names: 'state.checkpoint.collected[2]',
    },
    {
      fault: 'what the Checkpoint remembers taken is not a list',
      damage: (saved) => (saved.state.checkpoint.collected = 'arrow-cache'),
      problem: 'damaged',
      names: 'state.checkpoint.collected',
    },
  ])('is $problem when $fault', expectUnusable);
});

describe('a save whose Area Text or Page this game could not have made', () => {
  it.each<BadSave>([
    {
      fault: 'the Area Text is a bare text',
      damage: (saved) => (saved.state.areaText = 'Broken walls rise from the sand.'),
      problem: 'damaged',
      names: 'state.areaText',
    },
    {
      fault: 'the Area Text is not a text',
      damage: (saved) => (saved.state.areaText.text = 5),
      problem: 'damaged',
      names: 'state.areaText.text',
    },
    {
      fault: 'the Area Text has a fraction of a step left',
      damage: (saved) => (saved.state.areaText.stepsLeft = 2.5),
      problem: 'damaged',
      names: 'state.areaText.stepsLeft',
    },
    {
      fault: 'the Area Text has less than 0 steps left',
      damage: (saved) => (saved.state.areaText.stepsLeft = -1),
      problem: 'damaged',
      names: 'state.areaText.stepsLeft',
    },
    {
      fault: 'the Area Text has something the game does not keep with it',
      damage: (saved) => (saved.state.areaText.speaker = 'old sailor'),
      problem: 'damaged',
      names: 'state.areaText.speaker',
    },
    {
      fault: 'the open Page is one the game does not have',
      damage: (saved) => (saved.state.page = 'map'),
      problem: 'damaged',
      names: 'state.page',
    },
    {
      fault: 'the open Page is not a text',
      damage: (saved) => (saved.state.page = 5),
      problem: 'damaged',
      names: 'state.page',
    },
  ])('is $problem when $fault', expectUnusable);
});

describe('a save whose arrows in flight this game could not have made', () => {
  it.each<BadSave>([
    {
      fault: 'an arrow is in an area the game does not have',
      damage: (saved) => (saved.state.arrows[0].areaId = 'nowhere'),
      problem: 'incompatible',
      names: 'state.arrows[0].areaId',
    },
    {
      fault: 'an arrow is in a place that is not a number',
      damage: (saved) => (saved.state.arrows[0].position.y = null),
      problem: 'damaged',
      names: 'state.arrows[0].position.y',
    },
    {
      fault: 'an arrow flies a way the game does not have',
      damage: (saved) => (saved.state.arrows[0].direction = 'sideways'),
      problem: 'damaged',
      names: 'state.arrows[0].direction',
    },
    {
      fault: 'an arrow can fly less than 0 tiles more',
      damage: (saved) => (saved.state.arrows[0].rangeLeft = -1),
      problem: 'damaged',
      names: 'state.arrows[0].rangeLeft',
    },
    {
      fault: 'an arrow keeps something the game does not keep with it',
      damage: (saved) => (saved.state.arrows[0].damage = 3),
      problem: 'damaged',
      names: 'state.arrows[0].damage',
    },
    {
      fault: 'the arrows in flight are not a list',
      damage: (saved) => (saved.state.arrows = {}),
      problem: 'damaged',
      names: 'state.arrows',
    },
    {
      fault: 'an arrow is not an object',
      damage: (saved) => saved.state.arrows.push(7),
      problem: 'damaged',
      names: 'state.arrows[2]',
    },
    {
      fault: 'the shooter of an arrow is not an object',
      damage: (saved) => (saved.state.arrows[1].shotBy = 'shooter'),
      problem: 'damaged',
      names: 'state.arrows[1].shotBy',
    },
    {
      fault: 'the shooter of an arrow has no type',
      damage: (saved) => delete saved.state.arrows[1].shotBy.monsterType,
      problem: 'damaged',
      names: 'state.arrows[1].shotBy.monsterType',
    },
    {
      fault: 'the shooter of an arrow has something the game does not keep with it',
      damage: (saved) => (saved.state.arrows[1].shotBy.team = 'ruins'),
      problem: 'damaged',
      names: 'state.arrows[1].shotBy.team',
    },
    {
      fault: 'an arrow was shot by a monster that no area places',
      damage: (saved) => (saved.state.arrows[1].shotBy.monsterId = 'dragon'),
      problem: 'incompatible',
      names: 'state.arrows[1].shotBy.monsterId',
    },
    {
      fault: 'an arrow was shot by a monster of a type the game does not have',
      damage: (saved) => (saved.state.arrows[1].shotBy.monsterType = 'ogre'),
      problem: 'incompatible',
      names: 'state.arrows[1].shotBy.monsterType is "ogre", which is not a monster type of this game',
    },
    {
      fault: 'an arrow was shot by a monster of another type than the area places',
      damage: (saved) => (saved.state.arrows[1].shotBy.monsterType = 'rat'),
      problem: 'incompatible',
      names: 'state.arrows[1].shotBy.monsterType',
    },
    {
      fault: 'an arrow was shot by a monster of a type that shoots, but not the one the area places',
      damage: (saved) => (saved.state.arrows[1].shotBy.monsterType = 'rat'),
      judgedBy: contentWithTwoShooters,
      problem: 'incompatible',
      names: 'state.arrows[1].shotBy.monsterType is "rat", but the area places "shooter" as a "shooter"',
    },
    {
      fault: 'an arrow was shot by a monster that shoots nothing',
      damage: (saved) => (saved.state.arrows[1].shotBy = { monsterId: 'charger', monsterType: 'charger' }),
      problem: 'incompatible',
      names: 'state.arrows[1].shotBy.monsterType',
    },
  ])('is $problem when $fault', expectUnusable);
});

describe('a save whose monsters do what this game could not have them do', () => {
  it.each<BadSave>([
    {
      fault: 'a monster does something the game does not know',
      damage: (saved) => (saved.state.areas['ruins'].monsters[0].action = { type: 'sleeping' }),
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[0].action.type',
    },
    {
      fault: 'a monster has an action that is not an object',
      damage: (saved) => (saved.state.areas['ruins'].monsters[0].action = 'idle'),
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[0].action',
    },
    {
      fault: 'a monster that stays where it is chases the hero',
      damage: (saved) => (saved.state.areas['arena'].monsters[0].action = { type: 'chasing' }),
      problem: 'incompatible',
      names: 'state.areas.arena.monsters[0].action',
    },
    {
      fault: 'a monster that stays where it is winds up to hit',
      damage: (saved) =>
        (saved.state.areas['arena'].monsters[0].action = {
          type: 'winding-up',
          zone: { minX: 5, minY: 5, maxX: 7, maxY: 6 },
          elapsed: 2,
          length: 30,
        }),
      problem: 'incompatible',
      names: 'state.areas.arena.monsters[0].action',
    },
    {
      fault: 'a monster that stays where it is dashes',
      damage: (saved) =>
        (saved.state.areas['arena'].monsters[0].action = { type: 'dashing', direction: 'up', rangeLeft: 1 }),
      problem: 'incompatible',
      names: 'state.areas.arena.monsters[0].action',
    },
    {
      fault: 'a monster that stays where it is rests after a hit',
      damage: (saved) => (saved.state.areas['arena'].monsters[0].action = { type: 'recovering', stepsLeft: 12 }),
      problem: 'incompatible',
      names: 'state.areas.arena.monsters[0].action',
    },
    {
      fault: 'a monster that chases the hero dashes',
      damage: (saved) =>
        (saved.state.areas['arena'].monsters[1].action = { type: 'dashing', direction: 'up', rangeLeft: 1 }),
      judgedBy: contentWithChaser,
      problem: 'incompatible',
      names: 'state.areas.arena.monsters[1].action',
    },
    {
      fault: 'a monster that shoots dashes',
      damage: (saved) =>
        (saved.state.areas['ruins'].monsters[1].action = { type: 'dashing', direction: 'up', rangeLeft: 1 }),
      problem: 'incompatible',
      names: 'state.areas.ruins.monsters[1].action',
    },
    {
      fault: 'a monster that is idle keeps something with it',
      damage: (saved) => (saved.state.areas['arena'].monsters[0].action = { type: 'idle', since: 3 }),
      problem: 'damaged',
      names: 'state.areas.arena.monsters[0].action.since',
    },
    {
      fault: 'a monster that is chasing keeps something with it',
      damage: (saved) => (saved.state.areas['arena'].monsters[1].action = { type: 'chasing', target: 'hero' }),
      judgedBy: contentWithChaser,
      problem: 'damaged',
      names: 'state.areas.arena.monsters[1].action.target',
    },
    {
      fault: 'a dashing monster has no direction',
      damage: (saved) => delete saved.state.areas['ruins'].monsters[0].action.direction,
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[0].action.direction',
    },
    {
      fault: 'a dashing monster has a direction the game does not have',
      damage: (saved) => (saved.state.areas['ruins'].monsters[0].action.direction = 'sideways'),
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[0].action.direction',
    },
    {
      fault: 'a dashing monster can dash less than 0 tiles more',
      damage: (saved) => (saved.state.areas['ruins'].monsters[0].action.rangeLeft = -1),
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[0].action.rangeLeft',
    },
    {
      fault: 'a resting monster has a fraction of a step left',
      damage: (saved) => (saved.state.areas['ruins'].monsters[1].action.stepsLeft = 1.5),
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[1].action.stepsLeft',
    },
    {
      fault: 'a resting monster has no count of steps left',
      damage: (saved) => delete saved.state.areas['ruins'].monsters[1].action.stepsLeft,
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[1].action.stepsLeft',
    },
    {
      fault: 'a monster winds up on no zone',
      after: 'wind-up',
      damage: (saved) => delete saved.state.areas['ruins'].monsters[0].action.zone,
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[0].action.zone',
    },
    {
      fault: 'a monster winds up on a zone with a corner that is not a number',
      after: 'wind-up',
      damage: (saved) => (saved.state.areas['ruins'].monsters[0].action.zone.maxX = null),
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[0].action.zone.maxX',
    },
    {
      fault: 'a monster winds up on a zone with a corner missing',
      after: 'wind-up',
      damage: (saved) => delete saved.state.areas['ruins'].monsters[1].action.zone.minY,
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[1].action.zone.minY',
    },
    {
      fault: 'a monster has wound up for a fraction of a step',
      after: 'wind-up',
      damage: (saved) => (saved.state.areas['ruins'].monsters[1].action.elapsed = 0.5),
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[1].action.elapsed',
    },
    {
      fault: 'a monster winds up for less than 0 steps',
      after: 'wind-up',
      damage: (saved) => (saved.state.areas['ruins'].monsters[1].action.length = -1),
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[1].action.length',
    },
    {
      fault: 'a charger winds up with no direction to dash in',
      after: 'wind-up',
      damage: (saved) => delete saved.state.areas['ruins'].monsters[0].action.direction,
      problem: 'incompatible',
      names: 'state.areas.ruins.monsters[0].action.direction',
    },
    {
      fault: 'a charger winds up to dash in a direction the game does not have',
      after: 'wind-up',
      damage: (saved) => (saved.state.areas['ruins'].monsters[0].action.direction = 'sideways'),
      problem: 'damaged',
      names: 'state.areas.ruins.monsters[0].action.direction',
    },
    {
      fault: 'a monster that shoots winds up to dash',
      after: 'wind-up',
      damage: (saved) => (saved.state.areas['ruins'].monsters[1].action.direction = 'up'),
      problem: 'incompatible',
      names: 'state.areas.ruins.monsters[1].action.direction',
    },
    {
      fault: 'a monster that chases the hero winds up to dash',
      damage: (saved) =>
        (saved.state.areas['arena'].monsters[1].action = {
          type: 'winding-up',
          zone: { minX: 3, minY: 4, maxX: 4, maxY: 5 },
          elapsed: 2,
          length: 30,
          direction: 'up',
        }),
      judgedBy: contentWithChaser,
      problem: 'incompatible',
      names: 'state.areas.arena.monsters[1].action.direction',
    },
  ])('is $problem when $fault', expectUnusable);
});

describe('a save that holds what the saved adventure does not show', () => {
  it('is usable when no Area Text is shown', () => {
    expectUsable((saved) => (saved.state.areaText = null));
  });

  it.each([
    ['the first tile', { col: 0, row: 0 }],
    ['the last tile', { col: 13, row: 6 }],
  ])('is usable when the Checkpoint is on %s of its area', (_, tile) => {
    expectUsable((saved) => (saved.state.checkpoint.tile = tile));
  });

  it.each([
    ['the top left', { x: 0, y: 0 }],
    ['the bottom right', { x: 14, y: 7 }],
  ])('is usable when the hero is at the very corner of its area, in %s', (_, position) => {
    expectUsable((saved) => (saved.state.hero.position = position));
  });

  it.each(PAGE_IDS)('is usable when the %s Page is open', (page) => {
    expectUsable((saved) => (saved.state.page = page));
  });

  it.each([
    ['a charger', 'ruins', 0],
    ['a monster that shoots', 'ruins', 1],
  ])('is usable when %s is chasing the hero', (_, area, index) => {
    expectUsable((saved) => (saved.state.areas[area].monsters[index].action = { type: 'chasing' }));
  });

  describe('with a monster that chases the hero', () => {
    it.each<[string, object]>([
      ['is chasing the hero', { type: 'chasing' }],
      [
        'winds up to hit',
        { type: 'winding-up', zone: { minX: 3, minY: 4, maxX: 4, maxY: 5 }, elapsed: 2, length: 30 },
      ],
      ['rests after a hit', { type: 'recovering', stepsLeft: 12 }],
    ])('is usable when it %s', (_, action) => {
      expectUsable((saved) => (saved.state.areas['arena'].monsters[1].action = action), contentWithChaser);
    });
  });
});

describe('a save with the shape of a saved game that the game cannot go on from', () => {
  const text = textAfter('volley');

  /** A stand-in for the game the save is tried on. It takes anything and shows the title, unless a part is replaced. */
  function standIn(parts: Partial<Game> = {}, sent: Command[] = []): MakeGame {
    return () => ({
      send: (command) => {
        sent.push(command);
        return [];
      },
      step: () => [],
      view: () => ({ phase: 'title' }),
      snapshot: () => {
        throw new Error('There is nothing to save at the title');
      },
      ...parts,
    });
  }

  it.each<[string, Partial<Game>, string]>([
    [
      'takes it',
      {
        send: () => {
          throw new Error('The state has no world for area "ruins"');
        },
      },
      'The state has no world for area "ruins"',
    ],
    [
      'shows it',
      {
        view: () => {
          throw new Error('Cannot read properties of undefined');
        },
      },
      'Cannot read properties of undefined',
    ],
    [
      'takes its first step',
      {
        step: () => {
          throw new Error('Charger "charger" wound up with no direction to dash in');
        },
      },
      'Charger "charger" wound up with no direction to dash in',
    ],
    [
      'takes its first step, throwing a text and not an Error',
      {
        step: () => {
          throw 'out of steps';
        },
      },
      'out of steps',
    ],
  ])('is damaged when the game throws as it %s', (_, parts, said) => {
    expect(parseSave(text, content, standIn(parts))).toMatchObject({
      status: 'unusable',
      problem: 'damaged',
      detail: expect.stringContaining(said),
    });
  });

  it('is tried on a game made from the content, which is sent the save and nothing else', () => {
    const sent: Command[] = [];
    const made: GameOptions[] = [];
    const makeGame: MakeGame = (options) => {
      made.push(options);
      return standIn({}, sent)(options);
    };

    const parsed = parseSave(text, content, makeGame);

    expect(parsed).toEqual({ status: 'usable', snapshot: JSON.parse(text) });
    expect(made.map((options) => options.content)).toEqual([content]);
    expect(sent).toEqual([{ type: 'continue', snapshot: JSON.parse(text) }]);
  });

  it('is tried on a game that plays out the same way every time', () => {
    const made: GameOptions[] = [];

    parseSave(text, content, (options) => {
      made.push(options);
      return standIn()(options);
    });

    expect(made).toHaveLength(1);
    expect(made[0]?.random()).toBe(made[0]?.random());
  });

  it.each<[string, string | null]>([
    ['there is no save', null],
    ['the text is not JSON', 'the island at dusk'],
    ['the save is of another version', JSON.stringify({ version: 2, state: {} })],
    ['the shape of the save is wrong', JSON.stringify({ version: SNAPSHOT_VERSION, state: {} })],
  ])('is not tried at all when %s', (_, slot) => {
    const made: GameOptions[] = [];

    parseSave(slot, content, (options) => {
      made.push(options);
      return standIn()(options);
    });

    expect(made).toEqual([]);
  });
});

describe('a failure of the checks themselves', () => {
  it('is not passed off as a verdict on the save', () => {
    const broken: ContentDefinition = {
      ...content,
      get areas(): never {
        throw new Error('the areas are gone');
      },
    };

    expect(() => parseSave(textAfter('camp'), broken)).toThrow('the areas are gone');
  });
});
