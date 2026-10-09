import { readFileSync } from 'node:fs';

// The asset licence record, docs/assets/licences.md, read for what the credits owe it: it says that "the credits screen
// draws from the 'Credits text' lines of entries that are 'In use'". The record is working notes in Markdown, so this
// reads only the two things the credits need: the Status column of its summary table, and the "Credits text" bullet
// of an entry's own section.

/** An entry of the record that is in use, and the text the credits owe it, or undefined when its entry has none. */
export interface CreditsOwed {
  readonly id: string;
  readonly text: string | undefined;
}

/** The record as it is on disk. */
export function recordOnDisk(): string {
  return readFileSync(new URL('../docs/assets/licences.md', import.meta.url), 'utf8');
}

/**
 * The entries of a record that say they are in use, in the order of its summary table. An entry is in use when the
 * Status cell of its row has the words "in use" in it, whatever case they are in and whatever else it says: the status of
 * the pack of the art is a long sentence. Its credits text is the first quoted text of the "Credits text" bullet in
 * its section (`### A1. ...`), whatever follows the label.
 */
export function creditsOwedBy(record: string): CreditsOwed[] {
  const sections = new Map(record.split(/^### /m).map((section) => [/^([A-Za-z]+\d+)\b/.exec(section)?.[1], section]));
  return record.split('\n').flatMap((line) => {
    const [id = '', ...cells] = line.startsWith('|') ? line.split('|').slice(1, -1).map((cell) => cell.trim()) : [];
    if (!/^[A-Za-z]+\d+$/.test(id) || !/\bin use\b/i.test(cells.at(-1) ?? '')) {
      return [];
    }
    return [{ id, text: /^- \*\*Credits text[^*]*\*\*\s*"([^"]+)"/m.exec(sections.get(id) ?? '')?.[1] }];
  });
}
