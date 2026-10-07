import type { Command, GameView, InventoryPageView } from '../core';
import type { MenuInput } from './player-input';

/**
 * The cursor of the inventory page: the line the player has picked out, a piece of Gear or the Healing Potion below
 * the list. It is the player's place on the page, not something that happens in the game, so it lives here; the Game
 * core hears of it only when the player equips a piece or uses a potion.
 */
export class InventoryMenu {
  private cursor = 0;

  /**
   * The cursor's place: an index into the page's list of Gear, or `potionLineOf(page)` for the Healing Potion. Every
   * time the page opens it starts on the first piece.
   */
  get position(): number {
    return this.cursor;
  }

  /** Moves the cursor by what the keys did. Enter equips the piece it is on, or uses a Healing Potion. */
  update(view: GameView, input: MenuInput): Command[] {
    const page = openInventory(view);
    if (page === null) {
      this.cursor = 0;
      return [];
    }
    const potionLine = potionLineOf(page);
    this.cursor = Math.max(0, Math.min(potionLine, this.cursor + input.step));
    if (!input.confirm) {
      return [];
    }
    if (this.cursor === potionLine) {
      return [{ type: 'use-healing-potion' }];
    }
    const picked = page.gear[this.cursor];
    return picked !== undefined ? [{ type: 'equip', gearId: picked.id }] : [];
  }
}

/** The cursor's place on the Healing Potion line, which is just below the last piece of Gear. */
export function potionLineOf(page: InventoryPageView): number {
  return page.gear.length;
}

/** The inventory page, when it is the one the player is looking at. A Stat Point that waits covers any page. */
function openInventory(view: GameView): InventoryPageView | null {
  if (view.phase !== 'playing' || view.levelUp !== null || view.page?.id !== 'inventory') {
    return null;
  }
  return view.page;
}
