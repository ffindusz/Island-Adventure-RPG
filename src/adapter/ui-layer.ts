import type Phaser from 'phaser';
import type { ArtName } from './artwork';
import { drawBitmap, drawScaledBitmap, drawText, textBitmap } from './pixel-font';
import type { Bitmap, Graphics } from './pixel-font';

// What the HUD, the overlay, the notice and the area banner draw with, so that they look like one set: the colours of
// the pack's wooden theme, nine-patch frames cut from its pictures, icons, bars, and the bitmap font. A layer is one
// screen-fixed drawing. It is cleared and drawn again whenever what it shows changes, and the frames and icons it
// takes are kept and reused, so that a redraw makes no new objects.

/** The colours of text and fills, all from the pack's palette. */
export const INK = {
  text: 0xf2eaf1,
  title: 0xffad5d,
  hint: 0xabc2bc,
  gain: 0xadbc3a,
  warning: 0xe0394c,
  /** A count when there is none left, or a track with nothing in it. */
  dim: 0x8d977f,
  /** Text on the orange button that shows where the cursor is. */
  onButton: 0x34312c,
  /** The dark outline and the brown extrusion of the big name on the title screen, round letters of the `title` colour. */
  logoOutline: 0x141b1b,
  logoShade: 0x965340,
  health: 0xe0394c,
  experience: 0xffad5d,
} as const;

const BAR_OUTLINE = 0x141b1b;
const BAR_TRACK = 0x5f7160;

/** How a frame is cut from its picture: the width of each edge keeps its size, and the middle stretches. */
interface Cut {
  readonly texture: ArtName;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** The frames. The cuts follow the pictures: each has rounded corners, which sit in the edges. */
export const FRAMES = {
  /** A dark rounded panel: the HUD, the notice, the banner, and the inside of a window. */
  panel: { texture: 'ui-panel', left: 3, right: 3, top: 3, bottom: 3 },
  /** The orange frame of a window, whose own middle is hidden by a panel. */
  window: { texture: 'ui-window', left: 5, right: 5, top: 5, bottom: 5 },
  /** The orange button behind the line the cursor is on. */
  button: { texture: 'ui-button', left: 3, right: 3, top: 2, bottom: 2 },
} as const satisfies Readonly<Record<string, Cut>>;

export type FrameName = keyof typeof FRAMES;

/** The width of a window's frame: what a panel inside it is inset by, so that the two sit flush. */
const WINDOW_FRAME = 4;

/** From a window's edge to what it holds, the window's frame being the first `WINDOW_FRAME` pixels of it. */
export const WINDOW_PADDING = 12;

/** What a layer keeps of one kind: the objects made so far, and how many of them this drawing has used. */
interface Pool<T> {
  readonly items: T[];
  used: number;
}

function takeFrom<T>(pool: Pool<T>, make: () => T): T {
  let item = pool.items[pool.used];
  if (item === undefined) {
    item = make();
    pool.items.push(item);
  }
  pool.used += 1;
  return item;
}

function poolIn<K, T>(pools: Map<K, Pool<T>>, key: K): Pool<T> {
  let pool = pools.get(key);
  if (pool === undefined) {
    pool = { items: [], used: 0 };
    pools.set(key, pool);
  }
  return pool;
}

/** How many pixels of a bar's inside are filled: none only when `share` is 0, and all only when it is 1. */
export function filledPixels(inside: number, share: number): number {
  if (share <= 0) {
    return 0;
  }
  if (share >= 1) {
    return inside;
  }
  return Math.min(inside - 1, Math.max(1, Math.round(inside * share)));
}

/** The alpha of the panel behind the area banner, the audio line and the controls line, which sit over the play. */
export const PANEL_ALPHA = 0.9;

/**
 * One screen-fixed drawing, at `depth`. What it draws stacks in this order, whatever the order of the calls: frames
 * (in the order they were asked for), then text and bars, then icons.
 */
export class UiLayer {
  private readonly scene: Phaser.Scene;
  private readonly depth: number;
  private readonly graphics: Graphics;
  private readonly frames = new Map<FrameName, Pool<Phaser.GameObjects.NineSlice>>();
  private readonly icons = new Map<string, Pool<Phaser.GameObjects.Image>>();
  private framesTaken = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;
    this.depth = depth;
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(depth + 0.5);
  }

  /** Forgets the last drawing. Draw the next one after it. */
  clear(): void {
    this.graphics.clear();
    this.framesTaken = 0;
    for (const pool of [...this.frames.values(), ...this.icons.values()]) {
      pool.used = 0;
      pool.items.forEach((item) => item.setVisible(false));
    }
  }

  /** A frame of the given size at whole pixels, over the frames asked for before it, see-through by `alpha`. */
  frame(name: FrameName, left: number, top: number, width: number, height: number, alpha = 1): void {
    const cut = FRAMES[name];
    const frame = takeFrom(poolIn(this.frames, name), () =>
      this.scene.add
        .nineslice(0, 0, cut.texture, undefined, width, height, cut.left, cut.right, cut.top, cut.bottom)
        .setScrollFactor(0)
        .setOrigin(0, 0),
    );
    this.framesTaken += 1;
    frame
      .setSize(width, height)
      .setPosition(left, top)
      .setAlpha(alpha)
      .setDepth(this.depth + this.framesTaken / 1000)
      .setVisible(true);
  }

  /** A window: the orange frame, and the dark panel that fills it inside the frame. The two sit flush. */
  window(left: number, top: number, width: number, height: number): void {
    this.frame('window', left, top, width, height);
    this.frame('panel', left + WINDOW_FRAME, top + WINDOW_FRAME, width - 2 * WINDOW_FRAME, height - 2 * WINDOW_FRAME);
  }

  /**
   * A picture at whole pixels, over everything else, upside down when `flipped`. Given a box, it sits in the middle of
   * it, so that pictures of different sizes line up.
   */
  icon(name: string, left: number, top: number, boxWidth?: number, boxHeight?: number, flipped = false): void {
    const image = takeFrom(poolIn(this.icons, name), () =>
      this.scene.add.image(0, 0, name).setScrollFactor(0).setOrigin(0, 0).setDepth(this.depth + 0.75),
    );
    const x = boxWidth === undefined ? left : left + Math.floor((boxWidth - image.width) / 2);
    const y = boxHeight === undefined ? top : top + Math.floor((boxHeight - image.height) / 2);
    image.setPosition(x, y).setFlipY(flipped).setVisible(true);
  }

  text(text: string, left: number, top: number, colour: number): void {
    drawText(this.graphics, text, left, top, colour);
  }

  /** The text `scale` times as big, a whole number of times, so that its pixels stay as sharp as the pictures'. */
  scaledText(text: string, left: number, top: number, colour: number, scale: number): void {
    drawScaledBitmap(this.graphics, textBitmap(text), left, top, colour, scale);
  }

  bitmap(bitmap: Bitmap, left: number, top: number, colour: number): void {
    drawBitmap(this.graphics, bitmap, left, top, colour);
  }

  /**
   * A bar like the pack's: a dark outline with its corners cut, a track, and the fill from the left by `share`, from 0
   * to 1. Whole pixels, so it is as sharp as the pictures.
   */
  bar(left: number, top: number, width: number, height: number, share: number, fill: number): void {
    const graphics = this.graphics;
    graphics.fillStyle(BAR_OUTLINE);
    graphics.fillRect(left + 1, top, width - 2, height);
    graphics.fillRect(left, top + 1, width, height - 2);
    graphics.fillStyle(BAR_TRACK);
    graphics.fillRect(left + 1, top + 1, width - 2, height - 2);
    graphics.fillStyle(fill);
    graphics.fillRect(left + 1, top + 1, filledPixels(width - 2, share), height - 2);
  }
}
