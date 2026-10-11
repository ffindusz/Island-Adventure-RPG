import { describe, expect, it } from 'vitest';
import { STAT_NAMES } from '../src/adapter/labels';
import { panelFor } from '../src/adapter/overlay';
import type { Panel } from '../src/adapter/overlay';
import type { InventoryPageView, PlayingView, StatPageView } from '../src/core';
import { newGame, playingView } from './fixtures';

// The three stats and the bar of Experience, as the stat page and the inventory show them: the numbers are worked out by
// hand from the view the pages are given.

const FOCUSED = true;
const START = playingView(newGame());

type PanelRow = Panel['rows'][number];

/** Every row of a panel from the top down, the rows of a column in place of the column. */
function rowsOf(panel: Panel | null): PanelRow[] {
  return (panel?.rows ?? []).flatMap((row): PanelRow[] => (row.kind === 'columns' ? [...row.left, ...row.right] : [row]));
}

/** The name and the value of each stat row, as the player reads them. */
function statsOf(panel: Panel | null): [string, string][] {
  return rowsOf(panel).flatMap((row): [string, string][] => (row.kind === 'stat' ? [[row.label, row.value]] : []));
}

/** How full each bar of the panel is. */
function barsOf(panel: Panel | null): number[] {
  return rowsOf(panel).flatMap((row) => (row.kind === 'bar' ? [row.share] : []));
}

/** The stat page of a hero at Level 3 of 10, a quarter of the way to the next, hurt, with Gear that gives a fraction. */
function statPage(changes: Partial<StatPageView> = {}): PlayingView {
  const page: StatPageView = {
    id: 'stats',
    level: 3,
    maxLevel: 10,
    experience: { earned: 5, needed: 20 },
    health: 4.2,
    maxHealth: 10.5,
    attack: 3,
    defense: 1.25,
    ...changes,
  };
  return { ...START, page };
}

/** The inventory of the same hero: the Health is the hero's, the Attack and the Defense are the page's. */
function inventory(health: number, maxHealth: number): PlayingView {
  const page: InventoryPageView = {
    id: 'inventory',
    gear: [],
    consumables: { ammunition: 12, 'healing-potion': 2 },
    keys: [],
    attack: 3,
    defense: 1.25,
  };
  return { ...START, hero: { ...START.hero, health, maxHealth }, page };
}

describe('the stat page', () => {
  it('shows the Level and the Experience, then Health, Attack and Defense under the names of the stats', () => {
    expect(statsOf(panelFor(statPage(), FOCUSED, 0))).toEqual([
      ['LEVEL', '3/10'],
      ['EXP', '5/20'],
      [STAT_NAMES.health, '5/11'],
      [STAT_NAMES.attack, '3'],
      [STAT_NAMES.defense, '1.25'],
    ]);
  });

  it('fills the bar of Experience by the share of the way to the next Level', () => {
    expect(barsOf(panelFor(statPage(), FOCUSED, 0))).toEqual([0.25]);
    expect(barsOf(panelFor(statPage({ experience: { earned: 0, needed: 20 } }), FOCUSED, 0))).toEqual([0]);
  });

  it('says MAX and keeps the bar full at the highest Level, where there is no next one', () => {
    const panel = panelFor(statPage({ level: 10, experience: null }), FOCUSED, 0);

    expect(statsOf(panel)).toContainEqual(['EXP', 'MAX']);
    expect(barsOf(panel)).toEqual([1]);
  });

  it('never reads 0 Health for a hero that is still standing, however little is left', () => {
    const panel = panelFor(statPage({ health: 0.01 }), FOCUSED, 0);

    expect(statsOf(panel)).toContainEqual([STAT_NAMES.health, '1/11']);
  });
});

describe('the inventory page', () => {
  it('shows the same three stats beside the Gear as the stat page does', () => {
    const onInventory = statsOf(panelFor(inventory(4.2, 10.5), FOCUSED, 0));

    expect(onInventory).toEqual([
      [STAT_NAMES.health, '5/11'],
      [STAT_NAMES.attack, '3'],
      [STAT_NAMES.defense, '1.25'],
    ]);
    expect(onInventory).toEqual(statsOf(panelFor(statPage(), FOCUSED, 0)).slice(2));
  });

  it('takes the Health from the hero, rounded up, so that a hero that is still standing never reads as 0', () => {
    expect(statsOf(panelFor(inventory(0.01, 10.5), FOCUSED, 0))).toContainEqual([STAT_NAMES.health, '1/11']);
  });
});
