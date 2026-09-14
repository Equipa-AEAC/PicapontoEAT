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
 *
 * Since the interface became bilingual this is a **safety net, not the
 * mechanism**. A raw enum member reaching a pill is a missing
 * `src/i18n/vocabulary.ts` labeller: capitalising `online` produces "Online" in
 * both languages, which reads as a translation and is not one. It stays because
 * an English word is more useful to a reader than `in-progress`, and it warns in
 * development so the next one gets fixed rather than hidden.
 */
export function toDisplayLabel(value: string): string {
  if (!value) {
    return value;
  }

  const isRawEnumMember = /^[a-z][a-z0-9-]*$/.test(value);

  if (!isRawEnumMember) {
    return value;
  }

  if (import.meta.env.DEV) {
    console.warn(
      `[label] "${value}" reached a status pill as a raw enum member. ` +
        "Route it through a labeller in src/i18n/vocabulary.ts — capitalising it here is not a translation.",
    );
  }

  const spaced = value.replace(/-/g, " ");

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
