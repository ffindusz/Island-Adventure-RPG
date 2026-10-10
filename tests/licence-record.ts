import { readFileSync } from 'node:fs';

// The asset licence record, docs/assets/licences.md, read for what the credits and the release owe it: it says that "the
// credits screen draws from the 'Credits text' lines of entries that are 'In use'", and that every asset has its source,
// its licence and the date it was checked. The record is working notes in Markdown, so this reads only what they need:
// the rows of its summary table, and the bullets of an entry's own section.

/** One row of the summary table of the record, with the text of its entry's own section. */
export interface RecordEntry {
  readonly id: string;
  readonly source: string;
  readonly licence: string;
  readonly checked: string;
  readonly status: string;
  /** Whether the Status cell has the words "in use" in it, whatever case they are in and whatever else it says. */
  readonly inUse: boolean;
  /** The section of the entry (`### A1. ...`), up to the next one; empty when the entry has none. */
  readonly section: string;
}

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
 * The entries of a record, in the order of its summary table (`| ID | Source | Licence | Checked | Status |`). An entry
 * is in use when its Status cell has the words "in use" in it: the status of the pack of the art is a long sentence.
 * Its section is the text under the `### A1. ...` heading that begins with its id.
 */
export function recordEntries(record: string): RecordEntry[] {
  const text = record.replaceAll('\r\n', '\n');
  const sections = new Map(text.split(/^### /m).map((section) => [/^([A-Za-z]+\d+)\b/.exec(section)?.[1], section]));
  return text.split('\n').flatMap((line) => {
    const cells = line.startsWith('|') ? line.split('|').slice(1, -1).map((cell) => cell.trim()) : [];
    const [id = '', source = '', licence = '', checked = ''] = cells;
    const status = cells.at(-1) ?? '';
    if (!/^[A-Za-z]+\d+$/.test(id)) {
      return [];
    }
    return [{ id, source, licence, checked, status, inUse: /\bin use\b/i.test(status), section: sections.get(id) ?? '' }];
  });
}

/**
 * The text of a bullet of an entry's section, from its label to the end of its line: `- **Source:** the text`. The
 * label is any of the names given, and may carry a note before its colon, as "Credits text (a courtesy, not required)".
 */
export function bulletOf(section: string, ...labels: readonly string[]): string | undefined {
  return new RegExp(`^- \\*\\*(?:${labels.join('|')})[^*]*\\*\\*\\s*(.+)$`, 'm').exec(section)?.[1];
}

/**
 * The entries of a record that say they are in use, in the order of its summary table. Its credits text is the first
 * quoted text of the "Credits text" bullet in its section, whatever follows the label.
 */
export function creditsOwedBy(record: string): CreditsOwed[] {
  return recordEntries(record)
    .filter(({ inUse }) => inUse)
    .map(({ id, section }) => ({ id, text: /^- \*\*Credits text[^*]*\*\*\s*"([^"]+)"/m.exec(section)?.[1] }));
}
