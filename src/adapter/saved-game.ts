import {
  CONSUMABLE_IDS,
  createGame,
  GEAR_SLOTS,
  PAGE_IDS,
  SNAPSHOT_VERSION,
  STAT_IDS,
  WEAPON_SLOTS,
} from '../core';
import type {
  AreaDefinition,
  ContentDefinition,
  Direction,
  Game,
  GameOptions,
  InteractableDefinition,
  MonsterAction,
  MonsterTypeDefinition,
  Snapshot,
} from '../core';

// Reading the saved game. The save slot holds the JSON text of a Snapshot, and that text may be anything: damaged, cut
// short, edited, or saved by another version of the game. parseSave is the one gate between it and the Game core, so
// the core never sees a snapshot it cannot take. It has no Phaser and no storage in it: it is a pure function of the
// text and the content, and it is tested on its own (see tests/saved-game.test.ts).
//
// The checks below are the saved shape, written out. A Snapshot must have exactly the fields the state has: one with
// more or fewer is refused. So a ticket that changes the saved state turns the tests red until the checks change with
// it, and that ticket bumps SNAPSHOT_VERSION (see "Saving, Continue and the title" in the README).

/** Why a save in the slot cannot be used: it is not a save at all, or it is one this version of the game cannot take. */
export type SaveProblem = 'damaged' | 'incompatible';

export type ParsedSave =
  /** Nothing was ever saved. */
  | { readonly status: 'none' }
  /** The game can continue from it. */
  | { readonly status: 'usable'; readonly snapshot: Snapshot }
  /** There is a save, but the game cannot continue from it. `detail` says what was wrong, for whoever reads the console. */
  | { readonly status: 'unusable'; readonly problem: SaveProblem; readonly detail: string };

/** Makes the game that a save is tried on before it is called usable. */
export type MakeGame = (options: GameOptions) => Game;

/** Judges the text found in the save slot, or null when the slot is empty, against the content of this game. */
export function parseSave(
  text: string | null,
  content: ContentDefinition,
  makeGame: MakeGame = createGame,
): ParsedSave {
  if (text === null) {
    return { status: 'none' };
  }
  try {
    const snapshot = checkedSnapshot(parseJson(text), content);
    expectGameCanContinueFrom(snapshot, content, makeGame);
    return { status: 'usable', snapshot };
  } catch (error) {
    if (error instanceof Unusable) {
      return { status: 'unusable', problem: error.problem, detail: error.message };
    }
    throw error;
  }
}

/** What the checks throw: the first thing found wrong with the save. */
class Unusable extends Error {
  constructor(
    readonly problem: SaveProblem,
    detail: string,
  ) {
    super(detail);
  }
}

/** The save is not what it should be in shape: it is not a save the game made. */
function damaged(path: string, what: string): Unusable {
  return new Unusable('damaged', `${path || 'The save'} ${what}`);
}

/** The save has the right shape but cannot be used with this version of the game or its content. */
function incompatible(path: string, what: string): Unusable {
  return new Unusable('incompatible', `${path || 'The save'} ${what}`);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw damaged('The text', 'is not JSON');
  }
}

function checkedSnapshot(raw: unknown, content: ContentDefinition): Snapshot {
  const saved = expectRecord(raw, '');
  const version = saved['version'];
  if (typeof version !== 'number') {
    throw damaged('version', 'should be a number');
  }
  if (version !== SNAPSHOT_VERSION) {
    throw incompatible('version', `is ${version}, but this game reads version ${SNAPSHOT_VERSION}`);
  }
  expectKeys(saved, '', ['version', 'state']);
  checkState(saved['state'], content);
  return saved as unknown as Snapshot;
}

/**
 * The last check, which holds the others to account: a game of its own takes the save, shows it and steps once. The
 * checks say the save has the shape of a game state, but only the game knows if it can go on from there, and once the
 * game is playing nothing takes the player back to the title (until the ending), so what would throw must throw here.
 */
function expectGameCanContinueFrom(snapshot: Snapshot, content: ContentDefinition, makeGame: MakeGame): void {
  try {
    const game = makeGame({ content, random: () => 0.5 });
    game.send({ type: 'continue', snapshot });
    game.view();
    game.step();
  } catch (error) {
    throw damaged('', `could not be played on: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function checkState(value: unknown, content: ContentDefinition): void {
  const state = expectKeys(expectRecord(value, 'state'), 'state', [
    'phase',
    'areaId',
    'checkpoint',
    'areaText',
    'hero',
    'arrows',
    'page',
    'areas',
  ]);
  if (state['phase'] !== 'playing') {
    throw damaged('state.phase', 'should be "playing": the game is saved only while it is played');
  }
  const area = expectKnownArea(state['areaId'], 'state.areaId', content);
  const keysTaken = checkWorlds(state['areas'], 'state.areas', content);
  checkCheckpoint(state['checkpoint'], 'state.checkpoint', content);
  checkAreaText(state['areaText'], 'state.areaText');
  const keysHeld = checkHero(state['hero'], 'state.hero', area, content);
  keysHeld.forEach((id, i) => {
    if (!keysTaken.includes(id)) {
      throw damaged(atIndex('state.hero.keys', i), `is "${id}", but that key still lies where its area placed it`);
    }
  });
  checkArrows(state['arrows'], 'state.arrows', content);
  checkPage(state['page'], 'state.page');
}

/** The world of every Adventure Area of the game, and of no other. Returns the ids of the keys marked taken in them. */
function checkWorlds(value: unknown, path: string, content: ContentDefinition): string[] {
  const worlds = expectRecord(value, path);
  for (const id of Object.keys(worlds)) {
    if (!content.areas.some((area) => area.id === id)) {
      throw incompatible(at(path, id), 'is the world of an area this game does not have');
    }
  }
  return content.areas.flatMap((area) => checkWorld(worlds[area.id], at(path, area.id), area, content));
}

/**
 * The world of one Adventure Area as the hero left it: its monsters, milestones, interactables and Automap. Returns the
 * ids of the keys it marks taken.
 */
function checkWorld(value: unknown, path: string, area: AreaDefinition, content: ContentDefinition): string[] {
  if (value === undefined) {
    throw incompatible(path, 'is missing, but this game has the area');
  }
  const world = expectKeys(expectRecord(value, path), path, [
    'monsters',
    'reachedMilestones',
    'visited',
    'interactables',
    'revealed',
  ]);
  checkMonsters(world['monsters'], at(path, 'monsters'), area, content);
  checkMilestones(world['reachedMilestones'], at(path, 'reachedMilestones'), area);
  expectBoolean(world['visited'], at(path, 'visited'));
  const keysTaken = checkInteractables(world['interactables'], at(path, 'interactables'), area);
  checkRevealed(world['revealed'], at(path, 'revealed'), area);
  return keysTaken;
}

/** Every monster the area places, defeated ones too, in the order the area places them. */
function checkMonsters(value: unknown, path: string, area: AreaDefinition, content: ContentDefinition): void {
  const monsters = expectList(value, path);
  if (monsters.length !== area.monsters.length) {
    throw incompatible(path, `has ${monsters.length} monsters, but the area places ${area.monsters.length}`);
  }
  area.monsters.forEach((placed, i) => {
    const monsterPath = atIndex(path, i);
    const monster = expectKeys(expectRecord(monsters[i], monsterPath), monsterPath, [
      'id',
      'type',
      'position',
      'health',
      'action',
    ]);
    const id = expectString(monster['id'], at(monsterPath, 'id'));
    const type = expectString(monster['type'], at(monsterPath, 'type'));
    if (id !== placed.id) {
      throw incompatible(at(monsterPath, 'id'), `is "${id}", but the area places "${placed.id}" here`);
    }
    const definition = monsterTypeIn(content, type, at(monsterPath, 'type'));
    if (type !== placed.type) {
      throw incompatible(at(monsterPath, 'type'), `is "${type}", but the area places a "${placed.type}" here`);
    }
    expectPositionIn(monster['position'], at(monsterPath, 'position'), area);
    expectNonNegative(monster['health'], at(monsterPath, 'health'));
    checkAction(monster['action'], at(monsterPath, 'action'), type, definition.behavior);
  });
}

function monsterTypeIn(content: ContentDefinition, type: string, path: string): MonsterTypeDefinition {
  const definition = Object.hasOwn(content.monsterTypes, type) ? content.monsterTypes[type] : undefined;
  if (definition === undefined) {
    throw incompatible(path, `is "${type}", which is not a monster type of this game`);
  }
  return definition;
}

type Behavior = MonsterTypeDefinition['behavior'];
type ActionCheck = (action: Record<string, unknown>, path: string, behavior: Behavior) => void;

/** The kinds of action each behavior moves a monster through: the same few for all, but not every kind for each. */
const ACTIONS_OF: Record<Behavior, readonly MonsterAction['type'][]> = {
  stationary: ['idle'],
  chaser: ['idle', 'chasing', 'winding-up', 'recovering'],
  charger: ['idle', 'chasing', 'winding-up', 'dashing', 'recovering'],
  ranged: ['idle', 'chasing', 'winding-up', 'recovering'],
};

/** What each kind of action keeps with it, and how the fields are checked. A new kind of action must be added here. */
const ACTION_CHECKS: Record<MonsterAction['type'], ActionCheck> = {
  idle: (action, path) => {
    expectKeys(action, path, ['type']);
  },
  chasing: (action, path) => {
    expectKeys(action, path, ['type']);
  },
  'winding-up': (action, path, behavior) => {
    // Only a monster that dashes keeps the direction of its dash, which is fixed when the wind-up begins.
    const dashes = behavior === 'charger';
    if (Object.hasOwn(action, 'direction') !== dashes) {
      throw incompatible(at(path, 'direction'), dashes ? 'is missing: a charger winds up to dash' : 'should not be there');
    }
    expectKeys(action, path, ['type', 'zone', 'elapsed', 'length', ...(dashes ? ['direction'] : [])]);
    expectBox(action['zone'], at(path, 'zone'));
    expectCount(action['elapsed'], at(path, 'elapsed'));
    expectCount(action['length'], at(path, 'length'));
    if (dashes) {
      expectOneOf(action['direction'], DIRECTIONS, at(path, 'direction'));
    }
  },
  dashing: (action, path) => {
    expectKeys(action, path, ['type', 'direction', 'rangeLeft']);
    expectOneOf(action['direction'], DIRECTIONS, at(path, 'direction'));
    expectNonNegative(action['rangeLeft'], at(path, 'rangeLeft'));
  },
  recovering: (action, path) => {
    expectKeys(action, path, ['type', 'stepsLeft']);
    expectCount(action['stepsLeft'], at(path, 'stepsLeft'));
  },
};

function checkAction(value: unknown, path: string, monsterType: string, behavior: Behavior): void {
  const action = expectRecord(value, path);
  const type = expectOneOf(action['type'], Object.keys(ACTION_CHECKS) as MonsterAction['type'][], at(path, 'type'));
  if (!ACTIONS_OF[behavior].includes(type)) {
    throw incompatible(path, `is "${type}", which a ${behavior} monster ("${monsterType}") never does`);
  }
  ACTION_CHECKS[type](action, path, behavior);
}

/** The arrows in flight: the hero's own, and the projectiles of ranged monsters. */
function checkArrows(value: unknown, path: string, content: ContentDefinition): void {
  expectList(value, path).forEach((entry, i) => {
    const arrowPath = atIndex(path, i);
    const arrow = expectRecord(entry, arrowPath);
    expectKeys(arrow, arrowPath, ['areaId', 'position', 'direction', 'rangeLeft'], ['shotBy']);
    expectKnownArea(arrow['areaId'], at(arrowPath, 'areaId'), content);
    expectPoint(arrow['position'], at(arrowPath, 'position'));
    expectOneOf(arrow['direction'], DIRECTIONS, at(arrowPath, 'direction'));
    expectNonNegative(arrow['rangeLeft'], at(arrowPath, 'rangeLeft'));
    if (Object.hasOwn(arrow, 'shotBy')) {
      checkShooter(arrow['shotBy'], at(arrowPath, 'shotBy'), content);
    }
  });
}

/** The monster that shot an arrow: one that the areas place, of a type that shoots. */
function checkShooter(value: unknown, path: string, content: ContentDefinition): void {
  const shotBy = expectKeys(expectRecord(value, path), path, ['monsterId', 'monsterType']);
  const id = expectString(shotBy['monsterId'], at(path, 'monsterId'));
  const type = expectString(shotBy['monsterType'], at(path, 'monsterType'));
  const placed = content.areas.flatMap((area) => area.monsters).find((candidate) => candidate.id === id);
  if (placed === undefined) {
    throw incompatible(at(path, 'monsterId'), `is "${id}", which no area of this game places`);
  }
  const definition = monsterTypeIn(content, type, at(path, 'monsterType'));
  if (type !== placed.type) {
    throw incompatible(at(path, 'monsterType'), `is "${type}", but the area places "${id}" as a "${placed.type}"`);
  }
  if (definition.behavior !== 'ranged') {
    throw incompatible(at(path, 'monsterType'), `is "${type}", which shoots nothing`);
  }
}

function checkMilestones(value: unknown, path: string, area: AreaDefinition): void {
  checkIds(
    value,
    path,
    (area.milestones ?? []).map((milestone) => milestone.id),
    'a milestone of the area',
  );
}

/** What the hero can change about each interactable of the area: a chest is opened, a pickup or a key is taken. */
const FLAG_OF: Record<InteractableDefinition['kind'], string> = { chest: 'opened', pickup: 'collected', key: 'collected' };

function checkInteractables(value: unknown, path: string, area: AreaDefinition): string[] {
  const states = expectRecord(value, path);
  const placed = area.interactables ?? [];
  for (const id of Object.keys(states)) {
    if (!placed.some((interactable) => interactable.id === id)) {
      throw incompatible(at(path, id), 'is not an interactable of the area');
    }
  }
  const keysTaken: string[] = [];
  for (const interactable of placed) {
    const statePath = at(path, interactable.id);
    if (states[interactable.id] === undefined) {
      throw incompatible(statePath, 'is missing, but the area places it');
    }
    const state = expectRecord(states[interactable.id], statePath);
    const kind = expectOneOf(state['kind'], Object.keys(FLAG_OF), at(statePath, 'kind'));
    if (kind !== interactable.kind) {
      throw incompatible(statePath, `is the state of a ${kind}, but the area places a ${interactable.kind}`);
    }
    const flag = FLAG_OF[interactable.kind];
    expectKeys(state, statePath, ['kind', flag]);
    if (expectBoolean(state[flag], at(statePath, flag)) && interactable.kind === 'key') {
      keysTaken.push(interactable.id);
    }
  }
  return keysTaken;
}

/** The Automap's grid: one yes or no for each tile of the area, indexed [row][col]. */
function checkRevealed(value: unknown, path: string, area: AreaDefinition): void {
  const rows = expectList(value, path);
  if (rows.length !== area.layout.length) {
    throw incompatible(path, `has ${rows.length} rows, but the area has ${area.layout.length}`);
  }
  rows.forEach((row, rowIndex) => {
    const rowPath = atIndex(path, rowIndex);
    const tiles = expectList(row, rowPath);
    if (tiles.length !== widthOf(area)) {
      throw incompatible(rowPath, `has ${tiles.length} tiles, but the area is ${widthOf(area)} wide`);
    }
    tiles.forEach((tile, col) => expectBoolean(tile, atIndex(rowPath, col)));
  });
}

/** The Checkpoint that defeat sends the hero back to: a place in the world, and what the hero had taken by then. */
function checkCheckpoint(value: unknown, path: string, content: ContentDefinition): void {
  const checkpoint = expectKeys(expectRecord(value, path), path, ['areaId', 'tile', 'consumables', 'collected']);
  const area = expectKnownArea(checkpoint['areaId'], at(path, 'areaId'), content);
  const tilePath = at(path, 'tile');
  const tile = expectKeys(expectRecord(checkpoint['tile'], tilePath), tilePath, ['col', 'row']);
  const col = expectCount(tile['col'], at(tilePath, 'col'));
  const row = expectCount(tile['row'], at(tilePath, 'row'));
  if (col >= widthOf(area) || row >= area.layout.length) {
    throw incompatible(tilePath, 'is outside the area');
  }
  expectCounts(checkpoint['consumables'], at(path, 'consumables'), CONSUMABLE_IDS);
  checkIds(
    checkpoint['collected'],
    at(path, 'collected'),
    content.areas.flatMap((candidate) => (candidate.interactables ?? []).map((interactable) => interactable.id)),
    'an interactable of any area',
  );
}

/** The Area Text that is shown now, and for how many more steps, or nothing when none is shown. */
function checkAreaText(value: unknown, path: string): void {
  if (value === null) {
    return;
  }
  const areaText = expectKeys(expectRecord(value, path), path, ['text', 'stepsLeft']);
  expectString(areaText['text'], at(path, 'text'));
  expectCount(areaText['stepsLeft'], at(path, 'stepsLeft'));
}

function checkPage(value: unknown, path: string): void {
  if (value !== null) {
    expectOneOf(value, PAGE_IDS, path);
  }
}

/** The hero: where it is and what it has, in the area it is in. Returns the ids of the keys it holds. */
function checkHero(value: unknown, path: string, area: AreaDefinition, content: ContentDefinition): string[] {
  const hero = expectKeys(expectRecord(value, path), path, [
    'position',
    'facing',
    'health',
    'attackCooldown',
    'experience',
    'statPoints',
    'gear',
    'equipped',
    'activeWeapon',
    'consumables',
    'keys',
  ]);
  expectPositionIn(hero['position'], at(path, 'position'), area);
  expectOneOf(hero['facing'], DIRECTIONS, at(path, 'facing'));
  if (expectNumber(hero['health'], at(path, 'health')) <= 0) {
    throw damaged(at(path, 'health'), 'should be more than 0: a hero with no Health goes back to its Checkpoint');
  }
  expectCount(hero['attackCooldown'], at(path, 'attackCooldown'));
  expectNonNegative(hero['experience'], at(path, 'experience'));
  expectCounts(hero['statPoints'], at(path, 'statPoints'), STAT_IDS);
  const carried = checkIds(hero['gear'], at(path, 'gear'), Object.keys(content.gear), 'Gear of this game');
  const equipped = checkEquipped(hero['equipped'], at(path, 'equipped'), carried, content);
  const weapon = expectOneOf(hero['activeWeapon'], WEAPON_SLOTS, at(path, 'activeWeapon'));
  if (!Object.hasOwn(equipped, weapon)) {
    throw damaged(at(path, 'activeWeapon'), `is the ${weapon}, but the hero has none equipped`);
  }
  expectCounts(hero['consumables'], at(path, 'consumables'), CONSUMABLE_IDS);
  return checkIds(hero['keys'], at(path, 'keys'), keyIdsOf(content), 'a key of this game');
}

/** The ids of the keys that the areas of the game place, which are the keys the hero can hold. */
function keyIdsOf(content: ContentDefinition): string[] {
  return content.areas.flatMap((area) =>
    (area.interactables ?? []).filter((interactable) => interactable.kind === 'key').map((key) => key.id),
  );
}

/** The Gear the hero has equipped in each slot: a piece it carries, and one made for that slot. */
function checkEquipped(
  value: unknown,
  path: string,
  carried: readonly string[],
  content: ContentDefinition,
): Record<string, unknown> {
  const equipped = expectRecord(value, path);
  for (const [slot, value] of Object.entries(equipped)) {
    const slotPath = at(path, slot);
    if (!(GEAR_SLOTS as readonly string[]).includes(slot)) {
      throw damaged(slotPath, 'is not a Gear slot of this game');
    }
    const gearId = expectString(value, slotPath);
    if (!carried.includes(gearId)) {
      throw damaged(slotPath, `is "${gearId}", but the hero does not carry it`);
    }
    const madeFor = content.gear[gearId]?.slot;
    if (madeFor !== slot) {
      throw incompatible(slotPath, `is "${gearId}", which is Gear for the ${madeFor} slot`);
    }
  }
  return equipped;
}

/** A list of ids, each one of those given and none twice. Returns them. */
function checkIds(value: unknown, path: string, known: readonly string[], what: string): string[] {
  const ids = expectList(value, path);
  return ids.map((entry, i) => {
    const idPath = atIndex(path, i);
    const id = expectString(entry, idPath);
    if (!known.includes(id)) {
      throw incompatible(idPath, `is "${id}", which is not ${what}`);
    }
    if (ids.indexOf(id) !== i) {
      throw damaged(idPath, `is there twice: "${id}"`);
    }
    return id;
  });
}

function expectKnownArea(value: unknown, path: string, content: ContentDefinition): AreaDefinition {
  const id = expectString(value, path);
  const area = content.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw incompatible(path, `is "${id}", which is not an area of this game`);
  }
  return area;
}

/** A place in tile units, with its centre inside the area. */
function expectPositionIn(value: unknown, path: string, area: AreaDefinition): void {
  const { x, y } = expectPoint(value, path);
  if (x < 0 || y < 0 || x > widthOf(area) || y > area.layout.length) {
    throw incompatible(path, 'is outside the area');
  }
}

function expectPoint(value: unknown, path: string): { x: number; y: number } {
  const point = expectKeys(expectRecord(value, path), path, ['x', 'y']);
  return { x: expectNumber(point['x'], at(path, 'x')), y: expectNumber(point['y'], at(path, 'y')) };
}

function expectBox(value: unknown, path: string): void {
  const box = expectKeys(expectRecord(value, path), path, ['minX', 'minY', 'maxX', 'maxY']);
  for (const side of ['minX', 'minY', 'maxX', 'maxY']) {
    expectNumber(box[side], at(path, side));
  }
}

/** How many tiles wide the area is. The content loader keeps all its rows as wide as the first. */
function widthOf(area: AreaDefinition): number {
  return Array.from(area.layout[0] ?? '').length;
}

function at(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

function atIndex(path: string, index: number): string {
  return `${path}[${index}]`;
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw damaged(path, 'should be an object');
  }
  return value as Record<string, unknown>;
}

/** The record has the fields given, and the optional ones it may have, and no others. */
function expectKeys(
  record: Record<string, unknown>,
  path: string,
  fields: readonly string[],
  optional: readonly string[] = [],
): Record<string, unknown> {
  for (const field of fields) {
    if (!Object.hasOwn(record, field)) {
      throw damaged(at(path, field), 'is missing');
    }
  }
  for (const key of Object.keys(record)) {
    if (!fields.includes(key) && !optional.includes(key)) {
      throw damaged(at(path, key), 'is not part of a saved game');
    }
  }
  return record;
}

function expectList(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw damaged(path, 'should be a list');
  }
  return value;
}

function expectBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw damaged(path, 'should be true or false');
  }
  return value;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw damaged(path, 'should be text');
  }
  return value;
}

/** A number the JSON really holds: not text, and not null, which is what JSON makes of a NaN or an Infinity. */
function expectNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw damaged(path, 'should be a number');
  }
  return value;
}

/** A number of 0 or more: Health, Experience, or how far something can still go in tiles. */
function expectNonNegative(value: unknown, path: string): number {
  const number = expectNumber(value, path);
  if (number < 0) {
    throw damaged(path, 'should be 0 or more');
  }
  return number;
}

/** A whole number of 0 or more: a count of things, or of fixed steps. */
function expectCount(value: unknown, path: string): number {
  const count = expectNumber(value, path);
  if (!Number.isInteger(count) || count < 0) {
    throw damaged(path, 'should be a whole number of 0 or more');
  }
  return count;
}

/** A record with a count for each of the ids given, and for no other. */
function expectCounts(value: unknown, path: string, ids: readonly string[]): void {
  const counts = expectKeys(expectRecord(value, path), path, ids);
  for (const id of ids) {
    expectCount(counts[id], at(path, id));
  }
}

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

function expectOneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw damaged(path, `should be one of ${allowed.join(', ')}`);
  }
  return value as T;
}
