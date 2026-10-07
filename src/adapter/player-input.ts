import Phaser from 'phaser';
import type { Command, Direction } from '../core';

/** The keys that walk the hero, by Phaser key name. Changing the controls means changing this table and ATTACK_KEY. */
const WALK_KEYS: Readonly<Record<Direction, readonly string[]>> = {
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
};

const ATTACK_KEY = 'SPACE';

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

/**
 * Turns the keyboard into Game core commands. It polls the keys once per frame instead of listening for key
 * events, because Phaser releases every key when the window loses focus without sending key-up events: polling
 * notices, so the hero never keeps walking by itself.
 */
export class PlayerInput {
  private readonly walkKeys: Readonly<Record<Direction, readonly Phaser.Input.Keyboard.Key[]>>;
  private readonly attackKey: Phaser.Input.Keyboard.Key;
  private readonly walking: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    const keysFor = (direction: Direction): Phaser.Input.Keyboard.Key[] =>
      WALK_KEYS[direction].map((name) => keyboard.addKey(name));
    this.walkKeys = { up: keysFor('up'), down: keysFor('down'), left: keysFor('left'), right: keysFor('right') };
    this.attackKey = keyboard.addKey(ATTACK_KEY);
  }

  /**
   * The commands for what changed since the last call: a direction started or stopped being held (either of its
   * two keys counts), and the attack key was pressed again. Holding the attack key does not repeat the attack.
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
    return commands;
  }
}
