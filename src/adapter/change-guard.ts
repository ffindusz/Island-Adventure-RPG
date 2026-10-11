// Every screen that draws with a layer draws again only when what it shows has changed, so that a frame in which
// nothing happened costs no drawing. This is the look at whether it has, the same for all of them. No Phaser in here.

/** What a screen can say it shows: anything that JSON writes down, but not nothing at all. */
export type Showable = string | number | boolean | object | null;

/**
 * Tells a screen whether what it shows is not what it showed the last time it asked. What counts is what the thing
 * says, by the text JSON gives for it: a new object with the same content is not a change. Nothing is shown until the
 * first call, so the first call is always a change, whatever it is given, null included.
 */
export class ChangeGuard {
  private last: string | undefined;

  /** Whether `shown` is not what the last call was given; it is what the next call is compared with. */
  changed(shown: Showable): boolean {
    const text = JSON.stringify(shown);
    if (text === this.last) {
      return false;
    }
    this.last = text;
    return true;
  }

  /** Whether anything has been shown since the last `forget`, or since the start. */
  hasShown(): boolean {
    return this.last !== undefined;
  }

  /** Forgets what was shown, so that the next call is a change: the screen was cleared, or it starts again. */
  forget(): void {
    this.last = undefined;
  }
}
