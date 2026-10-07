// Pictures drawn in code, because the Ninja Adventure pack has no armor icons: a leather tunic for the Basic Armor and
// a shirt of mail for the Chain Mail, in the pack's own colours. Each letter is one pixel, `.` is clear.

/** The pack's palette, as it is used in its item icons; the letters are only a shorthand for the rows below. */
export const PACK_PALETTE: Readonly<Record<string, number>> = {
  A: 0x141b1b, // the outline
  B: 0xf2eaf1, // the light
  C: 0xabc2bc, // steel
  D: 0x8d977f, // steel in shade
  E: 0xd14b34, // red
  G: 0x4e484a, // dark grey
  I: 0xffad5d, // light orange
  J: 0x965340, // brown, for shade
  K: 0xa3754e, // leather
};

export const TUNIC_ROWS: readonly string[] = [
  '................',
  '....AAA..AAA....',
  '..AAKKKAAKKKAA..',
  '.AIKKKKKKKKKKJA.',
  'AIKKKKKKKKKKKKJA',
  'AKKKKKKKKKKKKKJA',
  'AJJJKKKKKKKKJJJA',
  '.AAAJKKKKKKJAAA.',
  '...AKKKKKKKJA...',
  '...AKKKKKKKJA...',
  '...AEEEIIEEEA...',
  '...AKKKKKKKJA...',
  '...AKKKKKKKJA...',
  '...AJJJJJJJJA...',
  '...AAAAAAAAAA...',
  '................',
];

export const MAIL_ROWS: readonly string[] = [
  '................',
  '....AAA..AAA....',
  '..AACBCAABCBAA..',
  '.ABCBCBCBCBCBDA.',
  'ABCBCBCBCBCBCBDA',
  'ACBCBCBCBCBCBCDA',
  'ADDDCBCBCBCBDDDA',
  '.AAADCBCBCBDAAA.',
  '...ABCBCBCBDA...',
  '...ACBCBCBCDA...',
  '...AGGGIIGGGA...',
  '...ABCBCBCBDA...',
  '...ACBCBCBCDA...',
  '...ADDDDDDDDA...',
  '...AAAAAAAAAA...',
  '................',
];
