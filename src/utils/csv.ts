/**
 * CSV export, done in the browser.
 *
 * There is no export endpoint and there does not need to be one: the rows are
 * already in memory, already filtered, and the school's use for them is opening
 * them in a spreadsheet. Exporting exactly what is on screen also means the file
 * can never disagree with the table it came from.
 *
 * BACKEND CONTRACT: if exports ever need to cover more than the loaded page —
 * a full year of attendance, say — that becomes a server-side report and this
 * helper stays for the on-screen case. See docs/ai/BACKEND_CONTRACTS.md.
 */

/** One column: the header text, and how to read it off a row. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/**
 * Quote a field so a spreadsheet reads it back exactly as written.
 *
 * Anything containing a comma, quote or newline has to be quoted, and embedded
 * quotes are doubled. A leading `=`, `+`, `-` or `@` is prefixed with a single
 * quote: Excel would otherwise treat the cell as a formula, which is how a
 * member's note becomes an executable cell.
 */
function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeField(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeField(column.value(row))).join(","));

  return [header, ...body].join("\r\n");
}

/**
 * Hand the file to the browser.
 *
 * The BOM is what makes Excel read the file as UTF-8; without it, accented
 * names in the roster come out mangled.
 */
export function downloadCsv(filename: string, contents: string): void {
  const blob = new Blob([`\ufeff${contents}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

/** `attendance-ana-beatriz-souza-2026-08-30.csv` */
export function csvFilename(prefix: string, ...parts: (string | null | undefined)[]): string {
  const slug = [prefix, ...parts]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug}.csv`;
}
