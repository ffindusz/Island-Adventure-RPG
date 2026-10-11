// What the project asks of an entry of the asset licence record that is in use: that its licence lets a public game be
// sold, and that the days it says it was checked are days of the calendar. licence-record.ts reads the record; this says
// what the entries it reads must be, so that a change of the policy is made in one place and tested on its own.

/** The licences that let a public game use an asset, and be sold: the entries in use must be under one of them. */
const PERMITTED = [/\bCC0\b/, /\bCC BY 4\.0\b/];
/** What a licence's wording says when it takes that back, even when it names a permitted one: "the pack's CC0 claim". */
const RESTRICTED = /non-?commercial|personal use|no resale|not for (?:sale|commercial)/i;

/** Whether the words of a licence, in the summary table of the record or in an entry's own section, let a public game be sold. */
export function permitsPublicCommercialUse(licence: string): boolean {
  return PERMITTED.some((permitted) => permitted.test(licence)) && !RESTRICTED.test(licence);
}

/** The days the record writes, as 2026-10-06, in a text. */
export const datesIn = (text: string): string[] => text.match(/\d{4}-\d{2}-\d{2}/g) ?? [];

/** Whether a day written as 2026-10-06 is a day of the calendar: 2026-02-30 and 2026-13-01 are not. */
export function isCalendarDate(day: string): boolean {
  const time = Date.parse(`${day}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(day);
}
