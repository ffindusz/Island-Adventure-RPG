import type { Command, GameView, InventoryPageView } from '../core';
import type { MenuInput } from './player-input';

/**
 * The cursor of the inventory page: the piece of Gear the player has picked out. It is the player's place in the
 * list, not something that happens in the game, so it lives here; the Game core hears of it only when the player
 * equips the piece.
 */
export class InventoryMenu {
  private cursor = 0;

  /** The cursor's place in the page's list of Gear. Every time the page opens it starts on the first piece. */
  get position(): number {
    return this.cursor;
  }

  /** Moves the cursor by what the keys did. Enter equips the piece it is on. */
  update(view: GameView, input: MenuInput): Command[] {
    const page = openInventory(view);
    if (page === null) {
      this.cursor = 0;
      return [];
    }
    this.cursor = Math.max(0, Math.min(page.gear.length - 1, this.cursor + input.step));
    const picked = page.gear[this.cursor];
    return input.confirm && picked !== undefined ? [{ type: 'equip', gearId: picked.id }] : [];
  }
}

/** The inventory page, when it is the one the player is looking at. A Stat Point that waits covers any page. */
function openInventory(view: GameView): InventoryPageView | null {
  if (view.phase !== 'playing' || view.levelUp !== null || view.page?.id !== 'inventory') {
    return null;
  }
  return view.page;
}
