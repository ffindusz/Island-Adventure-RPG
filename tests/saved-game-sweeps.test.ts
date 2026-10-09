import { describe, expect, it } from 'vitest';
import { parseSave } from '../src/adapter/saved-game';
import type { ParsedSave, SaveProblem } from '../src/adapter/saved-game';
import { adventureAfter, adventureContent, CHAPTERS } from './saved-adventure';

const content = adventureContent();

// The saved adventure, damaged at every place of it in turn. saved-game.test.ts names the faults that matter most; here
// nothing is chosen. The save is walked place by place, and each place in turn holds the wrong kind of value, is taken
// away, or is given a field that does not belong. Every such save must be refused, with the verdict and the place named
// as the checks promise, and none may get through or crash. The few places that would not be a fault are named below.
// A ticket that adds state to the saved adventure has its places swept here without a line being written, and the
// sweeps tell it where the checks have to be extended.

// What the save slot holds is untrusted, so the tests below damage it freely.
type Saved = any;
type Step = string | number;

/** A place in a saved game: the way to it from the root, and what it holds. */
interface Place {
  readonly steps: readonly Step[];
  readonly value: unknown;
}

/** Every place of the saved game, the root first. */
function placesIn(value: unknown, steps: readonly Step[] = []): Place[] {
  const place: Place = { steps, value };
  if (typeof value !== 'object' || value === null) {
    return [place];
  }
  const stepTo = (key: string): Step => (Array.isArray(value) ? Number(key) : key);
  return [place, ...Object.entries(value).flatMap(([key, child]) => placesIn(child, [...steps, stepTo(key)]))];
}

/** The place as the checks write it: `state.areas.arena.monsters[0].id`, and nothing for the root. */
function nameOf(steps: readonly Step[]): string {
  return steps.reduce<string>(
    (path, step) => (typeof step === 'number' ? `${path}[${step}]` : path === '' ? step : `${path}.${step}`),
    '',
  );
}

/** The place as the checks start what they say of it. */
function named(steps: readonly Step[]): string {
  return nameOf(steps) || 'The save';
}

/** A copy of the saved game, with the node at the steps changed. */
function changed(saved: Saved, steps: readonly Step[], change: (node: Saved) => void): Saved {
  const copy = structuredClone(saved);
  change(steps.reduce((node, step) => node[step], copy));
  return copy;
}

/** One value of each kind that JSON has. */
const OF_EACH_KIND: readonly unknown[] = [null, true, 7, 'a text', [], {}];

function kindOf(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  return Array.isArray(value) ? 'list' : typeof value;
}

/** What the checks must say of the damaged save: it still plays, or it is refused, for this reason, in these words. */
type Judgement = 'usable' | { readonly problem: SaveProblem; readonly says: string };

/** One damaged copy of the saved game, and how it must be judged. */
interface Damage {
  readonly done: string;
  readonly saved: Saved;
  readonly wanted: Judgement;
}

function shown(parsed: ParsedSave): string {
  return parsed.status === 'unusable' ? `${parsed.problem}: ${parsed.detail}` : parsed.status;
}

/** Judges every damaged save, and returns what was judged wrongly. A save that crashes the checks fails the test. */
function judge(damages: Iterable<Damage>): { readonly tried: number; readonly slips: string[] } {
  const slips: string[] = [];
  let tried = 0;
  for (const { done, saved, wanted } of damages) {
    const parsed = parseSave(JSON.stringify(saved), content);
    tried++;
    if (wanted === 'usable') {
      if (parsed.status !== 'usable') {
        slips.push(`${done}: still usable, but ${shown(parsed)}`);
      }
    } else if (
      parsed.status !== 'unusable' ||
      parsed.problem !== wanted.problem ||
      !parsed.detail.startsWith(wanted.says)
    ) {
      slips.push(`${done}: ${wanted.problem} "${wanted.says}...", but ${shown(parsed)}`);
    }
  }
  return { tried, slips };
}

function* wrongKinds(saved: Saved): Generator<Damage> {
  for (const { steps, value } of placesIn(saved)) {
    const name = named(steps);
    for (const replacement of OF_EACH_KIND.filter((candidate) => kindOf(candidate) !== kindOf(value))) {
      let wanted: Judgement = { problem: 'damaged', says: `${name} should be` };
      if (replacement === null && (name === 'state.page' || name === 'state.areaText' || name === 'state.departure')) {
        // Nothing to show: no Page is open, no Area Text is on the screen and no question is asked.
        wanted = 'usable';
      } else if (name === 'state.areaText' && value === null && kindOf(replacement) === 'object') {
        // An empty object is Area Text that has no text.
        wanted = { problem: 'damaged', says: 'state.areaText.text is missing' };
      }
      yield {
        done: `${name} made ${JSON.stringify(replacement)}`,
        saved:
          steps.length === 0
            ? replacement
            : changed(saved, steps.slice(0, -1), (parent) => (parent[steps[steps.length - 1] as Step] = replacement)),
        wanted,
      };
    }
  }
}

function* goneFields(saved: Saved): Generator<Damage> {
  for (const { steps, value } of placesIn(saved)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      continue;
    }
    for (const key of Object.keys(value)) {
      const name = named([...steps, key]);
      let wanted: Judgement = { problem: 'damaged', says: `${name} is missing` };
      if (key === 'shotBy') {
        // The arrows of the hero have no shooter.
        wanted = 'usable';
      } else if (nameOf(steps) === 'state.hero.equipped') {
        // A slot with nothing equipped is no fault, unless the hero is to strike with it.
        wanted =
          key === saved.state.hero.activeWeapon ? { problem: 'damaged', says: 'state.hero.activeWeapon is' } : 'usable';
      } else if (name === 'version' || /\.action\.type$/.test(name) || /\.interactables\.[^.]+\.kind$/.test(name)) {
        // What is expected of the rest is read from these, so what is not there is wrong where it is read.
        wanted = { problem: 'damaged', says: `${name} should be` };
      } else if (/^state\.areas\.[^.]+$/.test(name) || /\.interactables\.[^.]+$/.test(name)) {
        // The area is the game's, and so is each thing it places.
        wanted = { problem: 'incompatible', says: `${name} is missing` };
      } else if (/\.action\.direction$/.test(name) && (value as Saved).type === 'winding-up') {
        // Only a charger has a direction in its wind-up, and the game gave it one.
        wanted = { problem: 'incompatible', says: `${name} is missing` };
      } else if (/\.monsters\[\d+\]\.nextPattern$/.test(name)) {
        // Only a Guardian keeps the turn of its patterns, and the game gave it one.
        wanted = { problem: 'incompatible', says: `${name} is missing` };
      }
      yield { done: `${name} taken away`, saved: changed(saved, steps, (node) => delete node[key]), wanted };
    }
  }
}

function* extraFields(saved: Saved): Generator<Damage> {
  for (const { steps, value } of placesIn(saved)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      continue;
    }
    const container = nameOf(steps);
    const name = nameOf([...steps, 'unknownField']);
    let wanted: Judgement = { problem: 'damaged', says: `${name} is not part of a saved game` };
    if (container === 'state.areas') {
      wanted = { problem: 'incompatible', says: `${name} is the world of an area` };
    } else if (/\.interactables$/.test(container)) {
      wanted = { problem: 'incompatible', says: `${name} is not an interactable` };
    } else if (container === 'state.hero.equipped') {
      wanted = { problem: 'damaged', says: `${name} is not a Gear slot` };
    }
    yield { done: `${name} added`, saved: changed(saved, steps, (node) => (node.unknownField = 1)), wanted };
  }
}

function savedAfter(chapter: string): Saved {
  return JSON.parse(JSON.stringify(adventureAfter(chapter).snapshot()));
}

describe.each(CHAPTERS)('the saved adventure after the chapter "$id"', ({ id }) => {
  // Each sweep must have tried a good many saves, or it has walked nothing and proves nothing.
  it('is refused, saying where, when a place holds the wrong kind of value', () => {
    const { tried, slips } = judge(wrongKinds(savedAfter(id)));

    expect(slips.slice(0, 5)).toEqual([]);
    expect(tried).toBeGreaterThan(1500);
  });

  it('is refused, saying where, when a field is taken away', () => {
    const { tried, slips } = judge(goneFields(savedAfter(id)));

    expect(slips.slice(0, 5)).toEqual([]);
    expect(tried).toBeGreaterThan(100);
  });

  it('is refused, saying where, when an object has a field that does not belong', () => {
    const { tried, slips } = judge(extraFields(savedAfter(id)));

    expect(slips.slice(0, 5)).toEqual([]);
    expect(tried).toBeGreaterThan(30);
  });
});
