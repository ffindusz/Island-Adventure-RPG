import { describe, expect, it } from 'vitest';
import { checkAudioKeys, pageKeyLabel } from '../src/adapter/controls';

// The keys of the audio may not be the keys of anything else. The check is given Phaser's table of key codes, so here it
// is given one of the test's own: every name has a code of its own, but for the names that are told to share one and
// those that the table is told not to know.

/** A table of key codes that gives each name a code of its own, but `shared` names one code and `unknown` names none. */
function codes(options: { shared?: readonly string[]; unknown?: readonly string[] } = {}): (name: string) => number | undefined {
  const { shared = [], unknown = [] } = options;
  const numbered = new Map<string, number>();
  return (name) => {
    if (unknown.includes(name)) {
      return undefined;
    }
    const identity = shared.includes(name) ? (shared[0] ?? name) : name;
    if (!numbered.has(identity)) {
      numbered.set(identity, numbered.size + 1);
    }
    return numbered.get(identity);
  };
}

describe('the keys of the audio', () => {
  it('are no key of anything else, as the controls are', () => {
    expect(() => checkAudioKeys(codes())).not.toThrow();
  });

  it.each([
    ['W', 'walking up', 'MINUS', 'lower'],
    ['SPACE', 'attacking', 'N', 'toggle-mute'],
    ['E', 'interacting', 'NUMPAD_ADD', 'raise'],
    ['Q', 'switching weapons', 'PLUS', 'raise'],
    ['ENTER', 'picking from a menu', 'N', 'toggle-mute'],
    ['M', 'toggling the automap page', 'NUMPAD_SUBTRACT', 'lower'],
    ['H', 'toggling the controls page', 'N', 'toggle-mute'],
    ['TAB', 'toggling the stats page', 'N', 'toggle-mute'],
    ['C', 'toggling the stats page', 'PLUS', 'raise'],
    ['ESC', 'closing a page', 'MINUS', 'lower'],
    ['TWO', 'assigning a Stat Point to attack', 'PLUS', 'raise'],
  ])('are refused when %s, the key for %s, has the code of %s, a key for the audio (%s)', (other, use, audioKey, change) => {
    expect(() => checkAudioKeys(codes({ shared: [other, audioKey] }))).toThrow(
      `The key ${audioKey}, for the audio (${change}), is also the key for ${use}`,
    );
  });

  it('are refused when two of the changes of the audio share a key', () => {
    expect(() => checkAudioKeys(codes({ shared: ['MINUS', 'PLUS'] }))).toThrow(
      'The key PLUS, for the audio (raise), is also the key for the audio (lower)',
    );
  });

  it.each(['NUMPAD_ADD', 'SPACE'])('are refused when the table does not know %s, naming it', (name) => {
    expect(() => checkAudioKeys(codes({ unknown: [name] }))).toThrow(`"${name}" is not the name of a key that Phaser knows`);
  });

  it('are refused when the table does not know a key of a page, naming it: Tab is checked as C is', () => {
    expect(() => checkAudioKeys(codes({ unknown: ['TAB'] }))).toThrow('"TAB" is not the name of a key that Phaser knows');
  });
});

// A page has several keys when it needs them: the notices name the first, which is the page's main key.
describe('the key that a notice names for a page', () => {
  it.each([
    ['stats', 'C'],
    ['inventory', 'I'],
    ['automap', 'M'],
    ['controls', 'H'],
  ] as const)('is, for the %s page, %s', (page, label) => {
    expect(pageKeyLabel(page)).toBe(label);
  });
});
