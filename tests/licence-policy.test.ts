import { describe, expect, it } from 'vitest';
import { datesIn, isCalendarDate, permitsPublicCommercialUse } from './licence-policy';

// The rules the entries of the licence record that are in use are held to by shipped-licences.test.ts, on the words and
// days made for them here: which licences let a public game be sold, and what is a day of the calendar.

describe('the licences that allow public and commercial use', () => {
  it.each([
    ['CC0 1.0 Universal'],
    ['Creative Commons Zero v1.0 Universal (CC0 1.0): Public and commercial use, modification, and redistribution are allowed.'],
    ['CC BY 4.0 (attribution required)'],
  ])('include %s', (licence) => {
    expect(permitsPublicCommercialUse(licence)).toBe(true);
  });

  // The last four name a permitted licence and then take it back, so that only their restriction leaves them out.
  it.each([
    ["FontStruct Non-Commercial License (embedded in the font file), conflicting with the pack's CC0 claim"],
    ['Custom itch.io text: personal and commercial use, no resale or redistribution'],
    ['Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)'],
    ['CC BY-NC 4.0'],
    ['CC0 1.0, for personal use only'],
    ['CC BY 4.0, with no resale of the files'],
    ['CC0 1.0, but not for sale'],
    ['CC0 1.0, but not for commercial use'],
  ])('leave out %s', (licence) => {
    expect(permitsPublicCommercialUse(licence)).toBe(false);
  });

  it('leave out an entry that gives no licence at all', () => {
    expect(permitsPublicCommercialUse('')).toBe(false);
  });
});

describe('the days the record gives', () => {
  it.each(['2026-10-06', '2028-02-29', '2026-12-31'])('%s is a day of the calendar', (day) => {
    expect(isCalendarDate(day)).toBe(true);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '2026-10-32', '2027-02-29'])('%s is not', (day) => {
    expect(isCalendarDate(day)).toBe(false);
  });

  it('are found in a text however many it holds, and none in a text that has none', () => {
    expect(datesIn('2026-10-06, re-read 2026-10-07')).toEqual(['2026-10-06', '2026-10-07']);
    expect(datesIn('re-read last week')).toEqual([]);
  });
});
