import type { ContentDefinition } from '../core';

/** The terrain legend: the symbols an area's layout is drawn with. `kind` is what the adapter chooses its art by. */
export const terrain: ContentDefinition['terrain'] = {
  '~': { kind: 'water', solid: true },
  '#': { kind: 'rock', solid: true },
  '.': { kind: 'sand', solid: false },
  ',': { kind: 'grass', solid: false },
  W: { kind: 'wreckage', solid: true },
  T: { kind: 'tree', solid: true },
};
