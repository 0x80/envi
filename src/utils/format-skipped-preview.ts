/**
 * Format a truncated preview of a skipped-path list for a one-line log message.
 *
 * Joins the first `max` entries and appends a `(...and N more)` suffix when the
 * list is longer, so the several "Skipped N file(s): ..." lines in `capture`
 * and `pack` read identically instead of each re-deriving the same slice.
 *
 * @param paths - The paths being previewed
 * @param max - How many to show before summarizing the remainder (default 5)
 */
export function formatSkippedPreview(paths: string[], max = 5): string {
  const preview = paths.slice(0, max).join(", ");
  const more = paths.length > max ? ` (...and ${paths.length - max} more)` : "";
  return `${preview}${more}`;
}
