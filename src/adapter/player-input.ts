import Phaser from 'phaser';
import { PAGE_IDS, STAT_IDS } from '../core';
import type { Command, Direction, PageId, StatId } from '../core';

/** The keys that walk the hero, by Phaser key name. Changing the controls means changing the tables in this file. */
const WALK_KEYS: Readonly<Record<Direction, readonly string[]>> = {
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
};

const ATTACK_KEY = 'SPACE';

/** The key that opens each page. */
const PAGE_KEYS: Readonly<Record<PageId, string>> = { stats: 'C' };

/** The key that closes the page that is open. */
const CLOSE_PAGE_KEY = 'ESC';

/** The keys that assign a Stat Point to each stat, number row and keypad alike, and the label the player reads. */
const STAT_KEYS: Readonly<Record<StatId, { readonly label: string; readonly keys: readonly string[] }>> = {
  health: { label: '1', keys: ['ONE', 'NUMPAD_ONE'] },
  attack: { label: '2', keys: ['TWO', 'NUMPAD_TWO'] },
  defense: { label: '3', keys: ['THREE', 'NUMPAD_THREE'] },
};

/** The key that assigns a Stat Point to the stat, as the level-up choice shows it. */
export function statKeyLabel(stat: StatId): string {
  return STAT_KEYS[stat].label;
}

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

type Key = Phaser.Input.Keyboard.Key;

/**
 * Turns the keyboard into Game core commands. It polls the keys once per frame instead of listening for key
 * events, because Phaser releases every key when the window loses focus without sending key-up events: polling
 * notices, so the hero never keeps walking by itself. It sends every command the keys call for and leaves it to the
 * Game core to ignore the ones that do not apply, such as closing a page that is not open.
 */
export class PlayerInput {
  private readonly walkKeys: Readonly<Record<Direction, readonly Key[]>>;
  private readonly attackKey: Key;
  private readonly pageKeys: readonly { readonly page: PageId; readonly key: Key }[];
  private readonly closePageKey: Key;
  private readonly statKeys: readonly { readonly stat: StatId; readonly keys: readonly Key[] }[];
  private readonly walking: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    const keysFor = (direction: Direction): Key[] => WALK_KEYS[direction].map((name) => keyboard.addKey(name));
    this.walkKeys = { up: keysFor('up'), down: keysFor('down'), left: keysFor('left'), right: keysFor('right') };
    this.attackKey = keyboard.addKey(ATTACK_KEY);
    // These are not captured, so the browser's own shortcuts on the same keys, such as Ctrl+C, still work.
    this.pageKeys = PAGE_IDS.map((page) => ({ page, key: keyboard.addKey(PAGE_KEYS[page], false) }));
    this.closePageKey = keyboard.addKey(CLOSE_PAGE_KEY, false);
    this.statKeys = STAT_IDS.map((stat) => ({
      stat,
      keys: STAT_KEYS[stat].keys.map((name) => keyboard.addKey(name, false)),
    }));
  }

  /**
   * The commands for what changed since the last call: a direction started or stopped being held (either of its
   * two keys counts), and the attack, page and Stat Point keys that were pressed again. Holding a key down does
   * not repeat its command.
   */
  poll(): Command[] {
    const commands: Command[] = [];
    for (const direction of DIRECTIONS) {
      const held = this.walkKeys[direction].some((key) => key.isDown);
      if (held === this.walking[direction]) {
        continue;
      }
      this.walking[direction] = held;
      if (held) {
        commands.push({ type: 'move', direction });
      } else {
        commands.push({ type: 'stop', direction });
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      commands.push({ type: 'attack' });
    }
    for (const { page, key } of this.pageKeys) {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        commands.push({ type: 'open-page', page });
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.closePageKey)) {
      for (const page of PAGE_IDS) {
        commands.push({ type: 'close-page', page });
      }
    }
    for (const { stat, keys } of this.statKeys) {
      // Every key is checked, so a key pressed together with its twin is not left over for the next frame.
      if (keys.filter((key) => Phaser.Input.Keyboard.JustDown(key)).length > 0) {
        commands.push({ type: 'assign-stat-point', stat });
      }
    }
    return commands;
  }
}
