/** A Markdown table: the columns from the one named on are right-aligned, for the numbers. */
export function markdownTable(
  head: readonly string[],
  rows: readonly (readonly (string | number)[])[],
  rightFrom = head.length,
): string {
  return [
    `| ${head.join(' | ')} |`,
    `| ${head.map((_, column) => (column >= rightFrom ? '---:' : '---')).join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}
