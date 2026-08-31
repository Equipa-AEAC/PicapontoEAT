/**
 * Present a status value as a human-readable label.
 *
 * Many statuses reach the interface as the raw enum member the service stores
 * (`submitted`, `active`, `in-progress`), and they were being rendered verbatim
 * next to properly written labels like "In review" — so the same column could
 * read "Submitted" on one row and "draft" on the next.
 *
 * This only touches values that are clearly still raw: all lower case, no spaces.
 * A label an author already wrote out is returned untouched, which is why this is
 * a formatter and not a `text-transform: capitalize` rule — that mangled
 * "In review" into "In Review".
 */
export function toDisplayLabel(value: string): string {
  if (!value) {
    return value;
  }

  const isRawEnumMember = /^[a-z][a-z0-9-]*$/.test(value);

  if (!isRawEnumMember) {
    return value;
  }

  const spaced = value.replace(/-/g, " ");

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
